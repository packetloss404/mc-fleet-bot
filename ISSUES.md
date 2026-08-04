# MC Fleet Issues

This is the owner-facing issue list for accepted work and new follow-up jobs.
An item can be reported without changing the accepted release status. Physical
edits require their own reviewed scope, guarded operations, rollback, and
post-change evidence.

## Open

### ISSUE-001 — Town Expansion stairwells are visually poor

- Status: `REPORTED — REVIEW REQUIRED`
- Priority: `HIGH`
- Reported by: Owner
- Reported: 2026-07-28
- Scope: Stairwells and major stair routes added or materially changed by Town
  Expansion, with exact affected locations still to be surveyed.
- Owner finding: “The stairwells are nasty.”
- Existing intent: `TUN-002` requires every stair and stairwell to be easy to
  walk. `CIRC-003` requires major civic and owner stairs to be both extravagant
  and usable.
- Discussion required: Agree what is failing at each stairwell—proportion,
  width, rhythm, headroom, landings, rails, lighting, materials, wayfinding,
  enclosure, arrival experience, or connection to adjacent lifts and rooms.
- Next evidence: Produce an exact stairwell inventory with locations,
  before-images, movement checks, defect notes, and a proposed design direction
  for owner review.
- Change gate: Do not edit the live world from this report alone. Approved
  repairs need exact source guards, a complete inverse rollback, independent
  bidirectional normal-walk QA, and reviewed after-images.

### ISSUE-002 — Bunker relocation and arrival were not delivered

- Status: `REPORTED — SURVEY REQUIRED`
- Priority: `HIGH`
- Reported by: Owner
- Reported: 2026-07-28
- Probable scope: C01 bunker complex and its MainStreet parking/road interface;
  confirm the exact complex ID and current bounds during survey.
- Owner findings:
  - The bunker complex was never moved east.
  - It remains in the way of the parking lot.
  - It has no road connection.
  - It has no sunken entrance.
- Existing intent: The C01 relocation work was supposed to coordinate the
  bunker, MainStreet parking, warehouse, and circulation on one spatial basis.
- Desired outcome: An east-shifted, fully buried bunker placement that clears
  the intended parking field, has a deliberate road approach, and arrives at a
  designed sunken entrance rather than an exposed or unresolved threshold.
- Next evidence: Survey the terminal snapshot and live saved world for exact
  bunker, parking, road, terrain, and entrance bounds. Compare those coordinates
  against the relocation engineering and accepted object registry, then produce
  annotated overhead, approach, parking-conflict, and entrance images.
- Current report evidence: The read-only Underground Navigation report at
  `docs/redevelopment/2026-07-28-underground-navigation/` maps both the accepted
  legacy MainStreet portal and the cataloged east-stack interior, but marks the
  east surface arrival `CONTESTED`. Its map and entrance table are navigation
  aids, not evidence that the missing relocation, road, parking recovery, or
  sunken entrance was delivered.
- Discussion required: Agree the eastward offset, parking capacity and aisles,
  road alignment/grade, sunken court dimensions, security threshold, drainage,
  landscaping, and how the entrance conceals the underground mass.
- Change gate: Do not move or rebuild the live complex from this report alone.
  A correction requires coordinated bunker/parking/road design, cross-scope
  collision review, exact guarded forward and rollback packages, route and
  vehicle-clearance QA, concealment QA, and owner-reviewed after-images.

## Issue workflow

1. `REPORTED` — owner or QA records a concern.
2. `SURVEYED` — exact locations and current-state evidence are attached.
3. `PROPOSED` — the intended correction and acceptance criteria are written.
4. `APPROVED` — owner approves the material design direction.
5. `IN PROGRESS` — guarded implementation is underway.
6. `VERIFIED` — post-change physical, functional, and visual evidence passes.
7. `CLOSED` — owner accepts the resolution.

## New issue template

### ISSUE-NNN — Short title

- Status: `REPORTED`
- Priority: `LOW | MEDIUM | HIGH | CRITICAL`
- Reported by:
- Reported:
- Scope:
- Finding:
- Desired outcome:
- Evidence:
- Dependencies:
- Change gate:
