#!/usr/bin/env python3
"""
LIBITEX Design System — PDF Generator
Visual design system document with color swatches and typography samples
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle,
    PageBreak, Frame, PageTemplate, BaseDocTemplate,
    NextPageTemplate, Flowable
)

# ─── Colors ───
INDIGO_900 = HexColor("#1B1F3B")
INDIGO_700 = HexColor("#2D3561")
TEAL_600 = HexColor("#0D9488")
TEAL_400 = HexColor("#2DD4BF")
TEAL_50 = HexColor("#F0FDFA")
AMBER_500 = HexColor("#F59E0B")
AMBER_300 = HexColor("#FCD34D")
SLATE_800 = HexColor("#1E293B")
SLATE_500 = HexColor("#64748B")
SLATE_200 = HexColor("#E2E8F0")
SLATE_100 = HexColor("#F1F5F9")
SLATE_50 = HexColor("#F8FAFC")
SUCCESS = HexColor("#059669")
SUCCESS_LT = HexColor("#D1FAE5")
WARNING = HexColor("#D97706")
WARNING_LT = HexColor("#FEF3C7")
ERROR = HexColor("#DC2626")
ERROR_LT = HexColor("#FEE2E2")
INFO = HexColor("#2563EB")
INFO_LT = HexColor("#DBEAFE")
WHITE = white

PAGE_W, PAGE_H = A4
ML = 25 * mm
MR = 25 * mm
MT = 25 * mm
MB = 25 * mm
AW = PAGE_W - ML - MR  # available width


class ColorSwatch(Flowable):
    """Draws a row of color swatches with labels."""
    def __init__(self, colors, width):
        Flowable.__init__(self)
        self.colors = colors  # list of (hex_str, name)
        self.fw = width
        self.swatch_h = 40
        self.label_h = 30

    def draw(self):
        c = self.canv
        n = len(self.colors)
        gap = 8
        sw = (self.fw - gap * (n - 1)) / n
        x = 0
        total_h = self.swatch_h + self.label_h

        for hex_str, name in self.colors:
            color = HexColor(hex_str)
            # Swatch rectangle
            c.setFillColor(color)
            c.setStrokeColor(SLATE_200)
            c.setLineWidth(0.5)
            c.roundRect(x, self.label_h, sw, self.swatch_h, 4, fill=1, stroke=1)
            # Name
            c.setFillColor(SLATE_800)
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(x + 4, self.label_h - 12, name)
            # Hex
            c.setFillColor(SLATE_500)
            c.setFont("Courier", 7)
            c.drawString(x + 4, self.label_h - 24, hex_str)

            x += sw + gap

    def wrap(self, availWidth, availHeight):
        self.fw = availWidth
        return (availWidth, self.swatch_h + self.label_h + 4)


class SectionHeader(Flowable):
    def __init__(self, number, title, width):
        Flowable.__init__(self)
        self.number = number
        self.title = title
        self.fw = width

    def draw(self):
        c = self.canv
        c.setFillColor(TEAL_600)
        c.rect(0, 0, 4, 28, fill=1, stroke=0)
        c.setFillColor(INDIGO_900)
        c.roundRect(14, 2, 30, 24, 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 13)
        num_str = str(self.number)
        tw = c.stringWidth(num_str, "Helvetica-Bold", 13)
        c.drawString(14 + (30 - tw) / 2, 9, num_str)
        c.setFillColor(INDIGO_900)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(52, 7, self.title)

    def wrap(self, availWidth, availHeight):
        return (availWidth, 34)


class SubSectionHeader(Flowable):
    def __init__(self, title):
        Flowable.__init__(self)
        self.title = title

    def draw(self):
        c = self.canv
        c.setStrokeColor(TEAL_600)
        c.setLineWidth(1.5)
        c.line(0, 0, 20, 0)
        c.setFillColor(TEAL_600)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(26, -3, self.title)

    def wrap(self, availWidth, availHeight):
        return (availWidth, 14)


class GoldAccentLine(Flowable):
    def __init__(self, width=60*mm):
        Flowable.__init__(self)
        self.line_width = width

    def draw(self):
        self.canv.setStrokeColor(TEAL_600)
        self.canv.setLineWidth(2)
        self.canv.line(0, 0, self.line_width, 0)

    def wrap(self, availWidth, availHeight):
        return (self.line_width, 4)


class CodeBlock(Flowable):
    def __init__(self, text, width):
        Flowable.__init__(self)
        self.text = text
        self.fw = width
        self.lines = text.strip().split("\n")
        self.line_h = 12
        self.padding = 10

    def draw(self):
        c = self.canv
        h = len(self.lines) * self.line_h + 2 * self.padding
        c.setFillColor(SLATE_100)
        c.setStrokeColor(SLATE_200)
        c.setLineWidth(0.5)
        c.roundRect(0, 0, self.fw, h, 4, fill=1, stroke=1)
        c.setFillColor(TEAL_600)
        c.rect(0, 0, 3, h, fill=1, stroke=0)
        c.setFillColor(SLATE_800)
        c.setFont("Courier", 8)
        y = h - self.padding - 2
        for line in self.lines:
            c.drawString(self.padding + 6, y, line[:100])
            y -= self.line_h

    def wrap(self, availWidth, availHeight):
        self.fw = availWidth - 10
        h = len(self.lines) * self.line_h + 2 * self.padding
        return (availWidth, h + 4)


class TypographySample(Flowable):
    """Shows a typography sample with label."""
    def __init__(self, label, sample_text, font_name, font_size, color, width):
        Flowable.__init__(self)
        self.label = label
        self.sample_text = sample_text
        self.font_name = font_name
        self.font_size = font_size
        self.color = color
        self.fw = width

    def draw(self):
        c = self.canv
        # Label
        c.setFillColor(SLATE_500)
        c.setFont("Helvetica", 8)
        c.drawString(0, self.font_size + 6, self.label)
        # Sample
        c.setFillColor(self.color)
        c.setFont(self.font_name, self.font_size)
        c.drawString(0, 0, self.sample_text)

    def wrap(self, availWidth, availHeight):
        return (availWidth, self.font_size + 20)


# ─── Page Templates ───

def cover_page(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    w, h = PAGE_W, PAGE_H

    # Background
    c.setFillColor(INDIGO_900)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # Geometric decoration
    c.setStrokeColor(HexColor("#2a3560"))
    c.setLineWidth(0.3)
    for i in range(0, 300, 12):
        c.line(w - 300 + i, h, w, h - 300 + i)
    for i in range(0, 200, 12):
        c.line(0, i, 200 - i, 0)

    # Teal accent line
    c.setStrokeColor(TEAL_600)
    c.setLineWidth(3)
    c.line(60, h - 60, w - 60, h - 60)

    # Brand
    c.setFillColor(TEAL_400)
    c.setFont("Helvetica-Bold", 42)
    c.drawString(60, h - 140, "LIBITEX")

    c.setStrokeColor(HexColor("#3a4570"))
    c.setLineWidth(0.5)
    c.line(60, h - 160, 220, h - 160)

    c.setFillColor(WHITE)
    c.setFont("Helvetica", 13)
    c.drawString(60, h - 190, "Design System")
    c.setFillColor(SLATE_500)
    c.setFont("Helvetica", 11)
    c.drawString(60, h - 210, "Brand Identity & Visual Guidelines")

    # Title
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(60, h - 310, "Visual Design")
    c.drawString(60, h - 350, "Language")

    c.setStrokeColor(TEAL_600)
    c.setLineWidth(2)
    c.line(60, h - 365, 300, h - 365)

    # Color swatches preview
    preview_colors = [
        ("#1B1F3B", "Indigo 900"),
        ("#0D9488", "Teal 600"),
        ("#F59E0B", "Amber 500"),
        ("#059669", "Success"),
        ("#DC2626", "Error"),
    ]
    x = 60
    for hex_str, _ in preview_colors:
        c.setFillColor(HexColor(hex_str))
        c.roundRect(x, h - 440, 60, 40, 4, fill=1, stroke=0)
        x += 72

    # Bottom box
    c.setFillColor(HexColor("#111530"))
    c.roundRect(40, 60, w - 80, 80, 6, fill=1, stroke=0)
    c.setStrokeColor(TEAL_600)
    c.setLineWidth(0.5)
    c.roundRect(40, 60, w - 80, 80, 6, fill=0, stroke=1)

    c.setFillColor(SLATE_500)
    c.setFont("Helvetica", 9)
    c.drawString(60, 115, "VERSION")
    c.drawString(200, 115, "DATE")
    c.drawString(340, 115, "STATUS")

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(60, 90, "1.0")
    c.drawString(200, 90, "April 7, 2026")
    c.drawString(340, 90, "Reference Document")

    c.restoreState()


def header_footer(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    w, h = PAGE_W, PAGE_H

    c.setStrokeColor(TEAL_600)
    c.setLineWidth(1.5)
    c.line(ML, h - 18 * mm, w - MR, h - 18 * mm)

    c.setFillColor(INDIGO_900)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(ML, h - 16 * mm, "LIBITEX")

    c.setFillColor(TEAL_600)
    c.circle(ML + 42, h - 15.5 * mm, 1.5, fill=1, stroke=0)

    c.setFillColor(SLATE_500)
    c.setFont("Helvetica", 7)
    c.drawRightString(w - MR, h - 16 * mm, "Design System v1.0")

    c.setStrokeColor(SLATE_200)
    c.setLineWidth(0.5)
    c.line(ML, MB - 5 * mm, w - MR, MB - 5 * mm)

    c.setFillColor(SLATE_500)
    c.setFont("Helvetica", 7)
    c.drawString(ML, MB - 10 * mm, "LIBITEX Design System")

    page_num = doc.page - 1
    if page_num > 0:
        c.setFillColor(TEAL_600)
        c.roundRect(w - MR - 20, MB - 12 * mm, 28, 16, 3, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(w - MR - 6, MB - 9.5 * mm, str(page_num))

    c.restoreState()


# ─── Styles ───
def get_styles():
    s = {}
    s["body"] = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=15,
                                textColor=SLATE_800, alignment=TA_JUSTIFY, spaceAfter=6)
    s["bullet"] = ParagraphStyle("bullet", parent=s["body"], leftIndent=16, bulletIndent=6,
                                  spaceBefore=2, spaceAfter=2)
    s["table_header"] = ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8.5,
                                        leading=11, textColor=WHITE)
    s["table_cell"] = ParagraphStyle("tc", fontName="Helvetica", fontSize=8.5,
                                      leading=11, textColor=SLATE_800)
    s["table_cell_bold"] = ParagraphStyle("tcb", fontName="Helvetica-Bold", fontSize=8.5,
                                           leading=11, textColor=SLATE_800)
    s["table_cell_mono"] = ParagraphStyle("tcm", fontName="Courier", fontSize=8,
                                           leading=11, textColor=TEAL_600)
    return s


def make_table(headers, rows, col_widths=None, s=None):
    if s is None:
        s = get_styles()
    header_cells = [Paragraph(h, s["table_header"]) for h in headers]
    data = [header_cells]
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            st = s["table_cell_bold"] if i == 0 else s["table_cell"]
            cells.append(Paragraph(str(cell), st))
        data.append(cells)

    if col_widths is None:
        n = len(headers)
        col_widths = [AW / n] * n

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO_900),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), SLATE_50))
    t.setStyle(TableStyle(style_cmds))
    return t


# ─── Build ───
def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "LIBITEX_DESIGN_SYSTEM.pdf")
    s = get_styles()

    doc = BaseDocTemplate(
        output_path, pagesize=A4,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
        title="LIBITEX Design System", author="LIBITEX",
    )

    cover_tmpl = PageTemplate(
        id="cover",
        frames=[Frame(0, 0, PAGE_W, PAGE_H, id="cover_frame",
                       leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
        onPage=cover_page,
    )
    normal_frame = Frame(ML, MB, AW, PAGE_H - MT - MB, id="normal")
    normal_tmpl = PageTemplate(id="normal", frames=[normal_frame], onPage=header_footer)
    doc.addPageTemplates([cover_tmpl, normal_tmpl])

    story = []

    # Cover
    story.append(NextPageTemplate("normal"))
    story.append(Spacer(1, PAGE_H))
    story.append(PageBreak())

    # ═══════════════════════════════════════
    # 1. Brand Essence
    # ═══════════════════════════════════════
    story.append(SectionHeader(1, "Brand Essence", AW))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("Brand Personality"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "LIBITEX is <b>reliable</b>, <b>modern</b>, and <b>empowering</b>. "
        "It bridges the gap between enterprise-grade software and the everyday "
        "reality of African commerce.", s["body"]))
    story.append(Spacer(1, 4))
    for item in [
        "<b>Trustworthy</b> — merchants entrust their entire business to this platform",
        "<b>Accessible</b> — not intimidating, welcoming to first-time ERP users",
        "<b>Professional</b> — inspires confidence with investors and B2B clients",
        "<b>Energetic</b> — reflects the dynamism of African commerce",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Tagline Options"))
    story.append(Spacer(1, 6))
    for t in ["Commerce. Simplified.", "From Source to Sale.", "Your Business, Connected."]:
        story.append(Paragraph(f"<i>{t}</i>", s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════
    # 2. Color Palette
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(2, "Color Palette", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Primary Colors"))
    story.append(Spacer(1, 8))
    story.append(ColorSwatch([
        ("#1B1F3B", "Indigo 900"),
        ("#2D3561", "Indigo 700"),
        ("#0D9488", "Teal 600"),
        ("#2DD4BF", "Teal 400"),
    ], AW))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>Indigo + Teal</b>: Indigo conveys trust and depth (finance, enterprise). "
        "Teal injects energy and modernity. Together they feel premium yet approachable.",
        s["body"]))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Secondary & Warm Colors"))
    story.append(Spacer(1, 8))
    story.append(ColorSwatch([
        ("#F59E0B", "Amber 500"),
        ("#FCD34D", "Amber 300"),
        ("#1E293B", "Slate 800"),
        ("#64748B", "Slate 500"),
        ("#E2E8F0", "Slate 200"),
        ("#F8FAFC", "Slate 50"),
    ], AW))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Semantic Colors"))
    story.append(Spacer(1, 8))
    story.append(ColorSwatch([
        ("#059669", "Success"),
        ("#D97706", "Warning"),
        ("#DC2626", "Error"),
        ("#2563EB", "Info"),
    ], AW))
    story.append(Spacer(1, 4))
    story.append(ColorSwatch([
        ("#D1FAE5", "Success Light"),
        ("#FEF3C7", "Warning Light"),
        ("#FEE2E2", "Error Light"),
        ("#DBEAFE", "Info Light"),
    ], AW))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("POS-Specific Colors"))
    story.append(Spacer(1, 8))
    story.append(ColorSwatch([
        ("#FFFFFF", "POS Background"),
        ("#F1F5F9", "POS Card"),
        ("#0D9488", "POS Accent"),
        ("#EF4444", "POS Danger"),
        ("#F59E0B", "POS Hold"),
        ("#1B1F3B", "POS Payment"),
    ], AW))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "POS uses high-contrast colors for speed and readability under varied "
        "lighting conditions (bright shops, outdoor markets).", s["body"]))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Dark Mode Mapping"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Element", "Light Mode", "Dark Mode"],
        [
            ["Background", "#FFFFFF", "#0F172A"],
            ["Surface", "#F8FAFC", "#1E293B"],
            ["Surface Elevated", "#FFFFFF", "#334155"],
            ["Primary Text", "#1E293B", "#F1F5F9"],
            ["Secondary Text", "#64748B", "#94A3B8"],
            ["Border", "#E2E8F0", "#334155"],
            ["Primary Accent", "#0D9488", "#2DD4BF"],
        ],
        col_widths=[AW * 0.35, AW * 0.325, AW * 0.325], s=s,
    ))

    # ═══════════════════════════════════════
    # 3. Typography
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(3, "Typography", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Font Stack"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Role", "Font", "Fallback", "Weights"],
        [
            ["Headings", "Inter", "system-ui, sans-serif", "600, 700"],
            ["Body", "Inter", "system-ui, sans-serif", "400, 500"],
            ["Monospace", "JetBrains Mono", "ui-monospace, monospace", "400, 500"],
            ["POS Display", "Inter", "system-ui, sans-serif", "700"],
        ],
        col_widths=[AW * 0.18, AW * 0.22, AW * 0.38, AW * 0.22], s=s,
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>Why Inter</b>: excellent legibility at all sizes, extensive language support "
        "(French, Arabic, CJK for product names), open source, variable font.", s["body"]))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Type Scale"))
    story.append(Spacer(1, 6))
    # Visual samples using Helvetica (closest available in reportlab)
    story.append(TypographySample("Display — 36px / Bold", "Commerce. Simplified.",
                                   "Helvetica-Bold", 28, INDIGO_900, AW))
    story.append(TypographySample("H1 — 30px / Bold", "Dashboard Overview",
                                   "Helvetica-Bold", 24, INDIGO_900, AW))
    story.append(TypographySample("H2 — 24px / SemiBold", "Inventory Management",
                                   "Helvetica-Bold", 19, INDIGO_900, AW))
    story.append(TypographySample("H3 — 20px / SemiBold", "Stock Movements",
                                   "Helvetica-Bold", 16, TEAL_600, AW))
    story.append(TypographySample("H4 — 16px / SemiBold", "Recent Transactions",
                                   "Helvetica-Bold", 13, SLATE_800, AW))
    story.append(TypographySample("Body — 14px / Regular",
                                   "The platform manages the complete product lifecycle from international sourcing to final sale.",
                                   "Helvetica", 11, SLATE_800, AW))
    story.append(TypographySample("Caption — 12px / Regular",
                                   "Last updated 2 hours ago  |  Synced",
                                   "Helvetica", 9.5, SLATE_500, AW))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("POS Typography (Larger for touch)"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Element", "Size", "Weight"],
        [
            ["Total amount", "48px", "Bold 700"],
            ["Product name in cart", "18px", "Medium 500"],
            ["Price in cart", "18px", "Bold 700"],
            ["Category label", "16px", "SemiBold 600"],
            ["Product card name", "14px", "Medium 500"],
            ["Product card price", "16px", "Bold 700"],
        ],
        col_widths=[AW * 0.45, AW * 0.25, AW * 0.30], s=s,
    ))

    # ═══════════════════════════════════════
    # 4. Spacing & Layout
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(4, "Spacing & Layout", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Spacing Scale (base: 4px)"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Token", "Value", "Usage"],
        [
            ["space-1", "4px", "Tight inline spacing"],
            ["space-2", "8px", "Icon-to-text, compact padding"],
            ["space-3", "12px", "Default inner padding"],
            ["space-4", "16px", "Card padding, form gaps"],
            ["space-6", "24px", "Section gaps"],
            ["space-8", "32px", "Page section gaps"],
            ["space-12", "48px", "Page-level padding"],
            ["space-16", "64px", "Hero sections"],
        ],
        col_widths=[AW * 0.22, AW * 0.18, AW * 0.60], s=s,
    ))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Border Radius"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Token", "Value", "Usage"],
        [
            ["radius-sm", "4px", "Buttons, inputs, small badges"],
            ["radius-md", "8px", "Cards, modals, dropdowns"],
            ["radius-lg", "12px", "Large cards, containers"],
            ["radius-xl", "16px", "Hero sections, feature cards"],
            ["radius-full", "9999px", "Avatars, circular badges, pills"],
        ],
        col_widths=[AW * 0.22, AW * 0.18, AW * 0.60], s=s,
    ))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Shadows & Elevation"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Token", "Value", "Usage"],
        [
            ["shadow-xs", "0 1px 2px rgba(0,0,0,0.05)", "Inputs, tags"],
            ["shadow-sm", "0 1px 3px rgba(0,0,0,0.1)", "Cards, dropdowns"],
            ["shadow-md", "0 4px 6px rgba(0,0,0,0.1)", "Popovers, floating"],
            ["shadow-lg", "0 10px 15px rgba(0,0,0,0.1)", "Modals, dialogs"],
            ["shadow-xl", "0 20px 25px rgba(0,0,0,0.1)", "Overlay panels"],
        ],
        col_widths=[AW * 0.18, AW * 0.47, AW * 0.35], s=s,
    ))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("Breakpoints"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Name", "Min Width", "Target"],
        [
            ["sm", "640px", "Large phones"],
            ["md", "768px", "Tablets"],
            ["lg", "1024px", "Small laptops"],
            ["xl", "1280px", "Desktops"],
            ["2xl", "1536px", "Large screens"],
        ],
        col_widths=[AW * 0.20, AW * 0.25, AW * 0.55], s=s,
    ))

    # ═══════════════════════════════════════
    # 5. Components
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(5, "Components", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Buttons"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Variant", "Background", "Text", "Usage"],
        [
            ["Primary", "Teal 600", "White", "Main actions (Save, Confirm, Add to Cart)"],
            ["Secondary", "Transparent", "Teal 600", "Secondary actions (Cancel, Back)"],
            ["Ghost", "Transparent", "Slate 700", "Tertiary actions, inline links"],
            ["Danger", "Error red", "White", "Destructive (Delete, Void)"],
            ["POS Primary", "Teal 600", "White", "Large, min-height 56px for touch"],
            ["POS Danger", "Error red", "White", "Large, min-height 56px"],
        ],
        col_widths=[AW * 0.18, AW * 0.18, AW * 0.14, AW * 0.50], s=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Button Sizes"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Size", "Height", "Padding X", "Font Size"],
        [
            ["sm", "32px", "12px", "13px"],
            ["md", "40px", "16px", "14px"],
            ["lg", "48px", "24px", "16px"],
            ["pos", "56px", "24px", "18px"],
        ],
        col_widths=[AW * 0.20, AW * 0.25, AW * 0.25, AW * 0.30], s=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Input States"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["State", "Border", "Background", "Shadow"],
        [
            ["Default", "Slate 200", "White", "None"],
            ["Hover", "Slate 300", "White", "shadow-xs"],
            ["Focus", "Teal 600 (2px)", "White", "Teal ring 3px"],
            ["Error", "Error red", "Error Light", "Red ring 3px"],
            ["Disabled", "Slate 200", "Slate 50", "None"],
        ],
        col_widths=[AW * 0.18, AW * 0.27, AW * 0.27, AW * 0.28], s=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Badges & Status"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Status", "Background", "Text Color", "Dot Color"],
        [
            ["Active / Paid", "Success Light", "Success", "Green"],
            ["Pending", "Warning Light", "Warning", "Amber"],
            ["Failed / Overdue", "Error Light", "Error", "Red"],
            ["Draft", "Slate 100", "Slate 600", "Gray"],
            ["Info", "Info Light", "Info", "Blue"],
        ],
        col_widths=[AW * 0.25, AW * 0.25, AW * 0.25, AW * 0.25], s=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Navigation — Sidebar"))
    story.append(Spacer(1, 6))
    for item in [
        "Width: 256px (expanded), 72px (collapsed)",
        "Background: <b>Indigo 900</b>",
        "Text: White (active), Slate 400 (inactive)",
        "Active indicator: Teal 400 left border (3px) + tinted background",
        "Hover: Indigo 700 background",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════
    # 6. Iconography
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(6, "Iconography", AW))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "Icon library: <b>Lucide Icons</b> (open source, consistent, 1000+ icons). "
        "Stroke width: 1.5px default, 2px for POS.", s["body"]))
    story.append(Spacer(1, 8))

    story.append(SubSectionHeader("Icon Sizes"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Size", "Pixels", "Usage"],
        [
            ["xs", "14px", "Inline with small text"],
            ["sm", "16px", "Inline with body, table actions"],
            ["md", "20px", "Navigation items, buttons"],
            ["lg", "24px", "Page headers, feature icons"],
            ["xl", "32px", "Dashboard cards, empty states"],
            ["2xl", "48px", "Onboarding, marketing"],
        ],
        col_widths=[AW * 0.15, AW * 0.20, AW * 0.65], s=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Module Icons"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Module", "Lucide Icon Name"],
        [
            ["Dashboard", "layout-dashboard"],
            ["POS / Sales", "shopping-cart"],
            ["Catalogue", "package"],
            ["Inventory", "warehouse"],
            ["Purchases", "truck"],
            ["Clients", "users"],
            ["Reports", "bar-chart-3"],
            ["Settings", "settings"],
            ["E-Commerce", "globe"],
            ["Finance", "wallet"],
        ],
        col_widths=[AW * 0.40, AW * 0.60], s=s,
    ))

    # ═══════════════════════════════════════
    # 7. Layout Patterns
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(7, "Layout Patterns", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Back-Office / ERP Layout"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "+-------------------------------------------------+\n"
        "|  Sidebar (256px)  |  Top Bar (56px)              |\n"
        "|                   |------------------------------|\n"
        "|  Logo             |  Breadcrumbs    Search  User |\n"
        "|  -----            |------------------------------|\n"
        "|  Dashboard        |                              |\n"
        "|  POS Mode >>>>    |         Main Content         |\n"
        "|  Catalogue        |                              |\n"
        "|  Inventory        |   +--------+  +---------+   |\n"
        "|  Purchases        |   | Card   |  | Card    |   |\n"
        "|  Sales (B2B)      |   +--------+  +---------+   |\n"
        "|  Clients          |                              |\n"
        "|  E-Commerce       |   +---------------------+   |\n"
        "|  Reports          |   |   Table / List      |   |\n"
        "|  -----            |   +---------------------+   |\n"
        "|  Settings         |                              |\n"
        "+-------------------------------------------------+", AW))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("POS Layout (Full Screen Mode)"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "+-------------------------------------------------+\n"
        "| <- Exit POS    Store Name        User    Clock  |\n"
        "|=================================================|\n"
        "|                             |                    |\n"
        "|  Categories (horizontal)    |    Cart            |\n"
        "|  -------------------------  |    --------------- |\n"
        "|                             |    Item 1   $XX   |\n"
        "|  +-----+ +-----+ +-----+   |    Item 2   $XX   |\n"
        "|  |Prod | |Prod | |Prod |   |    Item 3   $XX   |\n"
        "|  |$XX  | |$XX  | |$XX  |   |                   |\n"
        "|  +-----+ +-----+ +-----+   |    --------------- |\n"
        "|                             |    TOTAL    $XXXX  |\n"
        "|  +-----+ +-----+ +-----+   |                    |\n"
        "|  |Prod | |Prod | |Prod |   |  [Hold] [Pay Now]  |\n"
        "|  +-----+ +-----+ +-----+   |                    |\n"
        "+-------------------------------------------------+", AW))

    story.append(Spacer(1, 12))
    story.append(SubSectionHeader("E-Commerce / Marketplace Layout"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "+-------------------------------------------------+\n"
        "| Logo  Categories   Search          Cart   User  |\n"
        "|=================================================|\n"
        "|                                                  |\n"
        "|   Hero Banner / Promotions                       |\n"
        "|                                                  |\n"
        "|-------------------------------------------------|\n"
        "|  +------+ +------+ +------+ +------+            |\n"
        "|  | Img  | | Img  | | Img  | | Img  |            |\n"
        "|  | Name | | Name | | Name | | Name |            |\n"
        "|  | $XX  | | $XX  | | $XX  | | $XX  |            |\n"
        "|  | Shop | | Shop | | Shop | | Shop |            |\n"
        "|  +------+ +------+ +------+ +------+            |\n"
        "|-------------------------------------------------|\n"
        "| Footer: About | Terms | Contact | Socials       |\n"
        "+-------------------------------------------------+", AW))

    # ═══════════════════════════════════════
    # 8. Motion & Animation
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(8, "Motion & Animation", AW))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "Principles: <b>Purposeful</b> (every animation serves a function), "
        "<b>Fast</b> (max 300ms), <b>Subtle</b> (no bouncing or overshooting).", s["body"]))
    story.append(Spacer(1, 8))

    story.append(make_table(
        ["Type", "Duration", "Easing", "Example"],
        [
            ["Micro", "100-150ms", "ease-out", "Button press, toggle, checkbox"],
            ["Standard", "200-250ms", "ease-in-out", "Modal open, dropdown, sidebar"],
            ["Complex", "300ms", "ease-in-out", "Page transition, panel slide"],
            ["Loading", "Infinite", "linear", "Spinner, skeleton pulse"],
        ],
        col_widths=[AW * 0.15, AW * 0.20, AW * 0.20, AW * 0.45], s=s,
    ))

    # ═══════════════════════════════════════
    # 9. Accessibility
    # ═══════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(9, "Accessibility", AW))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Standards: <b>WCAG 2.1 AA</b> minimum. "
                            "<b>AAA</b> for POS critical elements.", s["body"]))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Context", "Minimum Contrast Ratio"],
        [
            ["Body text on background", "4.5:1"],
            ["Large text (18px+)", "3:1"],
            ["Interactive elements", "3:1 against adjacent"],
            ["POS amounts & buttons", "7:1 (AAA)"],
        ],
        col_widths=[AW * 0.50, AW * 0.50], s=s,
    ))
    story.append(Spacer(1, 8))
    for item in [
        "Visible focus ring: 2px solid Teal 600, 3px offset",
        "Touch targets: 44x44px minimum (WCAG), 56x56px for POS",
        "All images with meaningful alt text or aria-hidden",
        "Form fields with associated label elements",
        "Status updates via aria-live regions",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════
    # 10. Data Visualization
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(10, "Data Visualization", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Chart Color Palette"))
    story.append(Spacer(1, 8))
    story.append(ColorSwatch([
        ("#0D9488", "Teal 600"),
        ("#2D3561", "Indigo 700"),
        ("#F59E0B", "Amber 500"),
        ("#F43F5E", "Rose 500"),
        ("#8B5CF6", "Violet 500"),
        ("#0EA5E9", "Sky 500"),
        ("#10B981", "Emerald 500"),
        ("#F97316", "Orange 500"),
    ], AW))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Chart Guidelines"))
    story.append(Spacer(1, 6))
    for item in [
        "Always label axes clearly",
        "Maximum 6-7 colors in a single chart",
        "Data labels on bar charts when space allows",
        "Bar charts for comparisons, line charts for trends",
        "Dashboard KPI cards: large number + trend arrow + mini sparkline",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════
    # 11. Design Tokens
    # ═══════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(11, "Design Tokens (CSS)", AW))
    story.append(Spacer(1, 12))

    story.append(CodeBlock(
        ":root {\n"
        "  /* Primary */\n"
        "  --color-primary-900: #1B1F3B;\n"
        "  --color-primary-700: #2D3561;\n"
        "  --color-accent-600: #0D9488;\n"
        "  --color-accent-400: #2DD4BF;\n"
        "\n"
        "  /* Warm */\n"
        "  --color-warm-500: #F59E0B;\n"
        "  --color-warm-300: #FCD34D;\n"
        "\n"
        "  /* Neutral */\n"
        "  --color-neutral-900: #0F172A;\n"
        "  --color-neutral-800: #1E293B;\n"
        "  --color-neutral-500: #64748B;\n"
        "  --color-neutral-200: #E2E8F0;\n"
        "  --color-neutral-50: #F8FAFC;\n"
        "\n"
        "  /* Semantic */\n"
        "  --color-success: #059669;\n"
        "  --color-warning: #D97706;\n"
        "  --color-error: #DC2626;\n"
        "  --color-info: #2563EB;\n"
        "\n"
        "  /* Typography */\n"
        "  --font-sans: 'Inter', system-ui, sans-serif;\n"
        "  --font-mono: 'JetBrains Mono', monospace;\n"
        "\n"
        "  /* Spacing (base 4px) */\n"
        "  --space-1: 4px;  --space-2: 8px;\n"
        "  --space-3: 12px; --space-4: 16px;\n"
        "  --space-6: 24px; --space-8: 32px;\n"
        "\n"
        "  /* Radius */\n"
        "  --radius-sm: 4px;  --radius-md: 8px;\n"
        "  --radius-lg: 12px; --radius-full: 9999px;\n"
        "\n"
        "  /* Transitions */\n"
        "  --transition-fast: 150ms ease-out;\n"
        "  --transition-base: 200ms ease-in-out;\n"
        "  --transition-slow: 300ms ease-in-out;\n"
        "}", AW))

    # ═══════════════════════════════════════
    # 12. Print & Documents
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(12, "Print & Document Styling", AW))
    story.append(Spacer(1, 12))

    story.append(SubSectionHeader("Thermal Receipt (80mm)"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Width:        80mm (printable: 72mm)\n"
        "Font:         Monospace, 10pt\n"
        "Line spacing: 1.2\n"
        "Sections:     Store header -> Items -> Totals -> Payment -> Footer\n"
        "Logo:         Centered, max 48mm wide, grayscale bitmap", AW))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("A4 Documents (Invoices, Quotes)"))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Element", "Style"],
        [
            ["Header", "Company logo (left) + doc title (right), Indigo 900 accent line"],
            ["Body", "Inter 10pt, Slate 800, 1.5 line height"],
            ["Tables", "Indigo 900 header, alternating Slate 50 rows"],
            ["Footer", "Page number, company info, legal mentions"],
            ["Accent", "Teal 600 for section dividers and highlights"],
        ],
        col_widths=[AW * 0.20, AW * 0.80], s=s,
    ))

    story.append(Spacer(1, 14))
    story.append(SubSectionHeader("File & Asset Naming"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Icons:       icon-{name}-{size}.svg        (icon-cart-24.svg)\n"
        "Images:      img-{context}-{desc}.png      (img-hero-dashboard.png)\n"
        "Components:  PascalCase                    (ProductCard.tsx)\n"
        "Tokens:      kebab-case                    (--color-primary-900)\n"
        "CSS Modules: camelCase                     (productCard.module.css)", AW))

    # ─── Build ───
    doc.build(story)
    print(f"PDF generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_pdf()
