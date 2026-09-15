'use client';

import { WorkflowNode } from './WorkflowNode';
import type { WorkflowStage } from '@/types/workflow';

interface WorkflowProgressProps {
  stages: WorkflowStage[];
  onSelectStage?: (stage: WorkflowStage) => void;
  selectedStageId?: string;
}

export function WorkflowProgress({
  stages,
  onSelectStage,
  selectedStageId,
}: WorkflowProgressProps) {
  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center justify-between">
        {stages.map((stage, i) => (
          <WorkflowNode
            key={stage.id}
            stage={stage}
            isLast={i === stages.length - 1}
            index={i}
            onClick={() => onSelectStage?.(stage)}
            isSelected={selectedStageId === stage.id}
          />
        ))}
      </div>

      {/* Mobile: compact horizontal scroll */}
      <div className="md:hidden overflow-x-auto pb-1">
        <div className="flex items-center min-w-max gap-2">
          {stages.map((stage, i) => (
            <WorkflowNode
              key={stage.id}
              stage={stage}
              isLast={i === stages.length - 1}
              index={i}
              onClick={() => onSelectStage?.(stage)}
              isSelected={selectedStageId === stage.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
