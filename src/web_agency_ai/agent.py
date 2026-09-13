from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, Optional

from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

try:
    from web_agency_ai.chains import build_graph, extract_bot_text, State
    from web_agency_ai.hubspot_mcp_client import HubSpotMCPClient
    from web_agency_ai.schemas import UserInfo, NegotiationResult
except ImportError:
    from chains import build_graph, extract_bot_text, State
    from hubspot_mcp_client import HubSpotMCPClient
    from schemas import UserInfo, NegotiationResult

logger = logging.getLogger(__name__)


class WebAgencyAgent:
    """Orchestrates the Web Agency AI LangGraph graph, MCP clients, and thread execution."""

    def __init__(
        self,
        mcp_client: Optional[HubSpotMCPClient] = None,
        checkpointer: Optional[InMemorySaver] = None,
    ) -> None:
        self.mcp_client = mcp_client or HubSpotMCPClient()
        self.checkpointer = checkpointer or InMemorySaver()
        self.graph = None
        self._connected = False

    async def initialize(self) -> None:
        """Connects MCP clients and compiles the LangGraph."""
        if self.graph is not None:
            return

        async def _safe_connect() -> bool:
            try:
                await self.mcp_client.connect()
                return True
            except BaseException as exc:
                logger.warning(
                    "HubSpot MCP connection could not be established: %s. Agent will proceed with graph fallback.",
                    exc,
                )
                return False

        try:
            self._connected = await asyncio.create_task(_safe_connect())
        except BaseException as exc:
            logger.warning("Error during isolated MCP connection task: %s", exc)
            self._connected = False

        try:
            self.graph = await build_graph(
                mcp_client=self.mcp_client,
                checkpointer=self.checkpointer,
            )
            logger.info("Web Agency AI graph compiled successfully.")
        except BaseException as exc:
            logger.error("Failed to build graph: %s", exc)
            raise

    async def close(self) -> None:
        """Closes connected MCP sessions."""
        if self._connected and self.mcp_client is not None:
            try:
                await self.mcp_client.close()
            except Exception as exc:
                logger.warning("Error closing HubSpot MCP client: %s", exc)
            self._connected = False

    def _get_config(self, thread_id: str) -> Dict[str, Any]:
        return {"configurable": {"thread_id": thread_id}}

    async def ainvoke(
        self,
        thread_id: str,
        user_message: str,
    ) -> Dict[str, Any]:
        """Executes a full turn in the conversation for the given thread_id."""
        if self.graph is None:
            await self.initialize()

        config = self._get_config(thread_id)
        input_payload = {"messages": [("human", user_message)]}

        result = await self.graph.ainvoke(input_payload, config=config)

        # Handle any graph interrupts
        while "__interrupt__" in result:
            result = await self.graph.ainvoke(
                Command(resume=True),
                config=config,
            )

        last_message = result["messages"][-1]
        bot_response = extract_bot_text(last_message)
        state_summary = self._extract_summary(result)

        return {
            "thread_id": thread_id,
            "response": bot_response,
            "state": state_summary,
            "raw_result": result,
        }

    async def astream_events(
        self,
        thread_id: str,
        user_message: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams node executions, status updates, and tokens for SSE clients."""
        if self.graph is None:
            await self.initialize()

        config = self._get_config(thread_id)
        input_payload = {"messages": [("human", user_message)]}

        yield {
            "event": "start",
            "data": {"thread_id": thread_id, "message": "Turn started"},
        }

        final_response: Optional[str] = None
        last_state = {}

        try:
            # Stream step-by-step state updates from graph
            async for chunk in self.graph.astream(
                input_payload,
                config=config,
                stream_mode="updates",
            ):
                for node_name, node_update in chunk.items():
                    yield {
                        "event": "node_update",
                        "data": {
                            "node": node_name,
                            "has_messages": "messages" in node_update,
                        },
                    }

                    if isinstance(node_update, dict):
                        last_state.update(node_update)
                        if "messages" in node_update:
                            msgs = node_update["messages"]
                            if isinstance(msgs, list) and msgs:
                                final_response = extract_bot_text(msgs[-1])
                            elif not isinstance(msgs, list):
                                final_response = extract_bot_text(msgs)

            # Retrieve full state from checkpointer
            full_state = await self.get_state(thread_id)
            if not final_response and full_state and full_state.get("messages"):
                final_response = extract_bot_text(full_state["messages"][-1])

            yield {
                "event": "message",
                "data": {
                    "thread_id": thread_id,
                    "response": final_response or "Processing completed.",
                    "state": self._extract_summary(full_state or last_state),
                },
            }

            yield {
                "event": "end",
                "data": {"thread_id": thread_id, "status": "completed"},
            }

        except Exception as exc:
            logger.error("Error during streaming turn: %s", exc, exc_info=True)
            yield {
                "event": "error",
                "data": {"thread_id": thread_id, "error": str(exc)},
            }

    async def get_state(self, thread_id: str) -> Dict[str, Any]:
        """Fetches the current checkpointed state of a conversation thread."""
        if self.graph is None:
            return {}

        config = self._get_config(thread_id)
        state_snapshot = self.graph.get_state(config)
        if state_snapshot and state_snapshot.values:
            return state_snapshot.values
        return {}

    def _extract_summary(self, values: Dict[str, Any]) -> Dict[str, Any]:
        """Formats the raw graph state into a clean dictionary."""
        user_info = values.get("user_info")
        negotiation_info = values.get("negotiation_info")

        user_info_dict = None
        if user_info is not None:
            if hasattr(user_info, "model_dump"):
                user_info_dict = user_info.model_dump()
            elif isinstance(user_info, dict):
                user_info_dict = user_info

        negotiation_dict = None
        if negotiation_info is not None:
            if hasattr(negotiation_info, "model_dump"):
                negotiation_dict = negotiation_info.model_dump()
            elif isinstance(negotiation_info, dict):
                negotiation_dict = negotiation_info

        return {
            "user_info": user_info_dict,
            "proposal": values.get("proposal"),
            "negotiation_info": negotiation_dict,
            "negotiation_attempts": values.get("negotiation_attempts", 0),
            "submitted": values.get("submitted", False),
            "deal_finalised": values.get("deal_finalised", False),
            "event_created": values.get("event_created", False),
            "customer_interested": values.get("customer_interested", None),
        }
