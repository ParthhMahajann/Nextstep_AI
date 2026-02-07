"""
Base scraper class for NextStep AI data ingestion.

All scrapers should inherit from BaseScraper and implement the
fetch_opportunities() method.
"""

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class OpportunityData:
    """Standardized data structure for scraped opportunities."""
    
    title: str
    company: str
    description: str
    job_type: str  # job, internship, freelance, part-time, contract
    apply_link: str
    location: str = "Remote"
    source: str = ""
    raw_data: Optional[dict] = None


class BaseScraper(ABC):
    """
    Abstract base class for all opportunity scrapers.
    
    Subclasses must implement:
        - fetch_opportunities(): Returns List[OpportunityData]
    
    Optional overrides:
        - is_duplicate(opportunity): Check for existing entries
        - save_opportunity(opportunity): Custom save logic
    """
    
    # Default configuration
    source_name: str = "unknown"
    rate_limit_delay: float = 1.0  # seconds between requests
    max_retries: int = 3
    
    def __init__(self):
        self.headers = {
            "User-Agent": "NextStepAI/0.1 (Educational Project)"
        }
        self._last_request_time = 0
    
    def _respect_rate_limit(self):
        """Ensure we don't exceed rate limits."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()
    
    @abstractmethod
    def fetch_opportunities(self) -> List[OpportunityData]:
        """
        Fetch opportunities from the source.
        
        Returns:
            List of OpportunityData objects
        """
        pass
    
    def is_duplicate(self, opportunity: OpportunityData) -> bool:
        """
        Check if opportunity already exists in database.
        
        Override this method for source-specific deduplication logic.
        """
        from core.models import Job
        return Job.objects.filter(apply_link=opportunity.apply_link).exists()
    
    def save_opportunity(self, opportunity: OpportunityData) -> Optional[object]:
        """
        Save opportunity to database.
        
        Returns:
            Saved Job object or None if skipped
        """
        from core.models import Job
        
        if self.is_duplicate(opportunity):
            logger.debug(f"Skipping duplicate: {opportunity.title}")
            return None
        
        job = Job.objects.create(
            title=opportunity.title[:255],
            company=opportunity.company[:255],
            location=opportunity.location[:255],
            description=opportunity.description,
            job_type=opportunity.job_type,
            apply_link=opportunity.apply_link,
            source=opportunity.source or self.source_name,
        )
        logger.info(f"Saved: {job.title} at {job.company}")
        return job
    
    def run(self) -> dict:
        """
        Execute the scraping process.
        
        Returns:
            Dict with statistics: {fetched, saved, duplicates, errors}
        """
        stats = {
            "fetched": 0,
            "saved": 0,
            "duplicates": 0,
            "errors": 0,
            "source": self.source_name,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            opportunities = self.fetch_opportunities()
            stats["fetched"] = len(opportunities)
            
            for opp in opportunities:
                try:
                    result = self.save_opportunity(opp)
                    if result:
                        stats["saved"] += 1
                    else:
                        stats["duplicates"] += 1
                except Exception as e:
                    logger.error(f"Error saving opportunity: {e}")
                    stats["errors"] += 1
        
        except Exception as e:
            logger.error(f"Error fetching opportunities from {self.source_name}: {e}")
            stats["errors"] += 1
        
        logger.info(
            f"Scraper {self.source_name} completed: "
            f"fetched={stats['fetched']}, saved={stats['saved']}, "
            f"duplicates={stats['duplicates']}, errors={stats['errors']}"
        )
        return stats
