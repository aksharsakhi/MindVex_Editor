import React, { useState, useEffect } from 'react';
import { getBlame, type BlameLine, getAiChurnSummary } from '~/lib/analytics/blameClient';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';

interface Props {
  filePath?: string;
}

/**
 * Evolutionary Blame View
 *
 * Displays line-level git blame annotations with age-based coloring
 * and an AI-powered churn summary.
 */
export function EvolutionaryBlame({ filePath }: Props) {
  const [blameData, setBlameData] = useState<BlameLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [inputPath, setInputPath] = useState(filePath || '');
  const [repoUrl, setRepoUrl] = useState('');

  useEffect(() => {
    const recent = repositoryHistoryStore.getRecentRepositories(1);

    if (recent.length > 0) {
      setRepoUrl(recent[0].url);
    }
  }, []);

  const loadBlame = async (path: string) => {
    if (!repoUrl || !path) {
      return;
    }

    setLoading(true);
    setError(null);
    setAiSummary(null);

    try {
      const data = await getBlame(repoUrl, path);
      setBlameData(data);
    } catch (err: any) {
      setError(err.message);
      setBlameData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filePath) {
      loadBlame(filePath);
    }
  }, [filePath, repoUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (inputPath) {
      loadBlame(inputPath);
    }
  };

  const handleAiSummary = async () => {
    if (!repoUrl || !inputPath) {
      return;
    }

    setAiLoading(true);

    try {
      const summary = await getAiChurnSummary(repoUrl, inputPath, 0, blameData.length, 12);
      setAiSummary(summary);
    } catch {
      setAiSummary('Could not generate AI summary.');
    } finally {
      setAiLoading(false);
    }
  };

  // Color blame lines by age
  const getAgeColor = (dateStr: string): string => {
    const age = Date.now() - new Date(dateStr).getTime();
    const days = age / (1000 * 60 * 60 * 24);

    if (days < 7) {
      return '#22C55E';
    } // green — recent

    if (days < 30) {
      return '#3B82F6';
    } // blue — this month

    if (days < 90) {
      return '#A855F7';
    } // purple — this quarter

    if (days < 365) {
      return '#F97316';
    } // orange — this year

    return '#6B7280'; // gray — older
  };

  // Group consecutive lines by same commit
  const uniqueAuthors = [...new Set(blameData.map((l) => l.authorEmail))];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/5 flex-shrink-0">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">🕵️ Evolutionary Blame</h2>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="Enter file path (e.g., src/App.tsx)"
            className="flex-1 bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
          <button
            type="submit"
            disabled={loading || !inputPath}
            className="px-4 py-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/25 disabled:opacity-50 transition-colors"
          >
            Load Blame
          </button>
          {blameData.length > 0 && (
            <button
              type="button"
              onClick={handleAiSummary}
              disabled={aiLoading}
              className="px-4 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/25 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? '🤖 Analyzing...' : '🤖 AI Summary'}
            </button>
          )}
        </form>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> &lt;1 week
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> &lt;1 month
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> &lt;3 months
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span> &lt;1 year
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span> Older
          </span>
          <span className="ml-auto">
            {uniqueAuthors.length} author{uniqueAuthors.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="mx-5 mt-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm text-gray-300 whitespace-pre-wrap flex-shrink-0">
          <div className="text-xs font-semibold text-purple-400 mb-2">🤖 AI Churn Analysis</div>
          {aiSummary}
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Blame Lines */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-500">Loading blame data...</div>
        ) : blameData.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-4xl mb-3">📄</div>
            <p>Enter a file path and click "Load Blame" to view annotations</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {blameData.map((line, i) => {
                const color = getAgeColor(line.committedAt);
                const showMeta = i === 0 || blameData[i - 1].commitHash !== line.commitHash;

                return (
                  <tr key={i} className="hover:bg-white/5 group">
                    {/* Age indicator */}
                    <td className="w-1 px-0" style={{ backgroundColor: color, opacity: 0.6 }}></td>
                    {/* Line number */}
                    <td className="px-2 py-0.5 text-gray-600 text-right select-none w-10 border-r border-white/5">
                      {line.lineNumber}
                    </td>
                    {/* Blame metadata */}
                    <td className="px-2 py-0.5 w-[240px] text-gray-500 border-r border-white/5 truncate">
                      {showMeta ? (
                        <span className="flex items-center gap-2">
                          <span className="truncate max-w-[100px]" title={line.authorEmail}>
                            {line.authorEmail.split('@')[0]}
                          </span>
                          <span className="text-gray-700">
                            {new Date(line.committedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-gray-700 truncate max-w-[80px]" title={line.commitHash}>
                            {line.commitHash.slice(0, 7)}
                          </span>
                        </span>
                      ) : null}
                    </td>
                    {/* Code content */}
                    <td className="px-3 py-0.5 text-gray-300 whitespace-pre">{line.content}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
