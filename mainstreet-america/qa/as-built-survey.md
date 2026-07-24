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

---

# ADDENDUM — 2026-07-24 22:4x UTC · centreline burial survey and repair

A second RCON pass, prompted by a fleet-wide audit that reported the southern
third of the internal street as entombed.

## Finding (CONFIRMED, then repaired)

Sampling the street centreline (`x = 0`) every 5 blocks from `z +75` to `z −235`
— 63 points — for clear headroom at `y66` and `y68`:

| | count |
|---|---|
| clear | 47 |
| **buried** | **16 (~25%)** |

The buried span was **contiguous-ish from `z +75` down to `z −45`**:
`75, 70, 65, 60, 55, 50, 30, 25, 20, 15, 10, −20, −25, −30, −40, −45`.

That range is exactly where the **lot z-centres +55 and +5** sit, which is why
those homes were reported as having no walkable frontage — the road in front of
them was under fill. Cause is consistent with the site-clear `/fill` batches for
that span never having executed: the homes and road surface were written at y64,
but the overburden above them was never removed.

## Repair applied

- Cleared `x[−12,+12]`, `y65 → y99`, `z[−50,+80]` to air — the carriageway and
  both verges. **Deliberately excludes the home shells at `x = ±34`**: a wider
  clear would have deleted the buildings it was meant to give frontage to.
- Re-laid the surface where it had been lost: `smooth_stone` carriageway
  `x[−4,+4]`, `grass_block` verges `x[−12,−5]` and `x[+5,+12]`, `y64`,
  `replace minecraft:air` so nothing already standing was overwritten.

**Post-repair verification:** 0 of 27 re-sampled centreline points still buried;
road surface present at 14/14 sampled points. 77 RCON commands.

## Still open from the original survey

Items 1–3 and 5 above are **unchanged** — the layout-scheme repoint, the Guest
Center centroid divergence, the unconfirmed 12-home count, and the stale docs.
This addendum repairs a physical defect; it does **not** perform the
coordinates.yaml → buildings.yaml → site-plan.md → integration/* repoint, which
remains the largest outstanding doc task. Item 4 is now partly answered: the
carriageway surface in the repaired span is `smooth_stone` **because this pass
laid it**, which is not evidence about the original surface elsewhere.

---

# ADDENDUM 2 — 2026-07-24 23:0x UTC · definitive per-lot sweep (supersedes items 1–3 above)

The findings numbered 1–3 in the original survey are **WRONG**, and this pass
supersedes them. The error was methodological, so it is worth recording.

## Why the earlier numbers were wrong

The first sweep probed at **fixed heights** (y68, then the y64/65/66 "build
plane"). MSA is **not** on a flat plane: surface heights across the site range
**y59 → y98**. So a fixed-height probe lands above the rooftops in low ground,
and buried in hillside in high ground. Probing y68 found almost nothing; probing
y65/66 found even less — not because little is built, but because the probe
height was wrong nearly everywhere.

Some homes also sit under **~30 blocks of overburden** (lot z+55 west has its
surface at **y98**), which the earlier pass read as "not built".

**Correct method — surface classification.** For each column: binary-search the
surface height, then test whether the surface block is natural (grass/dirt/stone/
sand/gravel/water/logs/leaves…). A **non-natural surface block is a structure**,
at whatever height it happens to sit. Height-independent, so it works over
buried and exposed ground alike.

## AS-BUILT (canonical — the world, per the OQ-1/2/5 decision)

### 12 homes — COUNT CONFIRMED

Every one of the 6 lot z-centres carries a structure on **both** sides:
**6 lots × 2 sides = 12**.

| lot z-centre | west footprint (x) | east footprint (x) |
|---|---|---|
| **+55** | −52 … −16 | +4 … +48 |
| **+5** | −52 … −16 | +16 … +48 |
| **−45** | −52 … −16 | +20 … +48 |
| **−95** | −52 … −4 | +4 … +48 |
| **−145** | −48 … −4 | +4 … +44 |
| **−195** | −48 … −4 | +4 … +44 |

- **West row centre ≈ x −34**, **east row centre ≈ x +32**.
- This **refutes** the earlier "homes at x ≈ ±20–25" and the "~9 clusters" count.

### Guest & Design Center

- **x[−72, +72] → 145 wide**; **z[+90, +165] → 76 deep**; centroid ≈ **(0, 128)**.
- Refutes the earlier "centroid (0,135), ~141 wide".
- Matches the original build record (145 × 76 at (0,128)) exactly, so the
  **build was correct and the first survey was not**.

*(Along x=0 the classifier reports built columns z90→195; the span beyond z165 is
the entrance drive's `smooth_stone`, not the Center. The x=±50 columns give the
clean building bound.)*

## Doc repoint status

`DEF-003` (home count unconfirmed) is now **closeable: the count is 12**.

Still to propagate into `planning/coordinates.yaml`, `planning/buildings.yaml`,
`planning/site-plan.md` and the three `integration/*` files: the west/east row
centres (**−34 / +32**, not ±85 GRID or ±116 OVAL) and the Guest Center centroid
and size (**(0,128), 145×76**). That mechanical propagation is **not yet done**.
