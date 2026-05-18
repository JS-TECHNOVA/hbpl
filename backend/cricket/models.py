import uuid
from django.db import models
from django.contrib.auth.models import User


class Tournament(models.Model):
    FORMAT_CHOICES = [("T20", "T20"), ("ODI", "ODI"), ("TEST", "Test"), ("T10", "T10")]
    STATUS_CHOICES = [
        ("registration_open", "Registration Open"),
        ("registration_closed", "Registration Closed"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    venue = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="T20")
    max_overs = models.IntegerField(default=20)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="registration_open")
    banner_image = models.URLField(blank=True)
    youtube_channel = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "cricket"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Team(models.Model):
    REGISTRATION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="teams")
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=10, blank=True)
    logo_url = models.URLField(blank=True)
    home_city = models.CharField(max_length=100, blank=True)
    jersey_color = models.CharField(max_length=50, blank=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    captain = models.ForeignKey(
        "Player", null=True, blank=True, on_delete=models.SET_NULL, related_name="captaining_teams"
    )
    vice_captain = models.ForeignKey(
        "Player", null=True, blank=True, on_delete=models.SET_NULL, related_name="vice_captaining_teams"
    )
    wicket_keeper = models.ForeignKey(
        "Player", null=True, blank=True, on_delete=models.SET_NULL, related_name="wk_designations"
    )
    registration_status = models.CharField(
        max_length=20, choices=REGISTRATION_STATUS_CHOICES, default="pending"
    )
    is_visible = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_teams"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "cricket"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.tournament})"

    def approve(self, admin_user):
        from django.utils import timezone
        self.registration_status = "approved"
        self.is_visible = True
        self.approved_at = timezone.now()
        self.approved_by = admin_user
        self.save(update_fields=["registration_status", "is_visible", "approved_at", "approved_by"])

    def reject(self):
        self.registration_status = "rejected"
        self.is_visible = False
        self.save(update_fields=["registration_status", "is_visible"])


class Player(models.Model):
    ROLE_CHOICES = [
        ("batsman", "Batsman"),
        ("bowler", "Bowler"),
        ("all_rounder", "All-Rounder"),
        ("wicket_keeper", "Wicket-Keeper"),
        ("wicket_keeper_batsman", "WK-Batsman"),
    ]
    BATTING_STYLE_CHOICES = [("right_hand", "Right Hand"), ("left_hand", "Left Hand")]
    BOWLING_STYLE_CHOICES = [
        ("right_arm_fast", "Right Arm Fast"),
        ("right_arm_medium", "Right Arm Medium"),
        ("right_arm_off_spin", "Right Arm Off Spin"),
        ("right_arm_leg_spin", "Right Arm Leg Spin"),
        ("left_arm_fast", "Left Arm Fast"),
        ("left_arm_medium", "Left Arm Medium"),
        ("left_arm_spin", "Left Arm Spin"),
        ("none", "None"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="players")
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="players")
    name = models.CharField(max_length=200)
    jersey_number = models.PositiveSmallIntegerField(null=True, blank=True)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="batsman")
    batting_style = models.CharField(max_length=20, choices=BATTING_STYLE_CHOICES, default="right_hand")
    bowling_style = models.CharField(max_length=30, choices=BOWLING_STYLE_CHOICES, default="none")
    photo_url = models.URLField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "cricket"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.team})"


class Match(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("toss_done", "Toss Done"),
        ("innings1", "Innings 1 In Progress"),
        ("innings2", "Innings 2 In Progress"),
        ("completed", "Completed"),
        ("abandoned", "Abandoned"),
        ("rain_delay", "Rain Delay"),
    ]
    FORMAT_CHOICES = [("T20", "T20"), ("ODI", "ODI"), ("TEST", "Test"), ("T10", "T10")]
    TOSS_DECISION_CHOICES = [("bat", "Bat First"), ("bowl", "Bowl First")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    match_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=300, blank=True)
    team1 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="home_matches")
    team2 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="away_matches")
    venue = models.CharField(max_length=300, blank=True)
    match_date = models.DateTimeField()
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="T20")
    total_overs = models.PositiveSmallIntegerField(default=20)

    # Toss
    toss_winner = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="toss_wins"
    )
    toss_decision = models.CharField(max_length=10, choices=TOSS_DECISION_CHOICES, blank=True)

    # Live pointers
    batting_team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="batting_matches"
    )
    bowling_team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="bowling_matches"
    )
    current_batsman1 = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="batting1_matches"
    )
    current_batsman2 = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="batting2_matches"
    )
    # 0 = batsman1 is striker, 1 = batsman2 is striker
    striker_slot = models.SmallIntegerField(default=0)
    current_bowler = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="bowling_matches"
    )

    # Innings 1
    innings1_team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="innings1_matches"
    )
    innings1_score = models.PositiveSmallIntegerField(default=0)
    innings1_wickets = models.PositiveSmallIntegerField(default=0)
    innings1_overs = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    innings1_extras = models.PositiveSmallIntegerField(default=0)

    # Innings 2
    innings2_team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="innings2_matches"
    )
    innings2_score = models.PositiveSmallIntegerField(default=0)
    innings2_wickets = models.PositiveSmallIntegerField(default=0)
    innings2_overs = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    innings2_extras = models.PositiveSmallIntegerField(default=0)

    # Result
    winner = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="won_matches"
    )
    result_text = models.CharField(max_length=300, blank=True)
    man_of_match = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="mom_matches"
    )

    # State
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    current_innings = models.PositiveSmallIntegerField(default=1)
    current_over = models.PositiveSmallIntegerField(default=0)
    current_ball = models.PositiveSmallIntegerField(default=0)
    required_runs = models.PositiveSmallIntegerField(null=True, blank=True)
    required_balls = models.PositiveSmallIntegerField(null=True, blank=True)
    youtube_live_id = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "cricket"
        ordering = ["match_number"]

    def __str__(self):
        return f"{self.tournament} — Match #{self.match_number}: {self.team1} vs {self.team2}"

    @property
    def run_rate(self):
        total_balls = int(self.innings1_overs) * 6 + round((self.innings1_overs % 1) * 10)
        if total_balls == 0:
            return 0.0
        return round(self.innings1_score / (total_balls / 6), 2)

    @property
    def required_run_rate(self):
        if self.required_balls and self.required_balls > 0 and self.required_runs:
            return round(self.required_runs / (self.required_balls / 6), 2)
        return None


class MatchPlayingXI(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="playing_xi")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="playing_xi")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="playing_xi")
    batting_order = models.PositiveSmallIntegerField(null=True, blank=True)
    is_impact_player = models.BooleanField(default=False)

    class Meta:
        app_label = "cricket"
        unique_together = [("match", "player")]
        ordering = ["batting_order"]

    def __str__(self):
        return f"{self.match} — {self.player}"


class BattingScorecard(models.Model):
    WICKET_TYPE_CHOICES = [
        ("bowled", "Bowled"),
        ("caught", "Caught"),
        ("lbw", "LBW"),
        ("run_out", "Run Out"),
        ("stumped", "Stumped"),
        ("hit_wicket", "Hit Wicket"),
        ("retired_hurt", "Retired Hurt"),
        ("retired_out", "Retired Out"),
        ("obstructing", "Obstructing the Field"),
        ("timed_out", "Timed Out"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="batting_scorecards")
    innings_number = models.PositiveSmallIntegerField()
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="batting_scorecards")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="batting_scorecards")
    runs = models.PositiveSmallIntegerField(default=0)
    balls_faced = models.PositiveSmallIntegerField(default=0)
    fours = models.PositiveSmallIntegerField(default=0)
    sixes = models.PositiveSmallIntegerField(default=0)
    is_out = models.BooleanField(default=False)
    out_reason = models.CharField(max_length=300, blank=True)
    wicket_type = models.CharField(max_length=20, choices=WICKET_TYPE_CHOICES, blank=True)
    dismissed_by_bowler = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="bowled_out_players"
    )
    fielder = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="fielded_out_players"
    )
    batting_position = models.PositiveSmallIntegerField(default=0)
    did_not_bat = models.BooleanField(default=False)

    class Meta:
        app_label = "cricket"
        ordering = ["batting_position"]

    def __str__(self):
        return f"{self.player} — {self.runs}({self.balls_faced})"

    @property
    def strike_rate(self):
        if self.balls_faced == 0:
            return 0.0
        return round(self.runs / self.balls_faced * 100, 2)


class BowlingScorecard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="bowling_scorecards")
    innings_number = models.PositiveSmallIntegerField()
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="bowling_scorecards")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="bowling_scorecards")
    balls_bowled = models.PositiveSmallIntegerField(default=0)
    maidens = models.PositiveSmallIntegerField(default=0)
    runs_given = models.PositiveSmallIntegerField(default=0)
    wickets = models.PositiveSmallIntegerField(default=0)
    wides = models.PositiveSmallIntegerField(default=0)
    no_balls = models.PositiveSmallIntegerField(default=0)

    class Meta:
        app_label = "cricket"

    def __str__(self):
        return f"{self.player} — {self.wickets}/{self.runs_given} ({self.overs_bowled})"

    @property
    def overs_bowled(self):
        return f"{self.balls_bowled // 6}.{self.balls_bowled % 6}"

    @property
    def economy(self):
        overs = self.balls_bowled / 6
        if overs == 0:
            return 0.0
        return round(self.runs_given / overs, 2)


class BallCommentary(models.Model):
    EXTRA_TYPE_CHOICES = [
        ("none", "None"),
        ("wide", "Wide"),
        ("no_ball", "No Ball"),
        ("leg_bye", "Leg Bye"),
        ("bye", "Bye"),
    ]
    WICKET_TYPE_CHOICES = BattingScorecard.WICKET_TYPE_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="ball_commentary")
    innings_number = models.PositiveSmallIntegerField()
    over_number = models.PositiveSmallIntegerField()
    ball_number = models.PositiveSmallIntegerField()
    batsman = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="faced_balls")
    bowler = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="bowled_balls")
    runs_scored = models.PositiveSmallIntegerField(default=0)
    extras = models.PositiveSmallIntegerField(default=0)
    extra_type = models.CharField(max_length=10, choices=EXTRA_TYPE_CHOICES, default="none")
    is_wicket = models.BooleanField(default=False)
    wicket_type = models.CharField(max_length=20, choices=WICKET_TYPE_CHOICES, blank=True)
    dismissed_player = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="dismissed_balls"
    )
    fielder = models.ForeignKey(
        Player, null=True, blank=True, on_delete=models.SET_NULL, related_name="fielded_balls"
    )
    is_four = models.BooleanField(default=False)
    is_six = models.BooleanField(default=False)
    commentary_text = models.TextField(blank=True)
    total_score_after = models.PositiveSmallIntegerField(default=0)
    total_wickets_after = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "cricket"
        unique_together = [("match", "innings_number", "over_number", "ball_number")]
        ordering = ["-over_number", "-ball_number"]

    def __str__(self):
        return f"{self.match} — {self.over_ball_text}: {self.runs_scored}"

    @property
    def over_ball_text(self):
        return f"{self.over_number}.{self.ball_number}"


class PlayerTournamentStats(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="tournament_stats")
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="player_stats")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="player_stats")

    # Batting
    matches_played = models.PositiveSmallIntegerField(default=0)
    innings_batted = models.PositiveSmallIntegerField(default=0)
    not_outs = models.PositiveSmallIntegerField(default=0)
    runs = models.PositiveIntegerField(default=0)
    highest_score = models.PositiveSmallIntegerField(default=0)
    balls_faced = models.PositiveIntegerField(default=0)
    fours = models.PositiveSmallIntegerField(default=0)
    sixes = models.PositiveSmallIntegerField(default=0)
    fifties = models.PositiveSmallIntegerField(default=0)
    hundreds = models.PositiveSmallIntegerField(default=0)

    # Bowling
    innings_bowled = models.PositiveSmallIntegerField(default=0)
    balls_bowled = models.PositiveIntegerField(default=0)
    runs_given = models.PositiveIntegerField(default=0)
    wickets = models.PositiveSmallIntegerField(default=0)
    best_wickets = models.PositiveSmallIntegerField(default=0)
    best_runs = models.PositiveSmallIntegerField(null=True, blank=True)
    maidens = models.PositiveSmallIntegerField(default=0)

    # Fielding
    catches = models.PositiveSmallIntegerField(default=0)
    run_outs = models.PositiveSmallIntegerField(default=0)
    stumpings = models.PositiveSmallIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "cricket"
        unique_together = [("player", "tournament")]

    def __str__(self):
        return f"{self.player} — {self.tournament}"

    @property
    def batting_average(self):
        dismissals = self.innings_batted - self.not_outs
        if dismissals == 0:
            return None
        return round(self.runs / dismissals, 2)

    @property
    def batting_strike_rate(self):
        if self.balls_faced == 0:
            return 0.0
        return round(self.runs / self.balls_faced * 100, 2)

    @property
    def bowling_average(self):
        if self.wickets == 0:
            return None
        return round(self.runs_given / self.wickets, 2)

    @property
    def economy(self):
        if self.balls_bowled == 0:
            return 0.0
        return round(self.runs_given / (self.balls_bowled / 6), 2)

    @property
    def bowling_strike_rate(self):
        if self.wickets == 0:
            return None
        return round(self.balls_bowled / self.wickets, 2)

    @property
    def best_bowling(self):
        if self.best_wickets == 0:
            return None
        return f"{self.best_wickets}/{self.best_runs if self.best_runs is not None else 0}"


class InningsExtras(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="innings_extras")
    innings_number = models.PositiveSmallIntegerField()
    wides = models.PositiveSmallIntegerField(default=0)
    no_balls = models.PositiveSmallIntegerField(default=0)
    leg_byes = models.PositiveSmallIntegerField(default=0)
    byes = models.PositiveSmallIntegerField(default=0)
    penalty = models.PositiveSmallIntegerField(default=0)

    class Meta:
        app_label = "cricket"
        unique_together = [("match", "innings_number")]

    def __str__(self):
        return f"{self.match} — Innings {self.innings_number} Extras: {self.total}"

    @property
    def total(self):
        return self.wides + self.no_balls + self.leg_byes + self.byes + self.penalty
