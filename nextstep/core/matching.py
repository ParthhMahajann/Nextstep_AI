"""
Matching service integration for Django.

This module provides the bridge between the ML engine and Django views.
"""

import logging
import sys
from pathlib import Path
from typing import List, Dict, Optional

# Add ml_engine to path
ML_ENGINE_PATH = Path(__file__).resolve().parent.parent.parent / 'ml_engine'
if str(ML_ENGINE_PATH) not in sys.path:
    sys.path.insert(0, str(ML_ENGINE_PATH))

logger = logging.getLogger(__name__)


class MatchingService:
    """
    Service class for job-user matching.
    
    Provides a clean interface for views to get ranked jobs.
    """
    
    def __init__(self):
        self._ranking_service = None
    
    @property
    def ranking_service(self):
        """Lazy load ranking service."""
        if self._ranking_service is None:
            try:
                from ranking_service import get_ranking_service
                self._ranking_service = get_ranking_service()
            except ImportError as e:
                logger.warning(f"ML engine not available: {e}")
                self._ranking_service = None
        return self._ranking_service
    
    def get_recommended_jobs(
        self,
        user_profile,
        queryset=None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get recommended jobs for a user.
        
        Args:
            user_profile: UserProfile model instance
            queryset: Optional pre-filtered Job queryset
            limit: Maximum number of jobs to return
            
        Returns:
            List of job dicts with match scores
        """
        from .models import Job
        
        # Get jobs
        if queryset is None:
            queryset = Job.objects.filter(is_active=True)
        
        jobs_qs = queryset.prefetch_related('required_skills')[:limit * 2]
        
        # Convert to dicts for ML engine
        jobs_data = []
        for job in jobs_qs:
            jobs_data.append({
                'id': job.id,
                'title': job.title,
                'company': job.company,
                'location': job.location,
                'description': job.description,
                'job_type': job.job_type,
                'apply_link': job.apply_link,
                'source': job.source,
                'scraped_at': job.scraped_at.isoformat() if job.scraped_at else None,
                'required_skills': [s.name for s in job.required_skills.all()],
            })
        
        if not jobs_data:
            return []
        
        # Get user skills
        user_skills = list(
            user_profile.skills.select_related('skill').values_list('skill__name', flat=True)
        )
        
        # If ML engine available, use it
        if self.ranking_service:
            try:
                ranked = self.ranking_service.rank_jobs_for_user(
                    jobs=jobs_data,
                    user_skills=user_skills,
                    user_bio=user_profile.bio or "",
                    preferred_job_types=user_profile.preferred_job_types or [],
                    preferred_locations=user_profile.preferred_locations or [],
                    top_n=limit
                )
                return ranked
            except Exception as e:
                logger.error(f"ML ranking failed: {e}")
        
        # Fallback: basic keyword matching
        return self._fallback_ranking(jobs_data, user_skills, user_profile, limit)
    
    def _fallback_ranking(
        self,
        jobs: List[Dict],
        user_skills: List[str],
        user_profile,
        limit: int
    ) -> List[Dict]:
        """Simple fallback ranking when ML is unavailable."""
        
        user_skills_lower = [s.lower() for s in user_skills]
        preferred_types = [t.lower() for t in (user_profile.preferred_job_types or [])]
        
        for job in jobs:
            score = 0.0
            matched = []
            
            # Skill keyword match
            desc_lower = job.get('description', '').lower()
            title_lower = job.get('title', '').lower()
            
            for skill in user_skills_lower:
                if skill in desc_lower or skill in title_lower:
                    score += 0.2
                    matched.append(skill)
            
            # Job type preference
            if job.get('job_type', '').lower() in preferred_types:
                score += 0.3
            
            job['match_score'] = min(1.0, score)
            job['matched_skills'] = matched[:5]
            job['match_explanation'] = f"Keyword match: {len(matched)} skills found"
        
        jobs.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        return jobs[:limit]
    
    def compute_job_match(
        self,
        user_profile,
        job
    ) -> Dict:
        """
        Compute match score for a single job.
        
        Returns:
            Dict with match_score, matched_skills, explanation
        """
        user_skills = list(
            user_profile.skills.select_related('skill').values_list('skill__name', flat=True)
        )
        
        if self.ranking_service:
            try:
                from skill_matcher import get_skill_matcher
                matcher = get_skill_matcher()
                
                required_skills = [s.name for s in job.required_skills.all()]
                
                return matcher.compute_skill_match(
                    user_skills=user_skills,
                    job_description=job.description,
                    job_required_skills=required_skills
                )
            except Exception as e:
                logger.error(f"Skill match failed: {e}")
        
        return {
            'match_score': 0.5,
            'matched_skills': [],
            'explanation': 'ML matching unavailable'
        }


# Singleton
_matching_service: Optional[MatchingService] = None


def get_matching_service() -> MatchingService:
    """Get or create singleton matching service."""
    global _matching_service
    if _matching_service is None:
        _matching_service = MatchingService()
    return _matching_service
