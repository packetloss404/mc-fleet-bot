# Combined Zones, PassageWay, and surface-loop handoff

**Status:** current-state handoff, 2026-08-27 UTC. This is a coordination
record only: it does not authorize a world change, route opening, public
access, or passenger/service operation.

## Validated baseline

[Combined Zones current state](../05-combined-zones/CURRENT-STATE.md) is the
authoritative MP05 ledger. It records R00 complete; R01–R06 materially
as-built; the R07–R13 bounded MVP releases accepted where their independent
post-state evidence says so. Historical `HOLD` prose does not undo an accepted
release, but each accepted release remains limited to its exact target and
interface scope.

The useful interpretation is deliberately narrow:

| Area | Validated as-built baseline | It does **not** establish |
| --- | --- | --- |
| Combined Zones civil fabric | Accepted roads, tunnels, liners, shells, restricted interiors, selected passive rail, bounded lighting, and other R07–R13 scopes recorded in the current-state ledger. | A universal public network, automatic egress, or permission to join disconnected interfaces. |
| SYS-02 PassageWay | Existing local normal-walk evidence remains evidence of present components only. The [network interface setout](../SYS-02-PASSAGEWAY-NETWORK-INTERFACE-SETTOUT-01-2026-08-26.md) found no disjoint owned normal-walk or egress release candidate. | A new C1/B07/B09 cross-system connection, public corridor, emergency route, or station. |
| SYS-04 citywide exterior loop | AG-1 support, AG-2 deck/promenade/service-gallery, and AG-3 passive rails are accepted, post-verified, and reversible. AG-3 is two unpowered east–west rails plus a separated maintenance recovery path, not a service line. | Power, signals, turnouts, stations, vehicle operation, passenger service, or an accepted connection beyond the AG-3 east terminus. |

## What is built versus what remains

### Surface loop / AG sequence

| Scope | Current disposition | Evidence |
| --- | --- | --- |
| AG-1 `x=319..336` | **As-built:** 1,165-cell pier/girder support module; dry/stable post halo. | [Ledger](../../../data/world-review/ag1-citywide-exterior-loop-pier-deck-support-01-live-20260827T014350Z/ag1-guarded-release-ledger.json) · [plan/section maps](../../../data/world-review/ag1-citywide-exterior-loop-pier-deck-support-01-live-20260827T014350Z/post-snapshot-maps/AG1-EXTERIOR-LOOP-POST-MAPS.md) |
| AG-2 | **As-built:** 820-cell deck, protected five-wide promenade, parapets, separation wall, sealed six-wide gallery, and fixed lighting. | [Ledger](../../../data/world-review/ag2-citywide-exterior-loop-deck-module-01-live-20260827T021000Z/ag2-guarded-release-ledger.json) · [maps](../../../data/world-review/ag2-citywide-exterior-loop-deck-module-01-live-20260827T021000Z/post-snapshot-maps/AG2-EXTERIOR-LOOP-POST-MAPS.md) |
| AG-3 `x=320..335` | **As-built:** 128-cell passive rail/recovery/barrier module with exact rail geometry and six bidirectional recovery traces. | [Ledger](../../../data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/ag3-guarded-release-ledger.json) · [module map](../../../data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/rebound/ag3-citywide-exterior-loop-passive-rail-01.svg) |
| AG-4 bridge gap `x=336..351` | **Unbuilt and held.** It is the necessary contiguous bridge; the clean `x=352..367` survey module is disjoint and cannot substitute for it. | [Connected-continuation decision](../../../data/world-review/ag4-gap-hydrology-gravity-containment-02-mp11-c01-support-post-20260827T043000Z/AG4-CONNECTED-CONTINUATION-SOURCE-BOUND-03.md) · [disjoint-module map](../../../data/world-review/ag4-adjacent-exterior-continuation-survey-03-mp11-c01-support-post-20260827T043000Z/ag4-adjacent-continuation-survey.svg) |

### Remaining functional scope

| System | Exact remaining condition | Why it is not a release today |
| --- | --- | --- |
| AG-4 hydrology / bearing chain | The water component seeded at `(344,62,-795)` remains non-finite in the available measured source. The latest adaptive run reached its defined 125,000-cell cap before closure. The saved item at `(348,62,-789)` is excluded in `x=347..349`, `y=61..63`, `z=-790..-788`. | A local plug, liner, drain, receiver, or pier substitution could redirect an unbounded water path. No connected deck/rail/promenade package is honest until a finite component boundary is proved. [Trace 05 map](../../../data/world-review/ag4-gap-adaptive-water-component-trace-05-mp11-c01-support-post-20260827T043000Z/ag4-gap-adaptive-water-component-trace-05.svg) · [record](../../../data/world-review/ag4-gap-adaptive-water-component-trace-05-mp11-c01-support-post-20260827T043000Z/ag4-gap-adaptive-water-component-trace-05.json) |
| PassageWay C1 | The 56-station dry strip has vertical openings, ambiguous floors, and uncontracted cavern crossings. | Needs one exact 3-wide × 3-high owned profile, two reciprocal vestibule/return contracts, drainage/lighting, and route QA. |
| PassageWay MP03/B07 | B07 has no finite fluid/receiver topology; its current 125,000-cell hydrology trace remains capped. MP03 consumes the same unresolved containment/access transaction. | No liner, outlet, receiver, opening, exterior descent, egress, or route can be selected. [B07 hydrology map](../05-combined-zones/MP05-B07-HYDROLOGY-RECEIVER-05-2026-08-28.md) |
| PassageWay B09/B08 | The B08/B09 cap is closed; the lower void is only `6×2×1`; R12R and its authenticated cart are protected; accepted rescue discharges are `0/2`. | It is not a station/platform/service corridor. It needs endpoint contracts, receiver/platform/edge barrier, 6×6 service route, drainage, controls, and two independently proved discharges. [Detailed setout](../05-combined-zones/MP05-B09-CURRENT-INTERFACE-RESCUE-SETOUT-02-2026-08-26.md) |

## Exact blockers and safe design conclusion

1. **Do not bridge AG-3 to the disjoint dry module.** The required bridge
   crosses the held AG-4 support chain. Its 16 sand/water bearing failures and
   protected saved item are local hard stops.
2. **Do not treat dry upper air as a valid foundation.** The deck envelope may
   be dry while the required pier/bearing chain is wet or gravity-unstable.
3. **Do not turn a recorded walking component into an egress path.** C1,
   MP03/B07, and B09 lack the endpoint, receiver, containment, return, and
   failure-state contracts required for that claim.
4. **Do not substitute a partial cosmetic or passive-rail change for a
   functional package.** AG-3 remains passive only; B09 rail controls remain
   maintenance-only; B07 lighting/ice-edge containment do not open B07.

The safe design conclusion is therefore a **closed, clearly non-service
terminus at AG-3** and retention of all existing B07/B08/B09 caps, barriers,
and protected interfaces. The next useful work is finite-topology and
endpoint design evidence, not an opening or an unbounded-water workaround.

## Deterministic next-release workflow

Use this exact sequence for any future disjoint, finite candidate. An
unrelated holdout must not veto an independently safe target; an unknown cell
inside that target or its interaction halo must.

1. Select one exact target and interface set. Bind ownership, counterpart,
   access class, retained-route effects, and functional acceptance criteria.
2. Capture a fresh complete immutable source. Measure every water/lava,
   waterlogged, gravity, container/block-entity, protected-core, saved-entity,
   and route/receiver condition in the target plus required interaction halo.
3. For a fluid or gravity scope, prove a finite component or independently
   sealed boundary first. Define a supported liner/plug/receiver/overflow
   topology and a reverse order that never recreates uncontrolled flow or
   falling material.
4. Compile canonical source → target operations and exact target → source
   inverse operations. Run strict-noop parser checks and exact source
   preflight; reject any state drift.
5. Immediately before mutation, obtain fresh live-entity clearance and repeat
   protected-core/container checks. Execute only through the guarded journaled
   runner.
6. Take a fresh immutable post snapshot, run rollback post-state preflight,
   then perform independent functional QA: containment, supports, route
   continuity, headroom, barriers, lighting, endpoint/return behavior, and
   all explicit non-claims.
7. Update the current-state ledger only after the scoped post evidence passes.
   Preserve prior hold evidence as provenance without letting it regress an
   accepted as-built scope.

## Map index

- [Combined Zones current ledger](../05-combined-zones/CURRENT-STATE.md)
- [SYS-02 PassageWay interface map](../SYS-02-passageway-network-interface-map-2026-08-26.svg)
- [AG-1 as-built plan/section index](../../../data/world-review/ag1-citywide-exterior-loop-pier-deck-support-01-live-20260827T014350Z/post-snapshot-maps/AG1-EXTERIOR-LOOP-POST-MAPS.md)
- [AG-2 as-built plan/section index](../../../data/world-review/ag2-citywide-exterior-loop-deck-module-01-live-20260827T021000Z/post-snapshot-maps/AG2-EXTERIOR-LOOP-POST-MAPS.md)
- [AG-3 passive-rail map](../../../data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/rebound/ag3-citywide-exterior-loop-passive-rail-01.svg)
- [AG-4 capped topology map](../../../data/world-review/ag4-gap-adaptive-water-component-trace-05-mp11-c01-support-post-20260827T043000Z/ag4-gap-adaptive-water-component-trace-05.svg)
