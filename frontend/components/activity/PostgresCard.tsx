'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, Database, Table } from 'lucide-react';
import type { AgentEvent } from '@/types/agent';
import type { UserInfo } from '@/types/api';
import { cn } from '@/lib/utils';

interface PostgresCardProps {
  event: AgentEvent;
}

export function PostgresCard({ event }: PostgresCardProps) {
  const userInfo = event.data?.user_info as UserInfo | undefined;
  const isRunning = event.status === 'running';
  const isError = event.status === 'error';
  const isSuccess = event.status === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border border-sky-500/20 bg-slate-900/90 overflow-hidden shadow-lg shadow-sky-950/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-sky-500/10 bg-sky-500/[0.08]">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <Database className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              Database
            </p>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30">
              MCP
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Lead Database Ingestion</p>
        </div>
        <div>
          {isRunning && <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />}
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isError && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
              INSERT
            </span>
            <span className="text-xs text-slate-300 font-mono">
              public.client_information
            </span>
          </div>
          {isSuccess && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Committed
            </span>
          )}
        </div>

        {userInfo && (
          <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-xs">
            {userInfo.name && (
              <div>
                <span className="text-slate-500 block text-[10px]">Client</span>
                <span className="text-slate-200 font-medium truncate block">
                  {userInfo.name}
                </span>
              </div>
            )}
            {userInfo.company && (
              <div>
                <span className="text-slate-500 block text-[10px]">Company</span>
                <span className="text-slate-200 font-medium truncate block">
                  {userInfo.company}
                </span>
              </div>
            )}
            {userInfo.email && (
              <div>
                <span className="text-slate-500 block text-[10px]">Email</span>
                <span className="text-slate-200 font-medium truncate block">
                  {userInfo.email}
                </span>
              </div>
            )}
            {userInfo.budget != null && (
              <div>
                <span className="text-slate-500 block text-[10px]">Budget</span>
                <span className="text-emerald-400 font-medium block">
                  ${userInfo.budget.toLocaleString()}
                </span>
              </div>
            )}
            {userInfo.type_of_website && (
              <div className="col-span-2 pt-1 border-t border-slate-800/60">
                <span className="text-slate-500 block text-[10px]">Scope</span>
                <span className="text-slate-300 truncate block">
                  {userInfo.type_of_website}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status footer */}
        <div
          className={cn('text-xs flex items-center gap-1.5 pt-1 border-t border-slate-800/60', {
            'text-emerald-400': isSuccess,
            'text-sky-300': isRunning,
            'text-red-400': isError,
          })}
        >
          {isRunning && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Writing record to Database
            </>
          )}
          {isSuccess && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Client record stored in Database
            </>
          )}
          {isError && (
            <>
              <XCircle className="w-3 h-3 text-red-400" /> Database transaction failed
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
