from django.contrib import admin
from django.shortcuts import redirect
from django.urls import path
from .models import (
 Match, ManagementMember, GalleryImage, Volunteer,
    TeamRegistration, ExamRegistration, ExamSettings, Complaint, NewsTicker
)


@admin.register(NewsTicker)
class NewsTickerAdmin(admin.ModelAdmin):
    list_display = ["text", "is_active", "order"]
    list_filter = ["is_active"]
    list_editable = ["is_active", "order"]
    search_fields = ["text"]
    ordering = ["order", "id"]


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "roll_number", "registration", "created_at", "message"]
    list_filter = ["created_at"]
    search_fields = ["name", "roll_number", "registration__roll_number", "message"]
    readonly_fields = ["created_at"]



@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ["stage", "team1", "team2", "date", "season", "match_type"]
    list_filter = ["season", "match_type"]
    search_fields = ["team1", "team2", "stage"]


@admin.register(ManagementMember)
class ManagementMemberAdmin(admin.ModelAdmin):
    list_display = ["name", "role", "order"]
    ordering = ["order"]


@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display = ["title", "category"]
    list_filter = ["category"]


@admin.register(Volunteer)
class VolunteerAdmin(admin.ModelAdmin):
    list_display = ["name", "role", "order"]
    ordering = ["order"]


@admin.register(TeamRegistration)
class TeamRegistrationAdmin(admin.ModelAdmin):
    list_display = ["team_name", "captain_name", "phone", "payment_id", "player_count", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["team_name", "captain_name", "phone", "whatsapp_number", "address", "payment_id", "payment_order_id"]
    readonly_fields = ["created_at"]


@admin.action(description="Publish admit cards for selected students")
def publish_admit_card(modeladmin, request, queryset):
    count = queryset.update(publish_admit_card=True)
    modeladmin.message_user(request, f"Admit cards published for {count} student(s).")


@admin.action(description="Unpublish admit cards for selected students")
def unpublish_admit_card(modeladmin, request, queryset):
    count = queryset.update(publish_admit_card=False)
    modeladmin.message_user(request, f"Admit cards unpublished for {count} student(s).")


@admin.action(description="Publish results for selected students")
def publish_results(modeladmin, request, queryset):
    count = queryset.filter(result_status="pending").update(result_status="published")
    modeladmin.message_user(request, f"Results published for {count} student(s).")


@admin.action(description="Unpublish results for selected students")
def unpublish_results(modeladmin, request, queryset):
    count = queryset.filter(result_status="published").update(result_status="pending")
    modeladmin.message_user(request, f"Results unpublished for {count} student(s).")


@admin.action(description="Publish participation certificates for selected students")
def publish_certificates(modeladmin, request, queryset):
    count = queryset.update(publish_participation_certificate=True)
    modeladmin.message_user(request, f"Participation certificates published for {count} student(s).")


@admin.action(description="Unpublish participation certificates for selected students")
def unpublish_certificates(modeladmin, request, queryset):
    count = queryset.update(publish_participation_certificate=False)
    modeladmin.message_user(request, f"Participation certificates unpublished for {count} student(s).")


@admin.register(ExamRegistration)
class ExamRegistrationAdmin(admin.ModelAdmin):
    list_display = [
        "roll_number",
        "full_name",
        "date_of_birth",
        "phone",
        "result_status",
        "marks_obtained",
        "rank",
        "created_at",
    ]
    actions = (publish_admit_card, unpublish_admit_card, publish_results, unpublish_results, publish_certificates, unpublish_certificates)
    list_filter = ["result_status", "created_at"]
    search_fields = ["roll_number", "full_name", "phone", "email", "school_name"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        (
            "Student Details",
            {
                "fields": (
                    "full_name",
                    "father_name",
                    "mother_name",
                    "roll_number",
                    "date_of_birth",
                    "phone",
                    "email",
                    "school_name",
                    "class_name",
                    "examination_center",
                    "center_address",
                    "address",
                    "notes",
                )
            },
        ),
        (
            "Result Publishing",
            {
                "fields": (
                    "publish_admit_card",
                    "result_status",
                    "marks_obtained",
                    "total_marks",
                    "rank",
                    "remarks",
                    "test_copy",
                    "result_file",
                )
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(ExamSettings)
class ExamSettingsAdmin(admin.ModelAdmin):
    change_list_template = "admin/exam_registration_settings_changelist.html"

    def has_add_permission(self, request):
        return not ExamSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "toggle-registration/",
                self.admin_site.admin_view(self.toggle_registration_view),
                name="toggle_exam_registration",
            ),
        ]
        return custom_urls + urls

    def toggle_registration_view(self, request):
        settings = ExamSettings.get_settings()
        settings.registration_closed = not settings.registration_closed
        settings.save()
        status = "closed" if settings.registration_closed else "opened"
        self.message_user(request, f"Exam registration has been {status}.")
        return redirect("..")

    def changelist_view(self, request, extra_context=None):
        settings = ExamSettings.get_settings()
        extra_context = extra_context or {}
        extra_context["registration_open"] = not settings.registration_closed
        return super().changelist_view(request, extra_context=extra_context)
