"""
HackerNews 'Who is Hiring?' scraper.

Scrapes the monthly HN hiring threads which are popular
for tech jobs, including remote and international opportunities.
"""

import os
import sys
import re
import logging
import requests
from typing import List, Optional
from datetime import datetime

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class HackerNewsScraper(BaseScraper):
    """Scraper for HackerNews Who is Hiring threads."""
    
    source_name = "hackernews"
    rate_limit_delay = 0.5  # HN API is generous
    
    # Keywords for filtering
    REMOTE_KEYWORDS = ['remote', 'wfh', 'work from home', 'anywhere', 'distributed']
    INDIA_KEYWORDS = ['india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai']
    INTERNSHIP_KEYWORDS = ['intern', 'internship', 'student', 'junior', 'entry level', 'graduate']
    FREELANCE_KEYWORDS = ['freelance', 'contract', 'contractor', 'part-time', 'consultant']
    
    def __init__(self, max_comments: int = 100, filter_remote_india: bool = True):
        super().__init__()
        self.max_comments = max_comments
        self.filter_remote_india = filter_remote_india
        self.api_base = "https://hacker-news.firebaseio.com/v0"
    
    def _get_latest_hiring_thread(self) -> Optional[int]:
        """Find the most recent 'Who is hiring?' thread."""
        try:
            # Search for hiring threads by user "whoishiring"
            user_url = f"{self.api_base}/user/whoishiring.json"
            response = requests.get(user_url, timeout=10)
            response.raise_for_status()
            
            user_data = response.json()
            submitted = user_data.get('submitted', [])
            
            # Get the most recent "Who is hiring" post
            for item_id in submitted[:10]:
                self._respect_rate_limit()
                item_url = f"{self.api_base}/item/{item_id}.json"
                item_resp = requests.get(item_url, timeout=10)
                item = item_resp.json()
                
                if item and 'who is hiring' in item.get('title', '').lower():
                    logger.info(f"Found hiring thread: {item.get('title')}")
                    return item_id
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding hiring thread: {e}")
            return None
    
    def _parse_job_posting(self, text: str) -> dict:
        """Parse a job posting comment to extract structured data."""
        
        # Try to extract company name (usually first line or before | or -)
        lines = text.split('\n')
        first_line = lines[0] if lines else text[:100]
        
        # Common format: "Company Name | Role | Location | ..."
        parts = re.split(r'\s*[\|/]\s*', first_line)
        
        company = parts[0].strip() if parts else "Tech Company"
        title = parts[1].strip() if len(parts) > 1 else "Software Role"
        
        # Detect location
        text_lower = text.lower()
        location = "Remote" if any(kw in text_lower for kw in self.REMOTE_KEYWORDS) else "Not specified"
        
        # Check for India specifically
        for kw in self.INDIA_KEYWORDS:
            if kw in text_lower:
                location = f"India ({kw.title()})"
                break
        
        # Detect job type
        job_type = "job"
        if any(kw in text_lower for kw in self.INTERNSHIP_KEYWORDS):
            job_type = "internship"
        elif any(kw in text_lower for kw in self.FREELANCE_KEYWORDS):
            job_type = "freelance"
        
        return {
            'company': company[:100],
            'title': title[:200],
            'location': location,
            'job_type': job_type,
            'description': text
        }
    
    def _is_relevant(self, text: str) -> bool:
        """Check if posting is relevant (remote or India-based)."""
        if not self.filter_remote_india:
            return True
        
        text_lower = text.lower()
        
        # Check for remote or India keywords
        has_remote = any(kw in text_lower for kw in self.REMOTE_KEYWORDS)
        has_india = any(kw in text_lower for kw in self.INDIA_KEYWORDS)
        
        return has_remote or has_india
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch job postings from HN hiring thread."""
        opportunities = []
        
        # Find latest hiring thread
        thread_id = self._get_latest_hiring_thread()
        if not thread_id:
            logger.warning("Could not find hiring thread")
            return opportunities
        
        try:
            # Get thread details
            thread_url = f"{self.api_base}/item/{thread_id}.json"
            response = requests.get(thread_url, timeout=10)
            thread = response.json()
            
            kids = thread.get('kids', [])[:self.max_comments]
            logger.info(f"Processing {len(kids)} comments from thread {thread_id}")
            
            for comment_id in kids:
                try:
                    self._respect_rate_limit()
                    
                    comment_url = f"{self.api_base}/item/{comment_id}.json"
                    comment_resp = requests.get(comment_url, timeout=10)
                    comment = comment_resp.json()
                    
                    if not comment or comment.get('deleted') or comment.get('dead'):
                        continue
                    
                    text = comment.get('text', '')
                    if not text or len(text) < 50:
                        continue
                    
                    # Check relevance
                    if not self._is_relevant(text):
                        continue
                    
                    # Parse the posting
                    parsed = self._parse_job_posting(text)
                    
                    # Clean HTML from description
                    from bs4 import BeautifulSoup
                    clean_text = BeautifulSoup(text, 'lxml').get_text()
                    
                    opportunity = OpportunityData(
                        title=parsed['title'][:255],
                        company=parsed['company'][:255],
                        description=clean_text[:5000],
                        job_type=parsed['job_type'],
                        apply_link=f"https://news.ycombinator.com/item?id={comment_id}",
                        location=parsed['location'],
                        source=self.source_name,
                    )
                    opportunities.append(opportunity)
                    
                except Exception as e:
                    logger.warning(f"Error processing comment {comment_id}: {e}")
            
        except Exception as e:
            logger.error(f"Error fetching thread: {e}")
        
        logger.info(f"Found {len(opportunities)} relevant postings")
        return opportunities


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    scraper = HackerNewsScraper(max_comments=50)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
