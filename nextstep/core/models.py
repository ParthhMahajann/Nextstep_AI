from django.db import models

class Job(models.Model):
    JOB_TYPES = [
        ('job', 'Job'),
        ('internship', 'Internship'),
        ('freelance', 'Freelance'),
        ('part-time', 'Part-time'),
        ('contract', 'Contract'),
        
    ]

    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    job_type = models.CharField(max_length=20, choices=JOB_TYPES)
    apply_link = models.URLField()
    source = models.CharField(max_length=100)
    scraped_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} at {self.company}"
