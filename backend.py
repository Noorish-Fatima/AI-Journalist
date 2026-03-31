from fastapi import FastAPI,HTTPException,File,Response
from dotenv import load_dotenv
from models import NewsRequest
import asyncio
from utils import *
import os
from news_scraper import NewsScraper
from reddit_scraper import scrape_reddit

app=FastAPI()
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate_news_audio")
async def generate_news_audio(request:NewsRequest):
    print(f"# -  Request received: {request.topics}, {request.source_type}")
    try:
        results={}
        if request.source_type == "both":
            news_scraper = NewsScraper()
            results["news"], results["reddit"] = await asyncio.gather(
                news_scraper.scrape_news(request.topics),
                scrape_reddit(request.topics)
            )
        elif request.source_type == "news":
            news_scraper = NewsScraper()
            results["news"] = await news_scraper.scrape_news(request.topics)
        elif request.source_type == "reddit":
            results["reddit"] = await scrape_reddit(request.topics)
        news_data=results.get("news",{})
        reddit_data=results.get("reddit",{})

        # # setup LLM summarizer
        news_summary=generate_broadcast_news(api_key=os.getenv("GROQ_API_KEY"),
                            news_data=news_data,
                            reddit_data=reddit_data,
                            topics=request.topics)
        print(f"# - Summary generated.")
        # # # convert summary audio
        audio_path = text_to_audio_gtts(
            text=news_summary,
            output_dir="audio"
            )
        print(f"# -  Audio saved to: {audio_path}")
        if audio_path:
            with open(audio_path,"rb") as f:
                audio_bytes=f.read()

            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={"Content-Disposition":"attachment; filename=news-summary.mp3"}
            )

    except Exception as e:
       import traceback
       error_trace = traceback.format_exc()
       print(f">>> FULL ERROR:\n{error_trace}")
       raise HTTPException(status_code=500,detail=str(error_trace))

if __name__=="__main__":
    import uvicorn
    uvicorn.run(
        "backend:app",
        host="0.0.0.0",
        port=1234,
        reload=True
    )


