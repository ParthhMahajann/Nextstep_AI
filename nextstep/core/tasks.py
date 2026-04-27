import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _render_and_send(subject, template_name, context, recipient_email):
    """Render template and send via configured email backend. Raises on failure."""
    html_message = render_to_string(template_name, context)
    plain_message = strip_tags(html_message)

    if 'console' in settings.EMAIL_BACKEND.lower():
        action_url = context.get('verification_url') or context.get('reset_url') or ''
        if action_url:
            logger.info(
                "\n\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "  📧  EMAIL (console mode) → %s\n"
                "  Subject : %s\n"
                "  ➜  ACTION URL:\n"
                "     %s\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
                recipient_email, subject, action_url,
            )

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        html_message=html_message,
        fail_silently=False,
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60, queue='api_queue')
def send_verification_email(self, user_id, verification_url):
    """Send email-verification link. Retries up to 3 times on SMTP failure."""
    from django.contrib.auth.models import User
    try:
        user = User.objects.get(id=user_id)
        _render_and_send(
            subject="Verify your NextStep AI account",
            template_name="core/email_verification.html",
            context={"user": user, "verification_url": verification_url},
            recipient_email=user.email,
        )
        logger.info("Verification email sent to %s", user.email)
    except Exception as exc:
        logger.error(
            "Verification email failed for user %s (attempt %s/%s): %s",
            user_id, self.request.retries + 1, self.max_retries + 1, exc,
        )
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, queue='api_queue')
def send_password_reset_email(self, user_id, reset_url):
    """Send password-reset link. Retries up to 3 times on SMTP failure."""
    from django.contrib.auth.models import User
    try:
        user = User.objects.get(id=user_id)
        _render_and_send(
            subject="Reset your NextStep AI password",
            template_name="core/password_reset.html",
            context={"user": user, "reset_url": reset_url},
            recipient_email=user.email,
        )
        logger.info("Password reset email sent to %s", user.email)
    except Exception as exc:
        logger.error(
            "Password reset email failed for user %s (attempt %s/%s): %s",
            user_id, self.request.retries + 1, self.max_retries + 1, exc,
        )
        raise self.retry(exc=exc)
