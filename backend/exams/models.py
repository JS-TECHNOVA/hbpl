from django.db import models
from django.contrib.auth.models import User
from core.models import MediaAsset

# Re-export existing api models so exams module has direct access
from api.models import (
    ExamRegistration, ExamImportantDate, ExamFaq,
    ExamSettings, ExamCenterDetail, ExamSyllabusItem, ExamSamplePaper,
    ExamSupportSchool, Complaint,
)

__all__ = [
    "ExamRegistration", "ExamImportantDate", "ExamFaq",
    "ExamSettings", "ExamCenterDetail", "ExamSyllabusItem", "ExamSamplePaper",
    "ExamSupportSchool", "Complaint",
    "ExaminationSession", "ExamCategory", "Exam", "ExamTimeline", "School", "StudentProfile",
    "ExamApplication", "ApplicationDocument", "ApplicationEvent", "ApplicationNumberSequence",
    "StudentEmailVerification",
    "ExamResult", "ScoreBreakdown",
    "ResultPublication", "LegacyAdmitCard", "Certificate", "CertificateVerification",
]


class ExaminationSession(models.Model):
    code = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_examination_session"
        ordering = ["-sort_order", "-created_at"]

    def __str__(self):
        return self.name


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


class ExamCentre(models.Model):
    name = models.CharField(max_length=300)
    code = models.CharField(max_length=40, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=120, blank=True)
    district = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    capacity = models.PositiveIntegerField(default=0, help_text="Available student seats")
    contact_person = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    facilities = models.TextField(blank=True, help_text="Facilities and accessibility notes")
    internal_notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_exam_centre"
        ordering = ["name"]
        verbose_name = "Exam centre"
        verbose_name_plural = "Exam centres"

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

    session = models.ForeignKey(
        ExaminationSession,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="exams",
    )
    centres = models.ManyToManyField("ExamCentre", blank=True, related_name="exams")
    category = models.ForeignKey(ExamCategory, null=True, on_delete=models.SET_NULL, related_name="exams")
    code = models.SlugField(max_length=60, unique=True, null=True, blank=True)
    name = models.CharField(max_length=300)
    short_name = models.CharField(max_length=50, blank=True)
    slug = models.SlugField(max_length=300, unique=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.UPCOMING)
    description = models.TextField(blank=True)
    subtitle = models.CharField(max_length=300, blank=True)
    allowed_classes = models.JSONField(default=list, blank=True)
    application_prefix = models.CharField(max_length=30, blank=True)
    is_published = models.BooleanField(default=False)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_registrations = models.PositiveIntegerField(null=True, blank=True)
    exam_date = models.DateField(null=True, blank=True)
    result_date = models.DateField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end = models.DateTimeField(null=True, blank=True)
    reporting_time = models.TimeField(null=True, blank=True)
    exam_start_time = models.TimeField(null=True, blank=True)
    exam_end_time = models.TimeField(null=True, blank=True)
    admit_card_template = models.FileField(
        upload_to="exam/templates/admit-cards/", null=True, blank=True,
        help_text=("PDF or Django-rendered HTML/HTM. HTML tokens: {{ student_name }}, "
                   "{{ application_number }}, {{ student_class }}, {{ student_dob }}, "
                   "{{ school_name }}, {{ exam_name }}, {{ exam_date }}, {{ reporting_time }}, "
                   "{{ exam_time }}, {{ centre_name }}, {{ centre_address }}, "
                   "{{ student_photo_data_uri }}, {{ student_signature_data_uri }}."),
    )
    certificate_template = models.FileField(
        upload_to="exam/templates/certificates/", null=True, blank=True,
        help_text=("PDF or Django-rendered HTML/HTM. HTML tokens: {{ student_name }}, "
                   "{{ student_class }}, {{ position_rank }}, {{ exam_name }}, "
                   "{{ exam_session }}, {{ certificate_number }}, {{ issue_date }}."),
    )
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_exams")
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
        ]

    def __str__(self):
        return self.name


class School(models.Model):
    name = models.CharField(max_length=300, unique=True)
    code = models.SlugField(max_length=80, unique=True, null=True, blank=True)
    address = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exams_school"
        ordering = ["name"]

    def __str__(self):
        return self.name


class StudentProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    email_verified = models.BooleanField(default=False)
    gender = models.CharField(max_length=24, choices=Gender.choices, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    father_name = models.CharField(max_length=200, blank=True)
    mother_name = models.CharField(max_length=200, blank=True)
    school_name = models.CharField(max_length=300, blank=True)
    class_name = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    photo = models.ImageField(upload_to="student-profiles/photos/", null=True, blank=True)
    signature = models.ImageField(upload_to="student-profiles/signatures/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_student_profile"

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class StudentEmailVerification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="email_verification")
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exams_student_email_verification"

    @property
    def is_verified(self):
        return self.verified_at is not None


class ApplicationNumberSequence(models.Model):
    exam = models.OneToOneField(Exam, on_delete=models.CASCADE, related_name="application_sequence")
    next_number = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "exams_application_number_sequence"


class ExamApplication(models.Model):
    """One student's enrollment in one exam; exam documents and centre live here."""
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under review"
        CORRECTION_REQUIRED = "correction_required", "Correction required"
        RESUBMITTED = "resubmitted", "Resubmitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, related_name="applications")
    student = models.ForeignKey(StudentProfile, on_delete=models.PROTECT, related_name="applications")
    centre = models.ForeignKey(ExamCentre, null=True, blank=True, on_delete=models.SET_NULL, related_name="applications")
    application_number = models.CharField(max_length=80, unique=True, null=True, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    full_name = models.CharField(max_length=200)
    father_name = models.CharField(max_length=200, blank=True)
    mother_name = models.CharField(max_length=200, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    school_name = models.CharField(max_length=300, blank=True)
    class_name = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_exam_applications")
    review_notes = models.TextField(blank=True)
    application_confirmation_email_sent_at = models.DateTimeField(null=True, blank=True)
    application_confirmation_email_last_error = models.TextField(blank=True)
    admit_card_email_sent_at = models.DateTimeField(null=True, blank=True)
    admit_card_email_last_error = models.TextField(blank=True)
    admit_card_file = models.FileField(upload_to="exam/admit-cards/%Y/%m/", null=True, blank=True)
    admit_card_issued_at = models.DateTimeField(null=True, blank=True)
    certificate_file = models.FileField(upload_to="exam/certificates/%Y/%m/", null=True, blank=True)
    certificate_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    certificate_issued_at = models.DateTimeField(null=True, blank=True)
    certificate_email_sent_at = models.DateTimeField(null=True, blank=True)
    certificate_email_last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_exam_application"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["exam", "student"], name="unique_student_exam_application"),
        ]
        indexes = [
            models.Index(fields=["exam", "status"]),
            models.Index(fields=["application_number"]),
        ]

    def __str__(self):
        return self.application_number or f"Draft #{self.pk}"


class CashfreeExamPayment(models.Model):
    class Method(models.TextChoices):
        CASHFREE = "cashfree", "Cashfree"
        MANUAL = "manual", "Manual"
        NO_CHARGE = "no_charge", "No charge"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        USER_DROPPED = "user_dropped", "User dropped"
        EXPIRED = "expired", "Expired"

    application = models.ForeignKey(ExamApplication, on_delete=models.CASCADE, related_name="cashfree_payments")
    order_id = models.CharField(max_length=45, unique=True)
    payment_session_id = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASHFREE)
    cf_payment_id = models.CharField(max_length=40, blank=True)
    manual_reference = models.CharField(max_length=200, blank=True)
    manually_accepted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="manually_accepted_exam_payments")
    manually_accepted_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_confirmation_email_sent_at = models.DateTimeField(null=True, blank=True)
    payment_confirmation_email_last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exams_cashfree_exam_payment"
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_id


class ApplicationDocument(models.Model):
    class DocumentType(models.TextChoices):
        PHOTO = "photo", "Photo"
        SIGNATURE = "signature", "Signature"
        ID_PROOF = "id_proof", "Identity proof"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    application = models.ForeignKey(ExamApplication, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    file = models.FileField(upload_to="exam-applications/%Y/%m/")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    review_note = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_application_documents")

    class Meta:
        db_table = "exams_application_document"
        ordering = ["document_type", "-uploaded_at"]


class ApplicationEvent(models.Model):
    application = models.ForeignKey(ExamApplication, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=50)
    from_status = models.CharField(max_length=30, blank=True)
    to_status = models.CharField(max_length=30, blank=True)
    note = models.TextField(blank=True)
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="exam_application_events")
    notification_email_sent_at = models.DateTimeField(null=True, blank=True)
    notification_email_last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exams_application_event"
        ordering = ["-created_at"]


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
    registration = models.ForeignKey(ExamRegistration, null=True, blank=True, on_delete=models.CASCADE, related_name="results")
    application = models.OneToOneField("ExamApplication", null=True, blank=True, on_delete=models.CASCADE, related_name="result")
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
        constraints = [
            models.UniqueConstraint(fields=["exam", "registration"], name="unique_legacy_registration_exam_result"),
        ]

    def __str__(self):
        candidate = self.application or self.registration or self.roll_number or "Result"
        return f"{candidate} — {self.obtained_marks}/{self.total_marks}"


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


class LegacyAdmitCard(models.Model):
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
        verbose_name = "Legacy admit card"
        verbose_name_plural = "Legacy admit cards"
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
