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
        """Get AI-recommended jobs based on user profile."""
        # Placeholder for ML ranking - will be implemented in Phase 2
        user_profile = request.user.profile
        
        # For now, return jobs filtered by user preferences
        jobs = self.get_queryset()
        
        # Filter by preferred job types if set
        if user_profile.preferred_job_types:
            jobs = jobs.filter(job_type__in=user_profile.preferred_job_types)
        
        # Filter by preferred locations if set
        if user_profile.preferred_locations:
            location_q = Q()
            for loc in user_profile.preferred_locations:
                location_q |= Q(location__icontains=loc)
            jobs = jobs.filter(location_q)
        
        # Get user skills for basic matching
        user_skills = user_profile.skills.values_list('skill__name', flat=True)
        if user_skills:
            skill_q = Q()
            for skill in user_skills:
                skill_q |= Q(description__icontains=skill) | Q(title__icontains=skill)
            jobs = jobs.filter(skill_q)
        
        page = self.paginate_queryset(jobs[:50])
        if page is not None:
            serializer = JobListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = JobListSerializer(jobs[:50], many=True)
        return Response(serializer.data)


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
