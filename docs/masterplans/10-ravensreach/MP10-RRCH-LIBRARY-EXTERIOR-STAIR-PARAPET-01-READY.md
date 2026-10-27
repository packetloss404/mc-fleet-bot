# MP10 Ravensreach Library Exterior Stair Parapet 01 — prepared release

**State:** `STATIC_READY_FROM_FRESH_POST_SOURCE_AWAITING_FRESH_LIVE_KERNEL`  
**Release:** `MP10-RRCH-LIBRARY-EXTERIOR-STAIR-PARAPET-01`

## Purpose and exact scope

The accepted six-level exterior library switchback has an exposed west edge.
This package adds the complete, stepped **west retaining parapet** for all five
existing flights. It is a supported structural edge, not a floating fence,
interior furnishing edit, or a standalone decorative cue.

- `119` source-air → polished-andesite cells;
- exact bounds: `x=-157`, `y=47..82`, `z=-446..-440`;
- `32` lowest cells have retained direct solid supports;
- `646` one-cell interaction-halo cells have zero fluid/gravity hazards,
  stored block entities, and saved entities;
- the five existing three-wide flights retain `10/10` projected normal-walk
  directions.

The east bookshelf-facing side, all walking lanes `x=-156..-149`, all library
fixtures, and the Library/Loggia seam at `x=-111` are excluded. This package
does not commission public egress, accessibility, Loggia access, the library
programme, Ravensreach, or the Master Plan.

## Fresh post source and static proof

The source is the complete immutable post-capture from the immediately prior
annex release:

`data/worldsnap-mp10-rrch-library-stair-annex-post-20260826T193000Z`

The prepared kernel ledger records a fresh compiler rebind, exact source and
projected-rollback preflights, block-entity clearance, and strict-noop parser
checks for both directions:

`data/world-review/mp10-rrch-library-exterior-stair-parapet-01-prepared-20260826T193000Z/fresh-kernel-ledger.json`

The rebound forward/rollback operations and manifest live beside that ledger
in `rebound-buildops/`. The focused compiler regression is
`test/build/mp10RrchLibraryExteriorStairParapet.test.ts`.

## Execution and acceptance

The Governor standing authorization is scoped only to this exact package:
`mp10-rrch-library-exterior-stair-parapet-governor-execution-authorization.json`.

An eventual execution must use the runner in execute mode with new nonexistent
source/post snapshot destinations. It must still pass fresh same-moment entity
clearance, journaled strict execution, post capture, rollback-poststate
preflight, and the independent immutable-post QA:

```bash
node scripts/run_mp10_rrch_library_exterior_stair_parapet_release.mjs \
  --execute \
  --source-snapshot-root <fresh-source-destination> \
  --post-snapshot-root <fresh-post-destination> \
  --out-dir <fresh-evidence-directory>

node scripts/qa_mp10_rrch_library_exterior_stair_parapet_01_post_release.mjs \
  --regions <fresh-post-destination>/region \
  --manifest <fresh-evidence-directory>/rebound-buildops/mp10-rrch-library-exterior-stair-parapet-01.release-manifest.json \
  --out <fresh-evidence-directory>/post-release-qa.json
```

No live command was issued while preparing this package.
