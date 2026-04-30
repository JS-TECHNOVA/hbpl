from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ── Public endpoints ──────────────────────────────────────────────────────
    path("teams/", views.TeamListView.as_view(), name="team-list"),
    path("matches/", views.MatchListView.as_view(), name="match-list"),
    path("management/", views.ManagementListView.as_view(), name="management-list"),
    path("gallery/", views.GalleryListView.as_view(), name="gallery-list"),
    path("volunteers/", views.VolunteerListView.as_view(), name="volunteer-list"),
    path("register/payment-order/", views.TeamRegistrationPaymentOrderView.as_view(), name="register-payment-order"),
    path("register/", views.TeamRegistrationCreateView.as_view(), name="register"),
    path("register/<int:pk>/receipt/", views.TeamRegistrationReceiptDownloadView.as_view(), name="register-receipt-download"),
    path("exam/registrations/", views.ExamRegistrationCreateView.as_view(), name="exam-registration-create"),
    path("exam/results/lookup/", views.ExamResultLookupView.as_view(), name="exam-result-lookup"),
    path("exam/results/admit-card/download/", views.ExamAdmitCardDownloadView.as_view(), name="exam-admit-card-download"),
    path("exam/results/certificate/download/", views.ExamCertificateDownloadView.as_view(), name="exam-certificate-download"),
    path("exam/portal/content/", views.ExamPortalContentView.as_view(), name="exam-portal-content"),
    path("exam/important-dates/", views.ExamImportantDateListView.as_view(), name="exam-important-dates"),
    path("exam/support-schools/", views.ExamSupportSchoolListView.as_view(), name="exam-support-schools"),
    path("exam/syllabus/", views.ExamSyllabusItemListView.as_view(), name="exam-syllabus"),
    path("exam/sample-papers/", views.ExamSamplePaperListView.as_view(), name="exam-sample-papers"),
    path("exam/centers/", views.ExamCenterDetailListView.as_view(), name="exam-centers"),
    path("exam/faqs/", views.ExamFaqListView.as_view(), name="exam-faqs"),
    path("exam/toppers/", views.ExamTopperListView.as_view(), name="exam-toppers"),
    path("exam/complaints/", views.ComplaintCreateAPIView.as_view(), name="exam-complaint-create"),
    path("exam/complaints/status/", views.ExamComplaintStatusView.as_view(), name="exam-complaint-status"),

    # ── Admin endpoints (require Token auth + is_staff) ───────────────────────
    path("admin/complaints/", views.AdminComplaintListAPIView.as_view(), name="admin-complaint-list"),
    path("admin/complaints/<int:pk>/", views.AdminComplaintDetailAPIView.as_view(), name="admin-complaint-detail"),
    path("admin/login/", views.AdminLoginView.as_view(), name="admin-login"),
    path("admin/me/", views.AdminMeView.as_view(), name="admin-me"),
    path("admin/exam/registrations/", views.AdminExamListView.as_view(), name="admin-exam-list"),
    path("admin/exam/registrations/<int:pk>/", views.AdminExamDetailView.as_view(), name="admin-exam-detail"),
    path("admin/exam/registrations/<int:pk>/generate-docs/", views.AdminGenerateExamDocumentsView.as_view(), name="admin-exam-generate-docs"),
    path("admin/exam/registrations/export/csv/", views.AdminExamExportCSVView.as_view(), name="admin-exam-export-csv"),
    path("admin/exam/registrations/import/", views.AdminExamImportStudentsView.as_view(), name="admin-exam-import-students"),
    path("admin/exam/registrations/import-marks/", views.AdminExamImportMarksView.as_view(), name="admin-exam-import-marks"),
    path("admin/exam/registrations/upload-test-copies/", views.AdminExamUploadTestCopiesView.as_view(), name="admin-exam-upload-test-copies"),
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
    path("admin/team-registrations/", views.AdminTeamRegistrationListView.as_view(), name="admin-team-registration-list"),
    path("admin/matches/", views.AdminMatchListCreateView.as_view(), name="admin-match-list"),
    path("admin/matches/<int:pk>/", views.AdminMatchDetailView.as_view(), name="admin-match-detail"),
    path("admin/exam/important-dates/", views.AdminExamImportantDateListCreateView.as_view(), name="admin-exam-important-date-list"),
    path("admin/exam/important-dates/<int:pk>/", views.AdminExamImportantDateDetailView.as_view(), name="admin-exam-important-date-detail"),
    path("admin/exam/support-schools/", views.AdminExamSupportSchoolListCreateView.as_view(), name="admin-exam-support-school-list"),
    path("admin/exam/support-schools/<int:pk>/", views.AdminExamSupportSchoolDetailView.as_view(), name="admin-exam-support-school-detail"),
    path("admin/exam/syllabus/", views.AdminExamSyllabusItemListCreateView.as_view(), name="admin-exam-syllabus-list"),
    path("admin/exam/syllabus/<int:pk>/", views.AdminExamSyllabusItemDetailView.as_view(), name="admin-exam-syllabus-detail"),
    path("admin/exam/sample-papers/", views.AdminExamSamplePaperListCreateView.as_view(), name="admin-exam-sample-paper-list"),
    path("admin/exam/sample-papers/<int:pk>/", views.AdminExamSamplePaperDetailView.as_view(), name="admin-exam-sample-paper-detail"),
    path("admin/exam/centers/", views.AdminExamCenterDetailListCreateView.as_view(), name="admin-exam-center-list"),
    path("admin/exam/centers/<int:pk>/", views.AdminExamCenterDetailDetailView.as_view(), name="admin-exam-center-detail"),
    path("admin/exam/faqs/", views.AdminExamFaqListCreateView.as_view(), name="admin-exam-faq-list"),
    path("admin/exam/faqs/<int:pk>/", views.AdminExamFaqDetailView.as_view(), name="admin-exam-faq-detail"),
    path("admin/exam/toppers/", views.AdminExamTopperListCreateView.as_view(), name="admin-exam-topper-list"),
    path("admin/exam/toppers/<int:pk>/", views.AdminExamTopperDetailView.as_view(), name="admin-exam-topper-detail"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)