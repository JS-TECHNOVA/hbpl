from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_examsettings_alter_examregistration_roll_number"),
    ]

    operations = [
        migrations.AddField(
            model_name="examregistration",
            name="father_name",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="examregistration",
            name="mother_name",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
