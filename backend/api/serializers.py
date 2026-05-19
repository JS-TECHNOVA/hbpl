import hashlib
import hmac
import os

from django.core import signing
from django.urls import reverse
from rest_framework import serializers
from .models import Complaint
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
)

class ComplaintCreateSerializer(serializers.ModelSerializer):
    """Used for public complaint submission — registration resolved server-side from roll_number."""
    class Meta:
        model = Complaint
        fields = ["id", "name", "roll_number", "screenshot", "message", "created_at"]
        read_only_fields = ["id", "created_at"]


class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ["id", "registration", "name", "roll_number", "screenshot", "message", "created_at"]
        read_only_fields = ["id", "created_at"]


class AdminComplaintSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='registration.full_name', read_only=True)
    school_name = serializers.CharField(source='registration.school_name', read_only=True)
    class_name = serializers.CharField(source='registration.class_name', read_only=True)
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            "id", "registration", "name", "roll_number",
            "student_name", "school_name", "class_name",
            "screenshot", "screenshot_url", "message",
            "status", "admin_note", "created_at",
        ]
        read_only_fields = [
            "id", "registration", "name", "roll_number",
            "student_name", "school_name", "class_name",
            "screenshot", "message", "created_at",
        ]

    def get_screenshot_url(self, obj):
        if obj.screenshot:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.screenshot.url)
        return None
        
class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamRegistration
        fields = ["id", "team_name", "captain_name", "address", "team_image"]


class MatchSerializer(serializers.ModelSerializer):
    team1_logo_url = serializers.SerializerMethodField()
    team2_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id", "stage", "match_type", "date", "time", "venue",
            "team1", "team2", "team1_score", "team2_score",
            "result", "player_of_match", "season",
            "team1_logo_url", "team2_logo_url",
        ]

    def _logo_url(self, obj_logo, request):
        if not obj_logo:
            return None
        return request.build_absolute_uri(obj_logo.url) if request else obj_logo.url

    def get_team1_logo_url(self, obj):
        request = self.context.get("request")
        if obj.team1_obj and obj.team1_obj.logo:
            return self._logo_url(obj.team1_obj.logo, request)
        if obj.team1_registration and obj.team1_registration.team_image:
            return self._logo_url(obj.team1_registration.team_image, request)
        return None

    def get_team2_logo_url(self, obj):
        request = self.context.get("request")
        if obj.team2_obj and obj.team2_obj.logo:
            return self._logo_url(obj.team2_obj.logo, request)
        if obj.team2_registration and obj.team2_registration.team_image:
            return self._logo_url(obj.team2_registration.team_image, request)
        return None


class ManagementMemberSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ManagementMember
        fields = ["id", "name", "role", "description", "email", "image_url", "order"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class GalleryImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryImage
        fields = ["id", "title", "category", "image_url"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class VolunteerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Volunteer
        fields = ["id", "name", "role", "description", "img", "image_url", "order"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class TeamRegistrationPaymentOrderSerializer(serializers.Serializer):
    team_name = serializers.CharField(max_length=50)
    captain_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=15)
    whatsapp_number = serializers.CharField(max_length=15)
    player_count = serializers.IntegerField()
    address = serializers.CharField(max_length=150)

    def validate_phone(self, value):
        digits = value.strip()
        if len(digits) < 10:
            raise serializers.ValidationError("Enter a valid mobile number.")
        return digits

    def validate_whatsapp_number(self, value):
        digits = value.strip()
        if len(digits) < 10:
            raise serializers.ValidationError("Enter a valid WhatsApp number.")
        return digits

    def validate_player_count(self, value):
        if value < 11 or value > 25:
            raise serializers.ValidationError("Squad must have 11-25 players.")
        return value


class TeamRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamRegistration
        fields = [
            "id",
            "team_name",
            "captain_name",
            "email",
            "phone",
            "whatsapp_number",
            "player_count",
            "address",
            "message",
            "team_list",
            "team_image",
            "payment_screenshot",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "email": {"required": False, "allow_blank": True},
            "whatsapp_number": {"required": False, "allow_blank": True},
            "address": {"required": False, "allow_blank": True},
            "message": {"required": False, "allow_blank": True},
            "team_list": {"required": True, "allow_null": False},
            "payment_screenshot": {"required": True, "allow_null": False},
        }

    def validate_player_count(self, value):
        if value < 11 or value > 25:
            raise serializers.ValidationError("Squad must have 11-25 players.")
        return value


class ExamRegistrationCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamRegistration
        fields = [
            "full_name",
            "father_name",
            "mother_name",
            "date_of_birth",
            "phone",
            "email",
            "school_name",
            "class_name",
            "address",
            "student_image",
            "signature_image",
            "roll_number",
        ]


class ExamResultLookupSerializer(serializers.Serializer):
    roll_number = serializers.CharField(max_length=50)
    date_of_birth = serializers.DateField()

    def validate_roll_number(self, value):
        return value.strip().upper()


class ExamResultResponseSerializer(serializers.ModelSerializer):
    publish_admit_card = serializers.BooleanField(read_only=True)
    marks_obtained = serializers.SerializerMethodField()
    total_marks = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    remarks = serializers.SerializerMethodField()
    test_copy_url = serializers.SerializerMethodField()
    result_file_url = serializers.SerializerMethodField()
    admit_card_url = serializers.SerializerMethodField()
    participation_certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamRegistration
        fields = [
            "full_name",
            "roll_number",
            "date_of_birth",
            "school_name",
            "class_name",
            "result_status",
            "publish_admit_card",
            "marks_obtained",
            "total_marks",
            "rank",
            "remarks",
            "test_copy_url",
            "result_file_url",
            "admit_card_url",
            "participation_certificate_url",
        ]

    def _build_file_url(self, file_field):
        if not file_field:
            return None

        request = self.context.get("request")
        url = file_field.url
        return request.build_absolute_uri(url) if request is not None else url

    def _is_published(self, obj):
        return obj.result_status == ExamRegistration.ResultStatus.PUBLISHED

    def get_marks_obtained(self, obj):
        return obj.marks_obtained if self._is_published(obj) else None

    def get_total_marks(self, obj):
        return obj.total_marks if self._is_published(obj) else None

    def get_rank(self, obj):
        return obj.rank if self._is_published(obj) else None

    def get_remarks(self, obj):
        return obj.remarks if self._is_published(obj) else ""

    def get_test_copy_url(self, obj):
        if not self._is_published(obj):
            return None
        return self._build_file_url(obj.test_copy)

    def get_result_file_url(self, obj):
        if not self._is_published(obj):
            return None
        return self._build_file_url(obj.result_file)

    def get_admit_card_url(self, obj):
        if not obj.publish_admit_card:
            return None
        # Public UI now downloads admit card on-demand via dedicated endpoint.
        # Keep this key non-null for backward compatibility with existing clients.
        return "available"

    def get_participation_certificate_url(self, obj):
        if not self._is_published(obj):
            return None
        if not obj.participation_certificate_file:
            return None
        return self._build_file_url(obj.participation_certificate_file)


class AdminExamRegistrationSerializer(serializers.ModelSerializer):
    """Full serializer for admin use — exposes all fields including files."""

    test_copy_url = serializers.SerializerMethodField()
    result_file_url = serializers.SerializerMethodField()
    student_image_url = serializers.SerializerMethodField()
    signature_image_url = serializers.SerializerMethodField()
    admit_card_url = serializers.SerializerMethodField()
    participation_certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamRegistration
        fields = [
            "id", "full_name", "father_name", "mother_name", "roll_number", "date_of_birth",
            "phone", "email", "school_name", "class_name", "examination_center", "center_address", "address", "notes",
            "student_image", "signature_image", "student_image_url", "signature_image_url",
            "result_status", "marks_obtained", "total_marks", "rank", "remarks",
            "test_copy", "result_file", "admit_card_file", "participation_certificate_file",
            "publish_admit_card", "publish_participation_certificate",
            "test_copy_url", "result_file_url", "admit_card_url", "participation_certificate_url",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at",
            "student_image_url", "signature_image_url", "test_copy_url", "result_file_url",
            "admit_card_url", "participation_certificate_url",
        ]
        extra_kwargs = {
            "student_image": {"write_only": True, "required": False, "allow_null": True},
            "signature_image": {"write_only": True, "required": False, "allow_null": True},
            "test_copy": {"write_only": True, "required": False, "allow_null": True},
            "result_file": {"write_only": True, "required": False, "allow_null": True},
            "admit_card_file": {"write_only": True, "required": False, "allow_null": True},
            "participation_certificate_file": {"write_only": True, "required": False, "allow_null": True},
        }

    def _build_url(self, obj, field_name):
        file_field = getattr(obj, field_name)
        if not file_field:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file_field.url) if request else file_field.url

    def get_student_image_url(self, obj):
        return self._build_url(obj, "student_image")

    def get_signature_image_url(self, obj):
        return self._build_url(obj, "signature_image")

    def get_test_copy_url(self, obj):
        if not obj.test_copy:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.test_copy.url) if request else obj.test_copy.url

    def get_result_file_url(self, obj):
        if not obj.result_file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.result_file.url) if request else obj.result_file.url

    def get_admit_card_url(self, obj):
        return self._build_url(obj, "admit_card_file")

    def get_participation_certificate_url(self, obj):
        return self._build_url(obj, "participation_certificate_file")


class ExamImportantDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamImportantDate
        fields = ["id", "title", "date", "order"]


class ExamSupportSchoolSerializer(serializers.ModelSerializer):
    principal_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamSupportSchool
        fields = [
            "id", "name", "address", "principal_name", "contact_info",
            "principal_image_url", "order",
        ]

    def get_principal_image_url(self, obj):
        if not obj.principal_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.principal_image.url) if request else obj.principal_image.url


class ExamSyllabusItemSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamSyllabusItem
        fields = ["id", "class_name", "title", "description", "pdf_url", "order"]

    def get_pdf_url(self, obj):
        if not obj.pdf_file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.pdf_file.url) if request else obj.pdf_file.url


class ExamSamplePaperSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamSamplePaper
        fields = ["id", "class_name", "title", "description", "external_url", "file_url", "order"]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class ExamCenterDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamCenterDetail
        fields = ["id", "center_name", "form_range", "roll_range", "extra_details", "order"]


class ExamFaqSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamFaq
        fields = ["id", "question", "answer", "order"]


class ExamTopperSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    school_name = serializers.CharField(source="student.school_name", read_only=True)
    class_name = serializers.CharField(source="student.class_name", read_only=True)
    marks_obtained = serializers.DecimalField(source="student.marks_obtained", max_digits=5, decimal_places=2, read_only=True)
    student_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExamTopper
        fields = [
            "id", "student", "student_name", "school_name", "class_name",
            "marks_obtained", "rank", "highlight_text", "student_image_url", "order",
        ]

    def get_student_image_url(self, obj):
        if not obj.student.student_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.student.student_image.url) if request else obj.student.student_image.url


class AdminExamImportantDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamImportantDate
        fields = ["id", "title", "date", "order"]


class AdminExamSupportSchoolSerializer(serializers.ModelSerializer):
    principal_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExamSupportSchool
        fields = [
            "id", "name", "address", "principal_name", "contact_info",
            "principal_image", "principal_image_url", "order",
        ]
        extra_kwargs = {"principal_image": {"required": False, "allow_null": True}}

    def get_principal_image_url(self, obj):
        if not obj.principal_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.principal_image.url) if request else obj.principal_image.url


class AdminExamSyllabusItemSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExamSyllabusItem
        fields = ["id", "class_name", "title", "description", "pdf_file", "pdf_url", "order"]
        extra_kwargs = {"pdf_file": {"required": False, "allow_null": True}}

    def get_pdf_url(self, obj):
        if not obj.pdf_file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.pdf_file.url) if request else obj.pdf_file.url


class AdminExamSamplePaperSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExamSamplePaper
        fields = ["id", "class_name", "title", "description", "external_url", "file", "file_url", "order"]
        extra_kwargs = {"file": {"required": False, "allow_null": True}}

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class AdminExamCenterDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamCenterDetail
        fields = ["id", "center_name", "form_range", "roll_range", "extra_details", "order"]


class AdminExamFaqSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamFaq
        fields = ["id", "question", "answer", "order"]


class AdminExamTopperSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = ExamTopper
        fields = ["id", "student", "student_name", "rank", "highlight_text", "order"]


# ── Admin CRUD serializers ────────────────────────────────────────────────────

class AdminVolunteerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Volunteer
        fields = ["id", "name", "role", "description", "img", "image", "image_url", "order"]
        extra_kwargs = {"image": {"required": False, "allow_null": True}}

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class AdminGalleryImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GalleryImage
        fields = ["id", "title", "category", "image", "image_url"]
        extra_kwargs = {
            "image": {"required": False, "allow_null": True},

        }

    def validate(self, attrs):
        image = attrs.get("image")

        if self.instance is not None:
            image = image if image is not None else self.instance.image

        return attrs

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class AdminManagementMemberSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ManagementMember
        fields = ["id", "name", "role", "description", "email", "image", "image_url", "order"]
        extra_kwargs = {"image": {"required": False, "allow_null": True}}

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class AdminTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamRegistration
        fields = '__all__'


class AdminTeamRegistrationSerializer(serializers.ModelSerializer):
    team_list_url = serializers.SerializerMethodField(read_only=True)
    receipt_download_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TeamRegistration
        fields = [
            "id",
            "team_name",
            "captain_name",
            "phone",
            "whatsapp_number",
            "player_count",
            "address",
            "payment_id",
            "payment_order_id",
            "payment_amount_paise",
            "payment_currency",
            "team_list_url",
            "receipt_download_url",
            "created_at",
        ]

    def get_team_list_url(self, obj):
        if not obj.team_list:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.team_list.url) if request else obj.team_list.url

    def get_receipt_download_url(self, obj):
        if not obj.payment_id:
            return None
        token = signing.dumps(
            {
                "registration_id": obj.pk,
                "payment_id": obj.payment_id,
            },
            salt="team-registration-receipt",
        )
        path = f"{reverse('register-receipt-download', args=[obj.pk])}?token={token}"
        request = self.context.get("request")
        return request.build_absolute_uri(path) if request else path


class AdminMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            "id", "stage", "match_type", "date", "time", "venue",
            "team1", "team2", "team1_score", "team2_score",
            "result", "player_of_match", "season",
            "tournament", "match_status", "youtube_stream_url",
            "team1_obj", "team2_obj",
            "toss_winner", "toss_decision",
        ]


class NewsTickerSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsTicker
        fields = ["id", "text", "link", "is_active", "order"]


class AdminNewsTickerSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsTicker
        fields = ["id", "text", "link", "is_active", "order"]


# ─────────────────────────────────────────────────────────────────────────────
# CRICKET PHASE 2+ SERIALIZERS
# ─────────────────────────────────────────────────────────────────────────────

class PlayerSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = [
            "id", "name", "role", "batting_style", "bowling_style",
            "jersey_number", "is_captain", "is_vice_captain", "is_substitute",
            "photo_url",
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url


class PlayerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            "id", "team", "name", "role", "batting_style", "bowling_style",
            "jersey_number", "is_captain", "is_vice_captain", "is_substitute", "phone",
            "date_of_birth", "photo",
        ]
        extra_kwargs = {
            "photo": {"required": False, "allow_null": True},
            "phone": {"required": False, "allow_blank": True},
            "date_of_birth": {"required": False, "allow_null": True},
            "jersey_number": {"required": False, "allow_null": True},
        }


class TeamWithPlayersSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    team_image_url = serializers.SerializerMethodField()

    class Meta:
        model = TeamRegistration
        fields = [
            "id", "team_name", "captain_name", "address",
            "team_image_url", "player_count", "players",
        ]

    def get_team_image_url(self, obj):
        if not obj.team_image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.team_image.url) if request else obj.team_image.url


class TournamentListSerializer(serializers.ModelSerializer):
    banner_url = serializers.SerializerMethodField()
    approved_team_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "season", "format", "max_teams", "status",
            "description", "start_date", "end_date", "registration_deadline",
            "registration_fee_paise", "banner_url", "approved_team_count",
        ]

    def get_banner_url(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.banner.url) if request else obj.banner.url


class TournamentDetailSerializer(TournamentListSerializer):
    teams = serializers.SerializerMethodField()

    class Meta(TournamentListSerializer.Meta):
        fields = TournamentListSerializer.Meta.fields + ["rules", "teams"]

    def get_teams(self, obj):
        approved = obj.team_registrations.filter(status="approved").select_related("team")
        return [
            {
                "id": tr.team.id,
                "team_name": tr.team.team_name,
                "captain_name": tr.team.captain_name,
                "team_image_url": (
                    self.context.get("request").build_absolute_uri(tr.team.team_image.url)
                    if tr.team.team_image and self.context.get("request")
                    else None
                ),
            }
            for tr in approved
        ]


class TournamentTeamSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.team_name", read_only=True)
    captain_name = serializers.CharField(source="team.captain_name", read_only=True)

    class Meta:
        model = TournamentTeam
        fields = [
            "id", "tournament", "team", "team_name", "captain_name",
            "status", "applied_at", "payment_id",
        ]
        read_only_fields = ["id", "applied_at", "status"]


class TournamentRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentTeam
        fields = ["tournament", "team"]

    def validate(self, attrs):
        tournament = attrs["tournament"]
        team = attrs["team"]
        if not tournament.registration_open:
            raise serializers.ValidationError("Tournament registration is not open.")
        if tournament.approved_team_count >= tournament.max_teams:
            raise serializers.ValidationError("Tournament is full.")
        if TournamentTeam.objects.filter(tournament=tournament, team=team).exists():
            raise serializers.ValidationError("This team is already registered for this tournament.")
        return attrs


# ── Live Scoring Serializers ──────────────────────────────────────────────────

class BatsmanScoreSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="batsman.name", read_only=True)
    role = serializers.CharField(source="batsman.role", read_only=True)
    is_captain = serializers.BooleanField(source="batsman.is_captain", read_only=True)
    is_wicketkeeper = serializers.SerializerMethodField()
    strike_rate = serializers.FloatField(read_only=True)
    bowler_name = serializers.CharField(source="bowler.name", read_only=True, default=None)
    fielder_name = serializers.CharField(source="fielder.name", read_only=True, default=None)
    dismissal_text = serializers.SerializerMethodField()

    class Meta:
        model = BatsmanScore
        fields = [
            "id", "batsman", "name", "role", "is_captain", "is_wicketkeeper",
            "batting_position", "runs", "balls_faced",
            "fours", "sixes", "strike_rate", "is_out", "dismissal_type",
            "bowler_name", "fielder_name", "dismissal_text",
            "fall_of_wicket_score", "fall_of_wicket_over",
            "is_batting", "did_not_bat",
        ]

    def get_is_wicketkeeper(self, obj):
        return obj.batsman.role == "wicketkeeper"

    def get_dismissal_text(self, obj):
        if not obj.is_out:
            return "not out"
        dt = obj.dismissal_type
        bowler = obj.bowler.name if obj.bowler else ""
        fielder = obj.fielder.name if obj.fielder else ""
        if dt == "bowled":
            return f"b {bowler}"
        if dt == "caught":
            return f"c {fielder} b {bowler}" if fielder else f"c&b {bowler}"
        if dt == "lbw":
            return f"lbw b {bowler}"
        if dt == "run_out":
            return f"run out ({fielder})" if fielder else "run out"
        if dt == "stumped":
            return f"st {fielder} b {bowler}" if fielder else f"st b {bowler}"
        if dt == "hit_wicket":
            return f"hit wicket b {bowler}"
        return dt


class BowlerScoreSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="bowler.name", read_only=True)
    economy = serializers.FloatField(read_only=True)

    class Meta:
        model = BowlerScore
        fields = [
            "id", "bowler", "name", "overs", "maidens", "runs",
            "wickets", "wides", "no_balls", "economy",
        ]


class BallSerializer(serializers.ModelSerializer):
    batsman_name = serializers.CharField(source="batsman.name", read_only=True)
    bowler_name = serializers.CharField(source="bowler.name", read_only=True)

    class Meta:
        model = Ball
        fields = [
            "id", "ball_number", "batsman", "batsman_name", "bowler", "bowler_name",
            "runs_off_bat", "is_extra", "extra_type", "extra_runs",
            "is_wicket", "wicket_type", "is_boundary", "is_six",
            "commentary", "timestamp",
        ]


class OverSerializer(serializers.ModelSerializer):
    bowler_name = serializers.CharField(source="bowler.name", read_only=True, default="")
    balls = BallSerializer(many=True, read_only=True)

    class Meta:
        model = Over
        fields = [
            "id", "over_number", "bowler", "bowler_name",
            "runs", "wickets", "extras", "is_completed", "balls",
        ]


class InningsSerializer(serializers.ModelSerializer):
    batsman_scores = BatsmanScoreSerializer(many=True, read_only=True)
    bowler_scores = BowlerScoreSerializer(many=True, read_only=True)
    overs = OverSerializer(many=True, read_only=True)
    run_rate = serializers.FloatField(read_only=True)
    required_run_rate = serializers.FloatField(read_only=True, default=None)

    class Meta:
        model = Innings
        fields = [
            "id", "innings_number", "batting_team_name", "bowling_team_name",
            "total_runs", "wickets", "overs_completed", "extras",
            "is_completed", "target", "run_rate", "required_run_rate",
            "batsman_scores", "bowler_scores", "overs",
        ]


class LiveMatchSerializer(serializers.ModelSerializer):
    innings = InningsSerializer(many=True, read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "stage", "match_type", "date", "time", "venue",
            "team1", "team2", "season", "match_status",
            "toss_winner", "toss_decision",
            "team1_score", "team2_score", "result",
            "youtube_stream_url",
            "innings",
        ]


# ── Admin Cricket Serializers ─────────────────────────────────────────────────

class AdminTournamentSerializer(serializers.ModelSerializer):
    banner_url = serializers.SerializerMethodField(read_only=True)
    approved_team_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "season", "format", "max_teams", "status",
            "description", "rules", "start_date", "end_date",
            "registration_deadline", "registration_fee_paise",
            "banner", "banner_url", "approved_team_count", "created_at",
        ]
        extra_kwargs = {"banner": {"required": False, "allow_null": True}}

    def get_banner_url(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.banner.url) if request else obj.banner.url


class AdminTournamentTeamSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.team_name", read_only=True)
    captain_name = serializers.CharField(source="team.captain_name", read_only=True)
    phone = serializers.CharField(source="team.phone", read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = TournamentTeam
        fields = [
            "id", "tournament", "tournament_name", "team", "team_name",
            "captain_name", "phone", "status", "applied_at", "approved_at",
            "payment_id", "payment_amount_paise", "admin_note",
        ]
        read_only_fields = ["id", "applied_at", "team_name", "captain_name", "phone", "tournament_name"]


class AdminPlayerSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.team_name", read_only=True)
    photo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Player
        fields = [
            "id", "team", "team_name", "name", "role",
            "batting_style", "bowling_style", "jersey_number",
            "is_captain", "is_substitute", "phone", "date_of_birth",
            "photo", "photo_url",
        ]
        extra_kwargs = {
            "photo": {"required": False, "allow_null": True},
            "phone": {"required": False, "allow_blank": True},
            "date_of_birth": {"required": False, "allow_null": True},
            "jersey_number": {"required": False, "allow_null": True},
        }

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url


class AdminInningsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Innings
        fields = [
            "id", "match", "innings_number", "batting_team_name",
            "bowling_team_name", "batting_team", "bowling_team",
            "total_runs", "wickets", "overs_completed", "extras",
            "is_completed", "target",
        ]


class AdminBallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ball
        fields = [
            "id", "over", "ball_number", "batsman", "non_striker", "bowler",
            "runs_off_bat", "is_extra", "extra_type", "extra_runs",
            "is_wicket", "wicket_type", "fielder", "is_boundary", "is_six",
            "commentary",
        ]
        read_only_fields = ["id"]


# ── CricketTeam Serializers ───────────────────────────────────────────────────

class CricketTeamPlayerSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = [
            "id", "name", "role", "batting_style", "bowling_style",
            "jersey_number", "is_captain", "date_of_birth", "photo_url",
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url


class CricketTeamSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = CricketTeam
        fields = [
            "id", "name", "short_name", "city", "captain_name",
            "logo_url", "primary_color", "description", "is_active",
            "registration", "player_count", "created_at",
        ]

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    def get_player_count(self, obj):
        return obj.players.count()


class CricketTeamDetailSerializer(CricketTeamSerializer):
    players = CricketTeamPlayerSerializer(many=True, read_only=True)

    class Meta(CricketTeamSerializer.Meta):
        fields = CricketTeamSerializer.Meta.fields + ["players"]


# ── MatchPlayerStats Serializer ───────────────────────────────────────────────

class MatchPlayerStatsSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source="player.name", read_only=True)
    player_role = serializers.CharField(source="player.role", read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True, default="")
    strike_rate = serializers.FloatField(read_only=True)
    economy = serializers.FloatField(read_only=True)

    class Meta:
        model = MatchPlayerStats
        fields = [
            "id", "match", "player", "player_name", "player_role", "team", "team_name",
            # batting
            "runs", "balls_faced", "fours", "sixes", "is_out", "dismissal_type",
            "did_not_bat", "strike_rate",
            # bowling
            "overs_bowled", "runs_conceded", "wickets", "maidens",
            "wides", "no_balls", "economy",
            # fielding
            "catches", "run_outs", "stumpings",
        ]


# ── Event Serializer ──────────────────────────────────────────────────────────

from .models import Event as EventModel  # noqa: E402


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventModel
        fields = [
            "id", "title", "description", "date", "location",
            "category", "is_published", "created_at",
        ]
