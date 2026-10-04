from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_galleryimage_image_managementmember_image_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="galleryimage",
            name="image_key",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
    ]