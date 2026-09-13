import logging
from fastapi import APIRouter, HTTPException, status

from web_agency_ai.api.models import ProposalResponse
from web_agency_ai.api.service import AgentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["Proposals"])


@router.get(
    "/{thread_id}/proposal",
    response_model=ProposalResponse,
    summary="Get generated proposal for a thread",
    description="Retrieves the tailored commercial proposal and accepted deal status for a given client thread.",
)
async def get_thread_proposal_endpoint(thread_id: str) -> ProposalResponse:
    try:
        service = AgentService.get_instance()
        return await service.get_proposal(thread_id)
    except Exception as exc:
        logger.error("Error retrieving proposal for thread %s: %s", thread_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch proposal for thread '{thread_id}': {str(exc)}",
        )
