# MP02 B08 Service Spine 01 — rejected package and completed recovery

Status: **REJECTED AND FULLY RECOVERED — NO MP02 FLOOR REMAINS AS-BUILT**

> Scope clarification: this status applies only to the **729-cell attempted
> geometry** documented below. It was superseded by the later, distinct,
> accepted 719-cell R07C-ramp-handoff release. See
> [`CURRENT-STATE.md`](CURRENT-STATE.md) for the current reconciled ledger;
> this historical recovery record is not evidence against that as-built scope.

On 26 August 2026, a 729-cell B08 service-floor package was executed under a
fresh local safety kernel, then rejected by its final accepted-interface audit.
Ten floor targets conflict with R07C-owned retained route-opening air cells.
The full exact inverse was immediately executed, and a new immutable recovery
capture proves every one of the original 729 forward guards again. **This is
not a completed or accepted SubTropolis build.**

## Attempt and exact recovery evidence

- The original source, local source guards, strict execution, post snapshot,
  and route QA are retained as incident evidence, not acceptance evidence.
- The invalidating R07C overlap is exactly ten cells, set SHA-256
  `7f6bc0df2e23a27b10a51dae149ae8917e2d8dbb00e5c61657959c272e2e1dac`.
- Same-moment rollback entity clearance passed. The strict rollback restored
  **729/729** cells with zero no-ops.
- Fresh recovery snapshot:
  `data/worldsnap-mp02-b08-ownership-recovery-20260826T102000Z`, complete-save
  SHA-256 `93b4099a506e7c4593163e1993d083b6ec6b571341b1fdea4d3e9c656691fbc3`.
  The original forward preflight passes **729/729** on that recovery source.

The rejected-attempt ledger is explicitly superseded by the
[ownership recovery ledger](../../../data/world-review/mp02-b08-service-spine-01-live-20260826T102000Z/ownership-recovery-ledger.json).

## Required redesign

The route geometry must be revised to leave all ten R07C openings as air, or a
separate reversible R07C interface migration must be engineered and accepted.
Only then may a new fresh source and full release kernel be taken. The occupied
pillar chamber, tenant/lobby grid, public and controlled entries, utilities,
climate, drainage, and public circulation remain unbuilt.
