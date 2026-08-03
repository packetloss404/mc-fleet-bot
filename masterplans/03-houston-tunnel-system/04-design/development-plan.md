# Houston Tunnel System — Development Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 03 — Houston Tunnel System
**Author role:** Architectural Designer
**Status:** MVP definition, phased delivery, future extensions, open items
**Date:** 2026

> This is the **development plan** for the Houston tunnel system Minecraft build. The design plan (`design-plan.md`) is the *what*; the working plan (`working-plan.md`) is the *how*. This development plan is the *when* and the *what next* — the MVP definition, the phased delivery from v0.1 to v2.0, the future extensions, and the open items that need user input.
>
> **Build scale reminder (binding from D1):** 6 blocks N–S × 4 blocks E–W sample = 120 × 80 Minecraft blocks total. The phased delivery builds the sample in 5 versions (v0.1 through v2.0), each adding a layer of fidelity.

---

## 1. MVP Definition

### 1.1 The minimum viable build (v0.1)

The **minimum viable build** is the **Wells Fargo Plaza street-level entrance + the descent + the first 1–2 blocks of standard tunnel**. It is the smallest possible build that captures the **soul** of the Houston tunnel system: the almost-secret entrance paradox, the lobby descent, the climate-controlled underground corridor.

**The v0.1 build contains:**

- The **Wells Fargo Plaza tower shell** (the 1980s granite-and-glass lobby, no upper floors): `quartz_block` shell, `light_gray_stained_glass_pane` curtain wall, `iron_block` base, the lobby only (no upper stories, no full tower).
- The **Wells Fargo lobby interior**: `polished_andesite` floor, `quartz_pillar` columns, `quartz_slab` coffered ceiling, `redstone_lamp` accent lighting, the **building directory** `item_frame` array with the "Tunnel → Basement" sign, the **interpretive panel** with "200,000 daily users" / "95+ / 6 mi / 20 ft below grade," the **1930s origin plaque**, the **Wells Fargo Direct Street Access sign**.
- The **Wells Fargo granite plaza**: `polished_andesite` pavers, `stone_brick_wall` edge, `jungle_log` palm cluster, the public bench.
- The **T-marker** at the curb.
- The **bank of elevators** (4 `iron_door` elevators, 2-block-wide × 3-block-tall, `iron_block`-framed, `redstone_lamp` above).
- The **interior stair down** (4-block-wide `polished_andesite_stairs`, 6 blocks deep, `dark_oak_fence` handrail).
- The **floodgate** at the lobby-to-basement transition (the `iron_door` barrier, the `iron_block` frame, the `oak_sign` "Floodgate — Tropical Storm Allison 2001," the `stone_brick_stairs` raised threshold).
- The **first 1–2 blocks of standard 1970s tunnel** (the default 1970s corridor spec: `white_concrete` walls, `white_wool` VCT floor, `smooth_stone_slab` dropped ceiling, `sea_lantern` strips every 4 blocks).

**The v0.1 build does NOT contain:**

- Any other towers (the other 3 anchors, the generic towers, the parking garages).
- Any other tunnel segments (the other 3 food courts, the supporting tenant zones).
- The skybridge.
- The McKinney Garage entry.
- The 1990s / 2010s / 1950s era segments.
- The wayfinding bands (just the lobby directory sign is enough for v0.1).
- The food court.
- The skybridge landing.
- The Theater District stub.
- The after-hours shutdown.
- The time-of-day cycle.
- Most easter eggs (just the interpretive panel + the 1930s origin plaque + the Wells Fargo direct-access sign + the T-marker + the "Tunnel" capitalization).

**Estimated v0.1 block count:** ~3,000 (mostly the tower shell, the lobby, the descent, and the 1–2 blocks of tunnel).
**Estimated v0.1 time:** 2–3 hours of bot time, or 4–6 hours of human time.

### 1.2 What v0.1 captures

The v0.1 build is the **soul in miniature**. A player who walks the v0.1 build should feel:

- The **almost-secret entrance paradox**: the surface is ordinary, the lobby is grand, the descent is the surprise.
- The **lobby-to-basement transition**: the visual shock of going from marble lobby to beige tunnel.
- The **climate-controlled underground corridor**: 72°F, fluorescent, even, slightly dim, slightly claustrophobic.
- The **"I have just stepped into a second city that nobody told me about"** feeling.

The Office Worker's voice: "If I see the Wells Fargo lobby and the descent and the first 1–2 blocks of tunnel, I know this is a Houston tunnel replica. The rest is detail."

### 1.3 What v0.1 can cut

The cuts in v0.1 (compared to the full build) are all **upstream** of the soul. The full build has 158,000 blocks; v0.1 has ~3,000. The cut is **97% of the block count** without losing the **soul**.

The cuts that could come back later (per the v0.5 / v1.0 / v1.5 / v2.0 phasing in §2):
- The other 3 anchor towers (v1.5).
- The other 3 food courts (v0.5).
- The skybridge (v1.5).
- The McKinney Garage entry (v0.5).
- The 1990s / 2010s / 1950s era segments (v1.0).
- The wayfinding bands (v1.0).
- The supporting tenant zones (v1.0).
- The skybridge landing (v1.5).
- The Theater District stub (v2.0).
- The after-hours shutdown (v2.0).
- The time-of-day cycle (v2.0).
- The remaining easter eggs (v2.0).

### 1.4 The non-negotiable must-haves

The non-negotiable must-haves for v0.1 are:

1. The **Wells Fargo Plaza tower shell** (the lobby is the iconic moment; the upper floors are detail).
2. The **Wells Fargo lobby interior** (the polished lobby is what the player sees first).
3. The **bank of elevators and interior stair** (the descent is the visual transition).
4. The **floodgate** (the engineering easter egg that distinguishes the Houston tunnel from a generic underground concourse).
5. The **first 1–2 blocks of standard 1970s tunnel** (the corridor is the dominant visual).
6. The **interpretive panel with "200,000 daily users"** (the punchline of the build).
7. The **1930s origin plaque** (the founding story).
8. The **Wells Fargo Direct Street Access sign** (the famous direct-access hack).
9. The **T-marker at the curb** (the almost-secret quality).
10. The **"Tunnel" capitalization** (the Houston typographic convention).

These 10 elements are the **load-bearing** must-haves. Without them, the build is not a Houston tunnel replica. With them, the build is **unmistakably** a Houston tunnel replica, even at 3,000 blocks.

---

## 2. Phased Delivery

The build is delivered in **5 versions**, each adding a layer of fidelity. The version history is designed so that each version is **playable and recognizable** as a Houston tunnel replica on its own, and the next version adds **detail and scale** without breaking the previous version.

### v0.1 — "The Wells Fargo Entrance"

**What's included:**

- The Wells Fargo Plaza tower shell (lobby only, no upper floors).
- The Wells Fargo lobby interior.
- The Wells Fargo granite plaza.
- The T-marker at the curb.
- The bank of elevators and interior stair.
- The floodgate at the lobby-to-basement transition.
- The first 1–2 blocks of standard 1970s tunnel.
- The 4 v0.1 easter eggs (interpretive panel, 1930s origin plaque, Wells Fargo direct-access sign, T-marker).

**What's the play experience:**

The player spawns on the surface, sees the Wells Fargo Plaza tower, walks the granite plaza, notices the small T-marker at the curb, enters the lobby, sees the building directory with "Tunnel → Basement" in the corner, reads the interpretive panel with "200,000 daily users" / "95+ / 6 mi / 20 ft below grade," reads the 1930s origin plaque, takes the interior stair down past the floodgate, and emerges into a fluorescent-lit 1970s corridor. The journey takes ~2 minutes. The player has just experienced the **soul** of the Houston tunnel system in miniature.

**Estimated v0.1 block count:** ~3,000.
**Estimated v0.1 time:** 2–3 hours of bot time, or 4–6 hours of human time.

---

### v0.5 — "The Food Court"

**What's added on top of v0.1:**

- The **Esperson food court** (the signature, 15–18 storefronts, communal tables, the 13 named tenants + 2 vacant bays, the Sandra Lord plaque).
- A **second quadrant's food court** (the 1001 Fannin modern refresh, 12–14 storefronts, 10 named tenants + 2 vacant bays, the modern minimalist look).
- The **first 30–50 blocks of standard corridor** between the Wells Fargo entry and the Esperson food court, and between the Esperson and the 1001 Fannin.
- The **first 6 supporting tenant zones** in the standard corridor (dry cleaner / barber / credit union clusters).
- The **first wayfinding band** at the Wells Fargo-to-Esperson intersection: "Esperson / 808 Travis →" in `blue_terracotta` + `white_concrete` letterforms + `redstone_lamp` backlight.
- The **second wayfinding band** at the Esperson-to-1001-Fannin intersection: "1001 Fannin / One Fannin →" in `blue_terracotta`.
- The **McKinney Garage direct entry** (the parking-garage lobby, the T-marker, the descent, the first 1–2 blocks of the McKinney Place concourse).
- The **McKinney Place food court** (the public-entry food court, 12–14 storefronts, 15 named tenants + 2 vacant bays, the parking-garage food court feel).
- The **first 4–6 NPC office workers** at the Esperson food court and the McKinney Place food court (visible during peak, invisible during off-peak).

**What's the play experience:**

The player can now **walk the daily commute**: enter at the Wells Fargo, walk the standard corridor to the Esperson food court, eat lunch (lunch rush, NPCs at peak), continue to the 1001 Fannin modern refresh, then back through the McKinney Place concourse (entered via the McKinney Garage direct entry). The journey takes ~5 minutes and covers **2 of the 4 food courts** plus the supporting tenant zones. The player has now experienced the **full daily commute** of the Office Worker.

**Estimated v0.5 block count (cumulative):** ~25,000.
**Estimated v0.5 time (cumulative):** ~10–15 hours of bot time, or 25–35 hours of human time.

---

### v1.0 — "The Tunnel"

**What's added on top of v0.5:**

- The **full 6×4 sample footprint** of the tunnel (all 24 compressed blocks excavated, all standard corridor segments built).
- The **third and fourth food courts**: Pennzoil Place underground (the densest, 12 storefronts) and the Lamar Tunnel food court (the 1001 Fannin extension, 12–14 storefronts).
- The **full time-staggered cross-section** (1970s / 1990s / 2010s / 1950s minimal in their respective quadrants).
- The **full 6 supporting tenant zones** (every dry cleaner / barber / credit union / small service tenant, every mid-corridor tenant).
- The **complete wayfinding system** (~30 wayfinding bands, 4 food-court backlit signage bands, 2 T-markers, 4 lobby building directories).
- The **Pennzoil Place lobby bridge** (the glass-enclosed second-floor connector between the two Pennzoil towers).
- The **JPMorgan Chase Tower lobby** (the most public of the four lobbies, with the second lobby-to-basement descent).
- The **Esperson lobby** (with the second lobby-to-basement descent).
- The **Pennzoil lobby** (with the second lobby-to-basement descent, the 4th descent).
- The **Hines marker** at the Pennzoil Place underground.
- The **"Vacant / For Lease" bays** in the food courts and corridors (~8–10 bays).
- The **water-stained ceiling tiles** in the 1970s-Hines-era corridors (1 in 50 tiles).
- The **NPC expansion** (~20–25 office workers, 5–7 cleaning crew, 4–6 food-court staff, distributed across the food courts and corridors).
- The **"Tunnel" capitalization** applied to every sign in the build.

**What's the play experience:**

The player can now **walk the entire 6×4 sample footprint** in 5–8 minutes, experiencing the 4 food courts, the standard corridor, the time-staggered cross-section, the supporting tenant zones, the wayfinding, the lobby descents, the climate-controlled feel, the brand-color tenants, the daily commute. The build is now a **complete Houston tunnel system replica** at the sample scale. A player who walks the v1.0 build has experienced the **soul of the system** at full scale.

**Estimated v1.0 block count (cumulative):** ~120,000.
**Estimated v1.0 time (cumulative):** ~35–50 hours of bot time, or 90–125 hours of human time.

---

### v1.5 — "The City"

**What's added on top of v1.0:**

- The **full above-ground city**: the 4 anchor towers at full height (Wells Fargo at 70 blocks, JPMorgan Chase at 80, Pennzoil at 50, Esperson at 30–40), the 8–10 generic downtown towers (heights 25–60), the 2–3 parking garages (heights 25), the street grid, the streetlights, the trees.
- The **full skywalk network**: 4 skybridges (McKinney, Travis, Louisiana, Walker) with full interiors, 4 skybridge landings at the second floor of the connected towers.
- The **street-level details**: fire hydrants, parking meters, trash cans, the Wells Fargo granite plaza, the small brick plaza at the Wells Fargo corner.
- The **palm trees and live oaks** every 12–16 blocks.
- The **Wells Fargo lobby bridge** to the second floor (the secondary descent from the skybridge landing to the tunnel).
- The **JPMorgan Chase tapered roofline** (the most architecturally complex single element in the build).
- The **Pennzoil Place mirrored trapezoid silhouette** (the second most architecturally complex single element).
- The **Esperson Art Deco ornamentation** (the smooth_quartz_stairs cornices, the quartz_pillar pilasters, the stepped parapets).
- The **buffer blocks** (the 12 outermost blocks filled with generic downtown towers, parking garages, and the combined-complex transit hub plaza site).

**What's the play experience:**

The player can now **walk the entire two-layer city** — the above-ground downtown with its skyscrapers, parking garages, streetlights, skybridges, and trees, and the below-ground tunnel with its 4 food courts, supporting tenant zones, and time-staggered cross-section. The player can choose: take the **tunnel** (with food courts) or the **skywalk** (with daylight views) or the **street** (with hot Houston summer). The build is now the **complete two-layer city** that the User asked for. The journey from the Wells Fargo entry to the farthest food court (McKinney) takes 2–3 minutes, and the player can see the city's skyline from any one vantage point.

**Estimated v1.5 block count (cumulative):** ~155,000.
**Estimated v1.5 time (cumulative):** ~55–80 hours of bot time, or 150–200 hours of human time.

---

### v2.0 — "The Two-Layer City" (full polish)

**What's added on top of v1.5:**

- The **full combined-complex integration**: the SubTropolis public shaft landing plaza at the southeast corner of the above-ground city (the "Combined Complex Transit Hub"), the Cheyenne Mountain service tunnel terminus at the edge of the city (the "Service Tunnel — Authorized Vehicles Only" sub-basement), the in-world signage marking both as project fictions, the cross-reference to the combined-complex report.
- The **Theater District performance-night stub corridor** at the end of the Lamar–McKinney corridor.
- The **after-hours shutdown** in the McKinney quadrant (redstone clock, dimmed lighting, cleaning crew NPCs, locked elevator banks).
- The **time-of-day lighting cycle** across the entire build (food courts peak at Minecraft-time 0, empty at 6000, dim at 12000, dark at 18000).
- The **remaining easter eggs**: the 72°F climate sign, the Harris County edge sign, the St. Joseph edge sign, the "1st Shift / 2nd Shift / 3rd Shift" sign, the "Vacant / For Lease" bays expansion.
- The **sound design**: the `cave` ambient in the tunnel segments, the `note_block` clatter at the food-court kitchen areas, the `note_block` register beeps at the food counters.
- The **final lighting tuning** across all 16 zones (per §16 of the design plan).
- The **final verification pass** (per §4.7 of the working plan).

**What's the play experience:**

The build is now the **complete, polished, two-layer city** with the combined-complex integration, the time-of-day cycle, the after-hours shutdown, and all 18+ easter eggs. The player can:

- Enter at the Wells Fargo, descend to the tunnel, walk to any of the 4 food courts, take the skywalk to a different building, descend to the tunnel from the skybridge landing, walk back to the surface, take the street to the McKinney Garage direct entry, descend to the McKinney Place food court, take the street to the combined-complex transit hub, descend to the SubTropolis public shaft, or take the service tunnel to the Cheyenne Mountain terminus.
- Experience the **time-of-day cycle**: in the morning, the food courts are packed with office workers at peak; at midday, they empty; in the evening, the McKinney quadrant dims to after-hours; at night, the food courts are dark and the corridors are dimly lit.
- Find all **18+ easter eggs** within 30 minutes of focused exploration.
- Hear the **climate-controlled ambient** of the tunnel, the **kitchen clatter** of the food courts, the **cave muffle** of the underground city.

The build is now a **complete, polished, playable Houston tunnel system replica** at the 6×4 sample scale. The two-layer city is **unmistakable** — the surface is hot, sunny, palm-tree-flavored American downtown, and the underground is cool, fluorescent, climate-controlled, chain-restaurant-flavored civilian pedestrian network.

**Estimated v2.0 block count (cumulative):** ~158,000.
**Estimated v2.0 time (cumulative):** ~60–90 hours of bot time, or 160–220 hours of human time.

---

### Version Summary

| Version | Theme | Block count (cumulative) | Time (bot hrs, cumulative) | Time (human hrs, cumulative) |
|---|---|---|---|---|
| v0.1 | "The Wells Fargo Entrance" | ~3,000 | 2–3 | 4–6 |
| v0.5 | "The Food Court" | ~25,000 | 10–15 | 25–35 |
| v1.0 | "The Tunnel" | ~120,000 | 35–50 | 90–125 |
| v1.5 | "The City" | ~155,000 | 55–80 | 150–200 |
| v2.0 | "The Two-Layer City" | ~158,000 | 60–90 | 160–220 |

**Critical path:** v1.0 ("The Tunnel") is the load-bearing version. Without v1.0, the build is not a complete Houston tunnel system replica. v0.1 and v0.5 are playable but partial; v1.5 and v2.0 add the above-ground city and the polish.

---

## 3. Future Extensions

After v2.0, the build is **feature-complete** for the 6×4 sample. The following are future extensions that could be added without changing the core design.

### 3.1 More food court clusters

The 4 food courts in the build are the 4 documented named clusters. The real Houston tunnel system has **5 named clusters** (the fifth is the **W. Walker Tunnel** food court at 1000 Main St, BG Group Place). The build could add a **fifth food court** as a v2.5 extension:

- **W. Walker Tunnel food court (1000 Main St) `[D]`:** a smaller food court, 6–8 storefronts, the 5 named tenants (El Regio Mexican Grill, Evolutionary Eye Care, Potbelly, Sultan Pepper, Wok and Roll).
- **Block spec:** similar to the McKinney Place food court (1990s refresh, `light_gray_concrete` walls, `gray_wool` floor, `quartz_slab` ceiling, `redstone_lamp` LED panels).
- **Estimated v2.5 block count:** ~3,500.

### 3.2 More city blocks

The 6×4 sample is **24 blocks** of the 95+ block real system. The build could be **extended** to a 8×6 (48 blocks) or 10×8 (80 blocks) sample as a v3.0 / v3.5 extension:

- **8×6 sample (48 blocks):** adds 2 columns and 2 rows of buffer blocks, with 4 more named food court clusters and 4 more anchor towers.
- **10×8 sample (80 blocks):** adds 4 columns and 4 rows of buffer blocks, with 8 more named food court clusters and 8 more anchor towers.

The compression ratio remains **4:1 linear on city block footprint, 1:1 on corridor cross-section, 1:1 vertical**. The additional blocks are generic downtown towers, supporting tenant zones, and additional skybridges.

**Estimated v3.0 block count (cumulative):** ~250,000.
**Estimated v3.0 time (cumulative):** ~100–140 hours of bot time, or 280–360 hours of human time.

### 3.3 Working wayfinding system

The v2.0 build **replicates the style** of the real Houston tunnel wayfinding (1970s–80s signage) but **makes the navigation work** (every major intersection has a "Tunnel →" band). A v2.5 extension could add a **fully working wayfinding system** with **per-corridor signage** that names the **specific buildings** on each side:

- **Per-block signage:** every block of standard corridor has a 1-block `oak_sign` on the wall with the name of the building above.
- **Per-intersection signage:** every intersection has a 4-block `blue_terracotta` wayfinding band with **all 4 directions** named, not just one.
- **The "Tunnel" backlit wayfinding band** upgraded to include the **building name + address** (e.g., "To Wells Fargo Plaza / 1000 Louisiana →" instead of just "Tunnel →").
- **A printed-map standee** (a `lectern` with a `written_book`) at the Wells Fargo and McKinney entries, with the full 95+ block map.

The wayfinding system would be **fully functional**: a player could find their way to any of the 4 food courts from any other food court using only the in-build signage. This is the **chronic weak point** of the real system, fixed in the build.

**Estimated v2.5 wayfinding extension block count:** ~800 (mostly `oak_sign` and `blue_terracotta`).

### 3.4 The 1930s Sterling + Horwitz tunnels as a museum / archaeology layer

The 1930s origin is a **faded reference** in v1.0 and a **single plaque** in v2.0. A v3.0 extension could add a **museum / archaeology layer** that depicts the original 1930s tunnels in their full historical form:

- **The Sterling tunnel (1931, under Fannin):** a short 30-block tunnel segment with **1930s newspaper-building basement** finishes (raw concrete, exposed brick, single incandescent bulb every 8 blocks, a "Houston Post-Dispatch" sign on the wall).
- **The Horwitz tunnel (1935, under Capitol):** a short 30-block tunnel segment with **1930s theater basement** finishes (Art Deco terrazzo, brass-strip floor, popcorn-machine smell referenced by a `note_block` pattern, a "Uptown Center Project" sign with the documented penny arcade / German wine tavern / Rockefeller Center inspiration).
- **The 1947 department-store-to-parking-garage connector** (the first explicit parking-to-retail connector, per research §2.2): a short 20-block segment with a 1940s department-store basement and a 1940s parking-garage basement connected by a single corridor.
- **The 1951 first office-to-office connector** (per research §2.2): a short 20-block segment with two 1950s office-building basements connected.
- **The 1956 Bank of the Southwest / 1010 Garage / Mellie Esperson Building linkage** (per research §2.2 and the 1956 system-idea plaque): a small interpretive museum with **3 connected segments** and a **plaque** explaining the moment a "network" became intentional.

The museum / archaeology layer is a **separate, optional** addition that the player can choose to visit. It is the **1930s origin story** in built form, separate from the modern 1970s-Hines-era default. The build canon: the modern system grew out of the 1930s tunnels; the museum layer is the **archaeological record** of that growth.

**Estimated v3.0 museum layer block count:** ~5,000.

### 3.5 A "tour mode" with NPCs / signs

The real Houston tunnel has **Sandra Lord, "the Tunnel Lady,"** who has led paid walking tours through her company **Discover Houston Tours** since 1991. A v3.0 extension could add a **"tour mode"** with NPCs and signs that simulate a walking tour:

- **Sandra Lord NPC:** a `villager` with a `player_head` skin and a `name_tag` "Sandra Lord — Discover Houston Tours" who spawns at the Wells Fargo entry at Minecraft-time 0 and follows a scripted tour route.
- **Tour stops:** 8–10 interpretive `oak_sign` stops along the tour route, each with a 2–3 sentence historical / cultural note (per the research report and the culture-architecture analysis).
- **Tour duration:** 8–10 minutes of walking, covering the 4 food courts, the standard corridor, the Wells Fargo and McKinney entries, the 1930s origin plaque, the Hines marker, the floodgate, the skybridge.
- **A "tour mode" toggle:** a `lever` at the Wells Fargo entry that spawns Sandra Lord and starts the tour; the tour ends when the player reaches the McKinney entry or the skybridge.

The tour mode is a **content addition**, not a structural change. The build is the same; the tour is a layer of NPC + signage that walks the player through the **documented history** of the system.

**Estimated v3.0 tour mode block count:** ~500 (mostly `oak_sign` and the Sandra Lord NPC spawn).

### 3.6 Connection to the combined complex

The v2.0 build has the **SubTropolis public shaft** and the **Cheyenne Mountain service tunnel** as project fictions at the build's edges. A v3.0 extension could add **full integration** with the combined-complex report:

- **The SubTropolis public shaft:** a 5×5 block elevator / stair shaft from the Combined Complex Transit Hub plaza down to the SubTropolis grid. The shaft has a `light_gray_concrete` interior, an `iron_door` elevator, a `polished_andesite_stairs` stair, and the in-world signage "SubTropolis Public Access · Travel time: ~10 minutes by elevator."
- **The Cheyenne Mountain service tunnel:** a 6×5 block horizontal tunnel at 150+ ft depth, with an `iron_door` security gate, a `light_gray_concrete` interior, and the in-world signage "Service Tunnel — Cheyenne Mountain Complex — Authorized Vehicles Only."
- **The combined-complex map:** a `painting` (or `item_frame` with a `filled_map`) at the Combined Complex Transit Hub plaza showing the full combined-complex map (Cheyenne Mountain, SubTropolis, Houston tunnel system).
- **Coordination with the combined-complex team:** the cross-sections of the public shaft and service tunnel must match the SubTropolis and Cheyenne Mountain termini on the other end. The combined-complex team should confirm the cross-sections and the plaza design at the coordination meeting.

**Estimated v3.0 combined-complex integration block count:** ~2,000.

---

## 4. Open Items for the User

The deliberation resolved what it could. The following 10 questions are flagged for the human / architect that the deliberation could not resolve. The decisions in the design plan, working plan, and development plan are **binding** even before these are resolved.

### Open item 1: The four named anchor buildings' height (Wells Fargo, JPMorgan Chase, Pennzoil, Esperson)

The Realist JPMorgan Chase Tower is 75 stories (compressed to ~18–20 at 4:1). The Office Worker views these towers as the daily view out the window. The architect should confirm the **height of each named tower** and the height range of the generic downtown towers. The named-tower heights from the public record:

- **Wells Fargo Plaza:** 71 stories (Skidmore, Owings & Merrill, 1983) — design plan uses ~70 blocks.
- **JPMorgan Chase Tower:** 75 stories (I.M. Pei, 1982) — design plan uses ~80 blocks (the tallest).
- **Pennzoil Place:** 36 stories (Philip Johnson, 1975) — design plan uses ~50 blocks (per tower).
- **Esperson (808 Travis / 815 Walker):** two ~18-story Art Deco towers (Niels Esperson, 1929 / 1940) — design plan uses ~35 and ~30 blocks.

The architect should confirm the design plan's heights match the public record and adjust if needed.

### Open item 2: The 1930s dual-origin plaque design

The panel approved one combined plaque at the Wells Fargo entry: "Houston Tunnel System — Established 1930s. First tunnel: Ross Sterling under Fannin (1931) and Will Horwitz under Capitol (1935). Inspired by the Rockefeller Center underground concourse." The architect should decide whether this is **one plaque or two** (Sterling + Horwitz separately), the **size** (the design plan uses 3 blocks wide × 2 blocks tall), the **material** (the design plan uses `polished_andesite` base + `oak_sign` face), and the **placement** (the design plan places it on the east wall of the Wells Fargo lobby, next to the interpretive panel).

### Open item 3: The "Combined Complex Transit Hub" plaza design

The SubTropolis public shaft lands at a plaza at the **edge** of the above-ground city (southeast corner, in a buffer block). The panel approved the *concept* and the *placement*. The architect should decide the **size** (the design plan reserves a 10×10 block area), the **design** (open plaza, glass-and-steel canopy, security guard booth, turnstile, "SubTropolis / Combined Complex Transit" sign), and the **relationship to the surrounding buffer blocks**. The panel did not specify the design.

### Open item 4: The "after-hours shutdown" scene design

The Tier 3 flavor feature (k) is an after-hours shutdown in the McKinney quadrant: lights off, security-locked elevator bank, "Tunnel Closed 6:00 PM" sign. The architect should decide whether this is a **static** scene (always rendered as after-hours) or a **time-of-day** lighting cycle (the McKinney quadrant goes dark at Minecraft-time 12000). The Office Worker prefers the time-of-day cycle; the design plan uses the time-of-day cycle (per §16.9 and Phase 7). The architect should confirm.

### Open item 5: The Theater District "performance-night" stub corridor

The Tier 2 signature feature (j) is a stub corridor with a "Tonight: Performance 7:30 PM" sign and a darkened section beyond. The architect should decide the **size** (the design plan uses 3 blocks wide × 3 blocks tall × 10 blocks long), the **location** (the design plan places it at the end of the Lamar–McKinney corridor), the **sign design** (the design plan uses a 2-block-wide × 1-block-tall `oak_sign`), and whether the darkened section is **blocked** (an `iron_door` with a "Tunnel Closed" sign) or **extending** (a real corridor that loops back). The design plan uses the **blocked** option for simplicity.

### Open item 6: The "1950s-era minimal corridor segment" design

The Tier 2 signature feature (i) is a 1950s-era bare-concrete / older-fluorescent / no-drop-ceiling corridor segment representing the 1930s/1950s origin sections. The architect should decide the **size** (the design plan uses 20–30 blocks long), the **location** (the design plan places it in the Lamar quadrant, accessible from the 1001 Fannin food court), and the **level of detail** (bare concrete walls, exposed pipes, single fluorescent tube, no dropped ceiling, plaque). The design plan uses 20–30 blocks in the Lamar quadrant.

### Open item 7: Inter-site coordination with the SubTropolis and Cheyenne Mountain teams

The above-ground city is sized to receive the SubTropolis public shaft (~5×5 blocks cross-section) and the Cheyenne Mountain service tunnel (~6×5 blocks cross-section). The Houston terminus of each is a `[X]` fiction; the SubTropolis and Cheyenne Mountain termini are specified in their respective discussion documents. The **combined-complex team should confirm** the cross-sections and the plaza design at the next coordination meeting. This is not a design question; it is a coordination question.

### Open item 8: The "T-marker" entrance sign design

The T-marker is the small "T" sign on the sidewalk that marks a tunnel entry. The research notes it is small and rarely photographed, and the visual-assets catalog flags it as a gap. The architect should design the T-marker based on the **Houston convention** (small, blue, "T" inside a circle, on a 6-foot pole on the sidewalk at the two public entries). The design plan uses a 1-block `oak_fence` post (4 blocks tall) with a 1-block `oak_sign` at the top, a `blue_concrete` background, a `light_blue_concrete` circle, and a `white_concrete` "T" letter. The architect should confirm the size, the color, and the placement.

### Open item 9: The "Vacant / For Lease" bay count and placement

The research notes ~30% of the food-court bays are vacant at any given time in the real system. The architect should decide **how many "Vacant" bays** to render in each food court and their placement. The design plan uses:

- **Esperson:** 2 vacant bays.
- **Pennzoil Place:** 0 vacant bays (the densest food court has no vacancies in the design plan).
- **1001 Fannin:** 2 vacant bays.
- **McKinney Place:** 2 vacant bays.
- **Standard corridors:** 5–7 vacant bays across the 6 supporting tenant zones.

The total is 11–13 vacant bays. The Office Worker notes that vacant bays are a documentary detail, not a loss. The architect should confirm the count and placement.

### Open item 10: The 10–12 named tenant selection

The panel approved **10–12 named tenants** from the documented downtownhouston.org directory. The architect should select the **final 10–12** from the documented list, ensuring a mix of food (Chick-fil-A, Potbelly, Salata, Treebeards, Otto's, Maggie Rita's, Blackwater Coffee, Brown Bag Deli, Shipleys, Kolache Factory), services (Sparkle Dry Cleaners, Randie's Barbershop), and a coffee / snack / dessert category. The design plan uses **40+ named tenants** across the build (the design plan goes beyond the 10–12 minimum because the 4 food courts and 6 supporting tenant zones need full coverage). The architect should confirm the final selection.

---

*End of development plan. The design plan, working plan, and development plan together provide the complete architectural, construction, and evolution spec for the Houston tunnel system Minecraft build. The build is ready for the AI Contractor Writer.*
