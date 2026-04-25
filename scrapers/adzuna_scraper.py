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
