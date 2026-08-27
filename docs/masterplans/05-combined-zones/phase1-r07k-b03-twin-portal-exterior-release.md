# Combined Zones CZ-R07K: B03 twin portal exterior

**Status:** EXECUTED — POSTSTATE VERIFIED — REVERSIBLE — INDEPENDENT POST-QA ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Canonical owner:** `P1-B03`  
**Manifest identity:** `6f12c133da91eef5b014baccbb2c97c1a2ba7cd7ec1aef1302250ec45263242e`

## Exact construction

R07K closes the remaining bounded B03 portal-exterior architecture with one
dry/static package. It adds two stone-brick U collars around the accepted R07A
portal openings at centre Z=-748 and Z=-868:

- each collar is 36 cells and two blocks deep at X=2236..2237;
- each collar has two outer columns and a nine-cell lintel in each depth plane;
- the mountain-side columns start at Y=167 and bear on existing polished
  diorite at Y=166;
- the exposed-side columns start at Y=166 and bear on existing polished
  diorite at Y=165; and
- the full package is 72 exact `minecraft:air` cells becoming
  `minecraft:stone_bricks`.

The twin target set has two face-connected components of 36 cells. It has 60
exact polished-diorite face contacts to accepted portal fabric and eight exact
polished-diorite bearing contacts. Stone brick continues the accepted R07B
viaduct exterior while retaining the R07A polished-diorite tube as the visible
inner fabric.

## Opening and ownership boundary

The two preserved opening prisms total 80 exact cells: two 5x4 apertures across
the two collar depth planes. All 80 are air in the immutable source and none is
a target. R07K does not alter the R07A route void, tube shell, mountain seam,
R07B bents, rail, power, brake, controls, drainage, fluids, or commissioning.

All 72 targets are immediately outside the historical B03 construction and
one-cell interaction sets. They are therefore declared as the exact named
`P1-B03-TWIN-PORTAL-EXTERIOR-COLLAR-EXTENSION-R07K`, limited to this dry
two-mouth collar geometry. The extension is supported by the CURRENT-STATE
remaining-portal direction, the R07 release-contract active scope, and the
standing scoped authorization. Every target is face-connected through the new
frame to accepted polished-diorite portal fabric. The compiler checks every
accepted Combined Zones manifest through R08T and finds zero target overlap.

## Immutable source and preservation

R07K binds the latest accepted terminal state:

- source: `data/worldsnap-combined-zones-r08t-post-20260821T194152Z`;
- complete-save SHA-256:
  `fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec`;
- region SHA-256:
  `42001ae747a852e64aead34dcdcfa67b5c22dd45ba25cd49385b633b40155023`;
- source ledger SHA-256:
  `ee64b2008872e1508636074ef3e62e1f8bb0053a26bfaf540d0e554db0872293`;
- predecessor completed release identity:
  `0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f`.

The complete 1,560-cell twin-portal review prism is block-state identical
between accepted R07J and R08T. Both state-set hashes are
`1e5832df51ffa74b75d476ffd65d04ba4a0306cd574a7eea4241674dd62fa5bf`,
with zero mismatches. The 288-cell face halo contains zero fluids, gravity
blocks, block entities, saved entities, or protected relics.

## Guarded artifacts and offline evidence

- Compiler:
  `scripts/compile_combined_zones_r07k_b03_twin_portal_exterior.mjs`
- Manifest:
  `data/buildops/combined-zones-r07k-b03-twin-portal-exterior.release-manifest.json`
- Forward body: 72 one-cell guards, SHA-256
  `6aa713a665da8db30c3f78e5c960e396eb1c70682a7200d4e349df9ffe3342b2`
- Rollback body: 72 exact reverse-order inverse guards, SHA-256
  `88e3ade0719483f8929c67a0c3c8158615f69ea16006baab84080ac5eacdd2ff`

Offline evidence is in
`data/world-review/combined-zones-r07k-b03-twin-portal-exterior-offline-20260821T195000Z`:

- structural manifest QA: PASS, 1/1 package and 72 unique targets;
- source preflight: 72/72 PASS;
- projected inverse preflight: 72/72 PASS;
- strict forward and rollback parser checks: 72/72 each, zero WorldEdit
  leftovers;
- block-entity audit: PASS, zero blockers; and
- deterministic focused regression: 6/6 PASS.

The wrapper plan is `wrapper-plan.json` in that evidence directory. The
compiler and offline gates made no live call and no world mutation.

## Execution and independent post-release seal

The strict wrapper completed the package at
`data/world-review/combined-zones-r07k-live-20260821T195128Z/evidence-ledger.json`.
Its source-bound release identity is
`04a997357503ca15e4f2c4dbe264798ccf81992128e6ce48b942bf4e42f1a0da` and
its completed release identity is
`359374cbac2459d139d7b24b9b0430169f0e2ea91c9e2fd9537b8a1f48458600`.
All 72 strict forward groups succeeded with zero failure, no-op, unknown reply,
or WorldEdit remainder. The exact rollback post-state preflight passes 72/72.

The immutable post is
`data/worldsnap-combined-zones-r07k-post-20260821T195128Z`, complete-save
SHA-256 `1d9b5eaccbadd887581a831481117916c1b4c681551b32d234db0405cb77280a`
and region SHA-256
`c4a9a291f84b23a7b9112196e4e09d1fc66096b9c10b6d313f42293a7ee0429a`.

Independent read-only QA proves all 72 exact transitions, two connected
36-cell collars, all 80 aperture air cells and eight polished-diorite supports
unchanged, and zero undeclared drift across the 1,560-cell review domain. It
also verifies all execution, inverse, entity, block-entity, evidence-binding,
and completed-release identities. The accepted seal is
`data/world-review/combined-zones-r07k-live-20260821T195128Z/r07k-post-release-qa.json`,
payload SHA-256
`a685e12e5ded202fc81f712c169e1c09b32bc57a95f544264b812d05c4aef94e`.
This closes the bounded R07A–R07K architecture wave; active rail, power,
brakes, controls, drainage, rescue, and route commissioning remain R10/R12.

Reproduce offline:

```bash
node scripts/compile_combined_zones_r07k_b03_twin_portal_exterior.mjs
npx vitest run test/build/combinedZonesR07KB03TwinPortalExterior.test.ts
npx vitest run test/build/qaCombinedZonesR07KB03TwinPortalExteriorPostRelease.test.ts
npm run build
```
