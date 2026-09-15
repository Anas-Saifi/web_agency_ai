'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Database,
  Building2,
  Calendar,
  Handshake,
  ClipboardList,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import type { WorkflowStage } from '@/types/workflow';
import type { AgentStateSummary } from '@/types/api';
import { cn } from '@/lib/utils';

interface StageDetailModalProps {
  stage: WorkflowStage | null;
  onClose: () => void;
  state: AgentStateSummary | null;
  onOpenProposal?: () => void;
}

export function StageDetailModal({
  stage,
  onClose,
  state,
  onOpenProposal,
}: StageDetailModalProps) {
  if (!stage) return null;

  const info = state?.user_info;
  const negotiation = state?.negotiation_info;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {stage.id === 'requirements' && <ClipboardList className="w-5 h-5" />}
                {stage.id === 'postgresql' && <Database className="w-5 h-5" />}
                {stage.id === 'proposal' && <ClipboardList className="w-5 h-5" />}
                {stage.id === 'negotiation' && <Handshake className="w-5 h-5" />}
                {stage.id === 'hubspot' && <Building2 className="w-5 h-5" />}
                {stage.id === 'calendar' && <Calendar className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{stage.label}</h3>
                <p className="text-xs text-slate-400">{stage.description}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {/* Stage Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <span className="text-slate-400 font-medium">Stage Status</span>
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5',
                  stage.status === 'completed' &&
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                  stage.status === 'running' &&
                  'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
                  stage.status === 'pending' &&
                  'bg-slate-800 text-slate-400 border border-slate-700'
                )}
              >
                {stage.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {stage.status === 'running' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                {stage.status}
              </span>
            </div>

            {/* Stage-specific data */}
            {stage.id === 'requirements' && (
              <div className="space-y-3">
                <p className="text-slate-300 font-medium">Client Lead Information</p>
                {info ? (
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Name</span>
                      <span className="font-medium">{info.name || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Company</span>
                      <span className="font-medium">{info.company || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Email</span>
                      <span className="font-medium">{info.email || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Budget</span>
                      <span className="font-medium text-emerald-400">
                        {info.budget ? `$${info.budget.toLocaleString()}` : 'Not provided'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Website Scope</span>
                      <span className="font-medium">{info.type_of_website || 'General'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No client information collected yet.</p>
                )}
              </div>
            )}

            {stage.id === 'postgresql' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-medium">
                  <Database className="w-4 h-4" />
                  <span>public.client_information</span>
                </div>
                <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Database Engine</span>
                    <span className="font-mono text-slate-200">Database Injection</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Record Status</span>
                    <span
                      className={cn(
                        'font-medium',
                        state?.submitted ? 'text-emerald-400' : 'text-slate-400'
                      )}
                    >
                      {state?.submitted ? '✓ Inserted' : 'Pending qualification'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {stage.id === 'proposal' && (
              <div className="space-y-3">
                <p className="text-slate-300 font-medium">Commercial Proposal</p>
                <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Draft Status</span>
                    <span
                      className={cn(
                        'font-medium',
                        state?.proposal ? 'text-emerald-400' : 'text-slate-400'
                      )}
                    >
                      {state?.proposal ? '✓ Generated' : 'Pending requirements'}
                    </span>
                  </div>
                </div>
                {state?.proposal && onOpenProposal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenProposal();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20 transition-all"
                  >
                    <span>View Official Proposal Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {stage.id === 'negotiation' && (
              <div className="space-y-3">
                <p className="text-slate-300 font-medium">Negotiation Details</p>
                <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deal Finalised</span>
                    <span
                      className={cn(
                        'font-medium',
                        state?.deal_finalised ? 'text-emerald-400' : 'text-slate-400'
                      )}
                    >
                      {state?.deal_finalised ? '✓ Accepted' : 'In Discussion'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Negotiation Rounds</span>
                    <span className="font-mono text-slate-200">
                      {state?.negotiation_attempts || 0}
                    </span>
                  </div>
                  {negotiation?.need_human && (
                    <div className="flex items-center justify-between text-amber-400">
                      <span>Human Escalation</span>
                      <span className="font-semibold">Required</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {stage.id === 'hubspot' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-orange-400 font-medium">
                  <Building2 className="w-4 h-4" />
                  <span>HubSpot CRM Sync (MCP)</span>
                </div>
                <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Contact Record</span>
                    <span className="text-slate-200">
                      {info?.email || (state?.event_created ? 'Synchronized' : 'Pending')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deal Pipeline Stage</span>
                    <span className="text-emerald-400 font-medium">
                      {state?.deal_finalised
                        ? 'Closed Won'
                        : negotiation?.deal_closed === false
                          ? 'Closed Lost'
                          : state?.event_created
                            ? 'Qualified Opportunity'
                            : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {stage.id === 'calendar' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-violet-400 font-medium">
                  <Calendar className="w-4 h-4" />
                  <span>Google Calendar Discovery Call</span>
                </div>
                <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Event Status</span>
                    <span
                      className={cn(
                        'font-medium',
                        state?.event_created ? 'text-emerald-400' : 'text-slate-400'
                      )}
                    >
                      {state?.event_created ? '✓ Scheduled' : 'Pending Deal Finalisation'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Attendee</span>
                    <span className="text-slate-200">
                      {info?.name || info?.email || 'Agency Lead'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
