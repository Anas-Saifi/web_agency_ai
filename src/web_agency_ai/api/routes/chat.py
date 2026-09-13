import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from web_agency_ai.api.models import ChatRequest, ChatResponse
from web_agency_ai.api.service import AgentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message to the Web Agency AI agent",
    description=(
        "Processes user input through the LangGraph qualification, proposal, "
        "negotiation, and booking pipeline. Returns the complete response and state summary."
    ),
)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    try:
        service = AgentService.get_instance()
        response = await service.chat(
            message=request.message,
            thread_id=request.thread_id,
        )
        return response
    except Exception as exc:
        logger.error("Error in chat endpoint: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(exc)}",
        )


@router.post(
    "/stream",
    summary="Stream conversational response with Server-Sent Events (SSE)",
    description=(
        "Initiates a streaming session returning real-time node updates, "
        "execution steps, and the final response via text/event-stream."
    ),
)
async def chat_stream_endpoint(request: ChatRequest) -> StreamingResponse:
    service = AgentService.get_instance()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for event in service.stream_chat(
                message=request.message,
                thread_id=request.thread_id,
            ):
                event_name = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}))
                yield f"event: {event_name}\ndata: {event_data}\n\n"
        except Exception as exc:
            logger.error("Error during streaming generation: %s", exc, exc_info=True)
            err_payload = json.dumps({"error": str(exc)})
            yield f"event: error\ndata: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
