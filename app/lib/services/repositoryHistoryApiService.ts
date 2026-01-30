import type { RepositoryHistoryItem } from '~/lib/stores/repositoryHistory';
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface RepositoryHistoryApiItem {
    id: number;
    url: string;
    name: string;
    description: string | null;
    branch: string | null;
    commitHash: string | null;
    createdAt: string;
    lastAccessedAt: string;
}

interface RepositoryHistoryRequest {
    url: string;
    name: string;
    description?: string;
    branch?: string;
    commitHash?: string;
}

/**
 * Get the JWT token from cookies
 */
function getAuthToken(): string | null {
    return Cookies.get('auth_token') || localStorage.getItem('auth_token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken();
}

/**
 * Convert API response to local format
 */
function mapApiToLocal(item: RepositoryHistoryApiItem): RepositoryHistoryItem {
    return {
        id: `repo_${item.id}`,
        url: item.url,
        name: item.name,
        description: item.description || '',
        branch: item.branch || undefined,
        commitHash: item.commitHash || undefined,
        timestamp: item.lastAccessedAt,
    };
}

/**
 * API service for repository history operations.
 * Syncs repository history with the backend when user is authenticated.
 */
export const repositoryHistoryApiService = {
    /**
     * Get all repository history for the authenticated user.
     */
    async getHistory(limit?: number): Promise<RepositoryHistoryItem[]> {
        const token = getAuthToken();

        if (!token) {
            console.log('No auth token, cannot fetch repository history from backend');
            return [];
        }

        try {
            const url = limit
                ? `${API_BASE_URL}/api/repository-history?limit=${limit}`
                : `${API_BASE_URL}/api/repository-history`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Unauthorized: clearing auth token');
                    Cookies.remove('auth_token');
                    localStorage.removeItem('auth_token');
                    return [];
                }
                throw new Error(`Failed to fetch repository history: ${response.status}`);
            }

            const data: RepositoryHistoryApiItem[] = await response.json();
            return data.map(mapApiToLocal);
        } catch (error) {
            console.error('Error fetching repository history from backend:', error);
            return [];
        }
    },

    /**
     * Add a repository to history.
     */
    async addRepository(repo: RepositoryHistoryRequest): Promise<RepositoryHistoryItem | null> {
        const token = getAuthToken();

        if (!token) {
            console.log('No auth token, cannot add repository to backend history');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/repository-history`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(repo),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Unauthorized: clearing auth token');
                    Cookies.remove('auth_token');
                    localStorage.removeItem('auth_token');
                    return null;
                }
                throw new Error(`Failed to add repository to history: ${response.status}`);
            }

            const data: RepositoryHistoryApiItem = await response.json();
            return mapApiToLocal(data);
        } catch (error) {
            console.error('Error adding repository to backend history:', error);
            return null;
        }
    },

    /**
     * Remove a repository from history.
     */
    async removeRepository(id: string): Promise<boolean> {
        const token = getAuthToken();

        if (!token) {
            console.log('No auth token, cannot remove repository from backend history');
            return false;
        }

        // Extract numeric ID from string format
        const numericId = id.replace('repo_', '');

        try {
            const response = await fetch(`${API_BASE_URL}/api/repository-history/${numericId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Unauthorized: clearing auth token');
                    Cookies.remove('auth_token');
                    localStorage.removeItem('auth_token');
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error removing repository from backend history:', error);
            return false;
        }
    },

    /**
     * Clear all repository history.
     */
    async clearHistory(): Promise<boolean> {
        const token = getAuthToken();

        if (!token) {
            console.log('No auth token, cannot clear backend repository history');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/repository-history`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Unauthorized: clearing auth token');
                    Cookies.remove('auth_token');
                    localStorage.removeItem('auth_token');
                }
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error clearing backend repository history:', error);
            return false;
        }
    },
};
