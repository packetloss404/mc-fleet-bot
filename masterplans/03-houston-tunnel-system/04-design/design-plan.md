# Houston Tunnel System — Architectural Design Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 03 — Houston Tunnel System
**Author role:** Architectural Designer
**Status:** Building-by-building, room-by-room design spec
**Date:** 2026

> This is the **architectural design** for the Houston tunnel system Minecraft build. The Site Planner (running in parallel) is producing the coordinate-precise site plan and block grid; this document produces the building-level specs, materials, and the room-by-room details the AI Contractor Writer needs to actually place blocks. All section numbers reference the 7-topic deliberation (`03-discussion/discussion-notes.md`), and the master-plan legend `[D]` / `[I]` / `[X]` from Topic 4 is used throughout.
>
> **Build scale reminder (binding from D1):** 6 blocks N–S × 4 blocks E–W = 24 compressed city blocks, ~120 × 80 Minecraft blocks total (4:1 linear compression on building footprint). Long axis N–S along Main / Fannin / Travis / Louisiana / Walker / Capitol; E–W cross streets Rusk / McKinney / Dallas / Lamar. Corridor cross-section 1:1 (10–20 ft real = 3–6 blocks in Minecraft, since 1 ft ≈ 0.3 block). Vertical 1:1 for tunnel (20 ft below grade = 6 blocks below street). Cameron 2015 grid labels (A-15 through P-29) are the build-block identifiers.

---

## 1. Design Philosophy

### 1.1 The soul, restated

The Houston tunnel system is the **civilian, climate-controlled, retail-flavored, workday-only, two-layer city**. It is the third identity in the trilogy — *not* a hardened military bunker (Cheyenne Mountain), *not* an industrial mine (SubTropolis), but the **underground-basement-as-parallel-city**. It is mundane, it is secret, and it is one of the largest pedestrian networks in the United States — all at once. The single feeling the build must produce: *you have just stepped into a second city that nobody told you about, and the people walking past you in their office IDs have been doing this every weekday at lunchtime for years.* The above-ground Houston summer (94.5°F, dew point in the mid-70s) is what the system is *answering*; the build must make the surface feel like the *enemy* and the 72°F basement feel like the *refuge*.

### 1.2 The "almost-secret" entrance paradox

The single most Houston-tunnel architectural fact is the **entrance paradox**: only **Wells Fargo Plaza (1000 Louisiana)** and **McKinney Garage on Main (930 Main)** offer direct street-level access. Every other of the 80+ access points is inside a private office-tower lobby, accessed by an interior stair, escalator, or elevator that starts in the building's marble-and-granite lobby. The first-time visitor does not know the system exists; the regular uses the Wells Fargo door. The build must convey this paradox: the surface is **ordinary American downtown**, the surface shows **almost no evidence** of the underground city, and the only on-street indication is the small brass **T-marker** plaque at the curb. The player should feel that they have *discovered* something, not that they have been *shown* it.

### 1.3 The 1970s Hines era as the architectural identity

The architectural identity of the system is **not** the 1930s origin (Sterling under Fannin, Horwitz under Capitol). It is the **1960s–70s Gerald D. Hines expansion**, when 27 major buildings were added to downtown and the tunnels became climate-controlled, retail-served, and publicly accessible. The signature look is **1970s office-basement construction**: dropped acoustic-tile ceiling in a 2×2 or 2×4 grid, painted concrete-block walls in off-white, fluorescent or LED troffer lighting, VCT or terrazzo floor, 8–9 ft ceilings. The 1930s origin is a **faded-reference plaque**; the 1970s Hines era is the **default visual**. The 2010s LED refresh at 1001 Fannin is the **modern contrast**; the build must show the time-staggered cross-section of 1970s / 1990s / 2010s commercial interior design *side by side* (per Topic 2, Tier 2, feature (i)).

### 1.4 The "Office Worker" perspective

The Office Worker on the deliberation panel articulated the **daily routine**: glass revolving door at Wells Fargo → elevator bank → interior stair down → long corridor with a dropped ceiling → the Esperson food court on the left → Chick-fil-A on the corner → "Tunnel → Pennzoil Place" sign → corridor narrows → ramp up to the Pennzoil lobby → two Philip Johnson mirrored towers visible through the lobby glass → back down to the tunnel → "Tunnel → 1001 Fannin" sign → corridor widens at the Lamar Tunnel food court → Blackwater Coffee → Charlies BBQ → lunch. The build must render **that commute**, not a generic mall. The defining experiences are the **lunch rush** (11 a.m. to 1 p.m., shoulder-to-shoulder in the food court) and the **lock-up** (6 p.m., lights dim, security-mode, the corridor becomes back-of-house for the office buildings above). The food court at peak is the **loudest, brightest, most alive** moment in the build; the corridor at 3 p.m. is the **quietest**.

---

## 2. Master Material Palette (Minecraft Blocks)

The Houston tunnel palette is **narrow and specific**: cool neutrals (white, cream, light gray, beige) punctuated by the bright primary colors of tenant signage. The palette is the inverse of the Cheyenne Mountain (granite-and-steel blast-resistant) and SubTropolis (raw limestone) palettes. Every block on this list is approved for the Houston build; any block not on this list requires design-team approval.

### 2.1 Primary palette (above-ground city + tunnel structure)

| Element | Real-world material | Minecraft block (primary) | Minecraft block (secondary) |
|---|---|---|---|
| Tower shell (1970s–80s) | Granite-and-glass curtain wall | `quartz_block` (smooth) | `light_gray_concrete` |
| Tower shell (1990s–2020s) | Steel-and-glass curtain wall | `white_concrete` | `gray_concrete` |
| Tower window | Reflective glass | `light_gray_stained_glass_pane` | `gray_stained_glass_pane` |
| Tower window (dark mirrored) | Pennzoil Place mirrored glass | `black_stained_glass_pane` | `gray_stained_glass_pane` |
| Tower structural accents | Steel columns / corner trim | `iron_block` | `light_gray_concrete` |
| Tower base / plinth | Granite or marble base | `polished_andesite` | `polished_diorite` |
| Art Deco ornamentation | Esperson terracotta + limestone | `smooth_quartz_stairs` | `quartz_pillar` |
| Street surface | Asphalt | `gray_concrete` | `stone_bricks` |
| Street lane lines | Painted asphalt | `yellow_concrete` (single rows) | `white_concrete` (single rows) |
| Sidewalk | Concrete pavers | `smooth_stone_slab` (top half) | `stone_bricks` (bottom half) |
| Curb | Concrete curb | `stone_brick_stairs` | `stone_brick_slab` |
| Plaza paver | Brick or stone | `bricks` | `polished_andesite` |
| Parking-garage exterior | Open-deck concrete | `gray_concrete` | `stone_bricks` |
| Parking-garage interior | Bare concrete + painted lines | `light_gray_concrete` | `yellow_concrete` (lines) |
| Tree (palm) | Houston palm | `jungle_log` + `jungle_leaves` | `oak_leaves` |
| Tree (shade) | Live oak | `dark_oak_log` + `dark_oak_leaves` | — |
| Tunnel wall (default) | Painted concrete block | `white_concrete` | `light_gray_concrete` |
| Tunnel wall (older) | Raw concrete block | `smooth_stone` | `stone_bricks` (lower courses) |
| Tunnel wall (accent stripe) | Painted accent | `light_gray_concrete` (single rows every 5–7 blocks) | — |
| Tunnel floor (default) | 1970s VCT off-white | `white_wool` | `smooth_stone_slab` |
| Tunnel floor (1970s terrazzo) | Warm-earth terrazzo | `polished_andesite` | `smooth_stone_slab` (brass-strip pattern) |
| Tunnel floor (2010s porcelain) | Dark charcoal porcelain | `gray_wool` | `black_concrete` |
| Tunnel floor (utility) | Sealed concrete | `light_gray_concrete` | `gray_concrete` |
| Dropped ceiling (1970s) | Acoustic-tile white | `smooth_stone_slab` (top side) | `quartz_slab` |
| Dropped ceiling (2010s food court) | Black acoustic | `black_concrete` (top side) | `gray_concrete` |
| Dropped ceiling grid | T-bar metal grid | `stone_slab` (single rows as grid pattern) | `light_gray_wool` |
| Ceiling tile (water-stained) | Stained acoustic | `light_gray_wool` patches | `gray_wool` patches (1 in 50 tiles) |
| HVAC grille (ceiling) | Vent register | `iron_trapdoor` | `iron_bars` |
| HVAC duct (visible in older segments) | Galvanized ductwork | `iron_block` (1-block runs) | `light_gray_concrete` |
| Sprinkler riser | Red-painted pipe | `red_concrete` (1-block vertical runs) | — |
| Fluorescent troffer | 2×4 fluorescent | `sea_lantern` (in slab) | `redstone_lamp` (active state) |
| LED panel (2010s food court) | 2×2 LED panel | `redstone_lamp` (in black_concrete) | `end_rod` (accent strips) |
| Backlit signage band | Illuminated plastic band | `redstone_lamp` strip + `blue_concrete` background + `white_concrete` letters | `blue_terracotta` |
| Tenant storefront frame | Anodized aluminum | `iron_bars` (window frame) | `light_gray_concrete` (door frame) |
| Tenant storefront glass | Plate glass | `glass_pane` | `white_stained_glass_pane` |
| Tenant awning (fabric) | Canvas awning | `white_wool` (Chick-fil-A) | `orange_wool` (Potbelly) |
| Tenant counter (interior) | Stainless / laminate | `quartz_slab` (counter top) | `iron_block` (counter base) |
| Tenant menu board (interior) | Backlit menu | `oak_sign` (with text) | `item_frame` on `smooth_stone_slab` |
| Communal table (food court) | Laminate table | `dark_oak_slab` (top) | `dark_oak_fence` (base) |
| Communal chair (food court) | Moulded plastic | `stairs` (oak_stairs) | — |
| Restroom wall | White ceramic tile | `quartz_block` | `white_concrete` |
| Restroom floor | Quarry tile | `red_terracotta` | `brown_terracotta` |
| Restroom partition | Metal partition | `iron_bars` + `white_concrete` | — |
| Sump-pump room | Concrete utility room | `light_gray_concrete` | `gray_concrete` |
| Floodgate (Wells Fargo entry) | Aluminum flood barrier | `iron_door` (vertical) | `iron_block` (frame / brackets) |
| T-marker (sidewalk) | Brass "T" plaque | `oak_pressure_plate` (inlaid) + `oak_sign` (with "T" text) | `light_gray_concrete` (sidewalk base) |
| Skybridge wall | Glass curtain wall | `glass_pane` | `white_stained_glass_pane` |
| Skybridge frame | Brushed aluminum | `iron_bars` | `light_gray_concrete` |
| Skybridge floor | Concrete + carpet | `white_wool` (carpet) | `smooth_stone_slab` (substrate) |
| Skybridge ceiling | Acoustic tile | `smooth_stone_slab` | `quartz_slab` |
| Building directory (lobby) | Brushed-metal directory | `item_frame` array on `polished_andesite` wall | `oak_sign` (labels) |
| Lobby floor | Marble or granite | `polished_andesite` | `polished_diorite` (accent) |
| Lobby column | Marble-clad column | `quartz_pillar` | `polished_andesite` (capital / base) |
| Lobby ceiling | Acoustic tile or coffered | `quartz_slab` | `smooth_stone_slab` |
| Bank of elevators | Brushed-steel elevator bank | `iron_block` (doors) + `light_gray_concrete` (surround) | `iron_door` (operable elevator doors) |
| Interior stair (down to tunnel) | Terrazzo stair | `polished_andesite_stairs` | `smooth_stone_slab` (treads) |
| Escalator (newer buildings) | Moving stair | `light_gray_concrete` (housing) + `smooth_stone_slab` (steps) | `redstone_lamp` (handrail lighting) |
| Revolving door | Glass-and-metal | `glass_pane` (curved wall approximation) | `iron_bars` (frame) |
| Security turnstile | Stainless turnstile | `iron_bars` (cross pattern) | `light_gray_concrete` (housing) |
| Building name plaque | Brushed-metal signage | `oak_sign` (engraved text) on `polished_andesite` | — |
| Tunl-→ sign (in lobby directory) | Directional plaque | `blue_concrete` background + `white_concrete` letter "T" | `oak_sign` ("Tunnel → Basement") |
| Wayfinding band (in tunnel) | Backlit wayfinding | `blue_terracotta` (background) + `white_concrete` (text dots/letters) | `redstone_lamp` (backlight, 1 in 3 blocks) |
| Exit sign (green) | Illuminated exit | `lime_concrete` (background) + `white_concrete` (figure) | `redstone_lamp` (backlight) |
| Fire alarm (red) | Pull station | `red_concrete` (small accent) | `oak_sign` ("Fire Alarm") |
| Cleaning cart | Service cart | `iron_bars` (frame) + `white_wool` (cloth) | `oak_trapdoor` (bucket) |

### 2.2 Secondary palette (tenant zone brand colors)

These are the **branded** block colors used for tenant signage, awnings, and storefront accents. The chain brands are documented `[D]` per Topic 4; the specific application is `[I]`.

| Brand | Brand color | Primary block | Accent block |
|---|---|---|---|
| **Chick-fil-A** | Red | `red_concrete` | `red_wool` (awning) |
| **Starbucks** | Green | `green_concrete` | `lime_wool` |
| **Potbelly** | Orange | `orange_concrete` | `orange_wool` (awning) |
| **Salata** | Red-orange | `red_concrete` | `orange_concrete` (logo dots) |
| **Treebeards** | Brown + green | `brown_concrete` | `green_concrete` (logo leaf) |
| **Otto's BBQ** | Red + black | `red_concrete` | `black_concrete` (logo bar) |
| **Maggie's Rita's** | Red + yellow | `red_concrete` | `yellow_concrete` (logo flame) |
| **Murphy's Deli** | Green + white | `green_concrete` | `white_concrete` (logo letters) |
| **Which Wich** | Black + orange | `black_concrete` | `orange_concrete` |
| **Brown Bag Deli** | Brown | `brown_concrete` | `white_concrete` (logo) |
| **Blackwater Coffee** | Black + cream | `black_concrete` | `white_concrete` (logo) |
| **Kolache Factory** | Red + tan | `red_concrete` | `orange_terracotta` |
| **Michael's Cookie Jar** | Brown + cream | `brown_concrete` | `white_concrete` |
| **Shipley's Do-nuts** | Pink + white | `pink_concrete` | `white_concrete` |
| **Sparkle Dry Cleaners** | Blue + white | `light_blue_concrete` | `white_concrete` |
| **Randy's Barbershop** | Red + white + blue | `red_concrete` (barber pole stripe) | `white_concrete` (pole) + `blue_concrete` (pole) |
| **Comerica Bank** | Red + yellow | `red_concrete` | `yellow_concrete` |
| **First Service Credit Union** | Blue + gold | `blue_concrete` | `yellow_concrete` |
| **Paradise Gifts** | Magenta | `magenta_concrete` | `white_concrete` |
| **Tunnel Newstand** | Yellow + black | `yellow_concrete` | `black_concrete` |
| **Glamours Sundries** | Pink + black | `pink_concrete` | `black_concrete` |
| **Uncle Sharkii Poke** | Teal | `cyan_concrete` | `white_concrete` |
| **La Taquiza** | Yellow + red | `yellow_concrete` | `red_concrete` |
| **Smoothie King** | Yellow + green | `yellow_concrete` | `green_concrete` |
| **Boost Mobile / Generic telecom** | Yellow | `yellow_concrete` | `black_concrete` |
| **Generic "Vacant / For Lease"** | Beige | `light_gray_wool` (awning) | `white_concrete` (sign) |

### 2.3 Atmospheric palette (subtle, low-density)

These are **occasional** blocks used to add texture and the "time-staggered cross-section" feel. They are not bulk blocks; they are the *faded references* and the *atmospheric easter eggs* from Topic 5.

- **Water-stained ceiling tile:** `light_gray_wool` patches (1 tile in ~50) at the bottom of `smooth_stone_slab` ceiling panels.
- **Older 1970s bare concrete:** `smooth_stone` (raw, unpainted) for the 1950s-era minimal corridor segment (Topic 2, Tier 2, feature (i)).
- **1990s refresh color:** `light_gray_concrete` walls (cooler, grayer than the 1970s off-white).
- **2010s LED refresh:** `black_concrete` ceiling + `gray_wool` floor + `end_rod` accent lighting.
- **Back-of-house staff door:** `iron_door` (unlocked, with a small `oak_sign` "Authorized Personnel").
- **Cleaning cart:** `iron_bars` + `white_wool` (per primary palette).
- **"1st Shift 06:00 / 2nd Shift 14:00 / 3rd Shift 22:00"** signage: `oak_sign` (white text on dark wood) on `light_gray_concrete` wall.
- **Floodgate marker:** `oak_sign` ("Floodgate — Tropical Storm Allison 2001") on `light_gray_concrete` wall next to the iron_door gate.
- **HVAC hum:** ambient `cave` sound (a Minecraft ambient category that matches the muffled-underground feel).

---

## 3. The Above-Ground City

The above-ground city is the **primary layer** of the Houston site (per Topic 7). It is a representative downtown Houston using Houston urban-design vocabulary, with **4 named anchor buildings** and **8–10 generic downtown towers**, plus the **named street grid** and **named skywalk network**. The above-ground city is what the player sees when they emerge from the tunnel or descend from the skywalk; the tunnel system is a *feature* of the city, not the other way around.

### 3.1 Footprint and compression

- **Total above-ground footprint:** 6 blocks N–S × 6 blocks E–W = 36 compressed blocks at 4:1 linear compression (24 sample + 12 buffer), per Topic 6 / D6.
- **Sample footprint:** 6 blocks N–S × 4 blocks E–W = 24 compressed blocks. The 4 named anchor buildings occupy the 4 quadrants; the buffer blocks (the 12 outermost blocks) hold generic towers, parking garages, the Combined Complex Transit Hub plaza, and one or two named skybridge termini.
- **Vertical scale:** compressed. A real 71-story tower is rendered at ~70 blocks (1 block per story, slightly compressed). The tallest tower (JPMorgan Chase) reaches ~80 blocks; the smallest generic towers are ~25 blocks.
- **Climate:** hot plains / desert biome above ground; the lobby descent is the **deliberate design moment** that breaks the climate and inserts the player into the 72°F underground.

### 3.2 The street grid (`[D]` per D6)

The street grid is **documented** and uses the actual Houston CBD names. Signs in the build read these names.

**N–S streets (long axis, 6 streets, 6 blocks apart):**
1. **Main Street** — the westernmost. The McKinney Garage direct street entry is here (930 Main).
2. **Fannin Street** — the Sterling 1931 origin runs under here (a faded-reference plaque only).
3. **Travis Street** — the Esperson 808 Travis / 815 Walker are here; the JPMorgan Chase Tower is here.
4. **Louisiana Street** — Wells Fargo Plaza 1000 Louisiana and Pennzoil Place 711 Louisiana are here.
5. **Walker Street** — Esperson 815 Walker.
6. **Capitol Street** — the Horwitz 1935 origin runs under here (a faded-reference plaque only).

**E–W cross streets (4 streets, between the N–S streets):**
1. **Rusk Street** — the northernmost cross street.
2. **McKinney Street** — the McKinney Garage 930 Main concourse is here; the McKinney Street skybridge crosses over this street (the canonical skybridge reference).
3. **Dallas Street** — middle cross street.
4. **Lamar Street** — the Lamar Tunnel food court (1001 Fannin) is here.

**Street design (`[I]` per Topic 4, generic commercial vocabulary):**
- **Width:** 5–6 blocks (one-way grid, narrower than the 80m / 16-block real Houston streets at 4:1 compression = 5–6 blocks).
- **Surface:** `gray_concrete` (asphalt) with `yellow_concrete` painted centerline and `white_concrete` lane lines.
- **Sidewalks:** 1-block-wide `smooth_stone_slab` on each side, with `stone_brick_stairs` curb transitions.
- **Parallel parking:** `gray_concrete` strips with painted `white_concrete` parking-bay lines on one side of each street.
- **Streetlights:** `iron_fence` pole + `redstone_lamp` lamp head, every 8 blocks.
- **Fire hydrants:** `red_concrete` (small) at corners.
- **Trash cans:** `iron_bars` (cylindrical approximation) at corners.
- **Trees:** palm trees (`jungle_log` + `jungle_leaves`) and live oaks (`dark_oak_log` + `dark_oak_leaves`) alternating every 12–16 blocks.
- **Plaza:** one small brick (`bricks`) plaza at the Wells Fargo corner (matching the real Wells Fargo Plaza public space).

### 3.3 The 4 named anchor buildings

The four anchor buildings are **rendered in compressed scale** with their **documented architectural signatures** `[D]`. They occupy the four quadrants of the sample footprint.

#### 3.3.1 Wells Fargo Plaza (1000 Louisiana) — Northwest quadrant

- **Real reference:** 71-story postmodern office tower (Skidmore, Owings & Merrill, 1983) at 1000 Louisiana Street. One of the two direct street-level entries to the tunnel system.
- **Build:** a `quartz_block` (smooth) tower with a glass curtain wall (`light_gray_stained_glass_pane`) and an `iron_block` base / plinth. Height ~70 blocks. The signature feature is a **granite plaza** at the corner of Louisiana and Rusk: `polished_andesite` pavers, a low `stone_brick_wall` edge, a `jungle_log` palm cluster, a public bench (`oak_stairs` + `oak_slab`). The plaza is the **first surface thing** the player sees when emerging from the Wells Fargo direct entry.
- **Block identifier:** A-15 (per Cameron 2015 grid).

#### 3.3.2 JPMorgan Chase Tower (600 Travis) — Northeast quadrant

- **Real reference:** 75-story tapered modernist tower (I.M. Pei, 1982), the tallest building in Houston. Site of the original Will Horwitz 1935 Uptown Theater (Texan Theater / Uptown Theater cluster), demolished in 1953 to make way for the modern tower.
- **Build:** a `white_concrete` tower with a `gray_stained_glass_pane` curtain wall and a distinctive **tapered** roofline (1-block setback every 5 stories for the top 20 stories). Height ~80 blocks (the tallest in the build). The lobby is a `polished_andesite` and `quartz_pillar` grandeur that is the **most public** of the four lobbies.
- **Block identifier:** C-18.

#### 3.3.3 Pennzoil Place (711 Louisiana) — Southwest quadrant

- **Real reference:** Two mirrored trapezoidal towers (Philip Johnson, 1975) at 711 Louisiana. The most architecturally distinctive of the four anchors. The densest single food court in the tunnel system is below.
- **Build:** **two** towers, each `black_concrete` shell with a `black_stained_glass_pane` (dark mirrored) curtain wall, separated by a 1-block gap, each height ~50 blocks. The trapezoidal silhouette is the signature: each tower has a 1-block setback every 4 stories (the build approximates the trapezoid with stepped setbacks). A small **lobby bridge** at the second floor connects the two towers (the real Pennzoil Place has a glass-enclosed lobby bridge; the build uses a `glass_pane` corridor).
- **Block identifier:** D-21.

#### 3.3.4 Esperson (808 Travis / 815 Walker) — Southeast quadrant

- **Real reference:** Two Niels Esperson Art Deco towers (1929 / 1940) at 808 Travis and 815 Walker. The Esperson food court is below 808 Travis; the smaller of the two Art Deco twins gets a faded-reference treatment.
- **Build:** **two** Art Deco towers, each `quartz_block` (smooth) shell with `smooth_quartz_stairs` ornamentation (Art Deco cornice and entrance surround) and a `gray_stained_glass_pane` window grid. Heights ~35 and ~30 blocks. The Art Deco signature: stepped parapets (1-block setbacks at the roofline), a 1-block-wide vertical pilaster (a `quartz_pillar` running the full height of each tower), and a recessed main entrance framed by `smooth_quartz_stairs`.
- **Block identifier:** F-24 (808 Travis) and F-25 (815 Walker).

### 3.4 The generic downtown towers (`[X]`)

8–10 generic-but-realistic downtown office towers fill the buffer blocks. Each tower follows the **uniform cornice line** (the Houston CBD's defining visual — a flat roofline at ~50–60 blocks) with these defaults:

- **Shell:** `white_concrete` (1990s–2020s vocabulary) or `light_gray_concrete` (1980s vocabulary).
- **Curtain wall:** `light_gray_stained_glass_pane` in a 3×5 grid pattern (every 3 blocks horizontally, every 5 blocks vertically).
- **Height range:** 25–60 blocks, varied across the 8–10 towers for skyline interest.
- **Ground floor:** `gray_concrete` parking-garage plinth (no retail frontage — "the rest of downtown" is not part of the tunnel system).
- **Roof:** flat `gray_concrete` with `iron_block` mechanical penthouses.
- **Cornice:** 1-block-wide `quartz_block` band at the roofline.

The generic towers do **not** have tunnel access. They are "the rest of downtown" — the buildings the tunnel system does not connect to. This is the truth of the real system: not every downtown tower is connected; only the documented ones are.

### 3.5 Parking garages (2–3, `[X]` plus 1 `[D]`)

- **McKinney Garage (930 Main) `[D]`** — the *named* parking garage, the other direct street entry. Build: 4–6 stories of open-deck `gray_concrete` with `yellow_concrete` painted lane lines and `iron_bars` perimeter railings. The ground floor has a `light_blue_concrete` retail concourse (the McKinney Place food court / 930 Main concourse is the public-entry food court). Height ~25 blocks.
- **Generic garage A** `[X]` — 4–6 stories of open-deck `gray_concrete`, no retail.
- **Generic garage B** `[X]` — 4–6 stories, with a `gray_concrete` ground-floor lobby for one of the buffer-block towers.

### 3.6 The "shadow city" feel

The defining visual of the above-ground city is the **shadow city underneath** — the player walks the sunlit grid of office towers and can feel, at every lobby directory, at every T-marker at the curb, at every second-floor skybridge crossing, that there is a *parallel life* one story down. The shadow city is **not visible from the surface** (no skylights into the tunnel) but its **evidence** is everywhere: a T-marker at the curb, a "Tunnel → Basement" sign in a lobby, a skybridge crossing to a tower that has a tunnel underneath, the 1970s "Tunnel" capitalization on building directories. The build must make the surface feel like the **cover** for the underground city, not the foreground.

### 3.7 Building directories (every named building)

Every named building lobby has a **building directory** on the wall — a 2-block-wide × 3-block-tall `item_frame` array on a `polished_andesite` wall, with `oak_sign` labels for the building's tenants. Critically, every directory includes a small **"Tunnel → Basement"** sign in the lower-right corner. This is the smallest possible wayfinding element; it is the visual evidence that *every* connected building has a tunnel access, but that the tunnel access is **deliberately small** (per Topic 1, the "almost-secret" quality).

---

## 4. The Wells Fargo Plaza Street Entrance

The Wells Fargo Plaza street-level entrance is **one of only two direct street entries in the entire 95-block system**. It is the most-used tourist and lunchtime entry, the first thing a visitor sees, and the iconic moment that opens the build for v0.1.

### 4.1 Architectural signature `[D]`

- **Building era:** 1980s (Skidmore, Owings & Merrill, 1983), 71 stories. The lobby is **1980s granite-and-glass**, slightly more contemporary than the 1970s Esperson / Pennzoil lobbies.
- **Lobby floor:** `polished_andesite` (granite proxy) with `polished_diorite` accent stripes every 8 blocks.
- **Lobby columns:** `quartz_pillar` (2-block-wide, 6-block-tall) at 8-block intervals.
- **Lobby ceiling:** `quartz_slab` (coffered) with `redstone_lamp` accent lighting every 4 blocks.
- **Lobby walls:** `light_gray_concrete` with `polished_andesite` base and `iron_bars` accent strips.
- **Building directory:** 2-block-wide × 3-block-tall `item_frame` array on the lobby wall, with `oak_sign` labels. The "Tunnel → Basement" sign is in the lower-right corner.

### 4.2 The descent `[I]`

- **Bank of elevators:** 4 elevator doors (`iron_door`, 2-block-wide × 3-block-tall each) on the rear wall. Each elevator door is `iron_block`-framed, with `light_gray_concrete` surround and `redstone_lamp` (active) above.
- **Interior stair:** a 4-block-wide `polished_andesite_stairs` (terrazzo stair proxy) descending 6 blocks to the basement corridor. The stair has a `dark_oak_fence` handrail and `smooth_stone_slab` treads.
- **Escalator (for the modern feel):** an alternative descent on the right side — `light_gray_concrete` housing with `smooth_stone_slab` steps and `redstone_lamp` handrail lighting.
- **Floodgate:** the descent passes through a **floodgate** — an `iron_door` (vertical, 4 blocks tall) with `iron_block` frame and `oak_sign` reading "Floodgate — Tropical Storm Allison 2001" (per Topic 2, Tier 2, feature (h)). The floodgate is **closed in the build** (the player walks around it via a side passage); the **deployed state** is referenced by the marker only.
- **Raised threshold:** a 1-block-tall `stone_brick_stairs` step at the lobby-to-basement transition — the visible evidence of the FEMA dry-floodproofing.

### 4.3 The T-marker at the curb

A small **T-marker plaque** at the sidewalk curb directly outside the Wells Fargo entrance (per Topic 5, prominent easter egg):

- **Block spec:** `oak_pressure_plate` (inlaid in the `smooth_stone_slab` sidewalk) with a small `oak_sign` (1-block-wide × 1-block-tall, mounted on a 1-block `oak_fence` post) reading "T" inside a `blue_concrete` (blue) circle.
- **Placement:** at the curb between the Wells Fargo Plaza sidewalk and the street, 2 blocks east of the building entrance.
- **Mood:** small, easy to miss, easy to overlook. The "almost-secret" feel.

### 4.4 The interpretive panel (`[D]` for the stats)

The Wells Fargo lobby has a **prominent interpretive panel** — a 3-block-wide × 2-block-tall `item_frame` (or `painting`) on a `polished_andesite` wall at the lobby's east wall. The panel reads (in three `oak_sign` rows):

> **Houston Tunnel System**
> 95+ city blocks · 6 miles · 200,000 daily users
> Established 1930s · Direct Street Access

This is the **single most important interpretive panel** in the build. The 200,000 figure is per Topic 3 / D3 (binding, the consensus figure, used as lore).

### 4.5 The 1930s origin plaque

Mounted on the same wall as the interpretive panel, 2 blocks to the left:

> **Houston Tunnel System — Established 1930s**
> First tunnel: Ross Sterling under Fannin (1931) and Will Horwitz under Capitol (1935).
> Inspired by the Rockefeller Center underground concourse.

The plaque is `oak_sign` (engraved text) on a `polished_andesite` (granite) base, 3 blocks wide × 2 blocks tall. It is the **dual-origin story** that the Office Worker recognizes from the public record (per Topic 2, faded reference).

### 4.6 The Wells Fargo "free entry" hack

A small `oak_sign` at the entrance, 1-block-wide × 1-block-tall:

> **Wells Fargo Plaza — Direct Street Access**
> Free public access during business hours · 6:00 a.m. – 6:00 p.m. Mon–Fri

This is the famous visitor "hack" — Wells Fargo is the only direct entry that is also a major office-tower lobby with normal lobby access, so casual visitors and tour groups can use it without pretending to have a meeting. The build makes this **prominent and player-facing** (per Topic 5, prominent easter egg).

---

## 5. The McKinney Garage Direct Access

The McKinney Garage (930 Main) is the **other direct street-level entry** in the entire 95-block system. The build deliberately gives it a different feel from the Wells Fargo entry: it is **through a parking garage, not an office-tower lobby**. The visual contrast is the point.

### 5.1 Architectural signature `[D]`

- **Building era:** 1970s parking garage, the kind of open-deck downtown garage that defines the McKinney Place / 930 Main concourse. The garage is **functional, not monumental** — the inverse of the Wells Fargo lobby's polish.
- **Exterior:** `gray_concrete` (open-deck) with `yellow_concrete` painted lane lines and `iron_bars` perimeter railings. The deck is open on the front (no retail frontage at the street level except for the ground-floor concourse entry).
- **Height:** 4–6 stories of parking, ~25 blocks total. Each deck is 4 blocks of clear height.
- **Ground floor:** `light_blue_concrete` retail concourse (the McKinney Place food court begins here at street level and continues down to the tunnel).

### 5.2 The descent `[I]`

- **Entry sequence:** the player enters the ground-floor concourse from Main Street (a `glass_pane` and `iron_bars` storefront), passes through a `light_blue_concrete` lobby with a small directory (`oak_sign` "McKinney Place / 930 Main"), and descends via:
  - **An interior stair** (4-block-wide `polished_andesite_stairs`) from the concourse to the basement tunnel level (6 blocks down).
  - **OR an elevator** (`iron_door`, 2-block-wide × 3-block-tall) on the rear wall.
- **Floodgate:** the basement entry also has an `iron_door` floodgate (smaller than the Wells Fargo one, but the same `iron_block` frame) and a `oak_sign` "Floodgate — Tropical Storm Allison 2001."
- **The "parking garage" feel:** the descent passes through a level where `gray_concrete` open-deck parking is visible (a `iron_bars` railing with a `gray_concrete` floor above and `yellow_concrete` painted lines). This is the **different feel** from Wells Fargo — the descent is **utilitarian**, not grand.

### 5.3 The T-marker at the curb

Identical to the Wells Fargo T-marker: `oak_pressure_plate` + `oak_sign` "T" on a 1-block `oak_fence` post, at the curb on Main Street outside the garage.

### 5.4 Wayfinding difference from Wells Fargo

The McKinney entry's "Tunnel → Basement" sign is **smaller and more utilitarian** than the Wells Fargo one — a 1-block `oak_sign` on a `light_blue_concrete` (concourse color) wall, no quartz-and-granite surround. The contrast with Wells Fargo's polished lobby directory is the design point: the McKinney entry is **deliberately less polished**, because McKinney is the *other* direct entry, the one that reads as "parking garage with shops," not "tunnel entrance." (per Topic 5, the Office Worker's daily observation: "Wells Fargo is the hack, McKinney is the legit direct access but it doesn't *feel* like an entrance.")

---

## 6. The Typical Tunnel Cross-Section

The standard tunnel cross-section is the **single most common visual in the build**. It is what the player walks through for 80% of their time in the tunnel system. Per Topic 2 / D2 Tier 1, feature (e), and Topic 4 / D4 `[I]` layer, three time-staggered variations are required to convey the "time-staggered cross-section" feel.

### 6.1 The 1970s Hines-era standard corridor (the default)

This is the look the player sees **most of the time**. It is the **Hines-era default** — the 1970s office-basement construction that defines the visual identity of the system.

**Dimensions (`[D]` cross-section, `[I]` block mapping):**
- **Width:** 3–6 blocks interior clear (10–20 ft real, 1:1 cross-section, per D1).
- **Height:** 3 blocks interior clear (8–9 ft real, 1:1, per D1).
- **Length:** varies by segment; typical 30–50 blocks between intersections.

**Block spec:**
- **Walls:** `white_concrete` (painted concrete block), 2 blocks thick on each side, with a `light_gray_concrete` accent stripe (1 row of single-block) every 7 blocks at chair-rail height.
- **Floor:** `white_wool` (VCT proxy) with a `polished_andesite` (terrazzo) border 1 block wide on each side, every 4 blocks.
- **Ceiling:** `smooth_stone_slab` (dropped acoustic-tile proxy) at y = ceiling height (3 blocks above the floor). The T-bar grid is implied by a 1-row `light_gray_wool` accent every 4 blocks (the "every 4th block = 1 grid line" pattern).
- **Lighting:** `sea_lantern` (fluorescent troffer proxy) embedded in the `smooth_stone_slab` ceiling at 4-block intervals along the corridor centerline. A faint `cave` ambient (Minecraft ambient sound category) reinforces the muffled feel.
- **Tenant storefronts:** every 6–10 blocks, a tenant bay opens on one or both sides. Each bay is framed by `iron_bars` (window frame) and `light_gray_concrete` (door frame), with a backlit `redstone_lamp` sign band above (`blue_concrete` background + `white_concrete` letters).
- **HVAC grilles:** an `iron_trapdoor` (closed, appearing as a vent register) every 12 blocks, embedded in the ceiling.

**Mood:** even fluorescent (`sea_lantern` provides light level ~10), no daylight, claustrophobic in a clean way. The "clean but dated" signature. The single most-recognizable Houston tunnel image.

### 6.2 The 1990s refresh segment (one quadrant)

A 1990s refresh has slightly different colors and finishes, conveying the "time-staggered cross-section" effect.

**Block spec differences from 6.1:**
- **Walls:** `light_gray_concrete` (cooler, grayer than the 1970s off-white).
- **Floor:** `gray_wool` (newer VCT) with a `smooth_stone_slab` border.
- **Ceiling:** `quartz_slab` (newer acoustic tile).
- **Lighting:** `redstone_lamp` (LED panel proxy) every 5 blocks.
- **Tenant storefronts:** updated brand colors and frameless glass (`glass_pane` without `iron_bars` frame).

This is the "1990s refresh" — the same corridor, but every era-specific material has been swapped for the late-1990s equivalent.

### 6.3 The 2010s LED refresh (the 1001 Fannin / Lamar quadrant)

The 2010s LED refresh has a **dramatically different** look: dark ceiling, polished porcelain floor, frameless glass storefronts, LED panel lights.

**Block spec differences:**
- **Walls:** `gray_concrete` (darker gray, near-charcoal) with `black_concrete` base.
- **Floor:** `gray_wool` (dark charcoal porcelain proxy) with a `black_concrete` border.
- **Ceiling:** `black_concrete` (the signature "dark ceiling" of the 2010s refresh).
- **Lighting:** `end_rod` accent strips every 4 blocks + `redstone_lamp` panel lights every 6 blocks. The combination is brighter (light level ~12) and more modern than the 1970s.
- **Tenant storefronts:** frameless `glass_pane` (no `iron_bars`), minimal signage (`oak_sign` in small font, no backlit band).
- **Backlit signage:** `redstone_lamp` strip behind `black_concrete` panels with `white_concrete` letterforms (the modern minimalist style).

This is the **1001 Fannin / Lamar Tunnel archetype** — the modern refresh that every other food court in the system is being compared to. The player should walk from the 1970s Esperson corridor into the 2010s 1001 Fannin corridor and feel the *temperature change*.

### 6.4 The 1950s-era minimal corridor segment (Tier 2)

A short 20–30-block corridor segment representing the **1930s/1950s origin sections** (Ross Sterling under Fannin, Horwitz under Capitol) per Topic 2 / D2 Tier 2, feature (i). This is a faded reference, not a full build.

**Block spec:**
- **Walls:** `smooth_stone` (raw, unpainted concrete block).
- **Floor:** `smooth_stone_slab` (bare concrete).
- **Ceiling:** **no dropped ceiling** — the corridor is the full 6 blocks tall (the structural slab of the street above, painted in `gray_concrete`).
- **Lighting:** a single `redstone_lamp` every 8 blocks (older fluorescent tube).
- **Visible infrastructure:** `iron_block` (galvanized ductwork) running along the ceiling, with `red_concrete` (sprinkler riser) verticals at intervals.
- **Plaque:** an `oak_sign` (1 block wide × 1 block tall) on the wall:

> **1950s-era minimal corridor**
> Ross Sterling under Fannin (1931) · Will Horwitz under Capitol (1935)
> Original construction, before the Hines-era climate control.

The player should walk through this segment and feel the **time-shift** — the older, rawer, less-finished space that the modern system grew out of.

---

## 7. The Esperson Food Court (the Signature)

The Esperson food court at 808 Travis is **the signature** of the build. It is the *archetype* — the food court that every other food court in the system gets compared to. Per Topic 2 / D2 Tier 1, feature (b), this is the only food court in **full detail**; the other three are in compressed form.

### 7.1 Architectural signature `[D]`

- **Location:** under 808 Travis, between the two Niels Esperson Art Deco towers (1929 / 1940). The food court runs **north–south under Travis Street** for the full block, with a small east–west spur under Walker.
- **Dimensions:**
  - **Length:** 20 blocks (the full 1-block-long footprint of 808 Travis at 4:1 compression, in the corridor direction).
  - **Width:** 4–6 blocks (single-loaded corridor with 3-block-deep tenant bays on each side; 1-block-wide walk aisle in the middle).
  - **Height:** 4 blocks (12 ft food-court ceiling, slightly higher than the standard 3-block corridor).
- **Form:** long, narrow corridor under the twin Art Deco towers, with a **single row of storefronts on each side** (single-loaded). This is the iconic image every other food court gets compared to.

### 7.2 Block spec `[I]`

- **Walls:** `white_concrete` (older 1970s off-white) with a `light_gray_concrete` accent stripe at chair-rail height.
- **Floor:** `polished_andesite` (beige terrazzo proxy) with `smooth_stone_slab` (brass-strip) pattern every 8 blocks.
- **Ceiling:** `smooth_stone_slab` (dropped acoustic-tile proxy), **older 1970s style** — white, not dark.
- **Lighting:** `sea_lantern` strips every 3 blocks (brighter than the standard corridor, per §6.1). The food court is the **brightest** space in the system.
- **Storefronts:** **15–18 storefronts total**, 7–9 on each side. Each storefront is `iron_bars` (window frame) + `light_gray_concrete` (door frame) + `glass_pane` (window) + a backlit `redstone_lamp` sign band with brand-color `concrete` background and `white_concrete` letterforms.
- **HVAC:** `iron_trapdoor` kitchen-exhaust grilles in the ceiling every 4 blocks (the food-court smell is referenced by the grilles, not the actual smell).
- **Communal tables:** 4–6 `dark_oak_slab` tables (2×1 blocks each) with `dark_oak_fence` bases, running down the center of the corridor at 4-block intervals. `oak_stairs` chairs around each table.

### 7.3 Tenant mix `[D]` for the named tenants, `[I]` for the rest

The 15–18 Esperson storefronts are filled with a mix of documented chain fast-casual and supporting services. Per Topic 2 / D2, **10–12 named tenants** total across all four food courts, with the Esperson getting the largest share. The Esperson-specific mix:

1. **Chick-fil-A** `[D]` (red `concrete` + `red_wool` awning) — corner unit at the corridor entry.
2. **Mediterranean Grill House** `[D]` (per the official tenant directory) — counter line.
3. **Mona** `[D]` (modern fast-casual) — counter line.
4. **Farro** `[D]` (healthy fast-casual) — counter line.
5. **Brown Bag Deli** `[D]` (brown `concrete`) — counter line.
6. **Midtown Dentistry** `[D]` (white `concrete` + `light_blue_concrete` cross) — small service tenant (one of the dental offices documented in the system).
7. **Downtown Vision Source** `[D]` (white `concrete` + `light_gray_concrete` eyeglass frame icon) — small service tenant.
8. **La Taquiza** `[D]` (yellow + red `concrete`) — counter line.
9. **Hair Cutters** `[D]` (red + white + blue barber-pole pattern) — small service tenant.
10. **Schlotzsky's** `[D]` (red + tan `concrete`) — counter line.
11. **Seaside Poke** `[D]` (cyan + white `concrete`) — counter line.
12. **Flip n Patties** `[D]` (yellow + green `concrete`) — counter line.
13. **Boomtown Coffee** `[D]` (black + cream `concrete`) — counter line, espresso machine behind.
14. **Silver Lining** `[D]` (white + silver `concrete`) — counter line.
15. **Two "Vacant / For Lease" bays** `[I]` — `light_gray_wool` awning + `white_concrete` sign, one at each end of the corridor (per Topic 5, atmospheric: vacant bays are a documentary detail, not a loss).

### 7.4 The lunch-rush feel

The Esperson food court is the **defining experience of the tunnel system** (per Topic 1). The build conveys the lunch rush with:

- **Crowd NPCs:** 8–12 office-worker NPCs (`villager` in office attire, customized) clustered around the communal tables, in the queue at the Chick-fil-A, and walking the corridor.
- **Time-of-day cycle:** the food court is at **peak capacity** from Minecraft-time 0 to 6000 (morning rush and lunchtime) and **empty** from 6000 to 12000 (afternoon lull). This is achieved with a redstone clock + `redstone_lamp` lighting change + NPC visibility toggle (e.g., armor stand swap or a `/effect` invisibility).
- **Sound:** `cave` ambient (muffled underground) + a louder `block.note_block` clatter pattern from the food-court area (representing kitchen noise, register beeps, conversation).

### 7.5 The Sandra Lord "Tunnel Lady" plaque

A small interpretive plaque (per Topic 2, faded reference) at the food-court entry, on the wall beside the backlit "Esperson / 808 Travis" sign:

> **Sandra Lord — "The Tunnel Lady"**
> Sandra Lord has led paid walking tours of the Houston tunnel system through her company **Discover Houston Tours** since 1991 — the only person to have continuously led public tours for three decades. She is the primary human source for how the tunnels have changed across the 1980s sterile, 1990s retail, and 2010s food-court eras.

Block spec: `oak_sign` (engraved text, 3 blocks wide × 2 blocks tall) on `white_concrete` wall.

---

## 8. The Other Food Court Clusters

The Esperson is the signature; the **other three food court clusters** are the supporting cast. Each has a different feel, per the four-quadrant anchor in Topic 2 / D2 Tier 1, feature (b).

### 8.1 Pennzoil Place underground (711 Louisiana) — the densest

The Pennzoil Place underground is the **densest single food court** in the system, packed into the basements of the two mirrored Philip Johnson trapezoidal towers. The food-court cluster sits **under and between** the two towers, accessed from the Pennzoil lobby bridge.

**Form:** a **wider, more congested** food court than the Esperson archetype — 6–9 blocks wide (4:1 wider than the standard corridor), 4 blocks tall. The cluster has **10–12 storefronts packed close together**, with a "no clear aisle" feel.

**Block spec:**
- **Walls:** `white_concrete` (the mirrored-glass effect is on the *above-ground* towers; the food court itself is standard 1970s off-white).
- **Floor:** `polished_andesite` (warm terrazzo) with `gray_wool` patches for the 2010s refresh on the western half.
- **Ceiling:** `smooth_stone_slab` (older 1970s) on the eastern half; `black_concrete` (2010s refresh) on the western half. The **time-staggered** effect is *built into* the Pennzoil food court.
- **Lighting:** `sea_lantern` strips every 3 blocks; brighter than the Esperson.
- **Storefronts:** 10–12 tenant bays (more packed than the Esperson's 15–18, but in a smaller footprint, so the density is higher).

**Tenant mix `[D]` for the named, `[I]` for the rest:**
1. **Chick-fil-A** (a second location, smaller than the Esperson one)
2. **Michael's Cookie Jar**
3. **Bodard Express**
4. **Which Wich** (black + orange)
5. **Paradise Gifts** (magenta)
6. **Murphy's Deli** (green + white)
7. **Salata** (red-orange)
8. **Otto's BBQ** (red + black)
9. **Uncle Sharkii Poke Bar** (cyan + white)
10. **Treebeards** (brown + green)
11. **Tunnel Newstand** (yellow + black)
12. **Starbucks (1100 Louisiana)** (green) — smaller than a typical Starbucks, coffee-and-pastry counter

**Mood:** loud, crowded, *kitchen-exhaust-scented* (referenced by the `iron_trapdoor` grilles), the **peak lunchtime experience** in the system. The Office Worker's voice: "I go to the Pennzoil one when I want density; the Esperson one when I want elbow room."

### 8.2 1001 Fannin / Lamar Tunnel (Lamar quadrant) — the modern refresh

The 1001 Fannin food court is the **modern refresh** of the food-court type — the 2020s version of what Esperson was in the 1970s. Per Topic 4 / D4 `[I]` layer, the 1001 Fannin archetype is "modern refresh, dark ceiling, LED panels, polished concrete, minimalist signage."

**Form:** a **single-loaded corridor** under 1001 Fannin, similar to the Esperson but with **dramatically different materials**. Width 4–6 blocks, height 4 blocks, length 20 blocks (one block at 4:1 compression).

**Block spec:**
- **Walls:** `gray_concrete` (cooler, darker gray) with `black_concrete` base.
- **Floor:** `gray_wool` (dark charcoal porcelain proxy) with `black_concrete` border.
- **Ceiling:** `black_concrete` (the signature "dark ceiling" of the 2010s refresh).
- **Lighting:** `end_rod` accent strips every 4 blocks + `redstone_lamp` panel lights every 6 blocks. Brighter and more modern than the 1970s.
- **Storefronts:** 12–14 tenant bays, **frameless glass** (`glass_pane` without `iron_bars`), minimal signage, modern minimalism.

**Tenant mix `[D]` for the named, `[I]` for the rest:**
1. **Charlie's BBQ & Hamburgers** (red + black)
2. **Blackwater Coffee Roasters** (black + cream)
3. **Baoz Dumplings + Boba** (red + white)
4. **Lenny's Grill & Subs** (red + yellow)
5. **Addict Tea Cafe** (white + teal)
6. **Glamours Variety** (pink + black)
7. **Red's Barber & Style Shop** (red + white + blue)
8. **811 Fitness** (gray + red — a small fitness studio, one of the more unusual tenants)
9. **Boost Mobile / generic telecom** (yellow)
10. **Two "Vacant / For Lease" bays**

**Mood:** contemporary, minimalist, the **2020s face** of the system. The player walks from the 1970s Esperson into the 2010s 1001 Fannin and feels the temperature drop (the modern space is cooler in tone, not in temperature).

### 8.3 McKinney Place / 930 Main concourse (McKinney quadrant) — the public-entry food court

The McKinney Place food court is the **public-entry food court** — the one the player finds when they descend from the McKinney Garage direct entry. It is the **parking-garage food court** — a long, narrow concourse under a garage, mixed retail and services. Per Topic 4 / D4 `[I]` layer, the McKinney archetype is "parking-garage basement, mixed retail and services, longer linear concourse."

**Form:** a **long linear concourse** under the McKinney Garage, with **mixed retail and services** (more services than the other food courts). Width 4–6 blocks, height 4 blocks, length 25 blocks (the McKinney Garage is the longest building in the sample, so the food court under it is the longest in the build).

**Block spec:**
- **Walls:** `light_gray_concrete` (1990s refresh palette).
- **Floor:** `gray_wool` (newer VCT) with `polished_andesite` border.
- **Ceiling:** `quartz_slab` (newer acoustic tile).
- **Lighting:** `redstone_lamp` LED panels every 5 blocks.
- **Storefronts:** 12–14 tenant bays, mostly services, with a few food counters.

**Tenant mix `[D]` for the named, `[I]` for the rest:**
1. **Deli Deluxe** (red + white)
2. **Sparkle Dry Cleaners** (light blue + white) — a service tenant, prominent
3. **Crest Printing** (white + red)
4. **Shipley's Do-nuts** (pink + white)
5. **Behold the Beauty** (pink + black — a salon)
6. **Renato Jewelers** (gold + black)
7. **Saul Hair Studio** (red + white)
8. **Star Chef** (red + white)
9. **Taka Sushi** (red + black)
10. **Top Taste Asian** (red + yellow)
11. **Mayuri Express** (red + yellow)
12. **Dr. Brian Clemons Chiropractor** (white + blue — a service tenant)
13. **Cassidy's Mesquite Chicken** (red + black)
14. **Smoothie Factory** (yellow + green)
15. **Platinum Parking office** (gray + yellow — the parking-garage office)
16. **Two "Vacant / For Lease" bays**

**Mood:** utilitarian, **services-heavy**, the **parking-garage food court** (per Topic 1: "McKinney reads as 'parking garage with shops,' not 'tunnel entrance'"). The food court has more services (dry cleaner, printing, salon, jeweler) than the other three, reflecting the parking-garage entry context.

---

## 9. The Other Tenant Zones

Beyond the four named food courts, the build includes **at least 4–6 additional tenant zones** distributed along the standard corridors. These are the dry cleaners, banks, dental offices, barbers, and credit unions that line the standard tunnel segments. Per Topic 4 / D4 `[D]` layer, these are documented in the downtownhouston.org directory; per the binding decision, **10–12 named tenants total** across the build, with the rest of the bays marked "Vacant / For Lease" or generic storefronts.

### 9.1 Tenant zone: Standard-corridor dry cleaner / barber / credit union cluster

The most common tenant cluster in the standard corridor: a **dry cleaner + barber + credit union** triple, every 30–50 blocks along the corridor.

**Block spec per triple:**
- **Dry cleaner:** 2-block-wide × 2-block-deep bay. `light_blue_concrete` sign (Sparkle Dry Cleaners or generic), `iron_bars` + `glass_pane` storefront, `quartz_slab` counter inside, `oak_sign` "Drop-off / Pick-up" and "Same-Day Service."
- **Barber:** 2-block-wide × 2-block-deep bay. Red + white + blue `concrete` barber-pole pattern (vertical stripes), `oak_sign` "Randy's Barbershop" or generic, `redstone_lamp` accent inside (the spinning pole is referenced by an animated redstone_lamp flicker).
- **Credit union:** 2-block-wide × 2-block-deep bay. Blue + gold `concrete` (Comerica Bank / First Service Credit Union), `iron_bars` + `glass_pane` storefront, `quartz_slab` counter, `oak_sign` "First Service Credit Union."

### 9.2 Tenant zone: Pennzoil–Wells Fargo corridor (Wells Fargo to Pennzoil)

A short 30-block corridor between the Wells Fargo quadrant and the Pennzoil quadrant, lined with **services + a coffee kiosk + a small newsstand**:

- **Kelsey-Seybold Clinic** (white + `light_blue_concrete` cross) — a small medical office tenant.
- **Boomtown Coffee / Starbucks** (counter line, smaller than the food-court versions).
- **Kolache Factory** (red + tan) — a kolache kiosk.
- **Tunnel Newstand** (yellow + black) — a small newsstand / sundries shop.
- **Comerica Bank** (red + yellow) — a small bank branch.
- **Two "Vacant / For Lease" bays.**

### 9.3 Tenant zone: Wells Fargo–Esperson corridor (Wells Fargo to Esperson)

A short 20-block corridor between the Wells Fargo quadrant and the Esperson quadrant, with a few **mid-corridor tenants**:

- **Starbucks (1100 Louisiana)** (green) — a small coffee kiosk.
- **District 7 Grill** (red + white) — a counter-line grill.
- **Houston Newstand** (yellow + black) — a small newsstand.
- **One "Vacant / For Lease" bay.**

### 9.4 Tenant zone: Esperson–Lamar corridor (Esperson to 1001 Fannin)

A short 25-block corridor between the Esperson quadrant and the Lamar quadrant, with the **W. Walker Tunnel** named segment running through here (per the Cameron 2015 map):

- **El Regio Mexican Grill** (red + green + white) — a counter line.
- **Evolutionary Eye Care** (white + `light_gray_concrete`) — a small optometry office.
- **Potbelly** (orange) — a counter line.
- **Sultan Pepper** (red + black) — a counter line.
- **Wok and Roll** (red + yellow) — a counter line.
- All at 1000 Main St (BG Group Place).
- **One "Vacant / For Lease" bay.**

### 9.5 Tenant zone: Lamar–McKinney corridor (1001 Fannin to McKinney)

A short 30-block corridor between the Lamar quadrant and the McKinney quadrant, with the **E. McKinney Tunnel** named segment running through here (per the Cameron 2015 map):

- **Two "Vacant / For Lease" bays** (longer corridor, fewer tenants).
- **One small office suite** (white + gray, generic downtown office).
- **A short branch** to the **Theater District stub corridor** (per Topic 2 / D2 Tier 2, feature (j)).

### 9.6 Tenant zone: Pennzoil–McKinney corridor (Pennzoil to McKinney, the longest)

A 40-block corridor, the longest in the build, with **mixed retail and services** along the way. The Cameron 2015 map labels this as part of the **Downtown Tunnel Loop**:

- **Smoothie King** (yellow + green) — a counter line.
- **Pastabilities** (red + white) — a counter line.
- **R. Rose Clothier** (black + white) — a small clothing shop.
- **Glamours Sundries** (pink + black) — a small sundries shop.
- **Paradise Cards & Gifts** (magenta) — a small gifts shop.
- **Airrosti** (white + blue) — a small clinic.
- **API Kitchen Southern Food** (red + black) — a counter line.
- **Bullritos** (red + yellow) — a counter line.
- **Luchi & Joey's** (red + white) — a counter line.
- **Tacos a Go Go** (red + green + white) — a counter line.
- **Village Real Pit Barbeque** (red + black) — a counter line.
- **Three "Vacant / For Lease" bays.**

---

## 10. The Skybridges

The skybridges are the **above-ground companion** to the tunnel. The same buildings are connected *both* under the street (tunnel) and *over* it (skybridge). Per Topic 6 / D6, **one skybridge per quadrant** (4 total), each crossing over a real named street. The skybridges are the secondary movement layer and the visual punctuation of the multi-modal city.

### 10.1 The McKinney Street skybridge (the canonical reference)

The reference photo for the build (per research §4.6, also Topic 2): the McKinney Street skybridge from LyondellBasell Tower to The Shops at Houston Center.

**Block spec:**
- **Width:** 1 block interior.
- **Height:** 2 blocks interior.
- **Length:** 6 blocks (spanning the 5–6-block-wide McKinney Street at 4:1 compression).
- **Walls:** `glass_pane` (full glass curtain wall on both long sides) with `iron_bars` mullions.
- **Floor:** `white_wool` (carpet) on `smooth_stone_slab` (substrate).
- **Ceiling:** `quartz_slab` (acoustic tile) with `redstone_lamp` (active) every 4 blocks.
- **Frame:** `iron_bars` structural frame, `light_gray_concrete` corner connectors.
- **Elevation:** 8 blocks above street level (the second floor of the office towers on either side).
- **Views:** the glass walls provide a **dramatic daylight** (light level 15) on both sides — the visual shock of natural light after the fluorescent tunnel.
- **Climate control:** the skybridge is climate-controlled (forced-air HVAC, like the tunnel), with `iron_trapdoor` grilles in the ceiling.

### 10.2 The other three skybridges

- **Travis Street skybridge** (JPMorgan Chase to a generic connector) — same block spec as 10.1, but slightly shorter (5 blocks long).
- **Louisiana Street skybridge** (Pennzoil to Wells Fargo, the most famous one) — the **longest** skybridge in the build (7 blocks), spanning the wide Louisiana Street and the Wells Fargo Plaza.
- **Walker Street skybridge** (Esperson to a generic connector) — shorter (4 blocks), the most Art Deco of the four (the Walker-side Esperson tower has the Art Deco signature).

### 10.3 Skybridge landings

Each skybridge **lands in the second floor** of a tower lobby. The landing is a small `glass_pane` and `iron_bars` vestibule with:

- A **building directory** (smaller than the ground-floor directory, on the second-floor wall).
- A **stair or escalator down to the tunnel** (per the building's documented tunnel access). This is the **secondary entry** to the tunnel system — the player can enter the tunnel from the skybridge landing.
- A **small "Tunnel → Basement" sign** (smaller than the ground-floor one).

The skybridge landing is the **most daylight-flooded** space in the build (light level 15, with `daylight_detector` showing active state), and the **visual contrast** with the fluorescent tunnel is the design point.

---

## 11. The "T-marker" Surface Entrance

The T-marker is the **only on-street indication** that a tunnel access exists below (per Topic 5, prominent easter egg). The build includes a T-marker at **both** direct street entries: Wells Fargo Plaza and McKinney Garage.

### 11.1 Block spec `[I]`

- **Mounting:** a 1-block `oak_fence` post (4 blocks tall) on the `smooth_stone_slab` sidewalk at the curb.
- **Sign:** a 1-block-wide × 1-block-tall `oak_sign` mounted at the top of the post (4 blocks above the sidewalk).
- **Sign face:** a `blue_concrete` (dark blue) background with a `white_concrete` "T" letter (2 blocks tall) inside a 1-block-wide `light_blue_concrete` circle.
- **Inlay:** a `oak_pressure_plate` (small, 1 block) embedded in the `smooth_stone_slab` sidewalk at the base of the post, indicating the tunnel entry below.
- **A small `oak_sign` below the post:** "Tunnel Access · 6:00 a.m. – 6:00 p.m. Mon–Fri."

### 11.2 Placement and feel

- **Wells Fargo T-marker:** on the `smooth_stone_slab` sidewalk at the curb of Louisiana Street, 2 blocks east of the Wells Fargo entrance. The T-marker is **easy to miss** — small, low, surrounded by typical downtown sidewalk furniture.
- **McKinney Garage T-marker:** on the `smooth_stone_slab` sidewalk at the curb of Main Street, 2 blocks north of the McKinney Garage entrance. Even **easier to miss** than the Wells Fargo one — it is set against the parking-garage wall and is partially obscured by a `jungle_log` palm tree.

The T-marker is the **almost-secret quality** made physical: the player has to be looking for it to see it.

---

## 12. The Wayfinding System

The wayfinding is the **chronic weak point** of the real system (per Topic 1 §3.6 and the research). The build **replicates the style** (1970s–80s signage, era-mismatched, building-by-building) but **makes the navigation work** (clear enough that a player can find their way).

### 12.1 The "Tunnel" backlit wayfinding band sign

The only **system-wide** wayfinding standard. At every major corridor intersection, a backlit band sign reads "Tunnel →" or "To [Building Name] →" in white on dark blue or dark green (per Topic 5, prominent easter egg).

**Block spec `[I]`:**
- **Sign background:** `blue_terracotta` (dark blue) or `green_terracotta` (dark green), 4 blocks wide × 1 block tall.
- **Sign text:** `white_concrete` letterforms, 1 block tall each, with a 1-block space between letters.
- **Backlight:** a `redstone_lamp` (active) row directly behind the sign, 1 block above the `blue_terracotta` background.
- **Mounting:** wall-mounted, 2 blocks above the floor (eye level for a player). The `redstone_lamp` is recessed into the wall behind the terracotta.
- **Arrow:** a `white_concrete` arrow (1 block wide × 2 blocks tall, with a triangular tip made of `white_concrete_stairs`).

**Sign text examples** (the player sees these at intersections):
- "Tunnel →" (at a generic intersection)
- "To Wells Fargo Plaza →" (in a quadrant heading toward Wells Fargo)
- "← To Pennzoil Place" (in a quadrant heading away from Pennzoil)
- "↑ Esperson / 808 Travis" (at a food-court entry)
- "↓ Lamar Tunnel Food Court" (at the Lamar quadrant approach)

### 12.2 The food-court backlit signage band

A larger, more elaborate version of the wayfinding band at every food-court entry. The band reads "[Food Court Name] / [Address]":

- **Background:** `blue_terracotta` (or food-court specific color).
- **Text:** `white_concrete` letterforms, 2 blocks tall.
- **Backlight:** 3 rows of `redstone_lamp` (active) behind the sign.
- **Size:** 6 blocks wide × 2 blocks tall.
- **Mounting:** wall-mounted, 3 blocks above the floor, or ceiling-suspended (hung from `chain` blocks from the structural ceiling).

Sign text examples:
- "Esperson / 808 Travis" (the signature entry)
- "Pennzoil Place / 711 Louisiana"
- "1001 Fannin / One Fannin"
- "McKinney Place / 930 Main"

### 12.3 The "Tunnel" capitalization

Every sign, plaque, and panel in the build reads "Tunnel" with a capital T (per Topic 5, atmospheric easter egg). The Houston convention is to capitalize it as a proper noun. The player should see this capitalization everywhere: lobby directories, wayfinding bands, food-court signs, the 1930s origin plaque, the interpretive panel at the Wells Fargo entry. The "T" in "Tunnel" is the **single most Houston-tunnel typographic detail**.

### 12.4 The era-mismatched signage

The build deliberately **mixes signage eras** to convey the time-staggered cross-section (per Topic 4 / D4 `[I]` layer):

- **1970s signage** (in the 1970s-Hines-era corridors): `oak_sign` (engraved wood) on `iron_bars` brackets, small fonts, brown-and-white.
- **1990s signage** (in the 1990s-refresh corridors): `oak_sign` (printed plastic-laminate look) on `light_gray_concrete` walls, larger fonts, blue-and-white.
- **2010s signage** (in the 1001 Fannin modern refresh): minimalist `oak_sign` on `black_concrete`, sans-serif, white-on-black.

The era-mismatch is **visible to the player** as they walk the system — the same wayfinding message in three different decades of commercial signage.

### 12.5 The intentional wayfinding gap

Per Topic 4 / D4 `[D]` layer, the real system has **no central, uniform, building-spanning wayfinding system**. The build **replicates this gap** in one specific place: a short 15-block segment of the standard corridor has **no** wayfinding signage at all. The player should feel the **disorientation** of the missing wayfinding, and then be rewarded by a clear "Tunnel →" sign at the end of the segment. This is a **deliberate design moment** that conveys the chronic weak point of the real system.

---

## 13. The 2001 Tropical Storm Allison Flood Control

The flood-control design is a **real, defining constraint** of the Houston tunnel system (per Topic 1 §3 and Topic 2 / D2 Tier 2, feature (h)). The build includes the flood-control features as **visible infrastructure**, not as a flooded-corridor scene.

### 13.1 The Wells Fargo floodgate

The Wells Fargo direct street entry has a **prominent floodgate** at the lobby-to-basement transition (per §4.2 above):

- **Floodgate barrier:** an `iron_door` (4 blocks tall × 4 blocks wide) in an `iron_block` frame. The door is **closed in the build** — the player walks around it via a 2-block-wide side passage (`light_gray_concrete` walls, `iron_door` is recessed into the frame).
- **Raised threshold:** a 1-block-tall `stone_brick_stairs` step at the lobby-to-basement transition.
- **Floodgate brackets:** `iron_block` slots on either side of the door frame, where the aluminum flood barrier would slot in during deployment.
- **Floodgate marker:** an `oak_sign` (2 blocks wide × 1 block tall) next to the door:

> **Floodgate — Tropical Storm Allison, June 2001**
> Deployable in 10 minutes · 6-inch raised threshold
> Engineering response to the 2001 flood that closed multiple tunnel segments

### 13.2 The McKinney Garage floodgate

A smaller, more utilitarian floodgate at the McKinney Garage basement entry (per §5.2 above):

- **Floodgate barrier:** an `iron_door` (3 blocks tall × 3 blocks wide) in an `iron_block` frame.
- **Raised threshold:** a 1-block-tall `stone_brick_stairs` step.
- **Floodgate marker:** an `oak_sign` (1 block wide × 1 block tall) next to the door: "Floodgate — Tropical Storm Allison, June 2001."

### 13.3 The sump-pump room

A small **sump-pump room** in a corner of one of the basement corridors (in the McKinney quadrant, the lowest point in the build):

- **Room size:** 4 blocks wide × 4 blocks deep × 3 blocks tall.
- **Walls / floor / ceiling:** `light_gray_concrete` (utility room).
- **Equipment:** a 1-block `cauldron` (sump-pump proxy) on a `redstone_lamp` (active, indicating "pump running") plinth, with `iron_bars` piping running up the wall and across the ceiling.
- **Signage:** an `oak_sign` (2 blocks wide × 1 block tall) on the wall: "Sump Pump · 60 GPM · Backup Power · Flood Control."

### 13.4 The FEMA dry-floodproofing marker

A small `oak_sign` (1 block × 1 block) on the wall of the Wells Fargo basement corridor, 4 blocks past the floodgate:

> **FEMA Dry-Floodproofing**
> All direct-street entries retrofitted post-2001
> Removable flood barriers · Raised thresholds · Sump pumps

This is the engineering-easter-egg moment that nobody thinks about until Allison, per Topic 5.

---

## 14. The 1930s Origin Plaque

The 1930s origin is the **founding story** of the Houston tunnel system. Per Topic 2 / D2 faded reference, the build includes **one combined plaque** at the Wells Fargo entry (per §4.5 above), and **one additional historical corridor segment** in the 1950s-era minimal corridor (per §6.4 above).

### 14.1 The Wells Fargo combined origin plaque `[D]`

**Block spec:**
- **Plaque base:** `polished_andesite` (granite proxy), 4 blocks wide × 3 blocks tall × 1 block deep.
- **Plaque face:** `oak_sign` (engraved text), mounted on the polished andesite base.
- **Text (multi-line, 3 rows of `oak_sign`):**
  - Row 1: "Houston Tunnel System — Established 1930s"
  - Row 2: "First tunnel: Ross Sterling under Fannin (1931) and Will Horwitz under Capitol (1935)"
  - Row 3: "Inspired by the Rockefeller Center underground concourse"
- **Mounting:** wall-mounted, 3 blocks above the lobby floor, on the east wall of the Wells Fargo lobby (next to the interpretive panel).

### 14.2 The Gerald D. Hines marker

A small `oak_sign` (2 blocks wide × 1 block tall) in the Pennzoil Place underground:

> **Gerald D. Hines Expansion (1960s–1980s)**
> Developer Gerald D. Hines added 27 major buildings to downtown Houston through this period, making the tunnels climate-controlled and publicly accessible.
> "The new tunnel" — Sandra Lord, Discover Houston Tours

Mounted on the `white_concrete` wall of the Pennzoil lobby bridge, 2 blocks above the floor.

### 14.3 The Rockefeller Center inspiration

Referenced **only** in the Wells Fargo origin plaque text (per Topic 2, faded reference). The Rockefeller Center underground concourse is the documented inspiration for Will Horwitz's 1935 Uptown Center Project. The build does not depict the Rockefeller Center itself — it references the inspiration in the plaque text only.

---

## 15. Easter Eggs

The Houston tunnel has more potential Easter eggs than any other location in the project. Per Topic 5, the build **picks 5–8 prominent** and **4–6 subtle/faded**, totaling 10–14 Easter eggs. They are all documented in the master plan, located in the build, and verifiable by the player.

### 15.1 Prominent Easter Eggs (player-facing, clearly labeled)

1. **"200,000 daily users" main entry sign** — at the Wells Fargo lobby, on the interpretive panel (per §4.4). The **single most important number** in the build.
2. **"95+ city blocks / 6 miles / 20 ft below grade"** — on the same interpretive panel, the three operational stats.
3. **"Wells Fargo Plaza — Direct Street Access"** — at the Wells Fargo entrance (per §4.6). The famous direct-access hack.
4. **The Esperson food court (808 Travis)** — labeled at the corridor entry, with the full 15–18 storefronts (per §7). The most-photographed zone.
5. **The "Tunnel" backlit wayfinding band signs** — at every major corridor intersection (per §12.1). The only system-wide wayfinding standard.
6. **The "T-marker" entrance signs** — on the sidewalk at both direct street entries (per §11). The Houston convention.
7. **The "Tunnel" capitalization** — every sign and plaque reads "Tunnel" with a capital T (per §12.3). The Houston typographic convention.
8. **The 1970s / 1990s / 2010s time-staggered visual cross-section** — three different corridor styles in three different quadrants, visible as the player walks the system (per §6.1–6.3).

### 15.2 Subtle / Faded Easter Eggs (single nod, not a full build)

9. **Ross Sterling / Will Horwitz 1930s origin plaque** — at the Wells Fargo entry (per §4.5 and §14.1).
10. **Gerald D. Hines 27-building marker** — at the Pennzoil Place underground (per §14.2).
11. **Sandra Lord "Tunnel Lady" plaque** — at the Esperson food court entry (per §7.5).
12. **The floodgate + Allison marker** — at the Wells Fargo and McKinney direct entries (per §13.1 and §13.2).
13. **The Rockefeller Center inspiration** — referenced in the Wells Fargo origin plaque (per §14.3).
14. **The 72°F climate control** — a small `oak_sign` (1 block × 1 block) at one corridor intersection: "Climate Controlled — 72°F Year-Round."
15. **The Theater District performance-night stub corridor** — a small stub corridor with a `oak_sign` "Tonight: Performance 7:30 PM" and a darkened section beyond (per §15.4 below).
16. **The Harris County tunnel edge sign** — `oak_sign` (2 blocks × 1 block) at the build's edge: "Harris County Tunnel — 10 blocks north — Not connected to the downtown system."
17. **The St. Joseph skywalks edge sign** — `oak_sign` (2 blocks × 1 block) at the build's edge: "St. Joseph Skywalks — 6 blocks southeast — Not connected to the downtown system."
18. **The "Vacant / For Lease" bays** — 8–10 vacant bays across the food courts and corridors, with `light_gray_wool` awnings and `white_concrete` "For Lease" signs. The Office Worker's note: "Real Houston tunnels have ~30% vacancy at any time, so this is a documentary detail, not a loss."

### 15.3 Atmospheric Easter Eggs (the Office Worker's contribution)

19. **Time-of-day lighting cycle** — the food courts are at peak capacity from Minecraft-time 0 to 6000 (morning rush and lunchtime) and empty from 6000 to 12000 (afternoon lull). Achieved with a redstone clock + `redstone_lamp` lighting change + NPC visibility toggle.
20. **"1st Shift 06:00 / 2nd Shift 14:00 / 3rd Shift 22:00" sign** — an `oak_sign` on a `light_gray_concrete` wall on one of the building-engineering doors: "Authorized Personnel · 1st Shift 06:00 · 2nd Shift 14:00 · 3rd Shift 22:00."
21. **Water-stained dropped-ceiling tiles** — `light_gray_wool` and `gray_wool` patches (1 tile in ~50) at the bottom of `smooth_stone_slab` ceiling panels, in the 1970s-Hines-era corridors only. The texture of a 1970s basement.
22. **The after-hours shutdown (Tier 3 feature (k))** — one quadrant of the tunnel dims to security mode at Minecraft-time 12000 (6 p.m.): `redstone_lamp` switches to low state, NPC count drops, a few cleaning-crew NPCs appear, and the elevator banks are locked (`iron_door` closed).
23. **The cave ambient** — the muffled-underground feel of the tunnel, set via the `cave` ambient sound category.

### 15.4 The Theater District performance-night stub corridor

A short 10–15-block stub corridor at the end of the Lamar–McKinney corridor, representing the **Theater District's after-hours weekend mode** (per Topic 2 / D2 Tier 2, feature (j)):

- **Stub corridor:** 3 blocks wide × 3 blocks tall × 10 blocks long, with standard 1970s corridor block spec.
- **Lighting:** the corridor is **dim** (no `sea_lantern` strips; only 1 `redstone_lamp` every 8 blocks).
- **Performance-night sign:** an `oak_sign` (2 blocks × 1 block) at the corridor entry: "Theater District · Open Tonight: Performance 7:30 PM."
- **Darkened section beyond:** the stub corridor terminates in a `iron_door` (closed) with an `oak_sign` (1 block × 1 block): "Tunnel Closed · Reopens 6:00 AM Mon."
- **Mood:** the operational dual-mode is a Houston-specific detail — most of the system closes at 6 p.m. weekdays, but the Theater District tunnels open for performance nights.

### 15.5 Out (zero build, no reference)

- **No subway/transit imagery:** no "MTA," "Metro," "Station," "Platform," "Line," "Track," "Times Square," "Grand Central," or any urban-railway framing.
- **No mall contamination:** no central atrium, no fountain, no escalator banks as features, no "Shoppers World," no "Welcome to the Galleria," no anchor-store framing.
- **No generic underground / dungeon:** no "secret lair," no "hidden city," no "lost civilization," no Indiana Jones imagery.
- **No fictional lore:** no mob tunnels, no haunted sections, no Cold War bunkers, no secret government floors.
- **No NYC / London / Tokyo / Montreal recognition:** no PATH / RÉSO references in the build (the "world's largest underground tunnel" plaque must include the correction: "Montreal's RÉSO is actually the world's largest").

---

## 16. Lighting Plan

The lighting plan is **zone-specific** — different zones have different light levels, block types, and moods. The Minecraft `light_level` is the proxy for foot-candles: 0 = full dark, 15 = full daylight. The 1970s corridors are dim, the food courts are bright, the skybridge landings are dramatic.

### 16.1 Above-ground city

- **Block type:** `redstone_lamp` (active) on `iron_fence` poles every 8 blocks; `glowstone` accent inside tower lobbies.
- **Density:** sparse — the city is sunlit during the day and streetlit at night.
- **Light level:** 15 (daylight) at street level; 12 with `redstone_lamp` streetlights at night.
- **Mood:** hot, sunny, palms-and-towers. The surface is the **enemy**, the contrast to the underground.

### 16.2 Surface streets

- **Block type:** `redstone_lamp` streetlight poles (`iron_fence` + `redstone_lamp`) every 8 blocks.
- **Density:** 1 streetlight per 8-block stretch of street.
- **Light level:** 12 (with streetlights on); 15 (daylight, when sun is up).
- **Mood:** ordinary American downtown. The streetlights are the same in every block, the visual punctuation of the urban grid.

### 16.3 Office building lobbies

- **Block type:** `redstone_lamp` (active) every 4 blocks along the lobby ceiling; `glowstone` accent in the lobby columns.
- **Density:** moderate — the lobby is well-lit, with even illumination from the ceiling.
- **Light level:** 13.
- **Mood:** formal, grand, polished. The Wells Fargo lobby is the brightest of the four (per §4.1), at light level 14 with the coffered `quartz_slab` ceiling + `redstone_lamp` accents.

### 16.4 Tunnel (standard corridor)

- **Block type:** `sea_lantern` strips in the `smooth_stone_slab` ceiling at 4-block intervals.
- **Density:** even, fluorescent-style — the corridor is uniformly lit, with no shadows except at corners.
- **Light level:** 10.
- **Mood:** the **defining tunnel feel** — even, fluorescent, slightly dim, slightly claustrophobic. The "clean but dated" signature.

### 16.5 Food court (1970s — Esperson, Pennzoil)

- **Block type:** `sea_lantern` strips every 3 blocks (brighter than the standard corridor) + `redstone_lamp` accent lighting in the storefronts.
- **Density:** bright — the food court is the **brightest** space in the system.
- **Light level:** 12.
- **Mood:** warm, crowded, alive. The lunch-rush feel.

### 16.6 Food court (2010s — 1001 Fannin / Lamar)

- **Block type:** `end_rod` accent strips every 4 blocks + `redstone_lamp` panel lights every 6 blocks.
- **Density:** bright and modern.
- **Light level:** 13.
- **Mood:** contemporary, minimalist, the 2020s face of the system. Cooler in tone than the 1970s food courts.

### 16.7 Food court (1990s — McKinney)

- **Block type:** `redstone_lamp` LED panels every 5 blocks.
- **Density:** moderate.
- **Light level:** 12.
- **Mood:** utilitarian, parking-garage, services-heavy.

### 16.8 Skybridge

- **Block type:** `daylight_detector` (active, indicating "daylight detected") + `redstone_lamp` accent every 4 blocks.
- **Density:** dramatic — the skybridge is **flooded with natural light** through the `glass_pane` walls.
- **Light level:** 15 (the maximum).
- **Mood:** the visual shock of going from below-grade to above-grade. The player should feel the daylight difference.

### 16.9 After-hours shutdown (one quadrant)

- **Block type:** `redstone_lamp` (active, but at low state) at security-mode intervals — every 12 blocks instead of every 4.
- **Density:** sparse — the corridor is **dimmed**, with long stretches of near-darkness.
- **Light level:** 6 (security mode).
- **Mood:** quiet, empty, the back-of-house service level. The cleaning crews and building engineers continue to work, but the public spaces are dark.

### 16.10 Theater District stub (corridor)

- **Block type:** single `redstone_lamp` every 8 blocks.
- **Density:** very sparse — the stub corridor is **almost dark**.
- **Light level:** 5.
- **Mood:** the operational dual-mode — the Theater District tunnels open later for performance nights, but the rest of the system does not.

---

## 17. Block-Level Spec Summary (for the AI Contractor Writer)

A condensed reference table of the most-used block specs, organized by zone, for the contractor writer's quick reference. Full per-element specs are in §2 (palette), §6 (corridors), §7 (Esperson), §8 (other food courts), and §10 (skybridges).

| Zone | Wall | Floor | Ceiling | Light | Light level | Height (interior) | Width (interior) |
|---|---|---|---|---|---|---|---|
| Tower shell (1980s) | `quartz_block` | n/a | n/a | n/a | 15 (day) | n/a | n/a |
| Tower shell (1990s+) | `white_concrete` | n/a | n/a | n/a | 15 (day) | n/a | n/a |
| Tower window | `light_gray_stained_glass_pane` | n/a | n/a | n/a | 14 | n/a | n/a |
| Pennzoil mirrored glass | `black_stained_glass_pane` | n/a | n/a | n/a | 12 | n/a | n/a |
| Street | n/a | `gray_concrete` | n/a | `redstone_lamp` pole every 8 blk | 12–15 | n/a | 5–6 blk |
| Sidewalk | n/a | `smooth_stone_slab` | n/a | n/a | 15 (day) | n/a | 1 blk |
| Plaza paver | n/a | `bricks` or `polished_andesite` | n/a | n/a | 15 (day) | n/a | n/a |
| Parking garage exterior | `gray_concrete` | `gray_concrete` | n/a | n/a | 14 | 4 blk per deck | n/a |
| Parking garage interior | `light_gray_concrete` | `gray_concrete` | `gray_concrete` | `redstone_lamp` every 8 blk | 10 | 4 blk | 5 blk |
| Wells Fargo lobby | `light_gray_concrete` | `polished_andesite` | `quartz_slab` (coffered) | `redstone_lamp` every 4 blk | 14 | 8 blk | 20 blk |
| Wells Fargo bank of elevators | `light_gray_concrete` | n/a | n/a | `redstone_lamp` above | 14 | 3 blk | 2 blk per door |
| Wells Fargo interior stair | `light_gray_concrete` | `polished_andesite_stairs` | `quartz_slab` | `redstone_lamp` every 4 blk | 13 | 6 blk (descent) | 4 blk |
| McKinney garage lobby | `light_blue_concrete` | `gray_concrete` | `smooth_stone_slab` | `redstone_lamp` every 5 blk | 12 | 6 blk | 8 blk |
| Tunnel 1970s (default) | `white_concrete` | `white_wool` | `smooth_stone_slab` | `sea_lantern` every 4 blk | 10 | 3 blk | 3–6 blk |
| Tunnel 1990s (refresh) | `light_gray_concrete` | `gray_wool` | `quartz_slab` | `redstone_lamp` every 5 blk | 11 | 3 blk | 3–6 blk |
| Tunnel 2010s (LED) | `gray_concrete` | `gray_wool` | `black_concrete` | `end_rod` every 4 blk + `redstone_lamp` every 6 blk | 12 | 3 blk | 3–6 blk |
| Tunnel 1950s (minimal) | `smooth_stone` | `smooth_stone_slab` | (none — exposed structure) | `redstone_lamp` every 8 blk | 8 | 6 blk (full) | 3 blk |
| Food court 1970s (Esperson, Pennzoil) | `white_concrete` | `polished_andesite` | `smooth_stone_slab` | `sea_lantern` every 3 blk | 12 | 4 blk | 4–9 blk |
| Food court 2010s (1001 Fannin) | `gray_concrete` | `gray_wool` | `black_concrete` | `end_rod` + `redstone_lamp` | 13 | 4 blk | 4–6 blk |
| Food court 1990s (McKinney) | `light_gray_concrete` | `gray_wool` | `quartz_slab` | `redstone_lamp` every 5 blk | 12 | 4 blk | 4–6 blk |
| Skybridge | `glass_pane` + `iron_bars` | `white_wool` | `quartz_slab` | `daylight_detector` + `redstone_lamp` | 15 | 2 blk | 1 blk |
| Skybridge landing | `glass_pane` | `white_wool` | `quartz_slab` | `daylight_detector` | 15 | 3 blk | 4 blk |
| Sump-pump room | `light_gray_concrete` | `light_gray_concrete` | `light_gray_concrete` | `redstone_lamp` (pump active) | 6 | 3 blk | 4 blk |
| After-hours corridor (one quadrant) | `white_concrete` | `white_wool` | `smooth_stone_slab` | `redstone_lamp` every 12 blk (low) | 6 | 3 blk | 3–6 blk |
| Theater District stub | `white_concrete` | `white_wool` | `smooth_stone_slab` | `redstone_lamp` every 8 blk | 5 | 3 blk | 3 blk |
| Restroom | `quartz_block` | `red_terracotta` | `quartz_slab` | `redstone_lamp` every 3 blk | 12 | 3 blk | 3 blk |
| Floodgate | `light_gray_concrete` | `polished_andesite` | `quartz_slab` | `redstone_lamp` (sign) | 12 | 4 blk | 4 blk |

---

*End of design plan. This document is the architectural spec for the build. The Site Planner's coordinate-precise site plan (`site-plan.md`, `site-coordinates.json`) is the input for the AI Contractor Writer; the contractor writer uses this design plan for the *what* (which blocks, which materials) and the site plan for the *where* (which coordinates). The working plan (`working-plan.md`) and development plan (`development-plan.md`) follow.*
