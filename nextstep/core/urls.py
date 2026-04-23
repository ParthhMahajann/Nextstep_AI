from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    RegisterView,
    CurrentUserView,
    LogoutView,
    ProfileView,
    SkillViewSet,
    UserSkillViewSet,
    JobViewSet,
    SavedJobViewSet,
    ResumeVersionViewSet,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    SkillSuggestionsView,
    TasteProfileView,
)

from .ai_views import (
    GenerateEmailView,
    AnalyzeResumeView,
    GenerateCoverLetterView,
    ApplicationTipsView,
    InterviewPrepView,
    TailorResumeView,
    CompanyResearchView,
    AIChatView,
)

router = DefaultRouter()
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'user-skills', UserSkillViewSet, basename='user-skill')
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'saved-jobs', SavedJobViewSet, basename='saved-job')
router.register(r'resume-versions', ResumeVersionViewSet, basename='resume-version')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/me/skill-suggestions/', SkillSuggestionsView.as_view(), name='skill_suggestions'),
    path('users/me/taste-profile/', TasteProfileView.as_view(), name='taste_profile'),

    # AI endpoints
    path('ai/generate-email/', GenerateEmailView.as_view(), name='generate_email'),
    path('ai/analyze-resume/', AnalyzeResumeView.as_view(), name='analyze_resume'),
    path('ai/cover-letter/', GenerateCoverLetterView.as_view(), name='cover_letter'),
    path('ai/application-tips/', ApplicationTipsView.as_view(), name='application_tips'),
    path('ai/interview-prep/', InterviewPrepView.as_view(), name='interview_prep'),
    path('ai/tailor-resume/', TailorResumeView.as_view(), name='tailor_resume'),
    path('ai/company-research/', CompanyResearchView.as_view(), name='company_research'),
    path('ai/chat/', AIChatView.as_view(), name='ai_chat'),

    # Router URLs
    path('', include(router.urls)),
]
