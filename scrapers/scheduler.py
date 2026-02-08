"""
Scheduler system for NextStep AI scrapers.

Provides automated scheduling of scraper runs using APScheduler.
Supports both cron-based and interval-based scheduling.
Compatible with APScheduler 3.x and 4.x.
"""

import os
import sys
import logging
import threading
import time
from datetime import datetime
from typing import Dict, Optional, Callable

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

# Detect APScheduler version and import accordingly
APSCHEDULER_AVAILABLE = False
APSCHEDULER_V4 = False

try:
    import apscheduler
    version = getattr(apscheduler, '__version__', '3.0.0')
    major_version = int(version.split('.')[0])
    APSCHEDULER_V4 = major_version >= 4
except Exception:
    pass

if APSCHEDULER_V4:
    try:
        from apscheduler import Scheduler
        from apscheduler.triggers.interval import IntervalTrigger
        from apscheduler.triggers.cron import CronTrigger
        APSCHEDULER_AVAILABLE = True
    except ImportError:
        pass
else:
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
        APSCHEDULER_AVAILABLE = True
    except ImportError:
        pass

from scheduler_config import SCHEDULER_CONFIG, DEFAULT_SCHEDULE

logger = logging.getLogger(__name__)


class ScraperScheduler:
    """
    Scheduler for automated scraper runs.
    
    Uses APScheduler to run scrapers on configurable schedules.
    Compatible with both APScheduler 3.x and 4.x.
    """
    
    def __init__(self, blocking: bool = True, config: Dict = None):
        if not APSCHEDULER_AVAILABLE:
            raise ImportError(
                "APScheduler is required for scheduling. "
                "Install it with: pip install apscheduler"
            )
        
        self.config = config or SCHEDULER_CONFIG
        self.blocking = blocking
        self.jobs_info = {}
        self._shutdown_event = threading.Event()
        self._is_running = False
        
        if APSCHEDULER_V4:
            self.scheduler = Scheduler()
            self._is_v4 = True
        else:
            if blocking:
                self.scheduler = BlockingScheduler()
            else:
                self.scheduler = BackgroundScheduler()
            self._is_v4 = False
    
    def add_scraper(
        self,
        name: str,
        func: Callable,
        schedule: Optional[Dict] = None,
    ):
        """Add a scraper to the schedule."""
        schedule = schedule or self.config.get(name, DEFAULT_SCHEDULE)
        
        if 'cron' in schedule:
            trigger = CronTrigger(**schedule['cron'])
            schedule_desc = f"cron: {schedule['cron']}"
        elif 'interval' in schedule:
            trigger = IntervalTrigger(**schedule['interval'])
            schedule_desc = f"interval: {schedule['interval']}"
        else:
            trigger = IntervalTrigger(hours=6)
            schedule_desc = "interval: 6 hours (default)"
        
        if self._is_v4:
            self.scheduler.add_schedule(func, trigger, id=name)
        else:
            self.scheduler.add_job(
                func,
                trigger=trigger,
                id=name,
                name=f"Scraper: {name}",
                replace_existing=True,
                max_instances=1,
            )
        
        self.jobs_info[name] = {'schedule': schedule_desc}
        logger.info(f"Added {name} with {schedule_desc}")
    
    def add_interval_job(
        self,
        name: str,
        func: Callable,
        minutes: int = None,
        hours: int = None,
    ):
        """Add a simple interval-based job."""
        if minutes:
            trigger = IntervalTrigger(minutes=minutes)
            schedule_desc = f"every {minutes} minutes"
        elif hours:
            trigger = IntervalTrigger(hours=hours)
            schedule_desc = f"every {hours} hours"
        else:
            trigger = IntervalTrigger(hours=1)
            schedule_desc = "every 1 hour (default)"
        
        if self._is_v4:
            self.scheduler.add_schedule(func, trigger, id=name)
        else:
            self.scheduler.add_job(
                func,
                trigger=trigger,
                id=name,
                name=f"Scraper: {name}",
                replace_existing=True,
                max_instances=1,
            )
        
        self.jobs_info[name] = {'schedule': schedule_desc}
        logger.info(f"Added {name} with {schedule_desc}")
    
    def print_schedule(self):
        """Print the current schedule to console."""
        print("\n" + "=" * 60)
        print("SCRAPER SCHEDULE")
        print("=" * 60)
        
        if not self.jobs_info:
            print("No jobs scheduled.")
        else:
            for name, info in self.jobs_info.items():
                print(f"  {name}: {info['schedule']}")
        
        print("=" * 60 + "\n")
    
    def start(self):
        """Start the scheduler."""
        logger.info("Starting scraper scheduler...")
        self.print_schedule()
        self._is_running = True
        
        print("Scheduler running. Press Ctrl+C to stop.\n")
        
        if self._is_v4:
            # For APScheduler 4.x, run in a thread and wait for shutdown
            scheduler_thread = threading.Thread(
                target=self._run_v4_scheduler,
                daemon=True
            )
            scheduler_thread.start()
            
            try:
                while not self._shutdown_event.is_set():
                    time.sleep(0.5)
            except KeyboardInterrupt:
                print("\n\nShutdown requested...")
            finally:
                self.stop()
        else:
            # APScheduler 3.x
            try:
                self.scheduler.start()
            except (KeyboardInterrupt, SystemExit):
                print("\n\nShutdown requested...")
            finally:
                self.stop()
    
    def _run_v4_scheduler(self):
        """Run v4 scheduler in background."""
        try:
            self.scheduler.run_until_stopped()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
    
    def stop(self):
        """Stop the scheduler gracefully."""
        self._shutdown_event.set()
        self._is_running = False
        
        try:
            if self._is_v4:
                self.scheduler.stop()
            else:
                if hasattr(self.scheduler, 'running') and self.scheduler.running:
                    self.scheduler.shutdown(wait=False)
            print("Scheduler stopped.")
            logger.info("Scheduler stopped.")
        except Exception as e:
            logger.warning(f"Error stopping scheduler: {e}")


def create_scheduled_runner(
    scrapers: Dict[str, Callable],
    interval_minutes: int = None,
    use_config: bool = True,
):
    """
    Factory function to create a configured scheduler.
    
    Args:
        scrapers: Dict mapping scraper names to their run functions
        interval_minutes: If provided, use this interval for all scrapers
        use_config: If True, use scheduler_config.py settings
    
    Returns:
        Configured ScraperScheduler instance
    """
    scheduler = ScraperScheduler(blocking=True)
    
    for name, func in scrapers.items():
        if interval_minutes:
            scheduler.add_interval_job(name, func, minutes=interval_minutes)
        elif use_config:
            scheduler.add_scraper(name, func)
        else:
            scheduler.add_interval_job(name, func, hours=6)
    
    return scheduler


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    if not APSCHEDULER_AVAILABLE:
        print("APScheduler not installed. Run: pip install apscheduler")
        sys.exit(1)
    
    print(f"APScheduler version: {'4.x' if APSCHEDULER_V4 else '3.x'}")
    
    def dummy_scraper():
        print(f"Dummy scraper ran at {datetime.now()}")
    
    scheduler = ScraperScheduler()
    scheduler.add_interval_job("test", dummy_scraper, minutes=1)
    
    print("Starting test scheduler (press Ctrl+C to stop)...")
    scheduler.start()
