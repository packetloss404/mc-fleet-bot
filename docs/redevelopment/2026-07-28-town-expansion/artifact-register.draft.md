# Town Expansion Redevelopment Artifact Register

Release: `REDEV-2026-07-28-TOWN-EXPANSION`  
Mode: **DRAFT**  
Status: **DRAFT_NOT_AS_BUILT_REGISTER**  
Generated: 2026-07-28T14:32:14.089Z  
Machine register: `data/world-review/town-expansion-artifact-manifest-2026-07-28.draft.json`

> **DRAFT / FINALITY RULE:** Draft mode is preparation evidence only and
> must not be described as final or as-built. Final mode refuses to write
> unless transaction, post snapshot, post QA, media QA, database import,
> read-only database report, and all byte hashes pass.

## Final documentation input gate

| Gate | Result |
|---|---|
| Canonical compiler report, ownership manifest and forward package exist and agree | PASS |
| One canonical transaction is committed with strict-noop success | FAIL / PENDING |
| Immutable post snapshot exists, differs from prerelease and matches post QA | FAIL / PENDING |
| Bound live entity/player clearance report passed without mutation | FAIL / PENDING |
| Independent post-release QA reports PASS and ACCEPTED | FAIL / PENDING |
| Paired post media passed, binds post/package/crosswalk, and supplies 13 maps | FAIL / PENDING |
| Atomic database closeout imported every verified registry object | FAIL / PENDING |
| Read-only database publication census passed against the accepted post state | FAIL / PENDING |

## Purpose and reading rule

This is the human review index for the release evidence set. The adjacent
JSON is authoritative for file-level SHA-256 values, byte sizes, image
dimensions, JSON status fields, package IDs, operation hashes, and snapshot
bindings. Generated dossier outputs are intentionally excluded to avoid a
self-referential hash cycle.

## Inventory summary

| Evidence class | Files | Bytes | Images | JSON |
|---|---:|---:|---:|---:|
| baseline-and-post-maps | 10 | 4,147,564 | 7 | 2 |
| canonical-build-package-and-engineering | 151 | 4,370,007,771 | 0 | 121 |
| citizen-program-reports | 7 | 80,078 | 0 | 3 |
| entity-transaction-post-and-database-qa | 69 | 2,230,300,362 | 1 | 58 |
| exact-object-media-and-crosswalk | 4 | 3,358,556 | 0 | 4 |
| pm-dossier-frozen-scope-and-research | 170 | 18,475,463 | 16 | 77 |
| project-closeout-readme | 1 | 20,326 | 0 | 0 |
| release-and-documentation-automation | 15 | 869,444 | 0 | 0 |
| release-and-documentation-tests | 7 | 65,902 | 0 | 0 |
| **Total** | **434** | **6,627,325,466** | **24** | **265** |

## File-type census

| Extension | Files |
|---|---:|
| `.json` | 265 |
| `.md` | 80 |
| `.txt` | 30 |
| `.png` | 24 |
| `.mjs` | 15 |
| `.jsonl` | 13 |
| `.ts` | 7 |

## Category-level artifact ledger

### baseline-and-post-maps

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/00-overall-active-world-surface-atlas.png` | 893,178 | `6a8dc4ebe67209106d046ca5b6d5b3c6eff9e7016fb02c1aef0abf707eba1323` | 1792×2176 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/01-ravensreach-core-and-old-town.png` | 108,865 | `322462b6468394df3720fdd15f1670eee202c2213be10323c62a2d9d80b7403f` | 805×885 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/02-ravensgate.png` | 73,309 | `2717d24f0baa28521c0b09254dd04c3dd53858d24800c7ddf97b20d9320627e3` | 725×965 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/03-western-approach-road.png` | 62,760 | `74fc9609c3078107ee9ddbe66fd74708cdd888241d0ee8f2ebddf7f2aee847d1` | 964×324 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/04-westlight-venue-and-district.png` | 128,620 | `e63a9a98e545a2291b451c970553e1114e88f0a74ff68dc22a4eaaebfab047a7` | 900×1028 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/05-western-project-corridor.png` | 196,809 | `3f72371921f95575f6eb21a4001ad4d68913757a70a1bcfaf199d68d8c1f0d79` | 1395×1107 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/06-raven-rock-surface-access.png` | 381,758 | `3793517f28a53e598260be2f6a2d8f581dee79b62a903da2fe856461b47cf048` | 1282×1282 |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/area-inventory.json` | 2,279,657 | `29f35f8bf0f2b93bbcdb5ad991f4f4a15198822c53e5e46d6da5cd065949a698` | snapshot=d24a3407e6fe… |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/atlas-manifest.json` | 21,486 | `701522c65c0bfdd9086f8d6703c53005d227cf6d33f6529aa369f7bb9728f91d` | snapshot=d24a3407e6fe… |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/README.md` | 1,122 | `062030de390ec432d82d74be53f8e0e7291d8570962f497ae1c053843697e0ea` | — |

### canonical-build-package-and-engineering

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/buildops/archive/town-expansion-r1-baseline-20260728T0930Z/town-expansion-r1-2026-07-28.atomic-release.json` | 301 | `53dc2fb938fa526a7972f4588f9af84ebc1a17a34d46b21e41c1f9412af33651` | — |
| `data/buildops/archive/town-expansion-r1-baseline-20260728T0930Z/town-expansion-r1-2026-07-28.manifest.json` | 23,844 | `6b0eae0349f05ef25e3bf6ebf8171bfb583f04441c1a216c23e76d945bbfdaae` | status=EXACT_MODULE_OWNERSHIP_MANIFEST; package=town-expansion-r1-2026-07-28; snapshot=f9a6a21ec115… |
| `data/buildops/archive/town-expansion-r1-baseline-20260728T0930Z/town-expansion-r1-2026-07-28.prerelease-preflight.json` | 450 | `827b8017e3466537a131682b886bed4cdf91b8e72b9f0a5aa171ae941ce7965d` | — |
| `data/buildops/archive/town-expansion-r1-baseline-20260728T0930Z/town-expansion-r1-2026-07-28.report.json` | 1,676,793 | `9a136e0c19577225e5f4c5eaebf5ce865000ab54bfc69851c3f7e976d3144d85` | status=COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED; package=town-expansion-r1-2026-07-28; snapshot=f9a6a21ec115… |
| `data/buildops/archive/town-expansion-r1-baseline-20260728T0930Z/town-expansion-r1-2026-07-28.rollback.txt` | 39,683,608 | `b7000e2a7d2e171e320ef93fb179f4fc06fa00665876a84248695cb2de3834b9` | — |
| `data/buildops/archive/town-expansion-r1-baseline-20260728T0930Z/town-expansion-r1-2026-07-28.txt` | 40,313,136 | `8a9242fa2cd58a3b83df28b1ded4edab79715366818774e7d7b44ace621de40f` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.cameras.json` | 15,191 | `c9983a23e6dba22c55f1508fbe77063f167b7d2afd84db46e5ae3fdbc0114f90` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.database-features.json` | 40,449 | `0725b81b87af706989698cfef321466d7d40c6fb0f4ea15802ddd0cbb598d704` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.dry-run.json` | 29,378,106 | `29e3b81f7c538464149d2064ad2b1e30a6bc3b92132b6a931d78bb314e521ed4` | status=dry_run; ops=cddba81d860a… |
| `data/buildops/manager-vale-five-cottages-2026-07-28.furnishings.json` | 125,161 | `a92eeb5860c38d667aa3d8da17bb69ecae6c3e8a609a83fb9d9bcc283860aacc` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.nbt-copy.commands.txt` | 10,783 | `2eb354b87ad8ffa58f5e51e84269e9a739babcc455be878dd703150fce23ce87` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.nbt-ledger.json` | 62,411 | `193d826e4da44b9fa7feda74278d764a11fda685de6412af3006a713ddb76e3c` | status=OFFLINE_COMMISSION_LEDGER_LIVE_HASH_GATES_PENDING; package=MANAGER-VALE-FIVE-COTTAGE-PROTECTED-BE-LEDGER-R1 |
| `data/buildops/manager-vale-five-cottages-2026-07-28.nbt-verify.commands.txt` | 2,778 | `c2e1ef1f96b2d12fe3fd6c5326f8a9f930a215003cd338eb0dc4e4584880fb66` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.preflight.json` | 395 | `f8e60181eae7131afef71281011e3ada31bc07cb9e99fe468ce56b2669f735e5` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.private-suites.json` | 28,585 | `94de07b19ef7dcc8413d091267167afd4ff2bc5428c9a88ebe8f9f74c5d2c3bc` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.report.json` | 59,802 | `17fdef3bd9f35199a97c67052566d04734ce357c817eaefbb2b89cfa30957a38` | status=PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING; package=MANAGER-VALE-FIVE-COTTAGE-COMMISSION-R1 |
| `data/buildops/manager-vale-five-cottages-2026-07-28.rollback.dry-run.json` | 30,185,574 | `786d87c98a904687445c2cf550cb65c2801edb5b4cccdb2e4e1dd2008420f44b` | status=dry_run; ops=bfdde00455c7… |
| `data/buildops/manager-vale-five-cottages-2026-07-28.rollback.txt` | 2,910,790 | `bfdde00455c750291f7b8dc93aa68b1451c44c60a825ee7d6629c2b3dd537f97` | — |
| `data/buildops/manager-vale-five-cottages-2026-07-28.txt` | 2,910,786 | `cddba81d860a5f75bf9849a50e76eb74775915318e310c9d7f0ac0fa4a0b6c3f` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.cameras.json` | 15,191 | `c9983a23e6dba22c55f1508fbe77063f167b7d2afd84db46e5ae3fdbc0114f90` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.database-features.json` | 40,449 | `0725b81b87af706989698cfef321466d7d40c6fb0f4ea15802ddd0cbb598d704` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.furnishings.json` | 125,161 | `a92eeb5860c38d667aa3d8da17bb69ecae6c3e8a609a83fb9d9bcc283860aacc` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.nbt-copy.commands.txt` | 10,783 | `2eb354b87ad8ffa58f5e51e84269e9a739babcc455be878dd703150fce23ce87` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.nbt-ledger.json` | 62,411 | `193d826e4da44b9fa7feda74278d764a11fda685de6412af3006a713ddb76e3c` | status=OFFLINE_COMMISSION_LEDGER_LIVE_HASH_GATES_PENDING; package=MANAGER-VALE-FIVE-COTTAGE-PROTECTED-BE-LEDGER-R1 |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.nbt-verify.commands.txt` | 2,778 | `c2e1ef1f96b2d12fe3fd6c5326f8a9f930a215003cd338eb0dc4e4584880fb66` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.private-suites.json` | 28,585 | `94de07b19ef7dcc8413d091267167afd4ff2bc5428c9a88ebe8f9f74c5d2c3bc` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.report.json` | 59,856 | `42e3bdcd0c301a49613ac90906a6cfb25f1d0d40efaeec0aa4d7e106f64bda22` | status=PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING; package=MANAGER-VALE-FIVE-COTTAGE-COMMISSION-R1 |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.rollback.txt` | 2,910,790 | `bfdde00455c750291f7b8dc93aa68b1451c44c60a825ee7d6629c2b3dd537f97` | — |
| `data/buildops/manager-vale-five-cottages-fresh-2026-07-28.txt` | 2,910,786 | `cddba81d860a5f75bf9849a50e76eb74775915318e310c9d7f0ac0fa4a0b6c3f` | — |
| `data/buildops/town-expansion-r1-2026-07-28.atomic-release.json` | 301 | `53dc2fb938fa526a7972f4588f9af84ebc1a17a34d46b21e41c1f9412af33651` | — |
| `data/buildops/town-expansion-r1-2026-07-28.emergency-rollback.execution.json` | 503,283,881 | `3853c098e2e3c7ff3c420e18dbc16e203b80d4327f7e3202de6b287e348d1d0d` | status=failed; ops=46948f87dd0c… |
| `data/buildops/town-expansion-r1-2026-07-28.emergency-rollback.execution.json.stream-journal.20260728T132828759884Z.jsonl` | 120,715 | `19df421d08556b96abb8ac9bbba159984b1f343601c808afc2559c3d2fcacdae` | — |
| `data/buildops/town-expansion-r1-2026-07-28.emergency-rollback.execution.json.stream-journal.20260728T140241872186Z.jsonl` | 120,715 | `ac658fd2596dd4179decaabdb2c0f873d09d73100ed76c89273f828816daa3f0` | — |
| `data/buildops/town-expansion-r1-2026-07-28.emergency-rollback.execution.json.stream-journal.jsonl` | 463 | `48a610d3f0b27e0a1eb8f7f9bc554c15ecfce59377399fec13b67acdde14214b` | — |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance10a.journal.json` | 8,871 | `799313c412031ea60fbd0ee3fd587dbbe0644cfa0c848a9761ebf16d72976baa` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance10a.manifest.json` | 984,622 | `83503ffe4ac9d994019ebffda61f82f0d27ef96ef37d3972c448e62d976a3ae6` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance11a.journal.json` | 13,476 | `2910e15cfb46263f995097535cd63eba7ac5be104a22098914b69f5e1e670b1b` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance11a.manifest.json` | 988,490 | `c08c0a116dcd68d0cc86cbb49d9f0f1c7961808b627541c3bd37f60fe073a8b8` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance12a.manifest.json` | 987,418 | `eb2051e57f592b076c4055abba5294ccff0c77a345a0a2738573581eea61f6a9` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance12b.manifest.json` | 968,834 | `5b7358090edec98e2abc2731705133d203d62a07d9698f2a24eb8a71fa45a737` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance12c.journal.json` | 18,468 | `1f40ad933f5416c8055fa540164f485f72b8e9500bf2617236fc3630fc463844` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance12c.manifest.json` | 956,941 | `95d917d0eecd88070631012513b5f3907a68635e8f7d375465d00415e7b1f383` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13a.manifest.json` | 928,204 | `4d74477729e29e73d52cd03238d8fadce4d5155eb3ad39843e81e75b704de5e6` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13b.manifest.json` | 922,340 | `0f6087dda191004cc3821b4f24bc6b49dfc00234193264c814a6644de11b608b` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13c.manifest.json` | 916,354 | `29acf2b939090ca770b69e9bd8b284adf6f25c398c6ae1d99df1e42646e993e9` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13d.journal.json` | 14,044 | `059b5c8071344129eb9d973eb4b44b664f0174c8bc6cd07ec198ee1f5f316aaf` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13d.manifest.json` | 910,368 | `8c25458be10d96f6bd00f2b064417e76682ed3da1699d9101ce2f464819f309c` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance14a.journal.json` | 10,130 | `9c399ac19b1d2d7708cf0102afebe7a1a2feee58e1bdf2584350ade67dd968e8` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance14a.manifest.json` | 888,684 | `bd66e53be6d632b4a88048007bc973d2442cbe17d59d377c0bbdf14f98b2419a` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance15a.manifest.json` | 1,093,825 | `305bbbd924362d29cd8c4153c506e3705573f12eee8e6223586662dc00e76e7d` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance15b.manifest.json` | 1,087,643 | `dac2fc2697cc9d7c2ab4e8d307d8b6a08d5b58e508eb600fa1ad23a82d008537` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance15c.journal.json` | 8,606 | `fc6d6accaf230b00aa2f9f2cec7be3def7aa7abd1414d7ab984118ae6d539fe8` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance15c.manifest.json` | 749,268 | `653f66f6bab6314aaf54e055f60ffee348db1e56dc6861a1aecda4d5acbfca3d` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance16a.manifest.json` | 764,904 | `71123038a609f55e043f2b8066a94a7f0c45140c0bd83f52f1007ff7c72f8c02` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance16b.manifest.json` | 759,080 | `7f0de284fff999e81e61dd812cd8890fe303a6d29fa31df5db8649f2dce6ef91` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance16c.manifest.json` | 753,418 | `e593223289a67d5a625fec8bf0237f24c07ff53c3c721645508ca8f262aac5ec` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance16e.journal.json` | 19,801 | `4fc104695203c9c9386aa9f3ede6f595abfbe6b167645fbba87403d9d1db1e7f` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance16e.manifest.json` | 786,680 | `afea2cff125c9a517c11a5e82c18ce6d42dd8e89d93ec3af0d2b7d1850498bbc` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance17a.manifest.json` | 1,059,662 | `93cf347bac4d96243b64fd664fa4a29ffcad3428f6a320a26f3fce9ab51d8005` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance17b.journal.json` | 13,943 | `9a6152798313d7996e73f21da1d43e0599558fce718c88873eac382f0f9d0bf0` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance17b.manifest.json` | 1,090,742 | `da334b45785e3b8006a4e03c30c87bfaa8fd7bd85cb16a63f186aec02542865a` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance18a.manifest.json` | 1,618,544 | `e10562b53be4f1759c101b468bd91fe123cdeb9e7206d66d89db08ba83463aea` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance18b.journal.json` | 8,977 | `a420f614dc23f3528f993782c7a0c194985687211958bb65b0110d96bb037e0f` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance18b.manifest.json` | 858,677 | `d16a1dc5b35caf0c7ec9e37880198ccbcad254eab2601546f1ddf537f8c34109` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance2-nonoverlap.manifest.json` | 1,435,556 | `a76b84a50202a22ac1bf0a82293760e32b8c7ae4454512ef2378d2802cca30c4` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance2.manifest.json` | 2,500,607 | `9e0026c8d036ddba5bda42cf26d83447a7cffde420a27a8e08694badd5eb5549` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance2b.journal.json` | 7,883 | `45258869e3c32d6054048c94243f6ea94f6db98e5ea5ce16f74583e96e11141f` | status=explicitly-rolled-back |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance2b.manifest.json` | 1,445,338 | `9d217e3743270feb79b9cfc44af2def6f80cfa1cf7a8c36161e258a624c6883b` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance3.journal.json` | 68,620 | `68fa9ebacf8d17f0837eb7bb67cc466e7e0a330891a837cdf15945abdd50b691` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance3.manifest.json` | 1,475,851 | `2dfdebbd3fcb276cae3204287aff8148be7f7b8067a330406a84ce49b6576233` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4.manifest.json` | 1,247,735 | `30c1693efd9f551f6332db4f0940edbc92345f013651cc030cd858828cfd4545` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4b.manifest.json` | 1,223,358 | `6e4cb943acfb305dd0b60d45c5ff14ad4c364a4c6f4958a341a3bfadfb820ecb` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4c.manifest.json` | 1,204,746 | `b4efec8a65631d113ac706f17c35f866fa8a59330506f92321f40e8b96222b26` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4d.manifest.json` | 1,192,352 | `dd9fa5b1f7be6af383e8acab3dbdba7484b3fd225150668d11c560537919340b` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4e.manifest.json` | 1,186,365 | `8ce82658ff3fa15f76a9b5ee978aceadbcd9eafcebe070ef545312d6b6ca7a7c` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4f.manifest.json` | 1,180,378 | `cfecf92bb5c19c6ee607dc63ecf08b8c3df4fa97bbec5bae4cd6fd4b530781af` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4g.manifest.json` | 1,174,391 | `06d0ba12e5ed2d97ac86314b36e97c420daa233b90a302d0c2a61f86b9d294cd` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance4h.manifest.json` | 1,168,373 | `f0dea97faac212ce85b22f88b32832d9375ee0121b38b742890274b40fb48689` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5a.manifest.json` | 1,200,803 | `cc3b3a8cafe9f6c93904e069f6a1a98948404a55aa1ecfda2bbfb69644e2f3f1` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5b.manifest.json` | 1,194,978 | `310792f6c374ee8c65a5cdccf4416f4b5cd445a973fa7c7674082afd9b102617` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5c.manifest.json` | 1,189,153 | `de44ec5d67e570069e0d7ad3377bcf888c7105ef1ba58d6bf71e60af0138635b` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5d.journal.json` | 11,435 | `3fcffb8a17f73bab77a2ec1a608f9adfcd9ed20cb7ac753193bf31bcaee508f4` | status=failed-rolled-back |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5d.manifest.json` | 1,183,328 | `902e97d71d4b5d5d770e9f843cecd6ddbade3875ae04f8b2fb80873e354aad56` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance6a.journal.json` | 57,316 | `a1a28ffcf5414bb439bdb2ebfbfcb9e9f7b86c0ae4e60b7f6b281eaaf778a42a` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance6a.manifest.json` | 1,208,571 | `ca5aed564e07967c87e87647f00f5f75b8af40d1c98b6547279fbbb592db2118` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance7a.journal.json` | 29,435 | `0b5bc8297d5a8118ccc7aefc97b1c710e01d53c87f60c284e13224f59dfa0628` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance7a.manifest.json` | 1,080,765 | `ded8f07fe9a1c4ee43aee5fc58861c9a65c36f659157024c5f4d01e37b9ad6fc` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance8a.journal.json` | 18,913 | `e7a55eee7436edced79eab0425a333f2aadcc7d45da9cc4fda1bcc8db033c30b` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance8a.manifest.json` | 1,028,881 | `b1a93bf1bdbed2634bb43d8effc7ebe0e33cbd9bdec95e8da015b32360f93010` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9a.manifest.json` | 1,087,975 | `f6459ea565c4f0faadf29f121b0ce758a35cb43e7a0104287c72b610315d0ab3` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9b.manifest.json` | 1,009,070 | `fa9334b6e6eae9d14d9983162388d6244bc3bc7bdc48e2b63e553ce2e675cfb7` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9c.manifest.json` | 1,003,245 | `52dbd94a45d1986e5a249c95cd1b6b83bb3372412c61b643d992ec3419c34404` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9d.manifest.json` | 997,420 | `b917da0521bd2fa8c5879af795781afa97f02779ca266289f1600b12887baadb` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9e.journal.json` | 8,889 | `42c01b9f331a1e83d2765c081fbef44847151665fa003c24650e97a35122476d` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9e.manifest.json` | 991,757 | `a9ba49cf62fd6dd1eadec0b1f7f0f21d23f16b03a8b945e5d9c20aca20eebfc2` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.current-sanctuary.candidate.manifest.json` | 2,999,470 | `425da42ace49024b03cf9781398b93a0ac4fdce95a6025448859191eeba30fb9` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.current-sanctuary.candidate2.manifest.json` | 3,412,653 | `ae624682da96b34376c2c5ae8a15c3e5d8e8d2985bdd7452ceee6f30713d6e6f` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.current-sanctuary.candidate3.manifest.json` | 3,725,494 | `2f37accbca17608bc07d8b4463098c4e2706627cad9d04f8d4efd6fd9a22904b` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.current-sanctuary.candidate4.manifest.json` | 4,086,778 | `1dda0fac4496cb38e729cad74c91d7d48bb522b3c21757de2e03bbb15cfdec9f` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.current-sanctuary.candidate5.manifest.json` | 4,164,338 | `b4ebe642780dac1bd73a8e17762ff7867de9e23beb7134767dc2d06f82bff61d` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.final1.manifest.json` | 4,132,382 | `2a8e60c51a20c58f9680687a8de56611f6e4510498264d0c837b4dd76d7de155` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh.journal.json` | 4,905 | `57325810aa6eff541ef22d9c56caabeee2d0fa459664269413b6847ac86e46f5` | status=failed-rolled-back |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh.manifest.json` | 986,019 | `2c2102b474d97a875647a4777e3036df8d37efef730ad6c53bd4d28ec7abf899` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh.retry1.journal.json` | 57,579 | `852b3ac25240f1a4e3f7882e2e982ee52ea9017c79f8a994187c84e13ab44393` | status=explicitly-rolled-back |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh2-item.manifest.json` | 992,522 | `1156d9bd4a12da9009ef47034e106026ae686ad53456e46f2c5c2312a059200f` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh2.journal.json` | 643,323 | `d1169ee5568c9a4e4c21d30feae9e619950ad92e1dc71d25520a6438e2291728` | status=failed-rolled-back |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh2.manifest.json` | 992,522 | `54f201d332f0ad7f957736ea1adbcd7c0bf20e3641fafe75259409d9e9d0c57c` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh3-preferred.journal.json` | 851,756 | `a132700cd14186adb7de79d051ab39899f7e29e35294bc047ffc2311c4e52e8a` | status=partial-evacuation-completed |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh3-preferred.manifest.json` | 4,173,507 | `aaee436cb88cdd51611df1d6c5a97e30e7e24ee38a66477844e6c0968c28018e` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.fresh3.manifest.json` | 992,522 | `0fa2f016479741ad6467b3c1bb551f655ac10dc5a9e7e8e4fba62aed2719b528` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.manifest.json` | 2,912,512 | `c04d8ff79900e11e228bbb5b62da4e4d60c49b80892cfcfdc6edc10f9cae6a3f` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.nbt2.manifest.json` | 990,170 | `663d42b477118b4936e6032b6f0af4f109297e345cff34d5b510eb8b125b4d1d` | status=READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED |
| `data/buildops/town-expansion-r1-2026-07-28.execution.json` | 514,117,690 | `535f10e931848f9b708c76ab5cd977d3573f75bae4765b7ce2df740e61aa90d0` | status=failed; ops=540a71756e31… |
| `data/buildops/town-expansion-r1-2026-07-28.execution.json.stream-journal.20260728T132734667538Z.jsonl` | 170,955 | `d093a968ba39c2203dedf9733e1264d22ec876a28d19b4f449346155aed97a02` | — |
| `data/buildops/town-expansion-r1-2026-07-28.execution.json.stream-journal.20260728T140147354757Z.jsonl` | 188,302 | `fdc22b3a3e84030b6c0948a78ef0332b3f180f87ad3071b17691fcd281ce828e` | — |
| `data/buildops/town-expansion-r1-2026-07-28.execution.json.stream-journal.jsonl` | 454 | `b2eb1cfc6201862bb409d7e7fbd79dcfd074204ec4196e05231e3069812004f9` | — |
| `data/buildops/town-expansion-r1-2026-07-28.forward-dry-run.json` | 394,896,738 | `b7ff026dfdcd7701c9762cf2b7b998b198318ed30ccfb59df8950531f1d742bd` | status=dry_run; ops=a326d880dbdb… |
| `data/buildops/town-expansion-r1-2026-07-28.fresh.tmp.manifest.json` | 23,875 | `dff4e7da62b94abb7f17515d7723111906df83da8234f3a93b67316018c6e52f` | status=EXACT_MODULE_OWNERSHIP_MANIFEST; package=town-expansion-r1-2026-07-28; snapshot=f9a6a21ec115… |
| `data/buildops/town-expansion-r1-2026-07-28.fresh.tmp.report.json` | 1,676,824 | `3d68c0b61c17a64c7665bc65c1f3fab8f3b131796dbddaf754c1626066776a52` | status=COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED; package=town-expansion-r1-2026-07-28; snapshot=f9a6a21ec115… |
| `data/buildops/town-expansion-r1-2026-07-28.fresh.tmp.rollback.txt` | 39,682,987 | `48031c2248cc4efd6b73cac87dc0e0d5f990a5b7e7814d3fb8e4fbe6ba530bd6` | — |
| `data/buildops/town-expansion-r1-2026-07-28.fresh.tmp.txt` | 40,312,515 | `46edc7ca730668675fb28f661e43184759926d9044cd21b83dd00275a5bfa62a` | — |
| `data/buildops/town-expansion-r1-2026-07-28.frozen-rebase-atomic-manifest-qa.v2.json` | 4,321,261 | `cc52bca04b213ea02fb61186c1ae582b92bf28af0b8a6c4ad2a1c577da8a465d` | status=FAIL; passed=false |
| `data/buildops/town-expansion-r1-2026-07-28.frozen-rebase-atomic-manifest-qa.v3.json` | 4,157,296 | `bf5876ff81ffd66021450b02fe0e339ee3be6dc9ad9410a172bfc20e0a323e63` | status=FAIL; passed=false |
| `data/buildops/town-expansion-r1-2026-07-28.frozen-rebase-prerelease-preflight.json` | 455 | `3f00c4fbaf3af579f7190b879c02e2a58b40b839ae8ff29c748a7f10074b7b18` | — |
| `data/buildops/town-expansion-r1-2026-07-28.live-rebase-preflight.json` | 2,994,088 | `a513f10ba2c55707d655d0b8b0354393c359443c035e6965b24383e404390689` | — |
| `data/buildops/town-expansion-r1-2026-07-28.manifest.json` | 24,480 | `104507538aed01fb05e52e72616f03da0be13cfeb7c31024ee99261409f4c0ee` | status=EXACT_MODULE_OWNERSHIP_MANIFEST; package=town-expansion-r1-2026-07-28; snapshot=de807a2d4a1c… |
| `data/buildops/town-expansion-r1-2026-07-28.pre-execution-entity-gate.json` | 3,783,799 | `546bf0e5aa2250ce8624f58a5fb2b1e98a0ad8df5ad4125c81e773b67dd0ae04` | status=PASS; passed=true |
| `data/buildops/town-expansion-r1-2026-07-28.prefix10-emergency-recovery.txt` | 827 | `8a26c3dac72cab8a5a71a8741e09c56c361f40b978f49be6db9850a5951e2827` | — |
| `data/buildops/town-expansion-r1-2026-07-28.prefix10-source-verification.txt` | 713 | `55afb8942239f14e5f5306b64875e39d380b6da611170dd7691ef2938e078350` | — |
| `data/buildops/town-expansion-r1-2026-07-28.prefix13-emergency-recovery.txt` | 1,051 | `29af5b6c7be890dfc4a1d8b9617b737b6119016eeb35d480cbce7eccd93cfa16` | — |
| `data/buildops/town-expansion-r1-2026-07-28.prefix13-source-verification.txt` | 940 | `8ef83cc18f7e0de6de5764b4e489fa650c38a2aa35c287d011ca243c8e600631` | — |
| `data/buildops/town-expansion-r1-2026-07-28.prerelease-preflight.json` | 455 | `0384272be9f46aec19cdf11e33fabad52bb35cee5deed108c38bd79551a7a3f4` | — |
| `data/buildops/town-expansion-r1-2026-07-28.rebase-candidate.manifest.json` | 24,526 | `076ecc9b0d777e53ed63408b87b40df9db522be3b1f39194c084d08e3815978c` | status=EXACT_MODULE_OWNERSHIP_MANIFEST; package=town-expansion-r1-2026-07-28; snapshot=c181f704e1e1… |
| `data/buildops/town-expansion-r1-2026-07-28.rebase-candidate.prerelease-preflight.json` | 468 | `095bb5efe0c47a16cee28e9840d2955463a988e5786a63a2cfa574709622ab65` | — |
| `data/buildops/town-expansion-r1-2026-07-28.rebase-candidate.report.json` | 1,680,939 | `9e4456fefde1c14f0a9ddee27b2d8684e723be24ecc75e5c7db8994ddbfb6c98` | status=COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED; package=town-expansion-r1-2026-07-28; snapshot=c181f704e1e1… |
| `data/buildops/town-expansion-r1-2026-07-28.rebase-candidate.rollback.txt` | 40,571,807 | `2195b307c58bb60a14f99b2182125db8d27cca0dc2807cd16ea4e4ae80c7e8e9` | — |
| `data/buildops/town-expansion-r1-2026-07-28.rebase-candidate.txt` | 41,201,753 | `146f8d6eec2a0665b2ead2cb8ea8d8b9f661086db39b6f0500581315029ec0c1` | — |
| `data/buildops/town-expansion-r1-2026-07-28.report.json` | 1,681,925 | `7aab25d5c9b461eb84aa1ddce4f6d8af9f2f9f9bb09f406b10e0a0e9e51b2c79` | status=COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED; package=town-expansion-r1-2026-07-28; snapshot=de807a2d4a1c… |
| `data/buildops/town-expansion-r1-2026-07-28.rollback-dry-run.json` | 384,691,546 | `1ef3e5199ea952ea819d35064f467f5e080f575f72a80a5f5e15487300f23377` | status=dry_run; ops=00872afc0ba6… |
| `data/buildops/town-expansion-r1-2026-07-28.rollback.txt` | 40,855,309 | `1870b697414b96e969c4daf968da1b2c0fed9ee6c69e459bc31769ddaa24b85a` | — |
| `data/buildops/town-expansion-r1-2026-07-28.streaming-strict-dry-run.json` | 475,465,665 | `d0f8093e97224c5c7c4394609983648a80dd70530d6c0eda0f764ba0892fdd82` | status=dry_run; ops=8a9242fa2cd5… |
| `data/buildops/town-expansion-r1-2026-07-28.streaming-strict-dry-run.v2.json` | 503,774,590 | `144b36ec938a3bfd03880963631263e2d4e59185edab15c238117cb6ee229630` | status=dry_run; ops=8a9242fa2cd5… |
| `data/buildops/town-expansion-r1-2026-07-28.streaming-strict-dry-run.v3.json` | 503,774,590 | `5defa3d1cc62f40d4137e7bc1d8ff5f3329249cb629c518b1740479f8856310c` | status=dry_run; ops=8a9242fa2cd5… |
| `data/buildops/town-expansion-r1-2026-07-28.streaming-strict-dry-run.v4-rebase.json` | 514,095,285 | `b60cc96854b2e5551a6e73e719e6043155da198da4ab482af1975d014697c2fc` | status=dry_run; ops=540a71756e31… |
| `data/buildops/town-expansion-r1-2026-07-28.txt` | 41,485,255 | `a747021daf771ce6d798b462eecc60a77cb88b136fc48591aba6fab523546f86` | — |
| `data/buildops/town-expansion-r1-wip.report.json` | 366,341 | `fc9384735ee6710da19992a352793a907996788cebcd687b56c7ae8b59230187` | status=BLOCKED_PROTECTED_BLOCK_ENTITIES; package=town-expansion-r1-2026-07-28; snapshot=e612b1feabcf… |
| `data/buildops/town-expansion-r1-wip.rollback.txt` | 16,067,159 | `6922cb254a928160b0fb6fafa013adf78529a0e019ad34954289cd42c40d05e5` | — |
| `data/buildops/town-expansion-r1-wip.txt` | 16,136,490 | `0c334dda0e343c599ef92e961d61340ef7681f7c0a8274df69465dd66e6efda9` | — |
| `data/buildops/town-expansion-r1-wip2.report.json` | 470,652 | `04b1c2dffaac3396c94be5ea3fc30245e9665accabd341f12550515a46eda399` | status=BLOCKED_PROTECTED_BLOCK_ENTITIES; package=town-expansion-r1-2026-07-28; snapshot=e612b1feabcf… |
| `data/buildops/town-expansion-r1-wip2.rollback.txt` | 18,982,615 | `f26220752fb7b3d53d6a2123eb98760f4ddae21268f77bfbc73e8411de790554` | — |
| `data/buildops/town-expansion-r1-wip2.txt` | 19,080,390 | `a48db51242b299daf746a429727de995c1a6bfede3f486e7d8b5fad3f37e7a8c` | — |

### citizen-program-reports

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `docs/citizen-fleet/2026-07-28-citizen-life-and-schedule-audit.json` | 4,790 | `008004c0c2f0c2377d7b5731ac9bd14e3d09f1d3f146f90b717d5747e2231aa2` | status=NOT_READY_FOR_AUTONOMOUS_DAILY_LIFE_OR_CROSS_CITY_ACTIVATION |
| `docs/citizen-fleet/2026-07-28-citizen-life-and-schedule-audit.md` | 14,547 | `70da5bb2ecdd5e4bcda7cd5da7e1ae3fdb36e30d9df69fc4d84b282ca0048bf3` | — |
| `docs/citizen-fleet/2026-07-28-five-bot-audit-and-rollout.md` | 19,235 | `df22a59d72a728ae0e789843831e7a343fadc427750e2f00e0d63570351ded32` | — |
| `docs/citizen-fleet/2026-07-28-five-bot-audit.json` | 11,560 | `0214c0c4ffa233e2e89a8f093816137be629e3d681b45d5fcfe670dfa019ded5` | — |
| `docs/citizen-fleet/2026-07-28-five-bot-runtime-readiness-recheck.json` | 6,711 | `6d7483fda14481a3579308bfc55fcefca265dd73c6daa29cecb1b4e56f284966` | status=SOURCE_READY_LIVE_ACTIVATION_BLOCKED_ON_POST_RELEASE_ROUTE |
| `docs/citizen-fleet/2026-07-28-five-bot-runtime-readiness-recheck.md` | 8,307 | `96e3d0b244be2b58c8fc6e4f9e1e2356c7dd8ec6a1c1f17bcc8eee64c4f8d546` | — |
| `docs/citizen-fleet/2026-07-28-ravensreach-mainstreet-route-survey.md` | 14,928 | `c53e583893708e726ab2c99ad2a8b7b83cfdea2f8a0529098b5fd2a86bd4153d` | — |

### entity-transaction-post-and-database-qa

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/atomic-transaction-attempt-132527.json` | 4,894,246 | `301af4f272b942c3e058709ee9e5aa6f0892cdab37dae31d8e4c3c43ffedc707` | status=rollback-failed |
| `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/emergency-rollback-attempt-132828.json` | 493,554,094 | `d3912abe126bc13de68e5c7b471c23f35dbf2d1a8fac66c87ee90687a30685cd` | status=failed; ops=b7000e2a7d2e… |
| `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/forward-execution-attempt-132734.json` | 503,796,994 | `00c3b25be157509fc65860b9acea370fc800ed205d7cc10c337f772e1666be96` | status=failed; ops=8a9242fa2cd5… |
| `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/town-expansion-r1-2026-07-28.emergency-rollback.execution.json.stream-journal.20260728T132828759884Z.jsonl` | 120,715 | `19df421d08556b96abb8ac9bbba159984b1f343601c808afc2559c3d2fcacdae` | — |
| `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/town-expansion-r1-2026-07-28.execution.json.stream-journal.20260728T132734667538Z.jsonl` | 170,955 | `d093a968ba39c2203dedf9733e1264d22ec876a28d19b4f449346155aed97a02` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.atomic-release.json` | 301 | `53dc2fb938fa526a7972f4588f9af84ebc1a17a34d46b21e41c1f9412af33651` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.emergency-rollback.execution.json` | 503,283,881 | `3853c098e2e3c7ff3c420e18dbc16e203b80d4327f7e3202de6b287e348d1d0d` | status=failed; ops=46948f87dd0c… |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.emergency-rollback.execution.json.stream-journal.20260728T140241872186Z.jsonl` | 120,715 | `ac658fd2596dd4179decaabdb2c0f873d09d73100ed76c89273f828816daa3f0` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.execution.json` | 514,117,690 | `535f10e931848f9b708c76ab5cd977d3573f75bae4765b7ce2df740e61aa90d0` | status=failed; ops=540a71756e31… |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.execution.json.stream-journal.20260728T140147354757Z.jsonl` | 188,302 | `fdc22b3a3e84030b6c0948a78ef0332b3f180f87ad3071b17691fcd281ce828e` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.manifest.json` | 24,475 | `668ab20a025ffa7e7ea7f1278c0d855fbc8093396280fa681839d0e833039b63` | status=EXACT_MODULE_OWNERSHIP_MANIFEST; package=town-expansion-r1-2026-07-28; snapshot=c181f704e1e1… |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.report.json` | 1,680,888 | `13e8b46988bda8a3c53e918353a9e0a22a33e7bb5364e09382bc6cbfba60d3cf` | status=COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED; package=town-expansion-r1-2026-07-28; snapshot=c181f704e1e1… |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.rollback.txt` | 40,571,807 | `46948f87dd0c7621d1c3b13a2ec45ebe338dd430530181b3a6935dcef930a532` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.txt` | 41,201,753 | `540a71756e31b7fee76235083f877e85af7cecefabb476d2ff88b61a206e13c0` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-atomic-transaction-20260728.json` | 4,883,405 | `7265cdcd426b4bdd434620100a2dfc325dc4af4e19c43f5f0174f93402c12c57` | status=rollback-failed |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-live-entity-gate-rebase-pass2-frozen-20260728.json` | 3,783,799 | `6ad528832a0aa93edf8411904afc910acf722aa065e7d89d811271d7b4005d3a` | status=PASS; passed=true |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-prefix13-recovery-execution-20260728.json` | 22,925 | `5a66193b1925c7dba3179a234989dee9f56d1e64889455de3dba601a5943f1cc` | status=complete; ops=29af5b6c7be8… |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-prefix13-recovery-execution-20260728.stream-journal.pass2.jsonl` | 51,266 | `32ceede8fa5f420c5819a0f2b3a3f28e3946d41b0b342685e3b9aebd84f464d9` | — |
| `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-prefix13-source-restoration-preflight-20260728.json` | 471 | `4276022cbaaf089ca5987bbf5c8907ff21eb1f0b9620963edf4a7a58b1bcd237` | — |
| `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json` | 39,207 | `47aafa347c99aaa450c9d2040b1414e8f1f6a05a3550401c4675a1b8a1ab6e22` | status=PROPOSED_NOT_APPLIED |
| `data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png` | 204,125 | `d1b22dd5f66d8c5fa660b01da2f313589345603049a0031282ac0bed78363fac` | 884×2148 |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json` | 304,107 | `df2d72cf836125d0eeb9a365251465c3ee3baed4f77d09c81b0eda3b92a791c2` | — |
| `data/world-review/town-expansion-fresh-c01-audit.json` | 129,555 | `bd45208ae7b900cdf55adda1654143cc19442febc4cc5f096c43ce0d6dc363d5` | status=C01_MODEL_AUDIT_PASS; snapshot=f9a6a21ec115… |
| `data/world-review/town-expansion-fresh-global-audit.json` | 159,952 | `b6c9c6014de87ba53cff683496427bd752a64c76dfbe2e991a0d024c13ae9168` | status=GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS; snapshot=f9a6a21ec115… |
| `data/world-review/town-expansion-fresh-global-audit.md` | 14,485 | `3a1e272a31d42f5b341cf95d3aeabb6f74bf6735b3b017db34c39c9ba243e984` | — |
| `data/world-review/town-expansion-r1-atomic-transaction-20260728.json` | 4,883,405 | `7265cdcd426b4bdd434620100a2dfc325dc4af4e19c43f5f0174f93402c12c57` | status=rollback-failed |
| `data/world-review/town-expansion-r1-final-entity-clearance-red-team-audit-20260728.json` | 16,292 | `05c231e9511c31b30c30c26dea1d53900609d54b22351eee6789bea088296e19` | status=PASS_FINAL_ENTITY_CLEARANCE_RED_TEAM |
| `data/world-review/town-expansion-r1-frozen-rebase-atomic-manifest-qa.v4-fullstate.json` | 1,717 | `a0daaabb07650586c8e99b89ec9adb7ffadfe97cc52d160f4c395aeafda95d1f` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-live-entity-gate-20260728.json` | 3,852,282 | `f460187eaff39e0283be8f54d8a3690af26e958b01401b9576e29902131f28ca` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-clearance-final-20260728.json` | 3,855,487 | `0dd870fd93aebf3a48053900d5a89e8bf586462c03376fc0a5532df3cc8fe082` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-clearance2-fresh-20260728.json` | 3,874,683 | `7d8b1cea70f5992f3948c19d1ba45f5fa8161c33a6e6b72c6e03593d7a379fd6` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-enriched-20260728.json` | 3,912,902 | `4cc9cac1d2a235e5f90e9f4828e539c47484164fc3a52f87e5a19fb606f99d73` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-20260728.json` | 3,829,119 | `3395fac28bd140fd85316a116829e8a5af87bdd1c3d20a11a4ca740b16321b44` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass10-frozen-20260728.json` | 3,793,323 | `43d2689cb00226e5758ccd25aaa6163ca43ab8ead665c696058e452e2d657cca` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass2-20260728.json` | 3,816,328 | `58b7cfc1892cf54d5c2788285847b81b24e96db668a4e91b3cbd6ada7b8aa406` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass3-20260728.json` | 3,813,841 | `a2abbf02a817147c7c185347c4f9133999f5202e6eba0462d5c6b7160df9d426` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass4-20260728.json` | 3,798,072 | `b12b73fefe75cc8d1de998d573a57e8786a76e556aac2f2eb94b82e938a9707c` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass5-20260728.json` | 3,831,278 | `1bfa4c002f972bb0fdb7fb1cde61f5b389a2862edf0d454f8233bda66937545e` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass6-20260728.json` | 3,812,602 | `c98028cc027765193189afa30bf9aaceedebce8ea99516f7141217a6a9c5b6df` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass7-20260728.json` | 3,816,060 | `e2cef433da22c2c12fd24d2ac66f65368b3bafe5b6cdb869f47cc41e489ee3b4` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass8-20260728.json` | 3,807,441 | `087f56ba7618d6515721a39bb8610b28cd93fb396da4b2c6a6535e715f7b590f` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass9-frozen-20260728.json` | 3,793,336 | `619ba568bcb1b7961a4fbc4ef626e03ce5f60457d7f3092009a82c9860f233b7` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-live-entity-gate-final-hardened-20260728.json` | 3,791,547 | `d09c6f4c0490f4f05c531b0f8251066ac2b97965e9d1f2b8d490cf863105b8d7` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-pass-20260728.json` | 3,806,681 | `f7cfdc65666cedbd23e6fa6f9fd68dabb6d09c576aa30a762c578c913884d4dc` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-final-pass2-20260728.json` | 3,785,435 | `0812396fcc7451adc09fc6b39d2fa2f229fa8a9135bebdee1a59686708b164c1` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-live-entity-gate-final-protected-zero-20260728.json` | 3,822,121 | `b49ecca30675d7354eda683b7f9b266192830705fe9917c33319f8bce27faa8a` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-fresh-20260728.json` | 5,033,398 | `2699e9ad2c5a9b9167d458ec5c9d2ede08cdd898bdc990e1241d21abe409d78c` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-fresh2-20260728.json` | 5,026,192 | `02a52a437ccf1d0a83e732fd796af4f91c9dfe3848b107de39207262adb330ee` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-fresh3-20260728.json` | 5,012,427 | `e448bda0f6a6fa5a5a98182104157ce8f66800c3105a9e9c8ead3e8255b7a76c` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-modern-chain-pass1-20260728.json` | 3,820,405 | `248d3ea8cb18cf0ea7daa4dc82b4cf1f76c3c4f902792f6d6aac9b63eb9e2909` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-modern-chain-pass2-20260728.json` | 3,848,095 | `52c730bf5796693bd7e14ac655630f473298c7b099e7273c56a487be7b219ef4` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-nbt2-20260728.json` | 5,040,027 | `05086af851e12e997dfc603d9fd62ad383402ec398944f06549a0fd713c24871` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-protected-bees-pass1-20260728.json` | 3,870,565 | `26db986e1bb7777450a96294c3b2a4d6f30b9552d755ae6e8a6e12903996a4bf` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-rebase-pass1-frozen-20260728.json` | 3,790,925 | `ebe14c1ff819a6dd6f1e83ec1a6535857c35bbd2562b63e18f91af11f18a755d` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-live-entity-gate-rebase-pass2-frozen-20260728.json` | 3,783,799 | `6ad528832a0aa93edf8411904afc910acf722aa065e7d89d811271d7b4005d3a` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-live-entity-gate-zero-final-20260728.json` | 3,803,779 | `079adf774927529c2ceeade3fc8cf8d45c7870ff061061b8af8d6287f3438724` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-prefix10-recovery-dry-run-20260728.json` | 10,391 | `8a9e7e1dc34871e0e297ab8e3a1d2be3e49dccef9e8e8e122a26358f418a3d26` | status=dry_run; ops=8a26c3dac72c… |
| `data/world-review/town-expansion-r1-prefix10-recovery-entity-gate-20260728.json` | 14,786 | `1c170918a1021a316101c8d3f109d0e429341841e8bc9cc7821a2ef6d74ca9b8` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-prefix10-recovery-execution-20260728.json` | 19,975 | `d926fec0994372f846667ea5642d9b8db0d7136501c4fad7605f115f83759e12` | status=complete; ops=8a26c3dac72c… |
| `data/world-review/town-expansion-r1-prefix10-recovery-execution-20260728.stream-journal.jsonl` | 41,637 | `d25fb657713c710a1e682c0a3f12474d5493950a6844f790a1a612a2c3e3ce53` | — |
| `data/world-review/town-expansion-r1-prefix10-source-restoration-preflight-20260728.json` | 469 | `57e4a9c45b44681799c80916cc7b22398de0fbf0eedbd22f7a5a570b96afa673` | — |
| `data/world-review/town-expansion-r1-prefix13-recovery-dry-run-20260728.json` | 13,335 | `ea727df067ff052ab951abce3db75d3ba7d59e47fd3d2f78a18adbee24928b01` | status=dry_run; ops=29af5b6c7be8… |
| `data/world-review/town-expansion-r1-prefix13-recovery-entity-gate-20260728.json` | 15,548 | `ae32720e9de6e9786893545c090e448bc7691a82b4dba2d73207966b9d0bdd62` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-prefix13-recovery-entity-gate-pass2-20260728.json` | 15,548 | `b423f96d980a70f9149260fd12c0e3b812a9fbe65783316d3d75ad241976d99c` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-prefix13-recovery-entity-gate-pass3-20260728.json` | 15,548 | `299fc59e596e4da0967fffbebe097547b3368d04ad4e3ecb3c3b435f780cb328` | status=FAIL; passed=false |
| `data/world-review/town-expansion-r1-prefix13-recovery-entity-gate-pass4-20260728.json` | 14,786 | `afaf5c56df641ba5ac0567a3f730cc773478634602d85785b718ca324732cb52` | status=PASS; passed=true |
| `data/world-review/town-expansion-r1-prefix13-recovery-execution-20260728.json` | 22,925 | `5a66193b1925c7dba3179a234989dee9f56d1e64889455de3dba601a5943f1cc` | status=complete; ops=29af5b6c7be8… |
| `data/world-review/town-expansion-r1-prefix13-recovery-execution-20260728.stream-journal.pass2.jsonl` | 51,266 | `32ceede8fa5f420c5819a0f2b3a3f28e3946d41b0b342685e3b9aebd84f464d9` | — |
| `data/world-review/town-expansion-r1-prefix13-source-restoration-preflight-20260728.json` | 471 | `4276022cbaaf089ca5987bbf5c8907ff21eb1f0b9620963edf4a7a58b1bcd237` | — |

### exact-object-media-and-crosswalk

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/exports/town-expansion-media-2026-07-28/capture-manifest-pass-1.json` | 549,609 | `904083cf141e94da4a2fb8d025359732a68cad3213b1dfa15a6199e78a184171` | status=POST_RELEASE_CAPTURE_PENDING; package=town-expansion-r1-2026-07-28 |
| `data/exports/town-expansion-media-2026-07-28/capture-manifest-pass-2.json` | 549,609 | `09cd70a9af66364c32263fa7065667a33205a29e31eec3571dc624bd0c291969` | status=POST_RELEASE_CAPTURE_PENDING; package=town-expansion-r1-2026-07-28 |
| `data/exports/town-expansion-media-2026-07-28/capture-manifest.json` | 1,091,689 | `e40417a861ab39d3fd116abdfe653f2b2d3e4a5f790e87e226ddcd788702e097` | status=POST_RELEASE_CAPTURE_PENDING; package=town-expansion-r1-2026-07-28 |
| `data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json` | 1,167,649 | `fe160310e92d675aa23025bd395101c5c4b7a6864976b09c30e18d6cfc5a2661` | status=POST_RELEASE_CAPTURE_PENDING; package=town-expansion-r1-2026-07-28 |

### pm-dossier-frozen-scope-and-research

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `docs/redevelopment/2026-07-28-town-expansion/attached-garage-requirement-supersession.md` | 9,715 | `50d9f54fea11017dbab189e15fab9dd402f66e48dac8ee29836cf7705ffb8432` | — |
| `docs/redevelopment/2026-07-28-town-expansion/box-handoff-audit.md` | 8,027 | `ec0a6def615907e5a2f805d4edf33e2ab5e18866874e6a5e4e30b82cecd9c75f` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json` | 5,696,400 | `26b811e96b86f2c3766e0f4f7b5e24604215b0520d43f57be1272bf217d4b1e5` | status=FROZEN_PLANNING_SCHEDULE_NOT_BUILT; package=C01-EAST-FIVE-LEVEL-GARAGE-OWNER-STACK-R1 |
| `docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.schema.json` | 11,996 | `c63bd0db6c6dadaa271a37ad5fd73c41d5c64a74139951df8b0061277463aacf` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-bunker-frozen-schedule-handoff.md` | 6,332 | `7baa9b96d2b8be33633042047542dbf6e8a7a102eb59a3710f0287d974fee3ae` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-bunker-square-qa-report.schema.json` | 1,767 | `14777d5cf6d66b8ae512fa65f4c0b3a5aa80e9c3b459c84a3e0f74d2638be5d8` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-coordinate-schedule.json` | 8,638 | `1b8d148ca4a6f595e979f9a6fe884eb7271164c697af112d428dddc616bf171f` | status=INDEPENDENT_PLANNING_DECISION_NOT_A_BUILD_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-independent-decision.md` | 10,783 | `a5c045c555c84422b0eab7c1b0b0069cdb7c83a07e312b01230a5522ed1aec73` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-five-level-compiler-handoff.md` | 5,461 | `89712775cfef89b05cb39d9e940cf5cc3d0e642050c6431dc790bfdb0ffa6966` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-hangar-eoc-adult-wing-redesign-source-of-truth.md` | 20,056 | `a25430226ce386a1c93fa55247f5ec5c08d6a4a12c18467cc95c9caa8cd4f7f7` | — |
| `docs/redevelopment/2026-07-28-town-expansion/c01-source-nbt-migration-ledger.json` | 3,345,135 | `545a9835ccf7cb2e39d52e5440d011684a9727b812751d730a669af8863bbc4f` | status=PINNED_OFFLINE_LEDGER_SAME_MOMENT_LIVE_HASH_GATE_PENDING; package=C01-SOURCE-NBT-MIGRATION-LEDGER-R1; snapshot=f8edf99494c0… |
| `docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-coordinate-schedule.json` | 49,082 | `965411971a8414dd78ef88b92a55f5309be2b96966d0296bd1d50aef6ad9b0a0` | status=FROZEN_DESIGN_NOT_GENERATED_NOT_LIVE; snapshot=e612b1feabcf… |
| `docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-soundstage-annex-coordinate-schedule.json` | 51,447 | `a0557799b0b93487e3f7910fa24a1cf333eb1ed020de17cbc84aa0f13e0c8149` | status=FROZEN_EXACT_COORDINATE_SCHEDULE_NOT_LIVE; snapshot=e612b1feabcf… |
| `docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-soundstage-annex-source-of-truth.md` | 12,878 | `f9e43f6558cf2510bb90ee44bd5f868d639da09166e7d007eb1513c8c7fb0568` | — |
| `docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-source-of-truth.md` | 31,609 | `140a39aa33b16618669d44eaadae53c61407d6d41070f4b5d9e1fb44b6e6323a` | — |
| `docs/redevelopment/2026-07-28-town-expansion/concord-data-district-service-town-source-of-truth.md` | 9,601 | `3cbcbb84c5ff15b9865150ad6fbb9b2d91f2658838b7e62c69388cd7dfd98161` | — |
| `docs/redevelopment/2026-07-28-town-expansion/coordinate-schedule.json` | 13,132 | `3215776d0f30d41e18c7b3c6ee7333d1a260d022f6d70945aa2ac05b7801efdc` | status=SURVEY_DESIGN_BASIS_NOT_A_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/cross-scope-interface-contract-proposal.json` | 10,781 | `0c06393cd201cff66bda9783670980a7de26b04064a1f88d210ff6b64a16321c` | status=SUPERSEDED_HISTORICAL_POINT_IN_TIME_PROPOSAL |
| `docs/redevelopment/2026-07-28-town-expansion/cross-scope-interface-contract-proposal.md` | 2,630 | `bd9369f83a3e26459e2f96b9370286e47a470b69171efa9d9af8e26c24c9df93` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/approach-corridor-current-map.png` | 35,600 | `37c956b2311c4e494eaba1db290bf1a7a7f98629600382c7308a0770054357c3` | 880×880 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/c01-bunker-classification-qa.json` | 174,214 | `33f5e03f48a3e96276228293265568e490c7fff982edde7ec0b5508a5e61ec90` | status=FAIL; package=C01-EAST-FIVE-LEVEL-GARAGE-OWNER-STACK-R1-square-independent-qa |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/c01-east-relocation-current-map.png` | 1,468,432 | `ec5ab4c227f77ef84a33f2bc69d541b4cab1f78022fef873d8feb8e56d00d28c` | 1100×1100 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/c01-five-level-source-model-audit.json` | 129,555 | `bd45208ae7b900cdf55adda1654143cc19442febc4cc5f096c43ce0d6dc363d5` | status=C01_MODEL_AUDIT_PASS; snapshot=f9a6a21ec115… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/clearance2b-bee-reconciliation.md` | 622 | `8bd96472d0305ea0de5843d18250d6422d3e934aa9e76386f268a899efb61a5f` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/concord-broadcast-exchange-integration-audit.json` | 7,067 | `9463793f1ad362fb8121cda0c34cef4c6ab31b43358b9907e7731fd5ed1d44ba` | status=FAIL_NOT_INTEGRATED_DO_NOT_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/concord-broadcast-exchange-integration-audit.md` | 1,983 | `da61265a310a765fe09c98987c0ef1aeeddc76f2917eda5d7fb7239ae7f625e4` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/feature-intersection-report.json` | 16,877 | `9a7a02aa13aaa83c7f5e8fe04934be3824838f41b49f6391a161f90f03a118d9` | status=READ_ONLY_DATABASE_INTERSECTION_AUDIT |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/iowa-data-campus-full-build-increment-audit.json` | 6,786 | `e776c806b52e125c77c7491343f035b77b32f7d32dc1c113b070cfd889393809` | status=FAIL_RUNTIME_AND_PROGRAM_GATES_DO_NOT_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/iowa-data-campus-full-build-increment-audit.md` | 2,030 | `8993b6199d20eb319cbd57b29c066592004bad15509447b3c781d5eadb31a95d` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/library-garth-block-census.txt` | 6,933 | `6231b274bd0cdb8e30a52611a36525740da00be68c7ed96350d373b547630588` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/library-garth-west-oblique.png` | 325,107 | `f1344dc4d2791dac0793ad39ccfbd6155783d71b1371248f1a878d9c3cc02352` | 1440×900 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/mainstreet-current-garage-map.png` | 174,584 | `831afe41389f43f80119097f55cfefc7e71bacb4158d50f76637d81a0a57222b` | 800×800 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/mainstreet-east-row-garages-current.png` | 558,347 | `ad1f1fed33a6735cac9c7b8671ad908339217e97c6e32fe165d7dbe6c02d644c` | 1440×900 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/mainstreet-underground-warehouse-census.txt` | 3,125 | `e0bdbdf282f7f7652f1f02d5955ea14b0d2ab3d3d0d9cd2d2c8b9292211708ff` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/mainstreet-west-row-garages-current.png` | 562,734 | `3320c85a374edacdb35b2601bf300c57fc594f5b095d9a4347d69d9a4d398956` | 1440×900 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/moot-penthouse-block-census.txt` | 2,484 | `96f649420a8d312c60199fcdf91627b2523b3567782c2ca5a0b1222525920e0d` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/moot-penthouse-south-oblique.png` | 412,326 | `17e822c23dff9b276761b9390eb068a42dc26cee2a3553303028a4a71efdf880` | 1440×900 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/northeast-data-campus-current-map.png` | 1,595,419 | `bce1609075f374d7898f62f93586c8ec4f33380ddb85eb0d4659af5bc71ac086` | 1050×1050 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/northeast-data-campus-survey.json` | 2,212 | `9e3a085cceac57879316fc8569e07d814ce03a37e6ef8f37d61c2ae4ff86a0dd` | snapshot=d05ac7822795… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/observatory-estate-current-map.png` | 103,531 | `3f98e04b9b6a19394fba693207a9f79002637a2e6ef5d7948145470ea4f55e0a` | 900×900 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/panorama-oasis-site-block-census.txt` | 3,246 | `b1ff608ce6a094321a3e90091ff2bc5a039f7d2922ea42fc76cbce27a7a432a7` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/panorama-oasis-site-north-oblique.png` | 409,888 | `e9dee4fbdb00f00bc6703e695e3f74bac6930922cabf9a57547627a7bb36b016` | 1440×900 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/parcel-surface-survey.json` | 8,156 | `d19575c469607a2590040f5ede475c78bb6e2e2eb2d20067e386bbecb8a66cb6` | status=READ_ONLY_IMMUTABLE_SNAPSHOT_SURVEY; snapshot=d05ac7822795… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/pavilion-east-grounds-current-map.png` | 78,645 | `4d588bf84dc384db5ef4ac930c38094dffbb6ce8b64c6e03d3e26a6639179756` | 920×920 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/ravensreach-civic-current-map.png` | 79,692 | `6a7f371edbdaad346d238fde09b9776d4b22a8bfd3d82a593a53bd4cbf7f93d8` | 780×780 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/redevelopment-cross-scope-point-in-time-audit.json` | 201,714 | `bc84c7434c5494e6e1983cbb5c7cc6e8825532378815a6004067ee464630b82c` | status=FAIL_UNREVIEWED_CROSS_SCOPE_OVERRIDES |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/redevelopment-cross-scope-point-in-time-audit.md` | 2,025 | `16b47013b0d9ad6e58c29576fcd680813b2f15edc07f9bf70cd9a4890f521436` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/southwest-ravensreach-current-map.png` | 69,664 | `f4a8b58e28c1da190b15ebda4f87dd26c02b937ac27e668191cabb6dab3081f7` | 960×960 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-bee-environmental-memory-reconciliation-acceptance.md` | 3,306 | `3a0ad6cd81316a05f684c8c44ff5bc429f2c52525f0699965aa6a3f19f8fc731` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-destination-preflight-acceptance.md` | 5,852 | `d81dd76075372c0e71e3996b04c908606bb29c2c6ce41e9b998e08101ec6c986` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit-fresh.json` | 20,486 | `1532dbb3a3ed9f7196101d91b4c091bf33eaa816a11b1059e6be53d4def78372` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit-fresh.md` | 7,172 | `384a75a29949620d297bf8c3636b552bcec5900c1259c0250fa1306b30d33e3a` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance10a-preexecute.json` | 12,746 | `c2bff98d6383107fbb51c6ae4d05bdcc619968eb2c7462415954394636027402` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance10a-preexecute.md` | 2,669 | `1d2bbaf8973369b20dbd273fc26ef6a260f0480c66f86aaa84b8bdee71ad3c56` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance11a-preexecute.json` | 12,766 | `b29bec705af3322f2fe7632f020b3020e717418f9ab624ddbab5319b15fe4c53` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance11a-preexecute.md` | 2,669 | `057067197c5d8f1ac8d3a2639658044405e92c45921009032160d980a99e0a1a` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance12c-preexecute.json` | 12,752 | `2a3d3db450b0fba61b3659f5ca175a946a10dc419e76f8c8387db021a2fd5137` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance12c-preexecute.md` | 2,669 | `50d6455fb1780c5d44e6e852f3954a792a92cf9adbde3d388525c0cea8fc1add` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance13d-preexecute.json` | 12,766 | `e47c0dcf2958539650af2b7a0a2a523488a3e41fdc408eaabed1b05f924f503b` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance13d-preexecute.md` | 2,669 | `7c8857934ce6d12a7c293874248e915678af9ab9a5378f0bf298796b7a230706` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance14a-preexecute.json` | 12,788 | `da7887c2f630c83ab6745945d2de773a997b86e8230239bea51fd764462d7941` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance14a-preexecute.md` | 2,669 | `002ede475e0f5a3f2598934a2a4548dcf3c915204bb946b9a69a7063eafa16a6` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance2.json` | 15,056 | `bc5da11e3338846ec5ca75bd9ac358c4f13ec82ee2d75fccb33bd816f37c16a7` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance2.md` | 4,774 | `c6c6bca8d87034c52129b934c7e7b9a2f1f03eba4ffeeb05019e756afb7a4293` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance2b.json` | 15,060 | `e90dfda9a8c845b09a7fa32bb110d1b710fdaee8db001d5719a470293760c184` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance2b.md` | 4,774 | `d22228c19ad096c2b80809cd52e3983fbc2cde9d8c5dd0c1c49851f6cd04a2e8` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance3.json` | 15,608 | `959b89a3e3ff9411063c298139f90291bafa523a81e875bedea9dfbe4625cf3d` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance3.md` | 4,774 | `d0ead4f359075e56fe7764601abbc6aec4166a4574dbcff608a2030cbf0e77a0` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance4h-preexecute.json` | 15,284 | `867dfc1e821d464830b94445dd348849d992af1b89a7f3d8157d75b85a414964` | status=FAIL |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance4h-preexecute.md` | 5,930 | `32edfd7495eed373552d7c6cf06435b2f590def8f4256e80a79b580e6dee7764` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance4h.json` | 15,284 | `23bd4627d0c28b20e3463461e33fb355c35073b3493903c2cde35af8ab485a5c` | status=FAIL |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance4h.md` | 5,930 | `a738a109412aec38c044b36ae82c931d79353270383e1c4623b26ad260d90b7a` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance5d-preexecute.json` | 15,090 | `1503511487e78d1645c07e2c2f13b4f0d3b0e59d087ba49ff59d6ddf1c6d472d` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance5d-preexecute.md` | 4,774 | `7db129d39ea34c66341ecea7431ad7f94f1fff1dc9b63b4a0c9e1b22a69ef673` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance6a-preexecute.json` | 12,773 | `0c8e15cd508d7348f5e2a3692b647ba28bc62c381a5c8dc6b632747cf0748c96` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance6a-preexecute.md` | 2,669 | `2c3ee80ab723072e1be4b444950829c7f6e310c8f0168171c8a23aefb0f2bb8d` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance7a-preexecute.json` | 12,798 | `093f793e4ceeda1a9952ee1704acf56ad87ba7bfdbee4d34ec81e0265c5932ac` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance7a-preexecute.md` | 2,669 | `30836adb227c67776098199c79b5e29984089af55b94d2cc7fe45fbbb93833a9` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance8a-preexecute.json` | 12,754 | `09344b9f648de74cd1b472d1286cd9ea960a7d277b03d5042aac5388645e302c` | status=PASS |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance8a-preexecute.md` | 2,669 | `0a8e8b243d610c8b7bf1ff4c77f213120d8bfdbe1b37b6c9aa9515c5d09f637c` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance9e-preexecute.json` | 13,488 | `dffc17e45c64473410a0727be37ef3dff4ee1f13767a248b1ffeb3f446ada6e7` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.clearance9e-preexecute.md` | 3,578 | `e030f9477d658af460e05847f3e336ea6f87f0926519b3ea252423cc59ef8c67` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.final1.json` | 15,225 | `7e16da5ae8e1400f00a337ac5c311519c75f0e36ce428fc25698c2a3468cf8f3` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.final1.md` | 4,778 | `2860f45c8e21382b64d13ab8e865abfe06965572c704cb2ecd78afcfa4365131` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh.json` | 22,100 | `6953718ca510440085cbbda8140ae8c4afcb66649f1af7f7662039b6b52d3263` | status=FAIL |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh.md` | 8,560 | `b1c911adf3b3d4e400da1889c98a167c162ac2b1a3d4adecde9e9642e6f4cb45` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh2-postattempt.json` | 20,995 | `103eefa3baf21b6901c28f7fcaf841ee00a4cd429790e9dd176552fa0629ddcf` | status=FAIL |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh2-postattempt.md` | 8,417 | `4891cb4aea205ecffa60c8d6c5191852afe582f0802d130e0aa6a60cc9e15505` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh2.json` | 19,072 | `9f627c0e3e5c622ec0cb73555d66bb5fcd18b0004e8d13778ba4c0543994526b` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh2.md` | 7,092 | `8d15810223733f65357646937e68dae8630ce4bf43e1e2b520e597b01d1a706a` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh3-preferred.json` | 15,628 | `57fa6ce0a0a8f601e744bf23a2e31fc2c15c3d18391a51502f0b6a91937f2326` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.fresh3-preferred.md` | 4,778 | `9a9adaf2042e69a01fa7fcad8d481ccb4e291f6ab5dc0a4bccd3a60623d84abe` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.json` | 23,404 | `729fa51d4dd3fc4288d722e84da8fc158ca5a9147083efe6f1f7b7bc2402801d` | status=FAIL |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.md` | 8,285 | `7523ef554df114d2fb5209ce5405c30edd92d71043855cb6d4bc1c652cfa0305` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.retry1.json` | 20,486 | `fcad290882fd90f0da74f68db9fabb432268bd45e856ae14486a9a9afbc790c5` | status=PARTIAL_PASS_WORLD_BLOCKED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-entity-relocation-red-team-audit.retry1.md` | 7,172 | `37f2ecc543e95dfea41f947f8211a8110ce5282c2a8db5e779022c6d62c5628c` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-database-publication-gap-audit.json` | 3,099 | `24bff6ea245c9f696ed423f3d0556edb4bfc2c8052853175753b2e7901a08d82` | status=BASELINE_DATABASE_PRESENT_TOWN_EXPANSION_NOT_IMPORTED |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-database-publication-gap-audit.md` | 1,788 | `036a428948d66567851315a578f299b03aea8719ef0650384315b3bf8447bd83` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-fresh-snapshot-repin-audit.json` | 12,033 | `02bab47580d1e00e6ec35225bf68313293434309b43cd599ea859b60662211b1` | status=PASS_REGENERATE_EXACT_GUARDS_DO_NOT_BLIND_REPIN; package=TOWN-EXPANSION-FRESH-SNAPSHOT-REPIN-AUDIT-20260728T0930Z |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-fresh-snapshot-repin-audit.md` | 3,785 | `8489278662b8824ec5fbed792e6ff9aa575fc7585b509c175cd25e7227d71118` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-global-cross-scope-interface-audit.json` | 161,302 | `700d4e41871faa9614e5034adac91268eaeb823fd5d97f55adf5fe4de5a1b17c` | status=GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS; snapshot=de807a2d4a1c… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-program-envelope-audit-fresh.json` | 3,134 | `ac5c82a2fdf0baa6d502a5d96d24dedb00442434dc74824091bf0b0fbf132f68` | status=PASS_CURRENT_PROGRAM_ENVELOPES; package=town-expansion-r1-program-envelope-read-only-audit |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-program-envelope-audit-fresh.md` | 1,738 | `702331acf186e92c260026133352d330fcc89f252bb4f117ed25dc6ba9085c97` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-program-envelope-audit.json` | 12,543 | `1581bd548c40e91da42bc176d0bfa02be8853a6ca810c4a8301e028db05cc04a` | status=HOLD_CRITICAL_PROGRAM_ENVELOPE_FINDINGS; package=town-expansion-r1-program-envelope-read-only-audit |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-program-envelope-audit.md` | 8,801 | `d3edb4788929fdd9b9955349c2f9e658b26608938703030179efd84a7028d0b7` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-r1-final-entity-clearance-red-team-audit-20260728.md` | 12,116 | `908d252616f5cd24459e0abe5eee08889acef690ca7b052b982535b652c2afb2` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-rcon-streaming-red-team-audit.json` | 28,337 | `c29ff96664ff2fe01ed46e06ac3e42dd15bb571967d4ec85f39a861003a1019d` | status=REJECTED_FOR_LIVE_RELEASE; ops=a326d880dbdb… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-rcon-streaming-red-team-audit.md` | 1,903 | `4c8009867914609dfdff73cd37457e25ed74335dca727014aaffb97a52db7a76` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-rcon-streaming-red-team-audit.regenerated.json` | 32,076 | `0547cea3cfab1dd812078ad27d366be9afd8aef76116bdb2aa7ab8dc84299bac` | status=ACCEPTED_FOR_BOUNDED_STREAMING; ops=8a9242fa2cd5… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/town-rcon-streaming-red-team-audit.regenerated.md` | 1,970 | `eaf86d42f1adcdafaa898a37bcc9d68750cbf923bf1510aa850323eb54853cad` | — |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/westlight-waterfront-current-map.png` | 81,650 | `135fbc929943246c3f37f5fba96f85b0517cc632ebecba0796c1553a3f06209f` | 960×960 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/westlight-waterfront-survey.json` | 3,462 | `23e244dad37b8505edbace1ec09454bc0981df90dcc54f3692a91364d42999fe` | status=READ_ONLY_IMMUTABLE_SNAPSHOT_SURVEY; snapshot=d05ac7822795… |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/westlight-west-parks-current-map.png` | 95,856 | `e668fbf1c3b7d9615dd6c3f65047a8e41d2ee83095c1f03e1c361396b4c9c0bc` | 880×880 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/worker-town-steward-current-map.png` | 33,385 | `a76fb78e22ce55bf1723bc8a9439c499e13d17d0c2eef3dfb1fa7ca6bf5b80b4` | 960×960 |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/worker-town-theater-owner-tunnel-survey.json` | 509,464 | `20f49cd373f71f72552f6158e738a1f9766dbb18ef26f4a59c1f24a792970537` | snapshot=e612b1feabcf… |
| `docs/redevelopment/2026-07-28-town-expansion/external-publication-audit.json` | 5,710 | `939f3af849ede6f8c99ac1f9987d7df00776de42ff64ff641180465e33d57388` | — |
| `docs/redevelopment/2026-07-28-town-expansion/guild-hall-and-bar-source-of-truth.md` | 42,453 | `1fd88c88528cbfdd1097fe9ab90b85c6d1fff4e7e9bae078f632a72d68b70649` | — |
| `docs/redevelopment/2026-07-28-town-expansion/guild-hall-program.json` | 15,310 | `0752904fcf786b7c360829a2b3ee0632d0d3407f3f3594697d83af3e2f06a57d` | status=design-source-of-truth-survey-hold; package=RRCH-GUILD-HALL |
| `docs/redevelopment/2026-07-28-town-expansion/independent-release-geometry-safety-audit.json` | 9,756 | `df394e349431a7c8f37aa499dd9f6e6c494fe5168a27aa009ae8ed190524fe0e` | status=BLOCKED_DO_NOT_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/independent-release-geometry-safety-audit.md` | 15,197 | `a43dfa40a1b9feb68d09af674a267f1749a054d0fc79eb1309f5719f16213dad` | — |
| `docs/redevelopment/2026-07-28-town-expansion/iowa-data-district-full-build-coordinate-schedule.json` | 31,843 | `9e735c549f232f4550512d87d046e3823eab9efab8fdf73bf61e0a2076b98aaa` | status=CANDIDATE_PENDING_COMPILER_AND_SNAPSHOT_COLLISION_GATE |
| `docs/redevelopment/2026-07-28-town-expansion/iowa-data-district-phase0-source-of-truth.md` | 25,294 | `fddac1f4df985bb443595c355b51798e2ea2315c0f5bb4ff63f973ec916d1a4f` | — |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-attached-garage-coordinate-schedule.json` | 12,784 | `b03a999ff72f8060b6dc373be5b45bd14b970c83b3d92a65b14de28055d71ea1` | status=SURVEY_REDESIGN_BASIS_NOT_A_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-attached-garage-engineering-schedule.json` | 20,357 | `7035c22426e339ec8d18f0db508d66877c62bf2e3c91bca210dba708c17bd6cf` | status=ENGINEERING_COORDINATE_BASIS_NOT_EXECUTABLE; package=ATTACHED-RESIDENTIAL-GARAGES |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-attached-garage-engineering.md` | 8,025 | `0a3ea8472b3b7b134596ff97a74b63b595b32cb77305f0aa1e37f66080370a1b` | — |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-guest-services-rooftop-wellness-design-review.json` | 28,999 | `906947db71eb1a3ecbcd805d7bd3b2817d66adfdcfa780c81654046fa4af3cf8` | — |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-guest-services-rooftop-wellness-design-review.md` | 19,954 | `a1e79ed406f34a0dbf8c5f6143cc531c11d3cbc443ada130b27917ece23a63be` | — |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-underground-warehouse-coordinate-schedule.json` | 8,426 | `c7169557694be39c45701ff5975e8875419fb9970bf80107196ebbb45d8b801f` | status=FEASIBILITY_SURVEY_NOT_A_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-underground-warehouse-rv-district-engineering.json` | 22,666 | `71389cd878e590426c9ef78ccd013876e198db5ac2d3b2041f6a6f80a4a97625` | — |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-underground-warehouse-rv-district-engineering.md` | 21,021 | `1d62235b099b73abd496bb404112d2355d28e53f0573b63707001c7899b0a647` | — |
| `docs/redevelopment/2026-07-28-town-expansion/manager-vale-five-cottage-integration-handoff.json` | 12,203 | `eeac59729af811ea7e51cb2e1449ae01a9f08e1d054047d58652744e1de177e0` | status=READY_FOR_POST_C01_GENERATOR_INTEGRATION; package=MANAGER-VALE-FIVE-COTTAGE-INTEGRATION-HANDOFF-R1; snapshot=f9a6a21ec115… |
| `docs/redevelopment/2026-07-28-town-expansion/media-file-verification-audit.json` | 5,611 | `de340f9bb4a9cf81bc2132b0846e2d716c29c1de21081512af418e7f788c2b9e` | — |
| `docs/redevelopment/2026-07-28-town-expansion/modern-underground-corridor-standard.md` | 3,453 | `8f327e5854783402b059f046e24db11bb1a97633dea31a04fd715fa87db97b66` | — |
| `docs/redevelopment/2026-07-28-town-expansion/non-graphic-adult-interior-design-standard.md` | 9,815 | `11a93ee6aa6c9bcaee8860ebd63d91d8d22433e9829ae55f92fa7798a106058c` | — |
| `docs/redevelopment/2026-07-28-town-expansion/northeast-data-campus-coordinate-schedule.json` | 13,139 | `e397e4e17a711f6f72631e77a8c1943aaeaa06a4931a98a1263e051e211d0df3` | status=PLANNING_COORDINATE_RESERVATION_NOT_A_BUILD_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-c01-relocation-engineering.json` | 27,487 | `b57ed2c17e280f37d1c916528d363115753fb7273d88c089e59a85ee2bd5616b` | — |
| `docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-c01-relocation-engineering.md` | 18,438 | `e1d527c0b7acf87f6c0b1426c35ecb00df3c35af80d894424ba268c15975e2c6` | — |
| `docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-megacampus-program.json` | 25,189 | `a2eb4f918e716947bd33e212109896bd372a5ac082ba230eb6b2d15d2cba48a1` | status=RESEARCHED_PROGRAM_NOT_COORDINATE_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-megacampus-source-of-truth.md` | 21,511 | `21927a90f1b60c8776c8073a1fe272234bd975adaff90fc55106224f40acef45` | — |
| `docs/redevelopment/2026-07-28-town-expansion/object-evidence-and-second-pass-qa-standard.md` | 3,595 | `79104270815344a219e7f6be319295d4412e3bec5246e6e2c036c31bfea297bf` | — |
| `docs/redevelopment/2026-07-28-town-expansion/observatory-estate-and-inactive-portal-gallery-source-of-truth.md` | 4,982 | `bcf4793ba65b8c3b08ef3326e9ec1403d611875764bd6067f36c8ce1eb1dcce1` | — |
| `docs/redevelopment/2026-07-28-town-expansion/observatory-estate-and-portal-hub-coordinate-schedule.json` | 8,605 | `bae45ee2b102800cb31141611cb1ed4c3f613127b9440f998e4d6b8d4c327822` | status=PLANNING_COORDINATE_RESERVATION_NOT_A_BUILD_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/pavilion-east-grounds-and-ravensgate-exclusion-coordinate-schedule.json` | 10,037 | `112251270649ab6b5fbff6e68667b2ab9fe0301a5ccc916ad4b467d5cf6302a6` | status=PLANNING_COORDINATE_RESERVATION_NOT_A_BUILD_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/pavilion-east-grounds-and-restricted-underground-source-of-truth.md` | 5,868 | `e2f70e68653f110c6219777c453cb3471636d0e733b0f279afc2c79fa83a8129` | — |
| `docs/redevelopment/2026-07-28-town-expansion/requirements-status-matrix.draft.json` | 81,104 | `f4c29bc24d180b6b6d4717d9307f9369dec9a09435083978f8ae93af332c9e3e` | status=DRAFT_NOT_AS_BUILT; package=town-expansion-r1-2026-07-28 |
| `docs/redevelopment/2026-07-28-town-expansion/requirements-status-matrix.draft.md` | 37,182 | `9a36009533f3f9d02b86ff2733eac7cd92cae1b52a84adf18049cf4a5123153e` | — |
| `docs/redevelopment/2026-07-28-town-expansion/SESSION_MEMORY.md` | 57,757 | `b3c4e92be95972a2c85b1e030f657151b8f1dee4433ab7dfe86895c440ced027` | — |
| `docs/redevelopment/2026-07-28-town-expansion/session-control-manifest.json` | 15,071 | `a73991fdca967179c485bf4cb24b9d41608f9c6aaa304ee78da518a8219ce740` | — |
| `docs/redevelopment/2026-07-28-town-expansion/session-frozen-scope-register.json` | 124,551 | `35f1fab25f798ced62f0e0243440f1e18a20f3884c7fe518604149116facbd36` | — |
| `docs/redevelopment/2026-07-28-town-expansion/session-frozen-scope-register.md` | 48,305 | `cadf476c205a0da5a0570f165bf4d2fc0c6e57faa9d5c4f29a2a2bc8eeecae80` | — |
| `docs/redevelopment/2026-07-28-town-expansion/session-pm-dossier.md` | 70,547 | `249b1894bca6356e05a53ac3365f048d4ec8e78391df8656dca311089f202035` | — |
| `docs/redevelopment/2026-07-28-town-expansion/town-architecture-siting-survey.md` | 15,711 | `506c10b519ae3c9d895d3c8e68f37d53ab7e8e147ba7f08073ac4ece94908b63` | — |
| `docs/redevelopment/2026-07-28-town-expansion/town-expansion-cross-scope-interface-contracts.json` | 12,405 | `a4fd78902360556b4fd6cec744c3143551e31c132e44d3199bf37f71c419b19d` | status=APPROVED_EXACT_DEFAULT_DENY |
| `docs/redevelopment/2026-07-28-town-expansion/town-expansion-database-closeout.md` | 5,154 | `6dc254458c3ce1c278721d5ee45203309111d54f0d7b47c4556b731bcdd7263a` | — |
| `docs/redevelopment/2026-07-28-town-expansion/town-expansion-database-registry.schema.json` | 7,771 | `915f427761f8b4aa5754d8387b0897cb3888be90cb17c0461b5487c39ad4afa0` | — |
| `docs/redevelopment/2026-07-28-town-expansion/town-expansion-global-cross-scope-interface-audit.md` | 14,485 | `e996e8391816cd8604014c319c6a7f2121dcb51fea39dcafe11ad620f89a48c0` | — |
| `docs/redevelopment/2026-07-28-town-expansion/westlight-island-and-russian-pavilion-change-control.md` | 16,771 | `59c6b7f28babd6e7f5f7330f76118603b9095548efa9730f4fdffab2a4522eb8` | — |
| `docs/redevelopment/2026-07-28-town-expansion/westlight-three-venue-audit-and-redesign.md` | 16,261 | `ebc83e24ffc4db19b122f9010dbf813664149483f2165dc6398207028636a575` | — |
| `docs/redevelopment/2026-07-28-town-expansion/westlight-three-venue-coordinate-schedule.json` | 27,788 | `fad103baf60f7cdcddf10fb84ac0f56c7a47fc59312315f34747f2cfc186c665` | status=AUDIT_AND_COORDINATE_DESIGN_NOT_A_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/westlight-waterfront-coordinate-schedule.json` | 12,508 | `58719a4e9423f5d46a04469694ab216656a096f2e666f526ca8f2707393ac3cf` | status=SURVEY_MASTERPLAN_NOT_A_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/westward-entertainment-housing-workforce-change-control.md` | 16,343 | `f9c5cd6e2edd26124bfcedb4c0470d3be99cedf0e60d85ac63d81dc54a6c49ee` | — |
| `docs/redevelopment/2026-07-28-town-expansion/westward-paired-parks-engineering.md` | 19,487 | `a83b65bd3e90606fed180708f827319b7290b0a05508284aef1b8563aa1cf3c0` | — |
| `docs/redevelopment/2026-07-28-town-expansion/westward-paired-parks-masterplan.json` | 24,672 | `c3c12e0f53e5f8e8ceaed779c7f8afee34d41d4d1e56e6af1f651c16b72b97e5` | status=SURVEYED_MASTERPLAN_NOT_A_LIVE_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/westward-parks-housing-workforce-coordinate-schedule.json` | 8,154 | `53184a8cbd994cf25972c3570e394555e40667b16e15c6aede56a11a9c32aab0` | status=SURVEY_MASTERPLAN_NOT_A_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/worker-town-all-role-cottages-mini-mansion-addendum.md` | 16,124 | `572a3140b30b56d45c2bc0b1592241d78713b1e0f317977698ea38e80a3b3248` | — |
| `docs/redevelopment/2026-07-28-town-expansion/worker-town-all-role-cottages-mini-mansion-coordinate-schedule.json` | 56,023 | `9406e524b6d5ef36a42ab7ef553d0cec32e14942be1025036cffa16824ffad51` | status=IMPLEMENTATION_READY_COORDINATE_DESIGN_NOT_A_BUILD_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json` | 36,878 | `b793c29452728ef7afe9aeb55c5e619fcad5498175a09612d9fc91660a0daae0` | status=IMPLEMENTATION_READY_COORDINATE_SCHEDULE_NOT_A_LIVE_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md` | 18,619 | `b9059d3dc55c593075bc1878f488bf2e6b94a9fd38714e265e0be7e093ec8fce` | — |
| `docs/redevelopment/2026-07-28-town-expansion/worker-town-steward-mini-mansions-coordinate-schedule.json` | 9,974 | `bfb7265b9aafe93b3ffd87553b8fed51a5e9d75601a5355545b82e15fa917036` | status=PLANNING_COORDINATE_RESERVATION_NOT_A_BUILD_RELEASE |
| `docs/redevelopment/2026-07-28-town-expansion/worker-town-steward-mini-mansions-source-of-truth.md` | 5,473 | `dfd2734a4fdca14ec5c27b0906d3b09a79c939dd9f15fe7e62ad866916640013` | — |

### project-closeout-readme

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `README.md` | 20,326 | `2f97c421fde7831176e152745095513eb5a790b825c893532071aad857136244` | — |

### release-and-documentation-automation

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `scripts/audit_town_expansion_program_fit.mjs` | 14,606 | `2c4eb9b52782ff9cd4bd06d4ff591b351f1a9aefac80bafe7aaaaddfb9402d81` | — |
| `scripts/generate_redevelopment_artifact_register.mjs` | 17,464 | `65c12ec3dd029dcc2d2607f9b744681ec8a5749a6f2a04f9cc033573a0bdb693` | — |
| `scripts/generate_redevelopment_dossier.mjs` | 29,170 | `777b929aa0a7ac484d494b77593c3cf9dac71b4e3767e264257f84e60bb6f5a5` | — |
| `scripts/generate_town_expansion_media_manifest.mjs` | 31,682 | `81dcd90a7003c5f2581dca10a5b5b730b0692a1ed6883bbb31e74d47e368c701` | — |
| `scripts/generate_town_expansion_r1.mjs` | 436,600 | `f8dfd20b6b115db5b5ac0253b8eb8c22d104cbc4bee06825c5a8b8927e32f96e` | — |
| `scripts/import_town_expansion_release.mjs` | 58,319 | `da450fb3ace7d1805c6b1589bdbbd6d41dfe6b8c70684e5b1cc48d584b1326cc` | — |
| `scripts/manager_vale_cottage_compiler.mjs` | 65,677 | `510cdafa870d13aa370091b5aaa068c1cf1c0cf41a49d099afd1c21b782d3820` | — |
| `scripts/qa_manager_vale_cottage_compiler.mjs` | 12,961 | `d357bb962cec18a1617eda41c3e1d16ff5a405da2306c3d9c848d3684e27f703` | — |
| `scripts/qa_town_expansion_media_release.mjs` | 17,422 | `1828ca48e6a4911b4cc4cefe6b7eac9394ccce82b6d2faeca0f84e7ac49eb6b9` | — |
| `scripts/qa_town_expansion_post_release.mjs` | 34,856 | `425c24e787865bbfad6de0c04ac7984f47ccd09e1c9ece73a97d741695e0fdb7` | — |
| `scripts/render_redevelopment_camera_manifest.mjs` | 12,200 | `638a821e293b11f50fac036f3da43c11e45502861da36c7e7f71c5843508102d` | — |
| `scripts/report_town_expansion_database.mjs` | 12,953 | `13c265c3109cc8fb93196fc493f9b7eabc256057a59bb868165c49d81abdb3fe` | — |
| `scripts/town_expansion_c01_compiler.mjs` | 40,255 | `c0529d63cbc7449fb39af67cdbae86c03d12a97f0bd2eb39de55329e49e9b361` | — |
| `scripts/town_expansion_cbe_compiler.mjs` | 62,868 | `e1ebbb7eaffb0d0986ec0c93da4314788f64b2015db3bb8fa8b2b3623632a479` | — |
| `scripts/town_expansion_documentation_profile.mjs` | 22,411 | `738feaff6e32599c0d9aba16c816f55eaa8c82400014d171154c2bfc8cb78236` | — |

### release-and-documentation-tests

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `test/build/generateManagerValeCottageCompiler.test.ts` | 8,529 | `aa353f3c62e7149a785b62796fc00ecbabeaa7a830f50f217f4834c3a355dbd3` | — |
| `test/build/generateTownExpansionDocumentationProfile.test.ts` | 10,228 | `3ab41158e5b7854c26339b49ee1f414d80da1b72f1c1f609a713fd6328b129a3` | — |
| `test/build/generateTownExpansionMediaManifest.test.ts` | 10,884 | `1de7ee39baeedb090b5551e3de630f14f4878bf8f00dfe362a3b0e0e36c2b3c6` | — |
| `test/build/importTownExpansionRelease.test.ts` | 16,242 | `ac20bb3ebebf707e25fede7c23cd139f32188bdf1d9fffbefae73f8208f2e789` | — |
| `test/build/qaTownExpansionPostRelease.test.ts` | 9,605 | `1d5484e2aa50cb4979130ceb4eaa6d4eb5731922cfe6e777ea912c785f1286a4` | — |
| `test/build/townExpansionC01Compiler.test.ts` | 3,213 | `bfba228a28926c5867d2a594667c0225f3659af2d881392339b34ffecc5d3e51` | — |
| `test/build/townExpansionCrossScopeGate.test.ts` | 7,201 | `c27703ad1b1d863fc8c4762090c56f144f4fb4511358cab9c7b092310b864bbd` | — |

## Integrity procedure

1. Regenerate this register only after all release evidence is final.
2. Compare the JSON artifact path set to the distributed handoff.
3. Recompute SHA-256 over exact bytes and compare every record.
4. Verify every post-release JSON snapshot binding resolves to the accepted
   immutable post-release region directory.
5. Treat an absent file, hash mismatch, parse error, stale snapshot binding,
   or non-passing acceptance status as a documentation defect.

