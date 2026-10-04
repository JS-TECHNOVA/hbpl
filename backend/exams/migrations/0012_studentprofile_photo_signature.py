from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0011_applicationevent_notification_email_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="photo",
            field=models.ImageField(blank=True, null=True, upload_to="student-profiles/photos/"),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="signature",
            field=models.ImageField(blank=True, null=True, upload_to="student-profiles/signatures/"),
        ),
    ]
