# Wave 2 world-media and database-catalog release

Status: **PASS — offline evidence release complete**

Release date: 2026-07-28 UTC

Scope owner: media/catalog PM workstream

Live-world effect: **none**

## Executive record

This release closes the building-level media register while preserving an
auditable distinction between an exact object view, a contextual image, a
floor plan, and a project-scale map.

The release produced 79 new immutable-snapshot captures:

| Class | New exact-object captures |
|---|---:|
| Buildings missing exact photography | 55 |
| Circulation objects selected for Wave 2 | 24 |
| Total | 79 |

The resulting catalog contains:

| Measure | Baseline | Wave 2 catalog | Gap |
|---|---:|---:|---:|
| Database features | 824 | 824 | — |
| Features with an exact-object screenshot | 37 | 116 | 708 |
| Buildings | 69 | 69 | — |
| Buildings with an exact-object screenshot | 14 | 69 | **0** |
| Buildings with an exact floor plan | 68 | 69 | **0** |
| Inventoried media files | 195 | 343 | — |
| Linked inventoried media files | 132 | 202 | — |

The 708-feature number is deliberately reported. It is not a building gap.
It is the remaining long-tail queue of rooms, parking cells, lighting,
landscape objects, and other database features. Building coverage is complete.

The independent QA report passed:

- 79/79 manifest captures rendered.
- 79/79 cameras are unique.
- 79/79 output paths are unique.
- 79/79 image hashes are unique.
- 79/79 camera targets aim inside the registered object geometry.
- 79/79 images pass the automated visual-content gates.
- 79/79 new captures have an exact-object catalog crosswalk.
- 69/69 buildings have an exact screenshot.
- 69/69 buildings have an exact floor plan.
- No validation failures remain.

The authoritative machine result is
`data/world-review/world-media-wave2-2026-07-28.qa.json`.

## Immutable source

Every Wave 2 perspective and the new recessed-portal plan is pinned to:

| Field | Value |
|---|---|
| Snapshot | `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region` |
| SHA-256 | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` |
| Region files | 26 |
| Bytes | 122,744,700 |
| Algorithm | `sha256(filename + NUL + bytes + NUL, sorted by filename)` |

The generator refuses a different snapshot hash. Rendering decodes copied
Anvil files and does not connect to Minecraft, RCON, the fleet API, or systemd.
The world databases are opened read-only by the catalog generator.

The older 68-building floor-plan set is preserved with its own artifact-level
snapshot provenance. The new C01 recessed-portal supplement uses the Wave 2
snapshot. The combined floor-plan manifest therefore declares
`snapshot.mode = per-artifact`; it does not mislabel old drawings as new
survey work.

## Artifact register

### Human review

- Release plan:
  `data/exports/redevelopment-media-wave2-2026-07-28/release-plan.json`
- Target register:
  `data/exports/redevelopment-media-wave2-2026-07-28/target-register.json`
- Database report:
  `data/exports/world-catalog-wave2-2026-07-28/database-report.html`
- Database report source:
  `data/exports/world-catalog-wave2-2026-07-28/database-report.json`
- Object/media browser:
  `data/exports/world-catalog-wave2-2026-07-28/object-media-index.json`
- Catalog narrative:
  `data/exports/world-catalog-wave2-2026-07-28/README.md`
- QA result:
  `data/world-review/world-media-wave2-2026-07-28.qa.json`

### Photography and capture provenance

- Camera manifest:
  `data/exports/redevelopment-media-wave2-2026-07-28/capture-manifest.json`
- Capture result:
  `data/exports/redevelopment-media-wave2-2026-07-28/capture-report.json`
- Building images:
  `data/exports/redevelopment-media-wave2-2026-07-28/buildings/`
- Circulation images:
  `data/exports/redevelopment-media-wave2-2026-07-28/circulation/`
- Exact route diagrams:
  `data/buildops/world-media-wave2-route-plans-2026-07-28/`

### Floor plans

- Combined manifest:
  `data/exports/world-catalog-wave2-2026-07-28/floorplans/atlas-manifest.json`
- Provenance statement:
  `data/exports/world-catalog-wave2-2026-07-28/floorplans/WAVE2-PROVENANCE.md`
- New portal PNG:
  `data/exports/world-catalog-wave2-2026-07-28/floorplans/structures/mainstreet-america-c01-public-portal-recessed-phase2.png`
- New portal PDF:
  `data/exports/world-catalog-wave2-2026-07-28/floorplans/c01-recessed-public-portal-floorplan.pdf`

The portal drawing records the exact registered bounds
`x=139..147, y=62..69, z=163..201`, the five-block clear route, four-block
clear height, stair locations, grade profile, palette, database ID, source
report, and immutable snapshot hash.

## Database census

### `world-map.db`

`world-map.db` is the cross-project as-built catalog. Its immutable read-only
census for this release is:

| Table | Rows |
|---|---:|
| `world_features` | 824 |
| `world_scans` | 21 |
| `feature_observations` | 1,830 |

Feature counts by project:

| Project | Features | Buildings | Building screenshot coverage |
|---|---:|---:|---:|
| MainStreet America | 621 | 32 | 32/32 |
| Raven Rock | 40 | 5 | 5/5 |
| Ravensgate | 13 | 4 | 4/4 |
| Ravensreach | 63 | 11 | 11/11 |
| Westlight District | 59 | 14 | 14/14 |
| Westlight Venue | 26 | 3 | 3/3 |
| Approach Road | 2 | 0 | n/a |
| **Total** | **824** | **69** | **69/69** |

Feature counts by kind:

| Kind | Count |
|---|---:|
| Building | 69 |
| Custom | 90 |
| District | 19 |
| Driveway | 6 |
| Fence | 14 |
| Landmark | 24 |
| Landscape | 13 |
| Lighting | 55 |
| Parking | 237 |
| Property | 1 |
| Road | 23 |
| Room | 259 |
| Sidewalk | 12 |
| Utility | 2 |
| **Total** | **824** |

Lifecycle status is 823 complete and one removed. Provenance sources are 604
RCON-authored records, 191 manifest records, 28 region-scan records, and one
import record.

Each world feature can carry stable project and external IDs, hierarchy,
world-coordinate geometry, indexed X/Z bounds, lifecycle state, source
reference, confidence, completion and condition measurements, tags, custom
evidence attributes, and revision timestamps. A scan records survey method,
bounds, observer, snapshot, status, and summary. An observation connects a
feature to a scan and stores measured completion, condition, block counts, and
method-specific details.

### `town.db`

`town.db` is operational settlement data and is not a substitute for the
cross-project world catalog.

| Table | Rows |
|---|---:|
| Towns | 1 |
| Districts | 1 |
| Buildings | 12 |
| Residents | 5 |
| Style observations | 3 |
| Chronicle entries | 181 |
| Events | 5,761 |
| Approvals | 0 |
| Bot journals | 0 |
| Disasters | 0 |
| Relationships | 0 |

The registered town is Ravensreach. Its Old Town district uses the
`medieval-communal` style preset. The report includes the 12 operational
building records and their dimensions, origins, source references, build
status, and district relationships.

### Other durable data

The database report inventories JSON-backed operational stores under `data/`
by path, size, and modification time. It intentionally does not reproduce
logs, embeddings, secrets, or token-ledger contents.

## Capture scope

The 79 Wave 2 targets are grouped below. IDs are database `external_id`
values; they are the exact keys used by the media crosswalk.

### MainStreet America — 43

Buildings:

`C02`, `C03`, `C04`, `C05`, `C06`, `C07`, `GRID-E2-BUILDING`,
`GRID-W2-BUILDING`, `H01`, `H02`, `H05`, `H06`, `H07`, `H09`, `H10`,
`H11`, `H12`, `P01-CANOPY-EAST`, `P01-CANOPY-WEST`, `SHL-S01`.

Circulation:

`C01-PUBLIC-PORTAL-APPROACH-PHASE1`, `ROUTE:APT-SHELTER`,
`ROUTE:C01-LOWER-OPERATIONS`, `ROUTE:C01-PRIMARY-STAIR`,
`ROUTE:GRAND-VAULT-STAIRS`, `ROUTE:OBS-PENTHOUSE-PRIVATE-STAIR`,
`ROUTE:OBS-PUBLIC-STAIR`, `ROUTE:OFFICE-HELIPORT`,
`ROUTE:SHELTER-GRAND-VAULT`, `P01-SOUTH-ARRIVAL-CARRIAGE`, `R01`, `R02`,
`R03`, `R04`, `R05`, `R06`, `R07`, `R4-ALLEY-E`, `R4-ALLEY-W`,
`C01-ARENA-HANGAR-WAYFINDING`, `P01-SOUTH-ARRIVAL-WALK-EAST`,
`P01-SOUTH-ARRIVAL-WALK-WEST`, `TRL-S01`.

### Raven Rock — 4

`RR-B1`, `RR-B2`, `RR-B3`, `RR-B4`.

### Ravensgate — 4

`RG-BELL`, `RG-LOGGIA`, `RG-STOA`, `RG-TEMPIETTO`.

### Ravensreach — 11

`RRCH-ARCHITECT`, `RRCH-GRANGE`, `RRCH-LIBRARY`, `RRCH-MARKET`,
`RRCH-MASON`, `RRCH-MOOT`, `RRCH-SCOUT`, `RRCH-STEWARD`,
`RRCH-STOREHOUSE`, `RRCH-SURVEYOR`, `RRCH-TOWN-HALL`.

### Westlight District — 14

`WD-BREW`, `WD-FERRY`, `WD-FIELD`, `WD-GATEHEAD`, `WD-INN`,
`WD-LANTERN`, `WD-SHOP-A`, `WD-SHOP-B`, `WD-SHOP-C`, `WD-SHOP-D`,
`WD-SHOP-E`, `WD-SHOP-F`, `WD-SHOP-G`, `WD-SKIFF`.

### Westlight Venue — 2

`WL-CLUB`, `WL-THEATRE`.

### Approach Road — 1

`APPROACH-ROAD:PRIMARY`.

The five buildings that were already photographed and therefore did not need
a new Wave 2 camera are `B01`, `B02`, `B03`, `RR-Z5`, and `WL-BOWL`. Their
existing exact-object captures and prior immutable capture report are included
as catalog inputs. This is why the final count is 55 new building images plus
five retained prior images plus nine other pre-existing exact building images,
or 69 covered buildings.

## Camera and identity policy

The renderer uses the database geometry, nearby road network, and reviewed
exceptions. It does not guess object identity from a filename after rendering.

Exterior buildings use street-facing or diagonal frontage views. MainStreet
houses and villas use planned frontage schedules so the camera does not settle
on a rear gable. Other buildings score candidate sightlines against their
registered footprint and nearby circulation. Large or nested civic structures
use reviewed high sectional context where one ordinary exterior frame cannot
communicate the registered object.

Underground buildings use named primary rooms:

| Building | Primary room/view |
|---|---|
| `RR-B1` | Operations floor |
| `RR-B2` | Signals operations |
| `RR-B3` | Infirmary |
| `RR-B4` | Maintenance workshop |
| `SHL-S01` | Safe room |
| `WL-CLUB` | Bar and dance floor |
| `WL-THEATRE` | Auditorium parterre |

The evidence-plate format combines the immutable perspective with an exact
object floor plan or exact route diagram. It is used only where a single
perspective would be ambiguous:

- Nine building plates: `SHL-S01`, `RR-B1`, `RR-B2`, `RR-B3`, `RR-B4`,
  `RRCH-SCOUT`, `RRCH-TOWN-HALL`, `WL-CLUB`, and `WL-THEATRE`.
- Nine circulation plates: `ROUTE:APT-SHELTER`,
  `ROUTE:C01-LOWER-OPERATIONS`, `ROUTE:C01-PRIMARY-STAIR`,
  `ROUTE:GRAND-VAULT-STAIRS`, `ROUTE:OBS-PENTHOUSE-PRIVATE-STAIR`,
  `ROUTE:OBS-PUBLIC-STAIR`, `ROUTE:OFFICE-HELIPORT`,
  `ROUTE:SHELTER-GRAND-VAULT`, and `C01-ARENA-HANGAR-WAYFINDING`.

Each route diagram shows the exact registered path in plan and elevation. This
makes horizontal alignment, turns, stations, and grade changes inspectable
even when the path is enclosed in terrain.

## Visual review and correction log

The following issues were rejected during review and corrected before the
release was marked passing:

| Target | Rejected condition | Correction |
|---|---|---|
| `H09` | Blank/failed view | Recomputed planned frontage camera |
| `H01` | Rear/blank gable | Forced planned front camera |
| `C02`, `C03` | Trees dominated view | High diagonal frontage cameras |
| `RR-B1`–`RR-B4` | Dim, anonymous underground frames | Named-room evidence plates |
| `RRCH-MASON` | Camera orientation hid the cottage | Reviewed north/open direction |
| `RRCH-SCOUT` | Overlap with civic core obscured identity | High sectional view plus exact floor plan |
| `RRCH-TOWN-HALL` | Nested shell ambiguous inside Moot Hall | Nested shell sectional view plus exact floor plan |
| `WD-LANTERN` | Camera inside structure | Reviewed north glazed-hall view |
| `C01-ARENA-HANGAR-WAYFINDING` | Surface camera was inside mountain mass | Underground route classification and route plate |
| Gate abstraction | Gate record did not produce a meaningful physical view | Removed rejected file; selected physical `R02`–`R07` road objects instead |

The rejected gate image was removed from the release and is not present in the
catalog.

## Independent QA policy

### Structural gates

QA fails on a mismatched snapshot, target count, report count, duplicate
camera, duplicate output, duplicate target, duplicate image hash, unregistered
feature, camera aimed outside object geometry, missing output, mismatched
capture-report hash, missing portal artifact, or missing exact catalog link.

For paths, the target aim may use a two-block tolerance around the registered
path geometry. For bounded and point features, the look-at point must lie
inside the registered geometry with a 0.01-block numeric tolerance. Camera
distance must be greater than two blocks and less than 230 blocks.

### Image-content gates

The independent image analyzer down-samples each image while excluding the
coordinate overlay. It checks:

- At least 12 KB.
- At least 24 quantized colors.
- Luminance standard deviation of at least 13.
- No dominant, flat central obstruction when center edge detail is too low.
- Overall edge ratio of at least 0.018.

Observed Wave 2 ranges:

| Metric | Minimum | Maximum | Mean |
|---|---:|---:|---:|
| File bytes | 27,456 | 474,681 | 178,989 |
| Quantized colors | 62 | 262 | 158.11 |
| Luminance standard deviation | 18.45 | 93.24 | 38.98 |
| Dominant color ratio | 0.0738 | 0.6613 | 0.2044 |
| Center dominant color ratio | 0.0597 | 0.8059 | 0.2229 |
| Edge ratio | 0.0361 | 0.2165 | 0.1154 |
| Center edge ratio | 0.0375 | 0.2854 | 0.1415 |

These gates catch blank images and many wall/foliage occlusions. They do not
replace human architectural review, which is why the correction log above is
kept as a release artifact.

## Exact-object crosswalk contract

A screenshot counts as exact only when the catalog link has:

- `type = screenshot`
- `relation = exact_object`
- `exists = true`
- an unambiguous `primaryFeatureId` from a capture report, or a reviewed legacy
  mapping
- a concrete file hash and dimensions
- snapshot provenance when the source capture report supplies it

A floor plan counts as exact only when it resolves by project ID and external
ID and the file exists. Project maps use `relation = project_context`; their
presence never fabricates object-level coverage.

Merely discovering a PNG does not create a relationship. Duplicate external
IDs across projects are not auto-linked. A capture report is linked only when
its `primaryFeatureId` resolves to exactly one database feature.

## Reproduction commands

All commands below are offline and read-only with respect to the live world.

### 1. Generate the target register, cameras, route diagrams, and portal plan

```bash
node scripts/generate_wave2_media_release.mjs
```

Use `--refresh` only to refresh this same in-progress release directory without
restaging the inherited floor-plan set.

### 2. Render the immutable camera manifest

```bash
node scripts/render_redevelopment_camera_manifest.mjs \
  --manifest data/exports/redevelopment-media-wave2-2026-07-28/capture-manifest.json \
  --regions data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --out-dir data/exports/redevelopment-media-wave2-2026-07-28 \
  --report data/exports/redevelopment-media-wave2-2026-07-28/capture-report.json
```

The renderer supports `--only <capture-id>` for a reviewed selective rerender.
Any selective rerender must still be followed by a complete QA run.

### 3. Build the distinct Wave 2 catalog

```bash
node scripts/generate_world_catalog.mjs \
  --out data/exports/world-catalog-wave2-2026-07-28 \
  --snapshot data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --surface-atlas data/exports/box/redevelopment-atlas-post-2026-07-27/team-a \
  --media-root data/exports/redevelopment-media-wave2-2026-07-28 \
  --media-root data/exports/redevelopment-qa-2026-07-27 \
  --media-root data/exports/world-catalog-post-2026-07-27
```

The prior catalog media root is required because it contains the five valid
building captures intentionally retained from the preceding immutable release.

### 4. Run independent QA

```bash
node scripts/qa_wave2_media_catalog.mjs \
  --media data/exports/redevelopment-media-wave2-2026-07-28 \
  --catalog data/exports/world-catalog-wave2-2026-07-28 \
  --floorplans data/exports/world-catalog-wave2-2026-07-28/floorplans \
  --out data/world-review/world-media-wave2-2026-07-28.qa.json
```

Expected result: `PASS`, 79 visible/passing images, both catalog and floor-plan
checks true, and an empty `failures` array.

### 5. Run the focused regression test

```bash
npx vitest run test/build/generateWave2MediaRelease.test.ts
```

Expected result: four tests passing.

## Remaining exact-screenshot queue

The building queue is empty. The remaining feature-level queue is retained for
future detailed inspection:

| Kind | Remaining without exact screenshot |
|---|---:|
| Custom | 61 |
| District | 19 |
| Driveway | 6 |
| Fence | 14 |
| Landmark | 24 |
| Landscape | 13 |
| Lighting | 55 |
| Parking | 236 |
| Property | 1 |
| Road | 12 |
| Room | 257 |
| Sidewalk | 8 |
| Utility | 2 |
| **Total** | **708** |

By project:

| Project | Remaining |
|---|---:|
| MainStreet America | 544 |
| Raven Rock | 34 |
| Ravensgate | 9 |
| Ravensreach | 52 |
| Westlight District | 45 |
| Westlight Venue | 23 |
| Approach Road | 1 |
| **Total** | **708** |

Recommended order for a later media wave:

1. The 257 rooms, prioritized by public importance, underground ambiguity, and
   missing wayfinding evidence.
2. The 12 remaining roads, eight sidewalks, and six driveways.
3. Landmarks and landscape features whose visual identity matters to the site.
4. Representative parking and lighting typologies; do not produce 291 nearly
   interchangeable frames without a review purpose.
5. District overview maps after the next accepted physical release, because
   their value depends on a current snapshot.

## Future capture operating procedure

For every new object:

1. Confirm the database feature has a stable project/external ID and valid
   geometry.
2. Copy a fresh saved-world snapshot and compute its immutable hash.
3. Generate the camera from registered geometry.
4. Render from the copied snapshot.
5. Use an evidence plate for an underground, nested, or route object whose
   identity cannot be established by a single perspective.
6. Run structural and image-content QA.
7. Inspect the image manually for wrong frontage, terrain or foliage
   occlusion, interior-wall clipping, and misleading contextual dominance.
8. Link through a capture report; never infer identity from proximity alone.
9. Generate a new catalog directory. Do not overwrite a prior accepted
   catalog.
10. Feed only the accepted catalog and media into the website build.

## Website handoff

The website preparation workstream should consume:

- `data/exports/world-catalog-wave2-2026-07-28/`
- `data/exports/redevelopment-media-wave2-2026-07-28/`
- `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/`
- `data/world-review/world-media-wave2-2026-07-28.qa.json`

The browser should expose both object identity and evidence type. A surface map
must be labeled as project context; an evidence plate must be labeled as a
combined perspective/plan artifact; prior captures must retain their older
snapshot hash.

Do not represent the 708-feature long-tail as a building deficiency. The
public-facing statement supported by this release is:

> All 69 registered buildings have an exact-object screenshot and an exact
> floor plan; 24 additional circulation objects received exact Wave 2
> evidence, and 708 non-building/detail features remain available for later
> granular documentation.

