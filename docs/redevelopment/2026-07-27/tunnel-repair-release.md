# Raven Rock Tunnel Repair Release — S1 Section Pilot

Date: 2026-07-27  
Package: `INF-RR-01`  
Feature: `RR-S1`  
Status: **OFFLINE RELEASE CANDIDATE — ALL AUTOMATED GATES PASS; NOT YET
EXECUTED LIVE**

## 1. Release decision

This release takes the most conservative material step toward a uniform Raven
Rock tunnel system: it standardizes eleven stations of the known S1 compression
at x `138..148`.

The selected pilot is:

- materially useful: seven of the eleven starting stations are only five
  standable blocks wide;
- bounded: the whole authored shell is 11 × 10 × 9 blocks and only 335 cells
  change;
- reversible: every changed cell has one exact inverse operation;
- isolated from the T4 aquifer: the nearest pilot x is at least 415 blocks east
  of the protected x `-278/-277` bulkhead;
- isolated from authored rooms in the current catalog: only the Raven Rock
  district parent overlaps the two-dimensional pilot footprint;
- free of fluid, gravity-block, and block-entity hazards in the one-block
  safety buffer;
- sufficient to test a complete section family before any route-wide rollout.

The RR-Z5 stair is deliberately not combined with this package. The existing
stair is functional but uncomfortable, and its history includes adjacent-tread
deletion during headroom work. A simultaneous stair rewrite would make this
pilot harder to diagnose and roll back. RR-Z5 remains a required later pilot;
this release does not claim that stair or shaft work is complete.

## 2. Source of truth

| Item | Value |
|---|---|
| Frozen region directory | `data/worldsnap-redevelopment-c9e2bf0a-20260727/region` |
| Snapshot algorithm | SHA-256 of sorted `filename + NUL + bytes + NUL` |
| Snapshot SHA-256 | `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654` |
| Region files | 26 |
| Region bytes | 122,736,507 |
| Safety-buffer chunks | 4 present, 0 absent |
| Standards | TU-01 through TU-06, WF-03, QA-01 through QA-04 |
| Audit prescription | S1 controlled-section pilot at x `138..148` |

The generator independently recomputes the complete snapshot digest and exits
before writing operations if it differs. The independent QA computes the same
digest again using separate code.

The package may not be applied to a different whole-world hash. If unrelated
work changes the saved world first, refresh the snapshot, rebase this package,
and repeat every automated gate.

## 3. Exact scope

### 3.1 Coordinate schedule

| Element | Bounds / value |
|---|---|
| Longitudinal pilot | x `138..148` inclusive; 11 stations |
| Historic planned route centerline | z `-15` |
| Final clear envelope | z `-17..-11`, y `-11..-4` |
| Final clear dimensions | 7 wide × 8 high |
| Floor | y `-12`, z `-17..-11` |
| North/T3 divider liner | z `-18`, y `-11..-4` |
| South cave-edge liner | z `-10`, y `-11..-4` |
| Ceiling | y `-3`, z `-17..-11` |
| Safety buffer | x `137..149`, y `-13..-2`, z `-19..-9` |
| QA camera seed | near `(140,-9,-15)`, facing east and west |

The clear envelope is asymmetrically widened toward the south. The player
centerline may remain at z `-15`, while the envelope's geometric center is
z `-14`. That choice keeps the historic T3/S1 divider at z `-18` as a
continuous structural liner instead of cutting through it.

### 3.2 Cross-section

Looking east, the accepted section is:

```text
                       NORTH / T3 SIDE

      z=-18       z=-17  -16  -15  -14  -13  -12  -11       z=-10
    ┌─────────┬───────────────────────────────────────────┬─────────┐
y-3 │  liner  │ stone-brick ceiling; lamp at z=-15 on   │  liner  │
    │         │                 x=139,143,147             │         │
y-4 │         │                                           │         │
 .. │         │          7 × 8 CLEAR AIR VOLUME           │         │
y-8 │ polished│       planned travel line at z=-15        │polished │
    │deep-    │                                           │deep-    │
y-7 │ GREEN OXIDIZED-COPPER ROUTE BAND ON BOTH SIDES      │slate    │
 .. │slate    │                                           │         │
y-11│         │                                           │         │
    ├─────────┼───────────────────────────────────────────┼─────────┤
y-12          │          STONE-BRICK WALKING FLOOR        │
              └───────────────────────────────────────────┘

                       SOUTH / CAVE-EDGE SIDE
```

The longitudinal ends remain open at x `138` and x `148`, so the operating S1
route is never bulkheaded. A route-wide rollout or tapered transition is a
later release after this exact section family passes visual and movement
acceptance.

## 4. Measured before condition

The source snapshot contains a flat, reachable route, but the standable width
is inconsistent because the southern cells are irregularly open above missing
floor and the side/ceiling voids are not authored as a liner.

At walk y `-11`, using two clear player cells and a non-air floor:

| x | Starting standable z range | Starting width | Center clear height | Final width | Final clear height |
|---:|---:|---:|---:|---:|---:|
| 138 | `-17..-11` | 7 | 10 | 7 | 8 |
| 139 | `-17..-11` | 7 | 10 | 7 | 8 |
| 140 | `-17..-13` | 5 | 10 | 7 | 8 |
| 141 | `-17..-13` | 5 | 10 | 7 | 8 |
| 142 | `-17..-13` | 5 | 10 | 7 | 8 |
| 143 | `-17..-13` | 5 | 9 | 7 | 8 |
| 144 | `-17..-13` | 5 | 8 | 7 | 8 |
| 145 | `-17..-13` | 5 | 8 | 7 | 8 |
| 146 | `-17..-13` | 5 | 8 | 7 | 8 |
| 147 | `-17..-11` | 7 | 8 | 7 | 8 |
| 148 | `-17..-11` | 7 | 8 | 7 | 8 |

The pilot does not chase the largest apparent air void. It authors one exact
tube inside the known route: complete walking floor, sealed side surfaces,
repeatable ceiling, light rhythm, and a persistent route band.

## 5. Safety-buffer census

The complete 1,716-cell safety buffer was read offline with exact states.

| Base block | Count |
|---|---:|
| Deepslate | 725 |
| Air | 945 |
| Deepslate iron ore | 11 |
| Stone bricks | 9 |
| Deepslate lapis ore | 5 |
| Stone | 20 |
| Deepslate copper ore | 1 |
| Water, lava, bubble column, powder snow | 0 |
| Gravel, sand, suspicious gravity blocks | 0 |
| Waterlogged states | 0 |
| Block entities | 0 |

All four touched chunks exist in the snapshot. The frozen artifact contains
`region/*.mca` but not a frozen `entities/` directory. The package therefore
proves that no block entity is present but does not pretend to prove that a
free entity can never enter the volume. A same-moment live free-entity query is
a mandatory execution gate.

The database has no first-class S1 record yet. A read-only footprint query found
only the Raven Rock district envelope and no building/room feature overlapping
x `137..149`, z `-19..-9`. The absence of a tunnel record is a catalog gap, not
evidence that S1 does not exist; the geometry and block snapshot remain the
physical source of truth for this release.

### 5.1 Proposed database feature

The machine report now carries one import-ready `databaseFeatures` record. It
does not write `world-map.db`.

| Field | Value |
|---|---|
| Project | `raven-rock` |
| External ID | `RR-S1-STANDARD-PILOT` |
| Name | Raven Rock S1 Standard Section Pilot |
| Kind / class | `custom` / `utility` |
| Parent | `raven-rock:DISTRICT` (`wft_5789677296f4b494`) |
| Status | `planned` |
| Exact 3D bounds | x `138..148`, y `-12..-3`, z `-18..-10` |
| Completion ratio | 0; no live execution claimed |
| Condition score | `null`; no automatic 100 |
| Source | `region_scan`, pinned to the package report and snapshot |

Quality dimensions remain separate and evidence-backed:

| Dimension | Status | Score | Why it is not 100 |
|---|---|---:|---|
| Functional | `offline-section-pass-live-route-test-pending` | 75 | 11/11 simulated sections pass; live bidirectional movement is pending |
| Walkability | `flat-no-jump-geometry-live-walk-pending` | 70 | Proposed geometry is flat and wide; a normal-speed player test is pending |
| Legibility | `route-band-designed-sign-system-not-in-pilot` | 35 | The green/copper route cue exists, but route-wide signs are a later package |
| Media coverage | `camera-defined-before-after-not-captured` | 0 | Camera coordinates exist; live before/after images do not |

The feature also retains the clear-envelope dimensions, station range/count,
snapshot SHA, package/route IDs, and source references to the standards, audit,
release document, operations, rollback, prestate, preflight, and QA reports.
Import must occur only after the live package passes; at that time, status,
completion, quality evidence, and media relations must be updated from the
as-built snapshot rather than silently promoted to perfect scores.

## 6. Material schedule and operation accounting

The final family uses:

| Role | Material |
|---|---|
| Floor | `minecraft:stone_bricks` |
| Main side liners | `minecraft:polished_deepslate` |
| Route identity band | `minecraft:oxidized_copper` |
| Ceiling | `minecraft:stone_bricks` |
| Ceiling lights | `minecraft:sea_lantern` at x `139,143,147`, z `-15` |
| Clear player volume | `minecraft:air` |

The design evaluates 946 cells. Of those, 611 already equal their desired
state and are intentionally omitted. The remaining 335 exact mutations are:

| Role | Changed cells | Source detail |
|---|---:|---|
| Floor | 68 | 58 deepslate, 10 air |
| Side liners/bands | 176 | 106 deepslate, 53 air, 17 stone |
| Ceiling/lights | 77 | 50 deepslate, 27 air |
| Clear volume | 14 | 9 iron ore, 5 lapis ore |
| **Total** | **335** | one target per operation |

Desired-operation totals are:

| Desired material | Operations |
|---|---:|
| Stone bricks | 142 |
| Polished deepslate | 154 |
| Oxidized copper | 22 |
| Sea lantern | 3 |
| Air | 14 |

Only 14 natural blocks are removed from the player-clear volume. Ninety air
cells become controlled floor, wall, or ceiling. This is a liner and clearance
pilot, not unconstrained excavation or full-cavern infill.

## 7. Guard and rollback model

Every forward line is:

```text
REPL x y z x y z <exact-frozen-source-state> <one-desired-state>
```

There are:

- zero `SET` operations;
- zero broad boxes;
- zero multi-material masks;
- zero `CMD` operations;
- zero duplicate target cells;
- zero operations outside x `138..148`, y `-12..-3`, z `-18..-10`;
- zero targets at T4, RR-Z5, or T2b.

The rollback reverses forward order and swaps exact expected/desired state for
all 335 changed cells. This matters in a partial run: a forward operation that
never happened will not match the rollback's expected pilot material and is
left alone, while an applied operation is restored exactly.

The rollback restores ore identities and the unusual source
`minecraft:deepslate[axis=y]` states; it does not flatten all sources to generic
stone. The complete 946-cell source/design relation is retained in the
prestate JSON.

Vanilla RCON execution is sequential, not ACID-transactional. “Atomic” for this
release means bounded, source-guarded, post-verified, and exactly recoverable.
Acceptance is withheld until the entire post-state matches. A partial command
run must be rolled back before another package enters the volume.

## 8. Automated evidence

### 8.1 Generic exact-state preflight

Command:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region \
  --report data/buildops/ravenrock-s1-section-pilot-2026-07-27.preflight.json
```

Result:

- 335/335 forward source guards match;
- 0 failures;
- 4 census chunks;
- no partial-mask exceptions.

### 8.2 Independent QA

The independent checker does not import generator code. It re-runs the general
block and block-entity censuses, compares every exact source guard, simulates
the final section, reverses it, and compares restoration to the frozen source.

Result:

- 688/688 assertions pass;
- 11/11 stations pass the sealed 7-wide × 8-high section test;
- 335 unique forward targets;
- 335 exact inverse targets;
- 0 block entities;
- 0 fluid/gravity hazards;
- exact rollback restoration differences: 0;
- status: `PASS_OFFLINE_LIVE_GATE_PENDING`.

### 8.3 RCON parser dry run

Forward:

- 335 operations;
- 335 vanilla `/fill` commands;
- 0 WorldEdit leftovers.

Rollback:

- 335 operations;
- 335 vanilla `/fill` commands;
- 0 WorldEdit leftovers.

The dry runs parse commands only; they do not connect to or mutate Minecraft.

### 8.4 Focused tests

```bash
npx vitest run test/build/generateRavenRockS1Pilot.test.ts
```

Result: 1 test file, 3 tests, 3 passed.

The test suite independently checks exact target uniqueness, reverse rollback
bijection, complete prestate coverage, immutable hash, generic preflight, and
the simulated final section.

## 9. Artifact register

| Artifact | Purpose |
|---|---|
| `scripts/generate_ravenrock_s1_pilot.mjs` | Immutable-snapshot generator and safety refusal logic |
| `scripts/qa_ravenrock_s1_pilot.mjs` | Independent source/final/rollback QA |
| `test/build/generateRavenRockS1Pilot.test.ts` | Focused regression tests |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt` | 335 guarded forward operations |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.txt` | 335 exact reverse operations |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.prestate.json` | All 946 source/design cells and safety census |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.report.json` | Machine design, proposed database feature, material, safety, and acceptance report |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.preflight.json` | Generic frozen guard result |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.qa.json` | Independent assertion and station results |

## 10. Mandatory live execution gates

All of the following remain mandatory immediately before any live run:

1. Confirm no other world-building package targets the pilot or its safety
   buffer.
2. Run `save-all flush`, take a fresh snapshot, and reproduce the full expected
   snapshot SHA. If it differs, stop and regenerate.
3. Re-run the generic preflight against that fresh saved snapshot and require
   335/335 guards.
4. Query the live safety buffer for free entities and require none:

   ```text
   execute if entity @e[x=137,y=-13,z=-19,dx=12,dy=11,dz=10]
   ```

   A successful entity match is a stop-work result, not permission to continue.
5. Confirm no active player, bot builder, mission, or build job occupies the
   volume.
6. Capture the same-camera before set near `(140,-9,-15)` in both directions
   and a perpendicular cross-section/map view.
7. Keep the rollback beside the forward file and retain the frozen snapshot.
8. Execute the forward file once; require zero command failures.
9. Run `save-all flush`, take a post-build snapshot, and verify all 1,716
   safety-buffer cells against the simulated final state:

   ```bash
   node scripts/qa_ravenrock_s1_pilot.mjs \
     --observed-regions <post-build-snapshot>/region \
     --expect final \
     --out data/buildops/ravenrock-s1-section-pilot-2026-07-27.post.qa.json
   ```

10. Walk normally from west to east and east to west. Pass requires no jump,
    sprint, crouch, collision, fall, or hidden side opening.
11. Capture the identical after views and inspect light rhythm, route-band
    continuity, endpoint transition, side sealing, and perceived width.
12. Accept the pilot only after block, movement, and visual evidence all pass.

## 11. Rollback and stop-work

Run the exact rollback if:

- a command reports failure;
- the post-state differs at any target;
- a side opening, water, gravity fall, or protected object appears;
- either direction requires jump, sprint, or crouch;
- the x `138` or x `148` transition becomes confusing or collision-prone;
- the material family is visually rejected;
- same-camera evidence cannot be reproduced.

After rollback, take another saved snapshot and run:

```bash
node scripts/qa_ravenrock_s1_pilot.mjs \
  --observed-regions <rollback-snapshot>/region \
  --expect rollback \
  --out data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.qa.json
```

Rollback acceptance requires every safety-buffer cell to equal the frozen
baseline, zero fluids/gravity hazards, zero block entities, and the same-camera
appearance to return.

## 12. Honest release status and exclusions

The package is honestly live-ready only in the operational sense that its
offline design, exact guards, parser, independent simulation, and rollback all
pass. It is not marked installed or accepted because no live RCON command was
sent and no post-build movement or visual test exists yet.

The following are explicitly not solved by this pilot:

- the remaining S1 stations outside x `138..148`;
- the route-wide endpoint/taper and repeated sign program;
- T2b's tunnel-within-cavern liner;
- RR-Z5 stair comfort, landing identity, or no-jump alternative;
- T1, T2, T3, C1, C2, and T4 route-family rollout;
- missing first-class route/node/media database records;
- Westlight screen and entry work;
- C01 portal, mountain road, and concealment.

No live-world edits, RCON operations, database writes, service restarts, T4
bulkhead changes, cave merges, or bulk excavation were performed while
preparing this release.
