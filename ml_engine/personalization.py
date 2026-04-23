"""
User taste vector computation for personalized job ranking.
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)

MIN_JOBS_FOR_TASTE = 2


def compute_user_taste_vector(user_profile) -> np.ndarray:
    """
    Return mean embedding of jobs the user has saved/applied to.
    Returns None if fewer than MIN_JOBS_FOR_TASTE jobs have embeddings.
    """
    from embedding_store import deserialize_embedding, build_job_text

    saved_jobs = user_profile.saved_jobs.filter(
        status__in=['saved', 'preparing', 'applied', 'interviewing', 'accepted'],
        job__isnull=False,
    ).select_related('job')

    embeddings = []
    jobs_needing_embed = []

    for sj in saved_jobs:
        job = sj.job
        if job.embedding:
            emb = deserialize_embedding(job.embedding)
            if emb is not None:
                embeddings.append(emb)
            else:
                jobs_needing_embed.append(job)
        else:
            jobs_needing_embed.append(job)

    # Compute missing embeddings on-the-fly and cache them
    if jobs_needing_embed:
        try:
            from skill_matcher import get_skill_matcher
            from embedding_store import serialize_embedding
            matcher = get_skill_matcher()
            texts = [build_job_text(j) for j in jobs_needing_embed]
            vecs = matcher.encode(texts)
            for job, vec in zip(jobs_needing_embed, vecs):
                try:
                    from django.apps import apps
                    Job = apps.get_model('core', 'Job')
                    Job.objects.filter(pk=job.pk).update(embedding=serialize_embedding(vec))
                except Exception:
                    pass
                embeddings.append(vec)
        except Exception as e:
            logger.warning(f"Could not compute on-the-fly embeddings: {e}")

    if len(embeddings) < MIN_JOBS_FOR_TASTE:
        return None

    return np.mean(embeddings, axis=0).astype(np.float32)


def store_user_taste_vector(user_profile) -> bool:
    """Compute and persist taste vector to UserProfile.liked_embedding."""
    try:
        from embedding_store import serialize_embedding
        vec = compute_user_taste_vector(user_profile)
        if vec is None:
            return False
        from django.apps import apps
        UserProfile = apps.get_model('core', 'UserProfile')
        UserProfile.objects.filter(pk=user_profile.pk).update(liked_embedding=serialize_embedding(vec))
        return True
    except Exception as e:
        logger.warning(f"store_user_taste_vector failed: {e}")
        return False
