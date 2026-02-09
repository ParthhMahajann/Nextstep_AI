"""
Multi-subreddit Reddit scraper for jobs and freelance.

Extends the base Reddit scraper to cover multiple subreddits
relevant to jobs, internships, and freelance opportunities.
"""

import os
import sys
import logging
import requests
from typing import List, Dict

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class MultiRedditScraper(BaseScraper):
    """Scraper for multiple Reddit subreddits."""
    
    source_name = "reddit"
    rate_limit_delay = 2.0
    
    # Subreddits to scrape with their focus
    SUBREDDITS = {
        'forhire': {
            'flair_filter': '[Hiring]',
            'job_types': ['job', 'freelance', 'contract'],
        },
        'remotejobs': {
            'flair_filter': None,  # All posts
            'job_types': ['job'],
        },
        'freelance': {
            'flair_filter': None,
            'job_types': ['freelance'],
        },
        'remotework': {
            'flair_filter': None,
            'job_types': ['job'],
        },
        'WorkOnline': {
            'flair_filter': None,
            'job_types': ['freelance', 'part-time'],
        },
        # India-focused subreddits
        'developersIndia': {
            'flair_filter': None,
            'job_types': ['job', 'internship'],
        },
        'IndiaJobs': {
            'flair_filter': None,
            'job_types': ['job'],
        },
        'indianstartups': {
            'flair_filter': None,
            'job_types': ['job', 'internship'],
        },
        'cscareerquestionsIN': {
            'flair_filter': None,
            'job_types': ['job', 'internship'],
        },
    }
    
    # Keywords for filtering
    REMOTE_KEYWORDS = ['remote', 'wfh', 'work from home', 'anywhere', 'global']
    INDIA_KEYWORDS = ['india', 'indian', 'bangalore', 'mumbai', 'delhi', 'hyderabad']
    INTERNSHIP_KEYWORDS = ['intern', 'internship', 'student', 'junior', 'entry level']
    
    def __init__(
        self, 
        subreddits: List[str] = None, 
        limit_per_sub: int = 25,
        filter_india_remote: bool = True
    ):
        super().__init__()
        self.subreddits = subreddits or list(self.SUBREDDITS.keys())
        self.limit_per_sub = limit_per_sub
        self.filter_india_remote = filter_india_remote
    
    def _detect_job_type(self, text: str, default: str = 'job') -> str:
        """Detect job type from post content."""
        text_lower = text.lower()
        
        if any(kw in text_lower for kw in self.INTERNSHIP_KEYWORDS):
            return 'internship'
        if 'freelance' in text_lower or 'contract' in text_lower:
            return 'freelance'
        if 'part-time' in text_lower or 'part time' in text_lower:
            return 'part-time'
        
        return default
    
    def _is_relevant(self, text: str) -> bool:
        """Check if post is relevant (India or remote)."""
        if not self.filter_india_remote:
            return True
        
        text_lower = text.lower()
        
        has_remote = any(kw in text_lower for kw in self.REMOTE_KEYWORDS)
        has_india = any(kw in text_lower for kw in self.INDIA_KEYWORDS)
        
        return has_remote or has_india
    
    def _detect_location(self, text: str) -> str:
        """Detect location from text."""
        text_lower = text.lower()
        
        for kw in self.INDIA_KEYWORDS:
            if kw in text_lower:
                return f"India ({kw.title()})"
        
        if any(kw in text_lower for kw in self.REMOTE_KEYWORDS):
            return "Remote"
        
        return "Not specified"
    
    def _fetch_subreddit(self, subreddit: str) -> List[OpportunityData]:
        """Fetch posts from a single subreddit."""
        opportunities = []
        config = self.SUBREDDITS.get(subreddit, {})
        
        try:
            self._respect_rate_limit()
            
            url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={self.limit_per_sub}"
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            posts = data.get('data', {}).get('children', [])
            
            for post in posts:
                post_data = post.get('data', {})
                
                title = post_data.get('title', '')
                selftext = post_data.get('selftext', '')
                permalink = post_data.get('permalink', '')
                
                content = f"{title} {selftext}"
                
                # Apply flair filter if configured
                flair_filter = config.get('flair_filter')
                if flair_filter and flair_filter.lower() not in title.lower():
                    continue
                
                # Check relevance
                if not self._is_relevant(content):
                    continue
                
                # Determine job type
                default_type = config.get('job_types', ['job'])[0]
                job_type = self._detect_job_type(content, default_type)
                
                # Detect location
                location = self._detect_location(content)
                
                opportunity = OpportunityData(
                    title=title[:255],
                    company=f"Reddit r/{subreddit}",
                    description=selftext if selftext else title,
                    job_type=job_type,
                    apply_link=f"https://www.reddit.com{permalink}",
                    location=location,
                    source=f"reddit_{subreddit}",
                )
                opportunities.append(opportunity)
            
            logger.info(f"Fetched {len(opportunities)} relevant posts from r/{subreddit}")
            
        except Exception as e:
            logger.error(f"Error fetching r/{subreddit}: {e}")
        
        return opportunities
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch from all configured subreddits."""
        all_opportunities = []
        
        for subreddit in self.subreddits:
            opportunities = self._fetch_subreddit(subreddit)
            all_opportunities.extend(opportunities)
        
        logger.info(f"Total: {len(all_opportunities)} opportunities from {len(self.subreddits)} subreddits")
        return all_opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name='reddit')
    
    scraper = MultiRedditScraper(limit_per_sub=20)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
