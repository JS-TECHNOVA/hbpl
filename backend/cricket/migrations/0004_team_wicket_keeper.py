from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cricket', '0003_add_striker_slot'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='wicket_keeper',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='wk_designations',
                to='cricket.player',
            ),
        ),
    ]
