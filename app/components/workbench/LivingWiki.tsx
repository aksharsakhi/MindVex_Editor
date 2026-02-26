/**
 * LivingWiki.tsx
 *
 * Enhanced Living Wiki tool with unified parser support
 * and parser-only vs LLM-enhanced modes.
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { mcpGetWiki, mcpDescribeModule } from '~/lib/mcp/mcpClient';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';
import { 
  getUnifiedParser, 
  parseModeStore, 
  ParseModeSelector, 
  ParseModeStatus,
  type LLMAnalysis 
} from '~/lib/unifiedParser';
import { Button } from '~/components/ui/Button';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { Brain, Zap, Info, RefreshCw, Download, Book, FileText, Package, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';

export function LivingWiki() {
  const [wikiContent, setWikiContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [moduleInput, setModuleInput] = useState('');
  const [moduleDesc, setModuleDesc] = useState<string | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  
  const parseMode = useStore(parseModeStore);
  const [enhancedWikiData, setEnhancedWikiData] = useState<LLMAnalysis | null>(null);

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
    setEnhancedWikiData(null);

    try {
      // Primary wiki generation via MCP
      const res = await mcpGetWiki(repoUrl);
      setWikiContent(res.content);
      
      // If in LLM mode, perform additional deep analysis
      if (parseMode.type === 'llm-enhanced') {
        try {
          const unifiedParser = await getUnifiedParser();
          // Analyze a representative file or project structure
          const analysis = await unifiedParser.parseCode(res.content, 'markdown');
          setEnhancedWikiData(analysis.llmAnalysis || null);
          toast.success('Enhanced wiki documentation generated');
        } catch (e) {
          console.warn('Enhanced wiki analysis failed', e);
        }
      }
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

  const renderMarkdown = (md: string) => {
    return md.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-lg font-semibold text-emerald-400 mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      }

      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-xl font-bold text-white mt-6 mb-3 flex items-center gap-2">
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
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
        const parts = line.slice(2).split('`');
        return (
          <div key={i} className="flex items-start gap-2 ml-4 text-gray-300 text-sm mb-1">
            <span className="text-gray-600 mt-1">•</span>
            <span>
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <code key={j} className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400 text-xs font-mono border border-white/5">
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

      if (line.startsWith('```')) return null;

      if (line.startsWith('**')) {
        return (
          <p key={i} className="text-gray-200 text-sm font-semibold mt-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }

      if (line.trim() === '') return <div key={i} className="h-2" />;

      return (
        <p key={i} className="text-gray-400 text-sm leading-relaxed mb-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-6 pb-4 flex-shrink-0 bg-[#0d0d0d] border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
              <Book className="h-8 w-8 text-emerald-500" /> Living Wiki
            </h1>
            <ParseModeStatus />
          </div>
          <div className="flex items-center gap-3">
            <ParseModeSelector compact />
            <Button
              onClick={handleGenerateWiki}
              disabled={loading || !repoUrl}
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generate Wiki
            </Button>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          AI-generated project documentation, automatically maintained from your code analysis.
        </p>
      </div>

      {/* Tools Section */}
      <div className="px-6 py-4 bg-[#0d0d0d]/50 flex-shrink-0 space-y-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-purple-400" />
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Module Explorer</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={moduleInput}
            onChange={(e) => setModuleInput(e.target.value)}
            placeholder="Enter module name (e.g., auth, services, ui)"
            className="flex-1 bg-[#151515] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
          <Button
            onClick={handleDescribeModule}
            disabled={moduleLoading || !moduleInput}
            variant="outline"
            size="sm"
            className="border-purple-500/30 text-purple-400 rounded-xl"
          >
            {moduleLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Describe Module'}
          </Button>
        </div>
        
        {moduleDesc && (
          <Card className="p-4 bg-purple-500/5 border-purple-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                {moduleInput}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setModuleDesc(null)} className="h-6 w-6 p-0 text-gray-500">×</Button>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{moduleDesc}</div>
          </Card>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Main Wiki Content */}
      <div className="px-6 py-6 flex-1">
        {wikiContent ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="bg-[#111] border-white/5 rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center gap-2 mb-6 text-gray-500">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs uppercase font-bold tracking-widest">Project Overview</span>
                </div>
                {renderMarkdown(wikiContent)}
              </Card>
            </div>
            
            <div className="space-y-6">
              {enhancedWikiData && (
                <Card className="bg-blue-500/5 border-blue-500/10 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4 text-blue-400">
                    <Brain className="h-5 w-5" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">AI Architecture Insights</h3>
                  </div>
                  <p className="text-sm text-gray-300 italic mb-4 leading-relaxed">
                    "{enhancedWikiData.summary}"
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Key Patterns</h4>
                      <div className="flex flex-wrap gap-1">
                        {enhancedWikiData.architecture.patterns.map((p, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-300 text-[10px]">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Recommendations</h4>
                      <ul className="space-y-2">
                        {enhancedWikiData.recommendations.map((r, idx) => (
                          <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                            <Sparkles className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}
              
              <Card className="bg-[#111] border-white/5 p-6 rounded-2xl">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Table of Contents</h3>
                <nav className="space-y-2">
                  {wikiContent.split('\n')
                    .filter(line => line.startsWith('## '))
                    .map((line, idx) => (
                      <div key={idx} className="text-sm text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-700" />
                        {line.slice(3)}
                      </div>
                    ))}
                </nav>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <div className="w-24 h-24 rounded-3xl bg-[#111] border border-white/5 flex items-center justify-center mb-6 shadow-xl">
              <Book className="h-10 w-10 text-emerald-500 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Knowledge Base Empty</h3>
            <p className="text-sm max-w-md text-center text-gray-400 mb-8 leading-relaxed">
              Generate a living wiki to document your codebase automatically. It will analyze your entire project structure, patterns, and relationships.
            </p>
            <Button
              onClick={handleGenerateWiki}
              disabled={loading || !repoUrl}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 py-6 h-auto shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Generating Documentation...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Build Living Wiki
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}