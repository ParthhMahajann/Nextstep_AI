<p align="center">
  <img src="https://img.shields.io/badge/NextStep-AI-e60023?style=for-the-badge&logo=zap&logoColor=white" alt="NextStep AI" />
</p>

<h1 align="center">NextStep AI — Intelligent Career Discovery Platform</h1>

<p align="center">
  <em>An AI-powered job discovery, resume analysis, and application tracking system built with Django, React, and Machine Learning.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Django-5.x-092E20?style=flat-square&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq_LLM-Llama_3-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/License-Academic-blue?style=flat-square" />
</p>

---

## 📋 Project Information

| Field | Details |
|---|---|
| **Project Title** | NextStep AI — Intelligent Career Discovery Platform |
| **Author** | Parth Mahajan |
| **Guide** | Mr. Neeraj Sharma |
| **Domain** | Artificial Intelligence, Machine Learning, Full-Stack Web Development |
| **Academic Year** | 2025–2026 |

---

## 📖 Abstract

**NextStep AI** is an end-to-end, AI-driven career discovery platform that aggregates job listings from **9+ live data sources**, ranks them using **machine learning models** (TF-IDF and Sentence Transformers), and provides intelligent career tools such as **AI-powered resume analysis**, **automated cover letter generation**, **interview preparation**, and a **Kanban-style application tracker**. The platform features a Tinder-style swipe interface for job discovery and learns from user behaviour through an implicit feedback loop to continuously improve recommendation quality.

---

## 🎯 Objectives

1. **Automate Job Aggregation** — Scrape and normalise job postings from multiple heterogeneous sources into a unified database.
2. **Intelligent Matching** — Apply NLP-based semantic similarity and skill-gap analysis to rank jobs by relevance to each user's profile.
3. **AI Career Assistance** — Leverage Large Language Models (Groq/Llama 3) to generate cold emails, cover letters, resume analyses, and interview preparation material.
4. **User Behaviour Learning** — Implement an implicit feedback loop (swipe events, saved jobs) to compute personalised taste vectors and adaptive ranking.
5. **End-to-End Application Tracking** — Provide a Kanban board and analytics dashboard for managing the entire job-search lifecycle.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite 7)                │
│  Landing │ Discover │ Resume Analyzer │ Kanban │ Analytics │ Chat  │
│  Zustand State  │  React Query  │  Framer Motion  │  Tailwind CSS  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API (JWT Auth)
┌──────────────────────────────▼──────────────────────────────────────┐
│                   BACKEND (Django 5 + DRF)                         │
│  Auth │ Profile │ Jobs │ Saved Jobs │ Resume Versions │ AI Views   │
│  Matching Service  │  Celery Tasks  │  Email Service               │
└────┬────────────────────┬────────────────────────┬─────────────────┘
     │                    │                        │
┌────▼──────┐    ┌────────▼────────┐     ┌─────────▼─────────┐
│ SCRAPERS  │    │   ML ENGINE     │     │    AI ENGINE       │
│ 9 Sources │    │ Skill Matcher   │     │ Groq LLM Service   │
│ Scheduler │    │ Ranking Service │     │ Email / Resume /   │
│ Validator │    │ Vectorizer      │     │ Cover Letter /     │
│ Rate Limiter│  │ Personalisation │     │ Interview Prep     │
│ Enrichment│   │ Feedback Analyzer│    │ Company Research   │
└───────────┘    └─────────────────┘     └───────────────────┘
                          │
                 ┌────────▼────────┐
                 │   PostgreSQL 16 │
                 │   (Docker)      │
                 └─────────────────┘
```

---

## 🧩 Module Breakdown

### Module 1 — Data Ingestion (Scrapers)

| Component | File | Description |
|---|---|---|
| Base Scraper | `scrapers/base_scraper.py` | Abstract base class with retry logic, rate limiting, and data validation |
| Reddit Scraper | `scrapers/multi_reddit_scraper.py` | OAuth-based scraper for multiple subreddits (r/forhire, r/IndiaJobs, etc.) |
| HackerNews | `scrapers/hackernews_scraper.py` | "Who is Hiring" thread parser |
| Remotive | `scrapers/remotive_scraper.py` | Remote job API integration |
| JSearch | `scrapers/jsearch_scraper.py` | Google Jobs aggregator via RapidAPI |
| Arbeitnow | `scrapers/arbeitnow_scraper.py` | EU/international startup jobs |
| Adzuna | `scrapers/adzuna_scraper.py` | India-focused job API (200 calls/day) |
| The Muse | `scrapers/themuse_scraper.py` | Remote-first professional jobs |
| Wellfound | `scrapers/wellfound_scraper.py` | Startup ecosystem jobs |
| Unstop | `scrapers/unstop_scraper.py` | India freshers & internships |
| Orchestrator | `scrapers/run_all_scrapers.py` | Pipeline runner with metrics, deduplication, and scheduled mode |
| Data Validator | `scrapers/data_validator.py` | Schema validation and data sanitisation |
| Job Filter | `scrapers/job_filter.py` | Language detection and location gating |
| Rate Limiter | `scrapers/rate_limiter.py` | Token-bucket rate limiting with 429 backoff |

### Module 2 — Machine Learning Engine

| Component | File | Description |
|---|---|---|
| Skill Matcher | `ml_engine/skill_matcher.py` | Semantic skill matching using `all-MiniLM-L6-v2` Sentence Transformer embeddings |
| TF-IDF Vectorizer | `ml_engine/vectorizer.py` | Job description vectorisation with cached fitted models |
| Ranking Service | `ml_engine/ranking_service.py` | Multi-signal weighted ranking (skill overlap + semantic similarity + preference + recency + taste) |
| ML Enrichment | `ml_engine/ml_enrichment.py` | Local NLP pipeline: skill extraction (250+ taxonomy), experience classification, role classification, extractive summarisation |
| Personalisation | `ml_engine/personalization.py` | User taste vector computation from saved job embeddings |
| Feedback Analyzer | `ml_engine/feedback_analyzer.py` | Skip-penalty computation from swipe event history |
| Embedding Store | `ml_engine/embedding_store.py` | Serialisation/deserialisation of numpy embedding vectors |

### Module 3 — AI Engine (LLM Integration)

| Feature | Method | Description |
|---|---|---|
| Cold Email Generation | `generate_cold_email()` | Context-aware outreach email with subject line |
| Resume Analysis | `analyze_resume()` | Strengths, improvements, keyword gaps, match score |
| Job-Tailored Suggestions | `generate_job_tailored_suggestions()` | 5–7 actionable resume edits for a specific job |
| Resume Tailoring | `tailor_resume()` | Full resume rewrite with ATS score before/after |
| Cover Letter | `generate_cover_letter()` | Professional cover letter generation |
| Interview Prep | `generate_interview_prep()` | 8 Q&A pairs (technical, behavioural, company-specific) |
| Company Research | `research_company()` | Overview, culture, tech stack, interview format, tips |
| AI Chat | `chat()` | Conversational career assistant with user context |

**Models Used:** Llama 3.1 8B Instant (fast), Llama 3.3 70B Versatile (smart), Gemma 2 9B IT (balanced)

### Module 4 — Backend API (Django REST Framework)

| Endpoint Group | Key Endpoints | Description |
|---|---|---|
| **Authentication** | `/auth/register/`, `/auth/login/`, `/auth/verify-email/`, `/auth/password-reset/` | JWT-based auth with email verification and password reset |
| **Profile** | `/profile/`, `/users/me/skill-suggestions/`, `/users/me/taste-profile/` | User profile CRUD, ML-powered skill suggestions, taste vector summary |
| **Jobs** | `/jobs/`, `/jobs/{id}/recommended/`, `/jobs/{id}/match_score/`, `/jobs/{id}/skill_gap/`, `/jobs/{id}/similar/`, `/jobs/{id}/skip/` | Job listing with ML-ranked recommendations, skill gap analysis, similar jobs |
| **Saved Jobs** | `/saved-jobs/`, `/saved-jobs/{id}/generate-email/`, `/saved-jobs/analytics/` | Application tracking with pipeline analytics |
| **AI** | `/ai/generate-email/`, `/ai/analyze-resume/`, `/ai/cover-letter/`, `/ai/interview-prep/`, `/ai/tailor-resume/`, `/ai/company-research/`, `/ai/chat/` | Full AI feature suite |
| **Resume Versions** | `/resume-versions/` | Multiple named resume versions per user |

### Module 5 — Frontend (React SPA)

| Page / Component | File | Description |
|---|---|---|
| Landing Page | `LandingPage.jsx` | Marketing page with animated sections, feature cards, stats |
| Discover (Swipe) | `DiscoverPage.jsx` | Tinder-style card swiping with match scores |
| Resume Analyzer | `ResumeAnalyzerPage.jsx` | Upload, parse, analyse, and tailor resumes |
| Kanban Tracker | `KanbanPage.jsx` | Drag-and-drop application pipeline board |
| Analytics | `AnalyticsPage.jsx` | Pipeline funnel, response rates, skill trends |
| Profile | `ProfilePage.jsx` | Multi-section profile editor with skills, education, resume |
| Signup Wizard | `SignupWizard.jsx` | Multi-step onboarding with profile completion |
| AI Chat Widget | `AIChatWidget.jsx` | Floating conversational AI assistant |
| Swipe Card | `SwipeCard.jsx` | Animated swipe interaction component |
| Job Detail Sheet | `JobDetailSheet.jsx` | Bottom sheet with full job details and actions |
| Interview Prep Modal | `InterviewPrepModal.jsx` | AI-generated Q&A practice interface |
| Apply Modal | `ApplyModal.jsx` | AI email/cover letter generation for applications |

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.10+ | Core programming language |
| Django 5.x | Web framework |
| Django REST Framework | RESTful API layer |
| SimpleJWT | JSON Web Token authentication |
| PostgreSQL 16 | Primary database |
| Celery + Redis | Asynchronous task queue |
| APScheduler | Scheduled scraping jobs |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI library |
| Vite 7 | Build tool and dev server |
| React Router 7 | Client-side routing |
| Zustand 5 | Lightweight state management |
| TanStack React Query 5 | Server state and caching |
| Framer Motion 12 | Animations and gestures |
| Tailwind CSS 4 | Utility-first styling |
| Lucide React | Icon library |
| Axios | HTTP client |

### AI / ML
| Technology | Purpose |
|---|---|
| Groq API (Llama 3) | LLM inference for generative AI features |
| Sentence Transformers (`all-MiniLM-L6-v2`) | Semantic embedding generation |
| scikit-learn | TF-IDF vectorisation, cosine similarity |
| NumPy | Numerical operations and embedding arithmetic |
| PyPDF2 / python-docx | Resume file parsing (PDF/DOCX) |

### DevOps
| Technology | Purpose |
|---|---|
| Docker Compose | PostgreSQL containerisation |
| WhiteNoise | Static file serving |
| pytest + pytest-django | Automated testing |

---

## 📊 Data Models (ER Overview)

```
User (Django Auth)
 └──1:1── UserProfile
              ├── bio, experience_level, education (JSON), resume_text, resume_file
              ├── preferred_job_types (JSON), preferred_locations (JSON)
              ├── liked_embedding (binary — taste vector)
              ├──1:N── UserSkill ──N:1── Skill (name, category, embedding)
              ├──1:N── SavedJob ──N:1── Job
              │            ├── status (saved → preparing → applied → interviewing → accepted/rejected)
              │            ├── email_draft, cover_letter, match_score
              │            └── interview_date, follow_up_date
              ├──1:N── ResumeVersion (name, content, target_role)
              └──1:N── SwipeEvent (action: skip/save/apply, card_position)

Job
 ├── title, company, location, description, job_type, apply_link, source
 ├── ai_summary, experience_level, role_type, ai_skills (JSON)
 ├── embedding (binary), is_enriched
 └──N:M── Skill (required_skills)

EmailVerificationToken ──1:1── User
PasswordResetToken     ──1:1── User
```

---

## ⚙️ Installation & Setup

### Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18 or higher
- **Docker** (for PostgreSQL)
- **Git**

### Step 1 — Clone the Repository

```bash
git clone https://github.com/ParthhMahajann/Nextstep_AI.git
cd Nextstep_AI
```

### Step 2 — Start PostgreSQL via Docker

```bash
docker compose up -d
```

### Step 3 — Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cd nextstep
copy .env.example .env         # Windows
# cp .env.example .env          # macOS/Linux

# Edit .env and set:
#   DJANGO_SECRET_KEY=<generate one>
#   GROQ_API_KEY=<get free key at https://console.groq.com>

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Step 4 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:8000`.

### Step 5 — Run Job Scrapers (Optional)

```bash
cd scrapers
python run_all_scrapers.py              # Full run
python run_all_scrapers.py --quick      # Quick test
python run_all_scrapers.py --enrich     # With ML enrichment
python run_all_scrapers.py --scheduled  # Continuous mode
```

---

## 🧪 Testing

```bash
cd nextstep
pytest                          # Run all tests
pytest core/tests/test_models.py       # Model tests
pytest core/tests/test_views.py        # API view tests
pytest core/tests/test_auth.py         # Authentication tests
pytest core/tests/test_ai_views.py     # AI endpoint tests
pytest core/tests/test_scrapers.py     # Scraper tests
pytest core/tests/test_serializers.py  # Serializer tests
```

**Test Coverage:**
- Model creation, relationships, and signal handlers
- JWT authentication flow (register → verify email → login → logout)
- Password reset flow
- API endpoints (CRUD for jobs, saved jobs, resume versions)
- AI view request/response validation
- Scraper data validation and deduplication

---

## 🔑 Key Algorithms

### 1. Multi-Signal Ranking Formula

```
score = w₁ × skill_overlap + w₂ × semantic_similarity + w₃ × preference_match + w₄ × recency_score + w₅ × taste_score
```

| Weight | Default | With Taste Vector |
|---|---|---|
| Skill Match (w₁) | 0.40 | 0.30 |
| Semantic Similarity (w₂) | 0.30 | 0.20 |
| Preference Match (w₃) | 0.20 | 0.15 |
| Recency (w₄) | 0.10 | 0.10 |
| Taste Vector (w₅) | — | 0.25 |

### 2. Skill Extraction Pipeline

- **Taxonomy:** 250+ curated skills across 12 categories (programming, frontend, backend, databases, cloud, ML, mobile, testing, tools, security, design, marketing)
- **Multi-word greedy match** (longest-first) + **word-boundary regex** for single-word skills
- **Variant normalisation** (e.g., `reactjs` → `react`, `k8s` → `kubernetes`)

### 3. Experience Level Classification

Weighted pattern matching with title signals weighted 3× higher than description signals. Categories: Entry, Mid, Senior, Any.

### 4. User Taste Vector

Mean embedding of all positively-interacted jobs (saved/applied/interviewing/accepted), computed on-the-fly and cached in the user profile.

### 5. Skip Penalty Feedback Loop

Analyses swipe-skip history to identify disliked role types and experience levels, then applies multiplicative penalties to future ranking scores.

---

## 📁 Project Structure

```
Nextstep_AI/
├── ai_engine/                    # LLM integration layer
│   ├── groq_service.py           #   Groq API service (email, resume, interview, chat)
│   └── job_enrichment.py         #   AI-powered job enrichment
├── ml_engine/                    # Machine learning pipeline
│   ├── skill_matcher.py          #   Sentence Transformer skill matching
│   ├── vectorizer.py             #   TF-IDF vectoriser with caching
│   ├── ranking_service.py        #   Multi-signal job ranking
│   ├── ml_enrichment.py          #   Local NLP enrichment (no API)
│   ├── personalization.py        #   User taste vector computation
│   ├── feedback_analyzer.py      #   Skip-penalty calculator
│   └── embedding_store.py        #   Embedding serialisation utils
├── scrapers/                     # Data ingestion pipeline
│   ├── base_scraper.py           #   Abstract base with retry + rate limiting
│   ├── run_all_scrapers.py       #   Orchestrator with metrics + scheduling
│   ├── data_validator.py         #   Schema validation + sanitisation
│   ├── job_filter.py             #   Language + location filters
│   ├── rate_limiter.py           #   Token-bucket rate limiter
│   ├── retry_decorator.py        #   Exponential backoff retry
│   ├── scheduler.py              #   APScheduler integration
│   └── *_scraper.py              #   9 source-specific scrapers
├── nextstep/                     # Django project root
│   ├── core/                     #   Main Django app
│   │   ├── models.py             #     Data models (10 models)
│   │   ├── views.py              #     API views (15+ endpoints)
│   │   ├── ai_views.py           #     AI-specific API views
│   │   ├── serializers.py        #     DRF serialisers
│   │   ├── ai_serializers.py     #     AI endpoint serialisers
│   │   ├── matching.py           #     ML ↔ Django bridge service
│   │   ├── urls.py               #     URL routing
│   │   ├── admin.py              #     Django admin configuration
│   │   ├── file_utils.py         #     Resume PDF/DOCX parsing
│   │   └── tests/                #     Automated test suite (7 test files)
│   └── nextstep/                 #   Django settings
│       ├── settings.py           #     Project configuration
│       ├── celery.py             #     Celery async task config
│       └── urls.py               #     Root URL configuration
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── pages/                #     14 page components
│   │   ├── components/           #     12 reusable components
│   │   ├── store/                #     Zustand stores (auth, jobs)
│   │   ├── api/                  #     Axios API client
│   │   ├── hooks/                #     Custom React hooks
│   │   ├── App.jsx               #     Root component with routing
│   │   └── index.css             #     Global styles
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml            # PostgreSQL container
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

---

## 🚀 Features Summary

| # | Feature | AI/ML | Description |
|---|---|---|---|
| 1 | Multi-source Job Aggregation | — | 9 scrapers with rate limiting, retry, validation |
| 2 | Swipe-to-Discover Interface | ✅ | Tinder-style cards with ML match scores |
| 3 | Semantic Skill Matching | ✅ | Sentence Transformer embeddings + cosine similarity |
| 4 | TF-IDF Job Vectorisation | ✅ | Cached vectoriser for text similarity |
| 5 | Multi-Signal Ranking | ✅ | 5-factor weighted scoring formula |
| 6 | Resume Analysis | ✅ | AI-powered strengths, gaps, keyword analysis |
| 7 | Resume Tailoring | ✅ | Job-specific rewrite with ATS score comparison |
| 8 | Cover Letter Generation | ✅ | Context-aware professional cover letters |
| 9 | Cold Email Drafting | ✅ | Outreach email with subject line |
| 10 | Interview Preparation | ✅ | 8 Q&A pairs per job (technical + behavioural) |
| 11 | Company Research | ✅ | Culture, tech stack, interview format insights |
| 12 | AI Chat Assistant | ✅ | Floating conversational career coach |
| 13 | Kanban Application Tracker | — | Drag-and-drop pipeline (6 statuses) |
| 14 | Analytics Dashboard | — | Response rates, offer rates, skill trends |
| 15 | Personalised Taste Vector | ✅ | Learned from saved/applied job embeddings |
| 16 | Skip Feedback Loop | ✅ | Negative signal penalties on rankings |
| 17 | Skill Gap Analysis | ✅ | Per-job user vs. required skill comparison |
| 18 | Similar Jobs | ✅ | Embedding-based nearest-neighbour recommendations |
| 19 | Skill Suggestions | ✅ | Trending skills from saved job pipeline |
| 20 | ML Job Enrichment | ✅ | Auto skill extraction, role/experience classification, summarisation |
| 21 | Email Verification | — | Token-based email verification flow |
| 22 | Password Reset | — | Secure token-based password reset |
| 23 | Resume File Parsing | — | PDF and DOCX text extraction |
| 24 | Multiple Resume Versions | — | Named resumes for different target roles |

---

## 🔮 Future Scope

1. **Collaborative Filtering** — Recommend jobs based on similar users' interactions.
2. **Real-time Notifications** — WebSocket-based alerts for new matching jobs.
3. **Mobile Application** — React Native port for iOS/Android.
4. **Advanced Analytics** — Time-series analysis of application success rates.
5. **Resume Builder** — AI-assisted resume creation from scratch.
6. **Recruiter Portal** — Dual-sided marketplace for employers.

---

## 📚 References

1. Reimers, N. & Gurevych, I. (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.* EMNLP.
2. Django Software Foundation. *Django Documentation.* https://docs.djangoproject.com/
3. Meta AI. *Llama 3 Model Card.* https://ai.meta.com/llama/
4. Groq Inc. *Groq API Documentation.* https://console.groq.com/docs
5. scikit-learn developers. *TF-IDF Vectorizer.* https://scikit-learn.org/

---

## 👤 Author

**Parth Mahajan**

- GitHub: [@ParthhMahajann](https://github.com/ParthhMahajann)

**Project Guide:** Mr. Neeraj Sharma

---

<p align="center">
  <strong>NextStep AI</strong> — Built to get you hired faster. ⚡
</p>
