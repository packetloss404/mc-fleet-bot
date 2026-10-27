# Passenger railway — current-state inventory

**Survey date:** 2026-08-22 UTC  
**Scope:** read-only evidence inventory for the future passenger railway.  
**Decision:** there is **no passenger railway or public station open today**.
The only running vehicle evidence is a short, restricted B09 maintenance
shuttle. This inventory is the factual base for the separate system design;
it is not a construction authorization.

## What exists now

| Asset | Location / extent | Current use | Evidence-backed status |
| --- | --- | --- | --- |
| B09 rail | Combined Zones, indices `9..560`; lower end around `(2048,130,-748)`, summit approach around `(2048,298,-824)` | Passive rail formation | One continuous, unbranched **552-cell** rail component. It has support/headroom QA but is not a public guideway. |
| B09 shuttle | B09 indices `9..25`; terminal bay near `(2072,131,-748)` | Restricted maintenance inspection shuttle | One authenticated minecart, bounded run only, no passenger/rescue/full-line claim. |
| B09 shells | Lower portal `(2048,130,-748)`, east throat `(2288,130,-748)`, summit `(2048,304,-828)` | Closed infrastructure shells | The lower and summit shells exist, but their station cell sets, platforms, accessible paths, passing/turnback and public egress are not accepted. |
| C1 rail reservation | `x=430..718`, `z=50..58`, `y=68..102` | Future formation/reservation | 2,601 planning cells / 578 two-cell rail collection cells; default-closed, unbuilt, with loading and ownership constraints. |
| Grand Avenue subway concept | GA junction `(1780,68,-250)`; dry portal candidate `(1785,64,-215)` | Surveyed proposal | A dry candidate and profile check exist only. GA-S1/GA-S2 side platforms and the passenger line are not built. |
| Empty Eight future stubs | Empty Eight | Sealed reservation | Eight closed stubs. They are not tracks, platforms, or implied connections. |

The B09 rail is the only confirmed continuous rail component. “Continuous”
means its passive block topology, not a functioning transport system.

## Disposition of every existing rail line

The read-only catalog and accepted release ledger identify **one existing rail
line**: B09. C1, Grand Avenue/C4, and Empty Eight are reservations or sealed
future geometry, so they are not rail lines and cannot receive a service
disposition. Decorative guard rails and the MainStreet hangar-to-heliport
*trail* are not minecart guideways.

| Existing line | Exact evidence | Mandatory disposition | Why it is not upgraded now | Conditions that would permit reconsideration |
| --- | --- | --- | --- | --- |
| B09 lower portal → east face → summit return, indices `9..560` | R12Q confirms a 552-cell unbranched passive component with support/headroom QA; R12R confirms only one authenticated cart over `9..25`. Shell/interface anchors are `(2048,130,-748)`, `(2288,130,-748)`, and `(2048,304,-828)`. | **RETAIN_MAINTENANCE_ONLY_SEPARATED** | No public station cells, platform/barrier design, accessible boarding/egress, rescue path, drainage/weather treatment, passing/turnback, controls/signals, or full-line vehicle proof; interfaces to B08/B10/Z11 remain closed. | A new separate public branch or a source-proven B09 upgrade program must first freeze all of those exact systems, keep the maintenance lane physically/access-controlled apart, and pass bidirectional passenger/recovery commissioning. |

`UPGRADE_TO_SUBWAY_STANDARD` is assigned to **no existing line**. The future
public trunk will be new construction rather than a paper relabeling of B09.
`RETIRE_REPLACE` is assigned to **no existing line**: no evidence shows a
second built minecart guideway to remove. If a fresh survey discovers uncataloged
track, it is automatically `RETIRED_PENDING_SURVEY` until the team can prove
its geometry, owner, state, and safe isolation.

## Things that cannot be called passenger rail

- B09's two short-end shells are not stations: no exact platform, barrier,
  accessible route, rescue route, drainage, control, or public boundary is
  accepted.
- The B09 minecart has only a maintenance authorization for indices `9..25`.
  It must not be repurposed, extended, or used to carry visitors.
- C1 is an empty future reservation. Its rail formation intersects the C01
  owner-tunnel loading/separation reservation; the 2,601 planning cells are
  neither construction cells nor an operation authorization.
- Grand Avenue's exact centreline/profile and two 48-block side-platform
  concept are planning evidence. The C4 concealed subway geometry is expressly
  sealed; it is not a usable tunnel.
- Empty Eight stubs remain sealed. Their nearby retail/back-of-house and
  restricted venue spaces do not create a station entrance.

## Network model to design next

Use a metro-style system with one **public trunk** and separate restricted
maintenance/secure infrastructure. Do not splice the public trunk into B09
until a fresh survey and a purpose-built transfer package prove an exact seam.

### Proposed public stations — candidates, not build coordinates

| ID | Candidate interchange / serving area | Candidate anchor | Why it belongs in the system | Required proof before design freeze |
| --- | --- | --- | --- | --- |
| P01 Westlight | Westlight District + stadium/theatre | around `(-360, ~68, -500)` | Serves the western public destination cluster and existing Approach Road. | Fresh terrain, event egress, road interface, and a public entrance outside stadium/theatre circulation. |
| P02 Ravensgate | Ravensgate / Approach Road transfer | around `(-148, ~68, -500)` | Natural transfer between the 7-wide approach road and the historic district. | Exact road/right-of-way and water/Long Water clearance; not inside the stoa or tempietto envelopes. |
| P03 Ravensreach | Market/Moot civic district | around `(-55, ~68, -340)` | Town civic stop, close to the Market Hall; avoids relying on the library's legacy core. | Fresh pedestrian survey, room/utility clearance, and a new 5x5 public approach. |
| P04 MainStreet Gateway | Visitor / MainStreet public edge | around `(0, ~64, 170)` | The public gateway for the town core, detached from private C01 and observatory routes. | Exact current public-route, parking, protected-envelope and grade survey. |
| P05 C1 / East Interchange | Future C1 and Data District feeder | **no station anchor selected** | C1 is the only recorded eastward rail reservation; eventual transfer could serve the Data District. | Resolve C01 loading/separation, hydrology, ownership, exact station cells and C1 treatment geometry first. |
| P06 Combined Zones Gateway | Grand Avenue / future subway portal | `(1785,64,-215)` is a portal candidate, **not a station** | Closest surveyed dry point to the Grand Avenue junction; gives a later public gateway without opening Empty Eight. | New source survey; exact subway box, public egress, road/rail interface, utility and drainage design. |
| P07 Mountain Summit | Separate scenic/visitor terminal near B09 summit | **no public anchor selected** | A future destination only after the mountain system is independently made public-safe. | Separate B09 station/egress/rescue/weather/drainage design; do not use the closed summit shell as a station. |

`~` values are planning elevations only. No candidate is a copy-ready teleport,
construction datum, or cell ownership claim.

### Service pattern

1. Build the **West–East trunk** first: P01 → P02 → P03 → P04 → P05 → P06.
2. Keep P07 as a later branch/visitor terminal, not a prerequisite for trunk
   service.
3. Keep B09 as a restricted infrastructure branch until it has a separately
   accepted station, evacuation, control, rescue, and operational package.
4. Treat Raven Rock, Cheyenne internals, C01 private/owner areas, Empty Eight
   BOH/adult areas, B03, and PassageWay secure/service corridors as off-network
   unless a later station package explicitly opens a public interface.

## Constraints that drive the design

| Constraint | Consequence for the railway design |
| --- | --- |
| Current circulation audit has failed C01 portal→L1, MainStreet portal→warehouse, and Observatory gallery→hub links; H11 and the Ravensreach Library have legacy one-tread cores. | Do not use any of these as passenger access. Station entries must meet the Master Plan 5x5 public primary-route standard, with proven bidirectional normal walking. |
| B09 7,800-cell accommodation was a planning reservation. | Preserve its exact retained interfaces; do not widen/branch it by inference. |
| C1 rail formation has a C01 owner-tunnel/loading interaction and zero built road surface. | The first C1 passenger package is an interface/terrain design package, not rail placement. |
| R11 residual C1 screen found fluid, unstable contact, utility, and roaming-entity hold areas. | Pick exact disjoint station/approach scopes after a new snapshot; do not route a generic line through a broad corridor. |
| Westlight, Ravensgate, and the Approach Road have cataloged fabric but current conditions are not verified. | Start their portion with a field survey and entrance-site selection, not a station build. |
| Eight Empty Eight stubs are deliberately sealed. | Do not depict, operate, or advertise them as a subway extension. |

## Required design gates

1. **Railway R0 — fresh survey:** immutable world capture plus terrain,
   protected-feature, route, fluid, container/block-entity, entity, ownership,
   and public-approach survey for P01–P06.
2. **Railway R1 — alignment freeze:** exact centreline, grades, cross-sections,
   station boxes, switch/turnback locations, interface ownership, and a map
   binding the surveyed snapshot. No passenger claim yet.
3. **Railway R2 — civil/station shells:** independent reversible packages for
   foundations, drainage/isolation, tunnel/bridge, then sealed station shells.
4. **Railway R3 — guideway:** supported rail, headroom, platforms, 5x5 public
   access routes, barriers and wayfinding; preserve all restricted seams.
5. **Railway R4 — controls and trials:** power, signals, vehicles, recovery,
   fire/rescue paths, and forward/return test journeys.
6. **Railway R5 — passenger commission:** one immutable post-state must prove
   both directions, each open station, public egress, recovery, and rollback.

Each physical package follows the guarded-release safety kernel in
[the execution runbook](MASTER-PLAN-EXECUTION-RUNBOOK.md): fresh source,
exact guarded forward/reverse operations, protected-state clearance,
strict-noop checks, journaled run, fresh post, route QA, and rollback
preflight.

## Exact source records used

- [Master Plan Railway](MASTER-PLAN-RAILWAY.md), sections 5–7 — current
  cross-town nonclaim, staged delivery order, and execution boundaries.
- [Combined Zones current state](05-combined-zones/CURRENT-STATE.md), R12Q/R12R
  — 552-cell passive rail and bounded maintenance-shuttle acceptance.
- `docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json`
  — B09 geometry, shell anchors and exact technical nonclaims.
- `docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.md`
  — C1 rail-formation bounds and C01 loading/ownership conflict.
- `docs/masterplans/05-combined-zones/phase1-r11g-c1-residual-scope-blocker.md`
  — C1 rail is `EMPTY_RESERVE_FIRST`, with no track material package.
- `docs/masterplans/05-combined-zones/resiting-candidate-analysis.json` and
  `map-qa.json` — Grand Avenue portal candidate and engineering-profile facts.
- `data/world-map.db` read-only feature catalog — current built-area extents
  used for candidate stop placement; it does not prove station land ownership.

## Recommended central-plan edits

1. Add this inventory as the authoritative input for Master Plan section 5,
   replacing its generic proposed-service paragraph with the P01–P07 candidate
   table and the explicit restricted/public branch separation.
2. In the builder runbook, create a `RAILWAY-R0` card that owns the P01–P06
   fresh survey and records a route/ownership map before any rail compiler is
   written.
3. In the website Master Plan evidence chapter, link this document and label
   B09 “restricted maintenance rail — not passenger service.”
4. Add P01–P07 candidate labels to the Build Index map only after the legend
   distinguishes `candidate` from `built` and `restricted`.
