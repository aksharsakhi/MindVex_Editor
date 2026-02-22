/**
 * blameClient.ts
 *
 * API client for the blame and AI churn summary endpoints.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlameLine {
  lineNumber: number;
  commitHash: string;
  authorEmail: string;
  committedAt: string; // ISO-8601
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return { Authorization: token ? `Bearer ${token}` : '' };
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Fetch line-level blame annotations for a file.
 */
export async function getBlame(repoUrl: string, filePath: string): Promise<BlameLine[]> {
  const params = new URLSearchParams({ repoUrl, filePath });
  const res = await fetch(`${BASE_URL}/api/analytics/blame?${params}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Blame API ${res.status}`);
  }

  return res.json() as Promise<BlameLine[]>;
}

/**
 * Ask the AI to summarize why a file has high churn.
 * Calls the existing AI streaming endpoint with a structured prompt.
 */
export async function getAiChurnSummary(
  repoUrl: string,
  filePath: string,
  avgChurnRate: number,
  totalCommits: number,
  weeks: number,
): Promise<string> {
  const prompt = [
    `Repository: ${repoUrl}`,
    `File: ${filePath}`,
    `Over the last ${weeks} weeks this file has had ${totalCommits} commits`,
    `with an average churn rate of ${avgChurnRate.toFixed(1)}%.`,
    ``,
    `Please analyze why this file might have such high churn and suggest`,
    `specific refactoring strategies to reduce it. Be concise (3–5 bullet points).`,
  ].join('\n');

  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: prompt }),
  });

  if (!res.ok) {
    throw new Error(`AI API ${res.status}`);
  }

  const data = (await res.json()) as { response?: string; content?: string };

  return data.response ?? data.content ?? '(no response)';
}
