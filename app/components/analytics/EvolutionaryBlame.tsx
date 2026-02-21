/**
 * EvolutionaryBlame.tsx
 *
 * Enhanced git blame view that overlays churn data on blame annotations
 * and provides an AI-powered summary of why a file has high churn.
 *
 * Features:
 *  - Blame lines with commit hash, author, date, and churn severity dot
 *  - Collapsible AI summary panel at the top
 *  - Sparkline trend chart in the panel header
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { getBlame } from '~/lib/analytics/blameClient';
import { getAiChurnSummary } from '~/lib/analytics/blameClient';
import { getFileTrend } from '~/lib/analytics/analyticsClient';
import type { BlameLine } from '~/lib/analytics/blameClient';
import type { WeeklyChurn, HotspotResult } from '~/lib/analytics/analyticsClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    repoUrl: string;
    filePath: string;
    hotspot?: HotspotResult;   // optional — pre-loaded hotspot data for the file
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function churnDot(rate: number): { emoji: string; color: string } {
    if (rate > 25) return { emoji: '🔴', color: '#f38ba8' };
    if (rate > 10) return { emoji: '🟡', color: '#fab387' };
    return { emoji: '🟢', color: '#a6e3a1' };
}

function shortHash(hash: string): string {
    return hash.slice(0, 7);
}

function relativeDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvolutionaryBlame({ repoUrl, filePath, hotspot }: Props) {
    const [blameLines, setBlameLines] = useState<BlameLine[]>([]);
    const [trend, setTrend] = useState<WeeklyChurn[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const avgChurnRate = hotspot?.avgChurnRate ?? 0;
    const totalCommits = hotspot?.totalCommits ?? 0;

    // ─── Load blame + trend ──────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [blame, fileTrend] = await Promise.all([
                getBlame(repoUrl, filePath),
                getFileTrend(repoUrl, filePath, 12),
            ]);
            setBlameLines(blame);
            setTrend(fileTrend);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load blame data');
        } finally {
            setLoading(false);
        }
    }, [repoUrl, filePath]);

    useEffect(() => { load(); }, [load]);

    // ─── AI Summary ──────────────────────────────────────────────────────────

    const loadAiSummary = async () => {
        if (aiSummary || aiLoading) return;
        setAiLoading(true);
        try {
            const summary = await getAiChurnSummary(repoUrl, filePath, avgChurnRate, totalCommits, 12);
            setAiSummary(summary);
        } catch {
            setAiSummary('Could not load AI summary. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    // Load AI summary automatically when panel opens if we have hotspot data
    useEffect(() => {
        if (panelOpen && hotspot && !aiSummary) {
            loadAiSummary();
        }
    }, [panelOpen, hotspot]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Render ──────────────────────────────────────────────────────────────

    const dot = churnDot(avgChurnRate);

    return (
        <div style={styles.container}>
            {/* AI Summary Panel */}
            <div style={styles.summaryPanel}>
                <button
                    style={styles.summaryToggle}
                    onClick={() => setPanelOpen(p => !p)}
                >
                    <span>{dot.emoji}</span>
                    <span style={styles.summaryTitle}>
                        {filePath.split('/').pop()} — Avg Churn: {avgChurnRate.toFixed(1)}%
                        &nbsp;·&nbsp; {totalCommits} commits (12w)
                    </span>
                    {/* Sparkline */}
                    {trend.length > 0 && (
                        <div style={styles.sparkline}>
                            <ResponsiveContainer width={120} height={32}>
                                <LineChart data={trend}>
                                    <Line type="monotone" dataKey="churnRate" stroke={dot.color}
                                        strokeWidth={1.5} dot={false} />
                                    <Tooltip
                                        contentStyle={{ display: 'none' }}
                                        formatter={(v: number | undefined) => `${(v ?? 0).toFixed(1)}%`}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <span style={styles.chevron}>{panelOpen ? '▲' : '▼'}</span>
                </button>

                {panelOpen && (
                    <div style={styles.summaryBody}>
                        {aiLoading && (
                            <div style={styles.aiLoading}>
                                <span style={styles.spinner} /> Analysing with AI…
                            </div>
                        )}
                        {!aiLoading && aiSummary && (
                            <pre style={styles.aiText}>{aiSummary}</pre>
                        )}
                        {!aiLoading && !aiSummary && (
                            <button style={styles.aiBtn} onClick={loadAiSummary}>
                                ✨ Generate AI Analysis
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Blame Lines */}
            {error && <div style={styles.error}>{error}</div>}
            {loading && <div style={styles.loading}>Loading blame data…</div>}

            {!loading && blameLines.length > 0 && (
                <div ref={listRef} style={styles.blameList}>
                    {blameLines.map((line) => (
                        <div key={line.lineNumber} style={styles.blameLine}>
                            {/* Line number */}
                            <span style={styles.lineNum}>{line.lineNumber}</span>

                            {/* Commit hash */}
                            <span style={styles.hash} title={line.commitHash}>
                                {shortHash(line.commitHash)}
                            </span>

                            {/* Author */}
                            <span style={styles.author} title={line.authorEmail}>
                                {line.authorEmail.split('@')[0].slice(0, 12)}
                            </span>

                            {/* Date */}
                            <span style={styles.date}>{relativeDate(line.committedAt)}</span>

                            {/* Churn dot — uses the file-level avg churn rate as proxy */}
                            <span
                                title={`Avg churn: ${avgChurnRate.toFixed(1)}%`}
                                style={{ fontSize: 10, marginRight: 8 }}
                            >
                                {dot.emoji}
                            </span>

                            {/* Line content */}
                            <span style={styles.content}>{line.content}</span>
                        </div>
                    ))}
                </div>
            )}

            {!loading && blameLines.length === 0 && !error && (
                <div style={styles.empty}>
                    No blame data. Run <strong>Mine History</strong> from the Analytics Dashboard first.
                </div>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 12,
        background: 'var(--bg, #1e1e2e)',
        color: 'var(--fg, #cdd6f4)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    summaryPanel: {
        background: '#181825',
        borderBottom: '1px solid #313244',
        flexShrink: 0,
    },
    summaryToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 16px',
        background: 'none',
        border: 'none',
        color: '#cdd6f4',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: 13,
    },
    summaryTitle: { flex: 1, fontWeight: 600 },
    sparkline: { flexShrink: 0 },
    chevron: { color: '#6c7086', fontSize: 10 },
    summaryBody: {
        padding: '12px 16px',
        borderTop: '1px solid #313244',
    },
    aiLoading: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#6c7086',
        fontSize: 12,
    },
    spinner: {
        display: 'inline-block',
        width: 12,
        height: 12,
        border: '2px solid #313244',
        borderTop: '2px solid #89b4fa',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    aiText: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        fontSize: 12,
        lineHeight: 1.6,
        color: '#cdd6f4',
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    aiBtn: {
        padding: '6px 14px',
        background: '#313244',
        color: '#cdd6f4',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
    },
    blameList: {
        overflowY: 'auto',
        flex: 1,
    },
    blameLine: {
        display: 'flex',
        alignItems: 'center',
        padding: '2px 0',
        borderBottom: '1px solid #181825',
    },
    lineNum: {
        width: 44,
        textAlign: 'right',
        paddingRight: 12,
        color: '#6c7086',
        userSelect: 'none',
        flexShrink: 0,
    },
    hash: {
        width: 60,
        color: '#89b4fa',
        flexShrink: 0,
        marginRight: 8,
        cursor: 'default',
    },
    author: {
        width: 90,
        color: '#a6e3a1',
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginRight: 8,
    },
    date: {
        width: 70,
        color: '#fab387',
        flexShrink: 0,
        marginRight: 8,
        fontSize: 10,
    },
    content: {
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'pre',
        color: '#cdd6f4',
    },
    error: { color: '#f38ba8', padding: 16, fontSize: 12 },
    loading: { color: '#6c7086', padding: 16, fontSize: 12 },
    empty: { color: '#6c7086', padding: 32, textAlign: 'center', fontSize: 12 },
};
