from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_job_unique_together_savedjob_set_null'),
    ]

    operations = [
        migrations.AddField(
            model_name='savedjob',
            name='cover_letter',
            field=models.TextField(blank=True, help_text='AI-generated cover letter'),
        ),
        migrations.AddField(
            model_name='savedjob',
            name='interview_date',
            field=models.DateTimeField(blank=True, null=True, help_text='Scheduled interview date/time'),
        ),
        migrations.AddField(
            model_name='savedjob',
            name='interview_notes',
            field=models.TextField(blank=True, help_text='Notes from interview'),
        ),
        migrations.AddField(
            model_name='savedjob',
            name='follow_up_date',
            field=models.DateField(blank=True, null=True, help_text='Reminder to follow up'),
        ),
        migrations.CreateModel(
            name='ResumeVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, help_text="e.g. 'Frontend Resume', 'ML Resume'")),
                ('content', models.TextField(help_text='Resume text content')),
                ('target_role', models.CharField(blank=True, max_length=100, help_text='Target job role')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resume_versions',
                    to='core.userprofile',
                )),
            ],
            options={
                'ordering': ['-updated_at'],
            },
        ),
    ]
