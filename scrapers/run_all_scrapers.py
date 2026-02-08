"""
Master scraper runner for NextStep AI.

Run all scrapers with configurable options.
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
from typing import Dict, List, Optional

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

# Import scrapers
from reddit_scraper import RedditForHireScraper
from multi_reddit_scraper import MultiRedditScraper
from hackernews_scraper import HackerNewsScraper
from remotive_scraper import RemotiveScraper


class ScraperRunner:
    """
    Orchestrates running multiple scrapers with:
    - Per-scraper try-except handling
    - Per-source logging
    - Job counts per source and total
    - Execution time tracking
    - Zero results warnings
    - Storage and validation integration
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
    }
    
    def __init__(self, quick_mode: bool = False):
        self.quick_mode = quick_mode
        self.results: Dict[str, dict] = {}
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
    
    def run_scraper(self, name: str, config: dict) -> dict:
        """
        Run a single scraper with comprehensive error handling.
        
        Features:
        - Try-except per scraper
        - Logging per source
        - Execution time tracking
        - Warning if 0 results
        """
        source_logger = get_scraper_logger(name)
        scraper_start = time.time()
        
        stats = {
            'source': name,
            'fetched': 0,
            'saved': 0,
            'duplicates': 0,
            'errors': 0,
            'invalid': 0,
            'retries': 0,
            'requests': 0,
            'execution_time': 0,
            'timestamp': datetime.now().isoformat(),
        }
        
        try:
            # Dynamic class loading for optional scrapers
            scraper_class = config['class']
            if scraper_class is None:
                module_name = f"{name}_scraper"
                source_logger.info(f"Loading {module_name} dynamically...")
                module = __import__(module_name)
                scraper_class = getattr(module, f"{name.title()}Scraper", None)
                if not scraper_class:
                    raise ImportError(f"Could not find scraper class in {module_name}")
            
            # Get args based on mode
            args = config['quick_args'] if self.quick_mode else config['args']
            
            # Log start
            source_logger.info(f"Starting {name} scraper...")
            source_logger.info(f"Mode: {'quick' if self.quick_mode else 'full'}, Args: {args}")
            
            # Run the scraper (this handles storage, dedup, and validation internally)
            scraper = scraper_class(**args)
            scraper_stats = scraper.run()
            
            # Merge stats
            stats.update(scraper_stats)
            
            # Calculate execution time
            stats['execution_time'] = round(time.time() - scraper_start, 2)
            
            # Log per-source job counts
            source_logger.info(
                f"Completed: fetched={stats['fetched']}, saved={stats['saved']}, "
                f"duplicates={stats['duplicates']}, errors={stats['errors']}, "
                f"time={stats['execution_time']}s"
            )
            
            # Warning if 0 results
            if stats['fetched'] == 0:
                source_logger.warning(f"⚠️ WARNING: No results fetched from {name}!")
            elif stats['saved'] == 0 and stats['duplicates'] == 0:
                source_logger.warning(f"⚠️ WARNING: No valid jobs saved from {name}!")
            
        except ImportError as e:
            stats['execution_time'] = round(time.time() - scraper_start, 2)
            stats['error'] = str(e)
            stats['skipped'] = True
            source_logger.warning(f"Skipping {name}: {e}")
            
        except Exception as e:
            stats['execution_time'] = round(time.time() - scraper_start, 2)
            stats['error'] = str(e)
            stats['errors'] = 1
            source_logger.error(f"Error running {name}: {e}", exc_info=True)
        
        return stats
    
    def run_all(self, sources: List[str] = None) -> Dict[str, dict]:
        """
        Run all or specified scrapers with timing and logging.
        
        Returns:
            Dict mapping source name to stats
        """
        self.start_time = time.time()
        
        # Build scraper list
        all_scrapers = {**self.SCRAPERS}
        
        # Add optional scrapers if available
        for name, config in self.OPTIONAL_SCRAPERS.items():
            try:
                module_name = f"{name}_scraper"
                __import__(module_name)
                all_scrapers[name] = config
            except ImportError:
                pass
        
        # Filter to requested sources
        if sources:
            all_scrapers = {k: v for k, v in all_scrapers.items() if k in sources}
        
        logger.info(f"Starting scraper run with {len(all_scrapers)} sources")
        logger.info(f"Sources: {', '.join(all_scrapers.keys())}")
        
        # Run each scraper with try-except
        for name, config in all_scrapers.items():
            try:
                stats = self.run_scraper(name, config)
                self.results[name] = stats
            except Exception as e:
                # Catch any uncaught exceptions
                logger.error(f"Unexpected error with {name}: {e}", exc_info=True)
                self.results[name] = {
                    'source': name,
                    'error': str(e),
                    'errors': 1,
                }
        
        self.end_time = time.time()
        
        # Log total summary
        total_time = round(self.end_time - self.start_time, 2)
        total_fetched = sum(r.get('fetched', 0) for r in self.results.values())
        total_saved = sum(r.get('saved', 0) for r in self.results.values())
        
        logger.info(f"All scrapers completed in {total_time}s")
        logger.info(f"Total: fetched={total_fetched}, saved={total_saved}")
        
        return self.results
    
    def get_scraper_functions(self, sources: List[str] = None) -> Dict[str, callable]:
        """Get dict of scraper name to run function for scheduler."""
        all_scrapers = {**self.SCRAPERS}
        
        for name, config in self.OPTIONAL_SCRAPERS.items():
            try:
                module_name = f"{name}_scraper"
                __import__(module_name)
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
    
    def print_summary(self):
        """Print detailed summary with job counts and execution time."""
        total_time = round(self.end_time - self.start_time, 2) if self.end_time else 0
        
        print("\n" + "=" * 60)
        print("SCRAPER SUMMARY")
        print("=" * 60)
        
        total_fetched = 0
        total_saved = 0
        total_duplicates = 0
        total_errors = 0
        total_retries = 0
        
        for name, stats in self.results.items():
            print(f"\n📊 {name.upper()}")
            print("-" * 40)
            
            if stats.get('skipped'):
                print("  Status: SKIPPED")
                print(f"  Reason: {stats.get('error', 'Unknown')}")
                continue
            
            if stats.get('error') and not stats.get('fetched'):
                print("  Status: ERROR ❌")
                print(f"  Error: {stats.get('error')}")
                total_errors += 1
                continue
            
            fetched = stats.get('fetched', 0)
            saved = stats.get('saved', 0)
            dupes = stats.get('duplicates', 0)
            errors = stats.get('errors', 0)
            retries = stats.get('retries', 0)
            exec_time = stats.get('execution_time', 0)
            
            total_fetched += fetched
            total_saved += saved
            total_duplicates += dupes
            total_errors += errors
            total_retries += retries
            
            print(f"  Fetched: {fetched}")
            print(f"  Saved: {saved}")
            print(f"  Duplicates: {dupes}")
            if errors > 0:
                print(f"  Errors: {errors} ⚠️")
            if retries > 0:
                print(f"  Retries: {retries}")
            print(f"  Time: {exec_time}s")
            
            # Warning for 0 results
            if fetched == 0:
                print("  ⚠️ WARNING: No results fetched!")
        
        # Total summary
        print("\n" + "=" * 60)
        print("TOTAL SUMMARY")
        print("=" * 60)
        print(f"  Sources Run: {len(self.results)}")
        print(f"  Jobs Fetched: {total_fetched}")
        print(f"  Jobs Saved: {total_saved}")
        print(f"  Duplicates: {total_duplicates}")
        if total_errors > 0:
            print(f"  Errors: {total_errors} ⚠️")
        if total_retries > 0:
            print(f"  Total Retries: {total_retries}")
        print(f"  Total Time: {total_time}s")
        print("=" * 60)
        
        # Final warning if no jobs saved
        if total_saved == 0 and total_fetched > 0:
            print("\n⚠️ WARNING: All fetched jobs were duplicates or invalid!")
        elif total_fetched == 0:
            print("\n❌ ERROR: No jobs fetched from any source!")


def run_scheduled(runner: ScraperRunner, sources: List[str], interval_minutes: int = None):
    """Run scrapers on a schedule."""
    try:
        from scheduler import create_scheduled_runner
        
        scraper_funcs = runner.get_scraper_functions(sources)
        
        if interval_minutes:
            scheduler = create_scheduled_runner(
                scraper_funcs,
                interval_minutes=interval_minutes,
                use_config=False
            )
        else:
            scheduler = create_scheduled_runner(
                scraper_funcs,
                use_config=True
            )
        
        print("\n" + "=" * 60)
        print("STARTING SCHEDULED SCRAPER MODE")
        print("Press Ctrl+C to stop")
        print("=" * 60)
        
        scheduler.start()
        
    except ImportError as e:
        logger.error(f"Scheduler not available: {e}")
        print(f"Error: Scheduler not available. {e}")
        print("Make sure APScheduler is installed: pip install apscheduler")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Run NextStep AI scrapers')
    parser.add_argument('--quick', action='store_true', help='Quick mode (fewer results)')
    parser.add_argument('--source', type=str, help='Run specific scraper (comma-separated)')
    parser.add_argument('--list', action='store_true', help='List available scrapers')
    parser.add_argument('--scheduled', action='store_true', help='Run in scheduler mode (continuous)')
    parser.add_argument('--interval', type=int, help='Interval in minutes for scheduled runs')
    
    args = parser.parse_args()
    
    runner = ScraperRunner(quick_mode=args.quick)
    
    if args.list:
        print("Available scrapers:")
        for name, config in {**runner.SCRAPERS, **runner.OPTIONAL_SCRAPERS}.items():
            print(f"  {name}: {config['description']}")
        return
    
    sources = args.source.split(',') if args.source else None
    
    # Scheduled mode
    if args.scheduled or args.interval:
        run_scheduled(runner, sources, args.interval)
        return
    
    # One-time run mode
    print(f"\n{'='*60}")
    print(f"NextStep AI Scraper - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Mode: {'Quick' if args.quick else 'Full'}")
    if sources:
        print(f"Sources: {', '.join(sources)}")
    print(f"{'='*60}\n")
    
    runner.run_all(sources=sources)
    runner.print_summary()


if __name__ == "__main__":
    main()
