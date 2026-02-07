from rest_framework import viewsets, generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User
from django.db.models import Q

from .models import Job, Skill, UserProfile, UserSkill, SavedJob
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
)


# ==================== Auth Views ====================

class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]


class CurrentUserView(APIView):
    """Get current authenticated user details."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


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
