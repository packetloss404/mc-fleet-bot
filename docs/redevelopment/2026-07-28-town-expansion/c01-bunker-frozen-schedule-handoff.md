# C01 Five-Level Bunker — Frozen Machine-Schedule Handoff

**Planning status:** frozen and internally checked; not built.  
**Live-world mutation:** none.  
**Compiler status:** blocked until all nine new C01 scopes are emitted and the
old C01 exact-object retirement ledger exists.

## Authoritative files

| Artifact | SHA-256 |
|---|---|
| `scripts/generate_c01_bunker_classification_manifest.mjs` | `e04e5c51c1bc145fec0d8f51ea1c67879c7b56a2b17da90768d25593cee7149e` |
| `c01-bunker-classification-manifest.json` | `26b811e96b86f2c3766e0f4f7b5e24604215b0520d43f57be1272bf217d4b1e5` |
| `evidence/c01-bunker-classification-qa.json` | `33f5e03f48a3e96276228293265568e490c7fff982edde7ec0b5508a5e61ec90` |

Regenerate the manifest with:

```bash
node scripts/generate_c01_bunker_classification_manifest.mjs
```

Run its read-only integration QA with:

```bash
node scripts/qa_c01_bunker_square.mjs \
  --ops data/buildops/town-expansion-r1-wip2.txt \
  --report data/buildops/town-expansion-r1-wip2.report.json \
  --manifest docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json \
  --out docs/redevelopment/2026-07-28-town-expansion/evidence/c01-bunker-classification-qa.json
```

The current QA result is intentionally `FAIL` only because the WIP2 compiler
contains none of the nine frozen C01 scopes. All classification, program,
terrain declaration, room-detail, camera, vertical-circulation, reachability,
access-separation, egress, and exact-count gates pass.

## Exact capacity and utilization

| Level | Gross cells | Gross columns | Programmed | Circulation | Stair/lift | Service | Safety void |
|---|---:|---:|---:|---:|---:|---:|---:|
| L1 security/garage | 187,254 | 20,806 | 50,103 | 118,854 | 4,707 | 11,700 | 1,890 |
| L2 living/amenity/adult | 166,448 | 20,806 | 97,608 | 64,544 | 2,616 | 0 | 1,680 |
| L3 agriculture/water | 166,448 | 20,806 | 87,776 | 62,432 | 4,000 | 10,560 | 1,680 |
| L4 command/medical | 59,192 | 7,399 | 42,232 | 15,168 | 1,792 | 0 | 0 |
| L5 power/escape | 59,192 | 7,399 | 42,136 | 15,152 | 1,904 | 0 | 0 |
| Owner club/arrival | 82,688 | 4,352 | 37,575 | 39,081 | 2,448 | 3,584 | 0 |
| Owner residence | 163,800 | 11,700 | 104,988 | 55,464 | 3,348 | 0 | 0 |
| **Total** | **885,022** | **93,268** | **462,418** | **370,695** | **20,815** | **25,844** | **5,250** |

The authoritative totals in the machine QA are:

- 885,022 gross classified cells;
- 879,772 net walkable/program/service cells;
- 462,418 programmed cells;
- 5,250 deliberately retained safety-earth cells;
- 0 unlabeled cells;
- 0 multiply classified cells; and
- 99.4068% net-to-gross within the audited interior-air envelopes.

The row-level circulation values sum to 370,695; that number, not a rounded
visual estimate, controls downstream reporting.

## Program locks

- The active hangar and arena programs are deleted. The clear-span room is a
  2,950-column, 24-vehicle secure garage with cars, trucks, service bays, one
  large road-cut door, and five exact glazed support-gallery rooms.
- The public adult wing is 5,544 gross columns, above the 5,364 minimum. It has
  24 distinct themed private rooms, five one-to-one rooms, one open exhibition
  salon, perimeter viewing, bar/lounge, dressing/wash/storage, performer
  corridor, and independent egress.
- The owner club has a real double-height theater, six meeting rooms, twelve
  private adult rooms, service/backrooms, and ceremonial arrival program.
- The residence contains exactly fifteen dual-entry poly suites, exactly three
  master bedrooms, and exactly two master kitchens.
- Every one of 165 occupied room/route objects has exact boxes, capacity or
  room-use metadata, furniture expectations, a route node, and a camera ID.
- All 165 nodes are reachable in the declared graph. Public 67/67, owner 88/88,
  service 8/8, and tunnel 2/2 access-class nodes are internally connected.

## Owner tunnel lock

Only this centerline is accepted at floor `y=-44`:

`(363,55) -> (540,-20) -> (620,-42) -> (718,-42)`.

It is a modern five-by-five clear branch in a seven-by-seven liner. The full
eleven-by-eleven surveyed halo checks 54,956 unique snapshot cells and contains
zero water, lava, bubble columns, or block entities. The terminal stair/lift
prism `[718,-48,-50]..[734,-13,-34]` is also fluid- and block-entity-free.
The straight candidate is rejected.

## Migration and concealment locks

The old C01 stays operational until the new complex passes commissioning. Its
source census is 36 recursive database objects, 1,896 block entities, 1,622
inventories, 92 item stacks, and 5,132 items. Every moved NBT object needs exact
source/destination coordinates, full NBT hashes, inventory slots, sequence, and
rollback data. A live `data get block` hash check is mandatory before source
retirement. Block-state guards alone are insufficient.

Retirement may target only exact C01-owned cells. Blanket clearing the old
`[90..300]` area is prohibited. The observatory, penthouse/owner estate,
private shelter route, and their inventories are protected siblings.

The rebuilt bunker must be terrain-sealed. Only the road-cut garage opening and
the existing observatory/penthouse masks may be visible. Acceptance requires
cellwise cover, full surface-to-structure ray tests, zero exposed C01
structural cells outside those masks, and matched 360-degree surface images.

Only after exact source retirement passes may P01 be restored as one
uninterrupted 33,634-column parking object with complete aisles, stalls,
crosswalks, lighting, drainage, and bidirectional vehicle circulation.

## Compiler acceptance

The implementation is not releasable until:

1. all nine `bunkerScopes` in the manifest appear in forward, rollback, and
   scope-summary reports;
2. the exact cell classifier reproduces the zero-unlabeled/zero-overlap totals;
3. a snapshot-derived NBT migration ledger reconciles all source totals;
4. the door-threshold graph and real voxel flood-fill reach every destination;
5. the normal-walk tests pass every stair, lift lobby, airlock, egress, and the
   owner tunnel in both directions;
6. post-state concealment and matched route/object cameras pass; and
7. database, maps, floor plans, screenshots, dossier, object-media arrays, and
   Sites payload are refreshed from the accepted immutable post snapshot.
