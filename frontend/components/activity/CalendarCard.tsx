'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, Calendar, Video, Clock } from 'lucide-react';
import type { AgentEvent } from '@/types/agent';
import { cn } from '@/lib/utils';

interface CalendarCardProps {
  event: AgentEvent;
}

export function CalendarCard({ event }: CalendarCardProps) {
  const isRunning = event.status === 'running';
  const isError = event.status === 'error';
  const isSuccess = event.status === 'success';
  const description = event.description ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border border-violet-500/20 bg-slate-900/90 overflow-hidden shadow-lg shadow-violet-950/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/10 bg-violet-500/[0.08]">
        <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Calendar className="w-3.5 h-3.5 text-violet-300" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
              Google Calendar
            </p>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
              MCP
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Discovery call scheduling</p>
        </div>
        <div>
          {isRunning && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isError && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">
              MEETING EVENT
            </p>
            <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-violet-400" />
              Agency Client Discovery Session
            </p>
          </div>
          {isSuccess && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Confirmed
            </span>
          )}
        </div>

        <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Operation</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {isRunning ? 'create_google_event' : 'event.insert'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status</span>
            <span
              className={cn('font-medium', {
                'text-emerald-400': isSuccess,
                'text-violet-300': isRunning,
                'text-red-400': isError,
              })}
            >
              {isRunning ? 'Booking calendar slot...' : isSuccess ? 'Meeting Booked ✓' : 'Failed'}
            </span>
          </div>
        </div>

        {description && (
          <p className="text-xs text-slate-400 bg-violet-500/[0.04] rounded-lg px-3 py-2 border border-violet-500/10">
            {description}
          </p>
        )}

        {/* Status footer */}
        <div
          className={cn('text-xs flex items-center gap-1.5 pt-1 border-t border-slate-800/60', {
            'text-emerald-400': isSuccess,
            'text-violet-300': isRunning,
            'text-red-400': isError,
          })}
        >
          {isRunning && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Communicating with Google Calendar MCP...
            </>
          )}
          {isSuccess && (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Discovery call successfully scheduled
            </>
          )}
          {isError && (
            <>
              <XCircle className="w-3 h-3 text-red-400" /> Meeting booking failed
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
