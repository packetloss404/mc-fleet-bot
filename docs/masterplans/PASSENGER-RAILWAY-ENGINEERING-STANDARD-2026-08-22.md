# Passenger Railway Engineering Standard

**Issued:** 2026-08-22 UTC  
**Status:** `DESIGN STANDARD — NO PASSENGER SERVICE COMMISSIONED`  
**Purpose:** turn the proposed Cross-Town Railway into bounded, testable Minecraft
subway work. This is a construction and commissioning standard, not a claim that
the world already has a public railway or a selected cross-town alignment.

For a new elevated/embanked two-track segment with an independently protected
walking path, use the companion [Above-ground double-track walkway standard](ABOVE-GROUND-DOUBLE-TRACK-WALKWAY-STANDARD-2026-08-28.md). It adds no commissioning authority and does not replace this document's separate 6×6 service-gallery requirement.

## 1. Decision

Build the public network as a **two-track, directional, powered-minecart metro**
where an exact route survey shows enough space. Use one train/minecart per
direction during the first operating stage; do not attempt coupled trains,
unproven entity automation, or a one-track bidirectional mainline. Minecraft's
native rail is the right first system because it is inspectable, reversible, and
uses stable vanilla components: powered rail for propulsion, detector rail for
train presence, and activator rail only for deliberately specified station
behavior. Mojang's rail reference confirms those three functions and cautions
that vanilla minecarts are slow; therefore this is an exploration/wayfinding
network, not a high-speed promise. [Mojang: Rails](https://www.minecraft.net/en-us/article/taking-inventory--rails)

The B09 funicular-guideway is **not** the first public subway line. It has one
accepted 552-cell passive rail component and a 17-cell bounded maintenance
shuttle, but it has no passenger platforms, powered movement, barriers,
evacuation path, station access, or public operating proof. Treat it as a
restricted maintenance asset until a separate B09 conversion package passes
this standard.

## 2. What is verified in this world

| Fact | Verified evidence | Meaning for this standard |
|---|---|---|
| No continuous cross-town passenger railway is proven. | [Master Plan Railway](MASTER-PLAN-RAILWAY.md) railway status and X0–X9 sequence. | No route, station, or map may be labelled open for passenger travel yet. |
| B09 has 552 connected passive rail cells, indices 9–560. | [Combined Zones current state](05-combined-zones/CURRENT-STATE.md), R12Q. | This proves rail topology and support/headroom only. |
| B09 has one authenticated maintenance minecart only on indices 9–25. | [Combined Zones current state](05-combined-zones/CURRENT-STATE.md), R12R. | It is not a train, public shuttle, or rescue vehicle. |
| Empty Eight’s eight future line stubs are sealed. | [Master Plan Railway](MASTER-PLAN-RAILWAY.md) and MP05 current state. | A line must not enter Empty Eight by opening a stub incidentally. |
| The B09 lower and summit shells plus passive lights exist. | MP05 R07D–I and R10B–F evidence. | Existing voids/fixtures may be surveyed, never assumed to be station-ready. |
| Current pedestrian network has three failed cross-area routes and several legacy one-tread cores. | [Execution Runbook](MASTER-PLAN-EXECUTION-RUNBOOK.md). | A station cannot claim public access until its own surface-to-platform route is repaired and proved. |
| Cheyenne, BOH/private-club areas, fire/service interfaces, and multiple bunker areas are restricted. | Master Plan Railway hard boundaries. | They are not passenger station candidates without separately granted public access. |

All other geometry in this document is a **project design target**, not observed
world state. A fresh snapshot and an exact station/alignment survey must replace
targets with integer coordinates before any physical release.

## 3. Network concept and stop programme

### 3.1 Service shape

Create a legible initial line, `M1 Cross-Town`, instead of pretending the world
already supports a loop. The intended passenger direction is west/east with
separate return track. Each line segment is independently useful only when it
has two finished station termini or one station plus a fenced, non-passenger
turnback. Transfers are walking transfers until a second service is actually
commissioned.

### 3.2 Candidate stations — not set out and not built

| Proposed stop | Role | Evidence basis | Required survey/repair before it may become a station |
|---|---|---|---|
| `M1-01 Westlight` | western district arrival | MP12/13 cataloged fabric | `CIRC-WL-ARRIVAL-01`; exact public entrance, platform shaft, and Westlight/Ravensgate ownership seam. |
| `M1-02 Ravensgate` | road/district transfer | MP06 cataloged Ravensgate–Westlight feeder | `CIRC-RG-SURFACE-01`; exact road-to-station route and water/pavilion exclusions. |
| `M1-03 Ravensreach` | civic-town stop | MP10 physical town and accepted MainStreet route | complete Moot room-floor programme; no dependency on the repaired Moot spine alone. |
| `M1-04 MainStreet` | dense central transfer | MP07 accepted built records | `CIRC-MSA-PORTAL-01` and `CIRC-MSA-H11-01`; survey a new station entrance rather than routing riders through H11. |
| `M1-05 Gateway / C01` | east interchange and future access point | MP05 bounded C1 and B03 context | `CIRC-C01-PORTAL-01`, dry/hydraulic survey, exact ownership, and a public/non-secure portal. |
| `M1-06 Combined Zones Arrival` | eastern terminal | accepted public Empty Eight south gallery/headhouses | PF08 stair correction and one separately released headhouse-egress adapter; keep sealed stubs closed. |
| `M1-07 B09 Summit` | future scenic/restricted conversion, not M1 phase one | B09 shells and passive rail | full B09 conversion programme in section 8; no connection to M1 is inferred. |
| `M2-01 Raven Rock` | future remote branch candidate | catalog/historical evidence only | current complex release, dry route truth, access classification, and `CIRC-RR-C2-01` / `CIRC-RR-Z5-01`. |
| `M2-02 Cheyenne` | future controlled destination candidate | bounded internal circulation only | no public terminal or external access claim; separate security/public-interface release. |
| `M2-03 SubTropolis` | future destination candidate | partial deep/service context | prove a public approach and a non-service tunnel; do not reuse maintenance passages. |

The first executable rail programme is the surveyed portion of `M1-01` through
`M1-06`. `M1-07` and all `M2` stops stay in the station register as **future
survey candidates**, not commitments to build through protected or restricted
space.

## 4. Standard guideway and station geometry

### 4.1 Track and tunnel

| Element | Project target | Non-negotiable acceptance evidence |
|---|---:|---|
| Directional running tunnel | 5 clear wide × 4 clear high per single track; 2 tracks use two bores or a 12 clear wide × 5 clear high box | full block-state section sample every 16 blocks, support, dry volume, light and side-clearance census. |
| Track centre spacing in shared box | 5 blocks | no cart overlap, escape path or platform intrusion. |
| Track support | every rail sits on documented non-gravity support; no waterlogged rail unless that exact state is deliberately designed and tested | exact source/post support state table. |
| Longitudinal grade | level where possible; no more than 1 rise per 8 run for through passenger track | rail-shape simulation and loaded-cart forward/return run. The existing 1:8 East Corridor planning profile is a planning precedent, not a passenger acceptance. |
| Curves | cardinal turns only in a named interlocking/turnback; no unsurveyed diagonal or blind curve | exact rail-shape post-state and low-speed runtime test. |
| Curve lead-in | 8 level blocks before and after every direction change | braking and detector-clearance test. |
| Powered rail | powered launch and recovery zones at termini; repeaters/power cadence selected by an in-world loaded-cart test, recorded per segment | full forward and return runtime log; no generic spacing assumed from internet tutorials. |
| Lighting | continuous visible rhythm, with extra light at switches, portals, platforms, exits, and fault boxes | zero dark public cells under the project’s recorded light proxy and visual evidence both directions. |
| Mandatory service corridor | 6 clear wide × 6 clear high, continuously parallel to every passenger running segment behind a continuous separation wall | full route graph proves it follows the same origin/destination sequence as the passenger line, has no rail-walking dependency, and remains dry, lit, and bidirectionally walkable. This is not an optional escape strip. |
| Separation wall | one continuous opaque structural wall between passenger guideway and service corridor, with only named, lockable cross-passages | no accidental track access; every aperture has an owner, door state, emergency-release behaviour, and post-state preservation census. |

### 4.2 Platform, gates, and vertical access

| Element | Project target | Rule |
|---|---:|---|
| Side platform | 3 clear blocks wide × 24 clear blocks long for initial one-cart service | 2 clear blocks remain unobstructed behind the edge cue. |
| Island platform | 5 clear blocks wide × 24 clear blocks long | use only where two tracks share one station box. |
| Platform edge | continuous contrasting edge cue and a physical fall-prevention treatment at every non-door section | fence/wall/glass must not reduce the passenger clear zone. |
| Gate line | 5 clear wide fare-free gate opening or paired 3 clear wide accessible openings | gates are orientation/control props, not a reason to block evacuation. |
| Primary street-to-platform route | 5×5 public concourse; 1 rise per 2 run; 5-deep landings | matches the current Master Plan circulation correction baseline. |
| Secondary staff route | 3×3, controlled and signed | cannot be presented as passenger egress. |
| Lift analogue | a separately tested, no-jump return option at each public underground platform | stairs alone do not make a station accessible in this project. |
| Exit count | two independently walkable exits for every public underground station; they must diverge before the street interface | a shaft pair sharing one failing corridor is one exit. |

### 4.3 Mandatory parallel service corridor

The 6×6 service corridor is a required companion route to every passenger
subway segment. It runs behind the guideway-side wall on the same station-to-
station alignment; it may pass around a station box, but it may not terminate at
the back of a platform, vanish on a curve, or be replaced by the track bed.
Its purpose is maintenance, evacuation, controlled staff movement, utility
access, and future repairs without closing the only passenger walking path.

- **Continuity and separation:** maintain the 6-clear-wide × 6-clear-high
  volume, floor, lighting rhythm, and full-height separation wall throughout
  each segment. No service door may open directly to a passenger platform or
  guideway without a named cross-passage and lockable interlock.
- **Cross-passages:** provide a signed, normally locked but emergency-releasable
  3×3 cross-passage at each station, at both sides of every long curve, and at
  most 64 track blocks apart between stations. Cross-passages land on a level
  protected point; neither side may require stepping onto rail.
- **Service exits:** provide a controlled service exit to a safe surface or
  staffed/public concourse at every station and at most every 128 track blocks
  in long tunnels. It must be independently reachable from the 6×6 corridor,
  signed by segment ID, and not depend on a sealed Empty Eight stub, a BOH
  room, a secure bunker, or a passenger-only gate.
- **Branches and junctions:** the service corridor follows every active
  passenger branch until that branch has its own turnback/terminal service
  exit. At a passenger junction, service routes meet at a named 7×7 decision
  node outside the interlocking; no maintenance route crosses the live track
  at grade. A retired or R1 legacy rail branch remains walled off and does not
  count toward corridor continuity.
- **Utilities and recovery:** cable/redstone trunks, maintenance stores, and
  recovery niches live on the service side, outside the 6-block clear movement
  envelope. At least one 3×3 passing/recovery bay is required per 64 blocks;
  this can be a widened area outside the continuous 6×6 route, never a
  narrowing of it.

## 5. Operations, signals, and passenger safety

### 5.1 First-service operating model

Use **one cart per direction, one train in each bounded block**, with manual
dispatch from a staffed/visible control niche in phase one. A detector rail at
each block entry and terminal proves cart presence; a powered rail only receives
launch power when the next block is clear. A redstone lamp plus named signal
state (`CLEAR`, `STOP`, `OUT OF SERVICE`) is mandatory at every passenger
departure point.

Do not call a comparator clock, minecart sorter, or a detector rail by itself a
signal system. The acceptance test is observable behaviour: an occupied or
unknown next block prevents launch, a power loss produces a stopped cart in a
known recovery zone, and a dispatcher can recover a cart without breaking the
guideway.

### 5.2 Termini, turnbacks, and faults

- Each initial terminus needs a 24-block platform, an arrival detector, a
  protected stop zone, a launch zone, and a **12-block fenced turnback/recovery
  tail** beyond the passenger stopping point.
- The first service may require riders to exit and board the opposite-direction
  cart; automatic reversing is deferred until its entity and redstone failure
  modes are specifically tested.
- Switches are prohibited on through passenger running until one exact
  interlocking package proves route locking, cart detection, reset, and rollback.
- No passenger vehicle may enter a section with unknown fluid, entity, chunk,
  power, rail-shape, or detector state. That condition is `OUT OF SERVICE`, not
  a reason to improvise a bypass.

### 5.3 Rescue and maintenance

Every 64 blocks of underground running tunnel, and at both sides of every long
curve, provide a signed cross-passage into the mandatory 6×6 service corridor.
Each passenger must be able to leave a stopped cart, reach that protected
walking route, and walk to a platform/exit without jumping, crouching,
rail-walking, or entering a restricted room. Store recovery tools and a spare
minecart in a locked service niche outside the passenger clear envelope and the
service corridor's 6×6 clear movement volume.

The project’s rescue proof is Minecraft-specific: simulated stopped cart at
each block boundary; player exit; normal-walk evacuation in both directions;
dispatch reset; and a complete before/after entity census. It is not a claim of
real-world rail or fire-code compliance.

## 6. Wayfinding and exploration use

Give every line a colour, symbol, and terminal pair. Initial recommendation:
`M1` uses **copper/orange** and is labelled `Westlight — Combined Zones`.
Platforms show: current station, direction/terminal, next stop, transfer/exit,
and an `OUT OF SERVICE` state. At every station entrance, place a wall map with
the whole-world Build Index plus a local “you are here” plan.

The map must distinguish:

- `open passenger` — only after commissioning;
- `walk transfer` — route independently QA-passed but not rail service;
- `future surveyed candidate` — no passenger claim;
- `restricted/maintenance` — B09 shuttle, secure bunker, BOH, service tunnel;
- `sealed` — Empty Eight stubs and all closed interfaces.

This is what makes the system useful for exploration: it tells a player where
they can go now, rather than using an attractive line diagram to imply access.

## 7. Required build-package order

Each item below is one or more independently guarded release packages. A later
item cannot silently absorb earlier unknown cells.

1. **RAIL-S0 — evidence and station register.** Fresh immutable snapshot;
   candidate-stop coordinate/ownership register; protected, fluid, entity,
   block-entity, and route surveys. Output: exact no-build corridor options.
2. **RAIL-S1 — alignment and interface freeze.** Choose the M1 segment(s) from
   source evidence; freeze integer centreline, profiles, station boxes,
   emergency walkways, portals, and every cross-scope seam. Output: one owner
   per cell and an inverse plan.
3. **RAIL-S2 — access before track.** Repair/construct the public street-to-
   platform routes, two exits, concourse, landing/lift analogue, gates, and
   station shell. Commission only pedestrian access at this stage.
4. **RAIL-S3 — dry passive civil guideway.** Build passenger bores, supports,
   drainage separation, the continuous separated 6×6 service corridor,
   cross-passages, service exits, lighting and passive rails. Output: static
   guideway QA, not a vehicle claim.
5. **RAIL-S4 — terminal and control cells.** Add platform edge treatment,
   block detectors, powered launch/stop zones, fault lamps, turnbacks, and
   manual control niches. Each mechanism has a documented default state.
6. **RAIL-S5 — bounded vehicle trial.** Spawn/tag one cart only after a fresh
   entity-clearance gate. Test each block, each terminal, cart exit, recovery,
   route reset, and rollback. No public riders.
7. **RAIL-S6 — station-pair passenger opening.** Open exactly one station pair
   and one direction at a time, then the reverse direction. Require operational
   run logs, evacuation proof, signs/maps, and post-state evidence.
8. **RAIL-S7 — line extension and publication.** Add the next station pair only
   after the last pair remains healthy. Update the Build Index, POI directory,
   underground report, route graph, screenshots, and Master Plan only from
   accepted release data.

Every physical package must meet the existing hard-safety kernel: fresh
immutable source, complete source states, forward/inverse identity, entity and
block-entity/protected-core handling, strict-noop parser checks, exact
preflight, journalled execution, post snapshot, route QA, and rollback
post-state preflight.

## 8. B09 conversion: maintenance rail to passenger-safe service

`B09-P0` is a survey/reclassification package, not track expansion. It must
survey all 552 rail cells, both station shells, the 19 changed R12R cells, the
minecart entity, power/control voids, drainage/fluid neighbourhood, the two
external caps, stair/elevator approaches, and the public/restricted boundary.

Only after `B09-P0` passes, execute these separate packages:

1. **B09-P1 access:** build a public or explicitly restricted station approach
   that meets section 4; do not route users through the Empty Eight BOH, sealed
   stubs, rail bed, or maintenance shuttle area.
2. **B09-P2 evacuation/service separation:** build a continuous 6×6 service
   corridor behind a full separation wall along the complete passenger-use
   B09 extent, with 3×3 lockable cross-passages at stations, curves and every
   64 blocks, plus controlled service exits at stations and at most every 128
   blocks. The corridor must continue through every active B09 branch to its
   terminal service exit; it must not use Empty Eight BOH, sealed stubs, or
   the existing rail bed as a shortcut. A mountain guideway without that
   companion corridor and two independently proven public exits stays
   maintenance-only.
3. **B09-P3 station edge and separation:** platforms, edge barrier treatment,
   gates, lighting, map, and a physical passenger/maintenance separation.
4. **B09-P4 powered operations:** no more than one powered trial block at a
   time, followed by detector, stop, recovery, and power-loss tests. The
   existing minecart is never repurposed without an entity migration plan.
5. **B09-P5 limited passenger pilot:** two stations only, published as a
   limited scenic shuttle. Full funicular or cross-town service remains a new
   commissioning decision.

If any B09-P gate fails, retain the current accepted R12R maintenance shuttle
and its caps. Its presence is useful evidence and does not create a passenger
obligation.

## 9. Existing-rail conversion classes and retrofit checklist

Every existing rail in the world is assigned one conversion class from a fresh
snapshot; a historical release label is not a conversion class. Classify the
smallest exact rail component and its station/portal interfaces. A failed class
blocks only that component and its dependent station interface, never an
unrelated candidate segment.

| Class | Meaning | Permitted next action |
|---|---|---|
| `R0 — UNKNOWN` | No current source census, owner, rail-state, support, clearance, or entity evidence. | Fence/mark as non-passenger and survey. No upgrade or use. |
| `R1 — LEGACY/UNSAFE` | Any missing support, water/fluid issue, inadequate clear envelope, uncontrolled junction, unsurveyed block entity, no walking rescue path, or uncertain ownership. | Isolate at both ends and replace with a new, disjoint passenger component after survey. It may remain abandoned scenery only if safely segregated. |
| `R2 — PASSIVE-STRUCTURAL` | Exact passive rail, support, headroom and shell are proven, but no passenger access, active power/control, platform separation, rescue or vehicle proof exists. | Eligible for a bounded civil/access retrofit; no passenger cart. B09 R12Q is this class. |
| `R3 — MAINTENANCE-OPERABLE` | A limited work/shuttle movement has entity, route and recovery evidence but remains restricted and lacks public station/evacuation proof. | Retain as maintenance or run the complete R3→R4 retrofit. B09 R12R is this class only on its authenticated 9–25 shuttle extent; the rest of B09 remains R2. |
| `R4 — PILOT-PASSENGER` | Two approved station interfaces, control blocks, evacuation, wayfinding and one-cart runtime prove a bounded public station pair. | Open the named station pair only; extend through a new guarded package. |
| `R5 — PASSENGER-OPERATING` | Whole named line has accepted station-pair evidence, bidirectional service, recovery, publication and terminal post-state proof. | Publish as open passenger rail, with a current outage/maintenance procedure. |

### 9.1 Retrofit checklist

For a proposed `R2` or `R3` conversion, the release owner must answer every
item with exact cell/entity evidence before compiling a change:

1. **Identity and scope:** identify the component endpoints, all rail shapes,
   supports, halo, station interface, owner, protected features and prior
   release targets.
2. **Separation:** prove physical caps/gates at both ends so a trial cannot run
   into a legacy unknown, sealed stub, service route, open shaft or restricted
   room.
3. **Geometry:** prove the section, grade, curve lead-in, rail support,
   headroom, platform clearance and emergency walkway against sections 4–5.
4. **Environment:** scan fluid, gravity, fire/lava, light, cave/void, drainage
   and chunk-border conditions; treat an unknown as a local stop.
5. **Passenger access:** prove two exits, concourse/landing/lift analogue,
   platform edge, gate line, signs and public/private boundary. A staff stair
   or B09 maintenance path is not an exit.
6. **Controls:** enumerate powered, detector, activator, redstone, hopper,
   command and container/block-entity state; state default power-loss behavior
   and manual recovery.
7. **Vehicle:** census existing carts/entities. A legacy cart is preserved or
   migrated only under an exact entity plan; do not overwrite/delete it as part
   of rail installation.
8. **Trials:** run the required stopped-cart, forward/return, occupied-block,
   power-loss, exit, evacuation and reset tests before changing the public
   status.
9. **Reversibility:** bind forward/inverse operations, strict-noop checks,
   live clearance, journal, post snapshot and rollback post-state preflight.

### 9.2 When to isolate and replace instead of upgrade

An existing component must be placed in `R1` and isolated/replaced when any of
the following cannot be corrected inside a bounded package: its rails change
shape when adjoining track is simulated; it lacks stable support or dry
clearance; it crosses an unowned/protected interface; it has no feasible
3×3 rescue path and two public exits; its legacy mechanism/container/entity
state cannot be migrated exactly; or its grade/curve cannot pass a loaded-cart
runtime test without unsafe stop/overshoot behavior. Replacement means new
track and passenger interfaces are built beside or beyond sealed caps, then
tested independently; the old component is preserved, retired as scenery, or
removed only in its own inverse-backed retirement release.

This is deliberate local replacement, not a global hold. A new M1 station pair
may proceed past an isolated R1 asset only when its own exact alignment and
interfaces are disjoint and it does not rely on that asset for access, rescue,
or controls.

## 10. Acceptance record for every public segment

The release record must contain:

- exact segment and station bounds, owners, source and post snapshot IDs;
- rail shape/support/headroom/clearance census and all powered/detector states;
- 6×6 service-corridor route graph, separation-wall and cross-passage state,
  service-exit cadence, branch/terminal continuity, and its own bidirectional
  no-jump walking proof;
- forward, return, stopped-cart, power-loss, overshoot, evacuation, and recovery
  test logs with screenshots/video frames;
- cart/entity and block-entity/container delta; no unexplained entities;
- normal-walk proof from each platform to each signed exit, including width,
  headroom, rise/run, landing, door, light, water and ownership table;
- sign/map text and a clear passenger/restricted/sealed classification;
- exact rollback operation plus post-forward rollback preflight; and
- a negative-claim statement listing unopened stubs, unbuilt stations, and
  uncommissioned blocks.

## 11. Integration edits recommended to the central plan

The parent Master Plan team should make these **documentation-only** edits after
reviewing this standard:

1. Link this document from `docs/masterplans/README.md`, the Master Plan
   Railway railway section, and the Execution Runbook X6/X7 workstream.
2. Replace the generic X3 railway design-freeze exit with the `RAIL-S0`/`S1`
   coordinate-and-interface freeze, then list `RAIL-S2` through `S7` as the
   only path to passenger service.
3. Change the public railway concept to M1 Westlight → Ravensgate → Ravensreach
   → MainStreet → Gateway/C01 → Combined Zones Arrival, with every stop marked
   `candidate / not set out` until a fresh survey names its exact coordinates.
4. Add M1-07 B09 Summit, Raven Rock, Cheyenne and SubTropolis only under
   `future survey candidate`; preserve their restricted/unproven status.
5. Add a permanent map legend for `open passenger`, `walk transfer`, `future`,
   `restricted/maintenance`, and `sealed`; never draw a solid public line over
   B09 R12R or Empty Eight’s eight sealed stubs.
6. Add the station-access dependencies named in section 3 to the defect/circulation
   queue so rail construction cannot bypass known access defects.
7. Add the `R0`–`R5` conversion register and retrofit checklist to every
   pre-existing rail inventory. Record B09 as R2 on the passive guideway and
   R3 only for its existing bounded maintenance-shuttle extent; do not flatten
   it into a passenger-ready label.
8. Make the 6×6 parallel, walled service corridor a non-negotiable `RAIL-S3`,
   B09-P2, station and segment acceptance condition; record its cross-passages
   every 64 blocks, controlled service exits every 128 blocks, and continuation
   through each active branch to a terminal service exit.

## 12. Sources and limits

- World-specific status and constraints: [Master Plan Railway](MASTER-PLAN-RAILWAY.md),
  [Execution Runbook](MASTER-PLAN-EXECUTION-RUNBOOK.md), and
  [Combined Zones current state](05-combined-zones/CURRENT-STATE.md), consulted
  2026-08-22.
- Vanilla component roles: [Mojang, *Taking Inventory: Rails*](https://www.minecraft.net/en-us/article/taking-inventory--rails), consulted 2026-08-22.
- The tunnel, stair, and accessible-route dimensions here are project targets
  adapted to Minecraft, not legal or professional engineering certification.
