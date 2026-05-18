from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget, DecimalWidget, BooleanWidget
from import_export.results import RowResult
from api.models import ExamRegistration, ExamCenterDetail
from .models import (
    ExamCategory, Exam, ExamTimeline, ExamResult, ScoreBreakdown,
    ResultPublication, RankHolder, AdmitCard, Certificate,
)

# ---------------------------------------------------------------------------
# Column alias maps — allow third-party / hand-crafted spreadsheets to import
# without requiring exact Django field names as headers.
# ---------------------------------------------------------------------------

_EXAM_MAP = {
    "exam name": "name",
    "exam title": "name",
    "short name": "short_name",
    "year": "academic_year",
    "academic year": "academic_year",
    "exam status": "status",
    "exam date": "exam_date",
    "result date": "result_date",
    "reg start": "registration_start",
    "registration start": "registration_start",
    "reg end": "registration_end",
    "registration end": "registration_end",
    "exam fee": "fee",
    "category": "category__slug",
}

_RESULT_MAP = {
    # Registration lookup aliases
    "student name": "full_name",
    "reg no": "registration__roll_number",
    "registration number": "registration__roll_number",
    "roll no": "roll_number",
    "roll number": "roll_number",
    # Score aliases
    "total": "total_marks",
    "total marks": "total_marks",
    "marks": "obtained_marks",
    "obtained marks": "obtained_marks",
    "marks obtained": "obtained_marks",
    "%": "percentage",
    "percentage": "percentage",
    "rank": "rank",
    "position": "rank",
    "grade": "grade",
    "pass": "is_pass",
    "passed": "is_pass",
    "result": "is_pass",
    "copy status": "copy_status",
    "answer copy": "copy_status",
}

_REGISTRATION_MAP = {
    "student name": "full_name",
    "name": "full_name",
    "father name": "father_name",
    "mother name": "mother_name",
    "dob": "date_of_birth",
    "date of birth": "date_of_birth",
    "school": "school_name",
    "school name": "school_name",
    "class": "class_name",
    "std": "class_name",
    "standard": "class_name",
    "mobile": "phone",
    "mobile number": "phone",
    "contact": "phone",
    "email id": "email",
    "roll no": "roll_number",
    "roll number": "roll_number",
}

_ADMIT_CARD_MAP = {
    "roll no": "roll_number",
    "roll number": "roll_number",
    "hall ticket": "hall_ticket_number",
    "hall ticket no": "hall_ticket_number",
    "center": "exam_center__center_name",
    "exam date": "exam_date",
    "reporting time": "reporting_time",
}

_RANK_HOLDER_MAP = {
    "rank": "rank",
    "position": "rank",
    "reg no": "registration__roll_number",
    "registration number": "registration__roll_number",
    "roll no": "registration__roll_number",
    "achievement": "achievement",
    "featured": "is_featured",
}


def _remap(row, alias_map):
    """Normalise incoming row keys using alias_map."""
    return {alias_map.get(k.lower().strip(), k): v for k, v in row.items()}


# ---------------------------------------------------------------------------
# ExamCategory
# ---------------------------------------------------------------------------

class ExamCategoryResource(resources.ModelResource):
    class Meta:
        model = ExamCategory
        fields = ("id", "name", "slug", "description", "is_active", "sort_order")
        import_id_fields = ("slug",)


# ---------------------------------------------------------------------------
# Exam
# ---------------------------------------------------------------------------

class ExamResource(resources.ModelResource):
    category = fields.Field(
        column_name="category",
        attribute="category",
        widget=ForeignKeyWidget(ExamCategory, field="slug"),
    )

    class Meta:
        model = Exam
        fields = (
            "id", "name", "short_name", "slug", "academic_year", "status",
            "category", "fee", "exam_date", "result_date",
            "registration_start", "registration_end", "max_registrations",
        )
        export_order = (
            "id", "name", "short_name", "academic_year", "status", "category",
            "fee", "exam_date", "result_date", "registration_start", "registration_end",
        )
        import_id_fields = ("slug",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _EXAM_MAP))


# ---------------------------------------------------------------------------
# ExamResult  (most critical — bulk result upload with mapping)
# ---------------------------------------------------------------------------

class ExamResultResource(resources.ModelResource):
    # Accept reg number to look up the FK rather than requiring PK
    registration = fields.Field(
        column_name="reg_number",
        attribute="registration",
        widget=ForeignKeyWidget(ExamRegistration, field="roll_number"),
    )
    exam = fields.Field(
        column_name="exam_slug",
        attribute="exam",
        widget=ForeignKeyWidget(Exam, field="slug"),
    )

    class Meta:
        model = ExamResult
        fields = (
            "id", "exam", "registration", "roll_number",
            "total_marks", "obtained_marks", "percentage",
            "rank", "grade", "is_pass", "copy_status", "remarks",
        )
        export_order = (
            "id", "exam", "registration", "roll_number",
            "total_marks", "obtained_marks", "percentage",
            "rank", "grade", "is_pass", "copy_status",
        )
        import_id_fields = ("exam", "registration")

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _RESULT_MAP))

    def after_import_row(self, row, row_result, row_number=None, **kwargs):
        """Auto-compute percentage if not provided but marks are available."""
        if row_result.import_type == RowResult.IMPORT_TYPE_SKIP:
            return
        try:
            obj = row_result.instance
            if obj.total_marks and obj.obtained_marks and not obj.percentage:
                obj.percentage = round((obj.obtained_marks / obj.total_marks) * 100, 2)
                obj.save(update_fields=["percentage"])
        except Exception:
            pass


# ---------------------------------------------------------------------------
# ExamRegistration  (from api.models — import only the fields we can bulk-set)
# ---------------------------------------------------------------------------

class ExamRegistrationResource(resources.ModelResource):
    class Meta:
        model = ExamRegistration
        # Expose only editable / bulk-updatable fields; exclude auto-generated ones
        exclude = ("id",)
        import_id_fields = ("roll_number",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _REGISTRATION_MAP))

    def get_export_fields(self):
        """Reduce export to the most useful columns for admin review."""
        keep = {
            "roll_number", "full_name", "father_name", "class_name",
            "school_name", "phone", "email",
            "result_status", "created_at",
        }
        return [f for f in super().get_export_fields() if f.attribute in keep]


# ---------------------------------------------------------------------------
# AdmitCard
# ---------------------------------------------------------------------------

class AdmitCardResource(resources.ModelResource):
    registration = fields.Field(
        column_name="reg_number",
        attribute="registration",
        widget=ForeignKeyWidget(ExamRegistration, field="roll_number"),
    )
    exam = fields.Field(
        column_name="exam_slug",
        attribute="exam",
        widget=ForeignKeyWidget(Exam, field="slug"),
    )
    exam_center = fields.Field(
        column_name="center_code",
        attribute="exam_center",
        widget=ForeignKeyWidget(ExamCenterDetail, field="center_name"),
    )

    class Meta:
        model = AdmitCard
        fields = (
            "id", "exam", "registration", "roll_number", "hall_ticket_number",
            "exam_center", "exam_date", "reporting_time", "status",
        )
        import_id_fields = ("roll_number",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _ADMIT_CARD_MAP))


# ---------------------------------------------------------------------------
# RankHolder
# ---------------------------------------------------------------------------

class RankHolderResource(resources.ModelResource):
    exam = fields.Field(
        column_name="exam_slug",
        attribute="exam",
        widget=ForeignKeyWidget(Exam, field="slug"),
    )
    registration = fields.Field(
        column_name="reg_number",
        attribute="registration",
        widget=ForeignKeyWidget(ExamRegistration, field="roll_number"),
    )

    class Meta:
        model = RankHolder
        fields = ("id", "exam", "registration", "rank", "achievement", "is_featured")
        import_id_fields = ("exam", "rank")

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _RANK_HOLDER_MAP))


# ---------------------------------------------------------------------------
# ExamTimeline
# ---------------------------------------------------------------------------

class ExamTimelineResource(resources.ModelResource):
    exam = fields.Field(
        column_name="exam_slug",
        attribute="exam",
        widget=ForeignKeyWidget(Exam, field="slug"),
    )

    class Meta:
        model = ExamTimeline
        fields = ("id", "exam", "event_name", "event_date", "is_tentative", "sort_order")
        import_id_fields = ("exam", "event_name")


# ---------------------------------------------------------------------------
# Certificate
# ---------------------------------------------------------------------------

class CertificateResource(resources.ModelResource):
    registration = fields.Field(
        column_name="reg_number",
        attribute="registration",
        widget=ForeignKeyWidget(ExamRegistration, field="roll_number"),
    )
    exam = fields.Field(
        column_name="exam_slug",
        attribute="exam",
        widget=ForeignKeyWidget(Exam, field="slug"),
    )

    class Meta:
        model = Certificate
        fields = ("id", "exam", "registration", "certificate_type",
                  "certificate_number", "issued_at", "is_valid")
        export_order = ("id", "certificate_number", "exam", "registration",
                        "certificate_type", "is_valid", "issued_at")
        import_id_fields = ("certificate_number",)
