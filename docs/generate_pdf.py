#!/usr/bin/env python3
"""
LIBITEX Document Complet — PDF Generator
Corporate modern design with professional layout
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Frame, PageTemplate, BaseDocTemplate,
    NextPageTemplate, Flowable
)
from reportlab.pdfgen import canvas
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Colors ───
DARK_NAVY = HexColor("#0F2027")
NAVY = HexColor("#0F4C75")
TEAL = HexColor("#1B6B93")
LIGHT_TEAL = HexColor("#A7D5E1")
GOLD = HexColor("#C9963B")
LIGHT_GOLD = HexColor("#F5E6CC")
BG_LIGHT = HexColor("#F7F9FC")
BG_CODE = HexColor("#EEF1F5")
BORDER_LIGHT = HexColor("#D1D9E6")
TEXT_DARK = HexColor("#1A202C")
TEXT_MID = HexColor("#4A5568")
TEXT_LIGHT = HexColor("#718096")
WHITE = white
ACCENT_GREEN = HexColor("#047857")
ACCENT_RED = HexColor("#DC2626")
TABLE_HEADER_BG = HexColor("#0F4C75")
TABLE_ROW_ALT = HexColor("#F0F4F8")
TABLE_BORDER = HexColor("#CBD5E0")

PAGE_W, PAGE_H = A4
MARGIN_LEFT = 25 * mm
MARGIN_RIGHT = 25 * mm
MARGIN_TOP = 25 * mm
MARGIN_BOTTOM = 25 * mm


# ─── Custom Flowables ───

class HorizontalRule(Flowable):
    def __init__(self, width, color=BORDER_LIGHT, thickness=0.5):
        Flowable.__init__(self)
        self.width = width
        self.color = color
        self.thickness = thickness

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return (availWidth, self.thickness + 2)


class GoldAccentLine(Flowable):
    def __init__(self, width=60*mm):
        Flowable.__init__(self)
        self.line_width = width

    def draw(self):
        self.canv.setStrokeColor(GOLD)
        self.canv.setLineWidth(2)
        self.canv.line(0, 0, self.line_width, 0)

    def wrap(self, availWidth, availHeight):
        return (self.line_width, 4)


class SectionHeader(Flowable):
    def __init__(self, number, title, width):
        Flowable.__init__(self)
        self.number = number
        self.title = title
        self.fw = width

    def draw(self):
        c = self.canv
        # Gold left bar
        c.setFillColor(GOLD)
        c.rect(0, 0, 4, 28, fill=1, stroke=0)
        # Number badge
        c.setFillColor(NAVY)
        c.roundRect(14, 2, 30, 24, 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 13)
        num_str = str(self.number)
        tw = c.stringWidth(num_str, "Helvetica-Bold", 13)
        c.drawString(14 + (30 - tw) / 2, 9, num_str)
        # Title
        c.setFillColor(DARK_NAVY)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(52, 7, self.title)

    def wrap(self, availWidth, availHeight):
        self.fw = availWidth
        return (availWidth, 34)


class SubSectionHeader(Flowable):
    def __init__(self, title):
        Flowable.__init__(self)
        self.title = title

    def draw(self):
        c = self.canv
        c.setStrokeColor(TEAL)
        c.setLineWidth(1.5)
        c.line(0, 0, 20, 0)
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(26, -3, self.title)

    def wrap(self, availWidth, availHeight):
        return (availWidth, 14)


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
        # Background
        c.setFillColor(BG_CODE)
        c.setStrokeColor(BORDER_LIGHT)
        c.setLineWidth(0.5)
        c.roundRect(0, 0, self.fw, h, 4, fill=1, stroke=1)
        # Left accent bar
        c.setFillColor(TEAL)
        c.rect(0, 0, 3, h, fill=1, stroke=0)
        # Text
        c.setFillColor(TEXT_DARK)
        c.setFont("Courier", 8)
        y = h - self.padding - 2
        for line in self.lines:
            c.drawString(self.padding + 6, y, line[:100])
            y -= self.line_h

    def wrap(self, availWidth, availHeight):
        self.fw = availWidth - 10
        h = len(self.lines) * self.line_h + 2 * self.padding
        return (availWidth, h + 4)


# ─── Page Templates ───

def cover_page(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    w, h = PAGE_W, PAGE_H

    # Full dark navy background
    c.setFillColor(DARK_NAVY)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # Subtle geometric pattern (top right corner)
    c.setStrokeColor(HexColor("#1a3a4a"))
    c.setLineWidth(0.3)
    for i in range(0, 200, 15):
        c.line(w - 200 + i, h, w, h - 200 + i)

    # Gold accent line at top
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.line(60, h - 60, w - 60, h - 60)

    # Company name
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 42)
    c.drawString(60, h - 140, "LIBITEX")

    # Thin separator
    c.setStrokeColor(HexColor("#2a5a6a"))
    c.setLineWidth(0.5)
    c.line(60, h - 160, 280, h - 160)

    # Subtitle
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 13)
    c.drawString(60, h - 190, "Plateforme ERP, POS & E-Commerce")
    c.drawString(60, h - 210, "Nouvelle Generation")

    # Main title block
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(60, h - 310, "Document Complet")
    c.drawString(60, h - 345, "de Projet")

    # Gold underline for title
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.line(60, h - 360, 320, h - 360)

    # Description
    c.setFillColor(LIGHT_TEAL)
    c.setFont("Helvetica", 11)
    desc_lines = [
        "Specifications fonctionnelles, architecture technique,",
        "modules metier et strategie de deploiement pour une",
        "plateforme ERP complete destinee aux commercants",
        "generalistes en Afrique.",
    ]
    y = h - 400
    for line in desc_lines:
        c.drawString(60, y, line)
        y -= 18

    # Bottom info box
    c.setFillColor(HexColor("#0a1a24"))
    c.roundRect(40, 60, w - 80, 100, 6, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.5)
    c.roundRect(40, 60, w - 80, 100, 6, fill=0, stroke=1)

    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 9)
    c.drawString(60, 135, "VERSION")
    c.drawString(200, 135, "DATE")
    c.drawString(340, 135, "STATUT")

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(60, 110, "1.0")
    c.drawString(200, 110, "7 Avril 2026")
    c.drawString(340, 110, "Document de Reference")

    c.setFillColor(GOLD)
    c.setFont("Helvetica", 9)
    c.drawString(60, 80, "CONFIDENTIEL")

    c.restoreState()


def header_footer(canvas_obj, doc):
    c = canvas_obj
    c.saveState()
    w, h = PAGE_W, PAGE_H

    # Header line
    c.setStrokeColor(NAVY)
    c.setLineWidth(1.5)
    c.line(MARGIN_LEFT, h - 18 * mm, w - MARGIN_RIGHT, h - 18 * mm)

    # Header text
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN_LEFT, h - 16 * mm, "LIBITEX")

    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 7)
    c.drawRightString(w - MARGIN_RIGHT, h - 16 * mm, "Document Complet de Projet — v1.0")

    # Gold accent dot
    c.setFillColor(GOLD)
    c.circle(MARGIN_LEFT + 42, h - 15.5 * mm, 1.5, fill=1, stroke=0)

    # Footer line
    c.setStrokeColor(BORDER_LIGHT)
    c.setLineWidth(0.5)
    c.line(MARGIN_LEFT, MARGIN_BOTTOM - 5 * mm, w - MARGIN_RIGHT, MARGIN_BOTTOM - 5 * mm)

    # Footer
    c.setFillColor(TEXT_LIGHT)
    c.setFont("Helvetica", 7)
    c.drawString(MARGIN_LEFT, MARGIN_BOTTOM - 10 * mm, "LIBITEX — Confidentiel")

    # Page number with style
    page_num = doc.page - 1  # subtract cover page
    if page_num > 0:
        c.setFillColor(NAVY)
        c.roundRect(w - MARGIN_RIGHT - 20, MARGIN_BOTTOM - 12 * mm, 28, 16, 3, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(w - MARGIN_RIGHT - 6, MARGIN_BOTTOM - 9.5 * mm, str(page_num))

    c.restoreState()


# ─── Styles ───

def get_styles():
    s = {}

    s["body"] = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=TEXT_DARK,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )

    s["body_bold"] = ParagraphStyle(
        "body_bold",
        parent=s["body"],
        fontName="Helvetica-Bold",
    )

    s["bullet"] = ParagraphStyle(
        "bullet",
        parent=s["body"],
        leftIndent=16,
        bulletIndent=6,
        spaceBefore=2,
        spaceAfter=2,
    )

    s["bullet2"] = ParagraphStyle(
        "bullet2",
        parent=s["bullet"],
        leftIndent=32,
        bulletIndent=22,
    )

    s["h1"] = ParagraphStyle(
        "h1",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=24,
        textColor=DARK_NAVY,
        spaceBefore=20,
        spaceAfter=10,
    )

    s["h2"] = ParagraphStyle(
        "h2",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=NAVY,
        spaceBefore=14,
        spaceAfter=6,
    )

    s["h3"] = ParagraphStyle(
        "h3",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=TEAL,
        spaceBefore=10,
        spaceAfter=4,
    )

    s["toc_h1"] = ParagraphStyle(
        "toc_h1",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=18,
        textColor=NAVY,
        leftIndent=10,
    )

    s["toc_h2"] = ParagraphStyle(
        "toc_h2",
        fontName="Helvetica",
        fontSize=9,
        leading=15,
        textColor=TEXT_MID,
        leftIndent=25,
    )

    s["caption"] = ParagraphStyle(
        "caption",
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=TEXT_LIGHT,
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=8,
    )

    s["table_header"] = ParagraphStyle(
        "table_header",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=WHITE,
    )

    s["table_cell"] = ParagraphStyle(
        "table_cell",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK,
    )

    s["table_cell_bold"] = ParagraphStyle(
        "table_cell_bold",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK,
    )

    return s


# ─── Table Helper ───

def make_table(headers, rows, col_widths=None, styles_dict=None):
    if styles_dict is None:
        styles_dict = get_styles()
    s = styles_dict

    header_cells = [Paragraph(h, s["table_header"]) for h in headers]
    data = [header_cells]
    for row in rows:
        data.append([Paragraph(str(cell), s["table_cell"]) for cell in row])

    avail = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    if col_widths is None:
        n = len(headers)
        col_widths = [avail / n] * n

    t = Table(data, colWidths=col_widths, repeatRows=1)

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]
    # Alternating row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), TABLE_ROW_ALT))

    t.setStyle(TableStyle(style_cmds))
    return t


def make_table_bold_first_col(headers, rows, col_widths=None, styles_dict=None):
    if styles_dict is None:
        styles_dict = get_styles()
    s = styles_dict

    header_cells = [Paragraph(h, s["table_header"]) for h in headers]
    data = [header_cells]
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            st = s["table_cell_bold"] if i == 0 else s["table_cell"]
            cells.append(Paragraph(str(cell), st))
        data.append(cells)

    avail = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT
    if col_widths is None:
        n = len(headers)
        col_widths = [avail / n] * n

    t = Table(data, colWidths=col_widths, repeatRows=1)

    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), TABLE_ROW_ALT))

    t.setStyle(TableStyle(style_cmds))
    return t


# ─── Document Builder ───

def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "LIBITEX_DOCUMENT_COMPLET.pdf")
    avail_w = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT

    doc = BaseDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN_LEFT,
        rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="LIBITEX — Document Complet de Projet",
        author="LIBITEX",
        subject="ERP, POS & E-Commerce Nouvelle Generation",
    )

    # Page templates
    cover_template = PageTemplate(
        id="cover",
        frames=[Frame(0, 0, PAGE_W, PAGE_H, id="cover_frame",
                       leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
        onPage=cover_page,
    )

    normal_frame = Frame(
        MARGIN_LEFT, MARGIN_BOTTOM,
        PAGE_W - MARGIN_LEFT - MARGIN_RIGHT,
        PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
        id="normal",
    )
    normal_template = PageTemplate(id="normal", frames=[normal_frame], onPage=header_footer)

    doc.addPageTemplates([cover_template, normal_template])

    s = get_styles()
    story = []

    # ─── Cover Page ───
    story.append(NextPageTemplate("normal"))
    story.append(Spacer(1, PAGE_H))  # fill cover
    story.append(PageBreak())

    # ─── Table of Contents ───
    story.append(Paragraph("Table des Matieres", s["h1"]))
    story.append(GoldAccentLine(80 * mm))
    story.append(Spacer(1, 10))

    toc_sections = [
        ("1", "Resume Executif"),
        ("2", "Problematique du Marche"),
        ("3", "Vision et Objectifs"),
        ("4", "Description Generale de la Solution"),
        ("5", "Architecture Technique"),
        ("6", "Module Catalogue & Produits"),
        ("7", "Module Achats & Importation (Landed Cost)"),
        ("8", "Module Stock & Logistique (WMS)"),
        ("9", "Module Vente au Detail (POS)"),
        ("10", "Module Vente en Gros (B2B)"),
        ("11", "Module E-Commerce (Marketplace & Boutiques)"),
        ("12", "Module Back-Office Commercant"),
        ("13", "Module Administration Plateforme"),
        ("14", "Securite, RBAC & Audit"),
        ("15", "Synchronisation Offline-First"),
        ("16", "Pilotage & Tableaux de Bord"),
        ("17", "Comptabilite & Conformite Fiscale"),
        ("18", "Impressions & Documents"),
        ("19", "Migration & Onboarding"),
        ("20", "Multi-Tenancy & SaaS"),
        ("21", "Strategie de Tests"),
        ("22", "Deploiement & Infrastructure"),
        ("23", "Roadmap de Developpement"),
        ("24", "Opportunite d'Investissement"),
    ]

    toc_data = []
    for num, title in toc_sections:
        toc_data.append([
            Paragraph(f'<font color="{GOLD.hexval()}">{num}.</font>', s["toc_h1"]),
            Paragraph(title, s["toc_h1"]),
        ])

    toc_table = Table(toc_data, colWidths=[30, avail_w - 40])
    toc_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER_LIGHT),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # SECTION 1 — Resume Executif
    # ═══════════════════════════════════════════════════════════
    story.append(SectionHeader(1, "Resume Executif", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Le projet LIBITEX vise la conception et le deploiement d'une plateforme ERP "
        "commerciale integree, articulee autour de <b>3 acteurs principaux</b> :", s["body"]
    ))
    for item in [
        "<b>Administrateurs Plateforme</b> : gestion globale SaaS (web, desktop si besoin natif sinon PWA)",
        "<b>Commercants &amp; equipes</b> : ERP + POS unifies dans une seule application (web, desktop si besoin natif sinon PWA, + mobile allegee)",
        "<b>Consommateurs (Clients)</b> : marketplace et boutiques e-commerce (web uniquement)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "La plateforme cible les commerces generalistes operant dans la vente de gros, "
        "semi-gros et detail, avec un focus sur les marches africains ou la connectivite "
        "Internet est instable.", s["body"]
    ))

    story.append(Spacer(1, 6))
    story.append(SubSectionHeader("Chaine de valeur couverte"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Achats internationaux (Europe, Chine)\n"
        "  -> Importation & Calcul du cout reel (Landed Cost)\n"
        "    -> Gestion centralisee des stocks (entrepot -> boutiques)\n"
        "      -> Vente multi-canal (POS, B2B, E-commerce)\n"
        "        -> Pilotage strategique en temps reel",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 2 — Problematique du Marche
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(2, "Problematique du Marche", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Les acteurs du commerce generaliste font face a plusieurs difficultes structurelles :",
        s["body"]
    ))
    story.append(Spacer(1, 4))

    story.append(make_table_bold_first_col(
        ["Probleme", "Impact"],
        [
            ["Logiciels de caisse limites", "Pas de gestion globale de l'activite"],
            ["ERP internationaux couteux et complexes", "Mal adaptes au contexte local"],
            ["Couts d'importation mal maitrises", "Pas de visibilite sur les marges reelles"],
            ["Mauvaise gestion des stocks", "Pertes financieres (vols, avaries, peremption)"],
            ["Gros et detail dans le meme commerce", "Regles tarifaires et logistiques differentes"],
            ["Absence de canal e-commerce", "Marche limite a la zone geographique physique"],
            ["Connectivite instable", "Impossibilite d'utiliser des solutions 100% cloud"],
        ],
        col_widths=[avail_w * 0.45, avail_w * 0.55],
        styles_dict=s,
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Constat :</b> il existe un vide sur le marche pour une solution intermediaire — "
        "puissante mais accessible, adaptee au terrain, et capable de fonctionner offline.",
        s["body"]
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 3 — Vision et Objectifs
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(3, "Vision et Objectifs", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("Vision"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Creer la plateforme technologique de reference permettant aux commercants africains "
        "de gerer efficacement leur activite, de la source d'approvisionnement jusqu'au client "
        "final, y compris en ligne.",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Objectifs strategiques"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Centraliser</b> toutes les operations commerciales dans un seul systeme",
        "<b>Reduire les pertes</b> et ameliorer la rentabilite grace a la tracabilite",
        "<b>Offrir une visibilite en temps reel</b> aux dirigeants (mobile, desktop, web)",
        "<b>Ouvrir un canal e-commerce</b> pour chaque commercant (marketplace + boutique individuelle)",
        "<b>Accompagner la croissance</b> : d'une boutique unique a un reseau multi-sites",
        "<b>Garantir la continuite</b> des operations meme sans Internet",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 4 — Description Generale de la Solution
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(4, "Description Generale de la Solution", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "La solution est un <b>ERP modulaire</b> compose de plusieurs modules interconnectes "
        "mais deployables progressivement.",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Les 3 acteurs et leurs applications"))
    story.append(Spacer(1, 6))

    story.append(make_table_bold_first_col(
        ["Acteur", "Application", "Technologie", "Usage"],
        [
            ["Admin Plateforme", "App Admin", "Next.js (PWA) + Tauri si natif", "Gestion globale SaaS"],
            ["Commercant", "App Commercant", "Next.js (PWA) + Tauri si natif", "ERP + POS unifie, tout-en-un"],
            ["Commercant", "App Mobile", "React Native", "Version allegee : pilotage"],
            ["Consommateur", "App E-Commerce", "Next.js (SSR/SSG)", "Marketplace + boutiques"],
        ],
        col_widths=[avail_w * 0.18, avail_w * 0.20, avail_w * 0.30, avail_w * 0.32],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Principe cle :</b> le POS et l'ERP (back-office) sont une <b>seule et meme "
        "application</b> pour le commercant. Pas de separation entre \"caisse\" et "
        "\"gestion\" — tout est integre dans une interface unifiee.",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Strategie Desktop : PWA-first, Tauri si necessaire"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Par defaut</b> : l'app web est une PWA installable, Service Workers pour offline basique",
        "<b>Tauri</b> : deploye uniquement si besoin natif (impression ESC/POS, tiroir-caisse, SQLite)",
        "La PWA couvre 80% des cas. Tauri est un \"upgrade\" pour le materiel POS physique",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Partage du code frontend"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "packages/\n"
        "  ui/                  # Composants UI partages (React)\n"
        "  shared/              # Types, utils, constantes partagees\n"
        "\n"
        "apps/\n"
        "  web-merchant/        # Next.js - App Commercant (ERP + POS)\n"
        "  web-marketplace/     # Next.js - E-Commerce (Marketplace + Boutiques)\n"
        "  web-admin/           # Next.js - Admin Plateforme\n"
        "  desktop-merchant/    # Tauri - Wrapper App Commercant (si natif)\n"
        "  mobile-merchant/     # React Native - App Mobile (allegee)",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Principe Tauri :</b> Tauri embarque une WebView qui charge l'application Next.js. "
        "Le meme code frontend sert pour le web et le desktop, avec des hooks conditionnels "
        "pour les fonctionnalites natives (impression, acces fichiers, SQLite local via le "
        "bridge Rust de Tauri).",
        s["body"]
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 5 — Architecture Technique
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(5, "Architecture Technique", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("5.1 Stack Technologique"))
    story.append(Spacer(1, 6))

    story.append(make_table_bold_first_col(
        ["Couche", "Technologie", "Justification"],
        [
            ["Backend API principal", "NestJS (TypeScript)", "DDD, modularite, ecosystem mature, guards RBAC"],
            ["Backend haute perf.", "Rust (Axum)", "Sync engine, calculs financiers, operations critiques"],
            ["Frontend Web (3 apps)", "Next.js (React)", "App Commercant, E-Commerce, Admin"],
            ["Desktop (si natif)", "Tauri (Rust + WebView)", "Wrapper App Commercant, peripheriques POS"],
            ["Mobile Commercant", "React Native", "Version allegee : pilotage, notifications"],
            ["DB Cloud", "PostgreSQL", "Robustesse, requetes complexes, JSONB"],
            ["DB Locale", "IndexedDB (PWA) / SQLite (Tauri)", "Offline POS et desktop"],
            ["File de messages", "Redis (BullMQ)", "Evenements metier, sync offline"],
            ["Cache", "Redis", "Sessions, cache catalogue, rate limiting"],
            ["Stockage fichiers", "S3 (MinIO / AWS)", "Images produits, documents, factures PDF"],
            ["Recherche", "Meilisearch", "Recherche produits rapide et tolerante"],
        ],
        col_widths=[avail_w * 0.22, avail_w * 0.28, avail_w * 0.50],
        styles_dict=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("5.2 Repartition NestJS / Rust (Axum)"))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>NestJS — Orchestrateur metier :</b>", s["body"]))
    for item in [
        "Authentification et autorisation (JWT, RBAC)",
        "CRUD et logique metier de tous les modules",
        "API REST / GraphQL pour les frontends",
        "Webhooks et integrations tierces",
        "Gestion des fichiers et medias",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Rust (Axum) — Moteur de performance :</b>", s["body"]))
    for item in [
        "<b>Sync Engine</b> : resolution des conflits offline, merge des evenements",
        "<b>Calculs financiers</b> : Landed Cost, CUMP, marges, valorisation stock",
        "<b>Moteur de regles tarifaires</b> : grilles de prix, promotions, remises",
        "<b>Traitement batch</b> : imports massifs, recalcul de stock, rapports lourds",
        "<b>Gestion des evenements</b> : consommation/production BullMQ a haut debit",
        "<b>Bridge Tauri</b> : fonctions natives pour l'application desktop",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("5.3 Schema d'Architecture"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Clients (App Commercant Next.js/Tauri | E-Com Next.js | Admin)\n"
        "         |  HTTPS / WebSocket\n"
        "         v\n"
        "   Caddy / Traefik  (Reverse Proxy, SSL, Routing Domaines)\n"
        "         |\n"
        "   +-----+-----+----------+\n"
        "   |           |          |\n"
        "NestJS API   Rust Axum   Redis\n"
        " (Metier)   (Sync/Perf)  (Cache/Queue)\n"
        "   |           |\n"
        "   +-----+-----+\n"
        "         |\n"
        "   PostgreSQL (+ RLS)   Meilisearch   MinIO (S3)",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("5.4 Modele de donnees — Principes"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Event Sourcing pour le stock</b> : tout passe par des evenements, le stock courant est une vue materialisee",
        "<b>Soft Delete partout</b> : aucune suppression physique, champ deleted_at",
        "<b>Audit trail</b> : chaque mutation sensible loggee (who, when, what, before, after)",
        "<b>Multi-tenant</b> : chaque table possede un tenant_id",
        "<b>Horodatage UTC</b> : toutes les dates en UTC, conversion locale cote client",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 6 — Catalogue & Produits
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(6, "Module Catalogue & Produits", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("6.1 Polymorphisme Produit"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Le systeme supporte 4 comportements d'articles via une <b>Type Strategy</b> :",
        s["body"]
    ))
    story.append(Spacer(1, 4))

    story.append(make_table_bold_first_col(
        ["Type", "Description", "Exemple", "Gestion Stock"],
        [
            ["SIMPLE", "Produit standard", "Chaises, stylos", "Quantite"],
            ["VARIANT", "Declinaisons (taille, couleur)", "Vetements, chaussures", "Quantite par variante"],
            ["SERIALIZED", "Unique par N/S", "Telephones, PC", "1 par 1, IMEI obligatoire"],
            ["PERISHABLE", "Date de peremption", "Alimentaire", "Par lot, regle FEFO"],
        ],
        col_widths=[avail_w * 0.17, avail_w * 0.27, avail_w * 0.25, avail_w * 0.31],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("6.2 Schema de base"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "products (produit parent)\n"
        "  id, tenant_id, name, description, product_type\n"
        "  category_id, brand_id, supplier_id\n"
        "  images[], barcode_ean13, barcode_internal\n"
        "  tax_rate, weight, dimensions, is_active\n"
        "\n"
        "variants (SKU)\n"
        "  id, product_id, sku\n"
        "  attributes (JSONB: {taille: \"M\", couleur: \"Bleu\"})\n"
        "  price_purchase, price_landed, price_retail, price_wholesale\n"
        "  barcode, is_active\n"
        "\n"
        "batches (lots - PERISHABLE)\n"
        "  id, variant_id, batch_number, expiry_date, quantity_remaining\n"
        "\n"
        "serials (numeros de serie - SERIALIZED)\n"
        "  id, variant_id, serial_number\n"
        "  status: IN_STOCK | SOLD | RETURNED | DEFECTIVE",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("6.3 Algorithme de vente selon le type"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "1. Scanner SKU / code-barres\n"
        "2. Charger le product_type\n"
        "3. Switch :\n"
        "   SIMPLE     -> decrementer quantite\n"
        "   VARIANT    -> decrementer la variante scannee\n"
        "   SERIALIZED -> exiger saisie/scan IMEI, marquer SOLD\n"
        "   PERISHABLE -> sortie automatique FEFO (lot + proche expiration)",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("6.4 Gestion Tarifaire & Recherche"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Multi-tarifs</b> : Prix Achat, Prix Revient, Prix Public, Prix Gros, Prix VIP",
        "<b>Grilles conditionnelles</b> : quantite minimum, type client, periode (moteur Rust)",
        "<b>Codes-barres multiples</b> : EAN13 international + code interne genere",
        "<b>Recherche Meilisearch</b> : full-text, tolerante aux fautes, indexation temps reel",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 7 — Achats & Importation
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(7, "Module Achats & Importation", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Objectif :</b> calculer la rentabilite reelle de chaque produit.", s["body"]))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("7.1 Commandes Fournisseurs"))
    story.append(Spacer(1, 6))
    for item in [
        "Creation de bons de commande (Purchase Orders)",
        "<b>Multi-devises</b> : saisie en USD, EUR, CNY, taux de change fige a la validation",
        "Gestion des <b>ecarts de change</b> a la reception (gain/perte comptabilise)",
        "Statuts : Brouillon -> Validee -> Partiellement Recue -> Recue -> Cloturee",
        "Gestion des <b>reliquats</b> (backorders)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("7.2 Calcul du Landed Cost"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Cout Unitaire Debarque =\n"
        "  Prix Achat Unitaire + (Frais Totaux / Quantite Totale)\n"
        "\n"
        "Frais Totaux =\n"
        "  Transport + Douanes + Transit + Assurance + Manutention\n"
        "\n"
        "Algorithme (execute par Rust/Axum):\n"
        "  pour chaque article dans reception:\n"
        "    part = article.quantite / quantite_totale\n"
        "    article.cout_debarque = prix_achat + (frais_totaux * part)\n"
        "\n"
        "  Recalcul CUMP:\n"
        "    nouveau = (stock * ancien_cump + qte_recue * cout_debarque)\n"
        "            / (stock + qte_recue)",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("7.3 Reception Marchandise"))
    story.append(Spacer(1, 6))
    for item in [
        "Confrontation Commande vs Reception (ecarts signales)",
        "Saisie des numeros de serie (SERIALIZED) et lots/DLC (PERISHABLE)",
        "Generation d'etiquettes code-barres a l'arrivee",
        "Photos des marchandises (constat avaries)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 8 — Stock & Logistique
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(8, "Module Stock & Logistique (WMS)", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<b>Principe fondamental :</b> le stock n'est jamais modifie directement. "
        "Tout passe par des evenements.",
        s["body"]
    ))
    story.append(Spacer(1, 6))

    story.append(make_table_bold_first_col(
        ["Evenement", "Description"],
        [
            ["STOCK_IN", "Entree de stock (reception fournisseur)"],
            ["STOCK_OUT", "Sortie de stock (vente)"],
            ["TRANSFER_OUT", "Sortie pour transfert inter-sites"],
            ["TRANSFER_IN", "Entree par transfert inter-sites"],
            ["ADJUSTMENT", "Ajustement d'inventaire (+ ou -)"],
            ["RETURN_IN", "Retour client"],
            ["DEFECTIVE_OUT", "Sortie vers stock defectueux"],
            ["WRITE_OFF", "Sortie pour perte / destruction"],
        ],
        col_widths=[avail_w * 0.30, avail_w * 0.70],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Transferts Inter-Sites — Workflow"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "1. Boutique cree une demande de transfert\n"
        "2. Entrepot valide la demande\n"
        "3. Preparation de la commande interne\n"
        "4. Sortie stock entrepot (TRANSFER_OUT) - scan des articles\n"
        "5. Expedition (numero de suivi optionnel)\n"
        "6. Reception boutique (TRANSFER_IN) - scan de verification\n"
        "7. Ecarts signales si difference entre envoye et recu",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Inventaires & Alertes"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Inventaire aveugle</b> : l'employe compte sans voir le stock theorique",
        "Justification obligatoire par le manager pour chaque ecart",
        "Verrouillage des mouvements pendant l'inventaire d'une zone",
        "<b>Alertes</b> : stock bas, DLC proche, stock dormant, ecart anormal",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 9 — POS
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(9, "Module Vente au Detail (POS)", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<b>Integre dans l'App Commercant</b> (Next.js) — POS et ERP dans la meme application. "
        "Mode POS plein ecran optimise pour la vente au comptoir. "
        "<b>PWA</b> offline via Service Workers + IndexedDB. "
        "<b>Tauri</b> si besoin natif (imprimante, tiroir-caisse).",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Fonctionnalites de Vente"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Recherche intelligente</b> : scan code-barres, texte, selection visuelle par categorie",
        "<b>Panier mixte</b> : T-shirt (variante) + telephone (IMEI) + jus (FEFO) sur un meme ticket",
        "<b>Park/Hold</b> : mettre un panier en attente pour le client suivant",
        "<b>Remises</b> : pourcentage ou montant, sur ligne ou ticket (selon permissions)",
        "<b>Retours et echanges</b> : avec reference au ticket original",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Paiements & Caisse"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Multi-reglements</b> : 50% especes + 50% mobile money sur un meme ticket",
        "Moyens : especes, carte bancaire, mobile money, virement, credit client",
        "<b>Fond de caisse</b> : ouverture avec montant initial, fermeture avec comptage",
        "Impression ticket thermique 80mm ou envoi SMS/email",
        "Ouverture tiroir-caisse journalisee (meme sans vente)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Mode Deconnecte"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Toutes les fonctionnalites de vente restent disponibles hors ligne. "
        "<b>PWA</b> : ventes dans IndexedDB, Service Workers interceptent les requetes. "
        "<b>Tauri</b> : ventes dans SQLite local via bridge Rust. "
        "Les evenements sont mis en file d'attente et synchronises automatiquement.",
        s["body"]
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 10 — B2B
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(10, "Module Vente en Gros (B2B)", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Interface de bureau (Next.js / Tauri) pour les commerciaux.",
        s["body"]
    ))

    story.append(Spacer(1, 6))
    story.append(SubSectionHeader("Cycle de Vente B2B"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Devis -> Facture Proforma -> Bon de Livraison -> Facture Finale\n"
        "\n"
        "Chaque etape = changement d'etat, jamais suppression.",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Compte Client"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Plafonnement de l'encours</b> : credit maximum autorise, blocage automatique si depasse",
        "Historique des achats et suivi des paiements differes (creances)",
        "Conditions de paiement par client : comptant, 30j, 60j",
        "Gestion de la TVA et mentions legales sur documents A4",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 11 — E-Commerce
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(11, "Module E-Commerce", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Le module e-commerce offre <b>deux modes</b> : une marketplace multi-commercants "
        "et des boutiques individuelles a domaine personnalise.",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Marketplace"))
    story.append(Spacer(1, 6))
    for item in [
        "Catalogue unifie : produits de tous les commercants visibles",
        "Recherche et filtres par categorie, commercant, prix, localisation",
        "Panier multi-commercants (commande splitee a la validation)",
        "Systeme d'avis et notation",
        "Pages profil commercant",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Boutique Individuelle"))
    story.append(Spacer(1, 6))
    for item in [
        "Activation par le commercant de son espace boutique",
        "<b>Sous-domaine automatique</b> : nom-boutique.libitex.com",
        "<b>Domaine personnalise</b> : le commercant connecte son propre domaine",
        "Gestion DNS automatisee + certificat SSL Let's Encrypt",
        "Personnalisation : logo, couleurs, banniere, pages statiques",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Paiements E-Commerce"))
    story.append(Spacer(1, 6))
    for item in [
        "Mobile money (Wave, Orange Money), cartes bancaires (Stripe / PayDunya)",
        "Paiement a la livraison (COD)",
        "<b>Commission plateforme</b> : pourcentage configurable par categorie/commercant",
        "Reversement automatique aux commercants (cycle configurable)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Architecture E-Commerce"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Resolution du tenant :\n"
        "  Sous-domaine : maboutique.libitex.com -> tenant_id\n"
        "  Domaine perso : lookup table custom_domains -> tenant_id\n"
        "  Marketplace  : pas de filtrage, catalogue global\n"
        "\n"
        "Next.js SSR/SSG pour le SEO\n"
        "CDN pour images et assets\n"
        "Meilisearch pour la recherche produits",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 12 — Back-Office Commercant
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(12, "App Commercant — ERP + POS Unifie", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Le POS et le back-office (ERP) sont <b>une seule et meme application</b> Next.js. "
        "Le commercant navigue entre les modules via un menu lateral, dont un "
        "<b>mode POS plein ecran</b> optimise pour la vente au comptoir.",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Acces Multi-Plateforme"))
    story.append(Spacer(1, 6))

    story.append(make_table_bold_first_col(
        ["Support", "Technologie", "Usage"],
        [
            ["Navigateur", "Next.js (PWA)", "Acces complet ERP + POS, installable"],
            ["Desktop", "Tauri (meme code)", "Si besoin natif (impression, peripheriques)"],
            ["Mobile", "React Native", "Version allegee : pilotage, notifications"],
        ],
        col_widths=[avail_w * 0.17, avail_w * 0.33, avail_w * 0.50],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Fonctionnalites Web / Desktop (ERP + POS)"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>POS</b> : mode vente plein ecran, scan, panier, paiements, tickets",
        "Gestion complete du catalogue, achats, stocks, transferts",
        "Ventes B2B (devis, factures, BL), clients et creances",
        "Rapports, tableaux de bord, config e-commerce, employes",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("App Mobile (React Native — allegee)"))
    story.append(Spacer(1, 6))
    for item in [
        "Dashboard temps reel (CA, ventes du jour, alertes)",
        "Notifications push (commande e-commerce, alerte stock)",
        "Validation de transferts et ajustements, scan camera",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Tauri Desktop (si necessaire)"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>Impression directe</b> : ESC/POS thermique et laser sans dialogue navigateur",
        "<b>Peripheriques</b> : tiroir-caisse, afficheur client, balance",
        "<b>SQLite local</b> : offline robuste pour connectivite tres instable",
        "<b>Acces fichiers</b> : import/export CSV massif, sauvegarde locale",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 13 — Administration Plateforme
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(13, "Module Administration Plateforme", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Reserve aux administrateurs de la plateforme LIBITEX. Accessible en "
        "<b>navigateur</b> (Next.js PWA), + Tauri si besoin natif.", s["body"]
    ))
    story.append(Spacer(1, 6))
    for item in [
        "Gestion des tenants : creation, suspension, suppression de comptes",
        "Configuration globale : devises, TVA, moyens de paiement, passerelles",
        "Monitoring : sante des services, metriques, logs",
        "Gestion des abonnements : plans SaaS, facturation, limites",
        "Gestion des domaines personnalises : validation DNS, certificats SSL",
        "Moderation : produits e-commerce, avis, signalements",
        "Rapports plateforme : revenus commissions, transactions, commercants actifs",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 14 — Securite, RBAC & Audit
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(14, "Securite, RBAC & Audit", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("Authentification"))
    story.append(Spacer(1, 6))
    for item in [
        "JWT avec refresh tokens",
        "MFA optionnel (TOTP) pour admin et manager",
        "Sessions revocables, rate limiting",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Roles RBAC"))
    story.append(Spacer(1, 6))
    story.append(make_table_bold_first_col(
        ["Role", "Acces"],
        [
            ["Vendeur", "Vente uniquement. Pas d'acces aux prix d'achat/marge"],
            ["Magasinier", "Stock et receptions. Pas d'acces caisses/finances"],
            ["Commercial", "Ventes B2B, devis, factures. Pas de configuration"],
            ["Manager", "Rapports, annulations, remises, validation inventaires"],
            ["Admin Commercant", "Acces complet au perimetre du tenant + config"],
            ["Super Admin", "Acces plateforme complete (equipe LIBITEX)"],
        ],
        col_widths=[avail_w * 0.25, avail_w * 0.75],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Audit Trail"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Table audit_logs :\n"
        "  id | tenant_id | user_id | action | entity_type | entity_id\n"
        "  | before (JSONB) | after (JSONB) | ip | timestamp\n"
        "\n"
        "Actions tracees : modification stock, annulation ticket,\n"
        "ouverture tiroir, modification prix, suppression, connexion",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 15 — Sync Offline
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(15, "Synchronisation Offline-First", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "C'est le <b>risque technique principal</b> du projet. "
        "Le Sync Engine (Rust/Axum) gere la reconciliation des donnees.",
        s["body"]
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Problemes a Resoudre"))
    story.append(Spacer(1, 6))
    story.append(make_table_bold_first_col(
        ["Probleme", "Exemple"],
        [
            ["Conflit de stock", "2 boutiques vendent le meme produit offline -> stock negatif"],
            ["Conflit de prix", "Le cloud met a jour un prix pendant une vente offline"],
            ["Conflit credit client", "Credit accorde en boutique A et B simultanement"],
            ["Ordre des evenements", "Reconnexion apres des heures, evenements en desordre"],
        ],
        col_widths=[avail_w * 0.30, avail_w * 0.70],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Strategie de Resolution"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Principe : les ventes locales gagnent toujours.</b> Une vente effectuee offline "
        "est un fait accompli — le produit a ete donne, l'argent encaisse.", s["body"]
    ))
    story.append(Spacer(1, 4))
    for item in [
        "<b>Stock</b> : la vente decremente toujours. Stock negatif = alerte a traiter (pas un blocage)",
        "<b>Prix</b> : la vente garde le prix au moment de la vente. Le nouveau prix s'applique apres sync",
        "<b>Credit</b> : accepte localement. Encours consolide depasse = alerte (pas blocage retroactif)",
        "<b>Ordre</b> : timestamp local + sequence number. Le Sync Engine reconstruit la timeline",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Flux de Sync"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "UPLINK (Local -> Cloud):\n"
        "  1. App cree evenement -> events_queue (IndexedDB/SQLite)\n"
        "  2. Internet disponible -> batch push vers Sync Engine\n"
        "  3. Sync Engine valide, applique, detecte conflits\n"
        "  4. Reponse : OK | CONFLICT_RESOLVED | ALERT_GENERATED\n"
        "  5. Marquer SYNCED\n"
        "\n"
        "DOWNLINK (Cloud -> Local):\n"
        "  1. App demande MAJ depuis last_sync_timestamp\n"
        "  2. Serveur renvoie : catalogue, prix, stock recalcule\n"
        "  3. App applique dans store local (IndexedDB/SQLite)\n"
        "\n"
        "IDEMPOTENCE: chaque evenement a un UUID unique.\n"
        "Meme evenement envoye 2x -> detecte et ignore.",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 16 — Pilotage
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(16, "Pilotage & Tableaux de Bord", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("Dashboard Commercant"))
    story.append(Spacer(1, 6))
    story.append(make_table_bold_first_col(
        ["Indicateur", "Description"],
        [
            ["Chiffre d'affaires", "Global et par point de vente, jour/semaine/mois"],
            ["Marge brute", "CA - Cout de Revient des Marchandises Vendues"],
            ["Produits performants", "Top / Flop ventes"],
            ["Rotation de stock", "Identification des produits dormants"],
            ["Valorisation stock", "Valeur totale au PMP"],
            ["Encours clients", "Total des creances en cours"],
            ["Alertes", "Stock bas, DLC proche, ecarts"],
        ],
        col_widths=[avail_w * 0.30, avail_w * 0.70],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Rapports Cles"))
    story.append(Spacer(1, 6))
    for i, item in enumerate([
        "Z de Caisse : recapitulatif journalier par moyen de paiement",
        "Journal des Ventes : detail de chaque transaction",
        "Etat des Creances : suivi des paiements en attente",
        "Rapport d'Inventaire : ecarts constates vs stock theorique",
        "Analyse des Marges : par produit, categorie, fournisseur",
        "Performance Fournisseurs : delais, qualite, prix",
    ], 1):
        story.append(Paragraph(f"<b>{i}.</b> {item}", s["bullet"], bulletText=" "))

    # ═══════════════════════════════════════════════════════════
    # SECTION 17 — Comptabilite
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(17, "Comptabilite & Conformite Fiscale", avail_w))
    story.append(Spacer(1, 10))

    for item in [
        "<b>Plan comptable OHADA</b> (UEMOA/CEMAC) configurable",
        "<b>Ecritures automatiques</b> : chaque vente/achat genere des ecritures",
        "<b>TVA</b> : taux multiples, collectee / deductible",
        "<b>Rapports fiscaux</b> : journal, balance, compte de resultat simplifie",
        "<b>Export comptable</b> : format compatible logiciels locaux",
        "<b>Numerotation sequentielle</b> des factures (obligation legale)",
        "<b>Ecarts de change</b> : gains et pertes comptabilises",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "Vente POS:\n"
        "  Debit  : Caisse (ou Banque, ou Mobile Money)\n"
        "  Credit : Ventes de marchandises\n"
        "  Credit : TVA collectee\n"
        "\n"
        "Achat fournisseur:\n"
        "  Debit  : Achats de marchandises\n"
        "  Debit  : TVA deductible\n"
        "  Credit : Fournisseurs",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 18 — Impressions
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(18, "Impressions & Documents", avail_w))
    story.append(Spacer(1, 10))

    story.append(make_table_bold_first_col(
        ["Document", "Format", "Imprimante"],
        [
            ["Ticket de caisse", "80mm thermique", "ESC/POS"],
            ["Etiquette code-barres", "Variable", "Thermique ZPL/EPL"],
            ["Facture A4", "PDF", "Laser / Jet d'encre"],
            ["Bon de livraison A4", "PDF", "Laser / Jet d'encre"],
            ["Devis / Proforma A4", "PDF", "Laser / Jet d'encre"],
            ["Z de caisse", "80mm ou A4", "Les deux"],
        ],
        col_widths=[avail_w * 0.30, avail_w * 0.30, avail_w * 0.40],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Architecture par plateforme"))
    story.append(Spacer(1, 6))
    for item in [
        "<b>PWA (Navigateur)</b> : PDF cote serveur, telechargement/ouverture. WebUSB ou print server local pour thermique",
        "<b>Desktop (Tauri)</b> : bridge Rust ESC/POS (USB/Reseau), impression PDF native OS, tiroir-caisse",
        "<b>Mobile (React Native)</b> : pas d'impression directe, envoi tickets par email/SMS",
        "Templates parametrables par tenant (logo, coordonnees, mentions legales)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 19 — Migration
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(19, "Migration & Onboarding", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("Import de donnees"))
    story.append(Spacer(1, 6))
    for item in [
        "Template CSV/Excel fourni pour : produits, clients, fournisseurs, stock initial",
        "Validation des donnees avec rapport d'erreurs avant import",
        "Mapping de colonnes configurable",
        "Import de photos par lot",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Parcours d'Onboarding"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "1. Inscription et creation du tenant\n"
        "2. Configuration de base (devise, TVA, paiements)\n"
        "3. Import ou creation du catalogue\n"
        "4. Inventaire initial\n"
        "5. Configuration des emplacements\n"
        "6. Creation des comptes utilisateurs et roles\n"
        "7. Tutoriel interactif POS\n"
        "8. Go live",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 20 — Multi-Tenancy
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(20, "Multi-Tenancy & SaaS", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Modele choisi : <b>Shared Database, isolation par Row Level Security (RLS)</b>.",
        s["body"]
    ))
    story.append(Spacer(1, 6))

    story.append(make_table(
        ["Critere", "DB par tenant", "Shared DB + tenant_id"],
        [
            ["Cout infra", "Eleve (1 DB par client)", "Faible (1 seule DB)"],
            ["Complexite migration", "Elevee (migrer N DBs)", "Faible (1 migration)"],
            ["Isolation des donnees", "Forte", "Forte (RLS PostgreSQL)"],
            ["Performance", "Bonne", "Bonne (index sur tenant_id)"],
        ],
        col_widths=[avail_w * 0.30, avail_w * 0.35, avail_w * 0.35],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Plans SaaS"))
    story.append(Spacer(1, 6))
    story.append(make_table_bold_first_col(
        ["Plan", "Limites", "Prix"],
        [
            ["Starter", "1 boutique, 500 produits, POS", "Gratuit / Freemium"],
            ["Pro", "3 boutiques, illimite, B2B, rapports", "Abonnement mensuel"],
            ["Business", "Multi-sites, e-commerce, domaine perso", "Abonnement +"],
            ["Enterprise", "Custom, SLA, support dedie", "Sur devis"],
        ],
        col_widths=[avail_w * 0.20, avail_w * 0.45, avail_w * 0.35],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Domaines Personnalises"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "1. Commercant saisit son domaine (ex: maboutique.com)\n"
        "2. Systeme genere les enregistrements DNS (CNAME)\n"
        "3. Commercant configure son DNS\n"
        "4. Verification propagation DNS\n"
        "5. Certificat SSL automatique (Let's Encrypt / Caddy)\n"
        "6. Table custom_domains : domain -> tenant_id\n"
        "7. Reverse proxy route vers le bon tenant",
        avail_w
    ))

    # ═══════════════════════════════════════════════════════════
    # SECTION 21 — Tests
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(21, "Strategie de Tests", avail_w))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Matrice large : 4 types produits x 2 modes vente x 2 modes (on/offline) "
        "= 16 combinaisons minimum + multi-tenant + sync + calculs financiers.",
        s["body"]
    ))
    story.append(Spacer(1, 6))

    story.append(make_table(
        ["Niveau", "Scope", "Outils"],
        [
            ["Unitaires", "Fonctions pures, calculs", "Jest (TS), cargo test (Rust)"],
            ["Integration", "Modules avec DB", "Jest + PostgreSQL, Supertest"],
            ["E2E", "Flux complets", "Playwright (web), Detox (mobile)"],
            ["Performance", "Charge", "k6 / Artillery"],
        ],
        col_widths=[avail_w * 0.20, avail_w * 0.35, avail_w * 0.45],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Tests Critiques"))
    story.append(Spacer(1, 6))
    for item in [
        "Stock negatif : 2 POS offline vendent le meme article -> alerte generee",
        "Idempotence : meme evenement 2x -> aucun doublon",
        "Isolation tenant : jamais d'acces cross-tenant",
        "FEFO : lot le plus proche expiration sort en premier",
        "Landed Cost & CUMP : precision des calculs, arrondi, devises",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 22 — Deploiement
    # ═══════════════════════════════════════════════════════════
    story.append(Spacer(1, 16))
    story.append(SectionHeader(22, "Deploiement & Infrastructure", avail_w))
    story.append(Spacer(1, 10))

    story.append(make_table_bold_first_col(
        ["Environnement", "Usage", "Infra"],
        [
            ["Dev", "Developpement local", "Docker Compose"],
            ["Staging", "Tests, recette", "Docker Compose sur VPS"],
            ["Production", "Clients", "Docker Compose -> K8s a l'echelle"],
        ],
        col_widths=[avail_w * 0.20, avail_w * 0.35, avail_w * 0.45],
        styles_dict=s,
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Services en Production"))
    story.append(Spacer(1, 6))
    story.append(CodeBlock(
        "docker-compose.yml :\n"
        "  nestjs-api        (backend principal)\n"
        "  rust-axum         (sync engine + calculs)\n"
        "  postgresql        (base de donnees)\n"
        "  redis             (cache + queues BullMQ)\n"
        "  meilisearch       (recherche)\n"
        "  minio             (stockage S3-compatible)\n"
        "  caddy             (reverse proxy, SSL, domaines)\n"
        "  next-merchant     (app commercant ERP+POS)\n"
        "  next-marketplace  (e-commerce)\n"
        "  next-admin        (admin plateforme)",
        avail_w
    ))

    story.append(Spacer(1, 8))
    story.append(SubSectionHeader("Monitoring"))
    story.append(Spacer(1, 6))
    for item in [
        "Metriques : Prometheus + Grafana",
        "Logs : Loki (ou ELK)",
        "Alertes : PagerDuty / Telegram bot",
        "APM : OpenTelemetry pour le tracing distribue (NestJS <-> Rust)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # SECTION 23 — Roadmap
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(23, "Roadmap de Developpement", avail_w))
    story.append(Spacer(1, 10))

    phases = [
        ("Phase 1 — MVP (Fondations)", [
            ["Catalogue", "4 types de produits, multi-tarifs, codes-barres"],
            ["Stock", "Event sourcing, mouvements, stock courant, alertes"],
            ["POS", "Vente, panier mixte, multi-paiements, ticket, offline"],
            ["Sync", "Sync engine basique (push/pull, conflits stock)"],
            ["Auth", "JWT, RBAC (4 roles), audit trail"],
            ["Rapports", "Z de caisse, journal des ventes, stock courant"],
            ["Infra", "Docker Compose, CI/CD, PostgreSQL, Redis"],
        ]),
        ("Phase 2 — Consolidation", [
            ["Achats", "PO multi-devises, Landed Cost, reception, CUMP"],
            ["Stock avance", "Transferts inter-sites, inventaires, multi-depots"],
            ["B2B", "Devis, proforma, BL, factures, comptes clients"],
            ["Sync robuste", "Gestion conflits avancee, retry, idempotence"],
            ["Comptabilite", "Ecritures auto, TVA, plan OHADA"],
            ["Impressions", "Factures A4, etiquettes, templates personnalisables"],
        ]),
        ("Phase 3 — E-Commerce & Expansion", [
            ["Marketplace", "Catalogue multi-commercants, recherche, paiements"],
            ["Boutiques", "Sous-domaines, domaines perso, personnalisation"],
            ["App Mobile", "React Native, dashboard, notifications, allegee"],
            ["Desktop Tauri", "Si besoin natif : impression, peripheriques, offline"],
            ["Migration", "Import CSV/Excel, wizard d'onboarding"],
        ]),
        ("Phase 4 — Scale & Intelligence", [
            ["Multi-sites", "Consolidation, tableaux de bord comparatifs"],
            ["App dirigeant", "Dashboard executif, alertes, KPIs"],
            ["Fidelite", "Points, niveaux, promotions"],
            ["IA", "Prediction stock, recommandations commandes"],
            ["Kubernetes", "Scaling horizontal, SLA"],
        ]),
    ]

    for phase_title, rows in phases:
        story.append(SubSectionHeader(phase_title))
        story.append(Spacer(1, 6))
        story.append(make_table_bold_first_col(
            ["Module", "Contenu"],
            rows,
            col_widths=[avail_w * 0.22, avail_w * 0.78],
            styles_dict=s,
        ))
        story.append(Spacer(1, 10))

    # ═══════════════════════════════════════════════════════════
    # SECTION 24 — Investissement
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader(24, "Opportunite d'Investissement", avail_w))
    story.append(Spacer(1, 10))

    story.append(SubSectionHeader("Modele Economique"))
    story.append(Spacer(1, 6))
    story.append(make_table_bold_first_col(
        ["Source de Revenus", "Description"],
        [
            ["Abonnement SaaS", "Revenus recurrents mensuels par commercant"],
            ["Commission e-commerce", "Pourcentage sur les ventes marketplace"],
            ["Services premium", "Domaine personnalise, support dedie, formations"],
            ["Hardware", "Vente/location d'equipements POS"],
        ],
        col_widths=[avail_w * 0.30, avail_w * 0.70],
        styles_dict=s,
    ))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Avantages Competitifs"))
    story.append(Spacer(1, 6))
    for i, item in enumerate([
        "<b>Solution complete</b> : de l'import au client final, y compris e-commerce",
        "<b>Offline-first</b> : fonctionne sans Internet, contrairement aux concurrents cloud-only",
        "<b>4 types de produits</b> : commerce generaliste reel, pas un POS simplifie",
        "<b>Landed Cost integre</b> : marge reelle, pas estimee",
        "<b>Multi-canal</b> : POS + B2B + E-commerce dans un seul systeme",
        "<b>Adapte au terrain</b> : mobile money, plan OHADA, multi-devises Afrique",
    ], 1):
        story.append(Paragraph(f"{i}. {item}", s["bullet"], bulletText=" "))

    story.append(Spacer(1, 10))
    story.append(SubSectionHeader("Scalabilite"))
    story.append(Spacer(1, 6))
    for item in [
        "D'un commercant unique a des centaines via le modele SaaS",
        "Deploiement multi-sectoriel (textile, electronique, alimentaire, mixte)",
        "Expansion regionale progressive (UEMOA, CEMAC, continent)",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="\u2022"))

    # ═══════════════════════════════════════════════════════════
    # GLOSSAIRE
    # ═══════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(SectionHeader("A", "Glossaire", avail_w))
    story.append(Spacer(1, 10))

    story.append(make_table_bold_first_col(
        ["Terme", "Definition"],
        [
            ["CUMP", "Cout Unitaire Moyen Pondere — methode de valorisation du stock"],
            ["DLC", "Date Limite de Consommation"],
            ["FEFO", "First Expired, First Out — regle de sortie produits perissables"],
            ["IMEI", "International Mobile Equipment Identity"],
            ["Landed Cost", "Cout de revient reel incluant tous les frais d'approche"],
            ["OHADA", "Organisation pour l'Harmonisation en Afrique du Droit des Affaires"],
            ["PMP", "Prix Moyen Pondere (= CUMP)"],
            ["PO", "Purchase Order — Bon de commande fournisseur"],
            ["RBAC", "Role-Based Access Control"],
            ["RLS", "Row Level Security — securite au niveau des lignes PostgreSQL"],
            ["SKU", "Stock Keeping Unit — identifiant unique d'un article en stock"],
            ["Tenant", "Commercant / entreprise utilisant la plateforme"],
        ],
        col_widths=[avail_w * 0.20, avail_w * 0.80],
        styles_dict=s,
    ))

    # ─── Build ───
    doc.build(story)
    print(f"PDF genere : {output_path}")
    return output_path


if __name__ == "__main__":
    build_pdf()
