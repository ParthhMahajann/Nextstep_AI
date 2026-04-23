"""
Management command to pre-compute and cache job embeddings.

Usage:
    python manage.py precompute_embeddings [--batch-size 64] [--force]
"""

import sys
import logging
from pathlib import Path

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)

ML_ENGINE_PATH = str(Path(__file__).resolve().parent.parent.parent.parent.parent / 'ml_engine')


class Command(BaseCommand):
    help = 'Pre-compute sentence-transformer embeddings for all active jobs.'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=64)
        parser.add_argument('--force', action='store_true', help='Recompute even if embedding exists')

    def handle(self, *args, **options):
        if ML_ENGINE_PATH not in sys.path:
            sys.path.insert(0, ML_ENGINE_PATH)

        from skill_matcher import get_skill_matcher
        from embedding_store import build_job_text, serialize_embedding
        from core.models import Job

        batch_size = options['batch_size']
        force = options['force']

        qs = Job.objects.filter(is_active=True)
        if not force:
            qs = qs.filter(embedding__isnull=True)

        total = qs.count()
        self.stdout.write(f'Jobs to embed: {total}')

        if total == 0:
            self.stdout.write(self.style.SUCCESS('Nothing to do.'))
            return

        matcher = get_skill_matcher()
        done = 0
        errors = 0

        jobs = list(qs)
        for i in range(0, len(jobs), batch_size):
            batch = jobs[i:i + batch_size]
            texts = [build_job_text(j) for j in batch]
            try:
                vecs = matcher.encode(texts)
                for job, vec in zip(batch, vecs):
                    Job.objects.filter(pk=job.pk).update(embedding=serialize_embedding(vec))
                done += len(batch)
                self.stdout.write(f'  {done}/{total}')
            except Exception as e:
                errors += len(batch)
                self.stderr.write(f'Batch error: {e}')

        self.stdout.write(self.style.SUCCESS(f'Done. {done} embedded, {errors} errors.'))
