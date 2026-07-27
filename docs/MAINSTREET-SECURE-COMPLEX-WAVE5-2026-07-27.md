# MainStreet secure complex — Wave 5 as-built

Date: 2026-07-27 UTC
Status: **built, saved-world verified, mapped, and promoted to `world-map.db`**

## Outcome

The parking-side C01 bunker, roof observatory, concealed penthouse, private
fallout shelter, and three-level grand vault received a fresh architectural
review and live detail pass.

The final immutable evidence snapshot is:

```text
data/worldsnap-mainstreet-secure-wave5-post-20260727/region
sha256=8fbf6997638da3ef36f200ce73315e0becbea3746ffbc350817cb3d1b0de66ac
```

The saved-world acceptance suite passes **21/21** checks. This includes
bidirectional walks through every new stair and secure route, not just block
counts.

## Fresh design reviews

Three independent read-only reviews preceded the build:

- `data/world-review/c01-bunker-detail-review-2026-07-27.md`
- `data/world-review/observatory-penthouse-detail-review-2026-07-27.md`
- `data/world-review/shelter-vault-detail-review-2026-07-27.md`

They found several conditions hidden by the prior generic “detail” score:

- C01 was reachable but depended on an 82-block scaffold service column;
- the lower theater and three conference rooms were still largely natural
  stone despite being cataloged as complete rooms;
- all three observatory domes sat on solid roof discs and had no working
  lenses;
- the public observatory scaffold crossed the cataloged apartment bedroom;
- the apartment had no actual bed, salon, kitchen, or dining room;
- the safe-room bulkhead had been erased;
- shelter treasury access was one-way;
- shelter bunks were carpet platforms, not beds;
- the grand-vault atrium had no fall protection.

## Live build

The main exact-guarded package is:

```text
data/buildops/mainstreet-secure-complex-detail-wave5-2026-07-27.txt
2,075 guarded operations
28,180 changed cells
sha256=886ed25e9b79725eb76829ef62445742ed02e541f5cf974d0a2f0a115e3edc81
```

The final wayfinding/service-riser package is:

```text
data/buildops/mainstreet-secure-wave5-wayfinding-2026-07-27.txt
6 exact guards + 5 sign-data commands
```

Both packages completed live with zero unresolved operations. The first live
pass exposed 38 outdated block spellings (empty cauldrons and weighted pressure
plates); they were corrected in the source generator and replayed successfully.

### C01 parking-side bunker

- Added the enclosed, two-wide `C01-STAIR-CORE-PRIMARY` at
  `x204..216, y50..110, z152..164`.
- Connected lower operations, C01 upper, shelter level, surface hangar, and the
  second-floor office.
- Retained U01 only as a capped maintenance riser. The old office wording now
  says **SERVICE RISER / MAINTENANCE ONLY** and directs players to the primary
  stair.
- Added level signs at the lower, C01-upper, surface-hangar, and office
  landings.
- Rebuilt the lower theater and conference rooms A/B/C as sealed interiors with
  distinct programs.
- Added a utility aircraft, rotorcraft, rescue vehicle, maintenance clusters,
  operations catwalk, arena bleachers, obstacle/rescue course, triage, decon,
  and targets.
- Preserved the registered public concourse, hangar–arena ribbon, flight line,
  upper service spine, lower cross-concourse, lower spine, and conference
  corridor.

### Working observatory

The observatory now has eight functional spaces:

1. celestial entry gallery;
2. central planetarium;
3. instrument archive/research lab;
4. west visual-dome room;
5. west optics workshop;
6. west observation-log room;
7. east solar/instrument lab;
8. east photo-control room.

All three Y126 roof discs are open around their optical axes while retaining
copper bearing rings. The objective lenses are:

```text
west     190 130 145
central  206 132 143
east     222 130 145
```

Each objective has a tinted-glass face, amethyst focus core, copper bezel,
inclined tube, and a north-facing shutter sightline.

The former 22-block public scaffold at `x183,z161,y99..120` is gone. Public
access is now a separate enclosed switchback stair from the hangar to the roof
terrace.

### Separate concealed penthouse

The penthouse is a distinct private residence off the east observatory
instrument lab. Its principal entry is the concealed stair in
`x218..225,y105..123,z139..149`; the old office bookshelf is emergency egress,
not the main entry.

The residence now contains:

- secure vestibule and separate hardened safe room;
- paneled private library salon;
- twelve-monitor command center;
- dressing lounge and wardrobe;
- actual one-bedroom suite with a double bed and private hangar overlook;
- living salon;
- dining kitchen;
- the existing oversized marble/glass spa, four-head shower, large water-filled
  tub, walk-in closet, double vanity, sanitation, and linen storage.

The safe-to-shelter bulkhead has been rebuilt as a two-wide iron threshold.

### Fallout shelter and grand vault

- Replaced fake bunk platforms with six shelter beds plus one clinic bed.
- Added a real galley, commons table, medical station, dry sanitation/decon,
  radio, crypto, dispatch consoles, and powered-looking displays.
- Corrected both shelter-treasury grade transitions and opened the blocking
  iron-bar strip; treasury access now passes in both directions.
- Added collision balustrades around the upper and middle vault atria without
  narrowing the Titanic-style ceremonial stair.
- Gave each vault level a distinct program:
  - upper: access control, key custody, ledger command, viewing salon;
  - middle: artifacts, appraisal, restoration, secure armory;
  - lower: bullion, mint inspection, disaster reserve, prized plinth.
- Preserved all three loaded shelter chests, all nine loaded grand-vault
  chests, every valuable-material family, dry shells, reinforced crowns, and
  natural cover.

## Navigation

### Public observatory

From the surface hangar, follow **PRIMARY STAIR** to the roof terrace, then the
observatory foyer. The retired scaffold/lightwell is not the route.

### C01 lower operations

From parking-side C01 entry `(116,65,172)`, follow the concourse to the upper
gallery and the signed primary stair at approximately `(210,63,158)`. Descend
to the lower-operations landing `(206,51,154)`.

### Penthouse, shelter, and vault

The penthouse is intentionally unsigned. Enter through the concealed cabinet
door in the east observatory instrument lab. The safe room opens to the
four-wide mountain stair, the shelter, the secure connector, and the grand
vault.

## Verification

The authoritative reports are:

- preflight:
  `data/world-review/mainstreet-secure-complex-detail-wave5-preflight-2026-07-27.json`
  — **2,075/2,075** source guards;
- final wayfinding preflight:
  `data/world-review/mainstreet-secure-wave5-wayfinding-preflight-2026-07-27.json`
  — **6/6** source guards;
- saved-world QA:
  `data/world-review/mainstreet-secure-complex-detail-wave5-saved-world-qa-2026-07-27.json`
  — **21/21**;
- database import:
  `data/world-review/mainstreet-secure-complex-wave5-database-import-2026-07-27.json`;
- final database scan: `wsc_edfbf0742b8587b6`, **41 observations**.

The QA proves:

- both directions through the public observatory stair;
- both directions through the hidden penthouse stair;
- penthouse safe room ↔ shelter ↔ treasury;
- shelter ↔ grand-vault upper threshold;
- all three grand-vault levels in both directions;
- all five C01 primary-stair interfaces in both directions;
- parking arrival ↔ hangar, arena, lower theater, and all three conferences;
- zero remaining public-observatory scaffolding;
- three working objective lenses and open roof apertures;
- real bed blocks in the penthouse and shelter;
- 12/12 loaded chest blocks preserved;
- at least 70 required vault-balustrade cells (95 observed);
- zero water blocks in the shelter and grand-vault envelopes.

## First-class world database

Wave 5 updated 15 existing records and created 26 first-class features on its
initial import. The final map has **579 MainStreet features**, below the
1,000-row query cap. Added records include:

- the primary C01 stair and its route;
- both observatory circulation routes;
- five new observatory rooms and three lens landmarks;
- penthouse vestibule, dressing lounge, living salon, and dining kitchen;
- shelter dormitory, galley/commons, sanitation/decon, and communications
  program;
- three C01 aviation landmarks and two arena zones.

Every promoted feature carries the final snapshot reference, operation hash,
review references, saved-world QA result, and visual evidence.

## Maps and visual evidence

The five-page PDF atlas and five source PNG maps are in:

```text
data/exports/box/mainstreet-secure-complex-wave5-2026-07-27/
```

Key visual inspections:

- `mainstreet-america/qa/msa-secure-wave5-observatory-exterior.png`
- `mainstreet-america/qa/msa-secure-wave5-observatory-interior-wide.png`
- `mainstreet-america/qa/msa-secure-wave5-penthouse.png`
- `mainstreet-america/qa/msa-secure-wave5-grand-vault.png`
- `mainstreet-america/qa/msa-secure-wave5-c01-hangar.png`
- `mainstreet-america/qa/msa-secure-wave5-c01-arena.png`

All images passed the screenshot system’s nonblank, chunk-presence, color,
variance, sky-fraction, and ray-hit checks.

## Box archive

The configured `mc-fleet-bot` Box folder received the complete Wave 5 atlas
package at `2026-07-27T04:22:58.792Z`. The targeted sync discovered and
uploaded **8/8 files** (1,999,380 bytes), with zero unchanged, skipped, or
failed artifacts. The remote path mirrors:

```text
exports/mainstreet-secure-complex-wave5-2026-07-27/
```

The retained upload report is
`data/world-review/mainstreet-secure-complex-wave5-box-sync-2026-07-27.json`.
The as-built document and parent MainStreet audit were also synchronized in a
separate two-file pass with zero failures.
