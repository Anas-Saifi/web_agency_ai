import os
import json
import webbrowser

from urllib.parse import urlparse, parse_qs

import httpx
from dotenv import load_dotenv

from mcp import ClientSession
from mcp.client.auth import OAuthClientProvider
from mcp.client.streamable_http import streamable_http_client
from mcp.shared.auth import (
    OAuthClientMetadata,
    OAuthClientInformationFull,
    OAuthToken,
)


load_dotenv()


from pathlib import Path

HUBSPOT_MCP_URL = "https://mcp.hubspot.com"

REDIRECT_URI = "http://127.0.0.1:6274/oauth/callback"

DEFAULT_TOKEN_FILE = Path(__file__).resolve().parent / "hubspot_tokens.json"


class HubSpotTokenStorage:
    
    def __init__(self, token_file: Path | str = DEFAULT_TOKEN_FILE):

        self.token_file = Path(token_file)

        self.client_info = OAuthClientInformationFull(
            client_id=os.environ.get("HUBSPOT_CLIENT_ID", ""),
            client_secret=os.environ.get("HUBSPOT_CLIENT_SECRET", ""),
            redirect_uris=[REDIRECT_URI],
            token_endpoint_auth_method="client_secret_post",
        )

        self.tokens = None

        self._load_tokens()

    def _load_tokens(self):

        if not os.path.exists(self.token_file):
            return

        with open(self.token_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.tokens = OAuthToken(**data)

    async def get_tokens(self):

        return self.tokens

    async def set_tokens(self, tokens):

        self.tokens = tokens

        with open(self.token_file, "w", encoding="utf-8") as f:
            json.dump(
                tokens.model_dump(),
                f,
                indent=2,
            )

    async def get_client_info(self):

        return self.client_info

    async def set_client_info(self, client_info):

        self.client_info = client_info

class HubSpotMCPClient:

    def __init__(self, interactive: bool = False):

        self.storage = HubSpotTokenStorage()
        self.interactive = interactive

        self.http_client = None
        self.stream_context = None
        self.session = None

    async def redirect_handler(self, url: str):

        print("\nHubSpot authorization URL:")
        print(url)
        if self.interactive:
            try:
                webbrowser.open(url)
            except Exception as exc:
                print(f"Could not open browser: {exc}")

    async def callback_handler(self):

        if not self.interactive:
            raise RuntimeError(
                "HubSpot OAuth re-authentication required, but interactive input is disabled in server mode. "
                "Please run with `--cli` to re-authenticate or verify hubspot_tokens.json."
            )

        print("\nPaste the FULL callback URL here:")
        try:
            callback_url = input("> ").strip()
        except (EOFError, OSError):
            raise RuntimeError(
                "Interactive input is not available in this environment. "
                "Please configure valid HubSpot tokens in hubspot_tokens.json."
            )

        parsed = urlparse(callback_url)

        params = parse_qs(parsed.query)

        code = params.get("code", [None])[0]
        state = params.get("state", [None])[0]

        if not code:
            raise RuntimeError(
                f"No authorization code found:\n{callback_url}"
            )

        return code, state

    async def connect(self):

        if self.session is not None:
            return self.session

        oauth_provider = OAuthClientProvider(

            server_url=HUBSPOT_MCP_URL,

            client_metadata=OAuthClientMetadata(

                client_name="Web Agency AI",

                redirect_uris=[
                    REDIRECT_URI
                ],

                grant_types=[
                    "authorization_code",
                    "refresh_token",
                ],

                response_types=[
                    "code"
                ]
            ),

            storage=self.storage,

            redirect_handler=self.redirect_handler,

            callback_handler=self.callback_handler,
        )

        self.http_client = httpx.AsyncClient(
            auth=oauth_provider,
            follow_redirects=True,
        )

        self.stream_context = streamable_http_client(
            HUBSPOT_MCP_URL,
            http_client=self.http_client,
        )

        try:
            (
                read_stream,
                write_stream,
                _,
            ) = await self.stream_context.__aenter__()

            self.session = ClientSession(
                read_stream,
                write_stream,
            )

            await self.session.__aenter__()

            await self.session.initialize()

            print("\nConnected to HubSpot MCP!\n")

            return self.session
        except BaseException as exc:
            await self.close()
            raise exc

    async def close(self):

        if self.session is not None:

            await self.session.__aexit__(
                None,
                None,
                None,
            )

            self.session = None

        if self.stream_context is not None:

            await self.stream_context.__aexit__(
                None,
                None,
                None,
            )

            self.stream_context = None

        if self.http_client is not None:

            await self.http_client.aclose()

            self.http_client = None