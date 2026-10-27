# Combined Zones CZ-R08L: EE-PF-01 partitioned fluid liner

**Status:** OFFLINE COMPILED, SOURCE-PREFLIGHTED, AND REVERSIBLE  
**Release node:** `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
**Package release:** `CZ-R08L-EE-PF-01-PARTITIONED-FLUID-LINER`  
**MVP scope:** `true`  
**Manifest identity:** `4748da1d7c16200420a599173a5a8693c03aa134edef74d360bb5d5b50217434`

R08L resolves the final wet PF01 liner blocker without broadening the generic
source-only fluid policy. It is bound to the accepted R11B terminal post save.
The exact PF01 halo contains two physics-independent components separated by
42 Manhattan blocks: 73 stable level-zero lava sources and a five-cell
flowing-water boundary tail. No PF01 component remains irreducibly unsafe.

## Stable lava-source package

The lava package replaces only exact `minecraft:lava[level=0]` states. Its 73
targets have coordinate-set identity
`352b745a87b9ff224c987ae68f8f4d2b05ae40bbe1883b0aab6c5374d0cc1aed`:

- 57 chamber-interior cells are closed first;
- 16 cells on the outer `z=63` row are closed last as retained containment;
- 16 adjacent level-zero sources beyond that row remain unchanged;
- flowing lava and source-family substitution remain forbidden.

The forward-order identity is
`35714d9c46bbdc4ddf7136091d836c737d61d36b21cce6762f56856227ffadd6`.
Rollback is the exact reverse, restoring the outer row before reopening the
interior pocket.

## Flow-ordered water package

The five water targets are the exact tail at `y=40,z=55`, with levels 6 through
2 from `x=1745..1749`. Their coordinate-set identity is
`057314836ffcdfde085252a093305265de6b3fd31a19f14695841739ad4e533f`.
The four-edge graph is acyclic, and every target also has its own unchanged
direct feed at `z=54`; the adjacent falling root at `(1750,40,54)` also remains
unchanged.

Forward execution is downstream-to-upstream (`x=1745..1749`) with order
identity
`a77890eb7cefd6d991d5622280a66d31ac8ebbbc9733cd5684a8e14cef956b53`.
Rollback reverses that order so levels 2 through 6 are recreated outward from
the retained feed edge.

## Transaction and safety boundary

Forward package order is lava, then water. Rollback package order is water,
then lava. The 78 targets are disjoint from accepted prior-release targets,
containers/control blocks, block entities, saved movable entities, and
protected relic cores. The package opens no future-line cell; its maximum
target X is 1749, 123 blocks short of the deferred seal at X 1872.

Any scheduled tick that changes a not-yet-operated exact source guard is a
hard stop. Runtime execution must not continue with a broader water or lava
state family. Compensating rollback uses reverse package order and the exact
reverse cell order.

## Offline verification

The compiler and evidence are bound to R11B complete-save identity
`857271dc24e4558a28e647c83f006744785d73fb45614b1c3c6c72c43b6f9757`.
The canonical offline evidence passes:

- manifest QA: 2/2 packages, 78 unique targets, zero cross-package overlap;
- exact lava source preflight: 73/73;
- exact water source preflight: 5/5;
- ordered projected water rollback: 5/5;
- ordered projected lava rollback after the water rollback overlay: 73/73;
- all four strict-noop parser dry-runs: PASS with zero WorldEdit leftovers;
- block-entity audit: zero blockers;
- focused R11B rebind regression: 9/9 direct offline cases, including exact
  reverse order, retained-feed identity, generic-compiler rejection, intake
  binding, preflights, and parser checks. The separately retained scoped
  `--print-plan` case was intentionally not invoked during this no-wrapper
  rebind.

Live execution still requires the root wrapper's fresh same-moment snapshot,
fresh exact preflights, fresh live-entity clearance, journaled strict
execution, fresh post save, and reverse-order rollback post-state preflights.
The PF01 fit-out must compile only from the accepted dry-liner post save.

## Process note

An initial attempt to use the scoped wrapper in prepare-only mode was
discarded because that mode still performs live entity clearance and temporary
force-load operations. It made no block or entity changes, reported no entity
hits, released every temporary chunk, and proved the final force-load set
matched the original set. Those artifacts are retained only under the
explicitly named `discarded-mixed-live-clearance` directory and are not
canonical release evidence. The canonical R11B evidence directory below was
regenerated solely with offline Anvil readers, offline preflight overlays, and
parser dry-runs.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r08_pf01_partitioned_fluid_liner.mjs`
- Manifest:
  `data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json`
- Operation prefix:
  `data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.*`
- Canonical offline evidence:
  `data/world-review/combined-zones-r08l-platform-01-partitioned-fluid-liner-offline-r11b/`
- Discarded mixed evidence:
  `data/world-review/combined-zones-r08l-platform-01-partitioned-fluid-liner-discarded-mixed-live-clearance/`
- Focused regression:
  `test/build/combinedZonesR08PF01PartitionedFluidLiner.test.ts`

No live release execution or physical world edit was performed.
