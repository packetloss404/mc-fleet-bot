# C01 Five-Level Underground Bunker Compiler Handoff

**State:** `SOURCE_MODELED / OFFLINE AUDIT PASS / NOT LIVE`  
**Live-world mutation:** none  
**Database, Box, and Sites mutation:** none

## Supersession implemented

`modelC01FiveLevelBunker` is now the active C01 source used by the integrated
town-expansion generator. The former compact arena/aircraft implementation is
an unreachable fail-closed tombstone. Calling it throws the controlling
`SUP-012/SUP-013/SUP-014` error.

The active design contains no aircraft, aircraft hangar, arena, stadium, or
exposed bunker-box program. The bunker is modeled under the terrain. The only
new surface exception is the short natural-covered garage road cut at
`z=-140..-137`; the binding `z=-160..-141` campus-separation/drainage band is
untouched. The existing observatory and owner penthouse/estate remain the only
approved visible crown masks.

## Exact source-model result

The machine audit
`evidence/c01-five-level-source-model-audit.json` reports
`C01_MODEL_AUDIT_PASS`, 30/30 checks, and zero unreviewed C01 interfaces.

| Contract | Result |
|---|---:|
| Classified cells | 885,022 |
| Modeled final-state cells in isolated C01 audit | 901,073 |
| Gross columns | 93,268 |
| Occupied room/route objects | 165 |
| Route nodes / edges | 165 / 181 |
| Camera candidates | 165 |
| Secure garage vehicles | 24 |
| Public adult private rooms | 24 |
| Public one-to-one rooms | 5 |
| Owner-club private rooms | 12 |
| Fully furnished non-graphic adult rooms including principal room | 42 |
| Poly-living suites | 15 |
| Owner master bedrooms | 3 |
| Owner master kitchens | 2 |
| Contained active Level-5 portal cells | 28 |
| Contained pool source-water cells | 117 |

All seven occupied strata have one declared broad stair and a paired two-car
lift. The modern owner branch retains the frozen five-by-five clear route and
the accepted detour through `(363,55) -> (540,-20) -> (620,-42) ->
(718,-42)` at floor `y=-44`.

The rooms use complete non-graphic furniture groupings: privacy thresholds,
beds/platforms, lounge seating and tables, dressing screens, wash/cleanup
counters, storage, distinct materials, ambient/task light, and abstract
specialty-furniture silhouettes. No people, anatomy, depicted acts, or
explicit imagery are modeled.

## Exact NBT ledger

`generate_c01_source_nbt_migration_ledger.mjs` reads typed NBT from immutable
snapshot
`f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10`
and produces:

- `c01-source-nbt-migration-ledger.json`;
- `data/buildops/c01-source-nbt-migration.commands.txt`; and
- `data/buildops/c01-source-nbt-migration.rollback.commands.txt`.

The ledger reconciles exactly:

- 1,896 block entities;
- 1,622 inventories;
- 92 item stacks;
- 5,132 total items;
- 1,619 move entries;
- 277 retained observatory/penthouse/shelter entries; and
- 25 bed-companion placements.

Every entry records the source block state, typed full NBT, SHA-256, inventory
slots, item count, destination, expected destination NBT SHA-256, sequence,
rollback point/NBT/hash, and guarded forward/rollback command. The commands
copy and verify commissioned destination NBT; they do not retire the source.

## Verification performed

```text
npx vitest run test/build/townExpansionC01Compiler.test.ts test/build/qaC01BunkerSquare.test.ts
PASS: 2 files, 3 tests

node scripts/generate_town_expansion_r1.mjs --audit-c01-only
PASS: C01_MODEL_AUDIT_PASS, 30/30 checks, zero unreviewed C01 interfaces

node scripts/generate_town_expansion_r1.mjs --audit-cbe-only
PASS: CBE_MODEL_AUDIT_PASS, 11/11 checks, zero unreviewed Iowa interfaces
```

Key SHA-256 values at handoff:

| Artifact | SHA-256 |
|---|---|
| `scripts/town_expansion_c01_compiler.mjs` | `c0529d63cbc7449fb39af67cdbae86c03d12a97f0bd2eb39de55329e49e9b361` |
| `scripts/generate_c01_source_nbt_migration_ledger.mjs` | `b8cd36a779f2cbcb71013df213b974b136266affdde5618c0088410ad50e9209` |
| `evidence/c01-five-level-source-model-audit.json` | `63c8f7204070c9437ea9c494be8270068a42a446c4ab8e5c11faa3b22f0dbfce` |
| `c01-source-nbt-migration-ledger.json` | `545a9835ccf7cb2e39d52e5440d011684a9727b812751d730a669af8863bbc4f` |
| forward NBT command sidecar | `fc0e0f94ae20bbbe43b4301a358fe28a17c44d25f5877400168c7367d367a7da` |
| rollback NBT command sidecar | `e9f5c023a03b9a14df58d45a58f438afec088ce317fb4cecbdadf406b73d134c` |

## Binding release blocker and next transaction sequence

The ninth scope, `c01_source_exact_retirement`, is deliberately zero-target
and deferred. This is required by commission-new-before-retire-old; it is not
an omitted implementation.

A complete live release still requires:

1. one fresh same-moment immutable source snapshot;
2. exact REPL forward/rollback regeneration against that source;
3. live typed-NBT hash validation of all 1,896 source block entities;
4. entity/player clearance and strict-noop parser preflight;
5. commissioning of the complete new bunker;
6. normal walking, lift/stair, portal containment, 360-degree concealment, and
   matched visual acceptance;
7. execution and readback verification of the 1,619 destination NBT copies;
8. exact old-C01-owned retirement while retaining all 277 sibling entries and
   the observatory/estate geometry; and only then
9. full P01 parking recovery and its independent route/drainage acceptance.

The pinned ledger and source-model PASS do not authorize replay against a
different live state and do not prove a live build.

