# BKR-RR-Z5-01 — Raven Rock RR-Z5 shaft repair

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE**

## What was built

Raven Rock RR-Z5 (Surface access shaft, `x=196..204`, `y=-11..64`, `z=-19..-11`)
was surveyed in the accepted `data/worldsnap-r08am-post-20260822T161818Z` snapshot
(BKR-SURVEY-00) as **RR-Z5-SHAFT-FULL PASS** — a 2-wide traversable service shaft
(118-cell switchback, min width 2, min headroom 2, rise ≤1, 14 landings at y −5..60,
0 fluids, 1 sign block-entity). Per the `CIRC-RR-Z5-01` runbook scope, the repair
addresses **only proven defects** — the shaft is dark (0 light sources on all 118
path stations) and has no bottom return sign. It is **not** widened or reclassified.

| Addition | Count | Material / placement |
|---|---|---|
| Landing lighting | 16 | `sea_lantern` on the west wall edge (`x=196`) at each of the 16 landing levels (bottom `y=-10`, L-5..L60, top `y=65`), above the landing floor, never in the 2-wide path |
| Bottom return sign | 1 | `spruce_wall_sign[facing=west,waterlogged=false]` at `201,-11,-14` (east iron-bars wall of the bottom landing), glowing text `SURFACE / UP · RAVEN ROCK · SHAFT Z5 · STAIRS ABOVE` |

## Findings

1. **Lighting: inadequate.** 0 of 118 path stations had any light source; the shaft
   was entirely dark.
2. **Fall edges: none unguarded.** The shaft is a fully walled 9×9 shaft; the
   switchback stair has max drop 0 per the survey. No edge cues were needed.
3. **Signs: bottom return sign missing.** Only the top sign exists
   (`201,65,-12`, RAVEN ROCK/STAIRS/CAVERNS/DOWN). A readable bottom return marker
   was added.

## Evidence

- Ledger: `data/world-review/rr-z5-repair-live-20260824T185730Z/`
- Source snapshot: `data/worldsnap-rr-z5-source-20260824T181515Z/region`
  (SHA-256 `fd9c44e67de787a2acd57a54e74fb973c112fd2eb8e859af21ef3b4119972e86`)
- Forward execution: **16/16 + 2/2 changed, 0 failed, 0 no-op** (strict-noop)
- Block-entity clearance: 0 hits (top sign preserved)
- Live-entity clearance: 0 hits (pre + same-moment)
- Rollback post-state preflight: PASS (16/16 + 1/1)
- Post-state verification: PASS — 16/16 `sea_lantern`, bottom sign with verified
  glowing text, top sign preserved, **0 drift across 6,382 non-target shaft cells**
- Post snapshot: `data/worldsnap-rr-z5-post-20260824T190038Z/region`
  (SHA-256 `53a9c7b48ea43a0c006755bd48f691fae5f1ac3f622a7b3fd76d51b43636420e`)

## Boundaries retained

- Shaft width/envelope untouched — stays a **non-public 2-wide service shaft**;
- existing top sign and every block entity preserved;
- structure, stair geometry, and landings untouched;
- no public-route, accessibility, or egress claim.

## Authority

Expanded owner directive 2026-08-24 ("I authorize all work all plans all areas")
recorded in
`docs/masterplans/05-combined-zones/OWNER-DIRECTIVE-EXPANDED-ALL-AREAS.md`.
