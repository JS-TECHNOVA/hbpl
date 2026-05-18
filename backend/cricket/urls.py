from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"admin/matches", views.MatchAdminViewSet, basename="admin-match")

urlpatterns = [
    # Router (admin match CRUD + actions)
    path("", include(router.urls)),

    # Public
    path("tournaments/", views.TournamentListView.as_view(), name="cricket-tournament-list"),
    path("tournaments/<uuid:pk>/", views.TournamentDetailView.as_view(), name="cricket-tournament-detail"),
    path("tournaments/<uuid:pk>/points-table/", views.TournamentPointsTableView.as_view(), name="cricket-points-table"),
    path("tournaments/<uuid:pk>/leaderboard/", views.TournamentLeaderboardView.as_view(), name="cricket-leaderboard"),
    path("matches/", views.MatchListView.as_view(), name="cricket-match-list"),
    path("matches/<uuid:pk>/", views.MatchDetailView.as_view(), name="cricket-match-detail"),
    path("matches/<uuid:pk>/live/", views.MatchLiveView.as_view(), name="cricket-match-live"),
    path("matches/<uuid:pk>/scorecard/", views.MatchScorecardView.as_view(), name="cricket-match-scorecard"),
    path("matches/<uuid:pk>/commentary/", views.MatchCommentaryView.as_view(), name="cricket-match-commentary"),
    path("teams/register/", views.PublicTeamRegistrationView.as_view(), name="cricket-team-register"),
    path("teams/", views.TeamListView.as_view(), name="cricket-team-list"),
    path("teams/<uuid:pk>/", views.TeamDetailView.as_view(), name="cricket-team-detail"),
    path("players/", views.PlayerListView.as_view(), name="cricket-player-list"),
    path("players/<uuid:pk>/", views.PlayerDetailView.as_view(), name="cricket-player-detail"),
    path("players/<uuid:pk>/stats/", views.PlayerTournamentStatsView.as_view(), name="cricket-player-stats"),

    # Admin CRUD
    path("admin/tournaments/", views.AdminTournamentListCreateView.as_view(), name="admin-tournament-list"),
    path("admin/tournaments/<uuid:pk>/", views.AdminTournamentDetailView.as_view(), name="admin-tournament-detail"),
    path("admin/teams/", views.AdminTeamListCreateView.as_view(), name="admin-team-list"),
    path("admin/teams/<uuid:pk>/", views.AdminTeamDetailView.as_view(), name="admin-team-detail"),
    path("admin/teams/<uuid:pk>/approve/", views.AdminTeamApproveView.as_view(), name="admin-team-approve"),
    path("admin/teams/<uuid:pk>/set-designations/", views.AdminTeamSetDesignationsView.as_view(), name="admin-team-designations"),
    path("admin/players/", views.AdminPlayerListCreateView.as_view(), name="admin-player-list"),
    path("admin/players/<uuid:pk>/", views.AdminPlayerDetailView.as_view(), name="admin-player-detail"),
]
