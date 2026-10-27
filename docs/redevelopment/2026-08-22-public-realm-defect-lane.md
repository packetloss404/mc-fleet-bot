# Public-realm defect lane — 2026-08-22

Status: **fresh-snapshot survey and repair design; no physical mutation in this lane**

## What was actually checked

The review used `data/worldsnap-r08am-post-20260822T161818Z/region`, a
52-region complete saved-world snapshot with SHA-256
`30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`.
`scripts/audit_world_interiors.mjs` produced
`data/world-review/public-realm-defect-census-r08am-20260822.json`. It is a
block census, not a live egress certificate.

The repeatable normal-walk probes and their nonclaims are recorded in
`data/world-review/public-realm-defect-probes-r08am-20260822.json`.

| Area | Result | What it does and does not prove |
|---|---|---|
| Westlight District | 14 structures, 10 multi-level; 0 ladders, 0 empty and 0 under-detailed cataloged rooms | The interiors are materially present. Arrival, street, waterfront and venue-route widths, doors, landings, and egress remain unmeasured. |
| Westlight Venue | 3 structures; 0 ladders, 0 empty and 0 under-detailed cataloged rooms | Bowl/theatre/club program is materially present. It is not a current event-mode or emergency-route acceptance. |
| Western Approach Road | no interior structures by design | The census cannot inspect road grade, bridge geometry, shoulders, crossings, drainage, lighting, or the pedestrian edge. |
| MainStreet H11 | all cataloged rooms present; historical one-tread stair core remains | A fresh normal-walk probe still reaches the listed levels, but reachability does not make a one-tread core public circulation. |
| Ravensreach library | fitted rooms and 0 ladders; historical one-tread spiral remains | A fresh normal-walk probe reaches all six library levels, but does not establish a two-wide stair or real landings. |
| Ravensreach Moot Hall | 2 empty, 2 under-detailed cataloged rooms; 8 cave-air cells in the enclosing structure | This is a real program/legibility defect, not an assumed one. Clerks Hall is fully walkable; Attic Store has zero standable interior cells in its registered bounds. |

Read-only probes against the same snapshot confirm the limited movement facts:

- H11 lower room (`30,65,-148`) reaches `30,70,-148`, `30,75,-148`, and
  `30,80,-148`.
- Library entrance (`-128,68,-424`) reaches its cataloged floors at Y 47, 54,
  61, 68, 76 and 84.
- Clerks Hall has `237/237` reachable standable interior cells.
- Attic Store has `0/0` standable interior cells. This is an absence of usable
  floor/support, not evidence that the room is merely locked.

## Confirmed defects and builder packages

### CIRC-MSA-H11-01 — Midtown primary-stair correction

The existing core is a one-tread turning stair at X `34..36`, Z `-144..-142`,
between Y 65 and 79. Do not re-label it as public/common-area circulation.
On a fresh source, survey X `32..38`, Y `64..81`, Z `-146..-140`, including
every container, door, ceiling, attached-garage interface and room threshold.
Use either a two-clear-wide return stair with three-clear headroom and 3×3
turn landings, or a different compliant primary route. Retain the old core
only as signed private/service circulation after the replacement passes both
directions. Do not make a wide stair by deleting furnishings or exterior
walls without a separate owner/interface decision.

### CIRC-RRCH-LIB-01 — civic-library primary-stair correction

The current spiral occupies X `-118..-116`, Z `-443..-441`, through Y 46..83.
It is a one-tread lift from the ladder-retirement release, despite passing
normal reachability. Survey X `-121..-113`, Y `45..85`, Z `-446..-438`.
Install a two-clear-wide switchback or widened perimeter primary stair with
three-clear headroom, 3×3 landing rectangles at every turn and each 6–8 rise
run, fall-edge cues, level signs and a normal-walk return path. Preserve books,
containers, room walls and the library/Guild/Ravensgate ownership boundary.

### RRCH-MOOT-01 — stack completion and wayfinding

This is a contained program-repair package, not a blanket interior refit.

| Room | Registered bounds | Fresh finding | Required repair result |
|---|---|---|---|
| Committee Room | X `-99..-71`, Y `74..77`, Z `-366..-342` | only four qualifying details where eleven are required | A legible committee table, seats, wall storage/display and light cadence while retaining every existing door/stair route. |
| Clerks Hall | X `-99..-71`, Y `79..82`, Z `-366..-342` | 0 qualifying details; all `237/237` standable cells are connected | A staffed-records / clerks workspace, route-clear central aisle, identifiable access door, level directory and normal-walk return. |
| Meeting Room | X `-99..-71`, Y `84..86`, Z `-366..-342` | nine lights but no usable room programme | A meeting table, seating, display/notice wall, route-clear aisle and wayfinding to the common stair. |
| Attic Store | X `-99..-71`, Y `88..93`, Z `-366..-342` | 0 qualifying details and `0/0` standable interior cells | First establish an actual supported, enclosed, lit service floor and one compliant service approach. It stays closed until a normal-walk survey proves that approach; it is not a public room by default. |

The current source does **not** authorize guessed fixture coordinates. Before
release: capture a fresh same-moment source; compare each room with the nested
Town Hall/Moot owners; census all block entities plus a one-cell route halo;
select only exact air or exact replace states; compile a forward operation and
exact inverse; run strict forward/rollback parser checks and source preflight;
then do a same-moment entity screen. Post-state QA must prove the retained
stairs/doors, all public/common aisles, Clerks Hall return route, and Attic
Store's service classification.

### CIRC-WL-ARRIVAL-01 — Westlight is survey-first, not a speculative rebuild

The latest census does not support a claim that Westlight is half-built. It
does support a narrowly bounded next task: map Gatehead arrival, district
street/shoreline walk, venue entry, bowl concourse/aisles/vomitories, theatre,
club and backstage/service routes for each event mode. Classify every path as
public, staff, controlled or emergency. Public primary routes require 5×4
clear space; named secondary routes 3×3; staff routes at least 2×3; public
stairs require two clear width, three clear headroom, real 3×3 landings and a
bidirectional no-jump walk. Backstage remains staff-only and never substitutes
for public egress.

### CIRC-WL-ARRIVAL-ROAD-01 — approach-road pedestrian profile

Keep the seven-wide vehicle alignment. Survey the six historical centerline
anchors plus White Bridge, stopping bay, shoulder, lighting, crossings and
Gatehead transition. Add a separated two-clear-wide pedestrian edge (three at
civic frontage) only where the fresh exact-cell profile, drainage and
Town-Expansion owner/interface check prove it safe. An unannounced one-block
step, vehicle-lane pedestrian route or bridge stair without landings fails
this package.

## Universal release gate

Every package above requires a fresh immutable source snapshot, exact target
and inverse, one physical owner per changed cell, protected container/block
entity exclusion, entity clearance, strict-noop forward and rollback parser
checks, exact source preflight, journaled execution, a fresh post snapshot and
rollback-poststate preflight. Every changed public/staff/common route also
requires a cross-section-aware normal-walk check: width, headroom, rise/run,
landings, door state, lighting and separated return/egress. No historical
flood-fill or catalog-complete label substitutes for that evidence.
