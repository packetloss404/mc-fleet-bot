# Concord Broadcast Exchange — Soundstage Annex

**Project ID:** `CBE-STAGE-ANNEX-001`  
**State:** researched design source of truth; exact compiler binding and live
deployment remain pending  
**Content boundary:** ordinary late-night and sitcom production spaces; no
explicit imagery or depicted acts

## Executive decision

The Concord Broadcast Exchange receives a visibly newer studio-lot annex north
of the original broadcast building. The addition is not two decorated sheds.
It is a two-stage production complex with distinct public, talent, production,
and service routes:

1. `CBE-STAGE-LN-001` — a late-night talk/variety soundstage;
2. `CBE-STAGE-SC-001` — a multi-camera sitcom soundstage;
3. a shared studio street, audience arrival court, scenery/loading yard, central
   plant screen, and enclosed link back to the Broadcast Exchange.

The outside must read as a movie and television studio complex: tall,
mostly-windowless acoustic stage volumes; overscale numbered stage doors;
lower two-story office and dressing-room bars; separate audience marquees;
loading aprons; scenery carts; service markings; roof plant screens; and a
landscaped staff edge. The newer annex may use cleaner concrete, dark metal,
blue-gray terracotta, copper accents, and larger glazed office bays than the
older brick Exchange so the upgrade is legible without becoming a different
campus.

## Research translated into binding rules

Universal describes real sound stages as clear production volumes supported by
hair and makeup, green rooms, staging, audience entrance/lobby, wardrobe, and
broadcast control. Its public Stage 1 listing also separates these support
functions from the stage itself. That becomes a hard room-list requirement,
not decorative signage. [Universal Studios Lot — Stages](https://www.universalstudioslot.com/stages/stages)

Universal's public support-space program adds production offices, rehearsal and
table-read rooms, talent holding, private dressing rooms, makeup, wardrobe,
crew-feed support, and direct adjacency to sound stages. Each Concord stage
therefore gets a real support bar rather than scattering these rooms through
the open filming floor. [Universal Studios Lot — Support Space](https://universalstudioslot.com/support-space)

NBCUniversal's Stamford facility publicly describes two stages with HD control
rooms, a large production office, ten greenrooms, star dressing rooms,
hair/makeup, audience holding, wardrobe, security, and production-truck access.
The Concord annex uses that relationship as its planning precedent while
remaining a fictional Minecraft facility. [NBCUniversal — Stamford Studios](https://www.nbcuniversal.com/article/nbcuniversals-stamford-studios-celebrates-15-years-production)

Warner Bros. describes a studio lot as a combination of stages, production
offices, mill space, flexible creative space, grip, lighting, property,
costume, and post-production support. The annex therefore includes a shared
scene shop/prop dock and a recognizable studio street rather than isolated
buildings in grass. [Warner Bros. Studio Operations](https://studiooperations.warnerbros.com/about/)
[Warner Bros. — The Ranch](https://studiooperations.warnerbros.com/the-ranch-prev/)

The WBDG television-production facility criterion calls for a large
soundproofed studio, set construction and scenery storage, video/audio control,
technical support, and offices for writers, directors, producers, graphics,
maintenance, and supply. It also notes the greater clear height and
electrical, cooling, ventilation, fire-detection, and suppression needs of a
studio. Those are represented architecturally and are not claimed as a
real-world engineered system. [WBDG — Television Production Facility](https://www.wbdg.org/FFC/AF/AFMAN/141389_Television_Production_Facility.pdf)

The late-night floor gets four visually distinct production zones—monologue,
host desk/interview, house band, and musical/performance area—based on the
Television Academy's public description of the traditional late-night format.
[Television Academy — The Arsenio Hall Show](https://interviews.televisionacademy.com/shows/arsenio-hall-show-the)

## Surveyed reservation

The immutable design snapshot is:

`data/worldsnap-town-expansion-expanded-baseline-20260728T0405Z/region`

Snapshot SHA-256:

`e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a`

The preferred north-annex reservations are:

| Object | Inclusive survey prism | Surface result | Fluids / block entities |
|---|---|---|---|
| Late-night stage | `[680,45,-508]..[731,110,-432]` | min 47, p10 63, median 69, p90 74, max 81 | 70 buried water cells, zero lava, zero block entities, zero top-water columns |
| Sitcom stage | `[736,45,-508]..[787,110,-432]` | min 57, p10 63, median 68, p90 73, max 79 | zero water, zero lava, zero block entities, zero top-water columns |
| Enclosed/link interface | north of the existing `z=-425` shell wall, avoiding the tower and satellite field | top surface 63..72 in the surveyed east-link strip | zero fluid and block entities in the checked strip |

These are reservations, not demolition prisms. The compiler must establish an
exact footprint within them, retain the natural wooded edges, and use stepped
retaining courts, lower service terraces, and planted slopes. It must not
replace the whole reservation with one flat platform. The 70 buried water
cells in the late-night reservation remain protected unless a fresh exact
foundation census proves the final structural cells do not touch them.

### Exact compiler reconciliation

The preferred prisms above were planning reservations. The separate
cross-scope audit found that a first north-south layout entered DM12, DM10, the
fictional Info annex, the 200-seat campus venue, and its back-of-house. Those
conflicts were reported before correction and were not allowlisted. The exact
compiler rotates both stages into the dry east-west band:

| Object | Exact inclusive bounds | Immutable-snapshot surface census |
|---|---|---|
| Stage 21 shell | `[674,72,-490]..[733,96,-431]` | min 47, p10 63, median 65, p90 68, max 70 |
| Stage 21 clear volume | `[680,73,-470]..[731,90,-437]` | `52 × 18 × 34`; zero scheduled or structural intrusions |
| Stage 22 shell | `[738,70,-490]..[797,94,-431]` | min 57, p10 63, median 64, p90 67, max 69 |
| Stage 22 clear volume | `[740,71,-470]..[791,88,-437]` | `52 × 18 × 34`; zero scheduled or structural intrusions |
| Studio street | x `674..797`, z `-430..-426` | min 63, p10 64, median 64, p90 65, max 66 |
| Enclosed Exchange link | `[710,66,-430]..[757,80,-426]` | one reviewed interface only: exactly 30 cells at x `710..715`, y `67..71`, z `-425` |

The east loading apron ends at x `804`, the west apron begins at x `668`, and
neither stage, apron, support bar, tree canopy, nor connector enters another
building scope. The known water point at `(693,66,-490)` and the three deep
block entities below Stage 22 remain untargeted. Any future coordinate change
invalidates this reconciliation and must rerun the exact interface audit.

## Shared site program

- A numbered studio street links the Exchange to both stages.
- Public audience arrival is physically separated from trucks, scenery carts,
  and talent/service access.
- Each stage has two remote exits plus an independent service exit.
- The annex has an enclosed accessible link to the original Exchange and a
  separate exterior staff walk.
- A scenery/loading yard includes two truck-height stage doors per building,
  a shared scene shop, prop cage, refuse/recycling screen, and production-truck
  connection points.
- A two-story connector block contains security/reception, a shared
  commissary/crew-feed room, first aid, rehearsal/table-read room, production
  meeting room, restrooms, and central technical support.
- Exterior cameras must prove the annex reads as an intentional later upgrade
  and not a pair of warehouses.

## Stage 21 — late-night talk and variety

**Required clear stage:** at least `34 × 52` unobstructed blocks with a minimum
18-block clear height. Columns, stairs, offices, dressing rooms, and plant may
not intrude into that volume.

Required production zones:

- monologue mark and host entrance;
- host desk and interview seating;
- house-band platform;
- separate musical/performance bay;
- audience floor with at least 96 believable seats, center and side aisles,
  accessible positions, and unobstructed views of the actual set;
- camera lanes between audience and set;
- overhead lighting/catwalk analogue with two protected access points;
- scenery crossover behind the set;
- direct scenery-door route that never crosses the audience lobby.

Required support:

- public lobby, ticket/check-in, security, audience holding, concessions, coat
  storage, and restrooms;
- host dressing suite, two guest dressing rooms, green room, hair/makeup,
  wardrobe, and talent lounge;
- showrunner and producer offices, writers' room, production office,
  stage-manager station, conference/table-read room, and staff workroom;
- production-control, audio-control, lighting-control, edit/graphics, machine
  room, equipment cage, microphone/storage room, and technical repair bench;
- prop storage, scenery dock, janitor, electrical/plant representation, and
  independent back-of-house egress.

The support block is two stories along one long stage wall. Both levels receive
glazed observation/control bays over the soundstage. Stairs and lift stay
inside the support block; they do not consume stage floor.

## Stage 22 — multi-camera sitcom

**Required clear stage:** at least `34 × 52` unobstructed blocks with a minimum
18-block clear height. The permanent support block may occupy one long edge
only.

Required production zones:

- three connected standing sets: primary apartment living/kitchen, secondary
  bedroom/hall, and café/workplace;
- a fourth swing-set/rehearsal bay;
- wide camera cross-aisle and scenery crossover;
- audience floor with at least 84 believable seats, accessible positions, and
  clear sightlines into the three principal sets;
- prop walls and removable set returns that visibly read as filming scenery,
  not finished occupied rooms;
- overhead lighting/catwalk analogue with two protected access points;
- direct set-construction and scenery-door route.

Required support:

- audience lobby, check-in, holding, concessions, restrooms, and remote public
  exit;
- six cast dressing rooms, two guest rooms, green room, hair/makeup, wardrobe,
  cast lounge, and rehearsal/table-read room;
- showrunner office, writers' room, production office, director and assistant
  director offices, meeting room, script/copy room, and staff workroom;
- production-control, audio-control, lighting-control, edit bay, machine room,
  equipment cage, and technical repair bench;
- prop cage, wardrobe workroom, set-dressing store, scene dock, janitor, and
  independent service egress.

The partial second floor contains writers, production, control, and observation
rooms behind glass. The rest of the volume remains open to the stage roof.

## Circulation and visual acceptance

The annex fails acceptance if any of the following is true:

- a support room is represented only by a sign or an undivided empty box;
- the two soundstages are visually or operationally indistinguishable;
- audience seating faces an entrance, blank wall, or absent set;
- a public route crosses the scenery/truck route;
- the stage clear volume contains an office/stair/core column;
- the second floor spans across the whole stage instead of remaining a partial
  support/observation bar;
- scenery cannot travel from loading door to stage at grade;
- a dressing, greenroom, control, production, wardrobe, hair/makeup, scenery,
  prop, audience-holding, restroom, or remote-egress requirement is missing;
- terrain is replaced by a single unsupported or visibly artificial flat slab;
- a camera cannot prove each stage's set, audience sightline, partial second
  floor, production control, dressing/support route, loading route, and
  exterior studio-lot identity.

## Evidence package

Minimum matched evidence:

- one pre-build site overview;
- one exterior/studio-street view per stage;
- one loading/scenery view per stage;
- one audience-to-set sightline per stage;
- one stage-to-audience reverse view per stage;
- one partial-second-floor/control overlook per stage;
- one dressing/greenroom/support-corridor view per stage;
- one connector/shared-support view;
- one terrain/retaining/landscape view;
- one nighttime marquee and service-lighting view;
- a second-pass image for every defect/correction pair.

The final database import must publish separate building, room, route, support,
landscape, and camera objects. Neither stage may be marked built until
post-deployment route and matched-camera QA pass.
