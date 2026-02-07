from django.shortcuts import render
from .models import Job

def job_list(request):
    jobs = Job.objects.order_by("scraped_at")[:50]
    return render(request, "core/job_list.html", {"jobs": jobs})
