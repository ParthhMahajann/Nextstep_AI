import os
import sys
import django
import requests

# ---------- FIX PATH ----------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.append(PROJECT_DIR)

# ---------- Django setup ----------
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "nextstep.settings"
)
django.setup()

from core.models import Job


# ---------- Config ----------
REDDIT_URL = "https://www.reddit.com/r/forhire/new.json?limit=30"
HEADERS = {"User-Agent": "NextStepAI/0.1"}

INTERNSHIP_KEYWORDS = [
    "intern", "internship", "student", "junior",
    "entry level", "college", "unpaid", "part-time"
]


def is_internship(text: str) -> bool:
    text = text.lower()
    return any(keyword in text for keyword in INTERNSHIP_KEYWORDS)


# ---------- Fetch Data ----------
try:
    response = requests.get(REDDIT_URL, headers=HEADERS, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    posts = data.get("data", {}).get("children", [])
    
    saved_count = 0
    
    for post in posts:
        post_data = post.get("data", {})
    
        title = post_data.get("title", "")
        selftext = post_data.get("selftext", "")
        permalink = post_data.get("permalink", "")
    
        content = f"{title} {selftext}"
    
        # Filter internships
        if not is_internship(content):
            continue
    
        # Basic deduplication (by Reddit link)
        reddit_url = f"https://www.reddit.com{permalink}"
        if Job.objects.filter(apply_link=reddit_url).exists():
            continue
    
        Job.objects.create(
            title=title[:255],
            company="Reddit (r/forhire)",
            location="Remote",
            description=selftext if selftext else title,
            job_type="internship",
            apply_link=reddit_url,
            source="reddit_forhire_json"
        )
    
        saved_count += 1
    
    print(f"Saved {saved_count} internship posts from r/forhire.")

except requests.exceptions.RequestException as e:
    print(f"Error fetching Reddit data: {e}")
except Exception as e:
    print(f"Error processing posts: {e}")