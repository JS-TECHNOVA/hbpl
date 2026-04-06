from rest_framework import serializers
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
            "date_of_birth",
            "phone",
            "email",
            "school_name",
            "class_name",
            "address",
            "student_image",
            "signature_image",
        ]


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
        return self._build_file_url(obj.admit_card_file)

    def get_participation_certificate_url(self, obj):
        if not obj.publish_participation_certificate:
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
            "id", "full_name", "roll_number", "date_of_birth",
            "phone", "email", "school_name", "class_name", "address", "notes",
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
