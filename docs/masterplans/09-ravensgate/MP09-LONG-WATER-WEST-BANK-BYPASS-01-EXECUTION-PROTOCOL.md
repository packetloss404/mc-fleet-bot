# MP09 Long Water west-bank bypass 01 — execution protocol

**Status:** compiled offline; not executed. This protocol is a scoped release
path under the Governor's standing authority, not a claim that Ravensgate or
the Master Plan is complete.

## What the package changes

The compiler produces 274 exact dry transitions: 202 west-bank pathway cells
and 72 Tempietto step/forecourt cells. It leaves the verified finite
1,477-cell Long Water component unchanged in source, target, and rollback.
There is therefore no drain, liner, plug, receiver, or live fluid path to
reverse. The retained basin itself is the closed containment boundary.

The old `186`-cell water displacement requirement was specific to the rejected
shoreline alignment at `x=-87..-86`. It is not a prerequisite for this dry,
disjoint bypass.

## Governor-scoped authority

The accountable internal roles and hard safety kernel are bound in
[`mp09-long-water-west-bank-bypass-governor-execution-authorization.json`](mp09-long-water-west-bank-bypass-governor-execution-authorization.json).
No external counterpart response is required. The authorization does not waive
fresh source, entity, strict-noop, journal, post-state, or independent QA.

## Exact commands

Prepare-only rebinding against an already captured immutable source:

```bash
node scripts/run_mp09_long_water_west_bank_bypass_release.mjs \
  --source-snapshot-root data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z \
  --out-dir data/world-review/mp09-long-water-west-bank-bypass-prepare-<utc>
```

Live execution is opt-in only. The wrapper captures the fresh source itself,
recompiles against it, performs exact preflights, block-entity and same-moment
live-entity clearance, journals strict execution, captures a fresh post state,
and proves every rollback guard against that post state:

```bash
node scripts/run_mp09_long_water_west_bank_bypass_release.mjs \
  --execute \
  --source-snapshot-root data/worldsnap-mp09-long-water-west-bank-source-<utc> \
  --post-snapshot-root data/worldsnap-mp09-long-water-west-bank-post-<utc> \
  --out-dir data/world-review/mp09-long-water-west-bank-live-<utc>
```

The live wrapper stops on any kernel failure. It does not advertise a public
opening; after a successful execution it remains pending independent
retained-fluid and two-wide normal-walk QA.
