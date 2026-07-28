# July 28 Town Expansion — Durable Session Memory

Document ID: `REDEV-2026-07-28-SESSION-MEMORY-01`  
Owner direction captured through: 2026-07-28 UTC  
Scope: all redevelopment directions given during the July 28 working session  
Document role: durable requirements ledger and future-agent orientation  
Current physical-release state: **ACCEPTED TERMINAL SNAPSHOT; CONSOLIDATED
POST-RELEASE QA PASS WITH MEDIA**  
Current publication state: **FINAL DATABASE IMPORT, CENSUS, DOSSIER, BOX, AND
SOURCE-PINNED SITES DEPLOYMENT PASS; INTERNET-PUBLIC SITES ACCESS BLOCKED BY
WORKSPACE ADMIN POLICY**  
Current Box state: **BOX_VERIFIED: 585/585 FILES REMOTELY HASH-VERIFIED**

## 1. How to use this memory

Read this file before planning, generating, releasing, documenting, or
publishing any July 28 town-expansion work. It records owner intent and binding
corrections that are easy to lose when work crosses sessions.

This file is not an as-built claim. It has two jobs:

1. preserve what the owner asked for, including exact counts and later
   corrections; and
2. prevent requested, researched, designed, generated, or preflighted work from
   being mislabeled as live or accepted.

When implementation evidence changes, update a dated status addendum or the
relevant machine ledger. Do not silently rewrite the original requirement.
Where an older design source conflicts with a later correction in this file,
the correction here controls design intent; an accepted post-release snapshot
and transaction ledger control physical truth.

## 2. Truth-state vocabulary

| State | Meaning |
|---|---|
| `REQUESTED` | The owner asked for it. No design or construction is implied. |
| `RESEARCHED` | Public sources were reviewed and translated into an original design basis. |
| `SURVEYED` | Existing or candidate geometry was measured from a named immutable source. |
| `DESIGNED` | A program, floor plan, coordinate schedule, or acceptance contract exists. |
| `SOURCE_MODELED` | Generator/source code represents the design. No current operation package is implied. |
| `GENERATED_OFFLINE` | Exact forward and rollback artifacts exist locally. Nothing live is implied. |
| `PREFLIGHTED` | Fresh-source, collision, protected-state, rollback, and parser gates pass. |
| `COMMITTED_LIVE` | A coordinated transaction ledger records successful live execution. |
| `VERIFIED_POST_STATE` | Immutable post-state, movement, capacity, concealment, and media QA pass. |
| `DATABASE_IMPORTED` | Accepted objects and relations were imported with integrity evidence. |
| `SITES_PUBLISHED` | An exact source-pinned Sites version was saved, deployed, and health-checked. |
| `BOX_VERIFIED` | Remote file path, byte count, and content hash match the final local manifest. |
| `SUPERSEDED` | A later owner correction controls and this version must not be implemented. |
| `BLOCKED` | A named gate is failed; do not release. |

An earlier state never implies a later state. In particular:

- source code is not a generated release;
- an offline PASS is not a live result;
- a live transaction is not accepted without independent post-state QA;
- a screenshot is not linked to an object merely because its filename looks
  similar;
- a healthy predecessor website does not publish the current expansion; and
- a reachable Box connector is not an upload receipt.

## 3. Owner operating direction

The owner asked for autonomous, end-to-end execution and does not want repeated
approval prompts or repeated stop/start cycles. Agents should make safe,
in-scope assumptions, continue through research, engineering, QA,
documentation, database, Box, and Sites closeout, and provide concise progress
updates. This preference does not waive repository release gates, exact-state
guards, platform policy, or destructive-action safety.

The owner explicitly authorized parallel research and implementation teams,
including additional independent reviews and technical debate when a design is
difficult or contradictory. Program-management traceability is required for
every request.

The owner also directed:

- do the complete agreed scope, not a reduced “good enough” version;
- preserve the frozen counts and check them periodically;
- perform a second visual and functional pass on every new build;
- if a building or room is materially miscalculated, report the finding before
  changing it;
- take detailed notes and generate enough documentation for extensive owner
  review; and
- keep this memory callable in future sessions so no requirement is lost.

## 4. Binding corrections and supersessions

These corrections override earlier prospective designs.

| ID | Binding correction | Supersedes |
|---|---|---|
| SUP-001 | Every residential garage is physically attached to its parent house. Every large house receives a four-car or six-car attached garage. | Detached-garage concepts and token paved/canopy links. |
| SUP-002 | The five Worker Town manager mini-mansions also need surveyed vehicle access and real attached garages. Their current zero-automotive-garage schedule is not accepted. | Treating the five-cottage schedule as complete. |
| SUP-003 | The civic pavilion is Russian-referenced, original architecture, not a glass pavilion. | Glass-pavilion language. |
| SUP-004 | “Extend Ravensgate” was corrected to mean extend the civic pavilion/grounds east. Ravensgate itself remains a deliberately restricted, deeply buried complex. | Any surface expansion of Ravensgate. |
| SUP-005 | New owner and private tunnel work must not use the T2b tunnel specification. Use the modern underground corridor standard. | Applying T2b to new owner routes. |
| SUP-006 | DSM10 is an ordinary member of the Microsoft/DSM-style surface campus. The InfoBunker-inspired facility is a separate underground annex reached from a secure connection; it is not DSM10. | Conflating DSM10 and InfoBunker. |
| SUP-007 | The Microsoft campus has two different 200-seat rooms: one 200-seat presentation theater/auditorium and one 200-seat movie theater, connected as distinct doors/rooms. | Treating them as one room. |
| SUP-008 | The corrected Microsoft/DSM-inspired modeled register has exactly 24 slots: DSM1–18 and DSM40–45. Do not infer 45 buildings from the numbering jump. | The earlier ten-building interpretation and invented DSM19–39. |
| SUP-009 | EdgeBCC is owned by LightEdge Solutions. Use the name `EdgeBCC`, not EdgeConneX. | Incorrect ownership/name. |
| SUP-010 | Meta-, Google-, and LightEdge-inspired Iowa precincts are full-build targets now: 12 + 6 + 2 completed, walkable fictional data buildings. | The earlier Phase 0 outline-only plan. |
| SUP-011 | Concord Broadcast Exchange satellite count is exactly nine dishes: one large, four medium, and four small. | Preliminary three-dish or other dish counts. |
| SUP-012 | The bunker arena/stadium program is removed. | Stadium/arena inside C01. |
| SUP-013 | The bunker high bay is not an aircraft hangar because it has no runway connection. It is an underground vehicle-storage and multiuse high bay with a large vehicle door. | All aircraft-hangar naming, aircraft program, and runway assumptions in `c01-hangar-eoc-adult-wing-redesign-source-of-truth.md`. |
| SUP-014 | The entire bunker complex is underground. Only the observatory and the owner penthouse/visible estate crown are above ground on a natural-looking mountain. No exposed bunker concrete shell is allowed. | Any visible bunker high bay, bunker block, or artificial concrete projection. |
| SUP-015 | Non-graphic adult rooms must still look fully designed and usable: distinct floor plans, beds or lounge furniture, privacy thresholds, lighting, storage, wash/dressing zones, and themed furniture/fixture silhouettes. | Empty rooms, euphemistic blank boxes, or omission of adult-themed spatial cues. |

## 5. Point-in-time status at creation

This table is deliberately conservative.

| Program | Point-in-time state | What is not yet proven |
|---|---|---|
| Accepted Redevelopment R1 | `VERIFIED_POST_STATE`; accepted predecessor | Does not prove any town-expansion addition. |
| Accepted Wave 2 | `VERIFIED_POST_STATE`; accepted predecessor | Does not prove any town-expansion addition. |
| Town Expansion WIP2 | `GENERATED_OFFLINE / STALE / BLOCKED` | Not authorized for replay; contains old scope and protected-state problems. |
| Current integrated town-expansion source | `SOURCE_MODELED / IN PROGRESS` | No final fresh-snapshot package, atomic live ledger, or accepted post-state. |
| Latest C01 five-level correction | `REQUESTED`; amendment required | Not represented by the older hangar source, final generator, or live world. |
| Iowa 12 + 6 + 2 full build | `DESIGNED / SOURCE_MODELED`; integration QA pending | Not yet verified live. |
| 24-slot Microsoft/DSM campus | `DESIGNED / SOURCE_MODELED`; integration QA pending | Not yet verified live. |
| Concord Broadcast Exchange | `DESIGNED / SOURCE_MODELED`; compiler integration under review | Not yet verified live. |
| Concord two-soundstage annex | `DESIGNED / SOURCE_MODELED`; collision closure pending | Not yet verified live. |
| Five Worker Town manager mini-mansions | `DESIGNED`; implementation and garage amendment pending | Not yet generated or live. |
| New database objects/media relations | `PENDING` | Point-in-time publication-gap audit recorded zero accepted town-expansion as-builts. |
| Town-expansion maps/screenshots/PDF | `PENDING_POST_STATE_CLOSEOUT` | Baseline/design images are not after evidence. |
| Town-expansion Box handoff | `PENDING_BOX_VERIFICATION` | No remote hash-complete July 28 handoff. |
| Town-expansion Sites update | `PENDING` | Current version 4 is predecessor content. |

Never use this point-in-time table as a permanent claim. Check the newest
immutable snapshot, atomic transaction, post-release verifier, database import
ledger, Sites version, and Box verification before reporting current status.

## 6. Program-wide planning, research, and quality requirements

### 6.1 Urban form and wayfinding

- Deep-research city grid systems and convert the findings into a written
  source-of-truth paper for engineers.
- Plot the world like a real development: blocks, parcels, streets, alleys,
  setbacks, frontages, utilities, future plots, phases, and sales/construction
  markers.
- Survey whether buildings are too close or too scattered.
- Correct the experience of turning a corner and not knowing what place is
  visible.
- Use landmark hierarchy, view corridors, street addresses, directory signs,
  named thresholds, and coherent districts.
- Fill gaps so the town reads as blocks, courts, streets, and areas, while
  retaining required service gaps, views, drainage, and future reservations.
- Terrain must not become a giant flat grass slab or a series of exposed
  vertical cuts. Use contour-following benches, planted transitions, limited
  retaining walls, trees, water, and meaningful open space.

### 6.2 Underground and circulation standard

- Standardize tunnel clear width/height, floor/wall/ceiling palette, lighting,
  drainage, signs, junctions, refuge nodes, airlocks, and access control.
- New private/owner corridors are modern, five blocks clear by five blocks
  high where the frozen design calls for that profile, well lit, and explicitly
  not T2b.
- Stairs must be broad, consistent, well lit, have adequate headroom and
  landings, and work in both directions without jumping or pathfinding hacks.
- Major multi-level buildings use obvious stair halls, paired lifts where
  specified, readable level directories, and real back-of-house/service routes.
- Ravensgate is deeply buried and deliberately isolated. Civilian,
  library–Guild, C01, portal, and owner routes may not accidentally intersect
  it.

### 6.3 Second-pass and evidence standard

Every new or materially altered object requires:

1. before survey and defect statement;
2. reviewed floor plan and room schedule;
3. exact object ID and bounds;
4. guarded forward and rollback operations;
5. independent post-state and capacity checks;
6. normal walking to every advertised room;
7. fixed-camera exterior, interior, route, and defect-revealing after images;
8. a second visual/functional pass;
9. documented corrections if the second pass fails; and
10. exact database-to-map-to-floor-plan-to-screenshot relations.

## 7. Ravensreach civic and town program

Point-in-time state: `RESEARCHED / DESIGNED / PARTLY SOURCE_MODELED / NOT
VERIFIED LIVE`.

### 7.1 Town building and longhouse

- Recheck, redesign, and finish the penthouse on the town building.
- Replace the Amsterdam-style buildings with a longhouse appropriate to the
  period and material language of the other town buildings.
- Create a deliberate courtyard around the longhouse.
- Fill town gaps with coherent block faces, courts, and service passages.

### 7.2 Library, Russian civic pavilion, and Guild Hall

- Expand the library to at least four times its measured baseline usable area.
- Create a walk-out, two-level concrete terrace from the library down into the
  civic pavilion.
- Replace glass-pavilion language with an original Russian-referenced civic
  architecture.
- The spatial sequence is:

  `expanded library ↔ civic pavilion/garth ↔ monumental Guild Hall`

- Extend the civic pavilion and grounds east to the last flat land before the
  tree line.
- Add trees, flowers, banners, statues, reflecting pools, monumental civic
  open space, an original Lincoln-Memorial-scale monument, and a block-art
  interpretation of the *Married... with Children* fountain reference.
- Improve the pavilion itself with more statuary and richer edges; it must be a
  place, not residual space.

### 7.3 Guild Hall exact program

The Guild Hall is deliberately extravagant and institutionally wealthy. It
has:

- two basement levels;
- three above-grade stories;
- dormitories;
- exactly four kitchens;
- living spaces;
- theater;
- lecture hall;
- dance hall;
- a deeply researched, expensive guildhouse bar;
- ceremonial arrival, rich materials, commissioned art, premium lighting,
  detailed ceilings, and complete service/back-of-house rooms; and
- a seamless physical and visual relationship to the pavilion.

### 7.4 Library–Guild secret archive

- Build one isolated secret tunnel connecting only the library and Guild Hall.
- It does not join Ravensgate, C01, owner tunnels, portal rooms, caves, or the
  general civilian tunnel system.
- At its bottom, include a challenged/banned-books archive, a private adult
  literature archive, and an original miniature Ukrainian-subway-inspired
  ceremonial station room.
- Use controlled vestibules, dry construction, broad usable stairs/lifts where
  required, signs, egress, and explicit network-isolation proof.

## 8. MainStreet/GrandStreet America

Point-in-time state: `MIXED DESIGNED/SOURCE_MODELED / NOT VERIFIED LIVE`.
“MainStreet America,” “MainStreet USA,” and the owner’s occasional
“GrandStreet America” refer to this same redevelopment area unless an object
record proves otherwise.

### 8.1 Street and residential repair

- Bring the scattered warehouse, cooking school, and added buildings closer
  into the development.
- Complete the road network.
- Put homes on one coherent street, or turn the extra homes toward a second
  properly built street.
- Every house receives a real attached garage.
- Every large house receives a four-car or six-car attached garage.
- Attachment requires a shared enclosed wall/door relationship and usable
  vehicle bays; paving, a canopy, or a decorative link is insufficient.

### 8.2 Full parking and underground warehouse

- Recover the complete parking lot after the bunker moves east.
- Size the underground warehouse to the recovered full parking footprint, not
  the old partial lot.
- Provide a creative, drivable earth descent opposite the relocated bunker
  entrance.
- The high-bay warehouse includes cars, trucks, campers, RVs, long rack rows,
  receiving, loading, storage, offices, cafeteria, kitchen, egress, and
  complete service circulation.
- Include tasteful non-graphic private adult wellness/relief rooms where the
  frozen program retains them.
- Preserve or explicitly migrate every container and protected block entity.

### 8.3 Guest Services building

The large Guest Services building must become a real multi-level destination:

- reception, orientation, visitor support, and meaningful interior programs;
- work and coworking spaces;
- places to eat and socialize;
- staff and service rooms;
- patios and roof gardens;
- a rooftop pool surrounded by a bar;
- hot-tub lounge and wellness areas;
- separated adults-only private/wellness rooms expressed non-graphically; and
- an employee lounge connected to the Ravensreach worker path.

The roof should feel large and complete enough to be its own mini-attraction.
Water containment, roof support, safe edges, stairs/lifts, service, privacy,
and two-route access require independent proof.

## 9. C01 bunker complex — latest controlling program

Point-in-time state: `LATEST OWNER CORRECTION REQUESTED; OLDER HANGAR SOURCE
SUPERSEDED; FINAL SOURCE/OPS/LIVE PROOF PENDING`.

This section is the controlling conceptual brief for the next C01 amendment.
The older hangar document remains historical design evidence but may not be
implemented as an aircraft hangar.

### 9.1 Siting, surface, and migration

- Move the full bunker complex east far enough to recover the complete
  MainStreet parking lot.
- If the east move encounters other underground work, redesign both systems so
  they coexist; do not erase one.
- Use commission-new-before-retire-old migration with protected inventory/NBT,
  observatory support, route, database identity, and rollback ledgers.
- Place the entrance farther east, away from the lot, with a high-quality
  terrain-following road down the side of the mountain.
- Recess and airlock the entrance.
- The complete bunker is underground. No concrete cube, roof, wall, or seam may
  project from the mountain.
- Only the observatory and owner penthouse/visible estate crown are above the
  natural-looking mountain.
- Perform a 360-degree concealment review plus terrain-cover sections before
  acceptance.

### 9.2 High bay: underground vehicle garage, not hangar

The former hangar becomes a large underground vehicle-storage and multiuse
high bay:

- the large exterior door is a vehicle door connected to the bunker access
  road, not an aircraft door;
- include cars and trucks with marked parking, service, turning, and walking
  lanes;
- retain a glazed multi-level support/observation wall if it improves
  legibility, but its rooms support the garage and bunker;
- no aircraft, aviation-maintenance identity, tow apron, or runway assumption;
- include a selected set of fully built recreation and support rooms around or
  below the high bay: golf simulator, gaming room, library, music studio,
  indoor shooting-range analogue, situation room, and guest suites; and
- organize the area with obvious halls, directories, backrooms, stairs, lifts,
  service circulation, and access to every advertised room.

The indoor shooting range is a fictional Minecraft room. It needs separation,
backstop language, storage, and safe spectator/circulation zoning, not
real-world weapon instruction.

### 9.3 Binding five-level organization

The bunker must be reorganized so the owner can understand it at a glance and
reach every room.

#### Level 1 — controlled arrival

- security entrance;
- decontamination;
- underground vehicle garage/high bay;
- checkpoints and airlocks;
- orientation concourse and level directory;
- security operations;
- visitor/guest processing;
- obvious public, staff, service, and owner route separations; and
- independent surface egress.

#### Level 2 — habitation and recreation

- living quarters;
- complete kitchens and dining;
- theater/cinema;
- indoor pool and wellness;
- offices;
- guest suites;
- library;
- gaming room;
- golf simulator;
- music studio;
- lounges and service/back-of-house rooms; and
- broad stairs and paired lifts to the other occupied levels.

#### Level 3 — food and water resilience

- farms;
- protected animal areas;
- food storage;
- seed and tool stores;
- water storage/treatment analogues;
- brewing stations;
- potion storage;
- staff workrooms, washdown, and service circulation; and
- separation of animals, food, clean water, and occupied routes.

#### Level 4 — command, medical, security, and data

- command center;
- situation room;
- security operations center connected to alarm and piston-lockdown
  architecture;
- armory with armor stands, enchanted-equipment display/storage, shields, and
  secure stores;
- vault;
- medical bay with multiple beds;
- pharmacy/brewing and potion stores;
- quarantine rooms with controlled anterooms;
- server room using iron, glass, redstone lamps, observers, and copper;
- protected staff quarters expressed as a villager trading hall;
- trophy gallery with rare blocks, mob heads, artifacts, and armor sets;
- prison/intruder holding cells with controlled access; and
- communications, evidence/property, records, janitor, plant, and backrooms.

#### Level 5 — utilities, escape, and last refuge

- power plant;
- utility distribution and maintenance;
- escape tunnels;
- a contained Nether portal room;
- secondary panic bunker;
- supplies, sanitation, communications, medical cache, and sleeping capacity;
- two independently usable escape directions where the survey permits; and
- strict separation from Ravensgate, civilian tunnels, inactive owner portal
  galleries, and unrelated underground systems.

The Level 5 Nether portal is a functional bunker program requirement and is
different from the observatory’s entirely inactive destination galleries.
Its activation state must be explicitly decided and tested in the release
schedule; never accidentally create or connect a portal.

### 9.4 Full-envelope classification

- Scan the entire visible old square/base and the selected east replacement
  envelope.
- Every cell/column must be classified as program, circulation, vertical core,
  service, structure, protected feature, deliberate surveyed void, or retired
  legacy.
- Zero unlabeled interior cells, inaccessible advertised rooms, blind cavities,
  unreviewed overlaps, or unused remainder disguised behind walls.
- The main level must give access to the whole ordinary bunker program. Owner
  areas can remain controlled, but their thresholds and routes must be real.

### 9.5 Public adult hospitality wing

The stadium/arena is removed. In its place, and in additional newly found
space, build a large non-graphic adults-only hospitality/performance program:

- one large open exhibition/theater salon with public-viewing/perimeter
  hospitality;
- no fake stadium seating or blank screen wall;
- at least four one-to-one rooms;
- at least twelve other individually identified private/themed rooms;
- additional private rooms when space permits, because the owner explicitly
  doubled this program;
- lounge and bar/service;
- dressing, makeup/wardrobe, wash/cleanup, storage, and staff backrooms;
- separate public and performer routes;
- controlled age/privacy/acoustic vestibules; and
- independent egress.

The previously frozen minimum adult-program footprint of 5,364 classified
blocks remains a floor, not a target to shrink toward.

### 9.6 Owner-only deep adult and residential stack

Keep this program physically separate from the public adult wing.

#### Owner club

- large club theater/salon;
- meeting rooms;
- at least twelve private adult rooms;
- lounges, bar/service, dressing, wash, storage, staff, and backrooms;
- controlled grand arrival; and
- separate service and escape circulation.

#### Owner arrival residence

- living room;
- formal dining;
- casual dining;
- private adults-only dining room;
- service kitchen;
- small home cinema;
- ordinary office;
- separate computer office with a twelve-monitor battle station;
- adjacent two-rack micro-datacenter;
- guest wash, coat, pantry, storage, and service rooms; and
- an extravagant main door from the ordinary bunker.

#### Fifteen-suite poly-living wing

Exactly fifteen master-scale suites. Every suite includes:

- large bedroom;
- ensuite bathroom;
- rainforest/rain-shower analogue;
- walk-in closet;
- sitting area;
- mini office with seating;
- normal front door; and
- separate controlled rear door to the private owner corridor.

The rear corridor connects all fifteen bedrooms to the owner master compound.

#### Owner master compound

- exactly three large bedrooms, one principal;
- central principal bedroom with a large bed and consent-oriented,
  non-graphic restraint/furniture silhouettes;
- two kitchens;
- living room;
- formal and casual dining;
- safe room;
- complete bathroom/spa;
- small theater;
- indoor pool;
- hot tub;
- sauna;
- gym;
- computer office;
- library;
- ventilated cigar/smoke-room analogue;
- premium coffee/Starbucks-style bar;
- private circulation to the fifteen-suite rear corridor; and
- back door connected to the dedicated modern owner tunnel.

No human figures, depicted acts, explicit signs, or explicit imagery are part
of the build or its screenshots.

## 10. Observatory mega-estate and portal gallery

Point-in-time state: `DESIGNED / PARTLY SOURCE_MODELED / NOT VERIFIED LIVE`.

- Expand the observatory building into the owner’s extremely lavish personal
  mega-estate while retaining telescopes and observatory function.
- Make the penthouse an owner mega-mansion with larger and more numerous rooms,
  premium material/detail, satellite/radio-dish garden, terraces, guest wings,
  offices, libraries, dining, kitchens, wellness, and service spaces.
- Expand the safe room and fallout shelter with power, utilities, stores,
  sanitation, communications, medical/quiet space, and two egress routes.
- Keep the observatory and penthouse/estate crown as the only visible developed
  structures on top of the bunker mountain.
- Preserve telescope views and give the estate an independent structural
  podium before old bunker supports are retired.

Behind a hidden architectural discovery, create an inactive portal gallery:

- one central portal/map room;
- multiple destination rooms, with one room per district/area;
- district floor maps and themed identities;
- inactive portal frames only;
- unused rooms behind sequential metal doors and `OFFLINE` signs;
- room for future portals without building them now; and
- zero connection to C01, Ravensgate, Raven Rock, the library–Guild tunnel,
  caves, or unrelated owner routes.

Acceptance requires zero `nether_portal`, `end_portal`, `end_gateway`, or
portal-creating mechanisms in these observatory destination rooms.

## 11. Worker Town and owner corridor

Point-in-time state: `DESIGNED / COORDINATE SCHEDULES EXIST / NOT VERIFIED
LIVE`.

### 11.1 Five manager mini-mansions

The exact current role-cottage census is five:

1. Architect;
2. Mason;
3. Surveyor;
4. Steward; and
5. Scout.

Turn all five into detailed mid-management mini-mansions that fit Worker Town:

- larger usable rooms;
- richer but period-compatible façades;
- porches and patios;
- living, dining, kitchen, office, bedroom, bath, storage, and service;
- landscaping and street relationship;
- furnished, non-graphic private adult/red rooms; and
- protected inventory/NBT migration.

Known siting concerns from the current design review:

- Scout overlaps Market Hall and requires relocation;
- Surveyor is pinched by Storehouse/Moot Hall and requires relocation;
- Mason must avoid the canal;
- Architect and Steward may remain in place if fresh survey passes.

**Open conflict:** the current five-cottage coordinate schedule has no
automotive garages. It is not an accepted implementation plan. Before
generation, survey a coherent vehicle street/driveway network and amend every
mini-mansion with a genuinely attached garage. Classify each house for bay
count; any large manager house must receive four or six attached bays under
SUP-001.

### 11.2 Gilded Raven Theatre House

Build Worker Town’s most expensive traditional theater/cabaret:

- marquee and opulent façade;
- elaborate ceiling, fixtures, balconies, stage, apron, scenery, lighting,
  control, and orchestra/technical support;
- 168-seat main house;
- five separate five-person salons;
- four one-to-one mini theaters;
- restaurants and premium hospitality around the main room;
- open vomitories and real circulation around the bowl rather than fake doors
  into dead hallways;
- performer, public, service, and owner routes;
- hidden public and performer rooms;
- two usable egress paths; and
- broad extravagant stairs and adjacent lifts.

Its adult identity is conveyed through architecture, furniture, lighting,
privacy, and room planning, never human figures or explicit imagery.

### 11.3 Dedicated owner tunnel and future mini-city

- Build a new, modern owner-only tunnel from the Gilded Raven to the owner
  master compound in the C01 bunker complex. If its surveyed route meets
  another protected underground system, redesign the route so both survive.
- It is not the old T2b system and must not connect to T2b.
- Use a five-by-five clear, well-lit, premium corridor with orientation nodes,
  utilities, refuge, security, and independently usable egress.
- Provide periodic large rest rooms/suites inspired by premium stadium suites;
  each may have a furnished, non-graphic private adult annex.
- Use extravagant, comfortable terminal stairs and lifts.
- Reserve a future underground owner mini-city at the surveyed location without
  excavating it.
- Build the sales/reservations office and sealed presentation marker only in
  the current phase.
- Preserve space for later plots, utilities, roads, phases, and sales inventory.

## 12. Stadium road, oasis, Panorama RV district, and mini-bunker

Point-in-time state: `RESEARCHED / DESIGNED / PARTLY SOURCE_MODELED / NOT
VERIFIED LIVE`.

- Make the road from town to Westlight wider, ceremonial, readable, and more
  visually dramatic.
- Add billboards along the route with safe setbacks and readable approaches.
- Build a halfway oasis inspired by Chicago tollway oases, translated into an
  original Minecraft service/rest destination.
- Build an original game-evocative mini-bunker near the oasis.
- From the oasis roadway, create a long access road to a lavish RV sales lot.
- Display detailed, enterable fictional 29-foot, 39-foot, and 48-foot RVs and
  campers in multiple rows.
- Build a main customer building, sales building, and repair shop with four
  semi-size doors.
- Add a Kwik Star–inspired travel center, dive bar, and non-graphic adult club.
- Complete roads, vehicle turning, parking, pedestrian separation,
  landscaping, service access, signs, lighting, and matched interior/exterior
  evidence.

## 13. Westlight stadium district, venues, island, and waterfront

Point-in-time state: `RESEARCHED / DESIGNED / PARTLY SOURCE_MODELED / NOT
VERIFIED LIVE`.

### 13.1 Stadium and district organization

- Make the stadium easy to find from town and every island arrival.
- Every seating bank faces an actual screen or stage, not a doorway or blank
  wall.
- Align the main district, stadium, pedestrian malls, streets, and pier into
  one understandable island plan.
- Use wayfinding, landmarks, coherent axes, crossings, plazas, service roads,
  and landscaped edges.

### 13.2 Three-venue repair

The Westlight Venue has three theaters that currently read ambiguously.
Redesign them as three distinct identities with:

- separate public entrances and marquees;
- believable seating and sightlines;
- stages/screens;
- lobbies;
- backrooms;
- basements;
- dressing, control, storage, and service rooms;
- separate egress;
- semi-truck loading and turning; and
- exterior and interior identities that make the three venues unmistakable.

### 13.3 Pier and water

- Turn buildings already over water into intentional pier buildings.
- Build a researched, original amusement pier.
- Add a Ferris wheel and roller coaster.
- Add an outer steakhouse and shrimp/seafood house on opposite sides.
- Complete queues, midway, promenade, rails, lighting, back-of-house, emergency
  routes, foundations, and service access.
- Preserve and integrate the accepted Westlight infinity screen.

### 13.4 Crater lake and green space

- Fill the crater/hole west of the stadium with a contained designed lake.
- Build a quay around it.
- Blend it into stadium-district green space with paths, trees, planting,
  seating, lighting, drainage, and public waterfront access.
- Prove water containment, shoreline stability, and no unintended flow after
  construction.

## 14. Westward parks, housing, and workforce link

Point-in-time state: `RESEARCHED / DESIGNED / PARTLY SOURCE_MODELED / NOT
VERIFIED LIVE`.

- Deep-research Adventureland Park and Adventure Bay plus Worlds of Fun and
  Oceans of Fun as precedents, then create original paired dry and water parks
  facing each other west of the stadium district.
- Extend the approach road farther west.
- Blend both parks with the crater-lake greenbelt.
- Use complete attractions, queues, staff/service, food, restrooms, shade,
  emergency routes, landscape, and water controls.
- Add several attractive Hampton-influenced medium-density housing projects
  around the lake while preserving a continuous public waterfront.
- Build two connected, dignified workforce/affordable housing projects in
  southwest Ravensreach around a central outdoor commons.
- Create a clear, pleasant path from Ravensreach down to the back of the main
  MainStreet building.
- Build a useful employee lounge at that destination.

## 15. Northeast Microsoft/DSM-inspired data campus

Point-in-time state: `RESEARCHED / DESIGNED / SOURCE_MODELED / NOT VERIFIED
LIVE`.

This is an original fictional Minecraft campus informed only by public
precedent. It must not reproduce real security, power, network, or access
geometry.

Site it northeast of the last MainStreet building, away from water, in the
center of the broad solid forested land. Continue the district road through
this campus and on toward the Meta-, Google-, LightEdge-, and Concord-related
programs while retaining future junctions and expansion parcels.

### 15.1 Exact hall register

Build exactly 24 walkable Microsoft/DSM-inspired hall slots:

- DSM1–DSM18; and
- DSM40–DSM45.

There are no invented DSM19–DSM39 halls. Public-record construction status and
Minecraft completion status are separate fields. Every hall requires:

- staffed/service entrance;
- full-length primary route;
- exactly 40 visibly legible server/rack rows under the frozen design;
- clear hot/cold aisle rhythm;
- support/electrical/cooling language;
- staff and maintenance rooms;
- far-end/secondary egress;
- good interior lighting; and
- exact exterior and interior camera candidates.

Selected fictional colocation rooms may include visually secure ITAR-style
cages, but no real sensitive detail.

### 15.2 Campus support

- coherent roads between halls;
- substantial fictional power station/grid and service yards;
- large NOC;
- staff dorm center;
- expansion space marked with construction equipment;
- separate 200-seat presentation auditorium/theater;
- separate 200-seat movie theater;
- a connected shared lobby/back-of-house while each room has its own door and
  actual screen/stage;
- clear seating, sightline, egress, and capacity counts; and
- service, receiving, storage, maintenance, food, and staff support.

### 15.3 Separate InfoBunker-inspired annex

- DSM10 remains a normal surface hall.
- Behind a controlled DSM10 threshold, a hall may lead to a separate fictional
  underground resilience annex inspired by the publicly visible InfoBunker
  story in Ames.
- The annex should evoke an old military bunker with large rooms, data rooms,
  common areas, NOC, support, and resilient circulation.
- It is a separate database object and envelope.
- Use public appearance/program themes only; do not reproduce sensitive real
  access, security, or operational details.

### 15.4 Outer aviation/logistics compound

- Build a dirt road from Ravensreach/data road to the new campus.
- Before the main data campus, create a smaller compound with towers, helipad,
  small airport/airfield identity, and small warehouses full of computer gear.
- Keep hangar/airfield geometry only here, where an exterior aviation
  relationship makes sense.
- Include roads, loading, storage, offices, security, service, and landscape.

### 15.5 Holdout house

Preserve the medium house whose owner refuses to sell even as the data district
grows around it:

- attached four-car garage;
- backyard pool;
- tree playhouse;
- fallout shelter;
- first-floor furnished, non-graphic adult suite with themed kitchen,
  bedroom/viewing salon, and private room;
- two-room office and lounge;
- driveway, privacy, landscaping, and safe relationship to campus roads and
  utilities.

## 16. Iowa Data District full build and worker commons

Point-in-time state: `FULL BUILD AUTHORIZED; DESIGNED/SOURCE_MODELED; NOT
VERIFIED LIVE`.

The earlier outline-only Phase 0 is superseded.

### 16.1 Exact completed data-building count

- Meta Altoona-inspired: exactly 12 completed walkable fictional halls in
  three four-hall neighborhoods.
- Google Council Bluffs-inspired: exactly 6 completed walkable fictional halls
  in three paired courts.
- LightEdge Solutions EdgeBCC-inspired: exactly 2 completed walkable fictional
  buildings, each with four legible colo/data quadrants.
- Total: exactly 20 completed data buildings, plus their support buildings.

Each building has a real entrance, far-end route, rack/cage aisles, visible
utility/support identity, staff room, lighting, and exterior/interior matched
camera candidates.

### 16.2 Roads, landscape, water, power, and future growth

- Build coherent roads and utility/service routes among all three campuses.
- Install a substantial fictional shared power grid with switching, multiple
  corridors, per-campus substations, operations, storage, and future reserve.
- Retain room to add other campuses along the district road later.
- Grade with contour-following terraces, not a flat slab.
- Dry isolated nuisance water only when reviewed; otherwise retain, dam, or
  reshape it as useful drainage/pond/green infrastructure.
- Use trees, prairie/groundcover, shelterbelts, courtyards, planted slopes,
  water, and changing views so the zone feels natural.

### 16.3 Shared worker commons

Build a shared amenity landscape for workers of all three campuses:

- one large naturalized pond between the campuses;
- green space around the pond;
- a winding continuous walking/biking trail linking all three properties;
- trailhead in Concord;
- shelter houses;
- park amenities;
- exactly 18 disc-golf holes;
- the frozen course total is par 58;
- safe fairway/path/road relationships;
- trees, planting, seating, signs, lighting, and drainage; and
- complete map, route, camera, and post-flow evidence.

## 17. Concord service town and Broadcast Exchange

Point-in-time state: `DESIGNED / SOURCE_MODELED IN PART / NOT VERIFIED LIVE`.

### 17.1 Concord town

Concord is a fully built small town, not a perimeter outline. It should look
ordinary from the road and reveal an intentional consensual-adult nightlife
economy serving data-center workers.

Required ordinary frontage:

- gas station/general store;
- small post office;
- neighborhood/dive bar;
- shift-change shuttle stop;
- waiting lounge;
- late-night food;
- planted edge, signs, sidewalks, and no blank backs.

Required adult-oriented court:

- exactly 25 motel rooms, 13 ground and 12 upper;
- motel facing the adult theater across a joint pedestrianized parking court;
- smaller adult theater with exactly 72 main-room seats, three five-person
  salons, and two one-to-one salons;
- separate non-graphic dance/strip-club venue;
- distinct performer, public, management, and service routes;
- two future entertainment parcels with completed utility/street stubs;
- terraced terrain, drainage, landscaping, and future growth room.

### 17.2 Concord Broadcast Exchange

The Broadcast Exchange is an above/below-ground production and streaming
campus that looks more extensive than its ordinary frontage suggests.

Program includes:

- adult-themed non-graphic streaming rooms;
- gaming-stream rooms;
- general streaming rooms;
- common rooms;
- arcade;
- furnished adult private rooms;
- pool rooms;
- below-grade bondage-themed rooms expressed through non-graphic furniture
  silhouettes and architecture;
- Moulin-Rouge-inspired exhibition halls;
- coffee shops;
- fictional weed shops and a ventilated sit/smoke lounge without consumption
  instruction;
- production, offices, makeup/dressing, control, storage, kitchens, dining,
  plant, security, egress, and backrooms;
- broadcast tower with four usable observation/technical decks;
- satellite pad with exactly nine dishes: one large, four medium, four small;
  and
- an exact machine room schedule, route set, camera set, and object/media
  crosswalk.

The accepted design schedule currently calls for 113 base Exchange rooms,
five vertical cores, twenty special program components, ten routes, and
eighteen cameras. Treat those as fail-closed counts until a later owner
correction explicitly changes them.

### 17.3 Two-soundstage upgrade annex

Add a wing that visibly reads as a later movie-studio-style expansion:

- one late-night talk/variety soundstage;
- one sitcom soundstage;
- large unobstructed filming floors;
- audience seating and real sightlines;
- lobbies;
- staff offices;
- talent dressing rooms;
- makeup/wardrobe;
- green rooms;
- control, lighting, scenery, prop, storage, receiving, and service;
- partial two-story support bars along walls;
- glass observation over the open stages;
- stairs only in the support areas, leaving the filming floors open; and
- exterior massing like a coherent studio complex.

The frozen annex schedule presently identifies 84 rooms: 35 late-night, 41
sitcom, and 8 shared; ten site objects; ten routes; and eighteen cameras. Its
preliminary integration conflicted with DSM10, DSM12, and the InfoBunker
reservation. Those are not acceptable shared interfaces. Relocate or
recoordinate the annex so all programs exist with zero unreviewed overlap
before release.

## 18. Adult-space architecture and furnishing policy

This policy applies everywhere: C01 public wing, C01 owner club/residences,
Worker Town Gilded Raven, manager mini-mansions, MainStreet warehouse/Guest
Services, Concord nightlife and Broadcast Exchange, holdout home, observatory
estate, RV district, and owner-tunnel rest suites.

The binding, testable implementation source is
`non-graphic-adult-interior-design-standard.md`. It converts the owner's latest
furniture/floor-plan/theme correction into mandatory room anatomy, reusable but
non-cloned themes, Minecraft furnishing vocabulary, exact camera requirements,
and fail conditions. Use that standard for automated and manual acceptance;
this section is its session-level policy summary.

The owner does not expect nudity, anatomy, people, or depicted acts. The owner
does expect the rooms to unmistakably feel designed for their adult purpose.

Every retained adult room must have:

- a named room identity and distinct floor plan;
- entry/privacy/acoustic threshold;
- bed, lounge, platform, booth, table, or stage zone as appropriate;
- seating and observer/viewing relationships where the program calls for them;
- dressing area;
- wash/cleanup area or clear adjacency;
- storage;
- service/refreshment function where appropriate;
- layered materials and color;
- layered ambient, task, and accent lighting;
- non-graphic furniture and equipment silhouettes, which may include swings,
  frames, benches, restraint-themed furniture, screens, curtains, and mirrors;
- safe clear walking paths;
- staff/service/backroom support;
- controlled public/private/performer/owner circulation;
- usable stairs/lifts and two-route egress where required;
- a room-specific furnishing census; and
- a room-specific matched screenshot.

Disallowed:

- people or figures posed as participants;
- visible anatomy or sexual acts;
- explicit text, signs, paintings, maps, or imagery;
- blank rooms passed off as “tasteful”;
- unsafe confinement or inaccessible rooms;
- drug-use instructions or functional harmful mechanisms; and
- real-world tactical/security instructions.

The design vocabulary is hospitality, cabaret, theater, private club, premium
suite, red-room furniture, spa, and nightlife architecture.

## 19. Documentation, database, maps, Sites, and Box

Point-in-time state: `TOWN-EXPANSION CLOSEOUT PENDING`.

### 19.1 Maps and screenshots

- Generate multiple detailed maps for every district and major building.
- Generate one large map of the entire accepted world/program extent.
- Include surface, underground, floor, route, parcel, utility, water, camera,
  and future-development layers as appropriate.
- Take more screenshots of exteriors, interiors, routes, stairs, underground
  spaces, landscapes, water edges, and defects/fixes.
- Use matched camera IDs for before/after and second-pass comparisons.
- Every accepted object gets exact exterior and interior evidence plus floor
  plan where applicable.

### 19.2 Database

- Produce a read-only report of `data/world-map.db` and `data/town.db`,
  including schema, row counts, integrity, objects, rooms, routes,
  observations, media, releases, proposed/superseded/accepted states, and
  orphan counts.
- Import only verified post-state objects.
- Every screenshot/floor-plan relation records object ID, media ID, camera ID,
  view class, release ID, source snapshot, path, dimensions, and SHA-256.
- Zero fabricated filename-only matches.
- Regenerate the world catalog after accepted import.

### 19.3 PM dossier and README

- Produce a very detailed PM-style Markdown/HTML/PDF dossier covering all
  evidenced sessions that day.
- Include chronology, WBS, scope matrix, research sources, design decisions,
  supersessions, maps, floor plans, screenshots, defect/fix evidence, exact
  counts, release ledgers, database report, risks, Sites record, and Box record.
- Validate the PDF visually and mechanically.
- Update the repository `README.md` with the current accepted workflow and
  artifact pointers after closeout.

### 19.4 Box

- Upload every final PDF, screenshot, map, report, machine schedule, database
  report, and publication artifact to Box.
- Verify remote path, Box file ID, bytes, SHA-256, upload time, and verification
  time for every file.
- Zero missing or mismatched rows.
- A successful connection or local staging directory is not verification.

### 19.5 Sites

- Update the existing Sites project recorded by the opaque project ID in
  `world-showcase/.openai/hosting.json`.
- Build from exact committed and pushed source.
- Save a Sites version, deploy only that version, and poll production state.
- Publish maps, screenshots, floor plans, object catalog, database report,
  district pages, research, PM PDF, and evidence states.
- Add and verify a favicon route.
- Verify root, map, object, database, and report pages return HTTP 200 and
  Worker logs show `ok`.
- Never expose the Sites bypass bearer token.

### 19.6 Error 1101 incident memory

At `2026-07-28 02:54:31 UTC`, production returned Cloudflare Error 1101 with Ray
ID `a2209982e8a31497`. The predecessor Worker bundle was repaired and published
as Sites version 4; the root later returned HTTP 200 with Worker outcome `ok`.
That incident must remain in the PM chronology. It does not prove the next
town-expansion version is healthy. Re-test production after the next
source-pinned deployment.

## 20. Release and acceptance contract

No current town-expansion build may be called complete until all applicable
gates pass:

1. freeze one authoritative scope, including every correction in this file;
2. resolve generator ownership and all cross-scope overlaps;
3. take one fresh same-moment immutable snapshot;
4. census fluids, neighbor fluids, gravity, block entities, entities/players,
   protected objects, and missing cells;
5. generate exact guarded forward operations and exact inverse rollback;
6. require zero unauthorized protected block-entity targets;
7. require zero unreviewed cross-scope overrides or package overlaps;
8. pre-support gravity and stage/contain water;
9. run exact-state preflight;
10. run forward and rollback parser dry runs with `--strict-noop --report`;
11. verify practical rollback/compensation order;
12. clear players, bots, and active builders from all target volumes;
13. execute one coordinated transaction in fixed order;
14. freeze the immutable post snapshot;
15. independently verify installed and rollback states;
16. walk all roads, stairs, lifts, tunnels, entrances, and rooms in both
    directions;
17. verify capacities and exact counts;
18. verify C01 concealment and full-envelope classification;
19. verify water containment, portal states, and network isolation;
20. capture and review all matched after evidence;
21. complete the separate miscalculation/underbuilt second pass;
22. correct defects and recapture evidence;
23. import accepted objects and relations into the databases;
24. generate catalog, maps, screenshots, and PM dossier;
25. update README;
26. upload and hash-verify Box;
27. commit/push exact Sites source, save/deploy a version, and health-check it;
   and
28. issue one final transaction/database/media/publication acceptance ledger.

## 21. Fail-closed exact-count register

| Program | Binding count |
|---|---:|
| Residential garages | Attached to every house |
| Large-house garages | 4 or 6 attached bays |
| Worker Town role cottages/manager mini-mansions | 5 |
| Guild Hall | 2 basements + 3 above-grade stories |
| Guild Hall kitchens | 4 |
| Gilded Raven main house | 168 seats |
| Gilded Raven small salons | 5 rooms × 5 guests |
| Gilded Raven one-to-one rooms | 4 |
| Microsoft/DSM hall slots | 24: DSM1–18 + DSM40–45 |
| Rack rows per DSM hall | 40 |
| Microsoft presentation auditorium/theater | 200 seats |
| Microsoft movie theater | 200 seats |
| Meta halls | 12 |
| Google halls | 6 |
| LightEdge EdgeBCC buildings | 2 |
| EdgeBCC quadrants | 4 per building |
| Shared worker disc-golf course | 18 holes, frozen par 58 |
| Concord motel | 25 rooms: 13 ground + 12 upper |
| Concord small theater | 72 main seats |
| Concord theater small salons | 3 rooms × 5 guests |
| Concord theater one-to-one salons | 2 |
| Concord Broadcast Exchange base schedule | 113 rooms |
| Concord Broadcast Exchange dishes | 9: 1 large + 4 medium + 4 small |
| Concord Broadcast Exchange tower decks | 4 |
| Soundstage annex rooms | 84: 35 late-night + 41 sitcom + 8 shared |
| C01 public adult minimum footprint | 5,364 classified blocks |
| C01 public one-to-one rooms | At least 4 |
| C01 other public private/themed rooms | At least 12 |
| C01 owner-club private rooms | At least 12 |
| C01 poly-living suites | Exactly 15 |
| C01 owner master bedrooms | Exactly 3 |
| Observatory destination rooms | 8 in current frozen plan, all inactive |

If a generated report disagrees with this table, stop release and reconcile the
owner correction, source document, coordinate schedule, and generator. Do not
adjust acceptance downward to make a package pass.

## 22. Source-of-truth artifact index

### Session control

- `session-frozen-scope-register.md`
- `session-frozen-scope-register.json`
- `session-control-manifest.json`
- `session-pm-dossier.md`
- `non-graphic-adult-interior-design-standard.md`
- `evidence/town-expansion-program-envelope-audit.md`
- `evidence/town-expansion-program-envelope-audit.json`
- `evidence/town-expansion-database-publication-gap-audit.md`
- `evidence/town-expansion-database-publication-gap-audit.json`
- `object-evidence-and-second-pass-qa-standard.md`
- `independent-release-geometry-safety-audit.md`
- `independent-release-geometry-safety-audit.json`
- `cross-scope-interface-contract-proposal.md`
- `cross-scope-interface-contract-proposal.json`

### Ravensreach and civic

- `town-architecture-siting-survey.md`
- `coordinate-schedule.json`
- `guild-hall-and-bar-source-of-truth.md`
- `guild-hall-program.json`
- `pavilion-east-grounds-and-restricted-underground-source-of-truth.md`
- `pavilion-east-grounds-and-ravensgate-exclusion-coordinate-schedule.json`

### MainStreet

- `attached-garage-requirement-supersession.md`
- `mainstreet-attached-garage-engineering.md`
- `mainstreet-attached-garage-engineering-schedule.json`
- `mainstreet-attached-garage-coordinate-schedule.json`
- `mainstreet-underground-warehouse-rv-district-engineering.md`
- `mainstreet-underground-warehouse-rv-district-engineering.json`
- `mainstreet-underground-warehouse-coordinate-schedule.json`
- `mainstreet-guest-services-rooftop-wellness-design-review.md`
- `mainstreet-guest-services-rooftop-wellness-design-review.json`

### C01 and observatory

- `c01-east-relocation-independent-decision.md`
- `c01-east-relocation-coordinate-schedule.json`
- `c01-hangar-eoc-adult-wing-redesign-source-of-truth.md` — historical and
  partially superseded by SUP-012 through SUP-014; amend before implementation
- `c01-bunker-classification-manifest.schema.json`
- `c01-bunker-square-qa-report.schema.json`
- `northeast-datacenter-c01-relocation-engineering.md`
- `northeast-datacenter-c01-relocation-engineering.json`
- `observatory-estate-and-inactive-portal-gallery-source-of-truth.md`
- `observatory-estate-and-portal-hub-coordinate-schedule.json`

### Worker Town and owner underground

- `worker-town-all-role-cottages-mini-mansion-addendum.md`
- `worker-town-all-role-cottages-mini-mansion-coordinate-schedule.json`
- `worker-town-steward-mini-mansions-source-of-truth.md`
- `worker-town-steward-mini-mansions-coordinate-schedule.json`
- `worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md`
- `worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json`
- `modern-underground-corridor-standard.md`
- `evidence/worker-town-theater-owner-tunnel-survey.json`

### Westlight and westward

- `westlight-island-and-russian-pavilion-change-control.md`
- `westlight-three-venue-audit-and-redesign.md`
- `westlight-three-venue-coordinate-schedule.json`
- `westlight-waterfront-coordinate-schedule.json`
- `westward-entertainment-housing-workforce-change-control.md`
- `westward-paired-parks-engineering.md`
- `westward-paired-parks-masterplan.json`
- `westward-parks-housing-workforce-coordinate-schedule.json`

### Data district and Concord

- `northeast-datacenter-megacampus-source-of-truth.md`
- `northeast-datacenter-megacampus-program.json`
- `northeast-data-campus-coordinate-schedule.json`
- `iowa-data-district-phase0-source-of-truth.md` — title retained for history;
  its content now explicitly supersedes Phase 0 with full build
- `iowa-data-district-full-build-coordinate-schedule.json`
- `evidence/iowa-data-campus-full-build-increment-audit.md`
- `evidence/iowa-data-campus-full-build-increment-audit.json`
- `concord-data-district-service-town-source-of-truth.md`
- `concord-broadcast-exchange-source-of-truth.md`
- `concord-broadcast-exchange-coordinate-schedule.json`
- `concord-broadcast-exchange-soundstage-annex-source-of-truth.md`
- `concord-broadcast-exchange-soundstage-annex-coordinate-schedule.json`
- `evidence/concord-broadcast-exchange-integration-audit.md`
- `evidence/concord-broadcast-exchange-integration-audit.json`

### Publication and handoff

- `box-handoff-audit.md`
- `external-publication-audit.json`
- `media-file-verification-audit.json`
- `world-showcase/.openai/hosting.json`
- `README.md`

## 23. Known conflicts that must not be forgotten

- The latest bunker vehicle-garage/five-level organization is newer than the
  hangar source and requires a source/schedule/compiler amendment.
- The entire bunker must be underground; the observatory/owner penthouse crown
  needs independent support during C01 migration.
- The five manager mini-mansion schedule currently lacks automotive garages and
  conflicts with the standing attached-garage requirement.
- Scout, Surveyor, and Mason cottage siting needs the specific corrections
  listed in section 11.
- The preliminary CBE soundstage reservation collided with DSM10, DSM12, and
  the InfoBunker reservation. Do not allowlist those collisions.
- The current town-expansion exact package is stale and must be regenerated
  against a fresh immutable source after all compiler work.
- Old WIP protected-block-entity problems may not be ignored or relabeled.
- C01, the MainStreet warehouse, and the recovered full parking lot must use one
  coordinated spatial basis.
- The functional Level 5 bunker portal must not be confused with the
  observatory’s entirely inactive portal-gallery frames.
- Box and Sites closeout remain separate proof chains from physical acceptance.

## 24. Future-session startup checklist

1. Read this entire file.
2. Read the newest `AGENTS.md` and `CLAUDE.md`.
3. Inspect the newest transaction/post-state/database/Sites/Box ledgers before
   repeating any status claim.
4. Compare active source documents against section 4 supersessions.
5. Check that C01 is a buried vehicle-garage bunker, not a hangar or stadium.
6. Check exact counts in section 21.
7. Check that every house, including all five manager mini-mansions, has a
   surveyed attached-garage solution and that large houses have four or six
   bays.
8. Check that the Iowa campuses are full build, not Phase 0.
9. Check that adult rooms are fully furnished/themed but non-graphic.
10. Continue the gated release, evidence, database, Box, and Sites sequence
    without promoting unfinished work to accepted status.

## 25. 2026-07-28 live-release and incident addendum

This addendum supersedes the older point-in-time release status but does not
rewrite any owner requirement above.

### 25.1 Current transaction truth

- Town Expansion forward execution committed 484,676 of 484,676 source groups
  with 484,690 changed commands, zero no-ops, and zero failures.
- Transaction ledger:
  `data/world-review/town-expansion-r1-atomic-transaction-full-source-restored-retry-20260728.json`
- Forward execution:
  `data/buildops/town-expansion-r1-2026-07-28.execution.json`
- Terminal immutable block-state snapshot after the committed accessibility,
  citizen-clearance, carpet-source, and ridge-recovery supplements:
  `data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region`
  (`c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`).
- Consolidated post-release QA binds the base transaction and all three ordered
  supplemental transactions, passes all twelve gates, and reports `ACCEPTED`.
  It covers five packages, 3,665,580 unique target cells, all 22 representative
  routes, and all 1,178 accepted media captures.
- The guarded database closeout committed 340 exact objects, one accepted scan,
  340 observations, and 1,152 media relations. The independent read-only census
  passes with database SHA-256
  `71876a7ecf73e90475a9b5047938e14f39ea0a20381dea8c5286582059f95f8a`.
- The physical/media/database release is accepted. The citizen lifecycle
  runtime defect remains a separate follow-up: connected resident health does
  not yet prove structured work/life completion or five exact round trips.
- The final as-built dossier was generated. The bounded Box handoff remotely
  verified all 585 files with zero failures, including a
  separately uploaded and hash-bound verification report.
- Source-pinned Sites version 6 deployed successfully with its ten-digit PIN
  gate and signed HTTP-only session. Internet-public access remains blocked by
  workspace policy, so anonymous visitors encounter the ChatGPT Sites access
  layer before the application PIN until a workspace administrator enables
  public Sites.

### 25.2 Rollback counting policy and exact recap

The durable release knowledge base counts:

- **6 atomic rollback incidents**: one July 27 multi-package redevelopment
  incident, four July 28 Town Expansion base-release transactions, and one
  July 28 Town Expansion accessibility-repair transaction.
- **11 rollback/recovery executions**: eight complete, three failed, none in
  progress.

The eleven executions are:

1. July 27 MainStreet component rollback — complete.
2. July 27 Raven Rock component rollback — complete.
3. July 27 Westlight component rollback — complete.
4. July 28 obsolete-hash generic rollback — failed.
5. July 28 exact prefix-10 recovery — complete.
6. July 28 frozen-rebase generic rollback — failed.
7. July 28 exact prefix-13 recovery — complete.
8. July 28 complete-state generic rollback — failed.
9. July 28 exact prefix-123 recovery — complete, with later-discovered reactive
   short-grass drift outside the successful-prefix proof.
10. July 28 full Paper-strict rollback — complete: 484,635 groups, zero
    failures, followed by a fresh 483,016-of-483,016 source preflight.
11. July 28 accessibility-repair prefix-566 recovery — complete: 566 groups,
    zero failures, followed by a fresh 1,530-of-1,530 source-restoration
    preflight.

The sixth incident occurred after the initial KB rebuild: a generated stair
replacement differed from its source only by serialized property order, so
Paper correctly rejected it as a semantic strict no-op at source group 567.
The runner stopped after 566 changes; the recovery reversed only those 566
journal-proven groups. Generator and preflight canonicalization is now a
required prevention control (`RCS-022`).

Canonical source:
`data/knowledge-base/redevelopment-release-incidents.json`

Searchable SQLite:
`data/knowledge-base/redevelopment-kb.sqlite`

Integrity/artifact audit:
`data/knowledge-base/redevelopment-kb.report.json`

Human ledger:
`knowledge-base/incident-ledger.md`

The database rebuild generated at `2026-07-28T22:04:06.879Z` passes SQLite
integrity, has zero foreign-key errors, zero orphan occurrence-artifact links,
and zero missing evidence artifacts. The current revision contains six
incidents, eleven recovery executions, seventeen QA defects, thirty-seven
separately counted error occurrences, thirty prevention rules, and 126
evidence artifacts. It rejects misplaced incident/QA IDs, duplicate rows,
count/status/group mismatches, missing artifacts, paths outside the repository,
generated-output self-references, missing prevention-rule references, and
input drift before atomically replacing the prior database.

### 25.3 Open and resolved post-QA defects

The KB separately records seventeen post-QA defects so they do not inflate or hide
the six rollback incidents:

- `QA-20260728-01` — resolved and verified: fourteen unwaxed cut-copper cells
  advanced to exposed cut copper after unfreeze. Exact rollback-only policy
  evidence preserves the canonical operation bytes.
- `QA-20260728-02` — resolved: a half-block map center caused fractional Anvil
  lookups and a blank Data District map. Integer-center rendering is verified.
- `QA-20260728-03` — offline repair verified, live gate pending: the obsolete
  citizen commute failed at physically occupied checkpoints. Terminal route
  geometry passes, but citizen runtime lifecycle acceptance remains separate.
- `QA-20260728-04` — resolved: the route failure-map renderer dereferenced a
  null physical-width record and crashed. It now emits terminal failure
  evidence.
- `QA-20260728-05` — resolved and verified: rejected low-information C01,
  sales-office, and Gilded Raven frames are preserved. The terminal v6 render
  passes 1,178 of 1,178 captures and paired media QA is accepted.
- `QA-20260728-06` — resolved: the first media defect was briefly placed in the
  incidents array. Count/classification validation rejected the malformed KB;
  it was moved to the QA collection before the database was rebuilt.
- `QA-20260728-07` — resolved: Sites version 3 returned Worker Error 1101, Ray
  `a2209982e8a31497`. Version 4 bundled the OpenNext worker and the production
  root returned HTTP 200.
- `QA-20260728-08` — implemented, production verification blocked: Sites
  version 6 includes an explicit favicon route and passes the local production
  build check. Anonymous production verification is blocked by the workspace
  access layer.
- `QA-20260728-09` — historical/not reexecuted: the predecessor bunker Phase 1
  manifest correctness defect is retained as historical evidence and not
  misrepresented as a current rerun.
- `QA-20260728-10` — resolved and verified: the archived baseline passed only
  fourteen of twenty-two routes. Accessibility attempt 2 committed 1,526 of
  1,526 guarded cells, and terminal as-built QA against the final snapshot now
  passes twenty-two of twenty-two routes, forty-four of forty-four directions,
  and all four isolation contracts with no projection or overlay.
- `QA-20260728-11` — resolved and verified: the KB builder now performs
  fail-closed artifact/path/self-reference validation, rehashes inputs before
  atomic replacement, records separately counted occurrences, and has passed
  independent SQL integrity and orphan-link checks.
- `QA-20260728-12` — resolved and verified: the final verifier and database
  importer bind the base plus three ordered supplemental transactions, logical
  source overlay, rollback policy, and terminal snapshot.
- `QA-20260728-13` — open runtime follow-up: the five residents remain healthy
  but the twenty-minute observer did not prove structured work/life outcomes or
  five exact round trips. This does not invalidate accepted physical, media, or
  database evidence.
- `QA-20260728-14` — resolved and verified: two complete media verifications
  were OOM-killed by accumulating native image surfaces. Reusable serialized
  surfaces and a bounded runner reduced the accepted rerun to 182,480 KB peak
  RSS without changing image metrics.
- `QA-20260728-15` — resolved and verified: map records no longer inherit
  perspective FOV, and consolidated QA resolves relative outputs beside the
  bound renderer report.
- `QA-20260728-16` — resolved and verified: database parent census now scopes
  in-registry IDs to the accepted project. The final read-only census passes
  340 features, 340 observations, and 1,152 media relations.
- `QA-20260728-17` — external administrator blocked: source-pinned Sites
  version 6 deployed successfully, but workspace policy rejected
  internet-public access. The owner-only deployment remains healthy and the
  separate Box handoff is remotely verified.

The terminal post-release verifier accepts the physical/media evidence chain.
Box is remotely verified and Sites version 6 is deployed; only the Sites
internet-public access policy and citizen lifecycle follow-up remain open.
Neither is conflated with the accepted Town Expansion snapshot.

### 25.4 Citizen activation tooling

The activation scripts are rebound to terminal snapshot
`71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d`
and exact path
`9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701`.
The corridor phase is active and all five bots are connected, but autonomous
shifts remain paused. Three fresh live-walk attempts are retained:

- `20260728T165823Z` passed all 49 forward checkpoints and failed reverse
  checkpoint 13 at the final lip.
- `20260728T171521Z` failed forward checkpoint 25 after an over-broad
  no-progress recovery fired during long-range planning. The recovery is now
  range-bounded and the focused tests/backend build pass.
- `20260728T172625Z` failed closed during staging because Surveyor remained on
  the prior attempt's shoulder at `[-79,68,-32]` and could not path to
  `[-82,65,-19]`.
- `20260728T180433Z` proved the one-cell leaf-clearance repair by staging from
  that exact shoulder and passing all forty-nine forward checkpoints. It still
  failed reverse checkpoint 13 at the road crown because production movement
  allowed parkour while the certified route contract explicitly forbids it.

All four failures recorded zero digging and no security incident. The exact
head-height leaf was removed by a one-cell exact-guarded transaction with a
one-cell inverse rollback. Production movement is now aligned to the declared
no-parkour safety model, focused tests and the backend build pass, and the
managed service is restarting for another full bidirectional gate. No schedule
mutation is allowed without a matching `PASS_BIDIRECTIONAL` live audit
containing all 49 forward and 49 reverse receipts, zero digging, and no
security incidents.

## 26. Mandatory postmortem reminder

At terminal release closeout, remind the owner to launch the full fan-out
postmortem captured in `POSTMORTEM_HANDOFF.md`. It must explain why the work
took so long, audit preventable rework and coordination failures, and decide
which atomic-release, route, media, KB, PDF, Box, and Sites tooling should be
built in-house.
