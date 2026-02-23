import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Link } from '@remix-run/react';
import { toast } from 'react-toastify';
import {
  Github,
  FolderOpen,
  Code2,
  Clock,
  GitBranch,
  Trash2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';

import { useGit } from '~/lib/hooks/useGit';
import { repositoryHistoryStore, type RepositoryHistoryItem } from '~/lib/stores/repositoryHistory';
import { importFilesToWorkbench } from '~/utils/directFileImport';
import { importGitRepoToWorkbench } from '~/utils/workbenchImport';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractRepoName(url: string): string {
  return (
    url
      .split('/')
      .pop()
      ?.replace(/\.git$/, '') || 'repository'
  );
}

function formatTimeAgo(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface RepoRowProps {
  repo: RepositoryHistoryItem;
  onOpen: (repo: RepositoryHistoryItem) => void;
  onRemove: (id: string) => void;
  isOpening: boolean;
}

function RepoRow({ repo, onOpen, onRemove, isOpening }: RepoRowProps) {
  return (
    <div
      className={classNames(
        'group flex items-center justify-between gap-3',
        'px-4 py-3 rounded-xl',
        'bg-mindvex-elements-background-depth-2',
        'border border-mindvex-elements-borderColor',
        'hover:border-mindvex-elements-borderColorActive hover:bg-mindvex-elements-background-depth-3',
        'transition-all duration-200 cursor-pointer',
      )}
      onClick={() => !isOpening && onOpen(repo)}
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
        <GitBranch className="w-4 h-4 text-green-500" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mindvex-elements-textPrimary truncate">{repo.name}</p>
        <p className="text-xs text-mindvex-elements-textTertiary truncate">{repo.url}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-mindvex-elements-textSecondary">
          <span>{formatTimeAgo(repo.timestamp)}</span>
          {repo.branch && (
            <>
              <span>·</span>
              <span className="truncate">{repo.branch}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isOpening ? (
          <Loader2 className="w-4 h-4 animate-spin text-mindvex-elements-textSecondary" />
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(repo.url.replace(/\.git$/, ''), '_blank');
              }}
              className="p-1.5 rounded-md hover:bg-mindvex-elements-background-depth-4 text-mindvex-elements-textSecondary hover:text-mindvex-elements-textPrimary transition-colors"
              title="Open in GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(repo.id);
              }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-mindvex-elements-textSecondary hover:text-red-500 transition-colors"
              title="Remove from history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HomeContent() {
  const { ready: gitReady, gitClone } = useGit();
  const historyMap = useStore(repositoryHistoryStore.repositoryHistory);
  const isHistoryLoading = useStore(repositoryHistoryStore.isLoading);

  const [githubUrl, setGithubUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [isFolderImporting, setIsFolderImporting] = useState(false);
  const [openingRepoId, setOpeningRepoId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // Initialize history store (fetches from backend if authenticated)
  useEffect(() => {
    repositoryHistoryStore.initialize();
  }, []);

  const recentRepos = repositoryHistoryStore.getRecentRepositories(showAllHistory ? 50 : 6);
  const allRepos = repositoryHistoryStore.getAllRepositories();
  const hasMore = allRepos.length > 6;

  // ── Clone from GitHub ──────────────────────────────────────────────────────
  const handleClone = async () => {
    const url = githubUrl.trim();

    if (!url) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }

    if (!gitReady) {
      toast.error('Git engine not ready yet, please wait a moment and try again');
      return;
    }

    setIsCloning(true);

    try {
      const name = extractRepoName(url);
      await importGitRepoToWorkbench(url, gitClone);
      await repositoryHistoryStore.addRepository(url, name);
      setGithubUrl('');
      toast.success(`Cloned "${name}" successfully`);
    } catch (error) {
      console.error('Clone failed:', error);
      // importGitRepoToWorkbench already shows a toast on failure
    } finally {
      setIsCloning(false);
    }
  };

  const handleCloneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleClone();
    }
  };

  // ── Local folder import ────────────────────────────────────────────────────
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      return;
    }

    setIsFolderImporting(true);

    try {
      await importFilesToWorkbench(files);
    } catch (error) {
      console.error('Folder import failed:', error);
      toast.error('Failed to import folder');
    } finally {
      setIsFolderImporting(false);
      e.target.value = '';
    }
  };

  // ── History open ───────────────────────────────────────────────────────────
  const handleOpenRepo = async (repo: RepositoryHistoryItem) => {
    if (!gitReady) {
      toast.error('Git engine not ready yet, please wait a moment and try again');
      return;
    }

    setOpeningRepoId(repo.id);

    try {
      await importGitRepoToWorkbench(repo.url, gitClone);
      await repositoryHistoryStore.addRepository(repo.url, repo.name, repo.description, repo.branch, repo.commitHash);
      toast.success(`Opened "${repo.name}"`);
    } catch (error) {
      console.error('Failed to open repo:', error);
    } finally {
      setOpeningRepoId(null);
    }
  };

  const handleRemoveRepo = async (id: string) => {
    try {
      await repositoryHistoryStore.removeRepository(id);
      toast.success('Removed from history');
    } catch (error) {
      console.error('Remove failed:', error);
      toast.error('Failed to remove repository');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all repository history?')) {
      return;
    }

    try {
      await repositoryHistoryStore.clearHistory();
      toast.success('History cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-start h-full overflow-y-auto px-6 pt-14 pb-10">
      <div className="w-full max-w-3xl">
        {/* ── Hero heading ──────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-mindvex-elements-textTertiary tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Development Platform
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-mindvex-elements-textPrimary mb-3">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              MindVex
            </span>
          </h1>
          <p className="text-base text-mindvex-elements-textSecondary max-w-md mx-auto">
            Clone repos, import local projects, and explore your codebase with intelligence.
          </p>
        </div>

        {/* ── Top row: GitHub (left) + Folder (right) ───────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* ── Clone from GitHub ── */}
          <div
            className={classNames(
              'relative flex flex-col rounded-2xl overflow-hidden',
              'border border-white/[0.08] bg-gradient-to-br from-[#0f1629] to-[#0a0d1a]',
              'shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_8px_32px_rgba(0,0,0,0.4)]',
              'hover:shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_12px_40px_rgba(99,102,241,0.12)]',
              'transition-all duration-300 p-6',
            )}
          >
            {/* accent glow top-left */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Github className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-mindvex-elements-textPrimary leading-tight">
                    Clone from GitHub
                  </h3>
                  <p className="text-xs text-mindvex-elements-textTertiary mt-0.5">
                    Paste any public or private Git URL
                  </p>
                </div>
              </div>

              {/* Input */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={handleCloneKeyDown}
                  placeholder="https://github.com/owner/repo"
                  disabled={isCloning}
                  className={classNames(
                    'w-full px-3 py-2.5 text-xs rounded-xl pr-10',
                    'bg-white/[0.04] border border-white/[0.08]',
                    'text-mindvex-elements-textPrimary placeholder:text-mindvex-elements-textTertiary',
                    'focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06]',
                    'disabled:opacity-50 transition-all duration-200',
                  )}
                />
              </div>

              {/* Clone button */}
              <button
                onClick={handleClone}
                disabled={isCloning || !githubUrl.trim()}
                className={classNames(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold',
                  'bg-gradient-to-r from-blue-600 to-blue-500',
                  'hover:from-blue-500 hover:to-blue-400',
                  'text-white shadow-[0_2px_12px_rgba(59,130,246,0.3)]',
                  'hover:shadow-[0_4px_20px_rgba(59,130,246,0.45)]',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                  'transition-all duration-200',
                )}
              >
                {isCloning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Cloning…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clone Repository
                  </>
                )}
              </button>

              {!gitReady && (
                <p className="text-[10px] text-yellow-400/70 mt-2 flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Git engine warming up…
                </p>
              )}
            </div>
          </div>

          {/* ── Import Local Folder ── */}
          <div
            className={classNames(
              'relative flex flex-col rounded-2xl overflow-hidden',
              'border border-white/[0.08] bg-gradient-to-br from-[#160f0a] to-[#0d0a05]',
              'shadow-[0_0_0_1px_rgba(245,158,11,0.12),0_8px_32px_rgba(0,0,0,0.4)]',
              'hover:shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_12px_40px_rgba(245,158,11,0.10)]',
              'transition-all duration-300 p-6',
            )}
          >
            {/* accent glow top-right */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderChange}
            />

            <div className="relative flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-mindvex-elements-textPrimary leading-tight">
                    Import Local Folder
                  </h3>
                  <p className="text-xs text-mindvex-elements-textTertiary mt-0.5">Open a project from your machine</p>
                </div>
              </div>

              {/* Drop zone / button */}
              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={isFolderImporting}
                className={classNames(
                  'flex-1 flex flex-col items-center justify-center gap-3 rounded-xl',
                  'border border-dashed border-amber-500/20',
                  'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]',
                  'hover:border-amber-500/40',
                  'text-mindvex-elements-textSecondary',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'transition-all duration-200 py-6 cursor-pointer',
                )}
              >
                {isFolderImporting ? (
                  <>
                    <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">Importing files…</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-amber-400">Click to Browse</p>
                      <p className="text-[10px] text-mindvex-elements-textTertiary mt-0.5">or drag a folder here</p>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Open Code Editor (full-width banner) ──────────────────────────── */}
        <Link
          to="/editor"
          className={classNames(
            'relative group flex items-center justify-between gap-4 rounded-2xl overflow-hidden',
            'border border-white/[0.08] bg-gradient-to-r from-[#110e1f] via-[#0d0b1a] to-[#0f0c1d]',
            'shadow-[0_0_0_1px_rgba(168,85,247,0.12),0_4px_24px_rgba(0,0,0,0.35)]',
            'hover:shadow-[0_0_0_1px_rgba(168,85,247,0.28),0_8px_32px_rgba(168,85,247,0.12)]',
            'transition-all duration-300 px-6 py-5 mb-10',
          )}
        >
          {/* Glow */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-purple-600/10 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-mindvex-elements-textPrimary">Open Code Editor</h3>
              <p className="text-xs text-mindvex-elements-textTertiary">Start with a blank workspace</p>
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-purple-400 font-medium group-hover:gap-3 transition-all duration-200">
            Launch editor
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* ── Recent Repositories ────────────────────────────────────────────── */}
        {(isHistoryLoading || allRepos.length > 0) && (
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
                  <Clock className="w-3 h-3 text-mindvex-elements-textSecondary" />
                </div>
                <h2 className="text-sm font-semibold text-mindvex-elements-textPrimary">Recent Repositories</h2>
                {allRepos.length > 0 && (
                  <span className="text-[10px] text-mindvex-elements-textTertiary bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5 tabular-nums">
                    {allRepos.length}
                  </span>
                )}
              </div>
              {allRepos.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[10px] text-mindvex-elements-textTertiary hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>

            {isHistoryLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-mindvex-elements-textTertiary" />
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
                  {recentRepos.map((repo) => (
                    <RepoRow
                      key={repo.id}
                      repo={repo}
                      onOpen={handleOpenRepo}
                      onRemove={handleRemoveRepo}
                      isOpening={openingRepoId === repo.id}
                    />
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={() => setShowAllHistory((v) => !v)}
                    className="mt-3 w-full text-[11px] text-mindvex-elements-textTertiary hover:text-mindvex-elements-textSecondary transition-colors py-2"
                  >
                    {showAllHistory ? '↑ Show less' : `↓ Show ${allRepos.length - 6} more`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
