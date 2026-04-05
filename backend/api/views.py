from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission, IsAuthenticated
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
)


class IsStaffUser(BasePermission):
    """Allows access only to Django staff users authenticated via token."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


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
        return Response({
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
        })


class AdminExamListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamRegistrationSerializer

    def get_queryset(self):
        return ExamRegistration.objects.all().order_by("-created_at")


class AdminExamDetailView(generics.RetrieveUpdateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamRegistrationSerializer
    queryset = ExamRegistration.objects.all()
    http_method_names = ["get", "patch", "head", "options"]


class AdminVolunteerListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminVolunteerSerializer
    queryset = Volunteer.objects.all().order_by("order", "id")


class AdminVolunteerDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminVolunteerSerializer
    queryset = Volunteer.objects.all()


class AdminGalleryListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminGalleryImageSerializer
    queryset = GalleryImage.objects.all()


class AdminGalleryDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminGalleryImageSerializer
    queryset = GalleryImage.objects.all()


class AdminManagementListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminManagementMemberSerializer
    queryset = ManagementMember.objects.all().order_by("order", "id")


class AdminManagementDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminManagementMemberSerializer
    queryset = ManagementMember.objects.all()


class AdminTeamListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminTeamSerializer
    queryset = Team.objects.all()


class AdminTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminTeamSerializer
    queryset = Team.objects.all()


class AdminMatchListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminMatchSerializer
    queryset = Match.objects.all().order_by("date", "id")


class AdminMatchDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminMatchSerializer
    queryset = Match.objects.all()


class AdminExamImportantDateListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamImportantDateSerializer
    queryset = ExamImportantDate.objects.all()


class AdminExamImportantDateDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamImportantDateSerializer
    queryset = ExamImportantDate.objects.all()


class AdminExamSupportSchoolListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamSupportSchoolSerializer
    queryset = ExamSupportSchool.objects.all()


class AdminExamSupportSchoolDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamSupportSchoolSerializer
    queryset = ExamSupportSchool.objects.all()


class AdminExamSyllabusItemListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamSyllabusItemSerializer
    queryset = ExamSyllabusItem.objects.all()


class AdminExamSyllabusItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamSyllabusItemSerializer
    queryset = ExamSyllabusItem.objects.all()


class AdminExamSamplePaperListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamSamplePaperSerializer
    queryset = ExamSamplePaper.objects.all()


class AdminExamSamplePaperDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamSamplePaperSerializer
    queryset = ExamSamplePaper.objects.all()


class AdminExamCenterDetailListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamCenterDetailSerializer
    queryset = ExamCenterDetail.objects.all()


class AdminExamCenterDetailDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamCenterDetailSerializer
    queryset = ExamCenterDetail.objects.all()


class AdminExamFaqListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamFaqSerializer
    queryset = ExamFaq.objects.all()


class AdminExamFaqDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamFaqSerializer
    queryset = ExamFaq.objects.all()


class AdminExamTopperListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamTopperSerializer
    queryset = ExamTopper.objects.select_related("student")


class AdminExamTopperDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = AdminExamTopperSerializer
    queryset = ExamTopper.objects.select_related("student")


class AdminGenerateExamDocumentsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk, *args, **kwargs):
        registration = generics.get_object_or_404(ExamRegistration, pk=pk)
        doc_type = str(request.data.get("type", "both")).lower()

        if doc_type in {"admit", "both"}:
            admit_content = (
                f"HBPL Admit Card\\n"
                f"Student: {registration.full_name}\\n"
                f"Roll Number: {registration.roll_number}\\n"
                f"DOB: {registration.date_of_birth}\\n"
            )
            registration.admit_card_file.save(
                f"admit_{registration.roll_number}.txt",
                ContentFile(admit_content.encode("utf-8")),
                save=False,
            )

        if doc_type in {"certificate", "both"}:
            cert_content = (
                f"HBPL Participation Certificate\\n"
                f"This certifies that {registration.full_name} participated in HBPL General Aptitude Competition.\\n"
                f"Roll Number: {registration.roll_number}\\n"
            )
            registration.participation_certificate_file.save(
                f"certificate_{registration.roll_number}.txt",
                ContentFile(cert_content.encode("utf-8")),
                save=False,
            )

        registration.save(update_fields=["admit_card_file", "participation_certificate_file", "updated_at"])
        serializer = AdminExamRegistrationSerializer(registration, context={"request": request})
        return Response(serializer.data)
