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
    NewsTicker,
    Player,
    CricketTeam,
    MatchPlayerStats,
    Tournament,
    TournamentTeam,
    Innings,
    Over,
    Ball,
    BatsmanScore,
    BowlerScore,
    Event,
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
    NewsTickerSerializer,
    AdminNewsTickerSerializer,
    PlayerCreateSerializer,
    PlayerSerializer,
    TeamWithPlayersSerializer,
    TournamentListSerializer,
    TournamentDetailSerializer,
    TournamentTeamSerializer,
    TournamentRegistrationSerializer,
    LiveMatchSerializer,
    InningsSerializer,
    BallSerializer,
    AdminTournamentSerializer,
    AdminTournamentTeamSerializer,
    AdminPlayerSerializer,
    AdminInningsSerializer,
    AdminBallSerializer,
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
        qs = Match.objects.select_related(
            "team1_obj", "team2_obj", "team1_registration", "team2_registration"
        ).all().order_by("date", "id")
        for param, field in [("season", "season"), ("tournament", "tournament_id"), ("match_status", "match_status")]:
            val = self.request.query_params.get(param)
            if val is not None:
                qs = qs.filter(**{field: val})
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


class TeamRegistrationPlayersBulkView(APIView):
    """Public endpoint — submit players for a team registration (immediately after registration)."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk, *args, **kwargs):
        try:
            team = TeamRegistration.objects.get(pk=pk)
        except TeamRegistration.DoesNotExist:
            return Response({"detail": "Registration not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            player_count = int(request.data.get("player_count", 0))
        except (TypeError, ValueError):
            return Response({"detail": "Invalid player_count."}, status=status.HTTP_400_BAD_REQUEST)

        created_ids = []
        errors = []

        for i in range(player_count):
            def _bool(key):
                return str(request.data.get(key, "")).lower() == "true"

            player_data = {
                "team": team.id,
                "name": request.data.get(f"player_{i}_name", "").strip(),
                "role": request.data.get(f"player_{i}_role", "batter"),
                "batting_style": request.data.get(f"player_{i}_batting_style", "right_handed"),
                "bowling_style": request.data.get(f"player_{i}_bowling_style", "not_applicable"),
                "jersey_number": request.data.get(f"player_{i}_jersey_number") or None,
                "is_captain": _bool(f"player_{i}_is_captain"),
                "is_vice_captain": _bool(f"player_{i}_is_vice_captain"),
                "is_substitute": False,
            }
            photo = request.FILES.get(f"player_{i}_photo")

            serializer = PlayerCreateSerializer(data=player_data)
            if serializer.is_valid():
                player = serializer.save()
                if photo:
                    player.photo = photo
                    player.save(update_fields=["photo"])
                created_ids.append(player.id)
            else:
                errors.append({"index": i, "name": player_data.get("name"), "errors": serializer.errors})

        return Response(
            {"created": len(created_ids), "errors": errors},
            status=status.HTTP_201_CREATED if created_ids else status.HTTP_400_BAD_REQUEST,
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
        has_test_copy = self.request.query_params.get("has_test_copy")
        if class_name:
            qs = qs.filter(class_name__iexact=class_name)
        if school_name:
            qs = qs.filter(school_name__iexact=school_name)
        if result_status:
            qs = qs.filter(result_status=result_status)
        if examination_center:
            qs = qs.filter(examination_center__iexact=examination_center)
        if has_test_copy == "yes":
            qs = qs.exclude(test_copy__isnull=True).exclude(test_copy="")
        elif has_test_copy == "no":
            from django.db.models import Q
            qs = qs.filter(Q(test_copy__isnull=True) | Q(test_copy=""))
        return qs


class AdminExamDetailView(generics.RetrieveUpdateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [StaffWithModelPermissions]
    serializer_class = AdminExamRegistrationSerializer
    queryset = ExamRegistration.objects.all()
    http_method_names = ["get", "patch", "head", "options"]

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        changed = []
        if request.data.get("clear_test_copy") in ("true", "1", True):
            if instance.test_copy:
                instance.test_copy.delete(save=False)
                instance.test_copy = None
                changed.append("test_copy")
        if request.data.get("clear_result_file") in ("true", "1", True):
            if instance.result_file:
                instance.result_file.delete(save=False)
                instance.result_file = None
                changed.append("result_file")
        if changed:
            changed.append("updated_at")
            instance.save(update_fields=changed)
            return Response(self.get_serializer(instance).data)
        return super().partial_update(request, *args, **kwargs)


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

    def get_queryset(self):
        qs = Match.objects.all().order_by("date", "id")
        for param, field in [("tournament", "tournament_id"), ("match_status", "match_status"), ("season", "season")]:
            val = self.request.query_params.get(param)
            if val:
                qs = qs.filter(**{field: val})
        return qs


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

    def partial_update(self, request, *args, **kwargs):
        if request.data.get("clear_pdf_file") in ("true", "1", True):
            instance = self.get_object()
            if instance.pdf_file:
                instance.pdf_file.delete(save=False)
                instance.pdf_file = None
                instance.save(update_fields=["pdf_file"])
            return Response(self.get_serializer(instance).data)
        return super().partial_update(request, *args, **kwargs)


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

    def partial_update(self, request, *args, **kwargs):
        if request.data.get("clear_file") in ("true", "1", True):
            instance = self.get_object()
            if instance.file:
                instance.file.delete(save=False)
                instance.file = None
                instance.save(update_fields=["file"])
            return Response(self.get_serializer(instance).data)
        return super().partial_update(request, *args, **kwargs)


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


class NewsTickerListView(generics.ListAPIView):
    serializer_class = NewsTickerSerializer
    queryset = NewsTicker.objects.filter(is_active=True)


class AdminNewsTickerListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminNewsTickerSerializer
    queryset = NewsTicker.objects.all()


class AdminNewsTickerDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminNewsTickerSerializer
    queryset = NewsTicker.objects.all()


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


# ─────────────────────────────────────────────────────────────────────────────
# CRICKET PHASE 2+ VIEWS
# ─────────────────────────────────────────────────────────────────────────────

# ── Public ────────────────────────────────────────────────────────────────────

class TournamentLeaderboardView(APIView):
    """Public: aggregated batting & bowling leaders for a tournament."""

    def get(self, request, pk):
        from django.db.models import Sum, Count

        tournament = generics.get_object_or_404(Tournament, pk=pk)

        stats = list(
            MatchPlayerStats.objects
            .filter(match__tournament=tournament)
            .values("player_id", "player__name", "team_id", "team__name", "team__short_name")
            .annotate(
                matches=Count("match_id", distinct=True),
                total_runs=Sum("runs"),
                total_wickets=Sum("wickets"),
                total_balls_faced=Sum("balls_faced"),
                total_fours=Sum("fours"),
                total_sixes=Sum("sixes"),
                total_overs_bowled=Sum("overs_bowled"),
                total_runs_conceded=Sum("runs_conceded"),
                total_catches=Sum("catches"),
            )
        )

        batters = sorted(
            [s for s in stats if s["total_runs"]],
            key=lambda x: x["total_runs"] or 0,
            reverse=True,
        )[:10]

        bowlers = sorted(
            [s for s in stats if s["total_wickets"]],
            key=lambda x: (x["total_wickets"] or 0, -(x["total_runs_conceded"] or 999)),
            reverse=True,
        )[:10]

        _BATTER_FIELDS = ("total_runs", "total_balls_faced", "total_fours", "total_sixes")
        _BOWLER_FIELDS = ("total_wickets", "total_overs_bowled", "total_runs_conceded", "total_catches")

        def fmt(rows, fields):
            return [
                {
                    "player_id": r["player_id"],
                    "player_name": r["player__name"],
                    "team_name": r["team__name"],
                    "team_short": r["team__short_name"],
                    "matches": r["matches"],
                    **{k: r[k] for k in fields},
                }
                for r in rows
            ]

        return Response({
            "tournament_id": tournament.id,
            "tournament_name": tournament.name,
            "top_batters": fmt(batters, _BATTER_FIELDS),
            "top_bowlers": fmt(bowlers, _BOWLER_FIELDS),
        })


class TournamentListView(generics.ListAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentListSerializer


class TournamentDetailView(generics.RetrieveAPIView):
    queryset = Tournament.objects.prefetch_related("team_registrations__team")
    serializer_class = TournamentDetailSerializer
    lookup_field = "pk"


class TeamDetailView(generics.RetrieveAPIView):
    """Public team page with player roster."""
    queryset = TeamRegistration.objects.filter(is_approved=True).prefetch_related("players")
    serializer_class = TeamWithPlayersSerializer
    lookup_field = "pk"


class PlayerListByTeamView(generics.ListAPIView):
    """Public: list players for an approved team."""
    serializer_class = PlayerSerializer

    def get_queryset(self):
        team_id = self.kwargs["team_pk"]
        return Player.objects.filter(team_id=team_id, team__is_approved=True)


class PlayerCreateView(generics.CreateAPIView):
    """
    Public: add a player to a registered team.
    Requires the team's registered phone number for lightweight verification.
    """
    serializer_class = PlayerCreateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        team = serializer.validated_data["team"]
        provided_phone = self.request.data.get("team_phone", "").strip()
        if team.phone != provided_phone:
            raise DRFValidationError({"team_phone": "Phone number does not match team registration."})
        serializer.save()


class TournamentRegistrationView(generics.CreateAPIView):
    """Public: team applies to a tournament."""
    serializer_class = TournamentRegistrationSerializer

    def perform_create(self, serializer):
        serializer.save(status="pending")


class LiveMatchView(generics.RetrieveAPIView):
    """Public: live match data with full innings/scorecard."""
    queryset = Match.objects.prefetch_related(
        "innings__batsman_scores__batsman",
        "innings__bowler_scores__bowler",
        "innings__overs__balls__batsman",
        "innings__overs__balls__bowler",
    )
    serializer_class = LiveMatchSerializer
    lookup_field = "pk"


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminTournamentListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Tournament.objects.all()
    serializer_class = AdminTournamentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminTournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Tournament.objects.all()
    serializer_class = AdminTournamentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminTournamentTeamListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminTournamentTeamSerializer

    def get_queryset(self):
        qs = TournamentTeam.objects.select_related("team", "tournament")
        tournament_id = self.request.query_params.get("tournament")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs


class AdminTournamentTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = TournamentTeam.objects.select_related("team", "tournament")
    serializer_class = AdminTournamentTeamSerializer

    def perform_update(self, serializer):
        from django.utils import timezone
        instance = serializer.save()
        if instance.status == "approved" and not instance.approved_at:
            instance.approved_at = timezone.now()
            instance.save(update_fields=["approved_at"])


class AdminPlayerListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminPlayerSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Player.objects.select_related("team")
        team_id = self.request.query_params.get("team")
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs


class AdminPlayerDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Player.objects.select_related("team")
    serializer_class = AdminPlayerSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdminInningsListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminInningsSerializer

    def get_queryset(self):
        match_id = self.request.query_params.get("match")
        qs = Innings.objects.all()
        if match_id:
            qs = qs.filter(match_id=match_id)
        return qs


class AdminInningsDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Innings.objects.all()
    serializer_class = AdminInningsSerializer


class AdminBallCreateView(generics.CreateAPIView):
    """
    Record a single ball delivery.
    Automatically updates Over totals and Innings totals after creation.
    """
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminBallSerializer

    def perform_create(self, serializer):
        ball = serializer.save()
        self._update_over(ball)
        self._update_innings(ball)
        self._update_batsman_score(ball)
        self._update_bowler_score(ball)

    def _update_over(self, ball):
        from django.db.models import Sum, Count, Q
        over = ball.over
        agg = over.balls.aggregate(
            runs=Sum("runs_off_bat"),
            extras=Sum("extra_runs"),
            wickets=Count("id", filter=Q(is_wicket=True)),
        )
        over.runs = (agg["runs"] or 0) + (agg["extras"] or 0)
        over.wickets = agg["wickets"] or 0
        over.extras = agg["extras"] or 0
        over.save(update_fields=["runs", "wickets", "extras"])

    def _update_innings(self, ball):
        from django.db.models import Sum, Count, Q
        innings = ball.over.innings
        agg = Ball.objects.filter(over__innings=innings).aggregate(
            runs=Sum("runs_off_bat"),
            extras=Sum("extra_runs"),
            wickets=Count("id", filter=Q(is_wicket=True)),
        )
        innings.total_runs = (agg["runs"] or 0) + (agg["extras"] or 0)
        innings.wickets = agg["wickets"] or 0
        innings.extras = agg["extras"] or 0
        completed_overs = innings.overs.filter(is_completed=True).count()
        cur = innings.overs.filter(is_completed=False).first()
        legal_in_current = cur.balls.filter(is_extra=False).count() if cur else 0
        innings.overs_completed = completed_overs + (legal_in_current / 10)
        innings.save(update_fields=["total_runs", "wickets", "extras", "overs_completed"])

    def _update_batsman_score(self, ball):
        if not ball.batsman:
            return
        innings = ball.over.innings
        score, _ = BatsmanScore.objects.get_or_create(
            innings=innings, batsman=ball.batsman
        )
        score.runs += ball.runs_off_bat
        if not ball.is_extra or ball.extra_type == "no_ball":
            score.balls_faced += 1
        if ball.is_boundary and not ball.is_six:
            score.fours += 1
        if ball.is_six:
            score.sixes += 1
        if ball.is_wicket:
            score.is_out = True
            score.dismissal_type = ball.wicket_type
            score.bowler = ball.bowler
            score.fielder = ball.fielder
            score.is_batting = False
            innings.refresh_from_db()
            score.fall_of_wicket_score = innings.total_runs
            score.fall_of_wicket_over = str(innings.overs_completed)
        score.save()

    def _update_bowler_score(self, ball):
        if not ball.bowler:
            return
        innings = ball.over.innings
        score, _ = BowlerScore.objects.get_or_create(innings=innings, bowler=ball.bowler)
        score.runs += ball.runs_off_bat
        if ball.extra_type in ("wide", "no_ball"):
            score.runs += ball.extra_runs
        if ball.is_wicket:
            score.wickets += 1
        if ball.extra_type == "wide":
            score.wides += 1
        if ball.extra_type == "no_ball":
            score.no_balls += 1
        completed = innings.overs.filter(is_completed=True, bowler=ball.bowler).count()
        cur = innings.overs.filter(is_completed=False, bowler=ball.bowler).first()
        legal_balls = cur.balls.filter(is_extra=False).count() if cur else 0
        score.overs = float(f"{completed}.{legal_balls}")
        score.save()


# ── WebSocket broadcast helper ────────────────────────────────────────────────

def _ws_broadcast(group: str, payload: dict):
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(group, {"type": payload["type"].replace("-", "_"), "data": payload})
    except Exception:
        pass  # Never fail an API call due to WS issues


def _build_score_payload(match, innings, ball=None):
    from .consumers import _balls_for_over
    current_over = innings.overs.filter(is_completed=False).first()
    recent_balls = _balls_for_over(current_over)

    current_batsmen = []
    for bs in BatsmanScore.objects.filter(innings=innings, is_batting=True).select_related("batsman"):
        current_batsmen.append({
            "id": bs.batsman.id,
            "name": bs.batsman.name,
            "runs": bs.runs,
            "balls": bs.balls_faced,
            "fours": bs.fours,
            "sixes": bs.sixes,
        })

    current_bowler = None
    if current_over and current_over.bowler:
        bs = BowlerScore.objects.filter(innings=innings, bowler=current_over.bowler).first()
        current_bowler = {
            "id": current_over.bowler.id,
            "name": current_over.bowler.name,
            "overs": str(bs.overs) if bs else "0.0",
            "runs": bs.runs if bs else 0,
            "wickets": bs.wickets if bs else 0,
        }

    innings.refresh_from_db()
    return {
        "type": "score_update",
        "match_id": match.id,
        "match_status": match.match_status,
        "innings_id": innings.id,
        "innings_number": innings.innings_number,
        "batting_team": innings.batting_team_name,
        "bowling_team": innings.bowling_team_name,
        "total_runs": innings.total_runs,
        "wickets": innings.wickets,
        "overs": str(innings.overs_completed),
        "target": innings.target,
        "extras": innings.extras,
        "current_batsmen": current_batsmen,
        "current_bowler": current_bowler,
        "last_ball": recent_balls[-1] if recent_balls else "",
        "recent_balls": recent_balls,
    }


# ── Match Setup ───────────────────────────────────────────────────────────────

class MatchSetupView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        data = request.data

        match.toss_winner = data.get("toss_winner", "")
        match.toss_decision = data.get("toss_decision", "")
        match.match_status = "live"
        match.save(update_fields=["toss_winner", "toss_decision", "match_status"])

        batting_team = data.get("batting_team_name", match.team1)
        bowling_team = data.get("bowling_team_name", match.team2)

        innings, _ = Innings.objects.get_or_create(
            match=match, innings_number=1,
            defaults={
                "batting_team_name": batting_team,
                "bowling_team_name": bowling_team,
                "total_runs": 0, "wickets": 0,
                "overs_completed": 0.0, "extras": 0, "is_completed": False,
            },
        )
        innings.batting_team_name = batting_team
        innings.bowling_team_name = bowling_team
        innings.save(update_fields=["batting_team_name", "bowling_team_name"])

        striker_id = data.get("striker_id")
        non_striker_id = data.get("non_striker_id")
        opening_bowler_id = data.get("opening_bowler_id")

        for i, pid in enumerate(data.get("batting_order", [])):
            score, created = BatsmanScore.objects.get_or_create(
                innings=innings, batsman_id=pid,
                defaults={"batting_position": i + 1},
            )
            if not created:
                score.batting_position = i + 1
                score.save(update_fields=["batting_position"])
            is_batting = str(pid) in [str(striker_id), str(non_striker_id)]
            BatsmanScore.objects.filter(innings=innings, batsman_id=pid).update(is_batting=is_batting)

        if opening_bowler_id:
            Over.objects.get_or_create(
                innings=innings, over_number=1,
                defaults={"bowler_id": opening_bowler_id, "runs": 0, "wickets": 0, "extras": 0, "is_completed": False},
            )

        _ws_broadcast(f"match_{match.id}", {
            "type": "score_update",
            "match_id": match.id,
            "match_status": "live",
            "batting_team": batting_team,
            "bowling_team": bowling_team,
            "total_runs": 0, "wickets": 0, "overs": "0.0",
            "current_batsmen": [], "current_bowler": None,
            "last_ball": "", "recent_balls": [],
        })
        return Response({"success": True, "innings_id": innings.id})


# ── Record Ball (main scoring endpoint) ───────────────────────────────────────

class RecordBallView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        innings = match.innings.filter(is_completed=False).first()
        if not innings:
            return Response({"error": "No active innings."}, status=400)

        current_over = innings.overs.filter(is_completed=False).first()
        if not current_over:
            return Response({"error": "No active over. Use end-over to start a new over."}, status=400)

        d = request.data
        runs = int(d.get("runs", 0))
        is_wide = bool(d.get("is_wide", False))
        is_no_ball = bool(d.get("is_no_ball", False))
        is_bye = bool(d.get("is_bye", False))
        is_leg_bye = bool(d.get("is_leg_bye", False))
        is_wicket = bool(d.get("is_wicket", False))
        wicket_type = d.get("wicket_type", "")
        next_batsman_id = d.get("next_batsman_id")

        is_extra = is_wide or is_no_ball or is_bye or is_leg_bye
        if is_wide:
            extra_type, extra_runs, runs_off_bat = "wide", 1 + runs, 0
        elif is_no_ball:
            extra_type, extra_runs, runs_off_bat = "no_ball", 1, runs
        elif is_bye:
            extra_type, extra_runs, runs_off_bat = "bye", runs, 0
        elif is_leg_bye:
            extra_type, extra_runs, runs_off_bat = "leg_bye", runs, 0
        else:
            extra_type, extra_runs, runs_off_bat = "", 0, runs

        ball_number = current_over.balls.count() + 1
        batsman = Player.objects.filter(pk=d.get("batsman_id")).first()
        non_striker = Player.objects.filter(pk=d.get("non_striker_id")).first()
        bowler = Player.objects.filter(pk=d.get("bowler_id")).first() or current_over.bowler
        fielder = Player.objects.filter(pk=d.get("fielder_id")).first()

        ball = Ball.objects.create(
            over=current_over,
            ball_number=ball_number,
            batsman=batsman,
            non_striker=non_striker,
            bowler=bowler,
            fielder=fielder if is_wicket else None,
            runs_off_bat=runs_off_bat,
            is_extra=is_extra,
            extra_type=extra_type,
            extra_runs=extra_runs,
            is_wicket=is_wicket,
            wicket_type=wicket_type if is_wicket else "",
            is_boundary=(runs_off_bat == 4),
            is_six=(runs_off_bat == 6),
            commentary=d.get("commentary", ""),
        )

        self._update_over(ball)
        self._update_innings(ball)
        self._update_batsman_score(ball)
        self._update_bowler_score(ball)

        # Bring in next batsman after wicket
        if is_wicket and next_batsman_id:
            BatsmanScore.objects.filter(innings=innings, batsman=batsman).update(is_batting=False)
            score, _ = BatsmanScore.objects.get_or_create(
                innings=innings, batsman_id=next_batsman_id,
                defaults={"batting_position": innings.batsman_scores.count() + 1, "is_batting": True},
            )
            BatsmanScore.objects.filter(innings=innings, batsman_id=next_batsman_id).update(is_batting=True)

        payload = _build_score_payload(match, innings, ball)
        _ws_broadcast(f"match_{match.id}", payload)
        return Response({"success": True, "ball_id": ball.id, "scorecard": payload})

    def _update_over(self, ball):
        from django.db.models import Sum, Count, Q
        over = ball.over
        agg = over.balls.aggregate(
            runs=Sum("runs_off_bat"),
            extras=Sum("extra_runs"),
            wickets=Count("id", filter=Q(is_wicket=True)),
        )
        over.runs = (agg["runs"] or 0) + (agg["extras"] or 0)
        over.wickets = agg["wickets"] or 0
        over.extras = agg["extras"] or 0
        over.save(update_fields=["runs", "wickets", "extras"])

    def _update_innings(self, ball):
        from django.db.models import Sum, Count, Q
        innings = ball.over.innings
        agg = Ball.objects.filter(over__innings=innings).aggregate(
            runs=Sum("runs_off_bat"),
            extras=Sum("extra_runs"),
            wickets=Count("id", filter=Q(is_wicket=True)),
        )
        innings.total_runs = (agg["runs"] or 0) + (agg["extras"] or 0)
        innings.wickets = agg["wickets"] or 0
        innings.extras = agg["extras"] or 0
        completed_overs = innings.overs.filter(is_completed=True).count()
        cur = innings.overs.filter(is_completed=False).first()
        legal_in_current = cur.balls.filter(is_extra=False).count() if cur else 0
        innings.overs_completed = completed_overs + (legal_in_current / 10)
        innings.save(update_fields=["total_runs", "wickets", "extras", "overs_completed"])

    def _update_batsman_score(self, ball):
        if not ball.batsman:
            return
        innings = ball.over.innings
        score, _ = BatsmanScore.objects.get_or_create(innings=innings, batsman=ball.batsman)
        score.runs += ball.runs_off_bat
        if not ball.is_extra or ball.extra_type == "no_ball":
            score.balls_faced += 1
        if ball.is_boundary and not ball.is_six:
            score.fours += 1
        if ball.is_six:
            score.sixes += 1
        if ball.is_wicket:
            score.is_out = True
            score.dismissal_type = ball.wicket_type
            score.bowler = ball.bowler
            score.fielder = ball.fielder
            score.is_batting = False
            innings.refresh_from_db()
            score.fall_of_wicket_score = innings.total_runs
            score.fall_of_wicket_over = str(innings.overs_completed)
        score.save()

    def _update_bowler_score(self, ball):
        if not ball.bowler:
            return
        innings = ball.over.innings
        score, _ = BowlerScore.objects.get_or_create(innings=innings, bowler=ball.bowler)
        score.runs += ball.runs_off_bat
        if ball.extra_type in ("wide", "no_ball"):
            score.runs += ball.extra_runs
        if ball.is_wicket:
            score.wickets += 1
        if ball.extra_type == "wide":
            score.wides += 1
        if ball.extra_type == "no_ball":
            score.no_balls += 1
        completed = innings.overs.filter(is_completed=True, bowler=ball.bowler).count()
        cur = innings.overs.filter(is_completed=False, bowler=ball.bowler).first()
        legal = cur.balls.filter(is_extra=False).count() if cur else 0
        score.overs = float(f"{completed}.{legal}")
        score.save()


# ── End Over ──────────────────────────────────────────────────────────────────

class EndOverView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        innings = match.innings.filter(is_completed=False).first()
        if not innings:
            return Response({"error": "No active innings."}, status=400)

        current_over = innings.overs.filter(is_completed=False).first()
        if not current_over:
            return Response({"error": "No active over."}, status=400)

        current_over.is_completed = True
        current_over.save(update_fields=["is_completed"])

        completed_overs = innings.overs.filter(is_completed=True).count()
        innings.overs_completed = float(completed_overs)
        innings.save(update_fields=["overs_completed"])

        next_bowler_id = request.data.get("next_bowler_id")
        new_over = None
        if next_bowler_id:
            new_over = Over.objects.create(
                innings=innings,
                over_number=current_over.over_number + 1,
                bowler_id=next_bowler_id,
                runs=0, wickets=0, extras=0, is_completed=False,
            )

        return Response({
            "success": True,
            "over_completed": current_over.over_number,
            "new_over_id": new_over.id if new_over else None,
        })


# ── Declare Winner ────────────────────────────────────────────────────────────

class DeclareWinnerView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        match.match_status = "completed"
        match.result = request.data.get("result_summary", "")
        match.save(update_fields=["match_status", "result"])

        innings = match.innings.filter(is_completed=False).first()
        if innings:
            innings.is_completed = True
            innings.save(update_fields=["is_completed"])

        _ws_broadcast(f"match_{match.id}", {
            "type": "score_update",
            "match_id": match.id,
            "match_status": "completed",
            "result": match.result,
        })
        return Response({"success": True})


# ── Active Match ──────────────────────────────────────────────────────────────

class ActiveMatchView(APIView):
    def get(self, request):
        match = (
            Match.objects.filter(match_status="live").first()
            or Match.objects.filter(match_status="scheduled").order_by("date").first()
        )
        if not match:
            return Response(None)
        from .serializers import LiveMatchSerializer
        return Response(LiveMatchSerializer(match).data)


# ── Events (public + admin) ───────────────────────────────────────────────────

class EventListView(generics.ListAPIView):
    queryset = Event.objects.filter(is_published=True)
    serializer_class = None  # assigned below

    def get_serializer_class(self):
        from .serializers import EventSerializer
        return EventSerializer


class AdminEventListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Event.objects.all()

    def get_serializer_class(self):
        from .serializers import EventSerializer
        return EventSerializer

    def perform_create(self, serializer):
        event = serializer.save()
        from .serializers import EventSerializer as ES
        _ws_broadcast("events", {
            "type": "event_update",
            "action": "created",
            "event": ES(event).data,
        })


class AdminEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = Event.objects.all()

    def get_serializer_class(self):
        from .serializers import EventSerializer
        return EventSerializer

    def perform_update(self, serializer):
        event = serializer.save()
        from .serializers import EventSerializer as ES
        _ws_broadcast("events", {
            "type": "event_update",
            "action": "updated",
            "event": ES(event).data,
        })


# ── CricketTeam (public list + admin CRUD) ────────────────────────────────────

class CricketTeamListView(generics.ListAPIView):
    """Public: list all active cricket teams."""
    queryset = CricketTeam.objects.filter(is_active=True).prefetch_related("players")

    def get_serializer_class(self):
        from .serializers import CricketTeamSerializer
        return CricketTeamSerializer


class AdminCricketTeamListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = CricketTeam.objects.prefetch_related("players").all()

    def get_serializer_class(self):
        from .serializers import CricketTeamDetailSerializer
        return CricketTeamDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # logo is not a writable serializer field; attach it from FILES before saving
        extra = {}
        if request.FILES.get("logo"):
            extra["logo"] = request.FILES["logo"]
        team = serializer.save(**extra)
        from .serializers import CricketTeamDetailSerializer as S
        return Response(S(team, context={"request": request}).data, status=status.HTTP_201_CREATED)


class AdminCricketTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    queryset = CricketTeam.objects.prefetch_related("players").all()

    def get_serializer_class(self):
        from .serializers import CricketTeamDetailSerializer
        return CricketTeamDetailSerializer

    def partial_update(self, request, *args, **kwargs):
        team = self.get_object()
        for field in ["name", "short_name", "city", "captain_name", "primary_color", "description"]:
            if field in request.data:
                setattr(team, field, request.data[field])
        if "is_active" in request.data:
            team.is_active = str(request.data["is_active"]).lower() not in ("false", "0")
        if request.FILES.get("logo"):
            team.logo = request.FILES["logo"]
        if "registration" in request.data:
            try:
                team.registration_id = int(request.data["registration"])
            except (ValueError, TypeError):
                team.registration = None
        team.save()
        from .serializers import CricketTeamDetailSerializer as S
        return Response(S(team, context={"request": request}).data)


# ── CricketTeam Player management ─────────────────────────────────────────────

class AdminCricketTeamPlayerListCreateView(generics.ListCreateAPIView):
    """List or add players for a specific CricketTeam."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        team = get_object_or_404(CricketTeam, pk=self.kwargs["team_pk"])
        return Player.objects.filter(cricket_team=team)

    def get_serializer_class(self):
        from .serializers import AdminPlayerSerializer
        return AdminPlayerSerializer

    def perform_create(self, serializer):
        team = get_object_or_404(CricketTeam, pk=self.kwargs["team_pk"])
        # CricketTeam players still need the team FK on Player — use a dummy or the registration
        # We set cricket_team; for team (FK to TeamRegistration) we use the linked registration or leave null
        if team.registration:
            serializer.save(cricket_team=team, team=team.registration)
        else:
            # team field is required on the model — create a stub registration if none exists
            reg, _ = TeamRegistration.objects.get_or_create(
                team_name=team.name,
                defaults={
                    "captain_name": team.captain_name or "TBD",
                    "phone": "0000000000",
                    "player_count": 0,
                    "season": 2025,
                }
            )
            serializer.save(cricket_team=team, team=reg)


class AdminCricketTeamPlayerDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Player.objects.filter(cricket_team_id=self.kwargs["team_pk"])

    def get_serializer_class(self):
        from .serializers import AdminPlayerSerializer
        return AdminPlayerSerializer


# ── MatchPlayerStats ──────────────────────────────────────────────────────────

class MatchPlayerStatsView(generics.ListCreateAPIView):
    """Public GET; staff-only POST."""

    def get_permissions(self):
        if self.request.method == "GET":
            return []
        return [IsStaffUser()]

    def get_queryset(self):
        return MatchPlayerStats.objects.filter(match_id=self.kwargs["match_pk"]).select_related("player", "team")

    def get_serializer_class(self):
        from .serializers import MatchPlayerStatsSerializer
        return MatchPlayerStatsSerializer

    def perform_create(self, serializer):
        serializer.save(match_id=self.kwargs["match_pk"])


class MatchPlayerStatsDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return MatchPlayerStats.objects.filter(match_id=self.kwargs["match_pk"])

    def get_serializer_class(self):
        from .serializers import MatchPlayerStatsSerializer
        return MatchPlayerStatsSerializer
