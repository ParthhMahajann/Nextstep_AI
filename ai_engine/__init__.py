"""
AI Engine for NextStep AI.

Provides AI-powered features:
- Email generation
- Resume analysis
- Cover letter generation
- Application tips
"""

from .groq_service import (
    GroqAIService,
    get_ai_service,
    EmailDraft,
    ResumeAnalysis,
)

__all__ = [
    'GroqAIService',
    'get_ai_service',
    'EmailDraft',
    'ResumeAnalysis',
]
