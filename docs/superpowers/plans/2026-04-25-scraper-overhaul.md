# Scraper Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the NextStep AI scraper pipeline to production quality — add four new India/remote job sources (Adzuna, The Muse, Wellfound, Unstop), fix Internshala and Reddit, introduce Celery + Redis for distributed task execution, and wire all sources onto individual Beat schedules.

**Architecture:** Each scraper is an independent `shared_task` in `scrapers/tasks.py`, executed by Celery workers on two queues (`api_queue` for HTTP APIs, `scraper_queue` for HTML scraping). Celery Beat fires each task on its own cron schedule. All existing `BaseScraper` / `DataValidator` / `job_filter` contracts remain untouched — only the execution layer and new scraper files change.

**Tech Stack:** Python 3.12, Django 6, Celery 5.3, Redis 5, BeautifulSoup4, requests, pytest-django, unittest.mock

---

## Project Structure Map

```
D:\Nextstep_AI\
  requirements.txt                   MODIFY — add celery[redis], redis, pytest-django
  scrapers/
    __init__.py                       CREATE (empty) — makes scrapers a Python package
    tasks.py                          CREATE — all Celery shared_task definitions
    adzuna_scraper.py                 CREATE
    themuse_scraper.py                CREATE
    wellfound_scraper.py              CREATE
    unstop_scraper.py                 CREATE
    internshala_scraper.py            REWRITE (fix broken CSS selectors)
    multi_reddit_scraper.py           MODIFY (add OAuth token fetch)
    ncs_scraper.py                    DELETE
    run_all_scrapers.py               MODIFY (add new scrapers, remove NCS)
  nextstep/
    pytest.ini                        CREATE
    conftest.py                       CREATE (adds scrapers dir to sys.path for tests)
    nextstep/
      __init__.py                     MODIFY (import celery app)
      settings.py                     MODIFY (add Celery broker/backend env vars)
      celery.py                       CREATE (Celery app + Beat schedule)
    core/
      management/commands/
        scraper_status.py             CREATE (management command)
      tests/
        test_scrapers.py              CREATE (scraper unit tests using mocks)
```

---

## Task 1: Add dependencies and pytest infrastructure

**Files:**
- Modify: `requirements.txt`
- Create: `nextstep/pytest.ini`
- Create: `nextstep/conftest.py`

- [ ] **Step 1: Update requirements.txt**

Open `D:\Nextstep_AI\requirements.txt` and replace the commented-out Celery lines with the real packages:

```
# Django & Core
Django>=5.0,<7.0
psycopg2-binary>=2.9
dj-database-url>=2.1

# Django REST Framework
djangorestframework>=3.14
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=23.5

# Data Scraping
requests>=2.31
beautifulsoup4>=4.12
lxml>=5.1

# Scheduling
apscheduler>=3.10

# Async Tasks
celery[redis]>=5.3
redis>=5.0

# ML & NLP (Phase 2)
scikit-learn>=1.4
sentence-transformers>=2.2
numpy>=1.26

# AI Integration
groq>=0.4.0
openai>=1.10

# Development
python-dotenv>=1.0
pytest>=7.4
pytest-django>=4.7

# Resume File Parsing
PyPDF2>=3.0
python-docx>=1.1
```

- [ ] **Step 2: Create nextstep/pytest.ini**

Create `D:\Nextstep_AI\nextstep\pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = nextstep.settings
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

- [ ] **Step 3: Create nextstep/conftest.py**

Create `D:\Nextstep_AI\nextstep\conftest.py`:

```python
import sys
import os

# Add scrapers directory to sys.path so scraper modules are importable in tests
_scrapers_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scrapers')
if _scrapers_dir not in sys.path:
    sys.path.insert(0, _scrapers_dir)
```

- [ ] **Step 4: Install new packages**

Run from `D:\Nextstep_AI\`:
```bash
pip install celery[redis]>=5.3 redis>=5.0 pytest>=7.4 pytest-django>=4.7
```

Expected: packages install without errors.

- [ ] **Step 5: Commit**

```bash
git add requirements.txt nextstep/pytest.ini nextstep/conftest.py
git commit -m "chore: add celery, redis, pytest-django dependencies"
```

---

## Task 2: Create Celery app and update Django init

**Files:**
- Create: `nextstep/nextstep/celery.py`
- Modify: `nextstep/nextstep/__init__.py`
- Modify: `nextstep/nextstep/settings.py`
- Create: `scrapers/__init__.py`

- [ ] **Step 1: Write failing test for Celery app import**

Create `D:\Nextstep_AI\nextstep\core\tests\test_celery.py`:

```python
def test_celery_app_importable():
    from nextstep.celery import app
    assert app.main == 'nextstep'

def test_celery_app_has_two_queues():
    from nextstep.celery import app
    queue_names = {q.name for q in app.conf.task_queues or []}
    assert 'api_queue' in queue_names
    assert 'scraper_queue' in queue_names
```

- [ ] **Step 2: Run test to verify it fails**

Run from `D:\Nextstep_AI\nextstep\`:
```bash
pytest core/tests/test_celery.py -v
```
Expected: `ImportError: cannot import name 'celery' from 'nextstep'`

- [ ] **Step 3: Create scrapers/__init__.py**

Create `D:\Nextstep_AI\scrapers\__init__.py` (empty file):
```python
```

- [ ] **Step 4: Create nextstep/nextstep/celery.py**

Create `D:\Nextstep_AI\nextstep\nextstep\celery.py`:

```python
import os
import sys

from celery import Celery
from celery.schedules import crontab
from kombu import Queue

# Add project root and scrapers dir to path so scraper modules are importable
_nextstep_pkg = os.path.dirname(os.path.abspath(__file__))        # nextstep/nextstep/
_nextstep_root = os.path.dirname(_nextstep_pkg)                    # nextstep/
_project_root = os.path.dirname(_nextstep_root)                    # D:\Nextstep_AI\
_scrapers_dir = os.path.join(_project_root, 'scrapers')

for _p in [_project_root, _scrapers_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nextstep.settings')

app = Celery('nextstep')
app.config_from_object('django.conf:settings', namespace='CELERY')

app.conf.task_queues = (
    Queue('api_queue'),
    Queue('scraper_queue'),
)
app.conf.task_default_queue = 'api_queue'

app.autodiscover_tasks(['scrapers'])

app.conf.beat_schedule = {
    # ── API sources (fast, generous limits) ──────────────────────────────────
    'remotive-every-4h': {
        'task': 'scrapers.tasks.run_remotive',
        'schedule': crontab(minute=0, hour='*/4'),
    },
    'arbeitnow-every-4h': {
        'task': 'scrapers.tasks.run_arbeitnow',
        'schedule': crontab(minute=15, hour='*/4'),
    },
    'adzuna-every-6h': {
        'task': 'scrapers.tasks.run_adzuna',
        'schedule': crontab(minute=0, hour='*/6'),
    },
    'themuse-every-6h': {
        'task': 'scrapers.tasks.run_themuse',
        'schedule': crontab(minute=30, hour='*/6'),
    },
    # JSearch: 6 queries/day × 30 days = 180 calls/month (within 200 free tier)
    'jsearch-daily': {
        'task': 'scrapers.tasks.run_jsearch',
        'schedule': crontab(minute=0, hour=3),
    },
    # ── HTML scrapers (slower, polite delays) ─────────────────────────────────
    'internshala-every-8h': {
        'task': 'scrapers.tasks.run_internshala',
        'schedule': crontab(minute=0, hour='*/8'),
    },
    'wellfound-every-8h': {
        'task': 'scrapers.tasks.run_wellfound',
        'schedule': crontab(minute=20, hour='*/8'),
    },
    'unstop-every-8h': {
        'task': 'scrapers.tasks.run_unstop',
        'schedule': crontab(minute=40, hour='*/8'),
    },
    'reddit-every-12h': {
        'task': 'scrapers.tasks.run_reddit',
        'schedule': crontab(minute=0, hour='*/12'),
    },
    'hackernews-every-12h': {
        'task': 'scrapers.tasks.run_hackernews',
        'schedule': crontab(minute=30, hour='*/12'),
    },
}
```

- [ ] **Step 5: Update nextstep/nextstep/__init__.py**

Open `D:\Nextstep_AI\nextstep\nextstep\__init__.py` and set content to:

```python
from .celery import app as celery_app

__all__ = ('celery_app',)
```

- [ ] **Step 6: Add Celery env vars to nextstep/nextstep/settings.py**

Open `D:\Nextstep_AI\nextstep\nextstep\settings.py` and add this block after the database config section (search for `DATABASES`):

```python
# ── Celery / Redis ────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_TASK_TRACK_STARTED = True
```

- [ ] **Step 7: Run tests to verify they pass**

Run from `D:\Nextstep_AI\nextstep\`:
```bash
pytest core/tests/test_celery.py -v
```
Expected:
```
test_celery_app_importable PASSED
test_celery_app_has_two_queues PASSED
```

- [ ] **Step 8: Verify celery can start (dry run)**

Run from `D:\Nextstep_AI\nextstep\`:
```bash
celery -A nextstep inspect ping --timeout=3 2>&1 | head -5
```
Expected: Either connects to Redis (if running) or prints a connection error — NOT an ImportError.

- [ ] **Step 9: Commit**

```bash
git add scrapers/__init__.py nextstep/nextstep/celery.py nextstep/nextstep/__init__.py nextstep/nextstep/settings.py nextstep/core/tests/test_celery.py
git commit -m "feat: add Celery app with two queues and Beat schedule"
```

---

## Task 3: Remove NCS scraper and update run_all_scrapers.py

**Files:**
- Delete: `scrapers/ncs_scraper.py`
- Modify: `scrapers/run_all_scrapers.py`

- [ ] **Step 1: Delete NCS scraper**

Delete `D:\Nextstep_AI\scrapers\ncs_scraper.py`.

- [ ] **Step 2: Remove NCS from run_all_scrapers.py**

Open `D:\Nextstep_AI\scrapers\run_all_scrapers.py`. Find the `OPTIONAL_SCRAPERS` dict and remove the `'ncs'` entry:

```python
OPTIONAL_SCRAPERS = {
    'internshala': {
        'class': None,
        'args': {'max_per_category': 10},
        'quick_args': {'max_per_category': 5},
        'description': 'Internshala (India internships)',
    },
    'arbeitnow': {
        'class': None,
        'args': {'limit': 50},
        'quick_args': {'limit': 20},
        'description': 'Arbeitnow (Remote/Startup jobs)',
    },
}
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/run_all_scrapers.py
git rm scrapers/ncs_scraper.py
git commit -m "chore: remove NCS govt scraper (out of startup/remote scope)"
```

---

## Task 4: Rewrite Internshala scraper with updated selectors

**Files:**
- Rewrite: `scrapers/internshala_scraper.py`
- Create: `nextstep/core/tests/test_scrapers.py` (first test)

- [ ] **Step 1: Write the failing test**

Create `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
import pytest
from unittest.mock import patch, MagicMock

INTERNSHALA_HTML = """
<html><body>
<div class="individual_internship">
  <div class="heading_4_5">
    <h3 class="job-internship-name">
      <a href="/internship/detail/python-developer-123">Python Developer Intern</a>
    </h3>
  </div>
  <div class="company_name">
    <a href="/company/techcorp">TechCorp Pvt Ltd</a>
  </div>
  <div id="location_names">
    <a href="/internships/in-mumbai">Mumbai</a>
  </div>
  <div class="internship_other_details_container">
    <div class="item_body">
      <span class="stipend">₹ 5,000 - 15,000 /month</span>
    </div>
  </div>
  <a class="view_detail_button" href="/internship/detail/python-developer-123">View details</a>
</div>
<div class="individual_internship">
  <div class="heading_4_5">
    <h3 class="job-internship-name">
      <a href="/internship/detail/web-dev-456">Web Developer Intern</a>
    </h3>
  </div>
  <div class="company_name">
    <a href="/company/webco">WebCo</a>
  </div>
  <div id="location_names">
    <span class="work_from_home">Work From Home</span>
  </div>
  <div class="internship_other_details_container">
    <div class="item_body">
      <span class="stipend">Unpaid</span>
    </div>
  </div>
  <a class="view_detail_button" href="/internship/detail/web-dev-456">View details</a>
</div>
</body></html>
"""


@pytest.mark.django_db
def test_internshala_parses_cards():
    from internshala_scraper import InternshalaScraper

    scraper = InternshalaScraper(categories=['python-django-internship'], max_per_category=10)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = INTERNSHALA_HTML
    mock_response.raise_for_status = MagicMock()

    with patch('requests.get', return_value=mock_response):
        results = scraper.fetch_opportunities()

    assert len(results) == 2
    assert results[0].title == 'Python Developer Intern'
    assert results[0].company == 'TechCorp Pvt Ltd'
    assert results[0].job_type == 'internship'
    assert 'internshala.com' in results[0].apply_link or '/internship/detail/' in results[0].apply_link


@pytest.mark.django_db
def test_internshala_wfh_sets_remote_location():
    from internshala_scraper import InternshalaScraper

    scraper = InternshalaScraper(categories=['work-from-home-internships'], max_per_category=10)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = INTERNSHALA_HTML
    mock_response.raise_for_status = MagicMock()

    with patch('requests.get', return_value=mock_response):
        results = scraper.fetch_opportunities()

    wfh = [r for r in results if 'web dev' in r.title.lower() or 'web developer' in r.title.lower()]
    assert wfh, "Should have WFH result"
    assert 'remote' in wfh[0].location.lower() or 'work from home' in wfh[0].location.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run from `D:\Nextstep_AI\nextstep\`:
```bash
pytest core/tests/test_scrapers.py::test_internshala_parses_cards -v
```
Expected: test fails — either import error or assertion error (existing selectors broken).

- [ ] **Step 3: Rewrite internshala_scraper.py**

Replace `D:\Nextstep_AI\scrapers\internshala_scraper.py` with:

```python
"""
Internshala scraper for India-based internships.

Parses publicly listed internship cards from internshala.com.
CSS selectors target the current DOM structure (verified 2026-04).
If Internshala redesigns, expect 0 results — check logs for warnings.
"""

import os
import sys
import logging
import requests
from typing import List
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")
import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class InternshalaScraper(BaseScraper):
    source_name = "internshala"
    rate_limit_delay = 3.0

    CATEGORIES = [
        "work-from-home-internships",
        "computer-science-internship",
        "web-development-internship",
        "python-django-internship",
        "mobile-app-development-internship",
        "data-science-internship",
        "machine-learning-internship",
        "graphic-design-internship",
    ]

    def __init__(self, categories: List[str] = None, max_per_category: int = 15):
        super().__init__()
        self.categories = categories or self.CATEGORIES
        self.max_per_category = max_per_category
        self.base_url = "https://internshala.com"
        self.headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://internshala.com",
        })

    def fetch_opportunities(self) -> List[OpportunityData]:
        opportunities = []

        for category in self.categories:
            try:
                self._respect_rate_limit()
                url = f"{self.base_url}/internships/{category}"
                response = requests.get(url, headers=self.headers, timeout=20)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, 'lxml')
                cards = soup.select('.individual_internship')[:self.max_per_category]

                for card in cards:
                    try:
                        opp = self._parse_card(card)
                        if opp:
                            opportunities.append(opp)
                    except Exception as e:
                        logger.warning(f"Internshala: error parsing card: {e}")

                logger.info(f"Internshala: {len(cards)} cards from {category}")

            except requests.exceptions.RequestException as e:
                logger.error(f"Internshala: request error for {category}: {e}")
            except Exception as e:
                logger.error(f"Internshala: error processing {category}: {e}")

        return opportunities

    def _parse_card(self, card) -> OpportunityData:
        # Title — try multiple selector patterns
        title_el = (
            card.select_one('.job-internship-name a') or
            card.select_one('.heading_4_5 a') or
            card.select_one('h3 a') or
            card.select_one('a[href*="/internship/detail/"]')
        )
        title = title_el.get_text(strip=True) if title_el else "Internship"

        # Company
        company_el = (
            card.select_one('.company_name a') or
            card.select_one('.company-name a') or
            card.select_one('[class*="company"] a')
        )
        company = company_el.get_text(strip=True) if company_el else "Company on Internshala"

        # Location
        is_wfh = bool(
            card.select_one('.work_from_home') or
            card.select_one('[class*="work-from-home"]') or
            card.select_one('[class*="wfh"]')
        )
        if is_wfh:
            location = "Remote (India)"
        else:
            loc_el = card.select_one('#location_names') or card.select_one('.location_link')
            raw_loc = loc_el.get_text(strip=True) if loc_el else ""
            location = raw_loc if raw_loc else "India"
            if 'work from home' in location.lower():
                location = "Remote (India)"

        # Stipend for description
        stipend_el = card.select_one('.stipend') or card.select_one('[class*="stipend"]')
        stipend = stipend_el.get_text(strip=True) if stipend_el else ""

        # Apply link
        link_el = (
            card.select_one('a.view_detail_button') or
            card.select_one('a[href*="/internship/detail/"]')
        )
        if link_el and link_el.get('href'):
            href = link_el['href']
            apply_link = href if href.startswith('http') else f"{self.base_url}{href}"
        else:
            apply_link = self.base_url

        description_parts = [f"Internship at {company}"]
        if stipend:
            description_parts.append(f"Stipend: {stipend}")
        description_parts.append(f"Location: {location}")

        return OpportunityData(
            title=title[:255],
            company=company[:255],
            description="\n".join(description_parts),
            job_type="internship",
            apply_link=apply_link,
            location=location[:255],
            source=self.source_name,
        )


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name='internshala')
    scraper = InternshalaScraper(max_per_category=5)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `D:\Nextstep_AI\nextstep\`:
```bash
pytest core/tests/test_scrapers.py::test_internshala_parses_cards core/tests/test_scrapers.py::test_internshala_wfh_sets_remote_location -v
```
Expected: both `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/internshala_scraper.py nextstep/core/tests/test_scrapers.py
git commit -m "fix: rewrite Internshala scraper with current DOM selectors"
```

---

## Task 5: Upgrade Reddit scraper to OAuth

**Files:**
- Modify: `scrapers/multi_reddit_scraper.py`

- [ ] **Step 1: Write the failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
REDDIT_TOKEN_RESPONSE = {"access_token": "test_token_abc123", "token_type": "bearer"}

REDDIT_POSTS_RESPONSE = {
    "data": {
        "children": [
            {
                "data": {
                    "title": "[Hiring] Python Developer - Remote India",
                    "selftext": "Looking for a Python dev to work remotely from India. Django experience required.",
                    "permalink": "/r/forhire/comments/abc123/hiring_python_developer",
                }
            },
            {
                "data": {
                    "title": "Discussion: best tech jobs in Bangalore?",
                    "selftext": "What companies are hiring in Bangalore right now?",
                    "permalink": "/r/developersIndia/comments/def456/discussion",
                }
            },
        ]
    }
}


@pytest.mark.django_db
def test_reddit_uses_oauth_when_credentials_set(monkeypatch):
    from multi_reddit_scraper import MultiRedditScraper

    monkeypatch.setenv("REDDIT_CLIENT_ID", "fake_id")
    monkeypatch.setenv("REDDIT_CLIENT_SECRET", "fake_secret")

    scraper = MultiRedditScraper(subreddits=['forhire'], limit_per_sub=10)

    token_resp = MagicMock()
    token_resp.json.return_value = REDDIT_TOKEN_RESPONSE
    token_resp.raise_for_status = MagicMock()

    posts_resp = MagicMock()
    posts_resp.json.return_value = REDDIT_POSTS_RESPONSE
    posts_resp.raise_for_status = MagicMock()

    with patch('requests.post', return_value=token_resp) as mock_post, \
         patch('requests.get', return_value=posts_resp):
        results = scraper.fetch_opportunities()

    # OAuth token endpoint should have been called
    mock_post.assert_called_once()
    call_url = mock_post.call_args[0][0]
    assert 'access_token' in call_url

    # Should have fetched the hiring post (flair filter passes for forhire)
    assert len(results) >= 1


@pytest.mark.django_db
def test_reddit_falls_back_to_anonymous_without_credentials(monkeypatch):
    from multi_reddit_scraper import MultiRedditScraper

    monkeypatch.delenv("REDDIT_CLIENT_ID", raising=False)
    monkeypatch.delenv("REDDIT_CLIENT_SECRET", raising=False)

    scraper = MultiRedditScraper(subreddits=['forhire'], limit_per_sub=10)

    posts_resp = MagicMock()
    posts_resp.json.return_value = REDDIT_POSTS_RESPONSE
    posts_resp.raise_for_status = MagicMock()

    with patch('requests.get', return_value=posts_resp) as mock_get:
        results = scraper.fetch_opportunities()

    # Should have used the .json endpoint, not OAuth
    called_url = mock_get.call_args[0][0]
    assert 'reddit.com/r/' in called_url
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_reddit_uses_oauth_when_credentials_set -v
```
Expected: FAIL (no OAuth token logic exists yet).

- [ ] **Step 3: Add OAuth to multi_reddit_scraper.py**

Open `D:\Nextstep_AI\scrapers\multi_reddit_scraper.py`.

After the existing `__init__` method, add:

```python
    def _get_oauth_token(self) -> str:
        """Fetch a Reddit OAuth access token (client_credentials flow). Returns empty string on failure."""
        client_id = os.environ.get("REDDIT_CLIENT_ID", "")
        client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "")
        if not client_id or not client_secret:
            return ""
        try:
            resp = requests.post(
                "https://www.reddit.com/api/v1/access_token",
                auth=requests.auth.HTTPBasicAuth(client_id, client_secret),
                data={"grant_type": "client_credentials"},
                headers={"User-Agent": "NextStepAI/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json().get("access_token", "")
        except Exception as e:
            logger.warning(f"Reddit OAuth token fetch failed, falling back to anonymous: {e}")
            return ""
```

Then modify `_fetch_subreddit` to use the token. Find the line:

```python
            url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={self.limit_per_sub}"
            response = requests.get(url, headers=self.headers, timeout=15)
```

Replace with:

```python
            token = self._get_oauth_token()
            if token:
                url = f"https://oauth.reddit.com/r/{subreddit}/new?limit={self.limit_per_sub}"
                headers = {**self.headers, "Authorization": f"bearer {token}"}
            else:
                url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={self.limit_per_sub}"
                headers = self.headers
            response = requests.get(url, headers=headers, timeout=15)
```

Also add `import requests.auth` at the top of the file (after the existing `import requests`).

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_reddit_uses_oauth_when_credentials_set core/tests/test_scrapers.py::test_reddit_falls_back_to_anonymous_without_credentials -v
```
Expected: both `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/multi_reddit_scraper.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: upgrade Reddit scraper to OAuth (60 req/min vs 10 anonymous)"
```

---

## Task 6: Create Adzuna India scraper

**Files:**
- Create: `scrapers/adzuna_scraper.py`

> **Setup required:** Register at https://developer.adzuna.com to get `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` (free, instant). Add both to your `.env` file.

- [ ] **Step 1: Write failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
ADZUNA_RESPONSE = {
    "results": [
        {
            "id": "4191538546",
            "title": "Python Backend Developer",
            "description": "We need a Python dev with Django experience for our Bangalore office.",
            "redirect_url": "https://www.adzuna.in/land/ad/4191538546",
            "company": {"display_name": "TechStartup India"},
            "location": {"display_name": "Bangalore, Karnataka"},
            "contract_time": "full_time",
            "contract_type": "permanent",
            "created": "2026-04-20T10:00:00Z",
        },
        {
            "id": "9999999999",
            "title": "Junior Data Analyst",
            "description": "Remote position open to candidates across India.",
            "redirect_url": "https://www.adzuna.in/land/ad/9999999999",
            "company": {"display_name": "DataCo"},
            "location": {"display_name": "Remote"},
            "contract_time": "full_time",
            "contract_type": "permanent",
            "created": "2026-04-21T10:00:00Z",
        },
    ]
}


@pytest.mark.django_db
def test_adzuna_parses_response(monkeypatch):
    from adzuna_scraper import AdzunaScraper

    monkeypatch.setenv("ADZUNA_APP_ID", "test_id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "test_key")

    scraper = AdzunaScraper(limit=10, queries=["python developer"])

    mock_response = MagicMock()
    mock_response.json.return_value = ADZUNA_RESPONSE
    mock_response.raise_for_status = MagicMock()
    mock_response.status_code = 200

    with patch('requests.request', return_value=mock_response):
        results = scraper.fetch_opportunities()

    assert len(results) == 2
    assert results[0].title == "Python Backend Developer"
    assert results[0].company == "TechStartup India"
    assert results[0].location == "Bangalore, Karnataka"
    assert results[0].job_type == "job"
    assert results[0].apply_link == "https://www.adzuna.in/land/ad/4191538546"
    assert results[0].source == "adzuna"


@pytest.mark.django_db
def test_adzuna_deduplicates_across_queries(monkeypatch):
    from adzuna_scraper import AdzunaScraper

    monkeypatch.setenv("ADZUNA_APP_ID", "test_id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "test_key")

    scraper = AdzunaScraper(limit=10, queries=["query1", "query2"])

    mock_response = MagicMock()
    mock_response.json.return_value = ADZUNA_RESPONSE  # same response for both queries
    mock_response.raise_for_status = MagicMock()
    mock_response.status_code = 200

    with patch('requests.request', return_value=mock_response):
        results = scraper.fetch_opportunities()

    # IDs 4191538546 and 9999999999 appear in both query responses — deduplicated to 2
    assert len(results) == 2


@pytest.mark.django_db
def test_adzuna_raises_without_credentials():
    from adzuna_scraper import AdzunaScraper
    import os
    os.environ.pop("ADZUNA_APP_ID", None)
    os.environ.pop("ADZUNA_APP_KEY", None)

    scraper = AdzunaScraper()
    with pytest.raises(ValueError, match="ADZUNA_APP_ID"):
        scraper.fetch_opportunities()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_adzuna_parses_response -v
```
Expected: `ModuleNotFoundError: No module named 'adzuna_scraper'`

- [ ] **Step 3: Create adzuna_scraper.py**

Create `D:\Nextstep_AI\scrapers\adzuna_scraper.py`:

```python
"""
Adzuna India scraper for NextStep AI.

Adzuna provides a free developer API (200 calls/day on free tier).
Register at https://developer.adzuna.com — credentials are instant.

Env vars required:
    ADZUNA_APP_ID  — your application ID
    ADZUNA_APP_KEY — your API key
"""

import os
import sys
import logging
from typing import List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")
import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class AdzunaScraper(BaseScraper):
    source_name = "adzuna"
    rate_limit_delay = 1.5

    API_BASE = "https://api.adzuna.com/v1/api/jobs/in/search/{page}"

    # 6 queries keeps daily calls at ~6 × n_pages — well within 200/day free tier
    DEFAULT_QUERIES = [
        "software engineer",
        "python developer",
        "frontend developer",
        "data scientist",
        "remote developer",
        "software intern india",
    ]

    JOB_TYPE_MAP = {
        "part_time": "part-time",
        "full_time": "job",
        "contract": "contract",
    }

    def __init__(self, limit: int = 120, queries: List[str] = None):
        super().__init__()
        self.app_id = os.environ.get("ADZUNA_APP_ID", "")
        self.api_key = os.environ.get("ADZUNA_APP_KEY", "")
        self.limit = limit
        self.queries = queries or self.DEFAULT_QUERIES

    def _fetch_query(self, query: str, page: int = 1) -> List[dict]:
        url = self.API_BASE.format(page=page)
        params = {
            "app_id": self.app_id,
            "app_key": self.api_key,
            "results_per_page": 50,
            "what": query,
            "content-type": "application/json",
        }
        try:
            response = self._make_request(url, params=params, timeout=20)
            return response.json().get("results", [])
        except Exception as e:
            logger.error(f"Adzuna: error fetching query '{query}': {e}")
            return []

    def _build_opportunity(self, item: dict) -> OpportunityData:
        title = (item.get("title") or "Position")[:255]
        company = ((item.get("company") or {}).get("display_name") or "Company")[:255]
        location = ((item.get("location") or {}).get("display_name") or "India")[:255]
        description = (item.get("description") or "")[:10000]
        apply_link = item.get("redirect_url") or ""

        contract_time = (item.get("contract_time") or "").lower()
        title_lower = title.lower()

        if any(kw in title_lower for kw in ["intern", "internship", "trainee"]):
            job_type = "internship"
        elif any(kw in title_lower for kw in ["freelance", "contract"]):
            job_type = "contract"
        else:
            job_type = self.JOB_TYPE_MAP.get(contract_time, "job")

        return OpportunityData(
            title=title,
            company=company,
            description=description,
            job_type=job_type,
            apply_link=apply_link,
            location=location,
            source=self.source_name,
        )

    def fetch_opportunities(self) -> List[OpportunityData]:
        if not self.app_id or not self.api_key:
            raise ValueError(
                "ADZUNA_APP_ID and ADZUNA_APP_KEY are required. "
                "Register for free at https://developer.adzuna.com"
            )

        opportunities: List[OpportunityData] = []
        seen_ids: set = set()

        for query in self.queries:
            if len(opportunities) >= self.limit:
                break
            for item in self._fetch_query(query):
                if len(opportunities) >= self.limit:
                    break
                item_id = item.get("id")
                if item_id and item_id in seen_ids:
                    continue
                if item_id:
                    seen_ids.add(item_id)
                if not item.get("redirect_url"):
                    continue
                try:
                    opportunities.append(self._build_opportunity(item))
                except Exception as e:
                    logger.warning(f"Adzuna: build error: {e}")

        logger.info(f"Adzuna: collected {len(opportunities)} opportunities")
        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name="adzuna")
    scraper = AdzunaScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_adzuna_parses_response core/tests/test_scrapers.py::test_adzuna_deduplicates_across_queries core/tests/test_scrapers.py::test_adzuna_raises_without_credentials -v
```
Expected: all 3 `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/adzuna_scraper.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: add Adzuna India scraper (free API, 200 calls/day)"
```

---

## Task 7: Create The Muse scraper

**Files:**
- Create: `scrapers/themuse_scraper.py`

- [ ] **Step 1: Write failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
MUSE_RESPONSE_PAGE0 = {
    "page": 1,
    "page_count": 2,
    "results": [
        {
            "id": 11111,
            "name": "Senior Software Engineer",
            "contents": "<p>Build great products remotely.</p>",
            "locations": [{"name": "Flexible / Remote"}],
            "company": {"name": "RemoteCo"},
            "refs": {"landing_page": "https://www.themuse.com/jobs/remoteco/senior-software-engineer"},
            "categories": [{"name": "Software Engineer"}],
            "publication_date": "2026-04-20T00:00:00Z",
        }
    ],
}

MUSE_RESPONSE_EMPTY = {"page": 2, "page_count": 2, "results": []}


@pytest.mark.django_db
def test_themuse_parses_response():
    from themuse_scraper import TheMuseScraper

    scraper = TheMuseScraper(limit=10)

    def side_effect(*args, **kwargs):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        resp.status_code = 200
        params = kwargs.get('params', {})
        if params.get('page', 0) == 0:
            resp.json.return_value = MUSE_RESPONSE_PAGE0
        else:
            resp.json.return_value = MUSE_RESPONSE_EMPTY
        return resp

    with patch('requests.request', side_effect=side_effect):
        results = scraper.fetch_opportunities()

    assert len(results) >= 1
    assert results[0].title == "Senior Software Engineer"
    assert results[0].company == "RemoteCo"
    assert "remote" in results[0].location.lower()
    assert results[0].apply_link == "https://www.themuse.com/jobs/remoteco/senior-software-engineer"
    assert results[0].source == "themuse"


@pytest.mark.django_db
def test_themuse_skips_entries_without_apply_link():
    from themuse_scraper import TheMuseScraper

    scraper = TheMuseScraper(limit=10)

    no_link_response = {
        "page": 1,
        "page_count": 1,
        "results": [
            {
                "id": 22222,
                "name": "Designer",
                "contents": "<p>Design stuff.</p>",
                "locations": [{"name": "Flexible / Remote"}],
                "company": {"name": "DesignCo"},
                "refs": {},  # no landing_page
                "categories": [{"name": "Design"}],
            }
        ],
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = no_link_response
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert len(results) == 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_themuse_parses_response -v
```
Expected: `ModuleNotFoundError: No module named 'themuse_scraper'`

- [ ] **Step 3: Create themuse_scraper.py**

Create `D:\Nextstep_AI\scrapers\themuse_scraper.py`:

```python
"""
The Muse scraper for remote/startup jobs.

The Muse API is free with no authentication required.
Filters for 'Flexible / Remote' location — globally accessible roles.
"""

import os
import sys
import logging
from typing import List, Tuple

from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")
import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class TheMuseScraper(BaseScraper):
    source_name = "themuse"
    rate_limit_delay = 1.0

    API_URL = "https://www.themuse.com/api/public/jobs"

    CATEGORIES = [
        "Software Engineer",
        "Data Science",
        "Design",
        "Marketing",
        "Product",
    ]

    def __init__(self, limit: int = 100):
        super().__init__()
        self.limit = limit

    def _clean_html(self, html_text: str) -> str:
        if not html_text:
            return ""
        return BeautifulSoup(html_text, 'lxml').get_text()[:10000]

    def _fetch_page(self, category: str, page: int) -> Tuple[List[dict], int]:
        params = {
            "category": category,
            "location": "Flexible / Remote",
            "page": page,
        }
        try:
            response = self._make_request(self.API_URL, params=params, timeout=20)
            data = response.json()
            return data.get("results", []), data.get("page_count", 1)
        except Exception as e:
            logger.error(f"TheMuse: error fetching '{category}' page {page}: {e}")
            return [], 0

    def _build_opportunity(self, item: dict) -> OpportunityData:
        title = (item.get("name") or "Position")[:255]
        company = ((item.get("company") or {}).get("name") or "Company")[:255]

        locations = item.get("locations") or [{"name": "Remote"}]
        raw_loc = locations[0].get("name", "Remote") if locations else "Remote"
        location = f"Remote - {raw_loc}"[:255]

        description = self._clean_html(item.get("contents", ""))
        apply_link = (item.get("refs") or {}).get("landing_page", "")

        title_lower = title.lower()
        if any(kw in title_lower for kw in ["intern", "trainee"]):
            job_type = "internship"
        else:
            job_type = "job"

        return OpportunityData(
            title=title,
            company=company,
            description=description,
            job_type=job_type,
            apply_link=apply_link,
            location=location,
            source=self.source_name,
        )

    def fetch_opportunities(self) -> List[OpportunityData]:
        opportunities: List[OpportunityData] = []
        seen_ids: set = set()

        for category in self.CATEGORIES:
            if len(opportunities) >= self.limit:
                break

            page = 0
            while len(opportunities) < self.limit:
                items, page_count = self._fetch_page(category, page)
                if not items:
                    break

                for item in items:
                    if len(opportunities) >= self.limit:
                        break

                    item_id = item.get("id")
                    if item_id and item_id in seen_ids:
                        continue
                    if item_id:
                        seen_ids.add(item_id)

                    apply_link = (item.get("refs") or {}).get("landing_page", "")
                    if not apply_link:
                        continue

                    try:
                        opportunities.append(self._build_opportunity(item))
                    except Exception as e:
                        logger.warning(f"TheMuse: build error: {e}")

                page += 1
                if page >= min(page_count, 10):
                    break

        logger.info(f"TheMuse: collected {len(opportunities)} opportunities")
        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name="themuse")
    scraper = TheMuseScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_themuse_parses_response core/tests/test_scrapers.py::test_themuse_skips_entries_without_apply_link -v
```
Expected: both `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/themuse_scraper.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: add The Muse scraper (free API, remote-first jobs)"
```

---

## Task 8: Create Wellfound scraper

**Files:**
- Create: `scrapers/wellfound_scraper.py`

> **Note:** Wellfound uses React/Next.js. This scraper attempts to extract job data from embedded `__NEXT_DATA__` JSON. If the site switches to fully client-side rendering, `fetch_opportunities()` returns `[]` with a warning log — it will not crash the pipeline.

- [ ] **Step 1: Write failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
import json

WELLFOUND_HTML = """<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "jobs": [
        {
          "id": 9001,
          "title": "Backend Engineer",
          "slug": "backend-engineer-startup-9001",
          "remote": true,
          "description": "Join our fully remote startup team.",
          "startup": {"name": "CoolStartup"},
          "locations": []
        },
        {
          "id": 9002,
          "title": "Frontend Intern",
          "slug": "frontend-intern-9002",
          "remote": false,
          "description": "Internship at our Bangalore office.",
          "startup": {"name": "AnotherStartup"},
          "locations": ["Bangalore"]
        }
      ]
    }
  }
}
</script>
</body></html>"""


@pytest.mark.django_db
def test_wellfound_extracts_next_data():
    from wellfound_scraper import WellfoundScraper

    scraper = WellfoundScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = WELLFOUND_HTML
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert len(results) == 2
    backend = next(r for r in results if "Backend" in r.title)
    assert backend.company == "CoolStartup"
    assert "remote" in backend.location.lower()
    assert "wellfound.com/jobs/" in backend.apply_link
    assert backend.source == "wellfound"

    intern_job = next(r for r in results if "Intern" in r.title)
    assert intern_job.job_type == "internship"


@pytest.mark.django_db
def test_wellfound_returns_empty_when_no_next_data():
    from wellfound_scraper import WellfoundScraper

    scraper = WellfoundScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = "<html><body><p>Loading...</p></body></html>"
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert results == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_wellfound_extracts_next_data -v
```
Expected: `ModuleNotFoundError: No module named 'wellfound_scraper'`

- [ ] **Step 3: Create wellfound_scraper.py**

Create `D:\Nextstep_AI\scrapers\wellfound_scraper.py`:

```python
"""
Wellfound (AngelList) scraper for startup jobs.

Attempts to extract job data from Next.js __NEXT_DATA__ embedded JSON.
Wellfound is React-based; if all pages return 0 jobs, the site has moved
to fully client-side rendering — add Playwright support at that point.
"""

import os
import sys
import json
import logging
from typing import List

from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")
import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class WellfoundScraper(BaseScraper):
    source_name = "wellfound"
    rate_limit_delay = 3.0

    JOBS_URL = "https://wellfound.com/jobs"

    ROLES = [
        "software-engineer",
        "full-stack-engineer",
        "frontend-engineer",
        "backend-engineer",
        "data-scientist",
        "machine-learning-engineer",
        "mobile-engineer",
        "devops-engineer",
    ]

    def __init__(self, limit: int = 80):
        super().__init__()
        self.limit = limit
        self.headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
        })

    def _extract_next_data(self, html: str) -> List[dict]:
        soup = BeautifulSoup(html, 'lxml')
        script = soup.find('script', id='__NEXT_DATA__')
        if not script or not script.string:
            return []
        try:
            data = json.loads(script.string)
            page_props = data.get('props', {}).get('pageProps', {})
            jobs = (
                page_props.get('jobs') or
                page_props.get('jobListings') or
                page_props.get('startupRoles') or
                []
            )
            return jobs if isinstance(jobs, list) else []
        except (json.JSONDecodeError, AttributeError):
            return []

    def _build_opportunity(self, item: dict) -> OpportunityData:
        title = (item.get('title') or item.get('role') or 'Software Engineer')[:255]

        startup = item.get('startup') or item.get('company') or {}
        company = (startup.get('name') if isinstance(startup, dict) else str(startup) or 'Startup')[:255]

        is_remote = item.get('remote', False) or item.get('remoteOk', False)
        locations = item.get('locations') or []
        if is_remote or not locations:
            location = "Remote"
        else:
            loc = locations[0]
            location = (loc if isinstance(loc, str) else loc.get('name', 'India'))[:255]

        description = (item.get('description') or f"{title} at {company}")[:5000]

        slug = item.get('slug') or str(item.get('id', ''))
        apply_link = f"https://wellfound.com/jobs/{slug}" if slug else self.JOBS_URL

        title_lower = title.lower()
        if any(kw in title_lower for kw in ['intern', 'internship']):
            job_type = 'internship'
        elif any(kw in title_lower for kw in ['contract', 'freelance']):
            job_type = 'contract'
        else:
            job_type = 'job'

        return OpportunityData(
            title=title,
            company=company,
            description=description,
            job_type=job_type,
            apply_link=apply_link,
            location=location,
            source=self.source_name,
        )

    def fetch_opportunities(self) -> List[OpportunityData]:
        opportunities: List[OpportunityData] = []
        seen_ids: set = set()

        for role in self.ROLES:
            if len(opportunities) >= self.limit:
                break
            try:
                url = f"{self.JOBS_URL}?role={role}&remote=true"
                response = self._make_request(url, timeout=30)
                items = self._extract_next_data(response.text)
            except Exception as e:
                logger.warning(f"Wellfound: failed to fetch role '{role}': {e}")
                continue

            for item in items:
                if len(opportunities) >= self.limit:
                    break
                item_id = str(item.get('id') or item.get('slug') or '')
                if item_id and item_id in seen_ids:
                    continue
                if item_id:
                    seen_ids.add(item_id)
                try:
                    opportunities.append(self._build_opportunity(item))
                except Exception as e:
                    logger.warning(f"Wellfound: build error: {e}")

        if not opportunities:
            logger.warning(
                "Wellfound: returned 0 jobs — site may be fully client-side rendered. "
                "Consider adding Playwright support."
            )
        else:
            logger.info(f"Wellfound: collected {len(opportunities)} opportunities")

        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name="wellfound")
    scraper = WellfoundScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_wellfound_extracts_next_data core/tests/test_scrapers.py::test_wellfound_returns_empty_when_no_next_data -v
```
Expected: both `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/wellfound_scraper.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: add Wellfound scraper (Next.js data extraction, startup jobs)"
```

---

## Task 9: Create Unstop scraper

**Files:**
- Create: `scrapers/unstop_scraper.py`

- [ ] **Step 1: Write failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
UNSTOP_JOBS_HTML = """<html><head></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "opportunities": [
        {
          "id": 5001,
          "title": "Software Engineer",
          "organisation": {"name": "IndianStartup"},
          "location": "Bengaluru",
          "is_remote": false,
          "description": "Join our engineering team in Bengaluru."
        },
        {
          "id": 5002,
          "title": "Data Analyst Intern",
          "organisation": {"name": "DataFirm"},
          "location": "Delhi",
          "is_remote": true,
          "description": "Remote internship for fresh graduates."
        }
      ]
    }
  }
}
</script>
</body></html>"""


@pytest.mark.django_db
def test_unstop_parses_jobs():
    from unstop_scraper import UnstopScraper

    scraper = UnstopScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = UNSTOP_JOBS_HTML
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert len(results) == 2

    eng = next(r for r in results if "Software Engineer" in r.title)
    assert eng.company == "IndianStartup"
    assert eng.job_type == "job"
    assert eng.source == "unstop"

    intern_job = next(r for r in results if "Intern" in r.title)
    assert intern_job.job_type == "internship"
    assert "remote" in intern_job.location.lower()


@pytest.mark.django_db
def test_unstop_returns_empty_on_no_data():
    from unstop_scraper import UnstopScraper

    scraper = UnstopScraper(limit=10)

    mock_resp = MagicMock()
    mock_resp.text = "<html><body>Loading...</body></html>"
    mock_resp.raise_for_status = MagicMock()
    mock_resp.status_code = 200

    with patch('requests.request', return_value=mock_resp):
        results = scraper.fetch_opportunities()

    assert results == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_unstop_parses_jobs -v
```
Expected: `ModuleNotFoundError: No module named 'unstop_scraper'`

- [ ] **Step 3: Create unstop_scraper.py**

Create `D:\Nextstep_AI\scrapers\unstop_scraper.py`:

```python
"""
Unstop (formerly Dare2Compete) scraper for India fresher/internship opportunities.

Extracts job data from Next.js __NEXT_DATA__ embedded JSON.
Targets both /jobs and /internships pages.
"""

import os
import sys
import json
import logging
from typing import List

from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")
import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class UnstopScraper(BaseScraper):
    source_name = "unstop"
    rate_limit_delay = 2.5

    PAGES = [
        ("https://unstop.com/jobs", "job"),
        ("https://unstop.com/internships", "internship"),
    ]

    def __init__(self, limit: int = 60):
        super().__init__()
        self.limit = limit
        self.headers.update({
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def _extract_next_data(self, html: str) -> List[dict]:
        soup = BeautifulSoup(html, 'lxml')
        script = soup.find('script', id='__NEXT_DATA__')
        if not script or not script.string:
            return []
        try:
            data = json.loads(script.string)
            page_props = data.get('props', {}).get('pageProps', {})
            items = (
                page_props.get('opportunities') or
                page_props.get('data', {}).get('data') or
                []
            )
            return items if isinstance(items, list) else []
        except (json.JSONDecodeError, AttributeError):
            return []

    def _build_opportunity(self, item: dict, default_type: str) -> OpportunityData:
        title = (item.get('title') or item.get('name') or 'Opportunity')[:255]

        org = item.get('organisation') or item.get('company') or {}
        company = (org.get('name') if isinstance(org, dict) else str(org) or 'Company')[:255]

        raw_loc = item.get('location') or item.get('city') or 'India'
        if isinstance(raw_loc, list):
            location = ', '.join(raw_loc) if raw_loc else 'India'
        else:
            location = str(raw_loc)

        if item.get('is_remote') or item.get('work_from_home'):
            location = 'Remote (India)'

        description = (item.get('description') or item.get('about') or f"{title} at {company}")[:5000]

        item_id = item.get('id') or item.get('slug') or ''
        apply_link = f"https://unstop.com/jobs/{item_id}" if item_id else "https://unstop.com/jobs"

        title_lower = title.lower()
        if any(kw in title_lower for kw in ['intern', 'internship', 'trainee']) or default_type == 'internship':
            job_type = 'internship'
        else:
            job_type = 'job'

        return OpportunityData(
            title=title,
            company=company,
            description=description,
            job_type=job_type,
            apply_link=apply_link,
            location=location[:255],
            source=self.source_name,
        )

    def fetch_opportunities(self) -> List[OpportunityData]:
        opportunities: List[OpportunityData] = []
        seen_ids: set = set()

        for url, default_type in self.PAGES:
            if len(opportunities) >= self.limit:
                break
            try:
                response = self._make_request(url, timeout=30)
                items = self._extract_next_data(response.text)
            except Exception as e:
                logger.warning(f"Unstop: failed to fetch {url}: {e}")
                continue

            if not items:
                logger.debug(f"Unstop: no data at {url} (may be client-side rendered)")
                continue

            for item in items:
                if len(opportunities) >= self.limit:
                    break
                item_id = str(item.get('id') or '')
                if item_id and item_id in seen_ids:
                    continue
                if item_id:
                    seen_ids.add(item_id)
                try:
                    opportunities.append(self._build_opportunity(item, default_type))
                except Exception as e:
                    logger.warning(f"Unstop: build error: {e}")

        if not opportunities:
            logger.warning("Unstop: returned 0 jobs — site may be fully client-side rendered")
        else:
            logger.info(f"Unstop: collected {len(opportunities)} opportunities")

        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name="unstop")
    scraper = UnstopScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_unstop_parses_jobs core/tests/test_scrapers.py::test_unstop_returns_empty_on_no_data -v
```
Expected: both `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/unstop_scraper.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: add Unstop scraper (India freshers and internships)"
```

---

## Task 10: Create tasks.py with all Celery tasks

**Files:**
- Create: `scrapers/tasks.py`

- [ ] **Step 1: Write failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
def test_all_expected_tasks_exist():
    """All 10 scraper tasks must be importable from scrapers.tasks."""
    from scrapers import tasks

    expected = [
        'run_remotive', 'run_arbeitnow', 'run_adzuna', 'run_themuse',
        'run_jsearch', 'run_internshala', 'run_wellfound', 'run_unstop',
        'run_reddit', 'run_hackernews',
    ]
    for name in expected:
        assert hasattr(tasks, name), f"Missing task: scrapers.tasks.{name}"


def test_task_run_adzuna_is_properly_registered():
    """run_adzuna is a Celery task on the api_queue with the correct name."""
    from scrapers.tasks import run_adzuna
    assert hasattr(run_adzuna, 'delay')
    assert hasattr(run_adzuna, 'apply_async')
    assert run_adzuna.name == 'scrapers.tasks.run_adzuna'
    assert run_adzuna.queue == 'api_queue'
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_all_expected_tasks_exist -v
```
Expected: `ImportError: cannot import from 'scrapers.tasks'` (file doesn't exist yet).

- [ ] **Step 3: Create scrapers/tasks.py**

Create `D:\Nextstep_AI\scrapers\tasks.py`:

```python
"""
Celery tasks for NextStep AI scraper pipeline.

Each task wraps one scraper's .run() call with:
- Queue assignment (api_queue vs scraper_queue)
- Auto-retry with exponential backoff (3 attempts)
- Result returned as stats dict to Redis backend

Task names follow pattern: scrapers.tasks.<name>
Beat schedule is configured in nextstep/nextstep/celery.py.
"""

import os
import sys
import logging

# Add scrapers directory to sys.path so flat imports work (base_scraper etc.)
_dir = os.path.dirname(os.path.abspath(__file__))
if _dir not in sys.path:
    sys.path.insert(0, _dir)

from celery import shared_task

logger = logging.getLogger(__name__)


def _retry_countdown(retries: int) -> int:
    """Exponential backoff: 60s → 120s → 240s."""
    return 60 * (2 ** retries)


# ── API queue tasks ───────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_remotive')
def run_remotive(self):
    try:
        from remotive_scraper import RemotiveScraper
        return RemotiveScraper(limit=50).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_arbeitnow')
def run_arbeitnow(self):
    try:
        from arbeitnow_scraper import ArbeitnowScraper
        return ArbeitnowScraper(limit=50).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_adzuna')
def run_adzuna(self):
    try:
        from adzuna_scraper import AdzunaScraper
        return AdzunaScraper(limit=120).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_themuse')
def run_themuse(self):
    try:
        from themuse_scraper import TheMuseScraper
        return TheMuseScraper(limit=100).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=2, queue='api_queue', name='scrapers.tasks.run_jsearch')
def run_jsearch(self):
    # max_retries=2 — JSearch auth errors should not burn free quota on retries
    try:
        from jsearch_scraper import JSearchScraper
        return JSearchScraper(limit=60).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


# ── Scraper queue tasks ───────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_internshala')
def run_internshala(self):
    try:
        from internshala_scraper import InternshalaScraper
        return InternshalaScraper(max_per_category=15).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_wellfound')
def run_wellfound(self):
    try:
        from wellfound_scraper import WellfoundScraper
        return WellfoundScraper(limit=80).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_unstop')
def run_unstop(self):
    try:
        from unstop_scraper import UnstopScraper
        return UnstopScraper(limit=60).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_reddit')
def run_reddit(self):
    try:
        from multi_reddit_scraper import MultiRedditScraper
        return MultiRedditScraper(limit_per_sub=25).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_hackernews')
def run_hackernews(self):
    try:
        from hackernews_scraper import HackerNewsScraper
        return HackerNewsScraper(max_comments=100).run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_all_expected_tasks_exist -v
```
Expected: `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add scrapers/tasks.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: add Celery tasks for all 10 scrapers with retry backoff"
```

---

## Task 11: Create scraper_status management command

**Files:**
- Create: `nextstep/core/management/commands/scraper_status.py`

- [ ] **Step 1: Write failing test**

Append to `D:\Nextstep_AI\nextstep\core\tests\test_scrapers.py`:

```python
from django.core.management import call_command
from io import StringIO


def test_scraper_status_command_runs_without_error():
    """scraper_status command should print output without raising exceptions."""
    out = StringIO()
    try:
        call_command('scraper_status', stdout=out)
    except Exception as e:
        pytest.fail(f"scraper_status command raised: {e}")
    output = out.getvalue()
    assert 'SOURCE' in output.upper() or 'scraper' in output.lower() or 'never' in output.lower()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest core/tests/test_scrapers.py::test_scraper_status_command_runs_without_error -v
```
Expected: `CommandError` or `SystemExit` — command doesn't exist yet.

- [ ] **Step 3: Create scraper_status.py**

Create `D:\Nextstep_AI\nextstep\core\management\commands\scraper_status.py`:

```python
from django.core.management.base import BaseCommand
from django.core.cache import cache
from datetime import datetime

SCRAPER_SOURCES = [
    'remotive', 'arbeitnow', 'adzuna', 'themuse', 'jsearch',
    'internshala', 'wellfound', 'unstop', 'reddit', 'hackernews',
]


class Command(BaseCommand):
    help = 'Show last-run status for each scraper'

    def handle(self, *args, **options):
        self.stdout.write('\n{:<16} {:<22} {:>8} {:>8} {:>8} {}'.format(
            'SOURCE', 'LAST RUN', 'FETCHED', 'SAVED', 'ERRORS', 'STATUS'
        ))
        self.stdout.write('-' * 78)

        for source in SCRAPER_SOURCES:
            data = cache.get(f'scraper_status:{source}')
            if not data:
                self.stdout.write('{:<16} {:<22} {:>8} {:>8} {:>8} {}'.format(
                    source, 'never run', '-', '-', '-', 'unknown'
                ))
                continue

            stats = data.get('stats', {})
            last_run = data.get('last_run', 'unknown')
            status = data.get('status', 'unknown')

            # Format ISO timestamp to shorter form
            try:
                dt = datetime.fromisoformat(last_run)
                last_run_fmt = dt.strftime('%Y-%m-%d %H:%M')
            except (ValueError, TypeError):
                last_run_fmt = str(last_run)[:20]

            status_display = self.style.SUCCESS(status) if status == 'success' else self.style.ERROR(status)

            self.stdout.write('{:<16} {:<22} {:>8} {:>8} {:>8} {}'.format(
                source,
                last_run_fmt,
                stats.get('fetched', '-'),
                stats.get('saved', '-'),
                stats.get('errors', '-'),
                status,
            ))

        self.stdout.write('')
```

- [ ] **Step 4: Update tasks.py to write status to cache after each run**

Open `D:\Nextstep_AI\scrapers\tasks.py`.

Add this import block at the top (after the existing imports):

```python
from datetime import datetime
```

Add this helper function before the first task definition:

```python
def _store_status(source: str, stats: dict, status: str = 'success') -> None:
    """Write last-run stats to Django cache for scraper_status command."""
    try:
        import django
        from django.core.cache import cache
        cache.set(
            f'scraper_status:{source}',
            {'stats': stats, 'last_run': datetime.now().isoformat(), 'status': status},
            timeout=7 * 24 * 3600,
        )
    except Exception:
        pass  # Cache write failure must never break the task
```

Then update every task to call `_store_status`. For example, update `run_remotive` to:

```python
@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_remotive')
def run_remotive(self):
    try:
        from remotive_scraper import RemotiveScraper
        stats = RemotiveScraper(limit=50).run()
        _store_status('remotive', stats)
        return stats
    except Exception as exc:
        _store_status('remotive', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))
```

Apply the same pattern to all 10 tasks, using the correct source name string in each `_store_status` call:
- `run_arbeitnow` → `'arbeitnow'`
- `run_adzuna` → `'adzuna'`
- `run_themuse` → `'themuse'`
- `run_jsearch` → `'jsearch'`
- `run_internshala` → `'internshala'`
- `run_wellfound` → `'wellfound'`
- `run_unstop` → `'unstop'`
- `run_reddit` → `'reddit'`
- `run_hackernews` → `'hackernews'`

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest core/tests/test_scrapers.py::test_scraper_status_command_runs_without_error -v
```
Expected: `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add nextstep/core/management/commands/scraper_status.py scrapers/tasks.py nextstep/core/tests/test_scrapers.py
git commit -m "feat: add scraper_status management command with cache-backed last-run stats"
```

---

## Task 12: Update run_all_scrapers.py and final integration check

**Files:**
- Modify: `scrapers/run_all_scrapers.py`

- [ ] **Step 1: Add new scrapers to run_all_scrapers.py**

Open `D:\Nextstep_AI\scrapers\run_all_scrapers.py`.

Find the `SCRAPERS` dict. Add the import lines at the top of the file (with the other imports):

```python
from adzuna_scraper import AdzunaScraper
from themuse_scraper import TheMuseScraper
from wellfound_scraper import WellfoundScraper
from unstop_scraper import UnstopScraper
```

Update `SCRAPERS` to include the new sources:

```python
SCRAPERS = {
    'reddit': {
        'class': MultiRedditScraper,
        'args': {'limit_per_sub': 25},
        'quick_args': {'limit_per_sub': 10},
        'description': 'Reddit (India + remote subreddits, OAuth)',
    },
    'hackernews': {
        'class': HackerNewsScraper,
        'args': {'max_comments': 100},
        'quick_args': {'max_comments': 30},
        'description': 'HackerNews Who is Hiring',
    },
    'remotive': {
        'class': RemotiveScraper,
        'args': {'limit': 50},
        'quick_args': {'limit': 20},
        'description': 'Remotive.io remote jobs',
    },
    'jsearch': {
        'class': JSearchScraper,
        'args': {'limit': 60},
        'quick_args': {'limit': 20},
        'description': 'JSearch (LinkedIn, Indeed, Glassdoor via RapidAPI)',
    },
    'adzuna': {
        'class': AdzunaScraper,
        'args': {'limit': 120},
        'quick_args': {'limit': 30},
        'description': 'Adzuna India (free API, 200 calls/day)',
    },
    'themuse': {
        'class': TheMuseScraper,
        'args': {'limit': 100},
        'quick_args': {'limit': 30},
        'description': 'The Muse (free API, remote-first jobs)',
    },
    'wellfound': {
        'class': WellfoundScraper,
        'args': {'limit': 80},
        'quick_args': {'limit': 20},
        'description': 'Wellfound startup jobs',
    },
    'unstop': {
        'class': UnstopScraper,
        'args': {'limit': 60},
        'quick_args': {'limit': 20},
        'description': 'Unstop (India freshers + internships)',
    },
}
```

Update `OPTIONAL_SCRAPERS` to only keep `internshala` (arbeitnow stays as an always-on source):

```python
OPTIONAL_SCRAPERS = {
    'internshala': {
        'class': None,
        'args': {'max_per_category': 15},
        'quick_args': {'max_per_category': 5},
        'description': 'Internshala (India internships)',
    },
}
```

Move `arbeitnow` from `OPTIONAL_SCRAPERS` to `SCRAPERS`:

```python
    'arbeitnow': {
        'class': ArbeitnowScraper,
        'args': {'limit': 50},
        'quick_args': {'limit': 20},
        'description': 'Arbeitnow (Remote/Startup jobs)',
    },
```

Add `from arbeitnow_scraper import ArbeitnowScraper` to the imports at the top.

- [ ] **Step 2: Run all scraper tests**

Run the full test suite from `D:\Nextstep_AI\nextstep\`:
```bash
pytest core/tests/test_scrapers.py -v
```
Expected: all tests `PASSED`. Note how many tests passed in the output.

- [ ] **Step 3: Verify Celery Beat schedule matches tasks**

Run from `D:\Nextstep_AI\nextstep\`:
```bash
python -c "
from nextstep.celery import app
schedule = app.conf.beat_schedule
print(f'Beat schedule has {len(schedule)} entries:')
for name in sorted(schedule):
    task = schedule[name]['task']
    print(f'  {name} -> {task}')
"
```
Expected: 10 entries printed, one per source, no `ImportError`.

- [ ] **Step 4: Print environment variable checklist**

Run:
```bash
python -c "
import os
required = ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY', 'JSEARCH_API_KEY', 'DJANGO_SECRET_KEY']
optional = ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'CELERY_BROKER_URL']
print('Required env vars:')
for v in required:
    status = 'SET' if os.environ.get(v) else 'MISSING'
    print(f'  {v}: {status}')
print('Optional env vars (enhance functionality):')
for v in optional:
    status = 'SET' if os.environ.get(v) else 'not set'
    print(f'  {v}: {status}')
"
```

- [ ] **Step 5: Commit**

```bash
git add scrapers/run_all_scrapers.py
git commit -m "feat: register all new scrapers in run_all_scrapers orchestrator"
```

---

## Running in Production

### Start Redis (required)
```bash
redis-server
```

### Start Celery workers (from D:\Nextstep_AI\nextstep\)
```bash
# API queue worker
celery -A nextstep worker -Q api_queue -c 2 -l info --logfile=../scrapers/logs/celery_api.log

# Scraper queue worker (separate terminal)
celery -A nextstep worker -Q scraper_queue -c 1 -l info --logfile=../scrapers/logs/celery_scraper.log
```

### Start Beat scheduler
```bash
celery -A nextstep beat -l info --logfile=../scrapers/logs/celery_beat.log
```

### Manual one-shot run (no Redis needed)
```bash
# From D:\Nextstep_AI\scrapers\
python run_all_scrapers.py --quick          # all sources, quick mode
python run_all_scrapers.py --source=adzuna  # single source
```

### Check last-run status
```bash
# From D:\Nextstep_AI\nextstep\
python manage.py scraper_status
```
