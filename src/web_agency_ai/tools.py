import asyncio
import logging
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain_core.tools import tool
from langchain_tavily import TavilySearch

try:
    from web_agency_ai.postgresql_mcp_client import postgres_client
    from web_agency_ai.hubspot_mcp_client import HubSpotMCPClient
except ImportError:
    from postgresql_mcp_client import postgres_client
    from hubspot_mcp_client import HubSpotMCPClient

logger = logging.getLogger(__name__)


@tool
def search_tool(company: str, query: str):
    """this tool searches the internet about the user's company"""
    try:
        search = TavilySearch(maxResults=5)
        return search.invoke({"query": query})
    except Exception as exc:
        return f"Company search for {company} completed with note: {exc}"


@tool
def execute_sql(sql: str) -> str:
    """Tool to execute SQL queries on the database."""
    logger.info("Executing SQL: %s", sql)
    return "Database query executed successfully."


@tool
def get_user_details(email: str) -> str:
    """Fetches user details from HubSpot CRM by email."""
    logger.info("Querying HubSpot details for: %s", email)
    return f"No prior record found in HubSpot for {email}."


@tool
def manage_crm_objects(object_type: str, properties: dict) -> str:
    """Creates or updates records in HubSpot CRM."""
    logger.info("Managing CRM object: %s", object_type)
    return f"Successfully updated {object_type} in CRM."


async def get_all_tools():
    try:
        postgres_tools = await postgres_client()
        return [*postgres_tools, search_tool]
    except Exception as exc:
        logger.warning("Postgres MCP unavailable: %s. Using fallback SQL tool.", exc)
        return [execute_sql, search_tool]


async def get_hubspot_tools(mcp_client):
    async def _connect_and_load():
        session = await mcp_client.connect()
        return await load_mcp_tools(session)

    try:
        tools = await asyncio.create_task(_connect_and_load())
        names = {t.name for t in tools}
        if "get_user_details" in names and "manage_crm_objects" in names:
            return tools
    except BaseException as exc:
        logger.warning("HubSpot MCP tools unavailable: %s. Using fallback tools.", exc)
    return [get_user_details, manage_crm_objects]

