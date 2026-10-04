from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_complaint_status_admin_note'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamregistration',
            name='payment_screenshot',
            field=models.ImageField(blank=True, null=True, upload_to='team-registrations/payment-screenshots/'),
        ),
    ]
