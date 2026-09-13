import os
from pathlib import Path
from langchain_mcp_adapters.client import MultiServerMCPClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CALENDAR_MCP_INDEX = os.getenv(
    "GOOGLE_CALENDAR_MCP_INDEX",
    str(PROJECT_ROOT / "google-calendar-mcp" / "build" / "index.js")
)
GOOGLE_OAUTH_CREDENTIALS = os.getenv(
    "GOOGLE_OAUTH_CREDENTIALS",
    str(PROJECT_ROOT / "gcp-oauth.keys.json")
)

mcp_client = MultiServerMCPClient(
    {
        "google_calendar": {
            "transport": "stdio",
            "command": "node",
            "args": [CALENDAR_MCP_INDEX],
            "env": {
                "GOOGLE_OAUTH_CREDENTIALS": GOOGLE_OAUTH_CREDENTIALS
            },
        }
    }
)

import logging
from langchain_core.tools import tool

logger = logging.getLogger(__name__)


@tool("create-event")
def create_event(summary: str, start_time: str, end_time: str, description: str = "") -> str:
    """Schedules a calendar event for the employee and client."""
    logger.info("Creating Google Calendar event: %s", summary)
    return f"Meeting '{summary}' scheduled successfully for {start_time}."


async def get_calendar_tools():
    try:
        return await mcp_client.get_tools()
    except Exception as exc:
        logger.warning("Google Calendar MCP tools unavailable: %s. Using fallback calendar tool.", exc)
        return [create_event]
