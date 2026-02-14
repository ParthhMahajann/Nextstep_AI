"""
Job Intelligence Enrichment using Groq AI.

Analyzes job descriptions and extracts structured data:
- Skills required
- Experience level
- Role type
- Concise summary

Uses the 'fast' model for speed since many jobs are processed in batch.
"""

import os
import json
import logging
import time
from typing import Optional, Dict, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class JobEnrichment:
    """Structured enrichment data for a job."""
    summary: str
    skills: List[str]
    experience_level: str  # entry, mid, senior, any
    role_type: str  # frontend, backend, fullstack, data, devops, design, marketing, management, other


ENRICHMENT_PROMPT = """Analyze this job posting and extract structured information. Return ONLY valid JSON, no other text.

Job Title: {title}
Company: {company}
Description:
{description}

Return this exact JSON structure:
{{
    "summary": "2-3 sentence summary of the role and what it involves",
    "skills": ["skill1", "skill2", "skill3"],
    "experience_level": "entry|mid|senior|any",
    "role_type": "frontend|backend|fullstack|data|devops|design|marketing|management|other"
}}

Rules:
- summary: Be concise, focus on what the role does and key requirements
- skills: Extract 3-8 specific technical/professional skills mentioned (e.g. "Python", "React", "AWS", "Project Management")
- experience_level: "entry" for 0-2 years/junior/intern, "mid" for 3-5 years, "senior" for 5+ years/lead/principal, "any" if not specified
- role_type: Pick the closest match from the options given
- Return ONLY the JSON object, no markdown, no explanation"""


VALID_EXPERIENCE_LEVELS = {'entry', 'mid', 'senior', 'any'}
VALID_ROLE_TYPES = {'frontend', 'backend', 'fullstack', 'data', 'devops', 'design', 'marketing', 'management', 'other'}


def _parse_enrichment_response(response_text: str) -> Optional[Dict]:
    """Parse AI response into structured data, handling common issues."""
    text = response_text.strip()
    
    # Remove markdown code fences if present
    if text.startswith('```'):
        lines = text.split('\n')
        # Remove first and last lines (``` markers)
        lines = [l for l in lines if not l.strip().startswith('```')]
        text = '\n'.join(lines)
    
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                data = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                logger.error(f"Could not parse AI response as JSON: {text[:200]}")
                return None
        else:
            logger.error(f"No JSON found in AI response: {text[:200]}")
            return None
    
    # Validate and sanitize
    summary = str(data.get('summary', '')).strip()
    if not summary:
        return None
    
    skills = data.get('skills', [])
    if isinstance(skills, list):
        skills = [str(s).strip() for s in skills if s][:10]  # Cap at 10
    else:
        skills = []
    
    exp_level = str(data.get('experience_level', 'any')).lower().strip()
    if exp_level not in VALID_EXPERIENCE_LEVELS:
        exp_level = 'any'
    
    role_type = str(data.get('role_type', 'other')).lower().strip()
    if role_type not in VALID_ROLE_TYPES:
        role_type = 'other'
    
    return {
        'summary': summary,
        'skills': skills,
        'experience_level': exp_level,
        'role_type': role_type,
    }


def enrich_job(title: str, company: str, description: str, api_key: str = None) -> Optional[JobEnrichment]:
    """
    Enrich a single job using AI.
    
    Args:
        title: Job title
        company: Company name
        description: Job description text
        api_key: Optional Groq API key (falls back to env var)
    
    Returns:
        JobEnrichment dataclass or None if enrichment failed
    """
    try:
        from groq import Groq
    except ImportError:
        logger.error("groq package not installed. Run: pip install groq")
        return None
    
    key = api_key or os.environ.get('GROQ_API_KEY')
    if not key:
        logger.error("No GROQ_API_KEY found")
        return None
    
    # Truncate very long descriptions to avoid token limits
    desc_truncated = description[:3000] if len(description) > 3000 else description
    
    prompt = ENRICHMENT_PROMPT.format(
        title=title,
        company=company,
        description=desc_truncated
    )
    
    try:
        client = Groq(api_key=key)
        response = client.chat.completions.create(
            model='llama-3.1-8b-instant',  # Fast model for batch processing
            messages=[
                {"role": "system", "content": "You are a job posting analyzer. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for consistent output
            max_tokens=500,
        )
        
        result_text = response.choices[0].message.content
        parsed = _parse_enrichment_response(result_text)
        
        if parsed:
            return JobEnrichment(**parsed)
        
        return None
        
    except Exception as e:
        logger.error(f"Groq API error during enrichment: {e}")
        return None
