# RCON exact-chunk streaming red-team audit

Status: `REJECTED_FOR_LIVE_RELEASE`

This is an offline, read-only audit. It did not connect to RCON or change the world.

## Package census

- Source operations: 475,519
- Executable source groups: 475,492
- Runner leftovers: 27
- Expanded commands: 475,507
- Exact sparse package chunks: 2,265
- Exact sparse REPL chunks: 2,243
- Current dense envelope chunks: 8,128
- Maximum indivisible group footprint: 25 chunks
- Capacity scenario: 256 total - 104 pre-existing = 152 temporary chunks

## Gate results

| Gate | Status | Requirement |
|---|---:|---|
| RCS-001 | PASS | Every source group has a complete exact chunk footprint |
| RCS-002 | PASS | Each indivisible source group fits current temporary capacity |
| RCS-003 | PASS | Runner streams exact chunks instead of accumulating dense tiles |
| RCS-004 | FAIL | Source order is preserved and each group is evaluated immediately |
| RCS-005 | FAIL | CMD reads and writes are included in chunk coverage |
| RCS-006 | PASS | Cleanup removes only owned exact chunks and verifies restoration |
| RCS-007 | FAIL | Crash-safe durable group journal and prefix recovery exist |
| RCS-008 | FAIL | Strict release cannot retain temporary force-loads |

## Decision

The package itself can be mapped into bounded source-order groups, and its largest current group fits the stated capacity scenario. The current runner does not satisfy the streaming, immediate-stop, CMD coverage, exact-ownership cleanup, or crash-recovery gates. Do not run the Town package live with this runner.

The atomic wrapper does attempt a non-strict full-package rollback for a partly applied package. That is useful compensation, but it is not a substitute for a durable committed-prefix journal: a runner or host crash can occur before an end report exists, and the current runner does not stop after the first failed strict group.

