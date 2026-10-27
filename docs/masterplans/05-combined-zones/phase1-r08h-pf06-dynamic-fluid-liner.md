# Combined Zones CZ-R08H: EE-PF-06 dynamic-fluid containment liner

**Status:** OFFLINE COMPILED, SOURCE-PREFLIGHTED, AND REVERSIBLE  
**Release node:** `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
**Package release:** `CZ-R08H-EE-PF-06-DYNAMIC-FLUID-LINER`  
**MVP scope:** `true`  
**Manifest identity:** `e4626dace762469f5f2ab4e450c345a214b379d503bc9f77e1db7dad6974d435`

R08H resolves the narrow PF06 fluid condition without weakening the generic
wet-liner policy. The accepted R08G post save contains 99 exact source-water
cells and one exact waterlogged glow lichen at `(1658,46,128)`. The generic
compiler continues to reject that state and every flowing-water or undeclared
waterlogged state.

## Exact ordered solution

The compiled release has two disjoint packages and 101 total cells:

1. `ee-pf-06-dynamic-fluid-liner` replaces the 99
   `minecraft:water[level=0]` cells and the one fully specified waterlogged
   glow-lichen state with deepslate tiles.
2. `ee-pf-06-lichen-support-anchor` then replaces the lichen's exact granite
   south support at `(1658,46,129)` with a deepslate-tile containment anchor.

Rollback executes in the opposite package order. It restores granite before
restoring the exact `south=true,waterlogged=true` glow lichen, so the attachment
exists when the original state is recreated. Changing the support before
removing the lichen is prohibited because a neighbor update could destroy the
guarded lichen state.

The exact fluid target set is 100 cells with coordinate identity
`99e9ce70744b295160fa12cdeea18f111d8c6c5e3623b6711597f34ebc6e7d07`:
58 temporary chamber-liner cells and 42 retained containment cells. Including
the support anchor, the operated union is 101 cells with identity
`f538295faccb85ea0d35a57be3e11db29a406a41dbe25d482b3082656924c0e5`.

## Offline safety evidence

The package is bound to the terminal R08G complete save
`c405342d83f0c4ae8d97a82667542e1d5c22a893cdc9ee2bb0c8b9bfc9f03d8d`.
Offline verification passes:

- guarded manifest QA: 2/2 packages, 101 unique cells, zero intersections;
- exact source preflight: 100/100 fluid guards and 1/1 support guard;
- ordered projected rollback: 1/1 support guard followed by 100/100 fluid
  guards with the complete forward/rollback overlay chain;
- all four strict-noop parser dry-runs: PASS, zero WorldEdit leftovers;
- block-entity audit: zero blockers;
- compiler isolation: zero containers/control blocks, block entities, saved
  movable entities, protected relics, undeclared prior-release targets, or
  undeclared dynamic-fluid states.

There is no remaining design-level fluid-physics risk inside this exact
package. Source drift remains fail-closed: any changed source water, lichen,
or support state fails an exact guard and requires recompilation. Live
execution still requires the normal fresh source capture, live-entity gate,
journaled strict execution, fresh post save, and ordered rollback post-state
preflight.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r08_pf06_dynamic_fluid_liner.mjs`
- Manifest:
  `data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.release-manifest.json`
- Operation prefix:
  `data/buildops/combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner.*`
- Offline evidence:
  `data/world-review/combined-zones-r08h-platform-06-dynamic-fluid-liner-offline/`
- Focused regression:
  `test/build/combinedZonesR08PF06DynamicFluidLiner.test.ts`

No live RCON call, live service call, service mutation, or world edit was
performed.
