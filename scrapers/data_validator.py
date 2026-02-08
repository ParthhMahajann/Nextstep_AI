"""
Data validation for NextStep AI scrapers.

Provides validation rules for scraped opportunity data
to ensure data quality before database storage.
"""

import re
import logging
from typing import List, Optional, Tuple
from dataclasses import dataclass
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


# Valid job types
VALID_JOB_TYPES = {'job', 'internship', 'freelance', 'part-time', 'contract'}

# Minimum content lengths
MIN_TITLE_LENGTH = 3
MIN_COMPANY_LENGTH = 2
MIN_DESCRIPTION_LENGTH = 20
MAX_TITLE_LENGTH = 255
MAX_COMPANY_LENGTH = 255
MAX_LOCATION_LENGTH = 255

# Spam/junk patterns to reject
SPAM_PATTERNS = [
    r'(?i)\b(crypto|forex|mlm|pyramid)\b.*\b(earn|income|money)\b',
    r'(?i)make \$?\d+.*per (day|hour|week)',
    r'(?i)(urgent|limited time).*apply now',
    r'(?i)work from home.*\$\d+k',
]

# URL validation patterns
INVALID_URL_PATTERNS = [
    r'^javascript:',
    r'^#',
    r'^mailto:',
    r'^tel:',
]


@dataclass
class ValidationResult:
    """Result of validation check."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    sanitized_data: Optional[dict] = None


class DataValidator:
    """
    Validates and sanitizes scraped opportunity data.
    
    Features:
    - Required field validation
    - Content length checks
    - URL validation
    - Job type validation
    - Spam detection
    - Data sanitization
    """
    
    def __init__(self, strict: bool = False):
        """
        Initialize validator.
        
        Args:
            strict: If True, treat warnings as errors
        """
        self.strict = strict
        self._spam_patterns = [re.compile(p) for p in SPAM_PATTERNS]
        self._invalid_url_patterns = [re.compile(p) for p in INVALID_URL_PATTERNS]
    
    def validate(self, data: dict) -> ValidationResult:
        """
        Validate opportunity data.
        
        Args:
            data: Dict with keys: title, company, description, job_type, apply_link, location
        
        Returns:
            ValidationResult with is_valid, errors, warnings, and sanitized_data
        """
        errors = []
        warnings = []
        sanitized = {}
        
        # Validate and sanitize title
        title = self._sanitize_text(data.get('title', ''))
        if not title:
            errors.append("Missing required field: title")
        elif len(title) < MIN_TITLE_LENGTH:
            errors.append(f"Title too short (min {MIN_TITLE_LENGTH} chars)")
        elif len(title) > MAX_TITLE_LENGTH:
            warnings.append(f"Title truncated to {MAX_TITLE_LENGTH} chars")
            title = title[:MAX_TITLE_LENGTH]
        sanitized['title'] = title
        
        # Validate and sanitize company
        company = self._sanitize_text(data.get('company', ''))
        if not company:
            errors.append("Missing required field: company")
        elif len(company) < MIN_COMPANY_LENGTH:
            errors.append(f"Company name too short (min {MIN_COMPANY_LENGTH} chars)")
        elif len(company) > MAX_COMPANY_LENGTH:
            warnings.append(f"Company truncated to {MAX_COMPANY_LENGTH} chars")
            company = company[:MAX_COMPANY_LENGTH]
        sanitized['company'] = company
        
        # Validate and sanitize description
        description = self._sanitize_text(data.get('description', ''))
        if not description:
            errors.append("Missing required field: description")
        elif len(description) < MIN_DESCRIPTION_LENGTH:
            warnings.append(f"Description very short ({len(description)} chars)")
        sanitized['description'] = description
        
        # Validate job type
        job_type = data.get('job_type', '').lower().strip()
        if not job_type:
            warnings.append("Missing job_type, defaulting to 'job'")
            job_type = 'job'
        elif job_type not in VALID_JOB_TYPES:
            warnings.append(f"Invalid job_type '{job_type}', defaulting to 'job'")
            job_type = 'job'
        sanitized['job_type'] = job_type
        
        # Validate apply link (URL)
        apply_link = data.get('apply_link', '').strip()
        url_valid, url_error = self._validate_url(apply_link)
        if not url_valid:
            errors.append(url_error)
        sanitized['apply_link'] = apply_link
        
        # Validate and sanitize location
        location = self._sanitize_text(data.get('location', 'Remote'))
        if not location:
            location = 'Remote'
        elif len(location) > MAX_LOCATION_LENGTH:
            warnings.append(f"Location truncated to {MAX_LOCATION_LENGTH} chars")
            location = location[:MAX_LOCATION_LENGTH]
        sanitized['location'] = location
        
        # Check for spam
        if self._is_spam(title, description):
            errors.append("Content detected as spam")
        
        # Determine validity
        is_valid = len(errors) == 0
        if self.strict and warnings:
            is_valid = False
        
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            sanitized_data=sanitized if is_valid else None
        )
    
    def _sanitize_text(self, text: str) -> str:
        """Clean and normalize text content."""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove null bytes and control characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
        
        # Decode HTML entities
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#x27;', "'")
        text = text.replace('&#x2F;', '/')
        
        return text.strip()
    
    def _validate_url(self, url: str) -> Tuple[bool, str]:
        """Validate URL format and scheme."""
        if not url:
            return False, "Missing required field: apply_link"
        
        # Check for invalid URL patterns
        for pattern in self._invalid_url_patterns:
            if pattern.match(url):
                return False, f"Invalid URL scheme: {url[:30]}..."
        
        # Parse and validate URL
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ('http', 'https'):
                return False, f"Invalid URL scheme: {parsed.scheme}"
            if not parsed.netloc:
                return False, "URL missing domain"
        except Exception:
            return False, f"Invalid URL format: {url[:50]}..."
        
        return True, ""
    
    def _is_spam(self, title: str, description: str) -> bool:
        """Check if content matches spam patterns."""
        combined = f"{title} {description}"
        
        for pattern in self._spam_patterns:
            if pattern.search(combined):
                return True
        
        return False


def validate_opportunity(data: dict, strict: bool = False) -> ValidationResult:
    """
    Convenience function to validate opportunity data.
    
    Args:
        data: Opportunity data dict
        strict: If True, treat warnings as errors
    
    Returns:
        ValidationResult
    """
    validator = DataValidator(strict=strict)
    return validator.validate(data)


if __name__ == "__main__":
    # Test validation
    test_data = {
        'title': 'Senior Python Developer',
        'company': 'TechCorp',
        'description': 'We are looking for an experienced Python developer to join our team.',
        'job_type': 'job',
        'apply_link': 'https://example.com/apply',
        'location': 'Remote',
    }
    
    result = validate_opportunity(test_data)
    print(f"Valid: {result.is_valid}")
    print(f"Errors: {result.errors}")
    print(f"Warnings: {result.warnings}")
    print(f"Sanitized: {result.sanitized_data}")
