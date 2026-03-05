"""
Tests for authentication flow: register, login, token refresh, current user,
email verification, and password reset.
"""
import uuid
from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User

from core.models import EmailVerificationToken, PasswordResetToken
from .helpers import create_test_user


# Override email backend to prevent actual sending during tests
@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
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

    def test_register_sets_user_inactive(self):
        """Newly registered users should be inactive until email is verified."""
        self.client.post(self.url, {
            "username": "inactiveuser",
            "email": "inactive@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        })
        user = User.objects.get(username="inactiveuser")
        self.assertFalse(user.is_active)

    def test_register_creates_verification_token(self):
        """Registration should create an EmailVerificationToken."""
        self.client.post(self.url, {
            "username": "tokenuser",
            "email": "token@example.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        })
        user = User.objects.get(username="tokenuser")
        self.assertTrue(
            EmailVerificationToken.objects.filter(user=user).exists()
        )

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

    def test_login_inactive_user_rejected(self):
        """Inactive users (unverified email) should not be able to log in."""
        self.user.is_active = False
        self.user.save()
        resp = self.client.post(self.url, {
            "username": "testuser",
            "password": "TestPass123!",
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


# ==================== Email Verification Tests ====================

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class VerifyEmailAPITests(TestCase):
    """Tests for POST /api/auth/verify-email/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/verify-email/"
        self.user = User.objects.create_user(
            username="unverified", email="unverified@example.com",
            password="TestPass123!", is_active=False,
        )
        self.token_obj = EmailVerificationToken.objects.create(user=self.user)

    def test_verify_email_success(self):
        resp = self.client.post(self.url, {"token": str(self.token_obj.token)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.token_obj.refresh_from_db()
        self.assertTrue(self.token_obj.is_used)

    def test_verify_email_invalid_token(self):
        resp = self.client.post(self.url, {"token": str(uuid.uuid4())})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_email_used_token(self):
        self.token_obj.is_used = True
        self.token_obj.save()
        resp = self.client.post(self.url, {"token": str(self.token_obj.token)})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been used", resp.data["detail"])

    def test_verify_email_expired_token(self):
        # Manually set created_at to 25 hours ago
        EmailVerificationToken.objects.filter(pk=self.token_obj.pk).update(
            created_at=timezone.now() - timedelta(hours=25)
        )
        resp = self.client.post(self.url, {"token": str(self.token_obj.token)})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", resp.data["detail"])


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ResendVerificationAPITests(TestCase):
    """Tests for POST /api/auth/resend-verification/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/resend-verification/"
        self.user = User.objects.create_user(
            username="unverified", email="unverified@example.com",
            password="TestPass123!", is_active=False,
        )

    def test_resend_creates_new_token(self):
        # Create an initial token
        old_token = EmailVerificationToken.objects.create(user=self.user)
        resp = self.client.post(self.url, {"email": "unverified@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Old token should be deleted, new one created
        self.assertFalse(EmailVerificationToken.objects.filter(pk=old_token.pk).exists())
        self.assertTrue(EmailVerificationToken.objects.filter(user=self.user).exists())

    def test_resend_unknown_email_returns_200(self):
        """Should not reveal whether the email exists (anti-enumeration)."""
        resp = self.client.post(self.url, {"email": "nobody@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_resend_active_user_returns_200(self):
        """Active users should get a generic 200 without creating a token."""
        active_user = create_test_user(username="active", email="active@example.com")
        resp = self.client.post(self.url, {"email": "active@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(EmailVerificationToken.objects.filter(user=active_user).exists())


# ==================== Password Reset Tests ====================

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetRequestAPITests(TestCase):
    """Tests for POST /api/auth/password-reset/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/password-reset/"
        self.user = create_test_user()

    def test_request_creates_token(self):
        resp = self.client.post(self.url, {"email": "test@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())

    def test_request_unknown_email_returns_200(self):
        """Should not reveal whether the email exists (anti-enumeration)."""
        resp = self.client.post(self.url, {"email": "nobody@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_request_replaces_old_token(self):
        old_token = PasswordResetToken.objects.create(user=self.user)
        resp = self.client.post(self.url, {"email": "test@example.com"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(PasswordResetToken.objects.filter(pk=old_token.pk).exists())
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class PasswordResetConfirmAPITests(TestCase):
    """Tests for POST /api/auth/password-reset/confirm/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/password-reset/confirm/"
        self.user = create_test_user()
        self.token_obj = PasswordResetToken.objects.create(user=self.user)

    def test_reset_password_success(self):
        new_password = "NewStrong456!"
        resp = self.client.post(self.url, {
            "token": str(self.token_obj.token),
            "password": new_password,
            "password_confirm": new_password,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        self.token_obj.refresh_from_db()
        self.assertTrue(self.token_obj.is_used)

    def test_reset_password_mismatch(self):
        resp = self.client.post(self.url, {
            "token": str(self.token_obj.token),
            "password": "NewStrong456!",
            "password_confirm": "Different789!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_invalid_token(self):
        resp = self.client.post(self.url, {
            "token": str(uuid.uuid4()),
            "password": "NewStrong456!",
            "password_confirm": "NewStrong456!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password_used_token(self):
        self.token_obj.is_used = True
        self.token_obj.save()
        resp = self.client.post(self.url, {
            "token": str(self.token_obj.token),
            "password": "NewStrong456!",
            "password_confirm": "NewStrong456!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been used", resp.data["detail"])

    def test_reset_password_expired_token(self):
        # Manually set created_at to 2 hours ago
        PasswordResetToken.objects.filter(pk=self.token_obj.pk).update(
            created_at=timezone.now() - timedelta(hours=2)
        )
        resp = self.client.post(self.url, {
            "token": str(self.token_obj.token),
            "password": "NewStrong456!",
            "password_confirm": "NewStrong456!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", resp.data["detail"])

