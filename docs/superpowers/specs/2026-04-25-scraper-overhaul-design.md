# Scraper Overhaul — Production-Grade India/Remote Job Pipeline

**Date:** 2026-04-25  
**Status:** Approved  
**Scope:** Upgrade NextStep AI scraper pipeline to production quality, focusing on startup/remote jobs for the Indian market

---

## Goals

- Cover India-based and remote-friendly jobs from high-quality sources
- Add Celery + Redis for distributed, resilient task execution
- Add four new scrapers (Adzuna India, The Muse, Wellfound, Unstop)
- Fix broken Internshala scraper; upgrade Reddit to OAuth
- Remove NCS (govt focus, out of scope)
- Keep existing `BaseScraper`, `DataValidator`, and `job_filter` contracts intact

---

## Sources

### New API Sources

| Source | Method | Frequency | Notes |
|--------|--------|-----------|-------|
| Adzuna India | Free REST API | Every 6h | `country=in`, 200 calls/day, needs `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` |
| The Muse | Free REST API, no auth | Every 6h | Filters `Flexible / Remote` location tag |

### New HTML Scrapers

| Source | Method | Frequency | Notes |
|--------|--------|-----------|-------|
| Wellfound | BeautifulSoup | Every 8h | Startup jobs; remote + India filter |
| Unstop | BeautifulSoup | Every 8h | Freshers/internships; India-based |

### Fixed Sources

| Source | Problem | Fix |
|--------|---------|-----|
| Internshala | CSS selectors broken | Full rewrite with current DOM selectors |
| Reddit | Anonymous JSON — flaky, rate-limited | Upgrade to OAuth (`REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET`) |

### Kept As-Is

| Source | Frequency |
|--------|-----------|
| Remotive | Every 4h |
| Arbeitnow | Every 4h |
| HackerNews | Every 12h |
| JSearch | Every 48h (preserves 200/month free quota) |

### Removed

- **NCS** — government jobs portal, outside startup/remote scope

---

## Architecture

```
Django App
    └── Celery Workers
            ├── api_queue     → Adzuna, Muse, Remotive, Arbeitnow, JSearch
            └── scraper_queue → Wellfound, Unstop, Internshala, Reddit, HackerNews
    └── Celery Beat (scheduler)
            └── Fires each task on its own cron schedule
    └── Redis
            ├── Broker (task queue)
            └── Result backend (last-run stats per task)
```

Two queues isolate slow HTML scraping from fast API calls — a hanging scraper cannot delay API fetches.

### Data Flow (unchanged contract)

```
Celery Beat → Task → Scraper.fetch_opportunities()
    → BaseScraper._validate_opportunity()   # validator unchanged
    → job_filter.passes_all_filters()        # India/remote gate unchanged
    → Job.objects.bulk_create()              # DB write unchanged
    → stats dict returned to Redis result backend
```

---

## Per-Scraper Implementation Details

### Adzuna India (`adzuna_scraper.py`)

- Base URL: `https://api.adzuna.com/v1/api/jobs/in/search/{page}`
- 15 queries: role-based (`"software engineer"`, `"data analyst"`, `"frontend developer"`, `"backend developer"`, `"full stack"`, `"python developer"`, `"react developer"`, `"devops"`, `"data scientist"`, `"mobile developer"`) + remote (`"remote software"`, `"remote developer"`, `"remote data"`, `"work from home tech"`, `"remote intern"`)
- Params: `results_per_page=50`, `content-type=application/json`
- Fields mapped: `title`, `company.display_name`, `description`, `location.display_name`, `redirect_url`, `contract_type`
- Env vars: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`

### The Muse (`themuse_scraper.py`)

- Base URL: `https://www.themuse.com/api/public/jobs`
- Params: `page=0..N`, `category=Software+Engineer`, `category=Data+Science`, `category=Design`, `location=Flexible+%2F+Remote`
- No auth required
- Fields mapped: `name` → title, `company.name`, `contents` (HTML stripped), `locations[0].name`, `refs.landing_page`
- Limit: 500 results per category, paginate up to page 10

### Wellfound (`wellfound_scraper.py`)

- URL: `https://wellfound.com/jobs` with query params for remote + India
- `requests` + `BeautifulSoup`; realistic `User-Agent` header; 3s delay between pages
- Target selectors: job card container, title link, company name, location tag
- Fallback: if selectors return 0 results, log warning and return empty list (no crash)
- Max 5 pages per run (~100 jobs)

### Unstop (`unstop_scraper.py`)

- URLs: `https://unstop.com/jobs` and `https://unstop.com/internships`
- Filter: India-based + remote; target freshers/entry-level
- `requests` + `BeautifulSoup`; 2s delay between requests
- Fallback: selector failure logs warning, returns empty list

### Internshala (full rewrite)

- Updated selectors targeting current DOM structure:
  - Card: `.individual_internship`
  - Title: `.job-internship-name h3 a`
  - Company: `.company-name a`
  - Location: `.location-names span` or `.work_from_home` badge
  - Stipend: `.stipend`
  - Link: `a.view_detail_button` or title anchor
- 8 categories: CS, web dev, data science, ML, mobile, design, marketing, WFH
- 15 listings per category → ~120 internships per run
- Rate limit: 3s between category requests

### Reddit (OAuth upgrade)

- Auth: `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` via `requests.auth.HTTPBasicAuth`
- Token endpoint: `https://www.reddit.com/api/v1/access_token`
- Same subreddit list; 60 req/min vs ~10 anonymous
- Token cached in memory for scraper lifetime; refresh on 401

---

## Celery Configuration

### `scrapers/celery_app.py`

```python
app = Celery('nextstep')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(['scrapers'])
```

### `nextstep/settings.py` additions

```python
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_BEAT_SCHEDULE = { ... }  # see schedule below
```

### Beat Schedule

```python
CELERY_BEAT_SCHEDULE = {
    'remotive-every-4h':    crontab(minute=0,  hour='*/4'),
    'arbeitnow-every-4h':   crontab(minute=15, hour='*/4'),
    'adzuna-every-6h':      crontab(minute=0,  hour='*/6'),
    'themuse-every-6h':     crontab(minute=30, hour='*/6'),
    'internshala-every-8h': crontab(minute=0,  hour='*/8'),
    'wellfound-every-8h':   crontab(minute=20, hour='*/8'),
    'unstop-every-8h':      crontab(minute=40, hour='*/8'),
    'reddit-every-12h':     crontab(minute=0,  hour='*/12'),
    'hackernews-every-12h': crontab(minute=30, hour='*/12'),
    'jsearch-every-48h':    crontab(minute=0,  hour=3, day_of_week='*/2'),
}
```

Minute offsets prevent all sources firing simultaneously on shared hour boundaries.

### Task Pattern

```python
@app.task(bind=True, max_retries=3, queue='api_queue')
def run_adzuna(self):
    try:
        return AdzunaScraper().run()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 60)
```

Retry backoff: 1min → 2min → 4min. Each task is independent — failure never blocks others.

---

## Environment Variables

```bash
# Adzuna (free — developer.adzuna.com)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Reddit OAuth (free — reddit.com/prefs/apps, type: script)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Celery / Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Existing
JSEARCH_API_KEY=
```

---

## Files Changed

| File | Action |
|------|--------|
| `scrapers/celery_app.py` | CREATE |
| `scrapers/tasks.py` | CREATE |
| `scrapers/adzuna_scraper.py` | CREATE |
| `scrapers/themuse_scraper.py` | CREATE |
| `scrapers/wellfound_scraper.py` | CREATE |
| `scrapers/unstop_scraper.py` | CREATE |
| `scrapers/internshala_scraper.py` | REWRITE |
| `scrapers/reddit_scraper.py` → `multi_reddit_scraper.py` | UPGRADE (OAuth) |
| `scrapers/ncs_scraper.py` | DELETE |
| `nextstep/settings.py` | ADD Celery config block |
| `requirements.txt` | ADD `celery>=5.3`, `redis>=5.0` |
| `scrapers/run_all_scrapers.py` | KEEP (manual one-shot still works) |

---

## Monitoring

- Each Celery task returns the existing `stats` dict → stored in Redis result backend
- Django management command `python manage.py scraper_status` — prints last-run stats per source
- Existing zero-result alert in `BaseScraper.run()` fires per-task
- Logs continue to `scrapers/logs/scraper.log` via existing `logging_config.py`

---

## What Is Not Changing

- `BaseScraper` and `OpportunityData` dataclass
- `DataValidator` and `validate_opportunity()`
- `job_filter.passes_all_filters()` — all jobs still pass through India/remote gate
- `Job.objects.bulk_create()` deduplication via `ignore_conflicts=True`
- `run_all_scrapers.py` — manual orchestrator still works for local testing
