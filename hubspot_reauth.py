import asyncio
import os

from web_agency_ai.hubspot_mcp_client import HubSpotMCPClient


async def main():
    token_file = os.environ["HUBSPOT_TOKEN_FILE"]

    print(f"Token file: {token_file}")

    client = HubSpotMCPClient(interactive=True)

    try:
        # Force the existing project token file to be used.
        from pathlib import Path
        client.storage.token_file = Path(token_file)
        client.storage.tokens = None
        client.storage._load_tokens()

        session = await client.connect()

        print("\nSUCCESS: HubSpot OAuth authentication completed.")
        print("Token file has been updated.")
        print("Testing MCP tool listing...")

        result = await session.list_tools()

        print(f"\nLoaded {len(result.tools)} HubSpot MCP tools.")

        for tool in result.tools:
            print(f"  - {tool.name}")

    finally:
        await client.close()


asyncio.run(main())
