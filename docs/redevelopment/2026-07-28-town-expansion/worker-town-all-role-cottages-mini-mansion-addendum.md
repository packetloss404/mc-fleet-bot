# Worker Town Role-Cottage Mini-Mansions — Manager Vale Garage Addendum

**Status:** coordinate design and offline validation complete; not a build release and not a live-world completion claim.  
**Authoritative offline baseline:** `data/worldsnap-town-expansion-prerelease-20260728T0930Z/region`, SHA-256 `f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e`. The exact old-to-fresh state and protected-NBT reconciliation is recorded in `evidence/town-expansion-fresh-snapshot-repin-audit.json`.  
**Machine schedule:** `worker-town-all-role-cottages-mini-mansion-coordinate-schedule.json`, schema `3.0.0`.  
**Binding garage correction:** five physically attached automotive garages, exactly **24 bays**: Architect 6, Steward 6, Mason 4, Surveyor 4 and Scott/`RRCH-SCOUT` 4. A service or carriage room counts as zero automotive bays.

## Executive decision

All five mid-level-management residences relocate to a coordinated neighborhood called **Manager Vale**. Trying to leave any one of them in place fails the combined requirement for a larger house, a physically attached four- or six-car garage, a usable apron and turning envelope, a safe pedestrian entrance and a connected vehicle street.

This is a deliberate relocation decision, not convenience:

| Source residence | In-place constraint | Binding resolution |
|---|---|---|
| Architect | constrained civic lane and documented water at `(-121,67,-366)` | move to upper Manager Vale; retain the old shell as a design archive and preserve the water |
| Steward | civic frontage and documented water at `(-115,67,-336)` | move to upper Manager Vale; retain the old shell as a records/services cottage and preserve the water court |
| Mason | west canal and Grange-owned/ambiguous south-edge cells | move south of R07; preserve canal, coping, walk and Grange cells |
| Surveyor | pinched between Storehouse, Moot Hall and public paving | move north of R07; adapt the old shell as a map pavilion after NBT reconciliation |
| Scott / historical `RRCH-SCOUT` | existing 65-column overlap with Market Hall | move north of R07; remove only independently attributed Scout fabric and preserve Market/ambiguous cells |

Every selected Manager Vale parcel and the three road envelopes were resurveyed against the immutable snapshot. The selected extents contain **zero surface-water columns and zero block entities**. Natural height variation is retained outside explicit building, apron and carriageway cells.

## Corrected five-cottage census

| Historical/external object | World feature ID | Town building ID | Current inclusive bounds | Protected block entities |
|---|---|---|---|---:|
| `RRCH-ARCHITECT` | `wft_220824ed60db1af7` | `bld_handbuilt_0` | `[-124,67,-380,-112,77,-370]` | 7 |
| `RRCH-MASON` | `wft_fdb1a03cd6ec1b4a` | `bld_handbuilt_1` | `[-58,67,-380,-46,77,-370]` | 10 |
| `RRCH-SURVEYOR` | `wft_930a8db31b6cb14e` | `bld_handbuilt_2` | `[-91,67,-407,-79,77,-400]` | 6 |
| `RRCH-STEWARD` | `wft_82ac911e83071c18` | `bld_handbuilt_3` | `[-118,67,-350,-106,77,-340]` | 9 |
| `RRCH-SCOUT` (historical alias; public label **Scott House**) | `wft_a15eecb25e08cc19` | `bld_handbuilt_4` | `[-64,67,-350,-52,77,-340]` | 9 |

The frozen protected-state ledger totals **41 block entities**: 10 chests, 9 barrels, 11 bed blocks, 7 furnaces, 3 lecterns and 1 chiseled bookshelf. The schedule lists every exact source coordinate. No inventory-bearing object may be broken and reconstructed from a guessed item list.

## Manager Vale master plan

```text
                                   north / -Z

     Upper Street, 7-wide, z -317..-311  ===============================+
                                                                          |
        Architect House                   Steward House                    |
     [house][6-car garage]  <14-wide>  [6-car garage][house]              |
                              court                                       |
                                                                          |
                                                              East        |
                                                              Connector   |
                                                              7-wide      |
                                                                          |
          Surveyor House                         Scott House               |
       [house above 4-car]                    [house above 4-car]          |
                                                                          |
     R07 West Extension ==================== existing R07 / Service Cross =+
                         [4-car][Mason House]

                                   south / +Z
```

The diagram is schematic; the JSON coordinates are authoritative.

### Vehicle network

| Segment | Inclusive envelope | Finished centerline and engineering rule |
|---|---|---|
| Upper Street | `[-145,45,-317,-49,100,-311]` | seven-wide; grade nodes run y `68..70` along z `-314` |
| East Connector | `[-55,45,-310,-49,100,-215]` | seven-wide; descends from y `70` to y `64`; no steeper than 1:5, using ten-block transition runs |
| R07 West Extension | `[-132,45,-221,-84,100,-215]` | seven-wide at nominal y `64`; joins existing R07 at `(-84,64,-218)` |
| Upper Garage Court | `[-105,45,-310,-92,100,-282]` | fourteen-wide slow-speed shared court; Architect doors face east, Steward doors face west |

Upper Street was moved onto the surveyed `68..71` contour. A rejected straight route through z `-277..-269` crossed a ridge with surface values up to y `89`; representing that as a normal street would have required an implausible slab or unsafe grade. The chosen East Connector follows the gentler eastern descent. The future compiler may lengthen a grade transition but may not steepen it.

Pedestrians do not enter through garage doors. Architect and Steward have raised entry crossings from Upper Street. Surveyor, Scott and Mason have side walks that reach their public doors without using a backing aisle. Every residence still has a broad main stair and a remote second stair; ladders are not primary circulation.

## Exact garage program

| House | Destination reservation | Occupied building envelope | Attached garage | Door orientation | Bays |
|---|---|---|---|---|---:|
| Architect | `[-145,45,-310,-99,110,-282]` | `[-144,69,-309,-106,96,-283]` | `[-118,69,-309,-106,76,-284]` | east into shared court | 6 |
| Steward | `[-92,45,-310,-49,110,-282]` | `[-91,69,-309,-58,92,-283]` | `[-91,69,-309,-79,76,-284]` | west into shared court | 6 |
| Surveyor | `[-130,45,-259,-94,110,-222]` | `[-129,64,-258,-95,88,-233]` | `[-129,64,-245,-112,71,-233]` | south to R07 extension | 4 |
| Scott / `RRCH-SCOUT` | `[-82,45,-259,-57,110,-222]` | `[-81,64,-258,-58,88,-233]` | `[-81,64,-245,-64,71,-233]` | south to existing R07 | 4 |
| Mason | `[-130,45,-214,-94,110,-174]` | `[-129,64,-203,-95,88,-175]` | `[-129,64,-203,-112,71,-191]` | north to R07 extension | 4 |

Each counted bay has its own inclusive interior rectangle and its own exterior door opening in the schedule. Each garage shares a wall plane with an occupied house component and has a separate house-access door through a small fire lobby. Each also has a declared apron, turning envelope and polyline to the street. Decorative carts, maintenance alcoves and storage areas do not add to the count.

## House and floor-plan program

The five houses share a neighborhood language—local stone/cobble stepped plinths, muted plaster, dark timber framing, steep deepslate roofs, restrained copper and warm lanterns—but they are not clones. Roof breaks, garage placement, entry rhythm, role rooms and garden orientation vary.

### Architect House

The west occupied wing and east six-car garage form an L-shaped mansion. The garage and front rooms use the lower y `69` datum; planted stone plinths step the house into the western rise rather than shaving down the parcel.

- Ground: entry/stair reception, drafting/model studio, client office/archive, great room, formal dining and kitchen/pantry/scullery.
- Upper: primary suite, design library, two guest/family bedrooms and the furnished adult private suite.
- Exterior: south covered patio and a stepped design garden.

### Steward House

The west six-car garage and east occupied wing mirror the Architect court without mirroring its room plan. The source cottage's records identity moves into a purpose-built office rather than disappearing.

- Ground: entry/stair, steward office/records counter, great room, formal dining, kitchen/pantry/scullery and household sitting/service room.
- Upper: primary suite, two guest/family bedrooms, manager library and furnished adult private suite.
- Exterior: south patio, planted rear court and a separate remote stair.

### Surveyor House

Surveyor is an L-shaped two-floor residence on the broad y `64` bench. The four-car garage occupies the southwest lower wing; the east occupied wing gives it a real internal connection. The isolated higher north-west contour remains a planted lookout mound.

- Ground: map studio, field office/archive, stair lobby, great room, dining and kitchen.
- Upper: primary suite, chart library, two guest/family bedrooms, sitting/linen room and furnished adult private suite.
- Exterior: lookout garden, short planted steps and side pedestrian entry.

### Scott House

Public signs and resident-facing records say **Scott House** and **Scott**. `RRCH-SCOUT` remains the stable historical/external alias until cottage, room, resident, media and route foreign keys can be migrated atomically. This prevents another name split and does not create a second resident.

- Ground: field-gear/drying room, stair lobby, route-planning office, great room, dining and kitchen.
- Upper: primary suite, two guest/family bedrooms, briefing library and the largest furnished adult private suite.
- Exterior: scouting garden on the retained north/east contour and a side pedestrian entry.

### Mason House

Mason stands south of R07 on the naturally flat y `64` bench. The four-car garage faces north while the house and patio extend south. Shallow swales, specimen trees and a two-step rear garden prevent the site from becoming a grass slab with a box on it.

- Ground: side entry, broad stair lobby, clean masonry studio, great room, dining and kitchen.
- Upper: primary suite, two guest/family bedrooms/sample library and furnished adult private suite.
- Exterior: south covered patio and planted material-sample garden.

The machine schedule freezes **55 named rooms**: Architect 11, Steward 11, Mason 10, Surveyor 12 and Scott 11. Same-level room rectangles have zero intersections and every room is inside its building envelope.

## Adult private-suite design

The desired theme is expressed through the plan, furniture, color, privacy and material detail—not figures or explicit depictions. Every house has one adults-only suite containing:

- a privacy vestibule that breaks the view from the household corridor;
- an oversized canopy/four-poster bed platform with two-block-clear circulation;
- a chaise or upholstered lounge;
- one suspended lounge chair on an independently rated frame;
- deep-red textiles, dark wood, blackened metal, layered curtains and low warm lighting;
- a dressing vanity and screen;
- closed, lockable toy/prop cabinetry with nothing graphic displayed;
- a private wash/cleanup niche with cleanable finishes.

The suite is never part of required egress. Its door releases from inside without a key, tool or special knowledge. It has no direct sightline from a role office, kitchen, family bedroom, public lane or scheduled exterior camera. Evidence images may document architecture and furniture only after privacy/content review.

## Protected-object and source-site migration

The relocation transaction must use this order for every house:

1. read complete source block-entity NBT and inventory;
2. hash and record source coordinate/state/NBT;
3. construct and validate the destination room and its exact receiving coordinate;
4. write destination NBT and verify the after hash;
5. only then alter independently owned source-shell cells;
6. revision the database object and room geometry atomically;
7. retain old/new object, room and media crosswalks.

Special source exclusions remain binding:

- Scout/Market Hall's 65-column overlap requires cell attribution; Market-owned and ambiguous cells are untouchable.
- Mason's canal, coping, walk and Grange shared edge remain intact.
- Architect's and Steward's documented water columns remain contained at their old sites.
- Surveyor's old pavilion conversion may not narrow the Storehouse-to-Moot public route.

## Evidence contract

The schedule freezes **45 camera candidates**, nine per house:

- matched source-site before/after;
- matched destination-site before/after;
- garage doors, apron and street relationship;
- garden/patio and terrain treatment;
- ground-floor role-to-household view;
- upper-floor bedroom/gallery view;
- non-graphic adult-suite furniture context.

Every matched pair must preserve eye, look-at, FOV, time and weather. A discovered PNG is not assigned to an object by filename alone.

## Offline design validation

The schema `3.0.0` schedule passed the coordinate/count validator:

| Check | Result |
|---|---:|
| role residences | 5 |
| relocated residences | 5 |
| physically attached garages | 5 |
| exact automotive bays | 24 |
| bay capacities | 6 + 6 + 4 + 4 + 4 |
| individual door openings | 24 |
| house/garage shared walls | 5 |
| garage/house access doors | 5 |
| aprons and turning envelopes | 5 + 5 |
| street routes | 5 |
| protected source block entities | 41, all unique |
| named rooms | 55 |
| same-level room intersections | 0 |
| evidence cameras | 45 |
| selected-parcel/road water columns | 0 |
| selected-parcel/road block entities | 0 |

This PASS validates the design schedule only. It does not claim that terrain, roads, houses, inventories, databases or screenshots were changed.

### Compiler second-pass correction — 2026-07-28

The dedicated exact-cell compiler initially failed closed on one unreviewed
interface: the Scott House remote-stair box reached east to `x=-55` and placed
a tread in the East Connector's cleared vehicle headroom at
`(-55,67,-252)`. The same review also found that the Steward remote-stair box
extended beyond its house shell, and that the Mason remote stair offered only
seven straight run cells for an eight-block rise.

The coordinate schedule was corrected before any release:

- Scott remote stair: `[-63,64,-252,-60,80,-245]`;
- Steward remote stair: `[-63,69,-291,-60,85,-284]`; and
- Mason remote stair: `[-128,64,-182,-125,80,-175]`.

All ten stair systems now remain inside their parent building shell and compile
as two-block-wide straight runs with one-block-per-tread grade, two-block
headroom, level-floor landings and required bidirectional post-state walking
tests. The compiler separately classifies every internal model override and
requires zero unreviewed cross-scope overrides.

## Release gates

No live execution is authorized by this addendum. A build package remains blocked until:

1. a fresh same-moment immutable snapshot reproduces the five source objects, 41 protected block entities and selected dry destination conditions;
2. every changed cell has an exact source-state guard and bijective rollback;
3. all 41 NBT transfers have source/destination hashes and zero loss or duplication;
4. all 24 bays pass door-to-street vehicle sweeps and all pedestrian entries pass bidirectional normal-walk tests;
5. the East Connector proves a maximum 1:5 grade with two-block headroom and no whole-reservation flattening;
6. Market, Grange, canal, water and civic-route exclusions pass;
7. all 55 rooms, ten stair systems and five private suites pass geometry, furnishing, privacy and egress review;
8. Scott/`RRCH-SCOUT` reconciles one resident to one cottage with no orphan or duplicate;
9. all 45 cameras, matched pairs, floor plans, database imports and second-pass visual defect review pass.
