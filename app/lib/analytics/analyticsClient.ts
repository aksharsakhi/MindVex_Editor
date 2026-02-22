/**
 * analyticsClient.ts
 *
 * Typed API client for the backend analytics endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekPoint {
  weekStart: string; // ISO date string e.g. '2025-01-06'
  churnRate: number;
  commits: number;
}

export interface HotspotResult {
  filePath: string;
  avgChurnRate: number;
  totalCommits: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  weeklyTrend: WeekPoint[];
}

export interface WeeklyChurn {
  weekStart: string;
  linesAdded: number;
  linesDeleted: number;
  commitCount: number;
  churnRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });

  if (!res.ok) {
    throw new Error(`Analytics API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Analytics API ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Trigger git history mining for a repository.
 * Returns a job ID — poll /api/scip/jobs/{id} for status.
 */
export async function triggerMining(repoUrl: string, days = 90): Promise<{ jobId: number; status: string }> {
  return post(`/api/analytics/mine?repoUrl=${encodeURIComponent(repoUrl)}&days=${days}`);
}

/**
 * Get the top hotspot files (churn > threshold) over the last N weeks.
 */
export async function getHotspots(repoUrl: string, weeks = 12, threshold = 25): Promise<HotspotResult[]> {
  return get(`/api/analytics/hotspots?repoUrl=${encodeURIComponent(repoUrl)}&weeks=${weeks}&threshold=${threshold}`);
}

/**
 * Get week-by-week churn for a single file.
 */
export async function getFileTrend(repoUrl: string, filePath: string, weeks = 12): Promise<WeeklyChurn[]> {
  return get(
    `/api/analytics/file-trend?repoUrl=${encodeURIComponent(repoUrl)}&filePath=${encodeURIComponent(filePath)}&weeks=${weeks}`,
  );
}
