import os
import sys

from celery import Celery
from celery.schedules import crontab
from kombu import Queue

# Add project root and scrapers dir to path so scraper modules are importable
_nextstep_pkg = os.path.dirname(os.path.abspath(__file__))        # nextstep/nextstep/
_nextstep_root = os.path.dirname(_nextstep_pkg)                    # nextstep/
_project_root = os.path.dirname(_nextstep_root)                    # D:\Nextstep_AI\
_scrapers_dir = os.path.join(_project_root, 'scrapers')

for _p in [_project_root, _scrapers_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nextstep.settings')

app = Celery('nextstep')
app.config_from_object('django.conf:settings', namespace='CELERY')

app.conf.task_queues = (
    Queue('api_queue'),
    Queue('scraper_queue'),
)
app.conf.task_default_queue = 'api_queue'

app.autodiscover_tasks(['scrapers'])

app.conf.beat_schedule = {
    # ── API sources (fast, generous limits) ──────────────────────────────────
    'remotive-every-4h': {
        'task': 'scrapers.tasks.run_remotive',
        'schedule': crontab(minute=0, hour='*/4'),
    },
    'arbeitnow-every-4h': {
        'task': 'scrapers.tasks.run_arbeitnow',
        'schedule': crontab(minute=15, hour='*/4'),
    },
    'adzuna-every-6h': {
        'task': 'scrapers.tasks.run_adzuna',
        'schedule': crontab(minute=0, hour='*/6'),
    },
    'themuse-every-6h': {
        'task': 'scrapers.tasks.run_themuse',
        'schedule': crontab(minute=30, hour='*/6'),
    },
    # JSearch: 6 queries/day x 30 days = 180 calls/month (within 200 free tier)
    'jsearch-daily': {
        'task': 'scrapers.tasks.run_jsearch',
        'schedule': crontab(minute=0, hour=3),
    },
    # ── HTML scrapers (slower, polite delays) ─────────────────────────────────
    'internshala-every-8h': {
        'task': 'scrapers.tasks.run_internshala',
        'schedule': crontab(minute=0, hour='*/8'),
    },
    'wellfound-every-8h': {
        'task': 'scrapers.tasks.run_wellfound',
        'schedule': crontab(minute=20, hour='*/8'),
    },
    'unstop-every-8h': {
        'task': 'scrapers.tasks.run_unstop',
        'schedule': crontab(minute=40, hour='*/8'),
    },
    'reddit-every-12h': {
        'task': 'scrapers.tasks.run_reddit',
        'schedule': crontab(minute=0, hour='*/12'),
    },
    'hackernews-every-12h': {
        'task': 'scrapers.tasks.run_hackernews',
        'schedule': crontab(minute=30, hour='*/12'),
    },
}
