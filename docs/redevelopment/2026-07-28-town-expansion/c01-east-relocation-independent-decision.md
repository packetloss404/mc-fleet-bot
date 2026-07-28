# C01 East Relocation: Independent Opposing-Review Decision

**Decision:** rebuild and commission a new modular C01 in the east reservation before decommissioning the old complex. Do not translate the existing block volume.  
**Selected planning vector:** `(+600 X, 0 Y, -230 Z)`  
**Selected study envelope:** `x700..900, y20..60, z-160..5`  
**Executable status:** **HOLD — planning decision only**  
**Live-world effect:** none; the snapshot and database were read only.

## Executive finding

The user's outcome—move C01 far enough east to recover the entire `P01` lot, separate the entrance from the parking area, conceal every structural shell cell, and preserve the operating program—is sound. A literal move is not.

The first obvious translation, `(+400 X, 0 Z)`, lands at `x500..700, z70..235`. It contains 673 wet surface columns and 28,449 fluid cells in the `y20..60` study volume. The selected east/north reservation at `x700..900, z-160..5` has no wet surface columns and 1,137 fluid cells in the same-size volume. More importantly, a contiguous `x700..900, y20..60, z-83..-21` core contains 519,183 cells with **zero fluids and zero block entities**.

That evidence changes the answer from “move it 400 blocks east” to “functionally migrate it 600 blocks east and 230 blocks north, using stacked dry modules.” The selected site's raw north edge is only 19 clear columns from the nearest data-campus parcel. Therefore no C01 excavation may use `z=-160..-141`; that band is a permanent landscape, drainage, and utility-separation buffer. The normal occupied C01 modules start at `z=-140` or farther south.

## Debate record

### Position 1 — translate the existing object

The case for translation is continuity: the current program, adjacency logic, and visual identity already exist. A coordinate transform seems deterministic and may appear easier to roll back.

The evidence defeats that argument. The source and destination are not equivalent 3D states. The `+400 X` destination intersects thousands of fluid and gravity-sensitive cells. A command-level copy would overwrite unknown terrain, manufacture hidden water boundaries, and give a misleading impression that the original shell's cover and exits remain valid. Exact rollback would also be enormous and still would not prove the new road, drainage, egress, or concealment.

**Independent ruling:** reject literal translation.

### Position 2 — rebuild in the nearest east reservation

The nearest east option minimizes route length and leaves the original orientation intact. It also retains a simple narrative relationship to P01.

Its fluid census is poor: 28,449 fluid cells at `y20..60`, with a wetter southern half, plus 673 wet surface columns. A nine-wide zero-water raw-terrain road search from the P01 east edge also failed. The option would turn a relocation project into a dewatering and bridge project without a compelling benefit.

**Independent ruling:** reject `C01-EAST-A`.

### Position 3 — modular rebuild at the cleaner east/north site

The `(+600 X, -230 Z)` option is farther from P01 but has a zero-water surface and a large completely dry underground core. Stacking the preserved program across three levels replaces a sprawling shell with a smaller footprint while retaining usable floor area. North and south dry modules can be independently isolated with bulkheads.

The tradeoff is a longer access road and a mandatory separation negotiation with the new data-campus reservation. Those are visible design problems that can be solved and tested. They are preferable to excavating through known fluids.

**Independent ruling:** select for detailed design.

## Planning geometry

| Object | Inclusive bounds | Decision |
|---|---|---|
| Existing C01 | `x100..300, z70..235` | Remains in service until new C01 passes commissioning |
| Full east study | `x700..900, y20..60, z-160..5` | Survey reservation only |
| Permanent north buffer | `x700..900, z-160..-141` | No occupied module or excavation |
| Dry north module | `x797..888, y20..60, z-140..-85` | Optional isolated plant/service |
| Dry core | `x700..900, y20..60, z-83..-21` | Selected three-level main complex |
| Dry south module | `x701..900, y20..60, z-18..-5` | Optional isolated logistics/storage |
| Portal study | `x690..712, y48..74, z-70..-36` | Exact cover/fluid/grade survey still required |
| P01 recovery | `x-125..125, z172..305` | Must become uninterrupted parking |

The dry core is wide enough to preserve the C01 operating program by stacking it:

- `B3`, floor `y21`, clear `y22..31`: utilities, water management, maintenance, protected stores.
- `B2`, floor `y34`, clear `y35..44`: operations, communications, workshops, logistics.
- `B1`, floor `y47`, clear `y48..58`: arrival, support, briefing, internal loading/parking interface.

No concrete or liner may daylight. Every roof cell needs three solid terrain blocks after construction; edge cells that fail that test are backfilled or omitted, not cosmetically covered from one camera angle.

## Road and portal judgment

The parking lot and the new entrance must be distinct places. The road begins east of `x125`, outside P01, and reaches a recessed west-facing portal near the selected dry core. It should read as a landscaped mountain-side road: switchbacks, retained cuts, drainage channels, overlook lay-bys, and a small portal forecourt—not a driveway cut through parking stalls.

The survey did not find a continuous nine-wide, zero-surface-water raw-terrain path under the initial constraints. That is a useful negative result. The engineering team must deliberately design bridge/causeway and retained-cut segments and then prove:

- continuous finished grade and headroom;
- drainage that does not discharge into the portal;
- stable supported portal face;
- bidirectional vehicle and normal-walk movement;
- no occupation of P01;
- no collision with the original C01 while the old facility remains operational.

FHWA's geotechnical guidance says tunnel criteria must be project-specific and calls for evaluating surface and subsurface drainage, seepage locations, flow, and groundwater effects before selecting drainage measures. It also emphasizes intercepting water before it reaches sensitive areas. That directly supports the hold on an improvised road or portal. [FHWA Geotechnical Technical Guidance Manual, §§4.8.5 and 4.9](https://highways.fhwa.dot.gov/sites/fhwa.dot.gov/files/geotechnical-tgm.pdf)

## Underground construction and commissioning controls

OSHA's underground-construction standard is a real construction-safety reference, not a claim that Minecraft geometry is code-compliant. It nevertheless provides sound review categories: safe access and egress, control of unused openings, flood-control instruction, communications, ventilation, illumination, fire prevention, ground support at portals, and inspection of roofs/faces/walls. [OSHA 29 CFR 1926.800](https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.800)

FHWA's road-tunnel guidance exists precisely because tunnel design cannot be reduced to a generic copy operation. [FHWA Road Tunnel Design Guidelines](https://www.fhwa.dot.gov/reports/rtdg.htm) FHWA pavement guidance likewise treats base, subbase, subgrade, unsuitable material, and drainage as a coordinated system; P01 reconstruction and the access road therefore need post-demolition subgrade and drainage evidence, not just a new surface palette. [FHWA, Geotechnical Aspects of Pavements](https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/)

These sources lead to four non-negotiable controls:

1. The new complex has at least two independent egress routes before migration.
2. Every module can be isolated from adjacent excavation and fluid boundaries.
3. Portal support, cover, drainage, ventilation, lighting, and communications are commissioned before occupancy.
4. The old complex is not removed until the new complex passes route, database, inventory, and matched-media acceptance.

## Tunnel, database, and package conflicts

The read-only database query found no cataloged object intersecting `x700..900, z-160..5`. Cataloged Raven Rock routes end at or west of `x300`; none intersects the selected site. That is not permission to assume empty space. The executable release must repeat a 3D target intersection against:

- the newest database revision;
- every active forward and rollback operation file;
- the northeast data-campus coordinates;
- all known Raven Rock routes and their engineering halos;
- block entities, fluids, waterlogged states, gravity cells, entities, and player positions.

The nearest raw data-campus edge is `z=-180`, while the C01 study begins at `z=-160`. The 19-column raw gap is not enough for two major underground programs. Keeping C01 occupied modules at `z>=-140` creates 39 clear columns and makes the intervening band an explicit non-building buffer.

## P01 and warehouse recovery

Only after old C01 decommissioning may P01 be reconstructed as one continuous parking object at `x-125..125, z172..305`. Acceptance means uninterrupted aisles and stalls, complete surface support, drainage, and bidirectional vehicle circulation, with no portal or access-road cell left in the lot.

The underground warehouse can then extend east in two proven fluid-free wings:

- north: `x89..108, y40..60, z200..245`;
- south: `x89..125, y40..60, z246..296`.

Do not excavate the intervening east/north box blindly. Seven source-water cells occur at `x114..117, y48, z232..233`; three source-lava cells occur at `x125, y46, z232..234`. Keep a reviewed five-block halo, connect each wing to the original dry core through its own rated bulkhead vestibule, and test isolation before fitting out storage.

## Migration and rollback decision

The accepted sequence is:

1. Freeze the old C01 baseline and inventory.
2. Generate exact-state guarded excavation for one dry module at a time.
3. Build independent utilities, exits, road, portal, and concealment.
4. Commission routes, drainage, lighting, ventilation, database objects, and evidence.
5. Migrate program and inventory with a signed ledger.
6. Decommission the old C01.
7. Rebuild and commission all of P01.
8. Build the two recovered warehouse wings behind isolating bulkheads.

Every phase has an exact rollback paired to the same source snapshot. A no-op caused by source drift is a failure. An offline PASS is not permission for live execution.

## Final recommendation

Proceed to detailed design at the selected east/north reservation, using the proven dry core. Do not issue a construction package until the access road and portal have a defensible grade/hydrology solution, the campus separation buffer is frozen, and the same-moment transaction gates pass.
