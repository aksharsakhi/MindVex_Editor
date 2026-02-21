/**
 * scipClient.ts
 *
 * Thin API client for the backend SCIP endpoints.
 * All requests include the JWT from localStorage.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HoverResult {
    symbol: string;
    displayName: string | null;
    signatureDoc: string | null;
    documentation: string | null;
    startLine: number;
    startChar: number;
    endLine: number;
    endChar: number;
}

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface JobStatusResult {
    id: number;
    repoUrl: string;
    status: JobStatus;
    errorMsg: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function handleResponse<T>(res: Response): Promise<T | null> {
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`SCIP API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Upload a .scip binary for a repository.
 * Returns the job ID — poll getJobStatus() to know when indexing is done.
 */
export async function uploadScipIndex(
    repoUrl: string,
    scipBinary: Blob,
): Promise<{ jobId: number }> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', scipBinary, 'index.scip');

    const res = await fetch(
        `${BASE_URL}/api/scip/upload?repoUrl=${encodeURIComponent(repoUrl)}`,
        {
            method: 'POST',
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            body: formData,
        },
    );

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
}

/**
 * Get hover information for a cursor position.
 * Returns null if no symbol is found at that position.
 */
export async function getHover(
    repoUrl: string,
    filePath: string,
    line: number,
    character: number,
): Promise<HoverResult | null> {
    const params = new URLSearchParams({
        repoUrl,
        filePath,
        line: String(line),
        character: String(character),
    });

    const res = await fetch(`${BASE_URL}/api/scip/hover?${params}`, {
        headers: getAuthHeaders(),
    });

    return handleResponse<HoverResult>(res);
}

/**
 * Poll the status of a SCIP index job.
 */
export async function getJobStatus(jobId: number): Promise<JobStatusResult | null> {
    const res = await fetch(`${BASE_URL}/api/scip/jobs/${jobId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<JobStatusResult>(res);
}
