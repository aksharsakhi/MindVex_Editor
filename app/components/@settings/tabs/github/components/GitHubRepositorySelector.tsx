import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/Button';
import { BranchSelector } from '~/components/ui/BranchSelector';
import { GitHubRepositoryCard } from './GitHubRepositoryCard';
import type { GitHubRepoInfo } from '~/types/GitHub';
import { useGitHubConnection, useGitHubStats } from '~/lib/hooks';
import { classNames } from '~/utils/classNames';
import { Search, RefreshCw, GitBranch, Calendar, Filter, Link2, Settings } from 'lucide-react';
import { toast } from 'react-toastify';

interface GitHubRepositorySelectorProps {
  onClone?: (repoUrl: string, branch?: string) => void;
  className?: string;
}

type SortOption = 'updated' | 'stars' | 'name' | 'created';
type FilterOption = 'all' | 'own' | 'forks' | 'archived';

// Helper function to validate GitHub URL
function isValidGitHubUrl(url: string): boolean {
  const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;
  const githubGitPattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\.git$/i;
  return githubUrlPattern.test(url) || githubGitPattern.test(url);
}

// Helper to normalize GitHub URL
function normalizeGitHubUrl(url: string): string {
  let normalized = url.trim();

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Add .git if not present
  if (!normalized.endsWith('.git')) {
    normalized = normalized + '.git';
  }

  return normalized;
}

export function GitHubRepositorySelector({ onClone, className }: GitHubRepositorySelectorProps) {
  const { connection, isConnected, isLoading: isGitHubLoading, tryAutoConnect } = useGitHubConnection();
  const {
    stats,
    isLoading: isStatsLoading,
    refreshStats,
  } = useGitHubStats(connection, {
    autoFetch: true,
    cacheTimeout: 30 * 60 * 1000, // 30 minutes
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Public URL clone state
  const [publicRepoUrl, setPublicRepoUrl] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const repositories = stats?.repos || [];
  const REPOS_PER_PAGE = 12;

  // Handle public URL clone
  const handlePublicUrlClone = async () => {
    if (!publicRepoUrl.trim()) {
      setUrlError('Please enter a GitHub repository URL');
      return;
    }

    if (!isValidGitHubUrl(publicRepoUrl)) {
      setUrlError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      return;
    }

    setIsValidatingUrl(true);
    setUrlError(null);

    try {
      const normalizedUrl = normalizeGitHubUrl(publicRepoUrl);

      if (onClone) {
        onClone(normalizedUrl);
        setPublicRepoUrl('');
        toast.success('Cloning repository...');
      }
    } catch (err) {
      console.error('Failed to clone public repository:', err);
      setUrlError('Failed to clone repository. Please check the URL and try again.');
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Filter and search repositories
  const filteredRepositories = useMemo(() => {
    if (!repositories) {
      return [];
    }

    const filtered = repositories.filter((repo: GitHubRepoInfo) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      let matchesFilter = true;

      switch (filterBy) {
        case 'own':
          matchesFilter = !repo.fork;
          break;
        case 'forks':
          matchesFilter = repo.fork === true;
          break;
        case 'archived':
          matchesFilter = repo.archived === true;
          break;
        case 'all':
        default:
          matchesFilter = true;
          break;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort repositories
    filtered.sort((a: GitHubRepoInfo, b: GitHubRepoInfo) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'created':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(); // Using updated_at as proxy
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [repositories, searchQuery, sortBy, filterBy]);

  // Pagination
  const totalPages = Math.ceil(filteredRepositories.length / REPOS_PER_PAGE);
  const startIndex = (currentPage - 1) * REPOS_PER_PAGE;
  const currentRepositories = filteredRepositories.slice(startIndex, startIndex + REPOS_PER_PAGE);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await refreshStats();
    } catch (err) {
      console.error('Failed to refresh GitHub repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh repositories');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCloneRepository = (repo: GitHubRepoInfo) => {
    setSelectedRepo(repo);
    setIsBranchSelectorOpen(true);
  };

  const handleBranchSelect = (branch: string) => {
    if (onClone && selectedRepo) {
      const cloneUrl = selectedRepo.html_url + '.git';
      onClone(cloneUrl, branch);
    }

    setSelectedRepo(null);
  };

  const handleCloseBranchSelector = () => {
    setIsBranchSelectorOpen(false);
    setSelectedRepo(null);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterBy]);

  // Attempt auto-connect if not connected
  useEffect(() => {
    if (!isConnected && !isGitHubLoading && tryAutoConnect) {
      tryAutoConnect();
    }
  }, [isConnected, isGitHubLoading, tryAutoConnect]);

  if (!isConnected || !connection) {
    // Show loading state while attempting to connect
    if (isGitHubLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-mindvex-elements-borderColorActive border-t-transparent rounded-full" />
          <p className="text-sm text-mindvex-elements-textSecondary">Connecting to GitHub...</p>
        </div>
      );
    }

    // If not connected after attempting, show the public URL clone option
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Info Message */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> To browse your private repositories, log in with GitHub OAuth.
            For public repositories, you can use the URL clone option below.
          </p>
        </div>

        {/* Public URL Clone Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-mindvex-elements-textPrimary">
                Clone a Public Repository
              </h4>
              <p className="text-sm text-mindvex-elements-textSecondary">
                Enter a GitHub repository URL to clone
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://github.com/owner/repository"
                value={publicRepoUrl}
                onChange={(e) => {
                  setPublicRepoUrl(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isValidatingUrl) {
                    handlePublicUrlClone();
                  }
                }}
                className={classNames(
                  'flex-1 px-4 py-3 rounded-lg',
                  'bg-mindvex-elements-background-depth-1',
                  'border',
                  urlError
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-mindvex-elements-borderColor',
                  'text-mindvex-elements-textPrimary',
                  'placeholder-mindvex-elements-textTertiary',
                  'focus:outline-none focus:ring-2 focus:ring-green-500/50',
                  'transition-all duration-200',
                )}
              />
              <Button
                onClick={handlePublicUrlClone}
                disabled={isValidatingUrl || !publicRepoUrl.trim()}
                variant="default"
                className="px-6 bg-green-600 hover:bg-green-700 text-white"
              >
                {isValidatingUrl ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Cloning...
                  </div>
                ) : (
                  'Clone'
                )}
              </Button>
            </div>

            {urlError && (
              <p className="text-sm text-red-500 dark:text-red-400">{urlError}</p>
            )}

            <p className="text-xs text-mindvex-elements-textTertiary">
              Example: https://github.com/facebook/react
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isStatsLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin w-8 h-8 border-2 border-mindvex-elements-borderColorActive border-t-transparent rounded-full" />
        <p className="text-sm text-mindvex-elements-textSecondary">Loading repositories...</p>
      </div>
    );
  }

  if (!repositories.length) {
    return (
      <div className="text-center p-8">
        <GitBranch className="w-12 h-12 text-mindvex-elements-textTertiary mx-auto mb-4" />
        <p className="text-mindvex-elements-textSecondary mb-4">No repositories found</p>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={classNames('w-4 h-4 mr-2', { 'animate-spin': isRefreshing })} />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className={classNames('space-y-6', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-mindvex-elements-textPrimary">Select Repository to Clone</h3>
          <p className="text-sm text-mindvex-elements-textSecondary">
            {filteredRepositories.length} of {repositories.length} repositories
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={classNames('w-4 h-4', { 'animate-spin': isRefreshing })} />
          Refresh
        </Button>
      </div>

      {error && repositories.length > 0 && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">Warning: {error}. Showing cached data.</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mindvex-elements-textTertiary" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor text-mindvex-elements-textPrimary placeholder-mindvex-elements-textTertiary focus:outline-none focus:ring-1 focus:ring-mindvex-elements-borderColorActive"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-mindvex-elements-textTertiary" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-lg bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor text-mindvex-elements-textPrimary text-sm focus:outline-none focus:ring-1 focus:ring-mindvex-elements-borderColorActive"
          >
            <option value="updated">Recently updated</option>
            <option value="stars">Most starred</option>
            <option value="name">Name (A-Z)</option>
            <option value="created">Recently created</option>
          </select>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-mindvex-elements-textTertiary" />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="px-3 py-2 rounded-lg bg-mindvex-elements-background-depth-1 border border-mindvex-elements-borderColor text-mindvex-elements-textPrimary text-sm focus:outline-none focus:ring-1 focus:ring-mindvex-elements-borderColorActive"
          >
            <option value="all">All repositories</option>
            <option value="own">Own repositories</option>
            <option value="forks">Forked repositories</option>
            <option value="archived">Archived repositories</option>
          </select>
        </div>
      </div>

      {/* Repository Grid */}
      {currentRepositories.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRepositories.map((repo) => (
              <GitHubRepositoryCard key={repo.id} repo={repo} onClone={() => handleCloneRepository(repo)} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-mindvex-elements-borderColor">
              <div className="text-sm text-mindvex-elements-textSecondary">
                Showing {Math.min(startIndex + 1, filteredRepositories.length)} to{' '}
                {Math.min(startIndex + REPOS_PER_PAGE, filteredRepositories.length)} of {filteredRepositories.length}{' '}
                repositories
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm text-mindvex-elements-textSecondary px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-mindvex-elements-textSecondary">No repositories found matching your search criteria.</p>
        </div>
      )}

      {/* Branch Selector Modal */}
      {selectedRepo && (
        <BranchSelector
          provider="github"
          repoOwner={selectedRepo.full_name.split('/')[0]}
          repoName={selectedRepo.full_name.split('/')[1]}
          token={connection?.token || ''}
          defaultBranch={selectedRepo.default_branch}
          onBranchSelect={handleBranchSelect}
          onClose={handleCloseBranchSelector}
          isOpen={isBranchSelectorOpen}
        />
      )}
    </motion.div>
  );
}
