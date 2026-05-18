from django.db import models
from django.contrib.auth.models import User
from core.models import MediaAsset

# Re-export existing api models so exams module has direct access
from api.models import (
    ExamRegistration, ExamImportantDate, ExamFaq, ExamTopper,
    ExamSettings, ExamCenterDetail, ExamSyllabusItem, ExamSamplePaper,
    ExamSupportSchool, Complaint,
)

__all__ = [
    "ExamRegistration", "ExamImportantDate", "ExamFaq", "ExamTopper",
    "ExamSettings", "ExamCenterDetail", "ExamSyllabusItem", "ExamSamplePaper",
    "ExamSupportSchool", "Complaint",
    "ExamCategory", "Exam", "ExamTimeline", "ExamResult", "ScoreBreakdown",
    "ResultPublication", "RankHolder", "AdmitCard", "Certificate", "CertificateVerification",
]


class ExamCategory(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "exams_exam_category"
        ordering = ["sort_order", "name"]
        verbose_name_plural = "Exam Categories"

    def __str__(self):
        return self.name


class Exam(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        REGISTRATION_OPEN = "registration_open", "Registration Open"
        REGISTRATION_CLOSED = "registration_closed", "Registration Closed"
        ADMIT_CARD_OUT = "admit_card_out", "Admit Card Out"
        ONGOING = "ongoing", "Ongoing"
        RESULT_PENDING = "result_pending", "Result Pending"
        RESULT_OUT = "result_out", "Result Out"
        COMPLETED = "completed", "Completed"

    category = models.ForeignKey(ExamCategory, null=True, on_delete=models.SET_NULL, related_name="exams")
    name = models.CharField(max_length=300)
    short_name = models.CharField(max_length=50, blank=True)
    slug = models.SlugField(max_length=300, unique=True)
    academic_year = models.CharField(max_length=20)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.UPCOMING)
    description = models.TextField(blank=True)
    eligibility = models.TextField(blank=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_registrations = models.PositiveIntegerField(null=True, blank=True)
    exam_date = models.DateField(null=True, blank=True)
    result_date = models.DateField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end = models.DateTimeField(null=True, blank=True)
    cover_image = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    brochure = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="exam_brochures")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_exam"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["status"]),
            models.Index(fields=["academic_year"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.academic_year})"


class ExamTimeline(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="timeline")
    event_name = models.CharField(max_length=200)
    event_date = models.DateField()
    is_tentative = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "exams_exam_timeline"
        ordering = ["event_date", "sort_order"]

    def __str__(self):
        return f"{self.exam.short_name or self.exam.name} — {self.event_name}"


class ExamResult(models.Model):
    class CopyStatus(models.TextChoices):
        NOT_UPLOADED = "not_uploaded", "Not Uploaded"
        UPLOADED = "uploaded", "Uploaded"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="results")
    registration = models.OneToOneField(ExamRegistration, on_delete=models.CASCADE, related_name="result")
    roll_number = models.CharField(max_length=50, blank=True)
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    obtained_marks = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rank = models.PositiveIntegerField(null=True, blank=True)
    grade = models.CharField(max_length=10, blank=True)
    is_pass = models.BooleanField(null=True, blank=True)
    copy_status = models.CharField(max_length=20, choices=CopyStatus.choices, default=CopyStatus.NOT_UPLOADED)
    copy_file = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_exam_result"
        ordering = ["rank", "-obtained_marks"]
        indexes = [
            models.Index(fields=["exam", "rank"]),
            models.Index(fields=["copy_status"]),
            models.Index(fields=["roll_number"]),
        ]

    def __str__(self):
        return f"{self.registration} — {self.obtained_marks}/{self.total_marks}"


class ScoreBreakdown(models.Model):
    result = models.ForeignKey(ExamResult, on_delete=models.CASCADE, related_name="score_breakdown")
    subject = models.CharField(max_length=100)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    obtained_marks = models.DecimalField(max_digits=6, decimal_places=2)
    is_pass = models.BooleanField(default=True)

    class Meta:
        db_table = "exams_score_breakdown"
        ordering = ["subject"]


class ResultPublication(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="publications")
    title = models.CharField(max_length=300)
    published_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    result_pdf = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exams_result_publication"
        ordering = ["-published_at"]

    def __str__(self):
        return f"{self.exam.short_name} — {self.title}"


class RankHolder(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="rank_holders")
    registration = models.ForeignKey(ExamRegistration, null=True, on_delete=models.SET_NULL)
    rank = models.PositiveIntegerField()
    achievement = models.CharField(max_length=300, blank=True)
    photo = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    is_featured = models.BooleanField(default=False)

    class Meta:
        db_table = "exams_rank_holder"
        ordering = ["exam", "rank"]
        unique_together = [("exam", "rank")]

    def __str__(self):
        return f"{self.exam.short_name} — Rank {self.rank}"


class AdmitCard(models.Model):
    class Status(models.TextChoices):
        GENERATED = "generated", "Generated"
        DOWNLOADED = "downloaded", "Downloaded"
        INVALIDATED = "invalidated", "Invalidated"

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="admit_cards")
    registration = models.OneToOneField(ExamRegistration, on_delete=models.CASCADE, related_name="admit_card")
    roll_number = models.CharField(max_length=50)
    hall_ticket_number = models.CharField(max_length=100, blank=True)
    exam_center = models.ForeignKey(ExamCenterDetail, null=True, on_delete=models.SET_NULL)
    exam_date = models.DateField(null=True, blank=True)
    reporting_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.GENERATED)
    pdf_file = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    generated_at = models.DateTimeField(auto_now_add=True)
    downloaded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "exams_admit_card"
        indexes = [
            models.Index(fields=["roll_number"]),
            models.Index(fields=["hall_ticket_number"]),
        ]

    def __str__(self):
        return f"{self.roll_number} — {self.exam}"


class Certificate(models.Model):
    class CertificateType(models.TextChoices):
        PARTICIPATION = "participation", "Participation"
        MERIT = "merit", "Merit"
        TOPPER = "topper", "Topper"
        SCHOLARSHIP = "scholarship", "Scholarship"

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="certificates")
    registration = models.ForeignKey(ExamRegistration, on_delete=models.CASCADE, related_name="certificates")
    certificate_type = models.CharField(max_length=20, choices=CertificateType.choices)
    certificate_number = models.CharField(max_length=100, unique=True)
    pdf_file = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    issued_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(default=True)

    class Meta:
        db_table = "exams_certificate"
        ordering = ["-issued_at"]
        indexes = [models.Index(fields=["certificate_number"])]

    def __str__(self):
        return self.certificate_number


class CertificateVerification(models.Model):
    certificate = models.ForeignKey(Certificate, on_delete=models.CASCADE, related_name="verifications")
    verified_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "exams_certificate_verification"
        ordering = ["-verified_at"]
