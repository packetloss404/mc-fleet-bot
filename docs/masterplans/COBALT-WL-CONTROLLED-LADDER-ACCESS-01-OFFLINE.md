# Cobalt Westlight controlled ladder access 01 — offline release packet

**Release ID:** `COBALT-WL-CONTROLLED-LADDER-ACCESS-01`  
**Status:** compiled from a complete historical source; awaiting a fresh scoped kernel.  
**Purpose:** make the existing sealed Westlight headhouse shaft usable for controlled vertical staff access.

## Exact bounded change

The existing 3×3 Westlight headhouse shaft at `x=-250..-248`,
`z=-444..-442`, `y=18..66` is dry but has no climb path. This package adds
one attached ladder column at `(-250, 19..66, -444)`:

- 48 exact replacements: 47 `air` cells and the single surface-pad cell at
  `(-250,66,-444)` become `ladder[facing=south,waterlogged=false]`.
- The ladder attaches to the retained north sleeve/pad wall at
  `(-250,19..66,-445)`; 47 are polished deepslate and the top attachment is
  polished andesite.
- The five-cell platform-side landing and four-cell open-air surface exit are
  exact retained clear cells.

This is a controlled vertical ladder, not a normal-walk public route. It does
not alter the water sleeve, its behind-wall water, platform lighting, tracks,
guideway, power, signals, vehicles, or passenger service.

## Safety facts from the bound source

- Source: `data/worldsnap-cobalt-s1-passive-rail-post-20260826T183111Z`, a
  complete immutable 130-member capture.
- Interaction set: 105 exact cells; no fluid, gravity block, or protected
  block in the operated, attachment, landing, or exit cells.
- The north sleeve attachment and both exits are re-proven before compiling.
- Forward and exact reverse each contain 48 strict `REPL` operations; no
  WorldEdit operations remain after parser conversion.
- The manifest is scoped to the guarded runner and the Governor-delegated
  internal release roles. It grants no mutation authority by itself.

## Artifacts and checks

- Compiler: `scripts/compile_cobalt_wl_controlled_ladder_access_01.mjs`
- Operations: `data/buildops/cobalt-wl-controlled-ladder-access-01.controlled-ladder.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-wl-controlled-ladder-access-01.release-manifest.json`
- Scoped authorization: `docs/masterplans/05-combined-zones/sys03-cobalt-wl-controlled-ladder-governor-standing-execution-authorization.json`
- Independent post QA: `scripts/qa_cobalt_wl_controlled_ladder_access_01_post_release.mjs`
- Regression: `test/build/cobaltWlControlledLadderAccess.test.ts`

```bash
npx vitest run test/build/cobaltWlControlledLadderAccess.test.ts
```

## Required fresh execution, not run by this packet

```bash
node scripts/run_combined_zones_scoped_release.mjs \
  --manifest data/buildops/cobalt-wl-controlled-ladder-access-01.release-manifest.json \
  --release-node CZ-SYS03-COBALT-WL-CONTROLLED-LADDER-ACCESS \
  --authorization docs/masterplans/05-combined-zones/sys03-cobalt-wl-controlled-ladder-governor-standing-execution-authorization.json \
  --execute \
  --source-snapshot-root <fresh-source-root> \
  --post-snapshot-root <fresh-post-root> \
  --out-dir <fresh-evidence-dir>
```

Then run the independent QA against that sealed ledger and fresh post snapshot:

```bash
node scripts/qa_cobalt_wl_controlled_ladder_access_01_post_release.mjs \
  --ledger <fresh-evidence-dir>/evidence-ledger.json \
  --out <fresh-evidence-dir>/post-release-qa.json
```

Do not record an as-built release unless both the generic runner and this
release-specific QA pass.
