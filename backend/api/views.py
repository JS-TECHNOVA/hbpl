from rest_framework.permissions import IsAdminUser
import csv
import json
from datetime import date, datetime, timedelta
from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission, DjangoModelPermissions, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    Team,
    Match,
    ManagementMember,
    GalleryImage,
    Volunteer,
    TeamRegistration,
    ExamRegistration,
    ExamImportantDate,
    ExamSupportSchool,
    ExamSyllabusItem,
    ExamSamplePaper,
    ExamCenterDetail,
    ExamFaq,
    ExamTopper,
    ExamSettings,
    Complaint,
)
from .serializers import (
    TeamSerializer,
    MatchSerializer,
    ManagementMemberSerializer,
    GalleryImageSerializer,
    VolunteerSerializer,
    TeamRegistrationSerializer,
    ExamRegistrationCreateSerializer,
    ExamResultLookupSerializer,
    ExamResultResponseSerializer,
    AdminExamRegistrationSerializer,
    ExamImportantDateSerializer,
    ExamSupportSchoolSerializer,
    ExamSyllabusItemSerializer,
    ExamSamplePaperSerializer,
    ExamCenterDetailSerializer,
    ExamFaqSerializer,
    ExamTopperSerializer,
)
from .serializers import (
    AdminVolunteerSerializer,
    AdminGalleryImageSerializer,
    AdminManagementMemberSerializer,
    AdminTeamSerializer,
    AdminMatchSerializer,
    AdminExamImportantDateSerializer,
    AdminExamSupportSchoolSerializer,
    AdminExamSyllabusItemSerializer,
    AdminExamSamplePaperSerializer,
    AdminExamCenterDetailSerializer,
    AdminExamFaqSerializer,
    AdminExamTopperSerializer,
    ComplaintSerializer,
)
from rest_framework.parsers import MultiPartParser, FormParser



# Admin: List all complaints
class AdminComplaintListAPIView(generics.ListAPIView):
    queryset = Complaint.objects.select_related("registration").all().order_by("-created_at")
    serializer_class = ComplaintSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
    
# Complaint submission API
class ComplaintCreateAPIView(generics.CreateAPIView):
    serializer_class = ComplaintSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = ComplaintSerializer.Meta.model.objects.all()

class IsStaffUser(BasePermission):
    """Allows access only to Django staff users authenticated via token."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class StaffWithModelPermissions(DjangoModelPermissions):
    """
    Requires is_staff AND the appropriate Django model permission for write operations:
      POST   → app.add_<model>
      PATCH  → app.change_<model>
      DELETE → app.delete_<model>
    Read operations (GET) only require is_staff.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            return False
        return super().has_permission(request, view)


class TeamListView(generics.ListAPIView):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


class MatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        qs = Match.objects.all()
        season = self.request.query_params.get("season")
        if season is not None:
            qs = qs.filter(season=season)
        return qs


class ManagementListView(generics.ListAPIView):
    queryset = ManagementMember.objects.all()
    serializer_class = ManagementMemberSerializer


class GalleryListView(generics.ListAPIView):
    queryset = GalleryImage.objects.all()
    serializer_class = GalleryImageSerializer


class VolunteerListView(generics.ListAPIView):
    queryset = Volunteer.objects.all()
    serializer_class = VolunteerSerializer


class TeamRegistrationCreateView(generics.CreateAPIView):
    queryset = TeamRegistration.objects.all()
    serializer_class = TeamRegistrationSerializer


class ExamRegistrationCreateView(generics.CreateAPIView):
    queryset = ExamRegistration.objects.all()
    serializer_class = ExamRegistrationCreateSerializer

    def create(self, request, *args, **kwargs):
        if ExamSettings.get_settings().registration_closed:
            return Response(
                {"detail": "Exam registration is currently closed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


class ExamResultLookupView(APIView):
    def post(self, request, *args, **kwargs):
        lookup_serializer = ExamResultLookupSerializer(data=request.data)
        lookup_serializer.is_valid(raise_exception=True)

        registration = ExamRegistration.objects.filter(
            roll_number__iexact=lookup_serializer.validated_data["roll_number"],
            date_of_birth=lookup_serializer.validated_data["date_of_birth"],
        ).first()

        if registration is None:
            return Response(
                {"detail": "No student record found for the provided roll number and date of birth."},
                status=status.HTTP_404_NOT_FOUND,
            )

        result_serializer = ExamResultResponseSerializer(registration, context={"request": request})
        return Response(result_serializer.data)


class ExamCertificateDownloadView(APIView):
    def post(self, request, *args, **kwargs):
        lookup_serializer = ExamResultLookupSerializer(data=request.data)
        lookup_serializer.is_valid(raise_exception=True)

        registration = ExamRegistration.objects.filter(
            roll_number__iexact=lookup_serializer.validated_data["roll_number"],
            date_of_birth=lookup_serializer.validated_data["date_of_birth"],
        ).first()

        if registration is None:
            return Response(
                {"detail": "No student record found for the provided roll number and date of birth."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if registration.result_status != ExamRegistration.ResultStatus.PUBLISHED:
            return Response(
                {"detail": "Certificate is available only after results are published."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .certificate import generate_participation_certificate

        try:
            pdf_bytes = generate_participation_certificate(registration)
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "On-demand certificate generation failed for roll=%s",
                registration.roll_number,
            )
            return Response(
                {"detail": "Certificate generation failed. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="certificate_{registration.roll_number}.pdf"'
        )
        return response


class ExamAdmitCardDownloadView(APIView):
    def post(self, request, *args, **kwargs):
        lookup_serializer = ExamResultLookupSerializer(data=request.data)
        lookup_serializer.is_valid(raise_exception=True)

        registration = ExamRegistration.objects.filter(
            roll_number__iexact=lookup_serializer.validated_data["roll_number"],
            date_of_birth=lookup_serializer.validated_data["date_of_birth"],
        ).first()

        if registration is None:
            return Response(
                {"detail": "No student record found for the provided roll number and date of birth."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not registration.publish_admit_card:
            return Response(
                {"detail": "Admit card is not published yet."},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .admit_card import generate_admit_card

        try:
            pdf_bytes = generate_admit_card(registration)
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "On-demand admit card generation failed for roll=%s",
                registration.roll_number,
            )
            return Response(
                {"detail": "Admit card generation failed. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="admit_card_{registration.roll_number}.pdf"'
        )
        return response


class ExamImportantDateListView(generics.ListAPIView):
    queryset = ExamImportantDate.objects.all()
    serializer_class = ExamImportantDateSerializer


class ExamSupportSchoolListView(generics.ListAPIView):
    queryset = ExamSupportSchool.objects.all()
    serializer_class = ExamSupportSchoolSerializer


class ExamSyllabusItemListView(generics.ListAPIView):
    queryset = ExamSyllabusItem.objects.all()
    serializer_class = ExamSyllabusItemSerializer


class ExamSamplePaperListView(generics.ListAPIView):
    queryset = ExamSamplePaper.objects.all()
    serializer_class = ExamSamplePaperSerializer


class ExamCenterDetailListView(generics.ListAPIView):
    queryset = ExamCenterDetail.objects.all()
    serializer_class = ExamCenterDetailSerializer


class ExamFaqListView(generics.ListAPIView):
    queryset = ExamFaq.objects.all()
    serializer_class = ExamFaqSerializer


class ExamTopperListView(generics.ListAPIView):
    queryset = ExamTopper.objects.select_related("student")
    serializer_class = ExamTopperSerializer


class ExamPortalContentView(APIView):
    def get(self, request, *args, **kwargs):
        context = {"request": request}
        settings = ExamSettings.get_settings()
        return Response({
            "registration_closed": settings.registration_closed,
            "important_dates": ExamImportantDateSerializer(ExamImportantDate.objects.all(), many=True, context=context).data,
            "support_schools": ExamSupportSchoolSerializer(ExamSupportSchool.objects.all(), many=True, context=context).data,
            "syllabus_items": ExamSyllabusItemSerializer(ExamSyllabusItem.objects.all(), many=True, context=context).data,
            "sample_papers": ExamSamplePaperSerializer(ExamSamplePaper.objects.all(), many=True, context=context).data,
            "center_details": ExamCenterDetailSerializer(ExamCenterDetail.objects.all(), many=True, context=context).data,
            "faqs": ExamFaqSerializer(ExamFaq.objects.all(), many=True, context=context).data,
            "toppers": ExamTopperSerializer(ExamTopper.objects.select_related("student"), many=True, context=context).data,
        })


# ── Admin views (require token auth + is_staff) ───────────────────────────────

class AdminLoginView(APIView):
    """POST username + password → token (only staff users)."""

    def post(self, request, *args, **kwargs):
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", ""))
        if not username or not password:
            return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_staff:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username, "email": user.email})


class AdminMeView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        return Response({
            "username": request.user.username,
            "email": request.user.email,
            "is_staff": request.user.is_staff,
            "is_superuser": request.user.is_superuser,
            "user_permissions": sorted(request.user.get_all_permissions()),
        })


class AdminExamListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamRegistrationSerializer

    def get_queryset(self):
        return ExamRegistration.objects.all().order_by("-created_at")


class AdminExamDetailView(generics.RetrieveUpdateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamRegistrationSerializer
    queryset = ExamRegistration.objects.all()
    http_method_names = ["get", "patch", "head", "options"]


class AdminVolunteerListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminVolunteerSerializer
    queryset = Volunteer.objects.all().order_by("order", "id")


class AdminVolunteerDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminVolunteerSerializer
    queryset = Volunteer.objects.all()


class AdminGalleryListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminGalleryImageSerializer
    queryset = GalleryImage.objects.all()


class AdminGalleryDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminGalleryImageSerializer
    queryset = GalleryImage.objects.all()


class AdminManagementListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminManagementMemberSerializer
    queryset = ManagementMember.objects.all().order_by("order", "id")


class AdminManagementDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminManagementMemberSerializer
    queryset = ManagementMember.objects.all()


class AdminTeamListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminTeamSerializer
    queryset = Team.objects.all()


class AdminTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminTeamSerializer
    queryset = Team.objects.all()


class AdminMatchListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminMatchSerializer
    queryset = Match.objects.all().order_by("date", "id")


class AdminMatchDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminMatchSerializer
    queryset = Match.objects.all()


class AdminExamImportantDateListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamImportantDateSerializer
    queryset = ExamImportantDate.objects.all()


class AdminExamImportantDateDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamImportantDateSerializer
    queryset = ExamImportantDate.objects.all()


class AdminExamSupportSchoolListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamSupportSchoolSerializer
    queryset = ExamSupportSchool.objects.all()


class AdminExamSupportSchoolDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamSupportSchoolSerializer
    queryset = ExamSupportSchool.objects.all()


class AdminExamSyllabusItemListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamSyllabusItemSerializer
    queryset = ExamSyllabusItem.objects.all()


class AdminExamSyllabusItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamSyllabusItemSerializer
    queryset = ExamSyllabusItem.objects.all()


class AdminExamSamplePaperListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamSamplePaperSerializer
    queryset = ExamSamplePaper.objects.all()


class AdminExamSamplePaperDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamSamplePaperSerializer
    queryset = ExamSamplePaper.objects.all()


class AdminExamCenterDetailListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamCenterDetailSerializer
    queryset = ExamCenterDetail.objects.all()


class AdminExamCenterDetailDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamCenterDetailSerializer
    queryset = ExamCenterDetail.objects.all()


class AdminExamFaqListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamFaqSerializer
    queryset = ExamFaq.objects.all()


class AdminExamFaqDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamFaqSerializer
    queryset = ExamFaq.objects.all()


class AdminExamTopperListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamTopperSerializer
    queryset = ExamTopper.objects.select_related("student")


class AdminExamTopperDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamTopperSerializer
    queryset = ExamTopper.objects.select_related("student")


class AdminGenerateExamDocumentsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk, *args, **kwargs):
        if not request.user.has_perm("api.change_examregistration"):
            return Response(
                {"detail": "You do not have permission to modify exam registrations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        registration = generics.get_object_or_404(ExamRegistration, pk=pk)
        doc_type = str(request.data.get("type", "both")).lower()

        if doc_type in {"admit", "both"}:
            from .admit_card import generate_admit_card

            try:
                pdf_bytes = generate_admit_card(registration)
                registration.admit_card_file.save(
                    f"admit_{registration.roll_number}.pdf",
                    ContentFile(pdf_bytes),
                    save=False,
                )
            except Exception:
                import logging

                logging.getLogger(__name__).exception(
                    "Admit card generation failed for registration pk=%s", pk
                )
                return Response(
                    {"detail": "Admit card generation failed. Please check server logs."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if doc_type in {"certificate", "both"}:
            from .certificate import generate_participation_certificate
            try:
                pdf_bytes = generate_participation_certificate(registration)
                registration.participation_certificate_file.save(
                    f"certificate_{registration.roll_number}.pdf",
                    ContentFile(pdf_bytes),
                    save=False,
                )
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "Certificate generation failed for registration pk=%s", pk
                )
                return Response(
                    {"detail": "Certificate generation failed. Please check server logs."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        registration.save(update_fields=["admit_card_file", "participation_certificate_file", "updated_at"])
        serializer = AdminExamRegistrationSerializer(registration, context={"request": request})
        return Response(serializer.data)


class AdminExamExportCSVView(APIView):
    """Export all exam registrations as CSV file for staff."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def get(self, request, *args, **kwargs):
        if not request.user.has_perm("api.view_examregistration"):
            return Response(
                {"detail": "You do not have permission to view exam registrations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        registrations = ExamRegistration.objects.all().order_by("roll_number")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="exam_students.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Roll Number", "Full Name", "Father Name", "Mother Name", "Date of Birth",
            "Phone", "Email", "School", "Class", "Examination Center", "Center Address", "Address",
            "Result Status", "Marks", "Total Marks", "Rank", "Remarks", "Created At"
        ])

        for reg in registrations:
            writer.writerow([
                reg.roll_number,
                reg.full_name,
                reg.father_name or "",
                reg.mother_name or "",
                reg.date_of_birth.isoformat() if reg.date_of_birth else "",
                reg.phone,
                reg.email or "",
                reg.school_name or "",
                reg.class_name or "",
                reg.examination_center or "",
                reg.center_address or "",
                reg.address or "",
                reg.result_status,
                reg.marks_obtained or "",
                reg.total_marks or "",
                reg.rank or "",
                reg.remarks or "",
                reg.created_at.isoformat() if reg.created_at else "",
            ])
        return response


class AdminExamImportStudentsView(APIView):
    """Scan and import student rows from CSV/XLSX with explicit column mapping."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    IMPORTABLE_FIELDS = {
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
    }

    REQUIRED_CREATE_FIELDS = {"full_name", "date_of_birth", "phone"}

    SYNONYMS = {
        "full_name": {"studentname", "name", "student", "candidate", "student_name"},
        "roll_number": {"roll", "rollno", "rollnumber", "roll_no", "roll no"},
        "date_of_birth": {"dob", "dateofbirth", "birthdate", "birth_date"},
        "phone": {"mobileno", "mobile", "phone", "mobno", "mob", "contact"},
        "school_name": {"school", "schoolname", "institution"},
        "class_name": {"class", "grade", "standard"},
        "examination_center": {"examcenter", "examinationcenter", "center", "centre"},
        "center_address": {"centeraddress", "centreaddress", "addresscenter", "examcenteraddress"},
        "father_name": {"father", "fathername", "fathersname"},
        "mother_name": {"mother", "mothername", "mothersname"},
        "email": {"emailid", "mail", "email"},
        "address": {"addr", "residentialaddress", "homeaddress"},
    }

    @staticmethod
    def _normalize(label):
        return "".join(ch for ch in str(label).strip().lower() if ch.isalnum())

    def _parse_date(self, value):
        if value is None:
            return None
        if isinstance(value, date):
            return value
        raw = str(value).strip()
        if not raw:
            return None

        patterns = [
            "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y",
            "%d-%b-%Y", "%d-%B-%Y", "%Y/%m/%d",
        ]
        for pattern in patterns:
            try:
                return datetime.strptime(raw, pattern).date()
            except ValueError:
                continue

        try:
            serial = float(raw)
            return (datetime(1899, 12, 30) + timedelta(days=serial)).date()
        except Exception:
            return None

    def _parse_file(self, uploaded_file):
        name = (uploaded_file.name or "").lower()

        if name.endswith(".csv"):
            content = uploaded_file.read().decode("utf-8-sig", errors="ignore")
            rows = list(csv.DictReader(content.splitlines()))
            headers = list(rows[0].keys()) if rows else []
            return headers, rows

        if name.endswith(".xlsx") or name.endswith(".xlsm"):
            try:
                load_workbook = __import__("openpyxl").load_workbook
            except ImportError as exc:
                raise RuntimeError("openpyxl is required to import Excel files. Please install it.") from exc

            wb = load_workbook(uploaded_file, read_only=True, data_only=True)
            ws = wb.active
            values = list(ws.values)
            if not values:
                return [], []

            headers = [str(v).strip() if v is not None else "" for v in values[0]]
            rows = []
            for row_vals in values[1:]:
                row = {}
                for idx, header in enumerate(headers):
                    row[header] = row_vals[idx] if idx < len(row_vals) else None
                rows.append(row)
            return headers, rows

        raise RuntimeError("Unsupported file format. Please upload CSV or XLSX.")

    def _suggest_mapping(self, headers):
        normalized_headers = {h: self._normalize(h) for h in headers}
        mapping = {}
        for db_field, keywords in self.SYNONYMS.items():
            selected = None
            for header, norm in normalized_headers.items():
                if norm == self._normalize(db_field) or norm in keywords:
                    selected = header
                    break
            if selected is not None:
                mapping[selected] = db_field
        return mapping

    def _validate_mapping(self, mapping, headers):
        if not isinstance(mapping, dict):
            raise ValueError("Invalid mapping payload.")

        for excel_col, db_field in mapping.items():
            if excel_col not in headers:
                raise ValueError(f"Mapped column '{excel_col}' not found in uploaded file.")
            if db_field and db_field not in self.IMPORTABLE_FIELDS:
                raise ValueError(f"Unsupported target field '{db_field}'.")

    def _coerce(self, field, value):
        if value is None:
            return None

        if field == "date_of_birth":
            return self._parse_date(value)

        text = str(value).strip()
        if field == "roll_number":
            return text.upper()
        if field == "phone":
            if text.endswith(".0"):
                text = text[:-2]
            return text
        return text

    def post(self, request, *args, **kwargs):
        if not request.user.has_perm("api.change_examregistration"):
            return Response(
                {"detail": "You do not have permission to import exam registrations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "Upload a CSV or XLSX file."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            headers, rows = self._parse_file(upload)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not headers:
            return Response({"detail": "File has no header row."}, status=status.HTTP_400_BAD_REQUEST)

        dry_run = str(request.data.get("dry_run", "false")).lower() in {"1", "true", "yes"}

        if dry_run:
            return Response(
                {
                    "headers": headers,
                    "row_count": len(rows),
                    "sample_rows": rows[:5],
                    "suggested_mapping": self._suggest_mapping(headers),
                    "importable_fields": sorted(self.IMPORTABLE_FIELDS),
                }
            )

        mapping_raw = request.data.get("mapping")
        if mapping_raw is None:
            return Response({"detail": "Mapping is required for import."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mapping = json.loads(mapping_raw) if isinstance(mapping_raw, str) else mapping_raw
            self._validate_mapping(mapping, headers)
        except (ValueError, json.JSONDecodeError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        imported = 0
        updated = 0
        skipped = 0
        errors = []

        for idx, row in enumerate(rows, start=2):
            payload = {}
            for excel_col, db_field in mapping.items():
                if not db_field:
                    continue
                coerced = self._coerce(db_field, row.get(excel_col))
                if coerced is not None and coerced != "":
                    payload[db_field] = coerced

            if not payload:
                skipped += 1
                continue

            roll_number = payload.get("roll_number")
            existing = None
            if roll_number:
                existing = ExamRegistration.objects.filter(roll_number__iexact=roll_number).first()

            if existing is not None:
                changed_fields = []
                for key, val in payload.items():
                    if getattr(existing, key) != val:
                        setattr(existing, key, val)
                        changed_fields.append(key)
                if changed_fields:
                    existing.save(update_fields=changed_fields + ["updated_at"])
                    updated += 1
                else:
                    skipped += 1
                continue

            missing = [f for f in self.REQUIRED_CREATE_FIELDS if not payload.get(f)]
            if missing:
                errors.append({"row": idx, "error": f"Missing required field(s): {', '.join(missing)}"})
                continue

            try:
                ExamRegistration.objects.create(**payload)
                imported += 1
            except Exception as exc:
                errors.append({"row": idx, "error": str(exc)})

        return Response(
            {
                "imported": imported,
                "updated": updated,
                "skipped": skipped,
                "errors": errors[:50],
                "error_count": len(errors),
            }
        )

        return response
