/**
 * AI Agent Panel Component
 * 
 * A simple UI panel to interact with MindVex AI agents powered by IBM watsonx Orchestrate.
 * Can be used standalone or integrated into the dashboard.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { watsonxApi } from '~/lib/services/watsonxApiService';
import type { WatsonxChatResponse, FileContext } from '~/types/watsonx';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    agentName?: string;
    timestamp: Date;
    toolCalls?: Array<{
        toolName: string;
        result?: string;
    }>;
}

interface AIAgentPanelProps {
    /** Optional file context to include with messages */
    fileContext?: FileContext[];
    /** Optional callback when agent response is received */
    onResponse?: (response: WatsonxChatResponse) => void;
    /** Optional custom title */
    title?: string;
}

const AGENTS = [
    { id: 'codebase-analysis', name: 'Codebase Analyzer', icon: '🔍', description: 'Analyze code for bugs and improvements' },
    { id: 'code-qa', name: 'Code Q&A', icon: '❓', description: 'Ask questions about your code' },
    { id: 'code-modifier', name: 'Code Modifier', icon: '✏️', description: 'Modify code based on instructions' },
    { id: 'code-review', name: 'Code Reviewer', icon: '📝', description: 'Review code for issues' },
    { id: 'documentation', name: 'Doc Generator', icon: '📚', description: 'Generate documentation' },
    { id: 'dependency-graph', name: 'Dependency Mapper', icon: '🔗', description: 'Analyze dependencies' },
    { id: 'git-assistant', name: 'Git Assistant', icon: '🚀', description: 'Help with Git operations' },
];

export function AIAgentPanel({ fileContext, onResponse, title }: AIAgentPanelProps) {
    const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Call the appropriate AI endpoint based on selected agent
            let response: WatsonxChatResponse;

            switch (selectedAgent.id) {
                case 'codebase-analysis':
                    response = await watsonxApi.analyzeCodebase(userMessage.content, fileContext);
                    break;
                case 'code-qa':
                    response = await watsonxApi.askQuestion(userMessage.content, fileContext);
                    break;
                case 'code-modifier':
                    response = await watsonxApi.modifyCode(userMessage.content, fileContext);
                    break;
                case 'code-review':
                    response = await watsonxApi.reviewCode(userMessage.content, fileContext);
                    break;
                case 'documentation':
                    response = await watsonxApi.generateDocumentation(userMessage.content, fileContext);
                    break;
                case 'dependency-graph':
                    response = await watsonxApi.analyzeDependencies(userMessage.content, fileContext);
                    break;
                case 'git-assistant':
                    response = await watsonxApi.getGitHelp(userMessage.content);
                    break;
                default:
                    response = await watsonxApi.chat({
                        agentId: selectedAgent.id,
                        message: userMessage.content,
                        files: fileContext
                    });
            }

            if (response.success) {
                const assistantMessage: Message = {
                    id: response.id || crypto.randomUUID(),
                    role: 'assistant',
                    content: response.response,
                    agentName: selectedAgent.name,
                    timestamp: new Date(),
                    toolCalls: response.toolCalls?.map(tc => ({
                        toolName: tc.toolName,
                        result: tc.result,
                    })),
                };
                setMessages(prev => [...prev, assistantMessage]);
                onResponse?.(response);
            } else {
                setError(response.errorMessage || 'Unknown error occurred');
            }
        } catch (err) {
            console.error('AI Agent error:', err);
            setError(err instanceof Error ? err.message : 'Failed to get response from agent');
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, selectedAgent, fileContext, onResponse]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
    };

    return (
        <div className="flex flex-col h-full bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
                <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
                    {title || '🤖 AI Agent Panel'}
                </h3>
                <button
                    onClick={clearChat}
                    className="text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
                >
                    Clear
                </button>
            </div>

            {/* Agent Selector */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
                {AGENTS.map((agent) => (
                    <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${selectedAgent.id === agent.id
                                ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                                : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4'
                            }`}
                        title={agent.description}
                    >
                        <span>{agent.icon}</span>
                        <span>{agent.name}</span>
                    </button>
                ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-bolt-elements-textSecondary py-8">
                        <p className="text-2xl mb-2">{selectedAgent.icon}</p>
                        <p className="font-medium">{selectedAgent.name}</p>
                        <p className="text-sm mt-1">{selectedAgent.description}</p>
                        <p className="text-xs mt-4 opacity-70">Type a message to get started</p>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === 'user'
                                    ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                                    : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary'
                                }`}
                        >
                            {message.role === 'assistant' && message.agentName && (
                                <div className="text-xs text-bolt-elements-textSecondary mb-1 font-medium">
                                    {message.agentName}
                                </div>
                            )}
                            <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                            {/* Tool Calls */}
                            {message.toolCalls && message.toolCalls.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-bolt-elements-borderColor">
                                    <div className="text-xs text-bolt-elements-textSecondary mb-1">Tools used:</div>
                                    {message.toolCalls.map((tc, idx) => (
                                        <div key={idx} className="text-xs bg-bolt-elements-background-depth-4 rounded px-2 py-1 mt-1">
                                            🔧 {tc.toolName}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="text-xs text-bolt-elements-textTertiary mt-2">
                                {message.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-bolt-elements-background-depth-3 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-2 text-bolt-elements-textSecondary">
                                <div className="animate-spin w-4 h-4 border-2 border-bolt-elements-borderColor border-t-bolt-elements-button-primary-background rounded-full" />
                                <span className="text-sm">{selectedAgent.name} is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                        <div className="text-red-400 text-sm">⚠️ {error}</div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask ${selectedAgent.name}...`}
                        className="flex-1 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg px-4 py-3 text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary resize-none focus:outline-none focus:ring-2 focus:ring-bolt-elements-button-primary-background"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-3 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                        {isLoading ? '...' : 'Send'}
                    </button>
                </div>

                {fileContext && fileContext.length > 0 && (
                    <div className="mt-2 text-xs text-bolt-elements-textSecondary">
                        📎 {fileContext.length} file(s) attached as context
                    </div>
                )}
            </div>
        </div>
    );
}

export default AIAgentPanel;
