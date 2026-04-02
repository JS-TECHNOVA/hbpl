from django.urls import path
from . import views

urlpatterns = [
    # ── Public endpoints ──────────────────────────────────────────────────────
    path("teams/", views.TeamListView.as_view(), name="team-list"),
    path("matches/", views.MatchListView.as_view(), name="match-list"),
    path("management/", views.ManagementListView.as_view(), name="management-list"),
    path("gallery/", views.GalleryListView.as_view(), name="gallery-list"),
    path("volunteers/", views.VolunteerListView.as_view(), name="volunteer-list"),
    path("register/", views.TeamRegistrationCreateView.as_view(), name="register"),
    path("exam/registrations/", views.ExamRegistrationCreateView.as_view(), name="exam-registration-create"),
    path("exam/results/lookup/", views.ExamResultLookupView.as_view(), name="exam-result-lookup"),

    # ── Admin endpoints (require Token auth + is_staff) ───────────────────────
    path("admin/login/", views.AdminLoginView.as_view(), name="admin-login"),
    path("admin/me/", views.AdminMeView.as_view(), name="admin-me"),
    path("admin/exam/registrations/", views.AdminExamListView.as_view(), name="admin-exam-list"),
    path("admin/exam/registrations/<int:pk>/", views.AdminExamDetailView.as_view(), name="admin-exam-detail"),
]

urlpatterns += [
    path("admin/volunteers/", views.AdminVolunteerListCreateView.as_view(), name="admin-volunteer-list"),
    path("admin/volunteers/<int:pk>/", views.AdminVolunteerDetailView.as_view(), name="admin-volunteer-detail"),
    path("admin/gallery/", views.AdminGalleryListCreateView.as_view(), name="admin-gallery-list"),
    path("admin/gallery/<int:pk>/", views.AdminGalleryDetailView.as_view(), name="admin-gallery-detail"),
    path("admin/management/", views.AdminManagementListCreateView.as_view(), name="admin-management-list"),
    path("admin/management/<int:pk>/", views.AdminManagementDetailView.as_view(), name="admin-management-detail"),
    path("admin/teams/", views.AdminTeamListCreateView.as_view(), name="admin-team-list"),
    path("admin/teams/<int:pk>/", views.AdminTeamDetailView.as_view(), name="admin-team-detail"),
    path("admin/matches/", views.AdminMatchListCreateView.as_view(), name="admin-match-list"),
    path("admin/matches/<int:pk>/", views.AdminMatchDetailView.as_view(), name="admin-match-detail"),
]
