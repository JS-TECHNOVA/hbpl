from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0027_exam_sample_paper_exam_and_caption"),
    ]

    operations = [
        migrations.DeleteModel(name="ExamTopper"),
    ]
