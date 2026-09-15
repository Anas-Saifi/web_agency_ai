import type { AgentEvent, AgentEventType } from '@/types/agent';
import type { AgentStateSummary, SSENodeUpdateData } from '@/types/api';
import { getStageForNode } from '@/lib/workflow';

let eventCounter = 0;

export function makeEventId(prefix = 'evt'): string {
  return `${prefix}-${++eventCounter}-${Date.now()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const NODE_STAGE_TYPE: Record<string, AgentEventType> = {
  injection_node: 'postgresql',
  tool: 'postgresql',
  after_tool: 'postgresql',
  propose: 'proposal',
  crm_injection_node: 'hubspot',
  hubspot_tool_node: 'hubspot',
  after_hubspot: 'hubspot',
  create_google_event: 'calendar',
  calendar_tools: 'calendar',
  after_calendar_tool_node: 'calendar',
  client_teller: 'calendar',
  negotiation_node: 'node_started',
  finalisation_node: 'node_completed',
};

const STAGE_LABELS: Record<string, string> = {
  input: 'Processing user input',
  ask_node: 'Gathering project requirements',
  injection_node: 'Connecting to PostgreSQL database',
  tool: 'Executing database write (public.client_information)',
  after_tool: 'Client requirements stored in PostgreSQL',
  propose: 'Formulating commercial proposal',
  negotiation_node: 'Analyzing terms & negotiating quote',
  finalisation_node: 'Finalising commercial agreement',
  crm_injection_node: 'Preparing HubSpot CRM contact & deal payload',
  hubspot_tool_node: 'Executing HubSpot CRM synchronization',
  after_hubspot: 'HubSpot CRM contact & deal synchronized',
  create_google_event: 'Preparing Google Calendar discovery meeting',
  calendar_tools: 'Booking meeting on Google Calendar',
  after_calendar_tool_node: 'Discovery call successfully scheduled',
  client_teller: 'Notifying client of meeting details',
};

export function normalizeNodeUpdate(data: SSENodeUpdateData): AgentEvent {
  const stageId = getStageForNode(data.node);
  const type: AgentEventType = NODE_STAGE_TYPE[data.node] ?? 'node_started';
  const title = STAGE_LABELS[data.node] ?? `Executing: ${data.node}`;

  return {
    id: makeEventId(stageId || data.node),
    timestamp: nowIso(),
    type,
    node: data.node,
    status: 'running',
    title,
    description: `Active node: ${data.node}`,
    stageId,
    data: { node: data.node, has_messages: data.has_messages },
  };
}

/**
 * Generates completed events from agent state transitions.
 */
export function normalizeStateChange(
  prevState: AgentStateSummary | null,
  newState: AgentStateSummary
): AgentEvent[] {
  const events: AgentEvent[] = [];

  // PostgreSQL record insertion
  if ((!prevState?.submitted && newState.submitted) || (!prevState && newState.submitted)) {
    events.push({
      id: makeEventId('pg'),
      timestamp: nowIso(),
      type: 'postgresql',
      status: 'success',
      title: 'PostgreSQL — Client Data Recorded',
      description: newState.user_info
        ? `${newState.user_info.name ?? 'Client'} (${newState.user_info.company ?? 'Agency Lead'}) recorded to public.client_information`
        : 'Client information recorded to database',
      stageId: 'postgresql',
      data: { user_info: newState.user_info as unknown as Record<string, unknown> },
    });
  }

  // Commercial Proposal generated
  if ((!prevState?.proposal && newState.proposal) || (!prevState && newState.proposal)) {
    events.push({
      id: makeEventId('prop'),
      timestamp: nowIso(),
      type: 'proposal',
      status: 'success',
      title: 'Commercial Proposal Formulated',
      description: 'Custom agency scope and commercial proposal drafted',
      stageId: 'proposal',
      data: { proposal: newState.proposal },
    });
  }

  // Deal accepted / finalised
  if (
    (!prevState?.deal_finalised && newState.deal_finalised) ||
    (!prevState && newState.deal_finalised)
  ) {
    events.push({
      id: makeEventId('deal'),
      timestamp: nowIso(),
      type: 'node_completed',
      status: 'success',
      title: 'Agreement Finalised',
      description: 'Client accepted proposal terms. Unlocking CRM & Calendar sync.',
      stageId: 'negotiation',
    });
  }

  // HubSpot CRM
  if ((!prevState && newState.event_created) || (!prevState && newState.deal_finalised)) {
    events.push({
      id: makeEventId('hs'),
      timestamp: nowIso(),
      type: 'hubspot',
      status: 'success',
      title: 'HubSpot CRM — Contact & Deal Synced',
      description: 'Contact record and deal stage synchronized via MCP',
      stageId: 'hubspot',
      data: {
        negotiation_info: newState.negotiation_info as unknown as Record<string, unknown>,
      },
    });
  }

  // Google Calendar Meeting Scheduled
  if (
    (!prevState?.event_created && newState.event_created) ||
    (!prevState && newState.event_created)
  ) {
    events.push({
      id: makeEventId('cal'),
      timestamp: nowIso(),
      type: 'calendar',
      status: 'success',
      title: 'Google Calendar — Discovery Call Scheduled',
      description: 'Discovery meeting booked on Google Calendar via MCP',
      stageId: 'calendar',
    });

    events.push({
      id: makeEventId('done'),
      timestamp: nowIso(),
      type: 'workflow_completed',
      status: 'success',
      title: 'Sales Workflow Complete',
      description: 'All agency onboarding steps completed successfully',
    });
  }

  return events;
}

export interface ParsedSSEEvent {
  event: string;
  data: unknown;
}

/** Parse an SSE block. Supports CRLF, LF, and multiple data lines. */
export function parseSSEChunk(chunk: string): ParsedSSEEvent[] {
  const events: ParsedSSEEvent[] = [];
  const blocks = chunk.split(/\r?\n\r?\n/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.split(/\r?\n/);
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    const dataStr = dataLines.join('\n');
    if (!dataStr) continue;

    try {
      events.push({ event: eventName, data: JSON.parse(dataStr) });
    } catch {
      events.push({ event: eventName, data: { raw: dataStr } });
    }
  }

  return events;
}
