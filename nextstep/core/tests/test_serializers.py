"""
Tests for core serializers.
"""
from django.test import TestCase
from django.contrib.auth.models import User

from core.models import Skill, UserSkill, Job, SavedJob
from core.serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    SkillSerializer,
    UserSkillSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    JobListSerializer,
    JobDetailSerializer,
    SavedJobSerializer,
    SavedJobCreateSerializer,
)
from .helpers import create_test_user, create_test_skill, create_test_job


# ==================== Auth Serializers ====================

class UserRegistrationSerializerTests(TestCase):
    """Tests for user registration validation and creation."""

    def get_valid_data(self, **overrides):
        data = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        data.update(overrides)
        return data

    def test_valid_registration(self):
        serializer = UserRegistrationSerializer(data=self.get_valid_data())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.username, "newuser")
        self.assertEqual(user.email, "new@example.com")
        self.assertTrue(user.check_password("StrongPass123!"))

    def test_password_mismatch(self):
        data = self.get_valid_data(password_confirm="WrongPass123!")
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_weak_password(self):
        data = self.get_valid_data(password="123", password_confirm="123")
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_missing_email(self):
        data = self.get_valid_data()
        data.pop("email")
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_duplicate_username(self):
        create_test_user(username="newuser")
        serializer = UserRegistrationSerializer(data=self.get_valid_data())
        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)

    def test_password_not_in_output(self):
        serializer = UserRegistrationSerializer(data=self.get_valid_data())
        serializer.is_valid()
        user = serializer.save()
        output = UserSerializer(user).data
        self.assertNotIn("password", output)
        self.assertNotIn("password_confirm", output)


# ==================== Skill Serializer ====================

class SkillSerializerTests(TestCase):

    def test_serialize_skill(self):
        skill = create_test_skill(name="Python", category="programming")
        data = SkillSerializer(skill).data
        self.assertEqual(data["name"], "Python")
        self.assertEqual(data["category"], "programming")
        self.assertIn("id", data)


# ==================== Profile Serializer ====================

class UserProfileSerializerTests(TestCase):

    def test_serialize_profile(self):
        user = create_test_user()
        data = UserProfileSerializer(user.profile).data
        self.assertEqual(data["user"]["username"], "testuser")
        self.assertEqual(data["bio"], "")
        self.assertEqual(data["skill_count"], 0)
        self.assertIn("created_at", data)

    def test_profile_includes_skills(self):
        user = create_test_user()
        skill = create_test_skill()
        UserSkill.objects.create(user_profile=user.profile, skill=skill, proficiency=3)
        data = UserProfileSerializer(user.profile).data
        self.assertEqual(len(data["skills"]), 1)
        self.assertEqual(data["skills"][0]["skill"]["name"], "Python")
        self.assertEqual(data["skills"][0]["proficiency"], 3)


class UserProfileUpdateSerializerTests(TestCase):

    def test_update_bio(self):
        user = create_test_user()
        serializer = UserProfileUpdateSerializer(
            user.profile, data={"bio": "New bio"}, partial=True
        )
        self.assertTrue(serializer.is_valid())
        serializer.save()
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.bio, "New bio")

    def test_update_preferences(self):
        user = create_test_user()
        serializer = UserProfileUpdateSerializer(
            user.profile,
            data={"preferred_job_types": ["job", "internship"], "preferred_locations": ["Remote"]},
            partial=True,
        )
        self.assertTrue(serializer.is_valid())
        serializer.save()
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.preferred_job_types, ["job", "internship"])


# ==================== Job Serializers ====================

class JobSerializerTests(TestCase):

    def test_list_serializer_fields(self):
        job = create_test_job()
        data = JobListSerializer(job).data
        self.assertIn("title", data)
        self.assertIn("job_type_display", data)
        self.assertNotIn("description", data)  # list view should not include description

    def test_detail_serializer_includes_description(self):
        job = create_test_job()
        data = JobDetailSerializer(job).data
        self.assertIn("description", data)
        self.assertIn("apply_link", data)

    def test_detail_serializer_includes_skills(self):
        job = create_test_job()
        skill = create_test_skill()
        job.required_skills.add(skill)
        data = JobDetailSerializer(job).data
        self.assertEqual(len(data["required_skills"]), 1)
        self.assertEqual(data["required_skills"][0]["name"], "Python")


# ==================== SavedJob Serializers ====================

class SavedJobSerializerTests(TestCase):

    def test_serialize_saved_job(self):
        user = create_test_user()
        job = create_test_job()
        saved = SavedJob.objects.create(user_profile=user.profile, job=job)
        data = SavedJobSerializer(saved).data
        self.assertEqual(data["status"], "saved")
        self.assertEqual(data["status_display"], "Saved")
        self.assertEqual(data["job"]["title"], "Software Engineer")

    def test_create_serializer_fields(self):
        job = create_test_job()
        serializer = SavedJobCreateSerializer(data={"job": job.id, "notes": "Great fit"})
        self.assertTrue(serializer.is_valid(), serializer.errors)
