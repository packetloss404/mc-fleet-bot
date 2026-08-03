# Gilded Raven Theatre House and Owner Corridor

**Decision state:** implementation-ready coordinate plan; not a live build authorization  
**Content boundary:** fictional adults-only venue architecture, kept non-graphic  
**Machine schedule:** `worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json`  
**Survey evidence:** `evidence/worker-town-theater-owner-tunnel-survey.json`  
**Immutable survey baseline:** `e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a`

## Executive decision

Build the **Gilded Raven Theatre House** as Worker Town’s most expensive traditional landmark at `x=-34..18, z=-402..-350`. Its ornate south marquee faces a new entry court and completes the town’s open eastern edge. The public experience progresses from marquee to lobby, restaurants and a 168-seat traditional bowl with two horseshoe/U-shaped balconies, open vomitories and a real stage. Five separate five-person salons and four one-to-one mini theatres sit on B1. The architecture communicates an adults-only live-performance house without depicting explicit anatomy or acts.

Three hidden circulation systems remain physically separate:

1. a discoverable public mystery promenade;
2. a performer-only stage/dressing loop;
3. an owner-only route to a new grand descent.

The owner route is **not T2B**. It is a new 928-block-long, level, five-by-five-clear corridor at `floorY=-44`, with a nine-block construction width, a utilities band, continuous lighting, low-level egress lighting, repeated wayfinding and seven large rest suites. The selected corridor, its face-adjacent halo, every rest suite, both vertical cores, the sales office and the mansion arrival gallery are dry and free of block entities on the immutable snapshot.

The route terminates inside the owner mega-mansion. The dry vertical ascent at `x348..377,z150..180` is not a detached destination: its dry ceremonial gallery runs west through `x269..348,y109..120,z156..174` and deliberately joins the implemented east mansion wing at `x269..270`. The only planned-package overlap is the 276-cell authored interface at that door/gallery connection.

## Why this site

The existing Ravensreach/Worker Town block pattern leaves its eastern edge unresolved. The selected building occupies that edge without touching the Grange, Market, Moot Hall, expanded library, Great Guild Hall or new civic grounds.

- Building target: `x=-34..18,y40..110,z=-402..-350`
- Marquee: `x=-17..1,y70..86,z=-349..-344`
- Entry court: `x=-30..14,y64..82,z=-349..-340`
- Surveyed surface: `3721` columns, median surface `y71`, zero water columns
- Building volume: zero fluids and zero block entities
- Two existing beds at `(-36,70,-348)` and `(-36,70,-349)` are outside every target and remain protected.

The earlier `z=-404` north edge was rejected because it touched five south-reflecting-pool target cells and four civic-ground cells. Moving the building to `z=-402` produces zero planned-package overlap.

## Architectural source of truth

The theatre is an original late-Victorian/Edwardian composition rather than a copy of one real building. Brick, red terracotta, dark oak, stone, copper and gilt give it the “all the money in town went here” character. The street front gets a centered canopy marquee, sign tower, illuminated letter band, ticket windows, poster cases and a broad sheltered threshold. Behind that front, the taller stage house reads honestly as a theatre volume.

Theatres Trust explains that theatre buildings are systems of auditorium, stage house, front of house and back of house; it also identifies stalls, circles, boxes, vomitories, wings, dressing rooms and technical spaces as distinct working parts. The layout uses those relationships directly. Its historical overview notes the development of horseshoe balconies, grand illuminated entries, rich stairs and more luxurious social areas. [Theatre Spaces: An Introduction](https://www.theatrestrust.org.uk/assets/000/001/395/Theatre_Spaces_-_An_Introduction_FINAL_original.pdf?1565082480=), [What spaces make up a theatre?](https://www.theatrestrust.org.uk/discover-theatres/theatre-faqs/171-what-spaces-make-up-a-theatre), [How theatre design changed](https://www.theatrestrust.org.uk/discover-theatres/theatre-faqs/172-how-has-the-design-of-theatre-buildings-changed-over-time)

The National Park Service’s theatre guidance describes the marquee, entrance–lobby–auditorium progression, raked house, balconies and proscenium as character-defining. That supports a proper arrival sequence and stage-focused room instead of another generic hall. [NPS theatre character-defining features](https://www.nps.gov/media/video/view.htm?id=D80BC409-7E9C-4870-8BA6-3F571F14DA93)

### Main house

The auditorium occupies `x=-29..13,y70..98,z=-397..-362`. A stage at `x=-19..3,z=-401..-390` and apron at `x=-16..0,z=-389..-385` are constructed before any seat.

The selected capacity is intentionally believable for a small, rich town house:

- 96 stalls;
- 48 dress-circle seats;
- 24 grand-circle seats;
- 168 seats in the main house;
- 25 additional seats across five five-person salons;
- four one-to-one rooms.

The dress circle is a horseshoe around the bowl. The grand circle is a shallower U. Four open side vomitories and one open south-center vomitory connect directly into a broad perimeter ring. They are not small doors into blind hallways. Balcony fronts use layered dark wood, gilt/copper grilles and low warm lamps. The coffered ceiling and chandelier crown fill `y94..105`.

Every fixed seat must be laid out only after the stage, backdrop and lighting frame exist. The acceptance camera stands at each outer seat row and must show the stage center without facing a wall or doorway.

### Restaurants

Four restaurant/dining zones keep the room socially active rather than wrapping it in empty corridors:

- west two-level supper restaurant beside the stage;
- east two-level dining gallery beside the stage;
- southwest street dining salon;
- southeast street dining salon.

Both stage-side restaurants have their own service pantry and a B1 connection to the production kitchens. Public routes connect every dining level to the main lift. Sound lobbies protect the auditorium while keeping the public ring visually open.

### Five-person salons and one-to-one rooms

Five rooms on B1 each hold a five-person audience and one small non-graphic presentation stage. Four further rooms hold one guest each. The program is architectural: platform, correctly aimed seat(s), acoustic vestibule, performer-side service door, wash point, closed storage and an accessible turning zone.

Privacy never defeats life safety. A room opens from the inside without a key, tool or hidden puzzle. None is a required exit path. Each has a staff-visible occupied/status light outside without an interior sightline.

### Hidden routes

The public mystery promenade is a discoverable, accessible route behind bronze panels. It is at least three blocks clear by five high and returns to public foyer space at three locations. It has no long blind dead end.

The performer loop connects dressing, green room, laundry, kitchens, wings and stage. It uses two independent stairs and never shares an owner door.

The owner route occupies the deeper B2 band and enters through a two-door gilded vestibule in the owner salon. No public, performer, service or utility hatch bypasses that vestibule.

## Stairs that are actually pleasant to walk

The old compact-stair pattern is rejected. The U.S. Access Board requires uniform treads/risers and prohibits open risers in covered egress stairs; its accessible-route guidance also says accessible vertical circulation belongs with the main stairs, not in an obscure back route. Minecraft cannot reproduce inch dimensions, so this plan uses a deliberately gentler conservative translation: **one block of rise for every two blocks of run**, closed risers, two rails, contrasting first/last nosings, six blocks of headroom and large turn landings. [Access Board stair guide](https://www.access-board.gov/ada/guides/chapter-5-stairways/), [Access Board accessible routes](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/)

No primary route uses:

- a ladder;
- a trapdoor drop;
- alternating treads;
- one-block spirals;
- winders;
- two-block headroom;
- a turn without a full landing.

### Theatre grand descent

The hidden entrance first uses a ceremonial 6-rise/12-run flight from the owner salon at `y70` to the `y64` upper landing. Nine subsequent flights descend from `y64` to `y-44`. Every full flight rises 12 over a run of 24, is seven blocks clear, has six blocks of continuous headroom and turns on a broad cross-landing.

The full core is `x=-34..14,y=-46..67,z=-400..-383`. It is dry, its face halo is dry, and it contains no block entities. A minimum six-by-six lift car serves every 12-block landing beside the stairs.

The stair hall is intentionally extravagant after the hidden door opens: vaulted landings, district maps, dark stone, dark oak, copper rails, chandelier groups and a different artwork at every turn. “Secret” describes how the entrance is found; it does not justify bad circulation.

### Mansion ascent

The direct ascent studies were not acceptable:

- the west mansion/C01 columns contained protected inventories and a spawner;
- the north studies encountered water and trial/spawner equipment;
- an initial east study touched water;
- the `x310..339,z150..180` option was dry but sat too close to the planned C01 road alignment.

The selected `x348..377,z150..180` core and halo are dry and block-entity-free. Thirteen 12-rise/24-run flights climb from `y-44` to `y112`, again with seven-clear stairs and a lift at every landing.

The top does not open to an isolated tower. A fully dry, existing-air ceremonial gallery at `x269..348,y109..120,z156..174` enters the mega-mansion east wing at `x269..270`. This is a direct authored mansion room connection. The gallery is above the C01 road, east and above the portal rooms, and separate from the shelter utilities.

## Modern owner-corridor standard

The corridor is not a decorated mining bore. Its exact clear section is five wide by five high:

- finished walking floor: `y=-44`;
- clear volume: `y=-43..-39`;
- ceiling/liner: `y=-38`;
- overhead service band: `y=-37`;
- subfloor drainage/inspection band: `y=-46..-45`;
- utilities outside the five-clear walking zone;
- total construction width: nine blocks.

The centerline is level. All vertical movement occurs in the two grand stair-and-lift halls. At each turn, an eleven-by-eleven orientation chamber creates a deliberate pause and visible route choice.

FHWA’s tunnel guidance identifies clearance, drainage, ventilation, lighting, utilities, communications, signs and emergency equipment as integral cross-section elements. FTA guidance stresses adequate normal/emergency lighting, low-level visibility, consistent exit graphics, usable egress and avoidance of vertical ladders. The owner corridor adopts those principles at Minecraft scale. [FHWA Road Tunnel Manual](https://www.fhwa.dot.gov/bridge/tunnel/pubs/nhi09010/tunnel_manual.pdf), [FTA emergency-preparedness guidance](https://www.transit.dot.gov/regulations-and-guidance/safety/recommended-emergency-preparedness-guidelines-rail-transit-systems)

### Lighting and wayfinding

- warm ceiling lights at eight-block centers;
- low-level contrasting lights, staggered from ceiling lights;
- brighter turn nodes;
- independently switched emergency-color lights;
- destination, direction and remaining-distance signs every 32 blocks;
- floor compass and district color at every turn;
- two sequential metal doors at every controlled boundary;
- an inside release on every egress-side door.

No sign says only “tunnel.” It says where the traveler is going and how far remains.

### Utilities and refuge

The lined service bands carry separated normal/emergency lighting feeds, communication, ventilation supply/return, drainage inspection, and fire/medical cabinet niches. Maintenance panels never form a crawl bypass into a protected room.

FHWA’s review of European underground systems highlights uniform signs and repeated refuge/assistance spaces. Seven large rest suites translate that principle into the owner route. [FHWA underground-systems review](https://www.fhwa.dot.gov/publications/focus/07may/03.cfm)

Each suite uses a premium stadium-suite-type hospitality program: lounge, table, pantry, single-user wash room, status wall, quiet alcove and medical/intercom cabinet. U.S. Bank Stadium’s published premium program provides the group-suite/concierge precedent; these rooms are an original underground adaptation. [U.S. Bank Stadium premium seating](https://www.usbankstadium.com/events/premium-seating)

Each also has a separate tasteful, non-graphic red-room annex: bed/lounge, closed accessory storage, decorative non-load-bearing swing/hammock frame, wash point, acoustic separation and a two-step privacy vestibule. The annex is never part of egress and depicts no act.

All seven suite envelopes have zero fluids and zero block entities. Where the census found gravity blocks, the release must pre-support and replace those cells top-down behind a temporary bulkhead before opening neighboring air.

## Isolation proof

The route is intentionally separate from every existing or planned civilian/security system:

- **T2B:** deprecated as a design and geometry source; no connection. Its x range is `-145..-136`, while this corridor begins at x `-14`.
- **Ravensgate:** the protected exclusion ends at x `-64`. The owner envelope begins at x `-14`, leaving 49 untouched X columns.
- **Library–Guild tunnel:** that route is at x `-110..-60`, y `58..64`, z `-442..-423`; there is no 3D intersection.
- **Known Raven Rock objects:** their lowest recorded floor is y `-14`. The owner service band ends at y `-37`, leaving 22 untouched layers.
- **Portal rooms:** at x `210..270`, y `78..88`, z `123..187`; the deep corridor is y `-46..-37`, and the ascent is x `348..377`.
- **Old C01:** the ascent is east of the old x `<=300` shell.
- **C01 road:** its target band is y `40..76`; the final westbound mansion gallery is y `109..120`.

No branch, door, shaft, utility chase or crawlspace may weaken these separations.

## Future owner-city reservation

The selected future city reservation is `x65..125,y-38..-20,z-280..-200`, directly above the corridor’s `z=-230` leg. The whole reservation and its one-cell face halo are dry and contain no block entities. It is deliberately **not excavated now**.

The only built object is the Founders’ Gallery Sales Office at `x78..106,y-46..-33,z-227..-204`. Its short branch enters from `(90,-44,-230)`. The office contains a reception desk, illuminated city model, parcel/status wall, material gallery, consultation room, pantry/wash and a sealed `OFFLINE / FUTURE OWNER CITY` presentation door.

Physical “marking” occurs through the model, four exact corner coordinates, elevation band and a no-excavation notice. Building streets or rooms would violate the user’s instruction to plan the city but not build it yet.

## Survey results

| Selected object | Target cells | Fluids | Face-halo fluids | Gravity | Block entities |
|---|---:|---:|---:|---:|---:|
| Theatre building | 199,439 | 0 | — | 1,157 | 0 |
| Theatre grand descent | 100,548 | 0 | 0 | 1,595 | 0 |
| Owner corridor | 85,150 | 0 | 0 | 2,102 | 0 |
| Future city reservation | 93,879 | 0 | 0 | 1,494 | 0 |
| Sales office | 9,744 | 0 | 0 | 220 | 0 |
| Mansion ascent | 147,870 | 0 | 0 | 1,659 | 0 |
| Mansion arrival gallery | 18,240 | 0 | 0 | 0 | 0 |

The gravity counts do not authorize blind excavation. They define a mandatory top-down pre-support ledger. Every changed cell still needs an exact source-state guard and exact rollback generated from a new same-moment snapshot.

The comparison against `town-expansion-r1-wip2.txt` found no overlap for the theatre, marquee, entry court, descent, owner corridor, rest suites, future-city reservation, sales office or dry ascent. It found exactly 276 intentional planned cells at the mansion-gallery/east-wing interface. The final regenerated package must repeat that test.

## Construction order

1. Freeze all other town-expansion geometry and take a same-moment immutable snapshot.
2. Re-run target/halo fluid, block-entity, gravity, entity and protected-feature censuses.
3. Re-run exact cross-package intersections; permit only the reconciled mansion interface.
4. Build stabilized liners, gravity pre-support and closed utility/service bands before clearing interior walking air.
5. Build the theatre’s external shell, stage house, floors and two public egress cores.
6. Build the stage, apron, screen/backdrop and sightline references.
7. Build the bowl, balconies, open vomitories, restaurants and public foyers.
8. Build B1 salons, back of house and separated hidden route shells.
9. Build both grand stair-and-lift halls and bidirectionally walk-test every flight before connecting the corridor.
10. Build the deep corridor from sealed work faces in short exact-guarded sections.
11. Build each rest suite behind a closable vestibule.
12. Build only the sales office and sealed future-city marker; do not excavate the city reservation.
13. Build the dry east ascent, then the y109..120 ceremonial mansion gallery, reconciling its interface in the same owner-estate model.
14. Close every unintended cave/utility exposure, then run network-isolation tests.
15. Capture matched evidence and import the accepted features only after post-state QA.

## Acceptance

The package is not complete merely because blocks exist. Acceptance requires:

- all main-house and small-room seats face a built stage;
- all five open vomitories remain broad and open;
- public, performer and owner hidden routes have no unintended cross-connection;
- every stair uses the stated 1:2 geometry, landings, rails and headroom;
- every stair flight is walked normally in both directions without sprinting, flying, digging or towering;
- both lifts stop at every listed landing;
- the entire corridor and one-cell halo remain fluid-free;
- all gravity cells were handled through recorded pre-support phases;
- the future city remains unexcavated beyond its sales office;
- the arrival gallery visibly enters the owner east wing at x269..270;
- no T2B, Raven Rock, Ravensgate, civilian tunnel, portal, C01 or cave connection exists;
- matched before/after images cover every externally or internally distinct object.
