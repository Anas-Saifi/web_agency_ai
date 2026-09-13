from __future__ import annotations

import logging
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

try:
    from web_agency_ai.agent import WebAgencyAgent
    from web_agency_ai.api.models import (
        AgentStateSummary,
        ChatResponse,
        MessageItem,
        ProposalResponse,
        ThreadHistoryResponse,
        ThreadStateResponse,
    )
    from web_agency_ai.chains import extract_bot_text
except ImportError:
    from agent import WebAgencyAgent
    from api.models import (
        AgentStateSummary,
        ChatResponse,
        MessageItem,
        ProposalResponse,
        ThreadHistoryResponse,
        ThreadStateResponse,
    )
    from chains import extract_bot_text

logger = logging.getLogger(__name__)


class AgentService:
    """Singleton service wrapping WebAgencyAgent with API-level abstractions."""

    _instance: Optional[AgentService] = None

    def __init__(self) -> None:
        self.agent: Optional[WebAgencyAgent] = None

    @classmethod
    def get_instance(cls) -> AgentService:
        if cls._instance is None:
            cls._instance = AgentService()
        return cls._instance

    async def startup(self) -> None:
        """Initializes agent and compiles LangGraph."""
        if self.agent is None:
            self.agent = WebAgencyAgent()
            await self.agent.initialize()
            logger.info("AgentService started up and agent graph initialized.")

    async def shutdown(self) -> None:
        """Closes MCP connections and releases resources."""
        if self.agent is not None:
            await self.agent.close()
            self.agent = None
            logger.info("AgentService shut down cleanly.")

    def _ensure_agent(self) -> WebAgencyAgent:
        if self.agent is None:
            self.agent = WebAgencyAgent()
        return self.agent

    async def chat(
        self,
        message: str,
        thread_id: Optional[str] = None,
    ) -> ChatResponse:
        """Executes a single conversational turn."""
        effective_thread_id = thread_id or f"client_{uuid.uuid4().hex[:8]}"
        agent = self._ensure_agent()

        result = await agent.ainvoke(
            thread_id=effective_thread_id,
            user_message=message,
        )

        state_dict = result.get("state", {})
        state_summary = AgentStateSummary(**state_dict)

        return ChatResponse(
            thread_id=effective_thread_id,
            response=result["response"],
            state=state_summary,
        )

    async def stream_chat(
        self,
        message: str,
        thread_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams events and response chunks for SSE endpoints."""
        effective_thread_id = thread_id or f"client_{uuid.uuid4().hex[:8]}"
        agent = self._ensure_agent()

        async for event in agent.astream_events(
            thread_id=effective_thread_id,
            user_message=message,
        ):
            yield event

    async def get_state(self, thread_id: str) -> ThreadStateResponse:
        """Returns the current state for a given thread."""
        agent = self._ensure_agent()
        raw_state = await agent.get_state(thread_id)
        summary = agent._extract_summary(raw_state)
        return ThreadStateResponse(
            thread_id=thread_id,
            state=AgentStateSummary(**summary),
        )

    async def get_history(self, thread_id: str) -> ThreadHistoryResponse:
        """Retrieves formatted message history for a conversation thread."""
        agent = self._ensure_agent()
        raw_state = await agent.get_state(thread_id)
        messages: List[MessageItem] = []

        if raw_state and "messages" in raw_state:
            for msg in raw_state["messages"]:
                if isinstance(msg, HumanMessage):
                    messages.append(MessageItem(role="human", content=str(msg.content)))
                elif isinstance(msg, AIMessage):
                    text = extract_bot_text(msg)
                    messages.append(MessageItem(role="assistant", content=text))
                elif isinstance(msg, ToolMessage):
                    messages.append(MessageItem(role="tool", content=str(msg.content)))
                elif isinstance(msg, tuple) and len(msg) >= 2:
                    messages.append(MessageItem(role=str(msg[0]), content=str(msg[1])))
                else:
                    role = getattr(msg, "type", "unknown")
                    content = getattr(msg, "content", str(msg))
                    messages.append(MessageItem(role=role, content=str(content)))

        return ThreadHistoryResponse(
            thread_id=thread_id,
            messages=messages,
            total_messages=len(messages),
        )

    async def get_proposal(self, thread_id: str) -> ProposalResponse:
        """Retrieves proposal and qualification status for a given thread."""
        state_resp = await self.get_state(thread_id)
        state = state_resp.state
        has_proposal = bool(state.proposal)

        return ProposalResponse(
            thread_id=thread_id,
            has_proposal=has_proposal,
            proposal=state.proposal,
            user_info=state.user_info,
            deal_finalised=state.deal_finalised,
        )

    async def reset_thread(self, thread_id: str) -> bool:
        """Resets a thread by clearing checkpointer entries for that thread."""
        agent = self._ensure_agent()
        if hasattr(agent.checkpointer, "storage"):
            # InMemorySaver storage dictionary cleanup
            to_delete = [
                k for k in agent.checkpointer.storage.keys() if thread_id in str(k)
            ]
            for k in to_delete:
                agent.checkpointer.storage.pop(k, None)
        return True
