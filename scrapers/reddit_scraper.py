"""
Reddit r/forhire scraper for NextStep AI.

Fetches job postings from r/forhire using Reddit's public JSON API.
"""

import os
import sys
import logging
import requests
from typing import List

# Setup Django before importing models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from base_scraper import BaseScraper, OpportunityData

logger = logging.getLogger(__name__)


class RedditForHireScraper(BaseScraper):
    """Scraper for Reddit r/forhire subreddit."""
    
    source_name = "reddit_forhire"
    rate_limit_delay = 2.0  # Reddit asks for reasonable delays
    
    # Job type detection keywords
    INTERNSHIP_KEYWORDS = [
        "intern", "internship", "student", "junior",
        "entry level", "college", "unpaid", "part-time"
    ]
    
    FREELANCE_KEYWORDS = [
        "freelance", "contract", "gig", "project-based",
        "contractor", "hourly"
    ]
    
    HIRING_FLAIR = "[Hiring]"  # Posts from employers
    
    def __init__(self, subreddit: str = "forhire", limit: int = 50):
        super().__init__()
        self.subreddit = subreddit
        self.limit = limit
        self.api_url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}"
    
    def _detect_job_type(self, text: str) -> str:
        """Detect job type from post content."""
        text_lower = text.lower()
        
        if any(kw in text_lower for kw in self.INTERNSHIP_KEYWORDS):
            return "internship"
        if any(kw in text_lower for kw in self.FREELANCE_KEYWORDS):
            return "freelance"
        
        return "job"
    
    def _is_hiring_post(self, title: str) -> bool:
        """Check if this is a [Hiring] post (employer posting a job)."""
        return self.HIRING_FLAIR.lower() in title.lower()
    
    def fetch_opportunities(self) -> List[OpportunityData]:
        """Fetch hiring posts from r/forhire."""
        opportunities = []
        
        try:
            self._respect_rate_limit()
            response = requests.get(
                self.api_url, 
                headers=self.headers, 
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            posts = data.get("data", {}).get("children", [])
            
            for post in posts:
                post_data = post.get("data", {})
                title = post_data.get("title", "")
                
                # Only process [Hiring] posts
                if not self._is_hiring_post(title):
                    continue
                
                selftext = post_data.get("selftext", "")
                permalink = post_data.get("permalink", "")
                
                # Detect job type from content
                content = f"{title} {selftext}"
                job_type = self._detect_job_type(content)
                
                # Extract location from title if mentioned
                location = "Remote"  # Default
                if "remote" not in title.lower():
                    # Try to extract location indicators
                    for indicator in ["local", "on-site", "onsite", "in-person"]:
                        if indicator in title.lower():
                            location = "On-site (see description)"
                            break
                
                opportunity = OpportunityData(
                    title=title.replace(self.HIRING_FLAIR, "").strip()[:255],
                    company="Reddit r/forhire Poster",
                    description=selftext if selftext else title,
                    job_type=job_type,
                    apply_link=f"https://www.reddit.com{permalink}",
                    location=location,
                    source=self.source_name,
                    raw_data=post_data
                )
                opportunities.append(opportunity)
            
            logger.info(f"Fetched {len(opportunities)} hiring posts from r/{self.subreddit}")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching from Reddit: {e}")
        except Exception as e:
            logger.error(f"Error processing Reddit posts: {e}")
        
        return opportunities


if __name__ == "__main__":
    from logging_config import setup_logging
    setup_logging(level=logging.INFO, log_to_file=True, source_name='reddit_forhire')
    
    scraper = RedditForHireScraper(limit=30)
    stats = scraper.run()
    print(f"\nScrape complete: {stats}")
