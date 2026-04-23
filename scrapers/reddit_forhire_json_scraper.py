import os
import sys
import django
import requests

# ---------- FIX PATH ----------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.append(PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # scrapers/ dir

# ---------- Django setup ----------
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "nextstep.settings"
)
django.setup()

from core.models import Job
from job_filter import passes_all_filters


# ---------- Config ----------
REDDIT_URL = "https://www.reddit.com/r/forhire/new.json?limit=50"
HEADERS = {"User-Agent": "NextStepAI/0.1"}

INTERNSHIP_KEYWORDS = [
    "intern", "internship", "student", "junior",
    "entry level", "college", "unpaid", "part-time"
]

REMOTE_OR_INDIA_KEYWORDS = [
    "remote", "india", "bangalore", "bengaluru", "mumbai", "delhi",
    "hyderabad", "pune", "chennai", "kolkata", "noida", "gurgaon",
    "work from home", "wfh", "anywhere", "worldwide", "global",
]


def is_internship(text: str) -> bool:
    text = text.lower()
    return any(keyword in text for keyword in INTERNSHIP_KEYWORDS)


def is_relevant(title: str, body: str) -> bool:
    """Only keep jobs that are remote or India-based and written in English."""
    combined = f"{title} {body}".lower()
    location_ok = any(kw in combined for kw in REMOTE_OR_INDIA_KEYWORDS)
    # Use centralised filter for robust language + location check
    return location_ok and passes_all_filters(
        title=title,
        description=body,
        location="Remote" if "remote" in combined else "not specified",
    )


# ---------- Fetch Data ----------
try:
    response = requests.get(REDDIT_URL, headers=HEADERS, timeout=10)
    response.raise_for_status()

    data = response.json()
    posts = data.get("data", {}).get("children", [])

    saved_count = 0
    skipped_count = 0

    for post in posts:
        post_data = post.get("data", {})

        title    = post_data.get("title", "")
        selftext = post_data.get("selftext", "")
        permalink = post_data.get("permalink", "")

        # Only [Hiring] posts
        if "[hiring]" not in title.lower():
            continue

        content = f"{title} {selftext}"

        # Language + location gate
        if not is_relevant(title, selftext):
            skipped_count += 1
            continue

        # Basic deduplication (by Reddit link)
        reddit_url = f"https://www.reddit.com{permalink}"
        if Job.objects.filter(apply_link=reddit_url).exists():
            continue

        job_type = "internship" if is_internship(content) else "job"

        Job.objects.create(
            title=title[:255],
            company="Reddit (r/forhire)",
            location="Remote",
            description=selftext if selftext else title,
            job_type=job_type,
            apply_link=reddit_url,
            source="reddit_forhire_json"
        )

        saved_count += 1

    print(f"Saved {saved_count} posts from r/forhire (skipped {skipped_count} non-English/non-India).")

except requests.exceptions.RequestException as e:
    print(f"Error fetching Reddit data: {e}")
except Exception as e:
    print(f"Error processing posts: {e}")