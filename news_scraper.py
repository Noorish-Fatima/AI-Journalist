from utils import *
from dotenv import load_dotenv
from aiolimiter import AsyncLimiter
import os
import asyncio
from typing import Dict,List

load_dotenv()

class NewsScraper:
    _rate_limiter=AsyncLimiter(5,1)
    async def scrape_news(self,topics:List[str])->Dict[str,str]:
        """Scrape and analyze news article"""
        results={}
        for topic in topics:
            async with self._rate_limiter:
                try:
                    urls=generate_news_url_to_scrape([topic])
                    all_headlines=[]
                    if isinstance(urls,dict):
                        target_urls=urls.values()
                    else:
                        target_urls=urls
                    for url in target_urls:
                        headlines = scrape_news_rss(url)
                        results[topic] = "\n".join(headlines)

                except Exception as e:
                    results[topic]=f"Error: {str(e)}"
                await asyncio.sleep(1)

        return {"news_analysis":results}

