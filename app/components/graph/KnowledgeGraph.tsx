/**
 * KnowledgeGraph.tsx
 *
 * Interactive code dependency graph powered by Cytoscape.js.
 *
 * Features:
 *  - Pan + zoom (built-in Cytoscape)
 *  - Nodes coloured by language, sized uniformly
 *  - Edges: solid = reference, dashed = import, red = cycle
 *  - Click node → onFileSelect(filePath)
 *  - Hover tooltip showing full file path + language
 *  - Double-click node → expand its transitive deps (lazy load)
 *  - Cycle nodes highlighted with red border + badge
 *  - "Build Graph" button triggers async job
 */

import cytoscape, { type Core, type NodeSingular } from 'cytoscape';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { buildGraph, getDependencies } from '~/lib/graph/graphClient';
import type { GraphResponse } from '~/lib/graph/graphClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  repoUrl: string;
  onFileSelect?: (filePath: string) => void;
}

// ─── Language colour map ──────────────────────────────────────────────────────

const LANG_COLOURS: Record<string, string> = {
  java: '#89b4fa',
  kotlin: '#cba6f7',
  python: '#f9e2af',
  typescript: '#89dceb',
  javascript: '#a6e3a1',
  go: '#74c7ec',
  rust: '#fab387',
  cpp: '#f38ba8',
  csharp: '#b4befe',
  unknown: '#6c7086',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function KnowledgeGraph({ repoUrl, onFileSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selectedFile, setSelected] = useState<string | null>(null);

  // ─── Load graph data ────────────────────────────────────────────────────────

  const loadGraph = useCallback(
    async (rootFile?: string) => {
      setLoading(true);
      setError(null);

      try {
        const data = await getDependencies(repoUrl, rootFile, 20);
        setGraph(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    },
    [repoUrl],
  );

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // ─── Initialise / update Cytoscape ─────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || !graph) {
      return;
    }

    const cycleNodeIds = new Set<string>();
    graph.edges.forEach((e) => {
      if (e.data.cycle) {
        cycleNodeIds.add(e.data.source);
      }
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...graph.nodes.map((n) => ({
          group: 'nodes' as const,
          data: n.data,
        })),
        ...graph.edges.map((e) => ({
          group: 'edges' as const,
          data: e.data,
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) =>
              LANG_COLOURS[(ele.data('language') as string) ?? 'unknown'] ?? '#6c7086',
            label: 'data(label)',
            color: '#cdd6f4',
            'font-size': 10,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 4,
            width: 28,
            height: 28,
            'border-width': 0,
          },
        },
        {
          selector: 'node.cycle',
          style: {
            'border-width': 3,
            'border-color': '#f38ba8',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 2,
            'border-color': '#89b4fa',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#45475a',
            'target-arrow-color': '#45475a',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[type="import"]',
          style: {
            'line-style': 'dashed',
            'line-color': '#89b4fa',
            'target-arrow-color': '#89b4fa',
          },
        },
        {
          selector: 'edge[cycle="true"]',
          style: {
            'line-color': '#f38ba8',
            'target-arrow-color': '#f38ba8',
            width: 2,
          },
        },
      ],
      layout: {
        name: graph.nodes.length > 200 ? 'cose' : 'breadthfirst',
        directed: true,
        padding: 20,
        spacingFactor: 1.4,
      } as any,
      wheelSensitivity: 0.3,
    });

    // Mark cycle nodes
    cycleNodeIds.forEach((id) => cy.$(`#${id}`).addClass('cycle'));

    // Click: select + emit
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const fPath = node.data('filePath') as string;
      setSelected(fPath);
      onFileSelect?.(fPath);
    });

    // Double-click: lazy expand transitive deps
    cy.on('dblclick', 'node', (evt) => {
      const fPath = evt.target.data('filePath') as string;
      loadGraph(fPath);
    });

    // Hover tooltip
    cy.on('mouseover', 'node', (evt) => {
      const pos = evt.renderedPosition;
      const node = evt.target;
      setTooltip({
        text: `${node.data('filePath')}\n[${node.data('language')}]`,
        x: pos.x + 16,
        y: pos.y - 8,
      });
    });
    cy.on('mouseout', 'node', () => setTooltip(null));

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, onFileSelect, loadGraph]);

  // ─── Trigger build ──────────────────────────────────────────────────────────

  const handleBuild = async () => {
    setBuilding(true);

    try {
      await buildGraph(repoUrl);

      // Reload after 10 s — job worker will have completed by then for small repos
      setTimeout(() => loadGraph(), 10_000);
    } finally {
      setBuilding(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.wrapper}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <span style={styles.toolbarTitle}>🕸 Code Knowledge Graph</span>
        <span style={styles.toolbarSub}>
          {graph ? `${graph.nodes.length} nodes · ${graph.edges.length} edges` : ''}
          {graph && graph.cycles.length > 0 && (
            <span style={styles.cycleBadge}>
              ⚠ {graph.cycles.length} cycle{graph.cycles.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button style={{ ...styles.btn, opacity: building ? 0.6 : 1 }} disabled={building} onClick={handleBuild}>
          {building ? 'Building…' : '⚙ Build Graph'}
        </button>
        {selectedFile && (
          <button style={{ ...styles.btn, background: '#45475a' }} onClick={() => loadGraph(selectedFile)}>
            ↳ Expand subtree
          </button>
        )}
        <button style={{ ...styles.btn, background: '#45475a' }} onClick={() => loadGraph()}>
          ↺ Full graph
        </button>
      </div>

      {/* Error / loading state */}
      {error && <div style={styles.error}>{error}</div>}
      {loading && <div style={styles.loading}>Loading graph…</div>}

      {/* Empty state */}
      {!loading && graph && graph.nodes.length === 0 && (
        <div style={styles.empty}>
          No dependency data yet. Click <strong>Build Graph</strong> to index this repo.
        </div>
      )}

      {/* Cycle warnings */}
      {graph && graph.cycles.length > 0 && (
        <div style={styles.cyclePanel}>
          <strong>Circular dependencies detected:</strong>
          {graph.cycles.map((c, i) => (
            <div key={i} style={styles.cycleItem}>
              ⚠ {c}
            </div>
          ))}
        </div>
      )}

      {/* Cytoscape container */}
      <div ref={containerRef} style={styles.canvas} />

      {/* Hover tooltip */}
      {tooltip && <pre style={{ ...styles.tooltip, left: tooltip.x, top: tooltip.y }}>{tooltip.text}</pre>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1e1e2e',
    color: '#cdd6f4',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#181825',
    borderBottom: '1px solid #313244',
    flexShrink: 0,
  },
  toolbarTitle: { fontWeight: 700, fontSize: 13 },
  toolbarSub: { flex: 1, fontSize: 11, color: '#6c7086' },
  cycleBadge: {
    marginLeft: 8,
    color: '#f38ba8',
    fontWeight: 600,
  },
  btn: {
    padding: '5px 14px',
    background: '#89b4fa',
    color: '#1e1e2e',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  canvas: {
    flex: 1,
    background: '#1e1e2e',
    minHeight: 0,
  },
  tooltip: {
    position: 'absolute',
    background: '#313244',
    color: '#cdd6f4',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 11,
    pointerEvents: 'none',
    whiteSpace: 'pre',
    zIndex: 100,
    border: '1px solid #45475a',
    margin: 0,
  },
  error: { color: '#f38ba8', padding: 12, fontSize: 12, flexShrink: 0 },
  loading: { color: '#6c7086', padding: 12, fontSize: 12, flexShrink: 0 },
  empty: { color: '#6c7086', textAlign: 'center', padding: 48, fontSize: 13, flexShrink: 0 },
  cyclePanel: {
    background: '#2a1a1a',
    borderBottom: '1px solid #f38ba8',
    padding: '8px 16px',
    fontSize: 12,
    flexShrink: 0,
  },
  cycleItem: { color: '#f38ba8', marginTop: 2, paddingLeft: 12 },
};
