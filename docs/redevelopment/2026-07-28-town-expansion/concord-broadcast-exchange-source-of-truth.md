# Concord Broadcast Exchange

**Project ID:** `CBE-001`  
**Status:** frozen architectural source of truth; implementation and live release
remain pending  
**District:** Concord Data-District Service Town  
**Prepared:** 2026-07-28 UTC  
**Coordinate schedule:**
[`concord-broadcast-exchange-coordinate-schedule.json`](concord-broadcast-exchange-coordinate-schedule.json)  
**Adult-content boundary:** architecture, furniture silhouettes, lighting,
circulation, controlled access, and hospitality atmosphere only. There are no
figures, body-part motifs, explicit images, explicit signs, or depicted sexual
acts.  
**Cannabis boundary:** the two botanical-retail rooms and open-air garden are
fictional Minecraft placemaking. They do not represent a real Iowa license,
product, transaction, consumption instruction, or legal claim.

## 1. Binding design decision

The Concord Broadcast Exchange is the ordinary-looking media building that
quietly became a district within a district. Concord Road first presents a
credible brick-and-copper café, cowork hall, creator reception, and glazed
showcase. The deeper production bar contains podcast, gaming, variety, and
adults-only performance streaming rooms. An arcade, two billiards rooms, and a
creator lounge make it possible to spend an entire shift break inside without
the frontage becoming a themed façade.

Below that ordinary building are two clearly separated levels:

- **B1 / Night Market:** two original Belle Époque-inspired cabaret and
  exhibition halls, two coffee rooms, two fictional botanical-retail rooms,
  after-show lounge, backstage rooms, and an open-to-sky sunken garden;
- **B2 / Set Lab:** eight non-graphic bondage-themed capture rooms, four shared
  control booths, scenery/prop/equipment support, post-production, storage, and
  plant.

The underground spaces are not a confusing tunnel attraction. Public,
creator/performer, service, tower-maintenance, and emergency routes remain
legible and independent. Nothing connects to Ravensgate, the Worker Town owner
corridor, the Gilded Raven owner corridor, an inactive portal room, or a future
owner-city reservation.

A tall lit lattice broadcast tower is visually connected to master control by
a glazed cable gallery. A separate fenced satellite-maintenance pad holds one
large, four medium, and four small dish analogues, an equipment shelter, and a
service apron. These are fictional visual infrastructure. There are no real
frequencies, radio-security topology, transmission parameters, or compliance
claims.

## 2. Coordinated site and factual survey

The data-district siting team reserved the Broadcast Exchange at
`x 680..730, z -425..-350`. Public arrival is from the west toward the campus
road; service arrival is from the east; independent discharge directions are
north and south. The satellite pad is surface-only immediately east of that
reservation.

The following census was read from the immutable snapshot
`data/worldsnap-town-expansion-expanded-baseline-20260728T0405Z/region`,
SHA-256
`e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a`.
It did not connect to or mutate the live world.

| Survey object | Survey bounds | Ground range | Fluid / block-entity result | Binding consequence |
|---|---|---:|---|---|
| Main studio | `[680,25,-425,715,100,-350]` | y `56..66` | 0 fluid, 0 lava, 0 bubble column, 0 block entities; 1,452 gravity cells | B1/B2 envelope is dry; top-down pre-support and a new same-moment census remain mandatory |
| Broadcast tower | `[717,25,-425,730,150,-411]` | y `62..64` | 0 fluid, 0 lava, 0 bubble column, 0 block entities; 132 gravity cells | Tower may use the north service bench after a structural/fall-protection analogue review |
| Sunken garden | `[717,25,-380,730,100,-352]` | y `55..64` | 0 fluid, 0 lava, 0 bubble column, 0 block entities; 149 gravity cells | Open-to-sky terracing can follow the existing depression without a giant slab |
| Satellite pad | `[737,25,-425,769,100,-390]` | y `63..65` | 169 water cells below y45 in this survey band, 0 lava, 0 bubble column, 0 block entities; 481 gravity cells | Surface-only work at y62 and above; no basement, trench, deep footing, drain, or conduit may disturb the buried water |

The wider satellite-column census found water at `x 737..766`,
`y 0..45`, `z -404..-390`. The pad therefore uses a shallow floating apron
and above-grade utility bridge. The buried water is a protected exclusion, not
a nuisance pocket to drain.

The natural site is not level. The building receives a compact y65 floor datum,
but its perimeter uses y63/y64 planted benches, a retained low point near the
south garden, short planted slopes, and a bridge condition where the ground
drops. There is no district-wide flat pad or exposed cliff.

### 2.1 Reserved envelopes

| Object ID | Exact bounds | State |
|---|---|---|
| `CBE-SHELL-001` | `[680,38,-425,715,84,-350]` | Main two-story/two-basement shell |
| `CBE-TOWER-001` | `[717,64,-425,730,145,-411]` | Landmark lattice tower and maintenance base |
| `CBE-GARDEN-001` | `[717,53,-380,730,64,-352]` | Open-to-sky B1 sunken garden |
| `CBE-SAT-001` | `[737,62,-425,769,78,-390]` | Surface-only dish field |
| `CBE-SERVICE-001` | `[716,63,-410,730,68,-382]` | East loading/service lane and above-grade utility interface |

The satellite reservation carries a no-entertainment/no-lodging buffer through
`[733,60,-429,773,90,-386]`. The final Concord collision pass must prove that
the pad is separated from the motel, Night Court, future-entertainment parcels,
and any power yard. The existing Concord entertainment/beehive reserve centered
near `(759,69,-340)` remains outside the pad; its required five-block no-target
buffer remains binding.

## 3. Research translated into design

### 3.1 Broadcast production and acoustics

The U.S. Air Force television-production facility description groups a
soundproofed studio with set construction/storage, scenery storage, video and
audio control, equipment support, and substantial electrical/HVAC demand. That
supports the Exchange's production rooms, master control, equipment checkout,
loading, scenery workshop, and plant as one coordinated facility rather than a
row of empty sets.

The Department of Defense architecture criteria say broadcast facilities need
an acoustical consultant and that acoustic design must coordinate sound
isolation, mechanical noise/vibration, room finishes, and adjacency. The
Exchange therefore:

- keeps loading, arcade, billiards, plant, and cabaret rooms away from podcast
  microphones through buffers and separate structural bays;
- gives every microphone room an acoustic vestibule analogue;
- puts noisy plant and scenery support on the east/service side;
- avoids back-to-back studio doors;
- uses isolated-looking floors/ceilings, soft wall bands, and low-noise supply
  plenums as Minecraft analogues; and
- treats all numeric acoustic performance as a future specialist task, not a
  claim made by the block model.

Sources:

- [WBDG / U.S. Air Force — Television Production Facility, FAC 141389](https://www.wbdg.org/FFC/AF/AFMAN/141389_Television_Production_Facility.pdf)
- [WBDG / DoD — UFC 3-101-01 Architecture](https://www.wbdg.org/api/documents/media/22d1a412-54f9-4435-a023-3336124ee38b/file)
- [OSHA — Occupational Noise Exposure](https://www.osha.gov/noise)

### 3.2 Assembly routes, sightlines, and egress

The U.S. Access Board requires accessible routes to connect site arrival points,
entrances, spaces, and performance/performer ancillary areas. Its assembly
guidance protects equivalent lines of sight and seats/bays adjoining—but not
overlapping—circulation. Its egress guide explains that accessible spaces
generally need two accessible means of egress where two exits are required.

The Exchange translates those principles into Minecraft planning analogues:

- the west walk, ordinary lobby, both halls, stage routes, backstage rooms, B1
  garden, and all production levels share the same broad public/creator lift
  system rather than a hidden accessibility detour;
- Hall A has exactly 84 audience positions: 80 seat blocks and four open-bay
  analogues with adjacent companion positions among the 80 seats;
- Hall B has exactly 42 audience positions: 40 seat blocks and two open-bay
  analogues with adjacent companion positions among the 40 seats;
- every audience position sees a real stage and backdrop/screen;
- raked floors, side aisles, rear cross aisles, and open bays remain outside
  the counted seats;
- north and south stair/lift pairs discharge independently to the exterior;
- below-grade spaces have two separated stair enclosures plus a lift/area-of-
  refuge visual analogue; and
- final capacity, exit-width, fire-rating, sprinkler, and code determinations
  remain professional/legal tasks. This Minecraft plan does not claim code
  compliance.

Sources:

- [U.S. Access Board — ADA Accessibility Standards](https://www.access-board.gov/ada/)
- [U.S. Access Board — Accessible Means of Egress](https://www.access-board.gov/ada/guides/chapter-4-accessible-means-of-egress/)
- [UK Health and Safety Executive — Venue and Site Design](https://www.hse.gov.uk/event-safety/venue-site-design.htm)
- [UK Health and Safety Executive — Crowd Management Controls](https://www.hse.gov.uk/event-safety/crowd-management-controls.htm)

### 3.3 Indoor smoke boundary

CDC's evidence review says ventilation, separation, and air cleaning do not
eliminate secondhand-smoke exposure. The project therefore rejects an enclosed
smoking room. Both fictional botanical shops and both coffee rooms are
smoke-free.

The only represented consumption place is `CBE-GARDEN-001`: a B1-level,
open-to-sky sunken garden with no roof, no smoke particles, no fire/campfire
blocks, no staff workstation, and two vestibules between it and enclosed
interiors. Its material language—benches, planters, low lights, and an open
lightwell—communicates a place to sit without pretending an exhaust fan makes
indoor smoke safe.

Source:

- [CDC — Ventilation Does Not Effectively Protect People from Secondhand Smoke](https://archive.cdc.gov/www_cdc_gov/tobacco/secondhand-smoke/protection/ventilation.htm)

### 3.4 Tower and satellite visual infrastructure

FAA guidance says structures over 200 feet/61 metres above ground normally
receive marking/lighting consideration, while the actual recommendation depends
on an aeronautical study. The Exchange tower uses red warning-light analogues at
its crown and intermediate maintenance decks solely as a visual prompt. It is
not a real-height equivalency or compliance representation.

OSHA's tower resources emphasize fall protection, training, and safe access.
The tower therefore has a fenced base, locked-looking maintenance gate,
internal ladder/cage analogue, rest platforms, maintenance shelter, and a
separate service route. Public circulation never passes through the fall zone.

NASA describes a ground station as antenna, feed, modem/control, software,
foundations, and operations/maintenance infrastructure. That supports a
multi-scale dish field, equipment shelter, maintenance apron, and visible
master-control relationship without exposing real frequencies or system
topology.

Sources:

- [FAA — Aircraft Warning Lights on Tall Structures](https://www.faa.gov/faq/what-are-requirements-aircraft-warning-lights-tall-structures)
- [FAA — AC 70/7460-1M, Obstruction Marking and Lighting](https://www.faa.gov/documentLibrary/media/Advisory_Circular/2024-10-28_AC_70-7460-1M_Change_1_Obstruction_Marking_and_Lighting_FINAL.pdf)
- [OSHA — Communication Towers](https://www.osha.gov/communication-towers)
- [NASA SmallSat Institute — Ground Data Systems and Mission Operations](https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/)

## 4. Architectural character and materials

### 4.1 Ordinary Concord Road face

- dark red brick, brown terracotta, dressed stone base, oxidized-copper trim,
  warm oak doors, and large but not full-glass café/cowork windows;
- one vertical `CONCORD BROADCAST EXCHANGE` blade sign and restrained ON AIR
  light boxes;
- café awning, creator bench, bicycle/shuttle lay-by analogue, rain garden, and
  trees;
- no erotic sign, figure, body-part motif, drug leaf, giant screen, or blank
  service wall;
- night-court identity appears only after entering the building or turning into
  the service-town interior.

### 4.2 Production levels

- charcoal/deepslate acoustic shells, wool and carpet absorption analogues,
  cyan/amber wayfinding bands, dark-oak equipment desks, and glass control
  windows;
- every studio receives a real backdrop, camera position, key/fill/back-light
  rig, operator desk, storage niche, and acoustic vestibule;
- adult-performance rooms use abstract canopies, textiles, upholstered bench
  analogues, and controllable colored light only;
- no studio is an empty decorated cube.

### 4.3 B1 Night Market

- original Belle Époque vocabulary: plum/crimson velvet-color wool, dark oak,
  gilded copper, patterned blackstone/terracotta floors, curved balcony fronts,
  floral plaster analogues, and warm chandeliers;
- it may evoke the exuberance of late-19th-century cabaret architecture but
  does not copy Moulin Rouge's windmill, name, marks, exact interior, or façade;
- Hall A is the larger 84-position broadcast cabaret; Hall B is a more intimate
  42-position exhibition salon;
- two coffee rooms and two fictional botanical boutiques form a small indoor
  market street outside the halls.

### 4.4 B2 Set Lab

- pale stone structural liner, black/gray service floor, plum/cyan room
  identities, bright task lighting, clear numbered doors, and visible service
  spine;
- eight non-graphic bondage-themed rooms use modular frames, fabric panels,
  padded-furniture analogues, and lighting grids only;
- there are no figures, restraints applied to a figure, explicit text, or
  sexual animation.

## 5. Exact program and room counts

All room IDs and exact bounds are machine-readable in the coordinate schedule.
Bounds include the room shell. Corridors, wall thickness, and vestibules are
separate objects and are not double-counted as rooms.

### 5.1 G0 — y65 floor / y66..72 clear

| Program | Exact count | IDs / notes |
|---|---:|---|
| Public café | 1 | `CBE-G0-CAFE-001`, ordinary street frontage |
| Reception/check-in | 1 | `CBE-G0-LOBBY-001` |
| Cowork commons | 1 | `CBE-G0-COWORK-001` |
| Creator commons | 1 | `CBE-G0-COMMONS-001` |
| Public showcase | 1 | `CBE-G0-SHOWCASE-001` |
| Master control | 1 | `CBE-G0-MCR-001`, direct visual/cable link to tower |
| Ingest/QC | 1 | `CBE-G0-INGEST-001` |
| Edit suites | 2 | `CBE-G0-EDIT-001..002` |
| Podcast rooms | 6 | `CBE-G0-POD-001..006` |
| Shared podcast control rooms | 3 | `CBE-G0-PODCTL-001..003` |
| Gaming streaming minis | 4 | `CBE-G0-GAME-001..004` |
| Variety streaming minis | 2 | `CBE-G0-VAR-001..002` |
| Equipment checkout | 1 | `CBE-G0-GEAR-001` |
| Public toilets | 2 | `CBE-G0-WC-001..002` |
| Staff/creator focus offices | 4 | `CBE-G0-OFFICE-001..004` |

### 5.2 G1 — y74 floor / y75..82 clear

| Program | Exact count | IDs / notes |
|---|---:|---|
| Arcade | 1 | `CBE-G1-ARCADE-001`; acoustically buffered from studios |
| Billiards rooms | 2 | `CBE-G1-BILLIARDS-001..002`; two tables each, four total |
| Creator lounge | 1 | `CBE-G1-LOUNGE-001` |
| Demonstration-kitchen studio | 1 | `CBE-G1-KITCHEN-001`; ordinary food/lifestyle production |
| Gaming streaming minis | 6 | `CBE-G1-GAME-005..010` |
| Variety streaming minis | 7 | `CBE-G1-VAR-003..009` |
| Adult-performance streaming minis | 8 | `CBE-G1-ADULT-001..008`; non-graphic |
| Mini-studio technical hubs | 3 | `CBE-G1-TECH-001..003` |
| Quiet/recovery rooms | 2 | `CBE-G1-QUIET-001..002` |
| Public toilets | 2 | `CBE-G1-WC-001..002` |

**Combined above-ground studio totals:** 6 podcast rooms, 10 gaming rooms,
9 variety rooms, 8 adult-performance rooms, 3 shared podcast controls,
3 mini-studio technical hubs, 1 master control, 1 ingest/QC room, and 2 edit
suites.

### 5.3 B1 — y53 floor / y54..63 clear

| Program | Exact count / capacity | IDs / notes |
|---|---:|---|
| Belle Époque-inspired Hall A | 1 / 84 audience positions | 80 seats + 4 open-bay analogues; real stage, screen/backdrop, two side aisles, rear cross aisle |
| Belle Époque-inspired Hall B | 1 / 42 audience positions | 40 seats + 2 open-bay analogues; real stage, screen/backdrop, side aisles |
| Coffee rooms | 2 | `CBE-B1-COFFEE-001..002`; smoke-free |
| Fictional botanical boutiques | 2 | `CBE-B1-BOTANICAL-001..002`; smoke-free, no product/transaction simulation |
| After-show lounge | 1 | `CBE-B1-LOUNGE-001`; smoke-free |
| Open-to-sky garden | 1 / 24 seats | `CBE-GARDEN-001`; no staff station, smoke/fire blocks, or roof |
| Green rooms | 2 | `CBE-B1-GREEN-001..002` |
| Dressing rooms | 6 | `CBE-B1-DRESS-001..006` |
| Wardrobe/makeup rooms | 2 | `CBE-B1-WARDROBE-001..002` |
| Age/coat/check-in room | 1 | `CBE-B1-CHECK-001` |
| Hall control booths | 2 | `CBE-B1-HALLCTL-001..002` |
| Public toilets | 2 | `CBE-B1-WC-001..002` |
| Staff/performer toilet | 1 | `CBE-B1-WC-003` |

### 5.4 B2 — y41 floor / y42..51 clear

| Program | Exact count | IDs / notes |
|---|---:|---|
| Non-graphic themed set rooms | 8 | `CBE-B2-SET-001..008` |
| Shared set-control booths | 4 | `CBE-B2-SETCTL-001..004` |
| Scenery workshop | 1 | `CBE-B2-SCENERY-001` |
| Prop store | 1 | `CBE-B2-PROP-001` |
| Equipment cage | 1 | `CBE-B2-GEAR-001` |
| Underground edit suites | 2 | `CBE-B2-EDIT-001..002` |
| Green/recovery rooms | 2 | `CBE-B2-GREEN-001..002` |
| Clean storage rooms | 2 | `CBE-B2-STORE-001..002` |
| Electrical/UPS visual plant | 1 | `CBE-B2-ELEC-001` |
| Mechanical/acoustic plant | 1 | `CBE-B2-MECH-001` |
| Staff toilet | 1 | `CBE-B2-WC-001` |

## 6. Adjacency and isolation rules

### 6.1 Must-touch adjacencies

- master control → ingest/QC → edit suites → cable gallery;
- cable gallery → tower equipment base;
- each two podcast rooms → one shared podcast control;
- gaming/variety/adult mini-room banks → nearest technical hub;
- Hall A/Hall B → dedicated hall control → backstage spine;
- backstage spine → green rooms → wardrobe/makeup → dressing rooms;
- B2 set pairs → shared control booth → equipment/scenery support;
- service lane → loading room → freight lift → B1/B2 service spine;
- B1 coffee/botanical rooms → Night Market circulation, not backstage;
- open-air garden → two vestibules → Night Market; garden → independent
  exterior stair/ramp analogue.

### 6.2 Must-not-touch adjacencies

- podcast rooms may not share a wall with arcade, billiards, loading, tower
  machinery, halls, workshop, mechanical plant, or the open-air garden;
- public café/cowork circulation may not pass through adult rooms, backstage,
  B2 set labs, loading, tower base, or satellite pad;
- botanical shops and coffee rooms may not contain smoking/fire particles;
- the satellite pad may not share a public path or foundation with the motel,
  Night Court, future entertainment, or a power yard;
- no room may connect to Ravensgate, Worker Town/Gilded Raven owner routes,
  portal rooms, or the future owner-city reservation.

## 7. Circulation and operational routes

| Route ID | Users | Exact sequence | Isolation |
|---|---|---|---|
| `CBE-ROUTE-PUBLIC-01` | café/cowork/showcase visitors | west forecourt → lobby → café/cowork/showcase | never enters production or nightlife |
| `CBE-ROUTE-CREATOR-01` | checked-in creators | lobby → creator commons → north public stair/lift → G1 studio spine | controlled threshold after lobby |
| `CBE-ROUTE-NIGHT-01` | adults-only event guests | lobby age desk → broad B1 stair/lift → Night Market → halls/coffee/botanical/lounge/garden | no backstage/B2 access |
| `CBE-ROUTE-PERFORMER-01` | performers/production crew | east check-in → service core → green/wardrobe/dressing → stage/set doors | never crosses seated audience queue |
| `CBE-ROUTE-SERVICE-01` | deliveries/scenery/equipment | east service lane → loading → freight lift → B1/B2 service spine | no café or public-lobby movement |
| `CBE-ROUTE-EGRESS-N` | all occupied levels | north stair/lift/refuge analogue → north exterior discharge | independent of south discharge |
| `CBE-ROUTE-EGRESS-S` | all occupied levels | south stair/lift/refuge analogue → south exterior discharge | independent of north discharge |
| `CBE-ROUTE-TOWER-01` | maintenance only | east service lane → fenced tower gate → tower shelter/ladder/platforms | no public access; fall zone isolated |
| `CBE-ROUTE-SAT-01` | dish maintenance only | district service road → pad gate → apron/shelter/dish walks | no public/nightlife path |
| `CBE-ROUTE-GARDEN-01` | B1 guests | Night Market → vestibule A → open garden → vestibule B/exterior route | open sky; no enclosed recirculating-air claim |

Four broad stair/lift pairs—north public, south public, northeast service, and
southeast service—serve all occupied levels. A central freight lift serves
equipment and scenery. Every stair uses full block runs, regular landings,
continuous guards/handrails, a minimum four-block clear walking width in the
Minecraft model, and no jump-only geometry.

## 8. Systems and support schedule

### 8.1 Broadcast and data

- one master control, one ingest/QC room, five local control groups
  (three podcast and two hall), three G1 technical hubs, and four B2 set-control
  booths;
- visible overhead cable trays run to an east riser and the tower gallery;
- the satellite pad uses one above-grade utility bridge; nothing trenches into
  the protected water seam;
- systems are represented by colored glass, copper, observers, lamps, and
  server-rack analogues only—no real network diagram, frequencies, credentials,
  or security topology.

### 8.2 Mechanical/acoustic

- separate visual air-handling zones for public/café, studios, B1 assembly,
  B2 sets, plant/service, and toilets;
- no return-air analogue from the open garden;
- mechanical rooms sit east/south of microphone rooms with storage/corridor
  buffers;
- tower and dish equipment use exterior equipment shelters;
- final acoustic/HVAC performance requires specialist analysis.

### 8.3 Fire/life-safety visual analogues

- two separated discharge directions from every occupied level;
- illuminated-looking exit markers, emergency-light rhythm, refuge/intercom
  niches, protected-looking stairs, and clear cross aisles;
- no decorative arch, curtain, booth, queue, camera, or seat may reduce aisle
  clearance;
- no open flame, campfire, lava, smoke particle, or active portal is introduced;
- Minecraft analogues do not constitute code certification.

### 8.4 Back-of-house

- one east loading room with direct freight-lift alignment;
- scenery workshop, prop store, equipment cage, two clean stores, and wardrobe
  rooms;
- two green rooms at B1, two recovery/green rooms at B2, six B1 dressing rooms,
  staff toilets, and two G1 quiet rooms;
- waste and deliveries remain east of the public frontage and are screened by
  brick/copper walls and planting, not a blank façade.

## 9. Tower and satellite component schedule

### 9.1 `CBE-TOWER-001`

- lattice base: `[718,64,-425,730,72,-413]`;
- seven-block-wide lattice shaft: `[721,73,-422,727,144,-416]`;
- maintenance decks centered at y84, y104, y124, and y144;
- red warning-light visual analogues at the intermediate decks and crown;
- one fenced equipment shelter, one maintenance gate, one internal ladder/cage
  analogue, one service lay-by, and one glazed cable-gallery link to master
  control;
- public path and Night Market route remain outside the fenced fall-zone
  analogue;
- final build must repeat the entity, fluid, block-entity, gravity, and
  collision census over the full y64..145 envelope.

### 9.2 `CBE-SAT-001`

- fence: `[737,63,-425,769,68,-390]`;
- shallow apron: `[739,63,-423,767,65,-397]`;
- equipment shelter: `[739,64,-403,750,72,-392]`;
- service apron/turning area: `[752,63,-405,767,65,-392]`;
- dish analogues: one large, four medium, and four small;
- no dish extends into public road clearance, tower fall zone, planted buffer,
  or the preserved beehive/entertainment reserve;
- all footings remain at y62 or above, and all utilities cross above grade;
- no real frequencies, antenna pointing, control credentials, or emissions
  claims are recorded.

## 10. Database and matched-media contract

Every scheduled room/site component is an individual object candidate with:

- stable `objectId`;
- exact 3D bounds;
- floor/program/capacity;
- material and adjacency tags;
- implementation status;
- dependency and exclusion fields; and
- one or more planned camera IDs.

After deployment, the first-pass capture must be joined to the exact database
object by ID. A screenshot filename alone is not evidence. The first pass
creates a defect log for empty rooms, blocked sightlines, confusing entries,
unwalkable stairs, bad terrain seams, missing stage/screen, material repetition,
or route contamination. Fixes are followed by a second matched capture from the
same camera. Only second-pass accepted media may enter the Sites showcase.

## 11. Camera candidates

| Camera ID | Position → target | Required evidence |
|---|---|---|
| `CBE-CAM-001` | `(666,70,-387)` → `(684,69,-387)` | ordinary Concord Road façade, sign, café/cowork windows |
| `CBE-CAM-002` | `(684,69,-404)` → `(689,68,-395)` | café-to-lobby transition and ordinary frontage |
| `CBE-CAM-003` | `(701,69,-412)` → `(704,69,-421)` | master control, ingest, tower cable link |
| `CBE-CAM-004` | `(704,69,-396)` → `(694,69,-396)` | paired podcast rooms and real control window |
| `CBE-CAM-005` | `(704,78,-405)` → `(693,78,-405)` | G1 mini-studio row and wayfinding |
| `CBE-CAM-006` | `(688,78,-395)` → `(686,78,-414)` | arcade and two-table billiards identity |
| `CBE-CAM-007` | `(689,58,-399)` → `(688,57,-419)` | Hall A real stage, screen/backdrop, rake and 84 positions |
| `CBE-CAM-008` | `(689,58,-381)` → `(688,57,-395)` | Hall B stage, rake and 42 positions |
| `CBE-CAM-009` | `(696,58,-365)` → `(686,57,-365)` | two coffee/two botanical storefront sequence |
| `CBE-CAM-010` | `(720,58,-365)` → `(725,57,-365)` | open sky, two vestibules, terraces, 24-seat garden |
| `CBE-CAM-011` | `(700,46,-405)` → `(686,46,-405)` | B2 numbered set-lab pair and shared control |
| `CBE-CAM-012` | `(711,46,-367)` → `(696,46,-367)` | scenery, prop, gear, post and service spine |
| `CBE-CAM-013` | `(690,83,-407)` → `(724,112,-419)` | full tower silhouette, decks and warning-light analogues |
| `CBE-CAM-014` | `(730,72,-406)` → `(752,70,-407)` | complete nine-dish field, fence, shelter and apron |
| `CBE-CAM-015` | `(731,69,-395)` → `(716,68,-400)` | east loading, freight/service separation |
| `CBE-CAM-016` | `(705,59,-410)` → `(699,58,-420)` | backstage route distinct from Hall A audience |
| `CBE-CAM-017` | `(697,47,-370)` → `(710,46,-370)` | B2 support/plant buffers and clear egress |
| `CBE-CAM-018` | `(674,76,-408)` → `(724,105,-419)` | building/tower identity within Concord streetscape |

Exact camera block viability must be rechecked against the post-build snapshot.
If a camera cell is occupied, move it minimally and record the reviewed
replacement rather than fabricating a match.

## 12. Release gates and acceptance tests

### 12.1 Geometry and state

- all object IDs and bounds in the JSON schedule are generated or explicitly
  reported deferred;
- zero unreviewed cross-scope target collisions;
- main/tower/garden fluid and block-entity census remains zero in the fresh
  same-moment snapshot;
- satellite work remains y62+ and does not target any protected water cell;
- gravity cells are pre-supported/top-down handled and exact-listed;
- every forward state has an exact rollback partner;
- zero lava, bubble column, active portal, aquatic block, smoke particle, or
  fire block is introduced.

### 12.2 Program

- G0 exact counts pass: 6 podcast, 3 podcast control, 4 gaming, 2 variety,
  2 edit, 4 focus offices, and all five public rooms;
- G1 exact counts pass: 6 gaming, 7 variety, 8 adult mini studios, 3 technical
  hubs, 1 arcade, 2 billiards rooms/4 tables, 1 creator lounge, and 1 demo
  kitchen;
- Hall A has exactly 80 seats + 4 open bays and Hall B exactly 40 seats + 2
  open bays;
- B1 has exactly 2 coffee rooms, 2 fictional botanical shops, 2 halls,
  2 green rooms, 6 dressing rooms, 2 wardrobe/makeup rooms, and one 24-seat
  open garden;
- B2 has exactly 8 set rooms, 4 control booths, 1 scenery workshop, 1 prop
  store, 1 equipment cage, 2 edit rooms, 2 green/recovery rooms, 2 clean
  stores, and 2 plant rooms;
- the tower has four maintenance decks and red warning-light visual analogues;
- the pad has exactly 1 large + 4 medium + 4 small dish analogues.

### 12.3 Walkability, accessibility, and routes

- public, creator, event, performer, service, tower, satellite, and garden
  routes pass independently;
- normal walking passes both directions through every public and service route;
- no stair requires jumping; lifts serve the same principal circulation zone;
- stage/backstage and audience routes do not cross;
- open-bay analogues adjoin but do not overlap aisles;
- every occupied below-grade space reaches both north and south discharge
  systems;
- no Exchange route touches Ravensgate, owner corridors, portal rooms, or the
  future owner-city reservation.

### 12.4 Content and smoke boundaries

- no explicit image, figure, animation, text, or body-part motif;
- adult rooms remain architectural/non-graphic;
- botanical shops are visibly fictional and smoke-free;
- no indoor smoking room exists;
- the open garden remains roofless, fire/smoke-particle-free, and separated
  from enclosed interiors by two vestibules;
- no real-world cannabis legality, license, product, sale, or consumption claim.

### 12.5 Terrain, district, and media

- building uses compact benching/bridging, planted slopes, and retained
  depressions rather than a mega-pad;
- the buried satellite-pad water seam remains unchanged;
- satellite/tower service does not cross motel/Night Court/public circulation;
- final collision report proves pad separation from lodging, nightlife,
  future-entertainment, power, and beehive reserves;
- all 18 planned cameras receive first-pass evidence, reviewed defect status,
  any required fix, and second-pass matched recapture;
- database object-to-media joins reference stable object IDs;
- Sites receives only accepted second-pass media and labels the build state
  truthfully.

## 13. Explicit holds

- This document does not authorize a live world release.
- Surface coordinates must be reconciled with the final Concord complete-town
  generator and the full-build Meta/Google/LightEdge district road/power
  network. Future expansion parcels beyond those completed campuses remain
  protected.
- The satellite pad may not receive below-grade work; its water exclusion is
  binding.
- Tower structural capacity, real fall protection, aviation review, RF safety,
  fire/life-safety, accessibility, acoustic performance, and cannabis legality
  are outside a Minecraft model and are not certified here.
- A new same-moment snapshot, exact guards, entity/player clearance, protected
  inventory review, dry-run with strict-noop reporting, coordinated atomic
  transaction, post snapshot, bidirectional route QA, and matched evidence are
  required before any as-built claim.
