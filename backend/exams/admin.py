from django.contrib import admin
from import_export.admin import ImportExportModelAdmin, ExportMixin
from .models import (
    ExamCategory, Exam, ExamTimeline, ExamResult, ScoreBreakdown,
    ResultPublication, RankHolder, AdmitCard, Certificate, CertificateVerification,
)
from .resources import (
    ExamCategoryResource, ExamResource, ExamResultResource,
    AdmitCardResource, RankHolderResource,
    ExamTimelineResource, CertificateResource,
)


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
    list_display = ["name", "academic_year", "status", "exam_date", "registration_end", "created_at"]
    list_filter = ["status", "category", "academic_year"]
    search_fields = ["name", "short_name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ExamTimelineInline]
    readonly_fields = ["created_at", "updated_at"]


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
    list_display = ["registration", "exam", "roll_number", "obtained_marks", "total_marks",
                    "percentage", "rank", "grade", "is_pass", "copy_status"]
    list_filter = ["exam", "is_pass", "copy_status", "grade"]
    search_fields = ["registration__student_name", "registration__reg_number", "roll_number"]
    inlines = [ScoreBreakdownInline]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ResultPublication)
class ResultPublicationAdmin(ImportExportModelAdmin):
    list_display = ["exam", "title", "published_at", "is_active"]
    list_filter = ["exam", "is_active"]


@admin.register(RankHolder)
class RankHolderAdmin(ImportExportModelAdmin):
    resource_classes = [RankHolderResource]
    list_display = ["exam", "rank", "registration", "is_featured"]
    list_filter = ["exam", "is_featured"]


@admin.register(AdmitCard)
class AdmitCardAdmin(ImportExportModelAdmin):
    resource_classes = [AdmitCardResource]
    list_display = ["roll_number", "exam", "registration", "exam_center", "exam_date", "status"]
    list_filter = ["exam", "status"]
    search_fields = ["roll_number", "hall_ticket_number"]


@admin.register(Certificate)
class CertificateAdmin(ImportExportModelAdmin):
    resource_classes = [CertificateResource]
    list_display = ["certificate_number", "exam", "certificate_type", "is_valid", "issued_at"]
    list_filter = ["certificate_type", "is_valid", "exam"]
    search_fields = ["certificate_number"]
