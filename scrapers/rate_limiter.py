"""
Advanced rate limiter for NextStep AI scrapers.

Implements token bucket algorithm with per-source rate limits
and automatic backoff on rate limit errors.
"""

import time
import threading
import logging
from typing import Dict, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting a specific source."""
    requests_per_minute: float = 30.0
    requests_per_hour: float = 500.0
    min_delay: float = 1.0  # Minimum seconds between requests
    max_delay: float = 60.0  # Maximum delay after backoff
    backoff_multiplier: float = 2.0  # Delay multiplier on 429 errors


# Default rate limits per source
DEFAULT_RATE_LIMITS: Dict[str, RateLimitConfig] = {
    'reddit': RateLimitConfig(
        requests_per_minute=30,
        requests_per_hour=500,
        min_delay=2.0,
    ),
    'hackernews': RateLimitConfig(
        requests_per_minute=60,
        requests_per_hour=1000,
        min_delay=0.5,
    ),
    'remotive': RateLimitConfig(
        requests_per_minute=20,
        requests_per_hour=200,
        min_delay=3.0,
    ),
    'internshala': RateLimitConfig(
        requests_per_minute=20,
        requests_per_hour=300,
        min_delay=2.0,
    ),
    'ncs': RateLimitConfig(
        requests_per_minute=15,
        requests_per_hour=200,
        min_delay=3.0,  # Respectful rate for govt site
    ),
    'arbeitnow': RateLimitConfig(
        requests_per_minute=30,
        requests_per_hour=400,
        min_delay=2.0,
    ),
    'default': RateLimitConfig(
        requests_per_minute=30,
        requests_per_hour=500,
        min_delay=1.0,
    ),
}


class TokenBucket:
    """
    Token bucket rate limiter.
    
    Tokens are added at a fixed rate and consumed for each request.
    When bucket is empty, requests must wait for tokens.
    """
    
    def __init__(self, tokens_per_second: float, max_tokens: float):
        self.tokens_per_second = tokens_per_second
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.last_update = time.time()
        self._lock = threading.Lock()
    
    def _refill(self):
        """Add tokens based on time elapsed."""
        now = time.time()
        elapsed = now - self.last_update
        self.tokens = min(
            self.max_tokens,
            self.tokens + elapsed * self.tokens_per_second
        )
        self.last_update = now
    
    def acquire(self, tokens: int = 1) -> float:
        """
        Acquire tokens, blocking if necessary.
        
        Returns:
            Time waited in seconds
        """
        with self._lock:
            self._refill()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return 0.0
            
            # Calculate wait time
            tokens_needed = tokens - self.tokens
            wait_time = tokens_needed / self.tokens_per_second
            
            return wait_time
    
    def try_acquire(self, tokens: int = 1) -> bool:
        """Try to acquire tokens without blocking."""
        with self._lock:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False


class RateLimiter:
    """
    Rate limiter for web scraping with per-source limits.
    
    Features:
    - Token bucket for smooth rate limiting
    - Per-source configuration
    - Automatic backoff on 429 errors
    - Request tracking and statistics
    """
    
    def __init__(self, source: str = 'default', config: RateLimitConfig = None):
        self.source = source
        self.config = config or DEFAULT_RATE_LIMITS.get(source, DEFAULT_RATE_LIMITS['default'])
        
        # Token bucket for requests per minute
        tokens_per_second = self.config.requests_per_minute / 60.0
        self._bucket = TokenBucket(tokens_per_second, self.config.requests_per_minute)
        
        # Tracking
        self._last_request_time = 0.0
        self._current_delay = self.config.min_delay
        self._request_count = 0
        self._rate_limit_hits = 0
        self._total_wait_time = 0.0
        self._lock = threading.Lock()
    
    def wait(self) -> float:
        """
        Wait for rate limit, then return.
        
        Returns:
            Time waited in seconds
        """
        with self._lock:
            wait_time = 0.0
            
            # Check token bucket
            bucket_wait = self._bucket.acquire()
            if bucket_wait > 0:
                time.sleep(bucket_wait)
                wait_time += bucket_wait
            
            # Enforce minimum delay between requests
            elapsed = time.time() - self._last_request_time
            if elapsed < self._current_delay:
                sleep_time = self._current_delay - elapsed
                time.sleep(sleep_time)
                wait_time += sleep_time
            
            self._last_request_time = time.time()
            self._request_count += 1
            self._total_wait_time += wait_time
            
            if wait_time > 0:
                logger.debug(f"[{self.source}] Rate limited, waited {wait_time:.2f}s")
            
            return wait_time
    
    def report_429(self):
        """Report a 429 (rate limited) response to increase delay."""
        with self._lock:
            self._rate_limit_hits += 1
            old_delay = self._current_delay
            self._current_delay = min(
                self._current_delay * self.config.backoff_multiplier,
                self.config.max_delay
            )
            logger.warning(
                f"[{self.source}] Rate limit hit (429). "
                f"Increasing delay: {old_delay:.1f}s -> {self._current_delay:.1f}s"
            )
    
    def report_success(self):
        """Report successful request to gradually reduce delay."""
        with self._lock:
            if self._current_delay > self.config.min_delay:
                # Gradually reduce delay on success
                self._current_delay = max(
                    self.config.min_delay,
                    self._current_delay * 0.9
                )
    
    def get_stats(self) -> dict:
        """Get rate limiter statistics."""
        return {
            'source': self.source,
            'request_count': self._request_count,
            'rate_limit_hits': self._rate_limit_hits,
            'total_wait_time': round(self._total_wait_time, 2),
            'current_delay': round(self._current_delay, 2),
        }
    
    def reset(self):
        """Reset rate limiter state."""
        with self._lock:
            self._current_delay = self.config.min_delay
            self._request_count = 0
            self._rate_limit_hits = 0
            self._total_wait_time = 0.0


class RateLimiterRegistry:
    """Registry for managing rate limiters across sources."""
    
    _instance = None
    _limiters: Dict[str, RateLimiter] = {}
    _lock = threading.Lock()
    
    @classmethod
    def get(cls, source: str) -> RateLimiter:
        """Get or create a rate limiter for a source."""
        with cls._lock:
            if source not in cls._limiters:
                cls._limiters[source] = RateLimiter(source)
            return cls._limiters[source]
    
    @classmethod
    def get_all_stats(cls) -> Dict[str, dict]:
        """Get stats for all rate limiters."""
        with cls._lock:
            return {
                source: limiter.get_stats()
                for source, limiter in cls._limiters.items()
            }
    
    @classmethod
    def reset_all(cls):
        """Reset all rate limiters."""
        with cls._lock:
            for limiter in cls._limiters.values():
                limiter.reset()


# Convenience function
def get_rate_limiter(source: str) -> RateLimiter:
    """Get a rate limiter for the specified source."""
    return RateLimiterRegistry.get(source)


if __name__ == "__main__":
    # Test rate limiter
    logging.basicConfig(level=logging.DEBUG)
    
    limiter = RateLimiter('test', RateLimitConfig(
        requests_per_minute=10,
        min_delay=0.5,
    ))
    
    print("Testing rate limiter with 5 quick requests...")
    for i in range(5):
        wait = limiter.wait()
        print(f"Request {i+1}: waited {wait:.2f}s")
    
    print(f"\nStats: {limiter.get_stats()}")
