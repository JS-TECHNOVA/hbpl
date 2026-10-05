from django.contrib import admin
from import_export.admin import ImportExportModelAdmin, ExportMixin
from .models import (
    ExaminationSession, ExamCategory, Exam, ExamCentre, ExamTimeline, School, StudentProfile,
    ExamApplication, ApplicationDocument, ApplicationEvent, ApplicationNumberSequence,
    ExamResult, ScoreBreakdown, CashfreeExamPayment,
    StudentEmailVerification,
    ResultPublication, LegacyAdmitCard, Certificate, CertificateVerification,
)
from .resources import (
    ExamCategoryResource, ExamResource, ExamResultResource,
    LegacyAdmitCardResource,
    ExamTimelineResource, CertificateResource,
)


@admin.register(ExaminationSession)
class ExaminationSessionAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_published", "is_active", "sort_order"]
    list_filter = ["is_published", "is_active"]
    search_fields = ["name", "code"]


@admin.register(ExamCentre)
class ExamCentreAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "city", "district", "capacity", "is_active"]
    list_filter = ["is_active", "state", "district"]
    search_fields = ["name", "code", "city", "district", "address", "contact_person", "contact_phone"]


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_active", "contact_phone"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "email_verified", "phone", "school_name", "class_name"]
    search_fields = ["user__username", "user__email", "user__first_name", "user__last_name", "school_name"]


class CashfreeExamPaymentInline(admin.TabularInline):
    model = CashfreeExamPayment
    extra = 0
    fields = ["order_id", "amount", "currency", "status", "cf_payment_id", "paid_at", "created_at"]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ExamApplication)
class ExamApplicationAdmin(admin.ModelAdmin):
    list_display = ["application_number", "full_name", "exam", "status", "payment_summary", "admit_card_email_sent_at", "submitted_at", "reviewed_by"]
    list_filter = ["status", "exam"]
    search_fields = ["application_number", "full_name", "email", "school_name"]
    inlines = [CashfreeExamPaymentInline]
    readonly_fields = ["application_number", "application_confirmation_email_sent_at", "application_confirmation_email_last_error", "admit_card_email_sent_at", "admit_card_email_last_error", "submitted_at", "reviewed_at", "created_at", "updated_at"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("exam").prefetch_related("cashfree_payments")

    @admin.display(description="Payment")
    def payment_summary(self, obj):
        payment = next(iter(obj.cashfree_payments.all()), None)
        if obj.exam.fee <= 0:
            return "Not required"
        return payment.get_status_display() if payment else "Unpaid"


@admin.register(CashfreeExamPayment)
class CashfreeExamPaymentAdmin(admin.ModelAdmin):
    list_display = ["order_id", "application_number", "student_email", "exam", "amount", "currency", "status", "payment_method", "cf_payment_id", "manual_reference", "manually_accepted_by", "paid_at", "created_at"]
    list_filter = ["status", "payment_method", "currency", "application__exam"]
    search_fields = ["order_id", "cf_payment_id", "application__application_number", "application__full_name", "application__email"]
    fields = ["application", "order_id", "amount", "currency", "status", "payment_method", "cf_payment_id", "manual_reference", "manually_accepted_by", "manually_accepted_at", "paid_at", "payment_confirmation_email_sent_at", "payment_confirmation_email_last_error", "created_at", "updated_at"]
    readonly_fields = fields
    ordering = ["-created_at"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("application", "application__exam")

    @admin.display(description="Application", ordering="application__application_number")
    def application_number(self, obj):
        return obj.application.application_number or f"Draft #{obj.application_id}"

    @admin.display(description="Student", ordering="application__email")
    def student_email(self, obj):
        return obj.application.email

    @admin.display(description="Exam", ordering="application__exam__name")
    def exam(self, obj):
        return obj.application.exam

    def has_add_permission(self, request):
        return False

@admin.register(StudentEmailVerification)
class StudentEmailVerificationAdmin(admin.ModelAdmin):
    list_display = ["user", "expires_at", "attempts", "verified_at", "created_at"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = ["code_hash", "created_at"]


@admin.register(ApplicationDocument)
class ApplicationDocumentAdmin(admin.ModelAdmin):
    list_display = ["application", "document_type", "status", "uploaded_at", "reviewed_by"]
    list_filter = ["document_type", "status"]
    search_fields = ["application__application_number", "application__full_name"]


@admin.register(ApplicationEvent)
class ApplicationEventAdmin(admin.ModelAdmin):
    list_display = ["application", "event_type", "from_status", "to_status", "notification_email_sent_at", "actor", "created_at"]
    list_filter = ["event_type", "to_status"]
    search_fields = ["application__application_number", "application__full_name", "note"]
    readonly_fields = ["application", "event_type", "from_status", "to_status", "note", "actor", "notification_email_sent_at", "notification_email_last_error", "created_at"]


@admin.register(ApplicationNumberSequence)
class ApplicationNumberSequenceAdmin(admin.ModelAdmin):
    list_display = ["exam", "next_number"]


@admin.register(ExamCategory)
class ExamCategoryAdmin(ImportExportModelAdmin):
    resource_classes = [ExamCategoryResource]
    list_display = ["name", "slug", "is_active", "sort_order"]
    prepopulated_fields = {"slug": ("name",)}


class ExamTimelineInline(admin.TabularInline):
    model = ExamTimeline
    extra = 0


@admin.register(Exam)
class ExamAdmin(ImportExportModelAdmin):
    resource_classes = [ExamResource]
    list_display = ["name", "session", "status", "exam_date", "registration_end", "has_templates", "created_at"]
    list_filter = ["status", "category", "session"]
    search_fields = ["name", "short_name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ExamTimelineInline]
    readonly_fields = ["created_at", "updated_at"]

    @admin.display(boolean=True, description="Templates")
    def has_templates(self, obj):
        return bool(obj.admit_card_template and obj.certificate_template)


@admin.register(ExamTimeline)
class ExamTimelineAdmin(ImportExportModelAdmin):
    resource_classes = [ExamTimelineResource]
    list_display = ["exam", "event_name", "event_date", "is_tentative", "sort_order"]
    list_filter = ["exam", "is_tentative"]
    search_fields = ["event_name"]


class ScoreBreakdownInline(admin.TabularInline):
    model = ScoreBreakdown
    extra = 0


@admin.register(ExamResult)
class ExamResultAdmin(ImportExportModelAdmin):
    resource_classes = [ExamResultResource]
    list_display = ["application", "registration", "exam", "roll_number", "obtained_marks", "total_marks",
                    "percentage", "rank", "grade", "is_pass", "copy_status"]
    list_filter = ["exam", "is_pass", "copy_status", "grade"]
    search_fields = ["application__full_name", "application__application_number", "registration__full_name", "registration__roll_number", "roll_number"]
    inlines = [ScoreBreakdownInline]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ResultPublication)
class ResultPublicationAdmin(ImportExportModelAdmin):
    list_display = ["exam", "title", "published_at", "is_active"]
    list_filter = ["exam", "is_active"]


@admin.register(LegacyAdmitCard)
class LegacyAdmitCardAdmin(ImportExportModelAdmin):
    resource_classes = [LegacyAdmitCardResource]
    list_display = ["roll_number", "exam", "registration", "exam_center", "exam_date", "status"]
    list_filter = ["exam", "status"]
    search_fields = ["roll_number", "hall_ticket_number"]


@admin.register(Certificate)
class CertificateAdmin(ImportExportModelAdmin):
    resource_classes = [CertificateResource]
    list_display = ["certificate_number", "exam", "certificate_type", "is_valid", "issued_at"]
    list_filter = ["certificate_type", "is_valid", "exam"]
    search_fields = ["certificate_number"]
