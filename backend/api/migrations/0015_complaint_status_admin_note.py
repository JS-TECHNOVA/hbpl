from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_delete_team_teamregistration_team_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='complaint',
            name='status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('under_review', 'Under Review'), ('resolved', 'Resolved')],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='complaint',
            name='admin_note',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
    ]
