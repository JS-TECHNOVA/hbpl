from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=200)
    captain = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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

    stage = models.CharField(max_length=100)
    match_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="league")
    date = models.DateField()
    time = models.CharField(max_length=10, blank=True)  # e.g. "16:00"
    venue = models.CharField(max_length=200)
    team1 = models.CharField(max_length=200)
    team2 = models.CharField(max_length=200)
    # Results (blank for upcoming matches)
    team1_score = models.CharField(max_length=50, blank=True)
    team2_score = models.CharField(max_length=50, blank=True)
    result = models.CharField(max_length=300, blank=True)
    player_of_match = models.CharField(max_length=200, blank=True)
    season = models.IntegerField(choices=SEASON_CHOICES)

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"{self.stage}: {self.team1} vs {self.team2} ({self.season})"


class ManagementMember(models.Model):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    description = models.TextField()
    email = models.EmailField()
    # Key maps to a statically imported image in the Next.js frontend
    image_key = models.CharField(max_length=50, blank=True)
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
    # Key maps to a statically imported image (g1, g2, g3) in the Next.js frontend
    image_key = models.CharField(max_length=10)
    image = models.ImageField(upload_to="gallery/", blank=True, null=True)

    def __str__(self):
        return self.title


class Volunteer(models.Model):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
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
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=15)
    player_count = models.PositiveSmallIntegerField()
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.team_name} — {self.captain_name}"


class ExamRegistration(models.Model):
    class ResultStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PUBLISHED = "published", "Published"

    full_name = models.CharField(max_length=200)
    roll_number = models.CharField(max_length=50, unique=True)
    date_of_birth = models.DateField()
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    school_name = models.CharField(max_length=255, blank=True)
    class_name = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    test_copy = models.FileField(upload_to="exam/test-copies/", blank=True, null=True)
    result_file = models.FileField(upload_to="exam/results/", blank=True, null=True)
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
