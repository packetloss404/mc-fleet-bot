# Combined Zones CZ-R08J: EE-PF-05 flow-ordered containment liner

**Status:** OFFLINE COMPILED, SOURCE-PREFLIGHTED, AND REVERSIBLE  
**Release node:** `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
**Package release:** `CZ-R08J-EE-PF-05-FLOW-ORDERED-LINER`  
**MVP scope:** `true`  
**Manifest identity:** `ad8534752e90c22bfc053b7051fce1a86e1cd606455625a7eeb2a92b3f43f1a2`

R08J resolves PF05 without broadening the generic source-fluid policy. The
accepted R08I post save contains 25 flowing-water cells in the exact platform
halo: levels 1 through 8, with no source-water target, lava, or waterlogged
block. The generic compiler continues to reject this platform.

## Exact flow strategy

The 25 cells form one acyclic fan with 34 exact directed dependencies. Every
target traces to the single falling boundary feed at `(1702,48,108)`, then to
the retained level-1 feed at `(1702,49,108)` and retained source at
`(1702,49,109)`. Those three upstream cells remain unchanged.

Forward execution uses the graph's downstream-to-upstream topological order.
Every dependent is converted to deepslate tiles before any target that supplies
it. The last target is the falling level-8 cell directly below the retained
feed. Rollback is the exact reverse, restoring original states
upstream-to-downstream so the equilibrium is recreated outward from the
unchanged source chain.

- Flow target identity:
  `27dfe6936a03a2a6120d54a8c07b6b5c93f4fac2e04da94deaaf7f774a9807f0`.
- Dependency identity:
  `a2abb19c912d844b53f1eb0af93eb18599a9170022b9e202c2c6ed71686d5b11`.
- Forward order identity:
  `8e4a3c5c8901d59412ee5c521287b0ac631b2c11be8b725dcdb6c0a69236e46b`.
- Partition: 19 temporary interior-liner cells and six retained containment
  cells.

## Tick-risk disposition

There is no irreducible unsafe tick race in the accepted dependency graph.
Removing a downstream target cannot change the upstream level that supplies
it. A scheduled tick that nevertheless changes any not-yet-operated exact
state makes the next strict-noop group fail; continuation or substitution is
forbidden and compensating rollback is mandatory. This is a fail-closed
runtime condition, not permission to accept a broader water-state family.

## Offline verification

The package is bound to R08I complete-save identity
`2ba805086b28a95abd2b277019a9ad5b5a73f53027a94dccd156b5d3f756c061`.
Offline evidence passes:

- manifest QA: 1/1 package, 25 unique targets;
- exact source preflight: 25/25;
- projected exact rollback with forward overlay: 25/25;
- forward and rollback strict-noop parser dry-runs: PASS, zero WorldEdit
  leftovers;
- block-entity audit: zero blockers;
- compiler isolation: zero containers/control blocks, block entities, saved
  movable entities, protected relics, prior-release targets, or undeclared
  fluid states;
- scoped wrapper `--print-plan`: PREPARE_ONLY with no global gate dependency.

Live execution still requires a fresh same-moment source capture, exact source
preflight, block/live-entity clearance, strict journaled execution, fresh post
save, and rollback post-state preflight. The PF05 fit-out must compile only
from an accepted dry-liner post save.

## Artifacts

- Compiler: `scripts/compile_combined_zones_r08_pf05_flow_ordered_liner.mjs`
- Manifest:
  `data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.release-manifest.json`
- Operation prefix:
  `data/buildops/combined-zones-r08-empty-eight-platform-05-flow-ordered-liner.*`
- Offline evidence:
  `data/world-review/combined-zones-r08j-platform-05-flow-ordered-liner-offline/`
- Focused regression:
  `test/build/combinedZonesR08PF05FlowOrderedLiner.test.ts`

No live RCON call, live service call, service mutation, or world edit was
performed.
