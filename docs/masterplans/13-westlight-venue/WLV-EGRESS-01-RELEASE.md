# WLV-EGRESS-01 · Westlight venue bowl field-rim lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `WESTLIGHT-VENUE`
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-wlv-egress-source-20260825T053000Z` (SHA-256 `cf9fbffa…`)
**Post snapshot:** `data/worldsnap-wlv-egress-post-20260825T053200Z` (SHA-256 `4b7ac1b6…`)
**Manifest identity:** `252767eb1dc015155c3fd42ab23ba68bb01e53a2adb2de9c676a50424f22fb7a`

## What this release is

WLV-EGRESS-01 is **Option B** of the Westlight venue field-egress correction:
a bounded field-rim **wall lighting cadence**, because Option A (new descent
stairs from the field rim to the concourse) is **not cleanly buildable**.

The MP13 WLV-1 ops survey (`data/world-review/westlight-venue-ops-survey-20260824/`)
found the bowl field level (y58–60, ~929 open cells) is **critically under-lit**
(only 3 light blocks in the field band) and that a field→concourse vomitory is
**NOT cleanly buildable**: the field is a sealed sunken bowl walled by solid
load-bearing undercroft (y59–66), and the only vertical opening through the rim
is the single public entrance stair at `x-363..-355, z-508..-506`. Option A
would require cutting through the load-bearing tiered undercroft, violating the
exact-source/ownership/interface contracts the survey requires (WLV-H05 scope
collision, WLV-H03 life-safety). The survey explicitly lists **field-rim lighting
additions (sea_lantern installation, ~10-20 cells, source state exact-guarded)**
as cleanly buildable alone.

This package installs **18 exact `minecraft:sea_lantern`s** into the y59
field-facing rim wall (smooth_stone/polished_andesite full-opaque blocks with
solid backing) around the field perimeter, well-spaced (≥6 blocks), adding a
light cadence to the under-lit field band **without touching the field floor,
the load-bearing undercroft, the entrance stair, the members club, the theatre,
or the screen-matrix band**.

## Egress decision

- **Option A (stairs/vomitories): HOLD.** The field is a sealed sunken bowl;
  the rim wall y59–66 is solid load-bearing undercroft (3–5 block backing,
  service ring behind it with 18 chests, 22 barrels, 10 smokers, etc.). Only the
  single public entrance stair is an existing vertical opening. No safe, bounded,
  exact-reversible stair package exists without a separately reviewed
  WLV-2 interface/ownership contract (survey WLV-H03/WLV-H05).
- **Option B (field-rim lighting cadence): BUILT.** The survey endorses this as
  cleanly buildable alone.

## Scope

- **18 cadence cells** (`minecraft:sea_lantern` replacing `smooth_stone`/
  `polished_andesite` at y59 field-facing rim wall):
  `(-383,59,-558) (-382,59,-564) (-382,59,-563) (-382,59,-557) (-376,59,-550)
  (-375,59,-571) (-367,59,-574) (-367,59,-546) (-358,59,-574) (-358,59,-546)
  (-349,59,-547) (-347,59,-572) (-345,59,-571) (-343,59,-550) (-341,59,-552)
  (-338,59,-564) (-338,59,-559) (-337,59,-558)`.
- **18 exact targets**, zero held, zero hazards.
- **952 field floor cells** preserved walk-identical.
- **3 existing field lanterns** (`(-375,59,-569) (-361,59,-564) (-361,59,-552)`)
  preserved unchanged.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-wlv-egress-source-20260825T053000Z` (SHA-256 `cf9fbffa…`) |
| Exact source guards | 18/18 PASS against the fresh execution source; all 18 targets byte-identical to the design snapshot |
| Strict-noop forward parser | PASS (18/18) |
| Strict-noop rollback parser | PASS (18/18) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 18/18 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-wlv-egress-post-20260825T053200Z` (SHA-256 `4b7ac1b6…`) |
| Rollback post-state preflight | PASS (18/18 against the post snapshot) |
| Post-state verification | 18/18 cadence cells exact `sea_lantern`; 0 halo drift (417-cell halo, 0 fluid, 0 forbidden); field floor 952/952 walk-identical; entrance stair 0 drift; 3 existing field lanterns unchanged; screen-matrix band 0 drift |

## Flood-route proof (post QA)

- **Field floor walk-identical to source** — the 952-cell field floor footprint
  and component structure are byte-identical pre/post; the release added light
  only, no obstruction.
- **Entrance stair walk-identical to source** — the single public
  field→concourse connection (`x-363..-355, z-508..-506`, y56–68) has zero
  drift.
- **Field floor component structure matches source** (3 components, identical
  to source — the entrance-stair opening naturally divides the floor).
- **Egress geometry unchanged**; the flood route (field floor → entrance stair
  → concourse ring) is not obstructed, not re-routed, and not commissioned.

## Offline evidence

- Compiler: `scripts/compile_wlv_egress_field_lighting.mjs`
- Post QA: `scripts/qa_wlv_egress_field_lighting_post_release.mjs`
- Forward/rollback: `data/buildops/wlv-egress-field-lighting.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/wlv-egress-field-lighting.release-manifest.json`
- Live evidence: `data/world-review/wlv-egress-live-20260825T053200Z/`
- Regression: `test/build/wlvEgress01.test.ts`

## Boundary

- **Not a circulation correction.** The single public entrance stair remains
  the only field→concourse connection; the survey's major egress defect
  (no dedicated vomitory) remains a WLV-2 interface-contract hold.
- **Not a route/accessibility commissioning.** No ramp/lift/accessible route was
  added; accessibility remains NOT compliant (survey §5).
- **Lighting only.** 18 sea_lanterns added to the y59 field-rim wall; no
  geometry, floor, undercroft, entrance stair, container, block entity, or
  screen-matrix change.
- **Reversible.** Rollback is the exact per-cell inverse and passed 18/18
  against the post snapshot.
