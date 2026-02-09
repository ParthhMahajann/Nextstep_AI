"""
Arbeitnow scraper for remote and startup jobs.

Arbeitnow provides a free public API with remote job listings.
Great source for remote-first and startup opportunities.

API: https://arbeitnow.com/api/job-board-api
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

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class ArbeitnowScraper(BaseScraper):
    """
    Scraper for Arbeitnow remote jobs.
    
    Features:
    - Free public API (no auth required)
    - Remote and startup jobs
    - Global coverage with India-friendly listings
    """
    
    source_name = "arbeitnow"
    rate_limit_delay = 2.0
    
    API_URL = "https://arbeitnow.com/api/job-board-api"
    
    # Keywords for filtering India-friendly jobs
    INDIA_KEYWORDS = ['india', 'remote', 'worldwide', 'anywhere', 'global', 'asia', 'apac']
    INTERN_KEYWORDS = ['intern', 'junior', 'entry', 'graduate', 'trainee', 'fresher']
    STARTUP_KEYWORDS = ['startup', 'early stage', 'seed', 'series a', 'funded']
    
    def __init__(self, limit: int = 50, india_only: bool = False):
        super().__init__()
        self.limit = limit
        self.india_only = india_only
    
    def _detect_job_type(self, job: dict) -> str:
        """Detect job type from listing."""
        title = job.get('title', '').lower()
        tags = ' '.join(job.get('tags', [])).lower()
        
        if any(kw in title for kw in self.INTERN_KEYWORDS):
            return 'internship'
        if 'contract' in tags or 'freelance' in tags:
            return 'freelance'
        if 'part-time' in tags or 'part_time' in tags:
            return 'part-time'
        return 'job'
    
    def _is_india_friendly(self, job: dict) -> bool:
        """Check if job is accessible from India."""
        location = job.get('location', '').lower()
        remote = job.get('remote', False)
        
        # Remote jobs are India-friendly
        if remote:
            return True
        
        # Check location keywords
        if any(kw in location for kw in self.INDIA_KEYWORDS):
            return True
        
        return False
    
    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        import re
        if not text:
            return ""
        clean = re.sub(r'<[^>]+>', '', text)
        clean = ' '.join(clean.split())
        return clean.strip()
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch job opportunities from Arbeitnow API."""
        opportunities = []
        page = 1
        max_pages = 5  # Limit pages to avoid too many requests
        
        logger.info(f"Fetching Arbeitnow jobs (limit={self.limit}, india_only={self.india_only})")
        
        while len(opportunities) < self.limit and page <= max_pages:
            try:
                self._respect_rate_limit()
                
                response = self._make_request(
                    self.API_URL,
                    method="GET",
                    params={'page': page},
                    timeout=30
                )
                
                if response.status_code != 200:
                    logger.warning(f"Arbeitnow API returned {response.status_code}")
                    break
                
                data = response.json()
                jobs = data.get('data', [])
                
                if not jobs:
                    logger.info(f"No more jobs found at page {page}")
                    break
                
                logger.info(f"Fetched {len(jobs)} jobs from page {page}")
                
                for job in jobs:
                    if len(opportunities) >= self.limit:
                        break
                    
                    # Filter for India-friendly if requested
                    if self.india_only and not self._is_india_friendly(job):
                        continue
                    
                    # Parse job data
                    title = job.get('title', '')
                    company = job.get('company_name', '')
                    location = job.get('location', 'Remote')
                    description = self._clean_html(job.get('description', ''))
                    apply_link = job.get('url', '')
                    
                    if not title or not apply_link:
                        continue
                    
                    # Use remote if location is empty
                    if not location:
                        location = 'Remote' if job.get('remote') else 'Not specified'
                    
                    # Ensure description has content
                    if not description or len(description) < 20:
                        tags = ', '.join(job.get('tags', []))
                        description = f"{title} at {company}. Tags: {tags}"
                    
                    opp = OpportunityData(
                        title=title[:255],
                        company=company[:255] if company else "Arbeitnow Employer",
                        location=location[:255],
                        description=description[:5000],  # Limit description length
                        job_type=self._detect_job_type(job),
                        apply_link=apply_link,
                        source="arbeitnow"
                    )
                    opportunities.append(opp)
                
                page += 1
                
            except Exception as e:
                logger.error(f"Error fetching Arbeitnow page {page}: {e}")
                break
        
        logger.info(f"Found {len(opportunities)} Arbeitnow jobs")
        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name='arbeitnow')
    
    print("Testing Arbeitnow Scraper...")
    scraper = ArbeitnowScraper(limit=10)
    
    try:
        stats = scraper.run()
        print(f"\nResults: {stats}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
