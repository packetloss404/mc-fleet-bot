# Town Entity Relocation Red-Team Acceptance Audit

- Generated: `2026-07-28T11:06:00Z`
- Result: **FAIL**
- Partial relocation: **REJECT_PARTIAL_UUID_RELOCATION**
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
| REL-008A | **FAIL** | yes | yes | critical | Special mobs and dropped items retain payload, ownership, home, and variant state |
| REL-008 | **PASS** | yes | yes | critical | Every selector binds exact type plus four-int UUID and detects duplicates |
| REL-015 | **PASS** | yes | yes | critical | Every attempted live row has completed or fully compensated |
| REL-009 | **PASS** | yes | yes | critical | Source/destination force-loads are exact, journaled, and non-destructive |
| REL-010 | **PASS** | yes | yes | critical | Journal is durable and complete before each irreversible action |
| REL-011 | **PASS** | yes | yes | critical | Chest-minecart rail is exact-state and crash-recoverable |
| REL-012 | **PASS** | yes | yes | critical | Failure compensation is reverse-order, complete, and retryable |
| REL-013 | **FAIL** | yes | yes | critical | Executor requires a fresh bound gate before movement and zero blockers before release |
| REL-014 | **PASS** | no | yes | critical | Partial evacuation evidence cannot authorize the world release runner |

## Failed gates

### REL-005: No unresolved or transient identity remains before release

- Severity: `critical`
- Evidence:

```json
{
  "manifestStatus": "READY_PARTIAL_EVACUATION_WORLD_RELEASE_BLOCKED",
  "transientAbsenceNotProven": [
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
      "observationIndex": 120,
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
      "captureBindingReasons": [
        "identity-check-failed",
        "captured-position-too-far-from-gate-observation",
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "-395550804,-1282850698,-1410245423,-164685988",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Sheep",
      "nbtCaptureError": null,
      "observationIndex": 13,
      "operationLine": 207095,
      "policyClass": "ordinary-livestock",
      "position": [
        -586,
        66,
        -664
      ],
      "targetBox": [
        -592,
        68,
        -664,
        -252,
        68,
        -663
      ]
    },
    {
      "captureBindingReasons": [
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "-144293676,-279294995,-1939361823,-1346885314",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Pig",
      "nbtCaptureError": null,
      "observationIndex": 28,
      "operationLine": 267291,
      "policyClass": "ordinary-livestock",
      "position": [
        -480.89454769205287,
        73,
        -544.9180806783716
      ],
      "targetBox": [
        -482,
        70,
        -547,
        -482,
        70,
        -544
      ]
    },
    {
      "captureBindingReasons": [
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "-144293676,-279294995,-1939361823,-1346885314",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Pig",
      "nbtCaptureError": null,
      "observationIndex": 34,
      "operationLine": 267231,
      "policyClass": "ordinary-livestock",
      "position": [
        -479.8292820709793,
        72,
        -543.8179535054076
      ],
      "targetBox": [
        -481,
        69,
        -545,
        -480,
        69,
        -544
      ]
    },
    {
      "captureBindingReasons": [
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "342920137,1685406184,-1391074579,-1378753078",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Cow",
      "nbtCaptureError": null,
      "observationIndex": 168,
      "operationLine": 144984,
      "policyClass": "ordinary-livestock",
      "position": [
        1050.42514148012,
        83,
        -543.8952152360289
      ],
      "targetBox": [
        1047,
        80,
        -543,
        1057,
        80,
        -543
      ]
    }
  ],
  "worldReleaseAuthorized": false
}
```

### REL-008A: Special mobs and dropped items retain payload, ownership, home, and variant state

- Severity: `critical`
- Evidence:

```json
{
  "errors": [
    {
      "entityType": "minecraft:item",
      "label": "Oak Sapling",
      "reasons": [
        "missing immutable paths: Item"
      ],
      "uuidKey": "-896059203,1867271327,-2082205522,-1063732770"
    }
  ],
  "note": "This check covers captured/eligible special rows. REL-005 separately blocks release on any unresolved special observation.",
  "specialRows": 15,
  "specialTypes": [
    "minecraft:bee",
    "minecraft:chest_minecart",
    "minecraft:donkey",
    "minecraft:fox",
    "minecraft:item",
    "minecraft:turtle",
    "minecraft:wolf"
  ],
  "unresolvedSpecialObservations": []
}
```

### REL-013: Executor requires a fresh bound gate before movement and zero blockers before release

- Severity: `critical`
- Evidence:

```json
{
  "executeAuthorizationLine": 784,
  "executorEnforcesBoundGateFreshness": true,
  "freshnessOverrideCanExceedFiveMinutePolicy": false,
  "gatePassed": false,
  "gateStatus": "FAIL",
  "gateToManifestLagSeconds": 62.069,
  "manifestAuthorizedForPartialEvacuation": true,
  "manifestWorldReleaseAuthorized": false,
  "maximumGateAgeSeconds": 300,
  "observedGateAgeSecondsAtAudit": 323.095976
}
```

## Release rule

Partial relocation may move only the exact eligible UUID rows after every partial-required check passes against a fresh bound gate. The Town Expansion block transaction remains prohibited until every world-release-required check passes and a fresh zero-blocker live gate independently authorizes the atomic runner.
