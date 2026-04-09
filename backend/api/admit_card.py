"""
Admit card generation utilities.

Overlays student-specific data (name, roll number, class, center, address)
onto the HBPL admit card PDF template using reportlab + pypdf.
"""
import io
import os

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

# Colour for text overlay
TEXT_COLOR = HexColor("#000000")  # black


def _build_overlay(
    full_name: str,
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

    # These coordinates are aligned to the blank lines in HBPL ADMIT CARD1.pdf.
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(TEXT_COLOR)
    c.drawString(145, 709, (full_name or "")[:42])

    # ── Roll Number ──────────────────────────────────────────────────────────
    c.setFont("Helvetica", 12)
    c.drawString(115, 671, (roll_number or "")[:30])

    # ── Class ────────────────────────────────────────────────────────────────
    c.drawString(70, 625, (class_name or "")[:30])

    # ── Examination Center ───────────────────────────────────────────────────
    c.drawString(145, 497, (examination_center or "")[:45])

    # ── Center Address ───────────────────────────────────────────────────────
    # Address line(s)
    if center_address:
        lines = center_address.split("\n")[:2]
        y = 465
        for line in lines:
            c.drawString(125, y, line[:65])
            y -= 16

    # ── Photo placeholder ────────────────────────────────────────────────────
    # Photo placeholder (for physical pasting by student)
    # Approx. 3.5cm x 4.5cm, aligned to top-right empty region.
    photo_x = 458
    photo_y = 560
    photo_width = 96
    photo_height = 126

    c.setLineWidth(1.5)
    c.setStrokeColor(HexColor("#666666"))
    c.rect(photo_x, photo_y, photo_width, photo_height, fill=False)

    # Add label inside the placeholder
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(HexColor("#999999"))
    c.drawString(photo_x + 8, photo_y + photo_height / 2 + 8, "Paste")
    c.drawString(photo_x + 8, photo_y + photo_height / 2 - 8, "Photo")
    c.drawString(photo_x + 8, photo_y + photo_height / 2 - 24, "Here")

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
