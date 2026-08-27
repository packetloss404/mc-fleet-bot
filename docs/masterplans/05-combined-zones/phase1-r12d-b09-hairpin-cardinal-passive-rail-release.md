# Combined Zones CZ-R12D: isolated B09 hairpin cardinal rail

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; TRANSPORT NOT COMMISSIONED  
**Release node:** `CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING`  
**Scope:** `CZ-R12D-P1-B09-ISOLATED-HAIRPIN-CARDINAL-PASSIVE-RAIL`  
**MVP scope:** `true`  
**Manifest identity:** `4d360dc80d659dc26bd3359f15dcd234d05fdb2a759dab9e1b10021bc41f3cb0`  
**Offline-readiness identity:** `40e7739c244b9c449b185ed63ca950d8a32e2c80dd402877ba17decc860d0d00`  
**Post-QA identity:** `56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a`

R12D is the next independently installable passive B09 subsystem after R12C:
the complete level north-south leg inside the lower hairpin. It is an exact
19-cell rail-datum subset, not a curve, ascent, mechanism, or transport
commissioning package.

## As-built acceptance

The guarded wrapper completed with release identity
`97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2`.
Independent read-only QA against its fresh source/post pair verifies:

- 19/19 exact north-south non-waterlogged rail states;
- one 19-cell component with two endpoints, 17 two-neighbour interior cells,
  no branch, no shape mismatch, and zero cardinal adjacency to R12C;
- 19/19 unchanged polished-diorite supports, 19/19 unchanged air headroom
  cells, and both actual turn cells still air;
- all 231 R12C east-west rails unchanged;
- exactly 19 declared differences across the 189-cell halo and complete
  7,800-cell B09 accommodation, with zero lifecycle or undeclared drift;
- exactly 231 accepted east-west plus 19 accepted north-south B09 rails, with
  zero off-target or property-mismatched rail;
- zero fluid, gravity, container/control, undeclared mechanism, block-entity,
  or saved-entity intersections; and
- 19 successful strict execution groups, a complete cleaned 44-entry journal,
  all 17 wrapper stages/evidence bindings, and 19/19 rollback guards.

The canonical machine report is
`data/world-review/combined-zones-r12d-live-20260822T005835Z/r12d-post-release-qa.json`.

## Exact scope

- Frozen centerline indices `241..259` at `(2288,130,-749)` through
  `(2288,130,-767)`.
- Coordinate-set SHA-256
  `d34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754`.
- All 19 source cells are `minecraft:air`.
- All 19 desired cells are
  `minecraft:rail[shape=north_south,waterlogged=false]`.
- All 19 supports are polished diorite and all 19 headroom cells are air.
- The exact one-cell guarded forward sequence runs north to south; the exact
  inverse removes the rails south to north.

The target is one cardinal axis with two endpoints, 17 two-neighbour interior
cells, and no branch. Placing and removing in the declared order keeps every
intermediate connected neighbor on the same north-south axis.

## Isolation and source proof

Centerline indices `240` and `260` remain air. They are the two actual
90-degree turn cells, so R12D neither connects to the accepted R12C east-west
run nor reaches the mixed-grade ascent. The only existing mechanism in the
189-cell interaction halo is the reviewed final R12C rail at
`(2287,130,-748)`. It is diagonal from R12D, has no cardinal adjacency to an
R12D target, and remains separated by the air turn cell at index `240`.

The compiler binds the accepted R12C post complete save
`1c51b53415dc35060a4aefacaac8e7e8b3ca588a457c3c4ce28329e06f6fb02d`,
region identity
`d899d084dd13f27c10ff8cdd40ad509967a3ade5c927cd22bbfdcab44a9ab80d`,
completed release identity
`516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480`,
and independent R12C QA payload
`145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb`.
It verifies the exact 7,800-cell B09 state after R12C, including all 231 prior
east-west rails and 39 passive fixtures.

The only earlier target ownership on an R12D cell is the same exact air-route
cell reviewed through R07H and R07I. The fixed 62-manifest predecessor set has
zero undeclared target overlap. Both external caps, all 231 R12C rails, prior
releases, entities, containers, relics, fluids, and gravity blocks remain
untouched. R12D owns the exact one-cell rail migration inside the four-cell
R07I aperture; its other three cells remain air.

## Offline hard-safety gates

- Exact release-manifest gate: PASS, 19 unique target cells and zero package
  intersections.
- Forward source preflight: 19/19 PASS against the immutable R12C post.
- Projected reverse rollback preflight: 19/19 PASS.
- Strict-noop parser checks: 19/19 forward and 19/19 rollback, with zero
  WorldEdit leftovers.
- Block-entity audit: zero blocking block entities across both target chunks.
- Immutable saved-entity scan: zero entities in the reviewed interaction
  envelope; fresh live entity clearance remains a wrapper-stage requirement.
- Real wrapper `--print-plan`: one package, `PREPARE_ONLY`, no global-gate
  dependency, and all ten scoped hard-safety stages.
- Focused regression: 7/7 PASS; backend TypeScript build: PASS.

## Explicit local holds

R12D does not guess rail shapes for index `240`, index `260`, or the ascending
datum at indices `261..560`. Those cells require an exact Minecraft
neighbor-update/state proof before a later curve or slope package can compile.
The frozen technical system also has no accepted exact cell sets for platform
barriers, rescue continuation, vehicle, drive, brake, power, controls, or
drainage, so none are fabricated here.

No powered/detector/activator rail, vehicle, platform gate, active mechanism,
external opening, passenger route, rescue route, or funicular operation is
installed or commissioned. The wrapper's fresh immutable source, live-entity
clearance, strict journaled execution, post snapshot, exact rail-state QA, and
rollback post-state preflight are now complete. This does not lift any active
system or transport hold.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r12d_b09_hairpin_cardinal_passive_rail.mjs`
- Manifest:
  `data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.release-manifest.json`
- Forward/inverse operations:
  `data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.b09-isolated-hairpin-cardinal-passive-rail.forward.txt`
  and its `.rollback.txt` counterpart
- Offline QA:
  `scripts/qa_combined_zones_r12d_b09_hairpin_cardinal_passive_rail_offline.mjs`
- Post-release QA:
  `scripts/qa_combined_zones_r12d_b09_hairpin_cardinal_passive_rail_post_release.mjs`
- Evidence and readiness seal:
  `data/world-review/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail-offline-20260822T005000Z/`
- Regression:
  `test/build/combinedZonesR12DB09HairpinCardinalPassiveRail.test.ts` and
  `test/build/qaCombinedZonesR12DB09HairpinCardinalPassiveRailPostRelease.test.ts`

The independent post-QA performed no live API, RCON, service, or world mutation.
