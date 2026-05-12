"""
Generate the full PAIBS Final Report PDF following the ESADE template.

Run:
  ml/.venv/bin/python scripts/build_paibs_report.py
Output:
  docs/Fire-See-PAIBS-Report.pdf
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "docs" / "Fire-See-PAIBS-Report.pdf"

BLACK = colors.HexColor("#111111")
BODY = colors.HexColor("#1F1F1F")
MUTED = colors.HexColor("#555555")
SUBTLE = colors.HexColor("#888888")
RULE = colors.HexColor("#BBBBBB")
ROW_ALT = colors.HexColor("#F4F4F2")
HEADER_BG = colors.HexColor("#EFEFED")
PLACEHOLDER_BG = colors.HexColor("#FAFAF8")
PLACEHOLDER_BORDER = colors.HexColor("#CCCCCC")
ESADE = colors.HexColor("#1F3864")  # subtle navy accent for section numbers


def make_styles() -> dict:
    base = getSampleStyleSheet()
    H = lambda **k: ParagraphStyle(parent=base["Normal"], **k)
    return {
        "title": H(
            name="Title",
            fontName="Times-Bold",
            fontSize=24,
            leading=28,
            textColor=BLACK,
            spaceAfter=4,
        ),
        "subtitle": H(
            name="Subtitle",
            fontName="Times-Roman",
            fontSize=11,
            leading=15,
            textColor=MUTED,
            spaceAfter=14,
        ),
        "h1": H(
            name="H1",
            fontName="Times-Bold",
            fontSize=16,
            leading=20,
            textColor=ESADE,
            spaceBefore=18,
            spaceAfter=10,
        ),
        "h2": H(
            name="H2",
            fontName="Times-Bold",
            fontSize=12.5,
            leading=16,
            textColor=BLACK,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "h3": H(
            name="H3",
            fontName="Times-Bold",
            fontSize=10.5,
            leading=14,
            textColor=BLACK,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "label": H(
            name="Label",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=SUBTLE,
            spaceAfter=2,
        ),
        "body": H(
            name="Body",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=15,
            textColor=BODY,
            spaceAfter=8,
            alignment=TA_JUSTIFY,
        ),
        "body_left": H(
            name="BodyLeft",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=15,
            textColor=BODY,
            spaceAfter=8,
            alignment=TA_LEFT,
        ),
        "body_muted": H(
            name="BodyMuted",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=15,
            textColor=MUTED,
            spaceAfter=8,
            alignment=TA_JUSTIFY,
        ),
        "small": H(
            name="Small",
            fontName="Times-Roman",
            fontSize=9,
            leading=12,
            textColor=MUTED,
        ),
        "footnote": H(
            name="Footnote",
            fontName="Times-Italic",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "bullet": H(
            name="Bullet",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=15,
            textColor=BODY,
            leftIndent=14,
            bulletIndent=2,
            spaceAfter=3,
        ),
        "bullet_tight": H(
            name="BulletTight",
            fontName="Times-Roman",
            fontSize=10,
            leading=13,
            textColor=BODY,
            leftIndent=14,
            bulletIndent=2,
            spaceAfter=2,
        ),
        "quote": H(
            name="Quote",
            fontName="Times-Italic",
            fontSize=10.5,
            leading=14,
            textColor=MUTED,
            leftIndent=18,
            rightIndent=18,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "placeholder": H(
            name="Placeholder",
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=SUBTLE,
            alignment=TA_CENTER,
        ),
    }


def page_chrome(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(SUBTLE)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.6 * cm, height - 1.2 * cm, "FIRE-SEE  ·  PAIBS Final Report")
    canvas.drawRightString(width - 1.6 * cm, height - 1.2 * cm, "ESADE  ·  May 2026")
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(1.6 * cm, height - 1.3 * cm, width - 1.6 * cm, height - 1.3 * cm)
    canvas.setFillColor(SUBTLE)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 1.6 * cm, 1 * cm, f"{doc.page}")
    canvas.drawString(1.6 * cm, 1 * cm, "Fire-See Team")
    canvas.restoreState()


def hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.4, color=RULE, spaceBefore=4, spaceAfter=8)


def figure_image(filename: str, caption: str, width_cm: float = 16) -> Table:
    """Embed an actual rendered figure (PNG in docs/figures/) with a caption."""
    from PIL import Image as PILImage
    s = make_styles()
    img_path = Path(__file__).resolve().parents[1] / "docs" / "figures" / filename
    # Compute the real aspect ratio from the file so the scaled height fits.
    with PILImage.open(img_path) as pil:
        ratio = pil.height / pil.width
    target_w = width_cm * cm
    target_h = target_w * ratio
    img = Image(str(img_path), width=target_w, height=target_h)
    cap = Paragraph(caption, s["placeholder"])
    tbl = Table([[img], [cap]], colWidths=[width_cm * cm])
    tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (0, 0), 4),
                ("BOTTOMPADDING", (0, 0), (0, 0), 4),
                ("TOPPADDING", (0, 1), (0, 1), 4),
                ("BOTTOMPADDING", (0, 1), (0, 1), 4),
            ]
        )
    )
    return tbl


def figure_placeholder(label: str, caption: str, height_cm: float = 5) -> Table:
    s = make_styles()
    inner = Paragraph(
        f"<b>[ FIGURE: {label} ]</b><br/>{caption}",
        s["placeholder"],
    )
    tbl = Table([[inner]], colWidths=[16 * cm], rowHeights=[height_cm * cm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PLACEHOLDER_BG),
                ("BOX", (0, 0), (-1, -1), 0.6, PLACEHOLDER_BORDER),
                ("LINEABOVE", (0, 0), (-1, 0), 0.6, PLACEHOLDER_BORDER),
                ("LINEBELOW", (0, -1), (-1, -1), 0.6, PLACEHOLDER_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    return tbl


def kv_table(rows: list[tuple[str, str]], col1: float = 4.5, col2: float = 12) -> Table:
    tbl = Table(
        [[k.upper(), v] for k, v in rows],
        colWidths=[col1 * cm, col2 * cm],
    )
    tbl.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8),
                ("FONT", (1, 0), (1, -1), "Times-Roman", 10.5),
                ("TEXTCOLOR", (0, 0), (0, -1), SUBTLE),
                ("TEXTCOLOR", (1, 0), (1, -1), BLACK),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, RULE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def _table_style(rows: list[list], right_align_numeric: bool = False) -> TableStyle:
    n = len(rows)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), BLACK),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, RULE),
        ("FONT", (0, 1), (-1, -1), "Times-Roman", 10),
        ("FONT", (0, 1), (0, -1), "Times-Bold", 10),
        ("TEXTCOLOR", (0, 1), (-1, -1), BODY),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    for i in range(1, n):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    if right_align_numeric:
        for col in range(1, len(rows[0])):
            style.append(("ALIGN", (col, 0), (col, -1), "CENTER"))
    return TableStyle(style)


def para_table(header: list[str], rows: list[list[str]], col_widths_cm: list[float], styles: dict) -> Table:
    """Build a table where every cell is a Paragraph so long text wraps."""
    cells_header = [Paragraph(f"<b>{h.upper()}</b>", styles["small"]) for h in header]
    data = [cells_header]
    for r in rows:
        line = []
        for i, c in enumerate(r):
            style = styles["body_left"] if i == 0 else styles["small"]
            # For column 0, make it bold body
            if i == 0:
                line.append(Paragraph(f"<b>{c}</b>", styles["body_left"]))
            else:
                line.append(Paragraph(c, styles["small"]))
        data.append(line)
    widths = [w * cm for w in col_widths_cm]
    tbl = Table(data, colWidths=widths)
    tbl.setStyle(_table_style(data))
    return tbl


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=1.6 * cm,
        title="Fire-See — PAIBS Final Report",
        author="Fire-See Team · ESADE",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        showBoundary=0,
    )
    doc.addPageTemplates([PageTemplate(id="body", frames=[frame], onPage=page_chrome)])

    s = make_styles()
    story = []

    # ====================================================================
    # 0. COVER
    # ====================================================================
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Fire-See", s["title"]))
    story.append(
        Paragraph(
            "Wildfire risk intelligence for Ourense, Galicia — a public dashboard "
            "that turns open Earth-observation feeds into actionable risk maps.",
            s["subtitle"],
        )
    )
    story.append(hr())
    story.append(
        kv_table(
            [
                ("Team name", "Fire-See Team"),
                (
                    "Members",
                    "Pablo Muñoz · Francis Climent · Marc Cano · Nono Lamúa · Rafa Moro",
                ),
                ("Final project title", "Fire-See — Wildfire risk intelligence for Ourense"),
                (
                    "Problem statement",
                    "Rural Ourense lacks a real-time, hyperlocal map telling foresters and councils where to act today, not last year.",
                ),
                ("AOI name", "Ourense province, Galicia, Spain"),
                ("AOI bounding box", "lon −8.5° to −7.0° · lat 41.8° to 42.5°"),
                (
                    "AOI area",
                    "≈ 9 670 km² (covers the 7 273 km² Ourense province plus a margin)",
                ),
                (
                    "EO time range used",
                    "Training data 2018-01-01 → 2022-12-31 · Live feeds ongoing 2026",
                ),
                ("Repository", "github.com/pablo-munoz/perspectives-on-ai-and-sustainability"),
                ("Live deliverable", "perspectives-on-ai-and-sustainabili.vercel.app"),
                ("Submission date", "13 May 2026"),
                ("Version", "v1.0 (final)"),
            ]
        )
    )
    story.append(PageBreak())

    # ====================================================================
    # 1. EXECUTIVE SUMMARY
    # ====================================================================
    story.append(Paragraph("1. Executive summary", s["h1"]))
    story.append(
        Paragraph(
            "The forests of Ourense, the most fire-stricken province of Galicia, burn "
            "tens of thousands of hectares every summer. Forest agents, council "
            "safety officers and communal landowners are forced to plan with static "
            "paper maps and last year&apos;s statistics. Fire-See is a free, public "
            "web dashboard that fills that gap: a 3-D map of eight forest zones in "
            "Ourense that refreshes every five minutes with live AEMET weather, NASA "
            "satellite hotspots and Copernicus Sentinel-2 vegetation indices, and "
            "ranks each zone on a 0–100 % risk scale produced by a Random Forest "
            "classifier trained on five Galician fire seasons.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "We adapted the AI-for-Earth-Observation (AI4EO) recipe published by Piao "
            "et al. (2022) for Korean forests and re-trained it on MODIS MCD64A1 "
            "burned-area labels plus Sentinel-2 / MODIS / SRTM feature stacks "
            "specific to Galicia. After two iterations the model achieves "
            "<b>AUC = 0.84</b> on a stratified 5-fold cross-validation — up from "
            "0.74 in our V1 baseline. The result is delivered through a Next.js / "
            "Mapbox dashboard with embed widgets, an RSS feed, an iCal feed and a "
            "rate-limited public API, so journalists, councils and residents can "
            "all consume the data in whatever form suits them.",
            s["body"],
        )
    )
    story.append(
        figure_image(
            "fig01_pipeline.png",
            "<b>Figure 1.</b> End-to-end project diagram: open Earth-observation "
            "data sources → Google Earth Engine pre-processing → Random Forest → "
            "Next.js dashboard → four target audiences (forest agents, councils, "
            "Comunidades de Montes, residents).",
            width_cm=16,
        )
    )

    # ====================================================================
    # 2. PROBLEM DEFINITION AND RESEARCH — 20%
    # ====================================================================
    story.append(Paragraph("2. Problem definition and research", s["h1"]))

    story.append(Paragraph("2.1 Problem – Idea – Solution", s["h2"]))
    pis_rows = [
        [
            "Problem",
            "Rural Ourense suffers an unsustainable wildfire toll: forest agents and "
            "councils plan with outdated static maps while communal-land assemblies "
            "(<i>Comunidades de Montes</i>) only have budget to clear a fraction of "
            "the biomass they manage, and choose which fraction by intuition.",
        ],
        [
            "Idea",
            "Multispectral Sentinel-2 imagery, MODIS thermal data and SRTM topography, "
            "processed in Google Earth Engine and fed into a Random Forest, can "
            "produce a daily fire-risk score per zone with usable accuracy at the "
            "village level — turning a year-old paper map into a today-relevant "
            "traffic light.",
        ],
        [
            "Solution",
            "Fire-See, a public Next.js dashboard that ingests live weather, "
            "satellite hotspots and weekly Sentinel-2 vegetation indices, runs them "
            "through an in-browser Random Forest exported from sklearn, and "
            "displays per-zone risk on a 3-D map plus an embed-friendly widget for "
            "council websites.",
        ],
    ]
    story.append(para_table(["Element", "Description"], pis_rows, [3.5, 13.0], s))

    story.append(Paragraph("2.2 Specificity of the problem", s["h2"]))
    story.append(
        Paragraph(
            "<b>Geographic scope.</b> The AOI is Ourense province (≈ 7 273 km²), "
            "specifically the eight forest perimeters our model covers (Serra de "
            "San Mamede, Ribeira Sacra, Baixa Limia, Macizo Central, Val do Arnoia, "
            "Serra do Invernadeiro, Celanova, Verín). We rejected scaling to the "
            "whole of Galicia at this stage because the validation set per zone "
            "would have become too small to give us trustworthy AUC estimates; we "
            "rejected zooming in further than a comarca because the MCD64A1 "
            "burned-area product has a 500 m resolution and fewer pixels per "
            "polygon would have hurt sample counts.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Temporal scope.</b> Training uses MCD64A1 fire labels from 2018 to "
            "2022 (five complete fire seasons, restricted to the May–September "
            "fire window). Live inference covers ongoing 2026. We picked 2018 as "
            "the lower bound because Sentinel-2 L2A coverage of Galicia becomes "
            "consistently usable from late 2017.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Population and sector.</b> Ourense province has roughly 300 000 "
            "inhabitants, of whom about 110 000 live in dispersed rural parishes "
            "directly exposed to wildland-urban-interface (WUI) fires. Galicia as "
            "a whole accounted for over 40 % of Spain&apos;s burned area in the "
            "2017 mega-fire wave (more than 50 000 ha in a single week) — Ourense "
            "alone lost &gt; 18 000 ha that October. The communal-land regime "
            "(<i>Montes Veciñais en Man Común</i>) covers roughly 30 % of the "
            "Galician territory and is run by Comunidades de Montes assemblies "
            "with tiny annual budgets for fuel management.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Why now.</b> Rural depopulation has stalled traditional fuel "
            "management (livestock grazing, controlled cutting) and biomass has "
            "accumulated; the 2022 European heatwaves pushed Galicia into "
            "&quot;extreme&quot; fire-weather class for nine days running; and "
            "Xunta de Galicia&apos;s 2025 forestry strategy explicitly asks for "
            "tools that let rangers move from reactive detection to preventive "
            "fuel-load management. Our stakeholders (§2.3) confirmed each of these "
            "points first-hand.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Required evidence.</b> European Forest Fire Information System "
            "(EFFIS, JRC) <i>Annual Report on Forest Fires in Europe, Middle East "
            "and North Africa 2022</i>; Xunta de Galicia, <i>Plan de Prevención e "
            "Defensa contra os Incendios Forestais de Galicia (PLADIGA) 2024</i>; "
            "MITECO, <i>Estadística General de Incendios Forestales (EGIF) "
            "1968–2023</i>; ECMWF Copernicus Climate Change Service, 2022 "
            "heatwave bulletin.",
            s["footnote"],
        )
    )

    story.append(Paragraph("2.3 Stakeholder engagement", s["h2"]))
    story.append(
        Paragraph(
            "We completed four in-depth interviews (one each month from November "
            "2025 to January 2026) plus one expert outreach pending confirmation. "
            "All interviews ran 45 – 60 minutes and were conducted in Galician or "
            "Spanish; quotes here are translated.",
            s["body"],
        )
    )

    # Stakeholder 1 — Rafael
    story.append(Paragraph("Rafael Pereira — Forest Agent, Xunta de Galicia (Ourense district)", s["h3"]))
    story.append(
        kv_table(
            [
                ("Role", "Field operative, 18 years on Galician forest patrol"),
                ("Date", "15 November 2025"),
                ("Channel", "Video call (Microsoft Teams)"),
                (
                    "Questions asked",
                    "What does a typical patrol day look like? What information do "
                    "you currently have when deciding where to patrol? What would change "
                    "if you could see today&apos;s risk per zone instead of last year&apos;s?",
                ),
            ],
            col1=3.5,
            col2=13,
        )
    )
    story.append(
        Paragraph(
            "<i>&quot;We don&apos;t need more alarms. We need to know where the "
            "danger will be this afternoon, not where it was last year. If the "
            "system showed biomass build-up in real time, we&apos;d prevent half "
            "the fires.&quot;</i>",
            s["quote"],
        )
    )
    story.append(Paragraph("Key takeaways", s["h3"]))
    for b in [
        "Static paper maps are obsolete by the time they reach the district office.",
        "Forest agents want hyperlocal predictions at patrol-zone granularity, not regional averages.",
        "Biomass build-up tracking — not active-fire detection — is the high-value signal for prevention.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet_tight"]))
    story.append(
        Paragraph(
            "<b>How it changed the project:</b> we moved the risk map from a "
            "weekly to a 5-minute refresh cadence; we introduced the eight "
            "patrol-zone perimeters as the primary unit of analysis instead of a "
            "single province-level number; we added a per-zone deep-dive page "
            "with a NDMI sparkline so &quot;biomass build-up&quot; is legible.",
            s["body"],
        )
    )

    # Stakeholder 2 — Maria
    story.append(Paragraph("María Conde — Local Council Safety Officer, Concello de Allariz", s["h3"]))
    story.append(
        kv_table(
            [
                ("Role", "Safety coordinator and emergency planning lead"),
                ("Date", "19 November 2025"),
                ("Channel", "Video call (Microsoft Teams)"),
                (
                    "Questions asked",
                    "When residents ask whether their parish is at risk, what do "
                    "you tell them? What tools do you currently use? What would a "
                    "useful shared platform look like?",
                ),
            ],
            col1=3.5,
            col2=13,
        )
    )
    story.append(
        Paragraph(
            "<i>&quot;When neighbours ask &lsquo;is this area dangerous?&rsquo;, "
            "I rarely have a clear answer — we&apos;re operating blind. I want "
            "something I can put on a slide and bring to a community "
            "assembly.&quot;</i>",
            s["quote"],
        )
    )
    story.append(Paragraph("Key takeaways", s["h3"]))
    for b in [
        "Council officers need a simple visual system (red / amber / green) understandable in a community meeting.",
        "Daily risk maps should be shareable as a single image, not a login-protected dashboard.",
        "Today / tomorrow / next-week weather-based predictions matter for community communications.",
        "A coordination platform across agents, councils, bombeiros and Comunidades de Montes is missing.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet_tight"]))
    story.append(
        Paragraph(
            "<b>How it changed the project:</b> we adopted the ColorBrewer YlOrRd "
            "palette (red / amber / yellow / pale) so the map is legible at a "
            "glance and on a projector; we built the embed widget so a council "
            "can paste a live risk badge into its own website; we added a 7-day "
            "FWI forecast ribbon explicitly designed for council communications.",
            s["body"],
        )
    )

    # Stakeholder 3 — José
    story.append(Paragraph("José Vázquez — Landowner / Neighbour, 63, parish of Castro Caldelas", s["h3"]))
    story.append(
        kv_table(
            [
                ("Role", "Smallholder landowner adjacent to forested communal land"),
                ("Date", "21 December 2025"),
                ("Channel", "Video call (Microsoft Teams)"),
                (
                    "Questions asked",
                    "What worries you most about wildfire near your land? Whom "
                    "do you trust for warnings? What would you do with a daily "
                    "risk map of your parish?",
                ),
            ],
            col1=3.5,
            col2=13,
        )
    )
    story.append(
        Paragraph(
            "<i>&quot;My land is clean. What I worry about is the abandoned plot "
            "next door. I&apos;d like to know — without having to call anyone — "
            "whether the parish is in red today.&quot;</i>",
            s["quote"],
        )
    )
    story.append(Paragraph("Key takeaways", s["h3"]))
    for b in [
        "&quot;Passive Observer Anxiety&quot;: neighbours feel helpless about adjacent abandoned properties they cannot manage.",
        "Citizens want public, no-login access — they will not register for an account.",
        "An RSS / email-style alert for &quot;my parish&quot; is preferable to push notifications.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet_tight"]))
    story.append(
        Paragraph(
            "<b>How it changed the project:</b> we kept the entire dashboard "
            "publicly accessible without authentication; we added an RSS feed of "
            "high-risk zones and an iCal feed of upcoming Very-High FWI days so "
            "residents can subscribe without creating an account.",
            s["body"],
        )
    )

    # Stakeholder 4 — Manuel
    story.append(Paragraph("Manuel Lorenzo — President, Comunidade de Montes de Vilar de Barrio", s["h3"]))
    story.append(
        kv_table(
            [
                ("Role", "Elected head of a 500-ha communal-land assembly"),
                ("Date", "12 January 2026"),
                ("Channel", "Video call (Microsoft Teams)"),
                (
                    "Questions asked",
                    "How does the assembly decide where to spend its annual "
                    "brush-clearing budget? Could a risk map change that "
                    "decision? Would the assembly trust an AI-generated "
                    "recommendation?",
                ),
            ],
            col1=3.5,
            col2=13,
        )
    )
    story.append(
        Paragraph(
            "<i>&quot;We manage 500 hectares but only have budget to clear 20. "
            "We choose those 20 by intuition — it&apos;s a lottery. If your AI "
            "tells me which 20 hectares are most likely to ignite, I will spend "
            "my budget there. It justifies the expense to the assembly: &lsquo;we "
            "are clearing Zone B because the machine says it will burn, not just "
            "because I said so&rsquo;.&quot;</i>",
            s["quote"],
        )
    )
    story.append(Paragraph("Key takeaways", s["h3"]))
    for b in [
        "Comunidades de Montes are the high-leverage B2B buyer: they own the budget that prevention requires.",
        "Their decision unit is the hectare, not the province.",
        "They need a public auditable model — &quot;the machine said so&quot; — to defend spending decisions to the assembly.",
        "This shifts our framing from &quot;emergency response support&quot; to &quot;preventive-budget optimisation&quot;.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet_tight"]))
    story.append(
        Paragraph(
            "<b>How it changed the project:</b> we published the full methodology, "
            "feature importance and citation block on a dedicated page so any "
            "assembly can verify the model before defending a budget; we made the "
            "trained-model and 90-day risk history downloadable as CSV / GeoJSON "
            "under CC-BY-4.0 for offline review.",
            s["body"],
        )
    )

    # Stakeholder 5 — pending
    story.append(Paragraph("Marta Rodríguez — Climate data analyst, MeteoGalicia (pending)", s["h3"]))
    story.append(
        Paragraph(
            "Outreach initiated 15 February 2026 to validate our choice of "
            "weather inputs and FWI computation. At the date of submission the "
            "interview is still being scheduled; we have stated this honestly on "
            "the methodology page rather than fabricate the answers.",
            s["body_muted"],
        )
    )

    story.append(Paragraph("2.4 State of the art", s["h2"]))
    sota_rows = [
        [
            "Piao et al. (2022)",
            "Forest fire susceptibility map for Gangwon-do (South Korea). Random Forest on GEE-extracted Sentinel-2 / DEM features. Reports AUC = 0.835.",
            "Static long-term susceptibility map, no temporal resolution, no thermal input. Korean fuel types differ from Atlantic broadleaf.",
        ],
        [
            "Copernicus EFFIS (JRC)",
            "Daily European Fire Weather Index raster at 0.25° — the official EU fire-danger product.",
            "0.25° pixels are ~25 km wide: useless inside a Galician valley. No vegetation indices, weather only.",
        ],
        [
            "PLADIGA / Xunta de Galicia",
            "Annual provincial fire-risk plan published by the regional government.",
            "Static PDF, not interactive, no daily refresh, no embed.",
        ],
        [
            "Tomorrow.io Wildfire (commercial)",
            "B2B SaaS combining weather forecasts with hyperlocal fire-risk indices.",
            "Paid licence; not open-source; built for the US insurance market.",
        ],
        [
            "Watch Duty (US)",
            "Mobile app for human-curated wildfire alerts with massive adoption in California.",
            "US-only, alert-focused (reactive) rather than prevention-focused; no model card or open data.",
        ],
    ]
    story.append(
        para_table(
            ["Reference", "What it does", "Gap we address"],
            sota_rows,
            [3.5, 7.0, 6.0],
            s,
        )
    )
    story.append(
        Paragraph(
            "<b>The gap.</b> No existing public tool combines (i) hyperlocal "
            "resolution at the Galician parish scale, (ii) daily refresh, "
            "(iii) an open-source AI risk score grounded in peer-reviewed "
            "methodology, and (iv) free public access with embed widgets and "
            "downloadable open data. Fire-See is the first to do so for Ourense.",
            s["body"],
        )
    )

    story.append(PageBreak())

    # ====================================================================
    # 3. TECHNICAL IMPLEMENTATION — 50%
    # ====================================================================
    story.append(Paragraph("3. Technical implementation", s["h1"]))

    story.append(Paragraph("3.1 Data", s["h2"]))
    data_rows = [
        [
            "Sentinel-2 L2A",
            "Multispectral imagery for NDVI (vegetation greenness) and NDMI (vegetation moisture). 10 m / 20 m bands.",
            "Copernicus Data Space + GEE collection <code>COPERNICUS/S2_SR_HARMONIZED</code>",
        ],
        [
            "MODIS MOD11A1 v6.1",
            "Land Surface Temperature (LST) day-time, 1 km, daily — heat accumulation proxy.",
            "NASA LP DAAC, served via GEE <code>MODIS/061/MOD11A1</code>",
        ],
        [
            "MODIS MCD64A1 v6.1",
            "Monthly burned-area product (500 m). Used as ground truth labels for the classifier.",
            "NASA LP DAAC, GEE <code>MODIS/061/MCD64A1</code>",
        ],
        [
            "NASA FIRMS · VIIRS 375 m",
            "Near-real-time active-fire detections for the live dashboard.",
            "NASA EOSDIS Area API (<code>VIIRS_SNPP_NRT</code>)",
        ],
        [
            "ESA WorldCover v200 (2021)",
            "10 m global land-cover product. Used to restrict sampling to burnable classes (tree/shrub/grass).",
            "GEE <code>ESA/WorldCover/v200</code>",
        ],
        [
            "SRTM Global DEM",
            "30 m global digital elevation model. Used to derive slope and aspect.",
            "GEE <code>USGS/SRTMGL1_003</code>",
        ],
        [
            "AEMET Open Data",
            "Live observations from station 1690A (Ourense) — temperature, humidity, wind, precipitation, pressure.",
            "AEMET REST API (api_key auth)",
        ],
        [
            "Open-Meteo forecast",
            "7-day daily aggregates (Tmax, RH-min, wind, precip) fed into the Van Wagner FWI computation.",
            "<code>api.open-meteo.com/v1/forecast</code> (no key)",
        ],
        [
            "Copernicus EFFIS WMS",
            "EU fire-danger raster shown as a toggleable map overlay.",
            "<code>maps.effis.emergency.copernicus.eu/effis</code>",
        ],
    ]
    story.append(
        para_table(
            ["Source", "What we extract", "Where it lives"],
            data_rows,
            [4.0, 7.0, 5.5],
            s,
        )
    )
    story.append(
        Paragraph(
            "<b>Volume.</b> Training extraction touched ~3 600 Sentinel-2 scenes "
            "(filtered by AOI and cloud-mask SCL) across the 5-year window; the "
            "exported training CSV holds 2 929 labelled samples. All heavy "
            "computation runs inside Google Earth Engine — the local download is "
            "&lt; 1 MB. Live inference is sub-100 ms because the Random Forest is "
            "serialised as a 4 MB JSON tree dump and walked in TypeScript inside "
            "the Next.js runtime.",
            s["body"],
        )
    )

    story.append(Paragraph("Pre-processing pipeline", s["h3"]))
    pipeline = [
        ("Burnable mask", "Restrict sampling to ESA WorldCover classes 10 (tree), 20 (shrub) and 30 (grass) so non-burned samples are comparable to burned ones, not water or urban."),
        ("Label extraction", "For each fire season, mosaic MCD64A1 BurnDate over May–September; mark pixels with BurnDate &gt; 0 as positive."),
        ("Paired-date sampling", "Each negative pixel inherits its date from a randomly chosen positive sample of the same year. Without this the model trivially separates classes via seasonality."),
        ("Pre-burn windows", "For each labelled point, compute NDVI / NDMI / LST medians over the 30 days <i>strictly before</i> the sample date — critical to avoid post-burn imagery leaking into features."),
        ("Cloud masking", "Sentinel-2 SCL classes 3, 8, 9, 10 (shadow / cloud / cirrus) masked out before median compositing."),
        ("Server-side bin extraction", "Samples are grouped by year-month and the feature stack is computed once per bin so the whole job is one GEE evaluation per year — total wall-clock ≈ 7 min."),
        ("Stratified split", "5-fold StratifiedKFold by class (random); leave-one-year-out group K-fold reported separately for an honest cross-year transfer score."),
    ]
    for i, (title, body) in enumerate(pipeline, 1):
        story.append(Paragraph(f"<b>{i}. {title}.</b> {body}", s["bullet_tight"]))
    story.append(
        figure_image(
            "fig02_preprocessing.png",
            "<b>Figure 2.</b> Pre-processing examples over Serra de San Mamede. "
            "<b>(a)</b> Sentinel-2 false-colour mosaic. <b>(b)</b> NDVI after "
            "SCL cloud masking and 30-day median compositing. <b>(c)</b> MCD64A1 "
            "burned-area perimeters from fire season 2022 overlaid on NDVI.",
            width_cm=16,
        )
    )

    story.append(Paragraph("3.2 Methodology and model", s["h2"]))
    story.append(
        Paragraph(
            "<b>Task formulation.</b> Binary classification: given a 7-feature "
            "vector describing a forest patch on a given date, predict whether "
            "that patch burned during the same fire season. Output is a "
            "probability in [0, 1] mapped to four risk bins (Low / Medium / High "
            "/ Critical) at fixed thresholds 0.25 / 0.5 / 0.75.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Inputs and outputs.</b> Input shape <code>(n, 7)</code> floats: "
            "NDVI, NDMI, LST, slope (°), aspect (°), elevation (m), "
            "distance-to-urban (m). Output shape <code>(n,)</code> floats in "
            "[0, 1].",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Architecture choice.</b> Random Forest classifier "
            "(<code>sklearn.ensemble.RandomForestClassifier</code>) with 200 "
            "trees, <code>min_samples_leaf = 2</code>, default Gini split, "
            "<code>random_state = 42</code>. We benchmarked against "
            "HistGradientBoosting and a four-base stacking ensemble; both gained "
            "≤ 1 AUC point at the cost of a more complex browser-side runtime, "
            "so we kept Random Forest. The architecture was selected because it: "
            "(i) was validated by Piao et al. (2022) on a directly analogous "
            "task with AUC 0.835, (ii) requires no feature scaling or imputation, "
            "(iii) yields free feature-importance scores we surface on the "
            "methodology page, and (iv) exports as a small JSON tree dump that "
            "runs in TypeScript without any heavy runtime dependency.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Compute environment.</b> All extraction runs server-side on "
            "Google Earth Engine (free tier). Training runs on a single MacBook "
            "Pro M2, no GPU required — full fit takes ~12 s for 200 trees, ~40 s "
            "for the bootstrap calibration loop. Inference runs in the browser "
            "via the Vercel Edge Runtime, sub-50 ms p99.",
            s["body"],
        )
    )

    story.append(Paragraph("3.3 Results", s["h2"]))
    story.append(
        Paragraph(
            "Reported on stratified random 5-fold cross-validation across the 2 929 "
            "training samples (held-out predictions concatenated across folds — "
            "no test point ever contributed to its own predictor):",
            s["body"],
        )
    )
    metrics_rows = [
        ["Metric", "Value", "Read it as"],
        ["AUC-ROC", "0.84", "Pick a random burned pixel and a random non-burned pixel; the model gives the burned one a higher risk score 84 times out of 100."],
        ["Accuracy", "79.0 %", "At the 0.5 threshold."],
        ["Precision", "73.5 %", "Of pixels flagged High/Critical, ≈ 74 % actually burned."],
        ["Recall", "53.7 %", "Of pixels that burned, ≈ 54 % were correctly flagged. Conservative on purpose."],
        ["F1", "0.62", "Harmonic mean of precision and recall."],
        ["Cohen&apos;s κ", "0.48", "Moderate agreement above random."],
        ["AUC (leave-one-year-out)", "0.66", "Honest cross-year transfer score."],
    ]
    story.append(para_table(["Metric", "Value", "Read it as"], metrics_rows[1:], [3.5, 2.5, 10.5], s))

    story.append(
        figure_image(
            "fig03_metrics.png",
            "<b>Figure 3.</b> Aggregated confusion matrix (held-out predictions "
            "concatenated across the five CV folds) and the ROC curve for "
            "the V3 Random Forest. Area under the curve = 0.84 vs the 0.50 "
            "random-guess diagonal.",
            width_cm=16,
        )
    )

    story.append(Paragraph("Example predictions", s["h3"]))
    story.append(
        figure_image(
            "fig04_success_case.png",
            "<b>Figure 4. Success case — true positive.</b> A real labelled "
            "burned pixel from August 2022 that received an out-of-fold "
            "score of <b>0.81</b> (Critical bin). The feature-signature "
            "panel shows why the model flagged it: LST is +1.9 σ above the "
            "no-fire mean, NDMI is well below it (dry vegetation), and the "
            "patch sits close to an urban edge — all consistent with the "
            "fire=1 cohort. The score distribution panel locates the case "
            "in the right tail of the model's confidence range, well "
            "above the 0.5 decision threshold.",
            width_cm=16,
        )
    )
    story.append(
        figure_image(
            "fig05_failure_case.png",
            "<b>Figure 5. Failure case — false negative.</b> A real labelled "
            "burned pixel from July 2022 that the model only scored "
            "<b>0.34</b> (Medium bin) and therefore did <i>not</i> escalate "
            "to a Critical alert. The feature signature explains why: NDVI "
            "is <i>above</i> the no-fire mean (the patch looked green and "
            "healthy 30 days before ignition), LST is near the no-fire "
            "mean, and elevation is below it — none of the obvious "
            "burn-like signals. The score lands in the overlap region of "
            "the two histograms where the model has the least separation. "
            "This is the dominant failure mode discussed in §3.3.",
            width_cm=16,
        )
    )
    story.append(
        Paragraph(
            "<b>Honest discussion of limitations.</b> The model under-detects small "
            "understory fires that stay below the satellite resolution floor "
            "(VIIRS ≈ 375 m, MODIS ≈ 1 km) until they reach the canopy. The "
            "leave-one-year-out AUC of 0.66 (versus 0.84 random) tells us the "
            "model captures some genuine cross-year signal but is still partly "
            "fitting year-specific patterns; we therefore caveat the dashboard "
            "score as a ranking, not a calibrated probability. The "
            "<code>dist_roads</code> feature from V1 returned a constant in our "
            "AOI (zero importance) and was dropped. To improve further we would "
            "need: (a) more fire seasons in the training set (Galicia is at the "
            "low-data tail), (b) properly calibrated probabilities via "
            "<code>CalibratedClassifierCV</code> with isotonic regression, and "
            "(c) per-event FWI features computed in a way that does not encode "
            "year identity (an anomaly relative to climatology rather than the "
            "absolute value).",
            s["body"],
        )
    )

    story.append(Paragraph("3.4 Software quality and reproducibility", s["h2"]))
    story.append(
        Paragraph(
            "The project is open-source under MIT, deployed continuously to "
            "Vercel from <code>main</code>, and ships with a dedicated "
            "<code>/methodology</code>, <code>/glossary</code>, "
            "<code>/data</code> and <code>/status</code> page so any reader can "
            "verify what the model uses, what the data sources are, and whether "
            "they are alive right now.",
            s["body"],
        )
    )
    story.append(Paragraph("Repository structure", s["h3"]))
    repo_rows = [
        ["src/app/(dashboard)/", "Next.js dashboard pages (map, analytics, zones, alerts, methodology, …)"],
        ["src/app/api/", "Public read-only API routes (/api/risk, /api/v1/zones, /api/history, …)"],
        ["src/components/", "React components — map widgets, charts, MetricInfo tooltips, layout shell."],
        ["src/lib/", "Pure-TS libs: FWI computation, ML inference, KV wrapper, glossary, hooks."],
        ["ml/", "Training pipeline: extract_v3.py (GEE), train_v3.py (sklearn), train_and_export.py (V1 reference)."],
        ["ml/artifacts/", "Versioned training_data.csv, tree dumps, model-output JSON, feature columns."],
        ["public/data/", "Static GeoJSON — historical fire perimeters."],
        ["scripts/", "Cron / data-refresh helpers + this report builder."],
    ]
    story.append(para_table(["Folder", "Purpose"], repo_rows, [4.5, 12.0], s))

    story.append(
        Paragraph(
            "<b>README.</b> The repository&apos;s root README explains environment "
            "variables, the four <code>npm</code> scripts, the cron schedule and "
            "how to re-train. Anyone with a clean machine can clone, "
            "<code>npm install</code>, set up <code>.env.local</code>, and run "
            "<code>npm run dev</code>. <b>Environment files:</b> "
            "<code>package.json</code> + <code>package-lock.json</code> for the "
            "web, <code>ml/requirements.txt</code> for the Python pipeline, plus "
            "a <code>ml/.venv</code> we ship instructions for. "
            "<b>Optimisation choices:</b> AEMET responses are KV-cached for 5 min "
            "with stale-on-failure; the FWI state is persisted in Upstash KV and "
            "advanced once per day by an authenticated Vercel cron; "
            "the Random Forest is dumped as flat typed arrays so the browser "
            "walk loop is a tight integer-indexed array access (no JSON parse "
            "per request).",
            s["body"],
        )
    )
    story.append(Paragraph("3.5 Basic functionality vs. extended features", s["h2"]))
    bvse_rows = [
        ["Per-zone risk score on a 3-D map", "Delivered (Basic)"],
        ["Live AEMET weather context panel", "Delivered (Basic)"],
        ["NASA FIRMS hotspot overlay", "Delivered (Basic) — upgraded to VIIRS 375 m"],
        ["Random Forest model (sklearn, GEE-extracted training)", "Delivered (Basic) — V3 brings AUC 0.84"],
        ["Methodology page with model card", "Delivered (Basic)"],
        ["Multi-stakeholder embed widgets for council websites", "Delivered (Extended)"],
        ["7-day FWI forecast ribbon (Van Wagner equations in browser)", "Delivered (Extended)"],
        ["Public read-only API + open-data downloads (CSV / GeoJSON)", "Delivered (Extended)"],
        ["RSS + iCal feeds for high-risk alerts", "Delivered (Extended)"],
        ["Time-machine slider over the last 30 days of snapshots", "Delivered (Extended)"],
        ["Hotspot context panel with Overpass POIs + ORS isochrones", "Delivered (Extended)"],
        ["Per-zone deep-dive pages with NDVI sparklines", "Delivered (Extended)"],
        ["Mobile push notifications to subscribed users", "Dropped — Web-Push infra was out of scope and stakeholders preferred RSS / iCal (§2.3, José)."],
        ["Burn-severity post-event NBR pipeline", "Dropped — Sentinel-2 STAC integration needed more time than available."],
    ]
    story.append(
        para_table(
            ["Committed at mid-term", "Actually delivered"],
            bvse_rows,
            [9.0, 7.5],
            s,
        )
    )

    story.append(PageBreak())

    # ====================================================================
    # 4. BUSINESS VALIDATION — 20%
    # ====================================================================
    story.append(Paragraph("4. Business validation", s["h1"]))

    story.append(Paragraph("4.1 Competitor / alternative analysis", s["h2"]))
    comp_rows = [
        [
            "Do nothing (status quo)",
            "Forest agents work from last year&apos;s static paper maps; communal-land assemblies allocate brush-clearing budget by intuition.",
            "Free", "Familiar, no learning curve.", "Stale data, no preventive optimisation, no shared platform.",
            "Daily refresh, hyperlocal score, free embed for councils.",
        ],
        [
            "EFFIS (Copernicus)",
            "Continental fire-danger raster, daily.",
            "Free", "Authoritative, EU-wide, well-known to professionals.",
            "0.25° resolution (≈ 25 km) — useless inside a Galician valley.",
            "Resolution at parish level (≈ 500 m), readable for non-specialists.",
        ],
        [
            "PLADIGA (Xunta de Galicia)",
            "Annual provincial fire-risk plan PDF.",
            "Free", "Official source.",
            "Static, annual, no embed, no API.",
            "Live data, embeddable, machine-readable open data.",
        ],
        [
            "Tomorrow.io Wildfire",
            "Commercial SaaS combining weather with fire-risk indices.",
            "B2B paid licence", "Polished UI, US-tested.",
            "Closed-source, paid, US-insurance focus.",
            "Free, open-source, Galicia-tuned, citable methodology.",
        ],
        [
            "Watch Duty (US mobile app)",
            "Human-curated wildfire alerts.",
            "Free (nonprofit)", "Massive US adoption, strong community trust.",
            "US-only, alert-focused (reactive), no model card, no open data.",
            "Prevention-focused, model card published, EU-deployable.",
        ],
    ]
    story.append(
        para_table(
            ["Name", "What it does", "Cost", "Strengths", "Weaknesses", "How Fire-See differs"],
            comp_rows,
            [2.7, 4.3, 1.5, 2.7, 2.7, 2.6],
            s,
        )
    )

    story.append(Paragraph("4.2 Value proposition and real validation", s["h2"]))
    story.append(
        Paragraph(
            "<i>For Galician forest agents, council safety officers and "
            "Comunidades de Montes, who currently allocate prevention budget by "
            "intuition, Fire-See provides a free, public, daily-refreshed "
            "hyperlocal risk map at parish resolution, unlike continental EFFIS "
            "or annual PLADIGA PDFs, because it combines live AEMET weather, "
            "NASA satellite imagery and a peer-reviewed Random Forest into one "
            "embeddable dashboard.</i>",
            s["body"],
        )
    )
    story.append(Paragraph("Real validation", s["h3"]))
    story.append(
        Paragraph(
            "We showed working V2 and V3 prototypes to three of the four "
            "interviewed stakeholders during March–April 2026:",
            s["body"],
        )
    )
    for b in [
        "<b>Rafael (Forest Agent, 8 April 2026):</b> walked through the per-zone deep-dive page on a tablet. Confirmed the patrol-zone granularity matches his decision unit; asked for a print-friendly daily briefing PDF, which we shipped before submission.",
        "<b>María (Council Officer, 14 April 2026):</b> embedded the live widget for Allariz on a test page on the council&apos;s staging environment. Confirmed the traffic-light visualisation is &quot;exactly what we needed&quot;; requested a Galego translation, parked for a future iteration.",
        "<b>Manuel (Comunidade de Montes, 22 April 2026):</b> took the GeoJSON download for the 2022 historical fires and overlaid it on his own ArcGIS workstation. Said the open-data export &quot;makes this a real tool, not a demo&quot; — exactly the auditability he asked for.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("Quantified benefit", s["h3"]))
    story.append(
        Paragraph(
            "Order-of-magnitude estimates based on the stakeholders&apos; own "
            "numbers:",
            s["body"],
        )
    )
    for b in [
        "<b>Patrol routing.</b> Rafael&apos;s district covers ≈ 1 800 km² with three forest agents on rotation. He estimated 30 % of patrol time is &quot;driving to the wrong place&quot;. If Fire-See can redirect even half of that to actually-risky parishes, that is ≈ 90 hours of effective patrol time recovered per agent per fire season.",
        "<b>Communal-land budget.</b> Manuel&apos;s Comunidade clears 20 ha out of 500 ha per year. Random selection means an expected 0.8 % match with the riskiest hectares; using the model&apos;s top-decile ranking lifts that match to roughly 6–9 ha per 20 ha cleared (3–5× efficiency), validated on the 2022 burn footprint.",
        "<b>Council communication.</b> María&apos;s safety office sends ≈ 30 community-meeting briefings per fire season. Each one currently takes ~45 minutes to assemble manually. The embed widget collapses that to a single line of HTML.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("4.3 Feasibility and viability", s["h2"]))
    story.append(Paragraph("Cost side", s["h3"]))
    cost_rows = [
        ["Earth-observation data", "All free: Sentinel-2 (Copernicus), MODIS (NASA), SRTM (USGS), MCD64A1 (NASA), WorldCover (ESA)."],
        ["Compute (training)", "Google Earth Engine free tier + one MacBook for ~12 s × 100 iterations ≈ negligible (≈ 0.5 kWh total)."],
        ["Compute (live)", "Vercel free + Pro for the team; the deployed function bundle is 4 MB. Estimated ≈ €0 / month at current traffic."],
        ["Storage", "Upstash Redis free tier (10 000 commands / day). We use ≈ 1 400 / day."],
        ["External APIs", "AEMET (free), FIRMS (free w/ key), Open-Meteo (free, no key), Overpass (free), ORS (free 2 000 / day). Total: €0 / month."],
        ["Maintenance", "≈ 2 person-hours / month to update tokens and re-train on new fire seasons."],
        ["Personnel (project)", "Five MSc students × ~120 h each ≈ 600 person-hours total over 6 months."],
    ]
    story.append(para_table(["Bucket", "Detail"], cost_rows, [4.5, 12.0], s))

    story.append(Paragraph("Revenue / sustainability side", s["h3"]))
    for b in [
        "<b>Public-grant model.</b> Xunta de Galicia annually funds PLADIGA-aligned technology pilots. Fire-See aligns with the &quot;preventive fuel management&quot; line and is a natural fit.",
        "<b>Freemium B2B.</b> Free dashboard for the public; paid white-label embed + custom-AOI training for Comunidades de Montes and insurance carriers underwriting Galician forestry policies.",
        "<b>Open-source + service.</b> Codebase remains MIT, but commercial deployments for non-Galician AOIs pay for consulting and re-training.",
        "<b>Sustainability path.</b> Year 1 — operate at €0 on free tiers, grow embeds (Maria&apos;s council + 2–3 others). Year 2 — apply for a €15 k Xunta grant and one €30 k Comunidades-de-Montes pilot.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("Risks and mitigations", s["h3"]))
    risk_rows = [
        ["Technical", "AEMET API has occasional 429 / 5xx outages.", "KV-backed stale-on-failure cache; status page surfaces the source state publicly."],
        ["Technical", "MCD64A1 understates small fires → label noise.", "Augment with VIIRS active-fire archive in V4; published as a known limitation in the methodology page."],
        ["Regulatory", "Personal-data risk if we ever add user accounts.", "Currently no authentication, no PII collected; GDPR exposure essentially zero."],
        ["Regulatory", "Liability if a council acts on the score and is wrong.", "Methodology page is explicit: &quot;Not a substitute for 112.&quot; CC-BY-4.0 disclaimer."],
        ["Market", "Council adoption stalls if competing official tool launches.", "Pivot to B2B Comunidades-de-Montes prevention budgeting (Manuel&apos;s use case), which is currently un-served."],
        ["Market", "Communal assemblies distrust &quot;black-box AI&quot;.", "Methodology / glossary pages, downloadable model card and citation block let any assembly audit the model."],
    ]
    story.append(
        para_table(
            ["Type", "Risk", "Mitigation"],
            risk_rows,
            [2.5, 7.0, 7.0],
            s,
        )
    )

    story.append(PageBreak())

    # ====================================================================
    # 5. COMMUNICATION AND FINAL DELIVERABLE — 10%
    # ====================================================================
    story.append(Paragraph("5. Communication and final deliverable", s["h1"]))

    story.append(Paragraph("5.1 Form of communication chosen", s["h2"]))
    story.append(
        Paragraph(
            "We built a public, no-login web dashboard. The decision was driven "
            "directly by stakeholder feedback: María (§2.3) said &quot;I want "
            "something I can put on a slide and bring to a community "
            "assembly&quot;, José said citizens will not register for an "
            "account, and Manuel said the assembly needs to verify the model on "
            "their own machine. A Jupyter notebook would have failed Maria, a "
            "mobile-only app would have failed Manuel&apos;s ArcGIS workflow, "
            "and a paid SaaS would have failed all of them. A free public web "
            "dashboard with downloadable open data and an embed widget covers "
            "all three audiences with one artefact.",
            s["body"],
        )
    )

    story.append(Paragraph("5.2 Description of the deliverable", s["h2"]))
    story.append(
        kv_table(
            [
                ("Live URL", "perspectives-on-ai-and-sustainabili.vercel.app"),
                (
                    "Update frequency",
                    "Weather every 5 min · Hotspots every 10 min · Risk score every 5 min · NDVI weekly · FWI daily.",
                ),
                ("Access policy", "Public, no authentication, no PII collected."),
                (
                    "Languages",
                    "English UI; methodology page bilingual EN / ES on tooltips; Galego translation pending.",
                ),
            ],
            col1=3.5,
            col2=13,
        )
    )
    story.append(
        figure_image(
            "fig06_map_view.png",
            "<b>Figure 6.</b> Map View — landing page of the dashboard. The eight "
            "Ourense forest zones are extruded by current risk score; floating "
            "panels show Risk Summary, Weather Context and Map Layers, and the "
            "bottom strip carries the 7-day risk trend plus the per-zone threat "
            "distribution bar chart.",
            width_cm=16,
        )
    )
    story.append(
        figure_image(
            "fig07_zone_detail.png",
            "<b>Figure 7.</b> Per-zone deep-dive page (<code>/zones/[id]</code>) for "
            "Serra de San Mamede: hero risk gauge with active weather modifiers, "
            "weather tile grid, NDVI / NDMI sparklines and the 7 / 30 / 90-day "
            "risk-history area chart.",
            width_cm=16,
        )
    )
    story.append(
        figure_image(
            "fig08_methodology.png",
            "<b>Figure 8.</b> Methodology page — the plain-language model card "
            "with feature-importance bars, the four key performance metrics, "
            "and the honest cross-year disclosure that lets a Comunidade de "
            "Montes assembly audit the model before allocating its prevention "
            "budget.",
            width_cm=16,
        )
    )

    story.append(Paragraph("5.3 User test", s["h2"]))
    story.append(
        Paragraph(
            "Beyond the three confirmed stakeholders in §4.2, we ran two informal "
            "tests with users from outside the team to surface usability issues "
            "before submission:",
            s["body"],
        )
    )
    for b in [
        "<b>Carlos Vidal (friend, civil-engineering MSc, ESADE, 28 April 2026):</b> opened the dashboard cold on a 13&quot; laptop. Managed to reach the per-zone deep-dive and understand the FWI ribbon without help. Got confused by the term <i>NDMI</i> on first load — we shipped the click-to-explain MetricInfo popovers the next day in direct response.",
        "<b>Sara Iglesias (classmate, PAIBS cohort, 1 May 2026):</b> tested the embed widget by pasting the iframe snippet into a personal Notion page. Spotted that the embed had no attribution to the underlying data sources; we added a footer line linking to <code>/support</code> in the same week.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))
    story.append(
        Paragraph(
            "Both reports were short, informal and from non-experts — exactly the "
            "audience the project targets — and both led to a same-week fix shipped "
            "to <code>main</code>. We have not yet done a structured A/B test or "
            "moderated usability study; that is on the roadmap for the post-PAIBS "
            "iteration.",
            s["body"],
        )
    )

    # ====================================================================
    # 6. REFLECTION
    # ====================================================================
    story.append(Paragraph("6. Reflection", s["h1"]))
    story.append(Paragraph("One thing the team learned", s["h3"]))
    story.append(
        Paragraph(
            "How quickly an apparently strong model can be wrong: our V2 had an "
            "AUC of 0.99 in random cross-validation — too good to be true. We "
            "spent two weeks tracing it back to two leakage sources at once "
            "(post-burn imagery in the &quot;pre-burn&quot; window, and "
            "non-burn samples on classes that cannot physically burn). The fix "
            "dropped AUC to 0.84 — but is honest. That experience taught us "
            "that <i>checking for leakage is part of model evaluation, not an "
            "optional polish step</i>.",
            s["body"],
        )
    )
    story.append(Paragraph("One thing we would do differently", s["h3"]))
    story.append(
        Paragraph(
            "Start with stakeholder interviews before reading the literature. We "
            "spent the first three weeks of the project deep in Piao et al. "
            "(2022) and other susceptibility-mapping papers before talking to "
            "Rafael; in retrospect, his &quot;biomass build-up in real time&quot; "
            "framing would have steered us away from a static-susceptibility "
            "model from day one.",
            s["body"],
        )
    )
    story.append(Paragraph("One thing we liked", s["h3"]))
    story.append(
        Paragraph(
            "Shipping every change behind a public URL with a versioned model "
            "card. It forced us to be honest: there was no way to quietly "
            "discount a metric when the methodology page in production showed "
            "it next to the previous one.",
            s["body"],
        )
    )
    story.append(Paragraph("One thing we disliked", s["h3"]))
    story.append(
        Paragraph(
            "Google Earth Engine quotas during peak demand. Several extraction "
            "runs failed for opaque reasons and had to be retried at 2 a.m. on "
            "off-peak Galician time. We compensated by binning samples by "
            "year-month so a single GEE evaluation does a year of work, but a "
            "more elegant solution would be a self-hosted COG pipeline for V4.",
            s["body"],
        )
    )
    story.append(Paragraph("One thing we may change", s["h3"]))
    story.append(
        Paragraph(
            "Move the model from a single Random Forest to a calibrated "
            "<code>CalibratedClassifierCV</code> with isotonic regression, so "
            "the &quot;75 %&quot; the dashboard shows literally means &quot;75 "
            "out of 100 such days end in fire&quot;. The runtime tree walker "
            "would not have to change; only the leaf probabilities and a small "
            "mapping table.",
            s["body"],
        )
    )

    # ====================================================================
    # 7. REFERENCES
    # ====================================================================
    story.append(Paragraph("7. References", s["h1"]))
    refs = [
        "Piao, Y., Lee, D., Park, S., Kim, H. G., &amp; Jin, Y. (2022). <i>Forest fire susceptibility assessment using Google Earth Engine in Gangwon-do, Republic of Korea.</i> Geomatics, Natural Hazards and Risk, 13(1), 432–450. doi.org/10.1080/19475705.2022.2030808",
        "Van Wagner, C. E. (1987). <i>Development and Structure of the Canadian Forest Fire Weather Index System.</i> Forestry Technical Report 35. Canadian Forestry Service.",
        "European Commission, Joint Research Centre (2023). <i>Forest Fires in Europe, Middle East and North Africa — 2022 Annual Report.</i> Publications Office of the European Union.",
        "Xunta de Galicia (2024). <i>Plan de Prevención e Defensa contra os Incendios Forestais de Galicia (PLADIGA).</i>",
        "MITECO (2024). <i>Estadística General de Incendios Forestales (EGIF) — Series Históricas 1968–2023.</i> Ministerio para la Transición Ecológica y el Reto Demográfico.",
        "Zanaga, D. et al. (2022). <i>ESA WorldCover 10 m 2021 v200.</i> Zenodo. doi.org/10.5281/zenodo.7254221",
        "Giglio, L., Boschetti, L., Roy, D. P., Humber, M. L., &amp; Justice, C. O. (2018). <i>The Collection 6 MODIS burned area mapping algorithm and product.</i> Remote Sensing of Environment, 217, 72–85.",
        "Wan, Z. (2014). <i>New refinements and validation of the collection-6 MODIS land-surface temperature product.</i> Remote Sensing of Environment, 140, 36–45.",
        "ECMWF Copernicus Climate Change Service (2022). <i>2022 European heatwave bulletin.</i>",
        "AEMET (n.d.). <i>OpenData API documentation.</i> opendata.aemet.es",
    ]
    for i, r in enumerate(refs, 1):
        story.append(Paragraph(f"[{i}]  {r}", s["small"]))

    # ====================================================================
    # 8. APPENDICES
    # ====================================================================
    story.append(Paragraph("8. Appendices", s["h1"]))
    story.append(Paragraph("A. Interview transcript snippet — Manuel Lorenzo", s["h3"]))
    story.append(
        Paragraph(
            "<b>Date:</b> 12 January 2026 &nbsp;&nbsp;|&nbsp;&nbsp; <b>Topic:</b> "
            "preventive budgeting in a Comunidade de Montes",
            s["small"],
        )
    )
    transcript = [
        ("Marc", "How do you decide where to send the brush-cutters each spring?"),
        ("Manuel", "It is a discussion. One neighbour says the north slope is overgrown, another says the path to the shrine is blocked. We have money to clean maybe 5 % of the land. It is a lottery."),
        ("Marc", "If we gave you a map showing which areas have the driest biomass and the highest fuel load, would you use it?"),
        ("Manuel", "If it works, yes. It justifies the expense to the assembly. I can say, &quot;we are clearing Zone B because the machine says it will burn, not just because I said so.&quot;"),
    ]
    for who, what in transcript:
        story.append(Paragraph(f"<b>{who}.</b>  {what}", s["bullet_tight"]))

    story.append(Paragraph("B. Data layer dictionary", s["h3"]))
    dld = [
        ["Sentinel-2", "NDVI / NDMI", "Biomass density and vegetation moisture"],
        ["Sentinel-3 / MODIS", "LST (Land Surface Temp)", "Heat accumulation (real-time thermal)"],
        ["DEM (SRTM)", "Slope / Aspect", "Fire spread speed (topography)"],
        ["AEMET (API)", "Wind / Humidity", "Weather forcing (hyperlocal)"],
        ["ESA WorldCover", "Land-cover class", "Restrict sampling to burnable land"],
        ["MCD64A1", "BurnDate (DOY)", "Ground-truth label for training"],
    ]
    story.append(para_table(["Data source", "Variable", "Project purpose"], dld, [4.5, 5.5, 6.5], s))

    story.append(Paragraph("C. Model card excerpt (full version on /methodology)", s["h3"]))
    mc = [
        ["Model", "RandomForestV3 · 200 trees · min_samples_leaf 2"],
        ["Training period", "May–September 2018–2022 (five fire seasons)"],
        ["Samples", "2 929 (≈ 50 / 50 burned / non-burned, paired DOY)"],
        ["Features (7)", "NDVI, NDMI, LST, slope, aspect, elevation, dist_urban"],
        ["AUC (random 5-fold CV)", "0.84"],
        ["AUC (leave-one-year-out)", "0.66"],
        ["Random seed", "42"],
        ["Code", "ml/train_v3.py + ml/extract_v3.py"],
    ]
    story.append(para_table(["Field", "Value"], mc, [4.5, 12.0], s))

    story.append(Paragraph("D. Marking weights mapping", s["h3"]))
    mw = [
        ["Problem definition and research quality (20 %)", "Section 2"],
        ["Technical implementation (50 %)", "Section 3"],
        ["Business validation (20 %)", "Section 4"],
        ["Communication and presentation (10 %)", "Sections 1, 5 and 6"],
    ]
    story.append(para_table(["Component", "Where it lives"], mw, [9.0, 7.5], s))

    doc.build(story)
    print(f"✓ wrote {OUT}  ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build()
