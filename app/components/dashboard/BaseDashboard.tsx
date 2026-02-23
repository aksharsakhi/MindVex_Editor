import React from 'react';
import { Link } from '@remix-run/react';

const initialDashboardData = {
  totalFiles: 0,
  totalModules: 0,
  languagesDetected: 0,
  codeHealthScore: 0,
  languageDistribution: [],
  recentChanges: [],
  dependencies: [],
  fileStructure: [],
  potentialIssues: [],
  architectureLayers: [],
  totalLines: 0,
  totalCodeLines: 0,
  totalCommentLines: 0,
  totalBlankLines: 0,
};

export function BaseDashboard() {
  return (
    <div className="flex flex-col h-full w-full overflow-y-auto">
      {/* Hero Section */}
      <div className="relative mb-8 p-8 bg-gradient-to-br from-mindvex-elements-background-depth-2 to-mindvex-elements-background-depth-3 rounded-2xl border border-mindvex-elements-borderColor overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-mindvex-elements-textPrimary mb-3 bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            Project Dashboard
          </h1>
          <p className="text-lg text-mindvex-elements-textSecondary">
            Real-time codebase intelligence and architecture visualization
          </p>
        </div>
        <div className="relative z-10 mt-6 flex items-center gap-3 text-mindvex-elements-textSecondary">
          <div className="flex items-center gap-2 px-4 py-2 bg-mindvex-elements-background-depth-1 rounded-full">
            <svg
              className="animate-spin h-4 w-4 text-orange-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm font-medium">Initializing workspace analysis...</span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: 'Total Files',
              value: initialDashboardData.totalFiles,
              icon: '📄',
              color: 'from-blue-500 to-blue-600',
            },
            {
              label: 'Code Modules',
              value: initialDashboardData.totalModules,
              icon: '📦',
              color: 'from-purple-500 to-purple-600',
            },
            {
              label: 'Languages',
              value: initialDashboardData.languagesDetected,
              icon: '🔤',
              color: 'from-green-500 to-green-600',
            },
            {
              label: 'Health Score',
              value: `${initialDashboardData.codeHealthScore}%`,
              icon: '💚',
              color: 'from-orange-500 to-orange-600',
            },
          ].map((metric, idx) => (
            <div
              key={idx}
              className="group relative bg-mindvex-elements-background-depth-2 rounded-xl border border-mindvex-elements-borderColor overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              ></div>
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl opacity-80">{metric.icon}</span>
                  <div className="w-2 h-2 rounded-full bg-mindvex-elements-borderColor group-hover:bg-orange-500 transition-colors duration-300"></div>
                </div>
                <h3 className="text-sm font-medium text-mindvex-elements-textSecondary mb-2">{metric.label}</h3>
                <p className="text-4xl font-bold text-mindvex-elements-textPrimary">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-mindvex-elements-background-depth-2 rounded-xl border border-mindvex-elements-borderColor p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl">
                📊
              </div>
              <h3 className="text-lg font-semibold text-mindvex-elements-textPrimary">Language Distribution</h3>
            </div>
            <div className="h-64 flex items-center justify-center border border-dashed border-mindvex-elements-borderColor rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-30">📈</div>
                <p className="text-mindvex-elements-textSecondary">Awaiting workspace data</p>
              </div>
            </div>
          </div>

          <div className="bg-mindvex-elements-background-depth-2 rounded-xl border border-mindvex-elements-borderColor p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xl">
                🔄
              </div>
              <h3 className="text-lg font-semibold text-mindvex-elements-textPrimary">Recent Activity</h3>
            </div>
            <div className="h-64 flex items-center justify-center border border-dashed border-mindvex-elements-borderColor rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-30">⏳</div>
                <p className="text-mindvex-elements-textSecondary">No recent changes detected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-mindvex-elements-textPrimary mb-4 flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { to: '/git', icon: '🔀', label: 'Git History', desc: 'View commits & branch history' },
              { to: '/dashboard', icon: '📊', label: 'Analytics', desc: 'Explore analytics & hotspots' },
              { to: '/editor', icon: '💻', label: 'Code Editor', desc: 'Edit and manage files' },
            ].map((action, idx) => (
              <Link
                key={idx}
                to={action.to}
                className="group relative bg-mindvex-elements-background-depth-2 hover:bg-mindvex-elements-background-depth-3 p-6 rounded-xl border border-mindvex-elements-borderColor transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-orange-500"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{action.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-mindvex-elements-textPrimary mb-1 group-hover:text-orange-500 transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-sm text-mindvex-elements-textSecondary">{action.desc}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-mindvex-elements-textSecondary group-hover:text-orange-500 group-hover:translate-x-1 transition-all"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
