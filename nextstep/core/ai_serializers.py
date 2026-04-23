"""
AI serializers for NextStep AI.
"""

from rest_framework import serializers


class EmailGenerationSerializer(serializers.Serializer):
    """Request serializer for email generation."""
    job_id = serializers.IntegerField(required=False, help_text="Job ID to generate email for")
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    tone = serializers.ChoiceField(
        choices=['professional', 'casual', 'enthusiastic'],
        default='professional'
    )
    
    def validate(self, data):
        if not data.get('job_id') and not (data.get('job_title') and data.get('company')):
            raise serializers.ValidationError(
                "Either job_id or both job_title and company are required"
            )
        return data


class EmailResponseSerializer(serializers.Serializer):
    """Response serializer for generated email."""
    subject = serializers.CharField()
    body = serializers.CharField()
    tone = serializers.CharField()
    word_count = serializers.IntegerField()


class ResumeAnalysisSerializer(serializers.Serializer):
    """Request serializer for resume analysis."""
    resume_text = serializers.CharField(max_length=50000, help_text="Resume content to analyze")
    job_id = serializers.IntegerField(required=False, help_text="Optional job to match against")
    job_description = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    job_title = serializers.CharField(max_length=255, required=False)


class ResumeAnalysisResponseSerializer(serializers.Serializer):
    """Response serializer for resume analysis."""
    strengths = serializers.ListField(child=serializers.CharField())
    improvements = serializers.ListField(child=serializers.CharField())
    keywords_found = serializers.ListField(child=serializers.CharField())
    keywords_missing = serializers.ListField(child=serializers.CharField())
    match_score = serializers.FloatField()
    suggestions = serializers.CharField()
    job_tailored_suggestions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Specific, job-targeted resume edits (only present when a job is provided)"
    )


class CoverLetterSerializer(serializers.Serializer):
    """Request serializer for cover letter generation."""
    job_id = serializers.IntegerField(required=False)
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    
    def validate(self, data):
        if not data.get('job_id') and not (data.get('job_title') and data.get('company')):
            raise serializers.ValidationError(
                "Either job_id or both job_title and company are required"
            )
        return data


class ApplicationTipsSerializer(serializers.Serializer):
    """Request serializer for application tips."""
    job_id = serializers.IntegerField(required=False)
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True, max_length=10000)


class InterviewPrepSerializer(serializers.Serializer):
    """Request serializer for interview prep generation."""
    job_id = serializers.IntegerField(required=False)
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True, max_length=10000)

    def validate(self, data):
        if not data.get('job_id') and not data.get('job_title'):
            raise serializers.ValidationError("Either job_id or job_title is required.")
        return data


class InterviewQAPairSerializer(serializers.Serializer):
    question = serializers.CharField()
    answer = serializers.CharField()
    category = serializers.CharField()


class InterviewPrepResponseSerializer(serializers.Serializer):
    """Response serializer for interview prep."""
    questions = InterviewQAPairSerializer(many=True)
    job_title = serializers.CharField()
    company = serializers.CharField()


class TailorResumeSerializer(serializers.Serializer):
    """Request serializer for resume tailoring."""
    resume_text = serializers.CharField(max_length=50000, required=False, allow_blank=True)
    resume_version_id = serializers.IntegerField(required=False)
    job_id = serializers.IntegerField(required=False)
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True, max_length=10000)

    def validate(self, data):
        if not data.get('resume_text') and not data.get('resume_version_id'):
            raise serializers.ValidationError("Provide resume_text or resume_version_id.")
        if not data.get('job_id') and not data.get('job_title'):
            raise serializers.ValidationError("Provide job_id or job_title.")
        return data


class TailorResumeResponseSerializer(serializers.Serializer):
    """Response serializer for tailored resume."""
    tailored_resume = serializers.CharField()
    changes = serializers.ListField(child=serializers.CharField())
    ats_score_before = serializers.IntegerField()
    ats_score_after = serializers.IntegerField()


class CompanyResearchSerializer(serializers.Serializer):
    """Request serializer for company research."""
    company = serializers.CharField(max_length=255)
    job_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    job_description = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    job_id = serializers.IntegerField(required=False)


class CompanyResearchResponseSerializer(serializers.Serializer):
    """Response serializer for company research."""
    overview = serializers.CharField()
    culture = serializers.ListField(child=serializers.CharField())
    tech_stack = serializers.ListField(child=serializers.CharField())
    interview_format = serializers.CharField()
    tips = serializers.ListField(child=serializers.CharField())
    red_flags = serializers.ListField(child=serializers.CharField())


class ChatMessageSerializer(serializers.Serializer):
    """Single chat message."""
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=4000)


class AIChatSerializer(serializers.Serializer):
    """Request serializer for AI chat."""
    messages = ChatMessageSerializer(many=True)


class AIChatResponseSerializer(serializers.Serializer):
    """Response serializer for AI chat."""
    reply = serializers.CharField()
