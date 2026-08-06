# As-Built Redevelopment Completion Record

Release: `REDEV-2026-07-27-R1`  
Implementation window: 2026-07-27T23:51:47Z–2026-07-27T23:52:21Z  
Final QA generated: 2026-07-28T00:37:20.690Z  
Disposition: **ACCEPTED — LIVE WORK COMMITTED, VERIFIED, CATALOGED, AND PUBLISHED**

## 1. Executive record

This is the final as-built account of the first coordinated world
redevelopment release. It records what physically changed, what deliberately
did not move, how each target was protected, how failure was handled, and how
the result was proven against a frozen saved-world snapshot.

Five packages were committed as one fixed-order transaction:

1. a real focal display for the Westlight stadium;
2. a uniform Raven Rock S1 tunnel-section pilot;
3. MainStreet/GrandStreet America R4/R5 streets, alleys, garages, public realm,
   service frontage, and wayfinding;
4. the C01 bunker surface-concealment, landform, parking-edge, and mountain-side
   road package;
5. the separately guarded recessed C01 public portal and connector.

The release changed 36,781 unique target cells. It executed 7,269 source
operation groups: 7,265 guarded replacement groups and four intentional command
groups. Every package completed, no group failed, no unexpected no-op was
accepted, no WorldEdit state remained, and all 7,265 rollback guards matched the
installed post-state.

The database received 44 new as-built features and 44 observations across three
new scans. The accepted catalog now contains 824 features, 21 scans, and 1,830
feature observations. The post-state media set contains 91 release screenshots
and a new whole-world atlas plus six detail maps. A standalone Mineflayer walker
completed 44/44 directional route runs covering the tunnel pilot, bunker portal,
both new rear alleys, and all 18 residential garage connections.

## 2. Evidence identities

| Evidence | Immutable identity |
|---|---|
| Pre-release region directory | `data/worldsnap-prerelease2-42545b02f60fa881-20260727/region` |
| Pre-release snapshot SHA-256 | `42545b02f60fa881cb3d7fb82f2b22b1145623fa16e8c674a179113b48c639cf` |
| Pre-release region files / bytes | 26 / 122,744,700 |
| Accepted post-release directory | `data/worldsnap-postrelease-f8edf99494c023dd-20260728/region` |
| Accepted post-release SHA-256 | `f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10` |
| Post-release region files / bytes | 26 / 122,744,700 |
| Atomic transaction | `data/world-review/redevelopment-atomic-transaction-2026-07-27.json` |
| Final machine QA | `data/world-review/redevelopment-post-deployment-qa-2026-07-27.json` |
| Route QA | `data/world-review/redevelopment-route-qa-2026-07-27.json` |
| Database import record | `data/world-review/redevelopment-release-database-import-2026-07-27.json` |
| Post atlas manifest | `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/atlas-manifest.json` |
| Post catalog | `data/exports/world-catalog-post-2026-07-27` |
| Human artifact register | `docs/redevelopment/2026-07-27/artifact-register.md` |
| Machine artifact register | `data/world-review/redevelopment-artifact-manifest-2026-07-27.json` |

The immutable `f8edf994…` post directory is the QA and publication reference.
`data/worldsnap/region` is a refreshed operational mirror and is expected to
continue changing as the server saves ordinary entity and world activity. It
must not replace the immutable directory in an acceptance claim.

## 3. Delivered physical changes

### 3.1 Westlight stadium — `VEN-WL-01`

The bowl no longer points at an empty doorway. A purpose-built 22×24-block
display installation occupies x `-370…-349`, y `72…95`, z `-569…-550`.
The package adds the missing focal object with a dark display plane, frame,
screen face, lower information/ribbon treatment, and event-mode visual
composition.

| Control | Result |
|---|---:|
| Forward guarded groups | 524 |
| Unique target cells | 524 |
| Forward SHA-256 | `fa0c4a086f7bdcd92640d63bd57086ad5d2ebd2230f937ad0fc72b93095011fa` |
| Rollback SHA-256 | `8feb080b459a7b16115bfaef5e54f7c2b9c3aeaa9667e538e5df7cbf4bf8a5ba` |
| Failed groups | 0 |
| Unexpected no-ops | 0 |
| Post views | 48 |

The 48-view post matrix samples eight sectors at lower, middle, and upper
positions in sports and concert modes. It is not a single flattering camera:
the matrix is intended to expose weak seating directions, obstructions, and
mode-specific readability.

### 3.2 Raven Rock S1 tunnel pilot — `INF-RR-01`

The S1 pilot establishes a repeatable tunnel section instead of another
one-off passage. The installed pilot standardizes the clear movement envelope,
lining, floor, lighting, and portal/decision treatment while preserving exact
source states outside the declared cells.

| Control | Result |
|---|---:|
| Forward guarded groups | 335 |
| Unique target cells | 335 |
| Forward SHA-256 | `2869cfea1243b08a81d878a9da9a51c23eda9d3c651fa6ca64ad23577877639e` |
| Rollback SHA-256 | `8dcbc3b11aa4e2ac4caad4c4f2460b55c53db82e5ec145ec5426cbfa1753e5e7` |
| Failed groups | 0 |
| Unexpected no-ops | 0 |
| Matched post views | 2 |
| Bidirectional route result | PASS |

This is a standards pilot, not a claim that every existing Raven Rock tunnel
leg has already been rebuilt. It is the approved reference section for later
rollout. The key difference is that future legs now have a frozen geometry,
material, lighting, landing, and QA pattern instead of being redesigned in
place.

### 3.3 MainStreet/GrandStreet America R4/R5

The residential and public-realm package converts the dispersed development
into a more legible two-street system. It adds two continuous rear alleys,
eighteen house-specific garage/access objects, readable connections between
frontages and service circulation, B02 culinary public-realm consolidation,
B03 warehouse/service-lane consolidation, and six wayfinding landmarks.

The six outer homes were not blindly translated through occupied terrain.
Their vehicle access was resolved by orienting each house to a complete street
or rear-alley connection, giving the neighborhood two coherent movement
fronts. The warehouse and cooking school are visually and functionally pulled
back into the development through finished approach space, service/public
frontage treatment, and connected roads rather than unsafe whole-building
relocation over authored interiors.

| Control | Result |
|---|---:|
| Source operation groups | 5,561 |
| Expanded commands | 5,588 |
| Finite-union guard groups | 27 |
| Expected alternative no-ops | 27 |
| Unexpected no-ops | 0 |
| Unique target cells | 5,561 |
| Garages / access objects | 18 |
| Rear alleys | 2 |
| Forward SHA-256 | `c96958c9ce7c3a2e9d481d5063bc0cbd26d0879068967c1d66ca06943b9b2972` |
| Rollback SHA-256 | `86d9d452dac29d40cffb253a5e31e4d36d4eb6087a0dc1c25e10cb95d61dd1f3` |
| Failed groups | 0 |
| Post views | 28 |

The 27 no-op commands are not missed work. Each belongs to a finite,
exact-state union: multiple allowed source materials express one logical group,
one alternative changes the live block, and the remaining alternatives must
report no change. The group-aware runner accepts only that declared pattern and
would reject an unexpected group no-op.

The post media includes 18 exact garage-object images and 10 matched public
realm/streetscape images. All 18 garage connections and both alleys passed the
independent walker in both directions.

### 3.4 C01 bunker surface and east parking seam — Phase 1

The bunker core was not translated as a monolithic structure. Moving a
completed underground complex would risk internal rooms, redstone/block
entities, authored relationships, and mountain geometry. The engineering
outcome achieves the requested spatial purpose more safely: it changes the
surface landform, completes the east parking/road seam, extends a readable road
along the mountain, hides the exposed concrete mass, and establishes a new
public approach to a recessed portal.

Three complementary landform zones wrap the west, east, and southwest visible
mass. The road/gate package completes the movement edge rather than letting the
parking lot terminate against a visually exposed bunker wall.

| Control | Result |
|---|---:|
| Source groups | 769 |
| Guarded replacement groups | 766 |
| Intentional command groups | 3 |
| Unique target cells | 28,729 |
| Forward SHA-256 | `fa108cc0a18d9cad0980abd8fca0f483a45406688fd9e32e0bf6b2dcf0350233` |
| Rollback SHA-256 | `698cb58c226a90dfa946d8dbbec587fae39b3d48bebe0b334ecb37bbbf94bc3d` |
| Failed groups | 0 |
| Post views | 8 |

The result is an underground complex with its surface expression treated as a
mountain and arrival system, not a freestanding stack of concrete blocks.

### 3.5 C01 recessed public portal — Phase 2

Phase 2 adds the new entrance only after Phase 1 passed and only through a
separately frozen, separately reversible package. It builds a recessed portal,
protected approach, and connector into the existing complex without claiming
that the old core was physically moved.

| Control | Result |
|---|---:|
| Source groups | 80 |
| Guarded replacement groups | 79 |
| Intentional command groups | 1 |
| Unique target cells | 1,632 |
| Forward SHA-256 | `f50ce795daee455c81acb8f1456265f954e24661d99853de50a80d82b9f67e4f` |
| Rollback SHA-256 | `7de8c45fdb418f1d6c7f1ca772dc5b7e616359c616ab2cacff3cd6cc1d5ca640` |
| Failed groups | 0 |
| Post views | 5 |
| Portal route result | PASS, both directions |

The new portal is also the one honest building-media gap in the final catalog:
its exact post screenshot exists, but because it is a newly cut connector rather
than a pre-existing authored interior building, it does not yet have a
standalone floor-plan sheet. Floor-plan coverage is therefore 68/69 rather
than a misleading 69/69.

## 4. Atomic release mechanics

The controller used a fixed order:

1. Westlight;
2. Raven Rock;
3. MainStreet R4/R5;
4. C01 Phase 1;
5. C01 Phase 2.

Before any write, it required:

- five paused fleet bots and no human player;
- no active build mission;
- an exact inventory of the existing force-loaded chunk set;
- an immutable post-flush pre-release snapshot;
- all forward guards evaluated against that exact snapshot;
- a live entity query around every operation envelope;
- matching operation hashes;
- zero cross-package target overlap;
- prepared rollback artifacts.

If any package or report had failed, the controller was prepared to apply
rollback packages in reverse commit order. Because all five packages committed,
the compensation branch was not needed during the accepted transaction.

The transaction machine record remains labeled
`committed-pending-post-qa` because it is an append-only execution-time record.
That wording describes the state at 23:52:21Z. The separate final QA created at
00:37:20Z is authoritative for the later acceptance and is `PASS`.

## 5. Attempt 1, automatic compensation, and correction

An earlier MainStreet execution attempt is preserved rather than erased. It
encountered neighbor-update behavior while applying a source-state plan.
Strict execution reported the problem and automatic compensation restored the
world. The rejected execution report is retained as
`data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.execution.json`.

Engineering then:

1. analyzed the failed live replies;
2. rebased the source plan on the restored world;
3. encoded the small number of neighbor-sensitive source states as finite,
   explicit alternatives;
4. extended the release runner with group-aware strict semantics;
5. regenerated the runtime-safe forward and rollback files;
6. reran generator, runner, and independent QA tests;
7. took a new immutable pre-release snapshot instead of reusing the old one.

Loose wheat-seed item entities left by the compensated update were found by the
subsequent live-entity gate. The gate stopped the release. Sixty-two item
entities named `Wheat Seeds` were removed from the exact affected area, after
which all temporarily force-loaded chunks were released and the pre-existing
force-load set was restored. A new all-package entity gate then passed with zero
blocking entities, no selector saturation, no query errors, and 14 unrelated
nearby entities outside the operation boxes.

This incident is evidence that the release protections worked: the first
attempt did not get relabeled as success, cleanup was bounded, and the accepted
transaction was based on a fresh snapshot and fresh gates.

## 6. Post-state proof

### 6.1 Block and rollback proof

The final QA independently parsed all five forward and rollback artifacts.

| Metric | Result |
|---|---:|
| Packages | 5 / 5 PASS |
| Guarded forward operations | 7,265 |
| Intentional command operations | 4 |
| Unique target cells | 36,781 |
| Cross-package target overlaps | 0 |
| Failed operation groups | 0 |
| Unexpected no-op groups | 0 |
| WorldEdit leftovers | 0 |
| Rollback guards matching installed state | 7,265 / 7,265 |
| Rollback guard failures | 0 |
| Partial rollback guard matches | 0 |

Rollback preflight against the installed post snapshot proves that each
reversible target is in the exact state expected by its rollback operation. It
does not mutate the accepted world; it is a read-only readiness proof.

### 6.2 Independent movement proof

Resident bots are intentionally constrained by their production leash and
minimum-dig safety rules. Rather than weaken those production controls, route QA
used a short-lived independent Mineflayer instrument named `RouteProbe`.
It could walk and pathfind but could not dig or tower. It disconnected after
the run and was removed from the whitelist.

| Route family | Tests | Directions | Result |
|---|---:|---:|---|
| Raven Rock S1 section | 1 | 2 | PASS |
| C01 recessed portal | 1 | 2 | PASS |
| MainStreet rear alleys | 2 | 4 | PASS |
| MainStreet garage connections | 18 | 36 | PASS |
| **Total** | **22** | **44** | **PASS** |

Each test required arrival inside the declared tolerance in both directions.
The production bot configuration was restored before the service’s final
restart; no broad development leash or reduced mining floor remains active.

### 6.3 Visual proof

| Area | Before images retained | Accepted post images |
|---|---:|---:|
| Westlight | 4 | 48 |
| Raven Rock | 2 | 2 |
| MainStreet public realm / same camera | 20 across design attempts | 10 |
| MainStreet exact garage objects | — | 18 |
| C01 Phase 1 | 8 | 8 |
| C01 Phase 2 | 5 | 5 |
| **Accepted post set** | — | **91** |

Every accepted post image is bound to the immutable post snapshot through a
capture report or rendered manifest plus the final QA. The images are evidence
at recorded cameras, not substitutes for the exact block and route checks. Two
of the five C01 Phase 2 post cameras intentionally show unchanged endpoints and
are byte-identical to their before frame; the remaining three document visible
change. The five-image set proves route context and completeness, not five
separate visual deltas.

### 6.4 Map proof

The post atlas loaded 3,808/3,808 requested chunks with zero missing chunks. It
contains:

- one 1792×2176 whole active-world surface map;
- Ravensreach/Old Town detail;
- Ravensgate detail;
- Western Approach detail;
- Westlight venue/district detail;
- western project corridor detail;
- Raven Rock surface-access detail.

The machine atlas inventory, extents, scale, region source, and hashes are in
`data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/atlas-manifest.json`.
Two requested chunks lacked a `WORLD_SURFACE` heightmap and were handled by the
renderer’s decoded-section fallback; neither became a missing or blank map tile.

## 7. Database and object-to-image result

### 7.1 Import delta

| Measure | Before | After | Delta |
|---|---:|---:|---:|
| `world_features` | 780 | 824 | +44 |
| `world_scans` | 18 | 21 | +3 |
| `feature_observations` | 1,786 | 1,830 | +44 |

All 44 feature IDs were unique, all were created on this release, and none
silently overwrote an existing feature. The three scans bind the five physical
design packages to the accepted snapshot and QA record.

Database identities:

- pre-import backup:
  `data/world-map.pre-redevelopment-20260728-0028.db`;
- pre-import SHA-256:
  `2eb3fcf5c8103392f89f9f00e013e5b2ff773b7092cfa47c4e72d0375fa3f8c7`;
- final checkpointed database:
  `data/world-map.db`;
- final database SHA-256:
  `005a714f90e1fc12a42de825b84290d07a9a090d0580b7112b277158e942123d`;
- final size: 2,256,896 bytes.

### 7.2 Final spatial catalog

| Catalog measure | Result |
|---|---:|
| Features | 824 |
| Buildings | 69 |
| Exact building floor plans | 68 / 69 |
| Buildings with any screenshot | 15 / 69 |
| Buildings with exact-object screenshot | 14 / 69 |
| Features with any screenshot | 108 / 824 |
| Features with exact-object screenshot | 37 / 824 |
| Inventoried media files | 195 |
| Linked inventoried media files | 132 |

The catalog generator now consumes `primaryFeatureId` from every release capture
report. This is the crucial database-to-screenshot bridge: a garage image is not
merely filed under “MainStreet”; it is linked to the exact garage feature. The
same rule applies to the bunker portal, surface systems, Raven Rock pilot, and
Westlight screen.

Coverage is intentionally reported honestly. A district context image does not
become proof for every child building, and a floor plan is not counted as a
perspective. The object-media index records relation type, file path, checksum,
dimensions, capture metadata, and source snapshot.

The 68 carried-forward floor plans document unchanged authored interiors and
retain their own earlier snapshot bindings (`4a754a73…` for the integrated
atlas and `8fbf6997…` for its secure-complex supplement). Post surface maps and
release perspectives bind to `f8edf994…`; the catalog does not pretend every
artifact was rendered from one snapshot. Nine catalog overview cameras were
explicitly rerendered from the immutable post directory before publication.

## 8. Operations and safety state after handoff

- `mc-fleet-bot.service` is active on port 3001.
- `mc-fleet-web.service` is active on port 3000.
- No second foreground backend was started.
- The five resident fleet bots remain paused/idle after the release.
- The final service restart uses the normal production safety configuration,
  including the original resident leash and minimum mining floor.
- The temporary RouteProbe account is disconnected and not whitelisted.
- The live world’s normal save activity may advance beyond the immutable QA
  snapshot; acceptance evidence remains pinned to `f8edf994…`.

## 9. Research and design source of truth

The physical work is one implementation wave within a larger researched master
plan. `master-plan.md`, `infrastructure-standards.md`, and
`research-bibliography.md` remain the governing source for later phases,
including:

- human-scale block and street legibility;
- connected street grids and explicit frontage;
- tunnel cross-section families, decision nodes, lighting, stairs, and landings;
- stadium focal geometry and mode-specific sightline sampling;
- underground-facility concealment, defensible portal transitions, and
  parking/service separation;
- accessible route principles translated into the game’s block geometry;
- plot-by-plot review and acceptance gates.

Recommendations in those documents are labeled separately from measured
as-built facts. This completion record supersedes their old “planned” or
“pending” status only for the five packages named here.

## 10. Known boundaries and next controlled phases

The release solves the highest-priority defects without claiming that the entire
world has been rebuilt:

- Raven Rock S1 is the approved tunnel pilot; remaining tunnel legs should be
  surveyed and rolled out as separate guarded packages.
- C01’s core remains in place underground; the surface mass, road seam, and
  public portal were reworked to achieve concealment and circulation without
  hazardous whole-complex translation.
- Building floor-plan coverage has one deliberate gap for the new portal.
- Exact-object perspective coverage rose from 13 to 37 features, but the
  capture program should continue until every building and major circulation
  object has a dedicated current image.
- Ordinary live-world saves after acceptance are not automatically incorporated
  into this dossier. A new publication release requires a new immutable
  snapshot, refreshed maps, and refreshed catalog.

These are managed next phases, not hidden acceptance failures.

## 11. Reproduction commands

The read-only parts of the handoff can be reproduced with:

```bash
node scripts/qa_redevelopment_atomic_release.mjs \
  --pre data/worldsnap-prerelease2-42545b02f60fa881-20260727/region \
  --post data/worldsnap-postrelease-f8edf99494c023dd-20260728/region

node scripts/generate_surface_atlas.mjs \
  --regions data/worldsnap-postrelease-f8edf99494c023dd-20260728/region \
  --out data/exports/box/redevelopment-atlas-post-2026-07-27/team-a

node scripts/generate_world_catalog.mjs \
  --snapshot data/worldsnap-postrelease-f8edf99494c023dd-20260728/region \
  --out data/exports/world-catalog-post-2026-07-27

node scripts/generate_redevelopment_artifact_register.mjs
node scripts/generate_redevelopment_dossier.mjs
```

Live forward operation files must not be rerun against the accepted world.
Their exact source-state guards should no-op or fail because the source state
has already changed. Use the documented post-state QA and rollback preflight
for verification.

## 12. Final acceptance

The release is accepted because all of the following are true at once:

- five package executions are complete;
- the atomic transaction committed without invoking final rollback;
- exact preflight and postflight identities are preserved;
- all rollback guards match the installed state;
- every package passes independent machine QA;
- the live entity gate passed immediately before execution;
- no target overlap exists across packages;
- all declared routes pass in both directions;
- 91 post-state images and seven post-state maps exist;
- database features, scans, and media relations are imported;
- the post catalog and master dossier preserve the immutable post snapshot and
  per-artifact provenance.

Final decision: **ACCEPT `REDEV-2026-07-27-R1` AS BUILT.**

## 13. Sites publication record

The owner-only Sites publication succeeded on 2026-07-28T01:02:52.608646Z.

| Field | Value |
|---|---|
| Title | MC Fleet World Atlas |
| Project ID | `appgprj_6a67cce1a3848191bfb86ef2ef8ab567` |
| Stable production URL | `https://mc-fleet-world-atlas.ianwalmsley.chatgpt.site` |
| Initial published version | 1 |
| Initial source commit | `eff5518cc920aed7bb69103ca051a5e033ff7fd5` |
| Initial deployment ID | `appgdep_6a67ff73f0e88191882ffa2a6303f283` |
| Deployment result | `succeeded` |
| Access | Custom owner-only; no groups and no additional users |

The first production version established the accepted post atlas, 92-object
interactive catalog, nine-view release gallery, database report, machine QA,
route evidence, floor-plan atlas, and master dossier. A subsequent
documentation-rollup version may update the bundled reports without changing
the stable production URL. Sites credentials and bypass tokens are deliberately
excluded from this record.
