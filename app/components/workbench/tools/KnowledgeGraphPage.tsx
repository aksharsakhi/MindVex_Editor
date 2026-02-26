/**
 * KnowledgeGraphPage.tsx
 *
 * Enhanced Knowledge Graph Construction tool with unified parser support
 * and parser-only vs LLM-enhanced modes.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { graphCache } from '~/lib/stores/graphCacheStore';
import { workbenchStore } from '~/lib/stores/workbench';
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
import { Brain, Zap, Info, RefreshCw, Download, Maximize, Box, Layout } from 'lucide-react';
import { toast } from 'react-toastify';

// Dynamic imports for force graphs to avoid SSR issues
import { ForceGraph2D, ForceGraph3D, SpriteText } from '~/components/ui/ForceGraph.client';

interface Props {
  onBack: () => void;
}

interface AnalysisResult {
  nodes: any[];
  edges: any[];
  metadata: {
    totalFiles: number;
    languages: Record<string, number>;
    complexity: number;
    patterns: string[];
  };
  llmAnalysis?: LLMAnalysis;
  analysisTime?: number;
}

export function KnowledgeGraphPage({ onBack }: Props) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);
  const parseMode = useStore(parseModeStore);
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLLMDetails, setShowLLMDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [originalASTGraph, setOriginalASTGraph] = useState<any>(null);

  // Load initial graph data into originalASTGraph when it first arrives
  useEffect(() => {
    if (graphData && !originalASTGraph && !isAnalyzing) {
      setOriginalASTGraph(JSON.parse(JSON.stringify(graphData)));
    }
  }, [graphData, originalASTGraph, isAnalyzing]);

  // Sync with parseMode and handle switching back
  useEffect(() => {
    if (parseMode.type === 'parser-only' && originalASTGraph) {
      graphCache.set(originalASTGraph);
      setAnalysisResult(null);
    }
  }, [parseMode.type, originalASTGraph]);

  useEffect(() => {
    console.log("GRAPH DATA:", graphData);
    console.log("NODES:", graphData?.nodes?.length);
    console.log("EDGES:", graphData?.edges?.length);
  }, [graphData]);

  // Format data for react-force-graph
  const forceGraphData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    
    // Create a map to ensure unique nodes by ID
    const nodeMap = new Map();
    graphData.nodes.forEach(n => {
      // Normalize ID: trim whitespace
      const id = n.data.id.trim();
      nodeMap.set(id, {
        id: id,
        name: n.data.label,
        val: ((n.data as any).complexity || 1) + 8,
        color: getLanguageColor(n.data.language),
        language: n.data.language,
        filePath: n.data.filePath
      });
    });

    const links = graphData.edges.map(e => {
      let source = typeof e.data.source === 'string' ? e.data.source : (e.data.source as any).id;
      let target = typeof e.data.target === 'string' ? e.data.target : (e.data.target as any).id;
      
      // Normalize source/target
      source = source.trim();
      target = target.trim();

      return {
        source,
        target,
        label: (e.data as any).label || 'depends',
        strength: (e.data as any).strength || 1
      };
    }).filter(l => {
      const hasSource = nodeMap.has(l.source);
      const hasTarget = nodeMap.has(l.target);
      
      if (!hasSource || !hasTarget) {
        console.warn('Dropping invalid link:', l, { hasSource, hasTarget });
      }
      return hasSource && hasTarget;
    });

    console.log('FORCE GRAPH DATA:', { 
      nodeCount: nodeMap.size, 
      linkCount: links.length,
      sampleNode: Array.from(nodeMap.values())[0],
      sampleLink: links[0]
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links
    };
  }, [graphData]);

  function getLanguageColor(lang: string = ''): string {
    const colors: Record<string, string> = {
      'java': '#F97316',
      'python': '#10B981',
      'javascript': '#F59E0B',
      'typescript': '#3B82F6',
      'go': '#00ADD8',
      'rust': '#CE422B',
      'cpp': '#004482',
      'c': '#A8B9CC',
      'html': '#E34C26',
      'css': '#1572B6',
      'json': '#000000',
      'yaml': '#CB171E',
      'markdown': '#083FA1',
    };
    return colors[lang.toLowerCase()] || '#3B82F6';
  }

  // Automatic fitting and centering
  useEffect(() => {
    if (graphRef.current) {
      // Apply custom forces if the library supports it via d3Force
      if (typeof (graphRef.current as any).d3Force === 'function') {
        (graphRef.current as any).d3Force('link')?.distance((link: any) => 
          (viewMode === '2d' ? 100 : 150) / (link.strength || 1)
        );
      }

      // Zoom to fit after data changes
      setTimeout(() => {
        if (viewMode === '2d' && graphRef.current?.zoomToFit) {
          graphRef.current.zoomToFit(400, 100);
        }
      }, 500);
    }
  }, [forceGraphData, viewMode]);

  const performEnhancedAnalysis = async () => {
    if (!graphData || !graphData.nodes.length) {
      toast.warning('No graph data available for analysis');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Save current AST graph as original if not already saved
      if (!originalASTGraph) {
        setOriginalASTGraph(JSON.parse(JSON.stringify(graphData)));
      }

      // Get the unified parser
      const unifiedParser = await getUnifiedParser();
      
      // Sync the mode with the current store value
      unifiedParser.setMode(parseMode);
      
      // Get real content from workbench store
      const filesMap = workbenchStore.files.get();
      
      const files = graphData.nodes.map(node => {
        const language = node.data.language || 'javascript';
        const fileName = node.data.label || 'unknown';
        const filePath = node.data.filePath || `${fileName}.${language}`;
        
        // Try to get content from workbench store
        const workbenchFile = filesMap[filePath];
        const content = (workbenchFile?.type === 'file' ? (workbenchFile as any).content : null) || 
                       `// Content for ${fileName}\n// Path: ${filePath}`;
        
        return {
          path: filePath,
          content: content,
        };
      });

      // Perform unified analysis
      const projectAnalysis = await unifiedParser.parseProject(files);

      // Attach content back to analysis results for local reference checking
      projectAnalysis.files.forEach(f => {
        const originalFile = files.find(input => input.path === f.filePath);
        if (originalFile) {
          (f as any).content = originalFile.content;
        }
      });
      
      // ─── Build graph from AI analysis ──────────────────────────────────────────
      
      let newNodes: any[] = [];
      let newEdges: any[] = [];

      if (projectAnalysis.llmAnalysis?.graph && projectAnalysis.llmAnalysis.graph.edges.length > 0) {
        // Use AI-generated graph data
        newNodes = projectAnalysis.llmAnalysis.graph.nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            filePath: node.id,
            language: node.id.split('.').pop() || 'unknown',
          }
        }));

        newEdges = projectAnalysis.llmAnalysis.graph.edges.map((edge, idx) => ({
          data: {
            id: `ai-edge-${idx}`,
            source: edge.source,
            target: edge.target,
            label: edge.type,
            strength: edge.strength || 1,
          }
        }));
        
        console.log('Using AI-generated graph with edges:', newEdges.length);
      } else {
        // Fallback to basic AST-based graph if AI didn't provide graph data OR returned no edges
        console.log('AI returned no edges, falling back to AST-based graph construction');
        
        newNodes = projectAnalysis.files.map(file => ({
          data: {
            id: file.filePath,
            label: file.filePath.split('/').pop() || 'unknown',
            filePath: file.filePath,
            language: file.language,
            complexity: file.metadata.complexity,
            linesOfCode: file.metadata.linesOfCode,
          }
        }));

        projectAnalysis.files.forEach(file => {
          file.metadata.imports.forEach(imp => {
            const target = projectAnalysis.files.find(f => {
              // Normalize file paths for comparison
              const normalizedFilePath = f.filePath.replace(/\\/g, '/');
              const normalizedImport = imp.module.replace(/\./g, '/');
              
              // Check if import matches file path (e.g. com/example/User matches src/main/java/com/example/User.java)
              return normalizedFilePath.includes(normalizedImport) || 
                     (f.language === 'java' && normalizedFilePath.endsWith(`/${imp.symbols[0]}.java`));
            });
            
            if (target) {
              newEdges.push({
                data: {
                  id: `${file.filePath}-${target.filePath}`,
                  source: file.filePath,
                  target: target.filePath,
                  type: 'import',
                  label: imp.symbols.join(', ') || 'imports',
                }
              });
            }
          });
        });
      }

      // 3. Fallback: Check for same-package dependencies or relative file siblings
      if (projectAnalysis) {
        projectAnalysis.files.forEach(file => {
          // Check for package-based linking (Java, Go, Kotlin, PHP, C/C++)
          if ((['java', 'go', 'kotlin', 'php', 'c', 'cpp'].includes(file.language)) && file.metadata.packageName) {
            // Find other files in the same package
            const samePackageFiles = projectAnalysis.files.filter(f => 
              f.filePath !== file.filePath && 
              f.language === file.language && 
              f.metadata.packageName === file.metadata.packageName
            );

            // Read file content to check for references
            const fileContent = (file as any).content || ''; 
            
            samePackageFiles.forEach(sibling => {
              // Extract potential class/struct/func name from file path
              const siblingName = sibling.filePath.split('/').pop()?.split('.')[0];
              
              if (siblingName) {
                // Check for various forms of usage:
                // 1. Instantiation: new BaseEntity()
                // 2. Declaration: BaseEntity entity;
                // 3. Inheritance: extends BaseEntity
                // 4. Implementation: implements BaseEntity
                // 5. Generic: List<BaseEntity>
                // 6. Static access: BaseEntity.someMethod()
                
                const usageRegex = new RegExp(`\\b${siblingName}\\b`);
                
                if (usageRegex.test(fileContent)) {
                  // Avoid duplicates
                  const edgeId = `${file.filePath}-${sibling.filePath}`;
                  if (!newEdges.some(e => e.data.id === edgeId)) {
                    console.log(`Adding implicit package edge: ${file.filePath} -> ${sibling.filePath} (${siblingName})`);
                    newEdges.push({
                      data: {
                        id: edgeId,
                        source: file.filePath,
                        target: sibling.filePath,
                        type: 'package_reference',
                        label: 'uses',
                        strength: 2
                      }
                    });
                  }
                }
              }
            });
          }
          
          // Check for Python same-directory implicit module access (rare but possible in some patterns)
          if (file.language === 'python') {
            const dir = file.filePath.substring(0, file.filePath.lastIndexOf('/'));
            const sameDirFiles = projectAnalysis.files.filter(f => 
              f.filePath !== file.filePath && 
              f.language === 'python' && 
              f.filePath.startsWith(dir) &&
              f.filePath.split('/').length === file.filePath.split('/').length
            );

            const fileContent = (file as any).content || '';
            
            sameDirFiles.forEach(sibling => {
               const moduleName = sibling.filePath.split('/').pop()?.replace('.py', '');
               if (moduleName && fileContent.includes(moduleName)) {
                  const edgeId = `${file.filePath}-${sibling.filePath}`;
                  if (!newEdges.some(e => e.data.id === edgeId)) {
                    newEdges.push({
                      data: {
                        id: edgeId,
                        source: file.filePath,
                        target: sibling.filePath,
                        type: 'module_reference',
                        label: 'uses',
                        strength: 1
                      }
                    });
                  }
               }
            });
          }
        });
      }

      // Update the graph cache with the new, AI-verified data
      graphCache.set({
        nodes: newNodes,
        edges: newEdges,
        cycles: [], 
        isFallback: false
      });

      const result: AnalysisResult = {
        nodes: newNodes,
        edges: newEdges,
        metadata: {
          totalFiles: projectAnalysis.projectMetadata.totalFiles,
          languages: projectAnalysis.projectMetadata.languages as Record<string, number>,
          complexity: projectAnalysis.projectMetadata.complexity.average,
          patterns: projectAnalysis.llmAnalysis?.patterns?.map((p: any) => p.name) || [],
        },
        llmAnalysis: projectAnalysis.llmAnalysis,
        analysisTime: projectAnalysis.files.reduce((sum: number, file: any) => sum + (file.analysisTime || 0), 0),
      };

      setAnalysisResult(result);
      toast.success('Enhanced analysis completed');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed: ' + (error as Error).message);
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
    a.download = `knowledge-graph-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Analysis exported successfully');
  };

  if (!graphData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🧠</div>
        <h2 className="text-2xl font-bold text-white mb-3">Loading Knowledge Graph...</h2>
        <p className="text-gray-400 max-w-md">
          The knowledge graph is being constructed from your codebase analysis.
        </p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🧠</div>
        <h2 className="text-2xl font-bold text-white mb-3">No Graph Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          The knowledge graph requires a SCIP index to be uploaded for this repository. Once indexed, this page will
          display all file nodes and their dependency relationships.
        </p>
        <div className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md">
          <strong>How to populate:</strong> Upload a SCIP index via the <code>/api/scip/upload</code> endpoint for this
          repository, then refresh the graph.
        </div>
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
            <span>🧠</span> Knowledge Graph Construction
          </h2>
          <ParseModeStatus />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 mr-2">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === '2d' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layout className="w-3 h-3" />
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === '3d' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Box className="w-3 h-3" />
              3D
            </button>
          </div>
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
            onClick={() => {
              if (graphRef.current) {
                if (viewMode === '2d') {
                  graphRef.current.zoomToFit(400, 100);
                } else {
                  graphRef.current.zoomToFit(400);
                }
              }
            }}
            title="Fit Graph to View"
          >
            <Maximize className="h-3 w-3 mr-1" />
            Fit View
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
              <div className="text-sm text-gray-400">Languages</div>
              <div className="text-sm">
                {Object.entries(analysisResult.metadata.languages).map(([lang, count]) => (
                  <Badge key={lang} variant="outline" className="mr-1 mb-1">
                    {lang}: {count}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Avg Complexity</div>
              <div className="text-xl font-bold">{analysisResult.metadata.complexity.toFixed(1)}</div>
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
                  AI Analysis
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
                  <div>
                    <strong>Architecture:</strong> {analysisResult.llmAnalysis.architecture.type}
                  </div>
                  {analysisResult.llmAnalysis.patterns.length > 0 && (
                    <div>
                      <strong>Patterns:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.llmAnalysis.patterns.map((pattern, idx) => (
                          <Badge key={idx} variant="outline" size="sm">
                            {pattern.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysisResult.llmAnalysis.recommendations.length > 0 && (
                    <div>
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {analysisResult.llmAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <div className="text-xs text-gray-400">Complexity Score</div>
                      <div className="text-lg font-bold">{analysisResult.llmAnalysis.complexity.score.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Quality Score</div>
                      <div className="text-lg font-bold">{analysisResult.llmAnalysis.quality.score.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Issues</div>
                      <div className="text-lg font-bold">{analysisResult.llmAnalysis.quality.issues.length}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Graph Visualization */}
      <div className="flex-1 min-h-0 border border-gray-700 rounded-xl bg-gray-950 overflow-hidden relative group">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="text-xs text-gray-400">
            Nodes: {forceGraphData.nodes.length} | Edges: {forceGraphData.links.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Mode: {parseMode.type === 'parser-only' ? 'Parser Only' : 'LLM Enhanced'}
            {parseMode.model && ` (${parseMode.model})`}
          </div>
        </div>
        
        <div className="w-full h-full min-h-[600px]">
          <ClientOnly>
            {() => (
              viewMode === '3d' ? (
                <ForceGraph3D
                  ref={graphRef}
                  graphData={forceGraphData}
                  nodeLabel="name"
                  nodeColor="color"
                  nodeThreeObject={(node: any) => {
                    const sprite = new SpriteText(node.name);
                    sprite.color = node.color;
                    sprite.textHeight = 8;
                    return sprite;
                  }}
                  nodeThreeObjectExtend={true}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkCurvature={0.25}
                  backgroundColor="#020617"
                  linkColor={() => '#475569'}
                  linkLabel="label"
                />
              ) : (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={forceGraphData}
                  nodeLabel="name"
                  nodeColor="color"
                  nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.color;
                    ctx.fillText(label, node.x, node.y);

                    node.__bckgDimensions = bckgDimensions;
                  }}
                  nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    ctx.fillStyle = color;
                    const bckgDimensions = node.__bckgDimensions;
                    bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                  }}
                  linkWidth={(link: any) => (link.strength || 1) * 0.5}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.005}
                  linkDirectionalArrowLength={3}
                  linkDirectionalArrowRelPos={1}
                  linkCurvature={0.25}
                  backgroundColor="#020617"
                  linkColor={() => '#334155'}
                  linkLabel="label"
                />
              )
            )}
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}