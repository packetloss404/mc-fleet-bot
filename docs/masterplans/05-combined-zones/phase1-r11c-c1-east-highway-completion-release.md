# Combined Zones CZ-R11C: C1 east highway completion

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** `0cc83635202a9aac17ed347e88f6a7882598b35321a3546b4494fafd0a2affc3`
**Completed release identity:** `f2c37e1c70a8829981352a0d64d1e69edb556a19359d1afd56061e9fe2169bb9`  
**Post-QA payload identity:** `cdf242299fcc372183f92a237b5062f0f7b0ca63ca8405635dd1aea768665680`

## Build scope

R11C compiles the complete accepted `AT_GRADE_COORDINATION_PASS` run at C1
stations 494 through 517. The frozen 24-station raster contains 462 candidate
surface cells. R11C owns 399 pavement cells, 68 exact foundation fills, and
642 exact terrain/headroom cuts, for one 1,109-cell guarded package:

- 267 gray-concrete carriageway cells;
- 84 smooth-stone outer-shoulder cells;
- 48 yellow-concrete median cells;
- 68 stone-brick foundation cells; and
- 642 air targets, producing 798/798 two-block headroom cells when the 156
  source-air cells are included.

The 399 new pavement cells form 12 local pieces only because exact accepted
cells and frozen reservations are excluded from R11C ownership. Every piece
has a step-safe connection to accepted R11A. The combined R11A/R11C surface is
one connected component, with 93 adjacent seam pairs and maximum vertical
step one.

## Explicit preserved exceptions

The compiler partitions every one of the 462 frozen candidate cells. It does
not silently clear plan conflicts:

- 23 cells occupy the accepted R11A support envelope;
- one additional cell would operate through the R11A functional envelope;
- 23 cells would operate through accepted R11B targets;
- three cells occupy exact utility-reservation columns; and
- 13 cells are disconnected local grade shadows after those ownership
  exclusions.

The original grade-only exception is preserved explicitly as the requested
nine-cell set, SHA-256
`ec9a9fbfafbd3bcabd18d35a4fd9b8417d499bcef8a39e6df0a910da6c3cee21`.
Four of those nine are also protected by the later R11B envelope exclusion;
five remain in the final grade-shadow set. Removing the 23 R11B envelope
columns creates eight additional disconnected local shadow cells, so the
final non-owned grade-shadow set is 13 cells. The three utility conflicts are
separately frozen at SHA-256
`454d9ed2fbaf386c10b244a593027fc3b34b8a8fa7a7be3c262df00adfdaa058`.
The 399 owned cells plus 63 disjoint final exceptions reconstruct the complete
462-cell candidate raster exactly.

## Dependency proof

R11C emits no gravity or leaf-stabilization package. The source-bound audits
prove that no such physical transition is required:

- the operation removes 27 exact log/wood cells;
- a six-face search bounded to Minecraft's six-step leaf-distance propagation
  identifies 235 retained leaves potentially influenced by those removals;
- after every R11C target is removed from the projected leaf/log graph, all
  235 leaves still reach a retained log at distance one through five;
- proven decay-risk leaves: zero;
- persistent-property leaf transitions: zero; and
- unrelated canopy transitions: zero.

The 3,952-cell interaction halo contains two gravel cells. Both are untouched
and recursively supported through at most two gravel cells by stable non-air,
non-fluid blocks. No gravity transition is required and unresolved gravity
hazard count is zero.

## Source and isolation

The compiler is bound to accepted R08P post snapshot
`data/worldsnap-combined-zones-r08p-post-20260821T184147Z`, complete-save
SHA-256
`bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505`,
and completed release identity
`f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3`.

The operated set has zero fluid/waterlogged, container/control, block-entity,
saved-entity, protected-relic, C01 default-deny, Data District crossroad,
rail-reservation, rail-collection, utility-reservation, road-collection, or
accepted-prior-release intersections. The accepted-prior crosswalk includes
R07A through R07H, every delivered Empty Eight platform and retail release
through R08P, R09A through R09D, R10A, and R11A/R11B.

## Canonical artifacts and offline evidence

- Manifest:
  `data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json`
- Forward body SHA-256:
  `bf29a81f5adb5fb63d3faa3c33e9a2a2d02c6d0724f48cbab864c54c2449ef58`
- Rollback body SHA-256:
  `0145b2688ef2eb85f6bb3bc234be73b2493146e6fbf7378e6ef8bded2cf7abec`
- Offline evidence:
  `data/world-review/combined-zones-r11c-offline-20260821T184500Z`
- Independent dependency QA payload SHA-256:
  `ea7e359ec122f673b32a47d877d1dd47e8893ed467151eafa95a8ba57e31f5a6`

Offline results:

- exact manifest/inverse QA: PASS, one package and 1,109 unique targets;
- exact R08P source preflight: PASS, 1,109/1,109;
- projected rollback preflight: PASS, 1,109/1,109 against the exact forward
  overlay;
- forward and rollback strict-noop parser checks: PASS, 2,218 guarded groups
  and zero WorldEdit leftovers;
- block-entity target audit: PASS, zero blocking block entities;
- scoped wrapper `--print-plan`: PASS, one package and no global gate; and
- focused compiler regression: 8/8 PASS.

Regenerate and verify:

```bash
node scripts/compile_combined_zones_r11c_c1_east_highway_completion.mjs
node scripts/qa_combined_zones_r11c_c1_east_highway_completion_offline.mjs
npx vitest run test/build/combinedZonesR11CC1EastHighwayCompletion.test.ts
```

The compiler and offline verifier made no live call, service mutation, or
world edit. The root wrapper subsequently performed the fresh same-moment
entity clearance and journaled strict-noop execution described below.

## Execution and post-release seal

The scoped wrapper executed R11C and terminally accepted it in
`data/world-review/combined-zones-r11c-live-20260821T185813Z/evidence-ledger.json`.
Independent read-only QA verifies:

- all 17 ordered ledger stages and all 17 evidence bindings;
- 1,109/1,109 exact source guards and 1,109/1,109 exact post targets;
- one connected 672-cell R11A/R11B/R11C route, with 94 R11A/R11B, 93
  R11A/R11C, and 46 R11B/R11C seam pairs, all at maximum vertical step one;
- 68/68 foundation fills, 399/399 stable pavement contacts, and 798/798 R11C
  headroom cells, while all 218 R11A and 328 R11B headroom cells remain air;
- all 23 preserved R11A support cells, 13 grade-shadow cells, and three
  utility-reservation exceptions unchanged;
- all 235 retained leaves unchanged and connected to retained logs at
  distances one through five;
- zero undeclared drift across the 3,690-cell preserved review domain;
- strict execution of 1,109/1,109 groups with zero failures, no-ops, or
  WorldEdit leftovers; and
- 1,109/1,109 rollback post-state guards.

The sealed reports are
`data/world-review/combined-zones-r11c-live-20260821T185813Z/r11c-post-release-qa.json`
and `r11c-post-release-qa.md`. Regenerate them and run both focused suites:

```bash
node scripts/qa_combined_zones_r11c_c1_east_highway_completion_post_release.mjs
npx vitest run \
  test/build/combinedZonesR11CC1EastHighwayCompletion.test.ts \
  test/build/qaCombinedZonesR11CC1EastHighwayCompletionPostRelease.test.ts
```

The post-release verifier read immutable source/post Anvil evidence only. It
made no live call, service mutation, or world edit.
