import os
from pathlib import Path
from fastapi import APIRouter
from web_agency_ai.api.models import HealthResponse
from web_agency_ai.api.config import settings

router = APIRouter(prefix="/health", tags=["Health & Status"])


@router.get("", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Returns application health, environment diagnostics, and MCP configuration status."""
    project_root = Path(__file__).resolve().parents[3]
    google_creds_exist = (
        (project_root / "gcp-oauth.keys.json").exists()
        or bool(os.getenv("GOOGLE_OAUTH_CREDENTIALS"))
    )

    mcp_configured = {
        "postgresql": bool(os.getenv("DATABASE_URI")),
        "hubspot": bool(
            os.getenv("HUBSPOT_CLIENT_ID") and os.getenv("HUBSPOT_CLIENT_SECRET")
        ),
        "google_calendar": google_creds_exist,
    }

    model_configured = bool(os.getenv("HIVE_API_KEY"))

    all_ready = model_configured

    return HealthResponse(
        status="healthy" if all_ready else "degraded",
        version=settings.VERSION,
        service=settings.PROJECT_NAME,
        mcp_configured=mcp_configured,
        model_configured=model_configured,
    )
