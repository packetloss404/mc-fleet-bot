# Incident — the Ravensreach debris sweep removed a real building

**2026-07-25. Reported by the operator, confirmed, and fully restored.** Recorded because
the tool that caused it is still in the repo and will do the same thing again.

## What happened

The floating-debris sweep (`scripts/find_floating.mjs`, commit `066c0ff`, plus the
"floating schematic junk cleared — 1,303 blocks" pass in `94aea7e`) **removed a real,
grounded, furnished structure** east of the Ravensreach plaza — a tall spruce and
deepslate-brick tower with a chest room, together with surrounding landscaping.

The operator's description was exact: *"the buildings under that are 1/2 built now too."*
The tower's upper levels and one whole building had gone; what remained read as a stub.

**460 built blocks were destroyed.** The inventory is what makes it unambiguous that this
was never debris:

| | |
|---|---|
| Storage | 36 chests · 2 ender chests · 1 barrel |
| Crafting | 2 crafting tables · 1 loom · 1 anvil · 1 chipped anvil · 1 brewing stand · 1 cartography table · 1 furnace |
| Living | 2 beds · red carpet · 4 white + 3 red wool · 3 decorated pots · 7 potted blue orchids |
| Structure | 55 stone_bricks · 42 cobblestone · 34 deepslate_brick_stairs · 32 spruce_planks · 29 spruce_trapdoors · 17 spruce_stairs · 14 spruce_fence · 6 deepslate_brick_wall |
| Detail | 5 lanterns · 2 spruce wall signs · 2 ladders · 28 rose bushes |

Nothing in that list is schematic junk. **A furnished interior is the single clearest
signal that a cluster is somebody's build**, and the tool has no concept of it.

## Why the tool did it

`find_floating.mjs` decides "debris" by **6-connectivity to a ground seed layer**. Its
own header is candid that this is a heuristic, and it carries two guards — a vegetation
guard (>60% leaves/logs is skipped) and `--max-cluster` (very large clusters are reported
but not removed, on the grounds that they are probably real structures).

Neither guard fired here:

* The tower is **not vegetation**, so the vegetation guard was irrelevant.
* The removed pieces were **many small clusters, not one large one** — an upper storey,
  a cap, a beam, a chest wall — so each landed under `--max-cluster`. The guard protects
  against deleting one big thing; it does nothing about deleting a big thing *in pieces*.
* Whether a tower reads as "grounded" depends entirely on where the seed layer is drawn.
  A structure whose lower floors sit above the seed, or which connects downward only
  diagonally, floods as unreachable — and **diagonal-only connection is exactly the case
  the tool already knew about for tree canopies** and special-cased for leaves alone.

The commit message even records the near-miss: *"a pale spire and some large beams that
read as odd in renders are GROUNDED, so they are structures rather than debris."* The
tool got that one right and this one wrong, and nothing in the output distinguished them.

## Why recovery was possible — and how nearly it wasn't

Restoration came from a **complete world snapshot at 17:41**, four hours before the
sweep, which existed only because an *unrelated earlier session* happened to leave it in
its `/tmp` scratchpad:

```
/tmp/claude-1000/-opt-stacks-mc-fleet-bot/fc08b9f4-…/scratchpad/world/region/
```

That is luck, not process. `/tmp` is not a backup. It has been copied to
`data/worldsnap-preremoval-20260725-1741/` (69 MB, 20 region files) and should be kept
until the operator is satisfied nothing else is missing.

The `lake_restore.mjs` commit drew this exact lesson once already — *"guessing a natural
feature's shape after damaging it is worse than reading it back"* — and it applies with
far more force to a build, which cannot be guessed at all.

## The restore, and a bug in it worth remembering

Method: diff the 17:41 snapshot against the live world for **positions that held a block
then and are empty now**, then `setblock` each back **with its exact block state**
(`--states`), in two passes ordered by ascending y so that attachables — chests, beds,
signs, lanterns, trapdoors — get re-seated once their support exists.

**405 built blocks restored (2 passes), then 1,181 terrain blocks.** Verified against the
snapshot: the only positions still empty are the 163 `oak_leaves` + 11 `oak_log` of the
ratified grove harvest and 67 `water`, all three excluded deliberately.

> **The first restore attempt silently left the tower body out**, and the render is what
> caught it: the cap came back *floating*, with a gap beneath. The cause was a filter
> written with **substring** matching — `grep -vE "deepslate|stone"` meant to skip natural
> deepslate and stone, and it also swallowed `deepslate_brick_stairs`, `deepslate_brick_wall`,
> `stone_bricks` and `cobblestone`: the tower's entire structure. Rewritten with **exact
> block names**, it recovered the missing 132.
>
> This is the same class of error as trap #4 (`replace`-scoping that deletes what was
> never inventoried) and it is worth stating as a rule: **a material filter must match
> whole block names, never substrings.** Minecraft's naming makes every natural block a
> prefix of a built one.

## Wider sweep — no other damage found

The operator asked for the rest of the town to be checked against the same snapshot.
Done with `scripts/diff_snapshots.mjs` (written for this, since the first pass was
ad-hoc `comm` over sorted text dumps) over **x[−300,150] y[50,160] z[−560,−160] — 754
chunks**, four times the area of the original survey.

**2,184 removals, and every one is accounted for. None is damage.**

| Removed | Where | Verdict |
|---|---|---|
| 604 `red_terracotta`, 20 `brick_stairs` | x[20,43] y[72,78] z[−203,−187] | **Intentional** — exactly the H12 Valencia gable removed under MSA Q1 |
| 120 `light_gray_concrete` | x[32,37] y[85,87] z[−204,−185] | **Genuine debris** — verified: y73–84 beneath it is 0/2880 non-air, so it was floating over open air with nothing under it |
| 1,207 `dirt`/`stone`/`grass_block` | y50–72, peaking y67–71 | **Bot mining.** Spread across 36 separate 16×16 columns (~34 blocks each) along the MSA↔Ravensreach travel corridor. Scattered, not a coherent cut — the signature of the fleet digging, not a sweep |
| birch leaves/logs, leaf_litter, short_grass | scattered | Vegetation churn / harvesting |

Re-diffing the already-restored town box returns only the 163 `oak_leaves` + 11
`oak_log` of the ratified grove harvest and 67 `water` — all three excluded on purpose.

**Conclusion: the destroyed tower was the only real casualty, and it is fully restored.**
The scattered terrain loss is worth knowing about for a different reason — bots are
excavating along their routes, which is exactly the behaviour the newly-extended
`mining.protectedZones` is meant to bound.

## What to change before running the sweep again

1. **Never let it write.** `find_floating.mjs` is explicitly designed to emit commands for
   review rather than apply them; the review step is the safety mechanism and it was
   skipped. Reinstate it.
2. **Treat furniture as a veto.** Any cluster containing a container, workstation, bed,
   sign or light is a build. This is cheap to check and would have prevented this outright.
3. **Aggregate before judging.** Score the *neighbourhood*, not the isolated cluster — the
   pieces here were individually small and collectively a tower.
4. **Snapshot immediately before, always**, to a durable path, and diff after.
