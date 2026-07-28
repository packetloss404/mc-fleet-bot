# Town Entity Destination Preflight and Reassignment Acceptance

## Decision on the fresh2 failed attempt

**ACCEPT_COMPENSATED_ROLLBACK; REJECT_MANIFEST_REUSE**

This is an offline review. No RCON or live mutation was used.

Evidence identities:

| Artifact | SHA-256 |
|---|---|
| `town-expansion-r1-2026-07-28.entity-evacuation.fresh2.manifest.json` | `54f201d332f0ad7f957736ea1adbcd7c0bf20e3641fafe75259409d9e9d0c57c` |
| `town-expansion-r1-live-entity-gate-fresh2-20260728.json` | `02a52a437ccf1d0a83e732fd796af4f91c9dfe3848b107de39207262adb330ee` |
| `town-expansion-r1-2026-07-28.entity-evacuation.fresh2.journal.json` | `d1169ee5568c9a4e4c21d30feae9e619950ad92e1dc71d25520a6438e2291728` |
| Executor used by the pre-attempt audit | `9215262c1995f07bdbcb594718fab21d0dd4685a429b84b3620bfac1e1d6955a` |

The journal proves:

- status is `failed-rolled-back`;
- 129 rows are `rolled-back`;
- every rolled-back row reached the executor's exact UUID/type query, source
  teleport, source-position check, and immutable-projection comparison before
  it could be marked `rolled-back`;
- `rollbackFailures` is empty;
- row 130 is only `force-loaded`, with `teleportIssued=false` and
  `railPlacementIntended=false`; it did not move an entity or place a rail;
- the failure was the exact live footing probe at block
  `(324, 67, -1208)`;
- the failing destination was `(324.5, 67, -1207.5)`, chunk `(20,-76)`,
  manifest slot 130;
- the executor can write `failed-rolled-back` only after its exact
  pre-existing force-load restoration completes without adding a restoration
  failure. An error there would make the journal `rollback-failed`.

Therefore the entity/world safety state is compensated. The stale manifest is
not reusable because at least one destination's live block state no longer
matches its snapshot-derived footing contract.

## Mandatory all-destination live preflight

A replacement attempt is acceptable only when one new read-only preflight
checks every candidate destination before the first entity teleport.

The preflight report must be bound to:

1. the exact operation-package SHA-256;
2. the exact live-gate SHA-256;
3. the exact relocation-manifest SHA-256;
4. the executor SHA-256;
5. every transaction index and UUID in manifest order.

It must contain exactly one result per transaction row and no orphan result.
For each row it must record:

- transaction index, UUID key, entity type, destination and destination chunk;
- the declared footing/headroom contract and live probe replies or reply
  hashes;
- entity occupancy count within 1.5 blocks;
- exact block results for the center ground, destination block and upper
  headroom block;
- all 25 cells in the declared local footing envelope, not just its center;
- the temporary force-load additions and verified release result.

Type-specific requirements:

- ordinary and special mobs: declared center ground remains exact; destination
  and upper headroom remain air;
- turtle: center ground remains exact sand;
- chest minecart: the rail position remains exact `air`, upper headroom remains
  air, and the declared temporary rail state is unchanged;
- dropped item: destination/headroom remain air and the manifest still contains
  exact immutable `Item` payload capture.

The preflight must fail closed on:

- any entity or player at a destination;
- selector truncation or count/position parse disagreement;
- any block mismatch in a center or 25-cell local envelope;
- a destination chunk duplicated by another row;
- a destination chunk intersecting a target-halo chunk;
- a local-footing overlap;
- a temporary force-load leak;
- any difference between the final and pre-existing force-load set;
- any report/manifest/gate/package hash mismatch.

The preflight may temporarily force-load one destination chunk at a time. It
must release and verify that chunk before advancing. It must not set blocks,
move/kill/summon entities, or leave chunks loaded.

## Slot exclusion and reassignment

The following exact slot is rejected and must be carried into the next
manifest as an explicit exclusion:

```json
{
  "destination": [324.5, 67, -1207.5],
  "destinationChunk": [20, -76],
  "centerGroundPosition": [324, 66, -1208],
  "liveFailedProbePosition": [324, 67, -1208],
  "priorFootingEvidenceSha256": "1e9a422bc741cc7aef66a8b85343f5ef6073e073350d18f3ed28cd9c01413f34",
  "reason": "fresh2 live destination footing mismatch"
}
```

Every destination that fails the all-destination preflight must be excluded the
same way. Reassignment is accepted only when each replacement:

- occupies a previously unused destination chunk;
- is outside every exact operation target-halo chunk;
- has a non-overlapping five-by-five local footing envelope;
- satisfies the same entity-type footing rule;
- passes the complete live preflight;
- is written into a newly generated manifest with a new SHA-256.

The generator must not silently reuse a rejected coordinate just because a
snapshot still describes it as valid. Exclusions are inputs to generation and
are listed in the generated manifest/report.

## Release sequence

1. Reconcile any prior journal; require zero `rollback-failed` rows.
2. Capture a new item-aware live entity gate.
3. Generate a new manifest with the exclusion set and exact priority order.
4. Run the all-destination live preflight against that manifest.
5. Independently red-team the exact gate/manifest/preflight hashes.
6. Start partial relocation only if the gate is at most 300 seconds old and the
   destination preflight is at most 60 seconds old.
7. After partial relocation, capture a new zero-blocker live gate.
8. Keep the world block transaction prohibited until that final gate passes.

Passing the destination preflight authorizes only the exact listed partial UUID
relocation. It never authorizes the Town Expansion block release.
