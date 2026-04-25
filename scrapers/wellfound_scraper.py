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
