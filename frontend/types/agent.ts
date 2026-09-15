import type { AgentStateSummary } from './api';
import type { WorkflowStageId } from './workflow';

// Normalized event type — adapter layer between raw SSE and React state
export type AgentEventType =
  | 'node_started'
  | 'node_completed'
  | 'tool_started'
  | 'tool_completed'
  | 'message'
  | 'proposal'
  | 'postgresql'
  | 'hubspot'
  | 'calendar'
  | 'error'
  | 'workflow_completed'
  | 'stream_started'
  | 'stream_ended';

export type AgentEventStatus = 'running' | 'success' | 'error';

export interface AgentEvent {
  id: string;
  timestamp: string;
  type: AgentEventType;
  node?: string;
  tool?: string;
  status?: AgentEventStatus;
  title: string;
  description?: string;
  stageId?: WorkflowStageId;
  data?: Record<string, unknown>;
}

// Chat message in the UI
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// Connection status for header indicator
export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'reconnecting'
  | 'streaming'
  | 'error';

// Overall app state shape
export interface AppState {
  threadId: string | null;
  messages: ChatMessage[];
  events: AgentEvent[];
  agentState: AgentStateSummary | null;
  isStreaming: boolean;
  connectionStatus: ConnectionStatus;
  activeNodes: Set<string>;
  error: string | null;
}
