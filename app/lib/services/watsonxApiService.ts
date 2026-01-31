/**
 * API Service for MindVex AI capabilities.
 * Communicates with the backend which invokes watsonx Orchestrate agents.
 *
 * Architecture:
 * Frontend (this service) → Backend /api/ai/* → watsonx Orchestrate → Backend Tools
 *
 * The frontend NEVER communicates directly with IBM services.
 */

import type {
    WatsonxAgent,
    WatsonxChatRequest,
    WatsonxChatResponse,
    WatsonxHealthStatus,
    FileContext,
} from '~/types/watsonx';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

class WatsonxApiService {
    /**
     * Get authorization headers with JWT token.
     */
    private getAuthHeaders(): HeadersInit {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        };
    }

    /**
     * Handle API response and extract JSON or throw error.
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            try {
                const error = await response.json();
                throw new Error(error.message || error.errorMessage || `HTTP ${response.status}: ${response.statusText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        return response.json();
    }

    // ============================================
    // Management Endpoints
    // ============================================

    /**
     * Get list of available AI agents and their configuration status.
     */
    async getAgents(): Promise<WatsonxAgent[]> {
        const response = await fetch(`${API_BASE_URL}/api/watsonx/agents`, {
            headers: this.getAuthHeaders(),
        });
        return this.handleResponse<WatsonxAgent[]>(response);
    }

    /**
     * Check watsonx health and configuration status.
     */
    async checkHealth(): Promise<WatsonxHealthStatus> {
        const response = await fetch(`${API_BASE_URL}/api/watsonx/health`, {
            headers: this.getAuthHeaders(),
        });
        return this.handleResponse<WatsonxHealthStatus>(response);
    }

    /**
     * Generic agent chat - send to any agent by ID.
     */
    async chat(request: WatsonxChatRequest): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/watsonx/chat`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(request),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    // ============================================
    // AI Action Endpoints (as per integration report)
    // ============================================

    /**
     * Analyze codebase with MindVex Codebase Analyzer.
     * Detects bugs, code smells, security issues, and suggests improvements.
     */
    async analyzeCodebase(message: string, files?: FileContext[]): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/codebase/analyze`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'codebase-analysis', message, files }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    /**
     * Modify code with MindVex Code Modifier.
     * Generates code changes based on user instructions.
     */
    async modifyCode(instruction: string, files?: FileContext[]): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/code/modify`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'code-modifier', message: instruction, files }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    /**
     * Ask questions about code with MindVex Code Q&A.
     * Explains functions, classes, and architecture.
     */
    async askQuestion(question: string, files?: FileContext[]): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/code/ask`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'code-qa', message: question, files }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    /**
     * Review code with MindVex Code Reviewer.
     * Checks for issues, suggests improvements.
     */
    async reviewCode(message: string, files?: FileContext[]): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/code/review`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'code-review', message, files }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    /**
     * Generate documentation with MindVex Documentation Generator.
     * Creates READMEs, API docs, comments.
     */
    async generateDocumentation(message: string, files?: FileContext[]): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/code/document`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'documentation', message, files }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    /**
     * Analyze dependencies with MindVex Dependency Mapper.
     * Generates dependency graphs and detects circular dependencies.
     */
    async analyzeDependencies(message: string, files?: FileContext[]): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/dependencies/analyze`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'dependency-graph', message, files }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }

    /**
     * Get Git assistance with MindVex Git Assistant.
     * Helps with commits, pushes, PR descriptions.
     */
    async getGitHelp(message: string): Promise<WatsonxChatResponse> {
        const response = await fetch(`${API_BASE_URL}/api/ai/git/assist`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ agentId: 'git-assistant', message }),
        });
        return this.handleResponse<WatsonxChatResponse>(response);
    }
}

// Export singleton instance
export const watsonxApi = new WatsonxApiService();

// Also export class for testing
export { WatsonxApiService };
