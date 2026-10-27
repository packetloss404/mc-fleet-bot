# AG-1 exterior pier / girder guarded-release protocol

`scripts/run_ag1_citywide_exterior_loop_pier_deck_support_01_release.mjs` is the only release wrapper for the prepared AG-1 support scope: three 3×3 pier foundation/shafts and the two-deep `23×16` girder. It does not cover rail, a walking surface, wall, station, turnout, power, public access, or passenger service.

It is prepare-only by default. This read-only command audits the supplied immutable source, re-runs AG-0 with an explicit geometry/protected-boundary rebind, recompiles AG-1, and records fresh source preflight plus strict forward/rollback parser evidence:

```bash
node scripts/run_ag1_citywide_exterior_loop_pier_deck_support_01_release.mjs \
  --source-snapshot-root data/worldsnap-<immutable-source> \
  --out-dir data/world-review/ag1-release-<utc>
```

The command exits with `PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION`; that is evidence only and grants no mutation authority.

`--execute` is intentionally required before the wrapper can contact the live world. In that mode it requires two fresh, nonexistent capture destinations and performs this fixed sequence:

1. same-moment source capture and passed immutable-save audit;
2. AG-0 survey rebind and AG-1 compiler rebind from that exact capture;
3. exact forward source preflight, strict forward and rollback parser checks, projected rollback preflight, and block-entity/protected-core audit;
4. same-moment live-entity clearance;
5. strict-noop journaled forward execution;
6. fresh post capture and passed immutable-save audit;
7. rollback post-state preflight; and
8. independent immutable-post QA of all 1,165 target cells, 3×3 pier continuity, the two-deep girder, dry/stable halo, protected fabric, and saved entity/container exclusion.

The runner marks success only as `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE` after the independent QA passes. Any failed stage records a scope-local safety-kernel block; no post-release or service claim is valid from a failed ledger.

```bash
# Deliberately shown as a protocol, not executed by this document.
node scripts/run_ag1_citywide_exterior_loop_pier_deck_support_01_release.mjs \
  --execute \
  --source-snapshot-root data/worldsnap-ag1-source-<utc> \
  --post-snapshot-root data/worldsnap-ag1-post-<utc> \
  --out-dir data/world-review/ag1-release-<utc>
```
