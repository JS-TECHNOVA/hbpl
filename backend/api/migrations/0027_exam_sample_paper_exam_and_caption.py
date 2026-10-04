import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0026_examregistration_admit_card_email_last_error_and_more"),
        ("exams", "0011_applicationevent_notification_email_status"),
    ]

    operations = [
        migrations.RenameField(
            model_name="examsamplepaper",
            old_name="description",
            new_name="caption",
        ),
        migrations.AlterField(
            model_name="examsamplepaper",
            name="class_name",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="examsamplepaper",
            name="exam",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sample_papers",
                to="exams.exam",
            ),
        ),
    ]
