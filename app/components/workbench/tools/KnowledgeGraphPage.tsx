import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache } from '~/lib/stores/graphCacheStore';

interface Props {
  onBack: () => void;
}

export function KnowledgeGraphPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);

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
              'background-color': '#3B82F6',
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
              'line-color': '#4B5563',
              'target-arrow-color': '#4B5563',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
        ],
        layout: {
          name: 'cose',
          padding: 50,
          nodeRepulsion: () => 4000,
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

  if (!graphData) {
    return <div className="text-gray-400 p-8 text-center">Loading graph data...</div>;
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🧠</span> Knowledge Graph Construction
        </h2>
      </div>

      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur">
          <div className="text-xs text-gray-400">
            Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length}
          </div>
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
