import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';
import {
  graphCacheLoading,
  graphCacheError,
  loadExistingGraph,
  refreshGraph,
  graphCacheStatus,
} from '~/lib/stores/graphCacheStore';

// Tool Pages
import { KnowledgeGraphPage } from './tools/KnowledgeGraphPage';
import { ASTParsingPage } from './tools/ASTParsingPage';
import { ArchitecturePage } from './tools/ArchitecturePage';
import { RealTimeGraphPage } from './tools/RealTimeGraphPage';
import { ImpactAnalysisPage } from './tools/ImpactAnalysisPage';
import { CycleDetectionPage } from './tools/CycleDetectionPage';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { EvolutionaryBlame } from './EvolutionaryBlame';
import { IntelligentChat } from './IntelligentChat';
import { LivingWiki } from './LivingWiki';

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const quickActions: QuickActionItem[] = [
  {
    id: 'kg-construction',
    title: 'Knowledge Graph Construction',
    description: 'Build knowledge graphs from your codebase using AST parsing',
    icon: '🧠',
    color: 'yellow',
  },
  {
    id: 'ast-parsing',
    title: 'Multi-Language AST Parsing',
    description: 'Parse multiple programming languages using Abstract Syntax Trees',
    icon: '🔍',
    color: 'indigo',
  },
  {
    id: 'architecture-graph',
    title: 'Architecture / Dependency Graph',
    description: 'Visualize your code architecture and dependencies',
    icon: '📊',
    color: 'red',
  },
  {
    id: 'realtime-graph',
    title: 'Real-Time Graph Update',
    description: 'Update knowledge graphs in real-time as code changes',
    icon: '🔄',
    color: 'cyan',
  },
  {
    id: 'impact-analysis',
    title: 'Change Impact Analysis',
    description: 'Analyze the impact of code changes using knowledge graphs',
    icon: '🔬',
    color: 'pink',
  },
  {
    id: 'cycle-detection',
    title: 'Cycle Detection (Architectural Anomaly)',
    description: 'Detect architectural anomalies and dependency cycles',
    icon: '❌',
    color: 'teal',
  },
  {
    id: 'analytics-dashboard',
    title: 'Code Analytics & Hotspots',
    description: 'Visualize code churn, hotspot files, and rework trends',
    icon: '📊',
    color: 'orange',
  },
  {
    id: 'evolutionary-blame',
    title: 'Evolutionary Blame',
    description: 'Age-colored git blame with AI-powered churn analysis',
    icon: '🕵️',
    color: 'violet',
  },
  {
    id: 'intelligent-chat',
    title: 'Code Intelligence Chat',
    description: 'Ask questions about your codebase using semantic graph search',
    icon: '🤖',
    color: 'blue',
  },
  {
    id: 'living-wiki',
    title: 'Living Wiki & Documentation',
    description: 'AI-generated project docs that stay in sync with your code',
    icon: '📚',
    color: 'green',
  },
];

export function QuickActions() {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>('');

  // Store subscriptions
  const isLoading = useStore(graphCacheLoading);
  const error = useStore(graphCacheError);
  const status = useStore(graphCacheStatus);

  // Auto-detect current repo on mount
  useEffect(() => {
    const recentRepos = repositoryHistoryStore.getRecentRepositories(1);

    if (recentRepos.length > 0) {
      const url = recentRepos[0].url;
      setRepoUrl(url);

      // Try to load existing graph data or trigger a background build
      loadExistingGraph(url);
    }
  }, []);

  const handleActionClick = (actionId: string) => {
    setActiveToolId(actionId);
  };

  const handleBackToMenu = () => {
    setActiveToolId(null);
  };

  const handleRefreshGraph = () => {
    if (repoUrl && !isLoading) {
      refreshGraph(repoUrl);
    }
  };

  // Render the currently selected tool page
  const renderToolPage = () => {
    switch (activeToolId) {
      case 'kg-construction':
        return <KnowledgeGraphPage onBack={handleBackToMenu} />;
      case 'ast-parsing':
        return <ASTParsingPage onBack={handleBackToMenu} />;
      case 'architecture-graph':
        return <ArchitecturePage onBack={handleBackToMenu} />;
      case 'realtime-graph':
        return <RealTimeGraphPage onBack={handleBackToMenu} />;
      case 'impact-analysis':
        return <ImpactAnalysisPage onBack={handleBackToMenu} />;
      case 'cycle-detection':
        return <CycleDetectionPage onBack={handleBackToMenu} />;
      case 'analytics-dashboard':
        return <AnalyticsDashboard />;
      case 'evolutionary-blame':
        return <EvolutionaryBlame />;
      case 'intelligent-chat':
        return <IntelligentChat />;
      case 'living-wiki':
        return <LivingWiki />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => {
              if (activeToolId) {
                handleBackToMenu();
              } else {
                workbenchStore.currentView.set('dashboard');
              }
            }}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            {activeToolId ? 'Back to Tools' : 'Back to Dashboard'}
          </button>

          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              {status === 'building' && (
                <span className="text-xs text-yellow-400 animate-pulse">Building graph...</span>
              )}
              {status === 'polling' && (
                <span className="text-xs text-blue-400 animate-pulse">Waiting for dependencies...</span>
              )}
              {status === 'ready' && <span className="text-xs text-green-400">Graph Ready</span>}
              {status === 'error' && <span className="text-xs text-red-400">Build Failed</span>}

              <button
                onClick={handleRefreshGraph}
                disabled={!repoUrl || isLoading}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors disabled:opacity-50"
                title="Force refresh graph data"
              >
                <div className={`i-ph:arrows-clockwise ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
              <span className="text-sm text-gray-400">Target Repository:</span>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 w-64"
                onBlur={() => {
                  if (repoUrl) {
                    loadExistingGraph(repoUrl);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {!activeToolId && (
          <>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              Knowledge Graph & Analysis Tools
            </h1>
            <p className="text-gray-400 mt-2 mb-8">
              Advanced codebase analysis powered by SCIP and your backend architecture. Pre-computed for instant
              results.
            </p>
          </>
        )}

        {error && !activeToolId && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200">{error}</div>
        )}

        {!activeToolId ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative">
            {/* Show an overlay if the graph is currently building/loading overall and we are not in a tool */}
            {isLoading && (
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center pointer-events-none">
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl shadow-black/50 flex items-center gap-4 pointer-events-auto shadow">
                  <div className="i-ph:spinner animate-spin text-2xl text-blue-500" />
                  <div>
                    <div className="font-bold text-gray-200">Analyzing Repository</div>
                    <div className="text-sm text-gray-400">Building knowledge graph via SCIP...</div>
                  </div>
                </div>
              </div>
            )}

            {quickActions.map((action) => (
              <div
                key={action.id}
                className="p-6 rounded-xl border bg-gray-800/40 backdrop-blur-lg border-gray-700 hover:border-blue-500 cursor-pointer transition-all hover:scale-[1.01]"
                onClick={() => handleActionClick(action.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{action.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-white">{action.title}</h3>
                    <p className="text-gray-400 text-sm mb-4">{action.description}</p>
                    <div className="flex justify-end">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400">
                        Open Tool
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 relative">
            {/* Show loading overlay over the tool if it's still building */}
            {isLoading && (
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
                <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl shadow-black/50 flex flex-col items-center gap-4">
                  <div className="i-ph:spinner animate-spin text-4xl text-blue-500" />
                  <div className="text-center">
                    <div className="font-bold text-gray-200 text-lg">Analyzing Repository</div>
                    <div className="text-sm text-gray-400 mt-1">Extracting ASTs and resolving dependencies...</div>
                  </div>
                </div>
              </div>
            )}
            {renderToolPage()}
          </div>
        )}
      </div>
    </div>
  );
}
