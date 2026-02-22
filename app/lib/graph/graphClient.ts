/**
 * graphClient.ts — typed API client for the code knowledge graph endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

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
 * Find all references to a SCIP symbol — semantic, not text grep.
 */
export async function getReferences(repoUrl: string, symbol: string): Promise<ReferenceResult[]> {
  return request(`/api/graph/references?repoUrl=${encodeURIComponent(repoUrl)}&symbol=${encodeURIComponent(symbol)}`);
}
