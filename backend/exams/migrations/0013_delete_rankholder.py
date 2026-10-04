from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0012_studentprofile_photo_signature"),
    ]

    operations = [
        migrations.DeleteModel(name="RankHolder"),
    ]
