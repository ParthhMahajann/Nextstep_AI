"""
Logging configuration for NextStep AI scrapers.

Provides structured logging with file rotation, colored console output,
and per-scraper log files.
"""

import os
import sys
import logging
import logging.handlers
from datetime import datetime
from typing import Optional

# Log directory (relative to scrapers folder)
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')


class ColoredFormatter(logging.Formatter):
    """Formatter that adds colors to console output."""
    
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[41m',  # Red background
    }
    RESET = '\033[0m'
    
    def format(self, record):
        # Add color to level name
        color = self.COLORS.get(record.levelname, '')
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(
    level: int = logging.INFO,
    log_to_file: bool = True,
    log_to_console: bool = True,
    source_name: Optional[str] = None,
    json_format: bool = False,
) -> logging.Logger:
    """
    Configure logging for scrapers.
    
    Args:
        level: Logging level (default: INFO)
        log_to_file: Enable file logging with rotation
        log_to_console: Enable console logging
        source_name: If provided, create source-specific log file
        json_format: Use JSON format for logs (production)
    
    Returns:
        Configured root logger
    """
    # Create log directory if needed
    if log_to_file and not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Format strings
    console_format = '%(asctime)s %(levelname)s [%(name)s] %(message)s'
    file_format = '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Console handler
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        
        # Use colored formatter if terminal supports it
        if sys.stdout.isatty():
            formatter = ColoredFormatter(console_format, datefmt=date_format)
        else:
            formatter = logging.Formatter(console_format, datefmt=date_format)
        
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
    
    # File handlers
    if log_to_file:
        # Main log file with rotation
        main_log = os.path.join(LOG_DIR, 'scraper.log')
        file_handler = logging.handlers.RotatingFileHandler(
            main_log,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding='utf-8',
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(file_format, datefmt=date_format))
        root_logger.addHandler(file_handler)
        
        # Error-only log file
        error_log = os.path.join(LOG_DIR, 'errors.log')
        error_handler = logging.handlers.RotatingFileHandler(
            error_log,
            maxBytes=5 * 1024 * 1024,  # 5 MB
            backupCount=3,
            encoding='utf-8',
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(logging.Formatter(file_format, datefmt=date_format))
        root_logger.addHandler(error_handler)
        
        # Source-specific log file
        if source_name:
            source_log = os.path.join(LOG_DIR, f'{source_name}.log')
            source_handler = logging.handlers.RotatingFileHandler(
                source_log,
                maxBytes=5 * 1024 * 1024,  # 5 MB
                backupCount=3,
                encoding='utf-8',
            )
            source_handler.setLevel(level)
            source_handler.setFormatter(logging.Formatter(file_format, datefmt=date_format))
            
            # Only log messages from this source
            source_handler.addFilter(lambda r: source_name in r.name or r.name == 'root')
            root_logger.addHandler(source_handler)
    
    return root_logger


def get_scraper_logger(name: str) -> logging.Logger:
    """
    Get a logger for a specific scraper.
    
    Args:
        name: Scraper name (e.g., 'reddit', 'hackernews')
    
    Returns:
        Configured logger for the scraper
    """
    return logging.getLogger(f'scraper.{name}')


class ScraperLogContext:
    """Context manager for logging scraper runs with timing."""
    
    def __init__(self, scraper_name: str, operation: str = 'run'):
        self.scraper_name = scraper_name
        self.operation = operation
        self.logger = get_scraper_logger(scraper_name)
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.info(f"Starting {self.operation}...")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        
        if exc_type is None:
            self.logger.info(f"Completed {self.operation} in {duration:.2f}s")
        else:
            self.logger.error(
                f"Failed {self.operation} after {duration:.2f}s: {exc_val}",
                exc_info=True
            )
        
        return False  # Don't suppress exceptions


def log_request(logger: logging.Logger, method: str, url: str, status: int = None, duration: float = None):
    """Log an HTTP request with details."""
    msg_parts = [f"{method} {url}"]
    
    if status is not None:
        msg_parts.append(f"status={status}")
    
    if duration is not None:
        msg_parts.append(f"duration={duration:.2f}s")
    
    level = logging.INFO if (status is None or status < 400) else logging.WARNING
    logger.log(level, " | ".join(msg_parts))


def log_scraper_stats(logger: logging.Logger, stats: dict):
    """Log scraper run statistics."""
    logger.info(
        f"Stats: fetched={stats.get('fetched', 0)}, "
        f"saved={stats.get('saved', 0)}, "
        f"duplicates={stats.get('duplicates', 0)}, "
        f"errors={stats.get('errors', 0)}, "
        f"retries={stats.get('retries', 0)}"
    )


# Initialize default logging when module is imported
def init_default_logging():
    """Initialize logging with default settings if not already configured."""
    root = logging.getLogger()
    if not root.handlers:
        setup_logging(level=logging.INFO, log_to_file=True)


if __name__ == "__main__":
    # Test logging configuration
    setup_logging(level=logging.DEBUG, log_to_file=True, source_name='test')
    
    logger = get_scraper_logger('test')
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")
    
    print(f"\nLog files created in: {LOG_DIR}")
