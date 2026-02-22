import { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type {
  ElementsDefinition,
  EdgeDefinition,
  NodeDefinition,
  EventObject,
  NodeSingular,
  EdgeSingular,
} from 'cytoscape';
import { KnowledgeGraphBuilder, IncrementalGraphUpdater } from '~/lib/services/knowledge-graph';
import { webcontainer } from '~/lib/webcontainer';
import { workbenchStore } from '~/lib/stores/workbench';

// Define types for our graph
interface GraphNode {
  id: string;
  name: string;
  type: 'module' | 'class' | 'function' | 'variable';
  filePath: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'import' | 'call' | 'inheritance' | 'dependency' | 'usage';
}

interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Simple path utilities for browser environment
interface PathUtils {
  extname: (path: string) => string;
  basename: (path: string, ext?: string) => string;
}

const pathUtils: PathUtils = {
  extname: (path: string): string => {
    // Extract the file name by splitting on both forward and backward slashes
    const parts = path.replace(/\\/g, '/').replace(/\//g, '/').split('/');
    const fileName = parts[parts.length - 1];

    // Find the last occurrence of '.' in the filename
    const lastDotIndex = fileName.lastIndexOf('.');

    // Return empty string if no extension or if it starts with a dot (hidden file)
    if (lastDotIndex <= 0) {
      return '';
    }

    // Return the extension including the dot
    return fileName.substring(lastDotIndex);
  },
  basename: (path: string, ext?: string): string => {
    // Extract the file name by splitting on both forward and backward slashes
    const parts = path.replace(/\\/g, '/').replace(/\//g, '/').split('/');
    let fileName = parts[parts.length - 1];

    // Remove extension if provided
    if (ext && fileName.endsWith(ext)) {
      fileName = fileName.slice(0, -ext.length);
    }

    return fileName;
  },
};

export function ArchitectureGraph() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Initialize the graph visualization
  useEffect(() => {
    if (containerRef.current && graph) {
      // Destroy existing instance if exists
      if (cyRef.current) {
        cyRef.current.destroy();
      }

      // Prepare cytoscape elements
      const elements: ElementsDefinition = {
        nodes: graph.nodes.map((node: GraphNode) => ({
          data: {
            id: node.id,
            label: node.name,
            type: node.type,
            filePath: node.filePath,
          },
        })),
        edges: graph.edges.map((edge: GraphEdge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        })),
      };

      // Initialize cytoscape
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              width: 10,
              height: 10,
              shape: 'ellipse',
              'background-color': (ele: NodeSingular) => {
                const type = ele.data('type');

                switch (type) {
                  case 'module':
                    return '#3B82F6'; // blue
                  case 'class':
                    return '#8B5CF6'; // purple
                  case 'function':
                    return '#10B981'; // green
                  case 'variable':
                    return '#F59E0B'; // yellow
                  default:
                    return '#6B7280'; // gray
                }
              },
              color: '#FFFFFF',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '10px',
              'text-outline-color': '#000000',
              'text-outline-width': '1px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': (ele: EdgeSingular) => {
                const type = ele.data('type');

                switch (type) {
                  case 'import':
                    return '#3B82F6'; // blue
                  case 'call':
                    return '#EC4899'; // pink
                  case 'inheritance':
                    return '#10B981'; // green
                  case 'dependency':
                    return '#F59E0B'; // yellow
                  case 'usage':
                    return '#8B5CF6'; // purple
                  default:
                    return '#6B7280'; // gray
                }
              },
              'target-arrow-color': (ele: EdgeSingular) => {
                const type = ele.data('type');

                switch (type) {
                  case 'import':
                    return '#3B82F6';
                  case 'call':
                    return '#EC4899';
                  case 'inheritance':
                    return '#10B981';
                  case 'dependency':
                    return '#F59E0B';
                  case 'usage':
                    return '#8B5CF6';
                  default:
                    return '#6B7280';
                }
              },
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          {
            selector: 'node.highlighted',
            style: {
              'border-width': 3,
              'border-color': '#FFD700',
              'background-color': '#FFD700',
            },
          },
          {
            selector: 'edge.highlighted',
            style: {
              width: 4,
              'line-color': '#FFD700',
              'target-arrow-color': '#FFD700',
            },
          },
        ],
        layout: {
          name: 'cose', // Force-directed layout
          animate: true,
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 400000,
          nodeOverlap: 20,
          idealEdgeLength: 100,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          stop: undefined,
          ready: undefined,
        },
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        autounselectify: true,
      });

      // Handle node click to highlight connected nodes
      cyRef.current.on('tap', 'node', (event: EventObject) => {
        const nodeId = event.target.id();
        setSelectedNode(nodeId);

        // Reset all highlights
        cyRef.current?.elements().removeClass('highlighted');

        // Highlight selected node
        cyRef.current?.getElementById(nodeId).addClass('highlighted');

        // Highlight connected edges and nodes
        const connectedEdges = event.target.connectedEdges();
        connectedEdges.addClass('highlighted');

        const connectedNodes = connectedEdges.connectedNodes();
        connectedNodes.not(event.target).addClass('highlighted');
      });

      // Handle zoom events
      cyRef.current.on('zoom', () => {
        if (cyRef.current) {
          setZoom(cyRef.current.zoom());
        }
      });

      // Fit to container initially
      cyRef.current.fit();
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [graph]);

  // Build the initial graph
  const buildGraph = async () => {
    setLoading(true);
    setError(null);
    setGraph(null);

    try {
      // Get all files from the current workspace
      const container = await webcontainer;

      async function getAllFiles(dirPath: string): Promise<{ path: string; content: string }[]> {
        const files: { path: string; content: string }[] = [];

        try {
          const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = dirPath + '/' + entry.name;

            if (
              entry.isDirectory() &&
              (entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === '.next' ||
                entry.name === '.vercel' ||
                entry.name === 'dist' ||
                entry.name === 'build' ||
                entry.name === 'coverage' ||
                entry.name.startsWith('.'))
            ) {
              continue; // Skip these directories
            }

            if (entry.isFile()) {
              // Include all supported file types
              const allowedExtensions = [
                '.py',
                '.java',
                '.js',
                '.jsx',
                '.ts',
                '.tsx',
                '.c',
                '.cpp',
                '.cs',
                '.rb',
                '.php',
                '.go',
                '.rs',
                '.kt',
                '.swift',
                '.scala',
                '.dart',
                '.html',
                '.css',
                '.scss',
                '.sql',
                '.json',
                '.yaml',
                '.yml',
                '.xml',
                '.md',
              ];

              if (allowedExtensions.some((ext) => fullPath.toLowerCase().endsWith(ext))) {
                try {
                  const content = await container.fs.readFile(fullPath, 'utf-8');
                  files.push({ path: fullPath, content: content.toString() });
                } catch (err) {
                  console.warn(`Could not read file ${fullPath}:`, err);
                }
              }
            } else if (entry.isDirectory()) {
              const subFiles = await getAllFiles(fullPath);
              files.push(...subFiles);
            }
          }
        } catch (error) {
          console.warn(`Could not read directory ${dirPath}:`, error);
        }

        return files;
      }

      const allFiles = await getAllFiles('/');

      // Filter for supported code files
      const codeFiles = allFiles.filter((file) => {
        const ext = pathUtils.extname(file.path).toLowerCase();
        const allowedExtensions = [
          '.py',
          '.java',
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.c',
          '.cpp',
          '.cs',
          '.rb',
          '.php',
          '.go',
          '.rs',
          '.kt',
          '.swift',
          '.scala',
          '.dart',
          '.html',
          '.css',
          '.scss',
          '.sql',
          '.json',
          '.yaml',
          '.yml',
          '.xml',
          '.md',
        ];

        return allowedExtensions.includes(ext);
      });

      if (codeFiles.length === 0) {
        setError('No supported code files found in the workspace');
        setLoading(false);

        return;
      }

      // Build the knowledge graph
      const builder = new KnowledgeGraphBuilder();
      const knowledgeGraph = builder.build(codeFiles);

      setGraph(knowledgeGraph as KnowledgeGraph);
    } catch (err) {
      console.error('Error building architecture graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to build architecture graph');
    } finally {
      setLoading(false);
    }
  };

  // Handle incremental update when files change
  const updateGraph = async (changedFiles: Array<{ path: string; content: string }>) => {
    if (!graph || !changedFiles.length) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create updater instance
      const updater = new IncrementalGraphUpdater();
      const builder = new KnowledgeGraphBuilder();

      // Update the graph incrementally
      const updatedGraph = updater.updateGraph(
        graph,
        changedFiles,
        (builder as any).parsers, // Access the private parsers map
      );

      setGraph(updatedGraph as KnowledgeGraph);
    } catch (err) {
      console.error('Error updating architecture graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to update architecture graph');
    } finally {
      setLoading(false);
    }
  };

  // Handle zoom controls
  const zoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
      cyRef.current.center();
      setZoom(cyRef.current.zoom());
    }
  };

  const zoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
      cyRef.current.center();
      setZoom(cyRef.current.zoom());
    }
  };

  const fitToView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      setZoom(cyRef.current.zoom());
    }
  };

  // Initial load
  useEffect(() => {
    buildGraph();
  }, []);

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Architecture / Dependency Graph
            </h1>
            <p className="text-gray-400 mt-2">Visualize your codebase architecture and dependencies</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Navigate back to dashboard
                workbenchStore.showWorkbench.set(true);
                workbenchStore.currentView.set('dashboard');
              }}
              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Dashboard
            </button>
            <button
              onClick={zoomIn}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
              disabled={loading}
            >
              Zoom In
            </button>
            <button
              onClick={zoomOut}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
              disabled={loading}
            >
              Zoom Out
            </button>
            <button
              onClick={fitToView}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
              disabled={loading}
            >
              Fit to View
            </button>
            <button
              onClick={buildGraph}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-300"
              disabled={loading}
            >
              {loading ? 'Building...' : 'Rebuild Graph'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <strong>Error</strong>
            </div>
            <p>{error}</p>
          </div>
        )}

        {graph ? (
          <div className="space-y-6">
            {/* Graph Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Nodes</p>
                    <p className="text-3xl font-bold text-white mt-1">{graph.nodes.length}</p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Edges</p>
                    <p className="text-3xl font-bold text-white mt-1">{graph.edges.length}</p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-purple-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Modules</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {graph.nodes.filter((n) => n.type === 'module').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Classes & Functions</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {graph.nodes.filter((n) => n.type === 'class' || n.type === 'function').length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Legend</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-gray-300">Module</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <span className="text-gray-300">Class</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-gray-300">Function</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-300">Variable</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span className="text-gray-300">Import</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-pink-500"></div>
                  <span className="text-gray-300">Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-green-500"></div>
                  <span className="text-gray-300">Inheritance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-yellow-500"></div>
                  <span className="text-gray-300">Dependency</span>
                </div>
              </div>
            </div>

            {/* Graph Visualization */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Architecture Graph</h3>
                <div className="text-sm text-gray-400">Zoom: {(zoom * 100).toFixed(0)}%</div>
              </div>
              <div ref={containerRef} className="w-full h-[600px] bg-gray-900/50 rounded-lg border border-gray-700" />
            </div>

            {/* Selected Node Info */}
            {selectedNode && (
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Selected Node Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {graph.nodes
                    .filter((node) => node.id === selectedNode)
                    .map((node) => (
                      <div key={node.id} className="space-y-2">
                        <div className="flex gap-2">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white font-mono">{node.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white capitalize">{node.type}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-400">File:</span>
                          <span className="text-white font-mono text-sm">{node.filePath}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 p-5 bg-gray-800/50 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Building Architecture Graph</h3>
            <p className="text-gray-400 max-w-md">
              Analyzing your codebase to construct an architecture and dependency graph of modules, classes, functions,
              and their relationships.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
