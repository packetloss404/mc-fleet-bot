# Modern Underground Corridor Standard

Status: binding design source for new Town Expansion R1 underground routes and
for the replacement pilot on the former Ravenrock route segment.

This is a Minecraft design standard, not a representation of code compliance
for a real occupied structure. It replaces the project's deprecated T2B visual
and circulation language wherever this release models new work.

## Binding spatial rules

- Main owner and civic circulation uses a minimum five-block clear width and
  five-block clear height.
- A level, continuous center route is mandatory. One-block jumps, ladder-only
  access, alternating-tread shortcuts, and loose stair fragments are forbidden.
- Every elevation transition needs a full-width landing before and after the
  stair flight. Major vertical changes pair the broad stair with a lift analogue.
- Public, staff, performer, owner, service, and emergency routes receive
  different identity bands and cannot become an unlabeled shared maze.
- Doors sit on level maneuvering zones. Security doors and airlocks cannot
  consume the clear route.
- Long routes repeat lighting and wayfinding at predictable intervals. Refuge
  or rest rooms must sit beside the travel path, never in it.
- New occupied underground areas require two deliberately separated egress
  directions unless a reviewed scope explicitly documents a different
  fictional-world constraint.

## Material and wayfinding language

- Primary floor: smooth quartz with inset blue/cyan centerline lighting.
- Walls: light-gray concrete with a continuous cyan identity band.
- Ceiling: white concrete with repeatable sea-lantern strips.
- Landings: brighter quartz frames and a color-coded destination threshold.
- Mechanical/service recesses: polished deepslate, kept outside the clear
  five-by-five route.
- The deprecated T2B palette and its jump-like grade changes are prohibited in
  newly modeled occupied corridors.

## Research basis

The U.S. Access Board explains that accessible circulation should coincide with
the principal circulation path, that continuous routes need stable clear
surfaces, and that vertical circulation should not be hidden away from the main
route. Its standards also distinguish walking surfaces, ramps, stairs, and
lifts, requiring landings and controlled slopes rather than abrupt changes.
Those principles inform the generous Minecraft analogue:

- [U.S. Access Board — Accessible Routes](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/)
- [U.S. Access Board — Stairways](https://www.access-board.gov/ada/guides/chapter-5-stairways/)
- [U.S. Access Board — Accessible Means of Egress](https://www.access-board.gov/ada/guides/chapter-4-accessible-means-of-egress/)

NFPA 502 identifies emergency exits and emergency lighting as explicit road
tunnel design concerns. Town Expansion uses that as a high-level prompt for
repeatable lighting and legible separated exits; it does not claim an NFPA
review:

- [NFPA 502 public standard portal](https://link.nfpa.org/all-publications/502/2026)

## Release checks

The generated report must show:

- five-by-five clear route dimensions;
- no jump geometry;
- a modern replacement scope over the reviewed historical pilot;
- no deprecated palette inside the replacement's occupied section;
- protected block-entity and entity scans covering the full underground bounds;
- no active portal blocks in any offline portal-room scope.
