import { atom, map, type MapStore } from 'nanostores';
import { repositoryHistoryApiService, isAuthenticated } from '~/lib/services/repositoryHistoryApiService';

export interface RepositoryHistoryItem {
  id: string;
  url: string;
  name: string;
  description: string;
  timestamp: string;
  branch?: string;
  commitHash?: string;
}

const MAX_LOCAL_REPOSITORIES = 50;

class RepositoryHistoryStore {
  private _repositoryHistory: MapStore<Record<string, RepositoryHistoryItem>> = map({});
  private _isLoading = atom(false);
  private _isInitialized = false;

  repositoryHistory = this._repositoryHistory;
  isLoading = this._isLoading;

  constructor() {
    // Load repository history from localStorage on initialization
    this.loadFromStorage();
  }

  /**
   * Initialize the store and sync with backend if authenticated.
   * Should be called when the app loads or user logs in.
   */
  async initialize() {
    if (this._isInitialized) {
      return;
    }

    this._isInitialized = true;
    await this.syncWithBackend();
  }

  /**
   * Sync local history with backend.
   * If authenticated, fetches from backend and merges with local.
   */
  async syncWithBackend() {
    if (!isAuthenticated()) {
      return;
    }

    this._isLoading.set(true);
    try {
      const backendHistory = await repositoryHistoryApiService.getHistory();

      if (backendHistory.length > 0) {
        // Replace local history with backend history
        const historyMap: Record<string, RepositoryHistoryItem> = {};

        backendHistory.forEach((item) => {
          historyMap[item.id] = item;
        });

        this._repositoryHistory.set(historyMap);
        this.saveToStorage();
      } else {
        // If backend is empty but local has data, push local to backend
        const localItems = this.getAllRepositories();
        if (localItems.length > 0) {
          for (const item of localItems) {
            await repositoryHistoryApiService.addRepository({
              url: item.url,
              name: item.name,
              description: item.description,
              branch: item.branch,
              commitHash: item.commitHash,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync repository history with backend:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mindvex_repository_history');

      if (stored) {
        try {
          const items: RepositoryHistoryItem[] = JSON.parse(stored);
          const historyMap: Record<string, RepositoryHistoryItem> = {};

          items.forEach((item) => {
            historyMap[item.id] = item;
          });

          this._repositoryHistory.set(historyMap);
        } catch (error) {
          console.error('Failed to load repository history from storage:', error);
        }
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      const items = Object.values(this._repositoryHistory.get());
      localStorage.setItem('mindvex_repository_history', JSON.stringify(items));
    }
  }

  private enforceMaxLimit() {
    const currentHistory = this._repositoryHistory.get();
    const items = Object.values(currentHistory).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (items.length > MAX_LOCAL_REPOSITORIES) {
      const itemsToRemove = items.slice(MAX_LOCAL_REPOSITORIES);
      const newHistory = { ...currentHistory };

      itemsToRemove.forEach((item) => {
        delete newHistory[item.id];
      });

      this._repositoryHistory.set(newHistory);
    }
  }

  async addRepository(repoUrl: string, repoName: string, description?: string, branch?: string, commitHash?: string) {
    // Check if repository with same URL already exists
    const currentHistory = this._repositoryHistory.get();
    const existingRepo = Object.values(currentHistory).find((item) => item.url === repoUrl);

    if (existingRepo) {
      // Update timestamp of existing repository instead of creating duplicate
      const updatedItem: RepositoryHistoryItem = {
        ...existingRepo,
        timestamp: new Date().toISOString(),
        description: description || existingRepo.description,
        branch: branch || existingRepo.branch,
        commitHash: commitHash || existingRepo.commitHash,
      };

      this._repositoryHistory.set({
        ...currentHistory,
        [existingRepo.id]: updatedItem,
      });

      this.saveToStorage();

      // Sync with backend if authenticated
      if (isAuthenticated()) {
        repositoryHistoryApiService.addRepository({
          url: repoUrl,
          name: repoName,
          description: description || existingRepo.description,
          branch,
          commitHash,
        }).catch(console.error);
      }

      return updatedItem;
    }

    // Create new repository entry if it doesn't exist
    const id = `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: RepositoryHistoryItem = {
      id,
      url: repoUrl,
      name: repoName,
      description: description || `Repository: ${repoName}`,
      timestamp: new Date().toISOString(),
      branch,
      commitHash,
    };

    this._repositoryHistory.set({
      ...currentHistory,
      [id]: newItem,
    });

    // Enforce max limit
    this.enforceMaxLimit();
    this.saveToStorage();

    // Sync with backend if authenticated
    if (isAuthenticated()) {
      repositoryHistoryApiService.addRepository({
        url: repoUrl,
        name: repoName,
        description: description || `Repository: ${repoName}`,
        branch,
        commitHash,
      }).then((backendItem) => {
        // Update local item with backend ID if available
        if (backendItem) {
          const current = this._repositoryHistory.get();
          delete current[id];
          current[backendItem.id] = backendItem;
          this._repositoryHistory.set({ ...current });
          this.saveToStorage();
        }
      }).catch(console.error);
    }

    return newItem;
  }

  async removeRepository(id: string) {
    const currentHistory = this._repositoryHistory.get();
    const newHistory = { ...currentHistory };
    delete newHistory[id];
    this._repositoryHistory.set(newHistory);
    this.saveToStorage();

    // Sync with backend if authenticated
    if (isAuthenticated()) {
      repositoryHistoryApiService.removeRepository(id).catch(console.error);
    }
  }

  async clearHistory() {
    this._repositoryHistory.set({});
    this.saveToStorage();

    // Sync with backend if authenticated
    if (isAuthenticated()) {
      repositoryHistoryApiService.clearHistory().catch(console.error);
    }
  }

  getRepository(id: string): RepositoryHistoryItem | undefined {
    return this._repositoryHistory.get()[id];
  }

  getAllRepositories(): RepositoryHistoryItem[] {
    return Object.values(this._repositoryHistory.get()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getRecentRepositories(limit: number = 10): RepositoryHistoryItem[] {
    return this.getAllRepositories().slice(0, limit);
  }

  async importRepositoryToWorkbench(id: string) {
    const repo = this.getRepository(id);

    if (!repo) {
      throw new Error(`Repository with id ${id} not found`);
    }

    // Use the existing git functionality to clone the repository
    const { useGit } = await import('~/lib/hooks/useGit');
    const gitHook = useGit();

    /*
     * This would trigger the git clone functionality to import the repo to workbench
     * Implementation would depend on the specific git clone implementation
     */
    console.log(`Importing repository ${repo.name} from ${repo.url} to workbench`);

    // For now, just return the repo info
    return repo;
  }
}

export const repositoryHistoryStore = new RepositoryHistoryStore();
