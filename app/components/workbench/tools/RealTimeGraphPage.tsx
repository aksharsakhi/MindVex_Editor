import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache, refreshGraph, graphCacheRepoUrl, graphCacheLoading } from '~/lib/stores/graphCacheStore';

interface Props {
  onBack: () => void;
}

export function RealTimeGraphPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const graphData = useStore(graphCache);
  const repoUrl = useStore(graphCacheRepoUrl);
  const isLoading = useStore(graphCacheLoading);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Update timestamp when graph data changes
  useEffect(() => {
    if (graphData) {
      setLastUpdated(new Date());
    }
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

  const handleRefresh = () => {
    if (repoUrl && !isLoading) {
      // Force a re-build by temporarily clearing the cache's URL to bypass the cache check
      const currentUrl = repoUrl;
      graphCacheRepoUrl.set(null);
      refreshGraph(currentUrl);
    }
  };

  if (!graphData) {
    return <div className="text-gray-400 p-8 text-center">Loading graph data...</div>;
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className={isLoading ? 'animate-spin' : ''}>🔄</span> Real-Time Graph Update
        </h2>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isLoading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isLoading ? 'Syncing...' : 'Force Sync Now'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 p-3 rounded-lg border border-gray-700 backdrop-blur">
          <p className="text-xs text-gray-300">Monitors the codebase and visualizes structural changes.</p>
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
