from django.urls import path

from . import views

app_name = "hbpl"

urlpatterns = [
    path("", views.HomeView.as_view(), name="home"),
    path("about/", views.AboutView.as_view(), name="about"),
    path("management/", views.ManagementView.as_view(), name="management"),
    path("teams/", views.TeamsView.as_view(), name="teams"),
    path("schedule/", views.ScheduleView.as_view(), name="schedule"),
    path("hbpl-2025/", views.HBPL2025View.as_view(), name="hbpl-2025"),
    path("gallery/", views.GalleryView.as_view(), name="gallery"),
    path("volunteer/", views.VolunteerView.as_view(), name="volunteer"),
    path("register/", views.TeamRegistrationView.as_view(), name="team-register"),
    path("exam-portal/", views.ExamPortalView.as_view(), name="exam-portal"),
    path("exam-portal/register/", views.ExamRegistrationView.as_view(), name="exam-register"),
    path("exam-portal/result/", views.ExamResultView.as_view(), name="exam-result"),
    path("admin-actions/exam/bulk-download/", views.BulkExamDownloadView.as_view(), name="exam-bulk-download"),
    path("admin-actions/exam/bulk-download/certificates.zip", views.BulkCertificateZipDownloadView.as_view(), name="bulk-certificates"),
    path("admin-actions/exam/bulk-download/reports.zip", views.BulkReportZipDownloadView.as_view(), name="bulk-reports"),
    path("exam-portal/admit-card/", views.AdmitCardDownloadView.as_view(), name="admit-card"),
    path("exam-portal/test-copy/", views.TestCopyDownloadView.as_view(), name="test-copy"),
    path("exam-portal/certificate/", views.CertificateDownloadView.as_view(), name="certificate"),
    path("exam-portal/report/", views.ResultReportDownloadView.as_view(), name="result-report"),
]
