# Combined Zones CZ-R09C: B07 stair safety completion

**Status:** EXACT_BUILD_EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE; PEDESTRIAN_ROUTE_COMMISSIONED_TO_RETAINED_UPPER_HOLD_BY_R09D_SEAL  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Canonical owner:** `Z06-PUBLIC-SHAFT-FITOUT`  
**Manifest identity:** `fa1eb2108e30725b173bdf1ee204adcb04a9b73c4412e77317e6b63336937fd7`

## Selected correction

R09C is the smallest exact, reversible package that clears
`R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER` after an independent post
inspection found 61 material outward drops and a climbable terminal marker.

- The 128-step helix requires 256 exact outer collision-boundary cells, two
  above each stair block. One additional cell at `(2109,5,-429)` extends the
  accepted Y=3..4 cap to Y=3..5, making it two full blocks high above the Y=4
  landing.
- The current 257-cell candidate census is 128 air, 122 deepslate, four stone,
  and three gravel.
- The compiler preserves 129 existing full solids and closes 127 exact air
  gaps with non-reactive polished diorite. The projection has zero
  player-passable outward openings and preserves all 256 stair-clearance cells.
- One exact source air cell at `(2110,-53,-429)` remains untouched below a
  source-floating gravel overhang at Y=-52. That overhang leaves only 1.5
  blocks above its bottom-slab walking surface, so it already prevents player
  entry. No target is face-adjacent to the gravel. Touching its support would
  risk a gravity update and make exact rollback unreliable.

The cap extension itself leaves a two-block rise above the landing. Independent
post-release inspection subsequently found that the adjacent R09B core top
remained a one-block step and could be used to bypass the cap. R09C's exact
outer-containment construction remains accepted, but its projected terminal
claim is superseded by `R09D-HOLD-UPPER-CORE-CROWN`. No upper route is opened.

## Exact ownership proof

Every containment candidate is inside the canonical B07-C-WEST-2 physical
domain:

- 5/257 cells are in the exact 8,134-cell B07 construction reservation.
- 252/257 are in its exact one-cell interaction union and outside construction.
- 0/257 are outside the 13,608-cell B07 interaction union.
- Of the 127 operated cells, four are construction cells and 123 are
  interaction-only cells.

The R09 release contract assigns `Z06-PUBLIC-SHAFT-FITOUT`; the standing build
authorization admits exact physical-domain work under the scope-local hard
safety kernel. The interaction-only cells are therefore explicitly bounded
Z06 liner/containment cells, not an undeclared neighboring scope.

## Source and interfaces

The compiler binds the latest accepted terminal source:

- Snapshot:
  `data/worldsnap-combined-zones-r08m-post-20260821T174621Z`
- Complete-save SHA-256:
  `729e0ce1cbbfc46fcba8c8e4e906b15b9c9f78036a3ddb888791de55abcc87a2`
- Region SHA-256:
  `17e6965f93dc3c06c2df6d39ad90572f39c4ff54b3ac3e8eb3e70a44c56d409a`
- Source ledger completed identity:
  `e97d45132458b3fe82a1d3fdb16a840ad92cc1f0d3fe1a13de60d510d6b4b4e7`

The latest source still contains all 1,705 accepted R09B target states and all
256 conservative stair-clearance cells as air. R09C has zero intersections
with R06 treatment, the R09A floor, or R09B operated cells. Three air-source
targets overlap R02's achieved excavation state; they are declared and the
inverse restores that exact air state.

The 2,257-cell interaction halo contains zero fluid. Targets contain zero
fluid or gravity states and remove no gravity support. Three retained gravel
cells remain untouched; only the isolated overhang is source-floating, and no
operation is face-adjacent to it. Snapshot scans find zero block entities,
saved entities, or protected relic intersections.

## Guarded artifacts and offline gates

- Manifest:
  `data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json`
  (file SHA-256
  `052bbff087f1d12ae1932b339a6a76f50ba8bf7eacecc06e4151e5f7c1585b95`)
- Forward: 127 one-cell air-to-polished-diorite guards, full-file SHA-256
  `1d604aaeaded827cb7c09071e0d54675a8eaf11c1a49511693e5b6f7dfa9b49c`
- Rollback: 127 reverse-order polished-diorite-to-air guards, full-file
  SHA-256
  `b5da7b6cbdb1b06d93da697030ec4d5b81488ea24b444c56054373c1a8bf7e98`
- Exact target set: 127 cells, SHA-256
  `75520eff49415e09a07fdca1069ad2cdbb6a28168f136861a56e964d75412d3b`

Offline evidence is in
`data/world-review/combined-zones-r09c-b07-stair-safety-completion-offline-20260821T175500Z`:

- structural manifest QA: PASS, 127 unique targets;
- source preflight: 127/127 guards PASS against the R08M region identity;
- strict forward and rollback parser checks: PASS, 127 commands and zero
  WorldEdit leftovers each;
- projected rollback preflight: 127/127 guards PASS after the exact forward
  overlay; and
- block-entity audit: PASS, zero blockers.

The scoped wrapper accepts the manifest and prints the complete prepare-only
kernel, including the still-required fresh source save and live-entity gate.

## Execution boundary

R09C executed successfully through the scoped wrapper at
`data/world-review/combined-zones-r09c-live-20260821T175500Z`, with immutable
post save `data/worldsnap-combined-zones-r09c-post-20260821T175500Z`. Its 127
targets, exact inverse, and outer containment are accepted. Independent
functional QA refused to emit a commissioning seal because of the adjacent
core-top bypass described above. R09D subsequently completed the full
perimeter crown and passed independent post-release QA under a strengthened
all-diagonals movement graph. The resulting separate seal lifts the pedestrian
hold only through the lower stair to the retained upper hold; all excluded
systems and passage beyond the hold remain closed.

Reproduce offline:

```bash
node scripts/compile_combined_zones_r09c_b07_stair_safety_completion.mjs
npx vitest run \
  test/build/combinedZonesR09CB07StairSafetyCompletion.test.ts \
  test/build/qaCombinedZonesR09BB07LowerSpiralStairPostRelease.test.ts
npm run build
```
