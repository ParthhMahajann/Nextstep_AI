"""
Skill Matcher using Sentence Transformers embeddings.

This module provides semantic matching between user skills
and job requirements using pre-trained embedding models.
"""

import pickle
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


class SkillMatcher:
    """
    Semantic skill matcher using sentence embeddings.
    
    Features:
    - Generates embeddings for skills and job descriptions
    - Computes semantic similarity beyond keyword matching
    - Caches embeddings for performance
    """
    
    # Default model - small and efficient
    DEFAULT_MODEL = 'all-MiniLM-L6-v2'
    
    def __init__(
        self, 
        model_name: Optional[str] = None,
        cache_dir: Optional[Path] = None
    ):
        """
        Initialize the skill matcher.
        
        Args:
            model_name: HuggingFace model name for embeddings
            cache_dir: Directory to cache embeddings
        """
        self.model_name = model_name or self.DEFAULT_MODEL
        self.cache_dir = cache_dir or Path(__file__).parent / 'cache' / 'embeddings'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self._model = None  # Lazy load
        self._skill_embeddings_cache: Dict[str, np.ndarray] = {}
    
    @property
    def model(self):
        """Lazy load the sentence transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
                logger.info("Model loaded successfully")
            except ImportError:
                logger.error("sentence-transformers not installed. Run: pip install sentence-transformers")
                raise
        return self._model
    
    def encode(self, texts: List[str]) -> np.ndarray:
        """
        Encode texts to embeddings.
        
        Args:
            texts: List of texts to encode
            
        Returns:
            Array of embeddings (n_texts x embedding_dim)
        """
        return self.model.encode(texts, convert_to_numpy=True)
    
    def encode_skill(self, skill_name: str) -> np.ndarray:
        """
        Encode a skill name to embedding with caching.
        
        Args:
            skill_name: Name of the skill
            
        Returns:
            Embedding vector
        """
        skill_key = skill_name.lower().strip()
        
        if skill_key not in self._skill_embeddings_cache:
            # Encode with context for better semantic understanding
            skill_text = f"professional skill: {skill_name}"
            embedding = self.encode([skill_text])[0]
            self._skill_embeddings_cache[skill_key] = embedding
        
        return self._skill_embeddings_cache[skill_key]
    
    def encode_user_profile(self, skills: List[str], bio: str = "") -> np.ndarray:
        """
        Create a combined embedding for a user profile.
        
        Args:
            skills: List of user's skill names
            bio: Optional bio/summary text
            
        Returns:
            Combined embedding vector
        """
        # Create profile text
        skills_text = ", ".join(skills) if skills else ""
        
        if bio and skills_text:
            profile_text = f"Professional with skills in {skills_text}. {bio}"
        elif skills_text:
            profile_text = f"Professional with skills in {skills_text}"
        elif bio:
            profile_text = bio
        else:
            profile_text = "Professional seeking opportunities"
        
        return self.encode([profile_text])[0]
    
    def compute_skill_match(
        self, 
        user_skills: List[str], 
        job_description: str,
        job_required_skills: Optional[List[str]] = None
    ) -> Dict:
        """
        Compute skill match between user and job.
        
        Args:
            user_skills: List of user's skills
            job_description: Full job description text
            job_required_skills: Optional explicit required skills
            
        Returns:
            Dict with match_score, matched_skills, and explanation
        """
        if not user_skills:
            return {
                'match_score': 0.0,
                'matched_skills': [],
                'missing_skills': job_required_skills or [],
                'explanation': "No skills provided in profile"
            }
        
        # Get embeddings
        user_profile_emb = self.encode_user_profile(user_skills)
        job_emb = self.encode([job_description])[0]
        
        # Compute overall semantic similarity
        from sklearn.metrics.pairwise import cosine_similarity
        overall_similarity = cosine_similarity(
            user_profile_emb.reshape(1, -1), 
            job_emb.reshape(1, -1)
        )[0][0]
        
        # Track matched and missing skills
        matched_skills = []
        missing_skills = []
        
        if job_required_skills:
            # Compare explicit skills
            for req_skill in job_required_skills:
                req_skill_lower = req_skill.lower()
                found = False
                
                for user_skill in user_skills:
                    user_skill_lower = user_skill.lower()
                    
                    # Direct match
                    if req_skill_lower in user_skill_lower or user_skill_lower in req_skill_lower:
                        matched_skills.append(user_skill)
                        found = True
                        break
                    
                    # Semantic similarity
                    req_emb = self.encode_skill(req_skill)
                    user_emb = self.encode_skill(user_skill)
                    sim = cosine_similarity(
                        req_emb.reshape(1, -1), 
                        user_emb.reshape(1, -1)
                    )[0][0]
                    
                    if sim > 0.7:  # High similarity threshold
                        matched_skills.append(user_skill)
                        found = True
                        break
                
                if not found:
                    missing_skills.append(req_skill)
            
            # Calculate skill overlap score
            if job_required_skills:
                skill_overlap_score = len(matched_skills) / len(job_required_skills)
            else:
                skill_overlap_score = overall_similarity
        else:
            # No explicit skills - rely on semantic matching
            skill_overlap_score = overall_similarity
            matched_skills = user_skills[:3]  # Show top skills
        
        # Combined score (weighted)
        final_score = (
            0.5 * skill_overlap_score +
            0.5 * overall_similarity
        )
        
        # Generate explanation
        explanation = self._generate_explanation(
            final_score, matched_skills, missing_skills, overall_similarity
        )
        
        return {
            'match_score': round(float(final_score), 3),
            'semantic_similarity': round(float(overall_similarity), 3),
            'skill_overlap': round(float(skill_overlap_score), 3),
            'matched_skills': list(set(matched_skills)),
            'missing_skills': missing_skills,
            'explanation': explanation
        }
    
    def _generate_explanation(
        self, 
        score: float, 
        matched: List[str], 
        missing: List[str],
        semantic_sim: float
    ) -> str:
        """Generate human-readable match explanation."""
        
        if score >= 0.8:
            strength = "Excellent"
        elif score >= 0.6:
            strength = "Good"
        elif score >= 0.4:
            strength = "Moderate"
        else:
            strength = "Low"
        
        parts = [f"{strength} match ({score:.0%})."]
        
        if matched:
            skills_str = ", ".join(matched[:3])
            if len(matched) > 3:
                skills_str += f" +{len(matched)-3} more"
            parts.append(f"Matching skills: {skills_str}.")
        
        if missing and len(missing) <= 3:
            parts.append(f"Consider learning: {', '.join(missing)}.")
        elif missing:
            parts.append(f"Some required skills not in profile ({len(missing)} skills).")
        
        return " ".join(parts)
    
    def rank_jobs(
        self,
        user_skills: List[str],
        user_bio: str,
        jobs: List[Dict]
    ) -> List[Dict]:
        """
        Rank jobs by relevance to user profile.
        
        Args:
            user_skills: List of user's skill names
            user_bio: User's bio/summary
            jobs: List of job dicts with 'id', 'description', 'required_skills'
            
        Returns:
            Jobs sorted by match score with added match info
        """
        ranked_jobs = []
        
        for job in jobs:
            match_info = self.compute_skill_match(
                user_skills=user_skills,
                job_description=job.get('description', ''),
                job_required_skills=job.get('required_skills', [])
            )
            
            ranked_job = {**job, **match_info}
            ranked_jobs.append(ranked_job)
        
        # Sort by match score
        ranked_jobs.sort(key=lambda x: x['match_score'], reverse=True)
        
        return ranked_jobs


# Singleton instance for convenience
_matcher_instance: Optional[SkillMatcher] = None


def get_skill_matcher() -> SkillMatcher:
    """Get or create singleton skill matcher instance."""
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = SkillMatcher()
    return _matcher_instance
