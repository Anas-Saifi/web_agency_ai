import logging
from fastapi import APIRouter, HTTPException, status

from web_agency_ai.api.models import (
    ResetThreadResponse,
    ThreadHistoryResponse,
    ThreadStateResponse,
)
from web_agency_ai.api.service import AgentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["Threads & Sessions"])


@router.get(
    "/{thread_id}/state",
    response_model=ThreadStateResponse,
    summary="Get current state of a conversation thread",
    description="Retrieves the qualification data, proposal, negotiation status, and CRM/meeting flags.",
)
async def get_thread_state_endpoint(thread_id: str) -> ThreadStateResponse:
    try:
        service = AgentService.get_instance()
        return await service.get_state(thread_id)
    except Exception as exc:
        logger.error("Error retrieving thread state: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch state for thread '{thread_id}': {str(exc)}",
        )


@router.get(
    "/{thread_id}/history",
    response_model=ThreadHistoryResponse,
    summary="Get conversation history for a thread",
    description="Returns the chronological list of messages exchanged within the thread.",
)
async def get_thread_history_endpoint(thread_id: str) -> ThreadHistoryResponse:
    try:
        service = AgentService.get_instance()
        return await service.get_history(thread_id)
    except Exception as exc:
        logger.error("Error retrieving thread history: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history for thread '{thread_id}': {str(exc)}",
        )


@router.delete(
    "/{thread_id}",
    response_model=ResetThreadResponse,
    summary="Reset a conversation thread",
    description="Clears memory checkpoints for the specified thread ID.",
)
async def reset_thread_endpoint(thread_id: str) -> ResetThreadResponse:
    try:
        service = AgentService.get_instance()
        success = await service.reset_thread(thread_id)
        return ResetThreadResponse(
            thread_id=thread_id,
            message="Thread state cleared successfully." if success else "Thread not found.",
            success=success,
        )
    except Exception as exc:
        logger.error("Error resetting thread: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset thread '{thread_id}': {str(exc)}",
        )
