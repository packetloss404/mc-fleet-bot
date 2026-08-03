# Ravensreach Guild Hall and Gilded Ledger Bar

**Status:** design source of truth; survey hold; no live-world authorization  
**Workstream:** Town Expansion / Guild Hall and Bar  
**Prepared:** 2026-07-28 UTC  
**Scope:** two basements, three occupied storeys, direct pavilion/Garth
integration, guild court and ceremonial rooms, dormitories, four kitchens,
living spaces, theater, lecture hall, dance hall, monumental bar, service
logistics, statues, landscape interfaces, build phases, and acceptance gates  
**Companion machine schedule:** `guild-hall-program.json`

## 1. Executive decision

Build the Guild Hall as the **eastern bookend of the active Ravensgate Garth**.
The enlarged library remains the western bookend. The Garth, south stoa, and
library loggia are the active “pavilion” ensemble and become the ceremonial
hinge:

```text
ENLARGED LIBRARY  ⇄  LIBRARY LOGGIA / GARTH / STOA  ⇄  GUILD HALL
       west                  shared pavilion                  east
```

The former `central-pavilion` is not an active building. The current manifest
records it as demolished on 2026-07-26 and superseded by Ravensgate. A design
that reconnects to that demolished shell would be false coordination.

The Guild Hall is intentionally lavish but legible. The money is expressed in
craft, hierarchy, light, heraldry, carved figures, material depth, and rooms
that actually work—not in a random mixture of rare blocks.

The preferred hold envelope is:

| Item | Design hold |
|---|---|
| Building | `x[-63,-11] z[-464,-406]` |
| Public datum | floor support `y67`; walking surface `y68` |
| B2 support | `y52` |
| B1 support | `y60` |
| Ground support | `y67` |
| Second support | `y75` |
| Third support | `y83` |
| Roof | spring `y91`; ridge target `y106` |
| Pavilion link | west portico centered on `z[-444,-432]` |
| Principal face | west, toward the Garth |
| Service face | east, to a new screened service lane |
| Concealed parking hold | below the east service court; final coordinates after survey |

These are **coordinate assumptions, not build coordinates**. The footprint
extends beyond the currently cataloged Ravensreach active envelope and must be
proven against a new immutable snapshot, every occupied block, terrain, trees,
water, entities, protected features, and current routes before engineering.

## 2. Evidence baseline

### 2.1 Current world facts

The accepted post-Wave-2 atlas and build manifest establish:

- Ravensreach public grade is `y67`.
- The active six-level civic library occupies
  `x[-147,-108] z[-451,-423]`; its public entrance is
  `(-128,68,-424)`.
- The retired Central Pavilion occupied
  `x[-107,-63] z[-451,-423]`.
- Ravensgate now supplies the civic sequence through Bell-Gate, the Garth,
  library loggia, south stoa, belvedere, Long Water, and park.
- The active Guild Hall site must preserve the bidirectional Ravensgate route
  from `(-108,68,-421)` through `(-108,68,-430)`, `(-85,68,-439)`,
  `(-114,68,-438)`, and onward west.
- The current library, Moot/Sanctum, Market, and Grange buildings have accepted
  stair-only vertical circulation. Ladders are not an acceptable primary route.

The immutable design reference is:

`data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region`

with SHA-256:

`d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999`

It is evidence, not a future execution baseline. A fresh snapshot is required
after the town-expansion survey and immediately before any guarded release.

### 2.2 Historical and operational precedents

The precedents resolve program, not style-copying:

1. **London Guildhall:** the City of London describes the Great Hall as 153 ft
   long and 85 ft high, with galleries, an adjoining kitchen, a built-in stage,
   and flexible banquet/theater arrangements. It places two major medieval
   crypts beneath the hall and uses monumental figures, stained glass, livery
   shields, banners, and a great timber roof to make institutional history
   visible. This establishes the vertical hierarchy: social/service undercroft,
   great ceremonial room above, and heraldic roof volume.  
   Sources: [Great Hall](https://www.guildhall.cityoflondon.gov.uk/spaces/great-hall),
   [visual guide](https://www.guildhall.cityoflondon.gov.uk/visual-guides/great-hall-interactive-guide),
   [East and West Crypts](https://www.guildhall.cityoflondon.gov.uk/spaces/east-west-crypts).

2. **York Merchant Adventurers' Hall:** the Company describes a Great Hall
   directly over an undercroft, with a chapel that remains part of the complex.
   York's official historic-environment record documents an eight-bay,
   two-range hall/undercroft, chapel, entrance extension, and Governor's Parlour,
   with timber framing, brick, stone, tile roofs, lattice glazing, and a central
   undercroft arcade. This establishes a plausible medieval-communal material
   language and a mixed business/social/charitable institution.  
   Sources: [the Company’s Hall history](https://merchantshallyork.org/the-hall/),
   [City of York Historic Environment Record](https://her.york.gov.uk/Designation/DYO1133).

3. **London livery-company hospitality:** Vintners' Hall actively programs a
   Livery Hall, Court Room, Drawing Room, smaller committee rooms, boardroom,
   roof garden, and bedrooms. Its Livery Hall supports large dinners,
   conferences, fundraising, and wine tasting; its Drawing Room is a pre-dinner
   reception and conference-catering space. Goldsmiths' Hall similarly presents
   adaptable grand rooms for intimate meetings through large receptions. This
   establishes the required hierarchy between procession, court business,
   reception, dining, service, and overnight accommodation.  
   Sources: [Vintners’ Hall rooms](https://www.vintnershall.co.uk/our-hall),
   [Goldsmiths’ Hall](https://www.thegoldsmiths.co.uk/goldsmiths-hall).

4. **Fraternal-hall scale and specialization:** the Library of Congress records
   the 1926 Detroit Masonic Temple as a 1,037-room institution containing
   theaters, a chapel, eight lodge rooms, a large drill hall, two ballrooms,
   cafeteria, dining rooms, offices, and recreation. HABS measured drawings of
   Philadelphia's Masonic Temple show purpose-designed lodge-room plans rather
   than one undifferentiated hall. The Ravensreach building is far smaller, but
   adopts the same principle: specialized public, ceremonial, learning,
   residential, entertainment, and service rooms connected by a controlled
   circulation system.  
   Sources: [Detroit Masonic Temple record](https://www.loc.gov/pictures/item/2020722960/),
   [Philadelphia second-floor measured plan](https://www.loc.gov/pictures/item/pa1064.sheet.00011a/).

5. **Assembly and acoustic planning:** the Whole Building Design Guide calls
   for auditorium spans and heights that accommodate sightlines and acoustics,
   level accessible seating positions, flexible stage lighting, and acoustic
   separation; it cites NC 20–30 and STC 40–50 as real-world targets for
   performance/presentation spaces. The University of Houston's facilities
   criteria call for NC-30 lecture halls/auditoriums and a speech-band
   reverberation time no greater than one second. Minecraft does not simulate
   these metrics, so they become geometric proxies: nonparallel or articulated
   walls, absorbent-looking rear surfaces, hard stage reflectors, deep
   vestibules, and no shared open doorway between loud and quiet rooms.  
   Sources: [WBDG Auditorium](https://legacy.wbdg.org/space-types/auditorium),
   [University of Houston Campus Design Guidelines](https://uh.edu/facilities-planning-construction/vendor-resources/owners-design-criteria/design-guidelines/DESIGN-GUIDELINES-JULY-2017-9-29-17.pdf).

6. **Accessibility:** the U.S. Access Board's 2010 ADA Standards require a
   60-inch turning space, accessible dining surfaces at 28–34 inches, an
   accessible service-counter portion no higher than 36 inches, and accessible
   routes to dining and performance areas. The route guide uses a 36-inch
   continuous clear width as the baseline. Minecraft cannot certify ADA
   compliance, but it can avoid gratuitous barriers: use at least three-block
   public corridors, five-block turning courts, a one-slab lower bar section,
   level seating bays, and normal-walk stair routes to every floor.  
   Sources: [2010 ADA Standards](https://www.access-board.gov/ada/),
   [Accessible Routes guide](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/).

7. **Life safety:** UK Approved Document B treats horizontal and vertical
   escape as separate design problems and warns that bar/restaurant use is not
   a trivial small-premises exception. OSHA's exit-route standard requires
   permanent, unobstructed routes and addresses independent exits, exit
   discharge, door swing, locks, width, and headroom. NIST's Station nightclub
   investigation found that crowding at the main entrance impaired egress and
   that untenable conditions developed rapidly; its follow-up records stronger
   sprinkler, egress-inspection, and crowd-manager provisions. Minecraft is not
   a code jurisdiction, but the design response is mandatory: two remotely
   separated normal-walk stairs from every assembly level, a third service
   stair, no locked/decorative-only exit, three-block minimum headroom, and
   route tests in both directions.  
   Sources: [Approved Document B, Volume 2](https://assets.publishing.service.gov.uk/media/677fa379d119b345376655eb/Approved_Document_B__fire_safety__volume_2_-_Buildings_other_than_dwellings__2019_edition.pdf),
   [OSHA exit-route design](https://www.osha.gov/etools/evacuation-plans-procedures/emergency-standards/design-construction),
   [NIST Station investigation](https://www.nist.gov/publications/nist-station-nightclub-fire-investigation-physical-simulation-fire),
   [NIST recommendation actions](https://www.nist.gov/el/summary-actions-needed-andor-taken-recommendations-resulting-station-nightclub-fire-investigation).

8. **Kitchens and bar service:** the FDA Food Code requires food-area floors,
   walls, and ceilings to be smooth and easily cleanable; wet-cleaned floors
   need drainage and sealed/coved junctions; carpet is excluded from prep,
   refrigeration, warewashing, toilet, and refuse areas. FDA inspection
   procedures require conveniently located, accessible handwashing in food
   prep, dispensing, and warewashing areas. The Brewers Association's draught
   manual separates gas, beer, and cooling systems, insists on constant
   temperature from keg to glass, and treats cleaning/maintenance as part of
   system design. HSE notes that CO2 is invisible, odorless, heavier than air,
   and can collect in cellars. These become distinct cleanable kitchen palettes,
   no carpet in service rooms, short protected beer-line chases, an isolated
   ventilated gas niche, a cellar alarm fixture, and a dirty-dish route that
   never crosses plating.  
   Sources: [FDA Food Code 2022](https://www.fda.gov/food/fda-food-code/food-code-2022),
   [FDA inspection procedures](https://www.fda.gov/media/94681/download),
   [Brewers Association Draught Beer Quality Manual](https://www.brewersassociation.org/educational-publications/draught-beer-quality-manual/),
   [HSE carbon-dioxide hazards](https://www.hse.gov.uk/coshh/basics/carbondioxide.htm).

## 3. Architectural identity

### 3.1 Three-sentence identity test

1. From the Garth, the visitor sees a long stone-and-timber guild palace with a
   deep central portico, a cross-gable over the entry, copper cresting, and four
   oversized statues representing Craft, Learning, Fellowship, and Stewardship.
2. Inside, a five-block processional spine reveals the Great Hall's hammer-beam
   roof, court chamber, red-and-gold undercroft, and a sequence of smaller,
   richer rooms instead of one empty box.
3. At B1, the Gilded Ledger is unmistakably a working grand bar: an illuminated
   three-tier back bar, U-shaped service counter, barrel-vaulted ceiling,
   booths, communal table, fireplace, stage, glasswash, finishing kitchen,
   keg/cask cellar, and separate escape/service routes.

If any of those readings is absent from the same-camera exterior/interior
evidence, the design has not landed.

### 3.2 Massing

- **Base:** two expressed stone undercrofts, mostly below grade, with a sunken
  south garden and limited light wells.
- **Body:** three masonry/timber storeys around a west-facing processional
  portico.
- **Roof:** steep deepslate-tile roof, a long ridge parallel to Z, central
  cross-gable at the Garth axis, two smaller stair-tower caps, and copper
  lanterns/cresting.
- **Great Hall:** a two-storey reading within the north half of the building;
  its upper wall and roof volume must read externally even though the second
  storey also contains independent rooms.
- **Service wing:** east edge, deliberately quieter, with a screened delivery
  court and vertical service core.

### 3.3 Exterior palette

| Role | Primary blocks | Use rule |
|---|---|---|
| Foundation | stone bricks, cracked/mossy stone bricks, tuff bricks | darkens toward B2; moss only at grade/light wells |
| Main wall | tuff bricks, stone bricks, calcite dressings | no flat wall run longer than 9 without pier, window, or recess |
| Frame | stripped dark oak logs, dark oak planks | structural bays and gables; not random stripes |
| Roof | deepslate tiles/stairs/slabs | steep, layered eaves; no flat dark rectangle |
| Metal | waxed cut copper, exposed copper, chains | cresting, gutters, lanterns, doors; deliberate green patina accents |
| Glazing | gray/light-gray panes, amber/yellow accent glass | tall grouped windows; stained crests only in ceremonial rooms |
| Wealth accent | chiseled quartz, gilded blackstone, gold blocks sparingly | capitals, bosses, heraldic focal points; never broad wallpaper |
| Paving | bricks, granite, mud bricks, polished andesite | shared with the Garth but organized in guild-knot bands |

### 3.4 Interior palette by acoustic/service character

- Great Hall and Court: dark oak, calcite, red carpet, banners, gilded
  blackstone bosses, stained glass, high lanterns.
- Theater and lecture: dark wood at front/reflecting surfaces, wool panels and
  articulated rear/side walls, explicit screen/stage, low aisle lighting.
- Dance Hall: sprung-looking dark-oak/slab floor, wool drapery bands,
  nonparallel pilasters, musicians' dais, protected chandeliers.
- Dormitories/living: spruce/dark-oak mix, wool, bookshelves, fireplaces,
  individual storage and lighting.
- Kitchens/service: polished andesite, smooth stone, quartz/iron counters,
  sealed-looking tile bands, no carpet.
- Bar: dark oak, polished blackstone, tuff-vault ribs, amber glass, copper,
  red carpet only in dry patron zones.

## 4. Level and room schedule

Coordinates below are inclusive design zones inside the hold envelope. Core
walls, columns, stairs, and door thickness are not counted as net room area.

### B2 — cellar, archive, and plant (`floor y52`, clear `y53..58`)

| ID | Room | Design zone | Approx. blocks | Function / required detail |
|---|---|---:|---:|---|
| B2-01 | Ale, wine, and cask cellar | `x[-49,-33] z[-462,-440]` | 391 | racked barrels, bottle bins, locked vintage cage, tasting bench, drainage aisle |
| B2-02 | Guild treasury and archive | `x[-31,-13] z[-462,-440]` | 437 | charter cases, map drawers, secure stacks, four display vaults, no direct public door |
| B2-03 | Service gallery | `x[-49,-13] z[-439,-434]` | 222 | six-wide east/west logistics spine, labeled stores, no dead end |
| B2-04 | Dry, cold, and event stores | `x[-49,-31] z[-433,-409]` | 475 | dry racks, cold rooms, linen, furniture carts, separated returns |
| B2-05 | Plant, maintenance, and guild workshop | `x[-29,-13] z[-433,-409]` | 425 | tool crib, maintenance bench, waste hold, gas niche, cellar alarm |
| B2-06 | Founders' crypt gallery | west/core band | 180 target | cenotaphs, donor tablets, stair landing, quiet route to treasury |
| B2-07 | Concealed carriage/parking vault | below east service court; conceptual `x[-10,14] z[-451,-410]` | survey | eight 5×9 bays, seven-wide maneuvering aisle, guarded ramp, direct service-core lobby |

### B1 — social undercroft (`floor y60`, clear `y61..66`)

| ID | Room | Design zone | Approx. blocks | Function / required detail |
|---|---|---:|---:|---|
| B1-01 | Dance Hall | `x[-49,-13] z[-462,-441]` | 814 | 21×17 clear dance floor, 9×4 musicians' dais, balcony-look gallery, coat bay |
| B1-02 | Acoustic/service gallery | `x[-49,-13] z[-440,-434]` | 259 | two-door lobbies to both loud rooms; stair and toilet distribution |
| B1-03 | Gilded Ledger patron hall | `x[-49,-22] z[-433,-409]` | 700 | grand bar, booths, communal table, fireplace, founder statue, small performance niche |
| B1-04 | Bar finishing kitchen and wash | `x[-20,-13] z[-433,-409]` | 200 | cold prep, plating, three-sink/glasswash line, hand sink, clean and dirty doors |
| B1-05 | Sunken south garden | exterior `z[-405,-393]` | survey | second public exit, herb beds, fountain, terrace seating, lit retaining wall |

### Ground — ceremony and governance (`floor y67`, clear `y68..74`)

| ID | Room | Design zone | Approx. blocks | Function / required detail |
|---|---|---:|---:|---|
| G-01 | Garth portico and vestibule | `x[-62,-52] z[-445,-431]` | 165 | five-wide doors, donor floor mosaic, cloakroom, direct pavilion sightline |
| G-02 | Processional gallery | `x[-51,-13] z[-438,-433]` | 234 | heraldic sequence, stair landings, access to every public ground-floor room |
| G-03 | Great Hall | `x[-49,-13] z[-462,-440]` | 851 | 120 banquet / 144 theater target, dais, minstrels' gallery, hammer-beam roof reading |
| G-04 | Guild Court chamber | `x[-49,-35] z[-430,-409]` | 330 | Master/Wardens dais, horseshoe table, witness lectern, charter wall |
| G-05 | Grand banquet kitchen | `x[-33,-13] z[-430,-409]` | 462 | receiving→store→prep→cook→plate flow, separate dish return, hall servery |
| G-06 | West stair hall / public amenities | west core band | 250 target | two separated public stairs, toilets, coat room, quiet room |

### Second — performance and teaching (`floor y75`, clear `y76..82`)

| ID | Room | Design zone | Approx. blocks | Function / required detail |
|---|---|---:|---:|---|
| L2-01 | Guild Theater | `x[-49,-13] z[-462,-438]` | 925 | 84 seats, 17×7 screen, 17×6 stage, rear entries, accessible seating bays |
| L2-02 | Foyer / acoustic lock | `x[-49,-13] z[-437,-432]` | 222 | ticket/display bar, two-door theater entries, cross-building route |
| L2-03 | Lecture Hall | `x[-49,-29] z[-431,-409]` | 483 | 72 seats, explicit 13×6 screen, demonstration dais, rear entry |
| L2-04 | Demonstration kitchen | `x[-27,-13] z[-431,-409]` | 345 | instructor island, four learner stations, wash/hand sinks, lecture servery |
| L2-05 | Backstage / green room | east theater edge | 180 target | dressing, prop store, stage access, service-stair access |

### Third — residential guild floor (`floor y83`, clear `y84..90`)

| ID | Room | Design zone | Approx. blocks | Function / required detail |
|---|---|---:|---:|---|
| L3-01 | Dormitory wing | `x[-49,-13] z[-462,-440]` | 851 | eight 2-bed rooms, two warden rooms, linen, bathing suite, individual storage |
| L3-02 | Residential gallery | `x[-49,-13] z[-439,-434]` | 222 | daylit circulation, display cases, protected stair connections |
| L3-03 | Members' living salon | `x[-49,-31] z[-433,-409]` | 475 | fireplace, library wall, games tables, conversation bays |
| L3-04 | Residential kitchen and dining | `x[-29,-13] z[-433,-409]` | 425 | 24-seat dining, domestic-scale prep, pantry, dish area |
| L3-05 | Founders' chapel / memorial room | tower/core bay | 120 target | stained crest, remembrance table, quiet seating; not a circulation shortcut |

### Roof

- Continuous inspection walk inside the roof volume.
- Minstrels' gallery and Great Hall clerestory, but no inaccessible decorative
  catwalk advertised as a route.
- Copper lantern over the Garth axis.
- Two roof terraces may be added only if each has a normal-walk stair, guard
  rails, drainage, and two-block-clear doors.

## 5. Four-kitchen contract

“Four kitchens” means four genuinely differentiated and usable rooms:

| Kitchen | Primary load | Required adjacency | Non-negotiable equipment/story |
|---|---|---|---|
| K1 Grand banquet | Great Hall and Court dinners | Great Hall servery, service dock, B2 stores | hot line, cold prep, pastry, plate pass, dish return, hand sink |
| K2 Bar finishing | bar and dance events | back bar, B2 cellar, acoustic gallery | cold prep, snack hot line, glasswash, three-sink line, clean-glass rack |
| K3 Demonstration | teaching and lectures | Lecture Hall, service stair | instructor island, four stations, screen sightline, separate wash |
| K4 Residential | dormitories and living salon | dining room, pantry | domestic hearth/range, communal island, pantry, dish storage |

The kitchen QA must prove:

- no patron route crosses the cook line;
- no dirty-dish return crosses the plating pass;
- every kitchen has a distinct hand-wash fixture;
- wet/service floors contain no carpet or raw porous decorative wall at working
  height;
- B2 storage reaches every kitchen by the east service stair without entering
  the Great Hall, bar guest zone, theater seating, or dorm bedrooms.

## 6. Circulation and core standard

### 6.1 Cores

Reserve before room detailing:

| Core | Hold | Role |
|---|---|---|
| North public stair | `x[-62,-53] z[-463,-450]` | Garth/Great Hall/theater/dorm route 1 |
| South public stair | `x[-62,-53] z[-420,-407]` | Garth/Court/bar/lecture/dorm route 2 |
| East service stair | `x[-21,-13] z[-463,-450]` | kitchens, backstage, cellar, deliveries |
| Central accessible lift analogue | `x[-20,-16] z[-447,-443]` | optional convenience only; never route acceptance |

All five occupied levels must connect to at least two remotely separated,
bidirectional **normal-walk** stairs. The east service stair is a third route.
No ladder, water elevator, elytra jump, trapdoor crawl, or fall is credited.

### 6.2 Width and headroom

- public processional gallery: 5 clear blocks;
- public corridors: 3 clear blocks;
- service gallery: 3 clear blocks, 4 at kitchen/delivery pinch points;
- stairs: 3 clear blocks between finished walls;
- doors serving assembly rooms: two independent 2-wide openings;
- stairs and corridors: 3 clear blocks of headroom at every traversed cell;
- landings: 5×5 clear at direction changes and assembly-room doors;
- no stair discharges through a kitchen, store, backstage room, bedroom, or
  behind the bar.

### 6.3 Assembly orientation

- Theater and Lecture Hall seating faces an **explicit, already-built screen**.
- Their public doors enter from the rear or side-rear. No principal entry is
  behind or through the screen wall.
- Theater seating rises one block after every two seat rows; accessible bays
  remain level at rear and intermediate entry levels.
- Dance Hall and bar share proximity, not an open aperture: two doors and a
  five-block acoustic/service lobby separate them.
- Dormitories are one full floor and two doors away from loud assembly rooms.

### 6.4 Loading, parking, and delivery logic

- Keep all public arrival in the Garth pedestrian. No exposed surface parking,
  delivery apron, refuse cage, or garage doors face the library/pavilion axis.
- Place a screened loading court on the Guild Hall east face, with a target
  dock zone centered near `z[-431,-421]`. A solid gatehouse wall, trees, and the
  service wing hide it from the west and south public approaches.
- Connect loading directly to K1, the east service stair, B2 event stores, and
  the waste hold. Deliveries must not cross the Great Hall, Court chamber,
  theater, bar guest room, or residential gallery.
- Hold an **eight-bay concealed carriage/parking vault** below the east service
  court. Planning bay: 5×9 clear blocks; central maneuvering aisle: seven clear
  blocks; headroom: four; protected pedestrian strip: two.
- The parking ramp approaches only from the east and descends no faster than
  one block per three horizontal blocks. Provide a 5×5 landing at both ends,
  a two-block parapet/retaining edge, continuous light, and a separate
  normal-walk pedestrian door to the service core.
- Keep the parking vault out of the bar/cask cellar and archive fire/service
  compartments. No parking bay becomes a shortcut into B1 patron rooms.
- Final parking/ramp coordinates are a survey decision. The conceptual hold
  extends east of the main building and cannot be engineered until the
  16-block-plus expanded buffer is decoded.

This institutional parking logic does **not** revise the separate residential
garage directive. Town houses remain a different package: garages are attached
to their houses, never detached; large-house schedules use reviewed 4-car or
6-car attached bays. No residential garage is included in Guild Hall quantities.

## 7. Adjacency matrix

Legend: `3` direct opening; `2` next-door via a lobby/gallery; `1` same core,
short route; `X` deliberately buffered; `—` self.

| | PAV | FOY | GRT | CRT | K1 | THR | LEC | DAN | BAR | K2 | DRM | K4 | SVC |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Pavilion/Garth PAV | — | 3 | 2 | 2 | 1 | 1 | 1 | 1 | 2 | 1 | X | X | X |
| Foyer/spine FOY | 3 | — | 3 | 3 | 1 | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 1 |
| Great Hall GRT | 2 | 3 | — | 2 | 3 | 1 | 1 | X | 1 | 2 | X | X | 2 |
| Court CRT | 2 | 3 | 2 | — | 2 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 1 |
| Banquet kitchen K1 | 1 | 1 | 3 | 2 | — | 1 | 2 | 1 | 1 | 2 | X | 2 | 3 |
| Theater THR | 1 | 2 | 1 | 1 | 1 | — | 2 | X | X | 2 | X | X | 3 |
| Lecture LEC | 1 | 2 | 1 | 2 | 2 | 2 | — | 1 | 1 | 2 | 1 | 1 | 2 |
| Dance DAN | 1 | 2 | X | 1 | 1 | X | 1 | — | 2 | 2 | X | X | 2 |
| Bar BAR | 2 | 2 | 1 | 2 | 1 | X | 1 | 2 | — | 3 | X | X | 2 |
| Bar kitchen K2 | 1 | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 3 | — | X | 1 | 3 |
| Dormitories DRM | X | 1 | X | 1 | X | X | 1 | X | X | X | — | 3 | 1 |
| Residential kitchen K4 | X | 1 | X | 1 | 2 | X | 1 | X | X | 1 | 3 | — | 2 |
| Service/loading SVC | X | 1 | 2 | 1 | 3 | 3 | 2 | 2 | 2 | 3 | 1 | 2 | — |

## 8. The Gilded Ledger — bar design source of truth

### 8.1 Concept

The Gilded Ledger is a guild undercroft, not a modern sports bar and not a
medieval-tavern cliché. Its story is “trade made visible”:

- the long back bar reads as an illuminated cabinet of guild wealth;
- barrel-vault ribs carry carved trade marks;
- the central communal table resembles a counting-house table;
- copper lines and taps look engineered and maintained;
- donor names, charters, maps, casks, and tools are displayed in ordered bays;
- the bar has a working cellar, service circulation, glasswash, finishing
  kitchen, and staff stations;
- the palette is dark, warm, and expensive, with gold concentrated at bosses,
  lettering, and the founder figure.

### 8.2 Plan

Patron room: `x[-49,-22] z[-433,-409]`, floor `y60`.

```text
NORTH / acoustic gallery
z-433  ┌───────────────────────────────────────────────────┐
       │ coat/display │  north booths  │ two-door entry   │
       │              └──────┐  ┌──────┘                  │
       │ fireplace       long communal table              │
       │                                                   │
       │                ┌──────────────── back bar ──────┐ │ E
       │   lounge       │ staff aisle / taps / bottles  │ │ A
       │                │                                │ │ S
       │                └ U-SHAPED PATRON COUNTER ──────┘ │ T
       │ south booths       lower counter     performance │
z-409  └──── second exit to sunken garden ────────────────┘
SOUTH
```

Exact bar-fixture holds:

| Fixture | Hold | Build requirement |
|---|---|---|
| Long counter | `x[-29,-27] z[-429,-413]` | 3-deep, continuous foot rail, four staff stations |
| North return | `x[-40,-30] z[-429,-427]` | frames the communal table |
| South return | `x[-40,-30] z[-415,-413]` | contains 4-wide lower counter bay |
| Back bar | `x[-25,-21] z[-429,-413]` | three lit tiers, 24-tap rhythm, bottle grid, crest |
| Staff aisle | between counter and back bar | 2 clear blocks minimum, no trapdoor pinch |
| Communal table | `x[-44,-39] z[-425,-417]` | 6×9, 18 seats, chandelier above |
| Fireplace | west wall near `(-48,63,-421)` | 5-wide surround, screened fire, seating clear |
| Performance niche | southeast corner | 7×5 dais, note blocks/jukebox, no exit conflict |
| Accessible counter analogue | south return | 4-wide one-slab-lower surface, 5×5 approach court |
| Main entry | north wall | two 2-wide doors through acoustic lobby |
| Secondary exit | south wall | 2-wide door to lit sunken garden and public stair |

### 8.3 Bar elevations

**Back bar, patron view**

- plinth at `y61`, polished blackstone;
- counter top at `y62`, dark oak slab/trapdoor edge;
- first bottle/tap tier `y63..64`, amber glass and copper;
- second tier `y65`, carved dark oak grid;
- crest, clock, and founder arms centered at `y66`;
- no opaque wall of barrels; every third bay is a light, mirror, map, or crest.

**Room section**

- floor `y60`: polished blackstone border and dark-oak dry-zone field;
- spring `y63`: tuff-brick ribs every five blocks;
- vault crown `y66`: dark tuff with gilded bosses;
- chains descend only over tables/counter and never below 3-block headroom;
- service areas use smooth stone/andesite and contained floor-drain motifs.

**West fireplace elevation**

- 7-wide stone/tuff composition;
- 3-wide screened firebox;
- carved guild date band;
- two 5-block standing figures in flanking niches;
- no carpet, bench, or wood block immediately in the firebox apron.

### 8.4 Bar operations

The patron, clean-service, and dirty-return loops remain distinct:

```text
B2 cask/cold store
  → east service stair
  → K2 receiving/cold hold
  → back-bar staff aisle
  → tap / service station
  → patron
  → separate glass return
  → scrape / wash / rinse
  → clean-glass rack
  → service station
```

Required service stations:

1. draught/beer;
2. wine/cask;
3. cocktails/non-alcoholic;
4. event/overflow.

Each has a sink/cauldron analogue, clean-glass storage, waste, light, and at
least two blocks of staff standing room. The gas niche is sealed from patron
space, marked, ventilated to the east service court, and represented by a
low-level detector/alarm fixture. The beer-line chase must be short, continuous,
inspectable, and never share the waste-return trench.

### 8.5 Bar material bill

Planning quantities include approximately 15% cutting/detail contingency.
Final exact quantities come from the guarded generator.

| Material | Planning qty. | Role |
|---|---:|---|
| Tuff bricks / stairs / slabs | 1,400 | vault, piers, wall fields |
| Stone bricks / variants | 900 | foundation, fireplace, service walls |
| Polished blackstone bricks / slabs | 1,050 | floor border, bar plinth, hearth |
| Gilded blackstone | 256 | bosses, capitals, letter band |
| Dark oak planks | 1,200 | floor, bar carcass, tables, paneling |
| Stripped dark oak logs | 320 | bay posts, ribs, door frames |
| Dark oak stairs/slabs/trapdoors | 950 | counter, shelving, booths, cornice |
| Waxed cut/exposed copper family | 520 | taps, rails, trim, service details |
| Amber/yellow/gray glass | 380 | bottle cabinets, mirror fields, screens |
| Froglights/shroomlights/sea lanterns | 128 | concealed back-bar and vault light |
| Lanterns / soul lantern accents | 160 | table, wall, route lighting |
| Chains | 220 | chandeliers, cask/display suspension |
| Barrels | 112 | cellar/display/service; no route obstruction |
| Chests / trapped chests | 32 | secured service stores |
| Item frames / glow item frames | 240 | bottles, tools, donor artifacts |
| Red/burgundy wool and carpet | 320 | dry patron zones and acoustic panels |
| Bookshelves / chiseled bookshelves | 180 | ledgers and guild records |
| Signs / hanging signs | 96 | room, cask, donor, route labeling |
| Candles | 192 | table and memorial accents |
| Brewing stands / cauldrons | 24 / 12 | working-service visual language |
| Note blocks / jukeboxes | 36 / 4 | performance niche |

## 9. Whole-building planning material bill

Planning only, inclusive of 15% detail/cutting contingency:

| Family | Planning qty. |
|---|---:|
| Stone-brick family | 14,000 |
| Tuff-brick family | 10,000 |
| Deepslate roof family | 7,200 |
| Dark-oak structural logs | 3,600 |
| Dark-oak plank/stair/slab family | 7,500 |
| Calcite/quartz dressings | 4,000 |
| Copper family | 3,000 |
| Glass panes/blocks | 2,400 |
| Brick/granite/mud-brick paving | 4,500 |
| Polished blackstone family | 3,800 |
| Gilded blackstone and gold accents | 1,100 |
| Wool/carpet/banner family | 3,200 |
| Bookshelves/chiseled shelves | 1,400 |
| Lantern/light family | 900 |
| Chains | 850 |
| Furnishing blocks and containers | 2,800 |

Rare blocks are accents. If substitution is required, preserve contrast and
hierarchy before rarity.

## 10. Pavilion/Garth integration and statues

### 10.1 Direct connection

- Extend the active Garth paving to the Guild Hall west portico without
  erasing Ravensgate's route.
- Use a 13-wide processional threshold centered on `z[-444,-432]`.
- Keep a five-wide unobstructed path from library loggia to Guild Hall
  vestibule.
- Align the Guild Hall door head, paving band, and pavilion focal axis.
- Use a two-storey concrete/stone terrace only where the library team confirms
  its east walk-out; the Garth remains the shared outdoor room.
- No bridge may roof over the entire court. The buildings must remain visually
  separate wings joined by an open civic center.

### 10.2 Statue program

Four larger-than-life 7-block figures on 3×3 plinths:

| Figure | Suggested position | Attributes |
|---|---|---|
| Craft | northwest Garth | hammer, compass, dark-oak/tuff |
| Learning | southwest Garth | open book, lamp, calcite/copper |
| Fellowship | northeast Garth | linked hands/cup, stone/copper |
| Stewardship | southeast Garth | key/ledger, stone/gilded accent |

Guild Hall west façade adds two 9-block guardians representing the Master and
the Builder. Great Hall receives smaller portrait busts, not another crowded
statue forest.

Every statue must have:

- a documented name and story;
- a lit face;
- a full 3-block circulation apron;
- no collision with sightlines, stairs, doors, or Ravensgate route cells;
- four-direction screenshot acceptance.

## 11. Build phases

### Phase 0 — survey and design freeze

1. Acquire new immutable Anvil snapshot.
2. Decode every column and occupied cell in the hold envelope plus a 16-block
   buffer.
3. Inventory trees, water, terrain, structures, containers, entities, current
   routes, protected features, and unknown player work.
4. Confirm the library/Garth/Guild Hall axis and final building/service-court
   boundaries.
5. Capture before images from fixed cameras.
6. Freeze coordinate schedule and publish collision report.

### Phase 1 — enabling and courtyard protection

- Mark protected Ravensgate path cells.
- Build temporary bypass before disturbing any route.
- Relocate only reviewed landscape objects with explicit inventory.
- Establish service access and construction boundary.
- Do not excavate while a player/entity is inside the release box.

### Phase 2 — undercrofts

- Excavate B2 and B1 in bounded slices.
- Install retaining walls, floor plates, drainage motifs, and both public
  stairs before fit-out.
- If the surveyed east site passes, build the concealed parking vault, guarded
  ramp, loading-core lobby, and sealed separation from archive/cellar in this
  phase.
- Prove rollback bijection after every slice.
- Keep water/gravity-block census at zero unresolved targets.

### Phase 3 — frame and weather shell

- Structural bays, all floors, exterior walls, stair towers, roof, glazing.
- Complete a watertight shell and continuous stairs before decorative work.
- Verify no exposed cave/exterior void at authored interiors.

### Phase 4 — Garth interface

- Portico, processional paving, loggia connection, terrace edges, statues, and
  wayfinding.
- Rerun the original Ravensgate bidirectional route and the new library↔hall
  route.

### Phase 5 — life-safety and service spine

- Finish two public stairs, service stair, five-wide spine, toilets, service
  gallery, loading court, all required room doors, and route lighting.
- No venue fit-out begins until all floors walk in both directions.

### Phase 6 — kitchens and logistics

- B2 stores, all four kitchens, dish return, clean pass, service stair, cellar,
  gas niche, and waste hold.
- Run patron/service/dirty-route isolation tests.

### Phase 7 — ceremonial and venue fit-out

- Great Hall, Court, theater, lecture hall, dance hall.
- Screens and stages precede seating.
- Validate every seat direction and every venue exit before ornament.

### Phase 8 — Gilded Ledger

- Vault, floor, bar and back bar, kitchen/wash, cellar system, booths, table,
  fireplace, performance niche, signage, lighting.
- Prove service loops and both exits before opening the room.

### Phase 9 — residential floor

- Dormitories, warden rooms, baths, living salon, residential kitchen/dining,
  chapel, storage, sound buffer.

### Phase 10 — landscape and close-out

- Sunken garden, service-court screening, Garth restoration, final trees,
  paving, lighting, signs, route markers, screenshots, floor plans, object/media
  links, DB import package, and dossier update.

## 12. QA and acceptance

### 12.1 Exact-state release gates

- fresh immutable pre-snapshot hash recorded;
- every mutation exact-state guarded;
- forward/rollback one-cell bijection proven;
- `rcon_runner.py --strict-noop --report <json>` used for parser and physical
  release reporting;
- zero unknown-container or protected-feature overwrites;
- zero players/entities in the release box;
- zero unreviewed fluid, gravity, waterlogged, or foliage targets;
- atomic package order and failure rollback documented;
- immutable post-snapshot captured before publication claims.

### 12.2 Route acceptance

Required bidirectional normal-walk routes:

1. library public entry ↔ Garth ↔ Guild Hall vestibule;
2. Garth ↔ Great Hall dais;
3. Garth ↔ Court chamber;
4. Garth ↔ B1 bar main entrance;
5. bar main entrance ↔ south-garden exit;
6. Garth ↔ Dance Hall;
7. Garth ↔ Theater seating, stage, and backstage;
8. Garth ↔ Lecture Hall screen/dais;
9. Garth ↔ every dorm room and residential kitchen;
10. east delivery point ↔ B2 stores ↔ each of four kitchens;
11. concealed parking pedestrian lobby ↔ east service stair ↔ exterior;
12. every occupied floor ↔ north public stair ↔ exterior;
13. every occupied floor ↔ south public stair ↔ exterior;
14. every service floor ↔ east service stair ↔ exterior.

Acceptance:

- 28/28 route directions pass if concealed parking is released; 26/26 if the
  survey rejects parking and it is formally deferred;
- no ladder/fall/swim/crawl/tower/dig;
- 3-block headroom;
- no 1-block corridor pinch;
- no route through fire, counter, seat, chest, kitchen line, stage screen, or
  bedroom furniture;
- all doors are openable from both sides.

### 12.3 Room-completeness tests

- five levels plus roof service walk cataloged;
- every named room enclosed, lit, signed, furnished, and accessible;
- four kitchens are distinct and meet the contract;
- theater and lecture hall have visible screens before seating is accepted;
- dance floor has clear extents and no chandelier/headroom collision;
- dormitory target: 20 beds, 20 personal stores, two warden stations;
- Great Hall target: 120 banquet seats or 144 theater-layout positions without
  blocking exits;
- Gilded Ledger: four working service stations, 12 booth groups, communal
  table, fireplace, performance niche, lower counter, two exits, and service
  route;
- no room has a blank wall longer than 11 blocks unless articulated by panel,
  pier, opening, fireplace, art, or shelving.

### 12.4 Visual acceptance

Matched before/after cameras:

1. Garth west-to-east axis;
2. Guild Hall west façade;
3. north and south obliques;
4. roof/courtyard aerial;
5. Great Hall wide and dais reverse;
6. Court chamber;
7. Theater rear-to-screen and screen-to-seating;
8. Lecture Hall rear-to-screen;
9. Dance Hall;
10. bar entrance wide;
11. bar counter/back-bar elevation;
12. bar service/finishing kitchen;
13. B2 cellar/treasury;
14. dormitory gallery and sample room;
15. each kitchen;
16. each public stair and service stair;
17. Garth statues in four-direction context.

Screenshots must be object-linked in the media catalog; filenames alone are not
evidence.

### 12.5 Decision hold points

Stop before engineering if:

- the east site collides with unknown/player-authored work;
- the final hall blocks the current Ravensgate route;
- the library expansion changes the shared Garth datum or axis;
- a fresh snapshot differs from the engineering baseline;
- the bar cannot receive two separated normal-walk exits;
- either B1/B2 intersects protected underground rooms or fluid boundaries;
- the footprint cannot keep at least a three-block landscape/service buffer.
- the concealed parking ramp cannot be graded at 1:3 or gentler without
  intersecting protected work, water, or a public route.

## 13. Engineer handoff

The engineer must produce, in order:

1. surveyed final coordinates and collision register;
2. floor-plan/elevation drawings;
3. immutable snapshot hash;
4. exact guarded forward and rollback operations;
5. exact material counts;
6. independent state/preflight/route QA;
7. before-camera report;
8. atomic execution ledger;
9. immutable post snapshot;
10. 26-direction route report;
11. after-camera report;
12. feature/room/route import package;
13. artifact register and PM dossier update.

No statement in this document authorizes a live build. It defines what a
complete, reviewable, buildable Guild Hall package must contain.
