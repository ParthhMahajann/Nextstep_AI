"""
Utilities for serializing/deserializing numpy embeddings to/from BinaryField.
"""

import numpy as np


def serialize_embedding(arr: np.ndarray) -> bytes:
    return arr.astype(np.float32).tobytes()


def deserialize_embedding(data) -> np.ndarray:
    if data is None:
        return None
    raw = bytes(data) if isinstance(data, memoryview) else data
    return np.frombuffer(raw, dtype=np.float32)


def build_job_text(job) -> str:
    """Build text representation of a job for embedding. Accepts ORM instance or dict."""
    if isinstance(job, dict):
        title = job.get('title', '')
        company = job.get('company', '')
        description = job.get('description', '')
    else:
        title = getattr(job, 'title', '')
        company = getattr(job, 'company', '')
        description = getattr(job, 'description', '')
    return f"{title} {company} {description[:500]}"
