# Visual Evidence Program

## Purpose

The visual program is both a review gallery and a reproducible evidence system.
Maps establish spatial context; matched cameras establish visible change;
exact-object screenshots connect a database feature to what a reviewer sees.
None of those replaces block-state or route QA.

## Metadata contract

Every accepted release image records or inherits:

- media ID and file path;
- byte count and SHA-256;
- database `featureId`, `projectId`, and `externalId` when it has a primary
  object;
- relation: exact object, object context, district context, before, after, map,
  section, or defect;
- saved-world snapshot SHA-256;
- camera eye/look target, FOV, resolution, and renderer;
- visible neighboring objects;
- acceptance purpose.

The catalog generator consumes `primaryFeatureId` directly from capture reports.
Filename inference is not required for release images.

## Accepted post-state set

All accepted release media binds to immutable snapshot
`f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10`.

| Package | Post images | Evidence purpose |
|---|---:|---|
| Westlight display | 48 | Eight sectors × three height bands × sports/concert modes |
| Raven Rock S1 | 2 | Matched section views and route context |
| MainStreet R4/R5 | 10 | Same-camera streets, alleys, B02/B03 public realm, wayfinding |
| MainStreet garages | 18 | One exact-object image per house garage/access feature |
| C01 surface Phase 1 | 8 | Landform, exposure, road, gate, and parking seam |
| C01 portal Phase 2 | 5 | Portal mouth, approach, connector, and underground relationship |
| **Total** | **91** | Accepted post-release perspectives |

Baseline images are retained beside the post set wherever a matched camera was
defined. Rejected design-attempt media stays available for incident/history
review but is not counted as accepted post evidence.

## Post-release atlas

Directory:
`data/exports/box/redevelopment-atlas-post-2026-07-27/team-a`

1. Whole active world, north-up, 1792×2176.
2. Ravensreach core and Old Town.
3. Ravensgate.
4. Western Approach road.
5. Westlight venue and district.
6. Western project corridor.
7. Raven Rock surface access.

The atlas decoded 3,808/3,808 requested chunks and reported zero missing. The
manifest records extents, dimensions, scale, output hashes, and the same
immutable post snapshot.

## Database/media coverage

| Measure | Result |
|---|---:|
| Inventoried media files | 195 |
| Linked inventoried media files | 132 |
| Features with any screenshot | 108 / 824 |
| Features with exact-object screenshot | 37 / 824 |
| Buildings with any screenshot | 15 / 69 |
| Buildings with exact-object screenshot | 14 / 69 |
| Buildings with exact floor plan | 68 / 69 |

Coverage distinguishes:

- `exact_object`: the image’s primary evidence target is that feature;
- `object_context`: the feature is central but shown with spatial neighbors;
- `district_context`: useful orientation, not proof for every child;
- `floorplan`: plan evidence, not a perspective;
- `before` and `after`: phase relation, meaningful only with snapshot identity.

## Required recurring capture cycle

Every later redevelopment release repeats:

1. whole-world surface atlas;
2. affected district detail;
3. before cameras captured or validated before mutation;
4. exact-object post cameras for every new database feature where a perspective
   is meaningful;
5. matched route/junction views;
6. post snapshot hash and capture reports;
7. object-media index and orphan/unpictured coverage report;
8. Sites asset refresh.

## Remaining capture queue

The current release materially improves exact-object coverage but does not
pretend the world is fully photographed. Priorities are:

1. the remaining 55 buildings without exact-object perspectives;
2. the new C01 portal’s standalone floor-plan sheet;
3. each Raven Rock tunnel leg, junction, stair landing, and vertical core as it
   is rebuilt;
4. building entrances and street relationships in Ravensreach, Ravensgate, and
   Westlight District;
5. day/night pairs for lighting-dependent public spaces;
6. repeat captures after any future snapshot changes the associated feature.

## Acceptance rules

- An image cannot prove a state from a different snapshot.
- A district image cannot be counted as exact evidence for every child object.
- Missing measurement is `unknown`, never an automatic score of 100.
- Broken path, hash mismatch, absent primary feature, or stale snapshot binding
  is a documentation defect.
- A beautiful screenshot does not override a failed exact-state or movement
  test.
- Published captions must say whether the view is measured evidence,
  before/after evidence, or a future-plan illustration.
