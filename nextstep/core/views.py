import logging

from rest_framework import viewsets, generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.db.models import Q

from django.db.models import Count, Q
from .models import Job, Skill, UserProfile, UserSkill, SavedJob, ResumeVersion, EmailVerificationToken, PasswordResetToken, SwipeEvent
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    SkillSerializer,
    UserSkillSerializer,
    UserSkillCreateSerializer,
    JobListSerializer,
    JobDetailSerializer,
    JobWithMatchSerializer,
    SavedJobSerializer,
    SavedJobCreateSerializer,
    SavedJobUpdateSerializer,
    ResumeVersionSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

logger = logging.getLogger(__name__)


# ==================== Custom Throttles ====================

class AuthRateThrottle(AnonRateThrottle):
    """Strict throttle for unauthenticated auth endpoints (register, password reset)."""
    scope = 'auth'


class AIRateThrottle(UserRateThrottle):
    """Throttle for AI endpoints to prevent LLM token abuse."""
    scope = 'ai'


# ==================== Email Helper ====================

def _send_templated_email(subject, template_name, context, recipient_email):
    """
    Send an HTML email using a Django template.
    - SMTP mode  : sends a real email (requires EMAIL_HOST_USER/PASSWORD in .env)
    - Console mode: prints email to terminal AND logs the action URL so devs can
                    test the flow without needing real credentials.
    """
    try:
        html_message = render_to_string(template_name, context)
        plain_message = strip_tags(html_message)

        # ── Pretty-print the action URL in non-SMTP mode for easy testing ──
        from django.conf import settings as _s
        if 'console' in _s.EMAIL_BACKEND.lower():
            action_url = context.get('verification_url') or context.get('reset_url') or ''
            if action_url:
                logger.info(
                    "\n\n"
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"  📧  EMAIL (console mode) → {recipient_email}\n"
                    f"  Subject : {subject}\n"
                    f"  ➜  ACTION URL:\n"
                    f"     {action_url}\n"
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                )

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")



# ==================== Auth Views ====================

class RegisterView(generics.CreateAPIView):
    """User registration endpoint. Sets user inactive until email is verified."""

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def perform_create(self, serializer):
        user = serializer.save()
        user.is_active = False
        user.save(update_fields=['is_active'])

        # Create verification token and send email
        token_obj = EmailVerificationToken.objects.create(user=user)
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token_obj.token}"
        _send_templated_email(
            subject="Verify your NextStep AI account",
            template_name="core/email_verification.html",
            context={"user": user, "verification_url": verification_url},
            recipient_email=user.email,
        )


class CurrentUserView(APIView):
    """Get current authenticated user details."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class LogoutView(APIView):
    """Blacklist the refresh token to log the user out."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError

        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Invalid or already blacklisted token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Successfully logged out.'})


class VerifyEmailView(APIView):
    """Verify user email with the token sent during registration."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token_obj = EmailVerificationToken.objects.select_related('user').get(
                token=serializer.validated_data['token']
            )
        except EmailVerificationToken.DoesNotExist:
            logger.warning("Email verification attempted with invalid token")
            return Response(
                {"detail": "Invalid verification token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_used:
            logger.warning("Email verification attempted with already-used token for user %s", token_obj.user_id)
            return Response(
                {"detail": "This token has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_expired():
            logger.warning("Email verification attempted with expired token for user %s", token_obj.user_id)
            return Response(
                {"detail": "This token has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Activate the user
        user = token_obj.user
        user.is_active = True
        user.save(update_fields=['is_active'])
        token_obj.is_used = True
        token_obj.save(update_fields=['is_used'])

        return Response({"detail": "Email verified successfully. You can now log in."})


class ResendVerificationView(APIView):
    """Resend a verification email for an inactive user."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email=email, is_active=False)
        except User.DoesNotExist:
            return Response({"detail": "If that email is registered, a verification link has been sent."})

        # Delete old token and create a new one
        EmailVerificationToken.objects.filter(user=user).delete()
        token_obj = EmailVerificationToken.objects.create(user=user)

        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token_obj.token}"
        _send_templated_email(
            subject="Verify your NextStep AI account",
            template_name="core/email_verification.html",
            context={"user": user, "verification_url": verification_url},
            recipient_email=user.email,
        )

        return Response({"detail": "If that email is registered, a verification link has been sent."})


class PasswordResetRequestView(APIView):
    """Request a password reset email."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "If that email is registered, a password reset link has been sent."})

        # Delete old token and create a new one
        PasswordResetToken.objects.filter(user=user).delete()
        token_obj = PasswordResetToken.objects.create(user=user)

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token_obj.token}"
        _send_templated_email(
            subject="Reset your NextStep AI password",
            template_name="core/password_reset.html",
            context={"user": user, "reset_url": reset_url},
            recipient_email=user.email,
        )

        return Response({"detail": "If that email is registered, a password reset link has been sent."})


class PasswordResetConfirmView(APIView):
    """Confirm password reset using the token and set a new password."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(
                token=serializer.validated_data['token']
            )
        except PasswordResetToken.DoesNotExist:
            logger.warning("Password reset attempted with invalid token")
            return Response(
                {"detail": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_used:
            logger.warning("Password reset attempted with already-used token for user %s", token_obj.user_id)
            return Response(
                {"detail": "This token has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_expired():
            logger.warning("Password reset attempted with expired token for user %s", token_obj.user_id)
            return Response(
                {"detail": "This token has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Set the new password
        user = token_obj.user
        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])
        token_obj.is_used = True
        token_obj.save(update_fields=['is_used'])

        return Response({"detail": "Password reset successfully. You can now log in."})




# ==================== Profile Views ====================

class ProfileView(APIView):
    """User profile management."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's profile, auto-creating it if missing."""
        profile, _ = (
            UserProfile.objects
            .select_related('user')
            .prefetch_related('skills__skill')
            .get_or_create(user=request.user)
        )
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user's profile. Supports multipart/form-data for resume_file."""
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        # Pass request.FILES so resume_file upload works with multipart requests
        serializer = UserProfileUpdateSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if serializer.is_valid():
            serializer.save()
            # Re-fetch with proper relations so the response serializer
            # doesn't trigger N+1 queries on skills.
            updated_profile = (
                UserProfile.objects
                .select_related('user')
                .prefetch_related('skills__skill')
                .get(pk=profile.pk)
            )
            return Response(UserProfileSerializer(updated_profile, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserSkillViewSet(viewsets.ModelViewSet):
    """Manage user skills."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserSkill.objects.filter(user_profile=self.request.user.profile)
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserSkillCreateSerializer
        return UserSkillSerializer
    
    def perform_create(self, serializer):
        serializer.save(user_profile=self.request.user.profile)


# ==================== Skill Views ====================

class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only skill listing."""
    
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category']


# ==================== Job Views ====================

class JobViewSet(viewsets.ReadOnlyModelViewSet):
    """Job listing and details - read-only."""
    
    queryset = Job.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['job_type', 'source', 'location']
    search_fields = ['title', 'company', 'description']
    ordering_fields = ['scraped_at', 'title', 'company']
    ordering = ['-scraped_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobListSerializer
    
    @action(detail=False, methods=['get'])
    def recommended(self, request):
        """Get AI-recommended jobs based on user profile and skills."""
        from .matching import get_matching_service

        try:
            user_profile = request.user.profile
            matching_service = get_matching_service()
            ranked_jobs = matching_service.get_recommended_jobs(
                user_profile=user_profile,
                queryset=self.get_queryset(),
                limit=50,
            )
        except Exception:
            logger.exception("Recommendation engine failed for user %s; falling back to recency", request.user.id)
            # Fallback: return the 50 most-recent active jobs ordered by date
            qs = self.get_queryset().order_by('-scraped_at')[:50]
            ranked_jobs = JobListSerializer(qs, many=True, context={'request': request}).data

        return Response({'count': len(ranked_jobs), 'results': ranked_jobs})

    @action(detail=True, methods=['get'])
    def match_score(self, request, pk=None):
        """Get detailed match score for a specific job."""
        from .matching import get_matching_service

        job = self.get_object()
        try:
            user_profile = request.user.profile
            matching_service = get_matching_service()
            match_info = matching_service.compute_job_match(
                user_profile=user_profile,
                job=job,
            )
        except Exception:
            logger.exception("match_score failed for job %s user %s", job.id, request.user.id)
            match_info = {'match_score': None, 'matched_skills': [], 'explanation': 'Matching unavailable'}

        return Response({'job_id': job.id, 'job_title': job.title, **match_info})

    @action(detail=True, methods=['get'])
    def skill_gap(self, request, pk=None):
        """Return skill gap analysis: user skills vs. job required/AI skills."""
        job = self.get_object()
        profile = request.user.profile

        user_skill_names = set(
            profile.skills.values_list('skill__name', flat=True)
        )

        # Combine DB required skills and AI-extracted skills
        required_db = set(job.required_skills.values_list('name', flat=True))
        required_ai = set(s.strip() for s in (job.ai_skills or []) if s.strip())
        all_required = required_db | required_ai

        matched = sorted(all_required & user_skill_names)
        missing = sorted(all_required - user_skill_names)

        match_pct = round(len(matched) / len(all_required) * 100) if all_required else 0

        return Response({
            'job_id': job.id,
            'job_title': job.title,
            'company': job.company,
            'matched_skills': matched,
            'missing_skills': missing,
            'total_required': len(all_required),
            'match_percentage': match_pct,
        })

    @action(detail=True, methods=['post'])
    def skip(self, request, pk=None):
        """Record a skip (swipe-left) event for ML feedback."""
        job = self.get_object()
        try:
            SwipeEvent.objects.create(
                user_profile=request.user.profile,
                job=job,
                action='skip',
                card_position=request.data.get('card_position', 0),
            )
        except Exception:
            logger.warning("SwipeEvent creation failed for job %s user %s", job.id, request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        """Return up to 8 jobs with embeddings most similar to this job."""
        import sys
        from pathlib import Path
        ml_path = str(Path(__file__).resolve().parent.parent.parent / 'ml_engine')
        if ml_path not in sys.path:
            sys.path.insert(0, ml_path)

        job = self.get_object()
        if not job.embedding:
            return Response({'results': []})

        try:
            from embedding_store import deserialize_embedding
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np

            target_emb = deserialize_embedding(job.embedding)

            # Already-saved job IDs to exclude
            saved_ids = set(
                SavedJob.objects.filter(user_profile=request.user.profile)
                .values_list('job_id', flat=True)
            )
            saved_ids.add(job.id)

            candidates = list(
                Job.objects.filter(is_active=True)
                .exclude(id__in=saved_ids)
                .exclude(embedding__isnull=True)
                .order_by('-scraped_at')[:500]
            )

            if not candidates:
                return Response({'results': []})

            embs = np.array([deserialize_embedding(c.embedding) for c in candidates])
            sims = cosine_similarity(target_emb.reshape(1, -1), embs)[0]
            top_indices = sims.argsort()[::-1][:8]
            top_jobs = [candidates[i] for i in top_indices]

            serializer = JobListSerializer(top_jobs, many=True, context={'request': request})
            return Response({'results': serializer.data})
        except Exception as e:
            logger.warning(f"similar jobs failed for job {job.id}: {e}")
            return Response({'results': []})


# ==================== Saved Job Views ====================

class SavedJobViewSet(viewsets.ModelViewSet):
    """Manage saved jobs for the current user."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            SavedJob.objects
            .filter(user_profile=self.request.user.profile)
            .select_related('job')
            .prefetch_related('job__required_skills')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return SavedJobCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SavedJobUpdateSerializer
        return SavedJobSerializer

    def create(self, request, *args, **kwargs):
        """
        Save a job. Uses get_or_create so swiping the same job twice
        (e.g. after a reload) updates its status instead of returning 400.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile = request.user.profile
        job = serializer.validated_data['job']
        new_status = serializer.validated_data.get('status', 'saved')
        notes = serializer.validated_data.get('notes', '')

        saved_job, created = SavedJob.objects.get_or_create(
            user_profile=profile,
            job=job,
            defaults={'status': new_status, 'notes': notes},
        )

        if not created:
            # Update fields if the record already exists
            saved_job.status = new_status
            if notes:
                saved_job.notes = notes
            saved_job.save(update_fields=['status', 'notes', 'updated_at'])

        # Record swipe event for ML feedback
        swipe_action = 'apply' if new_status in ('applied', 'interviewing', 'accepted') else 'save'
        SwipeEvent.objects.get_or_create(
            user_profile=profile,
            job=job,
            action=swipe_action,
            defaults={'card_position': 0},
        )

        response_serializer = SavedJobSerializer(saved_job, context={'request': request})
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_serializer.data, status=http_status)

    @action(detail=True, methods=['post'])
    def generate_email(self, request, pk=None):
        """Generate AI cold-outreach email for a saved job."""
        from .ai_views import GenerateEmailView

        saved_job = self.get_object()
        request._data = {**dict(request.data), 'job_id': saved_job.job_id}
        return GenerateEmailView().post(request)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Return application pipeline analytics for the current user."""
        qs = self.get_queryset()

        status_counts = {
            item['status']: item['count']
            for item in qs.values('status').annotate(count=Count('id'))
        }

        all_statuses = ['saved', 'preparing', 'applied', 'interviewing', 'rejected', 'accepted']
        pipeline = {s: status_counts.get(s, 0) for s in all_statuses}

        total = sum(pipeline.values())
        applied = pipeline['applied'] + pipeline['interviewing'] + pipeline['rejected'] + pipeline['accepted']
        interviews = pipeline['interviewing'] + pipeline['accepted']
        offers = pipeline['accepted']

        # Response rate: interviews / applied (if any)
        response_rate = round(interviews / applied * 100) if applied else 0
        offer_rate = round(offers / applied * 100) if applied else 0

        # Most common missing skills across saved jobs (from AI skills field)
        from collections import Counter
        skill_counter: Counter = Counter()
        for sj in qs.select_related('job'):
            if sj.job and sj.job.ai_skills:
                skill_counter.update(sj.job.ai_skills)

        top_skills = [{'skill': s, 'count': c} for s, c in skill_counter.most_common(10)]

        return Response({
            'total': total,
            'pipeline': pipeline,
            'applied_total': applied,
            'interviews': interviews,
            'offers': offers,
            'response_rate': response_rate,
            'offer_rate': offer_rate,
            'top_skills_in_pipeline': top_skills,
        })


# ==================== Resume Version Views ====================

class ResumeVersionViewSet(viewsets.ModelViewSet):
    """CRUD for user resume versions."""

    permission_classes = [IsAuthenticated]
    serializer_class = ResumeVersionSerializer

    def get_queryset(self):
        return ResumeVersion.objects.filter(user_profile=self.request.user.profile)

    def perform_create(self, serializer):
        serializer.save(user_profile=self.request.user.profile)


# ==================== ML Personalisation Views ====================

class SkillSuggestionsView(APIView):
    """Return skills that appear in saved jobs but not in the user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from collections import Counter
        profile = request.user.profile
        user_skills = set(profile.skills.values_list('skill__name', flat=True))

        counter: Counter = Counter()
        for sj in SavedJob.objects.filter(user_profile=profile).select_related('job'):
            if sj.job and sj.job.ai_skills:
                for skill in sj.job.ai_skills:
                    s = skill.strip()
                    if s and s.lower() not in {u.lower() for u in user_skills}:
                        counter[s] += 1

        suggestions = [
            {'skill': skill, 'frequency': count, 'message': f'Appears in {count} of your saved jobs'}
            for skill, count in counter.most_common(5)
        ]
        return Response({'suggestions': suggestions})


class TasteProfileView(APIView):
    """Return a summary of the user's inferred job taste vector."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from collections import Counter
        profile = request.user.profile
        saved = SavedJob.objects.filter(
            user_profile=profile,
            status__in=['saved', 'preparing', 'applied', 'interviewing', 'accepted'],
        ).select_related('job')

        role_counter: Counter = Counter()
        skill_counter: Counter = Counter()
        for sj in saved:
            if sj.job:
                if sj.job.role_type:
                    role_counter[sj.job.role_type] += 1
                for s in (sj.job.ai_skills or []):
                    skill_counter[s.strip()] += 1

        return Response({
            'has_taste_vector': bool(profile.liked_embedding),
            'total_saved_jobs': saved.count(),
            'preferred_role_types': [
                {'role': r, 'count': c} for r, c in role_counter.most_common(5)
            ],
            'top_skills': [s for s, _ in skill_counter.most_common(10)],
        })
