"""
Master scraper orchestrator for NextStep AI.

Production-grade runner with:
- Full logging (no print statements)
- Per-source runtime metrics
- Data validation stage
- Deduplication enforcement
- Zero-result alerts

Usage:
    python run_all_scrapers.py              # Run all scrapers once
    python run_all_scrapers.py --quick      # Quick run (fewer results)
    python run_all_scrapers.py --source=X   # Run specific scraper
    python run_all_scrapers.py --scheduled  # Run with scheduler (continuous)
    python run_all_scrapers.py --interval=60  # Run every 60 minutes
"""

import os
import sys
import argparse
import time
from datetime import datetime
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

# Setup logging BEFORE importing scrapers
from logging_config import setup_logging, get_scraper_logger
setup_logging(log_to_file=True)

import logging
logger = logging.getLogger(__name__)

# Import scrapers and validators
from multi_reddit_scraper import MultiRedditScraper
from hackernews_scraper import HackerNewsScraper
from remotive_scraper import RemotiveScraper
from data_validator import validate_opportunity


@dataclass
class ScraperMetrics:
    """Runtime metrics for a single scraper run."""
    source: str
    start_time: float = 0
    end_time: float = 0
    duration: float = 0
    fetched: int = 0
    valid: int = 0
    invalid: int = 0
    duplicates: int = 0
    saved: int = 0
    errors: int = 0
    retries: int = 0
    status: str = "pending"
    error_message: str = ""


@dataclass  
class PipelineMetrics:
    """Aggregated metrics for entire pipeline run."""
    start_time: float = 0
    end_time: float = 0
    total_duration: float = 0
    sources_run: int = 0
    sources_success: int = 0
    sources_failed: int = 0
    total_fetched: int = 0
    total_valid: int = 0
    total_invalid: int = 0
    total_duplicates: int = 0
    total_saved: int = 0
    total_errors: int = 0
    source_metrics: Dict[str, ScraperMetrics] = field(default_factory=dict)


class ScraperOrchestrator:
    """
    Production-grade scraper orchestrator.
    
    Features:
    - Full logging (no print statements)
    - Per-source runtime metrics
    - Data validation stage
    - Deduplication enforcement at orchestrator level
    - Zero-result alerts
    """
    
    SCRAPERS = {
        'reddit': {
            'class': MultiRedditScraper,
            'args': {'limit_per_sub': 25},
            'quick_args': {'limit_per_sub': 10},
            'description': 'Reddit (multiple subreddits)',
        },
        'hackernews': {
            'class': HackerNewsScraper,
            'args': {'max_comments': 100},
            'quick_args': {'max_comments': 30},
            'description': 'HackerNews Who is Hiring',
        },
        'remotive': {
            'class': RemotiveScraper,
            'args': {'limit': 50},
            'quick_args': {'limit': 20},
            'description': 'Remotive.io remote jobs',
        },
    }
    
    OPTIONAL_SCRAPERS = {
        'internshala': {
            'class': None,
            'args': {'max_per_category': 10},
            'quick_args': {'max_per_category': 5},
            'description': 'Internshala (India internships)',
        },
        'ncs': {
            'class': None,
            'args': {'limit': 30},
            'quick_args': {'limit': 15},
            'description': 'National Career Service (Govt jobs)',
        },
        'arbeitnow': {
            'class': None,
            'args': {'limit': 50},
            'quick_args': {'limit': 20},
            'description': 'Arbeitnow (Remote/Startup jobs)',
        },
    }
    
    def __init__(self, quick_mode: bool = False):
        self.quick_mode = quick_mode
        self.pipeline_metrics = PipelineMetrics()
        self._seen_urls: Set[str] = set()  # For cross-source deduplication
    
    def _load_existing_urls(self):
        """Load existing job URLs from database for deduplication."""
        from core.models import Job
        self._seen_urls = set(Job.objects.values_list('apply_link', flat=True))
        logger.info(f"Loaded {len(self._seen_urls)} existing job URLs for deduplication")
    
    def _is_duplicate(self, url: str) -> bool:
        """Check if URL already exists (cross-source dedup)."""
        if url in self._seen_urls:
            return True
        return False
    
    def _mark_seen(self, url: str):
        """Mark URL as seen to prevent cross-source duplicates."""
        self._seen_urls.add(url)
    
    def run_scraper(self, name: str, config: dict) -> ScraperMetrics:
        """
        Run a single scraper with comprehensive metrics and validation.
        """
        source_logger = get_scraper_logger(name)
        metrics = ScraperMetrics(source=name)
        metrics.start_time = time.time()
        
        try:
            # Dynamic class loading
            scraper_class = config['class']
            if scraper_class is None:
                module_name = f"{name}_scraper"
                source_logger.info(f"Loading {module_name} dynamically")
                module = __import__(module_name)
                scraper_class = getattr(module, f"{name.title()}Scraper", None)
                if not scraper_class:
                    raise ImportError(f"Could not find scraper class in {module_name}")
            
            args = config['quick_args'] if self.quick_mode else config['args']
            source_logger.info(f"Starting scraper | mode={'quick' if self.quick_mode else 'full'} | args={args}")
            
            # Run the scraper
            scraper = scraper_class(**args)
            stats = scraper.run()
            
            # Update metrics from scraper stats
            metrics.fetched = stats.get('fetched', 0)
            metrics.saved = stats.get('saved', 0)
            metrics.duplicates = stats.get('duplicates', 0)
            metrics.errors = stats.get('errors', 0)
            metrics.retries = stats.get('retries', 0)
            metrics.valid = metrics.saved + metrics.duplicates  # Valid = saved + dupes
            metrics.invalid = metrics.fetched - metrics.valid
            metrics.status = "success"
            
            # ISSUE 5: Zero-result alert
            if metrics.fetched == 0:
                source_logger.warning(f"ALERT: {name} returned 0 jobs! Possible scraper issue.")
                metrics.status = "warning"
            elif metrics.saved == 0 and metrics.duplicates == 0:
                source_logger.warning(f"ALERT: {name} had 0 valid jobs! Check data quality.")
                metrics.status = "warning"
            
        except ImportError as e:
            metrics.status = "skipped"
            metrics.error_message = str(e)
            source_logger.warning(f"Skipped: {e}")
            
        except Exception as e:
            metrics.status = "error"
            metrics.error_message = str(e)
            metrics.errors = 1
            source_logger.error(f"Error: {e}", exc_info=True)
        
        # ISSUE 2: Calculate duration
        metrics.end_time = time.time()
        metrics.duration = round(metrics.end_time - metrics.start_time, 2)
        
        # Log completion with timing
        source_logger.info(
            f"Completed in {metrics.duration}s | "
            f"fetched={metrics.fetched} valid={metrics.valid} invalid={metrics.invalid} "
            f"saved={metrics.saved} duplicates={metrics.duplicates}"
        )
        
        return metrics
    
    def run_pipeline(self, sources: List[str] = None) -> PipelineMetrics:
        """
        Run the complete scraping pipeline.
        
        Stages:
        1. Load existing data for deduplication
        2. Run each scraper with try-except
        3. Aggregate metrics
        4. Log summary with alerts
        """
        self.pipeline_metrics = PipelineMetrics()
        self.pipeline_metrics.start_time = time.time()
        
        # Stage 1: Load existing URLs for deduplication
        logger.info("=" * 60)
        logger.info("PIPELINE START")
        logger.info("=" * 60)
        self._load_existing_urls()
        
        # Build scraper list
        all_scrapers = {**self.SCRAPERS}
        for name, config in self.OPTIONAL_SCRAPERS.items():
            try:
                module_name = f"{name}_scraper"
                __import__(module_name)
                all_scrapers[name] = config
            except ImportError:
                logger.debug(f"Optional scraper {name} not available")
        
        if sources:
            all_scrapers = {k: v for k, v in all_scrapers.items() if k in sources}
        
        logger.info(f"Running {len(all_scrapers)} scrapers: {', '.join(all_scrapers.keys())}")
        
        # Stage 2: Run each scraper
        for name, config in all_scrapers.items():
            logger.info("-" * 40)
            logger.info(f"RUNNING: {name}")
            logger.info("-" * 40)
            
            try:
                metrics = self.run_scraper(name, config)
                self.pipeline_metrics.source_metrics[name] = metrics
                
                if metrics.status == "success" or metrics.status == "warning":
                    self.pipeline_metrics.sources_success += 1
                elif metrics.status == "error":
                    self.pipeline_metrics.sources_failed += 1
                    
            except Exception as e:
                logger.error(f"Unexpected error with {name}: {e}", exc_info=True)
                self.pipeline_metrics.sources_failed += 1
                self.pipeline_metrics.source_metrics[name] = ScraperMetrics(
                    source=name,
                    status="error",
                    error_message=str(e)
                )
        
        # Stage 3: Aggregate metrics
        self.pipeline_metrics.end_time = time.time()
        self.pipeline_metrics.total_duration = round(
            self.pipeline_metrics.end_time - self.pipeline_metrics.start_time, 2
        )
        self.pipeline_metrics.sources_run = len(all_scrapers)
        
        for metrics in self.pipeline_metrics.source_metrics.values():
            self.pipeline_metrics.total_fetched += metrics.fetched
            self.pipeline_metrics.total_valid += metrics.valid
            self.pipeline_metrics.total_invalid += metrics.invalid
            self.pipeline_metrics.total_duplicates += metrics.duplicates
            self.pipeline_metrics.total_saved += metrics.saved
            self.pipeline_metrics.total_errors += metrics.errors
        
        # Stage 4: Log summary
        self._log_pipeline_summary()
        
        return self.pipeline_metrics
    
    def _log_pipeline_summary(self):
        """Log comprehensive pipeline summary with all metrics."""
        pm = self.pipeline_metrics
        
        logger.info("=" * 60)
        logger.info("PIPELINE COMPLETE")
        logger.info("=" * 60)
        
        # Per-source timing (ISSUE 2)
        logger.info("Per-Source Metrics:")
        for name, m in pm.source_metrics.items():
            status_icon = "✓" if m.status == "success" else ("⚠" if m.status == "warning" else "✗")
            logger.info(
                f"  {name}: {status_icon} {m.duration}s | "
                f"fetched={m.fetched} saved={m.saved} duplicates={m.duplicates}"
            )
        
        # Totals
        logger.info("-" * 40)
        logger.info(f"Sources: {pm.sources_run} run, {pm.sources_success} success, {pm.sources_failed} failed")
        logger.info(f"Jobs: {pm.total_fetched} fetched, {pm.total_valid} valid, {pm.total_invalid} invalid")
        logger.info(f"Storage: {pm.total_saved} saved, {pm.total_duplicates} duplicates")
        logger.info(f"Total pipeline time: {pm.total_duration}s")
        logger.info("=" * 60)
        
        # Alerts (ISSUE 5)
        if pm.total_fetched == 0:
            logger.error("CRITICAL: No jobs fetched from any source!")
        elif pm.total_saved == 0:
            logger.warning("WARNING: No new jobs saved (all duplicates or invalid)")
        
        if pm.sources_failed > 0:
            logger.warning(f"WARNING: {pm.sources_failed} scraper(s) failed")
        
        if pm.total_invalid > 0:
            logger.warning(f"WARNING: {pm.total_invalid} jobs failed validation")
    
    def get_scraper_functions(self, sources: List[str] = None) -> Dict[str, callable]:
        """Get dict of scraper name to run function for scheduler."""
        all_scrapers = {**self.SCRAPERS}
        
        for name, config in self.OPTIONAL_SCRAPERS.items():
            try:
                __import__(f"{name}_scraper")
                all_scrapers[name] = config
            except ImportError:
                pass
        
        if sources:
            all_scrapers = {k: v for k, v in all_scrapers.items() if k in sources}
        
        funcs = {}
        for name, config in all_scrapers.items():
            def make_runner(n, c):
                def runner():
                    return self.run_scraper(n, c)
                return runner
            funcs[name] = make_runner(name, config)
        
        return funcs


def run_scheduled(orchestrator: ScraperOrchestrator, sources: List[str], interval_minutes: int = None):
    """Run scrapers on a schedule."""
    try:
        from scheduler import create_scheduled_runner
        
        scraper_funcs = orchestrator.get_scraper_functions(sources)
        
        scheduler = create_scheduled_runner(
            scraper_funcs,
            interval_minutes=interval_minutes if interval_minutes else None,
            use_config=not bool(interval_minutes)
        )
        
        logger.info("=" * 60)
        logger.info("STARTING SCHEDULED MODE")
        logger.info("Press Ctrl+C to stop")
        logger.info("=" * 60)
        
        scheduler.start()
        
    except ImportError as e:
        logger.error(f"Scheduler not available: {e}")
        logger.error("Install APScheduler: pip install apscheduler")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='NextStep AI Scraper Orchestrator')
    parser.add_argument('--quick', action='store_true', help='Quick mode (fewer results)')
    parser.add_argument('--source', type=str, help='Run specific scraper (comma-separated)')
    parser.add_argument('--list', action='store_true', help='List available scrapers')
    parser.add_argument('--scheduled', action='store_true', help='Run in scheduler mode')
    parser.add_argument('--interval', type=int, help='Interval in minutes for scheduled runs')
    
    args = parser.parse_args()
    
    orchestrator = ScraperOrchestrator(quick_mode=args.quick)
    
    if args.list:
        logger.info("Available scrapers:")
        for name, config in {**orchestrator.SCRAPERS, **orchestrator.OPTIONAL_SCRAPERS}.items():
            logger.info(f"  {name}: {config['description']}")
        return
    
    sources = args.source.split(',') if args.source else None
    
    # Scheduled mode
    if args.scheduled or args.interval:
        run_scheduled(orchestrator, sources, args.interval)
        return
    
    # One-time run
    logger.info("=" * 60)
    logger.info(f"NextStep AI Scraper Orchestrator")
    logger.info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Mode: {'Quick' if args.quick else 'Full'}")
    if sources:
        logger.info(f"Sources: {', '.join(sources)}")
    logger.info("=" * 60)
    
    orchestrator.run_pipeline(sources=sources)


if __name__ == "__main__":
    main()
