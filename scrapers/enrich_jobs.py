"""
Job Intelligence Enrichment Runner for NextStep AI.

Processes unenriched jobs through AI to extract:
- Skills, experience level, role type, and summary

Usage:
    python enrich_jobs.py              # Enrich all unenriched jobs
    python enrich_jobs.py --limit 10   # Enrich up to 10 jobs
    python enrich_jobs.py --dry-run    # Preview without saving
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
AI_ENGINE_DIR = os.path.join(BASE_DIR, "ai_engine")
sys.path.insert(0, PROJECT_DIR)
sys.path.insert(0, AI_ENGINE_DIR)
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


def enrich_jobs(limit: int = None, dry_run: bool = False, delay: float = 1.5):
    """
    Run enrichment on unenriched jobs.
    
    Args:
        limit: Maximum number of jobs to process (None = all)
        dry_run: If True, show what would be enriched without saving
        delay: Seconds between API calls (rate limiting)
    """
    from job_enrichment import enrich_job
    
    # Get unenriched jobs
    queryset = Job.objects.filter(is_enriched=False, is_active=True).order_by('-scraped_at')
    total_unenriched = queryset.count()
    
    if limit:
        queryset = queryset[:limit]
    
    jobs = list(queryset)
    
    logger.info("=" * 50)
    logger.info("JOB INTELLIGENCE ENRICHMENT")
    logger.info("=" * 50)
    logger.info(f"Total unenriched jobs: {total_unenriched}")
    logger.info(f"Jobs to process: {len(jobs)}")
    logger.info(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    logger.info(f"Rate limit delay: {delay}s between calls")
    logger.info("-" * 50)
    
    if not jobs:
        logger.info("No unenriched jobs found. All done!")
        return
    
    success = 0
    failed = 0
    start_time = time.time()
    
    for i, job in enumerate(jobs, 1):
        logger.info(f"[{i}/{len(jobs)}] Processing: {job.title} at {job.company}")
        
        if dry_run:
            logger.info(f"  → Would enrich (dry run)")
            success += 1
            continue
        
        try:
            enrichment = enrich_job(
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
                logger.info(f"  ✓ {enrichment.experience_level} | {enrichment.role_type} | Skills: {', '.join(enrichment.skills[:5])}")
            else:
                failed += 1
                logger.warning(f"  ✗ Enrichment returned no data")
                
        except Exception as e:
            failed += 1
            logger.error(f"  ✗ Error: {e}")
        
        # Rate limiting - don't hammer the API
        if i < len(jobs):
            time.sleep(delay)
    
    # Summary
    duration = round(time.time() - start_time, 1)
    logger.info("=" * 50)
    logger.info("ENRICHMENT COMPLETE")
    logger.info("=" * 50)
    logger.info(f"Processed: {len(jobs)} jobs in {duration}s")
    logger.info(f"Success: {success}")
    logger.info(f"Failed: {failed}")
    
    remaining = Job.objects.filter(is_enriched=False, is_active=True).count()
    logger.info(f"Remaining unenriched: {remaining}")
    logger.info("=" * 50)


def main():
    parser = argparse.ArgumentParser(description='NextStep AI Job Enrichment')
    parser.add_argument('--limit', type=int, default=None,
                        help='Maximum number of jobs to enrich')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview without saving changes')
    parser.add_argument('--delay', type=float, default=1.5,
                        help='Seconds between API calls (default: 1.5)')
    
    args = parser.parse_args()
    
    enrich_jobs(
        limit=args.limit,
        dry_run=args.dry_run,
        delay=args.delay
    )


if __name__ == "__main__":
    main()
