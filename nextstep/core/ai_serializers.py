"""
AI serializers for NextStep AI.
"""

from rest_framework import serializers


class EmailGenerationSerializer(serializers.Serializer):
    """Request serializer for email generation."""
    job_id = serializers.IntegerField(required=False, help_text="Job ID to generate email for")
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True)
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
    resume_text = serializers.CharField(help_text="Resume content to analyze")
    job_id = serializers.IntegerField(required=False, help_text="Optional job to match against")
    job_description = serializers.CharField(required=False, allow_blank=True)
    job_title = serializers.CharField(max_length=255, required=False)


class ResumeAnalysisResponseSerializer(serializers.Serializer):
    """Response serializer for resume analysis."""
    strengths = serializers.ListField(child=serializers.CharField())
    improvements = serializers.ListField(child=serializers.CharField())
    keywords_found = serializers.ListField(child=serializers.CharField())
    keywords_missing = serializers.ListField(child=serializers.CharField())
    match_score = serializers.FloatField()
    suggestions = serializers.CharField()


class CoverLetterSerializer(serializers.Serializer):
    """Request serializer for cover letter generation."""
    job_id = serializers.IntegerField(required=False)
    job_title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    job_description = serializers.CharField(required=False, allow_blank=True)
    
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
    job_description = serializers.CharField(required=False, allow_blank=True)
