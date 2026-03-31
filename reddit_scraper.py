from typing import List 
import os
import asyncio 
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
from aiolimiter import AsyncLimiter
from datetime import datetime, timedelta
from fastmcp import FastMCP
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage,SystemMessage
load_dotenv()

mcp=FastMCP("scrape_reddit")
model=ChatGroq(api_key=os.getenv("GROQ_API_KEY"),model="llama-3.3-70b-versatile")

server_params=StdioServerParameters(
    command="python",
    args=["mcp_reddit.py"],
    env=None
)

mcp_limiter=AsyncLimiter(1,15)
two_weeks_ago=datetime.today()-timedelta(days=14)
two_weeks_ago_str=two_weeks_ago.strftime('%Y-%m-%d')


async def process_topic(agent, topic:str):
    async with mcp_limiter:
        messages=[
            SystemMessage(
                content=f"""you are a reddit analysis expert. Use available tools to:
                1. Find top 2 posts about the given topic BUT only after {two_weeks_ago_str}, Nothing before two week strictly.
                2. Analysis their content and sentiment.
                3. create a summary of discussions and overall content"""
            ),
            HumanMessage(content=f"""Analyze reddit posts about '{topic}'.
                Provide a Comprehensive summary including:
                 - Main Discussion Points
                 - Key opinions expressed
                 - Any notable trends or patterns
                 - Summarize the overall narrative, discussion points and also quote interesting comments without mentions 
                 - overall sentiment (positive/negative)      
                """
            )
        ]
        try:
            response=await agent.ainvoke({"messages":messages})
            return response["messages"][-1].content
        except Exception as e:
            raise e 

@mcp.tool()
async def scrape_reddit(topics: List[str]):
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)
            
            model = ChatGroq(
                api_key=os.getenv("GROQ_API_KEY"),
                model="llama-3.3-70b-versatile"
            )
            agent = create_react_agent(model, tools)
            summary = await process_topic(agent, topics)
            return {"reddit_analysis": {topics[0]: summary}}

async def main():
    mcp.run(transport="stdio")

if __name__=="__main__":
    asyncio.run(main())

