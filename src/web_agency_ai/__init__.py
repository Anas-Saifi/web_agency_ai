"""Web Agency AI package."""

import sys


def main() -> None:
    """CLI entrypoint to launch either the FastAPI server or run the agent CLI."""
    if "--cli" in sys.argv:
        import asyncio
        from web_agency_ai.chains import main as cli_main

        asyncio.run(cli_main())
    else:
        import uvicorn
        from web_agency_ai.api.config import settings

        print(f"Starting Web Agency AI FastAPI server on http://{settings.HOST}:{settings.PORT}")
        print("API Documentation available at http://127.0.0.1:8000/docs")
        uvicorn.run(
            "web_agency_ai.api.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
        )


__all__ = ["main"]
