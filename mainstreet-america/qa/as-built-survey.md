# MainStreet America — AS-BUILT SURVEY (live-server RCON, 2026-07-24)

**Method.** Measured directly against the running Paper server (`10.80.13.14`,
`/opt/packetcraft/paper-server/`) over an in-process SSH→RCON channel (paramiko `direct-tcpip`
to `127.0.0.1:25575`, RCON password from `.env`). Blocks probed with the bare
`execute if block <x> <y> <z> minecraft:<id>` form (returns *Test passed/failed*), auto-identifying
each block against a ~90-entry candidate palette. This is **ground truth**, not the bot terrain API
(which serves stale chunk cache).

Seed: `-2712155529552800606`. Survey supersedes the "nothing built" state asserted in `README.md`,
`qa/qa-report.md`, and `qa/defects.yaml` — those docs were **never updated after the overnight build**.

## Confirmed present on the server

| Element | Measurement | Notes |
|---|---|---|
| Bots online | Mason, Architect, Steward, Scout, Surveyor | `list` = 5/20 |
| Bots opped | all 5 at `level: 4` in `ops.json` (+ human `packetloss404`) | build permission confirmed |
| Guest Center footprint | solid **x −70…+70 (~141 wide)** at z=128; **z ~90…180+ deep** at x=0 | centroid ≈ **(0, ~135)** |
| Guest Center height | solid **y63 → y79** (~16 blocks) | 2 stories + roof band |
| Guest Center hollow | interior air y65–68; walls present | matches "hollow confirmed" |
| GC materials | polished_andesite floor · **sea_lantern** interior lighting · gray_concrete roof · stone_brick foundation (y62–63) | manufactured, not natural |
| Road / street / drive | continuous placed surface at **y=63 along x=0, z ~+200 → −235** (~435 blocks) | bridges over water (y62=water z −100…−235); natural stone resumes z=−300 |
| Model homes | flank the central street; **west = deepslate_bricks** (≈ Ashby Manor / Old World), **east = stone_bricks** | multi-story walls y63→~79 |
| Homes detected | ~9 wall clusters — west z≈{0,−96,−144,−195}; east z≈{21,−48,−93,−144,−195} | homes sit at **x ≈ ±20–25** |
| Fill density | ~50% of a 648-point core grid sampled solid | large-scale construction |
| Terrain | build area leveled to **y≈63**; natural terrain elsewhere ~y120 @ (250,250) | site was graded/filled |

## Plan-vs-as-built DIVERGENCES (must be reconciled)

1. **Layout scheme = a THIRD, unplanned option.** As-built is a *narrow central street* (homes at
   x≈±20–25, GC centered at x=0). This matches **neither** the GRID scheme (homes x=±85) **nor** the
   OVAL scheme (homes x≈±116). The DoD-4 GRID/OVAL fork was effectively **bypassed by the build**, not
   resolved per plan. Planning docs must be repointed to the actual compact-street geometry.
2. **Guest Center centroid & size diverge.** As-built centroid ≈ (0, **135**), ~**141 wide**. Plans
   said (0,75)/75×75 (GRID) or (0,88)/90×60 (OVAL). As-built is farther north and wider than either.
3. **Home count unconfirmed at 12.** Coarse RCON scan found ~9 clusters; needs a fine per-lot sweep to
   confirm the verified 12-home roster is fully present and correctly styled.
4. **Road surface block unidentified** — a real placed surface outside the 90-block probe set (cosmetic;
   identify on next pass).
5. **Docs stale.** `README.md` / `qa-report.md` / `defects.yaml` still say "not started / nothing built."

## Not yet built (consistent with the overnight report's "remaining" list)
Interiors, landscaping/planting, parking fields, warehouse, cooking-school, monument/billboard,
porte-cochère, cul-de-sac terminus — and the **entire Raven Rock** underground complex. Not probed here.

## Verification tooling (reusable)
`/tmp/claude-1000/-opt-stacks-mc-fleet-bot/<session>/scratchpad/verify*.py` — paramiko SSH→RCON block
probes. Pattern: open `direct-tcpip` to localhost:25575, auth, then `execute if block` sweeps.
