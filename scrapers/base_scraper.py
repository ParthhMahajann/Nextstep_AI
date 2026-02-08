"""
Base scraper class for NextStep AI data ingestion.

All scrapers should inherit from BaseScraper and implement the
fetch_opportunities() method.
"""

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Callable
from datetime import datetime

import requests

from retry_decorator import with_retry, RetryConfig, RETRYABLE_EXCEPTIONS

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
    
    Features:
        - Built-in retry logic with exponential backoff
        - Rate limiting between requests
        - Automatic request helpers
    """
    
    # Default configuration
    source_name: str = "unknown"
    rate_limit_delay: float = 1.0  # seconds between requests
    max_retries: int = 3
    retry_base_delay: float = 1.0  # initial retry delay
    retry_max_delay: float = 60.0  # max retry delay
    
    def __init__(self):
        self.headers = {
            "User-Agent": "NextStepAI/0.1 (Educational Project)"
        }
        self._last_request_time = 0
        self._retry_count = 0
        self._request_count = 0
        
        # Initialize retry configuration
        self.retry_config = RetryConfig(
            max_retries=self.max_retries,
            base_delay=self.retry_base_delay,
            max_delay=self.retry_max_delay,
        )
    
    def _respect_rate_limit(self):
        """Ensure we don't exceed rate limits."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()
    
    def _make_request(
        self,
        url: str,
        method: str = "GET",
        params: dict = None,
        data: dict = None,
        json: dict = None,
        timeout: int = 15,
        **kwargs
    ) -> requests.Response:
        """
        Make an HTTP request with automatic retry and rate limiting.
        
        Args:
            url: Request URL
            method: HTTP method (GET, POST, etc.)
            params: Query parameters
            data: Form data
            json: JSON body
            timeout: Request timeout in seconds
            **kwargs: Additional requests arguments
        
        Returns:
            requests.Response object
        
        Raises:
            requests.RequestException on failure after all retries
        """
        self._respect_rate_limit()
        self._request_count += 1
        
        @with_retry(
            max_retries=self.max_retries,
            base_delay=self.retry_base_delay,
            max_delay=self.retry_max_delay,
        )
        def _execute_request():
            response = requests.request(
                method=method,
                url=url,
                params=params,
                data=data,
                json=json,
                headers=kwargs.pop('headers', self.headers),
                timeout=timeout,
                **kwargs
            )
            response.raise_for_status()
            return response
        
        try:
            return _execute_request()
        except RETRYABLE_EXCEPTIONS as e:
            self._retry_count += 1
            raise
    
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
            Dict with statistics: {fetched, saved, duplicates, errors, retries, requests}
        """
        # Reset counters
        self._retry_count = 0
        self._request_count = 0
        
        stats = {
            "fetched": 0,
            "saved": 0,
            "duplicates": 0,
            "errors": 0,
            "retries": 0,
            "requests": 0,
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
        
        # Add retry and request stats
        stats["retries"] = self._retry_count
        stats["requests"] = self._request_count
        
        logger.info(
            f"Scraper {self.source_name} completed: "
            f"fetched={stats['fetched']}, saved={stats['saved']}, "
            f"duplicates={stats['duplicates']}, errors={stats['errors']}, "
            f"retries={stats['retries']}"
        )
        return stats
