'use client';

import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Cpu } from 'lucide-react';
import type { AgentEvent } from '@/types/agent';

interface GenericToolCardProps {
  event: AgentEvent;
}

const NODE_LABELS: Record<string, string> = {
  input: 'Input Processing',
  ask_node: 'Requirement Collection',
  negotiation_node: 'Negotiation Engine',
  finalisation_node: 'Deal Finalisation',
  after_tool: 'Tool Result Processing',
  after_hubspot: 'CRM Sync Complete',
  after_calendar_tool_node: 'Calendar Sync Complete',
  client_teller: 'Client Notification',
};

export function GenericToolCard({ event }: GenericToolCardProps) {
  const isRunning = event.status === 'running';
  const isError = event.status === 'error';
  const isSuccess = event.status === 'success';
  const nodeLabel = event.node ? (NODE_LABELS[event.node] ?? event.node) : 'Agent Node';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border border-white/[0.07] bg-white/[0.03] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
          <Cpu className="w-3.5 h-3.5 text-white/40" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/60 truncate">
            {event.title || nodeLabel}
          </p>
          {event.description && (
            <p className="text-[11px] text-white/30 truncate mt-0.5">{event.description}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          {isRunning && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
          {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {isError && <XCircle className="w-3.5 h-3.5 text-red-400" />}
        </div>
      </div>
    </motion.div>
  );
}
