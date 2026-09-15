import os
import json
import time
import webbrowser

from urllib.parse import urlparse, parse_qs
from pathlib import Path

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

HUBSPOT_MCP_URL = "https://mcp.hubspot.com"
REDIRECT_URI = "http://127.0.0.1:6274/oauth/callback"

DEFAULT_TOKEN_FILE = Path(
    os.getenv(
        "HUBSPOT_TOKEN_FILE",
        str(Path(__file__).resolve().parent / "hubspot_tokens.json"),
    )
)


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
        self.issued_at = None

        self._load_tokens()

    def _load_tokens(self):
        if not self.token_file.exists():
            print(
                f"WARNING: HubSpot token file not found: "
                f"{self.token_file}"
            )
            return

        try:
            with open(self.token_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            if not isinstance(data, dict):
                raise ValueError(
                    "token file must contain a JSON object"
                )

            access_token = data.get("access_token")

            if not isinstance(access_token, str) or not access_token.strip():
                raise ValueError(
                    "token file is missing a valid 'access_token'"
                )

            token_data = {
                "access_token": access_token,
                "token_type": data.get("token_type", "Bearer"),
                "expires_in": data.get("expires_in"),
                "scope": data.get("scope"),
                "refresh_token": data.get("refresh_token"),
            }

            self.issued_at = data.get("issued_at")

            if self.issued_at is not None:
                try:
                    self.issued_at = float(self.issued_at)
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        "token file contains an invalid 'issued_at'"
                    ) from exc

            self.tokens = OAuthToken(**token_data)

            if self.issued_at is None:
                self.tokens.expires_in = 0

                print(
                    "WARNING: HubSpot token file has no 'issued_at'. "
                    "The stored access token will be treated as expired "
                    "and the refresh token will be attempted."
                )

        except (
            OSError,
            json.JSONDecodeError,
            ValueError,
            TypeError,
        ) as exc:
            print(
                f"WARNING: Failed to load HubSpot token file "
                f"'{self.token_file}': {exc}"
            )

            print(
                "WARNING: HubSpot stored credentials will be treated "
                "as unavailable."
            )

            self.tokens = None
            self.issued_at = None

    async def get_tokens(self):
        if self.tokens is None:
            return None

        if (
            self.issued_at is not None
            and self.tokens.expires_in is not None
        ):
            elapsed = max(
                0,
                time.time() - float(self.issued_at),
            )

            remaining = max(
                0,
                int(self.tokens.expires_in - elapsed),
            )

            return OAuthToken(
                access_token=self.tokens.access_token,
                token_type=self.tokens.token_type,
                expires_in=remaining,
                scope=self.tokens.scope,
                refresh_token=self.tokens.refresh_token,
            )

        return self.tokens

    async def set_tokens(self, tokens):
        self.tokens = tokens
        self.issued_at = time.time()

        data = tokens.model_dump()
        data["issued_at"] = self.issued_at

        self.token_file.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temp_file = self.token_file.with_suffix(
            self.token_file.suffix + ".tmp"
        )

        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(
                    data,
                    f,
                    indent=2,
                )

            os.replace(
                temp_file,
                self.token_file,
            )

        except OSError as exc:
            print(
                f"WARNING: Failed to persist HubSpot tokens to "
                f"'{self.token_file}': {exc}"
            )

            try:
                if temp_file.exists():
                    temp_file.unlink()
            except OSError:
                pass

    async def get_client_info(self):
        return self.client_info

    async def set_client_info(self, client_info):
        self.client_info = client_info


class PersistentHubSpotOAuthClientProvider(OAuthClientProvider):
    async def _initialize(self):
        await super()._initialize()

        if self.context.current_tokens is not None:
            self.context.update_token_expiry(
                self.context.current_tokens
            )


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
                print(
                    f"Could not open browser: {exc}"
                )

    async def callback_handler(self):
        if not self.interactive:
            raise RuntimeError(
                "HubSpot OAuth re-authentication required, but "
                "interactive input is disabled in server mode. "
                "Please run with `--cli` to re-authenticate or "
                "verify hubspot_tokens.json."
            )

        print("\nPaste the FULL callback URL here:")

        try:
            callback_url = input("> ").strip()
        except (EOFError, OSError) as exc:
            raise RuntimeError(
                "Interactive input is not available in this "
                "environment. Please configure valid HubSpot "
                "tokens in hubspot_tokens.json."
            ) from exc

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

        oauth_provider = PersistentHubSpotOAuthClientProvider(
            server_url=HUBSPOT_MCP_URL,
            client_metadata=OAuthClientMetadata(
                client_name="Web Agency AI",
                redirect_uris=[REDIRECT_URI],
                grant_types=[
                    "authorization_code",
                    "refresh_token",
                ],
                response_types=["code"],
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
            read_stream, write_stream, _ = (
                await self.stream_context.__aenter__()
            )

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