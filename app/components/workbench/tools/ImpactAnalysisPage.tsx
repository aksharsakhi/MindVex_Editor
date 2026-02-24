import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache } from '~/lib/stores/graphCacheStore';

interface Props {
  onBack: () => void;
}

export function ImpactAnalysisPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);

  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string } | null>(null);
  const [impactedNodes, setImpactedNodes] = useState<{ id: string; label: string }[]>([]);

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
              'background-color': '#475569', // slate-600
              label: 'data(label)',
              color: '#94a3b8',
              'text-valign': 'center',
              'text-halign': 'right',
              'font-size': '11px',
              'transition-property': 'background-color, color, width, height',
              'transition-duration': 200,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1,
              'line-color': '#334155', // slate-700
              'target-arrow-color': '#334155',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.3,
            },
          },

          // Highlight styles
          {
            selector: 'node.selected',
            style: {
              'background-color': '#ec4899', // pink-500
              color: '#fff',
              'font-size': '14px',
              'font-weight': 'bold',
              width: 40,
              height: 40,
            },
          },
          {
            selector: 'node.impacted',
            style: {
              'background-color': '#f472b6', // pink-400
              color: '#fdf2f8',
              'font-size': '12px',
              width: 35,
              height: 35,
            },
          },
          {
            selector: 'edge.impact-path',
            style: {
              width: 3,
              'line-color': '#ec4899', // pink-500
              'target-arrow-color': '#ec4899',
              opacity: 1,
              'z-index': 100,
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 50,
          nodeRepulsion: () => 4000,
        },
      });

      // Handle impact analysis click
      cyRef.current.on('tap', 'node', (evt) => {
        const node = evt.target;
        const cy = cyRef.current;

        if (!cy) {
          return;
        }

        // Reset all
        cy.elements().removeClass('selected impacted impact-path');

        // Highlight clicked node
        node.addClass('selected');
        setSelectedNode({ id: node.id(), label: node.data('label') });

        // Find successors (files that depend on this one)
        const successors = node.successors();
        successors.nodes().addClass('impacted');
        successors.edges().addClass('impact-path');

        // Update state for the side panel
        const impacted = successors.nodes().map((n: cytoscape.NodeSingular) => ({
          id: n.id(),
          label: n.data('label'),
        }));
        setImpactedNodes(impacted);
      });

      return () => {
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }
      };
    }
  }, [graphData]);

  if (!graphData) {
    return <div className="text-gray-400 p-8 text-center">Loading graph data...</div>;
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <div className="text-6xl mb-6">🔬</div>
        <h2 className="text-2xl font-bold text-white mb-3">No Impact Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          Change impact analysis requires a SCIP index to be uploaded for this repository. Once indexed, you can click
          any node to trace its downstream dependents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🔬</span> Change Impact Analysis
        </h2>
      </div>

      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative flex">
        <div ref={containerRef} className="flex-1 h-full cursor-crosshair" />

        <div className="w-72 border-l border-gray-700 bg-gray-800/80 backdrop-blur p-4 overflow-y-auto flex flex-col">
          {!selectedNode ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 opacity-60">
              <div className="text-4xl mb-3">🖱️</div>
              <p>Click any node in the graph to see other files that depend on it.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Selected File</h3>
                <div className="bg-pink-500/10 border border-pink-500/30 text-pink-300 p-3 rounded-lg break-all font-mono text-sm">
                  {selectedNode.label}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 flex justify-between items-center">
                  <span>Impacted Files</span>
                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{impactedNodes.length}</span>
                </h3>

                {impactedNodes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No files depend on this file directly or indirectly.</p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {impactedNodes.map((node) => (
                      <div
                        key={node.id}
                        className="bg-gray-700/50 p-2 rounded text-sm text-gray-300 font-mono break-all border border-gray-700/50 hover:bg-gray-700 transition-colors"
                      >
                        {node.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
