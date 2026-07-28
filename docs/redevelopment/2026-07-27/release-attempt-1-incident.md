# Release Attempt 1 — Automatic Rollback Incident Record

Incident: `REDEV-2026-07-27-R1-A1`  
Window: 2026-07-27T23:05:57Z to 2026-07-27T23:06:31Z  
Disposition: **ROLLED BACK — NO PACKAGE ACCEPTED**

## Executive record

The first coordinated live transaction intentionally failed closed during the
MainStreet package and automatically compensated every block operation already
attempted. The transaction system found Minecraft neighbor-update behavior that
the offline exact-state model did not simulate: removing or replacing support
blocks caused nearby short grass and stateful birch fence cells to update before
their later guarded removal commands ran.

This was not accepted as a partial deployment. The controller:

1. stopped at the first strict no-op;
2. ran the MainStreet rollback over the partly applied target set;
3. rolled Raven Rock back in strict mode;
4. rolled Westlight back in strict mode;
5. restored the operator force-load set;
6. recorded zero rollback-package failures;
7. captured a new immutable rollback-state snapshot for the corrective rebase.

## Frozen inputs

| Item | Value |
|---|---|
| Transaction | `redevelopment-atomic-release-2026-07-27` |
| Pre-release snapshot | `data/worldsnap-prerelease-f4a268cd0c5b4241-20260727/region` |
| Pre-release SHA-256 | `f4a268cd0c5b42419868a816d14e0a2b4810d6b0ae84e7707fd556ad4708b79c` |
| Region files | 26 |
| Snapshot bytes | 122,736,507 |
| Combined live entity gate | PASS, five packages, zero blockers |
| Existing force-loaded chunks | 104 |
| Human players | 0 |
| Fleet | 5 service-managed bots, paused |

Two unmarked pigs had been discovered by the fail-closed entity screen before
this window. They were relocated intact to verified safe ground outside every
package halo. No entity was deleted. A fresh combined gate then passed with 366
required chunks verified and exact force-load restoration.

## Execution ledger

| Order | Package | Forward result | Compensation result | Final state |
|---:|---|---|---|---|
| 1 | Westlight screen | 524/524 changed; 0 no-op | 524/524 strict rollback | Rolled back |
| 2 | Raven Rock S1 | 335/335 changed; 0 no-op | 335/335 strict rollback | Rolled back |
| 3 | MainStreet R4/R5 | 5,651 changed; 330 strict no-op | 5,813 changed; 168 safe no-op | Rolled back |
| 4 | C01 surface Phase 1 | Not started | Not required | Unchanged |
| 5 | C01 portal Phase 2 | Not started | Not required | Unchanged |

The failing package’s rollback was deliberately non-strict. A partial forward
transaction means some rollback cells should change and untouched cells should
no-op. Previously committed packages were rolled back strictly because every
forward cell had changed.

## Failure signature

The MainStreet execution report records:

- `sourceOperationCount = 5,981`;
- `successfulCommands = 5,651`;
- `noopCommands = 330`;
- `failedCommands = 330`;
- `strictNoop = true`;
- `status = failed`;
- forward operation SHA-256
  `c61649579ceccc6265305fd191d79d791d1b2859976d9ab8cf858cc0b0eb4514`.

The retained failure examples begin at operation lines 417–453 and show guarded
air replacement of `minecraft:birch_fence` and `minecraft:short_grass`. Earlier
support/surface changes caused those cells to update or drop before their own
commands. Strict mode correctly interpreted “No blocks were filled” as evidence
that the modeled source state was no longer present.

## Rollback verification

| Item | Value |
|---|---|
| Rollback failures | 0 |
| Force-load set restored | Yes, exact 104-chunk operator set |
| Rollback-check snapshot | `data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region` |
| Rollback-check SHA-256 | `64829086424cde6f0bbf8db9166a152daf753ae2c3cf5652ba165dddc8229142` |
| Region files | 26 |
| Snapshot bytes | 122,744,700 |

The rollback-check hash is intentionally different from the first pre-release
hash. Minecraft saved neighbor-updated grass/fence states and the two safe pig
relocations. This difference is recorded, not concealed. The second attempt is
rebased on the rollback-check world and must never reuse a preflight bound to the
first snapshot.

## Corrective action

The MainStreet engineering package is being regenerated against the immutable
rollback-check source. The corrective release must:

- remove already-desired cells from the operation set;
- execute dependency-sensitive clearance before support/surface mutation;
- preserve the accepted two-alley, 18-garage, two-street, and public-realm design;
- generate a bijective rollback to the rollback-check snapshot;
- pass strict offline preflight with zero failure;
- pass independent order-hazard QA;
- bind every camera manifest and database feature to the new operation hash;
- use a newly captured pre-release snapshot and newly run entity gate.

## Retained evidence

Attempt 1 is preserved under:

`data/world-review/redevelopment-attempt1-2026-07-27/`

That directory contains the transaction ledger, three forward execution
reports, three emergency rollback reports, three package-local entity-gate
reports, and `SHA256SUMS`. These files remain immutable evidence even after the
default report paths are reused by a later successful attempt.
