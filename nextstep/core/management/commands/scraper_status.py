from django.core.management.base import BaseCommand
from django.core.cache import cache
from datetime import datetime

SCRAPER_SOURCES = [
    'remotive', 'arbeitnow', 'adzuna', 'themuse', 'jsearch',
    'internshala', 'wellfound', 'unstop', 'reddit', 'hackernews',
]


class Command(BaseCommand):
    help = 'Show last-run status for each scraper'

    def handle(self, *args, **options):
        self.stdout.write('\n{:<16} {:<22} {:>8} {:>8} {:>8} {}'.format(
            'SOURCE', 'LAST RUN', 'FETCHED', 'SAVED', 'ERRORS', 'STATUS'
        ))
        self.stdout.write('-' * 78)

        for source in SCRAPER_SOURCES:
            data = cache.get(f'scraper_status:{source}')
            if not data:
                self.stdout.write('{:<16} {:<22} {:>8} {:>8} {:>8} {}'.format(
                    source, 'never run', '-', '-', '-', 'unknown'
                ))
                continue

            stats = data.get('stats', {})
            last_run = data.get('last_run', 'unknown')
            status = data.get('status', 'unknown')

            try:
                dt = datetime.fromisoformat(last_run)
                last_run_fmt = dt.strftime('%Y-%m-%d %H:%M')
            except (ValueError, TypeError):
                last_run_fmt = str(last_run)[:20]

            self.stdout.write('{:<16} {:<22} {:>8} {:>8} {:>8} {}'.format(
                source,
                last_run_fmt,
                stats.get('fetched', '-'),
                stats.get('saved', '-'),
                stats.get('errors', '-'),
                status,
            ))

        self.stdout.write('')
