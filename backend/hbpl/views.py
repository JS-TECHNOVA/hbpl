from datetime import date
import io
import zipfile

from django.contrib import messages
from django.contrib.auth.mixins import UserPassesTestMixin
from django.http import Http404, HttpResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import FormView, ListView, TemplateView

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from api.models import (
    ExamRegistration,
    ExamSettings,
    GalleryImage,
    ManagementMember,
    Match,
    Team,
    Volunteer,
)
from .forms import ExamRegistrationForm, ExamResultLookupForm, TeamRegistrationForm


class HomeView(TemplateView):
    template_name = "hbpl/home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["team_count"] = Team.objects.count()
        context["student_count"] = ExamRegistration.objects.count()
        context["next_match_date"] = date(2026, 6, 10)
        return context


class AboutView(TemplateView):
    template_name = "hbpl/about.html"


class ManagementView(ListView):
    template_name = "hbpl/management.html"
    context_object_name = "members"
    model = ManagementMember


class TeamsView(ListView):
    template_name = "hbpl/teams.html"
    context_object_name = "teams"
    model = Team


class ScheduleView(TemplateView):
    template_name = "hbpl/schedule.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["matches_2026"] = Match.objects.filter(season=2026).order_by("date", "id")
        context["matches_2025"] = Match.objects.filter(season=2025).order_by("date", "id")
        return context


class HBPL2025View(ListView):
    template_name = "hbpl/hbpl_2025.html"
    context_object_name = "matches"

    def get_queryset(self):
        match_type = self.request.GET.get("type")
        queryset = Match.objects.filter(season=2025).order_by("date", "id")
        if match_type in {"league", "semi", "final"}:
            queryset = queryset.filter(match_type=match_type)
        return queryset


class GalleryView(ListView):
    template_name = "hbpl/gallery.html"
    context_object_name = "images"
    model = GalleryImage


class VolunteerView(ListView):
    template_name = "hbpl/volunteer.html"
    context_object_name = "volunteers"
    model = Volunteer


class TeamRegistrationView(FormView):
    template_name = "hbpl/team_register.html"
    form_class = TeamRegistrationForm
    success_url = reverse_lazy("hbpl:team-register")

    def form_valid(self, form):
        form.save()
        messages.success(self.request, "Team registration submitted successfully.")
        return super().form_valid(form)


class ExamPortalView(TemplateView):
    template_name = "hbpl/exam_portal.html"


class ExamRegistrationView(FormView):
    template_name = "hbpl/exam_register.html"
    form_class = ExamRegistrationForm
    success_url = reverse_lazy("hbpl:exam-register")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["registration_closed"] = ExamSettings.get_settings().registration_closed
        return context

    def post(self, request, *args, **kwargs):
        if ExamSettings.get_settings().registration_closed:
            messages.error(request, "Exam registration is currently closed.")
            return self.get(request, *args, **kwargs)
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        instance = form.save(commit=False)
        if not instance.roll_number:
            next_number = (ExamRegistration.objects.order_by("-id").values_list("id", flat=True).first() or 0) + 1
            while True:
                roll_number = f"HBPL{next_number:05d}"
                if not ExamRegistration.objects.filter(roll_number=roll_number).exists():
                    instance.roll_number = roll_number
                    break
                next_number += 1
        instance.save()
        messages.success(self.request, "Exam registration submitted successfully.")
        return super().form_valid(form)


class ExamResultView(FormView):
    template_name = "hbpl/exam_result.html"
    form_class = ExamResultLookupForm

    def form_valid(self, form):
        result = ExamRegistration.objects.filter(
            roll_number__iexact=form.cleaned_data["roll_number"],
            date_of_birth=form.cleaned_data["date_of_birth"],
        ).first()

        if result is None:
            form.add_error(None, "No student record found for the provided roll number and date of birth.")
            return self.form_invalid(form)

        context = self.get_context_data(form=form, result=result, lookup_done=True)
        return self.render_to_response(context)


class StaffRequiredMixin(UserPassesTestMixin):
    login_url = "/admin/login/"

    def test_func(self):
        return bool(self.request.user.is_authenticated and self.request.user.is_staff)


class BulkExamDownloadView(StaffRequiredMixin, TemplateView):
    template_name = "hbpl/exam_bulk_download.html"

    def _published_queryset(self):
        queryset = ExamRegistration.objects.filter(result_status=ExamRegistration.ResultStatus.PUBLISHED)

        school_name = str(self.request.GET.get("school_name", "")).strip()
        class_name = str(self.request.GET.get("class_name", "")).strip()

        if school_name:
            queryset = queryset.filter(school_name__icontains=school_name)
        if class_name:
            queryset = queryset.filter(class_name__icontains=class_name)

        return queryset.order_by("roll_number")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        queryset = self._published_queryset()
        context["students"] = queryset
        context["count"] = queryset.count()
        context["school_name"] = str(self.request.GET.get("school_name", "")).strip()
        context["class_name"] = str(self.request.GET.get("class_name", "")).strip()
        return context


class PdfMixin:
    page_size = A4
    exam_name = "HBPL General Aptitude Competition 2026"
    organization = "Harpur Belahi Premier League (HBPL)"
    exam_center = "HBPL Main Campus, Harpur Belahi"
    exam_date = "10 June 2026"

    def _student_from_query(self, request):
        roll_number = str(request.GET.get("roll_number", "")).strip().upper()
        date_of_birth = request.GET.get("date_of_birth")
        if not roll_number or not date_of_birth:
            raise Http404("Required query parameters are missing.")

        student = ExamRegistration.objects.filter(
            roll_number__iexact=roll_number,
            date_of_birth=date_of_birth,
        ).first()
        if student is None:
            raise Http404("Student not found.")
        return student

    def _draw_page_frame(self, pdf, width, height):
        pdf.setLineWidth(1)
        pdf.rect(24, 24, width - 48, height - 48)

    def _draw_header(self, pdf, width, title):
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawCentredString(width / 2, 792, self.organization)
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawCentredString(width / 2, 770, title)
        pdf.setFont("Helvetica", 10)
        pdf.drawCentredString(width / 2, 754, self.exam_name)

    def _build_certificate_pdf_bytes(self, student):
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=self.page_size)
        width, height = self.page_size
        self._draw_page_frame(pdf, width, height)

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawCentredString(width / 2, height - 80, self.organization)

        pdf.setFont("Helvetica-Bold", 30)
        pdf.drawCentredString(width / 2, height - 130, "Certificate of Participation")

        pdf.setFont("Helvetica", 14)
        pdf.drawCentredString(width / 2, height - 168, self.exam_name)

        pdf.setFont("Helvetica", 13)
        pdf.drawCentredString(width / 2, height - 230, "This is to certify that")

        pdf.setFont("Helvetica-Bold", 22)
        pdf.drawCentredString(width / 2, height - 270, student.full_name)

        pdf.setFont("Helvetica", 13)
        score_text = "-"
        if student.marks_obtained is not None:
            score_text = f"{student.marks_obtained}/{student.total_marks}"
        pdf.drawCentredString(width / 2, height - 315, f"Roll Number: {student.roll_number} | Score: {score_text}")
        pdf.drawCentredString(width / 2, height - 342, f"Class: {student.class_name or '-'} | School: {student.school_name or '-'}")
        pdf.drawCentredString(width / 2, height - 375, "for participating in this academic event with dedication.")

        pdf.line(80, 140, 250, 140)
        pdf.line(width - 250, 140, width - 80, 140)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(80, 124, "Event Coordinator")
        pdf.drawString(width - 250, 124, "Chief Organizer")

        pdf.setFont("Helvetica-Oblique", 10)
        pdf.drawString(40, 60, "Generated automatically by HBPL Exam Portal")
        pdf.showPage()
        pdf.save()
        return buffer.getvalue()

    def _build_result_report_pdf_bytes(self, student):
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=self.page_size)
        width, height = self.page_size
        self._draw_page_frame(pdf, width, height)
        self._draw_header(pdf, width, "Result Report")

        pdf.setFont("Helvetica", 12)
        rows = [
            ("Name", student.full_name),
            ("Roll Number", student.roll_number),
            ("Date of Birth", str(student.date_of_birth)),
            ("School", student.school_name or "-"),
            ("Class", student.class_name or "-"),
            ("Marks", f"{student.marks_obtained or '-'} / {student.total_marks}"),
            ("Rank", str(student.rank or "-")),
            ("Remarks", student.remarks or "-"),
            ("Exam Date", self.exam_date),
            ("Exam Center", self.exam_center),
        ]

        y = 710
        for label, value in rows:
            pdf.drawString(40, y, f"{label}: {value}")
            y -= 24

        pdf.setFont("Helvetica-Oblique", 10)
        pdf.drawString(40, 60, "Generated automatically by HBPL Exam Portal")
        pdf.showPage()
        pdf.save()
        return buffer.getvalue()


class AdmitCardDownloadView(PdfMixin, View):
    def get(self, request, *args, **kwargs):
        student = self._student_from_query(request)
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="admit-card-{student.roll_number}.pdf"'

        pdf = canvas.Canvas(response, pagesize=self.page_size)
        width, height = self.page_size
        self._draw_page_frame(pdf, width, height)
        self._draw_header(pdf, width, "Exam Admit Card")

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, 720, "Candidate Details")

        pdf.setFont("Helvetica", 12)
        details = [
            f"Student Name : {student.full_name}",
            f"Roll Number  : {student.roll_number}",
            f"Date of Birth: {student.date_of_birth}",
            f"School       : {student.school_name or '-'}",
            f"Class        : {student.class_name or '-'}",
            f"Exam Date    : {self.exam_date}",
            f"Exam Center  : {self.exam_center}",
            "Reporting Time: 09:00 AM",
        ]

        y = 694
        for line in details:
            pdf.drawString(40, y, line)
            y -= 24

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(40, 468, "Exam Day Instructions")

        pdf.setFont("Helvetica", 11)
        instructions = [
            "1. Bring this admit card with one valid school ID.",
            "2. Reach exam center at least 30 minutes before reporting time.",
            "3. Mobile phones and smart devices are not allowed.",
            "4. Use only blue or black pen for objective/subjective sections.",
        ]
        y = 444
        for line in instructions:
            pdf.drawString(48, y, line)
            y -= 20

        pdf.line(40, 118, 220, 118)
        pdf.line(width - 220, 118, width - 40, 118)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, 104, "Coordinator Signature")
        pdf.drawString(width - 220, 104, "Student Signature")

        pdf.setFont("Helvetica-Oblique", 10)
        pdf.drawString(40, 60, "Generated automatically by HBPL Exam Portal")
        pdf.showPage()
        pdf.save()
        return response


class CertificateDownloadView(PdfMixin, View):
    def get(self, request, *args, **kwargs):
        student = self._student_from_query(request)
        if student.result_status != ExamRegistration.ResultStatus.PUBLISHED:
            messages.error(request, "Certificate is available only after result publication.")
            return redirect("hbpl:exam-result")

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="certificate-{student.roll_number}.pdf"'

        response.write(self._build_certificate_pdf_bytes(student))
        return response


class ResultReportDownloadView(PdfMixin, View):
    def get(self, request, *args, **kwargs):
        student = self._student_from_query(request)

        if student.result_status != ExamRegistration.ResultStatus.PUBLISHED:
            messages.error(request, "Report is available only after result publication.")
            return redirect("hbpl:exam-result")

        if student.result_file:
            return redirect(student.result_file.url)

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="result-report-{student.roll_number}.pdf"'

        response.write(self._build_result_report_pdf_bytes(student))
        return response


class TestCopyDownloadView(PdfMixin, View):
    def get(self, request, *args, **kwargs):
        student = self._student_from_query(request)

        if student.result_status != ExamRegistration.ResultStatus.PUBLISHED:
            messages.error(request, "Test copy is available only after result publication.")
            return redirect("hbpl:exam-result")

        if not student.test_copy:
            messages.error(request, "Test copy is not uploaded yet.")
            return redirect("hbpl:exam-result")

        return redirect(student.test_copy.url)


class BulkCertificateZipDownloadView(PdfMixin, StaffRequiredMixin, View):
    def get_queryset(self, request):
        queryset = ExamRegistration.objects.filter(result_status=ExamRegistration.ResultStatus.PUBLISHED)
        school_name = str(request.GET.get("school_name", "")).strip()
        class_name = str(request.GET.get("class_name", "")).strip()
        if school_name:
            queryset = queryset.filter(school_name__icontains=school_name)
        if class_name:
            queryset = queryset.filter(class_name__icontains=class_name)
        return queryset.order_by("roll_number")

    def get(self, request, *args, **kwargs):
        students = self.get_queryset(request)
        if not students.exists():
            messages.error(request, "No published students found for selected filters.")
            return redirect("hbpl:exam-bulk-download")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for student in students:
                filename = f"certificates/certificate-{student.roll_number}.pdf"
                archive.writestr(filename, self._build_certificate_pdf_bytes(student))

        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = 'attachment; filename="hbpl-certificates.zip"'
        return response


class BulkReportZipDownloadView(PdfMixin, StaffRequiredMixin, View):
    def get_queryset(self, request):
        queryset = ExamRegistration.objects.filter(result_status=ExamRegistration.ResultStatus.PUBLISHED)
        school_name = str(request.GET.get("school_name", "")).strip()
        class_name = str(request.GET.get("class_name", "")).strip()
        if school_name:
            queryset = queryset.filter(school_name__icontains=school_name)
        if class_name:
            queryset = queryset.filter(class_name__icontains=class_name)
        return queryset.order_by("roll_number")

    def get(self, request, *args, **kwargs):
        students = self.get_queryset(request)
        if not students.exists():
            messages.error(request, "No published students found for selected filters.")
            return redirect("hbpl:exam-bulk-download")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for student in students:
                if student.result_file:
                    ext = student.result_file.name.rsplit(".", 1)[-1].lower()
                    file_name = f"reports/report-{student.roll_number}.{ext}"
                    with student.result_file.open("rb") as report_file:
                        archive.writestr(file_name, report_file.read())
                else:
                    file_name = f"reports/report-{student.roll_number}.pdf"
                    archive.writestr(file_name, self._build_result_report_pdf_bytes(student))

        response = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = 'attachment; filename="hbpl-reports.zip"'
        return response
