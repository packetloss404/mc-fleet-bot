# Passenger Railway — builder packets for ordinary agents

**Purpose:** a deterministic handoff for agents that do not have a frontier
planner. Take one packet only. Follow its inputs, make its named artifact, and
stop at its stop conditions. Do not “helpfully” combine packets, extend a line,
or guess missing cells.

## One-minute briefing

- **Current passenger service:** none.
- **Actual existing rail:** B09 only, a 552-cell passive mountain guideway;
  one maintenance cart is accepted only on indices `9..25`.
- **First passenger network:** Cobalt western spine, then Amber East Explorer.
- **Mandatory shape:** all passenger track and every B09 conversion segment
  requires a continuous, walled **6 clear × 6 clear service corridor**, with
  cross-passages no farther than 64 blocks and controlled service exits no
  farther than 128 blocks.
- **Never use as a shortcut:** B09 maintenance space, B03, PassageWay, C01
  private systems, bunkers, Empty Eight BOH/restricted annexes, or sealed stubs.

The project decision and geometry targets are in the
[Passenger Railway Programme](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md). This
file tells a builder exactly how to pick up work without needing to rediscover
that programme.

## Rules every builder must obey

1. Work **one packet** and one named source snapshot at a time.
2. Read the packet’s required inputs before creating files or changing blocks.
3. A planning coordinate or old accepted snapshot is **not** a current source
   guard. Capture a fresh snapshot immediately before compiling any mutation.
4. Do not place passenger rail before the packet has accepted public access,
   service access, and the associated 6×6 corridor geometry.
5. A failed fluid, ownership, container/block-entity, entity, gravity, route,
   support, or boundary check stops only the affected packet. Record it; do not
   broaden the package to solve it.
6. For every physical release create forward and inverse operation files, run
   exact preflight and `scripts/rcon_runner.py --strict-noop --report <json>`,
   then capture post-state and route QA. Never hand-run loose RCON edits.

## Shared output format

Every packet ends with this exact handoff, even if it stops:

```text
Packet:
Status: PASS | HOLD | FAIL
Fresh source snapshot + SHA:
Exact bounds / route indices / owner:
Public, service, and restricted interfaces:
Inputs read:
Artifacts written:
Checks run + result:
What changed in the world: none | exact release identity
Stop condition or next packet:
```

## Packet RAIL-S0 / B09-P0 — survey the existing rail

**Goal:** produce exact evidence for the only existing rail before designing a
single conversion block. This is read-only.

**Current seed snapshot:**
`data/worldsnap-b09-survey-20260822T225000Z/region`. It was captured around
`(2048, -748)` on 2026-08-22. It is survey evidence, not a reusable future
write source. If the packet is resumed later, capture a new snapshot first:

```bash
python3 scripts/world_snapshot.py \
  --near 2048,-748 --radius 640 \
  --dest data/worldsnap-b09-survey-<UTC-TIMESTAMP>
```

**Read in this order:**

1. `PASSENGER-RAILWAY-INVENTORY-2026-08-22.md`
2. `PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md`, sections 4.1, 4.3,
   5.3, and 8
3. `05-combined-zones/CURRENT-STATE.md`, R12Q/R12R entries
4. `05-combined-zones/phase1-d05-future-mountain-alternatives.json`
5. `05-combined-zones/phase1-connector-geometry.json`

**Inspect and record:**

- all rail cells and shapes across B09 indices `9..560`;
- lower shell `(2048,130,-748)`, east throat `(2288,130,-748)`, and summit
  shell `(2048,304,-828)`;
- the existing cart and any other entity/container/block entity in the rail,
  station-shell, candidate-service-corridor, and halo volumes;
- each support/headroom state, fluid, gravity risk, cap/gate, and existing
  maintenance/restricted interface;
- at least two candidate 6×6 service-corridor offsets for every route family;
- controlled exit candidates at both ends, every station/portal/turnback, and
  no farther than 128 route blocks apart.

**Write:**
`data/world-review/b09-p0-survey-<UTC-TIMESTAMP>/b09-p0-survey.json` and a
matching Markdown summary. The JSON must contain the source path, source hash,
ordered rail cells, candidate corridors, all rejected offsets and reason,
entity/block-entity census, owner/interface list, and a `readyForS1` boolean.

**Pass only if:** an exact continuous B09 component is found, at least one
continuous 6×6 offset is proven surveyable, every candidate exit is classified,
and no unknown entity/container/protected interface remains in the chosen
candidate volume.

**Stop/HOLD if:** the current cart cannot be isolated, a corridor would break
into a restricted system, a fluid/gravity hazard has no bounded solution, or
the snapshot cannot prove a candidate volume. Do not edit B09.

**Next packet:** `RAIL-S1/B09-P1` only after `readyForS1: true`.

## Packet RAIL-S1 / B09-P1 — freeze one conversion segment

**Goal:** turn the successful survey into one exact, reversible construction
slice. Start with the lower shell → first controlled service-exit segment; do
not attempt all 552 cells at once.

**Required inputs:** the PASS B09-P0 report; a new fresh source snapshot;
the engineering standard; `MASTER-PLAN-EXECUTION-RUNBOOK.md`; and all current
owner/interface contracts that touch the selected cells.

**Decide exactly:** rail index start/end, passenger bore walls, the full 6×6
corridor cross-section, cross-passage locations, exit node, service door
state, public/restricted boundary, retained maintenance-cart isolation, and
the exact forward/inverse cell list.

**Write:**
`docs/masterplans/05-combined-zones/b09-p1-<segment-id>-release.md`, forward
and rollback files under `data/buildops/`, source/projected-rollback preflights,
and an interface manifest. The release document must name every selected cell
owner and every non-owned boundary it preserves.

**Pass only if:** all cells have exact source states, the corridor is continuous
and wall-separated, all routes are normal-walk, and the maintenance shuttle is
still isolated.

**Stop/HOLD if:** any cell is owned by another scope without a contract; a
cross-passage would enter a secure/BOH system; or the required public/service
exit cannot be constructed inside the selected package.

## Packet COBALT-S0 — choose the first new passenger station pair

**Goal:** select one safe Westlight ↔ Ravensreach segment, not an aspirational
whole-western loop.

**Read:** the [20-stop design](2026-08-22-passenger-railway-network-design.md),
the [stop register](passenger-railway-stop-register-2026-08-22.json),
`MASTER-PLAN-EXECUTION-RUNBOOK.md`, and the current MP06/MP10/MP12/MP13 plan
records.

**Fresh survey envelope:** Westlight candidate `x=-443..-260, z=-640..-445`;
Ravensreach candidate `x=-147..-40, z=-451..-323`. These are **survey boxes**,
not permission to fill the boxes or final platform coordinates.

**Write:**
`data/world-review/cobalt-s0-westlight-ravensreach-<UTC-TIMESTAMP>/` with a
station-entry table, two public street-to-platform candidates per station,
two service exits, topography/water/ownership findings, and 2–3 disjoint
centreline options. Mark one option `preferred` only when every cell and
interface is known.

**Pass only if:** both stations have two independently walkable public routes,
a route exists for a paired 6×6 corridor, and no route borrows the Approach
Road, venue interior, Library core, or civic room as an unclassified shortcut.

**Next packet:** `COBALT-S1` freezes only the chosen station pair and its
first inter-station segment. It does not build the rest of Cobalt.

## Packet RAIL-S2 — access before track

**Goal:** build and prove public/service access before rail.

**Required geometry:** five-clear-wide × five-clear-high public primary route;
1:2 stairs with five-deep landings; two independent exits; tested no-jump
return option; controlled service door into the 6×6 corridor. A public route
cannot cross a rail bed or borrow a service corridor.

**Acceptance:** two-way normal-walk graph, cross-section/lighting/door/fluid
table, source/post screenshots, and exact rollback preflight. Passenger track,
power, carts and platform operation remain forbidden in this packet.

## Packet RAIL-S3 through RAIL-S7 — repeatable release order

| Packet | Build exactly | Do not claim until accepted |
| --- | --- | --- |
| `S3` | Dry bore, support, drainage, full wall, 6×6 corridor, cross-passages, lights, passive rail | vehicle service or public opening |
| `S4` | Platform edge, recovery tail, detector/power cells, signals, control niche | automatic service or safe occupancy |
| `S5` | One-cart closed trial, one direction then return, evacuation and recovery tests | passenger use |
| `S6` | Open exactly the tested station pair in both directions | whole line operation |
| `S7` | Evidence import, maps, screenshots, website/report updates | an untested extension |

## Copy-ready delegation prompt

```text
Take packet <PACKET ID> from
docs/masterplans/PASSENGER-RAILWAY-BUILDER-PACKETS-2026-08-23.md.
Work only that packet. Read every required input in its listed order.
Do not widen the scope, infer public access, or mutate Minecraft before the
packet says to compile an exact guarded release. Return the Shared output format
verbatim, including a HOLD with exact evidence if a stop condition occurs.
```

## Related sources

- [Master Programme](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md)
- [Engineering standard](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md)
- [Existing rail inventory](PASSENGER-RAILWAY-INVENTORY-2026-08-22.md)
- [Network and station design](2026-08-22-passenger-railway-network-design.md)
- [Shared execution runbook](MASTER-PLAN-EXECUTION-RUNBOOK.md)
