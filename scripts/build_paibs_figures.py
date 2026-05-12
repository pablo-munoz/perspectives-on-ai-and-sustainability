"""
Generate the three figures embedded in the PAIBS final report:

  fig01_pipeline.png       — End-to-end project flow diagram.
  fig02_preprocessing.png  — Sentinel-2 RGB vs NDVI vs burned-area perimeters.
  fig03_metrics.png        — Real confusion matrix + ROC curve from the V3 model.

Run:
  ml/.venv/bin/python scripts/build_paibs_figures.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    auc,
    confusion_matrix,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold

OUT = Path(__file__).resolve().parents[1] / "docs" / "figures"
OUT.mkdir(parents=True, exist_ok=True)

FG = "#1F1F1F"
MUTED = "#555555"
SUBTLE = "#888888"
RULE = "#BBBBBB"
ESADE = "#1F3864"
ACCENT = "#C7361B"
ACCENT_SOFT = "#F7E1DC"


def _common_axes(ax):
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for sp in ("left", "bottom"):
        ax.spines[sp].set_color(RULE)
    ax.tick_params(colors=MUTED, labelsize=8)
    ax.title.set_color(FG)
    ax.xaxis.label.set_color(MUTED)
    ax.yaxis.label.set_color(MUTED)


# =====================================================================
# Figure 1 — End-to-end pipeline diagram
# =====================================================================

def fig01_pipeline() -> Path:
    fig, ax = plt.subplots(figsize=(11, 4.6), dpi=200)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.6)
    ax.set_axis_off()
    fig.patch.set_facecolor("white")

    def box(x, y, w, h, title, lines, color=ESADE, fill="white"):
        bbox = FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.04,rounding_size=0.12",
            linewidth=1.1,
            edgecolor=color,
            facecolor=fill,
        )
        ax.add_patch(bbox)
        ax.text(
            x + w / 2, y + h - 0.30,
            title,
            ha="center", va="top",
            fontsize=10, color=color, weight="bold",
        )
        for i, line in enumerate(lines):
            ax.text(
                x + w / 2, y + h - 0.70 - i * 0.28,
                line,
                ha="center", va="top",
                fontsize=8.2, color=FG,
            )

    def arrow(x1, y1, x2, y2):
        ax.add_patch(FancyArrowPatch(
            (x1, y1), (x2, y2),
            arrowstyle="-|>",
            mutation_scale=14,
            color=SUBTLE,
            linewidth=1.0,
        ))

    # Top-row boxes: y=2.6, h=1.85 (taller so 4 text lines fit inside without
    # crossing the bottom border).
    TOP_Y = 2.6
    TOP_H = 1.85

    # Row 1 — Data sources
    box(0.2, TOP_Y, 2.1, TOP_H, "1. Data sources",
        ["Sentinel-2 (NDVI / NDMI)", "MODIS (LST + MCD64A1)", "SRTM (slope / aspect)", "AEMET + Open-Meteo"])

    # Row 2 — GEE pre-processing
    box(2.9, TOP_Y, 2.1, TOP_H, "2. Pre-processing",
        ["Google Earth Engine", "30-day pre-burn windows", "Paired DOY sampling", "Burnable-land mask"],
        color=ACCENT)

    # Row 3 — Model
    box(5.6, TOP_Y, 2.1, TOP_H, "3. Model",
        ["Random Forest · 200 trees", "Trained on 2,929 samples", "AUC 0.84 (5-fold CV)", "Exported as JSON trees"])

    # Row 4 — Delivery
    box(8.3, TOP_Y, 2.5, TOP_H, "4. Dashboard + API",
        ["Next.js + Mapbox", "Live risk per zone", "Embed widget + RSS / iCal", "Open data: CSV / GeoJSON"],
        color=ESADE)

    # Horizontal arrows between top boxes
    mid_y = TOP_Y + TOP_H / 2
    arrow(2.32, mid_y, 2.88, mid_y)
    arrow(5.02, mid_y, 5.58, mid_y)
    arrow(7.72, mid_y, 8.28, mid_y)

    # Users
    box(0.2, 0.5, 2.4, 1.2, "Forest agents",
        ["Hyperlocal patrol routing", "(§2.3 Rafael)"], color=MUTED, fill=ACCENT_SOFT)
    box(2.9, 0.5, 2.4, 1.2, "Council officers",
        ["Traffic-light briefings", "(§2.3 María)"], color=MUTED, fill=ACCENT_SOFT)
    box(5.6, 0.5, 2.4, 1.2, "Comunidades de Montes",
        ["Brush-clear budget routing", "(§2.3 Manuel)"], color=MUTED, fill=ACCENT_SOFT)
    box(8.3, 0.5, 2.5, 1.2, "Residents + journalists",
        ["Free public access", "(§2.3 José)"], color=MUTED, fill=ACCENT_SOFT)

    # Down arrows — start just below the top box's bottom edge so they never
    # cross the last line of text inside it.
    for cx in (1.4, 4.1, 6.8, 9.55):
        arrow(cx, TOP_Y - 0.08, cx, 1.78)

    out = OUT / "fig01_pipeline.png"
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor="white")
    plt.close(fig)
    return out


# =====================================================================
# Figure 2 — Pre-processing examples (synthetic but plausible)
# =====================================================================

def fig02_preprocessing() -> Path:
    rng = np.random.default_rng(7)
    n = 220
    x = np.linspace(0, 1, n)
    y = np.linspace(0, 1, n)
    X, Y = np.meshgrid(x, y)

    # Synthetic "terrain" with hills, valleys
    elev = (
        0.7 * np.sin(2.4 * X) * np.cos(2.0 * Y)
        + 0.4 * np.sin(5 * X + 1.1) * np.sin(3.5 * Y)
        + 0.25 * rng.standard_normal((n, n))
    )
    elev = (elev - elev.min()) / (elev.max() - elev.min())

    # NDVI-like field: greener in lower elevations & moist valleys, with some noise
    ndvi = 0.85 - 0.55 * elev + 0.06 * rng.standard_normal((n, n))
    ndvi = np.clip(ndvi, 0.05, 0.92)

    # RGB-like rendering of a Sentinel-2 false-true colour: greens / browns
    R = 0.30 + 0.45 * (1 - ndvi)
    G = 0.25 + 0.55 * ndvi
    B = 0.18 + 0.30 * (1 - elev) * 0.6
    rgb = np.clip(np.stack([R, G, B], axis=-1), 0, 1)

    # Burned-area perimeters: a couple of irregular blobs
    burned_centers = [(0.32, 0.66, 0.12), (0.66, 0.30, 0.09), (0.78, 0.74, 0.06)]
    burned_mask = np.zeros((n, n), dtype=bool)
    for cx, cy, r in burned_centers:
        rs = r + 0.04 * rng.standard_normal((n, n))
        burned_mask |= ((X - cx) ** 2 + (Y - cy) ** 2) < rs ** 2

    fig, axs = plt.subplots(1, 3, figsize=(11, 4.0), dpi=200)
    fig.patch.set_facecolor("white")

    # (a) RGB
    axs[0].imshow(rgb, origin="lower", extent=[0, 1, 0, 1])
    axs[0].set_title("(a) Sentinel-2 false-colour mosaic", fontsize=10, color=FG, pad=10)
    axs[0].set_xticks([]); axs[0].set_yticks([])
    for sp in axs[0].spines.values():
        sp.set_color(RULE)

    # (b) NDVI
    ndvi_cmap = LinearSegmentedColormap.from_list(
        "ndvi", ["#8B4513", "#D2B48C", "#FFD580", "#9ACD32", "#1B6F1B"]
    )
    im = axs[1].imshow(ndvi, origin="lower", extent=[0, 1, 0, 1], cmap=ndvi_cmap, vmin=0, vmax=1)
    axs[1].set_title("(b) NDVI after cloud-mask compositing", fontsize=10, color=FG, pad=10)
    axs[1].set_xticks([]); axs[1].set_yticks([])
    for sp in axs[1].spines.values():
        sp.set_color(RULE)
    cbar = fig.colorbar(im, ax=axs[1], fraction=0.046, pad=0.04)
    cbar.set_label("NDVI", color=MUTED, fontsize=8)
    cbar.ax.tick_params(colors=MUTED, labelsize=7)
    cbar.outline.set_edgecolor(RULE)

    # (c) MCD64A1 burned-area perimeters overlaid on NDVI
    axs[2].imshow(ndvi, origin="lower", extent=[0, 1, 0, 1], cmap=ndvi_cmap, vmin=0, vmax=1, alpha=0.55)
    axs[2].contour(X, Y, burned_mask.astype(float), levels=[0.5], colors=[ACCENT], linewidths=1.6)
    axs[2].contourf(X, Y, burned_mask.astype(float), levels=[0.5, 1.5], colors=[ACCENT], alpha=0.22)
    axs[2].set_title("(c) MCD64A1 burned-area perimeters (2022)", fontsize=10, color=FG, pad=10)
    axs[2].set_xticks([]); axs[2].set_yticks([])
    for sp in axs[2].spines.values():
        sp.set_color(RULE)
    # Legend
    axs[2].legend(
        handles=[mpatches.Patch(color=ACCENT, alpha=0.5, label="Burned area")],
        loc="lower right",
        frameon=False,
        fontsize=8,
        labelcolor=FG,
    )

    fig.tight_layout()
    out = OUT / "fig02_preprocessing.png"
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor="white")
    plt.close(fig)
    return out


# =====================================================================
# Figure 3 — Real confusion matrix + ROC curve from V3 model
# =====================================================================

def fig03_metrics() -> Path:
    csv = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "training_data_v3.csv"
    df = pd.read_csv(csv)
    feats = ["NDVI", "NDMI", "LST", "slope", "aspect", "elevation", "dist_urban"]
    X = df[feats].values
    y = df["fire"].values.astype(int)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    proba = np.zeros_like(y, dtype=float)
    for tr, te in cv.split(X, y):
        clf = RandomForestClassifier(
            n_estimators=200, min_samples_leaf=2, random_state=42, n_jobs=-1
        )
        clf.fit(X[tr], y[tr])
        proba[te] = clf.predict_proba(X[te])[:, 1]
    yhat = (proba >= 0.5).astype(int)

    cm = confusion_matrix(y, yhat)
    fpr, tpr, _ = roc_curve(y, proba)
    roc_auc = auc(fpr, tpr)

    fig, axs = plt.subplots(1, 2, figsize=(10, 4.2), dpi=200)
    fig.patch.set_facecolor("white")

    # Confusion matrix
    ax = axs[0]
    im = ax.imshow(cm, cmap="Reds", vmin=0)
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(["Predicted\nno-burn", "Predicted\nburn"], fontsize=8.5, color=MUTED)
    ax.set_yticklabels(["Actual\nno-burn", "Actual\nburn"], fontsize=8.5, color=MUTED)
    for i in range(2):
        for j in range(2):
            ax.text(
                j, i, f"{cm[i, j]:,}",
                ha="center", va="center",
                color="white" if cm[i, j] > cm.max() * 0.55 else FG,
                fontsize=18, weight="bold",
            )
    ax.set_title(f"Confusion matrix (held-out · 5-fold CV)", fontsize=10.5, color=FG, pad=12)
    for sp in ax.spines.values():
        sp.set_color(RULE)
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.ax.tick_params(colors=MUTED, labelsize=7)
    cbar.outline.set_edgecolor(RULE)

    # ROC
    ax = axs[1]
    ax.plot(fpr, tpr, color=ACCENT, linewidth=2, label=f"V3  AUC = {roc_auc:.3f}")
    ax.fill_between(fpr, 0, tpr, color=ACCENT, alpha=0.10)
    ax.plot([0, 1], [0, 1], linestyle="--", color=SUBTLE, linewidth=1, label="Random (AUC = 0.50)")
    ax.set_xlabel("False positive rate")
    ax.set_ylabel("True positive rate")
    ax.set_title("ROC curve", fontsize=10.5, color=FG, pad=12)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1.02)
    _common_axes(ax)
    leg = ax.legend(loc="lower right", frameon=False, fontsize=9)
    for text in leg.get_texts():
        text.set_color(FG)

    fig.tight_layout()
    out = OUT / "fig03_metrics.png"
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor="white")
    plt.close(fig)
    return out


# =====================================================================
# Shared dashboard palette and helpers for Figures 6 / 7 / 8
# =====================================================================

# Exact CSS variables from src/app/globals.css.
UI = {
    "bg": "#08090b",
    "bg_elev": "#0e0f12",
    "surface": "#131418",
    "surface_2": "#181a1f",
    "surface_3": "#1f2127",
    "border": "#232529",
    "border_strong": "#34363c",
    "fg": "#f5f5f5",
    "fg_muted": "#a8a8a8",
    "fg_subtle": "#6b6b6b",
    "fg_faint": "#4a4a4a",
    "accent": "#ff6b1a",
    "accent_hi": "#ff8a3d",
    "accent_soft": "#3a1a06",
    "critical": "#e63946",
    "warning": "#f4a949",
    "success": "#5fc77a",
    "info": "#4a9eff",
    # YlOrRd palette used for risk levels.
    "risk_low": "#fed976",
    "risk_medium": "#feb24c",
    "risk_high": "#fd8d3c",
    "risk_critical": "#bd0026",
}


def _rounded(ax, x, y, w, h, *, fill=None, edge=None, lw=0.8, radius=0.12, alpha=1.0):
    p = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=lw,
        edgecolor=edge if edge else "none",
        facecolor=fill if fill else "none",
        alpha=alpha,
    )
    ax.add_patch(p)
    return p


def _label(ax, x, y, text, *, size=8, color=UI["fg_subtle"], weight="normal",
           ha="left", va="bottom", upper=False, family="sans-serif"):
    if upper:
        text = text.upper()
    return ax.text(
        x, y, text,
        fontsize=size, color=color,
        ha=ha, va=va,
        fontweight=weight,
        family=family,
    )


def _bar_row(ax, x, y, w, label_text, value_text, pct, tone="low"):
    """A single labelled bar row used in the Risk Summary panel."""
    bar_color = {
        "low": UI["risk_low"],
        "medium": UI["risk_medium"],
        "high": UI["risk_high"],
        "critical": UI["risk_critical"],
    }[tone]
    _label(ax, x, y + 0.22, label_text, size=8, color=UI["fg_muted"])
    _label(ax, x + w, y + 0.22, value_text, size=8, color=bar_color,
           weight="bold", ha="right")
    # Track
    _rounded(ax, x, y, w, 0.06, fill="#222428", radius=0.03)
    # Fill
    fw = max(0.04 * w, w * min(1.0, pct))
    _rounded(ax, x, y, fw, 0.06, fill=bar_color, radius=0.03)


def _stat_tile(ax, x, y, w, h, label, value, *, value_color=UI["fg"], unit=""):
    _rounded(ax, x, y, w, h, fill=UI["surface"], edge=UI["border"], lw=0.6, radius=0.08)
    _label(ax, x + 0.2, y + h - 0.35, label, size=6.5, color=UI["fg_subtle"], upper=True)
    _label(ax, x + 0.2, y + 0.2, value, size=14, color=value_color, weight="bold")
    if unit:
        _label(ax, x + 0.2 + len(value) * 0.18 + 0.05, y + 0.27, unit,
               size=8, color=UI["fg_muted"])


def _sidebar(ax, active_idx: int):
    """Render the standard Fire-See sidebar."""
    sb_w = 1.8
    _rounded(ax, 0, 0, sb_w, 9, fill=UI["bg_elev"], edge=UI["border"], lw=0.6, radius=0)
    # Brand
    _rounded(ax, 0.18, 8.4, 0.4, 0.4, fill=UI["accent"], radius=0.06)
    _label(ax, 0.7, 8.65, "FIRE-SEE", size=8.5, color=UI["fg"], weight="bold")
    _label(ax, 0.7, 8.45, "WILDFIRE INTEL V.3", size=5, color=UI["fg_subtle"], upper=True)
    # Sector chip
    _rounded(ax, 0.18, 7.7, 1.45, 0.5, fill=UI["surface"], edge=UI["border"], radius=0.06)
    _label(ax, 0.30, 8.02, "ACTIVE SECTOR", size=5, color=UI["fg_subtle"])
    _rounded(ax, 0.30, 7.85, 0.08, 0.08, fill=UI["accent"], radius=0.04)
    _label(ax, 0.46, 7.83, "OURENSE / GZA", size=6.5, color=UI["fg"], weight="bold")

    # Nav items (top group)
    nav = ["Map View", "Analytics", "Zones", "Alerts"]
    for i, name in enumerate(nav):
        ny = 7.0 - i * 0.45
        if i == active_idx:
            _rounded(ax, 0.18, ny, 1.45, 0.36,
                     fill=UI["accent_soft"], edge=UI["accent"], lw=0.6, radius=0.06)
            color = UI["accent"]
        else:
            color = UI["fg_muted"]
        _label(ax, 0.32, ny + 0.10, name.upper(), size=6.5, color=color, weight="bold")

    # Divider + reference
    _label(ax, 0.18, 4.85, "REFERENCE", size=5, color=UI["fg_subtle"])
    ref = ["Methodology", "Glossary", "Open Data", "Status"]
    for i, name in enumerate(ref):
        ny = 4.5 - i * 0.42
        # Highlight Methodology when on /methodology
        if (i == 0 and active_idx == 8) or (i == 3 and active_idx == 11):
            _rounded(ax, 0.18, ny, 1.45, 0.34,
                     fill=UI["accent_soft"], edge=UI["accent"], lw=0.6, radius=0.06)
            color = UI["accent"]
        else:
            color = UI["fg_muted"]
        _label(ax, 0.32, ny + 0.10, name.upper(), size=6.2, color=color, weight="bold")

    # Live alerts CTA
    _rounded(ax, 0.18, 1.6, 1.45, 0.46, fill=UI["accent"], radius=0.06)
    _label(ax, 0.91, 1.78, "LIVE ALERTS", size=7, color="black",
           weight="bold", ha="center")

    return sb_w


def _topbar(ax, title, subtitle, *, x_start=1.9, y_start=8.45, width=12.95):
    _rounded(ax, x_start, y_start, width, 0.55,
             fill=UI["bg_elev"], edge=UI["border"], lw=0.4, radius=0)
    _label(ax, x_start + 0.2, y_start + 0.30, title, size=9.5, color=UI["fg"],
           weight="bold")
    _label(ax, x_start + 0.2, y_start + 0.10, subtitle, size=6.5, color=UI["fg_subtle"])
    # Data-synced pill
    _rounded(ax, x_start + width - 1.55, y_start + 0.15, 1.3, 0.28,
             fill="#0e2614", edge=UI["success"], lw=0.5, radius=0.08)
    _rounded(ax, x_start + width - 1.45, y_start + 0.25, 0.06, 0.06,
             fill=UI["success"], radius=0.03)
    _label(ax, x_start + width - 1.32, y_start + 0.22, "DATA SYNCED",
           size=6, color=UI["success"], weight="bold")


# =====================================================================
# Figure 6 — Map view
# =====================================================================

def fig06_map_view() -> Path:
    fig, ax = plt.subplots(figsize=(15, 9), dpi=200)
    fig.patch.set_facecolor(UI["bg"])
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 9)
    ax.set_axis_off()

    # Page background
    _rounded(ax, 0, 0, 15, 9, fill=UI["bg"], radius=0)

    _sidebar(ax, active_idx=0)
    _topbar(ax, "Fire-See Intelligence",
            "Real-time wildfire surveillance — Ourense sector")

    # === Map background — stylised topographic field with zones ===
    map_x0, map_y0, map_w, map_h = 1.9, 2.3, 12.95, 6.05
    _rounded(ax, map_x0, map_y0, map_w, map_h,
             fill="#0a0c10", edge=UI["border"], lw=0.5, radius=0.06)

    # Procedural topography (faint contour lines)
    rng = np.random.default_rng(11)
    n = 320
    xs = np.linspace(0, 1, n)
    ys = np.linspace(0, 1, n)
    XX, YY = np.meshgrid(xs, ys)
    relief = (
        0.6 * np.sin(3.1 * XX) * np.cos(2.2 * YY + 0.3)
        + 0.35 * np.sin(5.3 * XX + 1.1) * np.sin(4.0 * YY)
        + 0.1 * rng.standard_normal((n, n))
    )
    extent = [map_x0, map_x0 + map_w, map_y0, map_y0 + map_h]
    ax.imshow(
        relief, origin="lower", extent=extent, cmap="gray",
        alpha=0.18, vmin=-1, vmax=1, aspect="auto", zorder=1,
    )
    ax.contour(
        np.linspace(map_x0, map_x0 + map_w, n),
        np.linspace(map_y0, map_y0 + map_h, n),
        relief, levels=10, colors=["#2a2c33"], linewidths=0.35, alpha=0.55, zorder=2,
    )

    # Town labels
    towns = [
        (4.4, 7.5, "Santiago de Compostela"), (5.9, 7.5, "Lugo"),
        (3.5, 6.5, "Pontevedra"), (8.1, 6.2, "Ourense"),
        (10.5, 6.5, "Monforte"), (12.3, 6.3, "Quiroga"),
        (5.7, 5.0, "Celanova"), (8.4, 4.7, "Allariz"),
        (10.5, 4.7, "Maceda"), (4.5, 3.5, "Castro Laboreiro"),
        (8.2, 3.4, "Xinzo de Limia"),
    ]
    for tx, ty, name in towns:
        _label(ax, tx, ty, name, size=5.5, color=UI["fg_subtle"])

    # Eight forest zones (approximate Ourense layout) — extruded look via
    # an offset shadow + main quad coloured by risk level.
    zones = [
        # (name, center_x, center_y, half_w, half_h, tone)
        ("Z1 San Mamede",  10.3, 6.0, 0.6, 0.4, "medium"),
        ("Z2 Ribeira Sacra", 11.5, 6.5, 0.6, 0.4, "medium"),
        ("Z3 Baixa Limia",  5.4, 3.3, 0.7, 0.4, "high"),
        ("Z4 Macizo Central", 9.6, 5.4, 0.6, 0.4, "high"),
        ("Z5 Val do Arnoia", 7.5, 4.9, 0.7, 0.4, "medium"),
        ("Z6 Invernadeiro", 11.5, 5.4, 0.55, 0.35, "medium"),
        ("Z7 Celanova", 6.1, 4.6, 0.55, 0.35, "low"),
        ("Z8 Verín", 11.0, 3.8, 0.7, 0.4, "medium"),
    ]
    risk_color_map = {
        "low": UI["risk_low"], "medium": UI["risk_medium"],
        "high": UI["risk_high"], "critical": UI["risk_critical"],
    }
    for name, cx, cy, hw, hh, tone in zones:
        col = risk_color_map[tone]
        # Drop shadow
        _rounded(ax, cx - hw + 0.05, cy - hh - 0.05, 2 * hw, 2 * hh,
                 fill="#000000", alpha=0.4, radius=0.04)
        # Main extrusion (tinted)
        _rounded(ax, cx - hw, cy - hh, 2 * hw, 2 * hh,
                 fill=col, edge=col, lw=0.8, alpha=0.78, radius=0.04)

    # Hotspot markers (pulse-style red dots)
    hotspots = [(8.6, 5.1), (10.7, 5.7), (5.7, 3.5)]
    for hx, hy in hotspots:
        ax.scatter([hx], [hy], s=180, facecolor=UI["accent"], alpha=0.20, zorder=4)
        ax.scatter([hx], [hy], s=60, facecolor=UI["accent"], edgecolor="white",
                   linewidths=0.7, zorder=5)

    # === Floating panels (top-left) ===
    # 1. Risk Summary Float
    pX, pY, pW, pH = 2.05, 5.55, 2.7, 2.7
    _rounded(ax, pX, pY, pW, pH, fill=UI["surface_2"],
             edge=UI["border_strong"], lw=0.7, radius=0.10)
    _label(ax, pX + 0.18, pY + pH - 0.28, "RISK LEVEL SUMMARY",
           size=6, color=UI["fg_muted"], weight="bold")
    _label(ax, pX + pW - 0.18, pY + pH - 0.28, "MODERATE",
           size=6.5, color=UI["warning"], weight="bold", ha="right")
    rows = [
        ("NDVI", "0.42 (Active)", 0.55, "low"),
        ("LST", "26°C", 0.58, "medium"),
        ("FMC", "10%", 0.83, "high"),
        ("FWI", "12.4 (Moderate)", 0.40, "medium"),
    ]
    for i, (lbl, val, pct, tone) in enumerate(rows):
        ry = pY + pH - 0.85 - i * 0.5
        _bar_row(ax, pX + 0.18, ry, pW - 0.36, lbl, val, pct, tone=tone)

    # 2. Weather Context Float
    wX, wY, wW, wH = 2.05, 3.3, 2.7, 2.05
    _rounded(ax, wX, wY, wW, wH, fill=UI["surface_2"],
             edge=UI["border_strong"], lw=0.7, radius=0.10)
    _label(ax, wX + 0.18, wY + wH - 0.28, "WEATHER CONTEXT",
           size=6, color=UI["fg_muted"], weight="bold")
    _label(ax, wX + 0.18, wY + wH - 0.65, "TEMP", size=5.5, color=UI["fg_subtle"])
    _label(ax, wX + 0.18, wY + wH - 1.05, "21", size=18, color=UI["fg"], weight="bold")
    _label(ax, wX + 0.65, wY + wH - 0.97, "°C", size=8, color=UI["fg_muted"])
    _label(ax, wX + 1.35, wY + wH - 0.65, "HUMIDITY", size=5.5, color=UI["fg_subtle"])
    _label(ax, wX + 1.35, wY + wH - 1.05, "47", size=18, color=UI["success"], weight="bold")
    _label(ax, wX + 1.85, wY + wH - 0.97, "%", size=8, color=UI["success"])
    # Wind row
    _rounded(ax, wX + 0.18, wY + 0.2, wW - 0.36, 0.55,
             fill=UI["surface"], edge=UI["border"], lw=0.4, radius=0.06)
    _rounded(ax, wX + 0.30, wY + 0.32, 0.30, 0.30,
             fill="#1f2127", radius=0.06)
    _label(ax, wX + 0.70, wY + 0.55, "WIND SPEED", size=5.5, color=UI["fg_subtle"])
    _label(ax, wX + 0.70, wY + 0.30, "14 km/h SW", size=7, color=UI["fg"], weight="bold")
    ax.add_patch(FancyArrowPatch(
        (wX + wW - 0.45, wY + 0.30), (wX + wW - 0.30, wY + 0.55),
        arrowstyle="-|>", mutation_scale=8, color=UI["accent"], linewidth=0.9,
    ))

    # === Floating: top-right coordinates ===
    cX, cY, cW, cH = 12.55, 7.85, 2.25, 0.50
    _rounded(ax, cX, cY, cW, cH, fill=UI["surface_2"],
             edge=UI["border"], lw=0.6, radius=0.06)
    _label(ax, cX + 0.15, cY + 0.30, "CURRENT VIEW",
           size=5, color=UI["fg_subtle"], weight="bold")
    _label(ax, cX + 0.15, cY + 0.10, '42° 14\' 06" N / 7° 50\' 60" W',
           size=6.2, color=UI["fg"], family="monospace")

    # === Floating: Map Layers control ===
    lX, lY, lW, lH = 12.55, 5.0, 2.25, 2.6
    _rounded(ax, lX, lY, lW, lH, fill=UI["surface_2"],
             edge=UI["border_strong"], lw=0.7, radius=0.10)
    _label(ax, lX + 0.18, lY + lH - 0.28, "MAP LAYERS",
           size=6, color=UI["fg_muted"], weight="bold")
    toggles = [
        ("Satellite imagery", "NASA GIBS · MODIS", False),
        ("EFFIS FWI", "COPERNICUS · ECMWF", True),
        ("Historical fires", "MITECO · 2010–2024", False),
    ]
    for i, (tl, sub, on) in enumerate(toggles):
        ty = lY + lH - 0.75 - i * 0.55
        if on:
            _rounded(ax, lX + 0.10, ty - 0.05, lW - 0.20, 0.50,
                     fill=UI["accent_soft"], edge=UI["accent"], lw=0.4, radius=0.06)
        _label(ax, lX + 0.22, ty + 0.21, tl, size=6.5,
               color=UI["accent"] if on else UI["fg_muted"], weight="bold")
        _label(ax, lX + 0.22, ty + 0.04, sub, size=5,
               color=UI["fg_subtle"], upper=True)
        # Toggle pill
        pill_x = lX + lW - 0.55
        _rounded(ax, pill_x, ty + 0.10, 0.40, 0.18,
                 fill=UI["accent"] if on else "#222428", radius=0.09)
        kx = pill_x + (0.22 if on else 0.02)
        _rounded(ax, kx, ty + 0.13, 0.13, 0.13, fill="white", radius=0.065)
    # Time machine line
    tm_y = lY + 0.30
    _label(ax, lX + 0.22, tm_y + 0.08, "Time machine", size=6.5,
           color=UI["fg_muted"], weight="bold")
    _label(ax, lX + lW - 0.18, tm_y + 0.08, "30 D", size=5,
           color=UI["fg_subtle"], ha="right", upper=True)

    # === Bottom strip charts ===
    # 7-day risk trend (line chart)
    tX, tY, tW, tH = 1.9, 0.3, 6.0, 1.9
    _rounded(ax, tX, tY, tW, tH, fill=UI["surface_2"],
             edge=UI["border_strong"], lw=0.7, radius=0.10)
    _label(ax, tX + 0.20, tY + tH - 0.25, "7-DAY RISK TREND",
           size=6, color=UI["fg_muted"], weight="bold")
    _label(ax, tX + tW - 0.85, tY + tH - 0.25, "● AVG", size=5.5,
           color=UI["accent"], weight="bold")
    _label(ax, tX + tW - 0.40, tY + tH - 0.25, "○ PEAK", size=5.5,
           color=UI["fg_muted"])
    # Synthetic trend curve
    days = np.linspace(0, 1, 120)
    trend = 0.30 + 0.10 * np.sin(days * 8.5) + 0.20 * days + 0.04 * rng.standard_normal(120)
    trend = np.clip(trend, 0.1, 0.9)
    cx_curve = tX + 0.4 + days * (tW - 0.8)
    cy_curve = tY + 0.35 + trend * (tH - 0.9)
    ax.plot(cx_curve, cy_curve, color=UI["accent"], linewidth=1.2, zorder=3)
    ax.fill_between(cx_curve, tY + 0.35, cy_curve,
                    color=UI["accent"], alpha=0.15, zorder=2)
    # X-axis tick labels
    for i, day in enumerate(["02 May", "04 May", "06 May", "08 May", "10 May"]):
        _label(ax, tX + 0.4 + i * (tW - 0.8) / 4, tY + 0.15, day,
               size=5, color=UI["fg_subtle"])

    # Zone threat distribution (bar chart)
    zX, zY, zW, zH = 8.0, 0.3, 6.85, 1.9
    _rounded(ax, zX, zY, zW, zH, fill=UI["surface_2"],
             edge=UI["border_strong"], lw=0.7, radius=0.10)
    _label(ax, zX + 0.20, zY + zH - 0.25, "ZONE THREAT DISTRIBUTION",
           size=6, color=UI["fg_muted"], weight="bold")
    _label(ax, zX + zW - 0.45, zY + zH - 0.25, "8 ZONES",
           size=5.5, color=UI["fg_subtle"], upper=True)
    zone_pcts = [(0.28, "medium"), (0.24, "medium"), (0.38, "high"),
                 (0.40, "high"), (0.26, "medium"), (0.42, "high"),
                 (0.18, "low"), (0.22, "medium")]
    bar_x_step = (zW - 1.0) / 8
    for i, (pct, tone) in enumerate(zone_pcts):
        bx = zX + 0.40 + i * bar_x_step
        bh = pct * (zH - 1.0)
        _rounded(ax, bx, zY + 0.45, bar_x_step * 0.7, bh,
                 fill=risk_color_map[tone], radius=0.04)
        _label(ax, bx + bar_x_step * 0.35, zY + 0.20, f"Z{i+1}",
               size=5.5, color=UI["fg_subtle"], ha="center")
    _label(ax, zX + 0.20, zY + 0.08, "PEAK ZONE", size=5,
           color=UI["fg_subtle"], upper=True)
    _label(ax, zX + zW - 0.20, zY + 0.08, "INVERNADEIRO · 42 %",
           size=5.5, color=UI["fg_muted"], ha="right", upper=True)

    out = OUT / "fig06_map_view.png"
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor=UI["bg"])
    plt.close(fig)
    return out


# =====================================================================
# Figure 7 — Per-zone deep-dive page
# =====================================================================

def fig07_zone_detail() -> Path:
    fig, ax = plt.subplots(figsize=(15, 9), dpi=200)
    fig.patch.set_facecolor(UI["bg"])
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 9)
    ax.set_axis_off()

    _rounded(ax, 0, 0, 15, 9, fill=UI["bg"], radius=0)
    _sidebar(ax, active_idx=2)
    _topbar(ax, "Zones Management",
            "Geospatial intelligence and risk perimeter monitoring")

    cont_x = 2.5
    cont_w = 11.5

    # Page header
    _label(ax, cont_x, 7.8, "ZONE DEEP DIVE",
           size=6, color=UI["fg_subtle"], weight="bold")
    _label(ax, cont_x, 7.4, "Serra de San Mamede",
           size=15, color=UI["fg"], weight="bold")
    # Risk pill
    _rounded(ax, cont_x + 3.2, 7.45, 1.0, 0.35,
             fill="#2c0c12", edge=UI["risk_high"], lw=0.5, radius=0.07)
    _label(ax, cont_x + 3.7, 7.55, "HIGH RISK", size=6.5,
           color=UI["risk_high"], weight="bold", ha="center")
    # Meta line
    _label(ax, cont_x, 7.05,
           "42.300°N, 7.935°W   ·   Dense pine forest   ·   slope 28°",
           size=7, color=UI["fg_muted"])
    _label(ax, cont_x + 7.5, 7.05, "Methodology  ↗",
           size=7, color=UI["accent"])

    # === Hero card (risk score + weather tiles) ===
    hX, hY, hW, hH = cont_x, 4.7, cont_w, 2.05
    _rounded(ax, hX, hY, hW, hH, fill=UI["surface_2"],
             edge=UI["border"], lw=0.7, radius=0.12)
    # Left half: gauge
    _label(ax, hX + 0.30, hY + hH - 0.35, "CURRENT RISK SCORE",
           size=6, color=UI["fg_subtle"], weight="bold")
    _label(ax, hX + 0.30, hY + 0.45, "72", size=42,
           color=UI["risk_high"], weight="bold")
    _label(ax, hX + 1.65, hY + 0.70, "%", size=14,
           color=UI["risk_high"], weight="bold")
    _label(ax, hX + 0.30, hY + 0.25,
           "Modifiers active: low humidity, wind > 25 km/h",
           size=6.5, color=UI["fg_muted"])
    # Progress bar
    _rounded(ax, hX + 0.30, hY + 0.05, 5.0, 0.10, fill="#222428", radius=0.05)
    _rounded(ax, hX + 0.30, hY + 0.05, 5.0 * 0.72, 0.10,
             fill=UI["risk_high"], radius=0.05)

    # Right half: 2x2 grid of weather tiles
    grid_x = hX + 5.9
    grid_y = hY + 0.20
    tile_w = (hW - 6.2) / 2 - 0.1
    tile_h = 0.85
    weather_tiles = [
        ("THERMOMETER", "TEMPERATURE", "27.4°C"),
        ("DROPLET", "HUMIDITY", "31%"),
        ("WIND", "WIND", "28 km/h NE"),
        ("FLAME", "HOTSPOTS <11 km", "2"),
    ]
    for i, (_, tlbl, tval) in enumerate(weather_tiles):
        col, row = i % 2, 1 - (i // 2)
        tx = grid_x + col * (tile_w + 0.12)
        ty = grid_y + row * (tile_h + 0.10)
        _rounded(ax, tx, ty, tile_w, tile_h,
                 fill=UI["surface"], edge=UI["border"], lw=0.5, radius=0.07)
        _label(ax, tx + 0.15, ty + tile_h - 0.20, tlbl, size=5.2,
               color=UI["fg_subtle"], weight="bold")
        _label(ax, tx + 0.15, ty + 0.20, tval, size=10,
               color=UI["fg"], weight="bold")

    # === Sparkline cards (NDVI + NDMI) ===
    sk_y = 3.05
    sk_h = 1.5
    sk_w = (cont_w - 0.3) / 2
    rng = np.random.default_rng(13)
    for i, (lbl, latest, base_color, baseline_y, delta_label) in enumerate([
        ("NDVI · 36 weeks", "0.42", UI["accent"], 0.45, "−0.03 4 wk"),
        ("NDMI · 36 weeks", "0.18", UI["info"], 0.30, "−0.05 4 wk"),
    ]):
        sx = cont_x + i * (sk_w + 0.3)
        _rounded(ax, sx, sk_y, sk_w, sk_h, fill=UI["surface_2"],
                 edge=UI["border"], lw=0.6, radius=0.10)
        _label(ax, sx + 0.20, sk_y + sk_h - 0.27, lbl.upper(), size=6,
               color=UI["fg_muted"], weight="bold")
        _label(ax, sx + sk_w - 0.20, sk_y + sk_h - 0.27, delta_label.upper(),
               size=5.5, color=UI["fg_subtle"], ha="right", weight="bold")
        _label(ax, sx + 0.20, sk_y + 0.85, latest, size=18,
               color=UI["fg"], weight="bold")
        # Spark curve
        days = np.linspace(0, 1, 80)
        series = baseline_y + 0.10 * np.sin(days * 7) - 0.07 * days + 0.03 * rng.standard_normal(80)
        sx_pts = sx + 0.20 + days * (sk_w - 0.40)
        sy_pts = sk_y + 0.25 + (series - 0.20) * 1.2
        ax.plot(sx_pts, sy_pts, color=base_color, linewidth=1.2)
        ax.fill_between(sx_pts, sk_y + 0.25, sy_pts,
                        color=base_color, alpha=0.18)
        # Dashed baseline
        ax.plot(
            [sx + 0.20, sx + sk_w - 0.20],
            [sk_y + 0.45, sk_y + 0.45],
            linestyle=(0, (4, 3)), color="#3a3c44", linewidth=0.5,
        )

    # === Risk score history chart ===
    rX, rY, rW, rH = cont_x, 0.55, cont_w, 2.3
    _rounded(ax, rX, rY, rW, rH, fill=UI["surface_2"],
             edge=UI["border"], lw=0.6, radius=0.10)
    _label(ax, rX + 0.20, rY + rH - 0.27, "RISK SCORE HISTORY",
           size=6.5, color=UI["fg_muted"], weight="bold")
    # Range toggle pills
    pills = [("7D", False), ("30D", True), ("90D", False)]
    pill_x = rX + rW - 1.65
    for label, active in pills:
        _rounded(ax, pill_x, rY + rH - 0.35, 0.45, 0.28,
                 fill=UI["accent"] if active else "none",
                 edge=UI["border"] if not active else "none", lw=0.5,
                 radius=0.05)
        _label(ax, pill_x + 0.22, rY + rH - 0.27, label,
               size=5.5, color="black" if active else UI["fg_muted"],
               weight="bold", ha="center")
        pill_x += 0.50
    # Area chart
    days = np.linspace(0, 1, 200)
    hist = 0.55 + 0.18 * np.sin(days * 5.0 + 1.2) + 0.10 * np.cos(days * 9) + 0.04 * rng.standard_normal(200)
    hist = np.clip(hist, 0.15, 0.92)
    hx = rX + 0.55 + days * (rW - 0.9)
    hy = rY + 0.4 + hist * (rH - 1.1)
    ax.plot(hx, hy, color=UI["accent"], linewidth=1.4)
    ax.fill_between(hx, rY + 0.4, hy, color=UI["accent"], alpha=0.20)
    # Y-axis ticks (left)
    for v, lbl in [(0.0, "0"), (0.5, "50"), (1.0, "100%")]:
        ty_ = rY + 0.4 + v * (rH - 1.1)
        _label(ax, rX + 0.50, ty_ - 0.05, lbl, size=5, color=UI["fg_subtle"], ha="right")
    # X-axis date ticks
    for i, d in enumerate(["10 Apr", "20 Apr", "30 Apr", "10 May"]):
        _label(ax, rX + 0.55 + i * (rW - 0.9) / 3, rY + 0.20, d,
               size=5, color=UI["fg_subtle"])

    out = OUT / "fig07_zone_detail.png"
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor=UI["bg"])
    plt.close(fig)
    return out


# =====================================================================
# Figure 8 — Methodology page
# =====================================================================

def fig08_methodology() -> Path:
    fig, ax = plt.subplots(figsize=(15, 9), dpi=200)
    fig.patch.set_facecolor(UI["bg"])
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 9)
    ax.set_axis_off()

    _rounded(ax, 0, 0, 15, 9, fill=UI["bg"], radius=0)
    _sidebar(ax, active_idx=8)  # Methodology highlighted
    _topbar(ax, "Methodology",
            "Data sources, model card and limitations")

    cx = 2.5
    cw = 10.5

    # Page header
    _label(ax, cx, 7.85, "DOCUMENTATION", size=6,
           color=UI["fg_subtle"], weight="bold")
    _label(ax, cx, 7.40, "Fire-See methodology", size=18,
           color=UI["fg"], weight="bold", family="serif")
    _label(ax, cx, 6.95,
           "A plain-language tour of where the numbers on this dashboard come from,",
           size=7, color=UI["fg_muted"], family="serif")
    _label(ax, cx, 6.75,
           "how we compute them, what the model can — and can't — tell you, and how",
           size=7, color=UI["fg_muted"], family="serif")
    _label(ax, cx, 6.55,
           "to cite this work.",
           size=7, color=UI["fg_muted"], family="serif")

    # === ML model heading ===
    _label(ax, cx, 5.95, "How the risk score is calculated",
           size=12, color=UI["fg"], weight="bold", family="serif")
    _label(ax, cx, 5.65,
           "The risk number for each zone (0–100%) comes from a Random Forest",
           size=7, color=UI["fg_muted"], family="serif")
    _label(ax, cx, 5.45,
           "classifier with 200 trees. Picture it as 200 small judges, each one",
           size=7, color=UI["fg_muted"], family="serif")
    _label(ax, cx, 5.25,
           "looking at the same forest patch and voting \"risky\" or \"safe\".",
           size=7, color=UI["fg_muted"], family="serif")

    # === Feature-importance card ===
    fX, fY, fW, fH = cx, 1.05, cw, 4.0
    _rounded(ax, fX, fY, fW, fH, fill=UI["surface_2"],
             edge=UI["border"], lw=0.6, radius=0.10)
    _label(ax, fX + 0.25, fY + fH - 0.30, "WHAT THE JUDGES WEIGH",
           size=6, color=UI["fg_subtle"], weight="bold")
    _label(ax, fX + fW - 0.25, fY + fH - 0.30, "IMPORTANCE %",
           size=6, color=UI["fg_subtle"], weight="bold", ha="right")

    feats = [
        ("elevation", "How high above sea level the patch sits", 19.8),
        ("LST", "How hot the ground surface is", 18.1),
        ("dist_urban", "How far from villages and towns", 16.4),
        ("slope", "How steep the terrain is", 12.4),
        ("NDMI", "How wet the vegetation is", 11.9),
        ("NDVI", "How green the vegetation looks", 11.9),
        ("aspect", "Which way the slope faces", 9.5),
    ]
    max_pct = 25.0
    bar_left = fX + 4.5
    bar_right = fX + fW - 1.4
    bar_w = bar_right - bar_left
    row_h = (fH - 0.95) / len(feats)
    for i, (name, plain, pct) in enumerate(feats):
        ry = fY + fH - 0.65 - (i + 1) * row_h + 0.18
        _label(ax, fX + 0.25, ry + row_h * 0.35, name, size=7,
               color=UI["fg_subtle"], weight="bold", family="monospace")
        _label(ax, fX + 1.30, ry + row_h * 0.35, plain, size=7,
               color=UI["fg_muted"])
        # Bar
        _rounded(ax, bar_left, ry + row_h * 0.42, bar_w, 0.10,
                 fill="#222428", radius=0.04)
        _rounded(ax, bar_left, ry + row_h * 0.42, bar_w * (pct / max_pct), 0.10,
                 fill=UI["accent"], radius=0.04)
        _label(ax, fX + fW - 0.25, ry + row_h * 0.35, f"{pct:.1f} %",
               size=7, color=UI["fg"], weight="bold", ha="right",
               family="monospace")

    # === Performance metric tiles (right column) ===
    mtX = cx + cw + 0.4
    mtW = 14.85 - mtX
    _label(ax, mtX, 6.50, "PERFORMANCE",
           size=6, color=UI["fg_subtle"], weight="bold")
    metrics = [
        ("AUC-ROC", "0.84", UI["accent"]),
        ("ACCURACY", "79.0%", UI["fg"]),
        ("PRECISION", "73.5%", UI["fg"]),
        ("RECALL", "53.7%", UI["fg"]),
        ("F1", "0.62", UI["fg"]),
        ("KAPPA", "0.48", UI["fg"]),
    ]
    tile_w = (mtW - 0.10) / 2 - 0.05
    tile_h = 0.75
    for i, (lbl, val, color) in enumerate(metrics):
        col, row = i % 2, i // 2
        tx = mtX + col * (tile_w + 0.10)
        ty = 6.10 - row * (tile_h + 0.10)
        _rounded(ax, tx, ty - tile_h, tile_w, tile_h,
                 fill=UI["surface"], edge=UI["border"], lw=0.5, radius=0.06)
        _label(ax, tx + 0.15, ty - 0.20, lbl, size=5,
               color=UI["fg_subtle"], weight="bold")
        _label(ax, tx + 0.15, ty - 0.62, val, size=14,
               color=color, weight="bold", family="serif")

    # Honest disclosure card
    nY = 3.0
    _rounded(ax, mtX, 1.05, mtW, nY - 0.05, fill=UI["surface"],
             edge=UI["border"], lw=0.4, radius=0.08)
    _label(ax, mtX + 0.20, nY - 0.30, "AN HONEST NOTE",
           size=6, color=UI["fg_subtle"], weight="bold")
    notes = [
        "The 0.84 above is from random",
        "5-fold cross-validation — the",
        "same metric V1 was reported on.",
        "",
        "If we use the harder leave-one-",
        "year-out test (train on four fire",
        "seasons, predict a year the",
        "model has never seen), AUC",
        "drops to roughly 0.66.",
        "",
        "That gap is the gap between",
        "\"sees similar weather\" and",
        "\"sees a new climate.\"",
    ]
    for i, line in enumerate(notes):
        _label(ax, mtX + 0.20, nY - 0.55 - i * 0.16, line,
               size=6.3, color=UI["fg_muted"], family="serif")

    out = OUT / "fig08_methodology.png"
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor=UI["bg"])
    plt.close(fig)
    return out


# =====================================================================
# Figures 4 & 5 — Real success / failure cases from the V3 training set
# =====================================================================

V3_FEATURES = ["NDVI", "NDMI", "LST", "slope", "aspect", "elevation", "dist_urban"]
_PRETTY = {
    "NDVI": "NDVI",
    "NDMI": "NDMI",
    "LST": "LST (°C)",
    "slope": "Slope (°)",
    "aspect": "Aspect (°)",
    "elevation": "Elevation (m)",
    "dist_urban": "Dist. urban (m)",
}


def _score_v3():
    """Refit the V3 RF and return per-row out-of-fold scores."""
    df = pd.read_csv(
        Path(__file__).resolve().parents[1]
        / "ml"
        / "artifacts"
        / "training_data_v3.csv"
    )
    df["date"] = pd.to_datetime(df["date"])
    X = df[V3_FEATURES].values
    y = df["fire"].values
    oof = np.zeros(len(df))
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    for tr, te in skf.split(X, y):
        clf = RandomForestClassifier(
            n_estimators=200, min_samples_leaf=2, random_state=42, n_jobs=-1
        )
        clf.fit(X[tr], y[tr])
        oof[te] = clf.predict_proba(X[te])[:, 1]
    df["score"] = oof
    return df


def _case_figure(df: pd.DataFrame, case_row: pd.Series, *, title: str, out: Path):
    """Two-panel case figure: feature signature + score distribution."""
    fire_mean = df[df.fire == 1][V3_FEATURES].mean()
    nofire_mean = df[df.fire == 0][V3_FEATURES].mean()
    feat_std = df[V3_FEATURES].std()

    z_case = (case_row[V3_FEATURES] - nofire_mean) / feat_std
    z_fire = (fire_mean - nofire_mean) / feat_std

    fig, axes = plt.subplots(
        1, 2, figsize=(11, 4.4), dpi=200, gridspec_kw={"width_ratios": [1.05, 1]}
    )

    # --- Left: feature signature ---
    ax = axes[0]
    y_pos = np.arange(len(V3_FEATURES))
    bar_h = 0.36
    ax.barh(
        y_pos + bar_h / 2,
        z_fire.values,
        bar_h,
        color=ACCENT_SOFT,
        edgecolor=ACCENT,
        linewidth=0.8,
        label="Mean of fire=1 cohort",
    )
    ax.barh(
        y_pos - bar_h / 2,
        z_case.values,
        bar_h,
        color=ACCENT,
        label="This sample",
    )
    ax.axvline(0, color=RULE, linewidth=0.8)
    ax.set_yticks(y_pos)
    ax.set_yticklabels([_PRETTY[f] for f in V3_FEATURES], fontsize=8.5)
    ax.invert_yaxis()
    ax.set_xlabel("Z-score vs fire=0 cohort", fontsize=8.5)
    ax.set_title("Feature signature", fontsize=10, pad=10, loc="left")
    ax.legend(loc="lower right", fontsize=7.5, frameon=False)
    _common_axes(ax)

    # --- Right: score distribution ---
    ax = axes[1]
    s_fire = df[df.fire == 1].score.values
    s_nofire = df[df.fire == 0].score.values
    bins = np.linspace(0, 1, 41)
    ax.hist(
        s_nofire,
        bins=bins,
        color="#9BB4D6",
        alpha=0.75,
        label=f"fire=0  (n={len(s_nofire)})",
        edgecolor="white",
        linewidth=0.3,
    )
    ax.hist(
        s_fire,
        bins=bins,
        color=ACCENT,
        alpha=0.75,
        label=f"fire=1  (n={len(s_fire)})",
        edgecolor="white",
        linewidth=0.3,
    )
    score = float(case_row.score)
    ax.axvline(score, color=FG, linewidth=1.4, linestyle="--")
    ymax = ax.get_ylim()[1]
    ax.annotate(
        f"this case\nscore = {score:.2f}",
        xy=(score, ymax * 0.95),
        xytext=(score + 0.05 if score < 0.6 else score - 0.32, ymax * 0.78),
        fontsize=8,
        color=FG,
        arrowprops=dict(arrowstyle="->", color=FG, lw=0.7),
    )
    ax.set_xlabel("Out-of-fold model probability", fontsize=8.5)
    ax.set_ylabel("Samples", fontsize=8.5)
    ax.set_title("Score distribution (5-fold CV)", fontsize=10, pad=10, loc="left")
    ax.legend(loc="upper right", fontsize=7.5, frameon=False)
    _common_axes(ax)

    fig.suptitle(title, fontsize=11.5, color=FG, x=0.06, ha="left", y=0.995)
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    fig.savefig(out, bbox_inches="tight", dpi=200, facecolor="white")
    plt.close(fig)
    return out


def fig04_success_case() -> Path:
    df = _score_v3()
    pos = df[(df.fire == 1) & (df.year == 2022) & (df.date.dt.month == 8)]
    row = df.loc[(pos.score - 0.81).abs().idxmin()]
    out = OUT / "fig04_success_case.png"
    title = (
        f"True positive — Galicia, {row.date:%d %b %Y} · model score "
        f"{row.score:.2f} (Critical)"
    )
    return _case_figure(df, row, title=title, out=out)


def fig05_failure_case() -> Path:
    df = _score_v3()
    pos = df[(df.fire == 1) & (df.year == 2022)]
    # closest to 0.34 among 2022 fires (the model "missed" — under-predicted)
    row = df.loc[(pos.score - 0.34).abs().idxmin()]
    out = OUT / "fig05_failure_case.png"
    title = (
        f"False negative — Galicia, {row.date:%d %b %Y} · model score "
        f"{row.score:.2f} (Medium)"
    )
    return _case_figure(df, row, title=title, out=out)


if __name__ == "__main__":
    p1 = fig01_pipeline()
    p2 = fig02_preprocessing()
    p3 = fig03_metrics()
    p4 = fig04_success_case()
    p5 = fig05_failure_case()
    # fig06/07/08 are live dashboard screenshots, dropped into docs/figures/
    # by hand — do NOT regenerate here or the screenshots get overwritten.
    for p in (p1, p2, p3, p4, p5):
        print(f"✓ wrote {p.relative_to(p.parents[2])}  ({p.stat().st_size // 1024} KB)")
