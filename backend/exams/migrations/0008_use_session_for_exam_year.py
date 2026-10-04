import json

from django.db import migrations
from django.utils.text import slugify


def keep_existing_session_and_school_data(apps, schema_editor):
    Exam = apps.get_model("exams", "Exam")
    Session = apps.get_model("exams", "ExaminationSession")
    Profile = apps.get_model("exams", "StudentProfile")
    alias = schema_editor.connection.alias

    for exam in Exam.objects.using(alias).filter(session__isnull=True).exclude(academic_year=""):
        label = exam.academic_year.strip()
        session = Session.objects.using(alias).filter(academic_year=label).first()
        if not session:
            base = slugify(label)[:60] or f"legacy-{exam.pk}"
            code = base
            suffix = 1
            while Session.objects.using(alias).filter(code=code).exists():
                suffix += 1
                code = f"{base[:54]}-{suffix}"
            session = Session.objects.using(alias).create(
                code=code,
                name=label,
                is_active=True,
                is_published=exam.is_published,
            )
        exam.session_id = session.pk
        exam.save(using=alias, update_fields=["session"])

    for exam in Exam.objects.using(alias).all().iterator():
        legacy_sections = [
            ("Eligibility", exam.eligibility),
            ("Instructions", exam.instructions),
            ("Syllabus", exam.syllabus),
            ("Important information", exam.important_information),
        ]
        if not any(value.strip() for _, value in legacy_sections):
            continue

        description = (exam.description or "").strip()
        try:
            parsed = json.loads(description) if description else {"blocks": []}
        except (TypeError, ValueError):
            parsed = {"blocks": [{"type": "paragraph", "data": {"text": description}}]} if description else {"blocks": []}
        if isinstance(parsed, list):
            document = {"blocks": parsed}
        elif isinstance(parsed, dict) and isinstance(parsed.get("blocks"), list):
            document = parsed
        else:
            document = {"blocks": [{"type": "paragraph", "data": {"text": description}}] if description else []}
        blocks = document["blocks"]
        existing_text = json.dumps(blocks, ensure_ascii=False).casefold()
        for title, body in legacy_sections:
            if body.strip() and body.strip().casefold() not in existing_text:
                blocks.extend([
                    {"type": "header", "data": {"text": title, "level": 2}},
                    {"type": "paragraph", "data": {"text": body}},
                ])
        document.setdefault("time", 0)
        document.setdefault("version", "2.31.0")
        exam.description = json.dumps(document, ensure_ascii=False)
        exam.save(using=alias, update_fields=["description"])

    for profile in Profile.objects.using(alias).filter(school__isnull=False, school_name="").select_related("school"):
        profile.school_name = profile.school.name
        profile.save(using=alias, update_fields=["school_name"])


class Migration(migrations.Migration):
    dependencies = [("exams", "0007_examapplication_admit_card_file_and_more")]

    operations = [
        migrations.RunPython(keep_existing_session_and_school_data, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name="exam",
            name="exams_exam_academi_a219af_idx",
        ),
        migrations.RemoveField(model_name="exam", name="academic_year"),
        migrations.RemoveField(model_name="examinationsession", name="academic_year"),
        migrations.RemoveField(model_name="studentprofile", name="school"),
        migrations.RemoveField(model_name="exam", name="eligibility"),
        migrations.RemoveField(model_name="exam", name="instructions"),
        migrations.RemoveField(model_name="exam", name="syllabus"),
        migrations.RemoveField(model_name="exam", name="important_information"),
    ]
