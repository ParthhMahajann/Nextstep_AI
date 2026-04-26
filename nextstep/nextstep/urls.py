"""
URL configuration for NextStep AI project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.conf.urls.static import static


def serve_spa(request, path=''):
    index = settings.FRONTEND_DIST_DIR / 'index.html'
    if not index.exists():
        return JsonResponse(
            {"error": "Frontend not built. Run: npm run build inside /frontend"},
            status=503,
        )
    return HttpResponse(index.read_text(encoding='utf-8'), content_type='text/html; charset=utf-8')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    re_path(r'^(?!api/|admin/).*$', serve_spa),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
