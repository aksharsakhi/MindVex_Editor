import React, { useEffect, useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
import { useStore } from '@nanostores/react';
import { graphCache } from '~/lib/stores/graphCacheStore';

interface Props {
  onBack: () => void;
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
  csharp: '#178600',
  unknown: '#6B7280',
};

export function ASTParsingPage({ onBack }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphData = useStore(graphCache);

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
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-2xl font-bold text-white mb-3">No AST Data Yet</h2>
        <p className="text-gray-400 max-w-md mb-6">
          Multi-language AST parsing requires a SCIP index to be uploaded for this repository. Once indexed, this page
          will display language breakdowns and color-coded file relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>🔍</span> Multi-Language AST Parsing
        </h2>
      </div>

      <div className="flex-1 min-h-[500px] border border-gray-700 rounded-xl bg-gray-900 overflow-hidden relative flex">
        <div ref={containerRef} className="flex-1 h-full" />

        <div className="w-64 border-l border-gray-700 bg-gray-800/50 p-4 overflow-y-auto">
          <h3 className="font-bold text-gray-200 mb-4">AST Language Breakdown</h3>
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
        </div>
      </div>
    </div>
  );
}
