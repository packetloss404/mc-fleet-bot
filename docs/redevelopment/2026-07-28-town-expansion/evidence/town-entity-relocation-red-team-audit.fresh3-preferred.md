# Town Entity Relocation Red-Team Acceptance Audit

- Generated: `2026-07-28T11:25:53Z`
- Result: **PARTIAL_PASS_WORLD_BLOCKED**
- Partial relocation: **ACCEPT_EXACT_LISTED_PARTIAL_UUID_RELOCATION**
- World release: **BLOCK_WORLD_RELEASE**
- Mode: offline/read-only; no RCON and no live mutation

## Checklist

| ID | Result | Partial | World | Severity | Acceptance check |
|---|---:|---:|---:|---:|---|
| REL-001 | **PASS** | yes | yes | critical | Gate, manifest, and guarded-operation identity binding |
| REL-002 | **PASS** | yes | yes | critical | UUID aggregation covers every captured identity exactly once |
| REL-003 | **PASS** | yes | yes | critical | Every observation has an unambiguous, locally valid UUID capture |
| REL-004 | **PASS** | yes | yes | critical | Volatile tick state is separated from immutable preservation state |
| REL-005 | **FAIL** | no | yes | critical | No unresolved or transient identity remains before release |
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

### REL-005: No unresolved or transient identity remains before release

- Severity: `critical`
- Evidence:

```json
{
  "blockedUuidRows": [],
  "manifestStatus": "READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED",
  "transientAbsenceNotProven": [
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "ABSENCE_ONLY_FRESH_GATE_REQUIRED",
      "label": "Egg",
      "nbtCaptureError": "NBT capture found no minecraft:egg within 1 blocks",
      "observationIndex": 60,
      "operationLine": 45752,
      "policyClass": "transient-no-move",
      "position": [
        473.5344998826799,
        77,
        -252.3368253009398
      ],
      "targetBox": [
        472,
        75,
        -254,
        486,
        75,
        -250
      ]
    },
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "ABSENCE_ONLY_FRESH_GATE_REQUIRED",
      "label": "Egg",
      "nbtCaptureError": "NBT capture found no minecraft:egg within 1 blocks",
      "observationIndex": 114,
      "operationLine": 107703,
      "policyClass": "transient-no-move",
      "position": [
        784.237677575117,
        69,
        -486.0954556913194
      ],
      "targetBox": [
        783,
        70,
        -489,
        785,
        70,
        -482
      ]
    },
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "direct-cell-volume",
      "disposition": "ABSENCE_ONLY_FRESH_GATE_REQUIRED",
      "label": "Egg",
      "nbtCaptureError": "NBT capture found no minecraft:egg within 1 blocks",
      "observationIndex": 163,
      "operationLine": 128465,
      "policyClass": "transient-no-move",
      "position": [
        1029.897911392953,
        92,
        -272.254663851561
      ],
      "targetBox": [
        1029,
        91,
        -278,
        1029,
        91,
        -271
      ]
    }
  ],
  "unresolvedNonTransient": [],
  "worldReleaseAuthorized": false
}
```

## Release rule

Partial relocation may move only the exact eligible UUID rows after every partial-required check passes against a fresh bound gate. The Town Expansion block transaction remains prohibited until every world-release-required check passes and a fresh zero-blocker live gate independently authorizes the atomic runner.
