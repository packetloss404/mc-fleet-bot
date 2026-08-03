# Town Expansion Frozen Canonical Offline Gate

Decision: **PASS_OFFLINE_RELEASE_INTERFACES**.

This was an offline, read-only independent audit. It did not connect to or mutate
the live Minecraft world, services, databases, Sites, or Box. It does not
authorize a live release.

## Frozen identity

- Snapshot: `data/worldsnap-town-expansion-frozen-rebase-20260728T141025Z/region`
- Snapshot SHA-256: `de807a2d4a1cb597bd259d55d1d7c0cda8b710af5017497e75660c8a976603f5`
- Snapshot census: 30 Anvil region files, 134,667,649 bytes
- Forward SHA-256: `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896`
- Rollback SHA-256: `1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de`
- Generator report SHA-256: `d855d0072a213c27ebedc2b36ec53761363568e9de963650a8563a9179d81930`
- Ownership manifest SHA-256: `3073ef269d07f720ef62708b1f673d179a5f641fd19856b61f19e2eae4e78510`
- Atomic plan SHA-256: `53dc2fb938fa526a7972f4588f9af84ebc1a17a34d46b21e41c1f9412af33651`
- Runner SHA-256: `e998cc85c1bf52b6c4be1a6c38fa7fd5eac9797339ad49e22b856f79feb1b015`

## Gate results

| Gate | Result | Evidence |
|---|---:|---|
| Immutable source preflight | PASS — 483,016/483,016, zero failures | `data/buildops/town-expansion-r1-2026-07-28.live-safety-final-prerelease-preflight.json` |
| Atomic manifest and exact inverse | PASS — 1/1 package, 3,665,580 unique cells, zero errors/intersections | `data/buildops/town-expansion-r1-2026-07-28.live-safety-final-atomic-manifest-qa.json` |
| Strict streaming dry run | PASS — 484,676 groups, 484,690 Paper-strict commands, zero failures/noops/unknowns/leftovers | `data/buildops/town-expansion-r1-2026-07-28.paper-strict-final-streaming-strict-dry-run.json` |
| Streaming red-team audit | PASS — RCS-001 through RCS-011 | `town-rcon-streaming-red-team-audit.paper-strict-final.json` |
| Focused regression matrix | PASS — 51/51 tests | Vitest and Python runner/wrapper/runtime suites |

The manifest audit preserved the ordered transition history for 24,762 repeated
water cells and proved continuous forward transitions plus exact reverse
rollback. It also validated 1,660 guarded forward block-data commands and 1,619
guarded rollback source-restoration commands.

The ordering regression proves clearance runs top-down while construction runs
bottom-up. Every generated SET/REPL fill ends with Paper 1.21.11 `strict`.
Empty conditional replies fail strict forward execution, are tolerated only
during non-strict rollback, and empty fill replies remain fail-closed.

The bounded streaming audit found 2,265 exact package chunks versus an
8,128-chunk dense envelope. Its largest indivisible source group spans 25
chunks, below the 152 temporary chunks available in the audited 256-minus-104
capacity scenario.

## Remaining live gates

This result validates only the frozen offline package and release interfaces.
Live authorization still requires the prescribed same-moment source comparison,
entity and player clearance, protected-inventory checks, coordinated atomic
transaction, immutable post snapshot, bidirectional walking QA, and matched
after-media evidence.

The C01 source retirement and full P01 parking recovery remain intentionally
deferred in the canonical report. This audit does not claim they were completed.
