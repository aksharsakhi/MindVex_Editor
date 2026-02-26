/**
 * graphClient.ts — typed API client for the code knowledge graph endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

import { webcontainer } from '~/lib/webcontainer';
import { path as pathUtils } from '~/utils/path';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CyNodeData {
  id: string;
  label: string;
  filePath: string;
  language: string;
}

export interface CyEdgeData {
  id: string;
  source: string;
  target: string;
  type: string; // 'import' | 'reference'
  cycle: boolean;
}

export interface CyNode {
  data: CyNodeData;
}
export interface CyEdge {
  data: CyEdgeData;
}

export interface GraphResponse {
  nodes: CyNode[];
  edges: CyEdge[];
  cycles: string[];
  isFallback?: boolean;
}

export interface ReferenceResult {
  filePath: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  symbol: string;
  roleFlags: number; // 1=definition, 2=reference
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

async function request<T>(path: string, method = 'GET'): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: authHeaders() });

  if (res.status === 401) {
    throw new Error('Unauthorized: Please log in using GitHub first.');
  }

  if (!res.ok) {
    throw new Error(`GraphAPI ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Trigger async graph build from SCIP data. Returns { jobId }. */
export async function buildGraph(repoUrl: string): Promise<{ jobId: number; status: string }> {
  return request(`/api/graph/build?repoUrl=${encodeURIComponent(repoUrl)}`, 'POST');
}

/**
 * Fetch dependency graph in Cytoscape.js format.
 * If rootFile is provided, returns only the transitive sub-tree rooted there.
 */
export async function getDependencies(repoUrl: string, rootFile?: string, depth = 20): Promise<GraphResponse> {
  const params = new URLSearchParams({ repoUrl, depth: String(depth) });

  if (rootFile) {
    params.set('rootFile', rootFile);
  }

  return request(`/api/graph/dependencies?${params}`);
}

/**
 * Generates a fallback graph from the WebContainer filesystem when SCIP data is missing.
 */
export async function getFallbackGraph(): Promise<GraphResponse> {
  const container = await webcontainer;
  const nodes: CyNode[] = [];
  const edges: CyEdge[] = [];

  async function walk(dir: string) {
    const entries = await container.fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = pathUtils.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.cache'].includes(entry.name)) {
          await walk(fullPath);
        }
      } else {
        const ext = pathUtils.extname(entry.name).slice(1);
        const language = getLanguageFromExtension(ext);

        if (language !== 'unknown') {
          nodes.push({
            data: {
              id: fullPath,
              label: entry.name,
              filePath: fullPath,
              language,
            },
          });

          // Simple heuristic for imports (very basic)
          try {
            const content = (await container.fs.readFile(fullPath, 'utf-8')) as string;
            const lines = content.split('\n');

            for (const line of lines) {
              const importMatch = line.match(/from\s+['"](.+)['"]/);

              if (importMatch) {
                const target = importMatch[1];
                // This is a very rough mapping and doesn't resolve paths properly,
                // but it's a fallback graph.
                edges.push({
                  data: {
                    id: `${fullPath}-${target}`,
                    source: fullPath,
                    target: target,
                    type: 'import',
                    cycle: false,
                  },
                });
              }
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  await walk('/');

  return {
    nodes,
    edges,
    cycles: [],
    isFallback: true,
  };
}
