# MainStreet America — Open Questions (Consistency Auditor)

## ✅ DECIDED 2026-07-24 (orchestrator sign-off)

| Item | Decision | Implementation status |
|---|---|---|
| **OQ-1 / OQ-2 / OQ-5** | **REPOINT the docs to the as-built compact-street geometry** (neither GRID nor OVAL), preceded by a **per-lot RCON sweep** confirming each home's real position/style and settling the 12-home count (`qa/defects.yaml` DEF-003). The world is canonical; the docs follow it. Billboard (OQ-2) and the 14-set definition (OQ-5) resolve to whatever the sweep establishes. | Pending — sweep first, then rewrite `coordinates.yaml`, `site-plan.md`, `buildings.yaml`, `palettes.yaml` and the three `integration/*` files. |
| **OQ-3** | **Separate 8,342 SF structure** (Colliers survey reading), sited against the as-built street geometry — not an embedded Guest Center annex. Count the 8,342 SF exactly once. | Pending — final pad centroid falls out of the OQ-1 repoint. |
| **OQ-4** | **DOWNGRADE** `palettes.yaml` B01 `style_confidence` to `creative approximation`, aligning it with `site-plan.md`, `coordinates.yaml`, `buildings.yaml`, and REF-019. | Pending — one-line edit. |
| **OQ-6** | **No change** — keep the assumed 2 stories for The Ashby Manor with its existing flag. Refactor only if a real story count surfaces. | Closed, no action. |
| **OQ-7** | **RELOCATED, not reserved.** The RR-Z5 shaft head moved east to **(200, 64, −15)**, out of MSA's east greenbelt — MSA's east parking/warehouse/landscaping is unconstrained by it. **However, the four Raven Rock portal-approach corridors at the ±285 edges ARE reserved as no-build** in MSA's perimeter plan. | **DONE 2026-07-24.** Shaft coordinates propagated everywhere (see `docs/raven-rock/planning/open-questions.md` decision table). Portal-corridor reservation written into `planning/site-plan.md` as **Z08-R**, with per-portal boxes. Writing it surfaced a further collision — portal **N3** sat on MSA's axial entrance — **now resolved as OQ-8: N3 relocated to (−150, 18, +285)**, behind the SW service gate. See the Z08-R callout. |

*The original items are retained verbatim below as the rationale of record.*

---

These are items the cross-check audit surfaced that **require a human/orchestrator decision**. They are
NOT arithmetic or block-id errors (those were fixed in place). Each is a genuine judgment call: the
audit gives the options and a recommendation, but does not guess.

Confidence vocabulary is inherited from `references/manifest.yaml` (never upgraded).

---

## OQ-1 — two incompatible layout schemes (GRID vs OVAL) — RESOLVED-BY-BUILD into a THIRD scheme

> **AS-BUILT UPDATE (2026-07-24, source `qa/as-built-survey.md`, live-server RCON).** The GRID-vs-OVAL
> fork below is now **effectively resolved by the build — but into NEITHER option.** The overnight bot
> build placed the homes on a **narrow central street** (homes flank the x=0 spine at **x ≈ ±20-25**),
> with the Guest Center centered at x=0, centroid ≈ **(0, ~135)**, ~141 wide. That matches **neither** the
> GRID scheme (homes x=±85) **nor** the OVAL scheme (homes x≈±116): it is a **THIRD, compact
> central-street layout.** The DoD-4 GRID/OVAL decision was therefore **bypassed by the build**, not
> chosen. The as-built compact-street form still honors the VERIFIED fact of a single self-contained
> non-through street with homes on both sides.
>
> **New reconciliation item (pending orchestrator sign-off):** the planning coordinate docs
> (`coordinates.yaml`, `site-plan.md`, `buildings.yaml`) **and** the staged `integration/*` files must be
> **REPOINTED to the actual as-built compact-street geometry** — not to GRID and not to OVAL. This
> supersedes the "adopt OVAL and re-point integration to it" recommendation below, which assumed the
> build had not yet happened. **Do not silently rewrite `coordinates.yaml` on the strength of this note**
> — this records the decision item; the repoint itself is the DoD-4 reconciliation work and needs
> sign-off plus a fine per-lot RCON sweep to confirm each as-built home position/style (home count is not
> yet confirmed at 12 — see `qa/defects.yaml` DEF-003). The original GRID-vs-OVAL analysis is retained
> below as historical context for that repoint.

**The single most important finding (as originally written, pre-build).** The planning set contains two
mutually exclusive layouts, and the integration files are wired to the one the QA report calls the
*loser*.

| | GRID scheme | OVAL scheme |
|---|---|---|
| Files | `planning/coordinates.yaml` + all three `integration/*` files (location, warps, map-marker) | `planning/site-plan.md` + `planning/buildings.yaml` + `qa/qa-report.md` (adopts it as canonical) |
| Homes | Two straight rows, X = −85 (west) and X = +85 (east), Z from +5 down to −200 | Graceful oval ring: outer flank homes at X ≈ ±116/118 + a 5-home inner island around (0,−55) |
| Guest Center centroid | (0, 64, **+75**), 75×75 plate | (0, 64, **+88**), 90×60 plate |
| Cooking School / Bldg 2 | Separate pad **(−190, 64, −90)**, 46×46 | Embedded annex of the Guest Center, **or** separate pad **(−112, 64, −7)**, ~45×46 |
| Warehouse / Bldg 3 | **(0, 64, −255)**, 48×47 | **(−96, 64, −206)**, 47×47 |
| Billboard | **(−260, 64, +280)** (SW corner) | ≈ **(+95, 64, +272)** (south frontage, offset to entry throat) |
| Home → coordinate example | Alexandria (−85, 64, +5) | Alexandria (−118, 64, −125) |

Both schemes independently pass geometry (no overlaps, in-boundary, in-zone — audit verified by
computation). They honor the *same verified facts* (building sizes, roster, front-to-back order, south
entrance). They differ only in **invented geometry**, which the manifest says is the builder's choice.
But they cannot both be built, and downstream files disagree about which is real.

**Consequence today:** `integration/location.yaml`, `integration/warps.yaml`, and
`integration/map-marker.yaml` copy the **GRID** coordinates verbatim. `qa/qa-report.md` §2 declares the
**OVAL** scheme canonical and lists the GRID as a pre-build blocker (gate **DoD-4**). So the bot-readable
location record, the `/warp` targets, and the Dynmap markers currently point at coordinates the QA gate
says must be discarded.

**Recommendation: adopt the OVAL scheme as canonical, and re-point the three integration files to it.**
Rationale:
1. `site-plan.md` is the self-declared master ("other agents will cross-check their coordinates against
   this file"); `buildings.yaml` and `qa-report.md` already concur with it.
2. The manifest is explicit that the real homes formed a street that was **"a linear pod, NOT a grid"**
   (REF-015), and the design brief (site-plan flag 2) directs *"a graceful oval/curve rather than a
   grid."* The GRID scheme in `coordinates.yaml` is precisely the tract-subdivision reading the master
   plan says to avoid. The OVAL better satisfies both the evidence and the directive.
3. Only one file + its three integration children need re-pointing to OVAL; the OVAL centroids are
   already fully specified in `buildings.yaml`.

**If OVAL is adopted, the following must be updated** (not done here — it is the DoD-4 reconciliation and
needs sign-off):
- `coordinates.yaml`: rewrite the `buildings:` and `notable_locations:` centroids and the `zones:` boxes
  to the OVAL geometry (guest center +88; homes to oval/island; warehouse (−96,−206); billboard
  (+95,+272); cooking-school decision per OQ-3).
- `integration/location.yaml` `key_coordinates`, `integration/warps.yaml`, `integration/map-marker.yaml`:
  re-copy from the reconciled `coordinates.yaml`.

**If GRID is adopted instead**, `site-plan.md`, `buildings.yaml`, and the `qa-report.md` §2 canonical
column must be rewritten to the straight-row geometry, and QA's DoD-4 note inverted.

Either way: **pick one, update the loser, then build.** Do not build until this is closed.

---

## OQ-2 — Billboard position (dependent on OQ-1)

`coordinates.yaml` / integration place the LED monument at **(−260, +280)** — the SW frontage corner.
`site-plan.md` places it at **≈(+95, +272)** — south frontage, offset toward the entrance throat "so it
reads from the approaching road." Both are `[CREATIVE]` placements of a `[VERIFIED]`-to-exist monument
(REF-013). Resolve together with OQ-1 (adopt the winning scheme's position). Recommendation: the
entry-throat position (+95, +272) reads better for an approaching visitor; adopt it if OVAL wins.

---

## OQ-3 — Cooking School: embedded annex vs separate pad, and which pad

Three positions exist in the set:
- `buildings.yaml`: models it as an **embedded demonstration-kitchen annex inside the Guest Center**
  (MSA-00), with a fallback separate pad at (−112, −7).
- `coordinates.yaml` / integration: a **separate building B02 at (−190, −90)**.
- `site-plan.md` Z05: a **separate 8,342 SF building** on the west flank, centroid (−112, −7).

The manifest records this as a real source conflict (promotional "housed inside the Guest Center" vs the
Colliers survey isolating it as a separate 8,342 SF Building 2) and does **not** resolve it. QA item
SA-04 is deliberately written to pass under *either* resolution **provided the 8,342 SF is represented
exactly once and never double-counted.**

**Recommendation:** build it as a **separate 8,342 SF structure** (follows the primary real-estate
document, the Colliers survey, which the site-plan already adopts), at the OVAL-scheme centroid
(−112, −7) if OVAL wins. If it is instead embedded in the Guest Center, subtract its 8,342 SF from any
Guest-Center area check so the total is not double-counted. Decision required; do not build both.

---

## OQ-4 — `palettes.yaml` labels the Guest Center's "Tuscan stucco" style as *high-confidence inference*

`planning/palettes.yaml` (B01) tags the Guest Center style —
*"Tuscan-style stucco welcome center"* — as `high-confidence inference`, citing REF-018/REF-017. The
other three files that opine on the Guest Center's appearance all call it `creative approximation`:
- `site-plan.md` Z03: *"Appearance: [CREATIVE]. No source documents facade, material, color, or roof
  (REF-019)."*
- `coordinates.yaml` B01: `style_confidence: creative approximation`.
- `buildings.yaml` MSA-00: `appearance: creative_approximation`.

The manifest's REF-019 (confidence: **creative approximation**) is explicit: *"NO retrieved source
describes the guest center's architectural style, facade materials, or exterior detailing beyond 'Class
A office, 2 story, built 2011' and the promotional word 'mansion.'"* REF-018 does mention *"a
Tuscan-style stucco welcome center,"* but the manifest never establishes that this **welcome center is
the same structure as Building 1** (the 44,019 SF Class A office); REF-008 flags that even what
physically occupied Building 1 is itself an inference.

This is a confidence-label inconsistency across the set, and arguably an upgrade (creative →
high-confidence inference) that does not fully survive REF-019. `palettes.yaml` does correctly tag the
specific *materials* as creative approximation, so no visitor-facing fact is misstated — but the style
tag is looser than its three sibling files and than the manifest.

**Recommendation:** downgrade `palettes.yaml` B01 `style_confidence` to `creative approximation` (or add
an explicit caveat that the welcome-center ↔ Building-1 identification is unconfirmed), to align with the
other three files and REF-019. Left unfixed here because it is an interpretive call, not a clear error.

---

## OQ-5 — "14 buildings" resolved two different ways

The verified program is **15 structures** (Guest Center + Cooking School/Retail + Warehouse + 12 homes),
but the deliverables target "14 buildings." The two building files hit 14 by reclassifying *different*
structures:
- `coordinates.yaml`: keeps the 12 homes + Guest Center + Cooking School as the 14 `buildings:`, and moves
  the **Warehouse** to `notable_locations` (its CONFLICT-01).
- `buildings.yaml`: keeps the 12 homes + Guest Center + Warehouse as MSA-00..MSA-13, and **embeds the
  Cooking School** into the Guest Center (its A2).

Both preserve all 15 footprints with zero geometric loss, so this is a bookkeeping divergence, not a
build error. But `palettes.yaml`'s "the fourteen buildings" set (B01 + B02 + H01–H12, warehouse excluded)
matches `coordinates.yaml`'s membership, **not** `buildings.yaml`'s. **Recommendation:** once OQ-1/OQ-3
are decided, standardize one 14-set definition across coordinates, buildings, palettes, and QA §5 so the
same 14 IDs mean the same thing everywhere.

---

## OQ-6 — The Ashby Manor story count (unresolved by evidence)

REF-017 lists The Ashby Manor `stories: null`. Every downstream file assumes **2** and flags it
(coordinates CONFLICT-06, buildings MSA-05 defect, QA SA-08/AR-06). This is correctly labeled everywhere;
recorded here only so it is not lost. **Recommendation:** keep the assumed 2 with its flag; if a real
story count ever surfaces, refactor MSA-05's floors/footprint (a 1-story Ashby would roughly double the
footprint to ~32×32, which still fits its lot with reduced clearance).

---

## OQ-7 — Cross-build: reserve the Raven Rock shaft head + portal approaches in MSA's UNBUILT surface plan

> ⚠️ **SUPERSEDED — problem statement as originally posed, retained as rationale.** Decided 2026-07-24
> (see the table at the top of this file): the shaft head was **relocated**, not reserved. N9 is now
> **(200, 64, −15)**, footprint **x∈[193,207], z∈[−22,−8]** — outside MSA's east greenbelt entirely, so
> MSA's east parking/warehouse/landscaping is **unconstrained** by it. The **portal-approach corridors
> at the ±285 edges ARE still reserved** as no-build. Do not copy the coordinates below into anything.

The sub-surface Raven Rock complex surfaces at **one** point inside MSA's world: the RR-Z5 shaft
head-house **N9 at (120, 64, 60)**, footprint **x∈[113,127], z∈[53,67]**, in MSA's east greenbelt/parking
flank — and a large east parking field could overrun it (the one genuine cross-build conflict). **Reserve
that footprint + margin, and the four portal approaches at the ±285 edges, as no-build zones before laying
out MSA's east parking/warehouse/landscaping.** See `docs/raven-rock/planning/open-questions.md` **OQ-1** for
the full item and recommendation. **Decision required; do not lay MSA east surface features until closed.**
