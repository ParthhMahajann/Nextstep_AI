"""
TF-IDF Vectorizer for job description processing.

This module provides text vectorization for job descriptions
and user profiles to enable similarity-based matching.
"""

import pickle
import logging
from pathlib import Path
from typing import List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


class JobVectorizer:
    """
    TF-IDF vectorizer for job descriptions.
    
    Features:
    - Vectorizes job descriptions for similarity matching
    - Caches fitted vectorizer for performance
    - Handles preprocessing (lowercasing, stop words, etc.)
    """
    
    # Default configuration
    DEFAULT_CONFIG = {
        'max_features': 5000,
        'ngram_range': (1, 2),  # Unigrams and bigrams
        'min_df': 2,            # Minimum document frequency
        'max_df': 0.95,         # Maximum document frequency
        'stop_words': 'english',
    }
    
    def __init__(self, cache_path: Optional[Path] = None):
        """
        Initialize the vectorizer.
        
        Args:
            cache_path: Path to cache fitted vectorizer
        """
        from sklearn.feature_extraction.text import TfidfVectorizer
        
        self.vectorizer = TfidfVectorizer(**self.DEFAULT_CONFIG)
        self.cache_path = cache_path or Path(__file__).parent / 'cache' / 'vectorizer.pkl'
        self.is_fitted = False
        
        # Try to load cached vectorizer
        self._load_cache()
    
    def _load_cache(self) -> bool:
        """Load fitted vectorizer from cache if available."""
        if self.cache_path.exists():
            try:
                with open(self.cache_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                self.is_fitted = True
                logger.info(f"Loaded cached vectorizer from {self.cache_path}")
                return True
            except Exception as e:
                logger.warning(f"Failed to load cached vectorizer: {e}")
        return False
    
    def _save_cache(self):
        """Save fitted vectorizer to cache."""
        try:
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, 'wb') as f:
                pickle.dump(self.vectorizer, f)
            logger.info(f"Saved vectorizer to {self.cache_path}")
        except Exception as e:
            logger.warning(f"Failed to save vectorizer cache: {e}")
    
    def preprocess(self, text: str) -> str:
        """
        Preprocess text for vectorization.
        
        Args:
            text: Raw text to preprocess
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        import re
        text = re.sub(r'http\S+|www\.\S+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def fit(self, documents: List[str]) -> 'JobVectorizer':
        """
        Fit the vectorizer on a corpus of documents.
        
        Args:
            documents: List of job descriptions
            
        Returns:
            Self for chaining
        """
        processed_docs = [self.preprocess(doc) for doc in documents]
        self.vectorizer.fit(processed_docs)
        self.is_fitted = True
        self._save_cache()
        logger.info(f"Fitted vectorizer on {len(documents)} documents")
        return self
    
    def transform(self, documents: List[str]) -> np.ndarray:
        """
        Transform documents to TF-IDF vectors.
        
        Args:
            documents: List of texts to transform
            
        Returns:
            Sparse matrix of TF-IDF features
        """
        if not self.is_fitted:
            raise RuntimeError("Vectorizer not fitted. Call fit() first.")
        
        processed_docs = [self.preprocess(doc) for doc in documents]
        return self.vectorizer.transform(processed_docs)
    
    def fit_transform(self, documents: List[str]) -> np.ndarray:
        """Fit and transform in one step."""
        self.fit(documents)
        return self.transform(documents)
    
    def get_feature_names(self) -> List[str]:
        """Get the vocabulary terms."""
        if not self.is_fitted:
            return []
        return self.vectorizer.get_feature_names_out().tolist()
    
    def compute_similarity(
        self, 
        query: str, 
        documents: List[str]
    ) -> List[Tuple[int, float]]:
        """
        Compute cosine similarity between query and documents.
        
        Args:
            query: Query text (e.g., user profile/skills)
            documents: List of documents to compare against
            
        Returns:
            List of (index, similarity_score) tuples, sorted by score descending
        """
        from sklearn.metrics.pairwise import cosine_similarity
        
        if not self.is_fitted:
            # Auto-fit on the documents if not fitted
            self.fit(documents)
        
        query_vec = self.transform([query])
        doc_vecs = self.transform(documents)
        
        similarities = cosine_similarity(query_vec, doc_vecs).flatten()
        
        # Create sorted list of (index, score) tuples
        results = [(i, float(score)) for i, score in enumerate(similarities)]
        results.sort(key=lambda x: x[1], reverse=True)
        
        return results


def fit_vectorizer_on_jobs():
    """
    Utility function to fit vectorizer on all jobs in database.
    Run this after adding new jobs to update the vectorizer.
    """
    import os
    import sys
    import django
    
    # Setup Django
    BASE_DIR = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(BASE_DIR / "nextstep"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nextstep.settings")
    django.setup()
    
    from core.models import Job
    
    # Get all job descriptions
    jobs = Job.objects.filter(is_active=True).values_list('description', flat=True)
    descriptions = list(jobs)
    
    if not descriptions:
        logger.warning("No jobs found to fit vectorizer")
        return
    
    # Fit vectorizer
    vectorizer = JobVectorizer()
    vectorizer.fit(descriptions)
    logger.info(f"Fitted vectorizer on {len(descriptions)} jobs")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    fit_vectorizer_on_jobs()
