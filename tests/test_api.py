"""Unit and integration tests for the Web Agency AI FastAPI backend."""

import pytest
from fastapi.testclient import TestClient

from web_agency_ai.api.main import app
from web_agency_ai.api.models import AgentStateSummary, UserInfo
from web_agency_ai.api.service import AgentService

client = TestClient(app)


def test_root_endpoint():
    """Test root endpoint metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Web Agency AI Backend"
    assert data["status"] == "running"
    assert data["docs"] == "/docs"


def test_health_endpoint():
    """Test health and MCP configuration diagnostics."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "mcp_configured" in data
    assert isinstance(data["mcp_configured"], dict)
    assert "model_configured" in data


def test_thread_state_and_history_empty():
    """Test retrieving state and history for a new thread."""
    thread_id = "test-session-fresh"
    
    # State
    state_resp = client.get(f"/api/threads/{thread_id}/state")
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert state_data["thread_id"] == thread_id
    assert state_data["state"]["deal_finalised"] is False

    # History
    hist_resp = client.get(f"/api/threads/{thread_id}/history")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["thread_id"] == thread_id
    assert hist_data["total_messages"] == 0

    # Proposal
    prop_resp = client.get(f"/api/threads/{thread_id}/proposal")
    assert prop_resp.status_code == 200
    prop_data = prop_resp.json()
    assert prop_data["thread_id"] == thread_id
    assert prop_data["has_proposal"] is False


def test_thread_reset():
    """Test resetting a thread."""
    thread_id = "test-session-reset"
    reset_resp = client.delete(f"/api/threads/{thread_id}")
    assert reset_resp.status_code == 200
    data = reset_resp.json()
    assert data["success"] is True
    assert data["thread_id"] == thread_id


def test_chat_endpoint_structure(monkeypatch):
    """Test POST /api/chat with mock agent execution to verify contract."""
    thread_id = "test-chat-thread"

    async def mock_chat(self, message: str, thread_id: str = None):
        return {
            "thread_id": thread_id or "test-thread",
            "response": "Hello! How can our web agency help you today?",
            "state": {
                "user_info": {"name": "Alice", "company": "Acme"},
                "proposal": None,
                "negotiation_info": None,
                "negotiation_attempts": 0,
                "submitted": False,
                "deal_finalised": False,
                "event_created": False,
                "customer_interested": None,
            },
        }

    from web_agency_ai.api.models import ChatResponse

    async def mock_service_chat(self, message: str, thread_id: str = None):
        res = await mock_chat(self, message, thread_id)
        return ChatResponse(
            thread_id=res["thread_id"],
            response=res["response"],
            state=AgentStateSummary(**res["state"]),
        )

    monkeypatch.setattr(AgentService, "chat", mock_service_chat)

    response = client.post(
        "/api/chat",
        json={
            "thread_id": thread_id,
            "message": "Hello, I want to build a portfolio website.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["thread_id"] == thread_id
    assert "Hello!" in data["response"]
    assert data["state"]["user_info"]["name"] == "Alice"


def test_stream_endpoint_structure(monkeypatch):
    """Test POST /api/chat/stream SSE endpoint."""
    thread_id = "test-stream-thread"

    async def mock_stream(self, message: str, thread_id: str = None):
        yield {"event": "start", "data": {"thread_id": thread_id}}
        yield {"event": "node_update", "data": {"node": "ask_node"}}
        yield {
            "event": "message",
            "data": {
                "thread_id": thread_id,
                "response": "What is your budget?",
                "state": {"user_info": None},
            },
        }
        yield {"event": "end", "data": {"thread_id": thread_id}}

    monkeypatch.setattr(AgentService, "stream_chat", mock_stream)

    response = client.post(
        "/api/chat/stream",
        json={
            "thread_id": thread_id,
            "message": "Hello",
        },
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    text = response.text
    assert "event: start" in text
    assert "event: node_update" in text
    assert "event: message" in text
    assert "What is your budget?" in text
    assert "event: end" in text


def test_chat_validation_error():
    """Test validation error when message is missing."""
    response = client.post("/api/chat", json={})
    assert response.status_code == 422


def test_thread_proposal_with_data(monkeypatch):
    """Test proposal endpoint when a proposal has been drafted."""
    thread_id = "test-proposal-active"

    from web_agency_ai.api.models import ProposalResponse, UserInfo

    async def mock_get_proposal(self, t_id: str):
        return ProposalResponse(
            thread_id=t_id,
            has_proposal=True,
            proposal="Custom Agency Proposal: Full-Stack E-commerce platform ($5,000)",
            user_info=UserInfo(name="Bob", company="CoffeeCo", budget=5000),
            deal_finalised=True,
        )

    monkeypatch.setattr(AgentService, "get_proposal", mock_get_proposal)

    response = client.get(f"/api/threads/{thread_id}/proposal")
    assert response.status_code == 200
    data = response.json()
    assert data["has_proposal"] is True
    assert "Full-Stack E-commerce" in data["proposal"]
    assert data["user_info"]["name"] == "Bob"
    assert data["deal_finalised"] is True


def test_thread_history_with_messages(monkeypatch):
    """Test history endpoint formatting with human and assistant messages."""
    thread_id = "test-history-active"

    from web_agency_ai.api.models import MessageItem, ThreadHistoryResponse

    async def mock_get_history(self, t_id: str):
        return ThreadHistoryResponse(
            thread_id=t_id,
            messages=[
                MessageItem(role="human", content="Hello, what are your rates?"),
                MessageItem(role="assistant", content="We build custom web apps starting at $1,500."),
            ],
            total_messages=2,
        )

    monkeypatch.setattr(AgentService, "get_history", mock_get_history)

    response = client.get(f"/api/threads/{thread_id}/history")
    assert response.status_code == 200
    data = response.json()
    assert data["total_messages"] == 2
    assert data["messages"][0]["role"] == "human"
    assert data["messages"][1]["role"] == "assistant"

