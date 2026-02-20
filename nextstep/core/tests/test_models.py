"""
Tests for core Django models: Skill, UserProfile, UserSkill, Job, SavedJob.
"""
from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth.models import User

from core.models import Skill, UserProfile, UserSkill, Job, SavedJob
from .helpers import create_test_user, create_test_skill, create_test_job


# ==================== Skill Model ====================

class SkillModelTests(TestCase):
    """Tests for the Skill model."""

    def test_create_skill(self):
        skill = Skill.objects.create(name="Python", category="programming")
        self.assertEqual(skill.name, "Python")
        self.assertEqual(skill.category, "programming")

    def test_skill_str(self):
        skill = Skill.objects.create(name="React", category="programming")
        self.assertEqual(str(skill), "React (programming)")

    def test_skill_unique_name(self):
        Skill.objects.create(name="Python", category="programming")
        with self.assertRaises(IntegrityError):
            Skill.objects.create(name="Python", category="data")

    def test_skill_default_category(self):
        skill = Skill.objects.create(name="Misc Skill")
        self.assertEqual(skill.category, "other")

    def test_skill_ordering(self):
        Skill.objects.create(name="Zebra", category="programming")
        Skill.objects.create(name="Alpha", category="programming")
        Skill.objects.create(name="Beta", category="data")
        skills = list(Skill.objects.values_list("name", flat=True))
        # Ordered by category then name
        self.assertEqual(skills, ["Beta", "Alpha", "Zebra"])


# ==================== UserProfile Model ====================

class UserProfileModelTests(TestCase):
    """Tests for UserProfile (auto-created via signal)."""

    def test_profile_auto_created(self):
        """UserProfile should be auto-created when User is created."""
        user = create_test_user()
        self.assertTrue(hasattr(user, "profile"))
        self.assertIsInstance(user.profile, UserProfile)

    def test_profile_str(self):
        user = create_test_user()
        self.assertEqual(str(user.profile), "Profile: testuser")

    def test_profile_defaults(self):
        user = create_test_user()
        profile = user.profile
        self.assertEqual(profile.bio, "")
        self.assertEqual(profile.resume_text, "")
        self.assertEqual(profile.preferred_job_types, [])
        self.assertEqual(profile.preferred_locations, [])

    def test_skill_count(self):
        user = create_test_user()
        self.assertEqual(user.profile.skill_count, 0)
        skill = create_test_skill()
        UserSkill.objects.create(user_profile=user.profile, skill=skill, proficiency=3)
        self.assertEqual(user.profile.skill_count, 1)

    def test_profile_update_on_user_save(self):
        """Saving the user should also save the profile (via signal)."""
        user = create_test_user()
        user.profile.bio = "Updated bio"
        user.profile.save()
        user.save()  # triggers save_user_profile signal
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.bio, "Updated bio")


# ==================== UserSkill Model ====================

class UserSkillModelTests(TestCase):
    """Tests for the UserSkill junction table."""

    def test_create_user_skill(self):
        user = create_test_user()
        skill = create_test_skill()
        user_skill = UserSkill.objects.create(
            user_profile=user.profile, skill=skill, proficiency=3, years_experience=2.5
        )
        self.assertEqual(user_skill.proficiency, 3)
        self.assertEqual(user_skill.years_experience, 2.5)

    def test_user_skill_str(self):
        user = create_test_user()
        skill = create_test_skill(name="Django", category="programming")
        user_skill = UserSkill.objects.create(
            user_profile=user.profile, skill=skill, proficiency=3
        )
        self.assertEqual(str(user_skill), "testuser - Django (Advanced)")

    def test_user_skill_unique_together(self):
        user = create_test_user()
        skill = create_test_skill()
        UserSkill.objects.create(user_profile=user.profile, skill=skill)
        with self.assertRaises(IntegrityError):
            UserSkill.objects.create(user_profile=user.profile, skill=skill)

    def test_user_skill_default_proficiency(self):
        user = create_test_user()
        skill = create_test_skill()
        user_skill = UserSkill.objects.create(user_profile=user.profile, skill=skill)
        self.assertEqual(user_skill.proficiency, 2)  # default: Intermediate

    def test_user_skill_cascade_delete_profile(self):
        """Deleting profile should cascade-delete its skills."""
        user = create_test_user()
        skill = create_test_skill()
        UserSkill.objects.create(user_profile=user.profile, skill=skill)
        user.profile.delete()
        self.assertEqual(UserSkill.objects.count(), 0)


# ==================== Job Model ====================

class JobModelTests(TestCase):
    """Tests for the Job model."""

    def test_create_job(self):
        job = create_test_job()
        self.assertEqual(job.title, "Software Engineer")
        self.assertEqual(job.company, "TestCorp")
        self.assertTrue(job.is_active)
        self.assertFalse(job.is_enriched)

    def test_job_str(self):
        job = create_test_job(title="Backend Dev", company="Acme")
        self.assertEqual(str(job), "Backend Dev at Acme")

    def test_job_defaults(self):
        job = create_test_job()
        self.assertEqual(job.ai_summary, "")
        self.assertEqual(job.experience_level, "")
        self.assertEqual(job.role_type, "")
        self.assertEqual(job.ai_skills, [])
        self.assertTrue(job.is_active)
        self.assertFalse(job.is_enriched)

    def test_job_ordering(self):
        """Jobs should be ordered by scraped_at descending (newest first)."""
        j1 = create_test_job(title="First")
        j2 = create_test_job(title="Second")
        jobs = list(Job.objects.values_list("title", flat=True))
        self.assertEqual(jobs, ["Second", "First"])

    def test_job_required_skills(self):
        job = create_test_job()
        python = create_test_skill(name="Python")
        django = create_test_skill(name="Django")
        job.required_skills.add(python, django)
        self.assertEqual(job.required_skills.count(), 2)


# ==================== SavedJob Model ====================

class SavedJobModelTests(TestCase):
    """Tests for the SavedJob model."""

    def test_create_saved_job(self):
        user = create_test_user()
        job = create_test_job()
        saved = SavedJob.objects.create(
            user_profile=user.profile, job=job, notes="Looks interesting"
        )
        self.assertEqual(saved.status, "saved")
        self.assertEqual(saved.notes, "Looks interesting")

    def test_saved_job_str(self):
        user = create_test_user()
        job = create_test_job(title="ML Engineer")
        saved = SavedJob.objects.create(user_profile=user.profile, job=job)
        self.assertEqual(str(saved), "testuser - ML Engineer (saved)")

    def test_saved_job_unique_together(self):
        user = create_test_user()
        job = create_test_job()
        SavedJob.objects.create(user_profile=user.profile, job=job)
        with self.assertRaises(IntegrityError):
            SavedJob.objects.create(user_profile=user.profile, job=job)

    def test_saved_job_status_transitions(self):
        user = create_test_user()
        job = create_test_job()
        saved = SavedJob.objects.create(user_profile=user.profile, job=job)
        for status_code, _ in SavedJob.STATUS_CHOICES:
            saved.status = status_code
            saved.save()
            saved.refresh_from_db()
            self.assertEqual(saved.status, status_code)

    def test_saved_job_cascade_delete_job(self):
        """Deleting a job should cascade-delete saved entries."""
        user = create_test_user()
        job = create_test_job()
        SavedJob.objects.create(user_profile=user.profile, job=job)
        job.delete()
        self.assertEqual(SavedJob.objects.count(), 0)
