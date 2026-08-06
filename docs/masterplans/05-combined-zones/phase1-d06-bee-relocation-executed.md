# D06 bee-nest relocation — EXECUTED (2026-08-06 ~23:5x UTC)

**Status:** EXECUTED_VERIFIED_HUMANE_RELOCATION_COMPLETE

The occupied bee nest blocking the EG-B stair envelope was relocated intact
using the accepted server-authoritative operator-RCON method (EXT-03 /
`phase1-d06-bee-nest-treatment.json` planning basis, destination from
`phase1-d06-bee-nest-destination-survey.json`).

## Method and evidence

- Source: `1849 66 145` (`minecraft:bee_nest`, block entity id `minecraft:beehive`
  with a populated `bees` list). Destination pre-verified air over grass at
  `1811 67 378` (surveyed forest candidate, 16 flowers within 22 blocks).
- Command: `clone 1849 66 145 1849 66 145 1811 67 378 replace move` — a single
  atomic server-side move preserving the complete block-entity NBT (embedded
  bees, `ticks_in_hive`, honey level). Result: `Successfully cloned 1 block(s)`.
- Post-verification: `data get block 1811 67 378 bees` returns the populated
  colony list; `data get block 1849 66 145` reports no block entity (air).
- The previously observed third (external) bee was not present within 24 blocks
  at execution time (`execute if entity` test failed); no external entity
  required teleporting. If it reappears at the old site it will re-home to
  nearby hives naturally.
- Chunk handling: exactly two chunks (`[115,9]`, `[113,23]`) were temporarily
  force-loaded and both were unmarked immediately after; the operator's
  force-load baseline is untouched.

## Rollback (if ever needed)

```
forceload add 1849 145 1849 145
forceload add 1811 378 1811 378
clone 1811 67 378 1811 67 378 1849 66 145 replace move
forceload remove 1849 145 1849 145
forceload remove 1811 378 1811 378
```

## Boundary

This was the sole live change: one block moved, zero blocks otherwise altered.
G17 executed-results accounting for the commissioning ledger can bind this
record. The EG-B stair envelope cell at `1849 66 145` is now clear for the R02
shell excavation.
