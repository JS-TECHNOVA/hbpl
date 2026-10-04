from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0010_examapplication_application_confirmation_email_last_error_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="applicationevent",
            name="notification_email_last_error",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="applicationevent",
            name="notification_email_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
