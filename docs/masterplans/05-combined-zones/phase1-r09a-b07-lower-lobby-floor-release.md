# Combined Zones CZ-R09A: B07 lower-lobby floor

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Canonical owner:** `Z06-PUBLIC-SHAFT-FITOUT`  
**Manifest identity:** `fc0fc7c512a7c8aab7276322958a3a2d6860acdf9a2c8447f112dde4bc959df6`  
**Completed release identity:** `8396512df6919d7497d7b39c0af3019777d4133122dee8ff80b03932e6ac0ee8`  
**Post-QA payload identity:** `85ec48c7c9ede8ea96ce3214a712b6945727369ffaec4eb0f4296fc230975d3c`

## Built scope selected

R09A is the smallest useful dry public-core fit-out supported by the frozen
B07-C-WEST-2 geometry: the complete 9x7 lower-lobby floor at
`x=2103..2111, y=-59, z=-431..-425`.

- 63 exact air-source cells became a supported walkable floor.
- 36 polished-andesite cells form the shoulders; 27 polished-diorite cells
  form a three-block-wide east-west aisle. These are the exact primary and
  secondary Houston `lobby_floor` palette materials.
- Three guarded rectangular operations cover all 63 cells. The inverse uses
  three reverse-order operations and restores the exact prior air state.
- All 63 floor cells have solid support at Y=-60: 43 deepslate, 10 bedrock,
  and 10 tuff. The standing and head planes are 126/126 air.

This package does not commission a lift, stair, rail, power, smoke, drainage,
or control mechanism. It does not touch the observation transfer, wet liner,
wall, ceiling, shaft head, or any deferred scope.

## Accepted-state inventory and isolation

- R03/R04 freezes the B07 construction reservation at 8,134 cells. Its release
  recorded 7,577 cells already void, including this exact floor, after R02.
- R06 treated the separate B07 wet pocket at Y=5..17. R09A is at Y=-59 and has
  zero wet-liner operation intersections.
- The compile source is the accepted R08B immutable post save
  `data/worldsnap-combined-zones-r08b-post-20260821T162429Z`, complete-save
  SHA-256 `db8be11127b00fc779a7e70afa400c3e2a3f7782f4d7a95d8ef2374c2a1c8ce7`.
- The only prior operation overlap is the exact 63-cell R02
  `d06-reservations` excavation. That transition is declared; rollback
  preserves R02 by returning every cell to air.
- The 297-cell one-block interaction halo has zero fluids, gravity blocks,
  containers/control blocks, block entities, saved entities, protected relic
  cores, or frozen D06 mechanism cells. No undeclared prior-release target
  intersection exists.

## Execution and post-release seal

The standing scoped wrapper executed R09A on 2026-08-21 and terminally accepted
the transaction in
`data/world-review/combined-zones-r09a-live-20260821T163535Z/evidence-ledger.json`.

- Fresh execution source complete-save SHA-256:
  `6e52f5b3f81c0451801a7cebbfdd6677af13da09c27a6d6fae4f0bacdbd48d89`.
- Strict execution: 3/3 guarded groups changed, zero failures, zero no-ops,
  zero WorldEdit leftovers; the temporary force-loaded chunk was released and
  the pre-existing force-load set restored.
- Immutable post complete-save SHA-256:
  `ae68ac762092df0cff0203e87926eb8f809166e44231ca68a1e1eda6fd1b50cb`;
  region identity
  `7dadac331af83c96693723dce2e06640a0f1740ec8cd14ee558aa7d5ebfb9c6c`.
- Exact post state: 63/63 floor cells match, comprising 36 polished andesite
  and 27 polished diorite.
- Support: 63/63 contacts remain stable and byte-for-state unchanged from the
  execution source.
- Usability: the full 63-cell floor is one connected component; 126/126
  two-block headroom cells, 343/343 lower-shaft approach cells, and 49/49
  shaft-seam cells are air.
- Reversibility: 3/3 exact rollback guards pass against the immutable post
  snapshot.
- Read-only post QA:
  `data/world-review/combined-zones-r09a-live-20260821T163535Z/r09a-post-release-qa.json`
  and `r09a-post-release-qa.md` — all 12 checks PASS.

## Artifacts and prerelease verification

- Manifest:
  `data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json`
- Forward body SHA-256:
  `70155d9b71b4fa7e069dcbf1b40c9c2df877c7335ed41cf223851b2fd447eed6`
- Rollback body SHA-256:
  `ba2d813454c7409ba45d90ac95fdc95c5aab49f9334e5943b23bf8112df4d259`
- Manifest QA:
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.manifest-qa.json`
  — PASS, 63 unique targets, zero duplicates or inverse errors.
- Source preflight:
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.forward-source-preflight.json`
  — PASS, 3/3 exact guards.
- Strict parser dry-runs:
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.forward-strict-dry-run.json`
  and
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.rollback-strict-dry-run.json`
  — PASS, three `/fill` commands each, zero WorldEdit leftovers.
- Projected rollback:
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.projected-rollback-preflight.json`
  — PASS, 3/3 guards after the exact forward overlay.
- Block-entity gate:
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.block-entity-clearance.json`
  — PASS, zero blockers.
- Scoped-wrapper plan:
  `data/world-review/combined-zones-r09-b07-lower-lobby-floor.wrapper-plan.json`
  — PASS, recognized as one R09 package under standing authorization.
- Compiler regression: 6/6 PASS. Post-release regression: 5/5 PASS.

Regenerate and verify offline:

```bash
node scripts/compile_combined_zones_r09_b07_lower_lobby_floor.mjs
npx vitest run test/build/combinedZonesR09B07LowerLobbyFloor.test.ts
node scripts/qa_combined_zones_r09_b07_lower_lobby_floor_post_release.mjs
npx vitest run test/build/qaCombinedZonesR09B07LowerLobbyFloorPostRelease.test.ts
node scripts/qa_guarded_release_manifest.mjs \
  --manifest data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json \
  --out data/world-review/combined-zones-r09-b07-lower-lobby-floor.manifest-qa.json
```

## Acceptance

R09A is complete, usable at its declared lower-lobby scope, and exactly
reversible. No release gate remains for these 63 cells. Later shaft transport,
observation-transfer, lining, lighting, signage, and headhouse packages remain
separate scopes and do not change this acceptance.
