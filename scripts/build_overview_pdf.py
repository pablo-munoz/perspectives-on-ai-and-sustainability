"""
Generate a Fire-See project overview PDF in plain English.

Audience: colleagues / non-experts who need the gist without reading the
methodology page.

Run:
  ml/.venv/bin/python scripts/build_overview_pdf.py
Output:
  docs/Fire-See-Overview.pdf
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[1] / "docs" / "Fire-See-Overview.pdf"

# Plain document palette — black on white, two greys, one subtle rule.
BLACK = colors.HexColor("#111111")
BODY = colors.HexColor("#1F1F1F")
MUTED = colors.HexColor("#555555")
SUBTLE = colors.HexColor("#888888")
RULE = colors.HexColor("#BBBBBB")
ROW_ALT = colors.HexColor("#F4F4F2")
HEADER_BG = colors.HexColor("#EFEFED")


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
            spaceAfter=2,
        ),
        "subtitle": H(
            name="Subtitle",
            fontName="Times-Roman",
            fontSize=11,
            leading=15,
            textColor=MUTED,
            spaceAfter=16,
        ),
        "h2": H(
            name="H2",
            fontName="Times-Bold",
            fontSize=14.5,
            leading=18,
            textColor=BLACK,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "h3": H(
            name="H3",
            fontName="Times-Bold",
            fontSize=11,
            leading=14,
            textColor=BLACK,
            spaceBefore=10,
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
            alignment=TA_LEFT,
        ),
        "body_muted": H(
            name="BodyMuted",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=15,
            textColor=MUTED,
            spaceAfter=8,
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
            spaceBefore=6,
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
            spaceAfter=4,
        ),
    }


def page_chrome(canvas, doc):
    """Minimal header rule and footer page number on every page."""
    width, height = A4
    canvas.saveState()
    # Header text
    canvas.setFillColor(SUBTLE)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(1.6 * cm, height - 1.2 * cm, "FIRE-SEE  ·  Project overview")
    canvas.drawRightString(width - 1.6 * cm, height - 1.2 * cm, "May 2026")
    # Header rule
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(1.6 * cm, height - 1.3 * cm, width - 1.6 * cm, height - 1.3 * cm)
    # Footer
    canvas.setFillColor(SUBTLE)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 1.6 * cm, 1 * cm, f"{doc.page}")
    canvas.drawString(1.6 * cm, 1 * cm, "Pablo Muñoz")
    canvas.restoreState()


def hr() -> HRFlowable:
    return HRFlowable(width="100%", thickness=0.4, color=RULE, spaceBefore=6, spaceAfter=10)


def kv_row(rows: list[tuple[str, str]]) -> Table:
    """A clean 2-column key/value table — used for the at-a-glance block."""
    tbl = Table(
        [[k.upper(), v] for k, v in rows],
        colWidths=[4.5 * cm, 12 * cm],
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
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return tbl


def data_sources_table() -> Table:
    rows = [
        ["Source", "What it gives us", "Refresh"],
        ["AEMET", "Live weather (station 1690A · Ourense)", "5 min"],
        ["NASA FIRMS · VIIRS", "Where satellites see active fires", "10 min"],
        ["Open-Meteo", "7-day weather forecast (FWI inputs)", "1 h"],
        ["Copernicus EFFIS", "EU fire-danger raster (map overlay)", "Daily"],
        ["NASA GIBS", "Satellite imagery tiles", "Daily"],
        ["OpenStreetMap", "Fire stations / hospitals / water points", "On demand"],
        ["OpenRouteService", "Drive-time evacuation circles", "On demand"],
        ["Sentinel-2 (GEE)", "Vegetation health (NDVI) and moisture (NDMI)", "Weekly"],
    ]
    tbl = Table(rows, colWidths=[4.3 * cm, 9.6 * cm, 2.8 * cm])
    tbl.setStyle(_table_style(rows))
    return tbl


def feature_importance_table() -> Table:
    feats = [
        ("Elevation", "How high above sea level the patch is", 19.8),
        ("Surface temperature", "How hot the ground is right now", 18.1),
        ("Distance to urban areas", "How remote the patch is", 16.4),
        ("Slope steepness", "How much fire could race uphill", 12.4),
        ("Vegetation moisture (NDMI)", "How wet the plants are", 11.9),
        ("Vegetation greenness (NDVI)", "How healthy the canopy looks", 11.9),
        ("Slope aspect", "Which compass direction the slope faces", 9.5),
    ]
    rows = [["Clue", "What it captures", "Weight"]]
    for name, plain, pct in feats:
        rows.append([name, plain, f"{pct:.1f}%"])
    tbl = Table(rows, colWidths=[4.8 * cm, 7.5 * cm, 4.4 * cm])
    tbl.setStyle(_table_style(rows, right_align_last=True))
    return tbl


def comparison_table() -> Table:
    rows = [
        ["", "V1 (before)", "V3 (after)", "Change"],
        ["AUC (5-fold CV)", "0.74", "0.84", "+0.10"],
        ["Accuracy", "67 %", "79 %", "+12 pp"],
        ["Cohen's κ", "0.33", "0.48", "+0.15"],
        ["Training samples", "1 200", "2 929", "+1 729"],
        ["Fire seasons covered", "1 (median 2017–2023)", "5 (2018–2022)", "—"],
        ["Trees in the forest", "200", "200", "—"],
    ]
    tbl = Table(rows, colWidths=[4.6 * cm, 4 * cm, 4 * cm, 4.1 * cm])
    tbl.setStyle(_table_style(rows, right_align_numeric=True))
    return tbl


def _table_style(rows: list[list[str]], right_align_last: bool = False, right_align_numeric: bool = False) -> TableStyle:
    n = len(rows)
    style = [
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), BLACK),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, RULE),
        # Body
        ("FONT", (0, 1), (-1, -1), "Times-Roman", 10),
        ("FONT", (0, 1), (0, -1), "Times-Bold", 10),
        ("TEXTCOLOR", (0, 1), (-1, -1), BODY),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, RULE),
        # Layout
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    # Alternating row tint
    for i in range(1, n):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    if right_align_last:
        style.append(("ALIGN", (-1, 0), (-1, -1), "RIGHT"))
        style.append(("FONT", (-1, 1), (-1, -1), "Helvetica", 10))
    if right_align_numeric:
        for col in (1, 2, 3):
            style.append(("ALIGN", (col, 0), (col, -1), "CENTER"))
            style.append(("FONT", (col, 1), (col, -1), "Helvetica", 10))
    return TableStyle(style)


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=1.6 * cm,
        title="Fire-See — Project Overview",
        author="Pablo Muñoz",
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
    story: list = []

    # === Cover ===
    story.append(Paragraph("Fire-See", s["title"]))
    story.append(
        Paragraph(
            "A free, public dashboard that estimates wildfire risk for the forests of "
            "Ourense, Galicia, by stitching together open satellite, weather and "
            "geospatial datasets. Built as a research-grade prototype that anyone — "
            "rangers, journalists, residents — can read, share and learn from.",
            s["subtitle"],
        )
    )
    story.append(hr())
    story.append(
        kv_row(
            [
                ("Zones tracked", "8 forest perimeters in Ourense province"),
                ("Live data sources", "9 (all open and free)"),
                ("Model AUC", "0.84 (up from 0.74 in V1)"),
                ("Refresh rate", "Weather and risk every 5 minutes"),
                ("Live URL", "perspectives-on-ai-and-sustainabili.vercel.app"),
            ]
        )
    )
    story.append(Spacer(1, 14))

    # === The problem ===
    story.append(Paragraph("The problem we are tackling", s["h2"]))
    story.append(
        Paragraph(
            "Galicia loses tens of thousands of hectares of forest every fire "
            "season. Local rangers, civil-protection workers and residents need a "
            "single place to see <b>which forest zones are most at risk right now</b>, "
            "why, and what conditions are coming over the next week. Existing "
            "official tools are either continent-wide (so the resolution is too "
            "coarse for a Galician valley) or behind paywalls. Fire-See fills that "
            "gap with a single dashboard that ranks the eight key forest zones in "
            "Ourense province on a 0–100 % risk scale, refreshed live.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "It is explicitly <b>not</b> an emergency service — for live emergencies "
            "people still call 112 — but it is a public tool for awareness, "
            "preparation and journalism.",
            s["body_muted"],
        )
    )

    # === How it works ===
    story.append(Paragraph("How it works in thirty seconds", s["h2"]))
    story.append(
        Paragraph(
            "Fire-See pulls live data from nine open sources, runs each forest zone "
            "through a machine-learning model trained on five fire seasons of real "
            "Galician fires, and shows the result on a 3-D map. The whole pipeline "
            "is open source, deployed on Vercel, and uses only free APIs.",
            s["body"],
        )
    )
    story.append(Paragraph("The nine data sources", s["h3"]))
    story.append(data_sources_table())

    story.append(PageBreak())

    # === The model ===
    story.append(Paragraph("The model: a Random Forest of 200 judges", s["h2"]))
    story.append(
        Paragraph(
            "The risk number for each zone comes from a <b>Random Forest classifier</b> "
            "with 200 decision trees. Picture 200 small judges, each one looking at "
            "the same forest patch and voting &quot;risky&quot; or &quot;safe&quot; "
            "based on a handful of clues. We average their votes — the percentage of "
            "judges that voted &quot;risky&quot; is the headline score on the "
            "dashboard.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Why a Random Forest?</b> It is the standard choice for tabular "
            "classification at our data scale (thousands of examples, dozens of "
            "features). It handles non-linear effects out of the box, does not need "
            "feature scaling, gives us feature-importance scores for free, and we "
            "can export the trees as a small JSON file that runs in the browser "
            "without any heavy runtime dependency. We tried gradient boosting "
            "(HistGradientBoosting) and stacking ensembles too — Random Forest "
            "stayed competitive while keeping the deployment trivial.",
            s["body"],
        )
    )

    story.append(Paragraph("What each judge weighs", s["h3"]))
    story.append(feature_importance_table())
    story.append(
        Paragraph(
            "Each clue is a column in the model's input table. Together they describe "
            "the &quot;personality&quot; of a forest patch on the day in question.",
            s["small"],
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("Training data", s["h3"]))
    story.append(
        Paragraph(
            "We taught the judges by showing them <b>2,929 real examples</b> from "
            "Galician fire seasons 2018–2022. Half were patches that actually "
            "burned (NASA&apos;s satellite-derived MCD64A1 burn map flagged them); "
            "the other half were similar-looking patches on forest / shrub / grass "
            "land that did not burn that year. The model learns the patterns that "
            "show up <i>before</i> a patch catches fire.",
            s["body"],
        )
    )

    story.append(Paragraph("Where the original methodology comes from", s["h3"]))
    story.append(
        Paragraph(
            "Our first model (V1) was a direct Galician adaptation of <b>Piao et al. "
            "(2022)</b>, &quot;Forest fire susceptibility assessment using Google "
            "Earth Engine in Gangwon-do, Republic of Korea&quot; (<i>Geomatics, "
            "Natural Hazards and Risk</i>). The paper trains a Random Forest on a "
            "stack of Sentinel-2 vegetation indices, MODIS land-surface temperature "
            "and SRTM terrain features, all extracted through Google Earth Engine — "
            "exactly the recipe we ported to Ourense. Their reported AUC on a Korean "
            "test set was <b>0.835</b>; our V1 reached 0.74 on Galician data, and "
            "V3 (described next) closes that gap to 0.84.",
            s["body"],
        )
    )

    story.append(PageBreak())

    # === Improvement ===
    story.append(Paragraph("Improving the model: V1 → V3", s["h2"]))
    story.append(
        Paragraph(
            "Our first model (V1, deployed early 2026) hit an AUC of 0.74 — decent "
            "but with several quiet flaws. V3 (May 2026) rebuilds the dataset and "
            "the pipeline from scratch and lifts AUC to 0.84.",
            s["body"],
        )
    )

    story.append(Paragraph("What changed", s["h3"]))
    bullets = [
        (
            "Re-extracted the training data from Google Earth Engine.",
            "Instead of using one summer-median snapshot per forest patch, we now take "
            "a 30-day window of NDVI / NDMI / surface temperature <i>strictly before</i> "
            "each fire date. This stops the model from seeing post-burn imagery and "
            "learning the wrong thing.",
        ),
        (
            "Paired the burned and non-burned classes on date.",
            "Each non-burned example inherits its date from a randomly-chosen burned "
            "example. That guarantees both classes share the same calendar "
            "distribution, removing the seasonal leak (without it the model would "
            "trivially separate classes via &quot;is it summer?&quot;).",
        ),
        (
            "Restricted sampling to land that can actually burn.",
            "ESA WorldCover labels every pixel of Europe as urban, water, crops, "
            "tree-cover, shrubland, etc. We now sample only the tree-cover, "
            "shrubland and grassland classes — so the model is not separating "
            "&quot;forest vs. river&quot; but rather &quot;forest that burned vs. "
            "forest that did not.&quot;",
        ),
        (
            "Dropped the broken &quot;distance to roads&quot; feature.",
            "The original feature pulled from a global roads dataset that returns a "
            "constant value in our bbox, so it carried zero signal. Replaced it "
            "with &quot;distance to urban areas&quot; using ESA WorldCover, which "
            "actually varies.",
        ),
        (
            "More years of data — five fire seasons instead of one.",
            "Training samples grew from 1,200 to 2,929. We also moved from a single "
            "70/30 split to <b>5-fold cross-validation</b>, which gives a more honest "
            "estimate of how well the model generalises.",
        ),
        (
            "Tested ensembling — kept it simple.",
            "HistGradientBoosting and stacking ensembles bumped AUC by another "
            "0.5–1 point, but the gain was not worth the deployment complexity of "
            "new tree formats in the browser. We stuck with Random Forest.",
        ),
    ]
    for title, body in bullets:
        story.append(
            Paragraph(
                f"• <b>{title}</b> {body}",
                s["bullet"],
            )
        )
    story.append(Spacer(1, 8))

    story.append(Paragraph("Side-by-side metrics", s["h3"]))
    story.append(comparison_table())

    story.append(
        Paragraph(
            "An honest note. The 0.84 above is from random 5-fold cross-validation "
            "(the same metric V1 was reported on). If we use the harder &quot;leave "
            "one whole year out&quot; test — train on four fire seasons and predict "
            "a year the model has never seen — AUC drops to around 0.66. That gap is "
            "the gap between &quot;sees similar weather&quot; and &quot;sees a new "
            "climate.&quot; We report both on the methodology page so users can read "
            "the score with the right caveats.",
            s["footnote"],
        )
    )

    story.append(PageBreak())

    # === What ships ===
    story.append(Paragraph("What ships on the dashboard", s["h2"]))
    items = [
        (
            "3-D map view.",
            "Eight forest zones extruded by current risk score, plus optional "
            "satellite, EU FWI and historical-fire overlays.",
        ),
        (
            "Zone deep-dive pages.",
            "Permalink per zone with a hero risk gauge, weather tiles, NDVI / NDMI "
            "sparklines and a 7 / 30 / 90-day risk history.",
        ),
        (
            "Fire Weather Index (FWI).",
            "Computed in your browser using Van Wagner&apos;s 1987 equations — the "
            "same standard the EU uses for all its official fire warnings.",
        ),
        (
            "Drought, air-quality and incidents pages.",
            "Side panels for KBDI / SPI drought signals, PM2.5 smoke from Copernicus, "
            "and a chronological incidents timeline clustered from satellite hotspots.",
        ),
        (
            "Hotspot context panel.",
            "Click any satellite-detected fire on the map to see the nearest fire "
            "stations, hospitals, water points and 10 / 15-minute drive-time circles.",
        ),
        (
            "Embed widgets.",
            "Council websites or news outlets can drop a live risk badge for any of "
            "the eight zones with one line of HTML.",
        ),
        (
            "Open data, RSS and iCal.",
            "Every dataset is downloadable as CSV or GeoJSON. There is an RSS feed "
            "for high-risk zones and an iCal feed for upcoming Very-High FWI days.",
        ),
        (
            "Plain-language methodology and glossary.",
            "Every technical term has a click-to-explain tooltip linked to a "
            "permalinked entry.",
        ),
    ]
    for title, body in items:
        story.append(
            Paragraph(
                f"• <b>{title}</b> {body}",
                s["bullet"],
            )
        )

    story.append(Spacer(1, 8))
    story.append(Paragraph("Stack", s["h3"]))
    story.append(
        Paragraph(
            "Next.js 15 · React 19 · Mapbox GL · Tailwind CSS · Upstash Redis (KV) · "
            "Vercel · Python (scikit-learn) and Google Earth Engine for training.",
            s["body_muted"],
        )
    )

    story.append(Paragraph("Where to look", s["h3"]))
    story.append(
        kv_row(
            [
                ("Live dashboard", "perspectives-on-ai-and-sustainabili.vercel.app"),
                ("Source code", "github.com/pablo-munoz/perspectives-on-ai-and-sustainability"),
                ("Methodology page", "/methodology"),
                ("Open data and API docs", "/data"),
                ("Author", "Pablo Muñoz"),
            ]
        )
    )

    story.append(Paragraph("References", s["h3"]))
    story.append(
        Paragraph(
            "Piao, Y. et al. (2022). <i>Forest fire susceptibility assessment using "
            "Google Earth Engine in Gangwon-do, Republic of Korea.</i> Geomatics, "
            "Natural Hazards and Risk, 13(1), 432–450.",
            s["small"],
        )
    )
    story.append(
        Paragraph(
            "Van Wagner, C. E. (1987). <i>Development and Structure of the Canadian "
            "Forest Fire Weather Index System.</i> Forestry Technical Report 35, "
            "Canadian Forestry Service.",
            s["small"],
        )
    )

    doc.build(story)
    print(f"✓ wrote {OUT}  ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build()
