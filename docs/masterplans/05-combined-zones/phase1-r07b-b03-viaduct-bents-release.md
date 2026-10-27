# Combined Zones CZ-R07B: B03 viaduct support bents

**Status:** EXECUTED — POSTSTATE VERIFIED — REVERSIBLE — POST-RELEASE QA ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Manifest identity:** `fb5fab99755da2ab8967e7b4c448ced19b660ea2da3bbdd15d049338ae43891a`  
**Execution source complete save:** `99ddd136557e661724a418acd9d47ae1f8e9ea0dc767d543fccd19389e2a3f4b`  
**Post complete save:** `0daa9de0249777de943b9033786651970da93d894fafd97376a93ebfd6dfd71a`  
**Completed release identity:** `c02e6e3cd0b3215e742f52b852f819ee2b0603549f9c971d63fccf7b934a44f9`

R07B is the smallest exact exterior package supported by the frozen B03
geometry after R07A. It adds paired stone-brick viaduct bents below the exposed
polished-diorite J-curve tube. The two portal approaches remain on their
existing R05 mountain bearing; this package does not alter the route void,
tube enclosure, portal openings, rail, lighting, utilities, or mechanisms.

## Exact design

- The accepted exposed B03 centreline is indices 188–612.
- Regular bent candidates occur every 16 steps from 196 through 596. Index 460
  is additionally selected at the north/west tangent joint.
- Each bent is two blocks thick along the route and seven blocks across. Its
  paired two-block-wide legs extend from one block below the cross-beam to the
  first exact accepted stable foundation.
- 26 of 27 candidates compile. Candidate 484 is omitted as a complete bent
  because one leg first meets `minecraft:short_grass` at
  `(2365,89,-871)`; the compiler preserves it instead of clearing unrelated
  vegetation.
- Exact design: 11,758 unique cells — 364 cross-beam cells and 11,394 leg
  cells — bounded by `x=2244..2391`, `y=84..164`, `z=-871..-745`.
- Target coordinate-set SHA-256:
  `d30393d3db6a00c91bf86ddbc9ec6f5ae0ffdc13dbf8538f7eaf5c9a7ae3f85a`.
- Source partition: 11,646 exact `minecraft:air` cells and 112 exact
  `minecraft:snow[layers=1]` cells. All become
  `minecraft:stone_bricks`.
- The 11,758 exact cells compact into 476 vertical guarded `REPL` runs. The
  rollback is the exact region-for-region inverse.

## Safety result

- Independent guarded-manifest QA: **PASS**, 1/1 package and 11,758 unique
  targets.
- Initial compiler-source preflight against the accepted R07A post snapshot:
  **476/476 PASS**.
- The execution pipeline captured fresh complete save
  `99ddd136557e661724a418acd9d47ae1f8e9ea0dc767d543fccd19389e2a3f4b`
  and repeated the exact source preflight: **476/476 PASS**.
- Projected rollback preflight using the forward source overlay:
  **476/476 PASS**.
- Strict-noop parser dry-runs: forward **476/476** fill commands and rollback
  **476/476**, with zero WorldEdit leftovers.
- The exact targets plus their 23,895-cell one-block halo contain zero fluid,
  gravity, forbidden-container, block-entity, saved-entity, protected-relic,
  or prior-release intersections.
- All 208 leg foundation contacts are exact accepted stable states. Their
  census is 107 grass blocks, 48 polished diorite, 48 smooth stone, two
  andesite, two stone, and one dirt.
- The guarded live release completed 476/476 strict groups with zero failures,
  no-ops, unknown replies, or WorldEdit leftovers. All temporary force-loaded
  chunks were released.
- The immutable post-save contains 11,758/11,758 exact stone-brick targets,
  26/26 independently connected bents, 261 exact polished-diorite tube
  contacts spanning every bent, and 208/208 unchanged stable foundation
  contacts.
- Rollback post-state preflight passes 476/476 exact guards against post region
  identity `8abeba854bf61fff2431359729c01c51a1ef50d785879d79d232c7ea7769759d`.
- The read-only post-release QA passes all 12 checks and is sealed as
  `07f062404e6baa1dbb3023b850f3c171840ec8e5df59a3c2bc79600bd0a69161`.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r07b_b03_viaduct_bents.mjs`
- Manifest:
  `data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json`
- Forward operation body SHA-256:
  `23b2ab9902217d5ba30713fe1d7a0577cbe4a50bb57baaa9ed24aec561a09a37`
- Rollback operation body SHA-256:
  `7564a7e9c13ec8042197443ebcc3f55218e6f47cfc3b8b83810423f10e0269cb`
- Manifest QA:
  `data/world-review/combined-zones-r07b-b03-viaduct-bents.manifest-qa.json`
- Source preflight:
  `data/world-review/combined-zones-r07b-b03-viaduct-bents.forward-source-preflight.json`
- Projected rollback preflight:
  `data/world-review/combined-zones-r07b-b03-viaduct-bents.projected-rollback-preflight.json`
- Strict dry-runs:
  `data/world-review/combined-zones-r07b-b03-viaduct-bents.forward-strict-dry-run.json`
  and
  `data/world-review/combined-zones-r07b-b03-viaduct-bents.rollback-strict-dry-run.json`
- Block-entity clearance:
  `data/world-review/combined-zones-r07b-b03-viaduct-bents.block-entity-clearance.json`
- Executed evidence ledger:
  `data/world-review/combined-zones-r07b-live-20260821T161500Z/evidence-ledger.json`
- Read-only post-release QA:
  `data/world-review/combined-zones-r07b-live-20260821T161500Z/r07b-post-release-qa.json`
  and
  `data/world-review/combined-zones-r07b-live-20260821T161500Z/r07b-post-release-qa.md`

## Verification

Run the focused regression:

```bash
npx vitest run test/build/combinedZonesR07B03ViaductBents.test.ts
npx vitest run test/build/qaCombinedZonesR07B03ViaductBentsPostRelease.test.ts
```

Run the full backend suite:

```bash
npm test
```
