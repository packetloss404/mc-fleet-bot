# World catalog and object-linked media

Generated: 2026-07-28T02:41:40.196Z

## Snapshot

- Directory: `data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region`
- SHA-256: `d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999`
- Region files: 26
- Newest copied region mtime: 2026-07-28T02:26:42.000Z

## Database contents

| Store | Purpose | Tables / rows |
|---|---|---|
| `data/world-map.db` | Cross-project as-built catalog and surveys | 875 features, 23 scans, 1881 observations |
| `data/town.db` | Town Builder operational state | 1 town, 1 district, 12 buildings, 5 residents, 5791 events |
| JSON stores under `data/` | Fleet, control, social, task, build, QA, and usage state | 242 inventoried files; contents intentionally not duplicated here |

### World features by project

- approach-road: **2**
- mainstreet-america: **631**
- raven-rock: **81**
- ravensgate: **13**
- ravensreach: **63**
- westlight-district: **59**
- westlight-venue: **26**

### World features by kind

- building: **69**
- custom: **131**
- district: **19**
- driveway: **6**
- fence: **14**
- landmark: **33**
- landscape: **13**
- lighting: **55**
- parking: **237**
- property: **1**
- road: **24**
- room: **259**
- sidewalk: **12**
- utility: **2**

The complete normalized catalog is in `features.json`. Table schemas, row
counts, scans, town records, and the JSON-store inventory are in
`database-report.json`.

## Object-to-media coverage

- 69/69 buildings have exact object floor plans.
- 69/69 buildings have at least one existing screenshot link.
- 69/69 buildings have a reviewed exact-object screenshot.
- 178/875 features have at least one screenshot link.
- 377 screenshot/image files were inventoried.

`object-media-index.json` distinguishes exact-object, contextual,
database-declared evidence-set, and project-map links. This is important:
project and district context images must not be presented as though they prove
every child object individually.

## Map and screenshot entry points

- Comprehensive surface map:
  `data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/00-overall-active-world-surface-atlas.png`
- Surface districts:
  `data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/`
- 76-page interior floor-plan book:
  `data/exports/world-catalog-wave2-post-2026-07-28/floorplans/worldwide-interior-floorplan-atlas.pdf`
- 68 per-building floor-plan PNGs:
  `data/exports/world-catalog-wave2-post-2026-07-28/floorplans/structures/`
- Newer secure-complex floor-plan supplement:
  `data/exports/box/mainstreet-secure-complex-wave5-2026-07-27/`
- Nine new snapshot-pinned perspective captures:
  `data/exports/world-catalog-wave2-post-2026-07-28/screenshots/`
- Exact camera commands and hashes:
  `capture-manifest.json`

## Safe refresh commands

Refresh the copied Anvil snapshot only after coordinating with live builders:

```bash
python3 scripts/world_snapshot.py --near=0,0 --radius 800
```

Regenerate surface maps into a fresh, non-overwriting directory:

```bash
node scripts/generate_surface_atlas.mjs \
  data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a
```

Regenerate floor plans into a fresh directory:

```bash
node scripts/generate_worldwide_interior_atlas.mjs \
  --out data/exports/world-catalog-YYYY-MM-DD/floorplans
```

Regenerate this report and media index:

```bash
node scripts/generate_world_catalog.mjs \
  --out data/exports/world-catalog-YYYY-MM-DD \
  --snapshot data/worldsnap/region \
  --surface-atlas data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a
```

All map, floor-plan, catalog, and perspective generation commands above are
offline/read-only with respect to the Minecraft world. The snapshot refresh
copies saved region files locally and does not issue build operations.

The staged building floor-plan bundle uses 2 immutable sources; use artifacts[].sourceSnapshot.
Supplement status: C01-PUBLIC-PORTAL-RECESSED-PHASE2 at snapshot 4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b. Use each artifact's own
source snapshot and do not relabel inherited drawings with the catalog
snapshot.
