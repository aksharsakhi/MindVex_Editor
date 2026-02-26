/**
 * ArchitecturePage.tsx
 *
 * Enhanced Architecture / Dependency Graph tool with unified parser support
 * and parser-only vs LLM-enhanced modes.
 */

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache } from '~/lib/stores/graphCacheStore';
import { 
  getUnifiedParser, 
  parseModeStore, 
  ParseModeSelector, 
  ParseModeStatus,
  type ProjectAnalysis,
  type LLMAnalysis 
} from '~/lib/unifiedParser';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Brain, Zap, Info, RefreshCw, Download, Layers } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  onBack: () => void;
}

interface AnalysisResult {
  metadata: {
    totalFiles: number;
    totalDirectories: number;
    languages: Record<string, number>;
    architectureType: string;
    patterns: string[];
  };
  llmAnalysis?: LLMAnalysis;
  analysisTime?: number;
}

export function ArchitecturePage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);
  const parseMode = useStore(parseModeStore);
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLLMDetails, setShowLLMDetails] = useState(false);

  useEffect(() => {
    if (containerRef.current && graphData) {
      // Create compound nodes for directories to group files
      const elements: cytoscape.ElementDefinition[] = [];
      const dirs = new Set<string>();

      // Extract directories and create parent nodes
      graphData.nodes.forEach((n) => {
        const filePath = n.data.filePath || '';
        const pathParts = filePath.split(/[/\\]/);

        if (pathParts.length > 1) {
          const dirPath = pathParts.slice(0, -1).join('/');

          if (!dirs.has(dirPath)) {
            dirs.add(dirPath);
            elements.push({
              data: {
                id: `dir_${dirPath}`,
                label: dirPath,
              },
              classes: 'dirData',
            });
          }

          // Add node with parent reference
          elements.push({
            data: {
              ...n.data,
              parent: `dir_${dirPath}`,
            },
          });
        } else {
          // Node in root
          elements.push({ data: n.data });
        }
      });

      // Add edges
      graphData.edges.forEach((e) => {
        elements.push({ data: e.data });
      });

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node[^parent]', // non-compound nodes (files)
            style: {
              'background-color': '#10B981', // emerald-500
              label: 'data(label)',
              color: '#fff',
              'text-valign': 'center',
              'text-halign': 'right',
              'font-size': '12px',
            },
          },
          {
            selector: '.dirData', // compound nodes (directories)
            style: {
              'background-color': '#1E293B', // slate-800
              'background-opacity': 0.5,
              label: 'data(label)',
              color: '#94A3B8', // slate-400
              'text-valign': 'top',
              'text-halign': 'center',
              'font-size': '14px',
              'font-weight': 'bold',
              'text-margin-y': -5,
              'border-width': 1,
              'border-color': '#475569', // slate-600
              padding: '15px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#64748B', // slate-500
              'target-arrow-color': '#64748B',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.8,
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 50,
          nodeRepulsion: () => 4000,
          animate: true,
          animationDuration: 1000,
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

  const performEnhancedAnalysis = async () => {
    if (!graphData || !graphData.nodes.length) {
      toast.warning('No graph data available for architecture analysis');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const unifiedParser = await getUnifiedParser();
      
      const files = graphData.nodes.map(node => {
        const language = node.data.language || 'javascript';
        const fileName = node.data.label || 'unknown';
        const filePath = node.data.filePath || `${fileName}.${language}`;
        
        return {
          path: filePath,
          content: `// Simulated content for ${fileName}\n// Language: ${language}\n\nclass ${fileName} {}`,
        };
      });

      const projectAnalysis = await unifiedParser.parseProject(files);
      
      const dirs = new Set<string>();
      graphData.nodes.forEach(n => {
        const filePath = n.data.filePath || '';
        const pathParts = filePath.split(/[/\\]/);
        if (pathParts.length > 1) {
          dirs.add(pathParts.slice(0, -1).join('/'));
        }
      });

      const result: AnalysisResult = {
        metadata: {
          totalFiles: projectAnalysis.projectMetadata.totalFiles,
          totalDirectories: dirs.size,
          languages: projectAnalysis.projectMetadata.languages as Record<string, number>,
          architectureType: projectAnalysis.llmAnalysis?.architecture.type || 'Mixed',
          patterns: projectAnalysis.llmAnalysis?.architecture.patterns || [],
        },
        llmAnalysis: projectAnalysis.llmAnalysis,
        analysisTime: projectAnalysis.files.reduce((sum: number, file: any) => sum + (file.analysisTime || 0), 0),
      };

      setAnalysisResult(result);
      toast.success('Enhanced architecture analysis completed');
    } catch (error) {
      console.error('Architecture analysis failed:', error);
      toast.error('Architecture analysis failed: ' + (error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportAnalysis = () => {
    if (!analysisResult) {
      toast.warning('No analysis results to export');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      mode: parseMode.type,
      model: parseMode.model,
      analysis: analysisResult,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Architecture analysis exported successfully');
  };

  if (!graphData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">📊</div>
        <h2 className="text-2xl font-bold text-white mb-3">Loading Architecture Data...</h2>
        <p className="text-gray-400 max-w-md">
          Analyzing project structure and module dependencies.
        </p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">📊</div>
        <h2 className="text-2xl font-bold text-white mb-3">No Architecture Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          The architecture graph requires a SCIP index to be uploaded for this repository. Once indexed, this page will
          display module-level architecture and dependency structure.
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
            <span>📊</span> Architecture / Dependency Graph
          </h2>
          <ParseModeStatus />
        </div>
        
        <div className="flex items-center gap-2">
          <ParseModeSelector compact />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={performEnhancedAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 mr-1" />
                Analyze
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportAnalysis}
            disabled={!analysisResult}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Analysis Summary */}
      {analysisResult && (
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Total Files</div>
              <div className="text-xl font-bold">{analysisResult.metadata.totalFiles}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Directories</div>
              <div className="text-xl font-bold">{analysisResult.metadata.totalDirectories}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Architecture</div>
              <div className="text-xl font-bold">{analysisResult.metadata.architectureType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Analysis Time</div>
              <div className="text-xl font-bold">{analysisResult.analysisTime}ms</div>
            </div>
          </div>
          
          {analysisResult.llmAnalysis && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Architectural Insights
                </h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowLLMDetails(!showLLMDetails)}
                >
                  {showLLMDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>
              
              {showLLMDetails && (
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Summary:</strong> {analysisResult.llmAnalysis.summary}
                  </div>
                  {analysisResult.llmAnalysis.architecture.patterns.length > 0 && (
                    <div>
                      <strong>Architectural Patterns:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.llmAnalysis.architecture.patterns.map((pattern, idx) => (
                          <Badge key={idx} variant="outline" size="sm">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysisResult.llmAnalysis.architecture.issues.length > 0 && (
                    <div>
                      <strong>Architectural Issues:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-red-400">
                        {analysisResult.llmAnalysis.architecture.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Architecture Visualization */}
      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur">
          <p className="text-xs text-gray-300 flex items-center gap-2">
            <Layers className="h-3 w-3" />
            Files are grouped by their directory structure to show module architecture.
          </p>
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}