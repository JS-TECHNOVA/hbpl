from django.contrib import admin
from .models import (
    Tournament, Team, Player, Match,
    MatchPlayingXI, BattingScorecard, BowlingScorecard,
    BallCommentary, InningsExtras,
)


class PlayerInline(admin.TabularInline):
    model = Player
    extra = 0
    fields = ["name", "jersey_number", "role", "batting_style", "bowling_style"]


class MatchPlayingXIInline(admin.TabularInline):
    model = MatchPlayingXI
    extra = 0
    fields = ["team", "player", "batting_order", "is_impact_player"]


class BattingScorecardInline(admin.TabularInline):
    model = BattingScorecard
    extra = 0
    readonly_fields = ["strike_rate"]
    fields = [
        "player", "innings_number", "runs", "balls_faced", "fours", "sixes",
        "is_out", "wicket_type", "out_reason", "batting_position", "did_not_bat",
    ]


class BowlingScorecardInline(admin.TabularInline):
    model = BowlingScorecard
    extra = 0
    fields = [
        "player", "innings_number", "balls_bowled", "maidens",
        "runs_given", "wickets", "wides", "no_balls",
    ]


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ["title", "format", "status", "start_date", "end_date", "city"]
    list_filter = ["format", "status"]
    search_fields = ["title", "city"]
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "start_date"


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "tournament", "short_name", "registration_status", "is_visible", "approved_at"]
    list_filter = ["tournament", "registration_status", "is_visible"]
    search_fields = ["name", "contact_name", "contact_email"]
    inlines = [PlayerInline]
    actions = ["approve_teams", "reject_teams"]

    @admin.action(description="Approve selected teams")
    def approve_teams(self, request, queryset):
        for team in queryset:
            team.approve(request.user)
        self.message_user(request, f"{queryset.count()} teams approved.")

    @admin.action(description="Reject selected teams")
    def reject_teams(self, request, queryset):
        for team in queryset:
            team.reject()
        self.message_user(request, f"{queryset.count()} teams rejected.")


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ["name", "team", "tournament", "role", "jersey_number"]
    list_filter = ["tournament", "role", "batting_style", "bowling_style"]
    search_fields = ["name", "team__name"]


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = [
        "match_number", "tournament", "team1", "team2", "match_date",
        "status", "innings1_score", "innings1_wickets", "innings2_score", "innings2_wickets",
    ]
    list_filter = ["tournament", "status", "format"]
    search_fields = ["team1__name", "team2__name", "title"]
    inlines = [MatchPlayingXIInline, BattingScorecardInline, BowlingScorecardInline]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        ("Basic Info", {
            "fields": ("tournament", "match_number", "title", "team1", "team2",
                       "venue", "match_date", "format", "total_overs", "status")
        }),
        ("Toss", {
            "fields": ("toss_winner", "toss_decision")
        }),
        ("Live State", {
            "fields": ("batting_team", "bowling_team", "current_batsman1", "current_batsman2",
                       "current_bowler", "current_innings", "current_over", "current_ball",
                       "required_runs", "required_balls", "youtube_live_id")
        }),
        ("Innings 1", {
            "fields": ("innings1_team", "innings1_score", "innings1_wickets",
                       "innings1_overs", "innings1_extras")
        }),
        ("Innings 2", {
            "fields": ("innings2_team", "innings2_score", "innings2_wickets",
                       "innings2_overs", "innings2_extras")
        }),
        ("Result", {
            "fields": ("winner", "result_text", "man_of_match")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )


@admin.register(BallCommentary)
class BallCommentaryAdmin(admin.ModelAdmin):
    list_display = [
        "match", "innings_number", "over_number", "ball_number",
        "batsman", "bowler", "runs_scored", "extra_type", "is_wicket", "created_at",
    ]
    list_filter = ["match", "innings_number", "is_wicket", "extra_type"]
    search_fields = ["batsman__name", "bowler__name", "commentary_text"]
    readonly_fields = ["created_at"]


@admin.register(InningsExtras)
class InningsExtrasAdmin(admin.ModelAdmin):
    list_display = ["match", "innings_number", "wides", "no_balls", "leg_byes", "byes", "penalty"]
    list_filter = ["match"]
