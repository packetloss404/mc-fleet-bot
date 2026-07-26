#!/usr/bin/env python3
"""
Generate raven-rock/visuals/level-plans.svg and section.svg FROM planning/coordinates.yaml.

Why this exists
---------------
The original SVGs were hand-authored XML. That meant every coordinate change had to be
re-drawn by hand, and one duly got missed: OQ-8 relocated portal N3 from (0,18,285) to
(-150,18,285) on 2026-07-24, updated coordinates.yaml and visuals/raven-rock-NOTES.md, and
left BOTH SVGs drawing N3 at its old position. The drawings silently disagreed with the
manifest for a day.

This script removes that failure mode: coordinates.yaml is the single source, the drawings
are derived, and a stale drawing becomes impossible as long as you re-run this after editing
the manifest.

Usage
-----
    python3 raven-rock/visuals/generate_visuals.py            # writes both SVGs
    python3 raven-rock/visuals/generate_visuals.py --check     # exit 1 if output is stale

--check regenerates in memory and compares against the files on disk without writing, so CI
or a pre-commit hook can fail when someone edits coordinates.yaml and forgets to regenerate.

Honesty note (carried into the output on purpose)
------------------------------------------------
Raven Rock's real interior is classified and since 2007 DoD policy forbids making any
graphical representation of the complex (references/manifest.yaml REF-015). EVERY coordinate
in coordinates.yaml is openly-labelled "creative approximation". These drawings therefore
depict an invented Minecraft build, NOT the real facility, and both SVGs carry that
disclosure in visible text and in their accessibility labels. Do not remove it.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from xml.sax.saxutils import escape

try:
    import yaml
except ImportError:
    sys.exit("pyyaml is required: pip install pyyaml")

HERE = Path(__file__).resolve().parent
PLANNING = HERE.parent / "planning"
MANIFEST = PLANNING / "coordinates.yaml"

DISCLOSURE = (
    "Raven Rock's interior is CLASSIFIED (REF-015). Every coordinate shown is CREATIVE "
    "APPROXIMATION, invented for a Minecraft build. This is an openly-labelled "
    "interpretation of a public landmark, NOT a map of the real facility."
)

# Palette. Deliberately theme-agnostic: these render on white paper and in a browser.
C = {
    "ink": "#1a1d21",
    "muted": "#6b7280",
    "hair": "#c8cdd4",
    "rock": "#e7e3da",
    "rock_edge": "#b8b0a1",
    "buffer": "#d9d3c4",
    "void": "#ffffff",
    "void_edge": "#4a5058",
    "bldg": "#7c95ad",
    "bldg_edge": "#3d5670",
    "tunnel": "#8a6f4e",
    "water": "#7fa8c9",
    "msa": "#cfe0cf",
    "accent": "#b4552d",
    "spring": "#a8792f",
}

# ----------------------------------------------------------------------------- manifest


def load_manifest(path: Path = MANIFEST) -> dict:
    with path.open() as fh:
        doc = yaml.safe_load(fh)
    for key in ("project", "zones", "buildings", "tunnels", "notable_locations"):
        if key not in doc:
            sys.exit(f"coordinates.yaml is missing required top-level key: {key}")
    return doc


def envelope(doc: dict) -> tuple[int, int, int, int]:
    b = doc["project"]["boundary"]
    return b["min"]["x"], b["min"]["z"], b["max"]["x"], b["max"]["z"]


def bands(doc: dict) -> dict:
    return doc["project"]["vertical_stacking"]


def tunnel_route(t: dict) -> list[dict]:
    """from -> via (optional) -> to, as an ordered list of {x,y,z}."""
    pts = [t["from"]]
    if "via" in t and t["via"]:
        pts.append(t["via"])
    pts.append(t["to"])
    return pts


# ----------------------------------------------------------------------------- svg utils


class Svg:
    """Minimal SVG builder. No external deps, no templating engine."""

    def __init__(self, width: int, height: int, label: str):
        self.w, self.h = width, height
        self.parts: list[str] = []
        self.label = label

    def add(self, markup: str) -> None:
        self.parts.append(markup)

    def rect(self, x, y, w, h, fill="none", stroke="none", sw=1, extra="") -> None:
        self.add(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(w, 0):.1f}" height="{max(h, 0):.1f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
        )

    def line(self, x1, y1, x2, y2, stroke, sw=1, extra="") -> None:
        self.add(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{stroke}" stroke-width="{sw}" {extra}/>'
        )

    def poly(self, pts, stroke, sw=2, fill="none", extra="") -> None:
        d = " ".join(f"{px:.1f},{py:.1f}" for px, py in pts)
        self.add(f'<polyline points="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')

    def circle(self, cx, cy, r, fill, stroke="none", sw=1) -> None:
        self.add(
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>'
        )

    def text(self, x, y, s, size=13, fill=None, anchor="start", weight="normal", extra="") -> None:
        self.add(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="Inter, Helvetica, Arial, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill or C["ink"]}" '
            f'text-anchor="{anchor}" {extra}>{escape(s)}</text>'
        )

    def render(self) -> str:
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
            f'viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{escape(self.label)}">\n'
            f'<rect width="{self.w}" height="{self.h}" fill="#ffffff"/>\n'
            + "\n".join(self.parts)
            + "\n</svg>\n"
        )


def footer(svg: Svg, generated_from: str) -> None:
    """Provenance + the REF-015 disclosure. Both drawings carry this."""
    y = svg.h - 40
    svg.line(40, y - 18, svg.w - 40, y - 18, C["hair"], 1)
    svg.text(40, y, DISCLOSURE, size=11, fill=C["muted"])
    svg.text(
        40,
        y + 16,
        f"Generated by raven-rock/visuals/generate_visuals.py from {generated_from} — do not hand-edit.",
        size=11,
        fill=C["muted"],
    )


# ----------------------------------------------------------------------------- level plans

# Plan levels chosen to expose the complex's real vertical structure. Each shows the
# elements whose y-extent crosses that level, so a reader can see what is present where.
LEVELS = [
    (18, "y+18 — portal mouths", "Tunnel mouths in the rock face at the envelope edges."),
    (0, "y0 — vestibules & upper tunnel runs", "Blast vestibules and the descending tunnel runs."),
    (-12, "y-12 — main cavern floor", "Cavern A/B floors, the rotunda, buildings on their spring pedestals."),
    (-18, "y-18 — sump level", "Cavern C's reservoir sump, the deepest point in the complex."),
]


def build_level_plans(doc: dict) -> str:
    x0, z0, x1, z1 = envelope(doc)
    span_x, span_z = x1 - x0, z1 - z0

    cell = 620          # px per plan
    pad = 60
    cols = 2
    rows = (len(LEVELS) + cols - 1) // cols
    head = 150
    width = pad * 2 + cols * cell + (cols - 1) * 40
    height = head + rows * (cell + 78) + 90

    svg = Svg(width, height, (
        "Four level plans through the Raven Rock Minecraft build, at y+18 portal mouths, y0 vestibules, "
        "y-12 main cavern floor, and y-18 sump level, showing cavern zones, the four portal tunnels, "
        "inter-cavern corridors, and the four buildings on spring pedestals. "
    ) + DISCLOSURE)

    svg.text(pad, 58, "Raven Rock Mountain Complex — Level Plans", size=30, weight="600")
    svg.text(pad, 84, doc["meta"]["subject"], size=13, fill=C["muted"])
    svg.text(
        pad, 108,
        f"Envelope {span_x}x{span_z} blocks, x[{x0},{x1}] z[{z0},{z1}].  North = -Z (up).  "
        f"All geometry: creative approximation.",
        size=12, fill=C["muted"],
    )

    for idx, (level_y, title, blurb) in enumerate(LEVELS):
        col, row = idx % cols, idx // cols
        ox = pad + col * (cell + 40)
        oy = head + row * (cell + 78)
        _draw_plan(svg, doc, level_y, ox, oy, cell, title, blurb)

    footer(svg, "planning/coordinates.yaml")
    return svg.render()


def _draw_plan(svg: Svg, doc: dict, level_y: int, ox: float, oy: float, size: float,
               title: str, blurb: str) -> None:
    x0, z0, x1, z1 = envelope(doc)
    scale = size / max(x1 - x0, z1 - z0)

    def px(x: float) -> float:
        return ox + (x - x0) * scale

    def pz(z: float) -> float:
        return oy + (z - z0) * scale

    svg.text(ox, oy - 26, title, size=17, weight="600")
    svg.text(ox, oy - 9, blurb, size=11, fill=C["muted"])

    # rock mass + envelope
    svg.rect(ox, oy, size, size, fill=C["rock"], stroke=C["rock_edge"], sw=1.5)

    # grid every 100 blocks
    step = 100
    gx = x0 - (x0 % step)
    while gx <= x1:
        svg.line(px(gx), oy, px(gx), oy + size, C["hair"], 0.5)
        svg.text(px(gx) + 2, oy + size - 4, str(gx), size=8, fill=C["muted"])
        gx += step
    gz = z0 - (z0 % step)
    while gz <= z1:
        svg.line(ox, pz(gz), ox + size, pz(gz), C["hair"], 0.5)
        svg.text(ox + 3, pz(gz) - 3, str(gz), size=8, fill=C["muted"])
        gz += step

    # ---- cavern zones whose vertical extent contains this level
    for zone in doc["zones"]:
        zx0, zz0, zx1, zz1 = zone["bounds"]
        floor, ceil = zone.get("floor_y"), zone.get("ceiling_y")
        if floor is None or ceil is None:
            continue
        # RR-Z4 is the distributed portal network (bounds = whole envelope); drawing it
        # as a filled box would black out the plan, so it is represented by its tunnels.
        if zone["id"] == "RR-Z4":
            continue
        active = floor <= level_y <= ceil
        svg.rect(
            px(zx0), pz(zz0), (zx1 - zx0) * scale, (zz1 - zz0) * scale,
            fill=C["void"] if active else "none",
            stroke=C["void_edge"] if active else C["rock_edge"],
            sw=2 if active else 0.8,
            extra="" if active else 'stroke-dasharray="4 3"',
        )
        if active:
            svg.text(px(zx0) + 5, pz(zz0) + 14, zone["id"], size=10, weight="600", fill=C["void_edge"])

    # ---- tunnels & corridors: drawn where the route passes near this level
    for t in doc["tunnels"]:
        pts = tunnel_route(t)
        ys = [p["y"] for p in pts]
        # A route is shown solid when this level falls inside its vertical run.
        near = min(ys) - 4 <= level_y <= max(ys) + 4
        svg.poly(
            [(px(p["x"]), pz(p["z"])) for p in pts],
            stroke=C["tunnel"] if near else C["rock_edge"],
            sw=(t["profile"]["width"] * scale) if near else 1,
            fill="none",
            extra='stroke-linecap="round" stroke-linejoin="round" opacity="0.9"'
            if near else 'stroke-dasharray="3 4" opacity="0.5"',
        )
        if near:
            mid = pts[len(pts) // 2]
            svg.text(px(mid["x"]) + 6, pz(mid["z"]) - 6, t["id"], size=10, weight="600", fill=C["tunnel"])

    # ---- buildings: shown where the level is between pedestal base and roof
    for b in doc["buildings"]:
        c = b["location_center"]
        fx, fz = b["footprint"]["x_size"], b["footprint"]["z_size"]
        base = c["y"]
        top = b.get("building_top_y", base)
        pedestal = base - b.get("spring_pedestal_height", 0)
        if not (pedestal - 1 <= level_y <= top + 1):
            continue
        bx, bz = px(c["x"] - fx / 2), pz(c["z"] - fz / 2)
        svg.rect(bx, bz, fx * scale, fz * scale, fill=C["bldg"], stroke=C["bldg_edge"], sw=1.5,
                 extra='opacity="0.9"')
        svg.text(bx + 4, bz + 13, b["id"], size=10, weight="700", fill="#ffffff")

    # ---- notable locations
    for n in doc["notable_locations"]:
        c = n["coordinate"]
        if abs(c["y"] - level_y) > 8:
            continue
        cx, cz = px(c["x"]), pz(c["z"])
        fp = n.get("footprint")
        if fp:
            svg.rect(px(c["x"] - fp["x_size"] / 2), pz(c["z"] - fp["z_size"] / 2),
                     fp["x_size"] * scale, fp["z_size"] * scale,
                     fill=C["water"] if "eservoir" in n["name"] else "none",
                     stroke=C["accent"], sw=1.5)
        svg.circle(cx, cz, 4.5, C["accent"])
        svg.text(cx + 8, cz + 4, n["id"], size=10, weight="700", fill=C["accent"])

    # north arrow
    svg.line(ox + size - 26, oy + 40, ox + size - 26, oy + 14, C["ink"], 1.6,
             extra='marker-end="none"')
    svg.poly([(ox + size - 31, oy + 22), (ox + size - 26, oy + 12), (ox + size - 21, oy + 22)],
             stroke=C["ink"], sw=1.6, fill=C["ink"])
    svg.text(ox + size - 26, oy + 54, "N", size=11, weight="700", anchor="middle")


# ----------------------------------------------------------------------------- section


def build_section(doc: dict) -> str:
    """Vertical section on the Z axis (looking west): shows MSA, the rock buffer, and the complex."""
    x0, z0, x1, z1 = envelope(doc)
    vs = bands(doc)

    y_top, y_bot = 90, -30
    width, height = 1600, 1020
    left, right = 110, width - 60
    plot_top, plot_bot = 150, 860
    yscale = (plot_bot - plot_top) / (y_top - y_bot)
    zscale = (right - left) / (z1 - z0)

    def py(y: float) -> float:
        return plot_bot - (y - y_bot) * yscale

    def pz(z: float) -> float:
        return left + (z - z0) * zscale

    svg = Svg(width, height, (
        "Vertical section through the Raven Rock Minecraft build looking west along the Z axis: "
        "MainStreet America at the surface plane y64, a solid greenstone buffer from y41 to y61, and "
        "below it the caverns, buildings, tunnels and the reservoir sump at y-18. "
    ) + DISCLOSURE)

    svg.text(left, 58, "Raven Rock Mountain Complex — Section (looking west, along Z)", size=30, weight="600")
    svg.text(left, 84, "Vertical relationship to MainStreet America. North (-Z) at left.", size=13, fill=C["muted"])
    svg.text(left, 108,
             f"Buffer thickness {vs.get('buffer_thickness_blocks', '?')} blocks between the y41 cavern "
             f"ceiling and MSA's y62 foundation.", size=12, fill=C["muted"])

    # rock mass
    svg.rect(left, plot_top, right - left, plot_bot - plot_top, fill=C["rock"], stroke=C["rock_edge"], sw=1.5)

    # y axis
    for y in range(y_bot, y_top + 1, 10):
        svg.line(left - 6, py(y), right, py(y), C["hair"], 0.5)
        svg.text(left - 12, py(y) + 4, f"y{y}", size=10, fill=C["muted"], anchor="end")

    # z axis
    step = 100
    gz = z0 - (z0 % step)
    while gz <= z1:
        svg.line(pz(gz), plot_top, pz(gz), plot_bot, C["hair"], 0.5)
        svg.text(pz(gz), plot_bot + 16, f"z{gz}", size=10, fill=C["muted"], anchor="middle")
        gz += step

    # ---- MSA surface band
    msa = vs["msa_surface_band"]
    fp = msa["footprint"]
    svg.rect(pz(fp["z_min"]), py(msa["y_max"]), (fp["z_max"] - fp["z_min"]) * zscale,
             (msa["y_max"] - msa["y_min"]) * yscale, fill=C["msa"], stroke="#7f9c7f", sw=1.5)
    svg.text(pz(fp["z_min"]) + 8, py(msa["y_max"]) - 8,
             f"MainStreet America  y{msa['y_min']}-{msa['y_max']}", size=12, weight="600", fill="#3f5c3f")

    # ---- rock buffer band (the key cross-build constraint)
    rb = vs["rock_buffer_band"]
    svg.rect(left, py(rb["y_max"]), right - left, (rb["y_max"] - rb["y_min"]) * yscale,
             fill=C["buffer"], stroke=C["rock_edge"], sw=1)
    svg.text(left + 10, py(rb["y_max"]) + 18,
             f"SOLID GREENSTONE BUFFER  y{rb['y_min']}-{rb['y_max']} — no excavation except the RR-Z5 shaft",
             size=12, weight="600", fill="#6d6353")

    # ---- caverns in section (z extent x vertical extent)
    for zone in doc["zones"]:
        if zone["id"] in ("RR-Z4",):
            continue
        zx0, zz0, zx1, zz1 = zone["bounds"]
        floor, ceil = zone.get("floor_y"), zone.get("ceiling_y")
        if floor is None or ceil is None:
            continue
        svg.rect(pz(zz0), py(ceil), (zz1 - zz0) * zscale, (ceil - floor) * yscale,
                 fill=C["void"], stroke=C["void_edge"], sw=2)
        svg.text(pz(zz0) + 8, py(ceil) + 18, f"{zone['id']}  {zone['name']}", size=11,
                 weight="600", fill=C["void_edge"])
        svg.text(pz(zz0) + 8, py(floor) - 8, f"floor y{floor} / ceiling y{ceil}", size=10, fill=C["muted"])

    # ---- buildings + spring pedestals
    for b in doc["buildings"]:
        c = b["location_center"]
        fz = b["footprint"]["z_size"]
        base, top = c["y"], b["building_top_y"]
        ped = b.get("spring_pedestal_height", 0)
        bz = pz(c["z"] - fz / 2)
        bw = fz * zscale
        svg.rect(bz, py(top), bw, (top - base) * yscale, fill=C["bldg"], stroke=C["bldg_edge"], sw=1.5)
        svg.text(bz + 5, py(top) + 14, b["id"], size=10, weight="700", fill="#ffffff")
        svg.text(bz + 5, py(top) + 27, f"{b['floors']} floors", size=9, fill="#e8eef4")
        # visible isolation springs
        if ped:
            for i in range(4):
                sx = bz + bw * (0.15 + 0.23 * i)
                svg.line(sx, py(base), sx, py(base - ped), C["spring"], 2.5)
            svg.text(bz + 5, py(base - ped) + 12, f"springs {ped}b", size=9, fill=C["spring"])

    # ---- tunnels in section
    for t in doc["tunnels"]:
        pts = tunnel_route(t)
        svg.poly([(pz(p["z"]), py(p["y"])) for p in pts], stroke=C["tunnel"],
                 sw=max(t["profile"]["height"] * yscale, 2), fill="none",
                 extra='stroke-linecap="round" stroke-linejoin="round" opacity="0.85"')
        first = pts[0]
        svg.text(pz(first["z"]), py(first["y"]) - 12, t["id"], size=10, weight="700",
                 fill=C["tunnel"], anchor="middle")

    # ---- reservoirs / notable locations with a z position
    for n in doc["notable_locations"]:
        c = n["coordinate"]
        cz, cy = pz(c["z"]), py(c["y"])
        svg.circle(cz, cy, 5, C["accent"])
        svg.text(cz + 8, cy + 4, n["id"], size=10, weight="700", fill=C["accent"])

    # ---- the RR-Z5 shaft is the one thing that legitimately pierces the buffer
    z5 = next((z for z in doc["zones"] if z["id"] == "RR-Z5"), None)
    if z5:
        _, zz0, _, zz1 = z5["bounds"]
        svg.rect(pz(zz0), py(z5["ceiling_y"]), max((zz1 - zz0) * zscale, 6),
                 (z5["ceiling_y"] - z5["floor_y"]) * yscale,
                 fill=C["void"], stroke=C["accent"], sw=2, extra='stroke-dasharray="6 3"')
        svg.text(pz(zz0) + 8, py(z5["ceiling_y"]) - 8, "RR-Z5 shaft (deliberate liberty)",
                 size=10, weight="600", fill=C["accent"])

    footer(svg, "planning/coordinates.yaml")
    return svg.render()


# ----------------------------------------------------------------------------- main

OUTPUTS = {
    "level-plans.svg": build_level_plans,
    "section.svg": build_section,
}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="do not write; exit 1 if any output differs from what would be generated")
    ap.add_argument("--outdir", type=Path, default=HERE)
    args = ap.parse_args()

    doc = load_manifest()
    stale: list[str] = []

    for name, builder in OUTPUTS.items():
        svg = builder(doc)
        target = args.outdir / name
        if args.check:
            current = target.read_text() if target.exists() else ""
            if current != svg:
                stale.append(name)
            continue
        target.write_text(svg)
        print(f"wrote {target.relative_to(target.parent.parent.parent)}  ({len(svg):,} bytes)")

    if args.check:
        if stale:
            print("STALE (regenerate with generate_visuals.py): " + ", ".join(stale), file=sys.stderr)
            return 1
        print("visuals are up to date with coordinates.yaml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
