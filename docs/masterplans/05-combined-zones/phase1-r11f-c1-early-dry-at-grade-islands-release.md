# Combined Zones CZ-R11F: C1 early dry at-grade islands

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_AND_INDEPENDENTLY_SEALED  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** `dac26f1c94dd1abb7f00ecf18e99d88dda5d8184b290d2fb06986a4c25b5bbd2`  
**Manifest full-file SHA-256:** `96dba501a6376f2e5bafde87519138cd3ffd05c75f96fee8395d4edc424ab584`  

## Scope

R11F builds the only two remaining dry, source-proven early C1
`AT_GRADE_COORDINATION_PASS` islands:

- stations 46..47: 269 cells, including five ordered gravel stabilizations
  and 58 connected pavement cells; and
- stations 75..91: 1,370 cells and 493 connected pavement cells, including 19
  exact owned-log removals while 88 influenced leaves retain log distance one
  through four and require zero property transitions.

The three-package batch owns 1,639 exact reversible cells and 551 pavement
cells. Its operated-union SHA-256 is
`2b4e2ee530e848107f993db8138f027b75fb6074a186c46a91d16c01ddc277b6`.
Each pavement surface is connected internally; they remain separate islands.

## Preserved holds

Stations 0..10 are not included. Current-source inventory found 80 unstable
contacts and 106 fluid halo cells there, so that range remains a local
hydraulic/foundation hold. Non-at-grade stations 11..45, 48..74, and 92..480
also remain untouched. The accepted R11E sheep island 1142..1183, wet ranges
952..1139 and 1189..1206, and every other cut, tunnel, bridge, embankment, and
hydraulic treatment remain preserved. R11F makes no corridor connectivity or
commissioning claim across any hold.

Both included islands have zero source hazards, halo fluids/forbidden blocks,
saved-entity conflicts, prior-release intersections, and rail/utility/road
interfaces. The source is the accepted R11E retry-v2 post save, complete-save
SHA-256
`0079adf895179606ad64a57ad0e85351c4e6ba3dbacb82a308b84a6909013109`.

## Artifacts and verification

- inventory:
  `data/world-review/combined-zones-r11f-inventory-20260821T235000Z.json`;
- compiler:
  `scripts/compile_combined_zones_r11f_c1_early_dry_at_grade_islands.mjs`;
- manifest:
  `data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json`;
- independent QA:
  `scripts/qa_combined_zones_r11f_c1_early_dry_at_grade_islands_offline.mjs`;
- offline evidence:
  `data/world-review/combined-zones-r11f-offline-20260822T000000Z`;
- regression:
  `test/build/combinedZonesR11FC1EarlyDryAtGradeIslands.test.ts`.
- live evidence ledger:
  `data/world-review/combined-zones-r11f-live-20260821T234824Z/evidence-ledger.json`;
- independent post-release QA:
  `data/world-review/combined-zones-r11f-live-20260821T234824Z/r11f-post-release-qa.json`;
- post-release regression:
  `test/build/qaCombinedZonesR11FPostRelease.test.ts`.

Offline acceptance requires 1,639/1,639 source guards and exact inverses,
three nonempty packages, two internally connected surfaces, full geometry and
headroom identities, 4,419 exact interaction-halo cells, three forward and
three projected rollback preflights, six strict-noop parser checks, zero block
entities, and guarded wrapper print-plan compatibility.

```bash
node scripts/inventory_combined_zones_r11f_c1_early_at_grade_islands.mjs
node scripts/compile_combined_zones_r11f_c1_early_dry_at_grade_islands.mjs
node scripts/qa_combined_zones_r11f_c1_early_dry_at_grade_islands_offline.mjs
npx vitest run test/build/combinedZonesR11FC1EarlyDryAtGradeIslands.test.ts
npx vitest run test/build/qaCombinedZonesR11FPostRelease.test.ts
```

## Executed closeout

The guarded wrapper completed with ledger status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`, 31 passing stages, and 33 intact
evidence bindings. Independent post QA proves 1,639/1,639 exact target states,
1,639 exact reverse-order rollback guards, both internally connected surfaces,
full headroom and stable foundation contacts, and all three execution journals.

The 4,419-cell interaction halo contains exactly four non-target changes: each
is grass-to-dirt directly below a declared opaque stone-brick foundation cell.
These are classified as normal shaded-grass lifecycle transitions, not
undeclared operation drift, and do not affect rollback readiness. The
2,873-cell early hydraulic halo, 464,168 wet-range review cells, 10,238-cell
omitted sheep-island halo and all three sheep NBT records, and 50,444 exact
held-treatment envelope cells are unchanged. No connectivity or commissioning
is claimed across the preserved holds.

Any later execution or rollback must still use the scoped wrapper and a fresh
complete safety kernel; never execute an operation file directly.
