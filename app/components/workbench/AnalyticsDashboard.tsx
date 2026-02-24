import React, { useState, useEffect, useCallback } from 'react';
import {
  getHotspots,
  getFileTrend,
  triggerMining,
  type HotspotResult,
  type WeeklyChurn,
} from '~/lib/analytics/analyticsClient';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';

// ─── Inline SVG Chart Components ─────────────────────────────────────────────

function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  const h = 48,
    w = 200;
  const barW = Math.max(2, (w - data.length) / data.length);

  return (
    <svg width={w} height={h} className="overflow-visible">
      {data.map((v, i) => {
        const barH = maxVal > 0 ? (v / maxVal) * h : 0;
        return (
          <rect key={i} x={i * (barW + 1)} y={h - barH} width={barW} height={barH} rx={1} fill={color} opacity={0.85} />
        );
      })}
    </svg>
  );
}

function ChurnLineChart({ data }: { data: WeeklyChurn[] }) {
  if (!data.length) {
    return null;
  }

  const w = 600,
    h = 200,
    pad = 40;
  const maxChurn = Math.max(...data.map((d) => d.churnRate), 1);
  const maxLines = Math.max(...data.map((d) => d.linesAdded + d.linesDeleted), 1);

  const points = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2),
    yChurn: h - pad - (d.churnRate / maxChurn) * (h - pad * 2),
    yLines: h - pad - ((d.linesAdded + d.linesDeleted) / maxLines) * (h - pad * 2),
  }));

  const churnPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yChurn}`).join(' ');
  const linesPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yLines}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={pad}
          y1={h - pad - frac * (h - pad * 2)}
          x2={w - pad}
          y2={h - pad - frac * (h - pad * 2)}
          stroke="#333"
          strokeWidth={0.5}
        />
      ))}
      {/* Lines */}
      <path d={linesPath} fill="none" stroke="#60A5FA" strokeWidth={2} opacity={0.6} />
      <path d={churnPath} fill="none" stroke="#F97316" strokeWidth={2.5} />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.yChurn} r={3} fill="#F97316" />
      ))}
      {/* Labels */}
      {data.map((d, i) => {
        if (data.length > 8 && i % 2 !== 0) {
          return null;
        }

        return (
          <text key={i} x={points[i].x} y={h - 5} textAnchor="middle" fill="#888" fontSize={9}>
            {new Date(d.weekStart).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </text>
        );
      })}
      {/* Legend */}
      <circle cx={w - 120} cy={12} r={4} fill="#F97316" />
      <text x={w - 112} y={16} fill="#ccc" fontSize={10}>
        Churn %
      </text>
      <circle cx={w - 55} cy={12} r={4} fill="#60A5FA" />
      <text x={w - 47} y={16} fill="#ccc" fontSize={10}>
        Lines Δ
      </text>
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [hotspots, setHotspots] = useState<HotspotResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileTrend, setFileTrend] = useState<WeeklyChurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [miningLoading, setMiningLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');

  useEffect(() => {
    const recent = repositoryHistoryStore.getRecentRepositories(1);

    if (recent.length > 0) {
      setRepoUrl(recent[0].url);
    }
  }, []);

  const loadHotspots = useCallback(async () => {
    if (!repoUrl) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getHotspots(repoUrl, 12, 10);
      setHotspots(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  useEffect(() => {
    if (repoUrl) {
      loadHotspots();
    }
  }, [repoUrl, loadHotspots]);

  const handleSelectFile = async (filePath: string) => {
    setSelectedFile(filePath);

    try {
      const trend = await getFileTrend(repoUrl, filePath, 12);
      setFileTrend(trend);
    } catch {
      setFileTrend([]);
    }
  };

  const handleTriggerMining = async () => {
    if (!repoUrl) {
      return;
    }

    setMiningLoading(true);

    try {
      await triggerMining(repoUrl, 90);

      // Wait a bit then reload
      setTimeout(() => {
        loadHotspots();
        setMiningLoading(false);
      }, 5000);
    } catch {
      setMiningLoading(false);
    }
  };

  const maxChurn = Math.max(...hotspots.map((h) => h.avgChurnRate), 1);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            📊 Code Analytics
          </h1>
          <button
            onClick={handleTriggerMining}
            disabled={miningLoading || !repoUrl}
            className="px-4 py-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/25 transition-colors disabled:opacity-50"
          >
            {miningLoading ? '⏳ Mining...' : '🔄 Mine Git History'}
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-6">Hotspot detection and code churn analysis powered by JGit mining.</p>
      </div>

      {/* Stats Row */}
      <div className="px-6 grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-white/5 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Hotspot Files</div>
          <div className="text-2xl font-bold text-red-400">{hotspots.length}</div>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Avg Churn Rate</div>
          <div className="text-2xl font-bold text-orange-400">
            {hotspots.length > 0
              ? (hotspots.reduce((s, h) => s + h.avgChurnRate, 0) / hotspots.length).toFixed(1)
              : '0'}
            %
          </div>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total Commits</div>
          <div className="text-2xl font-bold text-blue-400">{hotspots.reduce((s, h) => s + h.totalCommits, 0)}</div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Hotspot Heatmap */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🔥 Hotspot Files <span className="text-xs text-gray-500 font-normal">(sorted by churn)</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="animate-spin mr-2">⏳</div> Loading hotspots...
            </div>
          ) : hotspots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">No hotspots found. Click "Mine Git History" to analyze commits.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {hotspots.map((h, i) => {
                const intensity = h.avgChurnRate / maxChurn;
                const bgColor = `rgba(239, 68, 68, ${intensity * 0.25})`;
                const borderColor = `rgba(239, 68, 68, ${intensity * 0.5})`;

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectFile(h.filePath)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                      selectedFile === h.filePath ? 'ring-1 ring-orange-500' : ''
                    }`}
                    style={{ backgroundColor: bgColor, borderColor }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono text-gray-200 truncate max-w-[70%]" title={h.filePath}>
                        {h.filePath.split('/').pop()}
                      </span>
                      <span className="text-xs font-bold text-red-400">{h.avgChurnRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{h.totalCommits} commits</span>
                      <span>
                        +{h.totalLinesAdded} / -{h.totalLinesDeleted}
                      </span>
                    </div>
                    {h.weeklyTrend && (
                      <div className="mt-2">
                        <MiniBarChart
                          data={h.weeklyTrend.map((w) => w.churnRate)}
                          maxVal={100}
                          color={`rgb(239, ${Math.round(68 + (1 - intensity) * 100)}, 68)`}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* File Trend Detail */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            📈 Churn Trend
            {selectedFile && (
              <span className="text-xs text-gray-500 font-normal font-mono truncate max-w-[200px]" title={selectedFile}>
                — {selectedFile.split('/').pop()}
              </span>
            )}
          </h2>

          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="text-4xl mb-3">👈</div>
              <p className="text-sm">Select a hotspot file to view its trend</p>
            </div>
          ) : fileTrend.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">Loading trend data...</div>
          ) : (
            <div>
              <ChurnLineChart data={fileTrend} />
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Peak Churn</div>
                  <div className="text-lg font-bold text-red-400">
                    {Math.max(...fileTrend.map((d) => d.churnRate)).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Total Lines Δ</div>
                  <div className="text-lg font-bold text-blue-400">
                    {fileTrend.reduce((s, d) => s + d.linesAdded + d.linesDeleted, 0)}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Commits</div>
                  <div className="text-lg font-bold text-green-400">
                    {fileTrend.reduce((s, d) => s + d.commitCount, 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
