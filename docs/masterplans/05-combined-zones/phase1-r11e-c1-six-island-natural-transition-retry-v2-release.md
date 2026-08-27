# Combined Zones CZ-R11E retry-v2: accepted-recovery natural-transition rebound

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_INDEPENDENT_QA_SEALED  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** `29b5c6fe848a1f9396de052ffda7b431357b78d676621d0307848b7b40f8f2bd`  
**Manifest full-file SHA-256:** `db348b7419dc6955dce857e58b3e152a58da5b93ba1167cb1a8d3b7623eff9ee`  

## Physical scope

Retry-v2 retains the six useful, mutually disjoint at-grade islands from the
sheep-preserving retry: stations 548..551, 564..569, 606..608, 627..632, 792,
and 1213..1215. It contains ten ordered packages, 20 distinct operation files,
and 1,593 exact reversible target cells. Its operated-union hash remains
`bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042`.

Island 1142..1183 and all 2,389 of its proposed targets remain omitted because
three unfenced sheep occupy its interface. Ranges 952..1139 and 1189..1206,
every non-at-grade treatment, and all hydraulic interfaces remain untouched.
No connectivity or commissioning is claimed across holds.

## Narrow recovery rebound

The source is the independently accepted compensated-recovery snapshot
`data/worldsnap-combined-zones-r11e-retry-post-20260821T230554Z`, complete-save
SHA-256
`9b98157a895d29614a05d50fbdc4170ff184d7c22f2e5018aa8dec5604c35930`
and region SHA-256
`56e84a0442f1fca276c6b2b7882bd7e3f9900efb3fe7fd1c2f1a5f69a57b0f61`.
The compiler reads all 1,593 guards from that immutable source.

Compared with retry-v1, exactly one forward record changes: `(968,102,27)`
now guards `minecraft:grass_block[snowy=false]` before placing
`minecraft:gray_concrete`. Exactly one rollback record changes, restoring that
same grass state. Coordinates, desired geometry, package order, sheep
exclusions, and every other source/rollback state are identical. The accepted
halo-only shaded-grass decay is not an operation target and is not modified.

## Artifacts and offline acceptance

- recovery audit:
  `scripts/audit_combined_zones_r11e_retry_recovery.mjs`;
- accepted recovery evidence:
  `data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/r11e-retry-recovery-acceptance.json`;
- compiler:
  `scripts/compile_combined_zones_r11e_retry_v2_c1_six_island_batch.mjs`;
- canonical manifest:
  `data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json`;
- independent offline QA:
  `scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_batch_offline.mjs`;
- offline evidence:
  `data/world-review/combined-zones-r11e-retry-v2-offline-20260821T233000Z`;
- focused regression:
  `test/build/combinedZonesR11ERetryV2RecoveryRebound.test.ts`.

Offline gates require and currently prove:

- recovery audit PASS: 1,593 targets, 8,348 halo cells, exact two-cell natural
  diff set, zero residual operation state, and zero failed compensation groups;
- independent retry-v2 QA PASS: 1,593/1,593 recovery-bound guards, 1,593 exact
  inverses, six island geometries, complete sheep/hold preservation, and only
  one forward plus one rollback record different from retry-v1;
- generic manifest QA PASS: ten packages, 1,593 unique cells, zero overlap;
- ten forward source preflights and ten projected rollback preflights PASS;
- 20 strict-noop parser dry-runs PASS;
- block-entity audit PASS with zero blockers; and
- wrapper `--print-plan` PASS with ten packages and no global gate.

Regenerate and run the focused checks with:

```bash
node scripts/audit_combined_zones_r11e_retry_recovery.mjs
node scripts/compile_combined_zones_r11e_retry_v2_c1_six_island_batch.mjs
node scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_batch_offline.mjs
npx vitest run test/build/combinedZonesR11ERetryV2RecoveryRebound.test.ts
```

Live use must pass only the retry-v2 manifest to
`scripts/run_combined_zones_scoped_release.mjs` under release node
`CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR`. The wrapper must still take a fresh
same-invocation complete save and rerun source preflights, block-entity and
same-moment live-entity clearance, strict-noop journaled execution, post
snapshot verification, and rollback post-state preflights. This offline
release does not itself authorize or perform a world mutation.

## Executed release and independent seal

The guarded wrapper completed with terminal status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its immutable ledger is
`data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/evidence-ledger.json`
(SHA-256
`97b0a46b5ddd2b56c2864cf44e71746dbb186fddd5a2ccb19e5ea0cd7b2a562f`),
and completed release identity is
`33ef91973427f9f93a5cd4af5bfa4d059979064a43fd0eb9d2fa6db4f2af3ffb`.

Independent post-release QA is sealed at
`data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/r11e-retry-v2-post-release-qa.json`.
It verifies:

- 1,593/1,593 exact target states across all ten packages and exact reverse
  inverses;
- six independently connected pavement surfaces, full two-block headroom,
  and stable foundation contacts, without claiming connectivity across holds;
- all 8,348 selected interaction-halo cells, with zero undeclared drift;
- one exact accepted non-target lifecycle change at `(938,96,32)`, grass to
  dirt after the release placed the declared opaque stone-brick foundation
  directly above; this does not affect any rollback operation guard;
- the omitted sheep island's 2,389 target cells and complete 10,238-cell halo
  unchanged, with all three sheep retaining byte-identical complete NBT;
- all 80 successful wrapper stages and 89 immutable evidence bindings, ten
  strict execution journals, 1,593/1,593 execution groups, and 1,593/1,593
  rollback poststate guards; and
- the two wet at-grade ranges and every deferred non-at-grade treatment remain
  excluded and uncommissioned.

Reproduce the seal with:

```bash
node scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11ERetryV2PostRelease.test.ts
```
