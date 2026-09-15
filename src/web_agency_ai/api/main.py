import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from web_agency_ai.api.config import settings
from web_agency_ai.api.routes import chat, health, proposal, threads
from web_agency_ai.api.service import AgentService

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("web_agency_ai.api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan manager to handle startup and graceful shutdown."""
    logger.info("Initializing Web Agency AI agent and MCP clients on startup...")
    try:
        service = AgentService.get_instance()
        await service.startup()
    except BaseException as exc:
        logger.warning(
            "Agent startup encountered non-fatal initialization warning: %s. "
            "Graph will build on first demand.",
            exc,
        )

    yield

    logger.info("Shutting down Web Agency AI backend...")
    try:
        service = AgentService.get_instance()
        await service.shutdown()
    except BaseException as exc:
        logger.warning("Error during shutdown: %s", exc)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware configuration.
# Starlette cannot combine allow_credentials=True with allow_origins=["*"].
_cors_origins = settings.CORS_ORIGINS
_wildcard_cors = _cors_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard_cors else _cors_origins,
    allow_credentials=not _wildcard_cors,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(threads.router, prefix=settings.API_V1_STR)
app.include_router(proposal.router, prefix=settings.API_V1_STR)


@app.get("/", summary="Root endpoint")
async def root() -> JSONResponse:
    return JSONResponse(
        content={
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "running",
            "docs": "/docs",
            "redoc": "/redoc",
            "api_v1": settings.API_V1_STR,
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "web_agency_ai.api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
