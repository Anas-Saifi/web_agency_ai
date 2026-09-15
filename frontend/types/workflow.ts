export type WorkflowStageId = 'requirements' | 'postgresql' | 'proposal' | 'negotiation' | 'hubspot' | 'calendar';
export type WorkflowStageStatus = 'pending' | 'running' | 'completed' | 'failed';
export interface WorkflowStage {
  id: WorkflowStageId;
  label: string;
  description: string;
  icon: string;
  status: WorkflowStageStatus;
  completedAt?: string;
  startedAt?: string;
}
export interface WorkflowState { stages: WorkflowStage[]; currentStageId: WorkflowStageId | null; }
