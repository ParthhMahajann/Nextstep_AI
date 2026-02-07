"""
AI Service for NextStep AI using Groq.

Provides:
- Email draft generation
- Resume analysis
- Cover letter generation
- Application tips
"""

import os
import logging
from typing import Optional, Dict, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class EmailDraft:
    """Generated email draft."""
    subject: str
    body: str
    tone: str
    word_count: int


@dataclass
class ResumeAnalysis:
    """Resume analysis result."""
    strengths: List[str]
    improvements: List[str]
    keywords_found: List[str]
    keywords_missing: List[str]
    match_score: float
    suggestions: str


class GroqAIService:
    """AI service using Groq's free API."""
    
    # Available models on Groq (free tier)
    MODELS = {
        'fast': 'llama-3.1-8b-instant',      # Very fast, good for drafts
        'smart': 'llama-3.3-70b-versatile',  # Smarter, better quality
        'small': 'gemma2-9b-it',             # Good balance
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('GROQ_API_KEY')
        self._client = None
        self.default_model = self.MODELS['fast']
    
    @property
    def client(self):
        """Lazy load Groq client."""
        if self._client is None:
            if not self.api_key:
                raise ValueError("GROQ_API_KEY not set. Get free key at https://console.groq.com")
            
            from groq import Groq
            self._client = Groq(api_key=self.api_key)
        return self._client
    
    def _chat(self, messages: List[Dict], model: str = None, max_tokens: int = 1024) -> str:
        """Send chat request to Groq."""
        try:
            response = self.client.chat.completions.create(
                model=model or self.default_model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise
    
    def generate_cold_email(
        self,
        job_title: str,
        company: str,
        job_description: str,
        user_name: str,
        user_skills: List[str],
        user_experience: str = "",
        tone: str = "professional"
    ) -> EmailDraft:
        """
        Generate a cold outreach email for a job application.
        
        Args:
            job_title: Position being applied for
            company: Company name
            job_description: Job description text
            user_name: Applicant's name
            user_skills: List of user's skills
            user_experience: Brief experience summary
            tone: Email tone (professional, casual, enthusiastic)
            
        Returns:
            EmailDraft with subject and body
        """
        skills_str = ", ".join(user_skills[:10])
        
        prompt = f"""Write a compelling cold outreach email for a job application.

JOB DETAILS:
- Position: {job_title}
- Company: {company}
- Description: {job_description[:500]}

APPLICANT:
- Name: {user_name}
- Key Skills: {skills_str}
- Experience: {user_experience[:200] if user_experience else 'Entry-level/Student'}

REQUIREMENTS:
- Tone: {tone}
- Length: 150-200 words
- Include a clear subject line
- Highlight 2-3 relevant skills
- Show genuine interest in the company
- End with a clear call-to-action

FORMAT:
Subject: [your subject line]

[email body]"""

        messages = [
            {"role": "system", "content": "You are an expert career coach who writes compelling job application emails. Be concise, genuine, and highlight value."},
            {"role": "user", "content": prompt}
        ]
        
        response = self._chat(messages)
        
        # Parse subject and body
        lines = response.strip().split('\n')
        subject = ""
        body_lines = []
        in_body = False
        
        for line in lines:
            if line.lower().startswith('subject:'):
                subject = line.replace('Subject:', '').replace('subject:', '').strip()
            elif subject and (line.strip() or in_body):
                in_body = True
                body_lines.append(line)
        
        body = '\n'.join(body_lines).strip()
        
        return EmailDraft(
            subject=subject or f"Application for {job_title} at {company}",
            body=body or response,
            tone=tone,
            word_count=len(body.split())
        )
    
    def analyze_resume(
        self,
        resume_text: str,
        job_description: str = "",
        job_title: str = ""
    ) -> ResumeAnalysis:
        """
        Analyze a resume and provide improvement suggestions.
        
        Args:
            resume_text: The resume content
            job_description: Optional job to match against
            job_title: Optional job title for context
            
        Returns:
            ResumeAnalysis with strengths, improvements, etc.
        """
        job_context = ""
        if job_description:
            job_context = f"\nTARGET JOB:\n- Title: {job_title}\n- Description: {job_description[:500]}"
        
        prompt = f"""Analyze this resume and provide actionable feedback.

RESUME:
{resume_text[:3000]}
{job_context}

Provide analysis in this EXACT format:

STRENGTHS:
- [strength 1]
- [strength 2]
- [strength 3]

IMPROVEMENTS:
- [improvement 1]
- [improvement 2]
- [improvement 3]

KEYWORDS_FOUND:
- [keyword 1]
- [keyword 2]

KEYWORDS_MISSING:
- [missing keyword 1]
- [missing keyword 2]

MATCH_SCORE: [0-100]

SUGGESTIONS:
[2-3 sentences of specific advice]"""

        messages = [
            {"role": "system", "content": "You are an expert resume reviewer and career coach. Provide specific, actionable feedback."},
            {"role": "user", "content": prompt}
        ]
        
        response = self._chat(messages, max_tokens=1500)
        
        # Parse response
        strengths = []
        improvements = []
        keywords_found = []
        keywords_missing = []
        match_score = 0.5
        suggestions = ""
        
        current_section = None
        
        for line in response.split('\n'):
            line = line.strip()
            if 'STRENGTHS:' in line.upper():
                current_section = 'strengths'
            elif 'IMPROVEMENTS:' in line.upper():
                current_section = 'improvements'
            elif 'KEYWORDS_FOUND:' in line.upper():
                current_section = 'keywords_found'
            elif 'KEYWORDS_MISSING:' in line.upper():
                current_section = 'keywords_missing'
            elif 'MATCH_SCORE:' in line.upper():
                try:
                    score_str = line.split(':')[-1].strip().replace('%', '')
                    match_score = float(score_str) / 100
                except:
                    pass
                current_section = None
            elif 'SUGGESTIONS:' in line.upper():
                current_section = 'suggestions'
            elif line.startswith('-') and current_section:
                item = line[1:].strip()
                if current_section == 'strengths':
                    strengths.append(item)
                elif current_section == 'improvements':
                    improvements.append(item)
                elif current_section == 'keywords_found':
                    keywords_found.append(item)
                elif current_section == 'keywords_missing':
                    keywords_missing.append(item)
            elif current_section == 'suggestions' and line:
                suggestions += line + " "
        
        return ResumeAnalysis(
            strengths=strengths[:5],
            improvements=improvements[:5],
            keywords_found=keywords_found[:10],
            keywords_missing=keywords_missing[:10],
            match_score=min(1.0, max(0.0, match_score)),
            suggestions=suggestions.strip()
        )
    
    def generate_cover_letter(
        self,
        job_title: str,
        company: str,
        job_description: str,
        user_name: str,
        user_skills: List[str],
        user_experience: str = ""
    ) -> str:
        """Generate a cover letter for a job application."""
        
        skills_str = ", ".join(user_skills[:10])
        
        prompt = f"""Write a professional cover letter for this job application.

JOB:
- Position: {job_title}
- Company: {company}
- Description: {job_description[:600]}

APPLICANT:
- Name: {user_name}
- Skills: {skills_str}
- Experience: {user_experience[:300] if user_experience else 'Recent graduate/Entry-level'}

REQUIREMENTS:
- 3-4 paragraphs
- Professional but personable
- Highlight relevant skills
- Show knowledge of the company
- Strong opening and closing"""

        messages = [
            {"role": "system", "content": "You are an expert career coach. Write compelling, professional cover letters."},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, max_tokens=1500)
    
    def get_application_tips(
        self,
        job_title: str,
        company: str,
        job_description: str
    ) -> str:
        """Get tips for applying to a specific job."""
        
        prompt = f"""Provide 5 specific tips for applying to this job.

JOB:
- Position: {job_title}
- Company: {company}
- Description: {job_description[:500]}

For each tip:
1. Be specific to this role
2. Include actionable advice
3. Keep each tip to 1-2 sentences"""

        messages = [
            {"role": "system", "content": "You are a career coach. Provide practical, specific advice."},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, max_tokens=800)


# Singleton instance
_ai_service: Optional[GroqAIService] = None


def get_ai_service() -> GroqAIService:
    """Get or create singleton AI service."""
    global _ai_service
    if _ai_service is None:
        _ai_service = GroqAIService()
    return _ai_service
