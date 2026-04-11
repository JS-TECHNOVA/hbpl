"""
Certificate generation utilities.

Overlays student-specific data (name, class, rank) onto HBPL
certificate templates using reportlab + pypdf.
"""
import io
import os
import re

from django.conf import settings
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

try:
    from pypdf import PdfReader, PdfWriter
    _PYPDF_AVAILABLE = True
except ImportError:
    _PYPDF_AVAILABLE = False

# ---------------------------------------------------------------------------
# Template paths
# ---------------------------------------------------------------------------
RANK_TEMPLATE_PATH = os.path.join(
    settings.BASE_DIR, "static", "assets", "HBPL Comp Certificate2.pdf"
)
PARTICIPATION_TEMPLATE_PATH = os.path.join(
    settings.BASE_DIR, "static", "assets", "HBPL Paricipation  Certificate.pdf"
)

# ---------------------------------------------------------------------------
# Layout constants (in PDF points; template is 842.04 x 594.96 — A4 landscape)
# ---------------------------------------------------------------------------
PAGE_WIDTH = 842.04
PAGE_HEIGHT = 594.96

# Colour matching the gold/brown used for "Proudly Presented To" on the template
NAME_COLOR = HexColor("#1a1a1a")  # near-black to match signature-area text
CLASS_RANK_COLOR = HexColor("#1a1a1a")


def _title_case(text: str) -> str:
    return (text or "").strip().title()


def _ordinal_rank(rank) -> str:
    try:
        value = int(rank)
    except (TypeError, ValueError):
        return str(rank)

    if value <= 0:
        return str(value)

    # Handle 11th, 12th, 13th exceptions.
    if 10 <= (value % 100) <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def _format_class_name(class_name: str) -> str:
    value = (class_name or "").strip()
    if not value:
        return ""

    if value.isdigit():
        return f"{_ordinal_rank(value)}"

    match = re.fullmatch(r"class\s*(\d+)", value, flags=re.IGNORECASE)
    if match:
        return f"{_ordinal_rank(match.group(1))}"

    return _title_case(value)


def _build_overlay(full_name: str, class_name: str, rank, include_rank: bool) -> bytes:
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
    c.drawCentredString(name_center_x, name_y, _title_case(full_name))

    # ── Class ─────────────────────────────────────────────────────────────────
    # "Class:" label is at x≈206, y≈290.  Write the value starting after the
    # label (approx x=265) on the same baseline.
    c.setFont("Helvetica", 13)
    c.setFillColor(CLASS_RANK_COLOR)
    if class_name:
        c.drawString(265, 295, _format_class_name(class_name))

    # ── Position / Rank ───────────────────────────────────────────────────────
    # "Position / Rank:" colon ends at x≈510, y≈290.
    if include_rank and rank is not None:
        c.drawString(555, 295, _ordinal_rank(rank))

    c.save()
    buf.seek(0)
    return buf.read()


def generate_participation_certificate(registration) -> bytes:
    """
    Generate a certificate PDF for *registration*.

    If rank is present, generate the rank/competition certificate; otherwise,
    generate the participation certificate.

    Returns the resulting PDF as raw bytes, or raises RuntimeError if the
    template file is missing or pypdf is unavailable.
    """
    if not _PYPDF_AVAILABLE:
        raise RuntimeError(
            "pypdf is required for certificate generation. "
            "Add pypdf to requirements.txt and install it."
        )

    include_rank = registration.rank is not None
    template_path = RANK_TEMPLATE_PATH if include_rank else PARTICIPATION_TEMPLATE_PATH

    if not os.path.exists(template_path):
        raise RuntimeError(
            f"Certificate template not found at: {template_path}"
        )

    # Build the overlay page with the student's data
    overlay_bytes = _build_overlay(
        full_name=registration.full_name,
        class_name=registration.class_name or "",
        rank=registration.rank,
        include_rank=include_rank,
    )

    # Merge overlay onto the template
    template_reader = PdfReader(template_path)
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
