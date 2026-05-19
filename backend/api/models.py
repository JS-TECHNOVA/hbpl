from django.db import models, transaction
from django.db.models import Max


class Complaint(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("under_review", "Under Review"),
        ("resolved", "Resolved"),
    ]

    registration = models.ForeignKey('ExamRegistration', on_delete=models.CASCADE, related_name='complaints')
    name = models.CharField(max_length=200)
    roll_number = models.CharField(max_length=50)
    screenshot = models.ImageField(upload_to="complaints/screenshots/", blank=True, null=True)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self):
        return f"Complaint by {self.name} ({self.roll_number})"


# class Team(models.Model):
#     name = models.CharField(max_length=200)
#     captain = models.CharField(max_length=200)
#     description = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return self.name


class Match(models.Model):
    TYPE_CHOICES = [
        ("league", "League"),
        ("semi", "Semi Final"),
        ("final", "Final"),
    ]
    SEASON_CHOICES = [
        (2025, "HBPL 2025"),
        (2026, "HBPL 2026"),
    ]
    MATCH_STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("live", "Live"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    stage = models.CharField(max_length=100)
    match_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="league")
    date = models.DateField()
    time = models.CharField(max_length=10, blank=True)
    venue = models.CharField(max_length=200)
    team1 = models.CharField(max_length=200)
    team2 = models.CharField(max_length=200)
    team1_score = models.CharField(max_length=50, blank=True)
    team2_score = models.CharField(max_length=50, blank=True)
    result = models.CharField(max_length=300, blank=True)
    player_of_match = models.CharField(max_length=200, blank=True)
    season = models.IntegerField(choices=SEASON_CHOICES)
    tournament = models.ForeignKey(
        "Tournament", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="matches",
    )
    team1_registration = models.ForeignKey(
        "TeamRegistration", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="home_matches",
    )
    team2_registration = models.ForeignKey(
        "TeamRegistration", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="away_matches",
    )
    # Structured team FKs — set when creating matches via cricket-teams
    team1_obj = models.ForeignKey(
        "CricketTeam", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="home_matches",
    )
    team2_obj = models.ForeignKey(
        "CricketTeam", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="away_matches",
    )
    match_status = models.CharField(
        max_length=20, choices=MATCH_STATUS_CHOICES, default="scheduled",
    )
    toss_winner = models.CharField(max_length=200, blank=True)
    toss_decision = models.CharField(max_length=10, blank=True)
    youtube_stream_url = models.URLField(blank=True)

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"{self.stage}: {self.team1} vs {self.team2} ({self.season})"


class ManagementMember(models.Model):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    description = models.TextField()
    email = models.EmailField()
    image = models.ImageField(upload_to="management/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class GalleryImage(models.Model):
    CATEGORY_CHOICES = [
        ("Action", "Action"),
        ("Ceremony", "Ceremony"),
        ("Team", "Team"),
    ]

    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    image = models.ImageField(upload_to="gallery/", blank=True, null=True)

    def __str__(self):
        return self.title


class Volunteer(models.Model):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # Public path served from Next.js public/ folder, e.g. "/Subhash_-removebg-preview.png"
    img = models.CharField(max_length=300)
    image = models.ImageField(upload_to="volunteers/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class TeamRegistration(models.Model):
    team_name = models.CharField(max_length=50)
    captain_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=15)
    whatsapp_number = models.CharField(max_length=15, blank=True, default="")
    player_count = models.PositiveSmallIntegerField()
    address = models.CharField(max_length=150, blank=True, default="")
    message = models.TextField(blank=True)
    team_list = models.FileField(upload_to="team-registrations/team-lists/", blank=True, null=True)
    payment_order_id = models.CharField(max_length=100, blank=True, default="")
    payment_id = models.CharField(max_length=100, blank=True, default="")
    payment_signature = models.CharField(max_length=255, blank=True, default="")
    payment_amount_paise = models.PositiveIntegerField(default=0)
    payment_currency = models.CharField(max_length=10, blank=True, default="INR")
    created_at = models.DateTimeField(auto_now_add=True)
    team_image = models.ImageField(upload_to="team-registrations/team-images/", blank=True, null=True)
    payment_screenshot = models.ImageField(upload_to="team-registrations/payment-screenshots/", blank=True, null=True)

    # // admin validation fields
    is_approved = models.BooleanField(default=False)
    

    def __str__(self):
        return f"{self.team_name} — {self.captain_name}"



class ExamRegistration(models.Model):
    ROLL_PREFIX = "HBPL2026"

    class ResultStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PUBLISHED = "published", "Published"

    full_name = models.CharField(max_length=200)
    father_name = models.CharField(max_length=200, blank=True)
    mother_name = models.CharField(max_length=200, blank=True)
    roll_number = models.CharField(max_length=50, unique=True, blank=True)
    date_of_birth = models.DateField()
    examination_center = models.CharField(max_length=200, blank=True)
    center_address = models.TextField(blank=True)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    school_name = models.CharField(max_length=255, blank=True)
    class_name = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    student_image = models.ImageField(upload_to="exam/students/", blank=True, null=True)
    signature_image = models.ImageField(upload_to="exam/signatures/", blank=True, null=True)
    test_copy = models.FileField(upload_to="exam/test-copies/", blank=True, null=True)
    result_file = models.FileField(upload_to="exam/results/", blank=True, null=True)
    admit_card_file = models.FileField(upload_to="exam/admit-cards/", blank=True, null=True)
    participation_certificate_file = models.FileField(upload_to="exam/certificates/", blank=True, null=True)
    publish_admit_card = models.BooleanField(default=False)
    publish_participation_certificate = models.BooleanField(default=False)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    rank = models.PositiveIntegerField(blank=True, null=True)
    remarks = models.TextField(blank=True)
    result_status = models.CharField(
        max_length=20,
        choices=ResultStatus.choices,
        default=ResultStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["roll_number"]

    def __str__(self):
        return f"{self.roll_number} — {self.full_name}"

    def save(self, *args, **kwargs):
        if not self.roll_number:
            with transaction.atomic():
                existing = (
                    ExamRegistration.objects.select_for_update()
                    .filter(roll_number__startswith=self.ROLL_PREFIX)
                    .aggregate(Max("roll_number"))["roll_number__max"]
                )
                if existing:
                    try:
                        next_num = int(existing[len(self.ROLL_PREFIX):]) + 1
                    except ValueError:
                        next_num = (
                            ExamRegistration.objects.filter(
                                roll_number__startswith=self.ROLL_PREFIX
                            ).count() + 1
                        )
                else:
                    next_num = 1
                self.roll_number = f"{self.ROLL_PREFIX}{next_num:04d}"
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)


class ExamImportantDate(models.Model):
    title = models.CharField(max_length=200)
    date = models.DateField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "date", "id"]

    def __str__(self):
        return f"{self.title} ({self.date})"


class ExamSupportSchool(models.Model):
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300, blank=True)
    principal_name = models.CharField(max_length=200, blank=True)
    principal_image = models.ImageField(upload_to="exam/support-schools/", blank=True, null=True)
    contact_info = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class ExamSyllabusItem(models.Model):
    class_name = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to="exam/syllabus/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.class_name} — {self.title}"


class ExamSamplePaper(models.Model):
    class_name = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="exam/sample-papers/", blank=True, null=True)
    external_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.class_name} — {self.title}"


class ExamCenterDetail(models.Model):
    center_name = models.CharField(max_length=200)
    form_range = models.CharField(max_length=100, blank=True)
    roll_range = models.CharField(max_length=100, blank=True)
    extra_details = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.center_name


class ExamFaq(models.Model):
    question = models.CharField(max_length=300)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.question


class ExamTopper(models.Model):
    student = models.ForeignKey(ExamRegistration, on_delete=models.CASCADE, related_name="topper_entries")
    rank = models.PositiveIntegerField(default=1)
    highlight_text = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "rank", "id"]

    def __str__(self):
        return f"Rank {self.rank}: {self.student.full_name}"


class NewsTicker(models.Model):
    text = models.CharField(max_length=500)
    link = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text[:60]


class ExamSettings(models.Model):
    registration_closed = models.BooleanField(
        default=False,
        help_text="When enabled, new exam registrations will be rejected.",
    )

    class Meta:
        verbose_name = "Exam Settings"
        verbose_name_plural = "Exam Settings"

    def __str__(self):
        return "Exam Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# ─────────────────────────────────────────────────────────────────────────────
# CRICKET PHASE 2+ MODELS
# ─────────────────────────────────────────────────────────────────────────────

class Player(models.Model):
    ROLE_CHOICES = [
        ("batter", "Batter"),
        ("bowler", "Bowler"),
        ("allrounder", "All-rounder"),
        ("wicketkeeper", "Wicket-keeper"),
    ]
    BATTING_STYLE_CHOICES = [
        ("right_handed", "Right-handed"),
        ("left_handed", "Left-handed"),
    ]
    BOWLING_STYLE_CHOICES = [
        ("right_arm_fast", "Right-arm Fast"),
        ("right_arm_medium", "Right-arm Medium"),
        ("right_arm_off_spin", "Right-arm Off Spin"),
        ("right_arm_leg_spin", "Right-arm Leg Spin"),
        ("left_arm_fast", "Left-arm Fast"),
        ("left_arm_medium", "Left-arm Medium"),
        ("left_arm_spin", "Left-arm Spin"),
        ("not_applicable", "N/A"),
    ]

    team = models.ForeignKey(
        TeamRegistration, on_delete=models.CASCADE, related_name="players",
    )
    # Structured team FK — used when player is created through cricket-team management
    cricket_team = models.ForeignKey(
        "CricketTeam", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="players",
    )
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="batter")
    batting_style = models.CharField(
        max_length=30, choices=BATTING_STYLE_CHOICES, default="right_handed",
    )
    bowling_style = models.CharField(
        max_length=30, choices=BOWLING_STYLE_CHOICES, default="not_applicable",
    )
    jersey_number = models.PositiveSmallIntegerField(blank=True, null=True)
    is_captain = models.BooleanField(default=False)
    is_vice_captain = models.BooleanField(default=False)
    is_substitute = models.BooleanField(default=False)
    phone = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    photo = models.ImageField(upload_to="cricket/players/", blank=True, null=True)

    class Meta:
        ordering = ["team", "name"]

    def __str__(self):
        return f"{self.name} ({self.team.team_name})"


class CricketTeam(models.Model):
    """Canonical playing team — admin-created, used as FK in Match."""
    name = models.CharField(max_length=200)
    short_name = models.CharField(max_length=20, blank=True)  # e.g. "LCC"
    city = models.CharField(max_length=100, blank=True)
    captain_name = models.CharField(max_length=200, blank=True)
    logo = models.ImageField(upload_to="cricket/teams/logos/", blank=True, null=True)
    primary_color = models.CharField(max_length=7, blank=True)  # hex e.g. #003f87
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    registration = models.OneToOneField(
        TeamRegistration, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="cricket_team",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Tournament(models.Model):
    FORMAT_CHOICES = [
        ("knockout", "Knockout"),
        ("league", "League"),
        ("group_knockout", "Group Stage + Knockout"),
    ]
    STATUS_CHOICES = [
        ("upcoming", "Upcoming"),
        ("registration_open", "Registration Open"),
        ("registration_closed", "Registration Closed"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
    ]
    SEASON_CHOICES = [
        (2025, "HBPL 2025"),
        (2026, "HBPL 2026"),
    ]

    name = models.CharField(max_length=200)
    season = models.IntegerField(choices=SEASON_CHOICES)
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="knockout")
    max_teams = models.PositiveSmallIntegerField(default=16)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="upcoming")
    description = models.TextField(blank=True)
    rules = models.TextField(blank=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    registration_deadline = models.DateField(blank=True, null=True)
    registration_fee_paise = models.PositiveIntegerField(default=0)
    banner = models.ImageField(upload_to="cricket/tournaments/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-season", "id"]

    def __str__(self):
        return f"{self.name} ({self.season})"

    @property
    def approved_team_count(self):
        return self.team_registrations.filter(status="approved").count()

    @property
    def registration_open(self):
        return self.status == "registration_open"


class TournamentTeam(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="team_registrations",
    )
    team = models.ForeignKey(
        TeamRegistration, on_delete=models.CASCADE, related_name="tournament_registrations",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    applied_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    payment_order_id = models.CharField(max_length=100, blank=True)
    payment_id = models.CharField(max_length=100, blank=True)
    payment_signature = models.CharField(max_length=255, blank=True)
    payment_amount_paise = models.PositiveIntegerField(default=0)
    admin_note = models.TextField(blank=True)

    class Meta:
        unique_together = ["tournament", "team"]
        ordering = ["-applied_at"]

    def __str__(self):
        return f"{self.team.team_name} → {self.tournament.name} [{self.status}]"


# ── Live Match Scoring Models ─────────────────────────────────────────────────

class Innings(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="innings")
    innings_number = models.PositiveSmallIntegerField()  # 1 or 2
    batting_team_name = models.CharField(max_length=200)
    bowling_team_name = models.CharField(max_length=200)
    batting_team = models.ForeignKey(
        TeamRegistration, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="batting_innings",
    )
    bowling_team = models.ForeignKey(
        TeamRegistration, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="bowling_innings",
    )
    total_runs = models.PositiveIntegerField(default=0)
    wickets = models.PositiveSmallIntegerField(default=0)
    overs_completed = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    extras = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    target = models.PositiveIntegerField(blank=True, null=True)

    class Meta:
        ordering = ["match", "innings_number"]
        unique_together = ["match", "innings_number"]

    def __str__(self):
        return f"Innings {self.innings_number}: {self.batting_team_name} ({self.match})"

    @property
    def run_rate(self):
        overs = float(self.overs_completed)
        if overs == 0:
            return 0.0
        return round(self.total_runs / overs, 2)

    @property
    def required_run_rate(self):
        if not self.target or self.is_completed:
            return None
        remaining_runs = self.target - self.total_runs
        # Assume 20-over format by default
        remaining_overs = 20 - float(self.overs_completed)
        if remaining_overs <= 0:
            return None
        return round(remaining_runs / remaining_overs, 2)


class Over(models.Model):
    innings = models.ForeignKey(Innings, on_delete=models.CASCADE, related_name="overs")
    over_number = models.PositiveSmallIntegerField()  # 1-based
    bowler = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="overs_bowled",
    )
    runs = models.PositiveSmallIntegerField(default=0)
    wickets = models.PositiveSmallIntegerField(default=0)
    extras = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["innings", "over_number"]
        unique_together = ["innings", "over_number"]

    def __str__(self):
        return f"Over {self.over_number} (Innings {self.innings.innings_number})"


class Ball(models.Model):
    EXTRA_TYPE_CHOICES = [
        ("wide", "Wide"),
        ("no_ball", "No Ball"),
        ("bye", "Bye"),
        ("leg_bye", "Leg Bye"),
        ("penalty", "Penalty"),
    ]
    WICKET_TYPE_CHOICES = [
        ("bowled", "Bowled"),
        ("caught", "Caught"),
        ("lbw", "LBW"),
        ("run_out", "Run Out"),
        ("stumped", "Stumped"),
        ("hit_wicket", "Hit Wicket"),
        ("retired_hurt", "Retired Hurt"),
        ("obstructing_field", "Obstructing Field"),
    ]

    over = models.ForeignKey(Over, on_delete=models.CASCADE, related_name="balls")
    ball_number = models.PositiveSmallIntegerField()  # 1-based within over
    batsman = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="balls_faced",
    )
    non_striker = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="balls_non_striker",
    )
    bowler = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="balls_bowled",
    )
    runs_off_bat = models.PositiveSmallIntegerField(default=0)
    is_extra = models.BooleanField(default=False)
    extra_type = models.CharField(
        max_length=20, choices=EXTRA_TYPE_CHOICES, blank=True,
    )
    extra_runs = models.PositiveSmallIntegerField(default=0)
    is_wicket = models.BooleanField(default=False)
    wicket_type = models.CharField(
        max_length=30, choices=WICKET_TYPE_CHOICES, blank=True,
    )
    fielder = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="fielding_dismissals",
    )
    is_boundary = models.BooleanField(default=False)
    is_six = models.BooleanField(default=False)
    commentary = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["over", "ball_number"]
        unique_together = ["over", "ball_number"]

    def __str__(self):
        return f"Ball {self.ball_number} of Over {self.over.over_number}"

    @property
    def total_runs(self):
        return self.runs_off_bat + self.extra_runs


class BatsmanScore(models.Model):
    innings = models.ForeignKey(
        Innings, on_delete=models.CASCADE, related_name="batsman_scores",
    )
    batsman = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="batting_scores",
    )
    batting_position = models.PositiveSmallIntegerField(default=0)
    runs = models.PositiveIntegerField(default=0)
    balls_faced = models.PositiveSmallIntegerField(default=0)
    fours = models.PositiveSmallIntegerField(default=0)
    sixes = models.PositiveSmallIntegerField(default=0)
    is_out = models.BooleanField(default=False)
    dismissal_type = models.CharField(max_length=30, blank=True)
    fielder = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="catches_taken",
    )
    bowler = models.ForeignKey(
        Player, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="wickets_taken_batting",
    )
    fall_of_wicket_score = models.PositiveIntegerField(null=True, blank=True)
    fall_of_wicket_over = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    is_batting = models.BooleanField(default=False)
    did_not_bat = models.BooleanField(default=False)

    class Meta:
        unique_together = ["innings", "batsman"]

    def __str__(self):
        return f"{self.batsman.name}: {self.runs} ({self.balls_faced}b)"

    @property
    def strike_rate(self):
        if self.balls_faced == 0:
            return 0.0
        return round((self.runs / self.balls_faced) * 100, 2)


class BowlerScore(models.Model):
    innings = models.ForeignKey(
        Innings, on_delete=models.CASCADE, related_name="bowler_scores",
    )
    bowler = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="bowling_scores",
    )
    overs = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    maidens = models.PositiveSmallIntegerField(default=0)
    runs = models.PositiveSmallIntegerField(default=0)
    wickets = models.PositiveSmallIntegerField(default=0)
    wides = models.PositiveSmallIntegerField(default=0)
    no_balls = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ["innings", "bowler"]

    def __str__(self):
        return f"{self.bowler.name}: {self.wickets}/{self.runs} ({self.overs}ov)"

    @property
    def economy(self):
        overs = float(self.overs)
        if overs == 0:
            return 0.0
        return round(self.runs / overs, 2)


# ── Per-match Player Statistics ───────────────────────────────────────────────

class MatchPlayerStats(models.Model):
    """Aggregated stats for a player in a specific match (batting + bowling + fielding)."""
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="player_stats")
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="match_stats")
    team = models.ForeignKey(
        CricketTeam, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="player_match_stats",
    )

    # Batting
    runs = models.PositiveIntegerField(default=0)
    balls_faced = models.PositiveSmallIntegerField(default=0)
    fours = models.PositiveSmallIntegerField(default=0)
    sixes = models.PositiveSmallIntegerField(default=0)
    is_out = models.BooleanField(default=False)
    dismissal_type = models.CharField(max_length=30, blank=True)
    did_not_bat = models.BooleanField(default=False)

    # Bowling
    overs_bowled = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    runs_conceded = models.PositiveSmallIntegerField(default=0)
    wickets = models.PositiveSmallIntegerField(default=0)
    maidens = models.PositiveSmallIntegerField(default=0)
    wides = models.PositiveSmallIntegerField(default=0)
    no_balls = models.PositiveSmallIntegerField(default=0)

    # Fielding
    catches = models.PositiveSmallIntegerField(default=0)
    run_outs = models.PositiveSmallIntegerField(default=0)
    stumpings = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ["match", "player"]
        ordering = ["match", "team", "player"]

    def __str__(self):
        return f"{self.player.name} @ {self.match} — {self.runs}({self.balls_faced}b) {self.wickets}wkts"

    @property
    def strike_rate(self):
        return round((self.runs / self.balls_faced) * 100, 2) if self.balls_faced else 0.0

    @property
    def economy(self):
        overs = float(self.overs_bowled)
        return round(self.runs_conceded / overs, 2) if overs else 0.0


# ── Events ────────────────────────────────────────────────────────────────────

class Event(models.Model):
    CATEGORY_CHOICES = [
        ("exam", "Exam"),
        ("cricket", "Cricket"),
        ("workshop", "Workshop"),
        ("community", "Community"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="community")
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.title} ({self.date:%Y-%m-%d})"
