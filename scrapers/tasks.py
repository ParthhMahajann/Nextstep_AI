"""
Celery tasks for NextStep AI scraper pipeline.

Each task wraps one scraper's .run() call with:
- Queue assignment (api_queue vs scraper_queue)
- Auto-retry with exponential backoff (3 attempts)
- Result returned as stats dict to Redis backend

Task names follow pattern: scrapers.tasks.<name>
Beat schedule is configured in nextstep/nextstep/celery.py.
"""

import os
import sys
import logging
from datetime import datetime

# Add scrapers directory to sys.path so flat imports work (base_scraper etc.)
_dir = os.path.dirname(os.path.abspath(__file__))
if _dir not in sys.path:
    sys.path.insert(0, _dir)

from celery import shared_task

logger = logging.getLogger(__name__)


def _retry_countdown(retries: int) -> int:
    """Exponential backoff: 60s → 120s → 240s."""
    return 60 * (2 ** retries)


def _store_status(source: str, stats: dict, status: str = 'success') -> None:
    """Write last-run stats to Django cache for scraper_status command."""
    try:
        from django.core.cache import cache
        cache.set(
            f'scraper_status:{source}',
            {'stats': stats, 'last_run': datetime.now().isoformat(), 'status': status},
            timeout=7 * 24 * 3600,
        )
    except Exception:
        pass  # Cache write failure must never break the task


# ── API queue tasks ───────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_remotive')
def run_remotive(self):
    try:
        from remotive_scraper import RemotiveScraper
        stats = RemotiveScraper(limit=50).run()
        _store_status('remotive', stats)
        return stats
    except Exception as exc:
        _store_status('remotive', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_arbeitnow')
def run_arbeitnow(self):
    try:
        from arbeitnow_scraper import ArbeitnowScraper
        stats = ArbeitnowScraper(limit=50).run()
        _store_status('arbeitnow', stats)
        return stats
    except Exception as exc:
        _store_status('arbeitnow', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_adzuna')
def run_adzuna(self):
    try:
        from adzuna_scraper import AdzunaScraper
        stats = AdzunaScraper(limit=120).run()
        _store_status('adzuna', stats)
        return stats
    except Exception as exc:
        _store_status('adzuna', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='api_queue', name='scrapers.tasks.run_themuse')
def run_themuse(self):
    try:
        from themuse_scraper import TheMuseScraper
        stats = TheMuseScraper(limit=100).run()
        _store_status('themuse', stats)
        return stats
    except Exception as exc:
        _store_status('themuse', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=2, queue='api_queue', name='scrapers.tasks.run_jsearch')
def run_jsearch(self):
    # max_retries=2 — JSearch auth errors should not burn free quota on retries
    try:
        from jsearch_scraper import JSearchScraper
        stats = JSearchScraper(limit=60).run()
        _store_status('jsearch', stats)
        return stats
    except Exception as exc:
        _store_status('jsearch', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


# ── Scraper queue tasks ───────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_internshala')
def run_internshala(self):
    try:
        from internshala_scraper import InternshalaScraper
        stats = InternshalaScraper(max_per_category=15).run()
        _store_status('internshala', stats)
        return stats
    except Exception as exc:
        _store_status('internshala', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_wellfound')
def run_wellfound(self):
    try:
        from wellfound_scraper import WellfoundScraper
        stats = WellfoundScraper(limit=80).run()
        _store_status('wellfound', stats)
        return stats
    except Exception as exc:
        _store_status('wellfound', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_unstop')
def run_unstop(self):
    try:
        from unstop_scraper import UnstopScraper
        stats = UnstopScraper(limit=60).run()
        _store_status('unstop', stats)
        return stats
    except Exception as exc:
        _store_status('unstop', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_reddit')
def run_reddit(self):
    try:
        from multi_reddit_scraper import MultiRedditScraper
        stats = MultiRedditScraper(limit_per_sub=25).run()
        _store_status('reddit', stats)
        return stats
    except Exception as exc:
        _store_status('reddit', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))


@shared_task(bind=True, max_retries=3, queue='scraper_queue', name='scrapers.tasks.run_hackernews')
def run_hackernews(self):
    try:
        from hackernews_scraper import HackerNewsScraper
        stats = HackerNewsScraper(max_comments=100).run()
        _store_status('hackernews', stats)
        return stats
    except Exception as exc:
        _store_status('hackernews', {}, status='error')
        raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))
