'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import type { ChatMessage } from '@/types/agent';
import type { AgentStateSummary } from '@/types/api';
import { MessageSquare, FileText, ArrowRight } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
  error?: string | null;
  agentState?: AgentStateSummary | null;
  onOpenProposal?: () => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  onSendMessage,
  error,
  agentState,
  onOpenProposal,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasProposal = Boolean(agentState?.proposal);
  const isFinalised = Boolean(agentState?.deal_finalised);

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Proposal Notification Banner if proposal exists */}
      {hasProposal && onOpenProposal && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border-b border-indigo-500/20 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>
              {isFinalised
                ? 'Proposal accepted! Next: Meeting scheduling & CRM sync.'
                : 'Commercial proposal formulated for your project.'}
            </span>
          </div>

          <button
            onClick={onOpenProposal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer"
          >
            <span>{isFinalised ? 'View Agreement' : 'Inspect Proposal'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Messages scroll area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-4 py-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-indigo-400/80" />
              </div>

              <div>
                <h3 className="text-slate-100 font-bold text-lg">
                  Web Agency AI Assistant
                </h3>

                <p className="text-slate-400 text-sm mt-1 max-w-sm">
                  Tell us about your web vision. We qualify requirements,
                  store your spec in database, draft customized proposals,
                  and schedule discovery calls.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))
          )}
        </AnimatePresence>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between"
          >
            <span>⚠ {error}</span>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}