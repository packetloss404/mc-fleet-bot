# Westlight Infinity Screen Release

Date: 2026-07-27  
Package: `VEN-WL-01`  
Venue feature: `WL-BOWL`  
Current status: **PREFLIGHT PASSED — AWAITING COORDINATED LIVE RELEASE**

## 1. Outcome

The Westlight stadium currently has an all-around bowl, field, concourses,
vomitories, radial aisles, and floating canopy, but no screen or scoreboard.
`VEN-WL-01` supplies a four-sided center-hung display so seating on every side
has a focal object.

This is not the C01 lower arena. The defect belongs to `WL-BOWL` in project
`westlight-venue`.

The package is generated, tested, exact-state preflighted against the immutable
program baseline, and accepted by the RCON parser in dry-run mode. It has not
yet been written to the live world.

## 2. Controlled files

| Purpose | File |
|---|---|
| Generator | `scripts/generate_westlight_infinity_screen.mjs` |
| Generator test | `test/build/generateWestlightInfinityScreen.test.ts` |
| Forward operations | `data/buildops/westlight-infinity-screen-2026-07-27.txt` |
| Exact rollback operations | `data/buildops/westlight-infinity-screen-2026-07-27.rollback.txt` |
| Design/report | `data/buildops/westlight-infinity-screen-2026-07-27.report.json` |
| Exact-state preflight | `data/buildops/westlight-infinity-screen-2026-07-27.preflight.json` |
| Before views | `data/exports/redevelopment-qa-2026-07-27/westlight/before/` |

Forward operation SHA-256:

`fa0c4a086f7bdcd92640d63bd57086ad5d2ebd2230f937ad0fc72b93095011fa`

## 3. Baseline control

| Field | Value |
|---|---|
| Frozen region directory | `data/worldsnap-redevelopment-c9e2bf0a-20260727/region` |
| Region files | 26 |
| Snapshot SHA-256 | `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654` |
| Target chunks present | 6 of 6 |
| Source material required | `minecraft:air` |
| Preflight guards | 524 of 524 passed |
| Failed guards | 0 |
| RCON dry-run operations | 524 |
| RCON leftovers | 0 |

Any difference between the live pre-release snapshot and this hash invalidates
the preflight. The package must then be regenerated or re-preflighted against a
new immutable snapshot.

## 4. Geometry

The display is centered at x=-360, z=-560.

| Component | Bounds |
|---|---|
| Display body | x=-369..-351, y=74..80, z=-568..-552 |
| Suspension chains | corner coordinates, y=81..92 |
| Verified canopy anchors | same four corners at y=93 |
| Existing field | y=58 |
| Open canopy band | y=84..87 |

The lowest display block is 16 blocks above the field. Only four one-block
chains pass through the venue's open-light band. The display does not overwrite
the field, seating, aisles, concourses, canopy roof, or the three existing
downward-facing LED rods at y=87, z=-560.

## 5. Operation inventory

| Tag | Exact one-cell operations |
|---|---:|
| Horizontal frame | 136 |
| North/south displays | 190 |
| East/west displays | 150 |
| Suspension chains | 48 |
| **Total** | **524** |

Every operation has:

- a single unique target cell;
- exact expected material `minecraft:air`;
- one deterministic replacement;
- no broad `SET`;
- no percentage pattern;
- no WorldEdit-only remainder.

Duplicate target cells: 0.

## 6. Material and visual system

The display uses:

- polished blackstone for the structural frame;
- black concrete for screen fields;
- lime concrete for high-contrast focal chevrons;
- sea lanterns for pixels and frame-center beacons;
- iron chains for the four suspension points.

The motif is intentionally block-scale. It provides a clear stadium focal point
without claiming to reproduce a high-resolution real-world video board.

## 7. Design basis

The all-around stadium seating makes a single end screen inappropriate. A
four-sided center-hung display gives every bowl sector a face and avoids
reorienting the existing 23 terraces.

The research basis and its limits are recorded in:

- `docs/redevelopment/2026-07-27/infrastructure-audit.md`;
- `docs/redevelopment/2026-07-27/infrastructure-standards.md`;
- `docs/redevelopment/2026-07-27/research-bibliography.md`.

The real-world sources support sightline review and center-hung display
precedent. The Minecraft coordinates and dimensions are project-specific
adaptations.

## 8. Before evidence

The following four reproducible, snapshot-rendered views prove the current
condition has no focal screen:

| View | Eye | Look |
|---|---|---|
| South lower bowl | -360,68,-530 | -360,77,-560 |
| North lower bowl | -360,68,-590 | -360,77,-560 |
| East lower bowl | -330,68,-560 | -360,77,-560 |
| West lower bowl | -390,68,-560 | -360,77,-560 |

Each image is 1280×720 with a 68-degree field of view and shadows enabled.
Their command geometry must be reused after release.

## 9. Automated validation performed

### 9.1 Generator tests

Command:

```bash
npx vitest run test/build/generateWestlightInfinityScreen.test.ts
```

Result:

- 1 test file passed;
- 2 tests passed;
- output contains more than 300 operations;
- all operations are guarded;
- all target cells are unique;
- all four display faces are present;
- the 48-view acceptance matrix is encoded;
- field, existing LED rods, and canopy anchors are excluded.

### 9.2 Frozen-snapshot exact-state preflight

Command:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/westlight-infinity-screen-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region \
  --report data/buildops/westlight-infinity-screen-2026-07-27.preflight.json
```

Result: 524/524 guards passed; 0 failed.

### 9.3 RCON parser dry run

Command:

```bash
python3 scripts/rcon_runner.py \
  data/buildops/westlight-infinity-screen-2026-07-27.txt \
  --dry-run
```

Result: 524 source operations became 524 `/fill` commands; 0 operations were
left for WorldEdit.

## 10. Coordinated release procedure

The release controller must:

1. Confirm both services are active and no second backend exists.
2. Confirm bots/build coordinators are paused and no overlapping mission runs.
3. Run `save-all flush`.
4. Capture a fresh immutable pre-release snapshot.
5. Reproduce the expected snapshot hash or repeat exact-state preflight.
6. Execute the forward file with `scripts/rcon_runner.py`.
7. Require zero failed commands and zero leftovers.
8. Run `save-all flush`.
9. Capture a new content-addressed post-release snapshot.
10. Census every expected target cell.
11. Render the same four before cameras plus the full 48-view matrix.
12. Register `WL-INFINITY-SCREEN` beneath `WL-BOWL`.
13. Link after media to that exact feature and post-release snapshot.
14. Refresh the catalog, PDF, and owner-only Sites release.

This package may execute in the same coordinated release window as disjoint
MainStreet, C01, and Raven Rock packages. Their operations must remain spatially
disjoint and each package retains its own failure/rollback decision.

## 11. Post-release block acceptance

The expected post census must show:

- 524 intended target cells changed;
- the exact material count distribution recorded by the machine report;
- no remaining air within intended display/frame/chain target cells;
- no modified block outside the 524-cell target set;
- all four verified y=93 canopy anchor cells unchanged;
- all three existing y=87, z=-560 end rods unchanged;
- no change to field, seats, aisles, concourses, or roof;
- zero fluids and zero block entities introduced.

## 12. Sightline acceptance

The matrix is:

- eight bowl sectors;
- lower, middle, and upper seating bands;
- sports and concert modes;
- 48 required views.

Each view receives:

- screen-face visible: yes/no;
- field focal area visible: yes/no;
- north stage visible in concert mode: yes/no;
- screen obstructs critical action area: yes/no;
- canopy collision: yes/no;
- aisle obstruction: yes/no;
- screenshot filename and SHA-256.

Release acceptance requires:

- a display face visible in every applicable sector;
- no field or stage critical-view obstruction;
- no aisle or vomitory obstruction;
- no player head collision on public routes;
- consistent focal reading from the four principal cardinal cameras.

## 13. Database and media acceptance

Create feature:

| Field | Value |
|---|---|
| Project | `westlight-venue` |
| External ID | `WL-INFINITY-SCREEN` |
| Parent | `WL-BOWL` |
| Kind | `landmark` |
| Status | `complete` only after post QA |
| Geometry | exact display and chain bounds |
| Source | `rcon` |
| Source ref | forward operation file |

Attributes must include:

- frozen pre-release snapshot reference;
- post-release snapshot reference;
- operation SHA-256;
- preflight report;
- execution report;
- post census;
- 48-view sightline report;
- exact screenshot paths and hashes;
- separate functional, sightline, legibility, and media-coverage scores.

No score defaults to 100.

## 14. Rollback

Because every source target is verified air, rollback consists of exact
replacement of the known new material states with air at the same 524 unique
cells. The generator emits
`data/buildops/westlight-infinity-screen-2026-07-27.rollback.txt`; it must be
preflighted against the post-release snapshot before it is used.

Rollback is required if:

- any forward command fails;
- the post census differs from the expected target set;
- an existing canopy anchor or LED rod changes;
- a public route is obstructed;
- the 48-view matrix finds a critical field/stage obstruction that cannot be
  corrected by a smaller guarded adjustment.

Rollback does not restore unrelated live changes. The content-addressed
pre-release snapshot remains the authoritative full-world recovery input.

## 15. Current release decision

The package has passed its offline design, test, exact-state, and command-parser
gates. The user has already authorized implementation of the requested stadium
screen. The remaining gate is operational: execute it inside the coordinated
release window, then append the real execution, census, media, database, and
deployment results below.

## 16. Execution append-only record

Pending coordinated live release.
