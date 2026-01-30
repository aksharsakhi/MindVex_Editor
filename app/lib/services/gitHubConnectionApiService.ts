import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface GitHubConnectionResponse {
    connected: boolean;
    provider: string;
    accessToken?: string;
    avatarUrl?: string;
    username?: string;
}

/**
 * Get the JWT token from cookies or localStorage
 */
function getAuthToken(): string | null {
    return Cookies.get('authToken') || localStorage.getItem('authToken');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken();
}

/**
 * API service for GitHub connection operations.
 * Fetches the GitHub OAuth token from the backend if user logged in via GitHub.
 */
export const gitHubConnectionApiService = {

    /**
     * Get the GitHub connection status and access token.
     * Returns the OAuth token if user logged in via GitHub OAuth.
     */
    async getConnection(): Promise<GitHubConnectionResponse | null> {
        const token = getAuthToken();

        if (!token) {
            console.log('No auth token, cannot fetch GitHub connection');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me/github-connection`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Unauthorized: auth token may be expired');
                    return null;
                }
                throw new Error(`Failed to fetch GitHub connection: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching GitHub connection:', error);
            return null;
        }
    },

    /**
     * Disconnect the GitHub token.
     */
    async disconnect(): Promise<boolean> {
        const token = getAuthToken();

        if (!token) {
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me/github-connection`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            return response.ok;
        } catch (error) {
            console.error('Error disconnecting GitHub:', error);
            return false;
        }
    },
};
