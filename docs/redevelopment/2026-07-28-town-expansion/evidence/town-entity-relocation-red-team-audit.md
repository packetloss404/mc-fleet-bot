# Town Entity Relocation Red-Team Acceptance Audit

- Generated: `2026-07-28T11:01:05Z`
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
| REL-008A | **PASS** | yes | yes | critical | Captured special entities retain ownership, home, inventory, and variant state |
| REL-008 | **PASS** | yes | yes | critical | Every selector binds exact type plus four-int UUID and detects duplicates |
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
      "observationIndex": 124,
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
      "observationIndex": 169,
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
      "observationIndex": 12,
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
      "capturedUuidKey": "236106875,-156283315,-1210772013,1503334933",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Pig",
      "nbtCaptureError": null,
      "observationIndex": 15,
      "operationLine": 290658,
      "policyClass": "ordinary-livestock",
      "position": [
        -585.1000348162369,
        76,
        -608.1120993561276
      ],
      "targetBox": [
        -588,
        75,
        -610,
        -586,
        75,
        -610
      ]
    },
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Cow",
      "nbtCaptureError": "NBT capture found no minecraft:cow within 1 blocks",
      "observationIndex": 21,
      "operationLine": 229150,
      "policyClass": "ordinary-livestock",
      "position": [
        -580.9731243582812,
        72,
        -333.54096688435277
      ],
      "targetBox": [
        -582,
        71,
        -337,
        -582,
        71,
        -334
      ]
    },
    {
      "captureBindingReasons": [],
      "capturedUuidKey": null,
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Bee",
      "nbtCaptureError": "NBT capture found no minecraft:bee within 1 blocks",
      "observationIndex": 106,
      "operationLine": 126653,
      "policyClass": "special-relocatable",
      "position": [
        703.4830081794281,
        78.70767252651123,
        -558.0440166016006
      ],
      "targetBox": [
        702,
        76,
        -560,
        702,
        77,
        -560
      ]
    },
    {
      "captureBindingReasons": [
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "1307552911,936920697,-1542685634,1871203273",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Bee",
      "nbtCaptureError": null,
      "observationIndex": 134,
      "operationLine": 4374,
      "policyClass": "special-relocatable",
      "position": [
        805.5857062978336,
        73.90999999284745,
        -575.7040199462815
      ],
      "targetBox": [
        806,
        72,
        -581,
        806,
        72,
        -575
      ]
    },
    {
      "captureBindingReasons": [
        "captured-position-nearest-different-observation"
      ],
      "capturedUuidKey": "136307663,-1344124878,-1505338493,-935898143",
      "collisionClass": "conservative-halo-only",
      "disposition": "UNRESOLVED_HARD_STOP",
      "label": "Cow",
      "nbtCaptureError": null,
      "observationIndex": 171,
      "operationLine": 144984,
      "policyClass": "ordinary-livestock",
      "position": [
        1052.0387011938835,
        83,
        -543.8574842864004
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

### REL-013: Executor requires a fresh bound gate before movement and zero blockers before release

- Severity: `critical`
- Evidence:

```json
{
  "executeAuthorizationLine": 779,
  "executorEnforcesBoundGateFreshness": false,
  "freshnessOverrideCanExceedFiveMinutePolicy": true,
  "gatePassed": false,
  "gateStatus": "FAIL",
  "gateToManifestLagSeconds": 1345.083,
  "manifestAuthorizedForPartialEvacuation": true,
  "manifestWorldReleaseAuthorized": false,
  "maximumGateAgeSeconds": 300,
  "observedGateAgeSecondsAtAudit": 1357.159255
}
```

## Release rule

Partial relocation may move only the exact eligible UUID rows after every partial-required check passes against a fresh bound gate. The Town Expansion block transaction remains prohibited until every world-release-required check passes and a fresh zero-blocker live gate independently authorizes the atomic runner.
