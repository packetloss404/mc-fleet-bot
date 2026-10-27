# MP01 south chamber geometry revision 01

**Status:** exact current-source design; not yet a release or built claim.

## Current survey

The immutable post-state snapshot
`data/worldsnap-mp01-cheyenne-service-interiors-02-post-20260826T035200Z`
contains a wholly dry, non-container, non-entity source envelope at:

```text
x = 2008..2037
y = 164..183
z = -845..-831
9,000 / 9,000 cells = minecraft:stone
```

It is immediately south of the present chamber edge (`z=-846`) and inside the
approved Z10 design envelope. It is not an inference about the live world: a
fresh source snapshot and all scoped safety gates remain mandatory before a
release.

## Alternative that preserves existing protected routes

Do not infill the built x-direction corridors between A/B/C. Instead, extend
the chamber south by fifteen z-columns and retain the existing seven-column
cross-corridor at `z=-852..-846` between old and new arrays.

Stage G01 — **shell only**

- Carve `x=2008..2037, y=165..182, z=-845..-831` to air (8,100 cells).
- Finish `x=2008..2037, y=164, z=-845..-831` as polished granite (450 cells).
- Add only fixed, state-free ceiling lighting after the shell proof.
- No building, container, fluid, public access, egress, or operating-system
  claim is part of G01.

Stage G02 — **new southern array, after G01 post-state proof**

- Two rows of three freestanding bays, using the established x columns
  `2009..2014`, `2018..2023`, and `2027..2032`.
- Row D footprint: `z=-845..-839`; Row E footprint: `z=-837..-831`.
- Preserve the one-column inter-row lane at `z=-838`, the prior cross-corridor,
  and all existing x-direction inspection corridors.
- Each row is its own reversible release; every shell/interior follows only
  after its preceding post-state snapshot is accepted.

This provides the remaining six freestanding bays geometrically without
rewriting or narrowing protected circulation. It does **not** complete MP01:
Battle Cab, support rooms, reservoir, controls, public/service boundaries,
operating access, and all functional commissioning remain separately open.
