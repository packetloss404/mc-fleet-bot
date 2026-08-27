# Combined Zones CZ-R12C: isolated B09 passive rail

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE  
**Release node:** `CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING`  
**Scope:** `CZ-R12C-P1-B09-ISOLATED-LOWER-STRAIGHT-PASSIVE-RAIL`  
**MVP scope:** `true`  
**Manifest identity:** `b786c59a4d68361482b764bff34244aa73637ec859a5647f863636c49e256036`  
**Offline-readiness identity:** `470a207dc9618c5a6bca58843eee76d6c2123be3e3ac4c2d90a720290b899d61`

R12C freezes and installs the smallest useful B09 transport subsystem whose
coordinates, source states, support, update behavior, and inverse are all
exact: one isolated passive rail run along the already-frozen lower straight
datum. The physical scope is accepted as passive guideway material only.

## As-built acceptance

The guarded wrapper completed with release identity
`516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480`.
Independent read-only QA against the fresh source and post snapshots verifies:

- 231/231 final `east_west`, non-waterlogged rail states;
- one 231-cell component with two endpoints, 229 two-neighbour interior cells,
  no branches, no off-target rails, and no rail shape-update mismatches;
- all 231 polished-diorite supports and 231 air headroom cells unchanged;
- both isolation gaps, both 12-cell external caps, and the four-cell curve
  aperture preserved;
- exactly 231 declared differences across the complete 2,097-cell interaction
  halo and 7,800-cell B09 accommodation, with zero lifecycle or undeclared
  differences;
- zero fluid, gravity, container/control, undeclared-mechanism, block-entity,
  or saved-entity intersections;
- 231 successful strict execution groups, a complete cleaned 468-entry
  journal, all 17 wrapper stages, and 231/231 rollback guards.

The fresh execution source exactly matches the accepted R10F B09 post state,
including all 39 prior passive wayfinding fixtures. The canonical post-QA is
`data/world-review/combined-zones-r12c-live-20260822T004255Z/r12c-post-release-qa.json`;
its QA payload is
`145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb`.

## Exact selection

The 561-cell technical rail-datum proposal is exact, but its station, curve,
ascending, vehicle, barrier, drive, brake, power, control, and drainage
behaviors are not. R12C therefore selects only centerline indices `9..239`:

- 231 contiguous cells from `(2057,130,-748)` through
  `(2287,130,-748)`;
- coordinate-set SHA-256
  `d0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f`;
- source state `minecraft:air` at all 231 cells;
- desired state
  `minecraft:rail[shape=east_west,waterlogged=false]` at all 231 cells;
- 231 exact polished-diorite support cells and 231 exact air headroom cells;
  and
- a 2,097-cell interaction halo containing only air and polished diorite.

The run is a single cardinal axis with two endpoints, no branches, and one
east-west neighbour at each endpoint. Forward operations proceed west to east;
rollback removes rails east to west. This preserves an east-west neighbour for
every remaining endpoint rail until it is removed, avoiding an ambiguous
curve or branch update.

## Fail-safe boundary

Centerline index `8` remains air between the selected run and the lower
station. Index `240` remains air before the first curve. Those exact gaps keep
the new passive material disconnected from both deferred rail interfaces.
The 12-cell B08 exterior cap and four-cell R07I curve aperture remain unchanged.

No powered, detector, or activator rail is included. No vehicle, platform
barrier, gate, drive, brake, overspeed device, controls, power, drainage,
station rail, curve rail, passenger use, rescue use, or funicular operation is
installed or commissioned.

A platform-barrier package was not selected because the frozen B09 technical
record still has no exact barrier cell set or failure-state design. R12C does
not manufacture coordinates from station envelopes or narrative requirements.

## Source and preservation

The compiler binds the accepted R10E complete save
`4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0`,
region identity
`8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443`,
independent R10E post-QA, and the accepted R12B readiness seal.

The only prior operated target cells are the exact two shell seams previously
migrated through R07D/R07F/R07H. No other accepted release target intersects
the rail set. The halo contains zero fluid, gravity block, existing mechanism,
container/control block, block entity, saved movable entity, or protected
relic intersections.

## Offline gates

- Forward source preflight: 231/231 PASS.
- Projected rollback after the exact forward overlay: 231/231 PASS.
- Strict-noop parser checks: 231/231 forward and 231/231 rollback, with zero
  WorldEdit leftovers.
- Wrapper `--print-plan`: `PREPARE_ONLY`, one package, all ten hard-safety
  stages present.
- Focused regression: 7/7 PASS.

The canonical manifest remains the source-bound design artifact. Its fresh
execution kernel, exact final east-west rail-state QA, and rollback post-state
preflight have now completed and are preserved in the live evidence directory.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r12c_b09_passive_rail_design_freeze.mjs`
- Manifest:
  `data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json`
- Forward/rollback operations:
  `data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.b09-isolated-lower-straight-passive-rail.forward.txt`
  and its `.rollback.txt` inverse
- Offline QA:
  `scripts/qa_combined_zones_r12c_b09_passive_rail_offline.mjs`
- Readiness seal and preflight/parser evidence:
  `data/world-review/combined-zones-r12c-b09-passive-rail-design-freeze-20260822T004000Z/`
- Regression:
  `test/build/combinedZonesR12CB09PassiveRailDesignFreeze.test.ts` and
  `test/build/qaCombinedZonesR12CB09PassiveRailPostRelease.test.ts`

The independent post-QA made no live API, RCON, service, or world mutation.
