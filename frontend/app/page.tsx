'use client';

import { useEffect, useState } from 'react';
import { useThread } from '@/hooks/useThread';
import { useAgentStream } from '@/hooks/useAgentStream';
import { resetThread as deleteThread } from '@/lib/api';
import { Header, ViewMode } from '@/components/layout/Header';
import { WorkflowProgress } from '@/components/workflow/WorkflowProgress';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { ProposalModal } from '@/components/proposal/ProposalModal';
import { StageDetailModal } from '@/components/workflow/StageDetailModal';
import type { WorkflowStage } from '@/types/workflow';

export default function Home() {
  const { threadId, isLoaded, resetThread } = useThread();
  const {
    messages,
    events,
    agentState,
    isStreaming,
    connectionStatus,
    workflowStages,
    health,
    sendMessage,
    loadSession,
    clearSession,
    error,
  } = useAgentStream();

  const [viewMode, setViewMode] = useState<ViewMode>('client');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);

  useEffect(() => {
    if (isLoaded && threadId) {
      void loadSession(threadId);
    }
  }, [isLoaded, threadId, loadSession]);

  const handleResetThread = async () => {
    if (isStreaming || !threadId) return;
    setResetError(null);

    try {
      await deleteThread(threadId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset thread';
      if (!/API 404\b/.test(message)) {
        setResetError(message);
        return;
      }
    }

    clearSession();
    resetThread();
  };

  const handleSendMessage = (text: string) => {
    if (!threadId || isStreaming) return;
    setResetError(null);
    void sendMessage(text, threadId);
  };

  const handleAcceptProposal = () => {
    handleSendMessage('I accept the commercial proposal. Let us proceed with the project!');
  };

  const handleSelectStage = (stage: WorkflowStage) => {
    if (stage.id === 'proposal' && agentState?.proposal) {
      setIsProposalOpen(true);
      return;
    }
    setSelectedStage(stage);
  };

  const displayError = resetError ?? error;
  const hasProposal = Boolean(agentState?.proposal);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 antialiased overflow-hidden font-sans">
      <Header
        threadId={threadId}
        onResetThread={handleResetThread}
        status={connectionStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resetDisabled={isStreaming || !threadId}
        hasProposal={hasProposal}
        onOpenProposal={() => setIsProposalOpen(true)}
        health={health}
      />

      <div className="px-4 md:px-6 py-3 border-b border-slate-800/80 bg-slate-900/40">
        <WorkflowProgress
          stages={workflowStages}
          onSelectStage={handleSelectStage}
          selectedStageId={selectedStage?.id}
        />
      </div>

      <main className="flex-1 p-4 md:p-6 overflow-hidden min-h-0">
        {viewMode === 'client' && (
          <div className="h-full min-h-0 max-w-4xl mx-auto">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              onSendMessage={handleSendMessage}
              error={displayError}
              agentState={agentState}
              onOpenProposal={() => setIsProposalOpen(true)}
            />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="h-full min-h-0">
              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                onSendMessage={handleSendMessage}
                error={displayError}
                agentState={agentState}
                onOpenProposal={() => setIsProposalOpen(true)}
              />
            </div>
            <div className="h-full min-h-0">
              <ActivityFeed
                events={events}
                currentState={agentState ?? undefined}
                isStreaming={isStreaming}
                onViewProposal={() => setIsProposalOpen(true)}
              />
            </div>
          </div>
        )}

        {viewMode === 'system' && (
          <div className="h-full min-h-0 max-w-5xl mx-auto">
            <ActivityFeed
              events={events}
              currentState={agentState ?? undefined}
              isStreaming={isStreaming}
              onViewProposal={() => setIsProposalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Commercial Proposal Document Modal */}
      <ProposalModal
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
        state={agentState}
        onAcceptProposal={handleAcceptProposal}
        isStreaming={isStreaming}
      />

      {/* Stage Details Inspector Modal */}
      <StageDetailModal
        stage={selectedStage}
        onClose={() => setSelectedStage(null)}
        state={agentState}
        onOpenProposal={() => setIsProposalOpen(true)}
      />
    </div>
  );
}
