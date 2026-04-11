import re
"""
Admit card generation utilities.

Overlays student-specific data (name, DOB, roll number, class, center, address)
onto the HBPL admit card PDF template using reportlab + pypdf.
"""
import io
import os
from datetime import date

from django.conf import settings
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


def generate_admit_card(registration) -> bytes:
    """
    Generate an admit card PDF for *registration* by overlaying the student's
    data onto the HBPL admit card template.

    Returns the resulting PDF as raw bytes, or raises RuntimeError if the
    template file is missing or pypdf is unavailable.
    """
    if not _PYPDF_AVAILABLE:
        raise RuntimeError(
            "pypdf is required for admit card generation. "
            "Add pypdf to requirements.txt and install it."
        )

    if not os.path.exists(TEMPLATE_PATH):
        raise RuntimeError(
            f"Admit card template not found at: {TEMPLATE_PATH}"
        )

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
    template_reader = PdfReader(TEMPLATE_PATH)
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
