# Object Evidence and Second-Pass QA Standard

**Status:** binding release and documentation gate for every object built in the
2026-07-28 Town Expansion R1 session

An operation file completing without error is not final acceptance. Every
individual building, infrastructure object, landscape object, underground
route, and planned Phase 0 envelope needs a database identity and a matched
visual second pass.

## Required object record

Each object receives:

- stable object ID and parent district ID;
- official display name and build status (`BUILT`, `PHASE_0`, `PLANNED`,
  `RESERVATION_ONLY`, or `RETAINED`);
- exact XYZ bounds and entrance/route anchors;
- purpose, complete room/feature schedule, material palette, floor levels, and
  capacity/count contracts;
- generator scope(s), source snapshot hash, forward operation hash, rollback
  hash, and deployment journal reference;
- dependencies and explicit non-connections/exclusion zones;
- protected block-entity, live-entity, fluid, terrain, and cross-scope results;
- before, first-pass after, defect, and final second-pass media IDs;
- route/access results and final acceptance decision.

## Matched camera method

1. Freeze a camera ID, position, yaw, pitch, field of view, target object ID,
   and intended visible features before deployment.
2. Capture or render the before view using that camera definition.
3. Reuse the same definition for the first-pass after image.
4. Record every visible defect against the object and camera ID.
5. Correct accepted defects through a new guarded operation/rollback package.
6. Recapture the same camera for the second pass.
7. Add detail/interior cameras only when they document a different acceptance
   condition; do not substitute them for the matched overview.

## Minimum visual set

- one matched exterior/overview before and final pair;
- one arrival/entrance view;
- one circulation/wayfinding view;
- one interior or programmed-detail view for each public floor or major
  underground level;
- one infrastructure/service view where relevant;
- one terrain/landscape integration view;
- additional count-verification views for seats, rooms, racks, garages, future
  envelopes, power yards, tower/satellite elements, or similar contracts.

## Second-pass checklist

- building and landscape sit naturally on the surveyed terrain;
- no exposed floating slab, raw cut wall, accidental water leak, dry lake gap,
  or unplanned void;
- roads, walks, doors, stairs, landings, lifts, parking, loading, and exits
  actually connect;
- major rooms are easy to distinguish and audiences face a real stage/screen;
- no seat, rack, bed, vehicle, tree, billboard, or decorative block obstructs a
  route or entrance;
- façades, roofs, rear/service elevations, basements, and support rooms have
  deliberate detail rather than a finished front and empty back;
- district spacing and sightlines make the next destination understandable;
- adult venues remain architectural and non-graphic;
- planned/Phase 0 objects cannot be mistaken for completed buildings;
- every database object has its own usable media, not a loosely related district
  screenshot.

## Acceptance outputs

The database object is `FINAL_ACCEPTED` only when:

- the guarded deployment and rollback records verify;
- post-build world state matches the target;
- all route, entity, fluid, geometry, and count checks pass;
- the first visual pass has a closed defect log;
- matched second-pass media exists and is nonblank;
- the PDF, Sites object page, Box manifest, and object/media crosswalk all point
  to the same hashes.
