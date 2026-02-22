import React, { useState, useEffect } from 'react';
import { Link } from '@remix-run/react';
import { BaseDashboard } from './BaseDashboard';
import { webcontainer } from '~/lib/webcontainer';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import { path } from '~/utils/path';
import { toast } from 'react-toastify';
import { workbenchStore, quickActionsStore } from '~/lib/stores/workbench';
import { WORK_DIR } from '~/utils/constants';

interface LanguageDistribution {
  language: string;
  count: number;
}

interface DashboardData {
  totalFiles: number;
  totalModules: number;
  languagesDetected: number;
  codeHealthScore: number;
  languageDistribution: LanguageDistribution[];
  recentChanges: string[];
  dependencies: string[];
  fileStructure: string[];
  potentialIssues: string[];
  architectureLayers: string[];
  totalLines: number;
  totalCodeLines: number;
  totalCommentLines: number;
  totalBlankLines: number;
}

interface DashboardState {
  loading: boolean;
  data: DashboardData;
}

export function Dashboard() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    loading: false,
    data: {
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
    },
  });

  const setDashboardData = (data: DashboardData) => {
    setDashboardState((prev) => ({
      ...prev,
      data,
    }));
  };

  const { data: dashboardData, loading } = dashboardState;

  const loadDashboardData = async () => {
    setDashboardState((prev) => ({ ...prev, loading: true }));

    try {
      console.log('Loading dashboard data...');

      const container = await webcontainer;

      async function getAllFiles(dirPath: string): Promise<{ path: string; content: string }[]> {
        const files: { path: string; content: string }[] = [];

        try {
          const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (
              entry.isDirectory() &&
              (entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === 'dist' ||
                entry.name === 'build' ||
                entry.name === '.cache' ||
                entry.name === '.next')
            ) {
              continue;
            }

            if (entry.isFile()) {
              if (entry.name.endsWith('.DS_Store') || entry.name.endsWith('.log') || entry.name.startsWith('.env')) {
                continue;
              }

              try {
                const content = await container.fs.readFile(fullPath, 'utf-8');
                files.push({ path: fullPath, content: content as string });
              } catch (error) {
                console.warn(`Could not read file ${fullPath}:`, error);
                continue;
              }
            } else if (entry.isDirectory()) {
              const subFiles = await getAllFiles(fullPath);
              files.push(...subFiles);
            }
          }
        } catch (error) {
          console.warn(`Could not read directory ${dirPath}:`, error);
        }

        return files;
      }

      console.log('Starting dashboard analysis in directory:', WORK_DIR);

      // If no files found, try to look in root directory
      let analysisFiles = await getAllFiles(WORK_DIR);
      console.log('Found', analysisFiles.length, 'files for analysis');

      if (analysisFiles.length === 0) {
        console.log('No files found in WORK_DIR, checking root directory...');
        analysisFiles = await getAllFiles('/');
        console.log('Found', analysisFiles.length, 'files in root directory');
      }

      const totalFiles = analysisFiles.length;

      const languageCount: Record<string, number> = {};

      // Enhanced language distribution algorithm considering multiple factors
      const languageStats: Record<
        string,
        { fileCount: number; totalLines: number; codeLines: number; commentLines: number; blankLines: number }
      > = {};

      analysisFiles.forEach((file) => {
        const ext = path.extname(file.path).toLowerCase();
        const basename = path.basename(file.path).toLowerCase();

        let language = null;

        // If the file has an extension, use it to determine language
        if (ext && ext !== '.') {
          // Remove the leading dot from extension (e.g., '.js' -> 'js')
          const extWithoutDot = ext.substring(1);
          language = getLanguageFromExtension(extWithoutDot);
        } else {
          // For files without extensions, try to infer from filename
          if (basename === 'dockerfile' || basename.includes('dockerfile')) {
            language = 'dockerfile';
          } else if (basename === 'makefile' || basename === 'gnufile') {
            language = 'makefile';
          } else if (basename === 'readme' || basename.startsWith('readme')) {
            language = 'markdown';
          } else if (basename === 'license' || basename.startsWith('license')) {
            language = 'plaintext';
          } else if (basename === 'gitignore' || basename === '.gitignore') {
            language = 'git';
          } else if (basename === 'env' || basename.startsWith('.env')) {
            language = 'env';
          } else if (basename.startsWith('nginx.conf') || basename === 'nginx.conf') {
            language = 'nginx';
          } else if (basename === 'procfile') {
            language = 'procfile';
          }
        }

        // Only process known languages
        if (language && language !== 'unknown') {
          // Initialize stats for this language if not already present
          if (!languageStats[language]) {
            languageStats[language] = { fileCount: 0, totalLines: 0, codeLines: 0, commentLines: 0, blankLines: 0 };
          }

          // Count lines in this file
          const lines = file.content.split('\n');
          let fileCodeLines = 0;
          let fileCommentLines = 0;
          let fileBlankLines = 0;

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === '') {
              fileBlankLines++;
            } else if (
              trimmed.startsWith('//') ||
              trimmed.startsWith('/*') ||
              trimmed.startsWith('*') ||
              trimmed.startsWith('*/') ||
              trimmed.startsWith('#') ||
              trimmed.startsWith(';') ||
              (trimmed.includes('/*') && trimmed.includes('*/')) ||
              trimmed.startsWith('"""') ||
              trimmed.startsWith("'''") ||
              trimmed.startsWith('<!--') ||
              trimmed.endsWith('-->')
            ) {
              fileCommentLines++;
            } else {
              fileCodeLines++;
            }
          }

          // Update stats for this language
          languageStats[language].fileCount++;
          languageStats[language].totalLines += lines.length;
          languageStats[language].codeLines += fileCodeLines;
          languageStats[language].commentLines += fileCommentLines;
          languageStats[language].blankLines += fileBlankLines;
        }
      });

      /*
       * Convert language stats to the format expected by the rest of the code
       * For language distribution, we'll weight by lines of code to better represent actual usage
       */
      Object.entries(languageStats).forEach(([lang, stats]) => {
        /*
         * Use a weighted score that considers both file count and code lines
         * This gives a more accurate representation of the actual codebase composition
         */
        const weightedScore = stats.codeLines + stats.fileCount * 10; // Give some weight to file count too
        languageCount[lang] = weightedScore;
      });

      console.log('Language distribution:', languageCount);

      // Sort language distribution by count
      const languageDistribution = Object.entries(languageCount)
        .map(([lang, count]) => ({ language: lang, count }))
        .sort((a, b) => b.count - a.count);

      const languagesDetected = Object.keys(languageCount).length;

      let totalLines = 0;
      let totalCodeLines = 0;
      let totalCommentLines = 0;
      let totalBlankLines = 0;

      analysisFiles.forEach((file) => {
        const lines = file.content.split('\n');
        totalLines += lines.length;

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed === '') {
            totalBlankLines++;
          } else if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('/*') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('*/') ||
            trimmed.startsWith('#') ||
            trimmed.startsWith(';') ||
            (trimmed.includes('/*') && trimmed.includes('*/')) ||
            trimmed.startsWith('"""') ||
            trimmed.startsWith("'''") ||
            trimmed.startsWith('<!--') ||
            trimmed.endsWith('-->')
          ) {
            totalCommentLines++;
          } else {
            totalCodeLines++;
          }
        }
      });

      const codeToCommentRatio = totalCommentLines > 0 ? totalCodeLines / totalCommentLines : totalCodeLines;
      const blankLineRatio = totalBlankLines / totalLines;

      const totalModules = analysisFiles.filter((file) => {
        const lines = file.content.split('\n');
        return lines.some((line) => line.trim() !== '' && !line.trim().startsWith('//'));
      }).length;

      const dependencies: string[] = [];
      const potentialIssues: string[] = [];
      const architectureLayers: string[] = [];
      const fileStructure: string[] = [];

      // Enhanced dependencies detection
      const packageJsonFile = analysisFiles.find((file) => file.path.includes('package.json'));

      if (packageJsonFile) {
        try {
          const packageJson = JSON.parse(packageJsonFile.content);

          if (packageJson.dependencies) {
            dependencies.push(...Object.keys(packageJson.dependencies));
          }

          if (packageJson.devDependencies) {
            dependencies.push(...Object.keys(packageJson.devDependencies));
          }

          if (packageJson.peerDependencies) {
            dependencies.push(...Object.keys(packageJson.peerDependencies));
          }

          if (packageJson.optionalDependencies) {
            dependencies.push(...Object.keys(packageJson.optionalDependencies));
          }
        } catch (e) {
          console.error('Error parsing package.json:', e);
        }
      }

      // Enhanced potential issues detection
      const issuePatterns = [
        { pattern: /TODO/gi, type: 'TODO' },
        { pattern: /FIXME/gi, type: 'FIXME' },
        { pattern: /HACK/gi, type: 'HACK' },
        { pattern: /XXX/gi, type: 'XXX' },
        { pattern: /BUG/gi, type: 'BUG' },
        { pattern: /FIXME/gi, type: 'FIXME' },
        { pattern: /WARNING/gi, type: 'WARNING' },
        { pattern: /@deprecated/gi, type: 'DEPRECATED' },
        { pattern: /console\.log/gi, type: 'CONSOLE.LOG' },
        { pattern: /debugger;/gi, type: 'DEBUGGER' },
        { pattern: /\bTODO\s*:\s*/gi, type: 'TODO_COMMENT' },
        { pattern: /\bFIXME\s*:\s*/gi, type: 'FIXME_COMMENT' },
      ];

      analysisFiles.forEach((file) => {
        fileStructure.push(file.path);

        if (file.path.includes('node_modules') || file.path.includes('.git')) {
          return;
        }

        // Detect potential issues
        issuePatterns.forEach(({ pattern, type }) => {
          const matches = file.content.match(pattern);

          if (matches) {
            matches.forEach(() => {
              const issue = `${type} found in ${file.path}`;

              if (!potentialIssues.includes(issue)) {
                potentialIssues.push(issue);
              }
            });
          }
        });

        // Extract architecture layers from directory structure
        const pathParts = file.path
          .replace(WORK_DIR, '')
          .split('/')
          .filter((part) => part !== '');

        if (pathParts.length > 0) {
          const layer = pathParts[0]; // First directory as layer

          if (
            layer &&
            !architectureLayers.includes(layer) &&
            ![
              'node_modules',
              'dist',
              'build',
              'public',
              'assets',
              'images',
              'icons',
              'docs',
              '.git',
              'coverage',
            ].includes(layer)
          ) {
            architectureLayers.push(layer);
          }
        }

        // Enhanced dependencies detection
        const ext = path.extname(file.path).toLowerCase();

        if (
          ext === '.ts' ||
          ext === '.tsx' ||
          ext === '.js' ||
          ext === '.jsx' ||
          ext === '.json' ||
          ext === '.mjs' ||
          ext === '.cjs'
        ) {
          // JavaScript/TypeScript import/export statements
          if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx' || ext === '.mjs' || ext === '.cjs') {
            const importRegex = /(?:import|from|require)\s*['"`](?:@?[^'"`]+)['"`]/g;
            let importMatch;

            while ((importMatch = importRegex.exec(file.content)) !== null) {
              const importPath = importMatch[0].split(/['"`]/)[1];

              if (
                importPath &&
                !importPath.startsWith('./') &&
                !importPath.startsWith('../') &&
                !importPath.startsWith(WORK_DIR)
              ) {
                if (!dependencies.includes(importPath)) {
                  dependencies.push(importPath);
                }
              }
            }

            // Also check for require statements
            const requireRegex = /require\s*\(\s*['"`]([^'"]+)['"`]\s*\)/g;
            let requireMatch;

            while ((requireMatch = requireRegex.exec(file.content)) !== null) {
              const requirePath = requireMatch[1];

              if (
                requirePath &&
                !requirePath.startsWith('./') &&
                !requirePath.startsWith('../') &&
                !requirePath.startsWith(WORK_DIR)
              ) {
                if (!dependencies.includes(requirePath)) {
                  dependencies.push(requirePath);
                }
              }
            }
          }

          // Check for other common dependency indicators
          if (
            file.content.includes('pip install') ||
            file.content.includes('npm install') ||
            file.content.includes('yarn add')
          ) {
            const installRegex = /(pip install|npm install|yarn add)\s+([\w\-@\.\/+]+)/g;
            let installMatch;

            while ((installMatch = installRegex.exec(file.content)) !== null) {
              const dep = installMatch[2].split(' ')[0]; // Get the first package name

              if (dep && !dependencies.includes(dep)) {
                dependencies.push(dep);
              }
            }
          }
        }
      });

      // Remove duplicates from dependencies
      const uniqueDependencies = [...new Set(dependencies)];

      // Sort architecture layers alphabetically
      architectureLayers.sort();

      // Sort potential issues by file path
      potentialIssues.sort((a, b) => a.localeCompare(b));

      // Now calculate final health score with all known values
      let finalCodeHealthScore = 100;

      // Deduct points for too many blank lines
      if (blankLineRatio > 0.3) {
        finalCodeHealthScore -= (blankLineRatio - 0.3) * 100;
      }

      // Add points for appropriate commenting
      if (totalCommentLines > 0) {
        const commentRatio = totalCommentLines / totalCodeLines;

        if (commentRatio >= 0.1 && commentRatio <= 0.3) {
          // Good comment ratio is 10-30%
          finalCodeHealthScore += 15;
        } else if (commentRatio > 0.3) {
          // Too many comments
          finalCodeHealthScore += Math.max(0, 15 - (commentRatio - 0.3) * 50);
        } else {
          // Not enough comments
          finalCodeHealthScore -= Math.max(0, (0.1 - commentRatio) * 50);
        }
      }

      // Deduct points for potential issues
      finalCodeHealthScore -= Math.min(30, potentialIssues.length * 2); // Max 30 points deduction for issues

      finalCodeHealthScore = Math.max(0, Math.min(100, Math.round(finalCodeHealthScore)));

      setDashboardData({
        totalFiles,
        totalModules,
        languagesDetected,
        codeHealthScore: finalCodeHealthScore,
        languageDistribution,
        recentChanges: [],
        dependencies: uniqueDependencies,
        fileStructure,
        potentialIssues,
        architectureLayers,
        totalLines,
        totalCodeLines,
        totalCommentLines,
        totalBlankLines,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDashboardState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeDashboard = async () => {
      // Load workspace state first
      await workbenchStore.loadWorkspaceState();

      // Wait a bit to ensure files are loaded
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Load dashboard data
      await loadDashboardData();

      // Subscribe to file changes to update dashboard when files change
      unsubscribe = workbenchStore.files.subscribe(() => {
        // Debounce the dashboard update to avoid excessive updates
        const timer = setTimeout(() => {
          loadDashboardData();
        }, 500); // 500ms debounce to avoid excessive updates

        // Cleanup the timer if new changes come in
        return () => clearTimeout(timer);
      });
    };

    initializeDashboard();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const getHealthColor = (score: number) => {
    if (score >= 80) {
      return 'text-green-500';
    }

    if (score >= 60) {
      return 'text-yellow-500';
    }

    if (score >= 40) {
      return 'text-orange-500';
    }

    return 'text-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) {
      return 'bg-green-500';
    }

    if (score >= 60) {
      return 'bg-yellow-500';
    }

    if (score >= 40) {
      return 'bg-orange-500';
    }

    return 'bg-red-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) {
      return 'Excellent';
    }

    if (score >= 60) {
      return 'Good';
    }

    if (score >= 40) {
      return 'Fair';
    }

    return 'Needs Attention';
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 overflow-y-auto">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Project Analytics
            </h1>
            <p className="text-gray-400 mt-2">Real-time codebase intelligence and insights</p>
          </div>
          <button
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
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
                Analyzing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Files</p>
                <p className="text-3xl font-bold text-white mt-1">{dashboardData.totalFiles}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Languages</p>
                <p className="text-3xl font-bold text-white mt-1">{dashboardData.languagesDetected}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Modules</p>
                <p className="text-3xl font-bold text-white mt-1">{dashboardData.totalModules}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-yellow-500 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Health Score</p>
                <p className="text-3xl font-bold text-white mt-1">{dashboardData.codeHealthScore}%</p>
                <p className={`text-sm mt-1 ${getHealthColor(dashboardData.codeHealthScore)}`}>
                  {getHealthLabel(dashboardData.codeHealthScore)}
                </p>
              </div>
              <div className={`p-3 ${getHealthBgColor(dashboardData.codeHealthScore)}/20 rounded-lg`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${getHealthColor(dashboardData.codeHealthScore)}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Language Distribution */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Language Distribution</h2>
              <div className="text-sm text-gray-400" title="Based on lines of code and file count">
                Top {Math.min(6, dashboardData.languageDistribution.length)} languages
              </div>
            </div>
            <div className="space-y-4">
              {dashboardData.languageDistribution.length > 0 ? (
                dashboardData.languageDistribution.slice(0, 6).map((item, index) => {
                  const totalLanguageFiles = dashboardData.languageDistribution.reduce(
                    (sum, lang) => sum + lang.count,
                    0,
                  );
                  const percentage =
                    totalLanguageFiles > 0 ? ((item.count / totalLanguageFiles) * 100).toFixed(1) : '0';
                  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.language}</span>
                        <span className="text-gray-400" title="Weighted score based on lines of code and file count">
                          {item.count} units ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: colors[index % colors.length],
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  No language data available
                </div>
              )}
            </div>
          </div>

          {/* Code Statistics */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6">Code Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  <span className="text-gray-300">Total Lines</span>
                </div>
                <span className="font-mono text-blue-400">{dashboardData.totalLines.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  <span className="text-gray-300">Code Lines</span>
                </div>
                <span className="font-mono text-green-400">{dashboardData.totalCodeLines.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                  <span className="text-gray-300">Comments</span>
                </div>
                <span className="font-mono text-purple-400">{dashboardData.totalCommentLines.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"
                    />
                  </svg>
                  <span className="text-gray-300">Blank Lines</span>
                </div>
                <span className="font-mono text-gray-400">{dashboardData.totalBlankLines.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dependencies */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Dependencies</h2>
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                {dashboardData.dependencies.length} total
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {dashboardData.dependencies.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.dependencies.slice(0, 15).map((dep, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                        />
                      </svg>
                      <span className="font-mono text-sm text-gray-300 truncate">{dep}</span>
                    </div>
                  ))}
                  {dashboardData.dependencies.length > 15 && (
                    <div className="text-center text-gray-500 text-sm py-3">
                      + {dashboardData.dependencies.length - 15} more dependencies
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                    />
                  </svg>
                  No dependencies found
                </div>
              )}
            </div>
          </div>

          {/* Potential Issues */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Potential Issues</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  dashboardData.potentialIssues.length === 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {dashboardData.potentialIssues.length} issues
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {dashboardData.potentialIssues.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.potentialIssues.slice(0, 10).map((issue, index) => {
                    const issueType = issue.split(' ')[0];
                    const typeColors = {
                      TODO: 'bg-blue-500',
                      FIXME: 'bg-red-500',
                      HACK: 'bg-yellow-500',
                      XXX: 'bg-purple-500',
                      BUG: 'bg-red-600',
                      WARNING: 'bg-orange-500',
                      'CONSOLE.LOG': 'bg-gray-500',
                    };

                    return (
                      <div key={index} className="p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <span
                            className={`${typeColors[issueType as keyof typeof typeColors] || 'bg-gray-500'} text-white px-2 py-1 rounded text-xs font-bold min-w-[50px] text-center`}
                          >
                            {issueType}
                          </span>
                          <span className="text-sm text-gray-300 break-words flex-1">
                            {issue.substring(issue.indexOf('in'))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {dashboardData.potentialIssues.length > 10 && (
                    <div className="text-center text-gray-500 text-sm py-3">
                      + {dashboardData.potentialIssues.length - 10} more issues
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  No issues detected!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Architecture Layers */}
        {dashboardData.architectureLayers.length > 0 && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6">Architecture Layers</h2>
            <div className="flex flex-wrap gap-3">
              {dashboardData.architectureLayers.map((layer, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm font-medium shadow-lg"
                >
                  🏗️ {layer}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Graph Related Features */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Knowledge Graph & Analysis Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: '🧠',
                label: 'Knowledge Graph Construction',
                desc: 'Build knowledge graphs from your codebase using AST parsing',
                color: 'yellow',
              },
              {
                icon: '🔍',
                label: 'Multi-Language AST Parsing',
                desc: 'Parse multiple programming languages using Abstract Syntax Trees',
                color: 'indigo',
              },
              {
                icon: '📊',
                label: 'Architecture / Dependency Graph Visualization',
                desc: 'Visualize your code architecture and dependencies',
                color: 'red',
              },
              {
                icon: '🔄',
                label: 'Real-Time Graph Update (Incremental)',
                desc: 'Update knowledge graphs in real-time as code changes',
                color: 'cyan',
              },
              {
                icon: '🔬',
                label: 'Change Impact Analysis (Using Knowledge Graph)',
                desc: 'Analyze the impact of changes to specific nodes in your codebase',
                color: 'pink',
              },
              {
                icon: '❌',
                label: 'Cycle Detection (Architectural Anomaly)',
                desc: 'Detect cyclic dependencies in your codebase architecture',
                color: 'teal',
              },
            ].map((action, idx) => (
              <div
                key={`kg-feature-${idx}`}
                className="p-5 bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => {
                  // Switch to appropriate view based on the action
                  workbenchStore.showWorkbench.set(true);

                  if (action.label === 'Architecture / Dependency Graph Visualization') {
                    workbenchStore.currentView.set('arch-graph');
                  } else if (action.label === 'Real-Time Graph Update (Incremental)') {
                    workbenchStore.currentView.set('quick-actions');
                    quickActionsStore.showKnowledgeGraphView.set(true);
                  } else if (action.label === 'Change Impact Analysis (Using Knowledge Graph)') {
                    workbenchStore.currentView.set('change-impact');
                  } else if (action.label === 'Cycle Detection (Architectural Anomaly)') {
                    workbenchStore.currentView.set('cycle-detection');
                  } else {
                    workbenchStore.currentView.set('quick-actions');
                    quickActionsStore.showKnowledgeGraphView.set(true);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{action.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{action.label}</h3>
                    <p className="text-sm text-gray-400">{action.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center text-gray-400 text-sm">
            💡 Tip: Click on any action to execute it. The Knowledge Graph Construction is currently available and will
            analyze your Java and Python files.
          </div>
        </div>
      </div>
    </div>
  );
}
