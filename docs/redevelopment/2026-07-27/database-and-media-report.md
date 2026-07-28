# Database and Media Report

> Baseline sections below preserve the pre-release census for comparison. The
> accepted post-release supplement is in the final section and supersedes
> baseline totals for current as-built reporting.

## Executive finding

The project already has a serious spatial catalog, but its current quality scores
describe whether recorded things exist—not whether they are pleasant to use,
legible, properly oriented, concealed, or well photographed. Of 780 world
features, 779 are marked `complete` and 776 carry a condition score of 100. The
user’s direct observations prove that those saturated scores cannot be treated as
a design-quality verdict.

This report separates:

- physical catalog completeness;
- saved-world observation evidence;
- planning and experience quality;
- media coverage;
- provenance/freshness.

Machine-readable source:

- `data/exports/world-catalog-2026-07-27/database-report.json`
- `data/exports/world-catalog-2026-07-27/features.json`
- `data/exports/world-catalog-2026-07-27/object-media-index.json`
- `data/exports/world-catalog-2026-07-27/capture-manifest.json`

The standalone interactive report is
`data/exports/world-catalog-2026-07-27/database-report.html`.

## Baseline identity

| Item | Value |
|---|---|
| Catalog generated | 2026-07-27T21:37:35.137Z |
| World snapshot SHA-256 | `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654` |
| Frozen local snapshot | `data/worldsnap-redevelopment-c9e2bf0a-20260727/region` |
| Snapshot files | 26 Anvil region files |
| Snapshot bytes | 122,736,507 |
| `world-map.db` SHA-256 | `2eb3fcf5c8103392f89f9f00e013e5b2ff773b7092cfa47c4e72d0375fa3f8c7` |
| Catalog extent | x `-443…305`, z `-640…311.5` |

The original capture manifest names `data/worldsnap/region`. That mutable
directory was copied immediately to the frozen path above and its directory hash
was independently verified unchanged. Future records should store both the hash
and the frozen content-addressed path.

## `world-map.db`

### Tables and row counts

| Table | Rows | Purpose |
|---|---:|---|
| `world_features` | 780 | Durable project/as-built objects with hierarchy, geometry, source, state, and quality fields |
| `world_scans` | 18 | Survey/import runs, bounds, observer, snapshot reference, and run summary |
| `feature_observations` | 1,786 | Per-scan evidence tied to a feature |

### Feature counts by project

| Project | Features | Share |
|---|---:|---:|
| MainStreet America | 579 | 74.2% |
| Ravensreach | 63 | 8.1% |
| Westlight District | 59 | 7.6% |
| Raven Rock | 39 | 5.0% |
| Westlight Venue | 25 | 3.2% |
| Ravensgate | 13 | 1.7% |
| Western Approach | 2 | 0.3% |

The project distribution is intentionally uneven. MainStreet includes every
parking bay as a first-class object, while tunnel legs in Raven Rock are not yet
first-class objects. Raw counts must therefore not be read as a comparison of
project complexity or documentation quality.

### Feature counts by kind

| Kind | Count | Notes |
|---|---:|---|
| `room` | 259 | Functional room/zones; not all correspond to wall-bounded rooms |
| `parking` | 237 | Includes MainStreet’s 236 modeled stalls plus parent parking program |
| `custom` | 68 | Circulation/program objects that do not fit another primitive kind |
| `building` | 68 | Primary building set used by the floor-plan and screenshot program |
| `lighting` | 55 | Lighting systems/groups |
| `district` | 19 | Project/district/block envelopes |
| `road` | 19 | Eighteen MainStreet roads/segments plus the Western Approach |
| `fence` | 14 | MainStreet project/division boundary systems |
| `landmark` | 12 | Navigation or civic landmarks |
| `sidewalk` | 12 | Pedestrian circulation objects |
| `landscape` | 8 | Gardens, landform, pond, and ecology programs |
| `driveway` | 6 | Existing authored driveway objects; inadequate for 18-house garage requirement |
| `utility` | 2 | Utility systems |
| `property` | 1 | MainStreet protected property |

### Source methods

| Source | Count |
|---|---:|
| RCON/as-built measurement | 560 |
| Authored manifest | 191 |
| Region scan | 28 |
| Import | 1 |

Sources are not interchangeable:

- `manifest` proves intended/declared scope;
- `rcon` proves a measured response at a time;
- `region_scan` proves saved-world geometry at a snapshot;
- a successful `import` proves data movement, not physical existence.

## MainStreet America in the catalog

MainStreet’s 579 features comprise:

- 31 buildings;
- 126 rooms;
- 237 parking objects;
- 55 lighting objects;
- 44 custom systems/features;
- 18 roads;
- 14 fences;
- 13 districts/blocks/projects;
- 12 sidewalks;
- 12 landmarks;
- 8 landscape systems;
- 6 driveways;
- 2 utilities;
- 1 property.

Important gaps:

1. Six outer houses (`C02`–`C07`) have incomplete hierarchy/parentage compared
   with the planned block structure.
2. The current six driveway objects cannot represent garages and functional
   vehicle access for all 18 houses.
3. `C01` is named “Earth-covered east operations complex,” while current visual
   evidence shows exposed retaining/hangar/observatory structure from the parking
   and approach. Geometry exists; semantics fail.
4. MainStreet room counts in older reviews are stale. The current database has
   126 MainStreet room features and 259 rooms worldwide.
5. A `complete` import/feature status cannot resolve current complaints about
   spacing, wayfinding, frontage, stair comfort, or arena focus.

## Raven Rock and tunnel gap

Raven Rock contains 39 records:

- 5 buildings;
- 28 rooms;
- 5 custom features;
- 1 district.

The major named tunnel legs, connectors, portal transitions, rotunda, grades,
decision nodes, signs, and typical sections are not modeled as first-class
features. This is why a project can appear 100% complete while S1 width variation,
T2b drift, cave adjacency, and difficult stairs remain invisible to the quality
model.

Required additions:

- one durable feature per tunnel leg/segment;
- node features for portals, rotunda, intersections, landings, and vertical cores;
- explicit centerline and clear-envelope geometry;
- type (`public_spine`, `secondary`, `service`);
- width/headroom/grade/landing/lighting/wayfinding attributes;
- bidirectional route observations;
- before/after images and section maps.

## Westlight stadium gap

Westlight Venue has 25 catalog objects: 3 buildings, 18 rooms, 3 custom objects,
and one district. `WL-BOWL` has functional subdivisions, but no first-class
screen, scoreboard, sightline sector, seat hierarchy, or event-mode object.

Required additions:

- screen/scoreboard object with exact bounds;
- field and stage focal objects;
- eight aisle/sector objects or an equivalent sampling grid;
- lower/middle/upper sample seats per sector;
- sports and concert mode;
- visible-target/sightline result for every sample;
- entry/vomitory relationship and signage.

## Scan and provenance findings

The database contains 18 completed scans. They document early failure,
repair/closure, parking, project-grid import, interior waves, and secure-complex
work. Two issues require correction:

1. At least one supposedly immutable snapshot path was reused and now appears in
   scan records with different hashes. A path without a hash is not provenance.
2. The new worldwide integrated interior book was generated from a validated
   Wave4 census hash
   `4a754a73f5dcd0db512d67e90dcea08ff80d19b6d711c859a0a8d688a4091400`,
   while later secure-complex supplements use
   `8fbf6997638da3ef36f200ce73315e0becbea3746ffbc350817cb3d1b0de66ac`.
   They are both valid evidence, but they are not one current integrated snapshot.

New scan policy:

- snapshot directories are content-addressed and never reused;
- the directory hash algorithm is recorded;
- every region member has a hash;
- each scan records the exact snapshot SHA;
- generated media records the same SHA;
- integrated reports never imply all pages are current when supplements use a
  later snapshot;
- stale artifacts remain available but are labeled.

## Media coverage

### Current exact coverage

| Measure | Coverage |
|---|---:|
| Buildings with exact floor plan | 68 / 68 |
| Buildings with any existing screenshot link | 14 / 68 |
| Buildings with reviewed exact-object screenshot | 12 / 68 |
| Buildings still missing a dedicated exact-object screenshot | 56 / 68 |
| Features with at least one screenshot link | 62 / 780 |
| Inventoried screenshot/image files | 58 |
| Existing object/media links validated | 1,130 |
| Broken/mismatched link validations | 0 |

Floor-plan coverage is excellent. Dedicated perspective coverage is still a
large queue. A project/district image is useful context but must not be presented
as proof of each child building or room.

### New snapshot-pinned captures

Nine 1280×720 offline perspective images were generated from baseline
`c9e2bf0a…`:

| Capture | Primary relation | Purpose |
|---|---|---|
| B01 Guest & Design Center | exact object | visitor/arrival anchor |
| B02 Retail & Cooking School | exact object | frontage and perceived-distance diagnosis |
| B03 Service Warehouse | exact object | terminus/service relationship |
| C01 Mountain Operations | exact + context | concealment and parking-edge baseline |
| MainStreet homes streetscape | district context | two-street and garage program context |
| Ravensreach core | district context | civic settlement context |
| Ravensgate | district context | landmark/route context |
| Westlight stadium/district | `WL-BOWL` exact + context | screen/sightline/arrival baseline |
| RR-Z5 surface access | exact object | Raven Rock portal and tunnel-program context |

Exact commands, cameras, FOV, dimensions, image hashes, and relation targets are
in `capture-manifest.json`.

## Proposed normalized media relation

The current database does not have a media table. Add a versioned
`feature_media` store (database table or immutable manifest promoted by API) with:

| Field | Purpose |
|---|---|
| `asset_id` | Stable media identifier |
| `feature_id` | Exact primary world feature |
| `project_id`, `external_id` | Human/debug-friendly identity |
| `relation` | exact object, object context, district context, defect, before, after, map, section |
| `snapshot_sha256` | Saved-world provenance |
| `scan_id` | Observation run association |
| `path` / `url` | Asset location |
| `sha256` / `bytes` / `dimensions` | Artifact integrity |
| `captured_at` | Time |
| `eye`, `look`, `yaw`, `pitch`, `fov` | Reproducible camera |
| `visible_feature_ids` | Secondary objects shown |
| `phase` | existing, proposed, pre-build, post-build |
| `alt_text` | Accessible semantic description |
| `qa_status`, `qa_notes` | Visual evidence review |

Acceptance:

- every published image has exactly one primary feature or an explicit
  district/project-context relation;
- no filename inference is needed;
- all image paths and hashes validate;
- snapshot mismatch is visible;
- orphan media and unpictured features appear in generated coverage reports.

## New quality model

Keep `completion_ratio` and physical `condition_score`, but add evidence-backed:

- `functional_score`;
- `walkability_score`;
- `legibility_score`;
- `sightline_score`;
- `concealment_score`;
- `media_coverage_score`.

Each quality result needs method, sample set, evidence IDs, timestamp, and
snapshot hash. None may default to 100. A missing measurement is `unknown`, not
perfect.

## Other persistent data

At baseline, `data/town.db` recorded:

- 1 town;
- 1 district;
- 12 town buildings;
- 5 residents;
- more than 5,000 events at catalog generation time;
- 166 chronicles;
- 3 style observations.

The report also inventories 87 persistent JSON files used for fleet, control,
social, tasks, builds, QA, planning, settings, and usage. Runtime JSON stores are
listed rather than copied into the public site so personal/operational material
is not accidentally published.

## Refresh and validation

```bash
python3 scripts/world_snapshot.py --near=0,0 --radius 800

node scripts/generate_surface_atlas.mjs \
  data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a

node scripts/generate_worldwide_interior_atlas.mjs \
  --out data/exports/world-catalog-YYYY-MM-DD/floorplans

node scripts/generate_world_catalog.mjs \
  --out data/exports/world-catalog-YYYY-MM-DD \
  --snapshot data/worldsnap/region \
  --surface-atlas data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a

node scripts/prepare_world_showcase.mjs
```

The last four generators are offline/read-only with respect to the Minecraft
world and databases. `world_snapshot.py` flushes the server save and copies region
files; it does not issue build operations.

## Accepted post-release supplement

Generated 2026-07-28T00:40:27.805Z from immutable snapshot
`f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10`.
The machine-readable report is
`data/exports/world-catalog-post-2026-07-27/database-report.json`.

### Database delta and final identity

| Measure | Baseline | Accepted post-state | Change |
|---|---:|---:|---:|
| `world_features` | 780 | 824 | +44 |
| `world_scans` | 18 | 21 | +3 |
| `feature_observations` | 1,786 | 1,830 | +44 |
| Buildings | 68 | 69 | +1 |
| Road features | 19 | 23 | +4 |
| Custom features | 68 | 90 | +22 |
| Landscape features | 8 | 13 | +5 |
| Landmark features | 12 | 24 | +12 |

The database import created 44 features and updated zero. Its precondition was a
`PASS` final QA report bound to the same immutable post snapshot. The complete
import response, feature IDs, scan IDs, and observation counts are retained in
`data/world-review/redevelopment-release-database-import-2026-07-27.json`.

| Database artifact | Bytes | SHA-256 |
|---|---:|---|
| Pre-import backup `data/world-map.pre-redevelopment-20260728-0028.db` | 1,847,296 | `2eb3fcf5c8103392f89f9f00e013e5b2ff773b7092cfa47c4e72d0375fa3f8c7` |
| Final checkpointed `data/world-map.db` | 2,256,896 | `005a714f90e1fc12a42de825b84290d07a9a090d0580b7112b277158e942123d` |

The 44 additions describe the installed Westlight screen, Raven Rock pilot,
MainStreet garages/alleys/public realm/wayfinding, C01 road and landform, and
the recessed C01 portal. They are not generic release notes: each feature has
stable project/external identity, geometry, parentage, status, source, source
reference, snapshot/QA attributes, and an observation in a completed scan.

### Final media coverage

| Measure | Accepted post catalog |
|---|---:|
| Features | 824 |
| Features with any screenshot | 108 |
| Features with exact-object screenshot | 37 |
| Buildings | 69 |
| Buildings with exact floor plan | 68 |
| Buildings with any screenshot | 15 |
| Buildings with exact-object screenshot | 14 |
| Inventoried media files | 195 |
| Linked inventoried media files | 132 |

The exact-object feature screenshot count increased from 13 at baseline to 37.
The important implementation change is not only a higher count:
`scripts/generate_world_catalog.mjs` now reads `primaryFeatureId` from release
capture reports. A rendered garage, portal, screen, or tunnel image can
therefore resolve to the exact database feature without filename guessing.

The accepted release added 91 post images:

- 48 Westlight sector/band/mode views;
- 2 Raven Rock section views;
- 28 MainStreet views, including 18 exact garage objects;
- 8 C01 surface/road/landform views;
- 5 recessed C01 portal views.

The one missing building floor plan belongs to the new recessed C01 portal. It
has an exact post screenshot and database geometry but no standalone authored
interior sheet. Reporting 68/69 preserves the distinction between physical
existence, perspective evidence, and plan evidence.

The 68 existing floor-plan sheets were carried forward because their authored
interiors did not change in this surface/circulation release. They retain their
own earlier snapshot bindings: the integrated atlas is pinned to
`4a754a73f5dcd0db512d67e90dcea08ff80d19b6d711c859a0a8d688a4091400`
and the secure-complex supplement to
`8fbf6997638da3ef36f200ce73315e0becbea3746ffbc350817cb3d1b0de66ac`.
They were not misrepresented as new `f8edf994…` renders.

At post-catalog generation, `town.db` reported one town, one district, 12
buildings, five residents, 5,487 events, 176 chronicles, and three style
observations. It remains an operational town database, distinct from
`world-map.db`.

### Post-release refresh commands

```bash
node scripts/generate_world_catalog.mjs \
  --snapshot data/worldsnap-postrelease-f8edf99494c023dd-20260728/region \
  --out data/exports/world-catalog-post-2026-07-27

node scripts/prepare_world_showcase.mjs \
  --source data/exports/world-catalog-post-2026-07-27 \
  --surface data/exports/box/redevelopment-atlas-post-2026-07-27/team-a
```

The accepted public/reporting source is the `post` catalog. The baseline catalog
is deliberately retained for before-state comparison and should not be
overwritten.
