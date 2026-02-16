import re
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class EnrichmentResult:
    """Structured enrichment data for a job."""
    summary: str
    skills: List[str]
    experience_level: str  # entry, mid, senior, any
    role_type: str  # frontend, backend, fullstack, data, devops, design, marketing, management, other


# ============================================================
# SKILL TAXONOMY
# ============================================================

SKILL_TAXONOMY = {
    # Programming Languages
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'golang',
    'rust', 'swift', 'kotlin', 'scala', 'php', 'perl', 'r', 'matlab', 'dart', 'lua',
    'elixir', 'clojure', 'haskell', 'erlang', 'objective-c', 'assembly', 'fortran',
    'julia', 'groovy', 'visual basic', 'cobol', 'solidity',

    # Frontend
    'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js',
    'svelte', 'nextjs', 'next.js', 'nuxt', 'nuxtjs', 'gatsby', 'html', 'css', 'sass',
    'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'mui',
    'chakra ui', 'styled-components', 'webpack', 'vite', 'rollup', 'babel', 'jquery',
    'redux', 'zustand', 'mobx', 'graphql', 'apollo', 'storybook', 'figma',

    # Backend
    'node', 'nodejs', 'node.js', 'express', 'expressjs', 'fastapi', 'flask', 'django',
    'spring', 'spring boot', 'springboot', 'rails', 'ruby on rails', 'laravel',
    'asp.net', '.net', 'dotnet', 'gin', 'fiber', 'nestjs', 'koa', 'hapi',
    'microservices', 'rest', 'restful', 'grpc', 'websocket', 'socket.io',

    # Databases
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch',
    'cassandra', 'dynamodb', 'firebase', 'firestore', 'sqlite', 'mariadb',
    'oracle', 'mssql', 'sql server', 'couchdb', 'neo4j', 'influxdb', 'supabase',
    'prisma', 'sequelize', 'sqlalchemy', 'mongoose', 'typeorm',

    # Cloud & DevOps
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel',
    'netlify', 'digitalocean', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
    'jenkins', 'ci/cd', 'github actions', 'gitlab ci', 'circleci', 'travis ci',
    'nginx', 'apache', 'linux', 'unix', 'bash', 'shell', 'powershell',
    'cloudflare', 'prometheus', 'grafana', 'datadog', 'new relic', 'splunk',

    # Data & ML
    'machine learning', 'deep learning', 'neural networks', 'nlp',
    'natural language processing', 'computer vision', 'tensorflow', 'pytorch',
    'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy', 'scipy', 'spark',
    'pyspark', 'hadoop', 'airflow', 'dbt', 'snowflake', 'bigquery', 'redshift',
    'tableau', 'power bi', 'looker', 'data engineering', 'etl', 'data pipeline',
    'data warehouse', 'data lake', 'feature engineering', 'mlops',
    'hugging face', 'transformers', 'langchain', 'llm', 'openai', 'gpt',
    'stable diffusion', 'generative ai', 'rag', 'vector database',

    # Mobile
    'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic',
    'swift ui', 'swiftui', 'jetpack compose', 'cocoapods', 'gradle',

    # Testing
    'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'puppeteer',
    'pytest', 'unittest', 'junit', 'testng', 'rspec', 'cucumber',
    'tdd', 'bdd', 'unit testing', 'integration testing', 'e2e testing',

    # Tools & Practices
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack',
    'agile', 'scrum', 'kanban', 'devops', 'sre', 'site reliability',

    # Security
    'cybersecurity', 'penetration testing', 'owasp', 'encryption', 'oauth',
    'jwt', 'ssl', 'tls', 'sso', 'identity management', 'iam',

    # Design
    'ui design', 'ux design', 'ui/ux', 'user research', 'wireframing',
    'prototyping', 'sketch', 'adobe xd', 'invision', 'zeplin',
    'photoshop', 'illustrator', 'after effects', 'premiere pro', 'canva',
    'design systems', 'responsive design', 'accessibility', 'a11y',

    # Marketing
    'seo', 'sem', 'google analytics', 'google ads', 'facebook ads',
    'content marketing', 'email marketing', 'social media marketing',
    'growth hacking', 'a/b testing', 'conversion optimization', 'hubspot',
    'mailchimp', 'salesforce', 'crm', 'marketing automation',

    # Management & Soft Skills
    'project management', 'product management', 'team leadership',
    'stakeholder management', 'strategic planning', 'budgeting',
    'communication', 'presentation', 'problem solving', 'critical thinking',

    # Blockchain & Web3
    'blockchain', 'ethereum', 'smart contracts', 'web3', 'defi',
    'nft', 'cryptocurrency', 'solana', 'polygon',

    # APIs & Integration
    'api design', 'swagger', 'openapi', 'postman', 'insomnia',
    'webhooks', 'oauth2', 'saml', 'soap',
}

# Normalize taxonomy: create a lookup map (lowercase → canonical name)
_SKILL_LOOKUP: Dict[str, str] = {}
for skill in SKILL_TAXONOMY:
    _SKILL_LOOKUP[skill.lower()] = skill

# Multi-word skills sorted by length (longest first for greedy matching)
_MULTI_WORD_SKILLS = sorted(
    [s for s in SKILL_TAXONOMY if ' ' in s or '/' in s or '.' in s],
    key=len, reverse=True
)
_SINGLE_WORD_SKILLS = [s for s in SKILL_TAXONOMY if ' ' not in s and '/' not in s and '.' not in s]


# ============================================================
# EXPERIENCE LEVEL PATTERNS
# ============================================================

_SENIOR_PATTERNS = [
    r'\b(?:senior|sr\.?|lead|principal|staff|architect|director|head of|vp|vice president)\b',
    r'\b(?:8|9|10|[1-9]\d)\+?\s*(?:years?|yrs?)\b',
    r'\b(?:7|6|5)\+\s*(?:years?|yrs?)\b',
    r'\bextensive experience\b',
    r'\bseasoned\b',
]

_MID_PATTERNS = [
    r'\b(?:mid-?level|intermediate|experienced)\b',
    r'\b(?:3|4|5)\+?\s*(?:years?|yrs?)\b',
    r'\b(?:2|3)-(?:4|5|6)\s*(?:years?|yrs?)\b',
    r'\bsome experience\b',
]

_ENTRY_PATTERNS = [
    r'\b(?:junior|jr\.?|entry[- ]?level|associate|trainee|apprentice)\b',
    r'\b(?:intern|internship|co-?op|new grad|fresh graduate|fresher)\b',
    r'\b(?:0|1|2)\+?\s*(?:years?|yrs?)\b',
    r'\bno experience (?:required|needed|necessary)\b',
    r'\bbeginners?\s+welcome\b',
    r'\blearning opportunity\b',
]


# ============================================================
# ROLE TYPE KEYWORDS
# ============================================================

_ROLE_KEYWORDS = {
    'frontend': {
        'title': ['frontend', 'front-end', 'front end', 'ui developer', 'ui engineer', 'web developer'],
        'desc': ['react', 'angular', 'vue', 'css', 'html', 'frontend', 'front-end', 'ui/ux',
                 'responsive design', 'browser', 'dom', 'webpack', 'tailwind', 'sass'],
    },
    'backend': {
        'title': ['backend', 'back-end', 'back end', 'server', 'api developer', 'api engineer'],
        'desc': ['api', 'database', 'server', 'backend', 'back-end', 'microservices', 'rest',
                 'sql', 'nosql', 'redis', 'queue', 'authentication', 'django', 'express',
                 'spring', 'flask', 'fastapi', 'grpc'],
    },
    'fullstack': {
        'title': ['fullstack', 'full-stack', 'full stack'],
        'desc': ['fullstack', 'full-stack', 'full stack', 'both frontend and backend',
                 'end-to-end', 'front and back'],
    },
    'data': {
        'title': ['data scientist', 'data engineer', 'data analyst', 'machine learning',
                  'ml engineer', 'ai engineer', 'nlp', 'deep learning', 'analytics'],
        'desc': ['machine learning', 'data science', 'deep learning', 'neural network',
                 'nlp', 'pandas', 'tensorflow', 'pytorch', 'statistics', 'modeling',
                 'data pipeline', 'etl', 'bigquery', 'snowflake', 'data warehouse',
                 'feature engineering', 'training models'],
    },
    'devops': {
        'title': ['devops', 'sre', 'site reliability', 'platform engineer', 'infrastructure',
                  'cloud engineer', 'systems engineer'],
        'desc': ['devops', 'kubernetes', 'docker', 'terraform', 'ansible', 'ci/cd', 'pipeline',
                 'infrastructure', 'monitoring', 'deployment', 'aws', 'gcp', 'azure',
                 'cloud', 'sre', 'reliability', 'linux administration'],
    },
    'design': {
        'title': ['designer', 'ui/ux', 'ux researcher', 'product designer', 'graphic designer',
                  'visual designer', 'interaction designer'],
        'desc': ['design', 'figma', 'sketch', 'wireframe', 'prototype', 'user research',
                 'usability', 'typography', 'visual design', 'design system', 'accessibility'],
    },
    'marketing': {
        'title': ['marketing', 'growth', 'seo', 'content', 'brand', 'social media',
                  'digital marketing', 'performance marketing'],
        'desc': ['marketing', 'seo', 'sem', 'campaign', 'brand', 'social media',
                 'content strategy', 'analytics', 'conversion', 'funnel', 'acquisition',
                 'hubspot', 'google ads', 'email marketing'],
    },
    'management': {
        'title': ['manager', 'director', 'head of', 'vp', 'chief', 'lead', 'team lead',
                  'product manager', 'project manager', 'engineering manager', 'cto'],
        'desc': ['team management', 'leadership', 'roadmap', 'stakeholder', 'budget',
                 'strategy', 'cross-functional', 'mentoring', 'hiring', 'reporting',
                 'okr', 'kpi', 'people management'],
    },
}


# ============================================================
# SKILL EXTRACTION
# ============================================================

def extract_skills(text: str, title: str = '') -> List[str]:
    """
    Extract skills from job description using taxonomy matching.
    
    Uses word boundary matching for single-word skills and
    substring matching for multi-word skills.
    
    Returns deduplicated list of matched skills, sorted by relevance
    (title matches first, then description matches).
    """
    combined = f"{title} {text}".lower()
    found = set()
    
    # Match multi-word skills first (greedy, longest first)
    for skill in _MULTI_WORD_SKILLS:
        if skill.lower() in combined:
            found.add(_SKILL_LOOKUP[skill.lower()])
    
    # Match single-word skills with word boundary check
    for skill in _SINGLE_WORD_SKILLS:
        skill_lower = skill.lower()
        # Skip very short skills that cause false positives
        if len(skill_lower) <= 1:
            continue
        pattern = r'\b' + re.escape(skill_lower) + r'\b'
        if re.search(pattern, combined):
            found.add(_SKILL_LOOKUP[skill_lower])
    
    # Normalize duplicates (e.g., "react" and "reactjs" → "react")
    normalized = _normalize_skills(found)
    
    # Sort: title matches first for relevance
    title_lower = title.lower()
    title_skills = [s for s in normalized if s.lower() in title_lower]
    desc_skills = [s for s in normalized if s.lower() not in title_lower]
    
    return title_skills + desc_skills


def _normalize_skills(skills: set) -> List[str]:
    """Remove duplicate skill variants, keeping the canonical form."""
    # Map of variants → canonical
    VARIANTS = {
        'reactjs': 'react', 'react.js': 'react',
        'vuejs': 'vue', 'vue.js': 'vue',
        'angularjs': 'angular',
        'nodejs': 'node', 'node.js': 'node',
        'expressjs': 'express',
        'nextjs': 'next.js',
        'nuxtjs': 'nuxt',
        'nestjs': 'nestjs',
        'golang': 'go',
        'postgresql': 'postgres', 'postgres': 'postgresql',
        'k8s': 'kubernetes',
        'sklearn': 'scikit-learn',
        'amazon web services': 'aws',
        'google cloud': 'gcp',
        'springboot': 'spring boot',
        'tailwindcss': 'tailwind',
        'mssql': 'sql server',
    }
    
    canonical_set = set()
    result = []
    
    for skill in skills:
        canonical = VARIANTS.get(skill.lower(), skill.lower())
        if canonical not in canonical_set:
            canonical_set.add(canonical)
            result.append(skill)
    
    return result


# ============================================================
# EXPERIENCE LEVEL CLASSIFICATION
# ============================================================

def classify_experience_level(text: str, title: str = '') -> str:
    """
    Classify job experience level from description and title.
    
    Uses pattern matching with weighted scoring:
    - Title matches weighted 3x (more reliable signal)
    - Description matches weighted 1x
    
    Returns: 'entry', 'mid', 'senior', or 'any'
    """
    combined = f"{title}\n{text}".lower()
    title_lower = title.lower()
    
    scores = {'entry': 0, 'mid': 0, 'senior': 0}
    
    for pattern in _SENIOR_PATTERNS:
        if re.search(pattern, title_lower):
            scores['senior'] += 3
        if re.search(pattern, combined):
            scores['senior'] += 1
    
    for pattern in _MID_PATTERNS:
        if re.search(pattern, title_lower):
            scores['mid'] += 3
        if re.search(pattern, combined):
            scores['mid'] += 1
    
    for pattern in _ENTRY_PATTERNS:
        if re.search(pattern, title_lower):
            scores['entry'] += 3
        if re.search(pattern, combined):
            scores['entry'] += 1
    
    # Pick highest scoring level
    max_score = max(scores.values())
    if max_score == 0:
        return 'any'
    
    # Return highest scoring level
    return max(scores, key=scores.get)


# ============================================================
# ROLE TYPE CLASSIFICATION
# ============================================================

def classify_role_type(text: str, title: str = '') -> str:
    """
    Classify role type using keyword scoring.
    
    Title keywords are weighted 3x higher than description keywords.
    Returns the role type with the highest score.
    """
    title_lower = title.lower()
    text_lower = text.lower()
    
    scores = {}
    
    for role, keywords in _ROLE_KEYWORDS.items():
        score = 0
        
        # Title keyword matches (weighted 3x)
        for kw in keywords['title']:
            if kw in title_lower:
                score += 3
        
        # Description keyword matches
        for kw in keywords['desc']:
            if kw in text_lower:
                score += 1
        
        scores[role] = score
    
    # Fullstack boost: if both frontend and backend score high
    if scores.get('frontend', 0) >= 3 and scores.get('backend', 0) >= 3:
        scores['fullstack'] = scores.get('fullstack', 0) + 4
    
    max_score = max(scores.values())
    if max_score == 0:
        return 'other'
    
    return max(scores, key=scores.get)


# ============================================================
# EXTRACTIVE SUMMARIZATION
# ============================================================

def generate_summary(text: str, title: str = '', company: str = '', max_sentences: int = 3) -> str:
    """
    Generate an extractive summary by selecting the most informative sentences.
    
    Uses TF-IDF-like scoring: sentences with more unique/important words
    score higher. Filters out boilerplate and very short sentences.
    """
    if not text or len(text.strip()) < 50:
        return f"{title} at {company}" if title else ""
    
    # Split into sentences
    sentences = _split_sentences(text)
    
    if not sentences:
        return text[:200].strip()
    
    if len(sentences) <= max_sentences:
        return ' '.join(sentences)
    
    # Score each sentence
    scored = []
    seen_content = set()
    
    for i, sent in enumerate(sentences):
        # Skip very short or boilerplate sentences
        if len(sent.split()) < 5:
            continue
        if _is_boilerplate(sent):
            continue
        
        # Deduplicate near-identical sentences
        sent_key = sent.lower()[:50]
        if sent_key in seen_content:
            continue
        seen_content.add(sent_key)
        
        score = _score_sentence(sent, i, len(sentences), title)
        scored.append((score, i, sent))
    
    if not scored:
        return text[:300].strip()
    
    # Pick top sentences, maintain original order
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:max_sentences]
    top.sort(key=lambda x: x[1])  # Restore original order
    
    return ' '.join(s[2] for s in top)


def _split_sentences(text: str) -> List[str]:
    """Split text into sentences, handling common edge cases."""
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split on sentence boundaries
    raw = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    
    # Also split on newlines/bullets if no period-based splits found
    if len(raw) <= 1:
        raw = re.split(r'[\n\r]+|(?:^|\n)\s*[-•*]\s*', text)
    
    sentences = []
    for s in raw:
        s = s.strip()
        if len(s) >= 15:
            sentences.append(s)
    
    return sentences


def _is_boilerplate(sentence: str) -> bool:
    """Check if a sentence is common boilerplate text."""
    lower = sentence.lower()
    boilerplate_phrases = [
        'equal opportunity employer',
        'we are an equal',
        'aa/eeo',
        'reasonable accommodation',
        'drug-free workplace',
        'background check',
        'e-verify',
        'right to work',
        'apply now',
        'click here',
        'submit your resume',
        'send your cv',
        'how to apply',
        'about the company',
        'about us',
        'who we are',
        'our benefits include',
        'benefits package',
        'salary range',
        'compensation',
        'perks and benefits',
    ]
    return any(bp in lower for bp in boilerplate_phrases)


def _score_sentence(sentence: str, position: int, total: int, title: str) -> float:
    """
    Score a sentence for summary worthiness.
    
    Higher scores for:
    - Sentences near the beginning (usually describe the role)
    - Sentences containing title keywords
    - Sentences with action verbs (describe responsibilities)
    - Moderate length sentences
    """
    score = 0.0
    lower = sentence.lower()
    words = lower.split()
    word_count = len(words)
    
    # Position bonus: first 30% of text is usually most informative
    position_ratio = position / max(total, 1)
    if position_ratio < 0.3:
        score += 3.0
    elif position_ratio < 0.6:
        score += 1.5
    
    # Title keyword overlap
    if title:
        title_words = set(title.lower().split())
        overlap = len(title_words.intersection(set(words)))
        score += overlap * 1.5
    
    # Action verb bonus (describes responsibilities)
    action_verbs = ['develop', 'build', 'design', 'create', 'implement', 'manage',
                    'lead', 'collaborate', 'work with', 'responsible for', 'looking for',
                    'seeking', 'we need', 'you will', 'role involves', 'opportunity to']
    for verb in action_verbs:
        if verb in lower:
            score += 1.0
            break
    
    # Moderate length bonus (not too short, not too long)
    if 10 <= word_count <= 35:
        score += 1.0
    elif word_count > 50:
        score -= 0.5
    
    # Skill mention bonus
    skill_mentions = sum(1 for s in _SINGLE_WORD_SKILLS[:50] if s.lower() in lower)
    score += min(skill_mentions * 0.3, 1.5)
    
    return score


# ============================================================
# MAIN ENRICHER CLASS
# ============================================================

class MLJobEnricher:
    
    def __init__(self):
        logger.info("MLJobEnricher initialized (local ML, no API)")
    
    def enrich(self, title: str, company: str, description: str) -> Optional[EnrichmentResult]:
        """
        Enrich a single job posting.
        
        Args:
            title: Job title
            company: Company name
            description: Job description text
            
        Returns:
            EnrichmentResult or None if input is too short
        """
        if not description or len(description.strip()) < 20:
            logger.warning(f"Description too short for enrichment: '{title}'")
            return None
        
        try:
            skills = extract_skills(description, title)
            experience = classify_experience_level(description, title)
            role = classify_role_type(description, title)
            summary = generate_summary(description, title, company)
            
            return EnrichmentResult(
                summary=summary,
                skills=skills[:10],  # Cap at top 10 skills
                experience_level=experience,
                role_type=role,
            )
            
        except Exception as e:
            logger.error(f"Enrichment failed for '{title}': {e}")
            return None
    
    def enrich_batch(self, jobs: List[Dict]) -> List[Optional[EnrichmentResult]]:
        """
        Enrich multiple jobs at once.
        
        Args:
            jobs: List of dicts with 'title', 'company', 'description'
            
        Returns:
            List of EnrichmentResult (same order as input, None for failures)
        """
        results = []
        for job in jobs:
            result = self.enrich(
                title=job.get('title', ''),
                company=job.get('company', ''),
                description=job.get('description', '')
            )
            results.append(result)
        return results


# Singleton
_enricher_instance: Optional[MLJobEnricher] = None


def get_enricher() -> MLJobEnricher:
    """Get or create singleton enricher instance."""
    global _enricher_instance
    if _enricher_instance is None:
        _enricher_instance = MLJobEnricher()
    return _enricher_instance
