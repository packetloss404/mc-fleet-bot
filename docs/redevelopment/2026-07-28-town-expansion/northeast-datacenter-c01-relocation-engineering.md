# Northeast Data Campus, C01 East Relocation, and Parking Warehouse Expansion

**PM / engineering design review — 2026-07-28**

**State:** design basis only; no live-world mutation; no release authorization.

**Machine schedule:** [northeast-datacenter-c01-relocation-engineering.json](northeast-datacenter-c01-relocation-engineering.json)

## 1. Executive decision

The immutable snapshot supports a coordinated three-project plan:

1. build a fictional DM-numbered data-center campus on the dry north plateau
   northeast of MainStreet;
2. replace, rather than literally translate, C01 with a compact new east shell
   and migrate its complete program and block-entity state under rollback; and
3. after C01 is accepted and retired, extend the parking-subgrade warehouse
   through three separately lined east pods without touching the two support
   courses or the completed parking surface.

The plan deliberately rejects two seductive but unsafe shortcuts:

- the entire northeast search envelope is **not** dry; it contains aquifers,
  lava, caves, a dungeon, beehives, and a broad water band; and
- the obvious `+208 X` block-for-block C01 destination contains **101,675
  source-water blocks**, 43 bubble columns, and two occupied beehives.

The selected occupied data-hall prisms at `y70..100` contain no water or lava.
The compact C01 shell contains no source water, lava, or block entity. The
warehouse east pods are fully solid, have no water or lava, and have no block
entity.

## 2. Provenance and security boundary

The survey reads only:

- `data/worldsnap-town-expansion-complete-baseline-20260728T0315Z/region`
  — SHA-256
  `0bb1faa61ca69724816afe682080e3a517fa974ec1300c3651e399ea03505501`;
  and
- `data/world-map.db`, opened read-only — SHA-256
  `1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`.

The database contained 875 features, 23 scans, and 1,881 observations at
survey time. Every bound in this memo is inclusive.

The fictional DM halls borrow only public principles. They do not reproduce a
real Microsoft facility, InfoBunker, continuity site, substation, access
sequence, utility topology, weakness, or emergency procedure.

## 3. Public research converted into design rules

Microsoft's public [virtual datacenter tour](https://datacenters.microsoft.com/globe/explore/datacenter/)
and [security overview](https://learn.microsoft.com/en-us/compliance/assurance/assurance-datacenter-security)
support a legible campus sequence, monitored operations, environmental
sensing, lifecycle support, continuity planning, and least-privilege zoning.
They do not justify copying the layout of a real site.

The U.S. Department of Energy's [Best Practices Guide for Energy-Efficient
Data Center Design](https://www.energy.gov/sites/default/files/2024-07/best-practice-guide-data-center-design.pdf)
drives the alternating hot/cold rack pairs, separated supply and return paths,
future-load planning, electrical/cooling metering, heat-recovery placeholder,
and PUE/WUE scoreboards.

[NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
supplies high-level physical/environmental, logging, maintenance, contingency,
and least-privilege control families. The [FEMA Continuity Guidance
Circular](https://www.fema.gov/sites/default/files/documents/fema_continuity-guidance-circular_082024.pdf)
supports diverse communications, alternate-facility capability, tested
reconstitution priorities, exercises, and sustained operations.

[OSHA 1910.36](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36)
is the conservative egress baseline: permanent separated routes, remote exits,
direct discharge, sufficient clear width and outward-swinging doors where
occupant load requires them.

The scenic helipad and strip are controlled by design-vehicle thinking, not
visual guesswork. FAA [AC 150/5390-2D](https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentNumber/150_5390-2D)
covers heliport planning and geometry. FAA [AC
150/5300-13B](https://www.faa.gov/airports/resources/advisory_circulars/index.cfm/go/document.current/documentNumber/150_5300-)
requires the runway, safety area, object-free area, taxi access, drainage, and
aircraft performance to be evaluated together. Until that occurs, both
Minecraft elements remain scenic and non-operational.

For below-grade work, USACE [EM
1110-2-2102](https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-2-2102.pdf)
supports deliberate sealed joints and continuous waterstops. The FHWA
[road-tunnel technical manual](https://www.fhwa.dot.gov/bridge/Tunnel/pubs/nhi09010/tunnel_manual.pdf)
supports a geotechnical baseline, groundwater control, risk registers,
instrumentation, linings, and staged cut-and-cover work. NASA's
[commissioning guide](https://www.wbdg.org/nasa/guides-handbooks/commissioning-guide)
supports commissioning from planning through occupancy, operation,
recommissioning, and ongoing verification.

## 4. Ground-truth siting survey

### 4.1 Northeast terrain

Candidate A, `x305..500 z-315..60`, covered 73,696 surface columns:

| Metric | Result |
|---|---:|
| Top water columns | 6,580 |
| Top lava columns | 43 |
| Dry ratio | 0.910131 |
| Ground elevation | min 24; p10 62; median 68; p90 79; max 97 |

The dry north plateau at roughly `z=-256..-177` is suitable for individually
censused occupied prisms. The broad water band around `z=-160..-113` is a
no-build hydrology and habitat buffer.

The complete outer survey box,
`[304,30,-304]..[500,112,-145]`, contains 2,616,160 cells, 17,360 source-water
blocks, 80 source-lava blocks, 14,055 gravel blocks, 2,007 sand blocks, and six
block entities. This is a planning envelope, never a demolition box.

The block entities are:

| Position | Type | Disposition |
|---|---|---|
| `(370,33,-158)` | cave-spider spawner | protected cave easement |
| `(382,33,-276)` | zombie spawner | protected dungeon easement |
| `(384,33,-275)` | dungeon chest | protected with inventory/NBT evidence |
| `(370,66,-158)` | beehive | wet-buffer habitat |
| `(446,76,-239)` | beehive, empty | reviewed habitat migration or hall shift |
| `(457,76,-246)` | beehive, two bees | complete NBT/bee-preserving migration or hall shift |

No detailed active database feature or known tunnel intersects the selected
campus. The retired MainStreet picket-fence record touches the west boundary
and must be removed from, or explicitly retained in, the future database
contract.

### 4.2 C01 source

The complete source transaction survey is:

`[90,44,70]..[300,136,235]`

It contains 3,257,418 cells and 1,896 block entities:

| Block-entity class | Count |
|---|---:|
| Barrels | 1,159 |
| Chiseled bookshelves | 373 |
| Beacons | 102 |
| Conduits | 90 |
| Brewing stands | 40 |
| Beds | 36 |
| Chests | 28 |
| Lecterns | 24 |
| Blast furnaces | 17 |
| Signs | 14 |
| Other | 13 |

There are 1,622 inventory-capable block entities, 12 non-empty inventories, 92
item stacks, and a total item count of 5,132. The C01 database subtree has 36
objects: 21 rooms, six custom/route objects, four landmarks, three buildings,
one sidewalk, and one utility.

That is why “copy it, then delete the old one” is not an acceptable informal
operation.

### 4.3 Literal east translation rejected

A literal `+208 X` translation would occupy:

`[298,44,70]..[508,136,235]`

The destination contains:

- 101,675 source-water blocks;
- 43 bubble columns;
- 15,061 gravel blocks;
- 5,422 sand blocks; and
- occupied beehives at `(386,70,186)` and `(369,71,228)`.

That option is rejected.

## 5. Data-center master schedule

### 5.1 Roads

The Ravensreach connector begins on Mine Road:

```text
(-72,67,-405) -> (-38,67,-405)
```

The surveyed surface search from `(-38,67,-405)` to `(304,69,-304)` found a
456-block raster route with ground elevation `y62..70`. Its review waypoints
are:

```text
(-38,67,-405)
(-6,70,-397)
(25,70,-388)
(56,70,-379)
(82,63,-365)
(117,65,-366)
(150,65,-361)
(182,65,-355)
(213,66,-346)
(226,65,-319)
(255,70,-308)
(304,69,-304)
```

The one-wide centerline encounters only two isolated surface-water columns,
`(82,62,-365)` and `(84,62,-365)`. The design reserves a dry bridge at:

`[78,62,-369]..[90,70,-362]`

The final seven-wide corridor still requires a fresh width-buffer census; its
bridge must leave the water path open. The internal seven-wide service spine
runs:

```text
(304,69,-304) -> (328,70,-288) -> (328,70,-216) -> (480,70,-216)
```

A separate three-wide pedestrian way parallels it.

### 5.2 DM halls

| Hall | Inclusive bounds | Water/lava | Block entities |
|---|---|---:|---:|
| DM10 | `[336,70,-256]..[375,100,-177]` | 0 | 0 |
| DM11 | `[384,70,-256]..[423,100,-177]` | 0 | 0 |
| DM12 | `[432,70,-256]..[471,100,-177]` | 0 | 2 beehives |

Every hall gets exactly 40 named rack rows. For pair `i=0..19`, the two rack
rows occupy:

```text
z = -253 + 3*i
z = -252 + 3*i
```

This creates 20 hot/cold rack pairs. Cross aisles follow pairs 5, 10, and 15.
DM10 rack runs use `x340..372`; DM11 uses `x388..420`; DM12 uses
`x436..468`. Each hall reserves `z=-256..-254` for front staging and
`z=-194..-177` for rear electrical, cooling, circulation, and remote exits.

Vertical program:

- service plenum `y70..73`;
- white space `y74..88`; and
- roof mechanical zone `y89..100`.

The material language is restrained: structural gray concrete, smooth-stone
service floors, dark rack rows, copper and cyan system accents, glazed
operations rooms, and a planted forest-edge berm. Cooling and power diagrams
remain fictional.

### 5.3 Separate InfoBunker-inspired facility

DM10 connects to a structurally separate underground continuity facility:

`[336,34,-256]..[395,58,-217]`

Its 60,000-cell box contains zero water, zero lava, zero block entities, and
921 gravel blocks. An eleven-block rock buffer at `y59..69` separates it from
the halls; it shares no structural wall with DM10.

The lower clear level `y36..45` contains essential-record, systems-spare,
staff-refuge, and sanitary-support rooms. The upper level `y47..56` contains
continuity operations, communications, briefing, and controlled staging.

The normal DM10 rear connector is:

`[360,54,-256]..[367,70,-249]`

The remote protected egress is:

`[388,54,-224]..[395,70,-217]`

These are separately bulkheaded and must each pass bidirectional walking
without borrowing the other path.

### 5.4 NOC, dorms, theaters, and expansion yard

| Object | Bounds | Survey result |
|---|---|---|
| Network/campus operations center | `[304,70,-256]..[319,94,-233]` | 0 fluid / 0 BE |
| Presentation theater | `[304,70,-232]..[319,94,-205]` | 0 fluid / 0 BE |
| Cinema | `[304,70,-204]..[319,94,-177]` | 0 fluid / 0 BE |
| Dormitory | `[320,70,-256]..[335,100,-177]` | 0 fluid / 0 BE |
| Expansion construction yard | `[304,70,-272]..[319,88,-257]` | 0 fluid / 0 BE |

The presentation theater has a stage at `z=-231..-228` and exactly 200 seats:
ten seats across `x306..315` for 20 rows at `z=-226..-207`. Its west public
door is `[304,72,-230]..[304,75,-227]`; its remote east exit is
`[319,72,-208]..[319,75,-205]`.

The cinema has its own screen at `z=-203` and 200 seats at `x306..315`,
`z=-198..-179`. Its west public door is
`[304,72,-202]..[304,75,-199]`; its remote east exit is
`[319,72,-180]..[319,75,-177]`.

They connect through a controlled rear gallery at:

`[317,72,-232]..[319,82,-177]`

They remain different rooms with separate public doors, lobbies, acoustic
shells, content surfaces, and remote exits.

### 5.5 Power, equipment, aviation, and outer compound

The fictional substation and power yard is:

`[400,70,-320]..[479,91,-305]`

It contains zero water, lava, or block entity. It represents A/B feeds,
metering, a battery room, transformer courts, and service access without
encoding a real topology or switching weakness.

Equipment warehouses:

- `[464,70,-304]..[479,88,-265]`; and
- `[464,70,-256]..[479,88,-217]`.

Both are fluid- and block-entity-free.

The scenic helipad is `[432,70,-176]..[463,82,-145]`. The scenic short strip
is `[480,70,-304]..[500,76,-177]`, 128 blocks long and 21 blocks wide. Both
are fluid- and block-entity-free, but neither receives an operational claim
without design-aircraft, safety-area, object-free-area, drainage, obstacle,
and authority review.

Four visually prominent but non-weaponized observation/fire-watch towers are:

- `[304,70,-272]..[310,98,-266]`;
- `[490,70,-304]..[496,98,-298]`;
- `[320,70,-184]..[326,98,-178]`; and
- `[490,70,-184]..[496,98,-178]`.

## 6. C01 move-versus-rebuild decision

| Criterion, 5 best | Literal +208 X | New east shell + migration |
|---|---:|---:|
| Site dryness | 1 | 4 |
| Inventory safety | 2 | 5 |
| Rollback clarity | 2 | 5 |
| Program fidelity | 5 | 4 |
| Constructability | 1 | 4 |
| **Total** | **11** | **22** |

The recommended shell is:

`[325,0,205]..[388,45,265]`

Its 179,584 cells contain zero source water, zero lava, zero block entity, 67
flowing-water states, and 2,690 gravel blocks. The larger all-dry surface
rectangle is `x301..396 z198..270`; minimum surveyed ground is y51. With the
shell roof at y45, at least five cover blocks remain. The flowing-water cells
still require exact neighbor-fluid isolation, compartment joints, perimeter
drainage, and monitored sumps.

The restacked program is:

| Level | Clear Y | Program |
|---|---|---|
| C01-E-L4 | 2..10 | archive, bunks, communications, records, stores, fabrication |
| C01-E-L3 | 12..20 | operations theater, three conferences, briefing, service |
| C01-E-L2 | 22..32 | hangar, dispatch, maintenance, vehicle/aircraft displays |
| C01-E-L1 | 34..43 | recessed lobby, concourse, training arena, medical/decon |

The service spine is `[351,2,229]..[357,43,237]`; the primary stair is
`[378,2,250]..[386,43,258]`. The public, hangar, arena, lower-loop, stair, and
remote-discharge route relationships remain present even though room geometry
is compacted.

The new descending road and entrance occupy:

- road envelope `[126,40,232]..[324,69,249]`;
- recessed portal `[301,38,226]..[324,64,244]`; and
- portal/shell bulkhead `[324,38,232]..[325,45,238]`.

Road centerline:

```text
(126,64,245)
(180,62,245)
(240,56,245)
(292,48,245)
(301,44,240)
(301,42,236)
```

The alignment stays south of the old C01 shell until its final recessed turn.
The final curve and parking-edge finish wait until source retirement.

## 7. Atomic C01 migration and rollback

1. Freeze snapshot and database hashes; clear entities and active builders.
2. Export a canonical ledger for every affected block state, block-entity NBT,
   inventory slot, item count, sign text, and custom name.
3. Build sealed destination monoliths, waterstops, drains, sumps, and temporary
   bulkheads before opening connections.
4. Build all rooms, stairs, and routes with placeholder empty inventories.
5. Commission dryness, lighting, exits, normal walking, concealment, room
   parity, and media while the source remains untouched.
6. Migrate one bounded NBT batch; compare canonical source/target hashes;
   accept or reverse that batch before continuing.
7. Reconcile all 1,896 block entities, 1,622 inventories, 92 item stacks,
   5,132 items, and 36 C01 database objects.
8. Switch wayfinding and access to the destination while retaining the source
   as rollback.
9. After an explicit hold and acceptance, retire the source under exact
   inverse operations.
10. Complete the permanent road, restored P01 edge, and recovered warehouse
    pods; capture immutable post state and run independent acceptance.

Literal structure movement scores higher only for geometric fidelity. It is
materially worse for dryness, partial-failure recovery, NBT safety, and
constructability.

## 8. Full-footprint parking warehouse

The accepted west hall remains:

`[-112,50,181]..[-20,61,262]`

New dry components:

| Component | Bounds | Cells | Fluids | BE |
|---|---|---:|---:|---:|
| Central connector | `[-19,52,217]..[19,59,225]` | 2,808 | 0 | 0 |
| East main pod | `[20,50,181]..[92,61,262]` | 71,832 | 0 | 0 |
| Recovered NE pod | `[94,50,181]..[116,61,235]` | 15,180 | 0 | 0 |
| Recovered SE pod | `[94,50,238]..[116,61,262]` | 6,900 | 0 | 0 |

Bulkheads:

- central `[19,53,217]..[20,58,225]`;
- recovered north `[93,53,208]..[94,57,214]`; and
- recovered south `[93,53,248]..[94,57,254]`.

Every pod is excavated and lined as its own pressure/water compartment. A pod
must be accepted dry before one small guarded bulkhead opens. There is no
single open excavation.

The structural contract is absolute:

- shell roof y61;
- y62 and y63 untouched support;
- y64 and above untouched parking; and
- every P01 bay, aisle, crosswalk, canopy, light, bicycle feature, and walking
  route must compare identically before and after.

The recovered pods depend on accepted C01 migration and source retirement.
Those transactions must never overlap.

## 9. PM release gates

This design is implementation-ready only after a new release package satisfies
all of the following:

1. fresh immutable same-moment snapshot and unchanged database provenance;
2. exact target, neighbor-fluid, gravity, block-entity, entity, protected
   feature, and active-builder preflight;
3. exact-state forward and inverse operations, independently simulated;
4. no blanket `SET`, blind terrain clear, or unmasked fill;
5. preservation of the cave, dungeon, chest, wet buffer, and habitat;
6. NBT-preserving hive migration or an approved DM12 shift;
7. 40 rack rows in every hall, clear cross aisles, rear service, and remote
   exits;
8. independent 200-seat presentation and 200-seat cinema tests, separate
   doors, and two exit routes each;
9. bidirectional DM10/InfoBunker normal connector and remote-egress tests;
10. no operational aviation claim without the FAA/design-aircraft review;
11. complete C01 block-entity, inventory, item, route, room, database, and
    media reconciliation before source retirement;
12. zero visible C01 concrete, at least five cover blocks, dry joints, working
    drainage, and two exits;
13. warehouse pod-by-pod dry acceptance before bulkhead opening and zero
    y62..64 change;
14. matched before/after captures, immutable post snapshot, database import,
    bidirectional route QA, and independent final acceptance.

Until those gates pass, every coordinate here remains a reviewed design
schedule—not a live build claim.
