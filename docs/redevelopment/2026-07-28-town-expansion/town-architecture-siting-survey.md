# Town Expansion Architecture and Siting Survey

Status: **survey/design basis; not a physical release**  
Date: 2026-07-28 UTC  
Source state: accepted immutable Wave 2 post snapshot
`d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999`

## Executive decision

The program is buildable, but not as one undifferentiated construction package.
The recommended sequence is:

1. complete the Moot penthouse as a refit inside its recorded envelope;
2. remove the Amsterdam terrace only after an exact protected-cell comparison,
   then build the bowed longhouse and court;
3. treat the library expansion as a stepped/cantilevered civic project because
   the four-times footprint is 29 percent water;
4. build the Guild Hall on the dry east parcel as the pavilion's terminating
   civic anchor;
5. form Westlight as a stadium-island district with a porous pile-supported
   pier, crater lake, westward paired parks and continuous public green loop;
6. terrace the housing rather than flattening its steep parcels;
7. use the surveyed dry MainStreet warehouse core only; and
8. hold the warehouse vehicle ramp until a watertight west portal or an
   alternate surface portal is designed.

No live world, database, Sites or Box state was changed by this survey.

## 1. Ravensreach civic ensemble

### 1.1 Moot penthouse

The database records the penthouse at x `-99..-71`, y `87..98`,
z `-391..-367`. The current south oblique and block census show a complete but
visually blunt top volume: it reads as a rectangular cap rather than the paid-for
culmination of the nine-floor Moot stack.

Keep the footprint and stair landing. Recompose the shell as a symmetrical
great-room suite with a recessed central lantern, four roof corners, a deep
south loggia, private dining/library rooms behind the great room and a
continuous parapet walk. The lift/stair core remains the fixed datum. The
release must be an exact-cell refit with matched before/after cameras; it must
not demolish the floor support at y=87.

### 1.2 Period longhouse and courtyard

The six Amsterdam houses occupy x `-104..-67`, z `-352..-346` and overlap the
broad Moot database envelope. That overlap is a stop condition until the next
snapshot identifies every exact shared cell.

The replacement envelope is x `-104..-75`, y `67..88`, z `-356..-342`, with
the court at x `-105..-67`, z `-365..-357`. The long axis runs east-west.
Use bowed long walls, a high timber roof, opposing long-wall doors, gable
service doors, a central double-height hearth hall, west service bay and east
lodging/work bay. The court needs a well, kitchen garden, timber gallery,
covered work edge and a direct civic-square threshold.

That translation follows Denmark's National Museum description of Viking
longhouses—bowed long walls, gable and long-wall entrances, and houses grouped
around courts—without copying a reconstructed building:
[National Museum of Denmark, Viking homes](https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/the-people/viking-homes/)
and the museum's
[Trelleborg district plan](https://en.natmus.dk/fileadmin/user_upload/Editor/natmus/Trelleborg/Vikinge_age_ring_fortresses/Trelleborg_districtplan_1224.pdf).

### 1.3 Library, terrace and pavilion

The current library floor plate is 782 cells. The proposed x `-178..-111`,
z `-448..-403` plate is exactly 3,128 cells, four times the recorded plate.
It is not a flat-building site: 904 of 3,128 surface columns are water, and
support elevations run from a p10 of 62 to a p90 of 98.

The accepted concept therefore uses three structural attitudes:

- retain and refit the present six-level library as the east reading stack;
- step new closed stacks and reading rooms into the high west terrain; and
- bridge/cantilever public rooms over the low/wet middle with visible piers.

The two-level concrete walk-out terrace occupies x `-110..-96`,
z `-447..-433`, with support/landings at y `75`, `71` and `67`. Use a broad
accessible switchback beside the ceremonial stairs. Do not resurrect the old
glass pavilion: it was deliberately removed. The current civic middle is the
Ravensgate Garth, Loggia, Stoa, campanile and belvedere. The new terrace must
connect to that as-built ensemble.

### 1.4 Guild Hall

The preferred dry parcel is x `-59..-7`, z `-462..-418`; its surface is
predominantly y `63..67` and has no surveyed water columns. Floors are y
`53`, `60`, `67`, `75` and `83`: two basements and three public/residential
stories.

The pavilion/Garth remains the middle hinge: library on the west, Guild Hall on
the east. The hall receives four kitchens, dormitories, living rooms, lecture
hall, theater, dance hall and bar. Its architecture should spend money on
craft, not merely scale: a stone plinth, deep carved entry, layered roof,
lanterns, guild heraldry, gallery stairs, acoustic ceilings and visibly
different public, resident and service routes. The detailed room schedule and
bar research are in
`guild-hall-and-bar-source-of-truth.md` and `guild-hall-program.json`.

The Library of Congress is a useful public precedent for the way a single
institution can layer reading, ceremonial and event rooms around a legible
central composition:
[Jefferson Building floor plans](https://www.loc.gov/visit/maps-and-floor-plans/thomas-jefferson-building/first-floor/)
and
[event facilities](https://www.loc.gov/about/host-an-event-at-the-library/event-facilities/).

### 1.5 Town infill rule

Fill blocks, not leftover rectangles. Every infill parcel must have a public
front door, rear/service address, courtyard or garden role, roof hierarchy and
database ID. Preserve a readable hierarchy of civic frontage, lane, mews and
service edge. The UK National Model Design Code supports this block/street
discipline, defined building lines, active frontages and context-specific
movement hierarchy:
[National Model Design Code Part 2](https://www.gov.uk/government/publications/national-model-design-code/national-model-design-code-part-2-guidance-notes-html-accessible-version).

## 2. Stadium approach, oasis and bunker

Widen the Ravensgate–Westlight approach to a nine-block section with seven
clear travel blocks and distinct shoulders/footways. Keep the existing
keyframes in `coordinate-schedule.json`; do not straighten it through terrain.
Use billboard clusters only at decision points, keep sight triangles open and
never let a sign replace the absent stadium screen.

The oasis parcel x `-248..-210`, z `-510..-482` is dry. Make it a true
halfway service court: fuel/charging canopy, food hall, restrooms, terrace,
maintenance yard, signed return movements and a landscape basin. Illinois
Tollway's oasis program is the operational precedent:
[Illinois Tollway Oases](https://agency.illinoistollway.com/travel-information/oases).
Road signs and billboard placement should use the current
[FHWA MUTCD](https://mutcd.fhwa.dot.gov/) as the public source of truth.

The GTA-like mini-bunker remains a spatial mood reference only. Its approved
envelope moves west to x `-252..-220`, z `-548..-515`, which eliminates the 52
surface-water columns present in the earlier eastern envelope. Conceal it under
natural landform, give it a dogleg portal and keep the service apron subordinate
to the oasis. Do not copy proprietary GTA geometry, branding or missions.

## 3. Westlight island, pier and crater

The stadium throat at x `-356..-353`, z `-506..-471` remains exactly four
blocks wide; preserve it. The new primary pedestrian mall extends north in
x `-362..-347`, z `-470..-318`, crossed by a secondary mall at
z `-379..-364`. The pier envelope x `-428..-274`, z `-445..-318` is zoning,
not a solid platform.

The brew barn, seven shophouses and ferry building need pile-and-cap
retrofits because their existing stone pads meet substantial water edges. Keep
open-water slots between deck ribbons. The Skiff House's existing dark-oak
piles are the local construction precedent. Provide two independent shore
returns and continuous guarded public circulation. NYC's rules usefully demand
continuity and a clear waterfront path:
[NYC waterfront public access continuity](https://zr.planning.nyc.gov/print/pdf/node/19002)
and
[pier circulation](https://zr.planning.nyc.gov/node/19006).
FEMA's public coastal-construction guidance supports open/pile foundations
rather than broad fill in exposed wet areas:
[FEMA Coastal Construction Manual, Volume II](https://www.fema.gov/sites/default/files/2020-08/fema55_volii_combined_rev.pdf).

The crater lake is a bounded fill concept, not an executable fill command.
Its low dry component is x `-491..-447`, z `-620..-556`, 1,507 columns with
support y `46..61`. The modeled water datum is block y=62. The gross exact fill
inventory is 12,288 cells: 11,746 air, 523 grass blocks and 19 short grass.
Fresh closed-basin, cave, block-entity and neighbor-fluid proofs are mandatory.

## 4. Paired parks and crater housing

The two parks face each other across the westward boulevard:

- dry park x `-640..-520`, z `-550..-480`; and
- water park x `-640..-520`, z `-462..-360`.

The dry park is extremely hilly (median support y=76, p90=99), so its signature
coaster and paths follow the slope. The water park is 65.6 percent water at the
sample grid. It requires pile decks and self-contained wave/lazy-river vessels;
natural water is landscape, never a substituted pool.

Adventureland/Adventure Bay and Worlds of Fun/Oceans of Fun demonstrate only
the transferable operating pattern: adjacent dry/water parks, a coordinated
arrival and an internal relationship. The plan does not reproduce their names,
marks, attraction forms or layouts:
[Adventureland](https://www.adventurelandpark.com/),
[Adventure Bay](https://www.adventurelandpark.com/adventure-bay), and
[Worlds of Fun](https://www.worldsoffun.com/).
Ride systems require a licensed design against the current applicable standard;
ASTM publishes the scope of
[F2291, amusement ride design](https://store.astm.org/standards/f2291), and the
UK HSE publishes operational design guidance in
[HSG175](https://www.hse.gov.uk/pubns/books/hsg175.htm).

Medium-density shingle-style housing belongs on the dry south parcel
x `-520..-475`, z `-550..-515`. Use three-story courtyard/terrace buildings,
fieldstone bases, shingle wall planes, broad porches, gables and dormers. Keep
the entire lake edge public. The NPS description of Sagamore Hill supports the
Shingle/Colonial Revival vocabulary without licensing a copy:
[Sagamore Hill architecture](https://www.nps.gov/thingstodo/appreciate-sagamore-hill-s-architecture.htm).

## 5. Southwest housing and staff connection

The north housing parcel, central court and south housing parcel are all dry,
but their slopes are material. Project A is x `-306..-259`,
z `-298..-275`; the shared court is z `-274..-259`; Project B is
z `-258..-235`. Step both projects around the court at design support y=82.
Give every home a dignified address, daylit stair and visible route to the
court. Keep refuse/loading outside the social center.

HUD's public case studies show transferable features: mixed-use/shared-court
organization, visible common space and strong resident amenities:
[Five88](https://www.huduser.gov/portal/casestudies/study-031219.html),
[Bear River Cottages](https://www.huduser.gov/portal/casestudies/study-033125.html),
and
[Via Verde](https://www.huduser.gov/portal/casestudies/study_10012012_1.html).

The provisional dry contour staff route begins at `(-111,68,-332)`, reaches
MainStreet West Lane at `(-82,65,-219)`, then follows the accepted lane north
to B01. The attached lounge x `-94..-73`, z `90..121` connects to B01's west
wall. It contains breakroom, kitchen, lockers/showers, quiet room and dispatch.
A fresh five-block-wide halo scan and both-direction normal-walk test are still
required.

## 6. Attached MainStreet garages

The separate schedule covers all 18 houses. Every garage is attached. H01 and
H07 receive six bays; H03, H08, H09 and H10 receive four; the remaining houses
receive two. Vertical/side attachments at H07, H08, H09, C02, C03 and C05 carry
the highest collision risk. Do not execute the old detached-garage layouts as a
substitute.

## 7. MainStreet underground warehouse

The full requested box x `-118..88`, y `35..60`, z `180..296` is rejected as
one excavation. It contains 10,958 source-water cells, 36 source-lava cells,
additional flowing fluids, bubble columns, wet vegetation and magma. Its north
edge also intersects the protected RR-T2b route envelope.

The verified dry core is x `32..88`, y `40..60`, z `200..296`: 116,109 cells
and zero fluid cells. At 5,529 cells per plate it can support one meaningful
high-bay hall with receiving, racks, vehicle/RV storage, mechanical plant,
office/mezzanine, cafeteria/kitchen and private adult staff wellness/relief
rooms. The latter are intentionally non-graphic and separated by a privacy
vestibule, independent exhaust and wash support.

The user-requested west ramp opposite the C01 portal is not presently
releaseable. A direct 1:4 ramp crosses 156 fluid cells, 290 unique fluid-halo
cells and 293 gravity-sensitive cells. An adaptive nine-block-wide search
across x `-160..-100` finds no continuous dry route beyond z=267. A dry deep
transfer route exists at y=40, but it does not solve the wet rise to the
surface. Choose between:

1. a separately engineered watertight/cofferdam west portal;
2. a dry surface portal on the east/central parking side with a west-facing
   architectural expression; or
3. a reduced non-vehicle west shaft plus a remote dry vehicle ramp.

WBDG recommends high bays, flexible storage, marked handling routes, separation
of receiving/shipping, flat durable floors, ventilation and fire protection:
[Whole Building Design Guide, Warehouse](https://stg.wbdg.org/building-types/warehouse).
OSHA requires sufficient safe mechanical-handling clearances and marked,
unobstructed aisles:
[29 CFR 1910.176](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.176).
At least two remote exits, clear discharge and illuminated, unobstructed routes
are the baseline:
[29 CFR 1910.36](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36)
and
[29 CFR 1910.37](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.37).
The CDC/NIOSH building-air guide specifically calls for local exhaust in an
underground parking garage:
[Building Air Quality](https://stacks.cdc.gov/view/cdc/6133/cdc_6133_DS1.pdf).
Kitchen and employee-storage separation should be resolved against the current
[FDA Food Code](https://www.fda.gov/media/164194/download?attachment=).

## 8. Release gates

Every physical package requires a new immutable snapshot, exact source guards,
inverse rollback, block-entity/inventory census, protected-feature comparison,
entity/player clearance, fixed transaction order, post snapshot, independent
QA, normal-walk tests and matched before/after evidence. The current schedules
are planning coordinates; none authorizes a bulk `SET`, live database import or
replay of an accepted release.

## Artifact index

- `coordinate-schedule.json` — Ravensreach civic, boulevard, oasis and bunker
  siting.
- `mainstreet-attached-garage-coordinate-schedule.json` — all 18 attached
  garages.
- `westlight-waterfront-coordinate-schedule.json` — stadium-island, pier and
  crater.
- `westward-parks-housing-workforce-coordinate-schedule.json` — paired parks,
  housing, staff path and lounge.
- `mainstreet-underground-warehouse-coordinate-schedule.json` — warehouse
  feasibility, program and rejected/accepted envelopes.
- `evidence/` — read-only current-condition maps and block/parcel censuses.
