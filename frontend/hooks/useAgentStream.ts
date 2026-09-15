'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AgentEvent, ChatMessage, ConnectionStatus } from '@/types/agent';
import type { AgentStateSummary, HealthResponse } from '@/types/api';
import { getThreadHistory, getThreadState, getStreamUrl, getHealth } from '@/lib/api';
import {
  normalizeNodeUpdate,
  normalizeStateChange,
  parseSSEChunk,
} from '@/lib/event-normalizer';
import type { WorkflowStage, WorkflowStageId } from '@/types/workflow';
import { buildInitialStages, getStageForNode, STAGE_ORDER } from '@/lib/workflow';

export interface UseAgentStreamReturn {
  messages: ChatMessage[];
  events: AgentEvent[];
  agentState: AgentStateSummary | null;
  isStreaming: boolean;
  connectionStatus: ConnectionStatus;
  workflowStages: WorkflowStage[];
  activeNodes: string[];
  health: HealthResponse | null;
  sendMessage: (text: string, threadId: string) => Promise<void>;
  loadSession: (threadId: string) => Promise<void>;
  clearSession: () => void;
  checkHealth: () => Promise<void>;
  error: string | null;
}

function makeMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function restoreStages(state: AgentStateSummary | null): WorkflowStage[] {
  const stages = buildInitialStages();
  if (!state) return stages;

  const completed: WorkflowStageId[] = [];
  if (state.user_info || state.submitted || state.proposal) {
    completed.push('requirements');
  }
  if (state.submitted) completed.push('postgresql');
  if (state.proposal) completed.push('proposal');
  if (state.deal_finalised) completed.push('negotiation');
  if (state.event_created) {
    completed.push('hubspot');
    completed.push('calendar');
  }

  return stages.map((stage) =>
    completed.includes(stage.id)
      ? { ...stage, status: 'completed', completedAt: new Date().toISOString() }
      : stage
  );
}

export function useAgentStream(): UseAgentStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [agentState, setAgentState] = useState<AgentStateSummary | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>(buildInitialStages());
  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prevStateRef = useRef<AgentStateSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const checkHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setHealth(h);
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        setConnectionStatus('connected');
      }
    } catch {
      setHealth(null);
    }
  }, [connectionStatus]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const updateStage = useCallback((stageId: string, updates: Partial<WorkflowStage>) => {
    setWorkflowStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, ...updates } : s))
    );
  }, []);

  const markStagesBeforeAsCompleted = useCallback((stageId: string) => {
    const targetIdx = STAGE_ORDER.indexOf(stageId as WorkflowStage['id']);
    if (targetIdx < 0) return;
    setWorkflowStages((prev) =>
      prev.map((s, idx) => {
        if (idx < targetIdx && s.status === 'pending') {
          return { ...s, status: 'completed', completedAt: new Date().toISOString() };
        }
        return s;
      })
    );
  }, []);

  const loadSession = useCallback(async (threadId: string) => {
    if (!threadId) return;

    const loadId = ++requestIdRef.current;
    setError(null);
    setConnectionStatus('connecting');

    try {
      const [history, stateResponse] = await Promise.all([
        getThreadHistory(threadId),
        getThreadState(threadId),
      ]);

      if (loadId !== requestIdRef.current) return;

      const restoredMessages: ChatMessage[] = history.messages
        .filter((message) => message.role === 'human' || message.role === 'assistant')
        .map((message, index) => ({
          id: `restored-${threadId}-${index}`,
          role: message.role === 'human' ? 'user' : 'assistant',
          content: message.content,
          timestamp: new Date().toISOString(),
        }));

      const state = stateResponse.state;
      setMessages(restoredMessages);
      setAgentState(state);
      setWorkflowStages(restoreStages(state));
      setActiveNodes([]);
      setEvents(normalizeStateChange(null, state));
      prevStateRef.current = state;
      setConnectionStatus('connected');
    } catch (err: unknown) {
      if (loadId !== requestIdRef.current) return;

      const msg = err instanceof Error ? err.message : 'Failed to restore session';
      if (/API 404\b/.test(msg)) {
        setMessages([]);
        setEvents([]);
        setAgentState(null);
        setWorkflowStages(buildInitialStages());
        setActiveNodes([]);
        prevStateRef.current = null;
        setConnectionStatus('connected');
        return;
      }

      setError(msg);
      setConnectionStatus('error');
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string, threadId: string) => {
      const trimmed = text.trim();
      if (!threadId || !trimmed) return;

      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();

      setError(null);

      const userMsg: ChatMessage = {
        id: makeMessageId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantMsgId = makeMessageId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true,
        },
      ]);

      setIsStreaming(true);
      setConnectionStatus('streaming');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(getStreamUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ message: trimmed, thread_id: threadId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(body ? `HTTP ${res.status}: ${body}` : `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        setConnectionStatus('connected');

        const decoder = new TextDecoder();
        let buffer = '';

        const processBlock = (block: string) => {
          const parsed = parseSSEChunk(block);
          for (const { event, data } of parsed) {
            if (requestId !== requestIdRef.current) return;
            const d = data as Record<string, unknown>;

            if (event === 'start') {
              setConnectionStatus('streaming');
            } else if (event === 'node_update') {
              const nodeData = d as { node: string; has_messages: boolean };
              const stageId = getStageForNode(nodeData.node);

              setActiveNodes((prev) => [...new Set([...prev, nodeData.node])]);

              if (stageId) {
                markStagesBeforeAsCompleted(stageId);
                updateStage(stageId, {
                  status: 'running',
                  startedAt: new Date().toISOString(),
                });
              }

              const nodeEvent = normalizeNodeUpdate(nodeData);

              // Deduplicate: If an event of the same type/stage is already in events and running,
              // update it rather than appending a brand new duplicate card!
              setEvents((prev) => {
                const existingIdx = prev.findIndex(
                  (e) =>
                    e.status === 'running' &&
                    ((stageId && e.stageId === stageId) ||
                      (e.type !== 'node_started' && e.type === nodeEvent.type))
                );

                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = {
                    ...updated[existingIdx],
                    node: nodeData.node,
                    title: nodeEvent.title,
                    description: nodeEvent.description,
                  };
                  return updated;
                }

                return [...prev, nodeEvent];
              });
            } else if (event === 'message') {
              const msgData = d as {
                thread_id: string;
                response: string;
                state: AgentStateSummary;
              };

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: msgData.response, isStreaming: false }
                    : m
                )
              );

              const newState = msgData.state;
              setAgentState(newState);

              const stateEvents = normalizeStateChange(prevStateRef.current, newState);

              // Merge completed state events with existing running events (replacing running with success)
              if (stateEvents.length > 0) {
                setEvents((prev) => {
                  let next = [...prev];
                  for (const sEvt of stateEvents) {
                    const matchIdx = next.findIndex(
                      (e) =>
                        (sEvt.stageId && e.stageId === sEvt.stageId) ||
                        (sEvt.type === e.type && e.status === 'running')
                    );

                    if (matchIdx >= 0) {
                      next[matchIdx] = sEvt;
                    } else {
                      // Avoid duplicating completed events
                      const exists = next.some(
                        (e) => e.type === sEvt.type && e.status === 'success'
                      );
                      if (!exists) {
                        next.push(sEvt);
                      }
                    }
                  }
                  return next;
                });
              }

              if (newState.user_info || newState.submitted) {
                updateStage('requirements', {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });
              }
              if (newState.submitted) {
                updateStage('postgresql', {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });
              }
              if (newState.proposal) {
                updateStage('proposal', {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });
              }
              if (newState.deal_finalised) {
                updateStage('negotiation', {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });
              }
              if (newState.event_created) {
                updateStage('hubspot', {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });
                updateStage('calendar', {
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                });
              }

              prevStateRef.current = newState;
            } else if (event === 'end') {
              setActiveNodes([]);
              setWorkflowStages((prev) =>
                prev.map((s) =>
                  s.status === 'running'
                    ? { ...s, status: 'completed', completedAt: new Date().toISOString() }
                    : s
                )
              );
              setEvents((prev) =>
                prev.map((evt) =>
                  evt.status === 'running' ? { ...evt, status: 'success' } : evt
                )
              );
              setConnectionStatus('connected');
            } else if (event === 'error') {
              const errMsg = (d.error as string) ?? 'Streaming error occurred';
              setError(errMsg);
              setConnectionStatus('error');
              setActiveNodes([]);
              setEvents((prev) =>
                prev.map((evt) =>
                  evt.status === 'running' ? { ...evt, status: 'error' } : evt
                )
              );
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: `⚠ Error: ${errMsg}`, isStreaming: false }
                    : m
                )
              );
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? '';
          blocks.forEach(processBlock);
        }

        buffer += decoder.decode();
        if (buffer.trim()) processBlock(buffer);

        if (requestId === requestIdRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: m.content.trim()
                      ? m.content
                      : 'No response received from the agent.',
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;

        const msg = err instanceof Error ? err.message : 'Connection failed';
        setError(msg);
        setConnectionStatus('error');
        setActiveNodes([]);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: '⚠ Failed to get a response. Please try again.', isStreaming: false }
              : m
          )
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setIsStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [markStagesBeforeAsCompleted, updateStage]
  );

  const clearSession = useCallback(() => {
    ++requestIdRef.current;
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setEvents([]);
    setAgentState(null);
    setWorkflowStages(buildInitialStages());
    setActiveNodes([]);
    setError(null);
    setIsStreaming(false);
    setConnectionStatus('connected');
    prevStateRef.current = null;
  }, []);

  return {
    messages,
    events,
    agentState,
    isStreaming,
    connectionStatus,
    workflowStages,
    activeNodes,
    health,
    sendMessage,
    loadSession,
    clearSession,
    checkHealth,
    error,
  };
}
