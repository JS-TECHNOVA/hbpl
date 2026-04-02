from rest_framework import serializers
from .models import (
    Team,
    Match,
    ManagementMember,
    GalleryImage,
    Volunteer,
    TeamRegistration,
    ExamRegistration,
)


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "captain", "description"]


class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            "id", "stage", "match_type", "date", "time", "venue",
            "team1", "team2", "team1_score", "team2_score",
            "result", "player_of_match", "season",
        ]


class ManagementMemberSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ManagementMember
        fields = ["id", "name", "role", "description", "email", "image_key", "image_url", "order"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class GalleryImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = GalleryImage
        fields = ["id", "title", "category", "image_key", "image_url"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class VolunteerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Volunteer
        fields = ["id", "name", "role", "img", "image_url", "order"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class TeamRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamRegistration
        fields = ["team_name", "captain_name", "email", "phone", "player_count", "message"]

    def validate_player_count(self, value):
        if value < 11 or value > 15:
            raise serializers.ValidationError("Squad must have 11–15 players.")
        return value


class ExamRegistrationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamRegistration
        fields = [
            "full_name",
            "roll_number",
            "date_of_birth",
            "phone",
            "email",
            "school_name",
            "class_name",
            "address",
        ]

    def validate_roll_number(self, value):
        normalized = value.strip().upper()
        if ExamRegistration.objects.filter(roll_number__iexact=normalized).exists():
            raise serializers.ValidationError("This roll number has already been submitted.")
        return normalized


class ExamResultLookupSerializer(serializers.Serializer):
    roll_number = serializers.CharField(max_length=50)
    date_of_birth = serializers.DateField()

    def validate_roll_number(self, value):
        return value.strip().upper()


class ExamResultResponseSerializer(serializers.ModelSerializer):
    marks_obtained = serializers.SerializerMethodField()
    total_marks = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()
    remarks = serializers.SerializerMethodField()
    test_copy_url = serializers.SerializerMethodField()
    result_file_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamRegistration
        fields = [
            "full_name",
            "roll_number",
            "date_of_birth",
            "school_name",
            "class_name",
            "result_status",
            "marks_obtained",
            "total_marks",
            "rank",
            "remarks",
            "test_copy_url",
            "result_file_url",
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


class AdminExamRegistrationSerializer(serializers.ModelSerializer):
    """Full serializer for admin use — exposes all fields including files."""

    test_copy_url = serializers.SerializerMethodField()
    result_file_url = serializers.SerializerMethodField()

    class Meta:
        model = ExamRegistration
        fields = [
            "id", "full_name", "roll_number", "date_of_birth",
            "phone", "email", "school_name", "class_name", "address", "notes",
            "result_status", "marks_obtained", "total_marks", "rank", "remarks",
            "test_copy", "result_file", "test_copy_url", "result_file_url",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "roll_number", "created_at", "updated_at", "test_copy_url", "result_file_url"]
        extra_kwargs = {
            "test_copy": {"write_only": True, "required": False, "allow_null": True},
            "result_file": {"write_only": True, "required": False, "allow_null": True},
        }

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


# ── Admin CRUD serializers ────────────────────────────────────────────────────

class AdminVolunteerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Volunteer
        fields = ["id", "name", "role", "img", "image", "image_url", "order"]
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
        fields = ["id", "title", "category", "image_key", "image", "image_url"]
        extra_kwargs = {"image": {"required": False, "allow_null": True}}

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class AdminManagementMemberSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ManagementMember
        fields = ["id", "name", "role", "description", "email", "image_key", "image", "image_url", "order"]
        extra_kwargs = {"image": {"required": False, "allow_null": True}}

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class AdminTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "captain", "description"]


class AdminMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            "id", "stage", "match_type", "date", "time", "venue",
            "team1", "team2", "team1_score", "team2_score",
            "result", "player_of_match", "season",
        ]
