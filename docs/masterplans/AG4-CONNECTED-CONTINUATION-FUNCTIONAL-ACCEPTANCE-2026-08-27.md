# AG-4 connected-continuation functional acceptance

**Status:** Design/QA input only. This is not an operation package, release
authorization, connection claim, or service opening.

## Bound current state

- [AG-1 post map](../../data/world-review/ag1-citywide-exterior-loop-pier-deck-support-01-live-20260827T014350Z/post-snapshot-maps/ag1-exterior-loop-post-maps.json): two-deep `23×16` girder at Y82–83, three pier pads, and dry/stable support halo.
- [AG-2 post map](../../data/world-review/ag2-citywide-exterior-loop-deck-module-01-live-20260827T021000Z/post-snapshot-maps/ag2-exterior-loop-post-maps.json): five-wide protected promenade, sealed six-wide gallery, and a rail reserve that was initially empty.
- [AG-3 post map](../../data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/post-snapshot-maps/ag3-exterior-loop-post-maps.json): two passive east-west rails, 48-cell barrier, and a three-wide maintenance-only recovery path.
- [AG-4 survey](../../data/world-review/ag4-adjacent-exterior-continuation-survey-02-post-20260827T021200Z/ag4-adjacent-continuation-survey.json): the immediate `x=336..351` span is held by 16 sand/water bearing failures plus saved item `(348,62,-789)`. The nearest dry, entity-free surveyed module is disjoint `x=352..367`; it is not a connection.

## Acceptance checklist for a future connected continuation

| Layer | Required functional acceptance | Minimum independent QA evidence |
|---|---|---|
| Support | A finite, continuous Y82–84 support system and all new pier/bearing chains are canonical, non-gravity, dry, and joined to the AG-1 end interface without changing existing support outside the exact package. | Exact target/inverse; all bearing chains continuous; one-cell interaction halo dry/stable; no protected/core, container, or saved-entity collision. |
| Containment | The held `x=336..351` component is made finite before connection: sand/water is lined or plugged in a directed, supported order, and the saved item is freshly cleared or excluded. | Fresh complete source proves the finite boundary, all fluid/gravity cells, receiver/overflow disposition if needed, fresh entity clearance, and rollback that never recreates uncontrolled flow. |
| Deck | The 23-wide deck is continuous at Y84; the promenade surface, outer parapet, separation wall, gallery inner wall and roof retain the AG-2 cross-section without steps, gaps, or headroom loss at either seam. | Exact interface planes at AG-3 east end and new west end; five-wide no-jump bidirectional walk traces; six-wide gallery clearance traces; light/support checks; no waterlogging. |
| Protected walk/service | Keep the five-wide promenade and six-wide gallery separate from rails. The three-wide recovery path remains maintenance-only and is not a public route, platform, or emergency discharge. | Directed normal-walk traces for promenade, gallery, and recovery separately; no cross-path through rails/walls; explicit non-claims retained. |
| Passive rails | Continue only two unpowered, `east_west` rails at the existing Z positions with matching Y85 support/headroom; do not add redstone, powered/detector/activator rail, turnout, signal, station, or vehicle operation. | Exact rail shape census; continuous 32+new support cells; three-clear rail headroom; rail-side barrier continuity; rail reserve has no unauthorized block types. |
| Recovery | Preserve the 3-wide Y85 smooth-stone recovery strip with solid Y84 feet support and two-clear headroom, separated by the rail/barrier geometry. | Both-direction, every-lane no-jump normal-walk traces across the complete connected span; rail cells never serve as walk nodes. |
| End-of-line safe state | Until a later separately scoped continuation is verified, terminate all three longitudinal layers at a closed, visible, non-service end: passive rail ends protected from use, recovery path does not discharge, and promenade/gallery have no implied public opening. | Exact terminal block-state map; rollback inverse; post QA demonstrates no vehicle/power/control/station/public/passenger claim and no unbounded fluid/gravity path. |

## Gate order

1. Fresh immutable source and AG-4 gap-containment topology—not the disjoint
   `x=352..367` survey alone—must define a finite connection scope.
2. Compile a new canonical forward/inverse package; pass source, parser,
   protected/container, entity, and strict-noop gates.
3. After a separately authorized run, capture an immutable post save, perform
   rollback poststate preflight, then run the seven acceptance rows above.

The AG-4 survey supplies no authority to bridge the held gap, to construct the
disjoint module, or to add controls or service.
