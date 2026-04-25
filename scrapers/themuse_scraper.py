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
