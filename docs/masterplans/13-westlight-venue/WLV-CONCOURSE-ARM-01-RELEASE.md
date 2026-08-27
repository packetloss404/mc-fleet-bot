# WLV-CONCOURSE-ARM-01 · Westlight venue bowl concourse-ring ceiling lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `WESTLIGHT-VENUE`
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-wlv-concourse-source-20260825T120000Z` (SHA-256 `9ccecf65…`)
**Post snapshot:** `data/worldsnap-wlv-concourse-post-20260825T120300Z` (SHA-256 `910df858…`)
**Manifest identity:** `1a5fd7281355b17076aac09523fa84eeafc087531bfba58b521f62f613a887a4`

## What this release is

The MP13 WLV-1 ops survey
(`data/world-review/westlight-venue-ops-survey-20260824/`) found the bowl main
concourse ring (y67/68, PUBLIC primary concourse, single 899-cell horseshoe
component) is lit by **clustered** lanterns at entries, ramp heads, and seat
edges but **not continuous along the ring** — the long east/west arm mid-runs
carried no fixtures at all (every ring walk cell was >5 blocks from any
lantern). The survey lists **"Concourse lantern cadence completion along the
ring (discrete cells, no geometry change)"** as cleanly buildable alone.

WLV-EGRESS-01 (2026-08-25) already delivered the **field-rim** cadence
(18 sea_lanterns at y59). This package is the second, distinct cleanly-buildable
maintenance item from the same survey: a flush **ceiling lighting cadence** along
the ring.

## What was built

- **36 exact `minecraft:sea_lantern` ceiling inlays** at **y=72**, directly above
  the concourse ring walk (planks y67 with clear y68, giving 4-clear headroom
  y68–y71 under the y72 ceiling).
- Each target replaces an exact full-opaque stone-family ceiling block
  (`stone_bricks` / `smooth_stone` / `polished_andesite` / `polished_diorite`),
  so the ceiling stays structurally solid and the light is purely additive.
- **36 exact targets**, zero held, zero hazards.
- **899 ring walk cells** now all within the **6-block** (Chebyshev) lighting
  standard; the completed ring carries a continuous cadence instead of clusters.
- **58 pre-existing ring lanterns** preserved unchanged; **94 total** post
  fixtures (58 + 36), zero stray lights.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-wlv-concourse-source-20260825T120000Z` (SHA-256 `9ccecf65…`) |
| Exact source guards | 36/36 PASS against the fresh execution source; all 36 targets match the design snapshot derivation |
| Strict-noop forward parser | PASS (36/36) |
| Strict-noop rollback parser | PASS (36/36) |
| Source preflight | PASS (36/36) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 36/36 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-wlv-concourse-post-20260825T120300Z` (SHA-256 `910df858…`) |
| Rollback post-state preflight | PASS (36/36 against the post snapshot) |
| Post-state verification | PASS — 36/36 cadence cells exact `sea_lantern`; 0 halo fluid/forbidden/drift (936-cell halo); 899/899 ring walk cells within 6-block cadence; 0 walk-band drift; 0 stray lights; 58 pre-existing lanterns preserved |

## Flood-route / circulation proof (post QA)

- **Ring walk byte-identical to source** — every walk cell (y67 plank, y68/69
  walk band) is unchanged; ceiling inlays never touch the walk surface or the
  4-clear headroom band.
- **Egress geometry unchanged** — the concourse ring, entrance stair, field
  floor, and all vertical connections are untouched. The package is maintenance
  lighting only.
- **Cadence continuity** — every one of the 899 ring walk cells is now within
  6 blocks (Chebyshev) of a post fixture (pre-existing or new), completing the
  survey's flagged "NOT continuous along arms" gap.

## Offline evidence

- Compiler: `scripts/compile_wlv_concourse_arm_lighting.mjs`
- Post QA: `scripts/qa_wlv_concourse_arm_lighting_post_release.mjs`
- Forward/rollback: `data/buildops/wlv-concourse-arm-lighting.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/wlv-concourse-arm-lighting.release-manifest.json`
- Live evidence: `data/world-review/wlv-concourse-live-20260825T120300Z/`
- Regression: `test/build/wlvConcourseArmLighting.test.ts`

## Boundary

- **Maintenance lighting only.** No circulation correction: the concourse arm
  mid-runs remain 4-wide (3×3 secondary standard; the 5-wide primary widening
  stays HOLD WLV-H04/WLV-H05), the field→concourse vomitory gap and accessibility
  remain HOLD (WLV-H03), and no route, emergency-lighting, egress, or
  commissioning claim is made.
- **Reversible.** Rollback is the exact per-cell inverse and passed 36/36 against
  the post snapshot.
