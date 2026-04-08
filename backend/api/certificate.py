"""
Certificate generation utilities.

Overlays student-specific data (name, class, rank) onto the HBPL
participation certificate PDF template using reportlab + pypdf.
"""
import io
import os

from django.conf import settings
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
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
    settings.BASE_DIR, "static", "assets", "HBPL Comp Certificate2.pdf"
)

# ---------------------------------------------------------------------------
# Layout constants (in PDF points; template is 842.04 x 594.96 — A4 landscape)
# ---------------------------------------------------------------------------
PAGE_WIDTH = 842.04
PAGE_HEIGHT = 594.96

# Colour matching the gold/brown used for "Proudly Presented To" on the template
NAME_COLOR = HexColor("#1a1a1a")  # near-black to match signature-area text
CLASS_RANK_COLOR = HexColor("#1a1a1a")


def _build_overlay(full_name: str, class_name: str, rank) -> bytes:
    """
    Build a transparent PDF page with the student data written in the correct
    positions.  Returns raw PDF bytes.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    # ── Student name ─────────────────────────────────────────────────────────
    # Placed on the underline below "Proudly Presented To" (y ≈ 343 pt).
    # Centred horizontally across the name line (approx x=130 … x=710).
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(NAME_COLOR)
    name_y = 338
    name_center_x = PAGE_WIDTH / 2
    c.drawCentredString(name_center_x, name_y, full_name)

    # ── Class ─────────────────────────────────────────────────────────────────
    # "Class:" label is at x≈206, y≈290.  Write the value starting after the
    # label (approx x=265) on the same baseline.
    c.setFont("Helvetica", 13)
    c.setFillColor(CLASS_RANK_COLOR)
    if class_name:
        c.drawString(265, 290, class_name)

    # ── Position / Rank ───────────────────────────────────────────────────────
    # "Position / Rank:" colon ends at x≈510, y≈290.
    if rank is not None:
        c.drawString(555, 290, str(rank))

    c.save()
    buf.seek(0)
    return buf.read()


def generate_participation_certificate(registration) -> bytes:
    """
    Generate a participation certificate PDF for *registration* by overlaying
    the student's name, class, and rank onto the HBPL template.

    Returns the resulting PDF as raw bytes, or raises RuntimeError if the
    template file is missing or pypdf is unavailable.
    """
    if not _PYPDF_AVAILABLE:
        raise RuntimeError(
            "pypdf is required for certificate generation. "
            "Add pypdf to requirements.txt and install it."
        )

    if not os.path.exists(TEMPLATE_PATH):
        raise RuntimeError(
            f"Certificate template not found at: {TEMPLATE_PATH}"
        )

    # Build the overlay page with the student's data
    rank = registration.rank
    overlay_bytes = _build_overlay(
        full_name=registration.full_name,
        class_name=registration.class_name or "",
        rank=rank,
    )

    # Merge overlay onto the template
    template_reader = PdfReader(TEMPLATE_PATH)
    overlay_reader = PdfReader(io.BytesIO(overlay_bytes))

    template_page = template_reader.pages[0]
    overlay_page = overlay_reader.pages[0]

    # Merge: the overlay is transparent where no content is drawn, so the
    # template background shows through everywhere else.
    template_page.merge_page(overlay_page)

    writer = PdfWriter()
    writer.add_page(template_page)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.read()
