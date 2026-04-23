"""
Negative feedback penalty computation from SwipeEvent skip history.
"""

import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

MIN_SWIPES = 20
PENALTY_THRESHOLD = 0.20  # 20pp above mean skip rate triggers penalty
MAX_PENALTY = 0.70        # Never zero out a category fully


def compute_skip_penalties(user_profile) -> dict:
    """
    Return penalty dict keyed by 'role_type:<val>' and 'exp_level:<val>'.
    Returns {} if user has fewer than MIN_SWIPES total swipe events.
    """
    try:
        swipes = list(user_profile.swipe_events.select_related('job').filter(job__isnull=False))
    except Exception:
        return {}

    if len(swipes) < MIN_SWIPES:
        return {}

    total = len(swipes)
    skip_count = sum(1 for s in swipes if s.action == 'skip')
    overall_skip_rate = skip_count / total if total else 0

    role_total: dict = defaultdict(int)
    role_skip: dict = defaultdict(int)
    exp_total: dict = defaultdict(int)
    exp_skip: dict = defaultdict(int)

    for s in swipes:
        rt = s.job.role_type or 'other'
        el = s.job.experience_level or 'any'
        role_total[rt] += 1
        exp_total[el] += 1
        if s.action == 'skip':
            role_skip[rt] += 1
            exp_skip[el] += 1

    penalties = {}

    for rt, count in role_total.items():
        skip_rate = role_skip[rt] / count
        if skip_rate > overall_skip_rate + PENALTY_THRESHOLD:
            penalty = min(MAX_PENALTY, skip_rate - overall_skip_rate)
            penalties[f'role_type:{rt}'] = round(penalty, 3)

    for el, count in exp_total.items():
        skip_rate = exp_skip[el] / count
        if skip_rate > overall_skip_rate + PENALTY_THRESHOLD:
            penalty = min(MAX_PENALTY, skip_rate - overall_skip_rate)
            penalties[f'exp_level:{el}'] = round(penalty, 3)

    return penalties
