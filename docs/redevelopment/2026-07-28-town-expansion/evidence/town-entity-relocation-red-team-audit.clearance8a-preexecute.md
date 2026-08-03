# Town Entity Relocation Red-Team Acceptance Audit

- Generated: `2026-07-28T12:20:47Z`
- Result: **PASS**
- Partial relocation: **ACCEPT_EXACT_LISTED_PARTIAL_UUID_RELOCATION**
- World release: **ACCEPT_WORLD_RELEASE**
- Mode: offline/read-only; no RCON and no live mutation

## Checklist

| ID | Result | Partial | World | Severity | Acceptance check |
|---|---:|---:|---:|---:|---|
| REL-001 | **PASS** | yes | yes | critical | Gate, manifest, and guarded-operation identity binding |
| REL-002 | **PASS** | yes | yes | critical | UUID aggregation covers every captured identity exactly once |
| REL-003 | **PASS** | yes | yes | critical | Every observation has an unambiguous, locally valid UUID capture |
| REL-004 | **PASS** | yes | yes | critical | Volatile tick state is separated from immutable preservation state |
| REL-005 | **PASS** | no | yes | critical | No unresolved or transient identity remains before release |
| REL-006 | **PASS** | yes | yes | critical | Destination entity slots are unique, separated, and outside target halos |
| REL-007 | **PASS** | yes | yes | high | Declared local footing envelopes do not overlap |
| REL-008A | **PASS** | yes | yes | critical | Special mobs and dropped items retain payload, ownership, home, and variant state |
| REL-008 | **PASS** | yes | yes | critical | Every selector binds exact type plus four-int UUID and detects duplicates |
| REL-015 | **PASS** | yes | yes | critical | Every attempted live row has completed or fully compensated |
| REL-016 | **PASS** | yes | yes | critical | All destinations pass one live preflight before any teleport |
| REL-009 | **PASS** | yes | yes | critical | Source/destination force-loads are exact, journaled, and non-destructive |
| REL-010 | **PASS** | yes | yes | critical | Journal is durable and complete before each irreversible action |
| REL-011 | **PASS** | yes | yes | critical | Chest-minecart rail is exact-state and crash-recoverable |
| REL-012 | **PASS** | yes | yes | critical | Failure compensation is reverse-order, complete, and retryable |
| REL-013 | **PASS** | yes | yes | critical | Executor requires a fresh bound gate before movement and zero blockers before release |
| REL-014 | **PASS** | no | yes | critical | Partial evacuation evidence cannot authorize the world release runner |

## Failed gates

None.
## Release rule

Partial relocation may move only the exact eligible UUID rows after every partial-required check passes against a fresh bound gate. The Town Expansion block transaction remains prohibited until every world-release-required check passes and a fresh zero-blocker live gate independently authorizes the atomic runner.
