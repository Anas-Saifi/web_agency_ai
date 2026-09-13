# Use official Python 3.12 slim bookworm
FROM python:3.12-slim-bookworm

# Copy fast uv and uvx binaries from Astral's official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Install system dependencies:
# - curl: for container healthchecks
# - ca-certificates: for secure TLS connections to MCP & LLM APIs
# - nodejs & npm: for running the Google Calendar MCP server
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Configure Python environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/src" \
    HOST=0.0.0.0 \
    PORT=8000

# 1. Copy dependency files for optimal Docker caching
COPY pyproject.toml uv.lock ./

# 2. Install third-party Python dependencies
RUN uv sync --frozen --no-install-project --no-dev

# 3. Copy source code and assets
COPY src ./src
COPY README.md ./
COPY google-calendar-mcp ./google-calendar-mcp
COPY gcp-oauth.keys.json* ./

# 4. Install the package itself
RUN uv sync --frozen --no-dev

# Expose backend port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Default command: launch FastAPI via Uvicorn
CMD ["uv", "run", "uvicorn", "web_agency_ai.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
