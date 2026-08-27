# Passenger Railway Programme — whole-world subway build record

**Issued:** 2026-08-22 UTC  
**Status:** `BUILD PROGRAMME — NO PASSENGER SERVICE COMMISSIONED`

## The straight answer

There is **no open passenger railway**. The only proven rail is the 552-cell
B09 mountain guideway, with one restricted maintenance cart on indices `9..25`.
All other rail references are reservations, surveyed design setouts, or sealed
geometry. They are not existing service to be relabelled.

The public network will be built as a subway, and the existing B09 guideway
will be converted to the same subway standard through its own bounded release
lane. B09 stays physically and operationally separated from passengers until
that lane proves its new public interfaces, behind-wall service corridor,
evacuation, controls, and trials.

## Network to build

The coordinate-backed [network design](2026-08-22-passenger-railway-network-design.md)
and [machine stop register](passenger-railway-stop-register-2026-08-22.json)
are the topology source. Every stop remains a candidate or unbuilt setout until
a fresh source survey freezes exact cells and entrances.

| Phase | Service | Purpose | Decision |
| --- | --- | --- | --- |
| 1 | **Cobalt — Heritage** | Ravencrest → Westlight → Ravensgate → Ravensreach Civic → Manager Vale → MainStreet Central → Arrival & Observatory | First western exploration spine, opened a station pair at a time. |
| 2 | **Amber — East Explorer** | MainStreet Central → `MS-1` → `DD-1` → `GW-1` | Build the unbuilt but engineered C1 corridor as one controlled corridor family. |
| 3 | **Green / Violet** | Data and Gateway feeder stops, then Gateway surface service | Extension only after Amber operating proof. |
| 4 | **Violet terminal** | Gateway Expansion Terminal / Empty Eight public gallery | Activate one selected paired terminal group only; retain caps and all sealed/restricted boundaries. |
| 5 | **Slate — Mountain Visitor** | Gateway → Houston Forecourt → Cheyenne Outer Portal | Public forecourts only; never a route into B03 or a secure bunker. |
| Separate retrofit | **B09 Mountain subway shuttle** | Existing lower portal ↔ summit guideway | Convert the actual rail line by `B09-P0`–`P5`; no public transfer to secure spaces. |

Raven Rock, C01 internal routes, PassageWay, SubTropolis, Cheyenne internals,
Ravensgate underground, Empty Eight BOH/restricted annexes, and B03 stay
off-network unless a later public-interface release proves an exact exception.

## Mandatory behind-wall service corridor

Every passenger segment, every B09 conversion segment, station throat,
turnback, curve, and portal contains this continuous arrangement:

```text
passenger guideway / two directional tracks
        || continuous solid separation wall ||
6 clear wide × 6 clear high service corridor
        || controlled service exit / cross-passage ||
public headhouse, approved service node, or accepted evacuation route
```

This 6×6 corridor is a required construction system, not decoration. It must:

1. remain solid-wall-separated from track except for numbered, lockable 3×3
   cross-passages;
2. provide normal-walk, independently lit, dry, supported, mapped continuity;
3. have a controlled service exit at every station, portal and turnback, plus
   a surveyed exit node no more than 128 route blocks apart;
4. include cross-passages at stations, both sides of long curves, material
   transitions, and at most every 64 running blocks;
5. contain a secure recovery niche at each station pair; and
6. never open straight into B09 maintenance areas, BOH/adult/restricted spaces,
   bunkers, PassageWay, sealed stubs, B03, or private C01 circulation.

The public/track route, corridor, controlled exits, and access graph must all
pass before a powered passenger trial. A ladder, rail-bed walk, one-wide stair,
or unlit utility crawl does not substitute.

## Existing rail conversion register

| Existing component | Current evidence state | Required ultimate disposition | Controlled route to it |
| --- | --- | --- | --- |
| **B09, indices 9..560** | `R2 PASSIVE-STRUCTURAL`; only indices `9..25` have `R3` restricted maintenance-cart proof | **Subway-standard scenic shuttle after conversion.** Until then: `RETAIN_MAINTENANCE_ONLY_SEPARATED`. | `B09-P0` source/asset census → `P1` public/service access → `P2` 6×6 corridor, exits and evacuation → `P3` platform separation → `P4` powered controls and closed trials → `P5` two-station limited opening. |

No other minecart rail line is currently proved. C1, Gateway and Empty Eight
receive subway-standard construction rather than a fictional conversion.
If a fresh survey discovers another rail component, classify it `R0 UNKNOWN`,
isolate it, then choose **upgrade**, **retain maintenance-only**, or
**retire-and-replace** from exact evidence. It cannot carry passengers first.

## Build order

1. **RAIL-S0 / B09-P0 — fresh field truth.** One immutable source; exact
   station, corridor, entity, block-entity, fluid, support, protected-feature,
   public-route, and ownership register.
2. **RAIL-S1 — alignment freeze.** Select the first Cobalt station pair and
   B09 seam separately; freeze integer centreline, station boxes, 6×6 corridor,
   cross-passage/service-exit positions, ownership, forward and inverse plans.
3. **RAIL-S2 — access first.** Build five-by-five public routes, two exits,
   headhouses, vertical access, controlled service doors, and first 6×6 segment.
   Only pedestrian access may open at this point.
4. **RAIL-S3 — civil guideway.** Build dry bore/bridge, supports, drainage,
   separation wall, platforms, service niches, lighting, passive rail, and
   cross-passages in reversible packages; run static and normal-walk QA.
5. **RAIL-S4 — control cells.** Add recovery tails, powered launch/stop zones,
   detectors, signals and bounded turnbacks. The service corridor remains
   independently walkable under a power-loss scenario.
6. **RAIL-S5 — closed vehicle trials.** One cart, one direction, one station
   pair. Prove occupied-block stop, cart exit, service-corridor evacuation,
   recovery, reset and rollback.
7. **RAIL-S6 / S7 — opening and publication.** Open the tested pair in both
   directions; extend only after healthy operation. Update map, reports,
   screenshots and website only from the accepted post-state.

## First physical target after survey

Start with the Cobalt western station-pair survey around **Westlight and
Ravensreach**, then freeze the shortest independently useful safe segment. Its
first physical package includes two public headhouses and the 6×6 corridor
before track. Run B09-P0 in parallel so the only existing rail moves into its
conversion lane without falsely treating the maintenance shuttle as public.

## Acceptance rule

Passenger status requires exact post-state proof of two public station
interfaces, two independent exits, directional guideway, the continuous 6×6
behind-wall service corridor and exits, controlled power, occupied-block
handling, cart recovery, normal-walk evacuation, preserved restricted seams,
forward/inverse identity, and updated public maps. Until then it is construction
or restricted maintenance infrastructure.

## Sources

- [Existing-rail inventory](PASSENGER-RAILWAY-INVENTORY-2026-08-22.md)
- [Whole-world network and stop register](2026-08-22-passenger-railway-network-design.md)
- [Subway engineering standard](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md)
- [Ordinary-agent builder packets](PASSENGER-RAILWAY-BUILDER-PACKETS-2026-08-23.md)
- [Master Plan Railway reconciliation](MASTER-PLAN-RAILWAY.md)
- [Builder Execution Runbook](MASTER-PLAN-EXECUTION-RUNBOOK.md)
