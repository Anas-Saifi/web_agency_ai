from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

try:
    from web_agency_ai.schemas import UserInfo, NegotiationResult
except ImportError:
    from schemas import UserInfo, NegotiationResult


class AgentStateSummary(BaseModel):
    user_info: Optional[UserInfo] = Field(
        default=None,
        description="Extracted client and project requirements",
    )
    proposal: Optional[str] = Field(
        default=None,
        description="Current proposal drafted by the agency",
    )
    negotiation_info: Optional[NegotiationResult] = Field(
        default=None,
        description="Structured negotiation outcome and deal details",
    )
    negotiation_attempts: int = Field(
        default=0,
        description="Count of negotiation interactions",
    )
    submitted: bool = Field(
        default=False,
        description="Whether client requirements were inserted into PostgreSQL",
    )
    deal_finalised: bool = Field(
        default=False,
        description="Whether client accepted the deal terms",
    )
    event_created: bool = Field(
        default=False,
        description="Whether a discovery meeting was scheduled in Google Calendar",
    )
    customer_interested: Optional[bool] = Field(
        default=None,
        description="Customer interest status",
    )


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        description="The user's message to the web agency assistant",
        examples=["Hi, I need an e-commerce website for my organic coffee brand."],
    )
    thread_id: Optional[str] = Field(
        default=None,
        description="Unique conversation session ID. If not provided, a new thread ID will be generated.",
        examples=["client-session-1234"],
    )


class ChatResponse(BaseModel):
    thread_id: str = Field(
        ...,
        description="The conversation thread ID",
    )
    response: str = Field(
        ...,
        description="The assistant's text response to the user",
    )
    state: AgentStateSummary = Field(
        ...,
        description="Current snapshot of the conversation state and extracted data",
    )


class MessageItem(BaseModel):
    role: str = Field(
        ...,
        description="Role of the sender ('human', 'assistant', 'system', 'tool')",
    )
    content: str = Field(
        ...,
        description="Text content of the message",
    )


class ThreadHistoryResponse(BaseModel):
    thread_id: str
    messages: List[MessageItem]
    total_messages: int


class ThreadStateResponse(BaseModel):
    thread_id: str
    state: AgentStateSummary


class ResetThreadResponse(BaseModel):
    thread_id: str
    message: str
    success: bool


class ProposalResponse(BaseModel):
    thread_id: str
    has_proposal: bool
    proposal: Optional[str]
    user_info: Optional[UserInfo]
    deal_finalised: bool


class HealthResponse(BaseModel):
    status: str
    version: str
    service: str
    mcp_configured: Dict[str, bool]
    model_configured: bool
