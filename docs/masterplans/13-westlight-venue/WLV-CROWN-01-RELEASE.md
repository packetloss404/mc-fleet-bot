# WLV-CROWN-01 · Westlight venue bowl crown-walk floor lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `WESTLIGHT-VENUE`
**Release node:** `CZ-LEGACY-CROSS-AREA-CIRCULATION`
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-wlv-crown-source-20260825T180000Z` (region SHA-256 `ade8ef5b…`)
**Post snapshot:** `data/worldsnap-wlv-crown-post-20260825T181000Z` (region SHA-256 `f53ed94d…`)
**Manifest identity:** `afadd659278920235a4183a32124e992ffcb46a22a1c2ec19e9321d5e4968180`

## What this release is

The MP13 WLV-1 ops survey
(`data/world-review/westlight-venue-ops-survey-20260824/`) documented the bowl
**crown walk** (y82–84) as **"sparse"** — only 22 light blocks, all clustered at
the east screen-core corner, against a ~790-cell single connected walk ring.
Two prior cleanly-buildable lighting items from the same survey were already
delivered:

- **WLV-EGRESS-01** (2026-08-25): field-rim wall cadence at y59 (18 cells);
- **WLV-CONCOURSE-ARM-01** (2026-08-25): main concourse-ring ceiling cadence at
  y72 (36 cells).

This package is the third, distinct cleanly-buildable maintenance item from the
same survey and the **final documented under-lit public route**: a flush **floor
lighting cadence** on the crown-walk ring surface.

## What was built

- **58 exact `minecraft:sea_lantern` floor inlays** at **y=82** on the crown-walk
  ring (polished_andesite / deepslate_tiles walk surface, with y83/y84 clear air
  and solid non-fluid support at y81).
- Each target replaces an exact full-opaque crown-walk block, so the walk surface
  level, headroom and support are unchanged and the light is purely additive.
- **58 exact targets**, zero held, zero hazards.
- **790 crown-walk ring cells** now all within the **6-block** (Chebyshev)
  lighting standard (pre-build: mean ~68 blocks, max 110 blocks from any light).
- **22 pre-existing crown lights** preserved unchanged; **80 total** post
  fixtures (22 + 58), zero stray lights.

## Pre-build distance proof (from the compiler manifest)

| Metric | Value |
|---|---|
| Crown-walk ring cells | 790 |
| Existing crown lights (y82..84) | 22 (all at screen-core corner) |
| Mean distance to nearest light | 68.1 blocks |
| Max distance to nearest light | 110 blocks (at -428,-567) |
| Ring cells >6 blocks from a light | 790 / 790 |

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Forward source preflight | 58/58 PASS against the fresh live source |
| Strict-noop forward parser | PASS (58/58) |
| Strict-noop rollback parser | PASS (58/58) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Strict-noop live execution | 58/58 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-wlv-crown-post-20260825T181000Z` |
| Rollback post-state preflight | PASS (58/58) |
| Post-state verification | PASS (58/58 exact sea_lantern; 790/790 walk cells within cadence; 0 halo drift; 0 stray lights; 22 preserved) |

## Artifacts

- Compiler: `scripts/compile_wlv_crown_walk_lighting.mjs`
- Post-state QA: `scripts/qa_wlv_crown_walk_lighting_post_release.mjs`
- Ops: `data/buildops/wlv-crown-walk-lighting.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/wlv-crown-walk-lighting.release-manifest.json`
- Evidence: `data/world-review/wlv-crown-live-20260825T181000Z/`
- Focused regression: `npx vitest run test/build/wlvCrownWalkLighting.test.ts`

## Boundary

Passive normal illumination only. The crown-walk floor surface level, headroom,
screen rig, seat geometry, egress routes, and every existing fixture are
unchanged. No vomitory, widening, accessible ramp/lift, public-access change,
route-commissioning, life-safety, or event-operation claim is made.
