"""
Certificate generation utilities.

Overlays student-specific data (name, class, rank) onto HBPL
certificate templates using reportlab + pypdf.
"""
import io
import base64
import mimetypes
import os
import re
from functools import lru_cache

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
# Template paths
# ---------------------------------------------------------------------------
RANK_TEMPLATE_PATH = os.path.join(
    settings.BASE_DIR, "static", "assets", "HBPL Comp Certificate2.pdf"
)
PARTICIPATION_TEMPLATE_PATH = os.path.join(
    settings.BASE_DIR, "static", "assets", "HBPL Paricipation  Certificate.pdf"
)
DEVANAGARI_FONT_PATH = os.path.join(
    settings.BASE_DIR, "api", "assets", "fonts", "NotoSansDevanagari-Regular.ttf"
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



def _split_ordinal(val) -> tuple:
    try:
        value = int(val)
        if value <= 0:
            return str(value), ""
        if 10 <= (value % 100) <= 20:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
        return str(value), suffix
    except (TypeError, ValueError):
        return str(val), ""



def _format_class_name(class_name: str):
    value = (class_name or "").strip()
    if not value:
        return "", ""
    if value.isdigit():
        return value, _split_ordinal(value)[1]
    match = re.fullmatch(r"class\s*(\d+)", value, flags=re.IGNORECASE)
    if match:
        return f"{match.group(1)}", _split_ordinal(match.group(1))[1]
    return _title_case(value), ""


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
        class_main, class_sup = _format_class_name(class_name)
        if class_sup:
            c.setFont("Helvetica", 13)
            c.drawString(265, 295, class_main)
            x = 265 + c.stringWidth(class_main, "Helvetica", 13)
            c.setFont("Helvetica", 9)
            c.drawString(x, 299, class_sup)
            c.setFont("Helvetica", 13)
        else:
            c.drawString(265, 295, class_main)

    # ── Position / Rank ───────────────────────────────────────────────────────
    # "Position / Rank:" colon ends at x≈510, y≈290.
    if include_rank and rank is not None:
        rank_main, rank_sup = _split_ordinal(rank)
        c.setFont("Helvetica", 13)
        c.drawString(555, 295, rank_main)
        x = 555 + c.stringWidth(rank_main, "Helvetica", 13)
        if rank_sup:
            c.setFont("Helvetica", 9)
            c.drawString(x, 299, rank_sup)
            c.setFont("Helvetica", 13)

    c.save()
    buf.seek(0)
    return buf.read()


def _format_rank(rank):
    if rank is None:
        return ""
    value, suffix = _split_ordinal(rank)
    return f"{value}{suffix}"


def _file_data_uri(upload):
    if not upload:
        return ""
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
    media_type = mimetypes.guess_type(getattr(upload, "name", ""))[0] or "application/octet-stream"
    return f"data:{media_type};base64,{base64.b64encode(data).decode('ascii')}"


@lru_cache(maxsize=1)
def _devanagari_font_data_uri():
    """Return the bundled Hindi font as a safe, renderer-local data URI."""
    try:
        with open(DEVANAGARI_FONT_PATH, "rb") as source:
            encoded = base64.b64encode(source.read()).decode("ascii")
    except OSError:
        return ""
    return f"data:font/ttf;base64,{encoded}"


def _render_html_certificate(registration, template_path, exam=None, result=None, certificate_number=""):
    try:
        from weasyprint import HTML
        from weasyprint.urls import URLFetcher
    except (ImportError, OSError) as exc:
        raise RuntimeError(
            "HTML certificates require WeasyPrint and its native Pango libraries. "
            "Follow the setup notes in DEPLOY.md."
        ) from exc

    exam = exam or getattr(registration, "exam", None)
    result = result or getattr(registration, "result", None)
    rank = getattr(result, "rank", None) if result else getattr(registration, "rank", None)
    issued_at = getattr(registration, "certificate_issued_at", None)
    context = {
        "student_name": getattr(registration, "full_name", ""),
        "student_class": getattr(registration, "class_name", "") or "",
        "position_rank": _format_rank(rank),
        "rank": _format_rank(rank),
        "exam_name": getattr(exam, "name", "") if exam else "",
        "exam_session": getattr(getattr(exam, "session", None), "name", "") if exam else "",
        "certificate_number": certificate_number or getattr(registration, "certificate_number", "") or "",
        "issue_date": issued_at.strftime("%d %B %Y") if hasattr(issued_at, "strftime") else "",
        "school_name": getattr(registration, "school_name", "") or "",
        "student_photo_data_uri": _file_data_uri(getattr(registration, "student_photo", None)),
        "devanagari_font_data_uri": _devanagari_font_data_uri(),
    }
    with open(template_path, "r", encoding="utf-8-sig") as source:
        html = Template(source.read()).render(Context(context))

    # A certificate may embed artwork and student photos, but should not load
    # arbitrary local files or remote URLs while rendering a student document.
    fetcher = URLFetcher(allowed_protocols={"data"})
    try:
        return HTML(string=html, url_fetcher=fetcher).write_pdf()
    except Exception as exc:
        raise RuntimeError(f"Could not render the HTML certificate template: {exc}") from exc


def generate_participation_certificate(
    registration, template_path=None, exam=None, result=None, certificate_number="",
) -> bytes:
    """
    Generate a certificate PDF for *registration*.

    If rank is present, generate the rank/competition certificate; otherwise,
    generate the participation certificate.

    Returns the resulting PDF as raw bytes, or raises RuntimeError if the
    template file is missing or pypdf is unavailable.
    """
    rank = getattr(result, "rank", None) if result else getattr(registration, "rank", None)
    template_path = template_path or (RANK_TEMPLATE_PATH if rank is not None else PARTICIPATION_TEMPLATE_PATH)
    if not os.path.exists(template_path):
        raise RuntimeError(f"Certificate template not found at: {template_path}")

    if os.path.splitext(template_path)[1].lower() in {".html", ".htm"}:
        return _render_html_certificate(
            registration, template_path, exam=exam, result=result,
            certificate_number=certificate_number,
        )

    if not _PYPDF_AVAILABLE:
        raise RuntimeError(
            "pypdf is required for certificate generation. "
            "Add pypdf to requirements.txt and install it."
        )

    include_rank = rank is not None
    # Build the overlay page with the student's data
    overlay_bytes = _build_overlay(
        full_name=registration.full_name,
        class_name=registration.class_name or "",
        rank=rank,
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
