import type { WorkflowStage, WorkflowStageId, WorkflowStageStatus } from '@/types/workflow';

// Maps exact LangGraph node names to workflow stage IDs
export const NODE_TO_STAGE: Record<string, WorkflowStageId> = {
  input: 'requirements',
  ask_node: 'requirements',
  injection_node: 'postgresql',
  tool: 'postgresql',
  after_tool: 'postgresql',
  propose: 'proposal',
  negotiation_node: 'negotiation',
  finalisation_node: 'negotiation',
  crm_injection_node: 'hubspot',
  hubspot_tool_node: 'hubspot',
  after_hubspot: 'hubspot',
  create_google_event: 'calendar',
  calendar_tools: 'calendar',
  after_calendar_tool_node: 'calendar',
  client_teller: 'calendar',
};

// Display metadata for each stage
export const STAGE_META: Record<
  WorkflowStageId,
  { label: string; description: string; icon: string }
> = {
  requirements: {
    label: 'Requirements',
    description: 'Collecting client requirements',
    icon: 'ClipboardList',
  },
  postgresql: {
    label: 'PostgreSQL',
    description: 'Storing client data',
    icon: 'Database',
  },
  proposal: {
    label: 'Proposal',
    description: 'Generating commercial proposal',
    icon: 'FileText',
  },
  negotiation: {
    label: 'Negotiation',
    description: 'Negotiating deal terms',
    icon: 'Handshake',
  },
  hubspot: {
    label: 'HubSpot CRM',
    description: 'Syncing CRM records',
    icon: 'Building2',
  },
  calendar: {
    label: 'Google Calendar',
    description: 'Scheduling discovery call',
    icon: 'Calendar',
  },
};

// Ordered list of stages
export const STAGE_ORDER: WorkflowStageId[] = [
  'requirements',
  'postgresql',
  'proposal',
  'negotiation',
  'hubspot',
  'calendar',
];

export function buildInitialStages(): WorkflowStage[] {
  return STAGE_ORDER.map((id) => ({
    id,
    label: STAGE_META[id].label,
    description: STAGE_META[id].description,
    icon: STAGE_META[id].icon,
    status: 'pending' as WorkflowStageStatus,
  }));
}

export function getStageForNode(nodeName: string): WorkflowStageId | undefined {
  return NODE_TO_STAGE[nodeName];
}

export function getStageIndex(stageId: WorkflowStageId): number {
  return STAGE_ORDER.indexOf(stageId);
}
