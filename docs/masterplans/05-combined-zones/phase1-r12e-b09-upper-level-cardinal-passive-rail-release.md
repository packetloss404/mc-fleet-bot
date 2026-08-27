# Combined Zones CZ-R12E: isolated B09 upper level-cardinal rail

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; NOT COMMISSIONED  
**Release node:** `CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING`  
**Scope:** `CZ-R12E-P1-B09-ISOLATED-UPPER-LEVEL-CARDINAL-PASSIVE-RAIL`  
**MVP scope:** `true`  
**Manifest identity:** `e70ac090697d8741c82ed445dd02f26d39255b523d49048bc8d80d2106d5d576`  
**Offline-readiness identity:** `bee7699cbae40d5e2575bb220db884e113fad8f112000b843b9a37dc8689c6a1`
**Completed release identity:** `552ac3c9580c80b248625d6f26676fd491a110ccf707b488b507dea6a1434c9b`  
**Post-QA payload:** `291ebd7aa3c1e5a80e3067ce1f7a8786c5dc67f67a418de3d840105135f5ee7d`

R12E compiles the unique largest independently isolated level-cardinal rail
run remaining after accepted R12C/R12D. It installs only passive, unpowered
east-west rail on the frozen B09 datum; every turn and every vertical
transition stays air.

## Exact selection

- Centerline indices `420..499`, from `(2128,246,-768)` through
  `(2049,246,-768)`.
- 80 exact source-air cells, desired state
  `minecraft:rail[shape=east_west,waterlogged=false]`.
- Coordinate-set SHA-256
  `71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f`.
- 80 polished-diorite supports, 80 air headroom cells, and a clean 738-cell
  interaction halo.
- Index `419` remains the lower endpoint of the adjacent vertical transition;
  index `500` remains the summit-return turn. Both are exact air gaps.
- Forward installation is west-to-east; rollback is the exact east-to-west
  inverse, retaining a single unbranched axis during both sequences.

## Complete remaining-datum census

The deterministic 561-cell centerline census excludes:

- the three turn points at indices `240`, `260`, and `500`;
- all 174 lower endpoints of ascending edges; and
- the 250 already accepted R12C/R12D rail indices.

Only two multi-cell level runs remain before R12E. Indices `0..8` are rejected:
they include the lower station/portal interface, have no left isolation gap,
and meet installed R12C rail at index `9`. Indices `420..499` are the only run
with exact air gaps on both sides and are therefore the unique largest safe
selection. After R12E, no nontrivial independently isolated level-cardinal run
remains. Future rail work must prove exact turn or grade-update behavior, or
separately own the lower-station interface.

## Source and preservation

The compiler binds the R12D post complete save
`87966eef0a9e3ca695820f521ca2311c01ad7d6b199ee6ef57c6201cc97ee804`,
region identity
`28ccb2dd338522e98e2a734d91670c3eb5f52a1adfc695584ba3286f6d8a90f6`,
completed release identity
`97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2`,
and R12D QA payload
`56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a`.

The complete 7,800-cell B09 source state is exact. All 231 R12C rails, all 19
R12D rails, both external caps, prior fixtures/releases, entities, block
entities, containers, fluids, gravity blocks, and relics are preserved. The
fixed 63-manifest predecessor set has zero operated-target overlap with R12E.

## Offline gates

- Exact manifest QA: PASS, 80 unique targets and zero package intersection.
- Forward and projected rollback preflights: 80/80 PASS each.
- Strict-noop parsers: 80/80 forward and rollback, zero WorldEdit leftovers.
- Block-entity and immutable saved-entity evidence: zero intersections.
- Real wrapper plan: one package, `PREPARE_ONLY`, no global gate, all ten
  scoped hard-safety stages.
- Deterministic readiness QA: 15/15 PASS.
- Focused regression: 6/6 PASS; backend TypeScript build: PASS.

No turn/slope rail, station interface, powered rail, vehicle, platform gate,
drive, brake, controls, power, drainage, passenger/rescue use, external
opening, or funicular operation is installed or commissioned. The guarded
wrapper completed all 17 stages. Independent post-QA verifies all 80 exact
east-west states, one component with two endpoints and 78 interior cells,
zero branches or shape mismatch, 80 unchanged supports and headroom cells,
both isolation gaps still air, all 231 R12C and 19 R12D rails unchanged, zero
halo/B09 undeclared drift, a complete 166-entry journal, and 80/80 exact
rollback guards.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r12e_b09_upper_level_cardinal_passive_rail.mjs`
- Manifest:
  `data/buildops/combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail.release-manifest.json`
- Exact forward/inverse:
  `data/buildops/combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail.b09-isolated-upper-level-cardinal-passive-rail.forward.txt`
  and its `.rollback.txt` counterpart
- Offline QA:
  `scripts/qa_combined_zones_r12e_b09_upper_level_cardinal_passive_rail_offline.mjs`
- Evidence:
  `data/world-review/combined-zones-r12e-b09-upper-level-cardinal-passive-rail-offline-20260822T011000Z/`
- Regression:
  `test/build/combinedZonesR12EB09UpperLevelCardinalPassiveRail.test.ts`
- Live ledger and independent QA:
  `data/world-review/combined-zones-r12e-live-20260822T011943Z/evidence-ledger.json`
  and `r12e-post-release-qa.json` in the same immutable evidence directory
- Post-QA regression:
  `test/build/qaCombinedZonesR12EB09UpperLevelCardinalPassiveRailPostRelease.test.ts`

The independent post-QA performed no live API, RCON, service, or world
mutation. Its accepted scope is passive material only; transport remains
uncommissioned.
