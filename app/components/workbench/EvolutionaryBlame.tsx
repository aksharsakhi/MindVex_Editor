/**
 * EvolutionaryBlame.tsx
 *
 * Enhanced Evolutionary Blame tool with unified parser support
 * and parser-only vs LLM-enhanced modes.
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { getBlame, type BlameLine, getAiChurnSummary } from '~/lib/analytics/blameClient';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';
import {
  getUnifiedParser,
  parseModeStore,
  ParseModeSelector,
  ParseModeStatus,
  type LLMAnalysis,
} from '~/lib/unifiedParser';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Brain, Zap, Info, RefreshCw, Download, Search, History, Clock, User } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  filePath?: string;
}

export function EvolutionaryBlame({ filePath }: Props) {
  const [blameData, setBlameData] = useState<BlameLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [inputPath, setInputPath] = useState(filePath || '');
  const [repoUrl, setRepoUrl] = useState('');

  const parseMode = useStore(parseModeStore);
  const [llmAnalysis, setLlmAnalysis] = useState<LLMAnalysis | null>(null);

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
    setLlmAnalysis(null);

    try {
      const data = await getBlame(repoUrl, path);
      setBlameData(data);

      // If in LLM mode, automatically trigger AI analysis
      if (parseMode.type === 'llm-enhanced' && data.length > 0) {
        handleAiAnalysis(path, data);
      }
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

  const handleAiAnalysis = async (path: string, data: BlameLine[]) => {
    setAiLoading(true);

    try {
      // Get the unified parser for deeper analysis
      const unifiedParser = await getUnifiedParser();

      // Combine file content from blame lines
      const content = data.map((l) => l.content).join('\n');

      // Calculate blame statistics for context
      const authors = new Set(data.map((l) => l.authorEmail || 'Unknown'));
      const dates = data.map((l) => new Date(l.committedAt).getTime());
      const oldestDate = new Date(Math.min(...dates));
      const newestDate = new Date(Math.max(...dates));

      const blameContext = `// Evolutionary Blame Context:
// Authors: ${Array.from(authors).join(', ')}
// Time Range: ${oldestDate.toISOString()} to ${newestDate.toISOString()}
// Total Lines: ${data.length}
// 
// Task: Analyze the code evolution. Identify if multiple authors have contributed to complex sections, suggesting potential technical debt or knowledge silos.
`;

      const codeWithContext = blameContext + '\n' + content;

      const analysis = await unifiedParser.parseCode(codeWithContext, path);

      setLlmAnalysis(analysis.llmAnalysis || null);

      // Also get the standard churn summary
      const summary = await getAiChurnSummary(repoUrl, path, 0, data.length, 12);
      setAiSummary(summary);

      toast.success('Evolutionary AI analysis completed');
    } catch (error) {
      console.error('AI blame analysis failed:', error);
      setAiSummary('Could not generate full AI summary.');
    } finally {
      setAiLoading(false);
    }
  };

  const getAgeColor = (dateStr: string): string => {
    const age = Date.now() - new Date(dateStr).getTime();
    const days = age / (1000 * 60 * 60 * 24);

    if (days < 7) {
      return '#22C55E';
    } // green

    if (days < 30) {
      return '#3B82F6';
    } // blue

    if (days < 90) {
      return '#A855F7';
    } // purple

    if (days < 365) {
      return '#F97316';
    } // orange

    return '#6B7280'; // gray
  };

  const uniqueAuthors = [...new Set(blameData.map((l) => l.authorEmail))];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-orange-400" /> Evolutionary Blame
            </h2>
            <ParseModeStatus />
          </div>
          <ParseModeSelector compact />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="Enter file path (e.g., src/App.tsx)"
            className="flex-1 bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
          <Button
            type="submit"
            disabled={loading || !inputPath}
            variant="outline"
            size="sm"
            className="border-orange-500/30 text-orange-400"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Load Blame'}
          </Button>
          {blameData.length > 0 && (
            <Button
              type="button"
              onClick={() => handleAiAnalysis(inputPath, blameData)}
              disabled={aiLoading}
              variant="outline"
              size="sm"
              className="border-purple-500/30 text-purple-400"
            >
              {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Brain className="h-4 w-4 mr-1" />}
              AI Analysis
            </Button>
          )}
        </form>

        {/* Legend & Stats */}
        <div className="flex items-center flex-wrap gap-y-2 gap-x-4 text-[10px] text-gray-500">
          <div className="flex items-center gap-3 mr-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> &lt;1w
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> &lt;1m
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> &lt;3m
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> &lt;1y
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span> 1y+
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Badge variant="outline" className="text-[10px] h-5 py-0">
              <User className="h-2.5 w-2.5 mr-1" /> {uniqueAuthors.length} Authors
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 py-0">
              <History className="h-2.5 w-2.5 mr-1" /> {blameData.length} Lines
            </Badge>
          </div>
        </div>
      </div>

      {/* AI Analysis Panel */}
      {(aiSummary || llmAnalysis) && (
        <div className="mx-5 mt-3 space-y-3 flex-shrink-0">
          {aiSummary && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-gray-300">
              <div className="font-bold text-purple-400 mb-1 flex items-center gap-1">
                <Brain className="h-3 w-3" /> Git History Insight
              </div>
              <p className="leading-relaxed opacity-90">{aiSummary}</p>
            </div>
          )}

          {llmAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs">
                <div className="font-bold text-blue-400 mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Quality Score
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${llmAnalysis.quality.score}%` }} />
                  </div>
                  <span className="font-mono">{llmAnalysis.quality.score.toFixed(0)}%</span>
                </div>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs">
                <div className="font-bold text-orange-400 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Complexity
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${llmAnalysis.complexity.score}%` }} />
                  </div>
                  <span className="font-mono">{llmAnalysis.complexity.score.toFixed(0)}/100</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Blame Table */}
      <div className="flex-1 overflow-y-auto font-mono text-[10px] mt-4">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading git blame...
          </div>
        ) : blameData.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm">Enter a file path to view evolutionary history</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {blameData.map((line, i) => {
                const color = getAgeColor(line.committedAt);
                const showMeta = i === 0 || blameData[i - 1].commitHash !== line.commitHash;

                return (
                  <tr key={i} className="hover:bg-white/5 group">
                    <td className="w-1 px-0" style={{ backgroundColor: color, opacity: 0.6 }}></td>
                    <td className="px-2 py-0.5 text-gray-600 text-right select-none w-10 border-r border-white/5">
                      {line.lineNumber}
                    </td>
                    <td className="px-2 py-0.5 w-[240px] text-gray-500 border-r border-white/5 truncate">
                      {showMeta ? (
                        <span className="flex items-center gap-2">
                          <span className="truncate max-w-[100px] text-gray-400" title={line.authorEmail}>
                            {line.authorEmail.split('@')[0]}
                          </span>
                          <span className="text-gray-600">
                            {new Date(line.committedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-gray-700 truncate max-w-[80px]" title={line.commitHash}>
                            {line.commitHash.slice(0, 7)}
                          </span>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-0.5 text-gray-300 whitespace-pre leading-normal">{line.content}</td>
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
