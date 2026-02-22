/**
 * AnalyticsDashboard.tsx
 *
 * Full-page analytics view with three panels:
 *  1. Hotspot Heatmap — top files by avg churn rate (BarChart)
 *  2. Rework Trend   — total lines reworked per week (AreaChart)
 *  3. File Drill-down — week-by-week churn for a selected file (LineChart)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getFileTrend, getHotspots, triggerMining } from '~/lib/analytics/analyticsClient';
import type { HotspotResult, WeeklyChurn } from '~/lib/analytics/analyticsClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  repoUrl: string;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function churnColour(rate: number): string {
  if (rate > 25) {
    return '#f38ba8';
  } // red

  if (rate > 10) {
    return '#fab387';
  } // amber

  return '#a6e3a1'; // green
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ repoUrl }: Props) {
  const [hotspots, setHotspots] = useState<HotspotResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [trend, setTrend] = useState<WeeklyChurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load hotspots ─────────────────────────────────────────────────────────

  const loadHotspots = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getHotspots(repoUrl);
      setHotspots(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hotspots');
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  // ─── Load file trend on selection ─────────────────────────────────────────

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    getFileTrend(repoUrl, selectedFile).then(setTrend).catch(console.error);
  }, [repoUrl, selectedFile]);

  // ─── Trigger mining ────────────────────────────────────────────────────────

  const handleMine = async () => {
    setMining(true);

    try {
      await triggerMining(repoUrl);

      // Poll is handled by the job worker — reload hotspots after 10s
      setTimeout(loadHotspots, 10_000);
    } finally {
      setMining(false);
    }
  };

  // ─── Rework trend data (aggregate across all files) ───────────────────────

  const reworkTrend = React.useMemo(() => {
    const byWeek = new Map<string, number>();

    for (const h of hotspots) {
      for (const w of h.weeklyTrend) {
        byWeek.set(w.weekStart, (byWeek.get(w.weekStart) ?? 0) + w.commits);
      }
    }

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, commits]) => ({ weekStart, commits }));
  }, [hotspots]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📊 Code Churn Analytics</h2>
        <button style={{ ...styles.btn, opacity: mining ? 0.6 : 1 }} onClick={handleMine} disabled={mining}>
          {mining ? 'Mining…' : '⛏ Mine History'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {loading && <div style={styles.loading}>Loading hotspots…</div>}

      {!loading && hotspots.length === 0 && (
        <div style={styles.empty}>
          No churn data yet. Click <strong>Mine History</strong> to analyse this repository.
        </div>
      )}

      {hotspots.length > 0 && (
        <div style={styles.grid}>
          {/* Panel 1: Hotspot Heatmap */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>🔥 Top Hotspot Files</h3>
            <p style={styles.panelSub}>Click a bar to see its weekly trend</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={hotspots.slice(0, 10).map((h) => ({
                  name: h.filePath.split('/').pop(),
                  fullPath: h.filePath,
                  churnRate: Number(h.avgChurnRate),
                }))}
                layout="vertical"
                margin={{ left: 20, right: 30 }}
                onClick={(d: any) => {
                  const payload = d?.activePayload?.[0]?.payload as { fullPath?: string } | undefined;

                  if (payload?.fullPath) {
                    setSelectedFile(payload.fullPath);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#6c7086" />
                <YAxis type="category" dataKey="name" width={160} stroke="#6c7086" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number | undefined) => `${(v ?? 0).toFixed(1)}%`} contentStyle={tooltipStyle} />
                <Bar dataKey="churnRate" radius={[0, 4, 4, 0]}>
                  {hotspots.slice(0, 10).map((h, i) => (
                    <Cell key={i} fill={churnColour(Number(h.avgChurnRate))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2: Rework Trend */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>📈 Weekly Rework Trend</h3>
            <p style={styles.panelSub}>Total commits across all hotspot files</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={reworkTrend} margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#89b4fa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#89b4fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                <XAxis dataKey="weekStart" stroke="#6c7086" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#6c7086" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="commits" stroke="#89b4fa" fill="url(#churnGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 3: File Drill-down */}
          {selectedFile && trend.length > 0 && (
            <div style={{ ...styles.panel, gridColumn: '1 / -1' }}>
              <h3 style={styles.panelTitle}>🔍 {selectedFile.split('/').pop()} — Weekly Churn</h3>
              <p style={styles.panelSub}>{selectedFile}</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
                  <XAxis
                    dataKey="weekStart"
                    stroke="#6c7086"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis stroke="#6c7086" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number | undefined) => `${(v ?? 0).toFixed(1)}%`}
                  />
                  <Line type="monotone" dataKey="churnRate" stroke="#f38ba8" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    background: 'var(--bg, #1e1e2e)',
    color: 'var(--fg, #cdd6f4)',
    minHeight: '100%',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  btn: {
    padding: '8px 18px',
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'opacity 0.2s',
  },
  error: { color: '#f38ba8', marginBottom: 16, fontSize: 14 },
  loading: { color: '#6c7086', marginBottom: 16, fontSize: 14 },
  empty: { color: '#6c7086', fontSize: 14, textAlign: 'center', marginTop: 60 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
    gap: 20,
  },
  panel: {
    background: '#181825',
    borderRadius: 12,
    padding: '20px 24px',
    border: '1px solid #313244',
  },
  panelTitle: { margin: '0 0 4px', fontSize: 15, fontWeight: 600 },
  panelSub: { margin: '0 0 16px', fontSize: 12, color: '#6c7086' },
};

const tooltipStyle: React.CSSProperties = {
  background: '#1e1e2e',
  border: '1px solid #313244',
  borderRadius: 8,
  color: '#cdd6f4',
  fontSize: 12,
};
