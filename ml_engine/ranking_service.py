"""
Ranking Service for NextStep AI.

Combines TF-IDF and semantic matching to rank jobs
based on user profiles with preference weighting.
"""

import logging
from typing import List, Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RankingConfig:
    """Configuration for ranking weights."""
    skill_match_weight: float = 0.40
    semantic_similarity_weight: float = 0.30
    preference_weight: float = 0.20
    recency_weight: float = 0.10

    # Weights used when a user taste vector is available (must sum to 1.0)
    taste_skill_weight: float = 0.30
    taste_semantic_weight: float = 0.20
    taste_preference_weight: float = 0.15
    taste_recency_weight: float = 0.10
    taste_weight: float = 0.25


class RankingService:
    """
    Main ranking service that combines multiple signals.
    
    Ranking formula:
        score = (
            skill_match_weight * skill_overlap +
            semantic_similarity_weight * semantic_score +
            preference_weight * preference_match +
            recency_weight * recency_score
        )
    """
    
    def __init__(self, config: Optional[RankingConfig] = None):
        self.config = config or RankingConfig()
        self._skill_matcher = None
        self._vectorizer = None
    
    @property
    def skill_matcher(self):
        """Lazy load skill matcher."""
        if self._skill_matcher is None:
            from .skill_matcher import get_skill_matcher
            self._skill_matcher = get_skill_matcher()
        return self._skill_matcher
    
    @property
    def vectorizer(self):
        """Lazy load vectorizer."""
        if self._vectorizer is None:
            from .vectorizer import JobVectorizer
            self._vectorizer = JobVectorizer()
        return self._vectorizer
    
    def _compute_preference_match(
        self,
        job: Dict,
        preferred_job_types: List[str],
        preferred_locations: List[str]
    ) -> float:
        """Compute how well job matches user preferences."""
        score = 0.0
        factors = 0
        
        # Job type match
        if preferred_job_types:
            factors += 1
            job_type = job.get('job_type', '').lower()
            if any(pref.lower() == job_type for pref in preferred_job_types):
                score += 1.0
        
        # Location match
        if preferred_locations:
            factors += 1
            job_location = job.get('location', '').lower()
            
            for pref_loc in preferred_locations:
                pref_lower = pref_loc.lower()
                if pref_lower in job_location or job_location in pref_lower:
                    score += 1.0
                    break
                # Special handling for "remote"
                if pref_lower == 'remote' and 'remote' in job_location:
                    score += 1.0
                    break
        
        return score / factors if factors > 0 else 0.5
    
    def _compute_recency_score(self, job: Dict) -> float:
        """Compute recency score (newer = higher)."""
        from datetime import datetime, timezone
        
        scraped_at = job.get('scraped_at')
        if not scraped_at:
            return 0.5
        
        # Handle string dates
        if isinstance(scraped_at, str):
            try:
                scraped_at = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
            except:
                return 0.5
        
        # Days since posting
        now = datetime.now(timezone.utc)
        if scraped_at.tzinfo is None:
            scraped_at = scraped_at.replace(tzinfo=timezone.utc)
        
        days_old = (now - scraped_at).days
        
        # Decay function: 1.0 at day 0, 0.5 at day 7, 0.25 at day 14
        return max(0.1, 1.0 / (1 + days_old / 7))
    
    def rank_jobs_for_user(
        self,
        jobs: List[Dict],
        user_skills: List[str],
        user_bio: str = "",
        preferred_job_types: Optional[List[str]] = None,
        preferred_locations: Optional[List[str]] = None,
        top_n: Optional[int] = None,
        user_taste_vector=None,
        skip_penalties: Optional[dict] = None,
    ) -> List[Dict]:
        """
        Rank jobs for a specific user.
        
        Args:
            jobs: List of job dicts with keys: id, title, description, job_type, location
            user_skills: List of user's skill names
            user_bio: User's bio text
            preferred_job_types: User's preferred job types
            preferred_locations: User's preferred locations
            top_n: Return only top N results
            
        Returns:
            Jobs sorted by relevance with match info
        """
        if not jobs:
            return []
        
        preferred_job_types = preferred_job_types or []
        preferred_locations = preferred_locations or []
        
        ranked_jobs = []
        
        use_taste = user_taste_vector is not None
        skip_penalties = skip_penalties or {}

        for job in jobs:
            try:
                cached_emb = job.get('cached_embedding')

                # Skill matching (uses sentence transformers)
                skill_info = self.skill_matcher.compute_skill_match(
                    user_skills=user_skills,
                    job_description=job.get('description', ''),
                    job_required_skills=job.get('required_skills', []),
                    job_embedding=cached_emb,
                )

                skill_score = skill_info.get('skill_overlap', 0)
                semantic_score = skill_info.get('semantic_similarity', 0)

                # Preference matching
                preference_score = self._compute_preference_match(
                    job, preferred_job_types, preferred_locations
                )

                # Apply skip penalties to preference score
                if skip_penalties:
                    role = job.get('role_type', 'other')
                    exp = job.get('experience_level', 'any')
                    penalty = max(
                        skip_penalties.get(f'role_type:{role}', 0),
                        skip_penalties.get(f'exp_level:{exp}', 0),
                    )
                    preference_score *= (1 - penalty)

                # Recency score
                recency_score = self._compute_recency_score(job)

                # Taste score
                if use_taste and cached_emb is not None:
                    from sklearn.metrics.pairwise import cosine_similarity
                    import numpy as np
                    taste_score = float(cosine_similarity(
                        user_taste_vector.reshape(1, -1),
                        cached_emb.reshape(1, -1),
                    )[0][0])
                else:
                    taste_score = 0.0

                # Combined weighted score
                if use_taste and cached_emb is not None:
                    final_score = (
                        self.config.taste_skill_weight * skill_score +
                        self.config.taste_semantic_weight * semantic_score +
                        self.config.taste_preference_weight * preference_score +
                        self.config.taste_recency_weight * recency_score +
                        self.config.taste_weight * taste_score
                    )
                else:
                    final_score = (
                        self.config.skill_match_weight * skill_score +
                        self.config.semantic_similarity_weight * semantic_score +
                        self.config.preference_weight * preference_score +
                        self.config.recency_weight * recency_score
                    )
                
                # Build result (drop numpy array — not JSON-serialisable)
                ranked_job = {
                    **{k: v for k, v in job.items() if k != 'cached_embedding'},
                    'match_score': round(final_score, 3),
                    'skill_score': round(skill_score, 3),
                    'semantic_score': round(semantic_score, 3),
                    'preference_score': round(preference_score, 3),
                    'recency_score': round(recency_score, 3),
                    'taste_score': round(taste_score, 3),
                    'matched_skills': skill_info.get('matched_skills', []),
                    'missing_skills': skill_info.get('missing_skills', []),
                    'match_explanation': skill_info.get('explanation', '')
                }
                ranked_jobs.append(ranked_job)
                
            except Exception as e:
                logger.warning(f"Error ranking job {job.get('id')}: {e}")
                # Include with low score
                ranked_jobs.append({
                    **job,
                    'match_score': 0.1,
                    'match_explanation': 'Unable to compute match'
                })
        
        # Sort by match score
        ranked_jobs.sort(key=lambda x: x['match_score'], reverse=True)
        
        if top_n:
            ranked_jobs = ranked_jobs[:top_n]
        
        return ranked_jobs


# Singleton instance
_ranking_service: Optional[RankingService] = None


def get_ranking_service() -> RankingService:
    """Get or create singleton ranking service."""
    global _ranking_service
    if _ranking_service is None:
        _ranking_service = RankingService()
    return _ranking_service
