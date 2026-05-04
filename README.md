# NextStep AI

**An AI-Powered Job Discovery and Career Intelligence Platform**

NextStep AI aggregates job listings from eight sources, ranks them with a multi-signal ML engine, and presents them through a Tinder-style swipe interface -- paired with a full suite of Groq-powered AI career tools.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [ML Ranking Engine](#ml-ranking-engine)
- [AI Engine](#ai-engine)
- [Job Scrapers](#job-scrapers)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)
- [Production Deployment](#production-deployment)

---

## Features

### Job Discovery
- **Tinder-style swipe interface** -- Skip (left), Save (up), Apply (right)
- **AI-personalised recommendations** via multi-signal ML ranking
- **Real-time search** by title, company, location on the live feed
- **Advanced filters** -- job type, source platform, location
- **Job detail sheet** -- full description, skills, match score, AI summary
- **Similar jobs** -- embedding-based cosine similarity search

### Application Management
- **Kanban tracker** -- six-stage pipeline: Saved, Preparing, Applied, Interviewing, Rejected, Accepted
- **Bulk actions** -- select multiple cards, move to any stage at once
- **CSV export** -- download full application history as a spreadsheet
- **Interview scheduling** -- attach interview date and follow-up reminders to any application

### Analytics
- Pipeline funnel with per-stage counts and horizontal bar chart
- Response rate and offer rate metrics
- Top skills appearing across saved jobs

### AI Career Tools (Groq / LLaMA)

| Tool | Model | Description |
|------|-------|-------------|
| Cold Email Drafting | LLaMA 3.1 8B | Personalised outreach email for any job |
| Cover Letter | LLaMA 3.1 8B | Professional cover letter tailored to the role |
| Resume Analysis | LLaMA 3.3 70B | ATS score, strengths, improvements, keyword gap |
| Resume Tailoring | LLaMA 3.3 70B | Full resume rewrite optimised for a target job |
| Interview Prep | LLaMA 3.3 70B | 8 Q&A pairs (technical, behavioural, company-specific) |
| Company Research | LLaMA 3.1 8B | Culture, tech stack, interview format, red flags |
| Application Tips | LLaMA 3.1 8B | 5 specific tips for the target role |
| AI Chat Assistant | LLaMA 3.1 8B | Conversational career coach aware of your profile |

### Auth and Profile
- Email + password registration with **JWT authentication** (access: 1 hr, refresh: 7 d)
- **Email verification** via 24-hour single-use UUID token (sent async via Celery)
- **Password reset** via email (1-hour token, single-use)
- Profile: bio, skills with proficiency ratings, education, qualifications, resume upload (PDF/DOCX), LinkedIn/GitHub/portfolio links
- **Multi-version resume management** with named versions and target role metadata
- **Skill suggestions** derived automatically from your saved jobs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.x + Django REST Framework 3.14 |
| Auth | djangorestframework-simplejwt (JWT) |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Async Tasks | Celery 5.3 |
| AI | Groq API (LLaMA 3.1 8B, LLaMA 3.3 70B, Gemma2 9B) |
| ML / NLP | scikit-learn, sentence-transformers (all-MiniLM-L6-v2), numpy |
| Scraping | requests, BeautifulSoup4, lxml |
| Scheduler | APScheduler 3.10 |
| WSGI | Gunicorn 21 |
| Static Files | WhiteNoise 6.6 |
| Frontend | React 18 + Vite 5 |
| State | Zustand |
| Animations | Framer Motion |
| Icons | Lucide React |
| Containers | Docker + Docker Compose |

---

## Architecture

```
React SPA (Vite / Zustand / Framer Motion)
           |  HTTP/JSON + JWT Bearer
Django REST Framework API
  JWT Auth | Rate Throttling | DjangoFilter | Pagination
     |              |               |
 PostgreSQL      ML Engine      Groq AI Engine
                 Ranking         LLaMA 3.1 8B (fast)
                 Embeddings      LLaMA 3.3 70B (smart)
                 Taste Vector
           |
Celery Workers (Redis broker)
  send_verification_email | send_password_reset_email
           |
Job Scraping Engine (APScheduler)
  Internshala | Arbeitnow | JSearch | Remotive
  HackerNews  | Reddit x2 | Adzuna
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- A free [Groq API key](https://console.groq.com)

### 1. Install dependencies

```bash
git clone <repo-url>
cd Nextstep_AI

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### 2. Start PostgreSQL and Redis

```bash
docker-compose up -d
```

### 3. Configure environment

```bash
cp nextstep/.env.example nextstep/.env
# Edit nextstep/.env -- see Environment Variables section
```

### 4. Migrate and run backend

```bash
cd nextstep
python manage.py migrate
python manage.py runserver      # http://localhost:8000
```

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000 (proxies /api to :8000)
```

### 6. Start Celery (for real email delivery)

```bash
# From the nextstep/ directory:
celery -A nextstep worker --pool=solo --loglevel=info    # Windows
# celery -A nextstep worker --loglevel=info              # Linux/macOS
```

> **Windows note:** Always use `--pool=solo`. The default prefork pool raises a `PermissionError` on Windows.

### 7. Run scrapers (optional)

```bash
cd scrapers
python run_all_scrapers.py
```

---

## Environment Variables

Create `nextstep/.env`:

```
# Django
DJANGO_SECRET_KEY=your-50-char-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://postgres:nextstep_dev_2026@localhost:5432/nextstep_ai

# Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
REDIS_CACHE_URL=redis://localhost:6379/1

# AI
GROQ_API_KEY=gsk_...

# Email (optional -- console backend used if not set)
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Scraper API keys (optional)
RAPIDAPI_KEY=...        # JSearch scraper
ADZUNA_APP_ID=...       # Adzuna scraper
ADZUNA_APP_KEY=...
```

Generate a Django secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## API Reference

All endpoints require `Authorization: Bearer <access_token>` unless marked **No auth**.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register/ | No | Register (triggers email verification) |
| POST | /api/auth/login/ | No | Get JWT token pair |
| POST | /api/auth/refresh/ | No | Refresh access token |
| POST | /api/auth/logout/ | Yes | Blacklist refresh token |
| GET | /api/auth/me/ | Yes | Current user |
| POST | /api/auth/verify-email/ | No | Verify email with UUID token |
| POST | /api/auth/resend-verification/ | No | Resend verification email |
| POST | /api/auth/password-reset/ | No | Request password reset |
| POST | /api/auth/password-reset/confirm/ | No | Confirm password reset |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/jobs/ | Paginated list (filterable, searchable) |
| GET | /api/jobs/{id}/ | Job detail |
| GET | /api/jobs/recommended/ | ML-personalised feed (up to 50) |
| GET | /api/jobs/{id}/match_score/ | Match score + explanation |
| GET | /api/jobs/{id}/skill_gap/ | Matched vs missing skills |
| POST | /api/jobs/{id}/skip/ | Record skip for ML feedback |
| GET | /api/jobs/{id}/similar/ | Up to 8 embedding-similar jobs |

Filters: `job_type`, `source`, `location`. Search: `title`, `company`, `description`.

### Saved Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/saved-jobs/ | List saved jobs |
| POST | /api/saved-jobs/ | Save a job (idempotent) |
| PATCH | /api/saved-jobs/{id}/ | Update status, notes, interview date |
| DELETE | /api/saved-jobs/{id}/ | Remove |
| POST | /api/saved-jobs/{id}/generate_email/ | AI cold email for this job |
| GET | /api/saved-jobs/analytics/ | Pipeline metrics |

### AI Endpoints (30 req/hour per user)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/generate-email/ | Cold outreach email |
| POST | /api/ai/analyze-resume/ | Resume analysis + ATS score |
| POST | /api/ai/cover-letter/ | Cover letter |
| POST | /api/ai/application-tips/ | 5 application tips |
| POST | /api/ai/interview-prep/ | 8 interview Q&A pairs |
| POST | /api/ai/tailor-resume/ | ATS-optimised resume rewrite |
| POST | /api/ai/company-research/ | Company intelligence report |
| POST | /api/ai/chat/ | Conversational career assistant |

### Profile and Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | /api/profile/ | Get or update profile |
| CRUD | /api/user-skills/ | Manage skills with proficiency ratings |
| CRUD | /api/resume-versions/ | Named resume versions |
| GET | /api/users/me/skill-suggestions/ | Skills in saved jobs not in profile |
| GET | /api/users/me/taste-profile/ | Inferred role and skill preferences |
| GET | /api/health/ | Health check (no auth) |

---

## ML Ranking Engine

`ml_engine/ranking_service.py`

**Without taste vector (new user):**

```
score = 0.40 x skill_overlap
      + 0.30 x semantic_similarity    (sentence-transformers cosine)
      + 0.20 x preference_match       (job type + location)
      + 0.10 x recency_score          (1 / (1 + days_old / 7))
```

**With taste vector (returning user):**

```
score = 0.30 x skill_overlap
      + 0.20 x semantic_similarity
      + 0.15 x preference_match
      + 0.10 x recency_score
      + 0.25 x taste_score            (cosine(mean_saved_embeddings, job_embedding))
```

The taste vector is recomputed automatically on every SavedJob status change via a Django post_save signal.

Precompute embeddings:

```bash
cd nextstep
python manage.py precompute_embeddings
python manage.py precompute_embeddings --limit 500
```

---

## AI Engine

`ai_engine/groq_service.py` -- GroqAIService is fully decoupled from Django.

```python
from ai_engine.groq_service import get_ai_service

ai = get_ai_service()

# Resume analysis
result = ai.analyze_resume(
    resume_text="...",
    job_description="...",
    job_title="Software Engineer",
)
print(result.match_score)        # e.g. 0.78
print(result.keywords_missing)  # e.g. ['Kubernetes', 'Go']

# Cold email generation
email = ai.generate_cold_email(
    job_title="Backend Engineer",
    company="Acme Corp",
    job_description="...",
    user_name="Parth Mahajan",
    user_skills=["Python", "Django", "PostgreSQL"],
)
print(email.subject)
print(email.body)
```

---

## Job Scrapers

| Class | Source | Method |
|-------|--------|--------|
| IntershalaScraper | Internshala | HTML (BeautifulSoup) |
| ArbeitnowScraper | Arbeitnow.com | JSON API (public) |
| JSearchScraper | JSearch / RapidAPI | REST API (RAPIDAPI_KEY required) |
| RemotiveScraper | Remotive.com | JSON API (public) |
| HackerNewsScraper | HN Who is Hiring | Algolia API |
| MultiRedditScraper | r/forhire, r/cscareerquestions | Reddit JSON (no auth) |
| RedditForHireJsonScraper | r/forhire | Reddit JSON (high volume) |
| AdzunaScraper | Adzuna India | REST API (ADZUNA_APP_ID + KEY required) |

```bash
# Run all scrapers
cd scrapers && python run_all_scrapers.py

# Check scraper status
cd nextstep && python manage.py scraper_status
```

---

## Project Structure

```
Nextstep_AI/
├── nextstep/                        # Django project root
│   ├── nextstep/
│   │   ├── settings.py              # All config (env-driven, fail-safe defaults)
│   │   ├── urls.py                  # Root router + SPA fallback
│   │   ├── celery.py
│   │   └── wsgi.py
│   └── core/
│       ├── models.py                # UserProfile, Job, SavedJob, SwipeEvent ...
│       ├── views.py                 # Auth, Profile, Job, SavedJob, ML views
│       ├── ai_views.py              # 8 AI endpoint views
│       ├── serializers.py
│       ├── ai_serializers.py
│       ├── urls.py
│       ├── tasks.py                 # Celery email tasks (3 auto-retries)
│       ├── matching.py              # ML service adapter
│       ├── file_utils.py            # PDF/DOCX resume parser
│       ├── migrations/              # 9 schema migrations
│       ├── management/commands/
│       │   ├── precompute_embeddings.py
│       │   └── scraper_status.py
│       └── tests/                   # Full pytest suite
├── ai_engine/
│   ├── groq_service.py              # GroqAIService -- 8 career AI features
│   └── job_enrichment.py
├── ml_engine/
│   ├── ranking_service.py           # Multi-signal job ranker
│   ├── skill_matcher.py
│   ├── vectorizer.py
│   ├── embedding_store.py
│   ├── personalization.py
│   ├── feedback_analyzer.py
│   └── ml_enrichment.py
├── scrapers/
│   ├── base_scraper.py
│   ├── internshala_scraper.py
│   ├── arbeitnow_scraper.py
│   ├── jsearch_scraper.py
│   ├── remotive_scraper.py
│   ├── hackernews_scraper.py
│   ├── multi_reddit_scraper.py
│   ├── reddit_forhire_json_scraper.py
│   ├── adzuna_scraper.py
│   ├── data_validator.py
│   ├── job_filter.py
│   ├── enrich_jobs.py
│   ├── rate_limiter.py
│   ├── retry_decorator.py
│   ├── run_all_scrapers.py
│   └── scheduler.py
├── frontend/
│   ├── src/
│   │   ├── pages/                   # DiscoverPage, KanbanPage, AnalyticsPage ...
│   │   ├── components/              # SwipeCard, JobDetailSheet, AIChatWidget ...
│   │   ├── store/                   # authStore.js, jobsStore.js (Zustand)
│   │   ├── api/client.js            # Axios + JWT refresh interceptors
│   │   └── hooks/useIsMobile.js
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml               # PostgreSQL 16 + Redis 7
├── requirements.txt
└── README.md
```

---

## Running Tests

```bash
cd nextstep
pytest                           # all tests
pytest core/tests/test_auth.py  # single file
pytest -v --tb=short             # verbose
pytest --cov=core                # with coverage
```

| File | Coverage area |
|------|--------------|
| test_auth.py | Registration, verification, login, logout, password reset |
| test_models.py | Model fields, constraints, signals, token expiry |
| test_views.py | Job listing, filters, saved job CRUD, analytics |
| test_ai_views.py | AI endpoint validation, throttle behaviour |
| test_serializers.py | Field validation, username rules, edge cases |
| test_scrapers.py | Parser correctness, deduplication |
| test_celery.py | Task dispatch, retry behaviour |

---

## Production Deployment

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Collect static files
cd nextstep && python manage.py collectstatic --noinput

# 3. Start infrastructure
docker-compose up -d

# 4. Run with Gunicorn
gunicorn nextstep.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120
```

**Production checklist:**
- `DJANGO_DEBUG=False`
- Strong `DJANGO_SECRET_KEY` (50+ characters)
- HTTPS with valid TLS certificate (HSTS enforced automatically when DEBUG=False)
- `DATABASE_URL` pointing to a managed PostgreSQL instance
- Celery workers running (`--pool=solo` on Windows)
- `EMAIL_HOST_USER` + `EMAIL_HOST_PASSWORD` configured
- `GROQ_API_KEY` set for AI features

**Rate limits:**

| Scope | Limit |
|-------|-------|
| Anonymous | 100 req/hour |
| Authenticated | 1000 req/hour |
| Auth endpoints (register, reset) | 10 req/hour |
| AI endpoints | 30 req/hour |

---

## Author

**Parth Mahajan** | Roll No: 2023BTCSE012 | JLU ID: jlu08052
B.Tech CSE, Jagran Lakecity University, Bhopal
Guide: Mr. Neeraj Sharma, Department of CSE, JLU Bhopal
