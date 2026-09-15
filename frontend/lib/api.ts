import type {
  ChatRequest,
  ChatResponse,
  ThreadHistoryResponse,
  ThreadStateResponse,
  ProposalResponse,
  ResetThreadResponse,
  HealthResponse,
} from '@/types/api';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(
  /\/$/,
  ''
);

function endpoint(path: string): string {
  return `${API_URL}${path}`;
}

// Generic typed fetch helper
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// POST /api/chat — synchronous chat turn
export async function sendChat(req: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(endpoint('/api/chat'), {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// GET /api/health
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>(endpoint('/api/health'));
}

// GET /api/threads/{id}/state
export async function getThreadState(threadId: string): Promise<ThreadStateResponse> {
  return apiFetch<ThreadStateResponse>(endpoint(`/api/threads/${threadId}/state`));
}

// GET /api/threads/{id}/history
export async function getThreadHistory(threadId: string): Promise<ThreadHistoryResponse> {
  return apiFetch<ThreadHistoryResponse>(endpoint(`/api/threads/${threadId}/history`));
}

// GET /api/threads/{id}/proposal
export async function getThreadProposal(threadId: string): Promise<ProposalResponse> {
  return apiFetch<ProposalResponse>(endpoint(`/api/threads/${threadId}/proposal`));
}

// DELETE /api/threads/{id}
export async function resetThread(threadId: string): Promise<ResetThreadResponse> {
  return apiFetch<ResetThreadResponse>(endpoint(`/api/threads/${threadId}`), {
    method: 'DELETE',
  });
}

// Returns the full streaming endpoint URL (used by useAgentStream)
export function getStreamUrl(): string {
  return endpoint('/api/chat/stream');
}
