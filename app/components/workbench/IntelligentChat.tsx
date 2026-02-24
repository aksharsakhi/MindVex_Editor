import React, { useState, useRef, useEffect } from 'react';
import { mcpChat, mcpGetWiki, mcpDescribeModule, type ChatHistoryItem } from '~/lib/mcp/mcpClient';
import { repositoryHistoryStore } from '~/lib/stores/repositoryHistory';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

/**
 * Intelligent Chat Assistant — Gemini AI powered
 *
 * A conversational AI interface that:
 * - Uses Gemini 2.0 Flash for intelligent code Q&A
 * - Has codebase context from dependency graph + semantic search
 * - Maintains conversation history for multi-turn chats
 * - Falls back to wiki/module tools for specific commands
 */
export function IntelligentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const recent = repositoryHistoryStore.getRecentRepositories(1);

    if (recent.length > 0) {
      setRepoUrl(recent[0].url);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !repoUrl) {
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const query = input.toLowerCase();

      if (query.startsWith('generate wiki') || query === 'wiki') {
        const wiki = await mcpGetWiki(repoUrl);
        setMessages((prev) => [...prev, { role: 'assistant', content: wiki.content }]);
      } else if (query.startsWith('describe module')) {
        const moduleName = input.replace(/describe\s+module\s*/i, '').trim();
        const desc = await mcpDescribeModule(repoUrl, moduleName);
        setMessages((prev) => [...prev, { role: 'assistant', content: desc.description }]);
      } else {
        // AI chat via Gemini — primary mode
        const history: ChatHistoryItem[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await mcpChat(repoUrl, input, history);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.reply,
            model: response.model,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message}. Make sure the repository has been indexed and the backend is running.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/5 flex-shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">✨ MindVex AI Chat</h2>
        <p className="text-xs text-gray-500 mt-1">AI-powered code assistant — powered by Gemini 2.0 Flash</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-5xl mb-4">🧠</div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">Ask anything about your code</h3>
            <div className="grid grid-cols-1 gap-2 max-w-md text-sm">
              {[
                'Explain the project architecture',
                'How does authentication work?',
                'Generate a wiki overview',
                'What are the main dependencies?',
                'Find potential improvements',
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="text-left px-4 py-2 rounded-lg bg-[#111] border border-white/5 hover:border-orange-500/30 hover:bg-[#151515] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-orange-500/15 border border-orange-500/20 text-gray-200'
                  : 'bg-[#111] border border-white/5 text-gray-300'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.model && msg.role === 'assistant' && (
                <div className="mt-2 text-[10px] text-gray-600">⚡ {msg.model}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="w-full text-xs text-gray-600 hover:text-orange-400 mb-2 transition-colors"
          >
            Clear conversation
          </button>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your codebase..."
            rows={1}
            className="flex-1 bg-[#151515] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium text-sm hover:from-orange-600 hover:to-red-600 disabled:opacity-50 transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
