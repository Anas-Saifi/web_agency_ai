'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ComponentType } from 'react';
import type { WorkflowStage } from '@/types/workflow';
import {
  Check,
  Loader2,
  X,
  ClipboardList,
  Database,
  FileText,
  Handshake,
  Building2,
  Calendar,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowNodeProps {
  stage: WorkflowStage;
  isLast: boolean;
  index: number;
  onClick?: () => void;
  isSelected?: boolean;
}

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  ClipboardList,
  Database,
  FileText,
  Handshake,
  Building2,
  Calendar,
};

export function WorkflowNode({
  stage,
  isLast,
  index,
  onClick,
  isSelected = false,
}: WorkflowNodeProps) {
  const Icon = ICONS[stage.icon] ?? Circle;

  const statusConfig = {
    pending: {
      ring: 'border-white/10 bg-white/5 group-hover:border-white/20',
      icon: <Icon className="w-4 h-4 text-white/30 group-hover:text-white/50" />,
      label: 'text-white/30 group-hover:text-white/50',
      connector: 'bg-white/10',
    },
    running: {
      ring: 'border-indigo-500/60 bg-indigo-500/10 group-hover:border-indigo-400',
      icon: <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />,
      label: 'text-indigo-300 group-hover:text-indigo-200',
      connector: 'bg-indigo-500/30',
    },
    completed: {
      ring: 'border-emerald-500/60 bg-emerald-500/10 group-hover:border-emerald-400',
      icon: <Check className="w-4 h-4 text-emerald-400" />,
      label: 'text-emerald-400 group-hover:text-emerald-300',
      connector: 'bg-emerald-500/40',
    },
    failed: {
      ring: 'border-red-500/60 bg-red-500/10 group-hover:border-red-400',
      icon: <X className="w-4 h-4 text-red-400" />,
      label: 'text-red-400',
      connector: 'bg-red-500/30',
    },
  };

  const cfg = statusConfig[stage.status];

  return (
    <div className="flex items-center flex-1 last:flex-initial">
      <button
        type="button"
        onClick={onClick}
        className="group flex flex-col items-center focus:outline-none transition-transform active:scale-95 cursor-pointer text-left"
        title={`Click to view ${stage.label} details`}
      >
        {/* Circle indicator */}
        <motion.div
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300',
            cfg.ring,
            isSelected && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 scale-105'
          )}
          animate={
            stage.status === 'running'
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(99,102,241,0)',
                    '0 0 0 8px rgba(99,102,241,0.18)',
                    '0 0 0 0 rgba(99,102,241,0)',
                  ],
                }
              : {}
          }
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.status}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {cfg.icon}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Label below the circle */}
        <div className="mt-1.5 text-center w-20">
          <span className={cn('text-xs font-medium leading-tight block truncate', cfg.label)}>
            {stage.label}
          </span>
        </div>
      </button>

      {/* Connector line */}
      {!isLast && (
        <motion.div
          className={cn(
            'h-0.5 flex-1 mx-2 mb-5 rounded-full transition-all duration-700',
            cfg.connector
          )}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: stage.status === 'completed' ? 1 : 0.4 }}
          transition={{ duration: 0.5, delay: 0.08 * index }}
        />
      )}
    </div>
  );
}
