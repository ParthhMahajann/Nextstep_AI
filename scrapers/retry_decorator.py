"""
Retry decorator with exponential backoff for NextStep AI scrapers.

Provides a reusable retry mechanism for handling transient failures
in network requests and API calls.
"""

import time
import random
import logging
import functools
from typing import Callable, Tuple, Type, Optional

logger = logging.getLogger(__name__)

# Exceptions that should trigger a retry
RETRYABLE_EXCEPTIONS: Tuple[Type[Exception], ...] = (
    ConnectionError,
    TimeoutError,
    OSError,
)

# Try to add requests exceptions if available
try:
    import requests.exceptions
    RETRYABLE_EXCEPTIONS = RETRYABLE_EXCEPTIONS + (
        requests.exceptions.ConnectionError,
        requests.exceptions.Timeout,
        requests.exceptions.HTTPError,
        requests.exceptions.ChunkedEncodingError,
    )
except ImportError:
    pass


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
):
    """
    Decorator that retries a function with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts (default: 3)
        base_delay: Initial delay between retries in seconds (default: 1.0)
        max_delay: Maximum delay between retries in seconds (default: 60.0)
        exponential_base: Base for exponential backoff (default: 2.0)
        jitter: Add random jitter to prevent thundering herd (default: True)
        retryable_exceptions: Tuple of exceptions to retry on (default: RETRYABLE_EXCEPTIONS)
    
    Returns:
        Decorated function with retry logic
    
    Example:
        @with_retry(max_retries=3, base_delay=1.0)
        def fetch_data():
            return requests.get(url)
    """
    if retryable_exceptions is None:
        retryable_exceptions = RETRYABLE_EXCEPTIONS
    
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(
                            f"Function {func.__name__} failed after {max_retries + 1} attempts. "
                            f"Last error: {e}"
                        )
                        raise
                    
                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (exponential_base ** attempt), max_delay)
                    
                    # Add jitter (±25% of delay)
                    if jitter:
                        delay = delay * (0.75 + random.random() * 0.5)
                    
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_retries + 1} for {func.__name__} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    
                    time.sleep(delay)
            
            # Should never reach here, but just in case
            if last_exception:
                raise last_exception
        
        return wrapper
    return decorator


class RetryConfig:
    """Configuration class for retry settings."""
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    def apply(self, func: Callable) -> Callable:
        """Apply retry logic to a function using this config."""
        return with_retry(
            max_retries=self.max_retries,
            base_delay=self.base_delay,
            max_delay=self.max_delay,
            exponential_base=self.exponential_base,
            jitter=self.jitter,
        )(func)


def retry_request(
    request_func: Callable,
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> any:
    """
    Execute a request function with retry logic.
    
    This is a convenience function for one-off retries without using the decorator.
    
    Args:
        request_func: A callable that performs the request
        max_retries: Maximum retry attempts
        base_delay: Initial delay between retries
    
    Returns:
        Result of the request function
    
    Example:
        response = retry_request(lambda: requests.get(url), max_retries=3)
    """
    @with_retry(max_retries=max_retries, base_delay=base_delay)
    def _execute():
        return request_func()
    
    return _execute()
