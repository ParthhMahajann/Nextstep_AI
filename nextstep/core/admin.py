from django.contrib import admin
from .models import Job, Skill, UserProfile, UserSkill, SavedJob


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name']
    ordering = ['category', 'name']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'skill_count', 'created_at', 'updated_at']
    search_fields = ['user__username', 'user__email', 'bio']
    readonly_fields = ['created_at', 'updated_at']
    
    def skill_count(self, obj):
        return obj.skills.count()
    skill_count.short_description = 'Skills'


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'skill', 'proficiency', 'years_experience']
    list_filter = ['proficiency', 'skill__category']
    search_fields = ['user_profile__user__username', 'skill__name']


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'location', 'job_type', 'source', 'scraped_at', 'is_active']
    list_filter = ['job_type', 'source', 'is_active', 'scraped_at']
    search_fields = ['title', 'company', 'description']
    ordering = ['-scraped_at']
    date_hierarchy = 'scraped_at'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'company', 'location', 'description')
        }),
        ('Classification', {
            'fields': ('job_type', 'required_skills', 'is_active')
        }),
        ('Source', {
            'fields': ('source', 'apply_link')
        }),
        ('Metadata', {
            'fields': ('scraped_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['scraped_at', 'updated_at']
    filter_horizontal = ['required_skills']


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'job', 'status', 'match_score', 'saved_at']
    list_filter = ['status', 'saved_at']
    search_fields = ['user_profile__user__username', 'job__title', 'job__company']
    ordering = ['-saved_at']
    readonly_fields = ['saved_at', 'updated_at']
