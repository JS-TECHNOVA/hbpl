from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0024_volunteer_description"),
    ]

    operations = [
        migrations.AddField(
            model_name="player",
            name="is_vice_captain",
            field=models.BooleanField(default=False),
        ),
    ]
