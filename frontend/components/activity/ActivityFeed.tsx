'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, Terminal } from 'lucide-react';
import type { AgentEvent } from '@/types/agent';
import type { AgentStateSummary } from '@/types/api';
import { PostgresCard } from './PostgresCard';
import { HubSpotCard } from './HubSpotCard';
import { CalendarCard } from './CalendarCard';
import { ProposalCard } from './ProposalCard';
import { GenericToolCard } from './GenericToolCard';
import { StatePanel } from './StatePanel';

interface ActivityFeedProps {
  events: AgentEvent[];
  currentState?: AgentStateSummary;
  isStreaming?: boolean;
  onViewProposal?: () => void;
}

export function ActivityFeed({
  events,
  currentState,
  isStreaming,
  onViewProposal,
}: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Live Execution Feed</h3>
            <p className="text-xs text-slate-400">Real-time MCP tools & LangGraph execution steps</p>
          </div>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs text-indigo-400 font-medium">Pipeline Active</span>
          </div>
        )}
      </div>

      {currentState &&
        (currentState.submitted ||
          currentState.proposal ||
          currentState.deal_finalised ||
          currentState.event_created ||
          currentState.user_info) && <StatePanel state={currentState} />}

      {/* Events Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="p-3 rounded-full bg-slate-800/50 mb-3 border border-slate-700/50">
              <Terminal className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-400">No activity logged yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Start chatting with the agent to observe node transitions, database ingestion, CRM syncing, and meeting scheduling in real time.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => {
              if (event.type === 'postgresql') {
                return <PostgresCard key={event.id} event={event} />;
              }

              if (event.type === 'proposal') {
                return (
                  <ProposalCard
                    key={event.id}
                    event={event}
                    onViewProposal={onViewProposal}
                  />
                );
              }

              if (event.type === 'hubspot') {
                return <HubSpotCard key={event.id} event={event} />;
              }

              if (event.type === 'calendar') {
                return <CalendarCard key={event.id} event={event} />;
              }

              return <GenericToolCard key={event.id} event={event} />;
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
