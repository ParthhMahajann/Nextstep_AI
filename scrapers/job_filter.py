"""
Centralised filter for scraped jobs.

Two rules applied to every opportunity before it reaches the DB:
  1. Must be written in English (title + description).
  2. Must be remote-friendly OR based in India.

Design notes:
  - No third-party NLP / ML libraries required — uses Unicode block ranges
    for language detection and a keyword list for location matching.
  - Called from BaseScraper._validate_opportunity() so every scraper
    automatically inherits the filter.
"""

import logging
import re

logger = logging.getLogger(__name__)

# ─── India location keywords ──────────────────────────────────────────────────
# Major cities, common abbreviations, and India-level keywords.
INDIA_LOCATION_KEYWORDS = {
    'india', 'indian', 'bangalore', 'bengaluru', 'mumbai', 'bombay',
    'delhi', 'new delhi', 'ncr', 'noida', 'gurgaon', 'gurugram',
    'hyderabad', 'pune', 'chennai', 'madras', 'kolkata', 'calcutta',
    'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kochi', 'cochin',
    'chandigarh', 'indore', 'bhopal', 'nagpur', 'visakhapatnam',
    'coimbatore', 'mysore', 'mysuru', 'thiruvananthapuram',
    'in', 'ind',  # short country codes sometimes appear in location strings
}

# ─── Remote / worldwide keywords ─────────────────────────────────────────────
REMOTE_KEYWORDS = {
    'remote', 'wfh', 'work from home', 'work-from-home',
    'anywhere', 'worldwide', 'global', 'distributed',
    'fully remote', 'remote first', 'remote-first',
    'work from anywhere', 'location independent',
}

# ─── Non-English Unicode block ranges ─────────────────────────────────────────
# Each entry is (start, end) inclusive, in codepoint integers.
NON_ENGLISH_RANGES = [
    (0x4E00, 0x9FFF),   # CJK Unified Ideographs (Chinese/Japanese/Korean)
    (0x3040, 0x309F),   # Hiragana (Japanese)
    (0x30A0, 0x30FF),   # Katakana (Japanese)
    (0xAC00, 0xD7AF),   # Hangul Syllables (Korean)
    (0x1100, 0x11FF),   # Hangul Jamo (Korean)
    (0x0600, 0x06FF),   # Arabic
    (0x0750, 0x077F),   # Arabic Supplement
    (0x08A0, 0x08FF),   # Arabic Extended-A
    (0xFB50, 0xFDFF),   # Arabic Presentation Forms-A
    (0x0400, 0x04FF),   # Cyrillic (Russian, Ukrainian, etc.)
    (0x0500, 0x052F),   # Cyrillic Supplement
    (0x0590, 0x05FF),   # Hebrew
    (0xFB00, 0xFB4F),   # Alphabetic Presentation Forms (Hebrew)
    (0x0900, 0x097F),   # Devanagari (Hindi, Sanskrit, Marathi, Nepali)
    (0x0980, 0x09FF),   # Bengali
    (0x0A00, 0x0A7F),   # Gurmukhi (Punjabi)
    (0x0A80, 0x0AFF),   # Gujarati
    (0x0B00, 0x0B7F),   # Oriya
    (0x0B80, 0x0BFF),   # Tamil
    (0x0C00, 0x0C7F),   # Telugu
    (0x0C80, 0x0CFF),   # Kannada
    (0x0D00, 0x0D7F),   # Malayalam
    (0x0E00, 0x0E7F),   # Thai
    (0x0E80, 0x0EFF),   # Lao
    (0x0F00, 0x0FFF),   # Tibetan
    (0x1000, 0x109F),   # Myanmar (Burmese)
    (0x1C90, 0x1CBF),   # Georgian Extended
    (0x10A0, 0x10FF),   # Georgian
    (0x1200, 0x137F),   # Ethiopic
    (0x1E00, 0x1EFF),   # Latin Extended Additional (heavy accents → likely non-English)
]

# Pre-compile into a sorted list of ranges for fast lookup
_RANGES = [(s, e) for s, e in NON_ENGLISH_RANGES]


def _is_non_english_char(cp: int) -> bool:
    """Return True if codepoint belongs to a non-English script."""
    for start, end in _RANGES:
        if start <= cp <= end:
            return True
    return False


def is_english(title: str, description: str) -> bool:
    """
    Return True if the job appears to be written in English.

    Strategy: sample the first 600 characters of title+description.
    If more than 8% of alphabetic characters belong to a non-English
    Unicode script, the job is considered non-English.

    The 8% threshold allows for the occasional foreign word or name
    (e.g. a company name) without falsely rejecting valid English posts.
    """
    sample = (title + " " + description)[:600]
    if not sample.strip():
        return True  # Nothing to judge — allow through

    non_english_count = 0
    alpha_count = 0

    for ch in sample:
        if ch.isalpha():
            alpha_count += 1
            if _is_non_english_char(ord(ch)):
                non_english_count += 1

    if alpha_count == 0:
        return True  # No alphabetic chars at all (e.g. pure numbers/symbols)

    ratio = non_english_count / alpha_count
    if ratio >= 0.08:
        logger.debug(
            f"Language filter: rejected '{title[:60]}' "
            f"(non-English char ratio={ratio:.2%})"
        )
        return False
    return True


def _normalise(text: str) -> str:
    """Lowercase and collapse whitespace."""
    return re.sub(r'\s+', ' ', text.lower().strip())


def is_india_or_remote(location: str, title: str = "", description: str = "") -> bool:
    """
    Return True if the opportunity is either:
      - Remote / work-from-anywhere, OR
      - Based in India (city or country level).

    Checks the location field first (most reliable), then falls back to
    scanning the title and first 400 chars of description for keywords.
    """
    # Combine all text sources for a comprehensive check
    loc_norm  = _normalise(location)
    desc_sample = _normalise((title + " " + description[:400]))

    # 1. Check remote keywords in location field
    for kw in REMOTE_KEYWORDS:
        if kw in loc_norm:
            return True

    # 2. Check India keywords in location field
    for kw in INDIA_LOCATION_KEYWORDS:
        # Use word-boundary style check: the keyword must be surrounded by
        # non-alphanumeric chars or start/end of string (avoids "indiana" → "india")
        pattern = r'(?<![a-z])' + re.escape(kw) + r'(?![a-z])'
        if re.search(pattern, loc_norm):
            return True

    # 3. If location is blank / generic, scan description + title
    if not loc_norm or loc_norm in ('not specified', 'location not specified', 'n/a', '-'):
        for kw in REMOTE_KEYWORDS:
            if kw in desc_sample:
                return True
        for kw in INDIA_LOCATION_KEYWORDS:
            pattern = r'(?<![a-z])' + re.escape(kw) + r'(?![a-z])'
            if re.search(pattern, desc_sample):
                return True

    logger.debug(
        f"Location filter: rejected location='{location}' "
        f"title='{title[:50]}'"
    )
    return False


def passes_all_filters(
    title: str,
    description: str,
    location: str,
) -> bool:
    """
    Master filter gate.  Returns True only if BOTH conditions hold:
      1. Job is in English.
      2. Job is remote or India-based.

    This is called from BaseScraper._validate_opportunity() so it applies
    universally to all scrapers.
    """
    if not is_english(title, description):
        return False
    if not is_india_or_remote(location, title, description):
        return False
    return True
