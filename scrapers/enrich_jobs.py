"""
Job Intelligence Enrichment Runner for NextStep AI.

Uses LOCAL ML models (no API calls) to extract:
- Skills, experience level, role type, and summary

Usage:
    python enrich_jobs.py              # Enrich all unenriched jobs
    python enrich_jobs.py --limit 10   # Enrich up to 10 jobs
    python enrich_jobs.py --dry-run    # Preview without saving
    python enrich_jobs.py --reset      # Re-enrich all jobs (reset flags)
"""

import os
import sys
import time
import argparse
import logging
from datetime import datetime

# Setup Django
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.join(BASE_DIR, "nextstep")
ML_ENGINE_DIR = os.path.join(BASE_DIR, "ml_engine")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, ML_ENGINE_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")

import django
django.setup()

from core.models import Job

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


def enrich_jobs(limit: int = None, dry_run: bool = False, reset: bool = False):
    """
    Run enrichment on unenriched jobs using LOCAL ML (no API calls).
    
    Args:
        limit: Maximum number of jobs to process (None = all)
        dry_run: If True, show what would be enriched without saving
        reset: If True, re-enrich all jobs (reset is_enriched flag first)
    """
    from ml_enrichment import get_enricher
    
    enricher = get_enricher()
    
    # Reset enrichment flags if requested
    if reset:
        reset_count = Job.objects.filter(is_enriched=True).update(is_enriched=False)
        logger.info(f"Reset {reset_count} enrichment flags")
    
    # Get unenriched jobs
    queryset = Job.objects.filter(is_enriched=False, is_active=True).order_by('-scraped_at')
    total_unenriched = queryset.count()
    
    if limit:
        queryset = queryset[:limit]
    
    jobs = list(queryset)
    
    logger.info("=" * 50)
    logger.info("JOB INTELLIGENCE ENRICHMENT (Local ML)")
    logger.info("=" * 50)
    logger.info(f"Total unenriched jobs: {total_unenriched}")
    logger.info(f"Jobs to process: {len(jobs)}")
    logger.info(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    logger.info(f"Engine: Local ML (no API calls)")
    logger.info("-" * 50)
    
    if not jobs:
        logger.info("No unenriched jobs found. All done!")
        return
    
    success = 0
    failed = 0
    start_time = time.time()
    
    for i, job in enumerate(jobs, 1):
        if dry_run:
            logger.info(f"[{i}/{len(jobs)}] Would enrich: {job.title} at {job.company}")
            success += 1
            continue
        
        try:
            enrichment = enricher.enrich(
                title=job.title,
                company=job.company,
                description=job.description
            )
            
            if enrichment:
                job.ai_summary = enrichment.summary
                job.ai_skills = enrichment.skills
                job.experience_level = enrichment.experience_level
                job.role_type = enrichment.role_type
                job.is_enriched = True
                job.save(update_fields=[
                    'ai_summary', 'ai_skills', 'experience_level',
                    'role_type', 'is_enriched', 'updated_at'
                ])
                
                success += 1
                skills_str = ', '.join(enrichment.skills[:5])
                if i <= 5 or i % 10 == 0:  # Log first 5, then every 10th
                    logger.info(
                        f"  ✓ [{i}] {enrichment.experience_level} | {enrichment.role_type} | "
                        f"Skills: {skills_str}"
                    )
            else:
                failed += 1
                logger.warning(f"  ✗ [{i}] No enrichment data")
                # Still mark as enriched to avoid re-processing
                job.is_enriched = True
                job.save(update_fields=['is_enriched'])
                
        except Exception as e:
            failed += 1
            logger.error(f"  ✗ [{i}] Error: {e}")
    
    # Summary
    duration = round(time.time() - start_time, 2)
    jobs_per_sec = round(len(jobs) / max(duration, 0.01), 1)
    
    logger.info("=" * 50)
    logger.info("ENRICHMENT COMPLETE")
    logger.info("=" * 50)
    logger.info(f"Processed: {len(jobs)} jobs in {duration}s ({jobs_per_sec} jobs/sec)")
    logger.info(f"Success: {success}")
    logger.info(f"Failed: {failed}")
    
    remaining = Job.objects.filter(is_enriched=False, is_active=True).count()
    logger.info(f"Remaining unenriched: {remaining}")
    logger.info("=" * 50)


def main():
    parser = argparse.ArgumentParser(description='NextStep AI Job Enrichment (Local ML)')
    parser.add_argument('--limit', type=int, default=None,
                        help='Maximum number of jobs to enrich')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview without saving changes')
    parser.add_argument('--reset', action='store_true',
                        help='Reset enrichment flags and re-enrich all jobs')
    
    args = parser.parse_args()
    
    enrich_jobs(
        limit=args.limit,
        dry_run=args.dry_run,
        reset=args.reset,
    )


if __name__ == "__main__":
    main()
