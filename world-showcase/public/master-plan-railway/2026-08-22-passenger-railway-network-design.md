# Whole-World Passenger Railway — Network Design

**Status:** proposed and coordinate-backed; no construction authority  
**Prepared:** 2026-08-22  
**Machine register:** [passenger-railway-stop-register-2026-08-22.json](passenger-railway-stop-register-2026-08-22.json)

## Decision

Build one usable exploration subway, not a string of isolated minecart rides:
a western heritage trunk, eastward exploration spine, Gateway/Empty Eight
branch, and later mountain visitor branch. They meet only at public
interchanges. Secure, staff and uncommissioned underground systems stay
separate.

## Current position

There is **no commissioned passenger railway** in the world. The Combined
Zones source register explicitly says the accepted catalog had no rail of any
kind; older uses of “Railway” often mean the hosting service. The only rail
assets or reservations with useful evidence are:

| Asset | Current classification | Passenger-network decision |
|---|---|---|
| C1 East Corridor | Phase-0 engineered double-track profile; named `MS-1`, `DD-1`, `GW-1` design stops; still unbuilt. | Reuse as the Amber East Explorer alignment. Do not redraw a direct unsurveyed line. |
| Gateway surface alignment | `GA-S1` and `GA-S2` have surveyed `Y=68` reference datums, 48-block side-platform design setouts; still unbuilt. | Reuse as Violet surface service after frontage surveys. |
| Empty Eight | Eight-track/eight-platform terminal reservation and a C4 grade study; interfaces sealed, rail operation uncommissioned. | Retain as a future terminal only. Recommission selected paired tracks after a dedicated operating release; keep all other pairs capped. |
| B09 guideway | Bounded passive maintenance component. Its public access, rescue, controls, drainage and passenger mechanics are not accepted. | **Convert only through its separate B09-P0–P5 subway retrofit lane.** Until then it stays maintenance-only, isolated, and has no passenger turnout or transfer. |
| Cheyenne B03 | Bounded passive internal inspection component; approach is obstructed/capped. | **Internal-only.** No passenger branch or turnback. |

Empty Eight public access is the retail gallery, not a transit service. C01’s
mountain-portal route fails in both directions. Ravensgate’s underground
exclusion is sealed. Raven Rock has no current accepted complex release. None
can be treated as an opening-network transfer.

## Network topology

```text
COBALT / HERITAGE
Ravencrest — Westlight — Ravensgate — Ravensreach — Manager Vale
                                                    |
                                             MainStreet Central
                                                    |
                                       Arrival / Observatory

AMBER / EAST EXPLORER
MainStreet Central — MainStreet East — Data District — Gateway
                                              |              | \
GREEN / DATA CONNECTOR                    Data Campus     GA-S1 — GA-S2
Data District — Data Campus — Concord                       \
                                                         Empty Eight (later)

SLATE / MOUNTAIN VISITOR (later, public forecourts only)
Gateway — Houston Forecourt — Cheyenne Outer Portal
```

This is topology, not an approved excavation alignment. The register uses
source-backed `X/Z` envelopes. Any shown `Y` is a source reference datum only:
it is not a safe landing, final rail elevation, approved platform, or `/tp`
instruction.

## Lines and opening sequence

| Line | Service | Stops | Release phase |
|---|---|---|---|
| **Cobalt — Heritage** | Public western exploration, keeping staff/warehouse routes out of the network. | Ravencrest, Westlight, Ravensgate, Ravensreach, Manager Vale, MainStreet Central, Arrival/Observatory. | R1 |
| **Amber — East Explorer** | The principal town-to-east route; reuses C1. | MainStreet Central, `MS-1`, `DD-1`, `GW-1`. | R2 |
| **Green — Data Connector** | Data District / Campus / Concord shuttle. | `DD-1`, Data Campus, Concord. | R3 |
| **Violet — Gateway / Empty Eight** | Gateway surface request service first; terminal later. | `GW-1`, `GA-S1`, `GA-S2`, Empty Eight. | R3 surface / R4 terminal |
| **Slate — Mountain Visitor** | Public mountain forecourt, not bunker transport. | `GW-1`, Houston Forecourt, Cheyenne Outer Portal. | R5 |

Open with Cobalt and Amber only. Green is a short shuttle; Violet begins as
surface request service. Do not invent a full timetable until the first two
lines can be walked, ridden, evacuated and recovered in both directions.

## Stop coverage

The full machine-readable record has all station properties and prohibitions.
This table is the human build brief.

| ID | Station | Serves | Source-backed candidate anchor/envelope | Classification |
|---|---|---|---|---|
| `PR-W01` | Ravencrest Gate | Ravencrest event/amusement zone | `x=-671..-533`, `z=-647..-521`; gate `(-587,-636)` | New candidate |
| `PR-W02` | Westlight Interchange | Westlight District, venue/theatre, waterfront, Approach Road | `x=-443..-260`, `z=-640..-445`; district anchor `(-344,-500)` | New candidate; one common public hub, not stations inside overlapping assets |
| `PR-W03` | Ravensgate | campanile, loggia, stoa, water garden | `x=-148..-64`, `z=-562..-420` | New surface-only candidate |
| `PR-W04` | Ravensreach Civic | historic town, Library, Moot, Market | `x=-147..-40`, `z=-451..-323` | New candidate; protect the new Moot spine and survey Library access |
| `PR-W05` | Manager Vale | workforce housing / mini-mansions | `x=-145..-49`, `z=-317..-169` | New candidate |
| `PR-C01` | MainStreet Central | residential grid, civic streets, shops | road-junction anchor `(0,17)` | New transfer candidate; no B03 warehouse transfer |
| `PR-C02` | Arrival & Observatory | Visitor Campus, C01 public exterior, observatory exterior | visitor `x=-135..135`, `z=75..305`; observatory surface `x=90..294`, `z=135..231` | New candidate; no active-portal or C01-mountain claim |
| `MS-1` | MainStreet East | C1 west terminus / road interchange | C1 setout `(430,68,80)`; 2 × 32-block side platforms | Existing design, unbuilt |
| `PR-E01` | Data Campus | dense north Data District | `x=720..999`, `z=-701..-491` | New candidate |
| `PR-E02` | Concord | Te Ia Concord, broadcast, motel, theatre | `x=600..808`, `z=-491..-346` | New candidate |
| `DD-1` | Data District | C1 eastern data frontage | C1 setout `(1240,77,-80)`; 2 × 32-block side platforms | Existing design, unbuilt |
| `GW-1` | Gateway | East Explorer / Gateway transfer | C1 setout `(1550,68,-250)`; 2 × 32-block side platforms | Existing design, unbuilt, main east interchange |
| `GA-S1` | Gateway Gardens | forecourt and gardens | existing setout `(1640,68,-250)`; 2 × 48-block side platforms | Existing request-stop design, unbuilt |
| `GA-S2` | Approach Commons | parcels/trailhead | existing setout `(1920,68,-250)`; 2 × 48-block side platforms | Existing request-stop design, unbuilt |
| `PR-EE1` | Gateway Expansion Terminal / Empty Eight | public retail gallery only | terminal `x=1632..1872`, `y=38..54`, `z=40..160`; rail datum `Y=40` | Reservation present; passenger operation uncommissioned |
| `PR-M01` | Houston Forecourt | future Combined Zones public arrival | anchor `(2048,-328)` | Gated new candidate |
| `PR-M02` | Cheyenne Outer Portal | future exterior tour start | portal anchor `(2048,130,-748)` | Gated new candidate |
| `PR-RR1` | Raven Rock Surface Gate | Raven Rock | `x=193..207`, `z=-22..-8`; shaft anchor `(194,-15)` | Survey-only: no accepted current complex release |
| `PR-C03` | C01 East Stack | relocated East C01 | contested arrival anchor `(703,-80)` | Survey-only: no opening-network transfer |
| `PR-M03` | SubTropolis Lower Lobby | future SubTropolis public lobby | lower-lobby study anchor `(2108,-428)` | Future candidate; endpoint and public route unset |

## Transfers, turnbacks and separations

1. **MainStreet Central ↔ MainStreet East** is a surveyed public walking
   transfer only. B03 warehouse’s drive-hall route currently fails in both
   directions, so it is never the shortcut.
2. **Data District (`DD-1`) ↔ Green** should be same-concourse or a short
   at-grade link. C1 already puts its platforms on the pedestrian-facing flank
   and documents a 56-block district walk without highway crossing.
3. **Gateway (`GW-1`)** is the line junction. Its first package must include
   a surveyed tail/turnback and a protected paid/unpaid walking link; do not
   bury a junction in the roundabout itself.
4. **`MS-1`** is the other Amber turnback. Survey a tail track or paired
   crossovers outside the 32-block platform tangent; no reversal across a
   public platform.
5. **Empty Eight** reserves four paired future line groups. At R4, activate
   only one paired set for Violet terminal service and a second only if an
   actual second service needs it. The other six platform-track pairs remain
   capped, lit and protected. C4 is a separate grade branch, not a transfer
   authorization.
6. **B03, PassageWay, secure Cheyenne, restricted Empty Eight annexes,
Ravensgate underground, and the contested C01 arrival have zero passenger
transfer value.** B09 is independently converted as a scenic shuttle, never a
transfer into those systems; every other listed system stays physically separate.

## Mandatory behind-wall service gallery

Every passenger-running segment uses `PR-SAG-01`: one continuously connected,
parallel **6 clear blocks wide × 6 clear blocks high** service access gallery
behind a continuous fire/impact wall. It is a service system, not a hidden
public hallway and not a substitute for either public egress route.

- Provide a locked 3×3 staff vestibule from the gallery at **both ends of every
  station**, with no uncontrolled door from a platform or public concourse.
- Add a surveyed service-exit node at least at each station and at no more than
  128 route blocks between nodes. Each node must reach a separately approved
  surface point or protected service receiver; it does not count as public
  egress merely because it exists.
- The gallery must carry access to power, signal, drainage and stranded-cart
  recovery points without requiring staff to enter the running way. It must
  have independent light, route signs, wet/fall checks, and normal-walk tests
  in both directions.
- The C1 13-block rail strip remains intact, but it is too narrow to contain
  this gallery. Reuse C1’s surveyed alignment **with a separately surveyed
  adjacent widening**, retaining the rail flank, clear-span and drainage rules.
  Do not steal pedestrian, highway or utility clearance by assumption.
- Empty Eight needs a new gallery allocation within a dedicated R4 terminal
  release. No existing sealed platform interface, public retail BOH or
  restricted annex may be opened to satisfy this rule.
- B09’s maintenance accommodation, PassageWay and bunker corridors are not
  interchangeable with `PR-SAG-01`; no physical passenger/service crossover is
  permitted without an independent interface release.

## Minimum Minecraft operational design

- Double-track mainline; two independently usable platform faces.
- New normal stops: 48-block platform tangent, seven clear blocks at the
  narrowest public platform/concourse point, 5×5 clear primary access and
  landings, two separately surveyed surface routes.
- Hubs/turnbacks: 96-block tangent and a third/turnback track only when the
  service pattern requires it.
- Preserve C1’s existing constraints: 13-block rail strip, two track centers,
  three-block mast/six-foot zone, two-block cesses, 1:8 maximum / 1:12
  preferred grade, powered rail every 38 flat blocks / 4 climb blocks, and
  62-block minimum station tangent.
- Every road crossing must clear-span the rail reserve with seven blocks above
  rail running surface. No pier, one-block stair, ladder, trapdoor, jump-only
  path or maintenance lane counts as public circulation.
- The 6×6 behind-wall service gallery is mandatory on every passenger segment,
  has a locked service vestibule at each station end, and receives a separate
  surveyed service-exit node at least every 128 route blocks.
- A release needs exact source/rollback operations, ownership and interface
  proof, lights/fluids/fall checks, no entity/container collision, strict parser
  runs, live clearance, bidirectional ride and walk tests, stranded-cart
  recovery, post snapshot and rollback preflight.

## Delivery work packages

**R0 — survey/freeze now.** Fresh immutable snapshot; station table for all
20 stops; public doors, rail/void/structure bounds, target platform band,
headroom, fluids, entities/containers, ownership, and two public routes.
Freeze the Cobalt/Amber opening list before any block change.

**R1 — western trunk.** Build short, disjoint public station and segment
packages around Westlight, Ravensreach, MainStreet and Arrival first; add
Ravencrest/Manager Vale only after frontage survey. This gives real map
exploration without depending on underground claims.

**R2 — C1 East Explorer.** Build the already-designed C1 rail reservation as
a coherent corridor family. Preserve `MS-1`, `DD-1`, `GW-1`, clear spans and
formation, rather than replacing it piecemeal.

**R3 — Data/Gateway surface.** Build Data Campus, Concord and the two Gateway
request stops. Start Green shuttle and Violet surface service.

**R4 — Empty Eight.** Separate operating release for sealed throat, platform
barriers, smoke, ventilation, drainage, controls/power, two public egresses,
accessibility and public/staff/restricted separation. Retail completion is not
train commissioning.

**R5 — mountain branch and B09 retrofit.** Only when Houston and Cheyenne have
public forecourts. Slate ends at Cheyenne’s outer portal; it cannot enter B03.
In a separate physical lane, execute B09-P0–P5 to add its 6×6 behind-wall
service corridor, exits, station separation, controls and closed trials before
opening its own two-station scenic shuttle.

**Deferred:** `PR-RR1`, `PR-C03`, `PR-M03`, PassageWay and portal transfers are
in the register so no area is invisibly omitted, but they are not
opening-network stops. Each lacks the current public route or release evidence
needed to be a destination.

## Integration edits for the parent plan

1. Link this document and JSON from `MASTER-PLAN-EXECUTION-RUNBOOK.md` as the
   proposed Passenger Railway appendix.
2. In `MASTER-PLAN-RAILWAY.md`, state: **no commissioned passenger railway;
   C1/Gateway/Empty Eight are design or reservation evidence, while B09 stays
   maintenance-only until its separate P0–P5 subway conversion is accepted.**
3. Add all 20 stops to the Build Index map as dashed proposed markers. Use a
   distinct legend for existing setouts (`MS-1`, `DD-1`, `GW-1`, `GA-S1`,
   `GA-S2`, `PR-EE1`) and new candidates.
4. Add a Passenger Railway evidence chapter to the Master Plan site after the
   atlas. It must show the topology, present state, phases and stop-register
   link without rendering future lines as built.
5. Create one compiler/release lane per station and inter-station segment; do
   not mutate the whole network in a single package.

## Evidence

- `docs/masterplans/05-combined-zones/site-coordinates.json` for C1, Gateway,
  Empty Eight, Houston and Cheyenne anchors.
- `docs/masterplans/05-combined-zones/source-register.md` for the no-existing-
  railway finding and distinction between rail reservation and operation.
- `docs/redevelopment/2026-07-29-poi-coordinate-directory/poi-coordinate-directory.json`
  for durable destination envelopes.
- Underground Navigation and Bunker Construction reports for sealed, failed,
  restricted and maintenance-only boundaries.

No live Minecraft, RCON, database write or route mutation occurred.
