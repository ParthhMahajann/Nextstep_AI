"""
Tests for authentication flow: register, login, token refresh, current user.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .helpers import create_test_user


class RegisterAPITests(TestCase):
    """Tests for POST /api/auth/register/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/register/"

    def test_register_success(self):
        resp = self.client.post(self.url, {
            "username": "newuser",
            "email": "new@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["username"], "newuser")
        self.assertNotIn("password", resp.data)

    def test_register_password_mismatch(self):
        resp = self.client.post(self.url, {
            "username": "newuser",
            "email": "new@example.com",
            "password": "StrongPass123!",
            "password_confirm": "WrongPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username(self):
        create_test_user(username="taken")
        resp = self.client.post(self.url, {
            "username": "taken",
            "email": "other@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        resp = self.client.post(self.url, {"username": "incomplete"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_creates_profile(self):
        """Registration should auto-create a UserProfile via signal."""
        resp = self.client.post(self.url, {
            "username": "profileuser",
            "email": "profile@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        from django.contrib.auth.models import User
        user = User.objects.get(username="profileuser")
        self.assertTrue(hasattr(user, "profile"))


class LoginAPITests(TestCase):
    """Tests for POST /api/auth/login/ (JWT token obtain)."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/login/"
        self.user = create_test_user()

    def test_login_success(self):
        resp = self.client.post(self.url, {
            "username": "testuser",
            "password": "TestPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)

    def test_login_wrong_password(self):
        resp = self.client.post(self.url, {
            "username": "testuser",
            "password": "WrongPassword!",
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        resp = self.client.post(self.url, {
            "username": "ghost",
            "password": "NoUser123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshAPITests(TestCase):
    """Tests for POST /api/auth/refresh/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/refresh/"
        self.user = create_test_user()

    def _get_tokens(self):
        resp = self.client.post("/api/auth/login/", {
            "username": "testuser",
            "password": "TestPass123!",
        })
        return resp.data

    def test_refresh_success(self):
        tokens = self._get_tokens()
        resp = self.client.post(self.url, {"refresh": tokens["refresh"]})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)

    def test_refresh_invalid_token(self):
        resp = self.client.post(self.url, {"refresh": "invalid-token"})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class CurrentUserAPITests(TestCase):
    """Tests for GET /api/auth/me/."""

    def setUp(self):
        self.url = "/api/auth/me/"
        self.user = create_test_user()

    def test_get_current_user_authenticated(self):
        from .helpers import get_auth_client
        client = get_auth_client(self.user)
        resp = client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["username"], "testuser")
        self.assertEqual(resp.data["email"], "test@example.com")

    def test_get_current_user_unauthenticated(self):
        client = APIClient()
        resp = client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
