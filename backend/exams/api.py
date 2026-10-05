from django.contrib.auth import authenticate
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from pathlib import Path
from io import BytesIO
import json
import secrets
import base64
import hashlib
import hmac
from urllib import error as urllib_error, request as urllib_request
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.text import slugify
from rest_framework import generics, serializers, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfgen import canvas

from .models import (
    ApplicationDocument,
    ApplicationEvent,
    ApplicationNumberSequence,
    CashfreeExamPayment,
    Exam,
    ExamApplication,
    ExamCentre,
    ExamResult,
    ExamSamplePaper,
    ExaminationSession,
    School,
    StudentEmailVerification,
    StudentProfile,
)
from core.emailing import send_configured_email, send_templated_email
from api.models import ExamRegistration


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExaminationSession
        fields = [
            "id", "code", "name", "description",
            "is_active", "is_published", "sort_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"code": {"required": False}}

    def validate(self, attrs):
        name = attrs.get("name", getattr(self.instance, "name", ""))
        if not attrs.get("code") and name:
            attrs["code"] = slugify(name)[:60]
        return attrs


class ExamSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        source="session", queryset=ExaminationSession.objects.all(), write_only=True,
    )
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            "id", "session", "session_id", "category", "code", "name", "short_name", "slug",
            "status", "description", "subtitle", "application_prefix", "is_published", "fee",
            "allowed_classes",
            "max_registrations", "exam_date", "result_date", "registration_start", "registration_end",
            "reporting_time", "exam_start_time", "exam_end_time", "admit_card_template", "certificate_template",
            "application_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "application_count", "created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False}}

    def get_application_count(self, obj):
        return obj.applications.exclude(status=ExamApplication.Status.DRAFT).count()

    def validate_allowed_classes(self, value):
        if not isinstance(value, (list, str)):
            raise serializers.ValidationError("Provide eligible classes as a list.")
        return self.normalize_allowed_classes(value)

    @classmethod
    def normalize_allowed_classes(cls, value):
        if isinstance(value, list):
            return [item for entry in value for item in cls.normalize_allowed_classes(entry)]
        if isinstance(value, (int, float)):
            return [str(value)]
        if not isinstance(value, str) or not value.strip():
            return []
        value = value.strip()
        if value.startswith("["):
            try:
                parsed = json.loads(value)
            except (TypeError, ValueError):
                parsed = None
            if isinstance(parsed, list):
                return cls.normalize_allowed_classes(parsed)
        return [item.strip().replace("\\", "").strip("'\"[]") for item in value.split(",") if item.strip().replace("\\", "").strip("'\"[]")]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["allowed_classes"] = self.normalize_allowed_classes(data.get("allowed_classes"))
        return data

    def validate_admit_card_template(self, value):
        if value and Path(value.name).suffix.lower() not in {".pdf", ".html", ".htm"}:
            raise serializers.ValidationError("Upload an admit card template as PDF, HTML, or HTM.")
        return value

    def validate_certificate_template(self, value):
        if value and Path(value.name).suffix.lower() not in {".pdf", ".html", ".htm"}:
            raise serializers.ValidationError("Upload a certificate template as PDF, HTML, or HTM.")
        return value

    def validate(self, attrs):
        name = attrs.get("name", getattr(self.instance, "name", ""))
        if not attrs.get("slug") and name:
            attrs["slug"] = slugify(name)
        if not attrs.get("code") and name:
            attrs["code"] = slugify(name)[:60]
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data.setdefault("created_by", request.user)
        return super().create(validated_data)


class ExamSamplePaperDetailSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamSamplePaper
        fields = ["id", "title", "caption", "file_url"]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class PublicExamDetailSerializer(ExamSerializer):
    sample_papers = ExamSamplePaperDetailSerializer(many=True, read_only=True)

    class Meta(ExamSerializer.Meta):
        fields = ExamSerializer.Meta.fields + ["sample_papers"]


class ExamCentreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamCentre
        fields = [
            "id", "name", "code", "address", "city", "district", "state", "postal_code",
            "capacity", "contact_person", "contact_phone", "contact_email", "facilities",
            "internal_notes", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SchoolSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name"]


class StaffExamSerializer(ExamSerializer):
    centre_ids = serializers.PrimaryKeyRelatedField(
        source="centres", queryset=ExamCentre.objects.all(), many=True, required=False,
    )

    class Meta(ExamSerializer.Meta):
        fields = ExamSerializer.Meta.fields + ["centre_ids"]

    def to_internal_value(self, data):
        raw_centres = data.get("centre_ids") if hasattr(data, "get") else None
        if isinstance(raw_centres, str):
            import json

            try:
                centre_ids = json.loads(raw_centres)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError({"centre_ids": "Provide a list of centre IDs."}) from exc
            if not isinstance(centre_ids, list):
                raise serializers.ValidationError({"centre_ids": "Provide a list of centre IDs."})
            normalized = {key: data.get(key) for key in data.keys()}
            normalized["centre_ids"] = centre_ids
            data = normalized
        return super().to_internal_value(data)


class StudentProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()

    def validate_photo(self, value):
        if value and value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Photo must be 2 MB or smaller.")
        if value and not value.content_type.startswith("image/"):
            raise serializers.ValidationError("Upload an image file for your photo.")
        return value

    def validate_signature(self, value):
        if value and value.size > 1 * 1024 * 1024:
            raise serializers.ValidationError("Signature must be 1 MB or smaller.")
        if value and not value.content_type.startswith("image/"):
            raise serializers.ValidationError("Upload an image file for your signature.")
        return value

    class Meta:
        model = StudentProfile
        fields = [
            "id", "username", "email", "full_name", "gender", "phone", "date_of_birth", "father_name", "mother_name",
            "school_name", "class_name", "address", "photo", "photo_url", "signature", "signature_url", "email_verified",
        ]
        read_only_fields = ["id", "username", "email", "email_verified", "full_name", "photo_url", "signature_url"]

    def get_full_name(self, obj):
        return obj.user.get_full_name()

    def _file_url(self, obj, field):
        stored = getattr(obj, field)
        if not stored:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(stored.url) if request else stored.url

    def get_photo_url(self, obj):
        return self._file_url(obj, "photo")

    def get_signature_url(self, obj):
        return self._file_url(obj, "signature")


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    max_sizes = {
        "photo": 2 * 1024 * 1024,
        "signature": 1 * 1024 * 1024,
        "id_proof": 5 * 1024 * 1024,
        "other": 5 * 1024 * 1024,
    }

    def validate(self, attrs):
        uploaded_file = attrs.get("file")
        document_type = attrs.get("document_type")
        if uploaded_file and document_type in self.max_sizes and uploaded_file.size > self.max_sizes[document_type]:
            limit_mb = self.max_sizes[document_type] // (1024 * 1024)
            raise serializers.ValidationError({"file": f"This file is too large. Maximum size for {document_type.replace('_', ' ')} is {limit_mb} MB."})
        return attrs

    class Meta:
        model = ApplicationDocument
        fields = [
            "id", "document_type", "file", "file_url", "status", "review_note", "uploaded_at",
        ]
        read_only_fields = ["id", "file_url", "status", "review_note", "uploaded_at"]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class AssignedExamCentreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamCentre
        fields = ["id", "name", "address", "city", "district", "state", "postal_code"]


class ApplicationSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    exam_id = serializers.PrimaryKeyRelatedField(source="exam", queryset=Exam.objects.all(), write_only=True, required=False)
    documents = ApplicationDocumentSerializer(many=True, read_only=True)
    events = serializers.SerializerMethodField()
    result = serializers.SerializerMethodField()
    centre = AssignedExamCentreSerializer(read_only=True)
    admit_card_url = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = ExamApplication
        fields = [
            "id", "exam", "exam_id", "application_number", "status", "full_name", "father_name",
            "mother_name", "date_of_birth", "phone", "email", "school_name", "class_name", "address",
            "notes", "submitted_at", "reviewed_at", "review_notes", "documents", "events", "result",
            "centre", "admit_card_url", "admit_card_issued_at", "certificate_url", "certificate_number", "certificate_issued_at",
            "admit_card_email_sent_at", "admit_card_email_last_error", "certificate_email_sent_at", "certificate_email_last_error",
            "payment_status", "created_at", "updated_at",
        ]

        read_only_fields = [
            "id", "exam", "application_number", "status", "submitted_at", "reviewed_at",
            "review_notes", "documents", "events", "created_at", "updated_at",
            "centre", "admit_card_url", "admit_card_issued_at", "certificate_url", "certificate_number", "certificate_issued_at",
            "admit_card_email_sent_at", "admit_card_email_last_error", "certificate_email_sent_at", "certificate_email_last_error",
            "email",
        ]

    def get_result(self, obj):
        result = ExamResult.objects.filter(application=obj).first()
        if not result or obj.exam.status != Exam.Status.RESULT_OUT:
            return None
        return {
            "id": result.id,
            "obtained_marks": result.obtained_marks,
            "total_marks": result.total_marks,
            "percentage": result.percentage,
            "rank": result.rank,
            "grade": result.grade,
            "is_pass": result.is_pass,
            "remarks": result.remarks,
        }

    def get_payment_status(self, obj):
        latest_payment = obj.cashfree_payments.first()
        if latest_payment:
            return latest_payment.status
        if obj.exam.fee <= 0:
            return "not_required"
        return "unpaid"

    def _file_url(self, obj, field):
        stored = getattr(obj, field)
        if not stored:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(stored.url) if request else stored.url

    def get_admit_card_url(self, obj):
        if obj.exam.status != Exam.Status.ADMIT_CARD_OUT:
            return None
        return self._file_url(obj, "admit_card_file")

    def get_certificate_url(self, obj):
        if obj.exam.status != Exam.Status.RESULT_OUT:
            return None
        return self._file_url(obj, "certificate_file")

    def get_events(self, obj):
        return [
            {
                "id": event.id,
                "event_type": event.event_type,
                "from_status": event.from_status,
                "to_status": event.to_status,
                "note": event.note,
                "actor": event.actor.username if event.actor else None,
                "created_at": event.created_at,
            }
            for event in obj.events.select_related("actor").all()
        ]


class StaffApplicationSerializer(ApplicationSerializer):
    exam = StaffExamSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        source="centre", queryset=ExamCentre.objects.all(), required=False, allow_null=True,
    )

    class Meta(ApplicationSerializer.Meta):
        fields = ApplicationSerializer.Meta.fields + ["centre_id"]

    def validate_centre_id(self, centre):
        if centre is None:
            return centre
        exam = self.instance.exam if self.instance else self.initial_data.get("exam_id")
        if isinstance(exam, str):
            exam = Exam.objects.filter(pk=exam).first()
        if exam and not exam.centres.filter(pk=centre.pk).exists():
            raise serializers.ValidationError("Select a centre assigned to this examination.")
        if not centre.is_active and (not self.instance or self.instance.centre_id != centre.pk):
            raise serializers.ValidationError("This centre is inactive and cannot be newly assigned.")
        if centre.capacity and exam and centre.applications.filter(exam=exam).exclude(pk=getattr(self.instance, "pk", None)).count() >= centre.capacity:
            raise serializers.ValidationError("This centre has reached its seating capacity.")
        return centre


class StaffCashfreeExamPaymentSerializer(serializers.ModelSerializer):
    application_number = serializers.CharField(source="application.application_number", read_only=True, allow_null=True)
    student_name = serializers.CharField(source="application.full_name", read_only=True)
    student_email = serializers.EmailField(source="application.email", read_only=True)
    exam_name = serializers.CharField(source="application.exam.name", read_only=True)
    session_name = serializers.CharField(source="application.exam.session.name", read_only=True, allow_null=True)
    manually_accepted_by_name = serializers.CharField(source="manually_accepted_by.username", read_only=True, allow_null=True)

    class Meta:
        model = CashfreeExamPayment
        fields = [
            "id", "application_number", "student_name", "student_email", "exam_name", "session_name",
            "order_id", "amount", "currency", "status", "payment_method", "cf_payment_id",
            "manual_reference", "manually_accepted_by_name", "manually_accepted_at", "paid_at", "created_at",
        ]


class StaffExamResultSerializer(serializers.ModelSerializer):
    application_id = serializers.PrimaryKeyRelatedField(
        source="application", queryset=ExamApplication.objects.select_related("exam"), required=False,
    )
    application_number = serializers.CharField(source="application.application_number", read_only=True)
    student_name = serializers.CharField(source="application.full_name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)

    class Meta:
        model = ExamResult
        fields = [
            "id", "exam", "exam_name", "application_id", "application_number", "student_name",
            "roll_number", "total_marks", "obtained_marks", "percentage", "rank", "grade",
            "is_pass", "remarks", "updated_at",
        ]
        read_only_fields = ["id", "exam", "exam_name", "application_number", "student_name", "updated_at"]

    def validate_application_id(self, application):
        if application.status != ExamApplication.Status.APPROVED:
            raise serializers.ValidationError("Results can only be entered for approved applications.")
        return application

    def validate(self, attrs):
        if not self.instance and not attrs.get("application"):
            raise serializers.ValidationError({"application_id": "Choose an approved application."})
        total = attrs.get("total_marks", getattr(self.instance, "total_marks", None))
        obtained = attrs.get("obtained_marks", getattr(self.instance, "obtained_marks", None))
        if total is not None and total < 0:
            raise serializers.ValidationError({"total_marks": "Total marks cannot be negative."})
        if obtained is not None and obtained < 0:
            raise serializers.ValidationError({"obtained_marks": "Obtained marks cannot be negative."})
        if total is not None and obtained is not None and obtained > total:
            raise serializers.ValidationError({"obtained_marks": "Obtained marks cannot exceed total marks."})
        if total:
            from decimal import Decimal, ROUND_HALF_UP

            attrs["percentage"] = (Decimal(obtained or 0) * 100 / Decimal(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        elif total == 0:
            attrs["percentage"] = None
        return attrs

    def create(self, validated_data):
        application = validated_data["application"]
        validated_data.setdefault("exam", application.exam)
        validated_data.setdefault("roll_number", application.application_number or "")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("application", None)
        return super().update(instance, validated_data)


class LegacyRegistrationHistorySerializer(serializers.ModelSerializer):
    examination_name = serializers.SerializerMethodField()
    admit_card_url = serializers.SerializerMethodField()
    result_url = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamRegistration
        fields = [
            "id", "examination_name", "full_name", "roll_number", "date_of_birth", "school_name",
            "class_name", "examination_center", "center_address", "result_status", "marks_obtained",
            "total_marks", "rank", "remarks", "admit_card_url", "result_url", "certificate_url", "created_at",
        ]

    def get_examination_name(self, obj):
        return "Legacy HBPL Examination"

    def _file_url(self, obj, field_name, is_published):
        file_field = getattr(obj, field_name)
        if not is_published or not file_field:
            return None
        try:
            url = file_field.url
        except (ValueError, OSError):
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    def get_admit_card_url(self, obj):
        return self._file_url(obj, "admit_card_file", obj.publish_admit_card)

    def get_result_url(self, obj):
        return self._file_url(obj, "result_file", obj.result_status == ExamRegistration.ResultStatus.PUBLISHED)

    def get_certificate_url(self, obj):
        return self._file_url(obj, "participation_certificate_file", obj.publish_participation_certificate)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=200)
    gender = serializers.ChoiceField(choices=StudentProfile.Gender.choices)
    phone = serializers.CharField(max_length=30)
    date_of_birth = serializers.DateField()
    father_name = serializers.CharField(max_length=200)
    mother_name = serializers.CharField(max_length=200)
    school_name = serializers.CharField(max_length=300)
    class_name = serializers.CharField(max_length=100)
    address = serializers.CharField()
    photo = serializers.ImageField()
    signature = serializers.ImageField()

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(Q(username__iexact=value) | Q(email__iexact=value)).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_full_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Enter your full name.")
        return value

    def validate_photo(self, value):
        return StudentProfileSerializer().validate_photo(value)

    def validate_signature(self, value):
        return StudentProfileSerializer().validate_signature(value)

    def create(self, validated_data):
        profile_fields = (
            "gender", "phone", "date_of_birth", "father_name", "mother_name", "school_name",
            "class_name", "address", "photo", "signature",
        )
        profile_data = {field: validated_data.pop(field) for field in profile_fields}
        full_name = validated_data.pop("full_name")
        email = validated_data["email"]
        first_name, _, last_name = full_name.partition(" ")
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=validated_data["password"],
            )
            StudentProfile.objects.create(user=user, email_verified=False, **profile_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["email"].strip().lower()
        user = authenticate(username=identifier, password=attrs["password"])
        if user is None:
            user = User.objects.filter(email__iexact=identifier).first()
            if user:
                user = authenticate(username=user.username, password=attrs["password"])
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.")
        profile = StudentProfile.objects.filter(user=user).first()
        if profile and not profile.email_verified:
            raise serializers.ValidationError("Please verify your email before logging in.")
        attrs["user"] = user
        return attrs


def _send_verification_code(user):
    code = f"{secrets.randbelow(1_000_000):06d}"
    StudentEmailVerification.objects.update_or_create(
        user=user,
        defaults={
            "code_hash": make_password(code),
            "expires_at": timezone.now() + timedelta(minutes=15),
            "attempts": 0,
            "verified_at": None,
        },
    )
    send_templated_email(
        subject="Verify your HBPL student account",
        recipients=[user.email],
        template_name="core/emails/student_email_verification",
        context={"code": code},
        fail_silently=True,
    )


class PublicSessionListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SessionSerializer
    queryset = ExaminationSession.objects.filter(is_active=True, is_published=True)


class PublicSchoolListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SchoolSuggestionSerializer
    queryset = School.objects.filter(is_active=True).only("id", "name")


class PublicExamListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ExamSerializer

    def get_queryset(self):
        return Exam.objects.filter(
            is_published=True,
            session__is_active=True,
            session__is_published=True,
        ).select_related("session", "category")


class PublicExamDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicExamDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Exam.objects.filter(
            is_published=True,
            session__is_active=True,
            session__is_published=True,
        ).select_related("session", "category").prefetch_related("sample_papers")


def _class_number(value):
    text = str(value or "").strip().lower().replace("grade", "").replace("class", "").strip()
    try:
        return int(text)
    except (TypeError, ValueError):
        return None


def is_student_eligible(exam, profile):
    allowed = exam.allowed_classes or []
    if not allowed:
        return True
    student_class = _class_number(profile.class_name)
    if student_class is None:
        return False
    return student_class in {_class_number(item) for item in allowed if _class_number(item) is not None}


class MyEligibleExamListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ExamSerializer

    def get_queryset(self):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        submitted_exam_ids = ExamApplication.objects.filter(student=profile).exclude(
            status__in=[ExamApplication.Status.DRAFT, ExamApplication.Status.CORRECTION_REQUIRED]
        ).values_list("exam_id", flat=True)
        exams = Exam.objects.filter(
            is_published=True,
            session__is_active=True,
            session__is_published=True,
        ).exclude(id__in=submitted_exam_ids).select_related("session", "category")
        return [exam for exam in exams if is_student_eligible(exam, profile)]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _send_verification_code(user)
        return Response({"detail": "Account created. Check your email for the verification code.", "user": StudentProfileSerializer(user.student_profile).data}, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        code = str(request.data.get("code", "")).strip()
        user = User.objects.filter(email__iexact=email).first()
        verification = StudentEmailVerification.objects.filter(user=user).first() if user else None
        if not verification or verification.verified_at or verification.expires_at < timezone.now():
            return Response({"detail": "This verification code is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        if verification.attempts >= 5:
            return Response({"detail": "Too many attempts. Request a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        verification.attempts += 1
        verification.save(update_fields=["attempts"])
        if not check_password(code, verification.code_hash):
            return Response({"detail": "Incorrect verification code."}, status=status.HTTP_400_BAD_REQUEST)
        verification.verified_at = timezone.now()
        verification.save(update_fields=["verified_at"])
        StudentProfile.objects.filter(user=user).update(email_verified=True)
        send_templated_email(
            subject="Your HBPL student registration is complete",
            recipients=[user.email],
            template_name="core/emails/student_registration_success",
            context={"student_name": user.get_full_name() or "student"},
            fail_silently=True,
        )
        return Response({"detail": "Email verified. Your registration is complete; you can now log in."})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if user:
            profile = StudentProfile.objects.filter(user=user).first()
            if profile and not profile.email_verified:
                _send_verification_code(user)
        return Response({"detail": "If the account exists and is unverified, a new code has been sent."})


class StudentPasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "student_password_reset"

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user and StudentProfile.objects.filter(user=user, email_verified=True).exists():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            from .tasks import send_student_password_reset_email

            try:
                send_student_password_reset_email.delay(user.pk, uid, token)
            except Exception:
                # Keep the response indistinguishable for known and unknown addresses.
                import logging
                logging.getLogger(__name__).exception("Could not queue student password-reset email")
        return Response({"detail": "If a verified account exists for that email, password reset instructions have been sent."})


class StudentPasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "student_password_reset_confirm"

    def post(self, request):
        uid = str(request.data.get("uid", ""))
        token = str(request.data.get("token", ""))
        password = str(request.data.get("password", ""))
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        if not user or not default_token_generator.check_token(user, token):
            return Response({"detail": "This password reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password, user=user)
        except ValidationError as exc:
            return Response({"password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Password updated. Please log in with your new password."})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        profile, _ = StudentProfile.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": StudentProfileSerializer(profile).data})


class MeView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        return Response(StudentProfileSerializer(profile, context={"request": request}).data)

    def patch(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        serializer = StudentProfileSerializer(profile, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if "full_name" in request.data:
            parts = request.data.get("full_name", "").strip().split(maxsplit=1)
            request.user.first_name = parts[0] if parts else ""
            request.user.last_name = parts[1] if len(parts) > 1 else ""
            request.user.save(update_fields=["first_name", "last_name"])
        return Response(StudentProfileSerializer(profile, context={"request": request}).data)


class MyApplicationListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        return ExamApplication.objects.filter(student=profile).select_related("exam", "exam__session", "student")

    def perform_create(self, serializer):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        exam = serializer.validated_data.get("exam")
        if not exam:
            raise serializers.ValidationError({"exam_id": "This field is required."})
        if not exam.is_published or not exam.session_id or not exam.session.is_active:
            raise serializers.ValidationError({"exam_id": "This exam is not accepting applications."})
        values = serializer.validated_data
        original_class = profile.class_name
        profile.class_name = values.get("class_name") or profile.class_name
        if not is_student_eligible(exam, profile):
            profile.class_name = original_class
            raise serializers.ValidationError({"exam_id": "This examination is not available for your class."})
        for field in ["phone", "father_name", "mother_name", "date_of_birth", "school_name", "class_name", "address"]:
            value = values.get(field)
            if value not in (None, ""):
                setattr(profile, field, value)
        profile.save(update_fields=["phone", "father_name", "mother_name", "date_of_birth", "school_name", "class_name", "address", "updated_at"])
        serializer.save(
            student=profile,
            email=values.get("email") or profile.user.email,
            phone=values.get("phone") or profile.phone,
            father_name=values.get("father_name") or profile.father_name,
            mother_name=values.get("mother_name") or profile.mother_name,
            date_of_birth=values.get("date_of_birth") or profile.date_of_birth,
            school_name=values.get("school_name") or profile.school_name,
            class_name=values.get("class_name") or profile.class_name,
            address=values.get("address") or profile.address,
            full_name=values.get("full_name") or profile.user.get_full_name() or profile.user.username,
        )


class MyApplicationHistoryView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        applications = ExamApplication.objects.filter(student=profile).select_related("exam", "exam__session", "student")
        session_id = request.query_params.get("session")
        if session_id:
            applications = applications.filter(exam__session_id=session_id)
        legacy = ExamRegistration.objects.filter(email__iexact=request.user.email).order_by("-created_at")
        return Response({
            "applications": ApplicationSerializer(applications, many=True, context={"request": request}).data,
            "legacy_registrations": LegacyRegistrationHistorySerializer(legacy, many=True, context={"request": request}).data,
        })


class MyResultListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        results = ExamResult.objects.filter(
            application__student=profile,
            exam__status=Exam.Status.RESULT_OUT,
        ).select_related("exam", "exam__session", "application")
        session_id = request.query_params.get("session")
        if session_id:
            results = results.filter(exam__session_id=session_id)
        return Response([
            {
                "id": result.id,
                "exam": result.exam.name,
                "session": result.exam.session.name if result.exam.session else "",
                "session_id": result.exam.session_id,
                "application_number": result.application.application_number if result.application else None,
                "obtained_marks": result.obtained_marks,
                "total_marks": result.total_marks,
                "percentage": result.percentage,
                "rank": result.rank,
                "grade": result.grade,
                "is_pass": result.is_pass,
                "remarks": result.remarks,
            }
            for result in results
        ])


class MyApplicationDetailView(generics.RetrieveUpdateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        return ExamApplication.objects.filter(student=profile).select_related("exam", "exam__session", "student")

    def perform_update(self, serializer):
        application = self.get_object()
        if application.status not in [ExamApplication.Status.DRAFT, ExamApplication.Status.CORRECTION_REQUIRED]:
            raise serializers.ValidationError("Only draft or correction-required applications can be edited.")
        updated = serializer.save()
        profile = updated.student
        for field in ["phone", "father_name", "mother_name", "date_of_birth", "school_name", "class_name", "address"]:
            value = getattr(updated, field)
            if value not in (None, ""):
                setattr(profile, field, value)
        profile.save(update_fields=["phone", "father_name", "mother_name", "date_of_birth", "school_name", "class_name", "address", "updated_at"])


class MyApplicationFormDownloadView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        application = get_object_or_404(
            ExamApplication.objects.select_related("exam", "exam__session", "student", "centre")
            .prefetch_related("documents"),
            pk=pk,
            student=profile,
        )
        if not application.application_number:
            return Response({"detail": "Submit your enrollment before downloading its form."}, status=status.HTTP_400_BAD_REQUEST)

        buffer = BytesIO()
        page_width, page_height = A4
        pdf = canvas.Canvas(buffer, pagesize=A4)
        navy = colors.HexColor("#172438")
        gold = colors.HexColor("#b57a19")
        muted = colors.HexColor("#687486")
        ink = colors.HexColor("#243247")
        line = colors.HexColor("#dce2e8")
        left, right = 42, page_width - 42
        content_width = right - left
        y = page_height - 42

        def clean(value):
            return str(value or "- ").replace("\r", " ").replace("\n", " ").encode("latin-1", "replace").decode("latin-1")

        def new_page():
            nonlocal y
            pdf.setFillColor(navy)
            pdf.roundRect(left, page_height - 124, content_width, 82, 10, fill=1, stroke=0)
            pdf.setFillColor(gold)
            pdf.roundRect(left, page_height - 124, 6, 82, 3, fill=1, stroke=0)
            pdf.setFillColor(colors.white)
            pdf.setFont("Helvetica-Bold", 17)
            pdf.drawString(left + 20, page_height - 75, "HBPL | STUDENT EXAMINATION PORTAL")
            pdf.setFont("Helvetica", 10)
            pdf.setFillColor(colors.HexColor("#d5deea"))
            pdf.drawString(left + 20, page_height - 96, "EXAMINATION APPLICATION FORM")
            pdf.setFillColor(colors.white)
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawRightString(right - 16, page_height - 75, clean(application.application_number))
            y = page_height - 150

        def ensure_space(height):
            nonlocal y
            if y - height < 48:
                footer()
                pdf.showPage()
                new_page()

        def footer():
            pdf.setStrokeColor(line)
            pdf.line(left, 38, right, 38)
            pdf.setFillColor(muted)
            pdf.setFont("Helvetica", 8)
            pdf.drawString(left, 25, "Generated from the HBPL student portal")
            pdf.drawRightString(right, 25, clean(application.application_number))

        def section(title):
            nonlocal y
            ensure_space(34)
            y -= 8
            pdf.setFillColor(gold)
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawString(left, y, title.upper())
            y -= 8
            pdf.setStrokeColor(line)
            pdf.line(left, y, right, y)
            y -= 18

        def field(label, value, x, top, width):
            value_lines = simpleSplit(clean(value), "Helvetica", 10, width - 4) or ["-"]
            value_lines = value_lines[:3]
            pdf.setFillColor(muted)
            pdf.setFont("Helvetica-Bold", 7)
            pdf.drawString(x, top, clean(label).upper())
            pdf.setFillColor(ink)
            pdf.setFont("Helvetica", 10)
            for index, value_line in enumerate(value_lines):
                pdf.drawString(x, top - 15 - 13 * index, value_line)
            return 23 + (len(value_lines) - 1) * 13

        def two_fields(first, second):
            nonlocal y
            first_height = field(first[0], first[1], left + 2, y, content_width / 2 - 12)
            second_height = field(second[0], second[1], left + content_width / 2, y, content_width / 2 - 4)
            y -= max(first_height, second_height) + 8

        new_page()
        section("Enrollment summary")
        two_fields(("Application number", application.application_number), ("Enrollment status", application.get_status_display()))
        two_fields(("Submitted on", timezone.localtime(application.submitted_at).strftime("%d %B %Y, %I:%M %p") if application.submitted_at else "-"), ("Class", application.class_name))

        section("Examination details")
        two_fields(("Examination", application.exam.name), ("Academic session", application.exam.session.name if application.exam.session else "-"))
        two_fields(("Examination date", application.exam.exam_date.strftime("%d %B %Y") if application.exam.exam_date else "To be announced"), ("Reporting time", application.exam.reporting_time or "To be announced"))
        exam_time = " - ".join(filter(None, [application.exam.exam_start_time, application.exam.exam_end_time])) or "To be announced"
        two_fields(("Examination time", exam_time), ("Application fee", f"INR {application.exam.fee}" if application.exam.fee else "No fee"))
        centre = application.centre
        centre_address = ", ".join(filter(None, [centre.address, centre.city, centre.district, centre.state, centre.postal_code])) if centre else "To be assigned"
        two_fields(("Examination centre", centre.name if centre else "To be assigned"), ("Centre address", centre_address))

        ensure_space(135)
        section("Payment details")
        payment = (
            application.cashfree_payments.filter(status=CashfreeExamPayment.Status.PAID).order_by("-paid_at", "-created_at").first()
            or application.cashfree_payments.order_by("-created_at").first()
        )
        payment_status = (
            "Paid" if payment and payment.status == CashfreeExamPayment.Status.PAID
            else "Not required" if application.exam.fee <= 0
            else payment.get_status_display() if payment else "Unpaid"
        )
        amount_paid = f"{payment.currency} {payment.amount:.2f}" if payment and payment.status == CashfreeExamPayment.Status.PAID else "INR 0.00"
        two_fields(("Payment status", payment_status), ("Amount paid", amount_paid))
        payment_reference = (
            payment.manual_reference if payment.payment_method == CashfreeExamPayment.Method.MANUAL
            else "No payment required" if payment.payment_method == CashfreeExamPayment.Method.NO_CHARGE
            else payment.cf_payment_id or payment.order_id
        ) if payment else "-"
        two_fields(("Payment order ID", payment.order_id if payment else "-"), ("Payment method", payment.get_payment_method_display() if payment else "-"))
        paid_at = timezone.localtime(payment.paid_at).strftime("%d %B %Y, %I:%M %p") if payment and payment.paid_at else "-"
        two_fields(("Payment reference", payment_reference), ("Paid on", paid_at))

        section("Student details")
        photo_doc = next((doc for doc in application.documents.all() if doc.document_type == ApplicationDocument.DocumentType.PHOTO), None)
        signature_doc = next((doc for doc in application.documents.all() if doc.document_type == ApplicationDocument.DocumentType.SIGNATURE), None)
        photo_field = (photo_doc.file if photo_doc and photo_doc.file else application.student.photo)
        signature_field = (signature_doc.file if signature_doc and signature_doc.file else application.student.signature)
        image_x, image_y, image_w, image_h = right - 88, y - 106, 76, 96
        pdf.setStrokeColor(line)
        pdf.roundRect(image_x, image_y, image_w, image_h, 4, fill=0, stroke=1)
        try:
            if photo_field:
                photo_field.open("rb")
                image = ImageReader(BytesIO(photo_field.read()))
                photo_field.close()
                image_width, image_height = image.getSize()
                scale = min((image_w - 6) / image_width, (image_h - 6) / image_height)
                pdf.drawImage(image, image_x + (image_w - image_width * scale) / 2, image_y + (image_h - image_height * scale) / 2, image_width * scale, image_height * scale, preserveAspectRatio=True, mask="auto")
        except (OSError, ValueError, TypeError):
            pass
        info_width = content_width - 104
        field("Full name", application.full_name, left + 2, y, info_width)
        y -= 34
        field("Date of birth", application.date_of_birth.strftime("%d %B %Y") if application.date_of_birth else "-", left + 2, y, info_width)
        y -= 34
        field("Father's name", application.father_name, left + 2, y, info_width)
        y -= 34
        field("Mother's name", application.mother_name, left + 2, y, info_width)
        y -= 34
        field("Phone number", application.phone, left + 2, y, info_width)
        y -= 34
        two_fields(("Email address", application.email), ("School", application.school_name))
        address_height = field("Residential address", application.address, left + 2, y, content_width)
        y -= address_height + 8

        section("Student declaration")
        declaration = "I confirm that the information provided in this examination enrollment is correct to the best of my knowledge."
        for text_line in simpleSplit(declaration, "Helvetica", 9, content_width):
            pdf.setFillColor(ink)
            pdf.setFont("Helvetica", 9)
            pdf.drawString(left + 2, y, text_line)
            y -= 14
        y -= 42
        ensure_space(72)
        pdf.setStrokeColor(muted)
        pdf.line(right - 178, y, right, y)
        if signature_field:
            try:
                signature_field.open("rb")
                signature_image = ImageReader(BytesIO(signature_field.read()))
                signature_field.close()
                sig_w, sig_h = signature_image.getSize()
                scale = min(145 / sig_w, 34 / sig_h)
                pdf.drawImage(signature_image, right - 170, y + 4, sig_w * scale, sig_h * scale, preserveAspectRatio=True, mask="auto")
            except (OSError, ValueError, TypeError):
                pass
        pdf.setFillColor(muted)
        pdf.setFont("Helvetica", 8)
        pdf.drawRightString(right, y - 13, "Student signature")
        footer()
        pdf.save()

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="HBPL-{application.application_number}-application-form.pdf"'
        response["Cache-Control"] = "private, no-store"
        return response


def _issue_application_number(exam):
    sequence, _ = ApplicationNumberSequence.objects.select_for_update().get_or_create(exam=exam)
    number = sequence.next_number
    sequence.next_number = number + 1
    sequence.save(update_fields=["next_number"])
    prefix = exam.application_prefix or (exam.code or exam.slug).upper().replace("-", "")[:20]
    return f"{prefix}-{number:05d}"


def _cashfree_request(method, path, payload=None):
    app_id = settings.CASHFREE_APP_ID
    secret = settings.CASHFREE_SECRET_KEY
    if not app_id or not secret:
        raise RuntimeError("Cashfree credentials are not configured on the server.")
    base_url = "https://api.cashfree.com/pg" if settings.CASHFREE_ENV == "production" else "https://sandbox.cashfree.com/pg"
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib_request.Request(
        f"{base_url}{path}",
        data=body,
        headers={
            "x-client-id": app_id,
            "x-client-secret": secret,
            "x-api-version": "2025-01-01",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib_request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"Cashfree returned HTTP {exc.code}: {detail[:500]}") from exc
    except urllib_error.URLError as exc:
        raise ValueError("Could not connect to Cashfree. Please retry.") from exc


def _create_cashfree_payment_order(application, request):
    if application.exam.fee <= 0:
        raise ValueError("No payment is due for this examination.")
    if application.status not in {
        ExamApplication.Status.DRAFT,
        ExamApplication.Status.CORRECTION_REQUIRED,
        ExamApplication.Status.RESUBMITTED,
    }:
        raise ValueError("Only an incomplete enrollment can start a payment.")
    existing = application.cashfree_payments.filter(status=CashfreeExamPayment.Status.PAID).first()
    if existing:
        _finalize_paid_application(application, application.student.user)
        return {"already_paid": True, "application_id": application.pk}
    recent_pending = application.cashfree_payments.filter(
        status=CashfreeExamPayment.Status.PENDING,
        created_at__gte=timezone.now() - timedelta(minutes=25),
    ).first()
    if recent_pending:
        return {
            "order_id": recent_pending.order_id,
            "payment_session_id": recent_pending.payment_session_id,
            "mode": "production" if settings.CASHFREE_ENV == "production" else "sandbox",
        }

    order_id = f"hbpl-{application.pk}-{secrets.token_hex(8)}"
    portal_url = settings.EXAM_PORTAL_URL
    response = _cashfree_request("POST", "/orders", {
        "order_id": order_id,
        "order_amount": float(application.exam.fee),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": f"student-{application.student_id}",
            "customer_name": application.full_name,
            "customer_email": application.email or application.student.user.email,
            "customer_phone": application.phone,
        },
        "order_meta": {
            "return_url": f"{portal_url}/exams/payment/return?application_id={application.pk}&order_id={order_id}",
            "notify_url": request.build_absolute_uri("/api/v1/cashfree/webhook/"),
        },
        "order_note": f"Exam enrollment {application.pk}",
    })
    session_id = response.get("payment_session_id")
    if not session_id:
        raise ValueError("Cashfree did not return a payment session. Please retry.")
    CashfreeExamPayment.objects.create(
        application=application,
        order_id=order_id,
        payment_session_id=session_id,
        amount=application.exam.fee,
    )
    return {
        "order_id": order_id,
        "payment_session_id": session_id,
        "mode": "production" if settings.CASHFREE_ENV == "production" else "sandbox",
    }


def _finalize_paid_application(application, user):
    with transaction.atomic():
        application = ExamApplication.objects.select_for_update().select_related("exam", "exam__session").get(pk=application.pk)
        if application.status not in {
            ExamApplication.Status.DRAFT,
            ExamApplication.Status.CORRECTION_REQUIRED,
            ExamApplication.Status.RESUBMITTED,
        }:
            return application
        if not application.cashfree_payments.filter(status=CashfreeExamPayment.Status.PAID).exists():
            raise ValueError("There is no completed payment record for this enrollment yet.")
        exam = application.exam
        now = timezone.now()
        if not exam.is_published or not exam.session or not exam.session.is_active or exam.status != Exam.Status.REGISTRATION_OPEN:
            raise ValueError("Payment is confirmed, but this exam is no longer accepting enrollments. Contact the examination team.")
        if not is_student_eligible(exam, application.student):
            raise ValueError("This examination is not available for the student's class.")
        if not application.full_name or not application.date_of_birth:
            raise ValueError("Full name and date of birth are required before enrollment.")
        if exam.max_registrations is not None and exam.applications.exclude(status=ExamApplication.Status.DRAFT).count() >= exam.max_registrations:
            raise ValueError("This exam has reached its application limit. Contact the examination team about your payment.")
        previous = application.status
        application.application_number = application.application_number or _issue_application_number(exam)
        application.status = ExamApplication.Status.SUBMITTED
        application.submitted_at = now
        application.save(update_fields=["application_number", "status", "submitted_at", "updated_at"])
        ApplicationEvent.objects.create(
            application=application,
            event_type="submitted",
            from_status=previous,
            to_status=application.status,
            actor=user,
        )
        return application


def _ensure_no_charge_payment(application):
    if application.exam.fee > 0:
        return None
    payment, _ = CashfreeExamPayment.objects.get_or_create(
        application=application,
        payment_method=CashfreeExamPayment.Method.NO_CHARGE,
        defaults={
            "order_id": f"free-{application.pk}",
            "payment_session_id": "",
            "amount": Decimal("0.00"),
            "currency": "INR",
            "status": CashfreeExamPayment.Status.PAID,
            "paid_at": timezone.now(),
        },
    )
    return payment


def _confirm_cashfree_order(payment):
    order = _cashfree_request("GET", f"/orders/{payment.order_id}")
    if order.get("order_id") != payment.order_id:
        raise ValueError("Cashfree order reference did not match.")
    if order.get("order_currency") != payment.currency or Decimal(str(order.get("order_amount", "0"))) != payment.amount:
        raise ValueError("Cashfree order amount did not match the enrollment fee.")
    if order.get("order_status") == "PAID":
        payment.status = CashfreeExamPayment.Status.PAID
        payment.paid_at = payment.paid_at or timezone.now()
        payment.save(update_fields=["status", "paid_at", "updated_at"])
        if not payment.payment_confirmation_email_sent_at:
            transaction.on_commit(lambda payment_id=payment.pk: _queue_payment_confirmation_email(payment_id))
        return True
    return False


def _queue_payment_confirmation_email(payment_id):
    try:
        from .tasks import send_exam_payment_confirmation_email

        send_exam_payment_confirmation_email.delay(payment_id)
    except Exception as exc:
        CashfreeExamPayment.objects.filter(pk=payment_id).update(
            payment_confirmation_email_last_error=f"Could not queue payment confirmation email: {exc}"[:4000],
        )


class CashfreePaymentOrderView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        application = get_object_or_404(
            ExamApplication.objects.select_related("exam", "exam__session", "student"),
            pk=pk,
            student=profile,
        )
        now = timezone.now()
        if (
            not application.exam.is_published
            or not application.exam.session
            or not application.exam.session.is_active
            or application.exam.status != Exam.Status.REGISTRATION_OPEN
            or (application.exam.registration_start and now < application.exam.registration_start)
            or (application.exam.registration_end and now > application.exam.registration_end)
        ):
            return Response({"detail": "This exam is not accepting applications."}, status=status.HTTP_400_BAD_REQUEST)
        if not is_student_eligible(application.exam, profile):
            return Response({"detail": "This examination is not available for your class."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = _create_cashfree_payment_order(application, request)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(order)


class CashfreePaymentVerifyView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id", "")
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        payment = get_object_or_404(CashfreeExamPayment.objects.select_related("application"), order_id=order_id, application__student=profile)
        try:
            paid = _confirm_cashfree_order(payment)
            if paid:
                _finalize_paid_application(payment.application, request.user)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        application = ExamApplication.objects.select_related("exam", "exam__session", "student").get(pk=payment.application_id)
        return Response({
            "paid": paid,
            "application": ApplicationSerializer(application, context={"request": request}).data,
        })


class CashfreeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        signature = request.headers.get("x-webhook-signature", "")
        timestamp = request.headers.get("x-webhook-timestamp", "")
        secret = settings.CASHFREE_SECRET_KEY.encode("utf-8")
        raw_body = request._request.body
        expected = base64.b64encode(hmac.new(secret, timestamp.encode("utf-8") + raw_body, hashlib.sha256).digest()).decode("ascii")
        if not secret or not signature or not timestamp or not hmac.compare_digest(expected, signature):
            return Response({"detail": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
            order_id = payload["data"]["order"]["order_id"]
            payment = CashfreeExamPayment.objects.select_related("application__student__user").get(order_id=order_id)
        except (ValueError, KeyError, TypeError, CashfreeExamPayment.DoesNotExist):
            return Response({"detail": "Unknown or invalid Cashfree order."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            paid = _confirm_cashfree_order(payment)
            payment_data = payload.get("data", {}).get("payment", {})
            if paid:
                if payment_data.get("cf_payment_id"):
                    payment.cf_payment_id = str(payment_data["cf_payment_id"])
                    payment.save(update_fields=["cf_payment_id", "updated_at"])
                _finalize_paid_application(payment.application, payment.application.student.user)
            elif not paid and payment.status == CashfreeExamPayment.Status.PENDING:
                status_map = {
                    "FAILED": CashfreeExamPayment.Status.FAILED,
                    "USER_DROPPED": CashfreeExamPayment.Status.USER_DROPPED,
                }
                next_status = status_map.get(payment_data.get("payment_status"))
                if next_status:
                    payment.status = next_status
                    payment.save(update_fields=["status", "updated_at"])
        except (RuntimeError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"received": True})


class SubmitApplicationView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        with transaction.atomic():
            application = ExamApplication.objects.select_for_update().select_related("exam", "exam__session").get(pk=pk, student=profile)
            if application.exam.fee > 0 and not application.cashfree_payments.filter(status=CashfreeExamPayment.Status.PAID).exists():
                return Response({"detail": "Complete the examination fee payment before submitting this enrollment."}, status=status.HTTP_402_PAYMENT_REQUIRED)
            if application.status not in [ExamApplication.Status.DRAFT, ExamApplication.Status.CORRECTION_REQUIRED, ExamApplication.Status.RESUBMITTED]:
                return Response({"detail": "This application cannot be submitted in its current state."}, status=status.HTTP_400_BAD_REQUEST)
            now = timezone.now()
            exam = application.exam
            if not exam.is_published or not exam.session or not exam.session.is_active:
                return Response({"detail": "This exam is not accepting applications."}, status=status.HTTP_400_BAD_REQUEST)
            if not is_student_eligible(exam, profile):
                return Response({"detail": "This examination is not available for your class."}, status=status.HTTP_400_BAD_REQUEST)
            if exam.status in {
                Exam.Status.REGISTRATION_CLOSED,
                Exam.Status.ADMIT_CARD_OUT,
                Exam.Status.ONGOING,
                Exam.Status.RESULT_PENDING,
                Exam.Status.RESULT_OUT,
                Exam.Status.COMPLETED,
            }:
                return Response({"detail": "Registration is closed for this examination."}, status=status.HTTP_400_BAD_REQUEST)
            if exam.registration_start and now < exam.registration_start:
                return Response({"detail": "Registration has not opened yet."}, status=status.HTTP_400_BAD_REQUEST)
            if exam.registration_end and now > exam.registration_end:
                return Response({"detail": "Registration is closed."}, status=status.HTTP_400_BAD_REQUEST)
            if exam.max_registrations is not None and exam.applications.exclude(status=ExamApplication.Status.DRAFT).count() >= exam.max_registrations:
                return Response({"detail": "This exam has reached its application limit."}, status=status.HTTP_400_BAD_REQUEST)
            if not application.full_name or not application.date_of_birth:
                return Response({"detail": "Full name and date of birth are required before submission."}, status=status.HTTP_400_BAD_REQUEST)
            _ensure_no_charge_payment(application)
            previous = application.status
            if not application.application_number:
                application.application_number = _issue_application_number(exam)
            application.status = ExamApplication.Status.SUBMITTED
            application.submitted_at = now
            application.save(update_fields=["application_number", "status", "submitted_at", "updated_at"])
            ApplicationEvent.objects.create(
                application=application,
                event_type="submitted",
                from_status=previous,
                to_status=application.status,
                actor=request.user,
            )
        return Response(ApplicationSerializer(application, context={"request": request}).data)


class QuickApplyView(APIView):
    """Create an exam-specific enrollment from the student's one-time profile."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        exam = Exam.objects.filter(pk=request.data.get("exam_id"), is_published=True).select_related("session").first()
        if not exam or not exam.session or not exam.session.is_active:
            return Response({"detail": "This exam is not accepting applications."}, status=status.HTTP_400_BAD_REQUEST)

        required = {
            "full_name": request.user.get_full_name().strip(),
            "phone": profile.phone,
            "date_of_birth": profile.date_of_birth,
            "father_name": profile.father_name,
            "school_name": profile.school_name,
            "class_name": profile.class_name,
            "address": profile.address,
            "photo": profile.photo,
            "signature": profile.signature,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            return Response({"detail": "Complete your student profile before applying.", "missing_fields": missing}, status=status.HTTP_400_BAD_REQUEST)
        if not is_student_eligible(exam, profile):
            return Response({"detail": "This examination is not available for your class."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if exam.status != Exam.Status.REGISTRATION_OPEN:
            return Response({"detail": "Registration is not open for this examination."}, status=status.HTTP_400_BAD_REQUEST)
        if (exam.registration_start and now < exam.registration_start) or (exam.registration_end and now > exam.registration_end):
            return Response({"detail": "Registration is not open for this examination."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            application = ExamApplication.objects.select_for_update().filter(exam=exam, student=profile).first()
            if application and application.status != ExamApplication.Status.DRAFT:
                if application.status in {
                    ExamApplication.Status.CORRECTION_REQUIRED,
                    ExamApplication.Status.REJECTED,
                    ExamApplication.Status.WITHDRAWN,
                }:
                    return Response(
                        {"detail": "This enrollment needs attention. Open it from your dashboard to continue."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response(ApplicationSerializer(application, context={"request": request}).data)
            if not application:
                if exam.max_registrations is not None and exam.applications.exclude(status=ExamApplication.Status.DRAFT).count() >= exam.max_registrations:
                    return Response({"detail": "This exam has reached its application limit."}, status=status.HTTP_400_BAD_REQUEST)
                application = ExamApplication.objects.create(
                    exam=exam, student=profile, full_name=required["full_name"],
                    father_name=profile.father_name, mother_name=profile.mother_name,
                    date_of_birth=profile.date_of_birth, phone=profile.phone, email=request.user.email,
                    school_name=profile.school_name, class_name=profile.class_name, address=profile.address,
                )
            else:
                for field, value in required.items():
                    if field not in {"photo", "signature"}:
                        setattr(application, field, value)
                application.mother_name = profile.mother_name
                application.email = request.user.email
                application.save()

            existing_types = set(application.documents.values_list("document_type", flat=True))
            for doc_type, profile_field in (("photo", "photo"), ("signature", "signature")):
                if doc_type in existing_types:
                    continue
                source = getattr(profile, profile_field)
                suffix = Path(source.name).suffix or ".jpg"
                source.open("rb")
                try:
                    copied = ContentFile(source.read(), name=f"student-{profile.pk}-{doc_type}{suffix}")
                finally:
                    source.close()
                ApplicationDocument.objects.create(application=application, document_type=doc_type, file=copied)

            if exam.fee > 0:
                return Response(ApplicationSerializer(application, context={"request": request}).data, status=status.HTTP_201_CREATED)

            _ensure_no_charge_payment(application)
            previous = application.status
            if not application.application_number:
                application.application_number = _issue_application_number(exam)
            application.status = ExamApplication.Status.SUBMITTED
            application.submitted_at = now
            application.save(update_fields=["application_number", "status", "submitted_at", "updated_at"])
            ApplicationEvent.objects.create(
                application=application, event_type="submitted", from_status=previous,
                to_status=application.status, actor=request.user,
            )
        return Response(ApplicationSerializer(application, context={"request": request}).data, status=status.HTTP_201_CREATED)


class MyApplicationDocumentView(generics.CreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        profile, _ = StudentProfile.objects.get_or_create(user=self.request.user)
        application = ExamApplication.objects.get(pk=self.kwargs["pk"], student=profile)
        if application.status not in [ExamApplication.Status.DRAFT, ExamApplication.Status.CORRECTION_REQUIRED, ExamApplication.Status.RESUBMITTED]:
            raise serializers.ValidationError("Documents cannot be changed after approval or rejection.")
        serializer.save(application=application)


class StaffSessionListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = SessionSerializer
    queryset = ExaminationSession.objects.all()


class StaffEmailTestView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "staff_email_test"

    def post(self, request):
        email = serializers.EmailField().run_validation(request.data.get("email"))
        try:
            sent = send_configured_email(
                "HBPL email delivery test",
                "This test message confirms that the configured HBPL email service can send email.",
                [email],
                html_body=(
                    "<p>This test message confirms that the configured HBPL email service "
                    "can send email.</p>"
                ),
                fail_silently=False,
            )
        except Exception as exc:
            return Response(
                {"success": False, "detail": f"Email send failed: {str(exc)[:500]}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not sent:
            return Response(
                {"success": False, "detail": "The email backend did not accept the test message."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"success": True, "detail": f"Test email accepted for delivery to {email}."})


class StaffSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = SessionSerializer
    queryset = ExaminationSession.objects.all()

    def perform_destroy(self, instance):
        if instance.exams.exists():
            raise serializers.ValidationError("Delete or move the exams in this session before deleting it.")
        instance.delete()


class StaffExamListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffExamSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return Exam.objects.select_related("session", "category").prefetch_related("centres").all()


class StaffExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffExamSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = Exam.objects.select_related("session", "category").prefetch_related("centres").all()

    def perform_destroy(self, instance):
        if instance.applications.exists():
            raise serializers.ValidationError("An examination with applications cannot be deleted.")
        instance.delete()


class StaffExamCentreListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = ExamCentreSerializer
    queryset = ExamCentre.objects.all()


class StaffExamCentreDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = ExamCentreSerializer
    queryset = ExamCentre.objects.all()

    def perform_destroy(self, instance):
        if instance.exams.exists():
            raise serializers.ValidationError("This centre is assigned to an exam. Deactivate it instead of deleting it.")
        instance.delete()


class StaffExamSamplePaperSerializer(serializers.ModelSerializer):
    exam_id = serializers.PrimaryKeyRelatedField(source="exam", queryset=Exam.objects.all())
    file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExamSamplePaper
        fields = ["id", "exam_id", "title", "caption", "file", "file_url"]
        read_only_fields = ["id", "file_url"]
        extra_kwargs = {"file": {"required": False}}

    def validate_file(self, value):
        if value and not value.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Sample papers must be uploaded as PDF files.")
        if value and value.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("Sample paper files must be 20 MB or smaller.")
        return value

    def validate(self, attrs):
        if not self.instance and not attrs.get("file"):
            raise serializers.ValidationError({"file": "Choose a PDF file to upload."})
        return attrs

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class StaffExamSamplePaperListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffExamSamplePaperSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        exam_id = self.request.query_params.get("exam_id")
        if not exam_id or not exam_id.isdigit():
            return ExamSamplePaper.objects.none()
        return ExamSamplePaper.objects.filter(exam_id=exam_id).select_related("exam")


class StaffExamSamplePaperDetailView(generics.RetrieveDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffExamSamplePaperSerializer
    queryset = ExamSamplePaper.objects.select_related("exam").filter(exam__isnull=False)

    def perform_destroy(self, instance):
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()


class StaffApplicationListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffApplicationSerializer

    def get_queryset(self):
        queryset = ExamApplication.objects.select_related("exam", "exam__session", "student", "student__user").all()
        exam_id = self.request.query_params.get("exam")
        status_value = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        else:
            queryset = queryset.exclude(status__in=[ExamApplication.Status.DRAFT, ExamApplication.Status.WITHDRAWN])
        if search:
            queryset = queryset.filter(
                Q(application_number__icontains=search) | Q(full_name__icontains=search) |
                Q(email__icontains=search) | Q(school_name__icontains=search)
            )
        return queryset


class StaffCashfreeExamPaymentListView(generics.ListAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffCashfreeExamPaymentSerializer

    def get_queryset(self):
        queryset = CashfreeExamPayment.objects.select_related(
            "application", "application__exam", "application__exam__session",
        ).order_by("-created_at")
        status_value = self.request.query_params.get("status")
        exam_id = self.request.query_params.get("exam")
        search = self.request.query_params.get("search")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if exam_id:
            queryset = queryset.filter(application__exam_id=exam_id)
        if search:
            queryset = queryset.filter(
                Q(order_id__icontains=search) | Q(cf_payment_id__icontains=search)
                | Q(application__application_number__icontains=search)
                | Q(application__full_name__icontains=search)
                | Q(application__email__icontains=search)
                | Q(application__exam__name__icontains=search)
            )
        return queryset


class StaffAcceptExamPaymentView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        reference = str(request.data.get("reference", "")).strip()
        if not reference or len(reference) > 200:
            return Response({"detail": "Enter the offline receipt or transaction reference (up to 200 characters)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                payment = get_object_or_404(
                    CashfreeExamPayment.objects.select_for_update().select_related(
                        "application__exam__session", "application__student",
                    ), pk=pk,
                )
                if payment.status == CashfreeExamPayment.Status.PAID:
                    return Response({"detail": "This payment is already marked as paid."}, status=status.HTTP_400_BAD_REQUEST)

                payment.status = CashfreeExamPayment.Status.PAID
                payment.payment_method = CashfreeExamPayment.Method.MANUAL
                payment.manual_reference = reference
                payment.manually_accepted_by = request.user
                payment.manually_accepted_at = timezone.now()
                payment.paid_at = payment.manually_accepted_at
                payment.save(update_fields=[
                    "status", "payment_method", "manual_reference", "manually_accepted_by",
                    "manually_accepted_at", "paid_at", "updated_at",
                ])
                _finalize_paid_application(payment.application, request.user)
                ApplicationEvent.objects.create(
                    application=payment.application,
                    event_type="payment_manually_accepted",
                    from_status="unpaid",
                    to_status="paid",
                    note=f"Payment accepted manually by staff. Reference: {reference}",
                    actor=request.user,
                )
                transaction.on_commit(lambda payment_id=payment.pk: _queue_payment_confirmation_email(payment_id))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(StaffCashfreeExamPaymentSerializer(payment).data)


class StaffApplicationDetailView(generics.RetrieveAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffApplicationSerializer
    queryset = ExamApplication.objects.select_related("exam", "exam__session", "student", "student__user", "centre").all()

    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        application = self.get_object()
        serializer = self.get_serializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class StaffAutoAssignCentresView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    def post(self, request):
        try:
            exam_id = int(request.data.get("exam_id"))
        except (TypeError, ValueError):
            return Response({"detail": "Select an exam before assigning centres."}, status=status.HTTP_400_BAD_REQUEST)

        exam = get_object_or_404(Exam, pk=exam_id)
        centres = list(exam.centres.filter(is_active=True).order_by("name"))
        if not centres:
            return Response({"detail": "This exam has no active centres assigned."}, status=status.HTTP_400_BAD_REQUEST)

        assigned = 0
        with transaction.atomic():
            applications = list(
                ExamApplication.objects.select_for_update()
                .filter(exam=exam, status=ExamApplication.Status.APPROVED, centre__isnull=True)
                .order_by("created_at", "id")
            )
            usage = {
                centre.id: ExamApplication.objects.filter(exam=exam, centre=centre).count()
                for centre in centres
            }
            for application in applications:
                available = [
                    centre for centre in centres
                    if not centre.capacity or usage[centre.id] < centre.capacity
                ]
                if not available:
                    break
                centre = min(available, key=lambda item: (usage[item.id], item.name.casefold()))
                application.centre = centre
                application.save(update_fields=["centre", "updated_at"])
                ApplicationEvent.objects.create(
                    application=application,
                    event_type="centre_assigned",
                    note=f"Auto-assigned to {centre.name}",
                    actor=request.user,
                )
                usage[centre.id] += 1
                assigned += 1

            unassigned = ExamApplication.objects.filter(
                exam=exam, status=ExamApplication.Status.APPROVED, centre__isnull=True,
            ).count()

        return Response({"assigned": assigned, "unassigned": unassigned})


class StaffExamResultListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffExamResultSerializer

    def get_queryset(self):
        queryset = ExamResult.objects.select_related("exam", "application").all()
        exam_id = self.request.query_params.get("exam")
        return queryset.filter(exam_id=exam_id) if exam_id else queryset

    def perform_create(self, serializer):
        application = serializer.validated_data["application"]
        existing = ExamResult.objects.filter(application=application).first()
        if existing:
            serializer.instance = existing
            serializer.save(exam=application.exam, roll_number=application.application_number or "")
        else:
            serializer.save(exam=application.exam, roll_number=application.application_number or "")


class StaffExamResultDetailView(generics.RetrieveUpdateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]
    serializer_class = StaffExamResultSerializer
    queryset = ExamResult.objects.select_related("exam", "application").all()


class StaffApplicationTransitionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffUser]

    allowed = {
        ExamApplication.Status.SUBMITTED: {ExamApplication.Status.UNDER_REVIEW, ExamApplication.Status.REJECTED},
        ExamApplication.Status.RESUBMITTED: {ExamApplication.Status.UNDER_REVIEW, ExamApplication.Status.REJECTED},
        ExamApplication.Status.UNDER_REVIEW: {ExamApplication.Status.CORRECTION_REQUIRED, ExamApplication.Status.APPROVED, ExamApplication.Status.REJECTED},
        ExamApplication.Status.CORRECTION_REQUIRED: {ExamApplication.Status.UNDER_REVIEW, ExamApplication.Status.REJECTED},
    }

    def post(self, request, pk):
        application = ExamApplication.objects.get(pk=pk)
        to_status = request.data.get("status")
        if to_status not in self.allowed.get(application.status, set()):
            return Response({"detail": f"Cannot move {application.status} to {to_status}."}, status=status.HTTP_400_BAD_REQUEST)
        note = str(request.data.get("note", ""))
        previous = application.status
        application.status = to_status
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.review_notes = note
        with transaction.atomic():
            application.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_notes", "updated_at"])
            event = ApplicationEvent.objects.create(
                application=application,
                event_type="status_changed",
                from_status=previous,
                to_status=to_status,
                note=note,
                actor=request.user,
            )
            if to_status in {ExamApplication.Status.CORRECTION_REQUIRED, ExamApplication.Status.APPROVED, ExamApplication.Status.REJECTED}:
                transaction.on_commit(lambda event_id=event.pk: _queue_application_status_email(event_id))
        return Response(ApplicationSerializer(application, context={"request": request}).data)


def _queue_application_status_email(event_id):
    import logging
    from .tasks import send_exam_application_status_email

    try:
        send_exam_application_status_email.delay(event_id)
    except Exception as exc:
        ApplicationEvent.objects.filter(pk=event_id).update(notification_email_last_error=str(exc)[:4000])
        logging.getLogger(__name__).exception("Could not queue application status email")
