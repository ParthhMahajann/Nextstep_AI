"""
Tests for AI views: Resume Analysis with job-tailored suggestions.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Job, SavedJob
from .helpers import create_test_user, create_test_job, get_auth_client


def _make_fake_analysis(with_job_suggestions=False):
    """Return a mock ResumeAnalysis object."""
    analysis = MagicMock()
    analysis.strengths = ["Strong Python skills", "Good project experience"]
    analysis.improvements = ["Add quantifiable metrics", "Tailor summary to role"]
    analysis.keywords_found = ["Python", "Django"]
    analysis.keywords_missing = ["Docker", "Kubernetes"]
    analysis.match_score = 0.72
    analysis.suggestions = "Focus on highlighting your Python projects more prominently."
    analysis.job_tailored_suggestions = (
        [
            "In your Experience section, add a quantified impact metric to each bullet point.",
            "Move 'Docker' under your Skills section — it is listed as a key requirement.",
            "Rename your project 'Web App' to a more descriptive title that includes the tech stack.",
        ]
        if with_job_suggestions
        else []
    )
    return analysis


class ResumeAnalysisGeneralTest(TestCase):
    """Tests for POST /api/ai/analyze-resume/ — general analysis (no job)."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/ai/analyze-resume/"

    @patch("groq_service.get_ai_service")
    def test_general_analysis_returns_expected_fields(self, mock_get_service):
        """A general analysis (no job) should return core fields plus empty job_tailored_suggestions."""
        mock_service = MagicMock()
        mock_service.analyze_resume.return_value = _make_fake_analysis(with_job_suggestions=False)
        mock_get_service.return_value = mock_service

        response = self.client.post(
            self.url,
            {"resume_text": "Python developer with 3 years of Django experience."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("strengths", data)
        self.assertIn("improvements", data)
        self.assertIn("keywords_found", data)
        self.assertIn("keywords_missing", data)
        self.assertIn("match_score", data)
        self.assertIn("suggestions", data)
        self.assertIn("job_tailored_suggestions", data)
        self.assertEqual(data["job_tailored_suggestions"], [])

    def test_analysis_requires_auth(self):
        """Unauthenticated requests should be rejected."""
        unauthenticated = APIClient()
        response = unauthenticated.post(
            self.url,
            {"resume_text": "Some resume text"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_analysis_without_resume_text_returns_400(self):
        """Missing resume text should return 400 without calling the AI service."""
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ResumeAnalysisJobTargetedTest(TestCase):
    """Tests for POST /api/ai/analyze-resume/ — job-targeted analysis."""

    def setUp(self):
        self.user = create_test_user()
        self.client = get_auth_client(self.user)
        self.url = "/api/ai/analyze-resume/"
        self.job = create_test_job(
            title="Backend Engineer",
            company="TechCorp",
            description=(
                "We are looking for a backend engineer with strong Python, Django, Docker, "
                "and Kubernetes skills. Experience with REST APIs required."
            ),
        )
        # Save the job so the user 'has' it (not strictly required for this endpoint but realistic)
        SavedJob.objects.create(user_profile=self.user.profile, job=self.job)

    @patch("groq_service.get_ai_service")
    def test_job_targeted_analysis_returns_suggestions(self, mock_get_service):
        """When job_id is provided, job_tailored_suggestions should be a non-empty list."""
        mock_service = MagicMock()
        mock_service.analyze_resume.return_value = _make_fake_analysis(with_job_suggestions=True)
        mock_get_service.return_value = mock_service

        response = self.client.post(
            self.url,
            {
                "resume_text": "Python developer with 3 years of Django experience.",
                "job_id": self.job.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("job_tailored_suggestions", data)
        self.assertIsInstance(data["job_tailored_suggestions"], list)
        self.assertGreater(len(data["job_tailored_suggestions"]), 0)

    @patch("groq_service.get_ai_service")
    def test_job_tailored_suggestions_contain_strings(self, mock_get_service):
        """Each item in job_tailored_suggestions should be a non-empty string."""
        mock_service = MagicMock()
        mock_service.analyze_resume.return_value = _make_fake_analysis(with_job_suggestions=True)
        mock_get_service.return_value = mock_service

        response = self.client.post(
            self.url,
            {
                "resume_text": "Python developer with 3 years of Django experience.",
                "job_id": self.job.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for suggestion in response.data["job_tailored_suggestions"]:
            self.assertIsInstance(suggestion, str)
            self.assertTrue(len(suggestion) > 0)

    @patch("groq_service.get_ai_service")
    def test_nonexistent_job_id_with_resume_text_falls_back(self, mock_get_service):
        """An invalid job_id should simply be ignored and a general analysis returned."""
        mock_service = MagicMock()
        mock_service.analyze_resume.return_value = _make_fake_analysis(with_job_suggestions=False)
        mock_get_service.return_value = mock_service

        response = self.client.post(
            self.url,
            {
                "resume_text": "Python developer with Django experience.",
                "job_id": 99999,  # does not exist
            },
            format="json",
        )

        # Should still succeed — the view falls back to general analysis when job not found
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("job_tailored_suggestions", response.data)
