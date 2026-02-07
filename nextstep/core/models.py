from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


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
    """Extended user profile for opportunity matching."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, help_text="Brief professional summary")
    resume_text = models.TextField(blank=True, help_text="Parsed resume content")
    
    # Preferences stored as JSON
    preferred_job_types = models.JSONField(
        default=list,
        blank=True,
        help_text="List of preferred job types: job, internship, freelance, etc."
    )
    preferred_locations = models.JSONField(
        default=list,
        blank=True,
        help_text="List of preferred locations or 'Remote'"
    )
    
    # Profile completeness tracking
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
    
    # Metadata
    scraped_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-scraped_at']
        indexes = [
            models.Index(fields=['job_type']),
            models.Index(fields=['source']),
            models.Index(fields=['scraped_at']),
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
        on_delete=models.CASCADE, 
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


# Signal to auto-create UserProfile when User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
