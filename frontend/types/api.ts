export interface UserInfo {
  name: string | null;
  company: string | null;
  budget: number | null;
  type_of_website: string | null;
  company_about: string | null;
  website_target: string | null;
  integration: string | null;
  features_and_functionalities: string | null;
  price_proposed: number | null;
  deal_closed: boolean | null;
  email: string | null;
}

export interface NegotiationResult {
  deal_closed: boolean | null;
  need_human: boolean | null;
  alternative_proposal_offered: boolean | null;
  alternative_proposal: string | null;
  alternative_proposal_accepted: boolean | null;
  response: string | null;
  customer_interested: boolean;
  proposal_selected: string | null;
}

export interface AgentStateSummary {
  user_info: UserInfo | null;
  proposal: string | null;
  negotiation_info: NegotiationResult | null;
  negotiation_attempts: number;
  submitted: boolean;
  deal_finalised: boolean;
  event_created: boolean;
  customer_interested: boolean | null;
}

export interface ChatRequest { message: string; thread_id?: string; }
export interface ChatResponse { thread_id: string; response: string; state: AgentStateSummary; }
export interface MessageItem { role: 'human' | 'assistant' | 'tool' | string; content: string; }
export interface ThreadHistoryResponse { thread_id: string; messages: MessageItem[]; total_messages: number; }
export interface ThreadStateResponse { thread_id: string; state: AgentStateSummary; }
export interface ResetThreadResponse { thread_id: string; message: string; success: boolean; }
export interface ProposalResponse { thread_id: string; has_proposal: boolean; proposal: string | null; user_info: UserInfo | null; deal_finalised: boolean; }
export interface HealthResponse {
  status: 'healthy' | 'degraded'; version: string; service: string;
  mcp_configured: { postgresql: boolean; hubspot: boolean; google_calendar: boolean };
  model_configured: boolean;
}

export type SSEEventType = 'start' | 'node_update' | 'message' | 'end' | 'error';
export interface SSEStartData { thread_id: string; message: string; }
export interface SSENodeUpdateData { node: string; has_messages: boolean; }
export interface SSEMessageData { thread_id: string; response: string; state: AgentStateSummary; }
export interface SSEEndData { thread_id: string; status: string; }
export interface SSEErrorData { thread_id: string; error: string; }
export type SSEEventData = SSEStartData | SSENodeUpdateData | SSEMessageData | SSEEndData | SSEErrorData;
