"""
Master scraper runner for NextStep AI.

Run all scrapers with configurable options.
Usage:
    python run_all_scrapers.py              # Run all scrapers
    python run_all_scrapers.py --quick      # Quick run (fewer results)
    python run_all_scrapers.py --source=X   # Run specific scraper
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from typing import Dict, List

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

# Import scrapers
from reddit_scraper import RedditForHireScraper
from multi_reddit_scraper import MultiRedditScraper
from hackernews_scraper import HackerNewsScraper
from remotive_scraper import RemotiveScraper

logger = logging.getLogger(__name__)


class ScraperRunner:
    """Orchestrates running multiple scrapers."""
    
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
    
    # Optional scrapers (may require additional setup)
    OPTIONAL_SCRAPERS = {
        'internshala': {
            'class': None,  # Loaded dynamically
            'args': {'max_per_category': 10},
            'quick_args': {'max_per_category': 5},
            'description': 'Internshala (India internships)',
        },
    }
    
    def __init__(self, quick_mode: bool = False):
        self.quick_mode = quick_mode
        self.results: Dict[str, dict] = {}
    
    def run_scraper(self, name: str, config: dict) -> dict:
        """Run a single scraper and return stats."""
        try:
            scraper_class = config['class']
            if scraper_class is None:
                # Try to import dynamically
                module_name = f"{name}_scraper"
                module = __import__(module_name)
                scraper_class = getattr(module, f"{name.title()}Scraper", None)
                if not scraper_class:
                    raise ImportError(f"Could not find scraper class in {module_name}")
            
            args = config['quick_args'] if self.quick_mode else config['args']
            
            logger.info(f"Running {name} scraper...")
            scraper = scraper_class(**args)
            stats = scraper.run()
            
            return stats
            
        except ImportError as e:
            logger.warning(f"Skipping {name}: {e}")
            return {'error': str(e), 'skipped': True}
        except Exception as e:
            logger.error(f"Error running {name}: {e}")
            return {'error': str(e)}
    
    def run_all(self, sources: List[str] = None) -> Dict[str, dict]:
        """Run all or specified scrapers."""
        
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
        
        logger.info(f"Running {len(all_scrapers)} scrapers...")
        
        for name, config in all_scrapers.items():
            stats = self.run_scraper(name, config)
            self.results[name] = stats
        
        return self.results
    
    def print_summary(self):
        """Print summary of all scraper runs."""
        print("\n" + "=" * 60)
        print("SCRAPER SUMMARY")
        print("=" * 60)
        
        total_fetched = 0
        total_saved = 0
        
        for name, stats in self.results.items():
            if stats.get('skipped'):
                print(f"\n{name}: SKIPPED")
                continue
            
            if stats.get('error') and not stats.get('fetched'):
                print(f"\n{name}: ERROR - {stats.get('error')}")
                continue
            
            fetched = stats.get('fetched', 0)
            saved = stats.get('saved', 0)
            dupes = stats.get('duplicates', 0)
            
            total_fetched += fetched
            total_saved += saved
            
            print(f"\n{name}:")
            print(f"  Fetched: {fetched}")
            print(f"  Saved: {saved}")
            print(f"  Duplicates: {dupes}")
        
        print("\n" + "-" * 60)
        print(f"TOTAL: Fetched {total_fetched}, Saved {total_saved}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='Run NextStep AI scrapers')
    parser.add_argument('--quick', action='store_true', help='Quick mode (fewer results)')
    parser.add_argument('--source', type=str, help='Run specific scraper (comma-separated)')
    parser.add_argument('--list', action='store_true', help='List available scrapers')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    runner = ScraperRunner(quick_mode=args.quick)
    
    if args.list:
        print("Available scrapers:")
        for name, config in {**runner.SCRAPERS, **runner.OPTIONAL_SCRAPERS}.items():
            print(f"  {name}: {config['description']}")
        return
    
    sources = args.source.split(',') if args.source else None
    
    print(f"\n{'='*60}")
    print(f"NextStep AI Scraper - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Mode: {'Quick' if args.quick else 'Full'}")
    print(f"{'='*60}\n")
    
    runner.run_all(sources=sources)
    runner.print_summary()


if __name__ == "__main__":
    main()
