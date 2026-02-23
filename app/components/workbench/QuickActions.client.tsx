import { useState } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export function QuickActions() {
  const [error, setError] = useState<string | null>(null);

  const quickActions: QuickActionItem[] = [
    {
      id: 'ast-parsing',
      title: 'Multi-Language AST Parsing',
      description: 'Parse multiple programming languages using Abstract Syntax Trees',
      icon: 'ðŸ”',
      color: 'indigo',
      enabled: false,
    },
    {
      id: 'realtime-graph',
      title: 'Real-Time Graph Update (Incremental)',
      description: 'Update knowledge graphs in real-time as code changes',
      icon: 'ðŸ”„',
      color: 'cyan',
      enabled: false,
    },
    {
      id: 'impact-analysis',
      title: 'Change Impact Analysis',
      description: 'Analyze the impact of code changes using knowledge graphs',
      icon: 'ðŸ”¬',
      color: 'pink',
      enabled: false,
    },
    {
      id: 'cycle-detection',
      title: 'Cycle Detection (Architectural Anomaly)',
      description: 'Detect architectural anomalies and dependency cycles',
      icon: 'âŒ',
      color: 'teal',
      enabled: false,
    },
  ];

  const handleActionClick = (actionId: string) => {
    setError(`${actionId} is coming soon!`);
    setTimeout(() => setError(null), 3000);
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => workbenchStore.currentView.set('dashboard')}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Analysis Tools
        </h1>
        <p className="text-gray-400 mt-2 mb-8">Advanced codebase analysis features â€” coming soon</p>

        {error && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-200">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action) => (
            <div
              key={action.id}
              className="p-6 rounded-xl border bg-gray-800/30 backdrop-blur-lg border-gray-700 opacity-70 cursor-not-allowed"
              onClick={() => handleActionClick(action.id)}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl grayscale">{action.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 text-gray-400">{action.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{action.description}</p>
                  <div className="flex justify-end">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700">
          <h3 className="font-semibold text-white mb-2">ðŸ’¡ Note</h3>
          <p className="text-gray-400 text-sm">
            These advanced analysis features are under development. The backend already supports SCIP-based code
            intelligence, dependency graphs, hotspot analysis, and blame annotations.
          </p>
        </div>
      </div>
    </div>
  );
}
