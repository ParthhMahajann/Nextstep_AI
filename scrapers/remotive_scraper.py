"""
Remotive.io scraper for remote jobs.

Remotive provides a public JSON API with remote job listings.
Great source for remote-first opportunities.
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


class RemotiveScraper(BaseScraper):
    """Scraper for Remotive.io remote jobs."""
    
    source_name = "remotive"
    rate_limit_delay = 1.0
    
    # Categories to focus on
    CATEGORIES = [
        'software-dev',
        'design',
        'marketing',
        'data',
        'writing',
        'all-others'
    ]
    
    # Keywords for internships/entry level
    ENTRY_KEYWORDS = ['intern', 'junior', 'entry', 'graduate', 'trainee', 'apprentice']
    FREELANCE_KEYWORDS = ['freelance', 'contract', 'contractor', 'part-time']
    
    def __init__(self, category: str = None, limit: int = 50):
        super().__init__()
        self.category = category
        self.limit = limit
        self.api_url = "https://remotive.com/api/remote-jobs"
    
    def _detect_job_type(self, job: dict) -> str:
        """Detect if job is internship, freelance, or regular."""
        title = job.get('title', '').lower()
        job_type_raw = job.get('job_type', '').lower()
        
        # Check for internship
        if any(kw in title for kw in self.ENTRY_KEYWORDS):
            return 'internship'
        
        # Check for freelance/contract
        if 'contract' in job_type_raw or any(kw in title for kw in self.FREELANCE_KEYWORDS):
            return 'freelance'
        
        if 'part_time' in job_type_raw or 'part-time' in job_type_raw:
            return 'part-time'
        
        return 'job'
    
    def _is_india_friendly(self, job: dict) -> bool:
        """Check if job mentions India or is truly worldwide."""
        candidate_location = job.get('candidate_required_location', '').lower()
        
        india_keywords = ['india', 'worldwide', 'anywhere', 'global', 'asia', 'apac']
        
        # If no location restriction or mentions India-friendly regions
        if not candidate_location or any(kw in candidate_location for kw in india_keywords):
            return True
        
        return False
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch remote jobs from Remotive API."""
        opportunities = []
        
        try:
            self._respect_rate_limit()
            
            params = {'limit': self.limit}
            if self.category:
                params['category'] = self.category
            
            response = requests.get(
                self.api_url,
                params=params,
                headers=self.headers,
                timeout=15
            )
            response.raise_for_status()
            
            data = response.json()
            jobs = data.get('jobs', [])
            
            for job in jobs:
                # Filter for India-friendly locations
                if not self._is_india_friendly(job):
                    continue
                
                job_type = self._detect_job_type(job)
                
                # Build description
                description = job.get('description', '')
                salary = job.get('salary', '')
                if salary:
                    description = f"Salary: {salary}\n\n{description}"
                
                # Clean HTML
                from bs4 import BeautifulSoup
                clean_desc = BeautifulSoup(description, 'lxml').get_text()
                
                location = job.get('candidate_required_location', 'Remote (Worldwide)')
                if not location:
                    location = 'Remote'
                
                opportunity = OpportunityData(
                    title=job.get('title', 'Remote Position')[:255],
                    company=job.get('company_name', 'Company')[:255],
                    description=clean_desc[:10000],
                    job_type=job_type,
                    apply_link=job.get('url', 'https://remotive.com'),
                    location=f"Remote - {location}"[:255],
                    source=self.source_name,
                    raw_data={
                        'category': job.get('category'),
                        'tags': job.get('tags', []),
                        'publication_date': job.get('publication_date'),
                    }
                )
                opportunities.append(opportunity)
            
            logger.info(f"Fetched {len(opportunities)} India-friendly remote jobs")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching from Remotive: {e}")
        except Exception as e:
            logger.error(f"Error processing Remotive data: {e}")
        
        return opportunities


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    scraper = RemotiveScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
