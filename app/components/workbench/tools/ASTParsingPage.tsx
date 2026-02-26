/**
 * ASTParsingPage.tsx
 *
 * Enhanced Multi-Language AST Parsing tool with unified parser support
 * and parser-only vs LLM-enhanced modes.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
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
import { Brain, Zap, Info, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  onBack: () => void;
}

interface AnalysisResult {
  languages: Array<{
    name: string;
    count: number;
    color: string;
    complexity: number;
    patterns: string[];
  }>;
  totalFiles: number;
  totalComplexity: number;
  llmAnalysis?: LLMAnalysis;
  analysisTime?: number;
}

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3572A5',
  java: '#b07219',
  kotlin: '#A97BFF',
  go: '#00ADD8',
  rust: '#dea584',
  cpp: '#f34b7d',
  c: '#A8B9CC',
  csharp: '#178600',
  html: '#E34C26',
  css: '#1572B6',
  json: '#000000',
  yaml: '#CB171E',
  markdown: '#083FA1',
  php: '#777BB4',
  ruby: '#CC342D',
  swift: '#FA7343',
  dart: '#0175C2',
  lua: '#000080',
  shell: '#89E051',
  sql: '#336791',
  xml: '#F37C00',
  dockerfile: '#2496ED',
  makefile: '#427819',
  cmake: '#064F8C',
  toml: '#9C4221',
  ini: '#000000',
  perl: '#39457E',
  r: '#276DC3',
  julia: '#9558B2',
  elixir: '#6E4A9E',
  clojure: '#5881D8',
  haskell: '#5E5086',
  scala: '#DC322F',
  erlang: '#A90533',
  fsharp: '#378BBA',
  ocaml: '#EC6813',
  scheme: '#1E4AEC',
  lisp: '#3FB68D',
  fortran: '#4D41B1',
  matlab: '#0076A8',
  vba: '#867DB1',
  powershell: '#012456',
  vim: '#019733',
  latex: '#008080',
  bibtex: '#778899',
  graphql: '#E10098',
  proto: '#E68523',
  thrift: '#0088CC',
  capnp: '#D1660A',
  asn1: '#FFD700',
  regex: '#FF6347',
  diff: '#88AAFF',
  gitcommit: '#F44D27',
  gitrebase: '#F44D27',
  gitattributes: '#F44D27',
  gitignore: '#F44D27',
  dockerignore: '#2496ED',
  editorconfig: '#FF6347',
  eslintignore: '#4B32C3',
  prettierignore: '#1A2B34',
  npmignore: '#CB3837',
  yarnignore: '#2C8EBB',
  pnpmignore: '#F69220',
  bazel: '#43A047',
  buck: '#0081CB',
  meson: '#007FAA',
  ninja: '#14A085',
  gn: '#FF6347',
  gnbuild: '#FF6347',
  gnargs: '#FF6347',
  starlark: '#76D275',
  unknown: '#6B7280',
};

export function ASTParsingPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);
  const parseMode = useStore(parseModeStore);
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLLMDetails, setShowLLMDetails] = useState(false);

  const languageStats = useMemo(() => {
    if (!graphData) {
      return [];
    }

    const counts: Record<string, number> = {};

    for (const node of graphData.nodes) {
      const lang = node.data.language || 'unknown';
      counts[lang] = (counts[lang] || 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [graphData]);

  useEffect(() => {
    if (containerRef.current && graphData) {
      const elements = [
        ...graphData.nodes.map((n) => ({ data: n.data })),
        ...graphData.edges.map((e) => ({ data: e.data })),
      ];

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele) => LANGUAGE_COLORS[ele.data('language')] || LANGUAGE_COLORS.unknown,
              label: 'data(label)',
              color: '#fff',
              'text-valign': 'center',
              'text-halign': 'right',
              'font-size': '12px',
              'width': 35,
              'height': 35,
              'shape': 'ellipse',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1.5,
              'line-color': '#374151',
              'target-arrow-color': '#374151',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.6,
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 50,
          nodeRepulsion: () => 4000,
          idealEdgeLength: 100,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500,
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
      toast.warning('No AST data available for analysis');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Get the unified parser
      const unifiedParser = await getUnifiedParser();
      
      // Simulate file analysis based on graph data
      const files = graphData.nodes.map(node => {
        const language = node.data.language || 'javascript';
        const fileName = node.data.label || 'unknown';
        const filePath = node.data.filePath || `${fileName}.${language}`;
        
        return {
          path: filePath,
          content: `// Simulated content for ${fileName}
// Language: ${language}

class ${fileName} {
  // Implementation
  constructor() {
    // Initialize
  }
  
  method1() {
    // Method implementation
    return "result";
  }
  
  method2(param) {
    // Another method
    if (param) {
      return param.toString();
    }
    return null;
  }
}`,
        };
      });

      // Perform unified analysis
      const projectAnalysis = await unifiedParser.parseProject(files);
      
      const languages = projectAnalysis.files.map((file: any) => ({
        name: file.language,
        count: 1,
        color: LANGUAGE_COLORS[file.language] || LANGUAGE_COLORS.unknown,
        complexity: file.metadata.complexity,
        patterns: file.llmAnalysis?.patterns?.map((p: any) => p.name) || [],
      }));

      // Group by language
      const languageMap = new Map<string, typeof languages[0]>();
      languages.forEach((lang: any) => {
        const existing = languageMap.get(lang.name);
        if (existing) {
          existing.count += lang.count;
          existing.complexity += lang.complexity;
          existing.patterns.push(...lang.patterns);
        } else {
          languageMap.set(lang.name, lang);
        }
      });

      const result: AnalysisResult = {
        languages: Array.from(languageMap.values()),
        totalFiles: projectAnalysis.projectMetadata.totalFiles,
        totalComplexity: projectAnalysis.projectMetadata.complexity.average,
        llmAnalysis: projectAnalysis.llmAnalysis,
        analysisTime: projectAnalysis.files.reduce((sum: number, file: any) => sum + (file.analysisTime || 0), 0),
      };

      setAnalysisResult(result);
      toast.success('Enhanced AST analysis completed');
    } catch (error) {
      console.error('AST analysis failed:', error);
      toast.error('AST analysis failed: ' + (error as Error).message);
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
    a.download = `ast-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('AST analysis exported successfully');
  };

  if (!graphData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-2xl font-bold text-white mb-3">Loading AST Data...</h2>
        <p className="text-gray-400 max-w-md">
          Parsing abstract syntax trees for multi-language code analysis.
        </p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-2xl font-bold text-white mb-3">No AST Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          Multi-language AST parsing requires a SCIP index to be uploaded for this repository. Once indexed, this page
          will display language breakdowns and color-coded file relationships.
        </p>
        <div className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-lg p-4 max-w-md">
          <strong>Supported Languages:</strong> TypeScript, JavaScript, Python, Java, Go, Rust, C/C++, HTML, CSS, JSON, YAML, Markdown
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
            <span>🔍</span> Multi-Language AST Parsing
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
              <div className="text-xl font-bold">{analysisResult.totalFiles}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Languages</div>
              <div className="text-sm">
                {analysisResult.languages.slice(0, 3).map(lang => (
                  <Badge key={lang.name} variant="outline" className="mr-1 mb-1">
                    {lang.name}: {lang.count}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Avg Complexity</div>
              <div className="text-xl font-bold">{analysisResult.totalComplexity.toFixed(1)}</div>
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

      {/* AST Visualization */}
      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative flex">
        <div ref={containerRef} className="flex-1 h-full" />

        <div className="w-64 border-l border-gray-700 bg-gray-800/50 p-4 overflow-y-auto">
          <h3 className="font-bold text-gray-200 mb-4">Language Breakdown</h3>
          <div className="space-y-3">
            {languageStats.map(([lang, count]) => (
              <div
                key={lang}
                className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.unknown }}
                  />
                  <span className="text-sm font-medium capitalize text-gray-300">{lang}</span>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">{count}</span>
              </div>
            ))}
          </div>
          
          {analysisResult && (
            <div className="mt-6">
              <h4 className="font-bold text-gray-200 mb-2">Analysis Summary</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Files:</span>
                  <span className="text-gray-200">{analysisResult.totalFiles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Complexity:</span>
                  <span className="text-gray-200">{analysisResult.totalComplexity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="text-gray-200">
                    {parseMode.type === 'parser-only' ? 'Parser' : 'LLM'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Analysis Time:</span>
                  <span className="text-gray-200">{analysisResult.analysisTime}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}