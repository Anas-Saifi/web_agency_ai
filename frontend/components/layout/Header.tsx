'use client';

import {
  Bot,
  RefreshCw,
  Columns2,
  MessageSquare,
  Terminal,
  FileText,
} from 'lucide-react';
import type { ConnectionStatus } from '@/types/agent';
import type { HealthResponse } from '@/types/api';
import { cn } from '@/lib/utils';

export type ViewMode = 'client' | 'split' | 'system';

interface HeaderProps {
  threadId: string;
  onResetThread: () => void;
  status: ConnectionStatus;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resetDisabled?: boolean;
  hasProposal?: boolean;
  onOpenProposal?: () => void;
  health?: HealthResponse | null;
}

export function Header({
  threadId,
  onResetThread,
  status,
  viewMode,
  onViewModeChange,
  resetDisabled = false,
  hasProposal = false,
  onOpenProposal,
  health,
}: HeaderProps) {
  return (
    <header className="relative flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3.5 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 text-white">
          <Bot className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Web Agency AI
            </h1>
          </div>

          <p className="text-xs text-slate-400">
            Autonomous Discovery, Proposal, Negotiation & CRM Engine
          </p>
        </div>
      </div>

      {/* View Switcher & Proposal Action */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onViewModeChange('client')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
              viewMode === 'client'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Client View
          </button>

          <button
            onClick={() => onViewModeChange('split')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Columns2 className="w-3.5 h-3.5" />
            Split View
          </button>

          <button
            onClick={() => onViewModeChange('system')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
              viewMode === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            System View
          </button>
        </div>

        {/* Highlighted Proposal Button when available */}
        {hasProposal && onOpenProposal && (
          <button
            onClick={onOpenProposal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer animate-pulse"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Proposal</span>
          </button>
        )}
      </div>

      {/* Thread ID & Reset */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <span className="text-xs text-slate-500 font-mono">
            ID:{' '}
            <span className="text-slate-300 font-mono">
              {threadId ? `${threadId.substring(0, 8)}...` : '—'}
            </span>
          </span>

          <button
            onClick={onResetThread}
            disabled={resetDisabled}
            title="Start new conversation session"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}