'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import type { AgentEvent } from '@/types/agent';

interface ProposalCardProps {
  event: AgentEvent;
  onViewProposal?: () => void;
}

export function ProposalCard({ event, onViewProposal }: ProposalCardProps) {
  const proposal = event.data?.proposal as string | undefined;
  const isRunning = event.status === 'running';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-indigo-500/20 bg-slate-900/90 overflow-hidden shadow-lg shadow-indigo-950/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-500/10 bg-indigo-500/[0.08]">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Commercial Proposal
            </p>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Agency Quote
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Formal project scope & pricing</p>
        </div>
        <div>
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      </div>

      {/* Proposal content preview */}
      {proposal && (
        <div className="px-4 py-3 space-y-3">
          <div className="agent-markdown text-xs max-h-48 overflow-hidden relative bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {proposal}
            </ReactMarkdown>
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
          </div>

          {onViewProposal && (
            <button
              onClick={onViewProposal}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>Inspect Full Proposal Document</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {!proposal && isRunning && (
        <div className="px-4 py-6 flex items-center justify-center gap-2 text-indigo-300/60 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          Formulating proposal based on agency rates...
        </div>
      )}
    </motion.div>
  );
}
