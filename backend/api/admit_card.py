"""
Admit card generation utilities.

Renders staff-authored HTML templates with student/exam data, or overlays data
onto existing PDF templates using reportlab + pypdf.
"""
import re
import base64
import mimetypes
import io
import os
from datetime import date

from django.conf import settings
from django.template import Context, Template
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

try:
    from pypdf import PdfReader, PdfWriter
    _PYPDF_AVAILABLE = True
except ImportError:
    _PYPDF_AVAILABLE = False

# ---------------------------------------------------------------------------
# Template path
# ---------------------------------------------------------------------------
TEMPLATE_PATH = os.path.join(
    settings.BASE_DIR, "static", "assets", "HBPL ADMIT CARD1.pdf"
)

# ---------------------------------------------------------------------------
# Layout constants (in PDF points; template is A4 portrait — 595.28 x 841.89)
# ---------------------------------------------------------------------------
PAGE_WIDTH = 595.28
PAGE_HEIGHT = 841.89

# Field anchor coordinates tuned for current HBPL ADMIT CARD1.pdf
NAME_X, NAME_Y = 34, 564
DOB_X, DOB_Y = 34, 520
ROLL_X, ROLL_Y = 34, 475
CLASS_X, CLASS_Y = 295, 475
CENTER_X, CENTER_Y = 34, 423
ADDRESS_X, ADDRESS_START_Y = 34, 410

# Colour for text overlay
TEXT_COLOR = HexColor("#000000")  # black


def _title_case(text: str) -> str:
    return (text or "").strip().title()



def _split_ordinal(val: str):
    # Returns (number, suffix) or (original, "") if not ordinal
    try:
        num = int(val)
        if 10 <= (num % 100) <= 20:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(num % 10, "th")
        return str(num), suffix
    except Exception:
        match = re.fullmatch(r"class\s*(\d+)", val, flags=re.IGNORECASE)
        if match:
            num = int(match.group(1))
            if 10 <= (num % 100) <= 20:
                suffix = "th"
            else:
                suffix = {1: "st", 2: "nd", 3: "rd"}.get(num % 10, "th")
            return f"{num}", suffix
    return val, ""


def _build_overlay(
    full_name: str,
    date_of_birth: date,
    roll_number: str,
    class_name: str,
    examination_center: str,
    center_address: str,
) -> bytes:
    """
    Build a transparent PDF page with the student admit card data written in
    the correct positions. Returns raw PDF bytes.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    # Coordinates aligned to the updated HBPL ADMIT CARD1.pdf layout.
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(TEXT_COLOR)
    c.drawString(NAME_X, NAME_Y, _title_case(full_name)[:58])

    # Date of Birth row
    c.setFont("Helvetica-Bold", 11)
    dob_text = date_of_birth.strftime("%d-%m-%Y") if date_of_birth else ""
    c.drawString(DOB_X, DOB_Y, dob_text)

    # Roll No and Class row
    c.drawString(ROLL_X, ROLL_Y, (roll_number or "")[:30])
    # Draw class with superscript suffix if ordinal
    class_val = (class_name or "").strip()
    class_main, class_sup = _split_ordinal(class_val)
    if class_sup:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(CLASS_X, CLASS_Y, "")
        x = CLASS_X + c.stringWidth("", "Helvetica-Bold", 11)
        c.drawString(x, CLASS_Y, class_main)
        x += c.stringWidth(class_main, "Helvetica-Bold", 11)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x, CLASS_Y + 5, class_sup)
        c.setFont("Helvetica-Bold", 11)
    else:
        c.drawString(CLASS_X, CLASS_Y, _title_case(class_name)[:26])

    # Exam center and address row (supports up to 3 lines)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(CENTER_X, CENTER_Y, _title_case(examination_center)[:70])
    if center_address:
        lines = [line.strip() for line in center_address.split("\n") if line.strip()][:2]
        y = ADDRESS_START_Y
        for line in lines:
            c.drawString(ADDRESS_X, y, _title_case(line)[:86])
            y -= 13

    c.save()
    buf.seek(0)
    return buf.read()


def _format_date(value, empty=""):
    return value.strftime("%d %B %Y") if hasattr(value, "strftime") else (str(value) if value else empty)


def _format_time(value):
    return value.strftime("%I:%M %p").lstrip("0") if hasattr(value, "strftime") else (str(value) if value else "")


def _file_data_uri(upload):
    if not upload:
        return ""
    name = getattr(upload, "name", "")
    try:
        if hasattr(upload, "open"):
            upload.open("rb")
            data = upload.read()
            upload.close()
        else:
            with open(os.fspath(upload), "rb") as source:
                data = source.read()
    except (OSError, ValueError):
        return ""
    content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"
    return f"data:{content_type};base64,{base64.b64encode(data).decode('ascii')}"


def _render_html_admit_card(registration, template_path, exam=None) -> bytes:
    try:
        from weasyprint import HTML
        from weasyprint.urls import URLFetcher
    except (ImportError, OSError) as exc:
        raise RuntimeError(
            "HTML admit cards require WeasyPrint and its native Pango libraries. "
            "Follow the setup notes in DEPLOY.md."
        ) from exc

    exam = exam or getattr(registration, "exam", None)
    start_time = getattr(exam, "exam_start_time", None) if exam else None
    end_time = getattr(exam, "exam_end_time", None) if exam else None
    exam_time = " - ".join(filter(None, (_format_time(start_time), _format_time(end_time))))
    duration = ""
    if start_time and end_time and hasattr(start_time, "hour") and hasattr(end_time, "hour"):
        minutes = (end_time.hour * 60 + end_time.minute - start_time.hour * 60 - start_time.minute) % (24 * 60)
        duration = f"{minutes // 60} Hour{'' if minutes // 60 == 1 else 's'} {minutes % 60} Minutes" if minutes else ""

    centre = getattr(registration, "examination_center", "") or getattr(registration, "centre_name", "")
    centre_address = getattr(registration, "center_address", "") or getattr(registration, "centre_address", "")
    application_number = getattr(registration, "roll_number", "") or getattr(registration, "application_number", "")
    exam_date = getattr(exam, "exam_date", None) if exam else None
    context = {
        "exam_name": getattr(exam, "name", "") if exam else getattr(registration, "exam_name", ""),
        "exam_session": getattr(getattr(exam, "session", None), "name", "") if exam else "",
        "exam_date": _format_date(exam_date, "To be announced"),
        "exam_weekday": exam_date.strftime("%A") if exam_date else "",
        "reporting_time": _format_time(getattr(exam, "reporting_time", None)) if exam else "",
        "exam_time": exam_time,
        "exam_duration": duration,
        "student_name": getattr(registration, "full_name", ""),
        "application_number": application_number,
        "student_class": getattr(registration, "class_name", "") or "",
        "student_dob": _format_date(getattr(registration, "date_of_birth", None)),
        "school_name": getattr(registration, "school_name", "") or "",
        "centre_name": centre,
        "centre_address": centre_address,
        "student_photo_data_uri": _file_data_uri(
            getattr(registration, "student_photo", None) or getattr(registration, "student_image", None)
        ),
        "student_signature_data_uri": _file_data_uri(
            getattr(registration, "student_signature", None) or getattr(registration, "signature_image", None)
        ),
    }

    with open(template_path, "r", encoding="utf-8-sig") as source:
        html = Template(source.read()).render(Context(context))

    # Embedded data images are permitted; local-file and network URLs are blocked.
    fetcher = URLFetcher(allowed_protocols={"data"})
    try:
        return HTML(string=html, url_fetcher=fetcher).write_pdf()
    except Exception as exc:
        raise RuntimeError(f"Could not render the HTML admit-card template: {exc}") from exc


def generate_admit_card(registration, template_path=None, exam=None) -> bytes:
    """
    Generate an admit card PDF for *registration* by overlaying the student's
    data onto the HBPL admit card template.

    Supports staff-authored Django HTML templates and existing PDF templates.
    Returns the resulting PDF as raw bytes.
    """
    template_path = template_path or TEMPLATE_PATH
    if not os.path.exists(template_path):
        raise RuntimeError(
            f"Admit card template not found at: {template_path}"
        )

    if os.path.splitext(template_path)[1].lower() in {".html", ".htm"}:
        return _render_html_admit_card(registration, template_path, exam=exam)

    if not _PYPDF_AVAILABLE:
        raise RuntimeError("pypdf is required to use a PDF admit-card template.")

    # Build the overlay page with the student's data
    overlay_bytes = _build_overlay(
        full_name=registration.full_name,
        date_of_birth=registration.date_of_birth,
        roll_number=registration.roll_number,
        class_name=registration.class_name or "",
        examination_center=registration.examination_center or "",
        center_address=registration.center_address or "",
    )

    # Merge overlay onto the template
    template_reader = PdfReader(template_path)
    overlay_reader = PdfReader(io.BytesIO(overlay_bytes))

    template_page = template_reader.pages[0]
    overlay_page = overlay_reader.pages[0]

    # Merge: overlay is transparent where no content is drawn
    template_page.merge_page(overlay_page)

    writer = PdfWriter()
    writer.add_page(template_page)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.read()
