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

---

# ADDENDUM 3 — 2026-07-24 · surface-work build pass

Three items from the "not yet built" list are now built and probe-verified.

| Item | As-built | Verified |
|---|---|---|
| **Parking field (Z02)** | `x[-125,+125] z[+172,+268]`, paved y64 | 8/8 probes |
| **B03 Service Warehouse** | `x[-24,+23] z[-278,-232]`, 48×47, 8 tall | 4/4 probes |
| **B02 Retail & Cooking School** | `x[-133,-88] z[-118,-73]`, 46×46, 6 tall | 4/4 probes |

## Plan conflict found and resolved — parking vs Guest Center

`site-plan.md` Z02 specifies the parking box as `Z ∈ [+120, +235]`. The as-built
Guest Center occupies `z[+90, +165]`. **Those overlap by 45 blocks.**

The Z02 box was written against the GRID assumption that the Center sat at
**z75**; it was actually built at **z128**. Rather than pave over the Center, the
field was built **south of it**: `x[-125,+125] z[+172,+268]` = 251 × 97 =
**24,347 block² ≈ 97,400 ft²**, against the VERIFIED **~100,000 ft²** (REF-012) —
a ~2.6% shortfall, well inside the tolerance of a block-grid reconstruction.

Includes three double-loaded aisle centrelines (z +196 / +224 / +252), the x=0
entrance drive carried through the field, and a stone-brick kerb.

> **Honest limit:** the paved area and aisle structure exist; individual bays are
> **not striped to 236**. The VERIFIED figure that is satisfied is the *area*
> (~100,000 ft²), not the *count*. Do not claim 236 spaces from this build.

## B02 repointed as well as built

`coordinates.yaml` had B02 at `(-190, 64, -90)` — GRID-scheme spacing that assumed
homes on outer flanks at x±85. Per **OQ-3** (separate 8,342 SF structure, sited
against as-built street geometry) it was built at **(-110, 64, -95)**: west of
the west home row (which ends at x−52), on the z−95 lot line.

## Still not built

Interiors, landscaping/planting, the drop-off loop, the LED monument billboard,
porte-cochère, cul-de-sac terminus treatment, detention pond — and all of
Raven Rock beyond Cavern A.

---

# ADDENDUM 4 — 2026-07-24 · interior fit-out

## 12 homes — FITTED OUT (12/12 verified)

The shells are genuinely enclosed. A perimeter test on the west home at lot z−95
(expected `x[-52,-16] z[-110,-80]`) returned north 10/10, south 10/10, west 8/8,
east 7/8 solid at wall height — the single gap being the **street-facing door**,
centred on the lot z-centre. An earlier cross-section at exactly z−95 appeared to
show no east wall for precisely that reason; it was cutting through the doorway.

Each home received a two-storey domestic fit-out inside the existing shell:
oak ground floor, upper floor slab at **y70** with a stairwell void and staircase,
ground and upper partition walls with doorways, kitchen block (crafting table +
furnace), storage, a table-and-chairs set, a bed and bookshelf upstairs, and
hanging lanterns on both levels. **12/12 verified** on floor and upper-slab probes.

## Guest Center — ground floor fitted to the VERIFIED program

Zones laid to the documented program (REF-008 / REF-018):

| Zone | Extent | Area |
|---|---|---|
| MAIN Restaurant | `x[-70,-30] z[92,127]` | 1,476 blk² |
| Event hall | `x[30,70] z[92,127]` | 1,476 blk² |
| Furniture showroom | `x[-28,28] z[92,163]` | 4,104 blk² |
| T.E.D. distribution | `x[-70,-30] z[129,163]` | 1,435 blk² |
| Design studio | `x[30,70] z[129,163]` | 1,435 blk² |

Partition walls with doorways, central showroom left open, hanging lantern grid.
6/6 verification probes passed.

## ⚠️ New defect — DEF-007: the Guest Center is single-storey

The planned upper floor was **not** built, and deliberately so. Probing the
interior column at `(0, y, 128)` finds the first non-air block at **y70** — the
shell is clear only y65→y69. There is no headroom for a second storey, so the
pass skipped it rather than pour a slab into the underside of the roof.

This contradicts the **VERIFIED** "44,019 SF, **2 story**" fact. The footprint
corroborates it: 145 × 76 = 11,020 blk² ≈ **44,080 SF** — the whole two-storey
area built as **one** floor rather than two of ~22,010 SF.

This is a **shell** defect, not a fit-out defect. Filed as **DEF-007**.

---

# ADDENDUM 5 — 2026-07-24 · DEF-007 fixed, drop-off loop, landscaping

## DEF-007 RESOLVED — the Guest Center now has two storeys

Cleared the partial cap at y70, raised an upper shell **y70→y75**, laid a new
roof at **y76**, and put an oak floor at **y70** with a double-height showroom
void (`x[-20,20] z[110,145]`) edged by an oak-fence ring and reached by a stair.
Upper glazing and lighting added.

**Proof:** clear-air levels probed at `(-50, *, 110)` are now **y65–69 and
y71–75** — two distinct volumes with a floor between. Before the fix it was a
single y65–69 space.

Two build errors were caught by the post-build probes and fixed rather than left:

1. The solid-shell fill **overwrote the upper floor slab** — the floor was laid
   before the shell instead of after. Re-laid.
2. The mezzanine railing was placed as a **filled box**, backfilling the very
   void it was meant to edge. Rebuilt as a ring.

## Visitor drop-off loop — built, and repositioned

`site-plan.md` §3.2 puts the teardrop at **(0, +135), r≈22**. That is **inside**
the as-built Guest Center (`z[90,165]`) — the same GRID-era assumption (Center at
z75) that displaced the parking field. Built instead as a **teardrop at (0, 190),
r18** in the parking field's north bay, with a smooth-stone carriageway ring, a
grass island with planting, and a spine link north to the Center forecourt.

## Landscaping

**42 trees.** Street trees on both verges (`x = ±9`) at 25-block spacing from
z+50 to z−200, plus Z08 greenbelt planting along the z ±250 bands.

> The greenbelt planting **deliberately skips `|x| ≤ 15`** to keep the reserved
> **N3/N4 portal-approach corridors** clear, per Z08-R.

Also laid a forecourt lawn along the Center's south elevation.

## Still not built

LED monument billboard (**position undecided** — `coordinates.yaml` says
`(-260,64,280)`, `site-plan.md` says `≈(+95,+272)`), porte-cochère, cul-de-sac
terminus treatment, detention pond.
