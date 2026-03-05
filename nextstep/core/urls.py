from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    RegisterView,
    CurrentUserView,
    ProfileView,
    SkillViewSet,
    UserSkillViewSet,
    JobViewSet,
    SavedJobViewSet,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

from .ai_views import (
    GenerateEmailView,
    AnalyzeResumeView,
    GenerateCoverLetterView,
    ApplicationTipsView,
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'user-skills', UserSkillViewSet, basename='user-skill')
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'saved-jobs', SavedJobViewSet, basename='saved-job')

urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Profile endpoint
    path('profile/', ProfileView.as_view(), name='profile'),
    
    # AI endpoints
    path('ai/generate-email/', GenerateEmailView.as_view(), name='generate_email'),
    path('ai/analyze-resume/', AnalyzeResumeView.as_view(), name='analyze_resume'),
    path('ai/cover-letter/', GenerateCoverLetterView.as_view(), name='cover_letter'),
    path('ai/application-tips/', ApplicationTipsView.as_view(), name='application_tips'),
    
    # Router URLs (jobs, skills, saved-jobs, user-skills)
    path('', include(router.urls)),
]