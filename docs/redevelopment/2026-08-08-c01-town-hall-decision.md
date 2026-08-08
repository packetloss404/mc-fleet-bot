# C01 deployment town hall decision — 2026-08-08

## Attendance and roles

This was an internal release-design town hall represented by parallel local
workstreams: city planner, civic approvals chair, Minecraft Java movement
engineer, build-tooling engineer, safety/QA chair, release manager, and town
clerk. The meeting is a project control record, not external political or
personal approval.

## Decision

**APPROVED — SCOPED C01 ROUTE-AWARE STAIR DEPLOYMENTS MAY ADVANCE
INDEPENDENTLY OF UNRELATED HOLDOUTS.**

The 901,073-cell full C01 model, source migration/retirement, and northeast
data-campus package remain separate scopes. They do not block a bounded C01
stair package when the package declares that exclusion and satisfies every hard
physical gate below.

## Rule changes

1. A C01 stair package may be released as a scoped construction wave without
   waiting for the full-model or data-campus scopes.
2. Route-aware stair geometry is an accepted package class. The package must
   derive its feet/head/support interface from the accepted route proof and
   bind the resulting route contract into its evidence.
3. Normal build waves target at least 100 changed cells. Smaller packages are
   allowed only for a dependency tail, isolated repair, or emergency rollback;
   they must state the exception in the ledger.
4. `scripts/run_c01_guarded_build.mjs` is the single release wrapper for C01
   package preparation and execution. Manual command chains are diagnostic
   only and do not constitute release evidence.
5. Approval is represented by a hash-bound decision record and named role
   signoffs. No external political action, payment, sexual favor, or personal
   relationship is an approval mechanism.
6. A failed hard gate is a stop, not a waiver. The unchanged hard gates are:
   exact source guards, block-entity clearance, collision/route QA in both
   directions, strict-noop forward and rollback checks, fresh post snapshot,
   and rollback post-state preflight.

## Current deployment disposition

The route-aware stair-core package was accepted under this scoped policy:

- 86 exact stair-support conversions changed live.
- 22/22 representative routes and 44/44 directions passed post-release QA.
- 0 post-snapshot block-entity overlaps.
- 86/86 rollback post-state guards passed.
- Wave-size disposition: `dependency-tail` exception, because this package
  completed the route-preserved tranche immediately before the coordinated
  stair conversion. The next normal wave must contain at least 100 changed
  cells.

The package is deployed and verified. The policy authorizes the next scoped
100+ cell stair wave when its package-specific ledger reaches the same gates.
