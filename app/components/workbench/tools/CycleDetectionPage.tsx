import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache } from '~/lib/stores/graphCacheStore';

interface Props {
  onBack: () => void;
}

export function CycleDetectionPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);

  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);

  // Group cycles for easier display in the side panel
  const cycleList = useMemo(() => {
    if (!graphData || !graphData.cycles || graphData.cycles.length === 0) {
      return [];
    }

    // The backend provides a list of cycles where each cycle is a string of paths separated by " -> "
    return graphData.cycles.map((cycleStr, idx) => ({
      id: `cycle-${idx}`,
      paths: cycleStr.split(' -> '),
      raw: cycleStr,
    }));
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
          // Base styles (dimmed by default)
          {
            selector: 'node',
            style: {
              'background-color': '#1f2937', // gray-800
              label: 'data(label)',
              color: '#4b5563', // gray-600
              'text-valign': 'center',
              'text-halign': 'right',
              'font-size': '10px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1,
              'line-color': '#1f2937', // gray-800
              'target-arrow-color': '#1f2937',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.1,
            },
          },

          // Highlight styles for general cycles
          {
            selector: 'node.cycle',
            style: {
              'background-color': '#ef4444', // red-500
              color: '#cbd5e1', // slate-300
              'font-size': '12px',
            },
          },
          {
            selector: 'edge.cycle',
            style: {
              width: 3,
              'line-color': '#ef4444', // red-500
              'target-arrow-color': '#ef4444',
              opacity: 0.7,
              'z-index': 10,
            },
          },

          // Super-highlight styles for selected cycle
          {
            selector: 'node.selected-cycle',
            style: {
              'background-color': '#dc2626', // red-600
              color: '#fff',
              'font-size': '14px',
              'font-weight': 'bold',
              width: 40,
              height: 40,
              'z-index': 100,
            },
          },
          {
            selector: 'edge.selected-cycle',
            style: {
              width: 5,
              'line-color': '#dc2626', // red-600
              'target-arrow-color': '#dc2626',
              opacity: 1,
              'z-index': 99,
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 50,
          nodeRepulsion: () => 4000,
        },
      });

      // Apply initial cycle highlights
      cyRef.current.edges().forEach((edge) => {
        if (edge.data('cycle')) {
          edge.addClass('cycle');
          edge.source().addClass('cycle');
          edge.target().addClass('cycle');
        }
      });

      return () => {
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }
      };
    }
  }, [graphData]);

  // Handle selected cycle change
  useEffect(() => {
    if (!cyRef.current || !graphData) {
      return;
    }

    const cy = cyRef.current;

    // Remove previous selection
    cy.elements().removeClass('selected-cycle');

    if (selectedCycle) {
      const cycleInfo = cycleList.find((c) => c.id === selectedCycle);

      if (!cycleInfo) {
        return;
      }

      const { paths } = cycleInfo;

      // Highlight the targeted nodes based on paths
      paths.forEach((path) => {
        // Find node with this filePath
        const node = cy.nodes().filter((n) => n.data('filePath') === path);
        node.addClass('selected-cycle');
      });

      // Highlight the edges connecting them IN ORDER
      for (let i = 0; i < paths.length - 1; i++) {
        const sourcePath = paths[i];
        const targetPath = paths[i + 1];

        const sourceNode = cy.nodes().filter((n) => n.data('filePath') === sourcePath);
        const targetNode = cy.nodes().filter((n) => n.data('filePath') === targetPath);

        if (sourceNode.length > 0 && targetNode.length > 0) {
          const edge = cy
            .edges()
            .filter((e) => e.source().id() === sourceNode.id() && e.target().id() === targetNode.id());
          edge.addClass('selected-cycle');
        }
      }

      // Also highlight the closing edge
      const firstNode = cy.nodes().filter((n) => n.data('filePath') === paths[0]);
      const lastNode = cy.nodes().filter((n) => n.data('filePath') === paths[paths.length - 1]);

      if (firstNode.length > 0 && lastNode.length > 0) {
        const closingEdge = cy
          .edges()
          .filter((e) => e.source().id() === lastNode.id() && e.target().id() === firstNode.id());
        closingEdge.addClass('selected-cycle');
      }
    }
  }, [selectedCycle, cycleList, graphData]);

  if (!graphData) {
    return <div className="text-gray-400 p-8 text-center">Loading graph data...</div>;
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">❌</div>
        <h2 className="text-2xl font-bold text-white mb-3">No Cycle Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          Cycle detection requires a SCIP index to be uploaded for this repository. Once indexed, circular dependencies
          will be highlighted and listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>❌</span> Cycle Detection (Architectural Anomaly)
        </h2>
      </div>

      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative flex">
        <div ref={containerRef} className="flex-1 h-full" />

        <div className="w-80 border-l border-gray-700 bg-gray-800/80 backdrop-blur p-4 overflow-y-auto flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-2">
              <div className="i-ph:warning-circle-fill text-xl" />
              Dependency Cycles
            </h3>
            <p className="text-sm text-gray-400">
              {cycleList.length > 0
                ? `Found ${cycleList.length} circular dependencies. Select one to highlight its path.`
                : 'Great job! No circular dependencies found in this codebase.'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {cycleList.map((cycle, index) => (
              <button
                key={cycle.id}
                onClick={() => setSelectedCycle(cycle.id === selectedCycle ? null : cycle.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedCycle === cycle.id
                    ? 'bg-red-900/40 border-red-500 shadow-sm shadow-red-900/50 block scale-[1.02]'
                    : 'bg-gray-800 border-gray-700 hover:border-red-500/50 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-red-400 text-sm">Cycle #{index + 1}</span>
                  <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full">
                    {cycle.paths.length} nodes
                  </span>
                </div>

                <div className="space-y-1">
                  {cycle.paths.map((path, i) => {
                    const filename = path.split(/[/\\]/).pop();
                    return (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-red-500 font-bold shrink-0 mt-0.5">↳</span>
                        <span className="text-gray-300 font-mono break-all">{filename}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-start gap-2 text-xs pt-1 border-t border-gray-700/50 mt-1">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">↻</span>
                    <span className="text-gray-500 italic">Back to start</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
