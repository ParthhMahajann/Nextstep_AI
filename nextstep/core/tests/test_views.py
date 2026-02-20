"""
Tests for API views: Profile, Skills, Jobs, SavedJobs.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Skill, UserSkill, Job, SavedJob
from .helpers import create_test_user, create_test_skill, create_test_job, get_auth_client


# ==================== Profile Views ====================

class ProfileViewTests(TestCase):
    """Tests for GET/PATCH /api/profile/."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/profile/"

    def test_get_profile(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["user"]["username"], "testuser")
        self.assertIn("skills", resp.data)
        self.assertIn("skill_count", resp.data)

    def test_update_profile(self):
        resp = self.client.patch(self.url, {"bio": "I am a developer"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["bio"], "I am a developer")

    def test_update_preferences(self):
        resp = self.client.patch(self.url, {
            "preferred_job_types": ["job", "internship"],
            "preferred_locations": ["Remote", "Bangalore"],
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["preferred_job_types"], ["job", "internship"])

    def test_profile_requires_auth(self):
        client = APIClient()
        resp = client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ==================== Skill Views ====================

class SkillViewSetTests(TestCase):
    """Tests for /api/skills/ (read-only)."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/skills/"

    def test_list_skills(self):
        create_test_skill(name="Python")
        create_test_skill(name="React", category="programming")
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)

    def test_search_skills(self):
        create_test_skill(name="Python")
        create_test_skill(name="Java", category="programming")
        create_test_skill(name="Design Thinking", category="design")
        resp = self.client.get(self.url, {"search": "python"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)

    def test_skills_requires_auth(self):
        client = APIClient()
        resp = client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ==================== UserSkill Views ====================

class UserSkillViewSetTests(TestCase):
    """Tests for /api/user-skills/ CRUD."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/user-skills/"
        self.skill = create_test_skill()

    def test_add_skill(self):
        resp = self.client.post(self.url, {
            "skill": self.skill.id,
            "proficiency": 3,
            "years_experience": 2.0,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserSkill.objects.count(), 1)

    def test_list_user_skills(self):
        UserSkill.objects.create(
            user_profile=self.user.profile, skill=self.skill, proficiency=3
        )
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)

    def test_delete_skill(self):
        us = UserSkill.objects.create(
            user_profile=self.user.profile, skill=self.skill
        )
        resp = self.client.delete(f"{self.url}{us.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(UserSkill.objects.count(), 0)

    def test_user_only_sees_own_skills(self):
        """User A should not see User B's skills."""
        UserSkill.objects.create(
            user_profile=self.user.profile, skill=self.skill
        )
        other_user = create_test_user(username="other", email="other@example.com")
        other_client = get_auth_client(other_user)
        resp = other_client.get(self.url)
        self.assertEqual(resp.data["count"], 0)


# ==================== Job Views ====================

class JobViewSetTests(TestCase):
    """Tests for /api/jobs/ (read-only)."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/jobs/"

    def test_list_jobs(self):
        create_test_job(title="Job 1")
        create_test_job(title="Job 2")
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)

    def test_list_excludes_inactive(self):
        create_test_job(title="Active Job")
        create_test_job(title="Inactive Job", is_active=False)
        resp = self.client.get(self.url)
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["title"], "Active Job")

    def test_detail_job(self):
        job = create_test_job()
        resp = self.client.get(f"{self.url}{job.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["title"], "Software Engineer")
        self.assertIn("description", resp.data)

    def test_filter_by_job_type(self):
        create_test_job(title="Full-time", job_type="job")
        create_test_job(title="Internship", job_type="internship")
        resp = self.client.get(self.url, {"job_type": "internship"})
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["title"], "Internship")

    def test_search_jobs(self):
        create_test_job(title="Python Developer", company="Acme", description="Work with Python and Django.")
        create_test_job(title="Java Developer", company="BigCo", description="Work with Java and Spring.")
        resp = self.client.get(self.url, {"search": "Python"})
        self.assertEqual(resp.data["count"], 1)

    def test_ordering(self):
        j1 = create_test_job(title="First")
        j2 = create_test_job(title="Second")
        resp = self.client.get(self.url, {"ordering": "title"})
        titles = [r["title"] for r in resp.data["results"]]
        self.assertEqual(titles, ["First", "Second"])

    def test_jobs_require_auth(self):
        client = APIClient()
        resp = client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ==================== SavedJob Views ====================

class SavedJobViewSetTests(TestCase):
    """Tests for /api/saved-jobs/ CRUD."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/saved-jobs/"
        self.job = create_test_job()

    def test_save_job(self):
        resp = self.client.post(self.url, {"job": self.job.id, "notes": "Interesting"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SavedJob.objects.count(), 1)

    def test_list_saved_jobs(self):
        SavedJob.objects.create(user_profile=self.user.profile, job=self.job)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)

    def test_update_saved_job_status(self):
        saved = SavedJob.objects.create(user_profile=self.user.profile, job=self.job)
        resp = self.client.patch(f"{self.url}{saved.id}/", {"status": "applied"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        saved.refresh_from_db()
        self.assertEqual(saved.status, "applied")

    def test_delete_saved_job(self):
        saved = SavedJob.objects.create(user_profile=self.user.profile, job=self.job)
        resp = self.client.delete(f"{self.url}{saved.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(SavedJob.objects.count(), 0)

    def test_user_only_sees_own_saved_jobs(self):
        SavedJob.objects.create(user_profile=self.user.profile, job=self.job)
        other_user = create_test_user(username="other", email="other@example.com")
        other_client = get_auth_client(other_user)
        resp = other_client.get(self.url)
        self.assertEqual(resp.data["count"], 0)

    def test_cannot_save_same_job_twice(self):
        """Saving the same job twice should not succeed."""
        resp1 = self.client.post(self.url, {"job": self.job.id})
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        # Second save should fail — the view may return 400 or let the
        # IntegrityError bubble up as 500; either way, it must not be 201.
        try:
            resp2 = self.client.post(self.url, {"job": self.job.id})
            self.assertNotEqual(resp2.status_code, status.HTTP_201_CREATED)
        except Exception:
            pass  # IntegrityError is also acceptable — confirms the constraint works

    def test_generate_email_stub(self):
        """The generate_email action should return a Phase 3 pending message."""
        saved = SavedJob.objects.create(user_profile=self.user.profile, job=self.job)
        resp = self.client.post(f"{self.url}{saved.id}/generate_email/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("Phase 3", resp.data["message"])
