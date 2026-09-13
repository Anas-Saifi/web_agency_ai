from pydantic import BaseModel, Field, EmailStr
from typing import Optional



class UserInfo(BaseModel):
    name: Optional[str] = Field(default=None, description="name of the client")
    company: Optional[str] = Field(default=None, description="name of the client's company")
    budget: Optional[int] = Field(default=None, description="budget of the client")
    type_of_website: Optional[str] = Field(default=None, description="the type of website the user wants")
    company_about: Optional[str] = Field(default=None, description="what is the company about")
    website_target: Optional[str] = Field(default=None, description="What is the objective of the website")
    integration: Optional[str] = Field(default=None, description="Does the client need any integration on the website")
    features_and_functionalities: Optional[str] = Field(default=None, description="Does the client need any specific features and functionalities")
    price_proposed: Optional[int] = Field(default=None, description="The price proposed by the agent")
    deal_closed: Optional[bool] = Field(default=None, description="The agent was able to close the deal or not")
    email: Optional[EmailStr] = Field(default=None, description="email of the client")


class NegotiationResult(BaseModel):
    deal_closed: Optional[bool] = Field(default=None, description="If the deal was closed or not")
    need_human: Optional[bool] = Field(default=None, description="if the client needs a human to talk to or not")
    alternative_proposal_offered: Optional[bool] = Field(default=None, description="if any alternative proposal was offered or not")
    alternative_proposal: Optional[str] = Field(default=None, description="alternative proposal if it was offered")
    alternative_proposal_accepted: Optional[bool] = Field(default=None, description="alternative offer was accepted or not")
    response: Optional[str] = Field(default=None, description="Response given to the client")
    customer_interested: bool = Field(default=False, description="true only and only if the customer accepts any of the proposal options else false")
    proposal_selected: Optional[str] = Field(default=None, description="which proposal did the client accept among option a or option b if the client accepted the proposal")