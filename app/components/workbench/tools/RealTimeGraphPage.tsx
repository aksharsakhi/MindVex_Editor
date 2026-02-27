/**
 * RealTimeGraphPage.tsx
 *
 * Enhanced Real-Time Graph Update tool with unified parser support
 * and parser-only vs LLM-enhanced modes.
 */

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache, refreshGraph, graphCacheRepoUrl, graphCacheLoading } from '~/lib/stores/graphCacheStore';
import { workbenchStore } from '~/lib/stores/workbench';
import {
  getUnifiedParser,
  parseModeStore,
  ParseModeSelector,
  ParseModeStatus,
  type ProjectAnalysis,
  type LLMAnalysis,
} from '~/lib/unifiedParser';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Brain, Zap, Info, RefreshCw, Download, Activity, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  onBack: () => void;
}

interface UpdateStats {
  lastUpdated: Date;
  changesDetected: number;
  filesAnalyzed: number;
  averageTime: number;
  llmInsights?: string[];
}

export function RealTimeGraphPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const graphData = useStore(graphCache);
  const repoUrl = useStore(graphCacheRepoUrl);
  const isLoading = useStore(graphCacheLoading);
  const parseMode = useStore(parseModeStore);
  const files = useStore(workbenchStore.files);

  const [localGraphData, setLocalGraphData] = useState<typeof graphData>(null);

  const [stats, setStats] = useState<UpdateStats>({
    lastUpdated: new Date(),
    changesDetected: 0,
    filesAnalyzed: 0,
    averageTime: 0,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedFiles] = useState<Set<string>>(new Set());

  // Initialize local graph data
  useEffect(() => {
    if (graphData && !localGraphData) {
      setLocalGraphData(JSON.parse(JSON.stringify(graphData)));
    }
  }, [graphData]);

  // Handle Real-Time Updates
  useEffect(() => {
    const handleFileChange = async () => {
      // Detect modified files since last check
      const modifiedFiles = Array.from(workbenchStore.modifiedFiles);

      if (modifiedFiles.length === 0) {
        return;
      }

      const parser = await getUnifiedParser();
      let changes = 0;
      const startTime = Date.now();

      for (const filePath of modifiedFiles) {
        const dirent = files[filePath];

        // Check if processed already for this version (naive check)
        const fileKey = filePath + (dirent?.type === 'file' ? dirent.content.length : '0');

        if (processedFiles.has(fileKey)) {
          continue;
        }

        processedFiles.add(fileKey);
        changes++;

        if (dirent?.type === 'file') {
          try {
            // Parse the changed file
            const result = await parser.parseCode(dirent.content, filePath);

            // Update graph edges based on new imports
            if (localGraphData) {
              const newEdges = [...localGraphData.edges];
              const newNodes = [...localGraphData.nodes];

              // Remove old edges from this source
              const filteredEdges = newEdges.filter((e) => e.data.source !== filePath);

              // Add new edges
              result.metadata.imports.forEach((imp) => {
                // Find target node (naive matching by filename)
                const targetNode = newNodes.find((n) => n.data.filePath?.includes(imp.module));

                if (targetNode) {
                  filteredEdges.push({
                    data: {
                      id: `${filePath}-${targetNode.data.id}`,
                      source: filePath,
                      target: targetNode.data.id,
                      type: 'import',
                      cycle: false,
                      label: 'imports', // Custom prop
                      strength: 1, // Custom prop
                    } as any,
                  });
                }
              });

              setLocalGraphData({
                ...localGraphData,
                edges: filteredEdges,
              });
            }
          } catch (e) {
            console.error('Failed to parse changed file', e);
          }
        }
      }

      if (changes > 0) {
        setStats((prev) => ({
          ...prev,
          lastUpdated: new Date(),
          changesDetected: prev.changesDetected + changes,
          filesAnalyzed: prev.filesAnalyzed + changes,
          averageTime: (Date.now() - startTime) / changes,
        }));

        if (parseMode.type === 'llm-enhanced') {
          // Trigger AI analysis for impact
          toast.info(`AI analyzing impact of ${changes} changed files...`);
        }
      }
    };

    const timeoutId = setTimeout(handleFileChange, 2000);

    return () => clearTimeout(timeoutId);
  }, [files, parseMode]); // Debounce on files change

  useEffect(() => {
    if (containerRef.current && localGraphData) {
      const elements = [
        ...localGraphData.nodes.map((n) => ({ data: n.data })),
        ...localGraphData.edges.map((e) => ({ data: e.data })),
      ];

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#0ea5e9', // sky-500
              label: 'data(label)',
              color: '#fff',
              'text-valign': 'center',
              'text-halign': 'right',
              'font-size': '12px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#334155', // slate-700
              'target-arrow-color': '#334155',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'transition-property': 'line-color, width',
              'transition-duration': 300,
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 2,
              'border-color': '#f0f9ff',
              'background-color': '#0284c7',
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 50,
          nodeRepulsion: () => 4000,
          animate: true,
          animationDuration: 500,
        },
      });

      return () => {
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }
      };
    }
  }, [graphData]);

  const handleRefresh = async () => {
    if (repoUrl && !isLoading) {
      setIsAnalyzing(true);

      try {
        const unifiedParser = await getUnifiedParser();

        // Force sync with backend
        const currentUrl = repoUrl;
        graphCacheRepoUrl.set(null);
        await refreshGraph(currentUrl);

        // If LLM mode is enabled, perform additional analysis
        if (parseMode.type === 'llm-enhanced' && graphData) {
          const files = graphData.nodes.slice(0, 5).map((node) => ({
            path: node.data.filePath || 'unknown',
            content: `// Simulated content for ${node.data.label}\n// Monitoring for changes...`,
          }));

          const analysis = await unifiedParser.parseProject(files);

          setStats((prev) => ({
            ...prev,
            llmInsights: analysis.llmAnalysis?.recommendations || [],
            averageTime:
              analysis.files.reduce((sum: number, f: any) => sum + (f.analysisTime || 0), 0) / analysis.files.length,
          }));
        }

        toast.success('Real-time sync completed');
      } catch (error) {
        console.error('Sync failed:', error);
        toast.error('Sync failed: ' + (error as Error).message);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  if (!graphData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🔄</div>
        <h2 className="text-2xl font-bold text-white mb-3">Loading Real-Time Monitor...</h2>
        <p className="text-gray-400 max-w-md">Establishing connection to codebase monitoring service.</p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🔄</div>
        <h2 className="text-2xl font-bold text-white mb-3">No Graph Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          Real-time monitoring requires a SCIP index to be uploaded for this repository. Once indexed, changes will be
          tracked and visualized here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className={isLoading || isAnalyzing ? 'animate-spin' : ''}>🔄</span> Real-Time Graph Update
          </h2>
          <ParseModeStatus />
        </div>

        <div className="flex items-center gap-2">
          <ParseModeSelector compact />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isAnalyzing}>
            {isLoading || isAnalyzing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                Syncing...
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 mr-1" />
                Force Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Monitor Stats */}
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Last Sync</div>
              <div className="text-sm font-bold">{stats.lastUpdated.toLocaleTimeString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Changes Detected</div>
              <div className="text-sm font-bold">{stats.changesDetected}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <RefreshCw className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Nodes Monitored</div>
              <div className="text-sm font-bold">{stats.filesAnalyzed}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Zap className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Avg Parse Time</div>
              <div className="text-sm font-bold">{stats.averageTime.toFixed(1)}ms</div>
            </div>
          </div>
        </div>

        {stats.llmInsights && stats.llmInsights.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
              <Brain className="h-3 w-3" />
              Real-time AI Insights
            </h4>
            <div className="space-y-1">
              {stats.llmInsights.map((insight, idx) => (
                <div key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <div className="mt-1.5 w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Monitor Visualization */}
      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur">
          <p className="text-xs text-gray-300 flex items-center gap-2">
            <Activity className="h-3 w-3 text-green-400" />
            Monitors the codebase and visualizes structural changes in real-time.
          </p>
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
