import React, { useState, useEffect } from 'react';
import { mcpGetWiki, mcpDescribeModule } from '~/lib/mcp/mcpClient';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';

/**
 * Living Wiki Page
 *
 * Displays AI-generated project documentation that is automatically
 * updated based on the codebase analysis.
 */
export function LivingWiki() {
  const [wikiContent, setWikiContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [moduleInput, setModuleInput] = useState('');
  const [moduleDesc, setModuleDesc] = useState<string | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);

  useEffect(() => {
    const recent = repositoryHistoryStore.getRecentRepositories(1);

    if (recent.length > 0) {
      setRepoUrl(recent[0].url);
    }
  }, []);

  const handleGenerateWiki = async () => {
    if (!repoUrl) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await mcpGetWiki(repoUrl);
      setWikiContent(res.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDescribeModule = async () => {
    if (!repoUrl || !moduleInput) {
      return;
    }

    setModuleLoading(true);

    try {
      const res = await mcpDescribeModule(repoUrl, moduleInput);
      setModuleDesc(res.description);
    } catch (err: any) {
      setModuleDesc(`Error: ${err.message}`);
    } finally {
      setModuleLoading(false);
    }
  };

  // Simple markdown renderer for code blocks and headers
  const renderMarkdown = (md: string) => {
    return md.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-semibold text-orange-400 mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      }

      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold text-white mt-6 mb-3">
            {line.slice(3)}
          </h2>
        );
      }

      if (line.startsWith('# ')) {
        return (
          <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3">
            {line.slice(2)}
          </h1>
        );
      }

      if (line.startsWith('- ')) {
        // Check for inline code backticks
        const parts = line.slice(2).split('`');
        return (
          <div key={i} className="flex items-start gap-2 ml-4 text-gray-300 text-sm mb-1">
            <span className="text-gray-600 mt-1">•</span>
            <span>
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <code key={j} className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-blue-400 text-xs font-mono">
                    {part}
                  </code>
                ) : (
                  <span key={j}>{part}</span>
                ),
              )}
            </span>
          </div>
        );
      }

      if (line.startsWith('```')) {
        return null; // simplified — skip code fence markers
      }

      if (line.startsWith('**')) {
        return (
          <p key={i} className="text-gray-200 text-sm font-semibold mt-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }

      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }

      return (
        <p key={i} className="text-gray-400 text-sm leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-y-auto">
      {/* Header */}
      <div className="p-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            📚 Living Wiki
          </h1>
          <button
            onClick={handleGenerateWiki}
            disabled={loading || !repoUrl}
            className="px-4 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ Generating...' : '🔄 Generate Wiki'}
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          AI-generated project documentation, automatically maintained from your code.
        </p>
      </div>

      {/* Module Description Tool */}
      <div className="px-6 mb-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={moduleInput}
            onChange={(e) => setModuleInput(e.target.value)}
            placeholder="Enter module name to describe (e.g., services, controller)"
            className="flex-1 bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
          />
          <button
            onClick={handleDescribeModule}
            disabled={moduleLoading || !moduleInput}
            className="px-4 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/25 disabled:opacity-50 transition-colors"
          >
            {moduleLoading ? '...' : 'Describe Module'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Module Description Result */}
      {moduleDesc && (
        <div className="mx-6 mb-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl flex-shrink-0">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">📦 Module: {moduleInput}</h3>
          <div className="text-sm text-gray-300 whitespace-pre-wrap">{moduleDesc}</div>
        </div>
      )}

      {/* Wiki Content */}
      <div className="px-6 pb-6 flex-1">
        {wikiContent ? (
          <div className="bg-[#111] border border-white/5 rounded-xl p-6">{renderMarkdown(wikiContent)}</div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Wiki Generated Yet</h3>
            <p className="text-sm max-w-md text-center">
              Click "Generate Wiki" to create an AI-powered overview of your project's architecture, modules, and
              relationships.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
