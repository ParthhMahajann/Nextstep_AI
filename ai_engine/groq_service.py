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
    job_tailored_suggestions: List[str] = None

    def __post_init__(self):
        if self.job_tailored_suggestions is None:
            self.job_tailored_suggestions = []


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
    
    def generate_job_tailored_suggestions(
        self,
        resume_text: str,
        job_title: str,
        job_description: str
    ) -> List[str]:
        """
        Generate specific, actionable resume edits tailored to a target job.

        Returns a list of 5-7 concrete suggestions (e.g. rewrite bullets,
        restructure sections, add missing keywords in context).
        """
        prompt = f"""You are a professional resume coach. A candidate wants to tailor their resume for a specific job.

TARGET JOB:
- Title: {job_title}
- Description: {job_description[:700]}

CANDIDATE'S RESUME:
{resume_text[:2500]}

Provide 5 to 7 SPECIFIC, ACTIONABLE resume edit suggestions tailored to this exact job.
Each suggestion must:
- Reference a concrete section or bullet of the resume (e.g. "In your Experience section at Company X…")
- Explain what to change and why it matters for this role
- Be immediately actionable (no vague advice like "improve your resume")

Format your response as a numbered list ONLY, like:
1. [Your suggestion here]
2. [Your suggestion here]
...

Do NOT include any preamble, headers, or closing remarks — just the numbered list."""

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert resume coach who gives precise, job-specific resume editing advice. "
                    "Always reference actual content from the resume and connect edits to the job requirements."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        response = self._chat(messages, model=self.MODELS['smart'], max_tokens=1200)

        suggestions = []
        for line in response.strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            # Strip leading numbering like "1." or "1)" or "- "
            import re
            cleaned = re.sub(r'^[\d]+[.)\s]+', '', line).strip()
            cleaned = re.sub(r'^[-•]\s*', '', cleaned).strip()
            if cleaned:
                suggestions.append(cleaned)

        return suggestions[:7]

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
            ResumeAnalysis with strengths, improvements, keywords, score,
            general suggestions, and (when a job is provided) job-tailored suggestions.
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
                except Exception:
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

        # Generate job-tailored suggestions if a job was provided
        job_tailored = []
        if job_description and job_title:
            try:
                job_tailored = self.generate_job_tailored_suggestions(
                    resume_text=resume_text,
                    job_title=job_title,
                    job_description=job_description,
                )
            except Exception as e:
                logger.warning(f"Job-tailored suggestion generation failed: {e}")

        return ResumeAnalysis(
            strengths=strengths[:5],
            improvements=improvements[:5],
            keywords_found=keywords_found[:10],
            keywords_missing=keywords_missing[:10],
            match_score=min(1.0, max(0.0, match_score)),
            suggestions=suggestions.strip(),
            job_tailored_suggestions=job_tailored,
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

    def generate_interview_prep(
        self,
        job_title: str,
        company: str,
        job_description: str,
        user_skills: List[str],
        experience_level: str = "",
    ) -> List[Dict]:
        """
        Generate interview Q&A pairs for a specific job.

        Returns a list of dicts:
          [{"question": "...", "answer": "...", "category": "technical|behavioural|company"}]
        """
        skills_str = ", ".join(user_skills[:10]) if user_skills else "general skills"
        prompt = f"""You are an expert interview coach. Generate 8 interview questions with ideal answers
for a candidate applying to this role.

JOB:
- Title: {job_title}
- Company: {company}
- Description: {job_description[:600]}

CANDIDATE:
- Skills: {skills_str}
- Level: {experience_level or 'not specified'}

Generate exactly 8 Q&A pairs — mix of technical, behavioural, and company-specific questions.
Format your response as a numbered list ONLY, using this exact structure for each item:

Q: [question text]
A: [model answer — 2-4 sentences, first-person, concrete]
CATEGORY: [technical|behavioural|company]

---

No preamble. No closing remarks. Just the 8 Q&A blocks separated by blank lines."""

        messages = [
            {"role": "system", "content": "You are an expert interview coach who gives concise, practical Q&A pairs."},
            {"role": "user", "content": prompt},
        ]

        response = self._chat(messages, model=self.MODELS['smart'], max_tokens=2000)

        pairs = []
        current: Dict = {}
        for line in response.split('\n'):
            line = line.strip()
            if line.lower().startswith('q:'):
                if current.get('question'):
                    pairs.append(current)
                current = {'question': line[2:].strip(), 'answer': '', 'category': 'general'}
            elif line.lower().startswith('a:'):
                current['answer'] = line[2:].strip()
            elif line.lower().startswith('category:'):
                cat = line.split(':', 1)[1].strip().lower()
                current['category'] = cat if cat in ('technical', 'behavioural', 'company') else 'general'
        if current.get('question'):
            pairs.append(current)

        return pairs[:8]

    def tailor_resume(
        self,
        resume_text: str,
        job_title: str,
        company: str,
        job_description: str,
    ) -> Dict:
        """
        Rewrite resume content to be better aligned with a specific job.

        Returns:
          {
            "tailored_resume": str,   # Full rewritten resume
            "changes": List[str],     # Bullet list of changes made
            "ats_score_before": int,  # Estimated ATS score before (0-100)
            "ats_score_after":  int,  # Estimated ATS score after  (0-100)
          }
        """
        prompt = f"""You are a professional resume writer and ATS optimisation expert.

TARGET JOB:
- Title: {job_title}
- Company: {company}
- Description: {job_description[:700]}

ORIGINAL RESUME:
{resume_text[:3000]}

TASK:
1. Rewrite the resume to maximise match with the target job.
   - Incorporate relevant keywords from the job description naturally.
   - Strengthen bullet points with measurable impact where possible.
   - Reorder sections/bullets so the most relevant experience appears first.
   - Keep the same basic structure and factual content — do NOT invent experience.

2. List the key changes you made (5-8 bullet points).

3. Estimate ATS match score before and after the rewrite (0-100).

RESPONSE FORMAT (follow exactly):

TAILORED_RESUME:
[full rewritten resume text]

CHANGES:
- [change 1]
- [change 2]
...

ATS_BEFORE: [number]
ATS_AFTER: [number]"""

        messages = [
            {"role": "system", "content": "You are an expert resume writer who optimises resumes for ATS and hiring managers."},
            {"role": "user", "content": prompt},
        ]

        response = self._chat(messages, model=self.MODELS['smart'], max_tokens=3000)

        tailored_resume = ""
        changes: List[str] = []
        ats_before = 0
        ats_after = 0
        current_section = None

        for line in response.split('\n'):
            stripped = line.strip()
            upper = stripped.upper()

            if upper.startswith('TAILORED_RESUME:'):
                current_section = 'resume'
                tail = stripped[len('TAILORED_RESUME:'):].strip()
                if tail:
                    tailored_resume += tail + '\n'
            elif upper.startswith('CHANGES:'):
                current_section = 'changes'
            elif upper.startswith('ATS_BEFORE:'):
                current_section = None
                try:
                    ats_before = int(''.join(filter(str.isdigit, stripped.split(':', 1)[1])))
                except Exception:
                    ats_before = 50
            elif upper.startswith('ATS_AFTER:'):
                current_section = None
                try:
                    ats_after = int(''.join(filter(str.isdigit, stripped.split(':', 1)[1])))
                except Exception:
                    ats_after = 75
            elif current_section == 'resume':
                tailored_resume += line + '\n'
            elif current_section == 'changes' and stripped.startswith('-'):
                changes.append(stripped[1:].strip())

        return {
            "tailored_resume": tailored_resume.strip() or resume_text,
            "changes": changes[:8],
            "ats_score_before": min(100, max(0, ats_before)),
            "ats_score_after": min(100, max(0, ats_after)),
        }


    def research_company(
        self,
        company: str,
        job_title: str = '',
        job_description: str = '',
    ) -> Dict:
        """
        Generate company research insights for a job applicant.

        Returns:
          {
            "overview": str,
            "culture": List[str],
            "tech_stack": List[str],
            "interview_format": str,
            "tips": List[str],
            "red_flags": List[str],
          }
        """
        prompt = f"""You are a career coach helping a job applicant research a company before applying.

COMPANY: {company}
ROLE: {job_title}
JOB DESCRIPTION EXCERPT: {job_description[:500]}

Provide concise, useful research for this applicant. Use only well-known facts about this company type/sector if the specific company is not famous. Be practical and honest.

RESPONSE FORMAT (follow exactly):

OVERVIEW:
[2-3 sentence company overview]

CULTURE:
- [culture point 1]
- [culture point 2]
- [culture point 3]

TECH_STACK:
- [technology 1]
- [technology 2]
- [technology 3]

INTERVIEW_FORMAT:
[2-3 sentences on typical interview process for this type of company/role]

TIPS:
- [application tip 1]
- [application tip 2]
- [application tip 3]

RED_FLAGS:
- [potential concern 1 or "None identified"]"""

        messages = [
            {"role": "system", "content": "You are a career intelligence analyst who gives job applicants actionable company research."},
            {"role": "user", "content": prompt},
        ]

        response = self._chat(messages, model=self.MODELS['fast'], max_tokens=800)

        result = {
            "overview": "",
            "culture": [],
            "tech_stack": [],
            "interview_format": "",
            "tips": [],
            "red_flags": [],
        }
        current = None

        for line in response.split('\n'):
            stripped = line.strip()
            upper = stripped.upper()

            if upper.startswith('OVERVIEW:'):
                current = 'overview'
                tail = stripped[len('OVERVIEW:'):].strip()
                if tail:
                    result['overview'] = tail
            elif upper.startswith('CULTURE:'):
                current = 'culture'
            elif upper.startswith('TECH_STACK:'):
                current = 'tech_stack'
            elif upper.startswith('INTERVIEW_FORMAT:'):
                current = 'interview_format'
                tail = stripped[len('INTERVIEW_FORMAT:'):].strip()
                if tail:
                    result['interview_format'] = tail
            elif upper.startswith('TIPS:'):
                current = 'tips'
            elif upper.startswith('RED_FLAGS:'):
                current = 'red_flags'
            elif current == 'overview' and stripped and not upper.endswith(':'):
                result['overview'] = (result['overview'] + ' ' + stripped).strip()
            elif current == 'interview_format' and stripped and not upper.endswith(':'):
                result['interview_format'] = (result['interview_format'] + ' ' + stripped).strip()
            elif current in ('culture', 'tech_stack', 'tips', 'red_flags') and stripped.startswith('-'):
                result[current].append(stripped[1:].strip())

        return result

    def chat(
        self,
        messages: List[Dict],
        user_context: Dict = None,
    ) -> str:
        """
        Conversational AI assistant for job search questions.

        messages: list of {"role": "user"|"assistant", "content": str}
        user_context: optional dict with name, experience_level, skills, etc.
        """
        ctx = ""
        if user_context:
            ctx = f"""
USER PROFILE:
- Name: {user_context.get('name', 'Job seeker')}
- Experience: {user_context.get('experience_level', 'Not specified')}
- Skills: {', '.join(user_context.get('skills', [])) or 'Not specified'}
- Bio: {user_context.get('bio', '')}
"""

        system_prompt = f"""You are NextStep AI, an expert career assistant helping job seekers find, prepare for, and land their next job.
{ctx}
Be concise, practical, and encouraging. Use bullet points when listing multiple items. Keep responses under 250 words."""

        chat_messages = [{"role": "system", "content": system_prompt}] + messages

        return self._chat(chat_messages, model=self.MODELS['fast'], max_tokens=400)


# Singleton instance
_ai_service: Optional[GroqAIService] = None


def get_ai_service() -> GroqAIService:
    """Get or create singleton AI service."""
    global _ai_service
    if _ai_service is None:
        _ai_service = GroqAIService()
    return _ai_service
