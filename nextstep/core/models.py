import uuid

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class Skill(models.Model):
    """Represents a skill that can be associated with users and jobs."""
    
    CATEGORY_CHOICES = [
        ('programming', 'Programming'),
        ('design', 'Design'),
        ('data', 'Data Science'),
        ('marketing', 'Marketing'),
        ('writing', 'Writing'),
        ('management', 'Management'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    embedding = models.BinaryField(null=True, blank=True)  # Cached embedding vector
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class UserProfile(models.Model):
    """Extended user profile for opportunity matching and AI/ML personalisation."""

    EXPERIENCE_LEVEL_CHOICES = [
        ('fresher', 'Fresher (0 years)'),
        ('junior', 'Junior (1-2 years)'),
        ('mid', 'Mid Level (3-5 years)'),
        ('senior', 'Senior (5+ years)'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # ── Demographics ──────────────────────────────────────────────────────────
    age = models.PositiveIntegerField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)

    # ── Professional Summary ──────────────────────────────────────────────────
    bio = models.TextField(blank=True, help_text="Brief professional summary")
    experience_level = models.CharField(
        max_length=20, choices=EXPERIENCE_LEVEL_CHOICES, blank=True, default=''
    )

    # ── Education & Qualifications ────────────────────────────────────────────
    # e.g. {"degree": "btech", "field": "Computer Science", "institution": "IIT", "graduation_year": "2025", "gpa": "8.5"}
    education = models.JSONField(default=dict, blank=True)
    # list of {"title": "AWS Cloud Practitioner", "issuer": "Amazon", "year": "2024"}
    qualifications = models.JSONField(default=list, blank=True)

    # ── Resume ────────────────────────────────────────────────────────────────
    resume_text = models.TextField(blank=True, help_text="Parsed/pasted resume content")
    resume_file = models.FileField(
        upload_to='resumes/', null=True, blank=True,
        help_text="Uploaded resume PDF/DOCX"
    )

    # ── Social & Portfolio Links ──────────────────────────────────────────────
    portfolio_url = models.URLField(blank=True, default='')
    linkedin_url = models.URLField(blank=True, default='')
    github_url = models.URLField(blank=True, default='')

    # ── Job Preferences ───────────────────────────────────────────────────────
    preferred_job_types = models.JSONField(
        default=list, blank=True,
        help_text="List of preferred job types: job, internship, freelance, etc."
    )
    preferred_locations = models.JSONField(
        default=list, blank=True,
        help_text="List of preferred locations or 'Remote'"
    )
    open_to_remote = models.BooleanField(default=True)
    expected_salary = models.CharField(max_length=50, blank=True, default='')

    # ── ML Personalisation ────────────────────────────────────────────────────
    liked_embedding = models.BinaryField(null=True, blank=True)  # Mean of saved-job embeddings

    # ── Metadata ──────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user.username}"

    @property
    def skill_count(self):
        return self.skills.count()


class UserSkill(models.Model):
    """Junction table linking users to their skills with proficiency levels."""
    
    PROFICIENCY_CHOICES = [
        (1, 'Beginner'),
        (2, 'Intermediate'),
        (3, 'Advanced'),
        (4, 'Expert'),
    ]
    
    user_profile = models.ForeignKey(
        UserProfile, 
        on_delete=models.CASCADE, 
        related_name='skills'
    )
    skill = models.ForeignKey(
        Skill, 
        on_delete=models.CASCADE, 
        related_name='user_skills'
    )
    proficiency = models.IntegerField(
        choices=PROFICIENCY_CHOICES, 
        default=2
    )
    years_experience = models.FloatField(
        default=0,
        help_text="Years of experience with this skill"
    )
    
    class Meta:
        unique_together = ['user_profile', 'skill']
        ordering = ['-proficiency', 'skill__name']
    
    def __str__(self):
        return f"{self.user_profile.user.username} - {self.skill.name} ({self.get_proficiency_display()})"


class Job(models.Model):
    """Represents a job/internship/freelance opportunity."""
    
    JOB_TYPES = [
        ('job', 'Job'),
        ('internship', 'Internship'),
        ('freelance', 'Freelance'),
        ('part-time', 'Part-time'),
        ('contract', 'Contract'),
    ]
    
    EXPERIENCE_LEVELS = [
        ('entry', 'Entry Level'),
        ('mid', 'Mid Level'),
        ('senior', 'Senior Level'),
        ('any', 'Any Level'),
    ]
    
    ROLE_TYPES = [
        ('frontend', 'Frontend'),
        ('backend', 'Backend'),
        ('fullstack', 'Full Stack'),
        ('data', 'Data Science'),
        ('devops', 'DevOps'),
        ('design', 'Design'),
        ('marketing', 'Marketing'),
        ('management', 'Management'),
        ('other', 'Other'),
    ]
    
    # Basic info
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, default='Remote')
    description = models.TextField()
    job_type = models.CharField(max_length=20, choices=JOB_TYPES)
    apply_link = models.URLField()
    source = models.CharField(max_length=100, help_text="Where this job was scraped from")
    
    # Skills and matching
    required_skills = models.ManyToManyField(
        Skill, 
        blank=True, 
        related_name='jobs'
    )
    embedding = models.BinaryField(null=True, blank=True)  # Job description embedding
    
    # AI Enrichment fields
    ai_summary = models.TextField(blank=True, default='', help_text="AI-generated job summary")
    experience_level = models.CharField(
        max_length=20, choices=EXPERIENCE_LEVELS, blank=True, default='',
        help_text="AI-extracted experience level"
    )
    role_type = models.CharField(
        max_length=20, choices=ROLE_TYPES, blank=True, default='',
        help_text="AI-extracted role type"
    )
    ai_skills = models.JSONField(
        default=list, blank=True,
        help_text="AI-extracted skills list"
    )
    is_enriched = models.BooleanField(default=False, help_text="Whether AI enrichment has been applied")
    
    # Metadata
    scraped_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-scraped_at']
        unique_together = [['source', 'apply_link']]
        indexes = [
            models.Index(fields=['job_type']),
            models.Index(fields=['source']),
            models.Index(fields=['scraped_at']),
            models.Index(fields=['is_enriched']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.title} at {self.company}"


class SavedJob(models.Model):
    """Tracks jobs saved by users with application status and drafts."""

    STATUS_CHOICES = [
        ('saved', 'Saved'),
        ('preparing', 'Preparing Application'),
        ('applied', 'Applied'),
        ('interviewing', 'Interviewing'),
        ('rejected', 'Rejected'),
        ('accepted', 'Accepted'),
    ]

    user_profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='saved_jobs'
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.SET_NULL,
        null=True,
        related_name='saved_by'
    )

    # Application tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='saved'
    )
    notes = models.TextField(blank=True, help_text="Personal notes about this opportunity")
    email_draft = models.TextField(blank=True, help_text="AI-generated email draft")
    cover_letter = models.TextField(blank=True, help_text="AI-generated cover letter")

    # Interview tracking
    interview_date = models.DateTimeField(null=True, blank=True, help_text="Scheduled interview date/time")
    interview_notes = models.TextField(blank=True, help_text="Notes from interview")
    follow_up_date = models.DateField(null=True, blank=True, help_text="Reminder to follow up")

    # Match info (cached from ML engine)
    match_score = models.FloatField(null=True, blank=True)
    match_explanation = models.TextField(blank=True)

    # Timestamps
    saved_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['user_profile', 'job']
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.user_profile.user.username} - {self.job.title} ({self.status})"


class ResumeVersion(models.Model):
    """Stores multiple named resume versions per user."""

    user_profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='resume_versions',
    )
    name = models.CharField(max_length=100, help_text="e.g. 'Frontend Resume', 'ML Resume'")
    content = models.TextField(help_text="Resume text content")
    target_role = models.CharField(max_length=100, blank=True, help_text="Target job role")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user_profile.user.username} — {self.name}"


# Signal to auto-create UserProfile when User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()


class EmailVerificationToken(models.Model):
    """Single-use token for email verification. Expires after 24 hours."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='email_verification_token'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(hours=24)

    def __str__(self):
        return f"EmailVerification for {self.user.username}"


class PasswordResetToken(models.Model):
    """Single-use token for password reset. Expires after 1 hour."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='password_reset_token'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timezone.timedelta(hours=1)

    def __str__(self):
        return f"PasswordReset for {self.user.username}"


class SwipeEvent(models.Model):
    """Records every swipe action for ML feedback signals."""

    ACTION_CHOICES = [
        ('skip', 'Skip'),
        ('save', 'Save'),
        ('apply', 'Apply'),
    ]

    user_profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name='swipe_events'
    )
    job = models.ForeignKey(
        Job, on_delete=models.SET_NULL, null=True, related_name='swipe_events'
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    card_position = models.PositiveIntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user_profile', 'action']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.user_profile.user.username} {self.action} job#{self.job_id}"


@receiver(post_save, sender=SavedJob)
def update_user_taste_vector(sender, instance, created, **kwargs):
    """Recompute taste vector whenever a user saves/progresses a job."""
    if instance.status not in ('saved', 'preparing', 'applied', 'interviewing', 'accepted'):
        return
    try:
        import sys
        from pathlib import Path
        ml_path = str(Path(__file__).resolve().parent.parent.parent / 'ml_engine')
        if ml_path not in sys.path:
            sys.path.insert(0, ml_path)
        from personalization import store_user_taste_vector
        store_user_taste_vector(instance.user_profile)
    except Exception:
        pass
