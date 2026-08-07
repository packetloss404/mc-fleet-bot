# Combined Zones R06 support-and-liner scope and material decision

**Status:** OWNER_DECISION_RECORDED_R06_SUPPORT_AND_LINER

Owner authority: "yeah build all that" continuation directive (project
conversation, 2026-08-07), scoped to what frozen geometry supports today.

## Package 1 — wet liners (`wet-liner`)

Line the three deferred wet zones with `minecraft:deepslate_tiles` (EE-P12
wet-service doctrine):
- the R02 aquifer deferral class (159 cells, hash `6769967d…`),
- the B07 wet pocket deferral class (110 cells, from the R03 v2 partition),
- the R05 west-toe lava seep (~10 drifted cells around 1961,77-100,-824).

Fluid-state rule: only STABLE sources are lined by guarded ops (still water
`level=0`, still lava `level=0`, `waterlogged=true` states, plus the
already-classified dry-buffer air cells). FLOWING fluid cells (non-zero
level) may not be guarded exactly (their states fluctuate); they are
enclosed by the lined sources and expected to drain — recorded as an
expected-drain class and verified against the post save instead of operated.

## Package 2 — Grand Avenue support slab (`b11-support`)

Fill the frozen B11 LOAD influence reservation (the two rows at dy −1 and
−2 under the full eight-wide deck, from the accepted B11 proposal geometry)
with `minecraft:stone_bricks` wherever the current cell is air — giving the
floating spans a two-deep structural underside. Cells already solid
(terrain) are accounted already-supporting and left untouched. Drainage and
utility influence rows stay reserved and untouched.

## Package 3 — none: B09 funicular envelope verification only

B09 was in the R05 no-fill exclusion list; its 7,800-cell envelope should be
pre-bored void inside the east face. The release VERIFIES this against the
current save and records the census; commissioning/fit-out stays later.

Guards: container hard abort; no surface-exposure rule (liners/support add
solid); partition invariants per class with hashes as established.

Bound source: the post-tunnel save
`data/worldsnap-combined-zones-complete-save-20260807T020808Z` (fresh
intake audit required before compile).

World edits authorized by this record: **none**.
