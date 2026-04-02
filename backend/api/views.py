from django.contrib.auth import authenticate
from rest_framework import generics, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Team, Match, ManagementMember, GalleryImage, Volunteer, TeamRegistration, ExamRegistration
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
)
from .serializers import (
    AdminVolunteerSerializer,
    AdminGalleryImageSerializer,
    AdminManagementMemberSerializer,
    AdminTeamSerializer,
    AdminMatchSerializer,
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
