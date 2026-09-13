# Web Agency AI Backend 🚀

An autonomous AI agency discovery, proposal drafting, negotiation, and meeting scheduling assistant built with **LangGraph**, **FastAPI**, and **Model Context Protocol (MCP)**.

---

## 🌟 Capabilities

- **Lead Qualification**: Interactively interviews potential clients to extract project details (budget, target audience, technical requirements, timeline, email).
- **PostgreSQL Integration (MCP)**: Automatically records qualified client specifications into PostgreSQL (`public.client_information`).
- **Proposal Generation**: Analyzes service offerings and commercial guidelines (`pricing.txt`) to formulate customized commercial proposals.
- **Negotiation Management**: Handles counter-offers and discount inquiries (up to 10%), tracks structured outcomes (`NegotiationResult`), or recommends human escalation.
- **HubSpot CRM Sync (MCP)**: Creates and updates Contact and Deal records in HubSpot CRM.
- **Google Calendar Booking (MCP)**: Automatically schedules discovery calls on Google Calendar.
- **FastAPI Backend**: Exposes RESTful endpoints and real-time Server-Sent Events (SSE) streaming for seamless frontend integration.

---

## 🏗️ Architecture

```
web_agency_ai/
├── src/
│   └── web_agency_ai/
│       ├── agent.py               # WebAgencyAgent lifecycle & runner
│       ├── chains.py              # LangGraph state machine & node graph
│       ├── schemas.py             # Pydantic models (UserInfo, NegotiationResult)
│       ├── tools.py               # MCP & search tool definitions
│       ├── pricing.txt            # Internal agency services & rate sheet
│       ├── hubspot_tokens.json    # Cached OAuth tokens for HubSpot MCP
│       └── api/                   # FastAPI Application Layer
│           ├── main.py            # App entrypoint, lifespan, CORS
│           ├── config.py          # Settings & environment variables
│           ├── models.py          # Request & response contracts
│           ├── service.py         # Agent service singleton & session state
│           └── routes/
│               ├── chat.py        # POST /api/chat & POST /api/chat/stream
│               ├── threads.py     # GET /api/threads/{id}/state & history
│               ├── proposal.py    # GET /api/threads/{id}/proposal
│               └── health.py      # GET /api/health
├── docker/
│   └── init.sql                   # Database table initialization for PostgreSQL
├── tests/
│   └── test_api.py                # Pytest test suite (9 unit & integration tests)
├── Dockerfile                     # Multi-layer Docker image with Python & Node.js
├── docker-compose.yml             # Container orchestration (API + PostgreSQL)
└── pyproject.toml                 # uv package definition & dependencies
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service status, version, and documentation links. |
| `GET` | `/docs` | Interactive Swagger UI. |
| `GET` | `/redoc` | ReDoc API documentation. |
| `GET` | `/api/health` | Health check & MCP connectivity diagnostics. |
| `POST` | `/api/chat` | Synchronous conversational turn returning assistant reply and updated state. |
| `POST` | `/api/chat/stream` | Server-Sent Events (SSE) streaming tokens & node transitions in real time. |
| `GET` | `/api/threads/{thread_id}/state` | Inspection of extracted `UserInfo`, `proposal`, and deal status. |
| `GET` | `/api/threads/{thread_id}/history` | Chronological message history for a conversation thread. |
| `GET` | `/api/threads/{thread_id}/proposal` | Commercial proposal details and acceptance status. |
| `DELETE` | `/api/threads/{thread_id}` | Clears conversation checkpoints and resets thread state. |

---

## 🚀 Running Locally with uv

### 1. Install Dependencies
```powershell
uv sync
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your API keys:
```powershell
cp .env.example .env
```

### 3. Start the Backend
```powershell
uv run uvicorn web_agency_ai.api.main:app --host 0.0.0.0 --port 8000 --reload
```
*or:*
```powershell
uv run web-agency-ai
```

### 4. Run Unit Tests
```powershell
uv run pytest tests/test_api.py -v
```

---

## 🐳 Running with Docker & Docker Compose

### Prerequisites
Make sure **Docker Desktop** or Docker Engine is running.

### 1. Start All Services (API + PostgreSQL)
```powershell
docker compose up --build -d
```

This starts:
- **`web-agency-ai-api`** at `http://localhost:8000`
- **`web-agency-postgres`** at `localhost:5432` with `public.client_information` pre-configured.

### 2. Check Logs
```powershell
docker compose logs -f api
```

### 3. Stop Services
```powershell
docker compose down
```

---

## 🔑 MCP Authentication

- **PostgreSQL MCP**: Handled automatically via Docker Compose or `DATABASE_URI` in `.env`.
- **Google Calendar MCP**: Place your Google OAuth keys in `gcp-oauth.keys.json`.
- **HubSpot MCP**: Run the CLI helper once to authenticate in your browser:
  ```powershell
  uv run web-agency-ai --cli
  ```
  This stores the authenticated tokens in `src/web_agency_ai/hubspot_tokens.json`.
