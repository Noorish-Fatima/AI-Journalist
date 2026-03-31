from fastmcp import FastMCP
from utils import scrape_reddit_data, generate_reddit_url_to_scrape
from typing import List

mcp = FastMCP("reddit_tools")

@mcp.tool()
def fetch_reddit_posts(topics: List[str]) -> str:
    urls = generate_reddit_url_to_scrape(topics)
    all_headlines = []
    for url in urls.values():
        data = scrape_reddit_data(url)
        all_headlines.append(data)
    return "\n".join(all_headlines)

if __name__ == "__main__":
    mcp.run(transport="stdio")