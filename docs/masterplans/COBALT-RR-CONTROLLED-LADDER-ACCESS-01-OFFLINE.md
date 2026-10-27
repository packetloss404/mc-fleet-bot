# Cobalt Ravensreach controlled ladder access 01 — offline release packet

**Release ID:** `COBALT-RR-CONTROLLED-LADDER-ACCESS-01`  
**Status:** compiled from a complete historical source; awaiting a fresh scoped kernel.

The existing RR-SE-2 Ravensreach headhouse has a dry 3×3 shaft and surface
pad but no climb path. This package makes it usable for controlled vertical
staff access without claiming public access or passenger service.

## Exact safe geometry

- 44 west-facing ladder cells at `(-151,19..62,-390)`, attached to the fully
  sealed east sleeve/pad wall at `(-150,19..62,-390)`.
- Five exact dry lower-landing cells at the corridor end and four exact open
  surface-exit cells.
- The 97-cell interaction set has no fluid, gravity, or protected block.

The source survey found retained water at the *north* wall, y=`36..39`.
That wall is not a support, target, or interaction cell in this package. The
package neither displaces nor seals that fluid; it follows the dry opposite
wall instead.

This does not modify a headhouse liner, track, guideway, power, signals,
vehicles, normal-walk public route, or passenger service.

## Artifacts and static checks

- Compiler: `scripts/compile_cobalt_rr_controlled_ladder_access_01.mjs`
- Forward/inverse: `data/buildops/cobalt-rr-controlled-ladder-access-01.controlled-ladder.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-rr-controlled-ladder-access-01.release-manifest.json`
- Governor-scoped authorization: `docs/masterplans/05-combined-zones/sys03-cobalt-rr-controlled-ladder-governor-standing-execution-authorization.json`
- Independent post QA: `scripts/qa_cobalt_rr_controlled_ladder_access_01_post_release.mjs`
- Regression: `test/build/cobaltRrControlledLadderAccess.test.ts`

The compiler validates the immutable 130-member source capture. Static checks
pass: manifest QA (44 unique targets), strict forward/rollback parsers, source
preflight `44/44`, projected rollback preflight `44/44`, and zero block-entity
intersections.

```bash
npx vitest run test/build/cobaltRrControlledLadderAccess.test.ts
```

## Required fresh execution, not run here

```bash
node scripts/run_combined_zones_scoped_release.mjs \
  --manifest data/buildops/cobalt-rr-controlled-ladder-access-01.release-manifest.json \
  --release-node CZ-SYS03-COBALT-RR-CONTROLLED-LADDER-ACCESS \
  --authorization docs/masterplans/05-combined-zones/sys03-cobalt-rr-controlled-ladder-governor-standing-execution-authorization.json \
  --execute \
  --source-snapshot-root <fresh-source-root> \
  --post-snapshot-root <fresh-post-root> \
  --out-dir <fresh-evidence-dir>
```

Then run:

```bash
node scripts/qa_cobalt_rr_controlled_ladder_access_01_post_release.mjs \
  --ledger <fresh-evidence-dir>/evidence-ledger.json \
  --out <fresh-evidence-dir>/post-release-qa.json
```

Do not record it as as-built unless both stages pass.
