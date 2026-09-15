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

GOOGLE_CALENDAR_MCP_TOKEN_PATH = os.getenv(
    "GOOGLE_CALENDAR_MCP_TOKEN_PATH",
    str(Path.home() / ".config" / "google-calendar-mcp" / "tokens.json")
)


mcp_client = MultiServerMCPClient(
    {
        "google_calendar": {
            "transport": "stdio",
            "command": "node",
            "args": [CALENDAR_MCP_INDEX],
            "env": {
                "GOOGLE_OAUTH_CREDENTIALS": GOOGLE_OAUTH_CREDENTIALS,
                "GOOGLE_CALENDAR_MCP_TOKEN_PATH": GOOGLE_CALENDAR_MCP_TOKEN_PATH,
            },
        }
    }
)


async def get_calendar_tools():
    try:
        return await mcp_client.get_tools()
    except Exception as exc:
        raise RuntimeError(
            f"Google Calendar MCP initialization failed: {exc}"
        ) from exc

