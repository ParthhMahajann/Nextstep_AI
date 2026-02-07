from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Job, Skill, UserProfile, UserSkill, SavedJob


# ==================== Auth Serializers ====================

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


# ==================== Skill Serializers ====================

class SkillSerializer(serializers.ModelSerializer):
    """Serializer for skills."""
    
    class Meta:
        model = Skill
        fields = ['id', 'name', 'category']


class UserSkillSerializer(serializers.ModelSerializer):
    """Serializer for user skills with proficiency."""
    
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        source='skill',
        write_only=True
    )
    proficiency_display = serializers.CharField(
        source='get_proficiency_display',
        read_only=True
    )
    
    class Meta:
        model = UserSkill
        fields = [
            'id', 'skill', 'skill_id', 'proficiency', 
            'proficiency_display', 'years_experience'
        ]


class UserSkillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating user skills."""
    
    class Meta:
        model = UserSkill
        fields = ['skill', 'proficiency', 'years_experience']


# ==================== Profile Serializers ====================

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    
    user = UserSerializer(read_only=True)
    skills = UserSkillSerializer(many=True, read_only=True)
    skill_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'bio', 'resume_text', 
            'preferred_job_types', 'preferred_locations',
            'skills', 'skill_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    
    class Meta:
        model = UserProfile
        fields = ['bio', 'resume_text', 'preferred_job_types', 'preferred_locations']


# ==================== Job Serializers ====================

class JobListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for job listings."""
    
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    
    class Meta:
        model = Job
        fields = [
            'id', 'title', 'company', 'location', 
            'job_type', 'job_type_display', 'source', 
            'scraped_at', 'is_active'
        ]


class JobDetailSerializer(serializers.ModelSerializer):
    """Full serializer for job details."""
    
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    required_skills = SkillSerializer(many=True, read_only=True)
    
    class Meta:
        model = Job
        fields = [
            'id', 'title', 'company', 'location', 'description',
            'job_type', 'job_type_display', 'apply_link', 'source',
            'required_skills', 'scraped_at', 'updated_at', 'is_active'
        ]


class JobWithMatchSerializer(JobDetailSerializer):
    """Job serializer with match score for recommendations."""
    
    match_score = serializers.FloatField(read_only=True)
    match_explanation = serializers.CharField(read_only=True)
    
    class Meta(JobDetailSerializer.Meta):
        fields = JobDetailSerializer.Meta.fields + ['match_score', 'match_explanation']


# ==================== Saved Job Serializers ====================

class SavedJobSerializer(serializers.ModelSerializer):
    """Serializer for saved jobs."""
    
    job = JobListSerializer(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.all(),
        source='job',
        write_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = SavedJob
        fields = [
            'id', 'job', 'job_id', 'status', 'status_display',
            'notes', 'email_draft', 'match_score', 'match_explanation',
            'saved_at', 'updated_at', 'applied_at'
        ]
        read_only_fields = ['id', 'saved_at', 'updated_at']


class SavedJobCreateSerializer(serializers.ModelSerializer):
    """Serializer for saving a job."""
    
    class Meta:
        model = SavedJob
        fields = ['job', 'notes']


class SavedJobUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating saved job status."""
    
    class Meta:
        model = SavedJob
        fields = ['status', 'notes', 'email_draft', 'applied_at']
