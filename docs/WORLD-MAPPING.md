# Durable world mapping and as-built surveys

## Why a separate catalog exists

The repository previously had several useful but incompatible views of the
world:

| Store | What it knows | Main limitation |
|---|---|---|
| `data/markers.json`, `zones.json`, `routes.json` | Operator POIs, 2D control zones, waypoint routes | JSON CRUD, no project/dimension identity, building extents, revision, condition, or survey history |
| `data/shared_world.json` | Bot-observed resources, threats, positions, explored chunks | Confidence-decayed working memory, capped and not an authoritative asset inventory |
| `data/build-jobs.json`, `campaigns.json` | Intended schematic origins and execution state | Records jobs, not the structure that actually exists; no roads, grounds, rooms, or later damage |
| `data/town.db` | Town districts and Town Builder building AABBs | Only Town Builder-owned buildings; no general infrastructure or scan provenance |
| `/api/terrain` | Top block sampled near a connected bot | Live-only, radius capped at 64, chunk-cache dependent, and not persisted |
| `data/worldsnap/region/*.mca` | Authoritative offline block snapshot | Raw region data with no named/project-level interpretation |

`WorldFeatureStore` adds `data/world-map.db` as the durable interpretation
layer. It does not replace raw snapshots or the control marker system. It stores
named assets and repeated observations derived from those sources.

## Schema

`world_features` is the current state of an asset:

- stable internal `id` plus idempotent `(project_id, external_id)` for manifest,
  build-job, and plugin imports;
- `project_id`, Minecraft `world`, optional `parent_id` for property → building
  → room hierarchies;
- kind: property, district, building, room, road, driveway, parking, sidewalk,
  fence, lighting, landscape, utility, landmark, or custom;
- status: planned, queued, in-progress, complete, partial, damaged, failed,
  removed, or unknown;
- point, 3D bounds, width-aware path, or polygon geometry;
- indexed XZ bounds for overlap queries;
- source and source reference, 0–1 confidence, completion ratio, 0–100
  condition score, tags, JSON attributes, last observation time, and revision.

`world_scans` records one bounded survey/import run, including method,
snapshot reference, observer, timing, status, and summary.

`feature_observations` records the result for each feature in each scan:
observed status, completion/condition, expected and observed block counts, and
structured findings. Recording an observation also updates the feature's
current condition fields while retaining the historical observation.

SQLite runs in WAL mode. Raw block arrays are deliberately not stored in this
database; region files remain the compact source artifact. This keeps scans
practical on the 2-vCPU host.

## API

The API exposes:

- `GET/POST /api/world/features`
- `GET/PATCH/DELETE /api/world/features/:id`
- `POST /api/world/features/import` — up to 1,000 idempotent rows with
  `externalId`
- `GET /api/world/features/:id/observations`
- `GET/POST /api/world/scans`
- `GET /api/world/scans/:id`
- `POST /api/world/scans/:id/observations`
- `POST /api/world/scans/:id/complete`

`GET /api/world/features` accepts `projectId`, `world`, `kind`, `status`,
`parentId`, `updatedSince`, `limit`, and an overlap box (`minX`, `maxX`, `minZ`,
`maxZ`). These endpoints only change the catalog; they never move bots or write
blocks to the Minecraft server.

The default feature-list limit is 200 and the maximum is 1,000. MainStreet
America currently exceeds the default, so request
`?projectId=mainstreet-america&limit=1000` when exporting the complete project.

Example manifest row for the MainStreet America Guest Center:

```json
{
  "projectId": "mainstreet-america",
  "externalId": "B01",
  "name": "Guest & Design Center",
  "kind": "building",
  "status": "complete",
  "world": "world",
  "geometry": {
    "type": "bounds",
    "minX": -72,
    "maxX": 72,
    "minY": 64,
    "maxY": 76,
    "minZ": 90,
    "maxZ": 165
  },
  "source": "manifest",
  "sourceRef": "docs/mainstreet-america/planning/coordinates.yaml#B01",
  "attributes": {
    "stories": 2,
    "floorplanRef": "docs/mainstreet-america/planning/buildings.yaml#B01"
  }
}
```

## MainStreet America scan/update workflow

1. **Import the design inventory.** Convert the canonical project manifest into
   features with stable external IDs: property envelope, Guest Center, 12 homes,
   cooking school, service warehouse, mountain warehouse/complex, parking,
   roads, sidewalks, fence/gates, lamps, landscaping, and named rooms. Re-running
   the import updates rows instead of duplicating them.
2. **Take a bounded offline snapshot.** Run `scripts/world_snapshot.py` around
   the project envelope after a server flush. Keep the snapshot path and region
   mtimes as the scan's `snapshotRef`; scanning should happen against the local
   `.mca` files, not through hundreds of live bot/RCON calls.
3. **Fingerprint changed chunks.** Persist or compare region/chunk timestamps and
   only decode chunks that changed since the prior scan. The first scan covers
   the full property; later scans are incremental.
4. **Classify expected geometry.** For each feature, compare expected occupied
   blocks/material families and required clear-air volumes. Buildings should
   check shell closure, roof/floor levels, doors, room circulation, and expected
   stories. Roads check surface continuity and headroom; fences check path
   continuity plus declared gate gaps; lamps check expected repeated anchors.
5. **Write one observation per asset.** Record status and completion ratio,
   condition, counts, and explicit defects such as missing roof runs, buried
   roadway, incomplete interiors, disconnected rooms, or floating blocks.
6. **Detect unregistered work.** Cluster manufactured surface blocks outside
   known bounds. Store credible connected components as `custom/unknown`
   candidates with scan provenance rather than silently treating them as
   intentional buildings.
7. **Reconcile build history.** Join persisted build/campaign jobs by external ID
   or overlapping bounds. Failed/cancelled jobs that still contain placed blocks
   become `partial`; completed jobs that fail geometry checks become `damaged` or
   `partial`. This is the reliable way to find work dropped during resource
   pressure.
8. **Plan repairs from the catalog.** Only after human/agent review should defects
   generate build jobs. A subsequent snapshot proves completion. The scanner and
   database remain read-only with respect to Minecraft.

For MainStreet America, the first feature seed should use the corrected as-built
coordinates in `docs/mainstreet-america/qa/as-built-survey.md`, not the older GRID or
OVAL assumptions. In particular: Guest Center `x[-72,72] z[90,165]`, parking
`x[-125,125] z[172,268]`, service warehouse `x[-24,23] z[-278,-232]`, and the
six paired home lots centered around west `x≈-34` / east `x≈32`.

### Current MainStreet America inventory

As of final closure on 2026-07-26, the catalog contains **553 MainStreet
America features**: 552 complete and one removed. The removed record is the
rejected outer water-crossing fence, retained as provenance. The hierarchy
includes the property, 13 division/project districts, 13 active project fences,
32 gates, R01–R07 and their junctions, 31 buildings, 110 rooms, 237 parking
features, 55 lighting features, landscape assets, the complete mountain
program, surface aviation/residence assets, and all three vault levels.

Completed scan `wsc_9d4f2e83d78ad73c` is pinned to the full immutable region
bundle:

```text
data/worldsnap/region:
sha256=78a28b83e1580d436c2ce5cbd044c5853c51c78c8f16d2d860aaa903d8ae10c9
```

It records 222 idempotent final-import observations and the complete source-hash
set for the project grid, boundary/road/build reports, WorldGuard policy, and
96-check closure result. Re-running the importer against the same snapshot and
sources reuses this scan rather than manufacturing a duplicate.

P01 has 319 children, including 236 individual bays, circulation, lighting,
gardens, canopies, arrival structures, and Discovery Court. Its earlier
`wsc_9b65b3830e226db9` scan remains historical parking-phase evidence.

The arena-to-hangar path is a first-class `sidewalk` feature,
`C01-ARENA-HANGAR-WAYFINDING`, from `(207,62,108)` west to `(150,62,108)`.
It is lit, reachable, and represented in the visitor anchors and staged marker
and warp files.

Reproducible project importers:

- `scripts/import_mainstreet_floorplans.js` — named rooms and home hierarchy;
- `scripts/import_mainstreet_parking.js` — bays, aisles, walks, lights, gardens,
  canopies, arrival structures, wayfinding, and the completed recovery scan.
- `scripts/import_mainstreet_project_grid.js` — the canonical final
  project/division hierarchy, roads, fences/gates, mountain/surface/private
  program, source fingerprints, final home-room promotion, and deduplicated
  snapshot scan.

## Legacy migration and compatibility

No automatic migration or dual-write is performed yet. This is intentional:
markers and zones often describe operational intent rather than physical
assets, while town/build records can describe work that never landed in-world.
Blindly combining them would manufacture false as-built facts.

A reviewed one-time importer should map:

- markers → point features, preserving original IDs as `externalId` and notes in
  attributes;
- rectangular zones → property/district/bounds features; circular zones remain
  polygons or custom operational overlays;
- routes → path features after resolving every waypoint marker;
- `town.db` buildings → building features keyed as `town:<buildingId>`;
- build jobs/campaign structures → source references and intended geometry, not
  automatically `complete` status;
- MainStreet YAML → project features with the documented confidence labels.

Existing marker, route, town, build, terrain, and dashboard behavior remains
unchanged. A later dashboard layer can read `/api/world/features` alongside the
legacy overlays while migration is reviewed.

## Remaining evolution

The catalog, API, final MainStreet import, and snapshot provenance are complete.
The generic-scanner enhancement is tracked as OPT-01 in
`docs/OPTIONAL-INITIATIVES-2026-07-26.md`. It can reuse the existing Anvil decoder in
`scripts/world_render.mjs` for projects that do not yet have a project-specific
importer. It should remain read-only, cap parallel decoding to one or two
workers on this host, persist chunk fingerprints, and emit candidate features
for review rather than auto-building repairs.
