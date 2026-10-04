import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0013_delete_rankholder"),
    ]

    operations = [
        migrations.AlterField(
            model_name="examresult",
            name="registration",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="results",
                to="api.examregistration",
            ),
        ),
        migrations.AddConstraint(
            model_name="examresult",
            constraint=models.UniqueConstraint(
                fields=("exam", "registration"),
                name="unique_legacy_registration_exam_result",
            ),
        ),
    ]
