# Ravensreach Public-Realm Masterplan

Date: 2026-07-26. Survey basis: fresh region snapshot (`data/worldsnap/region`, pulled this session), block census, and renders actually inspected. All coordinates are world block coordinates, Java 1.21.11 blocks only. **Trust this document over town.db and over the 2026-07-25 site brief where they disagree — several brief claims were wrong (see "Survey corrections" at the end).**

Operator's brief: *"the buildings dont connect, no common roads, paths, gardens."* Confirmed by survey: there is not one path block in the district (the only gravel is natural underground gravel at y62-63). This plan supplies the connective tissue: a road hierarchy, doorstep paths, gardens, plot boundaries, a civic heart, lighting, and a managed grove — as sequenced WorldEdit operations.

---

## 0. Ground truth (as surveyed)

- Ground surface block sits **at y67**; you walk at y68. All paving in this plan replaces the y67 block in place — **roads are flush, never raised, never trenched.**
- Plaza: intact stone_bricks slab at y67. True extent: **x[-105,-65] z[-395,-373], widening east to x-63 for z[-372,-353]** (east edge is ragged; south-east corner reaches x-63). One hole cluster (grass) at x[-79,-71] z[-394,-386], ~30 cells, plus ~20 scattered grass/dirt cells.
- Town hall x[-98,-72] z[-381,-368] stands (grey stone, dark roof, south clock tower, polished_andesite floor at y67 spanning x[-97,-73] z[-381,-369]). Double door south at (-86..-85, -369). **It is being redesigned/enlarged by another agent — treat x[-102,-68] z[-385,-364] as a reserve. No permanent work of ours inside that box.** There is construction staging clutter (beams, material dumps) on the plaza east of the hall, roughly x[-72,-58] z[-390,-360]: census any box there for non-ground blocks before building and leave the clutter to the hall team.
- Well kiosk: x[-85,-81] z[-359,-357], sits on the plaza. Do not touch.
- Doors (bottom half at y68 — every doorstep path in this plan lands on these):
  - Architect (-118, -370), faces south
  - Steward (-112, -340), faces south (away from plaza, toward the grove)
  - Scout (-58, -340), faces south
  - Mason (-52, -370), faces south
  - Surveyor (-85, -400), faces south (onto the plaza across 4 blocks of grass)
  - Town hall (-86..-85, -369), faces south
  - Storehouse (-85, -408), faces south **and is bricked shut in effect — see flag F1**
- Storehouse x[-95,-75] z[-420,-408]: stone_bricks, flat smooth-stone roof at y74. North, east and west walls have **no opening at all**; the only door opens into the Surveyor cottage's cobblestone north wall one block away.
- Northern mine: stone-brick collar x[-89,-81] z[-444,-436] with an internal ramp entered from the **south** side. The mine yard is at **y63**. Between district and yard: y67 to z-420, y66 shelf z[-421,-424], then a 3-block drop to y63 at z-425/-426.
- Pond ("the lake that floods the plaza's east corner"): a surface pool, water at y67, roughly x[-62,-56] z[-368,-358], touching the plaza's SE edge (plaza stone to x-63 there). North of it a **dry** hand-dug channel x[-62,-61] z[-385,-369], 1 deep. There is no large lake east of the district (checked to x=-5: 15 scattered water blocks only).
- Terrain defects (all 1 block deep unless noted — far more than the "two low columns" in the brief):
  - T1: trench x[-109,-108] z[-378,-353]
  - T2: trench x[-119,-108] z[-367,-366]
  - T3: low patch x[-119,-102] z[-355,-353]
  - T4: trench x[-74,-73] z[-420,-407] plus x[-76,-73] z[-407,-406] (east of storehouse)
  - T5: 1-wide trench x=-103, z[-352,-338]
  - T6: dry channel x[-62,-61] z[-385,-369] (a few cells 2-4 deep) and low band x[-61,-50] z[-385,-383]
  - T7: low patch x[-48,-47] z[-359,-346]
  - T8: plaza grass holes (above)
  - T9: high ground bands at y68: ridge x[-126,-108] z[-385,-383]; single column line x=-66 z[-354,-338]; rising ground x[-62,-45] z[-360,-338] (SE, natural, mostly kept)
  - T10: bare dirt (no grass) surfaces around the pond's south side and Scout's north side, ~x[-63,-45] z[-358,-350]
- Oak grove x[-125,-95] z[-332,-314], 8 standing trees, ground rises y68-69. Treated as a **coppice crop**, not scenery.
- Unlisted but real, south-east: a work-camp x[-67,-45] z[-337,-333] (hay bales, barrels, smokers, campfires, anvil, its own dirt-path scraps). Grove Lane deliberately terminates at its NW corner.
- WorldGuard denies mob spawning in the region: lighting below is for legibility and atmosphere.

### Execution safety rule (non-negotiable)

A previous grading pass destroyed a road because it used blanket fills. **Every op below is a masked `//replace`, never `//set`, unless it operates on a box that is verified empty air.** Ground ops may only consume this allowlist:

```
NATURAL := grass_block,dirt,short_grass,tall_grass,dandelion,poppy,oxeye_daisy,azure_bluet,leaf_litter,bush,air
```

Never replace: stone_bricks, polished_andesite, smooth_stone, cobblestone, any spruce_* block, glass_pane, chest, barrel, furnace, crafting_table, lantern, torch, water — except where an op explicitly names them (plaza patch, andesite walk, well ring, pond plank crossing). Structures each op must not touch are listed per op. Once gravel is laid it joins the protected set for all later ops.

---

## 1. Road & path hierarchy

Three tiers, all surface-flush at the local ground level:

| Tier | Width | Material | Routes |
|---|---|---|---|
| Main street | 3 | gravel | High Street (E-W through the plaza frontage), Mine Road (N-S) |
| Lane | 2 | gravel | Grove Lane (E-W south), Steward Path, Scout Path (N-S connectors) |
| Doorstep | 2-3 | gravel | Surveyor doorstep, Grove Path + landing |

The plaza itself is the middle segment of High Street — no gravel is laid on plaza stone. Every building connects: Architect → High St W; Hall → plaza; Mason → High St E; Surveyor → doorstep pad → plaza; Steward and Scout → Grove Lane (their doors face south) via the two N-S connectors to the plaza; storehouse → Mine Road runs flush along its east wall (see flag F1 for its door); mine → Mine Road; grove and work-camp → Grove Lane.

Named routes (fill regions in §7):

- **High Street West** — x[-119,-106] z[-369,-367], y67. Serves Architect door (-118,-369 doorstep cell). Ends against plaza west edge (x-105 col is grass verge; plaza starts x-105 — the 1-block verge col x-105 at z[-369,-367] is included in the T-junction pad of Steward Path).
- **High Street East** — x[-64,-47] z[-369,-367], y67. Serves Mason door (-52,-369). Where the box crosses pond water (x[-62,-59], z[-368,-367], ~5 cells), water is replaced with **spruce_planks** at y67 — a plank culvert crossing, the pond's head becomes z≤-366.
- **Mine Road** — x[-74,-72]: z[-395,-420] at y67 (meets plaza NE pavement at z-395, absorbs T4), z[-421,-424] at y66, z-425 at y65 (cut), z-426 at y64 (fill one), z[-427,-434] at y63; then **Mine Apron** x[-88,-72] z[-435,-433] at y63, landing at the collar's south ramp. Each 1-block level change is a clean walkable step.
- **Grove Lane** — x[-119,-49] z[-339,-338], y67. Runs along the south doorsteps of Steward (-112,-339) and Scout (-58,-339), past the grove turn-off at x-104/-103, ending at the work-camp NW corner.
- **Steward Path** — x[-105,-104] z[-367,-339], y67. Connects High St W junction to Grove Lane, passing 1 block east of Steward cottage. Absorbs T5's neighbour line; T3 must be filled first.
- **Scout Path** — x[-67,-65] z[-356,-339], y67. Connects plaza SE pavement (mask lets it butt cleanly against the stone at z-356..-353) to Grove Lane, 1 block west of Scout cottage. Requires the x-66 high-column cut (T9).
- **Surveyor doorstep** — x[-86,-84] z[-399,-396], y67 (door to plaza).
- **Grove Path** — x[-104,-103]: z[-337,-335] at y67, z[-334,-333] at y68 (one step up); then **Grove Landing** x[-108,-100] z[-332,-330] at y68 — the woodcutters' log-staging pad at the grove gate.

## 2. Civic heart (plaza · hall · well · market · pond)

The composition: the hall's south doors open onto a short ceremonial walk that runs past the well to the plaza's south edge; the market row sits east of the well facing that walk; the pond becomes a formal stone-edged basin with a deck; the whole east edge of the plaza reads as a small waterfront.

- **C1 Axis walk**: polished_andesite 3-wide, x[-88,-86] z[-363,-356], replacing plaza stone_bricks at y67. (Starts at z-363 to stay out of the hall reserve; the z[-368,-364] continuation is deferred — flag F2.)
- **C2 Well ring**: smooth_stone 1-wide ring in the plaza around the well kiosk: perimeter cells of x[-86,-80] z[-360,-356] (20 cells), replace stone_bricks only, never a block under/of the well itself.
- **C3 Market row**: three stalls on the plaza at z[-359,-358], footprints x[-78,-76], x[-73,-71], x[-68,-66]. Per stall (built on top of plaza stone, no ground change): 4 spruce_fence posts y68 at corners; spruce_slab canopy 3×2 at y70; 2 barrels y68 on the middle back cells; 1 lantern hanging y69 under the canopy centre. Fronts face north toward the well.
- **C4 Planter beds** (2): x[-92,-90] z[-363,-361] and x[-83,-81] z[-363,-361]. y67: replace stone_bricks → grass_block (9 cells each). y68: perimeter 8 cells `oak_leaves[persistent=true]` (the blockstate is mandatory or the hedges decay), centre cell cobblestone_wall with lantern at y69.
- **C5 Pond basin**: within x[-63,-55] z[-368,-357], set every **land cell (grass/dirt) that is 4-adjacent to y67 water** to stone_bricks at y67 (~26 cells; the plaza already provides the west coping). Deck: spruce_planks y67 at x[-56,-55] z[-364,-362] (replace grass/dirt/water), spruce_fence + lantern at (-55,-364) and (-55,-362). Bench: spruce_stairs[facing=east] y68 at (-63,-363) and (-63,-362) on the plaza edge, looking over the water.
- **C6 Plaza repair**: patch T8 — see op 1.8.

## 3. Kitchen gardens & planting

Uniform module: fence ring at y68 on the plot perimeter with one spruce_fence_gate; interior farmland at y67 carrying crops at y68; named water cells at y67 keep all farmland within 4 blocks (verified per plot below). Composter on one interior corner. Doors all face south, so gardens sit behind/beside cottages — they are tending plots, not entrances.

- **G1 Architect garden** x[-124,-113] z[-385,-382] (cut into the T9 ridge toe first — op 1.9a). Fence ring, gate at (-118,-382). Interior x[-123,-114] z[-384,-383]: water at (-121,-383) and (-116,-383); remaining interior farmland — wheat on z-384, potatoes on z-383. Composter at (-114,-383) (y67 dirt, y68 composter).
- **G2 Steward garden** x[-117,-108] z[-355,-352] (T3 filled first). Gate (-112,-352). Interior x[-116,-109] z[-354,-353]: water (-115,-354), (-110,-354); crops beetroot z-354 remainder, wheat z-353.
- **G3 Scout garden** x[-63,-56] z[-355,-352] (T10 regreened first). Gate (-59,-352). Interior x[-62,-57] z[-354,-353]: water (-60,-354); carrots elsewhere.
- **G4 Mason garden** x[-57,-48] z[-385,-382] (T6 band filled first). Gate (-52,-382). Interior x[-56,-49] z[-384,-383]: water (-54,-384), (-51,-383); wheat z-384, carrots z-383.
- **G5 Surveyor flower verge**: on grass at y68, plant poppy/azure_bluet/oxeye_daisy alternating along x[-91,-87] z-399 and x[-83,-79] z-399, flanking the doorstep pad.
- **Ornamental core**: the two C4 hedge planters (poppy + oxeye_daisy + dandelion mix on their non-centre interior... all 9 y67 cells are grass; plant flowers on the 8 ring cells' inner faces is impossible — plant flowers at y68 on any grass cell not occupied by hedge or the lantern post: none remain in a 3×3 with 8 hedge + 1 post, so the hedge ring itself is the ornament; if a softer look is wanted, drop the hedge to 6 cells leaving the two mid-side cells open and plant flowers there).

## 4. Plot definition (parcels)

Three-sided backdrop fences (spruce_fence at y68 on grass); the street itself is always the fourth, open, side. Fences go in after all paving (masks protect gravel anyway). Gates only where a fence line crosses a natural walking desire-line.

- **P1 Architect parcel**: fence x=-126 z[-386,-370]; z=-386 x[-126,-110]; x=-110 z[-386,-371]; gate at (-110,-375). Open to High St W.
- **P2 Steward parcel**: fence x=-120 z[-356,-339]; z=-356 x[-120,-107]. East side is defined by Steward Path, south by Grove Lane — open.
- **P3 Scout parcel**: fence z=-356 x[-64,-50]; x=-50 z[-356,-339]. West side is Scout Path, south is Grove Lane — open.
- **P4 Mason parcel**: fence z=-386 x[-58,-45]; x=-45 z[-386,-371]. West side is the pond/plaza waterfront — open.
- **Surveyor**: no fence (it sits in the civic block between plaza and storehouse); its identity comes from doorstep + flower verge.

Fence runs skip any cell that is not NATURAL at y68 (never delete a structure block to place a fence).

## 5. Lighting

Standard post = cobblestone_wall at (ground+1) + lantern above (on y66 ground: wall y67, lantern y68; on y63 ground: wall y64, lantern y65; default ground y67: wall y68, lantern y69). ~8-block rhythm on routes, corners of civic space. All posts sit on grass/gravel/plaza cells; if a listed cell turns out occupied, shift ±1 block rather than deleting anything.

Plaza corners: (-104,-394) (-66,-394) (-104,-356)
Axis walk: (-89,-362) (-89,-358)
High St W (south verge z-366): (-117,-366) (-107,-366)
High St E (south verge z-366): (-53,-366) (-47,-366)
Surveyor doorstep: (-87,-397) (-83,-397)
Mine Road (east verge x-71): (-71,-400) (-71,-408) (-71,-416); (-71,-423) on y66 ground; (-71,-430) on y63 ground; apron north verge: (-86,-432) (-80,-432) on y63 ground
Steward Path (east verge): (-103,-352) (-103,-344)
Scout Path (west verge): (-68,-352) (-68,-344)
Grove Lane (south verge z-337): (-115,-337) (-107,-337) (-99,-337) (-91,-337) (-83,-337) (-75,-337)
Grove Landing (y68 ground → wall y69, lantern y70): (-108,-330) (-100,-330)
Pond deck: spruce_fence+lantern pair listed in C5.

Total 27 posts + 2 deck = ~58 blocks.

## 6. The grove as a crop

- **Fence face**: spruce_fence y68 along z=-333, x[-125,-95], with a 2-wide gap (spruce_fence_gate ×2) at x[-104,-103] where Grove Path arrives. Sides stay open for bot access. Skip cells occupied by trunks/non-natural blocks.
- **Replanting grid**: oak_sapling at the 15 grid points x ∈ {-123,-117,-111,-105,-99} × z ∈ {-328,-322,-316}, placed on the local surface (y68 or y69 — probe each column), **skipping any point within 2 blocks of a standing trunk**. With the 8 survivors this restores ~17+ stems and gives the fleet a legible replant pattern: harvested stump → nearest grid point gets a sapling.
- **Landing**: the gravel pad (§1) is the log-staging point; the two landing lanterns mark it. Optional (not costed): a log rack of 2×spruce_fence + 4×oak_log stack at x[-102,-101] z[-331,-330].

---

## 7. BUILD ORDER — WorldEdit fill regions

Run phases strictly in order; within a phase, ops are independent. Format: `x1 y1 z1 → x2 y2 z2 : operation`. "NATURAL" = allowlist in §0. Counts are upper bounds (masked replaces consume fewer).

### Phase 1 — terrain repair (touch nothing but NATURAL; keep clear of: all cottage walls, storehouse, plaza stone, well, pond water except where named)

| # | Region | Op | ≤ blocks |
|---|---|---|---|
| 1.1 | -109 67 -378 → -108 67 -353 | replace air→grass_block (T1) | 52 |
| 1.2 | -119 67 -367 → -108 67 -366 | replace air→grass_block (T2) | 24 |
| 1.3 | -119 67 -355 → -102 67 -353 | replace air→grass_block (T3) | 54 |
| 1.4 | -76 67 -420 → -72 67 -406 | replace air→grass_block (T4; x-72/-75 cols mostly solid already) | 75 |
| 1.5 | -103 67 -352 → -103 67 -338 | replace air→grass_block (T5) | 15 |
| 1.6a | -62 63 -385 → -57 66 -369 | replace air→dirt (deep cells of dry channel; **do not include z≤-368 — that is pond**) | 30 |
| 1.6b | -62 67 -385 → -50 67 -369 | replace air→grass_block (T6 channel + low band; z≥-385 only, stops north of pond) | 90 |
| 1.7 | -48 67 -359 → -47 67 -346 | replace air→grass_block (T7) | 28 |
| 1.8 | -105 67 -395 → -65 67 -355 | replace grass_block,dirt→stone_bricks (T8 plaza patch; andesite floor untouched by mask; **do not extend box beyond these bounds**) | 55 |
| 1.9a | -124 68 -385 → -113 70 -382 | replace NATURAL-minus-air→air (ridge cut for G1), then -124 67 -385 → -113 67 -382 replace dirt,air→grass_block | 48+48 |
| 1.9b | -67 68 -356 → -65 70 -339 | replace NATURAL-minus-air→air (x-66 column cut for Scout Path) | 20 |
| 1.9c | -67 68 -339 → -63 69 -338 | replace NATURAL-minus-air→air (Grove Lane east cut) | 12 |
| 1.10 | -63 67 -358 → -45 67 -350 | replace dirt→grass_block (T10 regreen; skip if a later op paves it) | 90 |

### Phase 2 — paving (replace NATURAL→gravel at the stated y; also clear plants: same box at y+1, replace short_grass,tall_grass,dandelion,poppy,oxeye_daisy,azure_bluet→air. Must not touch: any cottage/hall/storehouse block, plaza stone except butting against it, well, fences—none exist yet)

| # | Region | Op | ≤ blocks |
|---|---|---|---|
| 2.1 | -119 67 -369 → -106 67 -367 | NATURAL→gravel (High St W) | 42 |
| 2.2 | -64 67 -369 → -47 67 -367 | NATURAL→gravel; then -62 67 -369 → -59 67 -367 replace water→spruce_planks (culvert) | 54+8 |
| 2.3 | -74 67 -420 → -72 67 -395 | NATURAL→gravel (Mine Rd level run; z-395 row butts plaza stone via mask) | 78 |
| 2.4a | -74 66 -424 → -72 66 -421 | NATURAL→gravel (shelf; surface is y66 here) | 12 |
| 2.4b | -74 66 -425 → -72 66 -425 | replace NATURAL-minus-air→air, then -74 65 -425 → -72 65 -425 NATURAL→gravel (step cut) | 3+3 |
| 2.4c | -74 64 -426 → -72 64 -426 | replace air→gravel (step fill; y63 dirt below stays) | 3 |
| 2.4d | -74 63 -434 → -72 63 -427 | NATURAL→gravel | 24 |
| 2.5 | -88 63 -435 → -72 63 -433 | NATURAL→gravel (Mine Apron) | 51 |
| 2.6 | -119 67 -339 → -49 67 -338 | NATURAL→gravel (Grove Lane) | 142 |
| 2.7 | -105 67 -367 → -104 67 -339 | NATURAL→gravel (Steward Path) | 58 |
| 2.8 | -67 67 -356 → -65 67 -339 | NATURAL→gravel (Scout Path) | 54 |
| 2.9 | -86 67 -399 → -84 67 -396 | NATURAL→gravel (Surveyor doorstep) | 12 |
| 2.10 | -104 67 -337 → -103 67 -335 | NATURAL→gravel; -104 68 -334 → -103 68 -333 NATURAL→gravel (Grove Path + step) | 6+4 |
| 2.11 | -108 69 -332 → -100 69 -330 | replace NATURAL-minus-air→air (flatten), then -108 68 -332 → -100 68 -330 NATURAL→gravel; then same box y67 replace air→dirt (underpin) | 27×3 |

### Phase 3 — civic (explicitly touches plaza stone where stated; must not touch: hall reserve x[-102,-68] z[-385,-364], well blocks, staging clutter)

| # | Region | Op | blocks |
|---|---|---|---|
| 3.1 | -88 67 -363 → -86 67 -356 | replace stone_bricks→polished_andesite (C1) | 24 |
| 3.2 | perimeter cells of -86 67 -360 → -80 67 -356 | replace stone_bricks→smooth_stone (C2) | 20 |
| 3.3 | C3 stalls | per-block placement as specified in §2-C3 | ~45 |
| 3.4 | -92 67 -363 → -90 67 -361 and -83 67 -363 → -81 67 -361 | replace stone_bricks→grass_block; then y68 hedge ring oak_leaves[persistent=true] (8/bed), centre cobblestone_wall y68 + lantern y69 | 18+20 |
| 3.5 | C5 pond | coping + deck + bench per §2-C5 (water-adjacency rule) | ~38 |

### Phase 4 — gardens (fences/gates y68, farmland/water y67, crops y68, per §3; place farmland with `//replace grass_block,dirt farmland` inside interior boxes minus water cells, then water, then crops `wheat[age=0]` etc.)

| # | Plot | blocks |
|---|---|---|
| 4.1 | G1 Architect | ~60 |
| 4.2 | G2 Steward | ~52 |
| 4.3 | G3 Scout | ~44 |
| 4.4 | G4 Mason | ~52 |
| 4.5 | G5 flower verge | 10 |

### Phase 5 — parcel fences (spruce_fence y68 on NATURAL cells only, per §4) — ~120 fence + 1 gate

### Phase 6 — lighting (§5) — ~58 blocks. Posts on gravel or grass; never delete anything to place one.

### Phase 7 — grove (§6): fence face ~29 + 2 gates; 15 oak_sapling; optional log rack.

Total placed material (upper bound): gravel ~570 · grass_block ~430 (fills) · dirt ~110 · stone_bricks ~85 · polished_andesite 24 · smooth_stone 20 · spruce_planks ~16 · spruce_fence ~165 · gates 7 · cobblestone_wall ~30 · lantern ~34 · farmland ~60 · crops ~55 · water 7 · oak_leaves 16 · oak_sapling 15 · flowers ~25 · barrels 6 · spruce_slab 18 · spruce_stairs 2 · composter 4.

Sequencing guarantees: Phase 1 only adds ground where there is air or swaps dirt→grass (nothing later is present); Phase 2 paves over Phase-1 ground (masks cannot touch buildings, and cannot touch each other's gravel destructively since gravel→gravel is a no-op and gravel is off the allowlist); Phases 3-7 only add blocks on top of finished ground or swap plaza stone in bounded boxes. No op overwrites a prior op's output.

---

## 8. Flags — determined facts and open items (do not guess past these)

- **F1 Storehouse is sealed.** All four walls solid stone_bricks at y68-69 except a south door at (-85,-408) that opens into the Surveyor cottage's north wall (cobble at z-407..-406, x[-91,-79] — zero-gap back-to-back build). Recommendation for the **buildings team** (out of scope for ground works): cut a 1×2 door in the east wall at (-75, y68-69, -414), which opens directly onto Mine Road. Until then the storehouse is decorative.
- **F2 Hall reserve.** Hall redesign in progress; reserve x[-102,-68] z[-385,-364]. Deferred until the new footprint is final: the axis-walk continuation z[-368,-364]; hall-frontage lanterns; any market expansion. The construction staging clutter east of the hall (≈x[-72,-58] z[-390,-360]) is the hall team's to clear; ops 3.3/3.5/2.2 should be preceded by a quick census of their boxes and skip any non-ground block found.
- **F3 Site brief corrections** (survey vs. 2026-07-25 brief): "two columns sit 1 low" is wrong — ~300 low cells in eight distinct defects (T1-T8); "lake to the east" is a y67 surface pool plus a dry dug channel, no large lake east to x=-5; the plaza brief extent x[-105,-65] z[-395,-355] is right for the main slab but the pavement actually reaches x-63 in the south-east; Steward's and Scout's doors face **away** from the plaza (south), which this plan turns into a feature via Grove Lane.
- **F4 Floating debris** was visible in renders NE of the hall tower and near the spire (scaffolding leftovers in the air). Out of scope here; `scripts/find_floating.mjs` exists for exactly this.
- **F5 Work-camp** x[-67,-45] z[-337,-333] and a red/white striped tower further south-east are real, unlisted structures. Grove Lane's east terminus at the camp corner is intentional; nothing in this plan modifies either.
- **F6 Mine-collar ramp orientation** was confirmed visually (south entry) but its exact opening columns were not probed; the apron (2.5) is wide enough (x[-88,-72]) that any south-face opening is served.
- **F7 Grove surface** is uneven (y67-69); Grove Landing op 2.11 includes its own flatten. Sapling placement must probe each column's surface rather than assume y68.

## 9. Renders inspected (in scratchpad, this session)

overview_south, topdown (orientation calibrated against known coordinates), ob_from_south/north/east/west (hall + tower standing, cottages, storehouse roof, staging clutter, floating debris), v_plaza_north (well kiosk + hall frontage at eye level), v_east_pool (pond against Mason's frontage), v_west_lane (T9 ridge bank blocking the west lane line — resolved by G1 cut + keeping the rest as backdrop berm), v_mine_yard (collar, south ramp, y63 yard, storehouse north face), v_grove (canopy density, rising ground), v_north_mine2 (storehouse roof mast, drop-off).
