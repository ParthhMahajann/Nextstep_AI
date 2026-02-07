"""
ML Engine package for NextStep AI.

This package provides:
- TF-IDF vectorization for job descriptions
- Semantic skill matching using embeddings
- Combined ranking service for recommendations
"""

from .vectorizer import JobVectorizer
from .skill_matcher import SkillMatcher, get_skill_matcher

__all__ = ['JobVectorizer', 'SkillMatcher', 'get_skill_matcher']
