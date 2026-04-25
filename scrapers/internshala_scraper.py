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
