/**
 * AI Agent Testing Route
 * 
 * Access this at /ai-agents to test the watsonx Orchestrate integration.
 */

import { ClientOnly } from 'remix-utils/client-only';
import { AIAgentPanel } from '~/components/ai/AIAgentPanel';
import { Header } from '~/components/header/Header';

export default function AIAgentsPage() {
    return (
        <div className="flex flex-col h-screen bg-bolt-elements-background-depth-1">
            <Header />

            <main className="flex-1 overflow-hidden p-6">
                <div className="max-w-4xl mx-auto h-full">
                    <ClientOnly fallback={
                        <div className="flex items-center justify-center h-full">
                            <div className="text-bolt-elements-textSecondary">Loading AI Agents...</div>
                        </div>
                    }>
                        {() => <AIAgentPanel title="🤖 MindVex AI Agents (watsonx Orchestrate)" />}
                    </ClientOnly>
                </div>
            </main>
        </div>
    );
}
