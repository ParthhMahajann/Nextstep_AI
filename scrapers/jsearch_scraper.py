"""
JSearch scraper for NextStep AI.

JSearch (RapidAPI) aggregates jobs from LinkedIn, Indeed, Glassdoor, and more.
API docs: https://rapidapi.com/letscrape-6baf62026371/api/jsearch

Setup:
    1. Sign up at https://rapidapi.com
    2. Subscribe to JSearch (free tier: 200 requests/month)
    3. Add JSEARCH_API_KEY to your .env file
"""

import os
import sys
import logging
import requests
from typing import List

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)

# Explicitly load .env so env vars are available when run from scrapers/
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_DIR, ".env"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class JSearchScraper(BaseScraper):
    """
    Scraper for JSearch (RapidAPI) — aggregates LinkedIn, Indeed, Glassdoor jobs.

    Free tier gives 200 requests/month. Each call returns up to 10 jobs,
    so we page through multiple queries to maximise yield within the limit.
    """

    source_name = "jsearch"
    rate_limit_delay = 2.0  # Be polite — free tier is limited

    API_URL = "https://jsearch.p.rapidapi.com/search"

    # Queries tuned for entry-level / internship / remote roles
    DEFAULT_QUERIES = [
        "software engineer internship remote",
        "junior developer remote",
        "frontend developer entry level",
        "backend developer internship",
        "data analyst entry level remote",
        "full stack developer junior",
        "python developer internship",
        "react developer junior remote",
    ]

    JOB_TYPE_MAP = {
        "FULLTIME": "job",
        "PARTTIME": "part-time",
        "CONTRACTOR": "contract",
        "INTERN": "internship",
    }

    def __init__(self, queries: List[str] = None, limit: int = 50):
        super().__init__()
        self.api_key = os.environ.get("JSEARCH_API_KEY", "")
        self.queries = queries or self.DEFAULT_QUERIES
        self.limit = limit  # Max total jobs to fetch across all queries

    def _get_headers(self) -> dict:
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        }

    def _map_job_type(self, raw_type: str) -> str:
        """Normalise JSearch employment type to our Job.job_type choices."""
        return self.JOB_TYPE_MAP.get(raw_type.upper() if raw_type else "", "job")

    def _build_opportunity(self, item: dict) -> OpportunityData:
        """Convert a single JSearch result dict into OpportunityData."""
        title = (item.get("job_title") or "Position")[:255]
        company = (item.get("employer_name") or "Company")[:255]

        # Location — prefer city/state/country; fall back to remote flag
        city = item.get("job_city") or ""
        state = item.get("job_state") or ""
        country = item.get("job_country") or ""
        is_remote = item.get("job_is_remote", False)

        if is_remote:
            location = "Remote"
            if country:
                location = f"Remote - {country}"
        else:
            parts = [p for p in [city, state, country] if p]
            location = ", ".join(parts) if parts else "Location not specified"

        location = location[:255]

        # Description — combine highlights if available
        description = item.get("job_description") or ""
        highlights = item.get("job_highlights") or {}
        qualifications = highlights.get("Qualifications") or []
        responsibilities = highlights.get("Responsibilities") or []
        benefits = highlights.get("Benefits") or []

        if qualifications:
            description += "\n\nQualifications:\n" + "\n".join(f"- {q}" for q in qualifications)
        if responsibilities:
            description += "\n\nResponsibilities:\n" + "\n".join(f"- {r}" for r in responsibilities)
        if benefits:
            description += "\n\nBenefits:\n" + "\n".join(f"- {b}" for b in benefits)

        description = description.strip()[:10000]

        # Apply link — prefer direct apply URL, fall back to job URL
        apply_link = (
            item.get("job_apply_link")
            or item.get("job_google_link")
            or "https://rapidapi.com/letscrape-6baf62026371/api/jsearch"
        )

        job_type = self._map_job_type(item.get("job_employment_type") or "")

        # If title suggests internship, override type
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["intern", "internship", "trainee"]):
            job_type = "internship"
        elif any(kw in title_lower for kw in ["freelance", "contract"]):
            job_type = "contract"

        return OpportunityData(
            title=title,
            company=company,
            description=description,
            job_type=job_type,
            apply_link=apply_link,
            location=location,
            source=self.source_name,
            raw_data={
                "job_id": item.get("job_id"),
                "publisher": item.get("job_publisher"),
                "posted_at": item.get("job_posted_at_datetime_utc"),
                "salary_min": item.get("job_min_salary"),
                "salary_max": item.get("job_max_salary"),
                "salary_currency": item.get("job_salary_currency"),
                "required_experience": item.get("job_required_experience"),
                "required_skills": item.get("job_required_skills") or [],
            },
        )

    def _fetch_query(self, query: str, page: int = 1) -> List[dict]:
        """Fetch one page of results for a single query."""
        self._respect_rate_limit()

        params = {
            "query": query,
            "page": str(page),
            "num_pages": "1",
            "date_posted": "month",   # Jobs posted in the last month
        }

        try:
            response = requests.get(
                self.API_URL,
                headers=self._get_headers(),
                params=params,
                timeout=20,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data") or []
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response is not None else None
            if status_code == 429:
                logger.warning("JSearch rate limit hit — stopping early")
                raise
            if status_code == 403:
                logger.error(
                    "JSearch API returned 403 Forbidden. "
                    "Check that JSEARCH_API_KEY is valid and you are subscribed to JSearch on RapidAPI."
                )
                raise  # Stop all queries — auth won't fix itself mid-run
            logger.error(f"HTTP error for query '{query}': {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching query '{query}': {e}")
            return []

    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch jobs from JSearch across all configured queries."""
        if not self.api_key:
            raise ValueError(
                "JSEARCH_API_KEY not set. "
                "Sign up at https://rapidapi.com and subscribe to JSearch (free tier)."
            )

        opportunities: List[OpportunityData] = []
        seen_job_ids: set = set()

        logger.info(f"JSearch: fetching up to {self.limit} jobs across {len(self.queries)} queries")

        for query in self.queries:
            if len(opportunities) >= self.limit:
                break

            logger.debug(f"JSearch query: '{query}'")

            try:
                items = self._fetch_query(query)
            except requests.exceptions.HTTPError:
                # 403 (auth) or 429 (rate limit) — abort remaining queries
                break

            for item in items:
                if len(opportunities) >= self.limit:
                    break

                job_id = item.get("job_id")
                if job_id and job_id in seen_job_ids:
                    continue  # De-duplicate within this run
                if job_id:
                    seen_job_ids.add(job_id)

                try:
                    opp = self._build_opportunity(item)
                    opportunities.append(opp)
                except Exception as e:
                    logger.warning(f"Failed to parse job item: {e}")

        logger.info(f"JSearch: collected {len(opportunities)} opportunities")
        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name="jsearch")

    scraper = JSearchScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
