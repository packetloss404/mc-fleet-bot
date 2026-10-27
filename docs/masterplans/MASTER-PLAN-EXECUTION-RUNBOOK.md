# Master Plan — Builder Execution Runbook

Status: **CURRENT EXECUTION BASELINE — READ BEFORE ANY BUILD AGENT IS ASSIGNED**

**Whole-plan completion gate:** the [Master Plan Completion
Register](MASTER-PLAN-COMPLETION-REGISTER-2026-08-26.md) controls whether a
parent programme remains unfinished. This runbook's historical package cards
remain useful release provenance, but a completed small package never removes
an unbuilt programme from that register.

This is the operational companion to [Master Plan Railway](MASTER-PLAN-RAILWAY.md).
It converts the evidence record into a single delegation-ready build sequence. It
does **not** authorize broad world edits, overwrite individual release contracts,
or turn a catalog record into proof of a live route.

## How to use this runbook

Every build agent works one scope card at a time and returns the stated evidence.
Agents may research, survey, render maps, or compile a proposed package without
further authority. They may mutate the world only when the current card reaches
an exact guarded release and its governing masterplan/contract allows it.

Before any physical package:

1. Capture a fresh immutable source snapshot; never reuse a historical source as
   a live source guard.
2. Bind exact cells, owner, interfaces, entities, block entities, fluid/gravity
   state, forward operation, inverse operation, and rollback order.
3. Run source/projected-rollback preflight and strict-noop parser checks.
4. Use `scripts/rcon_runner.py --strict-noop --report <json>` for guarded
   physical release. Never hand-start a second fleet process.
5. Capture a post snapshot and independent QA proving targets, halo,
   predecessor preservation, retained interfaces, and inverse readiness.
6. Update the area current-state record, map/catalog/report assets, and this
   card only after acceptance evidence exists.

Audit findings are controlling design inputs, not appendix material. When a
verified route, stair, room, boundary, or defect finding changes a dependency,
classification, proposed design, or stop condition, update this runbook and the
affected `MASTERPLAN.md`/`CURRENT-STATE.md` in the same documentation round.
Each audit must name its proposed documentation targets and exact evidence path.

Stop if a target overlaps another owner, a wet/gravity/mechanism interface lacks
exact evidence, a route is not proven traversable, or a change would broaden a
bounded claim into public/operational commissioning.

## Circulation baseline — 22 August 2026 correction

Before any package creates or changes a player route, run a fresh
`CIRC-QA-CORE-01` census and classify it **public**, **staff**, **restricted**,
**venue**, or **vehicle**. A primary public concourse, exit, or common-room
route requires a five-clear-wide by five-clear-high envelope, 1 rise per 2 run,
and five-deep level landings at both ends and every turn. A local public
connector may be three-clear-wide by three-clear-high only where it feeds that
primary route, with level 3×3 landings. Staff routes require 3×3 clear zones at
doors; high-volume venue stairs require 7×6 with 7×7 landings and a nearby
lift analogue. One-wide stairs, ladders, trapdoors, alternating treads, jumps,
and unsecured thresholds are never primary circulation.

The census must emit a walkable-cell graph; station-by-station width, headroom,
rise/run, landing, door, light, fluid, and ownership table; access class; and
bidirectional no-jump evidence. Prove fall containment, door state, light
cadence, and preserved interfaces from the same fresh source snapshot. A
one-cell pathfinding pass or two-block-headroom centerline alone proves neither
public, staff, owner, nor restricted circulation quality.

For Empty Eight, work in this order: widen the PF08 west/east stairs; provide
back-of-house staff orientation/map-room coverage; then, only as a separately
sealed package, build one headhouse-egress adapter. Rail beds and
hazard/service interfaces are never pedestrian shortcuts.

The next cross-area correction packages are `CIRC-C01-PORTAL-01`,
`CIRC-MSA-PORTAL-01`, and `CIRC-OBS-GALLERY-01`; each repairs a currently
failed bidirectional route and must remain unavailable until post-state route
and cross-section QA pass. For legacy districts, address
`CIRC-RRCH-LIB-01`, `CIRC-MSA-H11-01`, `CIRC-RR-Z5-01`, `CIRC-RR-C2-01`,
`CIRC-WL-ARRIVAL-01`, and `CIRC-RG-SURFACE-01` in that sequence. Historic
reachability passes and catalog entrance anchors never prove public egress.

## Shared world sequence

| Order | Workstream | Current state | Required outcome |
|---|---|---|---|
| X0 | Evidence freeze | Ready read-only | Fresh immutable census and catalog/media crosswalk. |
| X1 | Ownership/interface graph | Ready read-only | Exact owner and directional interface closure. |
| X2 | Cross-town alignment survey | Not started | Terrain, route, structure, water, grade, and clearance evidence. |
| X3 | Local access repairs | Dependency-gated | One bounded route/vertical-circulation package with reversible QA. |
| X4 | District condition packages | Dependency-gated | Disjoint maintenance/fit-out packages by named owner. |
| X5 | Interdistrict pedestrian links | Dependency-gated | Continuous proven foot-route with access classification. |
| X6 | Railway civil/terminal interfaces | Dependency-gated | Exact alignment, stations, utilities, drainage, service seams. |
| X7 | Passenger operations | Closed | Commissioning proof; never inferred from passive rail or shuttle. |
| X8 | Public system publication | After acceptance | Maps, POI, navigation, screenshots, report QA, website sync. |
| X9 | Ongoing stewardship | Continuous | Fresh survey and scoped package for every later change. |

## Passenger subway programme

The whole-world execution sequence is the
[Passenger Railway Programme](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md), backed
by its [inventory](PASSENGER-RAILWAY-INVENTORY-2026-08-22.md),
[network/stop register](2026-08-22-passenger-railway-network-design.md), and
[engineering standard](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md).
There is no passenger service now: B09 is the single current rail component
and remains restricted maintenance infrastructure until its conversion accepts.

Every passenger alignment and B09 conversion segment requires a continuous,
solid-wall-separated **6 clear × 6 clear service corridor** beside the
guideway. It has controlled exits at every station, portal and turnback and
surveyed exit nodes no farther than 128 running blocks apart, with cross-
passages at most every 64 blocks. Build it and pass normal-walk QA before
powered passenger trials. It cannot open into restricted or back-of-house
space, sealed stubs, B03, PassageWay, a bunker, or private C01 circulation.

The current first rail card is `RAIL-S0`: a fresh Cobalt/Amber/B09 source
survey and station-corridor register. `RAIL-S1` freezes an exact station pair
and 6×6 corridor. No passenger track precedes `RAIL-S2` public and service
access evidence.

## Scope cards

### MP01 — Cheyenne Mountain Complex

- **Built proof:** R10A/G/H secure gallery/contact sequence and R12A/M/O
  bounded passive internal circulation.
- **Next task:** survey uncommissioned B03/Z10 indices and every secure/exterior
  seam; produce an occupancy, route, owner, entity, and rollback census.
- **Acceptance:** fresh-source exact package, public/secure classification, and
  independent QA. No whole-complex claim without room-by-room evidence.
- **Stop:** MP01 design coordinates are not current-world setout; MP05 controls.

### MP02 — SubTropolis

- **Built proof:** R03/R04 deep tunnel and R07C service-tunnel cover.
- **Next task:** map actual occupancy and route envelope before tenant/lobby work.
- **Acceptance:** separate public lobby, C3, utilities, climate, vehicle packages.
- **Stop:** tunnel shells do not prove the tenant grid or public city.

### MP03 — Houston Tunnel System

- **Built proof:** bounded B07 lower lobby/stairs and upper inspection component.
- **Next task:** resolve wet lower interface and unsupported-gravity boundary.
- **Acceptance:** continuous classified route only after fluid, gravity, lift,
  smoke, power, drainage, exterior, and accessibility evidence.
- **Stop:** R09K is inspection circulation, not public Houston access.

### MP04 — Combined Complex architecture

- **Built proof:** normalized program informs MP05 only.
- **Next task:** translate each physical cell into MP05 or a later exact successor.
- **Acceptance:** none by itself; MP04 never releases blocks.
- **Stop:** superseded ravine/skybridge/portal variants cannot be revived.

### MP05 — Combined Zones / Empty Eight

- **Built proof:** bounded R07–R12 MVP, R08AL public retail/BOH, R08AM lower annex.
- **Next task:** select one substantial disjoint package from a fresh source;
  prefer real public-realm completion or a hold resolution over cosmetic work.
- **Acceptance:** guarded forward/inverse, post snapshot, independent QA, retained
  future-rail/utility/drainage/fire-service proof.
- **Stop:** no whole corridor, passenger rail, hydraulic, public transport, or
  future-stub commissioning by implication.

### MP06 — Western Approach Road

- **Built proof:** cataloged Ravensgate-to-Westlight road geometry.
- **Next task:** audit drive/walk clearance, stairs, shoulders, drainage, lights,
  and both endpoints.
- **Acceptance:** exact endpoint ownership and narrow maintenance package.
- **Stop:** never repair a broad road box or overwrite shared endpoint cells.

### MP07 — MainStreet America

- **Built proof:** accepted internal connectivity and 630 complete durable records.
- **Next task:** fresh condition/obstruction survey and exact external seam register.
- **Acceptance:** protected-envelope, interior-route, container, and mountain
  interface preservation.
- **Stop:** historic alternatives are not edit authority.

### MP08 — Raven Rock / Site R

- **Catalog/historical proof only:** 81 durable features and dry T2b evidence;
  no current accepted Raven Rock complex release remains after S1 rollback and
  T2B supersession.
- **Next task:** survey wet-edge fluid/gravity topology and route truth first.
- **Acceptance:** same-snapshot fluid topology, containment, inverse, and route QA.
- **Stop:** catalog completion and historical T2b evidence do not authorize any
  Raven Rock complex, wet-tunnel, or public-route claim.

### MP09 — Ravensgate

- **Built proof:** frozen district with four buildings and seven rooms.
- **Next task:** re-census condition and Approach Road endpoint; close ownership.
- **Acceptance:** default-deny shared-cell closure plus bounded public realm work.
- **Stop:** Pavilion East schedules are reservations, not release scope.

### MP10 — Ravensreach

- **Built proof:** 63 durable features and accepted MainStreet route.
- **Next task:** prioritize `CIVIC-RRCH-MOOT-UPPER-01`/`RRCH-MOOT-01`: repair
  the Moot upper stack's empty Clerks Hall, closed unsupported Attic Store, and
  under-detailed rooms. The `CIVIC-RRCH-MOOT-UPPER-SPINE` prerequisite is
  accepted: its 7×6 vertical spine, 1:2 flights, and 7-deep landings now pass
  bidirectional walk QA. Next verify room floors/routes and lights; keep bot
  configuration separate from physical maintenance.
- **Acceptance:** supported room floors, classified public/service access,
  current route QA, and an independent configuration decision record.
- **Stop:** a physical route PASS does not activate a bot configuration.

### MP11 — Town Expansion R1

- **Built proof:** accepted 3,665,580-cell release with routes, media, records,
  and reviewed interfaces.
- **Next task:** current-drift survey before repair.
- **Acceptance:** new disjoint exact package with fresh interfaces/source state.
- **Stop:** natural copper policy is rollback-only, never forward authority.

### MP12 — Westlight District

- **Built proof:** 59 durable records and ten multi-floor structures with stairs.
- **Next task:** reconcile current condition/Town Expansion interfaces; audit
  waterfront and transport operations.
- **Acceptance:** enclosure, water, route, and container preservation.
- **Stop:** catalog entrances/scan envelopes are not safe teleport/work claims.

**Current correction:** the R08AM census proves Westlight District/Venue's
material program, not its route/egress quality. Start with
`CIRC-WL-ARRIVAL-01` and `CIRC-WL-ARRIVAL-ROAD-01` fresh surveys; do not issue
a repair mutation until those route/landing results are exact.

### MP13 — Westlight Venue

- **Built proof:** bowl/theatre/club stack, 26 durable records, focal display.
- **Next task:** read-only circulation, modes, lighting, accessibility, and event
  operations survey.
- **Acceptance:** separate physical/operational packages with interface closure.
- **Stop:** historic completion is not current event-operation approval.

## Required builder handoff

Every assigned agent ends with:

```text
Scope card / package:
Source snapshot + SHA:
Exact bounds and owner:
Public/staff/restricted classification:
Dependencies and retained interfaces:
Forward/inverse/preflight/QA paths and results:
What is built, what remains unproven:
Next safe action:
```

This is the shared build queue. Each detailed area `MASTERPLAN.md` remains
controlling for its evidence and hard boundaries.
