from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_savedjob_new_fields_resumeversion'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='liked_embedding',
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='SwipeEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('skip', 'Skip'), ('save', 'Save'), ('apply', 'Apply')], max_length=10)),
                ('card_position', models.PositiveIntegerField(default=0)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('job', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='swipe_events', to='core.job')),
                ('user_profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='swipe_events', to='core.userprofile')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['user_profile', 'action'], name='core_swipee_user_pr_idx'),
                    models.Index(fields=['timestamp'], name='core_swipee_timesta_idx'),
                ],
            },
        ),
    ]
