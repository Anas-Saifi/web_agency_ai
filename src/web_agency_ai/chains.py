import os
import operator
import json
import logging
import warnings
from pathlib import Path
from typing import Annotated, TypedDict
import asyncio
from dotenv import load_dotenv

load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, MessagesState, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import InMemorySaver
from langchain.messages import AIMessage
from langgraph.types import Command
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI

try:
    from web_agency_ai.tools import get_all_tools, get_hubspot_tools
    from web_agency_ai.schemas import UserInfo, NegotiationResult
    from web_agency_ai.hubspot_mcp_client import HubSpotMCPClient
    from web_agency_ai.google_calendar_mcp import get_calendar_tools
except ImportError:
    from tools import get_all_tools, get_hubspot_tools
    from schemas import UserInfo, NegotiationResult
    from hubspot_mcp_client import HubSpotMCPClient
    from google_calendar_mcp import get_calendar_tools

logging.getLogger("langgraph.checkpoint").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message="Deserializing unregistered type")

PRICING_FILE_PATH = Path(__file__).resolve().parent / "pricing.txt"

parser = PydanticOutputParser(pydantic_object=UserInfo)
parser2 = PydanticOutputParser(pydantic_object=NegotiationResult)

nvidia_model = ChatOpenAI(
    model="deepseek-ai/DeepSeek-V4.1-Flash",
    base_url="https://api-cdn.thehive.ai/api/v3",
    temperature=0,
    api_key=os.environ.get("HIVE_API_KEY", ""),
    streaming=True,
    max_retries=3
)

def extract_bot_text(message) -> str:
    if isinstance(message, str):
        return message
    content = getattr(message, "content", message)
    if isinstance(content, list):
        raw = "".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    else:
        raw = str(content)

    raw = raw.strip()

    if raw.startswith("{"):
        try:
            data = json.loads(raw)
            if isinstance(data, dict) and "response" in data:
                return data["response"]
        except json.JSONDecodeError:
            pass

    return raw


def merge_info(current: UserInfo, update: UserInfo) -> UserInfo:
        return current.model_copy(update=update.model_dump(exclude_none=True))


class State(MessagesState):
    user_info: Annotated[UserInfo, merge_info]
    query: str
    company: str
    budget: int
    special_requirements: str
    urgency: str
    name: str
    submitted: bool
    type_of_website: str
    company_about: str
    website_target: str
    integration: str
    features_and_functionality: str
    proposal: str
    negotiation_info: NegotiationResult
    negotiation_attempts: int
    hubspot_details_fetched: bool
    crm_tool_result: Annotated[list[str], operator.add]
    record_inserted: bool
    calendar_tool_result: Annotated[list[str], operator.add]
    customer_interested: bool
    deal_finalised: bool
    event_created: bool


input_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a helpful assistant of a website making agency\n"
            "You are required to talk to clients that have shown interest in the agency\n"
            "You have to know about the following information about the clients:-\n"
            "name: name of the client\n"
            "company: name of the company of the client\n"
            "budget: budget of the client\n"
            "type_of_website: which type of website the client wants\n"
            "company_about: what is the company about\n"
            "website_target: What is the target of the website\n"
            "integration: what integrations does the client need\n"
            "features_and_functionalities: what specific features and functionality does the client need\n"
            "email: email of the client"
        ),
        (
            "human",
            "query: {query}"
        )
    ]
)

injection_prompt = ChatPromptTemplate.from_messages(
     [
          (
               "system",
               "You are a helpful assistant for a website making agency\n"
               "You have the following information about the client\n"
               "name: name of the client\n"
                "company: name of the company of the client\n"
                "budget: budget of the client\n"
                "type_of_website: which type of website the client wants\n"
                "company_about: what is the company about\n"
                "website_target: What is the target of the website\n"
                "integration: what integrations does the client need\n"
                "features_and_functionalities: what specific features and functionality does the client need\n"
               "the database has a 'public.client_information' table\n"
               "the table contains the following columns\n"
               "name: text\n"
               "company: text\n"
               "budget: int\n"
               "type_of_website: text\n"
               "company_about: text\n"
                "website_target: text\n"
                "integration: text\n"
                "features_and_functionalities: text\n"
               "you have access to the tool called 'execute_sql' to insert the data to the database\n"
               "do not attempt to inspect the schema and objects, the schema above is authoritative\n"
          ),
          (
               "human",
               "information: {information}"
          )
     ]
)

mcp_client = HubSpotMCPClient()


async def build_graph(mcp_client=None, checkpointer=None):
    if mcp_client is None:
        mcp_client = HubSpotMCPClient()
    llm_tools = await get_all_tools()

    llm_with_structured_output = nvidia_model

    input_chain = input_prompt | llm_with_structured_output

    tool_node = ToolNode(llm_tools)

    hubspot_tools = await get_hubspot_tools(mcp_client)

    get_user_details = next(
    t for t in hubspot_tools
    if t.name == "get_user_details"
)

    manage_crm_objects = next(
        t for t in hubspot_tools
        if t.name == "manage_crm_objects"
    )


    tool_node = ToolNode(llm_tools)

    llm_with_tools = nvidia_model.bind_tools(llm_tools)


    llm_with_get_user_details_tools = nvidia_model.bind_tools([get_user_details])
    llm_with_manage_crm_objects = nvidia_model.bind_tools(hubspot_tools)

    hubspot_tool_node = ToolNode(hubspot_tools)

    calendar_tools = await get_calendar_tools()

    llm_with_calendar_tools = nvidia_model.bind_tools(calendar_tools)

    injection_chain = injection_prompt | llm_with_tools

    def input_node(state: State):
        res = input_chain.invoke(f"current state: {state}, user's message: {state['messages']}\n" f"Extract any missing field this message answers and ONLY respond with json schema: {parser.get_format_instructions()}.")
        user_info = parser.parse(res.content)
        return {"user_info": user_info}

    async def injection_node(state: State):
        res = await injection_chain.ainvoke({"information": state["user_info"]})
        return {"messages": [res]}

    def ask_node(state: State):
        with open(PRICING_FILE_PATH, "r", encoding="utf-8") as f:
            text = f.read()
        ask_llm = nvidia_model
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful ai assistant working at web agency\n"
                    "Your responsibility is to extract information from the user\n"
                    "You have to extract the following information from the user\n"
                    "name: name of the client\n"
                    "company: name of the company of the client\n"
                    "budget: budget of the client\n"
                    "type_of_website: which type of website the client wants\n"
                    "company_about: what is the company about\n"
                    "website_target: What is the target of the website\n"
                    "integration: what integrations does the client need\n"
                    "features_and_functionalities: what specific features and functionality does the client need\n"
                    "whatever information is not present, ask it\n"
                    "if any field is none, expilicitly ask for it without assuming none\n"
                    "whatever information is not present, ask it\n"
                    "you have a full document of what the company offers: \n"
                    "{text}\n"
                    "When asking questions, list the relevant services from the document that the agency provides\n"
                    "only list the services not the prices\n"
                ),
                (
                    "human",
                    "{user_info}"
                )
                
            ]
        )
        node_chain = prompt | ask_llm
        msg = node_chain.invoke({"user_info": state["user_info"], "text": {text}})
        return {"messages": [msg]}

    def should_continue(state: State):
        info = state["user_info"]
        if state.get("proposal"):
            return "negotiation_node"
        if state.get("submitted"):
            return "ask_node"
        if all([info.company, info.budget, info.name, info.company_about, info.website_target, info.integration, info.features_and_functionalities]):
            return "injection_node"
        return "ask_node"

    def should_tool_call(state: State):
        if state["messages"][-1].tool_calls:
            return "tool"
        return END

    def after_tool(state: State):
        info = state["user_info"]
        if all([info.company, info.budget, info.name, info.company_about, info.website_target, info.integration, info.features_and_functionalities]):
            return {"submitted": True}



    def proposal_node(state: State):
        with open(PRICING_FILE_PATH, "r", encoding="utf-8") as f:
            text = f.read()

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful assistant working for a website making agency\n"
                    "you have the following information about the client\n"
                    "name: name of the client\n"
                    "company: name of the company of the client\n"
                    "budget: budget of the client\n"
                    "type_of_website: which type of website the client wants\n"
                    "company_about: what is the company about\n"
                    "website_target: What is the target of the website\n"
                    "integration: what integrations does the client need\n"
                    "features_and_functionalities: what specific features and functionality does the client need\n"
                    "also you have the document from your company about the services you offer and their respective prices\n"
                    "{text}\n"
                    "draft a curated and professional proposal to the client listing the price according to the docs provided and the client's budget\n"
                    "you do not have to stick with the client's budget, if the services listed are costlier than the budget, tell the client to increase it or decrease the services\n"
                    "your main job is to maximise the profit while also offering the best services tailored to the client needs\n"
                    "if the budget is less than required, give only two options, increase the budget or give services that can be offered within the client's budget\n"
                    "act like you are actually talking to a client, do not put any placeholders in the response\n"
                    
                ),
                (
                    "human",
                    "client's info: {client_info}"
                )

            ]
        )

        llm = nvidia_model

        proposal_chain = prompt | llm

        res = proposal_chain.invoke({"text": text, "client_info": state["user_info"]})

        return {"proposal": res.content, "messages": res}

    def should_propose(state: State):
        if state["submitted"]:
            return "proposal_node"
        return END


    def negotiation(state: State):
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful assistant working for a website making agency\n"
                    "You are interacting with a potential client who has been given the following proposal\n"
                    "{proposal}\n"
                    "your main job is to close the deal with the client while maximising the profit\n"
                    "you have the liberty to offer 10 percent off from the proposal, not more than that\n"
                    "you can only give discount to the costlier proposal not to the budget one\n"
                    "try to keep the proposal as high as possible\n"
                    "if you think the client is losing interest, offer to talk to an executive\n"
                    "if the client tries to lower the price down, politely decline and list the benefits they would be getting in the proposed price\n"
                    "if the client's offer is absurdly low, tell them to increase the budget, if they don't politely decline the offer\n"
                    "act like you are actually talking to a client, do not put any placeholders in the response\n"
                    "ONLY RESPOND WITH JSON SCHEMA: {schema}"
                    
                ),

                (
                    "human",
                    "client_info: {client_info}"
                )
            ]
        )

        attempts = state.get("negotiation_attempts", 0) + 1

        llm = nvidia_model

        negotiation_chain = prompt | llm

        res = negotiation_chain.invoke({"proposal": state["proposal"], "client_info": state["user_info"], "schema": parser2.get_format_instructions()})
        negotiation_info = parser2.parse(res.content)
        return {"negotiation_info": negotiation_info, "messages": res, "negotiation_attempts": attempts}


    def negotiation_finalisation(state: State):
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful assistant working for a website making agency\n"
                    "Your task is to finalise the details for a potential client\n"
                    "you will have all the details about the client and what outcome was of the negotiation\n"
                    "if the client is interested, summarize the whole deal\n"
                    "then ask for the client to say 'i accept'\n"
                ),
                (
                    "human",
                    "info about client: {client_info}\n"
                    "info about deal: {deal_info}\n"
                )
            ]
        )

        llm = nvidia_model
        finalisation_chain = prompt | llm

        res = finalisation_chain.invoke({"client_info": state["user_info"], "deal_info": state["negotiation_info"]})

        return {"messages": res.content, "deal_finalised": True}



    async def crm_injection_node(state: State):
        details_fetched = state.get("hubspot_details_fetched", False)

        if not details_fetched:
            # First pass: only allow the lookup tool
            system_msg = (
                "You are a helpful assistant working at a website making agency.\n"
                "Your first task is to fetch the client's existing HubSpot contact "
                "record using get_user_details, using the client's email to look them up.\n"
                "Call get_user_details exactly once. Do not call any other tool yet."
            )
            active_llm = llm_with_get_user_details_tools  # bound with ONLY get_user_details
            prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system", system_msg
                    ),
                    (
                        "human",
                        "client_info: {client_info}\n"
                        "deal information: {deal_info}\n"
                    )
                ]
            )
            crm_injection_chain = prompt | active_llm
    
            res = await crm_injection_chain.ainvoke(
                {
                    "client_info": state["user_info"],
                    "deal_info": state["negotiation_info"],
                }
            )
    
            return {"messages": [res]}
            

        else:
            # Second pass: details already fetched, only allow the insert/update tool
            system_msg = (
                "You are a helpful assistant working at a website making agency.\n"
                "Your responsibility is to input data to the CRM.\n"
                "You already have the following information about the client:\n"
                "name: name of the client\n"
                "company: company of the client\n"
                "email: email of the client\n"
                "company about: information of the client's company\n"
                "All this information is in the state. Do not call get_user_details\n"
                "the only information you have to insert is, not more than this:- \n"
                "store name in the property 'firstname'\n"
                "store company in the property 'company_name'\n"
                "store company_about in the property 'company_about'\n"
                "store deal_closed in the property 'deal_closed'\n"
                "store budget in the property 'budget'\n"
                "store type_of_website in the property 'type_of_website'\n"
                "store integration in the property 'integration'\n"
                "store features_and_functionalities in the property 'features_and_functionalities'\n"
                "store email in the property 'email'\n"
                "store need_human in the property 'need_human'\n"
                "you have all of this information present in the state\n"
                "do not check for schema and availability, you already have that\n"
                "save the name, email in 'Contact'\n"
                "save the rest (ONLY company_name, compnay_about, deal_closed, budget, type_of_website, integration, features_and_functionalities, need_human) as a new deal under pipeline 'default'\n"
                "if deal is closed successfully, save it under stage name 'closedwon'\n"
                "otherwise save it under stage name 'closedlost'\n"
                "tool to insert deal and contact is manage_crm_objects\n"
                "do not look for write availability, you already have it\n"
                "do not try to verify anything\n"
                
            )
            active_llm = llm_with_manage_crm_objects  # bound with ONLY insert/update tool

            prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system_msg),
                    (
                        "human",
                        "client info: {client_info}\n"
                        "deal information: {deal_info}\n"
                        "schema and availability: {schema}\n"
                        "last tool call result: {result}"
                    ),
                ]
            )
            crm_injection_chain = prompt | active_llm
                
            res = await crm_injection_chain.ainvoke(
                {
                    "client_info": state["user_info"],
                    "deal_info": state["negotiation_info"],
                    "schema": state["messages"][-1].content,
                    "result": state.get("crm_tool_result")
                }
            )
    
            return {"messages": [res]}

            

        



    def should_crm_injection(state: State):
        if state["negotiation_attempts"] > 3 and state["negotiation_info"].customer_interested == False:
            return "crm_injection_node"
        if state["negotiation_info"].customer_interested == True and state.get("deal_finalised", False) == False:
            return "finalisation_node"
        if state.get("deal_finalised"):
            return "crm_injection_node"
        
        return END

    def should_crm_call(state: State):
        if state.get("record_inserted", False):
            return "create_google_event"
        if state["messages"][-1].tool_calls:
            return "hubspot_tool_node"
        return END


    def mark_details_fetched(state: State):
        last_msg = state["messages"][-1]  # the ToolMessage just produced
    # find the AIMessage before it to know which tool was called
        for msg in reversed(state["messages"]):
            if isinstance(msg, AIMessage) and msg.tool_calls:
                called = {tc["name"] for tc in msg.tool_calls}
                if "get_user_details" in called:
                    return {"hubspot_details_fetched": True}
                break

        for msg in reversed(state["messages"]):
                    if isinstance(msg, AIMessage) and msg.tool_calls:
                        called = {tc["name"] for tc in msg.tool_calls}
                        if "manage_crm_objects" in called:
                            return {"record_inserted": True}
                        break
        return {"crm_tool_result": [state["messages"][-1].content]}


    async def create_google_event(state: State):
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful assistant that works in a website making agency\n"
                    "Your job is to create google calendar events for the employees meeting with the clients\n"
                    "you have the following information about the client\n"
                    "name, company, proposal, deal_closed, budget\n"
                    "you have to create a calendar event for the employee with the title of 'client meeting' along with the client's details\n"
                    "the timing of the meeting should be the next consecutive day, and the meeting start time should be between 12pm to 4pm\n"
                    "you are provided with the previous tool call result if any for context and information\n"
                    "previous tool call result: {result}"
                ),
                (
                    "human",
                    "client's info: {info}\n"
                )
            ]
        )

        create_event_chain = prompt | llm_with_calendar_tools

        res = await create_event_chain.ainvoke({"info": state["negotiation_info"], "result": state.get("calendar_tool_result")})
        return {"messages": [res]}

    calendar_tool_node = ToolNode(calendar_tools)

    def should_calendar_tools_continue(state: State):
        if state["messages"][-1].tool_calls and state.get("event_created", False) == False:
            return "calendar_tools"
        for msg in reversed(state["messages"]):
            if isinstance(msg, AIMessage) and msg.tool_calls:
                called = {tc["name"] for tc in msg.tool_calls}
                if "create-event" in called:
                    return "client_teller"
        return "client_teller"

    def after_calendar_tool_node(state: State):
        for msg in reversed(state["messages"]):
            if isinstance(msg, AIMessage) and msg.tool_calls:
                called = {tc["name"] for tc in msg.tool_calls}
                if "create-event" in called:
                    return {"event_created": True}
        return {"calendar_tool_result": [state["messages"][-1].content]}

    def client_teller(state: State):
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "you are an assistant working at a website making agency\n"
                    "a meeting has been fixed for the client\n"
                    "you have to tell the client about the meeting\n"
                    "you have all the necessary information about the meeting, client and negotiation\n"
                    "act like you are actually talking to a client, do not ask for any improvements or adjustments\n"
                ),
                (
                    "human",
                    "client info: {client_info}\n"
                    "meeting info: {meeting_info}\n"
                    "negotiation info: {negotiation_info}\n"
                )
            ]
        )

        teller_llm = nvidia_model
        teller_chain = prompt | teller_llm

        res = teller_chain.invoke({"client_info": state["user_info"], "meeting_info": state["messages"][-1].content, "negotiation_info": state["negotiation_info"]})
        return {"messages": res.content}

    build = StateGraph(state_schema = State)
    build.add_node("input", input_node)
    build.add_node("injection_node", injection_node)
    build.add_node("tool", tool_node)
    build.add_edge("injection_node", "tool")
    build.set_entry_point("input")
    build.add_conditional_edges("injection_node", should_tool_call, path_map={"tool": "tool", END: END})
    build.add_node("ask_node", ask_node)
    build.add_conditional_edges("input", should_continue, path_map={"injection_node": "injection_node", "ask_node": "ask_node", "negotiation_node": "negotiation_node"})
    build.add_edge("ask_node", END)
    build.add_node("after_tool", after_tool)
    build.add_edge("tool", "after_tool")
    build.add_node("propose", proposal_node)
    build.add_conditional_edges("after_tool", should_propose, path_map = {"proposal_node": "propose", END: END})
    build.add_node("negotiation_node", negotiation)
    build.add_node("crm_injection_node", crm_injection_node)
    build.add_node("finalisation_node", negotiation_finalisation)
    build.add_conditional_edges("negotiation_node", should_crm_injection, path_map = {"crm_injection_node": "crm_injection_node", END: END, "finalisation_node": "finalisation_node"})
    build.add_node("hubspot_tool_node", hubspot_tool_node)
    build.add_node("after_hubspot", mark_details_fetched)
    build.add_edge("hubspot_tool_node", "after_hubspot")
    build.add_edge("after_hubspot", "crm_injection_node")
    build.add_node("create_google_event", create_google_event)
    build.add_node("calendar_tools", calendar_tool_node)
    build.add_node("client_teller", client_teller)
    build.add_conditional_edges("create_google_event", should_calendar_tools_continue, path_map = {"client_teller": "client_teller", "calendar_tools": "calendar_tools"})
    build.add_conditional_edges("crm_injection_node", should_crm_call, path_map = {"hubspot_tool_node": "hubspot_tool_node", END: END, "create_google_event": "create_google_event"})
    build.add_node("after_calendar_tool_node", after_calendar_tool_node)
    build.add_edge("calendar_tools", "after_calendar_tool_node")
    build.add_edge("after_calendar_tool_node", "create_google_event")
    build.add_edge("finalisation_node", END)
    build.add_edge("client_teller", END)

    if checkpointer is None:
        checkpointer = InMemorySaver()
    graph = build.compile(checkpointer=checkpointer)

    try:
        graph.get_graph().draw_mermaid_png(output_file_path=str(Path(__file__).resolve().parent / "graph.png"))
    except Exception:
        pass

    return graph



if __name__ == "__main__":
    
    async def main():

        mcp_client = HubSpotMCPClient()

        try:
            await mcp_client.connect()

            graph = await build_graph(mcp_client)

            config = {
                "configurable": {
                    "thread_id": "client_1"
                }
            }
            graph.get_graph().draw_mermaid_png(output_file_path="graph.png")

            def extract_bot_text(message) -> str:
                if isinstance(message.content, list):
                    raw = "".join(
                        block["text"]
                        for block in message.content
                        if block.get("type") == "text"
                    )
                else:
                    raw = message.content

                raw = raw.strip()

                if raw.startswith("{"):
                    try:
                        data = json.loads(raw)
                        if isinstance(data, dict) and "response" in data:
                            return data["response"]
                    except json.JSONDecodeError:
                        pass

                return raw

            while True:
                user_input = input("You: ")

                if user_input.lower() in {"exit", "quit"}:
                    break

                result = await graph.ainvoke(
                    {"messages": [("human", user_input)]},
                    config=config,
                )

                while "__interrupt__" in result:
                    result = await graph.ainvoke(
                        Command(resume=True),
                        config=config,
                    )

                message = result["messages"][-1]
                text = extract_bot_text(message)
                print(f"Bot: {text}")
        finally:

            await mcp_client.close()


    asyncio.run(main())
