from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_examregistration_father_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="examregistration",
            name="examination_center",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="examregistration",
            name="center_address",
            field=models.TextField(blank=True),
        ),
    ]
