import logging

from rest_framework import viewsets, generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.db.models import Q

from .models import Job, Skill, UserProfile, UserSkill, SavedJob, EmailVerificationToken, PasswordResetToken
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
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

logger = logging.getLogger(__name__)


# ==================== Email Helper ====================

def _send_templated_email(subject, template_name, context, recipient_email):
    """Send an HTML email using a Django template. Fails silently in dev."""
    try:
        html_message = render_to_string(template_name, context)
        plain_message = strip_tags(html_message)
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
            return Response(
                {"detail": "Invalid verification token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_used:
            return Response(
                {"detail": "This token has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_expired():
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

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(
                token=serializer.validated_data['token']
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"detail": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_used:
            return Response(
                {"detail": "This token has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_obj.is_expired():
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
        """Get current user's profile."""
        profile = request.user.profile
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)
    
    def patch(self, request):
        """Update current user's profile."""
        profile = request.user.profile
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(profile).data)
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
        
        user_profile = request.user.profile
        matching_service = get_matching_service()
        
        # Get ML-ranked jobs
        ranked_jobs = matching_service.get_recommended_jobs(
            user_profile=user_profile,
            queryset=self.get_queryset(),
            limit=50
        )
        
        # Return with match scores
        return Response({
            'count': len(ranked_jobs),
            'results': ranked_jobs
        })
    
    @action(detail=True, methods=['get'])
    def match_score(self, request, pk=None):
        """Get detailed match score for a specific job."""
        from .matching import get_matching_service
        
        job = self.get_object()
        user_profile = request.user.profile
        matching_service = get_matching_service()
        
        match_info = matching_service.compute_job_match(
            user_profile=user_profile,
            job=job
        )
        
        return Response({
            'job_id': job.id,
            'job_title': job.title,
            **match_info
        })


# ==================== Saved Job Views ====================

class SavedJobViewSet(viewsets.ModelViewSet):
    """Manage saved jobs for the current user."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SavedJob.objects.filter(user_profile=self.request.user.profile)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SavedJobCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SavedJobUpdateSerializer
        return SavedJobSerializer
    
    def perform_create(self, serializer):
        serializer.save(user_profile=self.request.user.profile)
    
    @action(detail=True, methods=['post'])
    def generate_email(self, request, pk=None):
        """Generate AI email draft for a saved job."""
        # Placeholder for Phase 3 - AI email generation
        saved_job = self.get_object()
        return Response({
            'message': 'Email generation will be implemented in Phase 3',
            'job_title': saved_job.job.title,
            'status': 'pending'
        })
