from django.contrib import admin
from .models import Team, Match, ManagementMember, GalleryImage, Volunteer, TeamRegistration, ExamRegistration


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "captain"]
    search_fields = ["name", "captain"]


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
    list_display = ["title", "category", "image_key"]
    list_filter = ["category"]


@admin.register(Volunteer)
class VolunteerAdmin(admin.ModelAdmin):
    list_display = ["name", "role", "order"]
    ordering = ["order"]


@admin.register(TeamRegistration)
class TeamRegistrationAdmin(admin.ModelAdmin):
    list_display = ["team_name", "captain_name", "email", "phone", "player_count", "created_at"]
    list_filter = ["created_at"]
    readonly_fields = ["created_at"]


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
    list_filter = ["result_status", "created_at"]
    search_fields = ["roll_number", "full_name", "phone", "email", "school_name"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        (
            "Student Details",
            {
                "fields": (
                    "full_name",
                    "roll_number",
                    "date_of_birth",
                    "phone",
                    "email",
                    "school_name",
                    "class_name",
                    "address",
                    "notes",
                )
            },
        ),
        (
            "Result Publishing",
            {
                "fields": (
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
