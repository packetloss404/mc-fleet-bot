# Operation STEALTH SURFACE (2026-07-02)

User-directed teardown of the entire Hollybrook **surface** + burial of the island HQ so
the world reads as untouched natural terrain, with all life moved underground (rail /
bunker / underground city) plus **one** intentionally-visible civic building. Executed
live on the public server via op `/say` world-edits driven through Quinn (paced,
guard-checked). Full plan + execution log in session scratchpads `43c839c0` / `4652594e`
(`stealth-plan.md`, `stealth-log.md`, `demolish.py`, `regrade*.py`, `s4_hq.py`, `prune.py`).

## What changed in-world

- **S1 — Salvage.** Town containers are schematic-placed (empty by construction — 5
  evidence lines: `/api/builds` setblock placement carries no inventory NBT; offline
  server seeds items via the dev `/grant` command; zero container contents recorded in
  world/shared memory; decorative contiguous wall geometry; real loot lives in the kept
  bunker + preserved HQ warehouse). Good-faith deterministic salvage: **34 palace shulker
  boxes cloned into a bunker salvage annex** (floor Y35, x1673–1690 z152–153), 34/34
  verified. Remaining chest/barrel/appliance containers documented empty, not cloned.
- **S2 — Demolition.** Every surface structure removed: ~14 buildings + 2 victorian
  palaces + Pokémon temple arena + spruce/andesite tower + glass dome + statues +
  **perimeter wall + 16 watchtowers**. Method: per-16×16-tile blanket air-fill above
  locally-detected natural grade (grade sampled from ground-surface neighbours, never
  tree canopy → no gouging; natural countryside / ponds / ridge skipped). Seawall (W/N)
  removed to open water; E/S wall trench backfilled to grade. Surface artificial columns
  **23 484 → ~370** (0.4%; the rest is the new city hall, kept structures, and natural
  stone/ore).
- **S3 — Restore.** Exposed foundations grass-capped to natural grade (material-outer
  `grass_block replace <mat>` over keep-avoiding rectangles); ~250+ oak/spruce/birch trees
  replanted via `/place feature`; no surface light sources left (except the city hall).
- **S3.5 — Lone city hall.** `schematics/city-hall.schem` (62×58×41, 9 168 blocks, a
  landscaped civic building with water/garden features) built at origin **(1679, 63, 190)**
  — central, over the former town-hall footprint, clear of the flagship stair. The one
  building left standing above ground.
- **S4 — HQ concealment (island, x1550–1584 z-405..-386).** Station arch removed; hut +
  warehouse **buried under a grass mound** (roof-cap dirt Y69–72 above all roofs + Y72,
  perimeter banks outside the walls) with **interior air + contents preserved in place**
  (a skirt-fill over-reach that packed the interior was carved back to air and verified);
  the rail-terminus staircase kept as a **hidden hatch entrance** (spruce trapdoor at
  1567,66,-378). The Y52 rail corridor under the island is untouched.
- **S4.5 — Tunnel prune (conservative / safe subset).** Backfilled the 5 orphan connector
  **laterals** to demolished buildings (villager/gnomo/totem/cottage/palace, x≤1697) +
  capped their riser shafts. **Left intact and verified open:** the x1700 spine (which
  carries the island-HQ link — it is NOT a removable "south trunk"), the bunker spur, the
  hub, the flagship arch, and the bunker station. The hand-routed west system (x1610
  distributor, x1665 flooded line, west trunk) was **left in place** — its geometry
  wasn't safely reconstructable and removal risked the functional town↔island↔bunker rail.

## Preserved (never touched)

Underground rail network (hub 1700,51,180; island-HQ link; bunker spur; flagship stair)
+ the entire bunker / underground city / salvage annex (Y≤57), and 3 unknown-provenance
possible-other-player structures with buffers: elevated spruce farm/library
(x1665–1697 z138–172), mud-brick wheat hut (x1606–1619 z245–257), spruce shed
(x1662–1671 z98–108).

## Known residue / follow-ups

- ~370 scattered surface stragglers remain (stone_brick_stairs, mossy_cobblestone, some
  city-hall landscaping spill past its exclusion box) — cosmetic, 0.4% of columns.
- S4.5 is a partial prune (see above); the x1665 flooded aisle was left, so that flooding
  is not yet resolved.
- Container-salvage residual risk: if anything was hand-stored in a town chest/barrel it
  was lost on demolition (see S1 rationale).
