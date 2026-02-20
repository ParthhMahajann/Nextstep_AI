"""
Shared test fixtures and helpers for the core app test suite.
"""
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Skill, UserProfile, UserSkill, Job, SavedJob


def get_auth_client(user):
    """Return an APIClient authenticated with JWT for the given user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


def create_test_user(username="testuser", email="test@example.com", password="TestPass123!"):
    """Create and return a test user (profile auto-created via signal)."""
    return User.objects.create_user(username=username, email=email, password=password)


def create_test_skill(name="Python", category="programming"):
    """Create and return a test skill."""
    return Skill.objects.create(name=name, category=category)


def create_test_job(**kwargs):
    """Create and return a test job with sensible defaults."""
    defaults = {
        "title": "Software Engineer",
        "company": "TestCorp",
        "description": "Build and maintain web applications using Python and Django.",
        "job_type": "job",
        "apply_link": "https://example.com/apply",
        "source": "test",
        "location": "Remote",
    }
    defaults.update(kwargs)
    return Job.objects.create(**defaults)
