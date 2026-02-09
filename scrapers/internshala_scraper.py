"""
Internshala scraper for India-based internships.

Internshala is India's leading internship platform.
This scraper fetches publicly listed internships.
"""

import os
import sys
import logging
import requests
from typing import List
from bs4 import BeautifulSoup

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class InternshalaScraper(BaseScraper):
    """Scraper for Internshala internships."""
    
    source_name = "internshala"
    rate_limit_delay = 2.0
    
    # Categories to scrape
    CATEGORIES = [
        "work-from-home-internships",
        "computer-science-internship",
        "web-development-internship",
        "python-django-internship",
        "mobile-app-development-internship",
        "data-science-internship",
        "machine-learning-internship",
        "graphic-design-internship",
        "content-writing-internship",
        "digital-marketing-internship",
    ]
    
    def __init__(self, categories: List[str] = None, max_per_category: int = 10):
        super().__init__()
        self.categories = categories or self.CATEGORIES[:5]  # Default to top 5
        self.max_per_category = max_per_category
        self.base_url = "https://internshala.com"
        self.headers.update({
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch internships from Internshala."""
        opportunities = []
        
        for category in self.categories:
            try:
                self._respect_rate_limit()
                url = f"{self.base_url}/internships/{category}"
                
                response = requests.get(url, headers=self.headers, timeout=15)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'lxml')
                internship_cards = soup.select('.internship_meta')[:self.max_per_category]
                
                for card in internship_cards:
                    try:
                        opp = self._parse_internship_card(card)
                        if opp:
                            opportunities.append(opp)
                    except Exception as e:
                        logger.warning(f"Error parsing card: {e}")
                
                logger.info(f"Fetched {len(internship_cards)} from {category}")
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching {category}: {e}")
            except Exception as e:
                logger.error(f"Error processing {category}: {e}")
        
        return opportunities
    
    def _parse_internship_card(self, card) -> OpportunityData:
        """Parse an internship card into OpportunityData."""
        
        # Title
        title_elem = card.select_one('.job-internship-name a, h3')
        title = title_elem.get_text(strip=True) if title_elem else "Internship"
        
        # Company
        company_elem = card.select_one('.company_name a, .company-name')
        company = company_elem.get_text(strip=True) if company_elem else "Company on Internshala"
        
        # Location
        location_elem = card.select_one('.location_link, #location_names')
        location = location_elem.get_text(strip=True) if location_elem else "India"
        
        # Check for Work from Home
        if 'work from home' in location.lower() or card.select_one('.work-from-home'):
            location = "Remote (India)"
        
        # Stipend info
        stipend_elem = card.select_one('.stipend, .stipend_container')
        stipend = stipend_elem.get_text(strip=True) if stipend_elem else ""
        
        # Link
        link_elem = card.select_one('a[href*="/internship/"]')
        if link_elem and link_elem.get('href'):
            href = link_elem['href']
            apply_link = href if href.startswith('http') else f"{self.base_url}{href}"
        else:
            apply_link = self.base_url
        
        # Build description
        description_parts = [f"Internship at {company}"]
        if stipend:
            description_parts.append(f"Stipend: {stipend}")
        if location:
            description_parts.append(f"Location: {location}")
        
        description = "\n".join(description_parts)
        
        return OpportunityData(
            title=title[:255],
            company=company[:255],
            description=description,
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
