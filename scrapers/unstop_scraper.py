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
