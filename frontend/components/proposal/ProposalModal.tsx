'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  Copy,
  Check,
  Building2,
  DollarSign,
  User,
  Globe,
  Sparkles,
  ArrowRight,
  Handshake,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import type { AgentStateSummary } from '@/types/api';
import { cn } from '@/lib/utils';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AgentStateSummary | null;
  onAcceptProposal?: () => void;
  isStreaming?: boolean;
}

export function ProposalModal({
  isOpen,
  onClose,
  state,
  onAcceptProposal,
  isStreaming = false,
}: ProposalModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const proposal = state?.proposal;
  const userInfo = state?.user_info;
  const isFinalised = state?.deal_finalised;
  const negotiation = state?.negotiation_info;

  const handleCopy = async () => {
    if (!proposal) return;
    try {
      await navigator.clipboard.writeText(proposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/75 backdrop-blur-md">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/50 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100">
                    Commercial Proposal
                  </h2>
                  {isFinalised ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Deal Accepted
                    </span>
                  ) : negotiation?.deal_closed === false ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      Closed Lost
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      Proposal Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Custom agency quote formulated according to agency pricing guidelines
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!proposal}
                title="Copy proposal markdown"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Client & Project Specs Summary */}
          {userInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-500">Client:</span>
                <span className="text-slate-200 font-medium truncate">
                  {userInfo.name || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-500">Company:</span>
                <span className="text-slate-200 font-medium truncate">
                  {userInfo.company || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-500">Website:</span>
                <span className="text-slate-200 font-medium truncate">
                  {userInfo.type_of_website || 'Custom Web'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-500">Budget:</span>
                <span className="text-emerald-400 font-medium">
                  {userInfo.budget ? `$${userInfo.budget.toLocaleString()}` : 'Negotiable'}
                </span>
              </div>
            </div>
          )}

          {/* Document Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
            {proposal ? (
              <div className="agent-markdown bg-slate-950/60 p-6 rounded-xl border border-slate-800 text-slate-200 font-sans leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {proposal}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <Sparkles className="w-8 h-8 text-indigo-400 mb-3 animate-pulse" />
                <p className="text-sm font-medium text-slate-300">
                  Proposal has not been generated yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Once requirements (budget, scope, company details) are qualified by the agent,
                  the commercial proposal will appear here automatically.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Handshake className="w-4 h-4 text-indigo-400" />
              <span>
                {isFinalised
                  ? 'Agreement confirmed. HubSpot CRM & Calendar sync unlocked.'
                  : 'Counter-offers and discount inquiries up to 10% can be negotiated.'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
              </button>

              {proposal && !isFinalised && onAcceptProposal && (
                <button
                  onClick={() => {
                    onAcceptProposal();
                    onClose();
                  }}
                  disabled={isStreaming}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <span>Accept Proposal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
