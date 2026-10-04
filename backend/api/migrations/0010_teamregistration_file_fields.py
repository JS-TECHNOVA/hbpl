from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_complaint"),
    ]

    operations = [
        migrations.AlterField(
            model_name="teamregistration",
            name="email",
            field=models.EmailField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="payment_amount_paise",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="payment_currency",
            field=models.CharField(blank=True, default="INR", max_length=10),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="payment_id",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="payment_order_id",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="payment_signature",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="team_list",
            field=models.FileField(blank=True, null=True, upload_to="team-registrations/team-lists/"),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="village_name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="teamregistration",
            name="whatsapp_number",
            field=models.CharField(blank=True, default="", max_length=15),
        ),
    ]
