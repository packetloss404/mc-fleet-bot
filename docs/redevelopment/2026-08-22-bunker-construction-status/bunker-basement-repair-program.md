# Bunker and basement repair program

**Status:** DESIGN_AND_SURVEY_QUEUE — no world mutation in this document.

**Evidence baseline:** R08AM terminal immutable post `0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699`; region `30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`.

## Audit result

| ID | Area | Current evidence | Required action |
| --- | --- | --- | --- |
| BKR-01 | Cheyenne B03/Z10 | 5,988/5,988 exact targets; R12O's 613-station component is index 188–800 only | Closed index 800 and held 0–187 are deliberate boundaries, not missing doors. Preserve and survey before access design. |
| BKR-02 | East C01 approach | 900,946/901,073 model cells exact; four of five current C01 route families pass | `TE-ROUTE-C01-MOUNTAIN-PORTAL-L1` fails both directions. It is unavailable until a separate pedestrian-spine release passes. |
| BKR-03 | East C01 stairs/common nodes | Public, owner, and service centerlines pass | Centerline proof does not establish width, landings, guards, doors, or live traversal. Run a cross-section census first. |
| BKR-04 | Legacy MainStreet C01 | 25,193/30,361 historical targets match | 5,168 targets changed. Survey before touching its half-finished rooms; old files are not current guards. |
| BKR-05 | Raven Rock C2/RR-Z5 | No accepted current complex; former T2B is superseded | C2 stays closed for missing treads and wet/cave uncertainty. Survey RR-Z5 first; repair only dry proven defects. |

## Non-negotiable circulation design

| Class | Clear envelope | Rule |
| --- | --- | --- |
| public/common | 5 wide × 5 high | 1 rise per 2 run; 5×5 landings; two protected directions before public label |
| major bunker stair | 7 wide × 6 high | 1 rise per 2 run; 7×7 landings and a lift analogue in the same hall |
| staff/BOH/service | 3 wide × 3 high | 1 rise per 2 run; 3×3 level zone at every door |
| restricted approach | 3 wide × 3 high from 5×5 common spine | privacy door never counts as exit |

One-block stairs, ladders, trapdoors, jump/crouch pinches, and an exit-side-inoperable door are never primary circulation. They may remain only as signed maintenance circulation after a compliant primary route exists.

```text
public arrival -> controlled vestibule -> common spine -> common room
                                         |- staff/BOH spine -> staff node
                                         `- restricted spine -> controlled annex
```

Back-of-house and restricted paths may meet only at a controlled common node; they never borrow an emergency exit, rail/service/hydrology passage, or unreviewed cave. Every staff program has a marked service-door return to a common node. Restricted wings retain their own controlled return and never become public egress.

## Ordered package queue

### BKR-SURVEY-00 — fresh condition census

Read-only first. Take a fresh complete snapshot and create a walkable-cell graph plus station table for every named route: floor, width, headroom, rise/run, landing rectangle, door state, light, fluid/gravity/cave adjacency, container/block-entity halo, owner, and class. Capture a section map and both-direction screenshots at every vertical node.

Survey `x2047..2392, y164..171, z-872..-744` for B03; east-C01 portal `x680..812, y40..75, z-90..-40`, public `x699..900, y23..50, z-141..-4`, owner `x699..900, y-15..20, z-141..-4`, and service `x850..890, y41..50, z-141..-28`; all legacy C01 historical mismatches; and RR-Z5 `x196..204, y-11..-6, z-19..-11` plus every C2/wet-boundary station. C2 remains closed during survey.

### BKR-C01-PORTAL-01 — controlled east-C01 pedestrian continuity

Depends on BKR-SURVEY-00. Build a dry 5×5 pedestrian spine beside—not inside—the vehicle ramp, with 5×5 level airlock vestibules, separated vehicle envelope, exit-side-operable doors, and two protected L1 directions. Do not open branches, source retirement, utilities, frames, or surface recovery. Require exact inverse, strict-noop forward/rollback, entity clearance, journaled execution, fresh post, 5×5 census, live bidirectional no-jump walk, door test, and rollback post-preflight.

### BKR-C01-DIMENSION-02 — east-C01 stairs, common nodes, and BOH

Depends on BKR-SURVEY-00 (and portal release if final graph uses it). Retain a route only if measured compliant; widen proven pinches; build a 7×6 hall with lift analogue for common level changes; or sign old routes service-only behind a controlled door after a compliant replacement exists. Reserve a 5×5 map/wayfinding/return node for every fit-out; connect service rooms through 3×3 staff vestibules and keep all furnishings outside route halo.

### BKR-LEGACY-C01-01 — condition and room-program recovery

Depends on BKR-SURVEY-00. Classify each mismatch as intentional later change, damage, container/block entity, or unknown. Then release small reversible programs in order: spine/stair envelope; organized basement rooms (archive, bunks, records, comms, stores) with enclosing walls, labelled thresholds, and 3-wide aisles; hangar/arena/theatre only after flight line, egress loop, foyer, and two exits are measured; then maps/directories at all landings. The goal is a coherent floor plan, not more furniture.

### BKR-B03-ACCESS-01 — access design, not cap removal

Depends on BKR-SURVEY-00 and separate chamber/terminal survey. Keep `188..800` passive and index 800 capped. Any access needs two protected directions, 5×5 spine and landings, lift analogue for major changes, controlled boundaries, and a surveyed chamber/terminal. Removing 0..187 obstructions alone is not an entry design.

### BKR-RR-Z5-01 / BKR-RR-C2-02 — Raven Rock pilots

Depends on BKR-SURVEY-00; C2 also needs passing wet/gravity containment. Survey every RR-Z5 flight; only repair proven guard, edge, light, level-code, directory, or clearance defects. C2 stays closed until full station inventory and Cavern C interface permit a dry 3×3 secondary corridor. Otherwise retain closure and publish the alternate route.

## Release checklist

1. Use a fresh source and one package/route class.
2. Compile exact forward/reverse canonical states; exclude containers, block entities, protected cores, entities, fluids, gravity, and unowned interfaces.
3. Run strict-noop parser checks and source preflight.
4. Execute only after entity clearance, with a journaled guarded release.
5. Capture fresh post; run dimensional, route, door, and rollback QA; update maps and Master Plan with the actual class.

No package claims public egress, live operation, accessibility, or a completed bunker before its exact post-state gates pass.
