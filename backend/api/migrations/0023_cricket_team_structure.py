from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0022_events_and_channels"),
    ]

    operations = [
        # 1. CricketTeam table
        migrations.CreateModel(
            name="CricketTeam",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("short_name", models.CharField(blank=True, max_length=20)),
                ("city", models.CharField(blank=True, max_length=100)),
                ("captain_name", models.CharField(blank=True, max_length=200)),
                ("logo", models.ImageField(blank=True, null=True, upload_to="cricket/teams/logos/")),
                ("primary_color", models.CharField(blank=True, max_length=7)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "registration",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="cricket_team",
                        to="api.teamregistration",
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),

        # 2. Add cricket_team FK to Player
        migrations.AddField(
            model_name="player",
            name="cricket_team",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="players",
                to="api.cricketteam",
            ),
        ),

        # 3. Add team1_obj / team2_obj FKs to Match
        migrations.AddField(
            model_name="match",
            name="team1_obj",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="home_matches",
                to="api.cricketteam",
            ),
        ),
        migrations.AddField(
            model_name="match",
            name="team2_obj",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="away_matches",
                to="api.cricketteam",
            ),
        ),

        # 4. MatchPlayerStats table
        migrations.CreateModel(
            name="MatchPlayerStats",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("runs", models.PositiveIntegerField(default=0)),
                ("balls_faced", models.PositiveSmallIntegerField(default=0)),
                ("fours", models.PositiveSmallIntegerField(default=0)),
                ("sixes", models.PositiveSmallIntegerField(default=0)),
                ("is_out", models.BooleanField(default=False)),
                ("dismissal_type", models.CharField(blank=True, max_length=30)),
                ("did_not_bat", models.BooleanField(default=False)),
                ("overs_bowled", models.DecimalField(decimal_places=1, default=0, max_digits=4)),
                ("runs_conceded", models.PositiveSmallIntegerField(default=0)),
                ("wickets", models.PositiveSmallIntegerField(default=0)),
                ("maidens", models.PositiveSmallIntegerField(default=0)),
                ("wides", models.PositiveSmallIntegerField(default=0)),
                ("no_balls", models.PositiveSmallIntegerField(default=0)),
                ("catches", models.PositiveSmallIntegerField(default=0)),
                ("run_outs", models.PositiveSmallIntegerField(default=0)),
                ("stumpings", models.PositiveSmallIntegerField(default=0)),
                (
                    "match",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="player_stats",
                        to="api.match",
                    ),
                ),
                (
                    "player",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="match_stats",
                        to="api.player",
                    ),
                ),
                (
                    "team",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="player_match_stats",
                        to="api.cricketteam",
                    ),
                ),
            ],
            options={
                "ordering": ["match", "team", "player"],
                "unique_together": {("match", "player")},
            },
        ),
    ]
