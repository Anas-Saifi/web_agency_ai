'use client';

import { UserRound, Flag } from 'lucide-react';
import type { AgentStateSummary } from '@/types/api';
import { cn } from '@/lib/utils';

interface StatePanelProps {
  state: AgentStateSummary;
}

function FlagChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-medium border',
        on
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-slate-800/80 text-slate-500 border-slate-700'
      )}
    >
      {label}
    </span>
  );
}

export function StatePanel({ state }: StatePanelProps) {
  const info = state.user_info;
  const hasInfo = Boolean(
    info &&
      (info.name ||
        info.company ||
        info.email ||
        info.type_of_website ||
        info.budget != null)
  );

  return (
    <div className="mx-4 mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Flag className="w-3.5 h-3.5 text-indigo-400" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Pipeline state
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FlagChip label="Stored" on={state.submitted} />
        <FlagChip label="Proposal" on={Boolean(state.proposal)} />
        <FlagChip label="Deal closed" on={state.deal_finalised} />
        <FlagChip label="Meeting booked" on={state.event_created} />
      </div>

      {hasInfo && info && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <UserRound className="w-3.5 h-3.5 text-sky-400" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Extracted client
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {info.name && (
              <>
                <span className="text-slate-500">Name</span>
                <span className="text-slate-200 truncate">{info.name}</span>
              </>
            )}
            {info.company && (
              <>
                <span className="text-slate-500">Company</span>
                <span className="text-slate-200 truncate">{info.company}</span>
              </>
            )}
            {info.email && (
              <>
                <span className="text-slate-500">Email</span>
                <span className="text-slate-200 truncate">{info.email}</span>
              </>
            )}
            {info.type_of_website && (
              <>
                <span className="text-slate-500">Website</span>
                <span className="text-slate-200 truncate">{info.type_of_website}</span>
              </>
            )}
            {info.budget != null && (
              <>
                <span className="text-slate-500">Budget</span>
                <span className="text-slate-200">${info.budget.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
