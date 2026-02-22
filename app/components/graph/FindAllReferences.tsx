/**
 * FindAllReferences.tsx
 *
 * VS Code-style "Find All References" panel powered by the SCIP semantic index.
 * Results are grouped by file with line number + context snippet.
 *
 * Props:
 *   repoUrl  — current repository
 *   symbol   — SCIP symbol string (e.g. "scip-java maven . . . MyClass#method().")
 *   onNavigate(filePath, line) — called when user clicks a result
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getReferences } from '~/lib/graph/graphClient';
import type { ReferenceResult } from '~/lib/graph/graphClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  repoUrl: string;
  symbol: string;
  onNavigate?: (filePath: string, line: number) => void;
}

interface FileGroup {
  filePath: string;
  refs: ReferenceResult[];
  expanded: boolean;
}

// ─── Role flag helpers ────────────────────────────────────────────────────────

function roleLabel(flags: number): { label: string; colour: string } {
  if (flags & 1) {
    return { label: 'def', colour: '#a6e3a1' };
  }

  if (flags & 2) {
    return { label: 'ref', colour: '#89b4fa' };
  }

  if (flags & 8) {
    return { label: 'impl', colour: '#cba6f7' };
  }

  return { label: '?', colour: '#6c7086' };
}

function basename(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.substring(i + 1) : path;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FindAllReferences({ repoUrl, symbol, onNavigate }: Props) {
  const [results, setResults] = useState<ReferenceResult[]>([]);
  const [groups, setGroups] = useState<FileGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'def' | 'ref'>('all');

  // ─── Load references ──────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!symbol) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getReferences(repoUrl, symbol);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load references');
    } finally {
      setLoading(false);
    }
  }, [repoUrl, symbol]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Group by file ────────────────────────────────────────────────────────

  useEffect(() => {
    const filtered = results.filter((r) => {
      const pathOk = !filter || r.filePath.toLowerCase().includes(filter.toLowerCase());
      const roleOk =
        roleFilter === 'all' ||
        (roleFilter === 'def' && r.roleFlags & 1) ||
        (roleFilter === 'ref' && r.roleFlags & 2 && !(r.roleFlags & 1));

      return pathOk && roleOk;
    });

    const map = new Map<string, ReferenceResult[]>();

    for (const r of filtered) {
      const list = map.get(r.filePath) ?? [];
      list.push(r);
      map.set(r.filePath, list);
    }

    setGroups((prev) => {
      const prevMap = new Map(prev.map((g) => [g.filePath, g.expanded]));
      return Array.from(map.entries()).map(([filePath, refs]) => ({
        filePath,
        refs,
        expanded: prevMap.get(filePath) ?? true,
      }));
    });
  }, [results, filter, roleFilter]);

  const totalCount = useMemo(() => groups.reduce((n, g) => n + g.refs.length, 0), [groups]);

  const toggleGroup = (filePath: string) => {
    setGroups((prev) => prev.map((g) => (g.filePath === filePath ? { ...g, expanded: !g.expanded } : g)));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!symbol) {
    return null;
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>🔍 Find All References</span>
        <span style={styles.count}>{loading ? '…' : `${totalCount} result${totalCount !== 1 ? 's' : ''}`}</span>
      </div>

      {/* Symbol badge */}
      <div style={styles.symbolBadge}>
        <span style={styles.symbolText} title={symbol}>
          {symbol}
        </span>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          style={styles.filterInput}
          placeholder="Filter by file…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div style={styles.roleToggle}>
          {(['all', 'def', 'ref'] as const).map((role) => (
            <button
              key={role}
              style={{
                ...styles.roleBtn,
                background: roleFilter === role ? '#89b4fa' : '#313244',
                color: roleFilter === role ? '#1e1e2e' : '#cdd6f4',
              }}
              onClick={() => setRoleFilter(role)}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {error && <div style={styles.error}>{error}</div>}
      {loading && <div style={styles.loading}>Searching…</div>}
      {!loading && groups.length === 0 && !error && (
        <div style={styles.empty}>No references found for this symbol.</div>
      )}

      {/* Results */}
      <div style={styles.resultsList}>
        {groups.map((group) => (
          <div key={group.filePath}>
            {/* File header */}
            <button style={styles.fileHeader} onClick={() => toggleGroup(group.filePath)}>
              <span style={styles.fileChevron}>{group.expanded ? '▾' : '▸'}</span>
              <span style={styles.fileName}>{basename(group.filePath)}</span>
              <span style={styles.filePath}>{group.filePath}</span>
              <span style={styles.fileCount}>{group.refs.length}</span>
            </button>

            {/* Reference rows */}
            {group.expanded &&
              group.refs.map((ref, i) => {
                const { label, colour } = roleLabel(ref.roleFlags);
                return (
                  <button key={i} style={styles.refRow} onClick={() => onNavigate?.(ref.filePath, ref.startLine)}>
                    <span style={styles.lineNum}>:{ref.startLine + 1}</span>
                    <span style={{ ...styles.roleTag, color: colour }}>{label}</span>
                    <span style={styles.refSymbol}>{ref.symbol.split('.').pop()}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1e1e2e',
    color: '#cdd6f4',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#181825',
    borderBottom: '1px solid #313244',
    gap: 8,
  },
  title: { fontWeight: 700, fontSize: 13 },
  count: { flex: 1, color: '#6c7086', textAlign: 'right' },
  symbolBadge: {
    padding: '6px 14px',
    background: '#181825',
    borderBottom: '1px solid #313244',
  },
  symbolText: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    color: '#89dceb',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  filters: {
    display: 'flex',
    gap: 8,
    padding: '8px 14px',
    borderBottom: '1px solid #313244',
    flexShrink: 0,
  },
  filterInput: {
    flex: 1,
    background: '#313244',
    border: 'none',
    borderRadius: 5,
    color: '#cdd6f4',
    padding: '4px 8px',
    fontSize: 11,
    outline: 'none',
  },
  roleToggle: { display: 'flex', gap: 4 },
  roleBtn: {
    padding: '3px 8px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
  },
  resultsList: { flex: 1, overflowY: 'auto' },
  fileHeader: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '6px 14px',
    background: '#181825',
    border: 'none',
    borderBottom: '1px solid #313244',
    color: '#cdd6f4',
    cursor: 'pointer',
    gap: 6,
    textAlign: 'left',
  },
  fileChevron: { color: '#6c7086', fontSize: 10, flexShrink: 0 },
  fileName: { fontWeight: 600, flexShrink: 0 },
  filePath: { flex: 1, color: '#6c7086', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileCount: { background: '#313244', borderRadius: 4, padding: '1px 5px', fontSize: 10, flexShrink: 0 },
  refRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '4px 28px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #181825',
    color: '#cdd6f4',
    cursor: 'pointer',
    gap: 8,
    textAlign: 'left',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
  },
  lineNum: { color: '#6c7086', flexShrink: 0, minWidth: 36 },
  roleTag: { flexShrink: 0, fontSize: 10, fontWeight: 600, minWidth: 28 },
  refSymbol: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#89dceb' },
  error: { color: '#f38ba8', padding: 14, fontSize: 12 },
  loading: { color: '#6c7086', padding: 14, fontSize: 12 },
  empty: { color: '#6c7086', textAlign: 'center', padding: 32, fontSize: 12 },
};
