# MP01 contained reservoir S01 — exact staged design

**Status:** offline design. No water has been released.

**RS01 accepted baseline:** dry liner/causeway release
`MP01-RESERVOIR-RS01-LINER` is
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its immutable post complete-save SHA
is `6cff9ff477d0154513614834d90dd1492f9d572aea5678c6a5986fe364da8344`.
RS02 may compile only from a fresh successor source that preserves this exact
liner/causeway topology.

## Location and protected access

Inside the verified dry north support shell, reserve the basin at:

```text
outer liner: x=2011..2025, y=165..171, z=-907..-897
water volume: x=2012..2024, y=166..170, z=-906..-898
east causeway: x=2026..2030, y=165..166, z=-907..-897
```

The causeway remains dry and separates service circulation from the basin. It
does not use the main-array corridors or Battle Cab access.

## Gated operation order

1. **RS01 liner and causeway:** replace only verified `minecraft:air` with
   state-free `minecraft:deepslate_tiles` (floor and four walls) and dry
   polished-andesite causeway. Its inverse restores only air. Post-QA must
   prove an uninterrupted solid liner, dry causeway, and no fluid state.
2. **RS02 water fill:** after RS01’s immutable post-state, replace only the
   exact contained interior air volume with `minecraft:water[level=0]`, bottom
   to top. Declare every water point reactive; prove every face neighbour is
   either declared source water or liner, never unowned air.
3. **RS02 rollback:** exact reverse, top to bottom: water source states to air
   first, then no liner change. It needs fresh post-state preflight plus a
   no-flow/no-air-contact topology check before execution.

 No fluid release may run if any water cell is flowing, if any liner/causeway
cell is unknown, or if a live entity/container/control block intersects the
liner, water, or one-cell interaction halo.

 The reservoir is still not a life-support commissioning claim; pumps, drainage,
access classification, and operating procedures remain separate MP01 work.
