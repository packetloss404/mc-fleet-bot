# Town Entity Relocation Red-Team Acceptance Audit

- Generated: `2026-07-28T11:09:54Z`
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
      "observationIndex": 53,
      "operationLine": 6809,
      "policyClass": "transient-no-move",
      "position": [
        -139.94962895749387,
        68,
        -416.07763436592546
      ],
      "targetBox": [
        -139,
        64,
        -416,
        -139,
        65,
        -415
      ]
    },
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "ABSENCE_ONLY_FRESH_GATE_REQUIRED",
      "label": "Egg",
      "nbtCaptureError": "NBT capture found no minecraft:egg within 1 blocks",
      "observationIndex": 66,
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
      "observationIndex": 121,
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
      "observationIndex": 166,
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
  "unresolvedNonTransient": [
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Chicken",
      "nbtCaptureError": "NBT capture found no minecraft:chicken within 1 blocks",
      "observationIndex": 165,
      "operationLine": 128473,
      "policyClass": "ordinary-livestock",
      "position": [
        1034.4651716201934,
        90,
        -273.49559486445486
      ],
      "targetBox": [
        1033,
        91,
        -275,
        1033,
        91,
        -275
      ]
    },
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Chicken",
      "nbtCaptureError": "NBT capture found no minecraft:chicken within 1 blocks",
      "observationIndex": 170,
      "operationLine": 133955,
      "policyClass": "ordinary-livestock",
      "position": [
        1056.06832531069,
        79,
        -402.39823114440895
      ],
      "targetBox": [
        1055,
        78,
        -408,
        1055,
        78,
        -403
      ]
    },
    {
      "captureBindingReasons": [
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "222551396,910118584,-1349353052,-806972369",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Sheep",
      "nbtCaptureError": null,
      "observationIndex": 176,
      "operationLine": 122658,
      "policyClass": "ordinary-livestock",
      "position": [
        1085.1683319978908,
        85,
        -559.7856966729953
      ],
      "targetBox": [
        1086,
        83,
        -562,
        1086,
        83,
        -558
      ]
    }
  ],
  "worldReleaseAuthorized": false
}
```

## Release rule

Partial relocation may move only the exact eligible UUID rows after every partial-required check passes against a fresh bound gate. The Town Expansion block transaction remains prohibited until every world-release-required check passes and a fresh zero-blocker live gate independently authorizes the atomic runner.
