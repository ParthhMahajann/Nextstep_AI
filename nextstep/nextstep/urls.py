"""
URL configuration for NextStep AI project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def api_root(request):
    """Root endpoint showing API info."""
    return JsonResponse({
        "name": "NextStep AI API",
        "version": "1.0",
        "endpoints": {
            "auth": "/api/auth/",
            "profile": "/api/profile/",
            "jobs": "/api/jobs/",
            "skills": "/api/skills/",
            "saved_jobs": "/api/saved-jobs/",
            "admin": "/admin/"
        }
    })


urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
]

