'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, Building2, UserCheck, Briefcase } from 'lucide-react';
import type { AgentEvent } from '@/types/agent';
import type { NegotiationResult } from '@/types/api';
import { cn } from '@/lib/utils';

interface HubSpotCardProps {
  event: AgentEvent;
}

export function HubSpotCard({ event }: HubSpotCardProps) {
  const negotiation = event.data?.negotiation_info as NegotiationResult | undefined;
  const isRunning = event.status === 'running';
  const isError = event.status === 'error';
  const isSuccess = event.status === 'success';

  const dealClosed = negotiation?.deal_closed ?? negotiation?.customer_interested;
  const stageName =
    dealClosed === true ? 'Closed Won' : dealClosed === false ? 'Closed Lost' : 'Qualified Lead';
  const stageColor =
    dealClosed === true
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : dealClosed === false
      ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      : 'text-sky-400 bg-sky-500/10 border-sky-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border border-orange-500/20 bg-slate-900/90 overflow-hidden shadow-lg shadow-orange-950/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-500/10 bg-orange-500/[0.08]">
        <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              HubSpot CRM
            </p>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
              MCP
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Contact & Deal Pipeline Sync</p>
        </div>
        <div>
          {isRunning && <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />}
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isError && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 space-y-3">
        {/* Records */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <UserCheck className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] uppercase tracking-wider">Contact Record</span>
            </div>
            <span
              className={cn(
                'font-medium text-xs',
                isSuccess ? 'text-emerald-400' : isRunning ? 'text-orange-300' : 'text-slate-400'
              )}
            >
              {isSuccess ? '✓ Created / Synced' : isRunning ? 'Syncing...' : 'Pending'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Briefcase className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] uppercase tracking-wider">Deal Stage</span>
            </div>
            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded border inline-block', stageColor)}>
              {stageName}
            </span>
          </div>
        </div>

        {/* Human escalation note */}
        {negotiation?.need_human && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="text-amber-400 font-medium">Escalation Flag</span>
            <span className="text-amber-300 text-[11px]">Human sales team notified</span>
          </div>
        )}

        {/* Status footer */}
        <div
          className={cn('text-xs flex items-center gap-1.5 pt-1 border-t border-slate-800/60', {
            'text-emerald-400': isSuccess,
            'text-orange-300': isRunning,
            'text-red-400': isError,
          })}
        >
          {isRunning && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Synchronizing with HubSpot MCP server...
            </>
          )}
          {isSuccess && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> CRM contact & deal records synchronized
            </>
          )}
          {isError && (
            <>
              <XCircle className="w-3 h-3 text-red-400" /> HubSpot CRM synchronization failed
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
