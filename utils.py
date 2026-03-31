from urllib.parse import quote_plus
import httpx
import os
from groq import Groq
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage,HumanMessage
import datetime
load_dotenv()


# ################## News utililies ##########################################


def generate_valid_news_url(keyword:str)->str:
    """
    Generate a Google News search URL for a keyword
    Args:
        keyword: search term to use in the news search
    Returns:
        str: constructed Google News Search URL
    """
    q=quote_plus(keyword)
    google=f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"

    return google

# from firecrawl import FirecrawlApp

# def scrape_with_firecrawl(url):
#     app = FirecrawlApp(api_key=os.getenv("FIRECRAWL_API_KEY"))
#     result = app.scrape(url, formats=["markdown","html"],only_main_content=False)
#     return result

def scrape_news_rss(url: str) -> list:
    headers = {"User-Agent": "Mozilla/5.0 PersonalScraper/1.0"}
    response = httpx.get(url, headers=headers, follow_redirects=True, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "xml")
    headlines = []
    for item in soup.find_all("item")[:20]:
        title_tag = item.find("title")
        if title_tag:
            headlines.append(title_tag.text.rsplit(" - ", 1)[0])
    return headlines

def extract_headlines(news_data):
    """
    Extracts only the headlines and links from Firecrawl's 
    output, handling both XML and Markdown formats.
    """
    if hasattr(news_data, 'markdown'):
        content = news_data.markdown
    elif isinstance(news_data, dict):
        content = news_data.get('markdown', str(news_data))
    else:
        content = str(news_data)

    soup = BeautifulSoup(content, "html.parser")
    items = soup.find_all('item')
    
    if not items:
        links = soup.find_all('a')
        return [{"headline": a.text, "link": a['href']} 
                for a in links if 'articles' in a.get('href', '')]
    headlines = []
    for item in items:
        title_tag = item.find('title')
        link_tag = item.find('link')
        if title_tag:
            raw_title = title_tag.get_text()
            clean_title = raw_title.rsplit(" - ", 1)[0]
            headlines.append({
                "headline": clean_title,
                "link": link_tag.get_text() if link_tag else "No Link Found"
            })
    return headlines

def get_headlines(data):
    news_list = extract_headlines(data)
    headlines=[]
    for entry in news_list:
        title=entry['headline']
        link=entry["link"]
        res_data=f"Title: {title} \n Link: {link}"
        headlines.append(title)
    return "\n".join(headlines)

def summarize_with_llm(api_key:str,headlines:str)->str:
    """
    Summarize Multiple news headlines into TTS-friendly broadcast news script.
    """
    SYSTEM_PROMPT="""
You are my personal news editor adn script writter for a news podcast. your job is to turn raw headlines into a clean, professional, and TTS-friendly news-script.

The final output will be read aloud by a news anchor or text-to-speech engine. So:
- Do not include special characters,emojis,formatting symbols, or markdown.
- DO not include any preamble or framing like "Here's your summary" or "Let me explain".
- write in full, clear, spoken-language paragraphs.
- keep the tone formal, professional, and broadcast-style - just like a real TV news script.
- focus on the most important headlines and turn them into short, infomative news segments that sound natural.
- start right away with the actual script, using transitions between topics if needed.

Remember: Your only output should be a clean script that is ready to read out loud.
"""

    try:
        client=Groq(api_key=api_key)
        completion=client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role":"system","content":SYSTEM_PROMPT},
                {"role":"user","content":headlines}
            ],
            temperature=0.5,
            max_tokens=1024
        )
        return completion.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"LLM's Error: {str(e)}") from e

def generate_news_url_to_scrape(list_of_keywords):
    valid_urls_dict={}
    for keyword in list_of_keywords:
        valid_urls_dict[keyword]=generate_valid_news_url(keyword)
    return valid_urls_dict


# ################## Reddit utililies ##########################################

def generate_valid_reddit_url(keyword:str)->str:
    """
    Generate a Google News search URL for a keyword
    Args:
        keyword: search term to use in the news search
    Returns:
        str: constructed Google News Search URL
    """
    q=quote_plus(keyword)
    reddit=f"https://www.reddit.com/r/{q}/"

    return reddit

def scrape_reddit_data(url):
    if not url.endswith('.json'):
        url = url.rstrip('/') + '.json'
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PersonalScraper/1.0'}
    try:
        response = httpx.get(url, headers=headers, follow_redirects=True,timeout=10)
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list):
            return data[0]['data']['children'][0]['data']['selftext']

        elif isinstance(data, dict):
            posts = data['data']['children']
            headlines=[]
            stories=[]
            for p in posts[:50]:
                title=p['data']['title']
                permalink=f"https://www.reddit.com{p['data']['permalink']}"
                stories.append(f"Headline: {title}\nLink: {permalink}\n")
                headlines.append(title)
                sources=permalink
            return "\n\n".join(headlines)

    except httpx.HTTPStatusError as e:
        return f"Reddit API Error ({e.response.status_code}): Check your URL or limits."
    except httpx.RequestError as e:
        return f"Network Error: Could not reach Reddit. {str(e)}"
    except (KeyError, IndexError):
        return "Parsing Error: Reddit changed their JSON structure or the page is empty."


def generate_reddit_url_to_scrape(list_of_keywords):
    valid_urls_dict={}
    for keyword in list_of_keywords:
        valid_urls_dict[keyword]=generate_valid_reddit_url(keyword)
    return valid_urls_dict

def generate_broadcast_news(api_key,news_data,reddit_data,topics):
    system_prompt="""You are a broadcast_news_writer, a professional virtual news reporter. Generate Natural, TTS-ready news reports using avaliable sources:

    for each topic, STRUCTURE BASED ON AVAILABLE DATA:
    1. If news exists, "According to official reports..."+summary.
    2. If reddit exists, "Online discussions on reddit reveal..."+summary.
    3. If both exist, Present News first, then reddit reactions.
    4. If neither exists: skip the topic (shouldn't happen) 
    Foramtting rules:
    - Always start directly with the content, NO INTRODUCTIONS.
    - Keep audio length 60-120 seconds per topic.
    - Use natural speech transitions like "Meanwhile, Online Discussions..".
    - Incorporate 1-2 short quotes from reddit when available.
    - Maintain neutral tone but highlight key sentiments.
    - End with "to wrap up this segment.." summary.

    Write in full paragraphs optimized for speech synthesis. Avoid Markdowns.
"""
    try:
        topic_blocks=[]
        for topic in topics:
            news_content=news_data["news_analysis"].get(topic) if news_data else ""
            reddit_content=reddit_data["reddit_analysis"].get(topic) if reddit_data else ""
            context=[]
            if news_content:
                context.append(f"OFFICIAL NEWS CONTENT: \n{news_content}")
            if reddit_content:
                context.append(f"REDDIT DISCUSSIONS CONTENT: \n{reddit_content}")

            if context:
                topic_blocks.append(
                    f"TOPIC: {topic}\n\n" + "\n\n".join(context)
                )
        user_prompt=(
            "Create broadcast segments for these topics using avaliable sources: \n\n"+"\n\n--- NEW TOPIC ---".join(topic_blocks)
        )
        llm=ChatGroq(api_key=os.getenv("GROQ_API_KEY"),model="llama-3.3-70b-versatile",temperature=0.03,max_tokens=4000)

        response=llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        return response.content
    
    except Exception as e:
        raise e
    

from gtts import gTTS
import datetime

def text_to_audio_gtts(
        text: str,
        output_dir: str = "audio"
) -> str:
    try:
        os.makedirs(output_dir, exist_ok=True)
        filename = f"tts_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        filepath = os.path.join(output_dir, filename)
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(filepath)
        return filepath
    except Exception as e:
        raise e
