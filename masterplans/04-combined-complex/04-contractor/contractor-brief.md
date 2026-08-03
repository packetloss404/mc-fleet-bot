# Contractor Brief — The Combined Complex (No-Ravine Rework)

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Build:** 04 — Combined Complex (Cheyenne Mountain Complex + SubTropolis + Houston Tunnel System)
**Author role:** AI Contractor Writer
**Date:** 2026 (rework)
**Version:** 2.0 — **no-ravine design**
**Status:** Binding build spec for the integration layer.

> **REWORK NOTE.** This brief is a re-run. The user has **dropped the V-shaped ravine** from the combined complex design. The mountain is now **ONE CONTINUOUS mountain range** with a **HORIZONTAL granite-limestone contact at Y = 200** (real geology: granite plutons push up through limestone in mountain ranges worldwide). The composite terrane plaque has moved from the (deleted) ravine bottom to the **service tunnel contact crossing at (−40, 200, −360)**, where it is geologically honest. The Grand Avenue is a straight line in the coastal plain (no ravine to span). The return route is **funicular + road** (no skybridge, no ravine to cross). The service tunnel is now an **ascending inclined minecart bore** through the mountain, climbing from Y = 0 at the SubTropolis end to Y = 200 at the Cheyenne end on a **3.33:1 grade**. All 9 easter eggs survive; only the "ravine bottom plaque" specific placement is removed. The 6 centerpieces + 1 new 7th (Summit Observation Platform) are preserved. **Read this brief top-to-bottom before placing any blocks.**

---

## 1. Project Header

| Field | Value |
|---|---|
| **Build name** | Combined Complex (no-ravine rework) |
| **Build ID** | `04-combined-complex` |
| **Version** | 2.0 |
| **Global scale** | **1 block = 1 meter** everywhere (Discussion Decision 1) |
| **Vertical exception** | Granite peak at Y = 800 represents a 2:1 vertical compression of the real 2,915 m Pikes Peak (consistent with the 01-masterplan's 1,450-block mountain). All other dimensions are 1:1 against real-world references. |
| **World footprint** | 1,500 × 1,500 horizontal × 800 vertical (Y = 0 to 800, with the build extending to Y = −100 below the city to host SubTropolis) |
| **Build height required** | ≥ 1,024 blocks |
| **Build height recommended** | ≥ 2,048 blocks |
| **Mod** | **CubicWorld** (or equivalent with ≥ 2,048-block build height). Vanilla 384 is **insufficient**. |
| **Render distance** | view-distance 16 chunks, simulation-distance 12 chunks (recommended) |
| **World type** | Custom (flat at Y = 0; mountain, city, and coastal plain carved in) |
| **Predecessor briefs** | 3 individual site briefs exist at `01-cheyenne-mountain-complex/04-contractor/`, `02-subtropolis/04-contractor/`, `03-houston-tunnel-system/04-contractor/`. **This brief is the integration layer** — read the 3 predecessor briefs for in-site geometry, then use THIS brief for the world envelope, the inter-site connections, the centerpieces, and the easter eggs. |

**This brief covers the integration layer only.** It is the *adhesive* between the 3 sites. Internal geometry of the Cheyenne chamber (1,319 springs, 15 buildings, J-curve), the SubTropolis pillar grid (200 × 200, 5×5 spec), and the Houston tunnel sample (24 blocks) is owned by the 01–03 briefs and is **not** re-specified here.

**The 3 individual site masterplans already exist in:**
- `D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\`
- `D:\projects\mc-fleet-bot\masterplans\02-subtropolis\`
- `D:\projects\mc-fleet-bot\masterplans\03-houston-tunnel-system\`

**The combined complex is now ONE CONTINUOUS mountain with a HORIZONTAL granite-limestone contact at Y = 200, NOT two peaks with a ravine between them.**

---

## 2. Build Targets

### 2.1 Block budget (rough count by phase)

| Phase | New blocks | Source / notes |
|---|---|---|
| **1 — Site prep** | ~50,000 | working-plan §2 |
| **2 — Continuous mountain + contact ring** | ~1,650,000 | 700k granite + 950k limestone (no ravine to carve out) |
| **3 — City + Houston tunnel** | ~1,250,000 | 1,200,000 city + 50,000 tunnel |
| **4 — SubTropolis (chamber + sub-basement + horizontal portal)** | ~800,000 | inherited from 02-masterplan |
| **5 — Cheyenne (chamber + J-curve + outer portal)** | ~580,000 | inherited from 01-masterplan |
| **6 — Public shaft (vertical centerpiece)** | ~5,000 | new schematic piece |
| **7 — Service tunnel (horizontal centerpiece)** | ~4,000 | new schematic piece, 120 blocks |
| **8 — 25-ton blast door + composite terrane plaque** | ~1,000 | centerpieces finalized |
| **9 — Funicular + summit road (return route)** | ~15,000 | ~10k funicular rail + ~5k road switchback |
| **10 — Summit observation platform (new 7th centerpiece)** | ~500 | wooden platform + 360° view |
| **11 — Finishing (easter eggs + lighting + signage)** | ~5,000 | 9 easter eggs, lighting tune, polish |
| **Subtotal — combined complex** | **~3,560,000** | sum of all phases |

> The development plan's consolidated total is **~3.4M blocks for v2.0** (development-plan §2.6). The 3.6M figure above is the working-plan's per-phase sum. The two converge on the same order of magnitude. The 3 individual site masterplans add another ~2.1M, but those are **already in scope of the 01/02/03 briefs** — this brief only counts the integration layer (~1.5M new blocks).

### 2.2 Time estimate

- **Per phase:** see working-plan §2.
- **Total integration layer (phases 1–11):** ~60–90 hours of build time (≈ 60% bot, 40% human).
- **Calendar time at 4 hr/day:** 3–4 weeks for the full v2.0 build.
- **MVP (v0.1 "The World") only:** 20–30 hours / ~1 week. The MVP is the continuous mountain, the city, the coastal plain, the summit station, and the surface contact ring. **No public shaft, no service tunnel, no plaque** in the MVP — those arrive in v1.5.

### 2.3 Render distance / performance expectations

- **view-distance:** 16 chunks (256 blocks) recommended.
- **simulation-distance:** 12 chunks (192 blocks) recommended.
- **World size:** 1,500 × 1,500 = ~93 × 93 chunks at 16-block chunks. Loaded chunks at view-distance 16: ~32 × 32 = 1,024 chunks. **Manageable on standard hardware.**
- **Build height:** requires CubicWorld. The build uses Y = −100 to Y = 800. First-spawn world load: 30–60 s.
- **Fully-built core samples** (per Discussion Decision 1 — only the *fully built* zone loads heavily):
  - The public shaft (7×7 × 100)
  - The SubTropolis chamber (200 × 200)
  - The SubTropolis horizontal portal
  - The service tunnel (6×6 × 120, including the contact crossing alcove)
  - The Cheyenne J-curve + chamber
  - The Houston tunnel 24-block sample
  - The remaining mountain zones (outer granite/limestone mass) are *referenced in silhouette and lore* — light placeholders, not full detail.

### 2.4 Quality acceptance criteria

A successful build:
1. **Silhouette reads from 1 mile away:** ONE continuous mountain with a pink-grey granite cap above the contact at Y = 200, cream-grey limestone below. **No V-notch, no ravine, no two-peak split.**
2. **The horizontal contact at Y = 200 is visible** as a 1–2 block color-change ring on the mountain's south face for the full 800-block E–W extent.
3. **The 7 centerpieces are all present at their exact coordinates** (25-ton blast door, mid-landing, composite terrane plaque, surface pavilion, SubTropolis horizontal portal, Cheyenne outer portal, summit observation platform).
4. **The 9 easter eggs are all findable** but not all on the main path.
5. **The full visitor journey** (coastal plain → Grand Avenue → city → public shaft → SubTropolis → service tunnel → blast door → J-curve → chamber) is **traversable in 30–45 minutes** of focused play.
6. **The 2-mode return** (funicular → granite summit → summit road → city plaza) takes **~13 minutes**.
7. **The service tunnel walls visibly transition** from cream limestone to pink granite at the contact crossing, with the breccia strip on the floor.
8. **The public shaft lighting visibly transitions** from cool blue/gray (concrete, top) to warm cream (calcite, bottom) over 100 blocks.
9. **The 25-ton blast door is visible from the approaching minecart** at the end of the service tunnel (the door grows from a 1-block dark patch to a wall of iron).
10. **The composite terrane plaque is readable** at the service tunnel contact crossing at (−40, 200, −360) — geologically honest (at a real geological boundary, not narrative fiction).

---

## 3. Coordinate System

| Item | Value |
|---|---|
| **World origin (0, 0, 0)** | Center of the city, at ground level (street grade). |
| **Compass** | **north = −Z**, east = +X, up = +Y (Minecraft convention). |
| **Mountain range** | North (Z = −800 to −200), 800 × 600 horizontal footprint. |
| **City** | Centered on origin (X = −69 to +69, Z = −69 to +69), 138 m × 138 m. |
| **Coastal plain** | East and south (X = +200 to +750, Z = +100 to +700). |
| **Build Y range** | Y = −100 (SubTropolis floor) to Y = 800 (granite peak summit). |
| **Horizontal contact** | Y = 200 (binding — the granite-limestone contact across the entire mountain). |
| **Reading coordinate tables** | All values in blocks. `(x, y, z)` = `(east, up, north-as-negative)`. |

> **Contract (write this down before placing the first block):** The X axis is east-west (positive east), the Z axis is north-south (positive south = +Z, north = −Z), the Y axis is up. The mountain range is **north** (negative Z). The coastal plain is **south and east**. The city is **at the origin**. The SubTropolis is **below the city** (Y = −100 to Y = 0). The Cheyenne chamber is **inside the granite at Y = 250–400**. The horizontal contact is **at Y = 200** — a single fixed Y across the entire mountain, no exceptions. **An off-by-1-block is a defect. An off-by-axis is a disaster.**

### 3.1 The 5 horizontal zones (top to bottom in the mountain)

| Zone | Y range | Block / material | Notes |
|---|---|---|---|
| **Granite peak** | Y = 200 to Y = 800 | Polished diorite, diorite, granite, granite bricks | Pink-grey Pikes Peak syenogranite (1.08 Ga). Spruce + dark-oak forest on lower slopes, snow line Y = 700 to 800, antenna arrays on ridgeline, summit station + observation platform at (0, 800, −500). |
| **Contact crossing band** | Y = 199 to Y = 201 (1–2 block transition) | Mixed cobblestone + calcite + diorite (breccia) at the surface; polished diorite over smooth stone in tunnel walls | The geological signature. Visible as a horizontal ring on the south face. Crossed by the service tunnel at (−40, 200, −360) where the composite terrane plaque lives. |
| **Limestone body** | Y = 0 to Y = 200 | Smooth stone (cream-grey Bethany Falls limestone, 270 Ma), calcite, sandstone | Visible on the south face. The SubTropolis horizontal portal is at the limestone base (Y = 0, Z = −300). The Cheyenne outer portal is at the contact elevation (Y = 200, Z = −420). |
| **City** | Y = 0 to Y = 80 (tower top) | Stone brick, quartz, glass, white concrete | 138 × 138 m Houston-style downtown centered on origin. Towers 30–80 blocks tall. Public shaft descent at (60, 0, −70). |
| **Coastal plain** | Y = 0 to Y = 5 | Grass, sand, oak/birch saplings | The flat, sparse grassland south and east of the city. The Grand Avenue runs N–S at X = +69. World-edge pier at (0, 0, 720). |

### 3.2 The 5 horizontal zones (subterranean — the descent)

| Zone | Y range | Block / material | Notes |
|---|---|---|---|
| **Houston tunnel** | Y = −6 to Y = 0 | White concrete, white wool, smooth stone slab | 24-block sample, 6 blocks below street grade. 03-masterplan. |
| **Public shaft** | Y = 0 to Y = −100 | Gray concrete (top) → smooth stone → calcite (bottom) | 7×7 cross-section, 100 blocks. Vertical centerpiece. |
| **SubTropolis chamber** | Y = −100 to Y = 0 | Smooth stone walls, white concrete pillars, asphalt floor | 200 × 200 × 100 blocks. 02-masterplan. |
| **SubTropolis sub-basement** | Y = −130 to Y = −150 | Smooth stone walls, stone brick slab floor, redstone lamp lighting | 100 × 100 × 30. Service tunnel gate at NW corner. |
| **Service tunnel** | Y = 0 to Y = 200 (climbing) | Smooth stone (limestone section) → polished diorite (granite section) | 6×6 cross-section, 120 blocks, 3.33:1 grade, minecart rail. |
| **Cheyenne chamber** | Y = 250 to Y = 400 | Polished diorite walls, gray concrete floor | ~80 × 80 × 150 blocks. 1,319 springs + 15 buildings. 01-masterplan. |

---

## 4. Phase 1 — Site Prep

**Goal:** Establish the world footprint, the sky limit, the bedrock buffer, and the basic terrain. **Set the world up correctly — every other phase depends on it.**

### 4.1 Block specs

| Spec | Value | Notes |
|---|---|---|
| **World type** | Custom (flat) | Single layer of grass blocks at Y = 0, no terrain |
| **Build height** | **≥ 1,024 blocks** (recommend 2,048) | Set *before* placing the first block. The mc-fleet-bot `create_world` action must be configured with the custom build-height. |
| **Simulation distance** | 12 chunks | |
| **View distance** | 16 chunks | |
| **World footprint** | 1,500 × 1,500 blocks (X × Z) | Centered on origin |
| **Build Y range** | Y = −100 to Y = 800 (with sky buffer Y = 800 to Y = 1,024) | Sky buffer reserved for sky/clouds/stars |
| **Bedrock buffer** | Y = −220 and below | SubTropolis sub-basement extends to Y = −150; bedrock must be at Y = −220 or below (custom deepslate/bedrock layer) |
| **Initial terrain** | Single layer of grass blocks at Y = 0, sand at Y = 0 at the southern + eastern edges (coastal plain beach) | Mountain range, city, contact ring are *not yet* placed — empty space |
| **Footprint markers** | 1-block stone brick at 4 corners + 4 cardinal midpoints of the 1,500 × 1,500 footprint | **Temporary** — remove in Phase 11 |
| **Coordinate axes** | X east, Y up, Z south-positive / Z north-negative. **Mountain is north (negative Z).** | **Contract** before first block |

### 4.2 Verification

- [ ] World generates cleanly at 1,024+ build-height.
- [ ] 4 corner markers + 4 cardinal midpoints are visible.
- [ ] 1-block grass layer is in place.
- [ ] Coordinate axes agreed in writing.
- [ ] Custom bedrock at Y ≤ −220.

### 4.3 Critical risk

If the world is created with vanilla 384 build-height, the entire build is impossible. **Verify before the first block.**

---

## 5. Phase 2 — Continuous Mountain + Contact Ring

**Goal:** Build the **ONE continuous mountain**, NO ravine, with the granite cap (Y = 200 to 800), the limestone body (Y = 0 to 200, continuing to Y = −100 below the city), the **horizontal contact at Y = 200 visible as a 1–2 block color-change ring on the south face**, the surface features (forest, antenna arrays, snow line), and the placeholder portal openings.

> **This is a solid landform, not a carve-out.** The previous design's V-shaped ravine excavation (one of the highest-risk operations) is **removed entirely**. Phase 2 is now a *placement* operation (1,650,000 blocks of rock), not a *carve-out* operation.

### 5.1 Block specs — Limestone body (Y = 0 to Y = 200)

| Property | Value |
|---|---|
| **Footprint in the mountain** | X = −400 to +400, Z = −800 to −200 (800 × 600 plan), Y = 0 to 200 |
| **Composition** | **Smooth stone** (the core rock, cream-grey Bethany Falls limestone, 270 Ma), with **calcite** (weathered surface) and **sandstone** (cream, decorative) on the surface. Grass-and-dirt overlay on lower slopes. |
| **Profile** | Sloping hillside with visible horizontal bedding planes, exposed strata. Sloping foot at city level (Y = 0), rising to the contact (Y = 200). Gentler than the granite cap. |
| **Forest** | **Oak + birch** on lower slopes (Y = 0 to Y = 80); bare rock at treeline (Y = 80 on south face, Y = 100 on north face). |
| **Surface features** | Switchback road on the south face (city → SubTropolis horizontal portal, 6 switchbacks over 100 blocks of elevation), SubTropolis horizontal portal placeholder (4×5 opening at (0, 0, −300)), SubTropolis service tunnel gate placeholder at NW corner of chamber (X = −100, Y = 0, Z = −300). |

### 5.2 Block specs — Granite cap (Y = 200 to Y = 800)

| Property | Value |
|---|---|
| **Footprint in the mountain** | X = −400 to +400 (same E–W as the limestone), Z = −800 to −200 (same N–S depth), Y = 200 to 800. **Narrower** than the limestone body in profile (the granite cap sits on top of the wider limestone base, like a cap on a wider base). |
| **Summit** | Y = 800 at (0, 800, −500) — Pikes Peak-style sharp triangle, the apex of the granite intrusion. |
| **Composition** | **Polished diorite** (the core rock, pink-grey Pikes Peak syenogranite, 1.08 Ga), with **diorite**, **granite**, **granite bricks** (the upper weathered layer), and **pink terracotta** (brick-red accent). Smoky-quartz crystals (small clusters, decorative). |
| **Profile** | Steep upper slopes, sharp summit. Steeper than the limestone (granite erodes slower, holds steeper angles). |
| **Forest** | **Spruce + dark oak** on lower slopes (Y = 200 to Y = 500); bare rock at treeline (Y = 500 on north face, Y = 400 on south face). |
| **Snow line** | **Snow layer** on top 100 blocks (Y = 700 to 800); 5-block-wide **ice** cap at summit. |
| **Antenna arrays** | 3–4 **spruce-fence** antenna poles on the central ridgeline (Y = 600 to 800), with **string** "wires" between them (1960s NORAD-style radar). Visible from the city as the only obvious surface feature. |
| **Surface features** | Cheyenne outer portal placeholder (6×6 opening at (0, 200, −420)), summit station placeholder (10×10 building at (0, 800, −500)), "Three Sites, One Mountain" sign (Easter egg #2), rock identification chart (Easter egg #9), funicular rail placeholder (1-block-wide rail from summit to (0, 200, −420)). |

### 5.3 Block specs — The contact ring at Y = 200

| Property | Value |
|---|---|
| **Elevation** | Y = 200, a horizontal plane through the entire mountain. |
| **Visibility at surface** | A 1–2-block-wide transition band ringing the mountain at Y = 200. Material: a 1-block-wide strip of mixed **cobblestone + calcite + diorite** at Y = 200, visible as a horizontal stripe on the south face. Runs the full 800-block E–W extent of the mountain. |
| **Signage** | A single **oak sign** at the most prominent point on the ring (south face, visible from the city): "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma" |
| **Inside the service tunnel** | The contact is exposed in the tunnel walls at the **contact crossing** (Phase 7) — the lateral position where the minecart ride transitions from limestone walls to granite walls. |

### 5.4 Block specs — Switchback road (south face, city → SubTropolis horizontal portal)

| Property | Value |
|---|---|
| **From** | City plaza (X = 0, Y = 0, Z = +69, the NE corner of the city) |
| **To** | SubTropolis horizontal portal (0, 0, −300) at city level (Y = 0) on the south face of the mountain |
| **Geometry** | 6-block-wide **asphalt** road, switchbacking up the south face of the mountain. 6 switchbacks over 100 blocks of elevation (the road climbs from Y = 0 at the city to Y = 0 at the portal — both ends are at Y = 0; the road switchbacks *laterally* up the south face and arrives at the portal at city level). |
| **Handrails** | **Oak fence** at outer edge of switchbacks. |
| **Surface features** | **Sea lantern** streetlights every 15 blocks, occasional overlooks with views of the city and the coastal plain. |
| **Purpose** | Vehicle connection from city to SubTropolis. The public shaft is the *pedestrian* connection. |

> **Note:** The previous design's "SubTropolis horizontal portal at the contact elevation (Y = 100)" was a designer call in `design-plan.md §5.5` and `site-plan.md §3.5`. The user brief and `site-coordinates.json` (binding) place the portal at **Y = 0** (city level) — the natural drive-in portal model. The switchback road climbs *laterally* up the south face of the mountain; the portal itself is at city level. **Use the binding Y = 0 position from `site-coordinates.json`.**

### 5.5 Surface features on the mountain (Phase 2 finish work)

- **"Three Sites, One Mountain" sign at the granite summit** (Easter egg #2): a 3×3 oak sign panel on a 1-block stone brick pedestal at (0, 800, −500). 5-line text:
  - "THREE SITES, ONE MOUNTAIN"
  - "Cheyenne Mountain (Colorado Springs) — Granite, upper elevation"
  - "SubTropolis (Kansas City) — Limestone, lower elevation"
  - "Houston Tunnels — City in the valley"
  - "Combined by horizontal contact at Y = 200, connected by service tunnel"
- **Rock identification chart at the granite summit** (Easter egg #9): a 3-block display near the "Three Sites" sign, with three item frames on three blocks (polished diorite sample + sign "Pikes Peak Granite — 1.08 Ga, Proterozoic", smooth stone sample + sign "Bethany Falls Limestone — 270 Ma, Pennsylvanian", cobblestone + calcite sample + sign "Thrust-Fault Breccia — Mixed rock at the horizontal contact").
- **Funicular station at the granite summit:** a 10×10 block building at (0, 800, −500) with oak log walls and spruce roof, a 1-block-wide rail track descending the north face to the Cheyenne outer portal at (0, 200, −420), a 2×2 oak door entrance, a minecart with chest (the funicular car) at the top of the rail.

### 5.6 Verification

- [ ] Silhouette reads correctly from 1,500 blocks away: ONE continuous mountain, not two peaks split by a ravine.
- [ ] Granite cap is above Y = 200, limestone body is below.
- [ ] Contact ring at Y = 200 is visible on the south face as a horizontal color stripe.
- [ ] Forest matches rock type: oak/birch on limestone, spruce/dark-oak on granite.
- [ ] Antenna arrays are on the granite ridgeline, visible from the city.
- [ ] SubTropolis horizontal portal placeholder (4×5 at (0, 0, −300)) is in place.
- [ ] Cheyenne outer portal placeholder (6×6 at (0, 200, −420)) is in place.
- [ ] Switchback road connects the city to the SubTropolis portal.
- [ ] "Three Sites" sign and rock ID chart are at the summit.
- [ ] Funicular station is at the summit.
- [ ] **No ravine.** No V-notch, no gorge, no stream at the bottom of a ravine.

---

## 6. Phase 3 — City + Houston Tunnel

**Goal:** Build the above-ground city and the Houston tunnel sample. **Place the Houston build at the city center coordinates.**

> **Reference:** The Houston master plan (`03-houston-tunnel-system/`) already specifies the city and tunnel in detail. This phase executes that plan in this world.

### 6.1 City placement (binding coordinates)

| Anchor | X | Y | Z | Description |
|---|---|---|---|---|
| **City center** | 0 | 0 | 0 | Center of 138 × 138 m downtown (the world origin) |
| **City footprint** | −69 to +69 | 0 to 80 | −69 to +69 | 138 m × 138 m, towers 80 m tall |
| **Wells Fargo tower (anchor)** | −40 | 0 to 70 | −40 | Red sign, 70 blocks tall |
| **JPMorgan Chase tower (anchor)** | +40 | 0 to 75 | −40 | Blue sign, 80 blocks tall |
| **Pennzoil Place tower (anchor)** | −40 | 0 to 65 | +40 | Green sign, 65 blocks tall |
| **Esperson tower (anchor)** | +40 | 0 to 60 | +40 | Gold sign, 60 blocks tall |

### 6.2 Block specs (above ground)

| Element | Block | Notes |
|---|---|---|
| **4 anchor towers** | **Stone brick** + **quartz block** + **glass pane** | 60–80 blocks tall, named above |
| **8–10 generic downtown towers** | **Stone brick** + **glass pane** | 30–50 blocks tall |
| **2–3 parking garages** | **Stone brick** + **white concrete** floors | 15–25 blocks tall, parking markings |
| **Street grid** | **Stone brick** roads (4 blocks wide) on 12-block grid, **oak planks** sidewalks (1 block wide) | |
| **Skybridges** | **Glass pane** enclosed, at Y = 50–70, connecting adjacent towers | 4–6 skybridges total |
| **Streetlights** | **Sea lantern** on **oak fence** posts, every 10–15 blocks along streets | |
| **T-marker signs** | **Red wool** on **white concrete** at street entries | The Houston tunnel visual signature |

### 6.3 Block specs (below ground — Houston tunnel sample)

| Element | Block | Notes |
|---|---|---|
| **Footprint** | 24 blocks (6 × 4 grid) at Y = −6 (6 blocks below street grade) | |
| **Walls** | **White concrete** | |
| **Floor** | **White wool** (VCT tile analogue) | |
| **Ceiling** | **Smooth stone slab** (dropped ceiling) | |
| **Lighting** | **Sea lantern** every 6 blocks along ceiling | Fluorescent 4000K feel |
| **Tenant signage** | Channel-letter signs in tenant brand colors (Wells Fargo red, JPMorgan blue, Hallmark gold, McKinney silver) | |
| **T-marker entries** | **Red wool** on **white concrete** at the 2 direct street-level entries (Wells Fargo, McKinney Garage) + the public shaft entrance | |

### 6.4 The Combined Complex Transit Hub plaza

| Property | Value |
|---|---|
| **Position** | (X = +60, Y = 0, Z = −70) — NE corner of the city |
| **Footprint** | 20 × 20 block plaza |
| **Surface** | **Stone brick** with **quartz block** accents |
| **Features** | 7×7 glass-and-steel **pavilion placeholder** at center (built in Phase 6), T-marker at curb, "SubTropolis — Public Access" sign on pavilion, "Combined Complex — Helsinki + Switzerland + Colorado Springs" plaque (Easter egg reference), benches, planters, small fountain |
| **4-block pedestrian connection** | To nearest Houston tunnel entry (so a visitor can walk from the tunnel to the public shaft without going to street level) |

### 6.5 The public shaft buffer block (binding coordination)

The 7×7 public shaft footprint occupies the SE corner of the Houston 24-block sample. **Do not place Houston tunnel blocks in this 7×7 footprint** (X = 56 to 63, Y = −6 to 0, Z = −76 to −69). The shaft extends 25 blocks beyond the 24-block sample, into the plaza, with the *plaza* being the surface entry, not the tunnel sample.

### 6.6 Verification

- [ ] City reads correctly from above: 4 anchor towers at cardinals, 8–10 generic towers, skybridges connecting adjacent towers, T-markers at entries.
- [ ] Houston tunnel is dim and beige-tiled (white concrete walls, white wool floor, sea lantern lighting).
- [ ] Transit Hub plaza is in place at NE corner.
- [ ] Public shaft placeholder is in the correct spot (7×7 reserved, no tunnel blocks there).
- [ ] 2 T-markers at street-level tunnel entries (Wells Fargo, McKinney Garage) + 1 at public shaft entrance.

---

## 7. Phase 4 — SubTropolis (Chamber + Sub-Basement + Horizontal Portal)

**Goal:** Build the SubTropolis chamber and sub-basement, with the **horizontal portal at (0, 0, −300)** on the south face of the mountain at city level (NOT at the contact elevation, per the binding `site-coordinates.json`).

> **Reference:** The SubTropolis master plan (`02-subtropolis/`) already specifies the chamber in detail (200 × 200 pillar grid, 5×5 spec, painted numbers, channel-letter signs, central plaza, food court, tenant fit-outs). This phase executes that plan in this world.

### 7.1 SubTropolis placement (binding coordinates)

| Anchor | X | Y | Z | Description |
|---|---|---|---|---|
| **Chamber footprint** | −100 to +100 | −100 to 0 | −300 to −100 | 200 × 200 × 100 blocks |
| **Chamber center** | 0 | −50 | −200 | |
| **Public access lobby (SE corner of chamber)** | +60 | −100 | −100 | Where the public shaft lands |
| **Horizontal portal (north face of chamber, on south face of mountain)** | 0 | 0 | −300 | 4 × 5 block opening at city level (binding) |
| **Service tunnel entrance (NW corner of chamber)** | −100 | 0 | −300 | Where the minecart rail exits the chamber into the service tunnel |

### 7.2 Block specs (per 02-masterplan)

| Element | Block | Notes |
|---|---|---|
| **Chamber walls** | **Smooth stone** (cream-grey limestone) | Carved out of the limestone below the city |
| **Pillars** | 8 × 8 × 5 block pillars, **white concrete** painted, on 65-block centers | With painted pillar numbers (e.g., "911.10") in black stencil |
| **Ceiling** | **Smooth stone slab** at Y = 0 | |
| **Floor** | **Asphalt** (road) + **stone brick** (sidewalks) | |
| **Roads** | 4-block-wide main avenues, 15-mph speed-limit signs in black on white | Hushpuckney Avenue is the main corridor |
| **Tenant signage** | Backlit channel letters in tenant brand colors | |
| **Lighting** | **Sea lantern** every 8 blocks along ceiling | Bright fluorescent (light level 12) |
| **Central plaza** | **Quartz block** medallion + "SubTropolis — Est. 1964" plaque + Hunt Hall marker | |
| **Tenant fit-outs** | USPS, NARA, Hallmark, Russell Stover, LightEdge (data center), Grainger | Per 02-masterplan |
| **Sub-basement** | 100 × 100 × 30 blocks at Y = −130 to Y = −150 | Smooth stone walls, **stone brick slab** floor, **redstone lamp** lighting every 8 blocks (dimmer than main chamber) |
| **Sub-basement service tunnel gate** | **Iron bars** at NW corner of sub-basement | Aligns with service tunnel (Phase 7) |

### 7.3 SubTropolis horizontal portal (centerpiece #5)

| Property | Value |
|---|---|
| **Position** | (0, 0, −300) — north face of chamber, on the south face of the mountain, at city level (Y = 0) |
| **Opening** | 4 × 5 blocks in the limestone hillside |
| **Frame** | **Smooth stone** (limestone) with **chiseled calcite** corners; a 1-block-wide **polished diorite** band directly above the frame (the contact plane, visible as a pink stripe over the cream portal — the surface expression of the horizontal contact at the portal) |
| **Sign above** | "Hunt Midwest SubTropolis — Authorized Vehicles" (oak sign, black text, channel-letter-style) |
| **Sign below** | **Easter egg #5:** "World's Largest Underground Business Complex" (oak sign) |
| **Vehicle gate** | **Oak fence gate**, 2 blocks wide, at portal mouth |
| **Paved road** | 6-block-wide **asphalt** road from portal mouth, switchbacking down the south face of the mountain to the city plaza (Phase 5 switchback) |
| **Inside** | Security gate, turnstile, vehicle checkpoint, with Hushpuckney Avenue visible beyond |

### 7.4 Verification

- [ ] Chamber reads correctly from the lobby (white pillars, painted numbers, channel-letter signs, 15-mph speed limits).
- [ ] Sub-basement is dimmer than the main chamber.
- [ ] Horizontal portal is visible from the switchback road.
- [ ] Service tunnel gate is at the NW corner of the sub-basement (aligns with service tunnel in Phase 7).
- [ ] Easter egg #5 ("World's Largest Underground Business Complex") is in place.
- [ ] The pink contact band is directly above the cream portal frame (1-block-wide polished diorite at Y = 200, above the Y = 0 portal).

---

## 8. Phase 5 — Cheyenne (Chamber + J-Curve + Outer Portal)

**Goal:** Build the granite bunker. **Place the Cheyenne build at the granite peak coordinates**, with the **outer portal at (0, 200, −420)** on the south face of the mountain at the **contact elevation Y = 200** (NOT at the contact crossing in the ravine, since there is no ravine).

> **Reference:** The Cheyenne master plan (`01-cheyenne-mountain-complex/`) already specifies the chamber and J-curve in detail (1,319 springs, 15 buildings, Combat Operations Center, 3 character stages of J-curve). This phase executes that plan in this world.

### 8.1 Cheyenne placement (binding coordinates)

| Anchor | X | Y | Z | Description |
|---|---|---|---|---|
| **Chamber footprint** | −40 to +40 | 250 to 400 | −580 to −500 | ~80 × 80 × 150 m (4.5 acres of building floor space) |
| **Chamber center** | 0 | 325 | −540 | |
| **Outer portal (south face of mountain, in granite, at contact elevation)** | 0 | 200 | −420 | 6×6 opening. 25-ton blast door at the contact elevation. |
| **J-curve end (chamber entrance)** | 0 | 300 | −540 | At chamber's south wall |
| **J-curve length** | — | — | — | **800 blocks along the curved path** (inherited from 01-masterplan) |
| **Rock above chamber** | 1,800+ blocks of solid granite | | | Y = 250 (chamber floor) to Y = 800 (peak) = 550 blocks (≥ the 549-block minimum) |

### 8.2 Block specs (per 01-masterplan)

| Element | Block | Notes |
|---|---|---|
| **Chamber walls** | **Polished diorite** (pink-grey Pikes Peak syenogranite) | Bare at the chamber |
| **Chamber floor** | Painted **concrete** (polished) | |
| **1,319 half-ton coil springs** | **Gray wool** (concrete-grey) + **iron bars** (steel) | In a 4 × 4 m grid across the 80 × 30 chamber, denser than 1 spring per 4 × 4 m cell |
| **15 spring-mounted buildings** | **Stone brick** (institutional beige/gray) + **quartz block** | 12 three-story + 3 two-story steel-and-concrete |
| **Blast doors** | **Iron door** (3-block-thick steel analogue) in **quartz stair** frame | Industrial green/gray, 20 ft tall |
| **J-curve walls** | 3 character stages: **polished diorite** (rough-hewn at portal) → **gray concrete** (side branch) → **polished diorite + polished concrete** (chamber) | |
| **J-curve ceiling** | **Polished diorite slab** (self-supporting granite) at the chamber end | |
| **Lighting** | **Sea lantern** every 6 blocks (chamber, light level 12) + **redstone lamp** every 8 blocks (J-curve, light level 8–10) | "Dead air" feel |
| **Building fit-outs** | Combat Operations Center, Air Defense Operations Center, medical clinic, Granite Inn bar, central support area | Per 01-masterplan |

### 8.3 Cheyenne outer portal (centerpiece #6)

| Property | Value |
|---|---|
| **Position** | (0, 200, −420) — on the **south face of the mountain**, in the **granite**, at the **contact elevation Y = 200** (NOT at a ravine wall as in the previous design) |
| **Opening** | 6 × 6 block opening framed by concrete-and-granite |
| **Frame** | **Gray concrete** + **polished diorite** accents + **quartz stair** corners |
| **25-ton blast door** | **Iron door** (3-block-thick) in **quartz stair** frame, recessed in a 4-block side branch (centerpiece #1, finished in Phase 8) |
| **Checkpoint corridor** | 4 blocks deep, 6 blocks wide; **gray concrete** walls, **polished diorite** accents |
| **Guard booth** | 1 block **oak fence** + oak sign "GUARD", 1 block before the door |
| **Signs** | **Easter egg #6:** "U.S. Space Force — Authorized Personnel Only" (oak sign, black text, military stencil) + "Beyond this door: Cheyenne Mountain Complex, J-curve access tunnel, 800 m to chamber." |
| **Beyond** | The J-curve access tunnel (inherited from 01-masterplan, 800 blocks, 3 character stages) |

> **Critical:** The outer portal is at Y = 200 on the south face of the mountain, in the granite. The visitor approaches it via the service tunnel (Phase 7) from inside the mountain, climbing from Y = 0 to Y = 200 on a 3.33:1 grade. The outer portal is also the start of the funicular (Phase 9) and is reached on foot from the switchback road (Phase 5/2) from the city.

### 8.4 Verification

- [ ] Chamber reads correctly from the J-curve entrance (15 buildings on springs, fluorescent lighting, "dead air" feel).
- [ ] J-curve has 3 character stages (rough-hewn at portal, concrete-lined at side branch, polished institutional at chamber).
- [ ] Outer portal is at (0, 200, −420) on the south face, in the granite, at the contact elevation.
- [ ] Blast door is at the end of the 50-block J-curve extension (Phase 8 finishes the centerpiece).
- [ ] Easter egg #6 ("U.S. Space Force") is in place.

---

## 9. Phase 6 — Public Shaft (the Vertical Centerpiece)

**Goal:** Build the **7×7 cross-section, 100-block descent, mechanical lift + emergency stair + service chase** that connects the city surface to the SubTropolis floor. The public shaft is the **first of the two architectural centerpieces** — the *civilian transition*.

> **This phase is the highest-risk phase** in the entire build. The public shaft is the build's defining feature. A mistake here breaks the visitor journey. **Measure twice, place once.**

### 9.1 Public shaft geometry (binding)

| Property | Value |
|---|---|
| **Cross-section** | **7 × 7 blocks total** |
| **Inner lift core** | 5 × 5 blocks (the mechanical lift) |
| **Outer ring (west side)** | 1-block-wide emergency stair (oak stairs spiraling around oak fence post), visible through glass pane |
| **Outer ring (east side)** | 1-block-wide service chase (oak fence pipe = water, redstone = power, white wool = fiber-optic), behind oak fence gate |
| **Length** | **100 blocks vertical** (Y = 0 to Y = −100) |
| **Path** | Purely vertical — straight 7×7 bore through the limestone, no curves or angles |
| **Mode** | Mechanical lift (visual: 5×5 lift car with iron bars enclosure) + visible emergency stair through glass pane in the outer west wall |

### 9.2 Public shaft coordinate table

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Top — Surface pavilion (centerpiece #4)** | +60 | 0 | −70 | 7×7 glass-and-steel pavilion at the city surface |
| **Upper section** | +60 | −3 to −50 | −70 | Gray concrete walls, redstone lamp every 8 blocks, iron bars lift enclosure, glass pane window (west), oak fence service chase (east), oak stairs emergency stair (west) |
| **Mid-level observation landing (centerpiece #2)** | +60 | **−50** | −70 | 7×7 G-Cans-style observation room, 3×3 glass window on south face, labelled limestone block, oak stairs bench, info sign |
| **Utility corridor (parallel, visible through mid-landing window)** | +65 | −40 to −60 | −70 | 7×7 *parallel* shaft, 5 blocks east of the public shaft. Contains: 1×3 polished diorite pillar, oak fence water pipe, redstone power line, white wool fiber-optic conduit |
| **Lower section** | +60 | −50 to −100 | −70 | Walls transition gray concrete → smooth stone → calcite. Same redstone lamp lighting. Color shift from cool blue/gray to warm cream. |
| **Bottom — Public Access Lobby** | +60 | **−100** | −100 | 7×7 room carved out of the north face of the shaft, security gate (iron bars), turnstile, "Welcome to SubTropolis" channel-letter sign, "Hunt Midwest — Est. 1964" sign, **Easter egg #4** ("HELSINKI 5,500" carved block + "Public Shaft — Inspired by the Helsinki Underground Master Plan" oak sign), iron door opening onto Hushpuckney Avenue |

### 9.3 Block specs by zone

| Zone | Y range | Walls | Ceiling | Floor | Lighting | Accent |
|---|---|---|---|---|---|---|
| **Top — Surface pavilion** | 0 to −3 | **Glass pane** (3 sides) + **stone brick** (east back wall) | **Stone brick slab** | **Stone brick** (plaza) + **white concrete** (pavilion) | Daylight (light 15) | "SubTropolis — Public Access" sign (oak), guard booth (oak fence + sign), turnstile (iron bars +), T-marker (red wool on white concrete), "EMPLOYEE ENTRANCE / EMERGENCY EGRESS" dual-use sign |
| **Upper section** | −3 to −50 | **Gray concrete** | **Smooth stone slab** (dropped ceiling) | **Light gray wool** (lift floor) + **oak stairs** (stair) | **Redstone lamp** every 8 blocks on wall (light 12) | Iron bars lift enclosure, glass pane window (west wall), oak fence service chase (east wall, behind oak fence gate), oak stairs emergency stair (west, visible through glass) |
| **Mid-landing** | −50 | **White concrete** walls + **gray concrete** pillars | **Stone brick slab** | **Stone brick slab** | **Redstone lamp** + 3×3 glass window showing utility corridor (light 12) | 3×3 glass pane window (south face), labelled limestone block (smooth stone slab + oak sign "Bethany Falls Limestone — 270 Ma, Pennsylvanian"), oak stairs bench, info sign (4 lines: "Mid-Level Observation Landing — Y = −50", "You are halfway between city (Y = 0) and SubTropolis (Y = −100).", "The window looks out at the city's underground utility corridor.", "Below you: 50 m of Bethany Falls limestone."), 2×1 iron door leading to emergency stair continuation |
| **Lower section** | −50 to −100 | **Smooth stone** → **calcite** (cream-grey) — walls *transition* | **Smooth stone slab** | **Light gray wool** (lift floor) | **Redstone lamp** every 8 blocks (light 12) | Same iron bars lift enclosure, glass pane window, oak fence service chase (now with limestone-compatible utility runs: 2-block oak fence water, 2-block redstone power), oak stairs emergency stair |
| **Bottom — Public Access Lobby** | −100 | **White concrete** | **Stone brick slab** | **Stone brick slab** (lobby) → **asphalt** (Hushpuckney Avenue) | **Redstone lamp** (light 12) + brighter SubTropolis fluorescent beyond door | Iron bars security gate, iron bars turnstile, oak sign "Welcome to SubTropolis" on white concrete background, oak sign "Hunt Midwest SubTropolis — Industrial Complex, Est. 1964", info sign (3 lines: "SubTropolis Public Access — Employee Entrance 95% of the time / Emergency Egress 5% of the time.", "Below the lobby: Hushpuckney Avenue, the SubTropolis main corridor.", "HELSINKI 5,500 — the number of civil-defense shelters in Helsinki, the inspiration for this dual-use shaft."), **Easter egg #4** ("HELSINKI 5,500" carved on chiseled stone brick), 2×1 iron door opening onto Hushpuckney Avenue |

### 9.4 Lighting transition (the "descent" feel)

The lighting stays at light level 12, but the *reflected color* shifts visibly:
- **Y = 0 to −30:** Cool blue/gray (gray concrete reflects blue-tinted redstone lamp)
- **Y = −30 to −60:** Utility palette (G-Cans aesthetic, exposed concrete pillars)
- **Y = −60 to −100:** Warm cream (calcite reflects warm-tinted redstone lamp)

The echo of the shaft also changes (concrete reflects differently than calcite) — the player *hears* the descent.

### 9.5 Verification

- [ ] Cross-section is exactly 7×7 (5×5 lift + 1-block stair + 1-block chase).
- [ ] Shaft is purely vertical (no curves), 100 blocks.
- [ ] Surface pavilion has 3 glass walls, guard booth, turnstile, T-marker, dual-use sign.
- [ ] Mid-landing window (3×3 glass) looks out at the utility corridor (5 blocks east) — the player sees a polished diorite pillar, water pipe, power line, fiber-optic conduit.
- [ ] Mid-landing has the labelled limestone block ("Bethany Falls Limestone — 270 Ma, Pennsylvanian").
- [ ] Wall material visibly transitions from gray concrete (top) to smooth stone to calcite (bottom).
- [ ] Bottom lobby has iron bars security gate, turnstile, "Welcome to SubTropolis" sign.
- [ ] Easter egg #4 ("HELSINKI 5,500") is in place.
- [ ] The descent takes ~30 seconds of in-game travel by lift, ~5 minutes by emergency stair.

### 9.6 Critical risks

- **Shaft alignment:** the 7×7 × 100 block shaft must align with the city plaza (Y = 0), the SubTropolis ceiling (Y = −100), and the mid-landing utility corridor (Y = −50, 5 blocks east). An off-by-1-block shaft means the lobby opens onto the wrong avenue or the mid-landing window looks at blank rock.
- **Mid-landing window alignment:** the 3×3 glass pane window on the south face of the mid-landing must look at the 7×7 utility corridor scene. The corridor is 5 blocks east of the shaft. An off-by-1-block window = blank rock instead of the G-Cans moment.

---

## 10. Phase 7 — Service Tunnel (the Horizontal Centerpiece)

**Goal:** Build the **6×6 cross-section, 120-block ascending inclined minecart bore** that connects the SubTropolis sub-basement (south face of mountain, Y = 0, in limestone) up through the horizontal contact at Y = 200 (at the contact crossing) to the Cheyenne outer portal (south face of mountain, Y = 200, in granite). **The tunnel is now CLIMBING, not flat-under-a-ravine.** The service tunnel is the **second of the two architectural centerpieces** — the *inter-site transition*.

### 10.1 Service tunnel geometry (binding)

| Property | Value |
|---|---|
| **Cross-section** | **6 × 6 blocks total** |
| **Inner rail corridor** | 4 × 4 blocks (1-block gauge minecart rail + 1-block clearance on each side) |
| **Utility strip (north 1-block face)** | 1-block water/power/fiber line (oak fence = water, redstone = power, white wool = fiber-optic) |
| **Emergency-escape corridor (south 1-block face)** | 1-block walkway for personnel evacuation, **yellow wool** stripe on floor |
| **Length** | **120 blocks** (SubTropolis end to Cheyenne end) |
| **Path** | From SubTropolis NW corner (−100, 0, −300) → climbing through the mountain (in the limestone) on a **3.33:1 grade** → reaching the contact elevation Y = 200 at the contact crossing (~block 60, at (−40, 200, −360)) → continuing laterally in the granite at Y = 200 → arriving at the Cheyenne outer portal (0, 200, −420) |
| **Climb profile** | **0 to 60 blocks (SubTropolis end to contact crossing):** climb from Y = 0 to Y = 200 (3.33:1 grade, very steep, powered rails every 4 blocks). Walls are cream limestone. **60 to 120 blocks (contact crossing to Cheyenne end):** lateral at Y = 200. Walls transition from cream limestone to pink granite at the contact crossing. Remaining 55–60 blocks are in the granite. |
| **Alignment** | **Straight** (per Decision 4). The 6×6 cross-section is uniform from end to end; only the wall material and lighting change. |
| **Mode** | **Minecart rail** (1-block gauge, single track, **powered rail every 4 blocks** in the climbing section) |

### 10.2 Service tunnel coordinate table

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Service tunnel start — SubTropolis end** | −100 | 0 | −300 | NW corner of SubTropolis sub-basement, on the south face of the mountain. Open entrance, "U.S. Space Force — Authorized Personnel Only" sign, 1-block iron bars security gate, iron bars turnstile. **Easter egg #3** ("Service Tunnel — Inspired by the Gotthard Base Tunnel" sign + "SBB CFF FFS" Swiss Federal Railways logo on chiseled calcite). Paved road (asphalt, 6 blocks wide) from sub-basement to gate. |
| **Limestone section** | −100 to −40 | 0 to 200 | −300 to −360 | First ~60 blocks. **Climbing** at 3.33:1 grade. Walls: **smooth stone** (cream-grey limestone analogue). SubTropolis fluorescent (light 10). Utility strip: light blue wool (water), red wool (power), white wool (fiber-optic). Yellow wool stripe on south face of 6×6 (emergency-escape corridor). **Powered rail every 4 blocks** (the minecart must climb, so powered rails are denser than the previous flat design). |
| **Contact crossing (centerpiece #3, THE GEOLOGICAL MOMENT)** | **−40** | **200** | **−360** | At the contact elevation, where the tunnel walls transition from cream limestone to pink granite. **The composite terrane plaque** is here (Easter egg #1). 1–2 blocks of **thrust-fault breccia** (mixed granite-and-limestone rubble) visible in the tunnel walls. Plaque text: "Thrust Fault Contact — Pikes Peak Granite (1.08 Ga) overthrust on Bethany Falls Limestone (270 Ma). The contact is exposed at the surface on the south face of the mountain at Y = 200, and crossed by this tunnel." |
| **Granite section** | −40 to 0 | 200 | −360 to −420 | Last ~60 blocks, **lateral** at Y = 200. Walls: **polished diorite** (pink-grey granite). Utility strip: gray wool (water — "raw water"), black wool (power — "diesel generator"), red wool (fiber-optic — "secure comms"). Ceiling: **polished diorite slab** (self-supporting, no dropped ceiling). SubTropolis → Cheyenne fluorescent transition. Light 10. |
| **Service tunnel end — Cheyenne outer portal (centerpiece #6)** | 0 | 200 | −420 | 6×6 opening in the granite, framed by 4-block concrete-and-granite checkpoint corridor. **25-ton blast door (centerpiece #1)**: 3-block-thick **iron door** in 6-block-tall **quartz stair** frame, recessed in a 4-block side branch. Guard booth, "U.S. Space Force" sign, "Beyond this door" signs. Beyond: J-curve access tunnel. |

### 10.3 Block specs by zone

| Zone | Walls | Ceiling | Floor | Lighting | Accent |
|---|---|---|---|---|---|
| **SubTropolis end (gate)** | **Smooth stone** + **white concrete** | **Smooth stone slab** | **Asphalt** (sub-basement side) → **stone brick slab** (tunnel) | **Redstone lamp** at the gate, every 8 blocks along tunnel (light 12 at gate → 10 in tunnel) | Iron bars security gate, oak sign "SERVICE TUNNEL → CHEYENNE / U.S. Space Force — Authorized Personnel Only", **Easter egg #3** ("Service Tunnel — Inspired by the Gotthard Base Tunnel (57 km, Switzerland) / SubTropolis–Cheyenne Service Tunnel: 0.12 km — not the longest, but the most climbed." + "SBB CFF FFS" on chiseled calcite) |
| **Limestone section** | **Smooth stone** (cream-grey) | **Smooth stone slab** (dropped ceiling) | **Stone brick slab** | **Redstone lamp** every 8 blocks (light 10) | Minecart rail (centered 4×4), **powered rail every 4 blocks** (steep climb), utility strip: light blue wool (water), red wool (power), white wool (fiber-optic), yellow wool (escape corridor stripe) |
| **Contact crossing** | **Chiseled calcite** (south/lower face, limestone) + **polished diorite** (north/upper face, granite) | **Smooth stone slab** | **Stone brick slab** + **1-block cobblestone + calcite breccia strip** on the floor (Easter egg #8) | **1 redstone lamp** on the alcove ceiling (light 8, the dimmest point) | **3×5 alcove** carved into the upper (granite) wall. Inside the alcove: **1×2 carved-stone plaque** (chiseled calcite limestone half + chiseled stone brick granite half), **6–7 oak signs of geological text** (composite terrane plaque, Easter egg #1), single redstone lamp on alcove ceiling. Plaque text: "Thrust Fault Contact — Pikes Peak Granite (1.08 Ga) overthrust on Bethany Falls Limestone (270 Ma). The contact is exposed at the surface on the south face of the mountain at Y = 200, and crossed by this tunnel." |
| **Granite section** | **Polished diorite** (pink-grey) | **Polished diorite slab** (self-supporting) | **Stone brick slab** | **Redstone lamp** every 8 blocks (light 10) | Minecart rail (centered 4×4), powered rail every 4 blocks, utility strip: gray wool (water), black wool (power), red wool (fiber-optic) |
| **Cheyenne end (checkpoint)** | **Gray concrete** + **polished diorite** | **Polished diorite slab** | **Stone brick slab** (corridor) → rails + gravel (J-curve beyond) | **Sea lantern** every 4 blocks (light 8 → 12) | **Centerpiece #1: 25-ton blast door** (3-block-thick iron door in 6-block-tall quartz stair frame), oak fence guard booth + sign, **Easter egg #6** "U.S. Space Force — Authorized Personnel Only", "Beyond this door: Cheyenne Mountain Complex, J-curve access tunnel, 800 m to chamber." |

### 10.4 Verification

- [ ] Cross-section is exactly 6×6 (4-block rail + 2-block utility).
- [ ] Tunnel is straight (no curves), 120 blocks, **climbing** at 3.33:1 from Y = 0 to Y = 200.
- [ ] Rail is continuous (no gaps) with powered rail every 4 blocks in the climbing section.
- [ ] Wall material visibly transitions from cream limestone (smooth stone) to pink granite (polished diorite) at the contact crossing.
- [ ] 1-block-wide cobblestone + calcite breccia strip is on the **floor** of the tunnel at the contact (not on the wall) — the minecart rolls *across the contact*.
- [ ] Composite terrane plaque is in the 3×5 alcove on the upper (granite) wall, lit by a single redstone lamp.
- [ ] Thrust fault sign text is readable.
- [ ] 25-ton blast door is centered in the cross-section, visible from the approaching minecart as a 1-block dark patch growing to a wall of iron.
- [ ] Easter egg #3 ("Service Tunnel — Inspired by the Gotthard Base Tunnel" + "SBB CFF FFS") is in place.
- [ ] Easter egg #1 (composite terrane plaque) is in place.
- [ ] Easter egg #8 (breccia strip) is in place.
- [ ] The minecart ride takes 2–3 minutes (from SubTropolis end to Cheyenne end), with the climb feeling continuous and the wall transition visible.

### 10.5 Critical risks

- **Tunnel alignment:** must align with the SubTropolis sub-basement gate (NW corner at −100, 0, −300) and the Cheyenne outer portal (0, 200, −420). An off-by-1-block tunnel = the minecart rail doesn't connect.
- **Grade alignment:** the 3.33:1 grade must be continuous — Y must increase by exactly 200 blocks over 60 blocks of horizontal travel. An off-by-1-block grade means the contact crossing is at the wrong elevation and the plaque doesn't sit at Y = 200.
- **Contact crossing alignment:** the contact crossing is at the midpoint of the tunnel, at Y = 200. The bot must be told the *exact* X/Z coordinate of the contact crossing. An off-by-1-block contact crossing means the breccia strip is *not* at the contact, and the composite terrane plaque is at the wrong elevation. The surface contact ring (Phase 2) and the service tunnel contact crossing (Phase 7) must align — the plaque is at the same Y as the surface ring.
- **Powered rail density:** the minecart must climb a 3.33:1 grade with powered rails every 4 blocks. If the powered rails are spaced too far apart, the minecart stalls mid-climb. If they are too close, the minecart launches at the top. The bot must place the powered rails at the *exact* 4-block spacing.
- **The 3×5 alcove carving:** the alcove is carved into the upper (granite) wall of the 6×6 at the contact crossing. The alcove is 3×5×3 blocks, with the plaque on the back wall, the breccia strip on the floor of the tunnel, and the redstone lamp on the alcove ceiling. The bot must be told the *exact* alcove geometry.
- **The 25-ton blast door:** the door is a 3-block-thick iron door in a 6-block-tall quartz-stair frame. The door must be *visible* from the approaching minecart — the player sees the door growing from a 1-block dark patch to a wall of iron as the cart approaches. The bot must place the door at the *exact* end of the service tunnel, in the *correct* orientation (the door faces south, toward the approaching cart).

---

## 11. Phase 8 — 25-Ton Blast Door + Composite Terrane Plaque

**Goal:** Finalize the two centerpieces that are the build's *Cheyenne moment* and *Telling Detail*.

### 11.1 25-ton blast door (centerpiece #1)

| Element | Block | Dimensions |
|---|---|---|
| **Door** | **Iron door** (3-block-thick steel analogue) | 3 blocks thick × 3 blocks wide × 6 blocks tall |
| **Frame** | **Quartz stair** (granite frame analogue) | 6-block-tall × 6-block-wide, surrounding the door |
| **Side branch** | 4-block-deep recess in the granite wall | Door is recessed, not flush |
| **Checkpoint corridor** | **Gray concrete** walls + **polished diorite** accents | 4 blocks deep × 6 blocks wide, in front of the door |
| **Guard booth** | **Oak fence** + oak sign "GUARD" | 1 block, on the right side of the corridor, 1 block before the door |
| **Position** | (X = 0, Y = 200, Z = −420) | At the Cheyenne outer portal, service tunnel terminus |
| **Scale** | Per the Cheyenne masterplan, the door is **scaled 2x** in the combined complex (the build's blast door is 2× the real-world size for visibility from the approaching minecart). 3-block-thick × 6-block-wide × 12-block-tall. | |
| **Beyond the door** | The 800-block J-curve access tunnel (per 01-masterplan) leading to the chamber | |

### 11.2 Composite terrane plaque (centerpiece #3, Easter egg #1)

| Property | Value |
|---|---|
| **Position** | (X = −40, Y = 200, Z = −360) — inside the service tunnel at the contact crossing (NOT at a ravine bottom, since the ravine has been dropped) |
| **Alcove** | 3×5×3 blocks carved into the **upper (granite) wall** of the 6×6 at the contact crossing |
| **Alcove floor** | **Smooth stone slab** |
| **Alcove side walls + ceiling** | **Polished diorite** |
| **Plaque** | 1×2 carved-stone marker on the alcove back wall: left block = **chiseled calcite** (limestone half, 270 Ma), right block = **chiseled stone brick** (granite half, 1.08 Ga) |
| **Plaque text** | 6–7 oak signs on the alcove wall, black text on white:<br>Line 1 (large): "COMPOSITE TERRANE"<br>Line 2: "The granite above this alcove is 1.08 Ga Pikes Peak granite."<br>Line 3: "The limestone below is 270 Ma Bethany Falls limestone."<br>Line 4: "They are in horizontal contact at this elevation, where"<br>Line 5: "the granite pluton pushed up through the limestone."<br>Line 6: "In real mountain ranges (the Alps, the Appalachians, Glacier National Park),"<br>Line 7: "this is a common geological feature." |
| **Breccia strip on tunnel floor** | 1-block-wide strip of mixed **cobblestone + calcite**, 1 block tall × 6 blocks long (the full cross-section length), at the contact crossing. The strip is the *visible* surface expression of the contact on the tunnel floor. (Easter egg #8 — co-located with Easter egg #1.) |
| **Lighting** | 1 **redstone lamp** on the alcove ceiling (light 8, the dimmest point in the tunnel) |
| **Geological honesty** | **The plaque is at a REAL geological boundary**, not narrative fiction. The horizontal granite-limestone contact is exposed at the surface (the contact ring at Y = 200 on the south face) and crossed by the service tunnel (the contact crossing at Y = 200). Real geology: granite plutons push up through limestone in mountain ranges worldwide (the Alps, the Appalachians, the Sierra Nevada, the Front Range of Colorado). |

### 11.3 Verification

- [ ] 25-ton blast door is at (0, 200, −420), centered in the 6×6 cross-section, visible from the approaching minecart.
- [ ] Door is 3 blocks thick, 6 blocks wide, 12 blocks tall (scaled 2x per Cheyenne masterplan).
- [ ] Composite terrane plaque is in the 3×5 alcove on the upper (granite) wall of the service tunnel at (−40, 200, −360).
- [ ] Plaque is 1×2 (chiseled calcite + chiseled stone brick) with 6–7 oak signs of text.
- [ ] Single redstone lamp lights the alcove.
- [ ] Breccia strip on the tunnel floor is 1 block wide × 6 blocks long, mixed cobblestone + calcite.
- [ ] Plaque text is geologically accurate and readable.

---

## 12. Phase 9 — Funicular + Summit Road (the Return Route)

**Goal:** Build the 2-mode surface return from the Cheyenne outer portal back to the city — funicular from the portal at Y = 200 up to the granite summit at Y = 800, then a paved switchback road down the south face to the city plaza. **NO SKYBRIDGE** (the skybridge was for spanning the ravine, which no longer exists).

### 12.1 The funicular (Stage 1 of return)

| Property | Value |
|---|---|
| **From** | (0, 200, −420) — Cheyenne outer portal |
| **To** | (0, 800, −500) — Granite summit station (built in Phase 2) |
| **Elevation gain** | 600 blocks |
| **Lateral distance** | ~400 blocks |
| **Grade** | **2:1** (steep, similar to Swiss funiculars) |
| **Mode** | Funicular rail (1-block gauge, single track, **powered rail every 4 blocks** so the minecart can climb the steep grade) |
| **Path** | A rail on the **east or west face** of the granite intrusion, climbing 600 blocks over ~400 blocks of lateral distance. Single track with a passing loop at the midpoint. |
| **Vehicle** | A single minecart with chest (the funicular car) at the top of the rail. |
| **Stations** | Small station at the outer portal (oak fence + sign "Funicular — Cheyenne to Summit / ~5 min ride") and a small station at the summit (built in Phase 2 with the "Three Sites" sign and rock ID chart). |
| **Duration** | ~5 min (the funicular climb is the first 5 minutes of the ~13-min return) |

### 12.2 The summit road (Stage 2 of return)

| Property | Value |
|---|---|
| **From** | (0, 800, −500) — Granite summit station |
| **To** | (0, 0, 0) — Combined Complex Transit Hub plaza, or (60, 0, −70) — the public shaft entrance |
| **Elevation loss** | 800 blocks |
| **Lateral distance** | ~800 blocks |
| **Switchbacks** | **6 switchbacks** over 800 blocks of elevation, each switchback a 30-block horizontal traverse on a 5-block-wide shelf cut into the south face of the mountain |
| **Mode** | Walk, horse, or vehicle (cart on rails) on a paved **stone-brick** road |
| **Width** | 6 blocks |
| **Handrails** | **Oak fence** at outer edge of switchbacks |
| **Surface features** | **Sea lantern** streetlights every 20 blocks, occasional overlooks with views of the city and the coastal plain, "CONTACT RING AHEAD" sign at Y = 200 (the surface expression of the contact) |
| **Duration** | ~8 min (the summit road is the second 8 minutes of the ~13-min return) |

### 12.3 Block specs

| Element | Block | Notes |
|---|---|---|
| **Funicular rail** | **Rail** (with **powered rail** every 4 blocks) | Climb from (0, 200, −420) to (0, 800, −500) on the east or west face of the granite |
| **Funicular station at portal** | **Oak fence** + **oak sign** | At the Cheyenne outer portal |
| **Funicular car** | **Minecart with chest** | Placed at the top of the rail, ready to ride down |
| **Summit road surface** | **Stone brick** | 6 blocks wide, switchbacking down the south face |
| **Switchback handrails** | **Oak fence** | 1-block tall, at outer edge |
| **Streetlights** | **Sea lantern** on **oak fence** posts | Every 20 blocks |
| **Contact ring sign on road** | **Oak sign** | At Y = 200 on the south face: "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma" |
| **Overlooks** | **Stone brick** platform + **oak fence** rail | At 2–3 switchbacks with views of the city and the coastal plain |

### 12.4 Verification

- [ ] Funicular rail is continuous from the outer portal (0, 200, −420) to the summit station (0, 800, −500).
- [ ] Powered rail every 4 blocks in the climbing section.
- [ ] Minecart can be placed at the top and ride down to the portal (or vice versa).
- [ ] Summit road is continuous from the granite summit (0, 800, −500) to the city plaza (0, 0, 0) or (60, 0, −70).
- [ ] 6 switchbacks with proper elevation loss (Y = 800 → 0 over ~800 blocks lateral).
- [ ] Total return time ~13 minutes (5 min funicular + 8 min road).
- [ ] **NO SKYBRIDGE** anywhere in the world.

---

## 13. Phase 10 — Summit Observation Platform (the new 7th Centerpiece)

**Goal:** Build a small wooden platform with a 360° view of the mountain range, the city, and the coastal plain at the granite summit. The platform is the **new 7th centerpiece** of the build, complementing the 6 centerpieces of the integration layer.

> The 6 centerpieces (per `site-coordinates.json` and `design-plan.md §1`) are: 25-ton blast door, mid-landing, composite terrane plaque, surface pavilion, SubTropolis horizontal portal, Cheyenne outer portal. The summit observation platform is the 7th, added at the granite summit to give the visitor a *payoff view* after the descent.

### 13.1 Block specs

| Property | Value |
|---|---|
| **Position** | (0, 800, −500) — at the granite summit, on top of the summit station building |
| **Footprint** | 7×7 to 11×11 block wooden platform on top of the summit station |
| **Material** | **Oak planks** (floor) + **spruce fence** (handrails, 1-block tall on all sides) + **oak stairs** (corner accents) |
| **Features** | A single **oak sign** at the center: "Combined Complex — 800 m above sea level, 1.08 Ga granite" |
| **The "Three Sites, One Mountain" sign** | Already in place from Phase 2 (Easter egg #2). The 3×3 oak sign panel + 5-line text at the platform. |
| **The rock identification chart** | Already in place from Phase 2 (Easter egg #9). The 3-block display with item frames. |
| **View** | 360° view of: the mountain range (pink-grey granite cap, cream-grey limestone body, contact ring at Y = 200), the city (138 × 138 m downtown, towers 30–80 blocks tall), the coastal plain (flat grassland, Grand Avenue, small lake, world-edge pier), the SubTropolis horizontal portal (visible at the base of the south face), the Cheyenne outer portal (visible at the contact elevation on the south face) |

### 13.2 Verification

- [ ] Platform is at (0, 800, −500), on top of the summit station.
- [ ] 7×7 to 11×11 block wooden platform, oak planks + spruce fence.
- [ ] "Three Sites" sign and rock ID chart are visible from the platform.
- [ ] Player can stand on the platform and see the entire build: mountain, city, coastal plain.
- [ ] The first glimpse of the world from the summit is the *narrative payoff* of the whole descent.

---

## 14. Phase 11 — Finishing (Easter Eggs, Lighting, Signage)

**Goal:** Finalize the build — the remaining easter eggs, the lighting tuning, the signage review, the visitor journey timing test, the cleanup of temporary markers.

### 14.1 Easter eggs (9 total, all findable)

| # | Name | Position | Block spec | Main path? |
|---|---|---|---|---|
| **1** | **Composite Terrane Plaque** | (−40, 200, −360) in service tunnel contact crossing | 1×2 carved-stone plaque (chiseled calcite + chiseled stone brick) in 3×5 alcove, 6–7 oak signs of text, single redstone lamp | **YES** (the build's Telling Detail) |
| **2** | **"Three Sites, One Mountain" Sign** | (0, 800, −500) at granite summit | 3×3 oak sign panel on 1-block stone brick pedestal, 5-line text | No (off-path, summit only) |
| **3** | **"Service Tunnel — Inspired by the Gotthard Base Tunnel"** | (−100, 0, −300) at SubTropolis end of service tunnel | Oak sign + "SBB CFF FFS" carving on chiseled calcite at gate frame | No (off-path, but visible) |
| **4** | **"Public Shaft — Inspired by the Helsinki Underground Master Plan"** | (60, −95, −100) at bottom of public shaft | "HELSINKI 5,500" carved on chiseled stone brick + oak sign on wall | No (off-path, but visible) |
| **5** | **"World's Largest Underground Business Complex"** | (0, 0, −300) at SubTropolis horizontal portal | Oak sign, black text, channel-letter-style, below the "Hunt Midwest" sign | **YES** (visible from the switchback road) |
| **6** | **"U.S. Space Force — Authorized Personnel Only"** | (0, 200, −420) at Cheyenne outer portal | Oak sign, black text, military stencil | **YES** (visible from the approaching minecart) |
| **7** | **Houston T-marker** | (60, 0, −70) at public shaft entrance, plus Wells Fargo + McKinney Garage | 1-block red wool on white concrete | **YES** (the visual signature of the civilian underground) |
| **8** | **Thrust-Fault Breccia Strip** | (−40, 200, −360) on the floor of the service tunnel at the contact crossing | 1-block-wide cobblestone + calcite strip, 1 block tall × 6 blocks long | **YES** (the minecart rolls across it) |
| **9** | **Rock Identification Chart** | (10, 805, −500) at granite summit | 3-block display with item frames: polished diorite sample (Pikes Peak granite, 1.08 Ga), smooth stone sample (Bethany Falls limestone, 270 Ma), cobblestone + calcite sample (thrust-fault breccia) | No (off-path, summit only) |

### 14.2 Lighting tuning

- **Redstone lamp density** in the public shaft (every 8 blocks, light 12), the service tunnel (every 8 blocks, light 10, except at the contact crossing alcove which is light 8), the SubTropolis sub-basement (every 8 blocks, light 10), the Cheyenne J-curve (every 8 blocks, light 8–10).
- **Sea lantern placement** in the Houston tunnel (every 6 blocks, light 12), the SubTropolis chamber (every 8 blocks, light 12), the city streets (every 10–15 blocks), the summit road (every 20 blocks).
- **Mid-landing window alignment:** the G-Cans-style polished diorite pillar should be *visible* through the 3×3 glass window from the public shaft mid-landing.
- **Contact crossing alcove lighting:** the single redstone lamp on the alcove ceiling must be **on** (it lights the composite terrane plaque).
- **Funicular and summit road lights** verified.

### 14.3 Signage review

- All 9 easter eggs are in place and readable.
- The 4 Houston T-markers (Wells Fargo, McKinney Garage, public shaft entrance + 1 at the public shaft curb) are in the *exact* spots.
- The 7 centerpieces (25-ton blast door, mid-landing, composite terrane plaque, surface pavilion, SubTropolis horizontal portal, Cheyenne outer portal, summit observation platform) all have their center-of-attention signage.
- The 6 binding decisions (Global Scale, Mountain Layout REWORKED, Public Shaft, Service Tunnel REWORKED, Visitor Journey REWORKED, Inter-Site Centerpieces REWORKED, Easter Eggs REWORKED) are reflected in the build.

### 14.4 Visitor journey timing test

- **Target:** 30–45 minutes of focused play for the full inbound journey (coastal plain → Grand Avenue → city → public shaft → SubTropolis → service tunnel → blast door → J-curve → chamber).
- **Return target:** ~13 minutes (5 min funicular + 8 min summit road).
- **If the journey is too short:** add more detail to the SubTropolis chamber walk, or to the Cheyenne J-curve walk.
- **If the journey is too long:** streamline the SubTropolis walk, or remove a switchback on the return road.
- **The 30–45 min target is binding** (Discussion Decision 5, REWORKED for no-ravine design).

### 14.5 Return route test

- Place the minecart with chest at the granite summit station.
- Ride the funicular down to the Cheyenne outer portal.
- Verify the rail is continuous, the powered rail density is correct, the climb is smooth.
- Walk the summit road from the summit to the city plaza.
- Verify the switchbacks are walkable, the contact ring sign is at Y = 200, the city is visible.
- **Total return time ~13 minutes.**

### 14.6 Remove temporary markers

- The 4 corner footprint markers from Phase 1.
- The Phase 2 placeholder portal openings (SubTropolis horizontal portal placeholder, Cheyenne outer portal placeholder) — replaced by the finished portals in Phases 4 and 5.

### 14.7 Final review

- Walk the full journey end-to-end, from the city surface to the Cheyenne chamber and back.
- Verify all 7 centerpieces, all 9 easter eggs, the 4-layer defense-in-depth cross-section, the 30–45 minute journey time, the ~13 minute return time, the visible horizontal contact at the surface and in the tunnel, the composite terrane plaque at the service tunnel contact crossing.

---

## 15. Block Palette Reference

A quick-reference table of every Minecraft block used in the integration layer, organized by zone.

### 15.1 Mountain zones

| Zone | Primary | Secondary | Tertiary / Accent |
|---|---|---|---|
| **Granite peak** | `minecraft:polished_diorite` | `minecraft:diorite`, `minecraft:granite`, `minecraft:granite` (bricks) | `minecraft:stone`, `minecraft:grass_block`, `minecraft:dirt`, `minecraft:snow`, `minecraft:ice`, `minecraft:spruce_leaves`, `minecraft:dark_oak_leaves`, `minecraft:spruce_log`, `minecraft:dark_oak_log`, `minecraft:spruce_sapling`, `minecraft:spruce_fence` (antenna), `minecraft:string` (wires) |
| **Contact ring (Y = 200)** | `minecraft:polished_diorite` (above) over `minecraft:smooth_stone` (below) | `minecraft:cobblestone`, `minecraft:calcite` (breccia strip) | `minecraft:oak_sign` ("Horizontal Contact" sign) |
| **Limestone body** | `minecraft:smooth_stone` | `minecraft:calcite`, `minecraft:sandstone` | `minecraft:chiseled_calcite`, `minecraft:grass_block`, `minecraft:dirt`, `minecraft:oak_leaves`, `minecraft:birch_leaves`, `minecraft:oak_log`, `minecraft:birch_log`, `minecraft:oak_sapling` |

### 15.2 City and Houston tunnel

| Zone | Primary | Secondary | Accent |
|---|---|---|---|
| **City above ground** | `minecraft:stone_bricks` | `minecraft:quartz_block`, `minecraft:white_concrete`, `minecraft:glass_pane` | `minecraft:oak_planks`, `minecraft:oak_door`, `minecraft:oak_fence`, `minecraft:sea_lantern`, `minecraft:red_wool` (T-marker face), `minecraft:white_concrete` (T-marker background), `minecraft:oak_sign` |
| **Houston tunnel** | `minecraft:white_concrete` (walls) | `minecraft:white_wool` (VCT floor), `minecraft:smooth_stone_slab` (dropped ceiling) | `minecraft:sea_lantern`, `minecraft:oak_sign` (channel-letter tenant signs), `minecraft:red_wool` + `minecraft:white_concrete` (T-markers) |

### 15.3 Public shaft (vertical centerpiece)

| Zone | Primary | Secondary | Accent |
|---|---|---|---|
| **Surface pavilion** | `minecraft:glass_pane` (3 walls), `minecraft:stone_bricks` (back wall) | `minecraft:stone_brick_slab` (ceiling) | `minecraft:white_concrete` (pavilion floor), `minecraft:oak_fence` (guard booth), `minecraft:iron_bars` (turnstile), `minecraft:oak_sign`, `minecraft:red_wool` + `minecraft:white_concrete` (T-marker) |
| **Upper section (Y = −3 to −50)** | `minecraft:gray_concrete` (walls) | `minecraft:smooth_stone_slab` (ceiling), `minecraft:light_gray_wool` (lift floor) | `minecraft:iron_bars` (lift enclosure), `minecraft:glass_pane` (window), `minecraft:oak_stairs` (stair), `minecraft:oak_fence` (chase pipe), `minecraft:redstone` (chase power), `minecraft:white_wool` (chase fiber), `minecraft:oak_fence_gate` (chase gate), `minecraft:redstone_lamp` (light) |
| **Mid-landing (Y = −50)** | `minecraft:white_concrete` (walls), `minecraft:stone_brick_slab` (floor + ceiling) | `minecraft:gray_concrete` (pillars) | `minecraft:glass_pane` (3×3 window), `minecraft:smooth_stone_slab` (labelled limestone block), `minecraft:oak_stairs` (bench), `minecraft:iron_door` (2nd exit), `minecraft:redstone_lamp`, `minecraft:oak_sign` |
| **Lower section (Y = −50 to −100)** | `minecraft:smooth_stone` (upper), `minecraft:calcite` (lower) | `minecraft:smooth_stone_slab` (ceiling), `minecraft:light_gray_wool` (lift floor) | `minecraft:iron_bars`, `minecraft:glass_pane`, `minecraft:oak_stairs`, `minecraft:oak_fence` (chase), `minecraft:redstone` (chase), `minecraft:redstone_lamp` |
| **Bottom lobby (Y = −100)** | `minecraft:white_concrete` (walls), `minecraft:stone_brick_slab` (floor) | `minecraft:asphalt` (Hushpuckney Avenue beyond) | `minecraft:iron_bars` (security gate, turnstile), `minecraft:iron_door` (door to Hushpuckney), `minecraft:chiseled_stone_bricks` (HELSINKI 5,500 carved block, Easter egg #4), `minecraft:oak_sign`, `minecraft:redstone_lamp` |

### 15.4 Service tunnel (horizontal centerpiece)

| Zone | Primary | Secondary | Accent |
|---|---|---|---|
| **SubTropolis end (gate)** | `minecraft:smooth_stone` (limestone walls), `minecraft:white_concrete` (lobby accents) | `minecraft:smooth_stone_slab` (ceiling), `minecraft:asphalt` (sub-basement floor) → `minecraft:stone_brick_slab` (tunnel floor) | `minecraft:iron_bars` (security gate), `minecraft:oak_sign`, `minecraft:chiseled_calcite` (SBB CFF FFS carving, Easter egg #3), `minecraft:redstone_lamp` |
| **Limestone section** | `minecraft:smooth_stone` (walls) | `minecraft:smooth_stone_slab` (ceiling), `minecraft:stone_brick_slab` (floor) | `minecraft:rail` + `minecraft:powered_rail` (every 4 blocks), `minecraft:light_blue_wool` (water), `minecraft:red_wool` (power), `minecraft:white_wool` (fiber-optic), `minecraft:yellow_wool` (escape stripe), `minecraft:redstone_lamp` (every 8 blocks) |
| **Contact crossing** | `minecraft:chiseled_calcite` (south/lower wall, limestone) + `minecraft:polished_diorite` (north/upper wall, granite) | `minecraft:smooth_stone_slab` (alcove ceiling), `minecraft:stone_brick_slab` (floor) | **1×2 plaque**: `minecraft:chiseled_calcite` (limestone half) + `minecraft:chiseled_stone_bricks` (granite half). 6–7 `minecraft:oak_sign` of text. 1 `minecraft:redstone_lamp` on alcove ceiling. 1-block-wide `minecraft:cobblestone` + `minecraft:calcite` breccia strip on tunnel floor (Easter egg #8). |
| **Granite section** | `minecraft:polished_diorite` (walls) | `minecraft:polished_diorite_slab` (ceiling, self-supporting), `minecraft:stone_brick_slab` (floor) | `minecraft:rail` + `minecraft:powered_rail` (every 4 blocks), `minecraft:gray_wool` (water), `minecraft:black_wool` (power), `minecraft:red_wool` (fiber-optic), `minecraft:redstone_lamp` (every 8 blocks) |
| **Cheyenne end (checkpoint)** | `minecraft:gray_concrete` (corridor walls), `minecraft:polished_diorite` (accents) | `minecraft:stone_brick_slab` (corridor floor) → `minecraft:gravel` (J-curve beyond) | **25-ton blast door**: 3-block-thick `minecraft:iron_door` in `minecraft:quartz_stairs` frame (6 tall × 6 wide). `minecraft:oak_fence` (guard booth). `minecraft:oak_sign`. `minecraft:sea_lantern` (every 4 blocks). |

### 15.5 SubTropolis and Cheyenne interiors (inherited from 02 and 01 masterplans)

| Zone | Primary | Accent |
|---|---|---|
| **SubTropolis chamber** | `minecraft:smooth_stone` (walls), `minecraft:white_concrete` (8×8×5 pillars) | `minecraft:smooth_stone` (ceiling), `minecraft:gray_concrete` (road), `minecraft:stone_brick` (sidewalks), `minecraft:quartz_block` (central plaza medallion), `minecraft:sea_lantern` (every 8 blocks), `minecraft:oak_sign` (channel-letter tenant signs, pillar numbers) |
| **SubTropolis sub-basement** | `minecraft:smooth_stone` (walls) | `minecraft:stone_brick_slab` (floor), `minecraft:redstone_lamp` (every 8 blocks, dimmer), `minecraft:iron_bars` (service tunnel gate) |
| **Cheyenne chamber** | `minecraft:polished_diorite` (walls), `minecraft:gray_concrete` (floor) | `minecraft:gray_wool` + `minecraft:iron_bars` (1,319 springs), `minecraft:stone_bricks` + `minecraft:quartz_block` (15 buildings), `minecraft:iron_door` (blast doors), `minecraft:quartz_stairs` (frames), `minecraft:sea_lantern` (every 6 blocks) |
| **Cheyenne J-curve** | `minecraft:polished_diorite` (rough-hewn) → `minecraft:gray_concrete` (side branch) → `minecraft:polished_diorite` (chamber) | `minecraft:polished_diorite_slab` (chamber ceiling), `minecraft:gravel` (floor at portal), `minecraft:redstone_lamp` (every 8 blocks) |

### 15.6 Funicular, summit road, summit platform

| Zone | Primary | Accent |
|---|---|---|
| **Funicular rail** | `minecraft:rail` (track), `minecraft:powered_rail` (every 4 blocks) | `minecraft:oak_fence` (station at portal), `minecraft:oak_sign` ("Funicular — Cheyenne to Summit"), `minecraft:minecart` (the funicular car, with chest) |
| **Summit road** | `minecraft:stone_bricks` (road surface, 6 blocks wide) | `minecraft:oak_fence` (handrails), `minecraft:sea_lantern` (streetlights every 20 blocks), `minecraft:oak_sign` (contact ring sign at Y = 200) |
| **Summit observation platform** | `minecraft:oak_planks` (floor) | `minecraft:spruce_fence` (handrails, 1-block tall), `minecraft:oak_stairs` (corner accents), `minecraft:oak_sign` (center), `minecraft:item_frame` (rock ID chart) |

### 15.7 Coastal plain

| Zone | Primary | Accent |
|---|---|---|
| **Coastal plain** | `minecraft:grass_block` (surface), `minecraft:sand` (beach at edges) | `minecraft:oak_leaves`, `minecraft:spruce_leaves`, `minecraft:oak_log`, `minecraft:spruce_log`, `minecraft:oak_sapling` (sparse forest), `minecraft:water` (lake at SE corner), `minecraft:lily_pad`, `minecraft:sugar_cane`, `minecraft:stone_bricks` (Grand Avenue), `minecraft:oak_planks` (sidewalks), `minecraft:sea_lantern` (streetlights) |

---

## 16. Schematic References

### 16.1 Inherited schematic libraries (from the 3 individual site masterplans)

- **Cheyenne master plan:** `D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\04-design\` and `masterplan.pdf`. Schematics for the chamber, the J-curve, the springs, the buildings, the J-curve side branch, the blast doors. The combined complex adds: the outer portal placement at (0, 200, −420) on the south face at the contact elevation, the second 25-ton blast door (scaled 2x), the funicular rail, the "U.S. Space Force" sign.
- **SubTropolis master plan:** `D:\projects\mc-fleet-bot\masterplans\02-subtropolis\04-design\` and `masterplan.pdf`. Schematics for the 200 × 200 chamber, the 5×5 pillar grid, the channel-letter signs, the central plaza, the food court, the tenant fit-outs. The combined complex adds: the public shaft landing, the horizontal portal at (0, 0, −300), the service tunnel entrance at (−100, 0, −300).
- **Houston tunnel master plan:** `D:\projects\mc-fleet-bot\masterplans\03-houston-tunnel-system\04-design\` and `masterplan.pdf`. Schematic for the 24-block sample. The combined complex adds: the public shaft buffer block in the SE corner (already flagged), the T-marker at the public shaft entrance.

### 16.2 New schematics (to be created for the integration layer)

| Schematic | Dimensions | Block count | Notes |
|---|---|---|---|
| **Continuous mountain envelope** | 800 × 600 × 800 (X × Z × Y) with limestone body + granite cap | ~1,650,000 | Two-layer (limestone + granite), contact ring at Y = 200 |
| **Public shaft** | 7 × 7 × 100 | ~5,000 | With mid-landing at Y = −50, top pavilion, bottom lobby |
| **Service tunnel** | 6 × 6 × 120 | ~4,000 | With contact crossing alcove at (−40, 200, −360), contact crossing breccia strip |
| **Surface pavilion** | 7 × 7 × 3 | ~150 | Glass-and-steel pavilion with T-marker, guard booth, turnstile, signage |
| **Mid-landing alcove** | 7 × 7 × 4 | ~200 | With 3×3 glass window, labelled limestone block, bench, info sign |
| **Contact crossing alcove** | 3 × 5 × 3 | ~50 | With 1×2 plaque, 6–7 signs, single redstone lamp, breccia strip on floor |
| **Composite terrane plaque** | 1 × 2 | 2 | chiseled calcite + chiseled stone brick |
| **25-ton blast door (scaled 2x)** | 3 × 6 × 12 | ~30 | iron door + quartz stairs frame + 4-block-deep side branch |
| **SubTropolis horizontal portal** | 4 × 5 × 6 | ~120 | Frame, gate, signs, switchback road connection |
| **Cheyenne outer portal** | 6 × 6 × 8 | ~300 | Frame, blast door recess, checkpoint corridor, guard booth, signage |
| **Funicular rail** | 1 × 400 × 1 | ~400 | 1-block gauge rail, powered every 4 blocks, with passing loop |
| **Summit road** | 6 × 800 × 1 | ~5,000 | 6 switchbacks over 800 blocks of elevation |
| **Summit observation platform** | 7 × 7 × 2 | ~100 | Oak planks + spruce fence, signage |
| **Funicular station** | 10 × 10 × 5 | ~500 | Oak log walls, spruce roof, minecart at top of rail |
| **Easter eggs (9 total)** | Various | ~500 | Signs, item frames, carved blocks, breccia strip |

### 16.3 Custom schematics to make

For the integration layer, the following new schematics need to be created (not in any 01–03 library):
1. **Continuous mountain envelope** with contact ring
2. **Public shaft** with mid-landing
3. **Service tunnel** with contact crossing alcove
4. **25-ton blast door (scaled 2x)**
5. **Surface pavilion** (glass-and-steel)
6. **Funicular rail** (1-block gauge, powered)
7. **Summit road** (switchback)
8. **Summit observation platform** (wooden)

---

## 17. Bot-Build Workflow

### 17.1 Recommended bot commands (mc-fleet-bot API)

| Action | API endpoint | Use case |
|---|---|---|
| `create_world` | `POST /api/bots/{name}/world` | Phase 1: create the world with custom build-height ≥ 1,024 |
| `fill_region` | `POST /api/bots/{name}/fill` | Phase 2: place the mountain bulk (limestone body, granite cap) |
| `fill_region` | `POST /api/bots/{name}/fill` | Phase 3: place the city blocks (above ground) |
| `excavate` | `POST /api/bots/{name}/excavate` | Phase 4: excavate the SubTropolis chamber and sub-basement |
| `excavate` | `POST /api/bots/{name}/excavate` | Phase 5: excavate the Cheyenne chamber and J-curve |
| `place_schematic` | `POST /api/bots/{name}/schematic` | Phase 6: place the public shaft schematic |
| `place_schematic` | `POST /api/bots/{name}/schematic` | Phase 7: place the service tunnel schematic |
| `place_block` | `POST /api/bots/{name}/block` | Phase 8: place the 25-ton blast door, the composite terrane plaque, the breccia strip |
| `place_schematic` | `POST /api/bots/{name}/schematic` | Phase 9: place the funicular rail and summit road |
| `place_schematic` | `POST /api/bots/{name}/schematic` | Phase 10: place the summit observation platform |
| `place_block` | `POST /api/bots/{name}/block` | Phase 11: place the 9 easter eggs, the lighting, the signage |
| `tp_bot` | `POST /api/bots/{name}/tp` | For bot positioning before each place action |

### 17.2 WorldEdit-style fill commands (for reference)

For the bulk mountain placement in Phase 2, the equivalent WorldEdit command is:
```
//pos1 0,0,-800
//pos2 0,800,-200
//set minecraft:polished_diorite   # granite cap (above Y=200)
```
And:
```
//pos1 0,0,-800
//pos2 0,200,-200
//set minecraft:smooth_stone   # limestone body (below Y=200)
```

For the service tunnel:
```
//pos1 -100,0,-300
//pos2 0,200,-420
//set minecraft:smooth_stone   # then overwrite with specific block types by section
```

### 17.3 Schematic placement commands

The mc-fleet-bot schematic placement command takes a `.schem` or `.litematic` file and a target (X, Y, Z) coordinate. The schematic is placed at the target, with the schematic's reference point (typically its NW corner) anchored at the target.

For example, to place the public shaft:
```json
{
  "bot": "BuilderBot1",
  "action": "place_schematic",
  "schematic": "public_shaft_7x7x100.schem",
  "target": { "x": 60, "y": 0, "z": -70 },
  "anchor": "top_center"
}
```

### 17.4 Build order (bot timing)

The recommended bot build order (per `working-plan.md`):
1. **Phase 1 first** (world prep) — the bot must wait for the world to be created before any other work.
2. **Phase 2 second** (mountain envelope) — the bot places the limestone body, then the granite cap, then the contact ring, then the surface features.
3. **Phase 3 third** (city + tunnel) — independent of the mountain's interior.
4. **Phase 4 fourth** (SubTropolis) — depends on Phase 2 (mountain envelope) for the chamber excavation.
5. **Phase 5 fifth** (Cheyenne) — depends on Phase 2 (mountain envelope) for the chamber excavation.
6. **Phase 6 sixth** (public shaft) — depends on Phase 3 (city) and Phase 4 (SubTropolis chamber).
7. **Phase 7 seventh** (service tunnel) — depends on Phase 4 (SubTropolis sub-basement gate) and Phase 5 (Cheyenne outer portal).
8. **Phase 8 eighth** (25-ton blast door + composite terrane plaque) — depends on Phase 7 (service tunnel) and Phase 5 (Cheyenne outer portal).
9. **Phase 9 ninth** (funicular + summit road) — depends on Phase 2 (summit station) and Phase 5 (Cheyenne outer portal).
10. **Phase 10 tenth** (summit observation platform) — depends on Phase 2 (summit station).
11. **Phase 11 eleventh** (finishing) — depends on all previous phases.

---

## 18. Quality Checkpoints

### 18.1 Visual review checklist

- [ ] **Mountain silhouette from 1 mile away:** ONE continuous mountain, no ravine, no two-peak split. Granite cap above Y = 200, limestone body below.
- [ ] **Contact ring visible at Y = 200** as a horizontal color stripe on the south face, 800 blocks E–W.
- [ ] **City reads correctly from above:** 4 anchor towers at cardinals, 8–10 generic towers, skybridges, T-markers at entries.
- [ ] **SubTropolis horizontal portal** at (0, 0, −300) on the south face, with the pink contact band above the cream frame.
- [ ] **Cheyenne outer portal** at (0, 200, −420) on the south face, in the granite, at the contact elevation.
- [ ] **Public shaft pavilion** at (60, 0, −70), glass-and-steel, with T-marker at curb.
- [ ] **Switchback road** connects city plaza to SubTropolis horizontal portal.
- [ ] **Funicular rail** is visible on the east or west face of the granite intrusion, climbing from the outer portal to the summit station.
- [ ] **Summit road** switchbacks down the south face from the summit to the city plaza.
- [ ] **Summit observation platform** is at the granite summit (0, 800, −500), with the "Three Sites" sign and rock ID chart.
- [ ] **"Three Sites, One Mountain" sign** is at the summit (Easter egg #2).
- [ ] **Rock identification chart** is at the summit (Easter egg #9).

### 18.2 Lighting test

- [ ] **Public shaft descent at night** (Y = 0 to Y = −100): lighting visible from city surface, redstone lamps every 8 blocks, mid-landing window showing utility corridor.
- [ ] **Service tunnel at night** (Y = 0 to Y = 200): lighting visible from SubTropolis end, redstone lamps every 8 blocks, dim point at contact crossing (light 8).
- [ ] **Cheyenne outer portal at night:** blast door visible from approaching minecart, sea lantern lighting in the checkpoint corridor.
- [ ] **Contact crossing alcove at night:** single redstone lamp on alcove ceiling lights the composite terrane plaque.
- [ ] **City streets at night:** sea lantern streetlights every 10–15 blocks.

### 18.3 Path / navigation test (the 30–45 minute journey)

Walk the full inbound journey:
1. **Spawn on the coastal plain** at (0, 0, +700) or similar. ~30 s
2. **Walk the Grand Avenue** from south to city. ~3 min (425 blocks at walk speed)
3. **Walk the city streets** to the Combined Complex Transit Hub plaza at (60, 0, −70). ~3 min
4. **Descend the public shaft** (lift or stair) from Y = 0 to Y = −100, with mid-landing pause. ~5 min
5. **Walk the SubTropolis chamber** from the public access lobby to the service tunnel gate at the NW corner (−100, 0, −300). ~8 min
6. **Ride the minecart** from (−100, 0, −300) to (0, 200, −420), 120 blocks climbing at 3.33:1 grade. ~3 min
7. **Walk the J-curve** 800 blocks from the outer portal to the chamber. ~12 min
8. **Tour the Cheyenne chamber** (Combat Operations Center, Air Defense Operations Center, Granite Inn bar). ~5 min
9. **Total:** ~39 min (within the 30–45 min binding target).

Walk the full return:
1. **Ride the funicular** from (0, 200, −420) to (0, 800, −500), 600 elevation gain on 2:1 grade. ~5 min
2. **Walk the summit road** from the summit to the city plaza, 800 blocks of switchback. ~8 min
3. **Total return:** ~13 min (matches the binding target).

### 18.4 Easter egg accessibility test

- [ ] **Easter egg #1** (composite terrane plaque at service tunnel contact crossing): visible from the approaching minecart, text readable in the dim redstone lamp light.
- [ ] **Easter egg #2** ("Three Sites, One Mountain" at summit): visible from the funicular arrival, 3×3 sign panel readable.
- [ ] **Easter egg #3** (Gotthard sign at SubTropolis end of service tunnel): "SBB CFF FFS" carving visible on chiseled calcite at gate frame, main sign readable.
- [ ] **Easter egg #4** (Helsinki sign at bottom of public shaft): "HELSINKI 5,500" carved on chiseled stone brick visible, sign on wall readable.
- [ ] **Easter egg #5** ("World's Largest Underground Business Complex" at SubTropolis horizontal portal): visible from the switchback road.
- [ ] **Easter egg #6** ("U.S. Space Force" at Cheyenne outer portal): visible from the approaching minecart.
- [ ] **Easter egg #7** (Houston T-marker): red wool on white concrete at the public shaft entrance curb, plus Wells Fargo + McKinney Garage entries.
- [ ] **Easter egg #8** (thrust-fault breccia strip): 1-block-wide cobblestone + calcite strip on the floor of the service tunnel at the contact crossing, visible as the minecart rolls across.
- [ ] **Easter egg #9** (rock identification chart at summit): 3-block display with item frames visible from the summit platform.

### 18.5 Defense-in-depth test (the 4 layers)

The build should make the **4-layer defense-in-depth cross-section** visible:
- **Layer 1 — Civilian surface (Houston):** city, sunlit, hot, daylit, public.
- **Layer 2 — Climate-controlled shallow (Houston tunnel):** Y = −6, beige VCT tile, 72 °F, workday hours.
- **Layer 3 — Industrial limestone (SubTropolis):** Y = −100, 65 °F year-round, no humidity, no UV, 24/7.
- **Layer 4 — Military granite (Cheyenne):** Y = 250–400, climate-sealed, spring-mounted, 1,800+ ft of rock above, designed for 30+ days of self-sufficient operation.

The visitor traverses all 4 layers in a single descent.

---

## 19. Open Items

The following items are *not* yet fully resolved by the binding decisions and may need user input or design-team judgment.

### 19.1 Contact elevation (Y = 200) — NOW BINDING

The contact elevation is **Y = 200** in the user brief, `site-plan.md`, and `site-coordinates.json`. Note: `design-plan.md` (older draft) uses Y = 100. **The Y = 200 number is the binding call** per the user brief and `site-coordinates.json`. The service tunnel contact crossing, the surface contact ring, the Cheyenne outer portal placement, the SubTropolis horizontal portal's pink contact band — all reference Y = 200. **An off-by-100-blocks error here breaks the entire build.**

### 19.2 Service tunnel gradient (3.33:1) — NOW BINDING

The service tunnel is an **ascending inclined minecart bore**, 6×6 × 120 blocks, with a **3.33:1 grade** (Y = 0 to Y = 200, 200 blocks of elevation gain over 60 blocks of horizontal travel). The 3.33:1 grade requires powered rails every 4 blocks for the minecart to climb. Note: `design-plan.md` (older draft) uses a 4:1 grade from Y = −160 to Y = +300 (a different geometry entirely). **The 3.33:1 grade with start at Y = 0 and end at Y = 200 is the binding call** per the user brief and `site-coordinates.json`. The tunnel does **not** start at the sub-basement floor (Y = −160); it starts at the SubTropolis chamber's NW corner at Y = 0 (chamber ceiling level, the same Y as the city surface). This is a simpler, more honest geometry.

### 19.3 SubTropolis horizontal portal position (Y = 0, south face) — NOW BINDING

The portal is at (0, 0, −300), on the **south face of the mountain** (the city-facing side), at **city level (Y = 0)**, accessible by a switchback road from the city plaza. Note: `design-plan.md` (older draft) places the portal at the contact elevation (Y = 100). **The Y = 0 position is the binding call** per the user brief and `site-coordinates.json`. The portal is at *city level* — vehicles drive in on a *level* road (no climb, no descent). The switchback road from the city climbs *laterally* up the south face of the mountain and arrives at the portal at Y = 0. This matches the real SubTropolis drive-in portal model.

### 19.4 Return route (funicular + road) — NOW BINDING, NO SKYBRIDGE

The return is **funicular + road**. **No skybridge.** The previous design's skybridge (spanning the ravine) is removed because there is no ravine to span. The funicular goes directly from the outer portal (0, 200, −420) to the granite summit (0, 800, −500); the summit road goes from the summit to the city plaza. The previous design's 3-stage return (funicular + skybridge + road) is replaced with a 2-stage return (funicular + road).

### 19.5 Composite terrane plaque text (geological accuracy)

The plaque text is the **geological story** of the build. The text references the 1.08 Ga Pikes Peak granite and the 270 Ma Bethany Falls limestone — the real ages of the real rocks. The horizontal contact is real geology (granite plutons push up through limestone in mountain ranges worldwide). The text should be reviewed by a geologist for accuracy before the plaque is finalized.

### 19.6 Render distance and simulation distance

The recommended values are view-distance 16, simulation-distance 12. The user may prefer higher (32/16) or lower (12/8) values for performance.

### 19.7 The 5-version delivery vs. continuous delivery

The development plan defines 5 phased versions (v0.1 → v2.0). The user may prefer:
- **5 versions** (the architect's call): the build is delivered in 5 self-contained stages, each stage is a *playable* deliverable.
- **Continuous delivery:** the build is delivered in a single stream, with each phase (1–11) delivered as it is completed.
- **Compressed delivery (v0.1 + v2.0 only):** the MVP (v0.1) and the final build (v2.0) are the only milestones.

### 19.8 The world footprint (1,500 × 1,500)

The world footprint is 1,500 × 1,500 horizontal × 800 vertical (Y = 0 to Y = 800, with the build extending to Y = −100). The user may prefer larger (2,000 × 2,000) or smaller (1,000 × 1,000).

### 19.9 The "Three Sites, One Mountain" sign at the granite summit

The sign is at the granite summit (Y = 800), visible from the funicular arrival. The text references the three real-world sites and the horizontal contact. The user may prefer different text, a different location (e.g., the city surface), or a more detailed version.

### 19.10 The summit observation platform (new 7th centerpiece)

The platform is added in Phase 10 as the new 7th centerpiece. The 6 binding centerpieces (25-ton blast door, mid-landing, composite terrane plaque, surface pavilion, SubTropolis horizontal portal, Cheyenne outer portal) are inherited from the design plan. The 7th is the **summit observation platform**, a small wooden platform with a 360° view. The user may want a different size, a different material, or to skip the 7th centerpiece entirely.

### 19.11 The contact band at the SubTropolis horizontal portal

The portal is at Y = 0, but the contact is at Y = 200. The 1-block-wide **polished diorite** band above the portal frame is the *visible* surface expression of the contact at the portal. Since the contact is 200 blocks above the portal mouth, the band is placed at Y = 200 directly above the portal frame — a pink stripe over the cream portal. The user should verify that this band is visually present and readable from the switchback road.

### 19.12 J-curve geometry (inherited from 01-masterplan)

The 01-masterplan specifies the J-curve as **800 blocks long** with 3 character stages. The J-curve connects the outer portal at (0, 200, −420) to the chamber at (0, 300, −540). The 800-block length may need to be tuned for the integration layer; the contractor should refer to the 01-masterplan contractor brief for the in-J-curve geometry.

---

*End of contractor brief. Read the 3 predecessor briefs (`01-cheyenne-mountain-complex/04-contractor/`, `02-subtropolis/04-contractor/`, `03-houston-tunnel-system/04-contractor/`) for the in-site geometry. Use this brief for the world envelope, the inter-site connections, the centerpieces, and the easter eggs. The contact is at Y = 200. The mountain is ONE continuous mountain with NO ravine.*
