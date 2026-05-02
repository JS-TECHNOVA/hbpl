import base64
import csv
from io import BytesIO
import os
import secrets
import json
from urllib import error as urllib_error
from urllib import request as urllib_request

from rest_framework.permissions import IsAdminUser
from datetime import date, datetime, timedelta
from django.contrib.auth import authenticate
from django.core import signing
from django.core.files.base import ContentFile
from django.http import HttpResponse
from django.urls import reverse
from rest_framework import generics, status, filters
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission, DjangoModelPermissions, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from .models import (
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
    TeamRegistrationPaymentOrderSerializer,
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
    AdminTeamRegistrationSerializer,
    AdminMatchSerializer,
    AdminExamImportantDateSerializer,
    AdminExamSupportSchoolSerializer,
    AdminExamSyllabusItemSerializer,
    AdminExamSamplePaperSerializer,
    AdminExamCenterDetailSerializer,
    AdminExamFaqSerializer,
    AdminExamTopperSerializer,
    ComplaintSerializer,
    ComplaintCreateSerializer,
    AdminComplaintSerializer,
)
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser


TEAM_REGISTRATION_FEE_PAISE = int(os.environ.get("TEAM_REGISTRATION_FEE_PAISE", "50000"))


def _get_razorpay_credentials():
    key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not key_id or not key_secret:
        raise RuntimeError("Razorpay credentials are not configured.")
    return key_id, key_secret


def _create_razorpay_order(payload):
    key_id, key_secret = _get_razorpay_credentials()
    auth_token = base64.b64encode(f"{key_id}:{key_secret}".encode("utf-8")).decode("ascii")
    req = urllib_request.Request(
        "https://api.razorpay.com/v1/orders",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {auth_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8")), key_id
    except urllib_error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        try:
            detail = json.loads(body)
        except json.JSONDecodeError:
            detail = body or "Razorpay order creation failed."
        raise ValueError(detail) from exc


def _build_team_registration_receipt_token(registration):
    return signing.dumps(
        {
            "registration_id": registration.pk,
            "payment_id": registration.payment_id,
        },
        salt="team-registration-receipt",
    )


def _build_team_registration_receipt_url(request, registration):
    token = _build_team_registration_receipt_token(registration)
    return request.build_absolute_uri(
        f"{reverse('register-receipt-download', args=[registration.pk])}?token={token}"
    )


def _build_team_registration_response(request, registration):
    return {
        "id": registration.pk,
        "team_name": registration.team_name,
        "captain_name": registration.captain_name,
        "phone": registration.phone,
        "whatsapp_number": registration.whatsapp_number,
        "player_count": registration.player_count,
        "address": registration.address,
        "created_at": registration.created_at.isoformat(),
        "receipt_download_url": _build_team_registration_receipt_url(request, registration),
    }


def _generate_team_registration_receipt_pdf(registration) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    accent = HexColor("#15803d")
    dark = HexColor("#0f172a")
    muted = HexColor("#475569")
    border = HexColor("#cbd5e1")
    light = HexColor("#f8fafc")

    pdf.setTitle(f"HBPL Payment Receipt - {registration.payment_id or registration.pk}")

    pdf.setStrokeColor(border)
    pdf.setFillColor(light)
    pdf.roundRect(36, height - 310, width - 72, 250, 14, stroke=1, fill=1)

    pdf.setFillColor(accent)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(48, height - 88, "HBPL Payment Receipt")

    pdf.setFillColor(dark)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(48, height - 116, f"Team ID: HBPL-{registration.pk}")
    pdf.drawRightString(
        width - 48,
        height - 116,
        f"Receipt Date: {registration.created_at.strftime('%d %b %Y, %I:%M %p')}",
    )

    lines = [
        ("Team Name", registration.team_name),
        ("Captain Name", registration.captain_name),
        ("Mobile Number", registration.phone),
        ("WhatsApp Number", registration.whatsapp_number or "-"),
        ("Village Name", registration.address or "-"),
        ("Players", str(registration.player_count)),
        ("Payment Method", "QR / UPI"),
        ("Payment Status", "Screenshot Submitted — Pending Verification"),
    ]

    y = height - 148
    for label, value in lines:
        pdf.setFillColor(muted)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(52, y, label)
        pdf.setFillColor(dark)
        pdf.setFont("Helvetica", 11)
        pdf.drawString(190, y, value)
        y -= 20

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        48,
        height - 340,
        "This receipt confirms successful payment for HBPL team registration via Razorpay.",
    )
    pdf.drawString(
        48,
        height - 355,
        "Keep this document for future reference.",
    )

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()



# Admin: List all complaints
class AdminComplaintListAPIView(generics.ListAPIView):
    queryset = Complaint.objects.select_related("registration").all().order_by("-created_at")
    serializer_class = AdminComplaintSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


# Admin: Retrieve + update a single complaint (status / admin_note)
class AdminComplaintDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = Complaint.objects.select_related("registration").all()
    serializer_class = AdminComplaintSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


# Public: Check grievance status by roll number
class ExamComplaintStatusView(APIView):
    """Returns a student's own complaints (status + admin note) looked up by roll number."""
    def get(self, request):
        roll_number = request.query_params.get("roll_number", "").strip().upper()
        if not roll_number:
            return Response({"detail": "roll_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        complaints = Complaint.objects.filter(
            roll_number__iexact=roll_number
        ).order_by("-created_at").values(
            "id", "message", "status", "admin_note", "created_at"
        )
        return Response(list(complaints))


# Public: Complaint submission
class ComplaintCreateAPIView(generics.CreateAPIView):
    serializer_class = ComplaintCreateSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = Complaint.objects.all()

    def perform_create(self, serializer):
        roll_number = serializer.validated_data.get("roll_number", "")
        try:
            registration = ExamRegistration.objects.get(roll_number=roll_number)
        except ExamRegistration.DoesNotExist:
            raise DRFValidationError({"roll_number": "No exam registration found for this roll number."})
        serializer.save(registration=registration)

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
    queryset = TeamRegistration.objects.filter(is_approved=True).order_by("-created_at")
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


class TeamRegistrationPaymentOrderView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = TeamRegistrationPaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        try:
            order, key_id = _create_razorpay_order(
                {
                    "amount": TEAM_REGISTRATION_FEE_PAISE,
                    "currency": "INR",
                    "receipt": f"team-{secrets.token_hex(6)}",
                    "notes": {
                        "team_name": validated["team_name"],
                        "captain_name": validated["captain_name"],
                        "phone": validated["phone"],
                    },
                }
            )
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except ValueError as exc:
            return Response({"detail": exc.args[0]}, status=status.HTTP_502_BAD_GATEWAY)

        payment_context_token = signing.dumps(
            {
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "team_name": validated["team_name"],
                "captain_name": validated["captain_name"],
                "phone": validated["phone"],
                "whatsapp_number": validated["whatsapp_number"],
                "player_count": validated["player_count"],
                "address": validated["address"],
            },
            salt="team-registration-payment",
        )

        return Response(
            {
                "key": key_id,
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "name": "HBPL",
                "description": "HBPL Team Registration",
                "payment_context_token": payment_context_token,
            }
        )


class TeamRegistrationCreateView(generics.CreateAPIView):
    queryset = TeamRegistration.objects.all()
    serializer_class = TeamRegistrationSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()
        return Response(
            _build_team_registration_response(request, registration),
            status=status.HTTP_201_CREATED,
        )


class TeamRegistrationReceiptDownloadView(APIView):
    def get(self, request, pk, *args, **kwargs):
        token = request.query_params.get("token", "").strip()
        if not token:
            return Response(
                {"detail": "Receipt token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            receipt_context = signing.loads(
                token,
                salt="team-registration-receipt",
            )
        except signing.BadSignature:
            return Response(
                {"detail": "Receipt link is invalid."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if receipt_context.get("registration_id") != pk:
            return Response(
                {"detail": "Receipt link does not match this registration."},
                status=status.HTTP_403_FORBIDDEN,
            )

        registration = TeamRegistration.objects.filter(pk=pk).first()
        if registration is None:
            return Response(
                {"detail": "Registration not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        pdf_bytes = _generate_team_registration_receipt_pdf(registration)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="hbpl_receipt_{registration.pk}.pdf"'
        )
        return response


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
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'father_name', 'mother_name', 'class_name', 'school_name', 'examination_center', 'roll_number', 'phone', 'email']

    def get_queryset(self):
        qs = ExamRegistration.objects.all().order_by("-created_at")
        class_name = self.request.query_params.get("class_name")
        school_name = self.request.query_params.get("school_name")
        result_status = self.request.query_params.get("result_status")
        examination_center = self.request.query_params.get("examination_center")
        if class_name:
            qs = qs.filter(class_name__iexact=class_name)
        if school_name:
            qs = qs.filter(school_name__iexact=school_name)
        if result_status:
            qs = qs.filter(result_status=result_status)
        if examination_center:
            qs = qs.filter(examination_center__iexact=examination_center)
        return qs


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
    queryset = TeamRegistration.objects.all()


class AdminTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminTeamSerializer
    queryset = TeamRegistration.objects.all()


class AdminTeamRegistrationListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminTeamRegistrationSerializer
    queryset = TeamRegistration.objects.all().order_by("-created_at", "-id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


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


class AdminExamImportMarksView(APIView):
    """Scan and import marks/rank from CSV/XLSX, matching students by roll number.
    Never creates new records and never publishes results."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    IMPORTABLE_FIELDS = {"roll_number", "marks_obtained", "total_marks", "rank", "remarks"}

    SYNONYMS = {
        "roll_number": {"roll", "rollno", "rollnumber", "roll_no", "rollno"},
        "marks_obtained": {"marks", "score", "obtained", "marksobtained", "marksscored"},
        "total_marks": {"total", "outof", "maximum", "maxmarks", "totalmarks", "max"},
        "rank": {"rank", "position", "ranking", "standing"},
        "remarks": {"remarks", "grade", "comment", "result", "remark"},
    }

    @staticmethod
    def _normalize(label):
        return "".join(ch for ch in str(label).strip().lower() if ch.isalnum())

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
                raise RuntimeError("openpyxl is required to import Excel files.") from exc
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
            for header, norm in normalized_headers.items():
                if norm == self._normalize(db_field) or norm in keywords:
                    mapping[header] = db_field
                    break
        return mapping

    def _coerce(self, field, value):
        from decimal import Decimal, InvalidOperation
        if value is None:
            return None
        text = str(value).strip()
        if not text or text.lower() in ("none", "null", "-", "n/a"):
            return None
        if field == "roll_number":
            return text.upper()
        if field in ("marks_obtained", "total_marks"):
            try:
                return Decimal(text)
            except (InvalidOperation, ValueError):
                return None
        if field == "rank":
            try:
                return int(float(text))
            except (ValueError, TypeError):
                return None
        return text

    def post(self, request, *args, **kwargs):
        if not request.user.has_perm("api.change_examregistration"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

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
            return Response({
                "headers": headers,
                "row_count": len(rows),
                "sample_rows": rows[:5],
                "suggested_mapping": self._suggest_mapping(headers),
                "importable_fields": sorted(self.IMPORTABLE_FIELDS),
            })

        mapping_raw = request.data.get("mapping")
        if mapping_raw is None:
            return Response({"detail": "Mapping is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mapping = json.loads(mapping_raw) if isinstance(mapping_raw, str) else mapping_raw
        except json.JSONDecodeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        updated = 0
        skipped = 0
        not_found_count = 0
        errors = []

        for idx, row in enumerate(rows, start=2):
            payload = {}
            for excel_col, db_field in mapping.items():
                if not db_field or db_field not in self.IMPORTABLE_FIELDS:
                    continue
                coerced = self._coerce(db_field, row.get(excel_col))
                if coerced is not None:
                    payload[db_field] = coerced

            roll_number = payload.pop("roll_number", None)
            if not roll_number:
                errors.append({"row": idx, "roll_number": "", "error": "roll_number is required"})
                continue

            if not payload:
                skipped += 1
                continue

            try:
                student = ExamRegistration.objects.get(roll_number__iexact=roll_number)
            except ExamRegistration.DoesNotExist:
                not_found_count += 1
                errors.append({"row": idx, "roll_number": roll_number, "error": "Student not found"})
                continue

            changed_fields = []
            for key, val in payload.items():
                if getattr(student, key) != val:
                    setattr(student, key, val)
                    changed_fields.append(key)

            if changed_fields:
                student.save(update_fields=changed_fields + ["updated_at"])
                updated += 1
            else:
                skipped += 1

        return Response({
            "updated": updated,
            "skipped": skipped,
            "not_found": not_found_count,
            "errors": errors[:50],
            "error_count": len(errors),
        })


class AdminExamUploadTestCopiesView(APIView):
    """Bulk-upload PDF test copies. Filename (without extension) must equal the student's roll number."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        if not request.user.has_perm("api.change_examregistration"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        files = request.FILES.getlist("files")
        if not files:
            return Response({"detail": "No files uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        uploaded = 0
        not_found = []
        errors = []

        for f in files:
            base_name = os.path.splitext(f.name)[0].strip().upper()
            try:
                student = ExamRegistration.objects.get(roll_number__iexact=base_name)
                student.test_copy = f
                student.save(update_fields=["test_copy", "updated_at"])
                uploaded += 1
            except ExamRegistration.DoesNotExist:
                not_found.append(base_name)
            except Exception as exc:
                errors.append({"file": f.name, "error": str(exc)})

        return Response({
            "uploaded": uploaded,
            "not_found": not_found,
            "errors": errors,
        })
