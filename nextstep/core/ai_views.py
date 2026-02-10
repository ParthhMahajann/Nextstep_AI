"""
AI views for NextStep AI.

Provides API endpoints for AI-powered features.
"""

import sys
from pathlib import Path

# Add ai_engine to path
AI_ENGINE_PATH = Path(__file__).resolve().parent.parent.parent / 'ai_engine'
if str(AI_ENGINE_PATH) not in sys.path:
    sys.path.insert(0, str(AI_ENGINE_PATH))

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Job
from .ai_serializers import (
    EmailGenerationSerializer,
    EmailResponseSerializer,
    ResumeAnalysisSerializer,
    ResumeAnalysisResponseSerializer,
    CoverLetterSerializer,
    ApplicationTipsSerializer,
)


class GenerateEmailView(APIView):
    """Generate cold outreach email for a job application."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = EmailGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get job details
        job = None
        if data.get('job_id'):
            try:
                job = Job.objects.get(id=data['job_id'])
            except Job.DoesNotExist:
                return Response(
                    {'error': 'Job not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        job_title = job.title if job else data.get('job_title', '')
        company = job.company if job else data.get('company', '')
        description = job.description if job else data.get('job_description', '')
        
        # Get user info
        user = request.user
        profile = user.profile
        user_skills = list(profile.skills.values_list('skill__name', flat=True))
        
        try:
            from groq_service import get_ai_service
            ai_service = get_ai_service()
            
            email_draft = ai_service.generate_cold_email(
                job_title=job_title,
                company=company,
                job_description=description,
                user_name=f"{user.first_name} {user.last_name}".strip() or user.username,
                user_skills=user_skills,
                user_experience=profile.bio or "",
                tone=data.get('tone', 'professional')
            )
            
            response_serializer = EmailResponseSerializer({
                'subject': email_draft.subject,
                'body': email_draft.body,
                'tone': email_draft.tone,
                'word_count': email_draft.word_count,
            })
            
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'AI service error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalyzeResumeView(APIView):
    """Analyze resume and provide feedback. Supports file upload (PDF/DOCX) or text input."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        resume_text = None
        
        # Check if a file was uploaded
        if 'resume_file' in request.FILES:
            from .file_utils import extract_resume_text
            
            uploaded_file = request.FILES['resume_file']
            try:
                resume_text = extract_resume_text(
                    file=uploaded_file,
                    content_type=uploaded_file.content_type,
                    filename=uploaded_file.name
                )
            except ValueError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Fall back to text input
            resume_text = request.data.get('resume_text', '')
        
        if not resume_text or not resume_text.strip():
            return Response(
                {'error': 'Please provide a resume file or text'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get job details if provided
        job_description = request.data.get('job_description', '')
        job_title = request.data.get('job_title', '')
        job_id = request.data.get('job_id')
        
        if job_id:
            try:
                job = Job.objects.get(id=int(job_id))
                job_description = job.description
                job_title = job.title
            except (Job.DoesNotExist, ValueError):
                pass
        
        try:
            from groq_service import get_ai_service
            ai_service = get_ai_service()
            
            analysis = ai_service.analyze_resume(
                resume_text=resume_text,
                job_description=job_description,
                job_title=job_title
            )
            
            response_serializer = ResumeAnalysisResponseSerializer({
                'strengths': analysis.strengths,
                'improvements': analysis.improvements,
                'keywords_found': analysis.keywords_found,
                'keywords_missing': analysis.keywords_missing,
                'match_score': analysis.match_score,
                'suggestions': analysis.suggestions,
            })
            
            return Response(response_serializer.data)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'AI service error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateCoverLetterView(APIView):
    """Generate cover letter for a job application."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = CoverLetterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get job details
        job = None
        if data.get('job_id'):
            try:
                job = Job.objects.get(id=data['job_id'])
            except Job.DoesNotExist:
                return Response(
                    {'error': 'Job not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        job_title = job.title if job else data.get('job_title', '')
        company = job.company if job else data.get('company', '')
        description = job.description if job else data.get('job_description', '')
        
        # Get user info
        user = request.user
        profile = user.profile
        user_skills = list(profile.skills.values_list('skill__name', flat=True))
        
        try:
            from groq_service import get_ai_service
            ai_service = get_ai_service()
            
            cover_letter = ai_service.generate_cover_letter(
                job_title=job_title,
                company=company,
                job_description=description,
                user_name=f"{user.first_name} {user.last_name}".strip() or user.username,
                user_skills=user_skills,
                user_experience=profile.bio or ""
            )
            
            return Response({'cover_letter': cover_letter})
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'AI service error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ApplicationTipsView(APIView):
    """Get tips for applying to a specific job."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ApplicationTipsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get job details
        job = None
        if data.get('job_id'):
            try:
                job = Job.objects.get(id=data['job_id'])
            except Job.DoesNotExist:
                return Response(
                    {'error': 'Job not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        job_title = job.title if job else data.get('job_title', '')
        company = job.company if job else data.get('company', '')
        description = job.description if job else data.get('job_description', '')
        
        try:
            from groq_service import get_ai_service
            ai_service = get_ai_service()
            
            tips = ai_service.get_application_tips(
                job_title=job_title,
                company=company,
                job_description=description
            )
            
            return Response({'tips': tips})
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'AI service error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
