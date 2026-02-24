import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache } from '~/lib/stores/graphCacheStore';

interface Props {
  onBack: () => void;
}

export function ArchitecturePage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);

  useEffect(() => {
    if (containerRef.current && graphData) {
      // Create compound nodes for directories to group files
      const elements: cytoscape.ElementDefinition[] = [];
      const dirs = new Set<string>();

      // Extract directories and create parent nodes
      graphData.nodes.forEach((n) => {
        const pathParts = n.data.filePath.split(/[/\\]/);

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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📊</span> Architecture / Dependency Graph
        </h2>
      </div>

      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur">
          <p className="text-xs text-gray-300">
            Files are grouped by their directory structure to show module architecture.
          </p>
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
