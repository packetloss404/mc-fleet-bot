# Combined Complex — Design Plan (Architectural Spec, No-Ravine)

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex (Cheyenne Mountain + SubTropolis + Houston Tunnel System)
**Author role:** Architectural Designer (inter-site connections)
**Date:** 2026
**Status:** Binding architectural spec for the inter-site connections. **Reworked for the no-ravine design.** Inherits the seven deliberation decisions in `discussion-notes.md` and the soul/identity in `culture-architecture-analysis.md`. Geometry of the three individual sites is inherited from the 01–03 masterplans.

> **Scope reminder.** This document is the *inter-site* architecture. It specifies the public shaft, the service tunnel, the contact crossing, the composite terrane plaque, the world envelope (continuous mountain, city, coastal plain), the material palette, the lighting, the 4-layer defense-in-depth cross-section, the 6 centerpieces, and the 9 easter eggs at the level a builder needs to place blocks. The geometry of Cheyenne itself, the SubTropolis chamber grid, and the Houston tunnel sample are inherited from the three individual masterplans and are not re-specified here.
>
> **What changed from the ravine-era design.** The V-shaped ravine is dropped. The mountain is **one continuous mountain** with a **horizontal granite–limestone contact at Y = 100** (the architect's call — see §5). The composite terrane plaque moves from the (now-deleted) ravine bottom to the **service tunnel contact crossing** (where it already lived in the previous design's service-tunnel midpoint). The service tunnel still crosses the contact; it now does so **vertically through the contact plane**, not horizontally under a ravine. The return route drops the skybridge (it was a ravine-spanning object) and becomes **funicular + road**. The 9 easter eggs survive; only the "ravine bottom plaque specific placement" is removed. Everything else from the seven deliberation decisions is preserved.

---

## 1. Design Philosophy

The combined complex is **one Minecraft world that holds the entire history of American underground infrastructure in a single descent.** A visitor arrives on a hot coastal plain, walks into a sunlit two-layer city, takes a lift through 100 blocks of Bethany Falls limestone, emerges into a road-networked business park carved into 270 Ma limestone, drives out a horizontal portal in the south face of the mountain, rides a minecart up a long inclined bore that visibly crosses a horizontal geological contact — pink Pikes Peak granite replacing cream limestone mid-ride, marked by a single carved-stone plaque in a small alcove — and arrives at a baffle-curved tunnel bored into a granite peak, the entrance to a hollowed-out mountain hiding a city. The build is a single trajectory, not a tour; the connections *are* the design.

The architectural signature is **defense-in-depth layering made visible**. Four layers — civilian surface (Houston, hot and daylit), climate-controlled shallow (Houston tunnel, beige-tile workday basement), industrial limestone (SubTropolis, climate-stable and working), and military granite (Cheyenne, climate-sealed and spring-mounted) — are traversed by a single descending trajectory. The depth is the physical record of how much rock the nation was willing to put above a thing — and the answer goes: 20 feet for a lunch trip, 100 feet for a working life, 1,800 feet for a war.

Two architectural centerpieces make the three sites into one complex. The **public shaft** is a 7×7-block, 100-block vertical descent through limestone from the city surface to the SubTropolis ceiling, with a mid-level observation landing at Y = −50, a glass-and-steel pavilion at the top, and a guarded lobby at the bottom. The **service tunnel** is a 6×6-block, 80–120-block **ascending inclined minecart bore** through the mountain, climbing from the SubTropolis sub-basement (limestone, Y ≈ −100) up through the horizontal contact at Y = 100 and on to the Cheyenne outer portal (granite, Y ≈ +300). Without these two centerpieces, the three sites are just three sites; with them, the three sites are *one descent through one mountain*.

The **composite terrane plaque** is the build's Telling Detail. A 1×2 carved-stone plaque in a 3×5 alcove at the service tunnel contact crossing, lit by a single redstone lamp, with text explaining that the 1.08 Ga Pikes Peak granite above the contact and the 270 Ma Bethany Falls limestone below it are real rocks thrust into horizontal contact at this elevation — the same geology you find in the Alps, the Appalachians, and Glacier National Park. The plaque is the single block of the build that makes the premise *honest*.

The mountain is now **one continuous mountain with a horizontal contact** — no V-shaped ravine, no two peaks split by a gorge. The horizontal contact at Y = 100 is visible at the surface as a sharp color change ringing the mountain (cream limestone on the lower slopes, pink granite on the upper slopes and the peak), and it is visible in the service tunnel as the **wall material changing mid-ride** as the minecart climbs. The contact is the build's geological spine; the descent is the build's narrative spine; the two coincide.

---

## 2. Master Material Palette (Minecraft Blocks)

The combined complex uses a *meta-palette*: each site has its own palette (inherited), and the inter-site connections and the world envelope have their own transitional palettes. The palette is honest — pink granite is pink granite, cream limestone is cream limestone, white concrete is white concrete — and the transitions between palettes are *gradients*, not hard cuts.

### 2.1 Primary palette (per zone)

| Zone | Primary block | Secondary block | Accent / detail |
|---|---|---|---|
| **Granite mountain (above Y = 100 contact)** | Polished diorite (pink-grey, Pikes Peak syenogranite analogue) | Diorite, granite, granite bricks | Smoky-quartz crystals (small clusters), pink terracotta (brick-red accent), snow layer (peak), spruce/dark-oak forest (lower slopes) |
| **Limestone mountain (below Y = 100 contact)** | Smooth stone (cream-grey) | Calcite, sandstone (cream), polished calcite | Chiseled calcite blocks (for carved plaques), oak/maple leaves, exposed fossils (light grey wool "fossil" inlays, decorative), grass overlay (lower slopes) |
| **Contact ring at Y = 100 (the surface expression)** | 1-block transition: smooth stone (cream) → polished diorite (pink), with a 1-block cobblestone + calcite "breccia" strip at the contact | Diorite, calcite | Oak sign "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma" (passive easter-egg-class surface read) |
| **City above-ground (Houston, in valley)** | Stone bricks (gray) | Quartz blocks, white concrete, glass panes | Glass pane skybridges, sea-lantern streetlights, oak doors, T-marker (red wool + white concrete) |
| **Houston tunnel (under city)** | White concrete (walls) | White wool (VCT floor analogue), smooth stone slab (dropped ceiling) | Sea lantern (fluorescent analogue), light gray carpet (corridor markings), quartz stairs (food court accents) |
| **Public shaft (city → SubTropolis)** | Gray concrete (top half) | Smooth stone transitioning to calcite (bottom half) | Iron bars (lift enclosure), glass panes (observation window), oak trapdoors (utility access), redstone lamps (lighting) |
| **Service tunnel (SubTropolis → Cheyenne, ascending)** | Smooth stone (start, limestone) | Polished diorite (end, granite) | Rails + powered rails, stone brick slab (floor), redstone lamps (utility strip), chiseled calcite + chiseled stone brick (contact-crossing plaque in 3×5 alcove), redstone lamp on alcove ceiling |
| **Composite terrane plaque** | Chiseled calcite (limestone half) | Chiseled stone brick (granite half) | Written book or sign block for the geological text; 1-block strip of mixed cobblestone + calcite (thrust-fault breccia) on the floor at the contact crossing |
| **Coastal plain (east of city)** | Grass blocks | Sand (near the small lake), oak/spruce saplings (sparse forest) | Lily pads, oak boats, sugar cane (near water) |

### 2.2 Secondary (transitional) palette

The transitional blocks are used at the gradient zones — the public shaft, the service tunnel, the contact ring, the surface entrances. The transitions are 1–2-block gradients, not 1-block hard cuts, so the eye reads a *slow color shift* over 30–100 blocks of vertical or horizontal travel.

- **Public shaft — top half (city → mid-landing):** gray concrete, light gray wool (lift floor), iron bars (lift enclosure), oak trapdoors (utility covers). Reads as Houston above-ground construction.
- **Public shaft — mid-landing (Y = −50):** a 7×7 room in *utility* palette — exposed gray concrete pillars, white concrete (walls), light gray wool (floor), sea lantern (the G-Cans-style pillar visible through the glass window), oak fence (handrail), item frame on a smooth stone slab (the labelled limestone block, "Bethany Falls Limestone — 270 Ma").
- **Public shaft — bottom half (mid-landing → SubTropolis):** transition blocks — smooth stone (a *creamer* gray than the concrete above), calcite (cream-grey), white concrete (lobby walls). Reads as SubTropolis industrial.
- **Service tunnel — limestone section (SubTropolis → contact):** smooth stone walls (cream-grey, limestone analogue), white concrete (utility strip), stone brick slab floor, rails (single track), powered rail every 4 blocks (the minecart must climb, so powered rails are denser than the previous flat design), redstone lamp every 8 blocks.
- **Service tunnel — contact crossing (around block 50 of ~100):** a 1-block chiseled calcite wall (limestone) on the lower (south) face of the 6×6, a 1-block chiseled stone brick wall (granite) on the upper (north) face, with a 1-block-wide cobblestone + calcite *breccia strip* on the floor at the contact (visibly mixed rock). A 3×5 alcove is carved into the upper wall of the 6×6 at the contact crossing; inside the alcove, a 1×2 carved-stone plaque (chiseled calcite + chiseled stone brick side-by-side) and a single redstone lamp on the alcove ceiling.
- **Service tunnel — granite section (contact → Cheyenne):** polished diorite walls (pink-grey, the Pikes Peak syenogranite analogue), with the utility strip continuing (water, power, fiber-optic) in *Cheyenne colors*: water is *gray* (gray wool, the "raw water" of Cheyenne's reservoirs), power is *black* (black wool, the "diesel generator" power of Cheyenne), fiber-optic is *red* (red wool, the "secure comms" of Cheyenne). The minecart rail continues with powered rail every 4 blocks (the climb is steeper in the granite section than in the limestone section).

### 2.3 The 4-layer material story (vertical cross-section)

A side-view cross-section through the world, top to bottom, shows the palette story:

```
Y = 800   Snow layer (granite peak, white on pink-grey)
Y = 700   Polished diorite (granite core, pink-grey)
Y = 400   Polished diorite + spruce forest
Y = 250   Cheyenne chamber: polished diorite walls + gray concrete floors
Y = 200   J-curve side branch (concrete-lined) → outer portal approach
Y = 100   *** HORIZONTAL CONTACT *** (cream limestone below, pink granite above)
Y =   0   City surface: stone brick + glass + quartz; SubTropolis ceiling (calcite)
Y =  -6   Houston tunnel: white concrete + white wool + smooth stone slab
Y = -50   Public shaft mid-landing: gray concrete utility palette
Y =-100   SubTropolis floor (smooth stone) + service tunnel start
Y =-110   Service tunnel limestone section, ascending
Y =   0   Service tunnel passes Y=0 going up (still in limestone)
Y =  50   Service tunnel approaches the contact
Y = 100   CONTACT CROSSING: breccia strip + composite terrane plaque alcove
Y = 150   Service tunnel in granite section, ascending
Y = 250   Service tunnel arrives at the Cheyenne outer portal / 25-ton blast door
Y = 300   J-curve through granite to the chamber
```

The vertical palette is the build's *visual signature*. A player who descends from city to SubTropolis sees the palette change in distinct, named blocks: stone brick → white concrete → gray concrete → smooth stone → calcite. A player who ascends from SubTropolis to Cheyenne through the service tunnel sees the palette change *again*: smooth stone → calcite (the contact crossing moment) → polished diorite. Five named block types, four layer transitions, one trajectory.

---

## 3. The Public Shaft (Vertical Centerpiece)

### 3.1 Position and geometry

- **Position:** at the east edge of the city, in a small plaza named the **"Combined Complex Transit Hub."** The plaza is bounded by the 144×96-block city footprint on three sides and opens onto the eastern coastal plain on the fourth side. The shaft is in a *buffer block* at the SE corner of the Houston 24-block tunnel sample (per the 03-masterplan coordination point), so it does not displace tunnel geometry.
- **Cross-section:** 7×7 blocks (1 block = 1 m, per Decision 3). The center 5×5 is the **lift core** (5×5 lift car + 1-block lift shaft clearance on each side); the outer 1-block ring is **1-block emergency stair on the west face** (visible through a glass wall) and **1-block service chase on the east face** (pipes, conduits, a fiber-optic run). The 7×7 is the *shaft envelope*; the 5×5 is the *lift geometry* that the SubTropolis masterplan already commits to.
- **Vertical extent:** 100 blocks. The lift descends from Y = 0 (city surface, plaza) to Y = −100 (SubTropolis ceiling). The shaft cuts vertically through the lower limestone of the mountain. At 1 block = 1 m, that is 100 m of vertical travel.
- **Build height:** the shaft is 100 blocks tall and the lift travels 100 m. The descent takes ~30 seconds of in-game travel at walking-pace, with the mid-landing pause adding another 15–30 seconds.

### 3.2 The descent experience (top to bottom)

**Top — the surface pavilion (Y = 0 to Y = −3).** A 7×7 glass-and-steel pavilion at the city surface, set in a 20×20 plaza of stone brick and oak planks. The pavilion has:
- **Glass walls** (glass panes, 1-block-thick for visibility) on three sides, with the back (east) side as a stone-brick wall housing the lift machinery.
- A **"SubTropolis — Public Access"** sign (oak sign with black dye text, in the 1960s-style Helvetica block letters borrowed from the Houston visual language) above the entrance.
- A **T-marker** (red wool on a white concrete block, the same 1-block motif as the Houston tunnel entries) at the curb, *inherited* from the 03-masterplan.
- A **guard booth** (1 block of oak fence + oak sign with "GUARD" in black text) just inside the entrance.
- A **turnstile** (iron bars arranged in a + pattern, with a sign reading "EMPLOYEES / VISITORS" in two columns) at the descent.
- A **second sign** above the descent: "EMPLOYEE ENTRANCE / EMERGENCY EGRESS" — the *dual-use* labeling that makes the shaft a Helsinki-style civilian-by-default / defense-by-override facility.
- **Block underfoot:** stone brick (plaza) and white concrete (pavilion floor).
- **Light level:** 15 (full daylight, glass walls).
- **Sound:** ambient city; the pavilion is the last moment of city noise before the descent.

**Upper section (Y = −3 to Y = −50) — city to mid-landing.** The lift is a 5×5 car of *white concrete walls* (lift interior), with *iron bars* forming the lift enclosure (1-block-thick iron bars on all four sides of the 5×5, visible from outside). A *glass pane* window in the outer west wall of the 7×7 lets the player see the emergency stair spiraling down beside them. The walls of the 7×7 are *gray concrete* (Houston above-ground concrete construction). The ceiling of the shaft is smooth stone slab. The *service chase* on the east side of the 7×7 has visible utility runs: an oak fence "pipe" (water), a string of redstone (power), a line of white wool "fiber-optic cable." The chase is *behind an oak fence gate* that the player can see but not enter. The *emergency stair* on the west side is a spiral of oak stairs around a central oak fence post, visible through the glass pane.

- **Block underfoot (in the lift):** light gray wool (lift floor — a "metal grating" analogue).
- **Light level:** 12 (redstone lamp, fluorescent analogue).
- **Sound:** the mechanical hum of the lift (a noteblock + note "F" set to a low pitch, looping); the *echo* of the shaft.

**Mid-level observation landing (Y = −50).** A 7×7 block room *carved out* of the south face of the shaft, so the player exits the lift car and steps into a 7×7 alcove. The room has:
- **A single glass window** (3×3 glass panes) on the south face, looking out at a 7×7 *underground utility scene*: a single 1×3 polished diorite pillar (the G-Cans-style concrete pillar analogue), a 1-block oak fence water pipe running along the floor, a 1-block string of redstone power line on the wall, a 1-block line of white wool fiber-optic conduit on the ceiling. The scene is the *city's underground utility corridor* — the *real* working infrastructure that runs between the Houston tunnel and the SubTropolis, normally hidden.
- **A labelled limestone block** (smooth stone slab on the wall, with a sign reading "Bethany Falls Limestone — 270 Ma, Pennsylvanian") on the inner wall, opposite the window. This is the *Geologist's ask* from the deliberation.
- **A small bench** (oak stairs) under the window, so the player can sit and look.
- **An information sign** (oak sign with multiple lines) on the wall near the lift door:
  - Line 1: "Mid-Level Observation Landing — Y = −50"
  - Line 2: "You are halfway between city (Y = 0) and SubTropolis (Y = −100)."
  - Line 3: "The window looks out at the city's underground utility corridor."
  - Line 4: "Below you: 50 m of Bethany Falls limestone."
- **A second exit** (iron door, 2×1) leading to a continuation of the emergency stair on the west side, so the player can walk down via the stair if they prefer.
- **Block underfoot:** stone brick slab.
- **Light level:** 12 (redstone lamp + the glass window showing the dimly lit utility corridor beyond).
- **Sound:** the hum of the utility corridor beyond the window; the *hiss* of the city's HVAC duct that runs along the corridor.

**Lower section (Y = −50 to Y = −100) — mid-landing to SubTropolis.** The lift continues down. The walls *transition*: gray concrete gives way to smooth stone, then to calcite (a cream-grey). The lighting stays redstone lamp, but the *color* of the light reflected off the walls shifts subtly from cool blue-grey to warm cream. The service chase on the east side now shows limestone-compatible utility runs: a thicker water pipe (oak fence, 2-block cross-section), a power conduit (redstone, 2-block cross-section). The emergency stair on the west side continues to spiral down. The 7×7 cross-section is unchanged; only the *block types* transition.

- **Block underfoot (in the lift):** light gray wool.
- **Light level:** 12.
- **Sound:** the lift hum continues; the *echo* of the shaft is slightly different (the calcite walls reflect differently than the concrete).

**Bottom — the SubTropolis lobby (Y = −100).** A 7×7 block room *carved out* of the north face of the shaft, mirroring the mid-landing. The lobby has:
- A **security gate** (iron bars, 1-block-thick) at the lift exit.
- A **turnstile** (iron bars, + pattern) just past the security gate.
- A **"Welcome to SubTropolis"** sign (oak sign with channel-letter-style text in black, mounted on a white concrete background block) on the wall above the security gate.
- A **second sign** below: "Hunt Midwest SubTropolis — Industrial Complex, Est. 1964."
- **An information sign** on the wall:
  - "SubTropolis Public Access — Employee Entrance 95% of the time / Emergency Egress 5% of the time."
  - "Below the lobby: Hushpuckney Avenue, the SubTropolis main corridor."
  - "HELSINKI 5,500 — the number of civil-defense shelters in Helsinki, the inspiration for this dual-use shaft." (Easter egg #4 — the Helsinki reference, see §12.)
- **A door** (iron door, 2×1) opening onto Hushpuckney Avenue, with the SubTropolis grid visible beyond.
- **Block underfoot:** stone brick slab (lobby floor) transitioning to asphalt (Hushpuckney Avenue beyond the door).
- **Light level:** 12.
- **Sound:** the *HVAC hiss* of the SubTropolis chamber, audible as soon as the door is open; the *echo* of the larger chamber.

### 3.3 The "you are descending" feel

The Minecraft signals for *descent* are the same as the ravine-era design:
- **Block-type transitions** in the walls (concrete → smooth stone → calcite).
- **Light level** staying at 12 but the *reflected color* shifting from cool to warm.
- **Sound echo** changing as the wall material changes.
- **The emergency stair visible beside the lift** as a constant architectural reminder.
- **The mid-landing window** as the *breath*.
- **The bottom lobby's door** opening onto a visually *larger* space (the SubTropolis chamber).

The public shaft is unchanged from the ravine-era design because it is a *vertical* descent through limestone that doesn't depend on the surface ravine. The shaft cuts straight down through the lower limestone of the continuous mountain.

---

## 4. The Service Tunnel (Horizontal-ish Centerpiece, Ascending)

The service tunnel is the *inter-site horizontal centerpiece* in name, but in the no-ravine design its geometry is **an ascending inclined minecart bore** through the continuous mountain. The tunnel climbs from the SubTropolis sub-basement (in limestone, low elevation) up through the horizontal contact at Y = 100 and on to the Cheyenne outer portal (in granite, high elevation). The "horizontal" descriptor survives because the tunnel is *long* (80–120 blocks), *one straight inclined bore* (no curves, no switchbacks — straight per Decision 4), and *the through-route*, not a destination.

### 4.1 Position and geometry

- **Position:** in the continuous mountain, ascending diagonally from the SubTropolis sub-basement (NW corner, at Y ≈ −100) up to the Cheyenne outer portal (in the granite face, at Y ≈ +300).
- **Cross-section:** 6×6 blocks (1 block = 1 m, per Decision 4). The center 4×4 is the **rail corridor** (1-block gauge minecart track + 1-block clearance on each side); the *upper* (north, ceiling-side) 1-block face of the 6×6 is the **utility strip** (water pipe from Cheyenne's reservoirs as backup for SubTropolis fire protection, power line, fiber-optic line); the *lower* (south, floor-side) 1-block face is the **emergency-escape corridor** (a 1-block walkway for personnel evacuation).
- **Length:** 80–120 blocks, depending on the exact path through the mountain. The working number is **100 blocks** — long enough to feel like a *journey* (a 2–3 minute minecart ride at 1 block per second on powered rails), short enough to not bore the player.
- **Vertical profile:** the tunnel climbs from Y = −100 (SubTropolis sub-basement NW corner) to Y = +300 (Cheyenne outer portal). That's a 400-block elevation gain over 100 blocks of horizontal travel — a 4:1 gradient. In Minecraft, this is feasible with **powered rail every 4 blocks** (the minecart gets a continuous boost up the climb). The geometry is a *straight inclined bore*, not a switchback or a stepped shaft.
- **Alignment:** straight (per Decision 4). The 6×6 cross-section is uniform from end to end; only the wall material and the lighting change.
- **The contact crossing:** at the midpoint of the tunnel (around block 50 of 100), the tunnel passes through the horizontal contact plane at Y = 100. This is the *Telling Detail moment* — the place where the wall material visibly changes from cream smooth-stone (limestone) to pink polished diorite (granite), and where the composite terrane plaque sits in a 3×5 alcove.

### 4.2 The journey experience (SubTropolis end to Cheyenne end)

**Start — the SubTropolis sub-basement gate (south end, Y = −100).** The tunnel begins at the NW corner of the SubTropolis sub-basement, where the limestone wall of the sub-basement is broken through to start the inclined bore. The opening is a 6×6 hole in the limestone wall, with:
- A **security gate** (iron bars, 1-block-thick) at the SubTropolis side.
- A **sign** above the gate: "SERVICE TUNNEL → CHEYENNE / U.S. Space Force — Authorized Personnel Only" (oak sign, black text, the dual-line labeling).
- A **subtle "SBB CFF FFS"** carving on a 1-block chiseled calcite block at the top-left of the gate frame — the Swiss Federal Railways logo, the *subtle Gotthard reference* (Easter egg #3).
- A **second sign** below the gate: "Service Tunnel — Inspired by the Gotthard Base Tunnel, 57 km, opened 2016" (Easter egg #3 main text).
- A **paved road** (asphalt, 6 blocks wide) leading from the SubTropolis sub-basement to the gate, with a 15-mph speed-limit sign.
- **Block underfoot (sub-basement side):** asphalt.
- **Block underfoot (in the tunnel):** stone brick slab.
- **Light level:** 12 (redstone lamp at the gate, every 8 blocks along the tunnel).

**Limestone section (first ~40 blocks, SubTropolis → contact).** The walls are *smooth stone* (cream-grey limestone analogue), with painted utility-line colors:
- The water pipe is *light blue* (light blue wool).
- The power line is *red* (red wool).
- The fiber-optic line is *white* (white wool).
- The emergency-escape corridor has a *yellow stripe* (yellow wool) on the floor at the south face of the 6×6.
- The minecart rail sits in the center 4×4, with a *powered rail every 4 blocks* (denser than the flat ravine-era design, because the minecart must climb the 4:1 gradient).
- The ceiling is *smooth stone slab* (the dropped-ceiling analogue).
- **Block underfoot:** stone brick slab.
- **Light level:** 10 (redstone lamp, dimmer than the SubTropolis chamber — the *tunnel* is dimmer than the *chamber*).
- **Sound:** the *wheels-on-rail* sound of the minecart; the *hiss* of the utility strip; the *echo* of the tunnel; the *clack* of the powered-rail boost.

**Mid-section — the contact crossing (around block 50 of 100, at Y = 100).** The walls *transition* visibly. This is the **Telling Detail moment** — the single most architecturally important block of the build:
- The lower (south) face of the 6×6 is *chiseled calcite* (cream-grey limestone, with the carved-chiseled texture). The upper (north) face is *polished diorite* (pink-grey granite, with the smooth-polished texture).
- A **1-block-wide strip of mixed cobblestone + calcite** (the *thrust-fault breccia* analogue) runs across the floor of the 6×6 at the contact. The strip is 1 block tall and 6 blocks long (the full cross-section length), and is the visual marker of the contact plane.
- A **3×5 alcove** is carved into the *upper* (granite) wall of the 6×6 at the contact crossing. The alcove has a smooth-stone-slab floor, polished-diorite side walls and ceiling, and a single **redstone lamp** mounted on the alcove ceiling.
- Inside the alcove: the **composite terrane plaque** — a 1×2 carved-stone marker:
  - **Left block (limestone half):** chiseled calcite, representing the 270 Ma limestone below the contact.
  - **Right block (granite half):** chiseled stone brick (or chiseled polished diorite if available), representing the 1.08 Ga granite above the contact.
  - **Text on the plaque** (oak signs, 6 lines on the alcove wall, black text on white):
    - Line 1 (large): "COMPOSITE TERRANE"
    - Line 2: "The granite above this alcove is 1.08 Ga Pikes Peak granite."
    - Line 3: "The limestone below is 270 Ma Bethany Falls limestone."
    - Line 4: "They are in horizontal contact at this elevation, where"
    - Line 5: "the granite pluton pushed up through the limestone."
    - Line 6: "In real mountain ranges (the Alps, the Appalachians, Glacier National Park),"
    - Line 7: "this is a common geological feature."
- The lighting *shifts* at the contact — from cream-tinted limestone light to pink-tinted granite light. The change is subtle but noticeable to a player who is looking.
- **Block underfoot:** stone brick slab with the breccia strip.
- **Light level:** 8 (the dimmest point in the tunnel — the contact is the *geological* highlight, and dim lighting makes it feel *deep*).
- **Sound:** the echo changes — the calcite wall reflects differently than the diorite wall; the redstone lamp hums softly.

**Granite section (last ~40 blocks, contact → Cheyenne).** The walls are *polished diorite* (pink-grey, the Pikes Peak syenogranite analogue), with:
- The utility strip continues in *Cheyenne colors*: water is *gray* (gray wool, the "raw water" of Cheyenne's reservoirs), power is *black* (black wool, the "diesel generator" power of Cheyenne), fiber-optic is *red* (red wool, the "secure comms" of Cheyenne). The color shift is a *signal* of the regime change.
- The ceiling is *polished diorite slab* (no dropped ceiling — the granite is *self-supporting* per real-world engineering).
- The minecart rail continues with powered rail every 4 blocks.
- The tunnel continues to *climb* (1 block up per ~1 block of horizontal travel, the 4:1 gradient continuing), so the player feels a continuous ascent. The minecart ride gets slightly faster in the granite section as the player feels the elevation gain.
- **Block underfoot:** stone brick slab.
- **Light level:** 10 (redstone lamp, brightening as the tunnel approaches the Cheyenne end).
- **Sound:** the wheels-on-rail; the *hiss* of the utility strip; the *echo* of the tunnel (slightly different with the diorite walls); the *clack* of the powered-rail boost.

**End — the Cheyenne outer portal (Y = +300, in the granite face of the mountain).** The tunnel terminates at a 6×6 opening in the granite, framed by a 4-block-deep *concrete-and-granite checkpoint corridor*:
- The corridor is 4 blocks deep and 6 blocks wide, with *gray concrete* walls and *polished diorite* accents.
- The **25-ton blast door** is a 3-block-thick *iron door* (the blast door analogue) in a 6-block-tall, 6-block-wide frame of *quartz stairs* (the granite frame analogue). The door is the *visual climax* of the tunnel — the player sees it as the minecart approaches, growing from a 1-block dark patch to a wall of iron.
- A **guard booth** (1 block of oak fence + oak sign) on the right side of the corridor, 1 block before the door.
- A **sign** on the wall: "U.S. Space Force — Authorized Personnel Only / Cheyenne Mountain Complex / Outer Portal" (Easter egg #6).
- A **second sign**: "Beyond this door: Cheyenne Mountain Complex, J-curve access tunnel, 800 m to chamber."
- **Beyond the door:** the J-curve access tunnel (inherited from the 01-masterplan, 800 blocks of curved tunnel through Pikes Peak granite, with three character stages — rough-hewn at the portal, concrete-lined at the side branch, polished institutional at the chamber).
- **Block underfoot:** stone brick slab (corridor) transitioning to rails + gravel (J-curve beyond the door).
- **Light level:** 8 (corridor) → 12 (J-curve chamber).
- **Sound:** the wheels-on-rail continues until the door; the *hiss* of the door's pressure seal (a noteblock set to a low, sustained note); the *hiss* of the J-curve's HVAC beyond the door.

### 4.3 The "you are traveling through 800 million years of geology" feel

The Minecraft signals for *geological transition* are:
- **Block-type transitions** in the walls (smooth stone → chiseled calcite → polished diorite, with a 1-block breccia strip at the contact).
- **Color shifts** in the utility strip (SubTropolis blue/red/white → Cheyenne gray/black/red).
- **Ceiling change** (smooth stone slab dropped ceiling → polished diorite slab self-supporting).
- **Light color** shifting from cream-tinted to pink-tinted.
- **The breccia strip** as the *one block* that visibly mixes the two rocks.
- **The contact-crossing plaque** as the *text* moment — the player reads the text and understands they have just crossed 800 million years of geological history.
- **The continuous ascent** — the minecart climbs the entire time, and the *feeling* of rising through the rock is itself a geological cue (the player is moving from a 270 Ma rock into a 1.08 Ga rock as they rise).

The minecart ride is the *one moment of speed and ascent* in the whole build. The player cannot stop (except at the ends); the experience is *continuous*. The transition is *felt*, not *chosen*. The 4:1 gradient with powered rails every 4 blocks is the *vertical equivalent* of the previous design's flat horizontal ride under the ravine — the *thrill* is the same, the *geology* is the same, but the geometry is now ascending instead of flat.

---

## 5. The Mountain Range — Updated

The mountain range is now **one continuous mountain with a horizontal contact**, not two peaks split by a V-shaped ravine. The range is a single landform with two rock types — granite on top, limestone on the bottom — separated by a horizontal contact plane at Y = 100. The contact is the build's geological signature; the descent is the build's narrative signature.

### 5.1 The continuous mountain — geometry

- **Footprint:** X = −400 to +400, Z = −700 to −100 (800 × 600 blocks). The mountain rises in the north of the world; the city is in the south; the coastal plain wraps east.
- **Total height:** Y = 0 (mountain base, at city level) to Y = 800 (granite peak), with a 800-block vertical extent at the center.
- **Profile:** a single mountain with a dominant peak at center (X = 0, Z = −550) and a broad sloping base. The mountain is not a sharp triangle (like the previous design's granite peak in isolation) — it is a rounded massif with a high central peak, sloping down on all sides to the city level at Y = 0.
- **Asymmetry:** the mountain is *stratified*, not asymmetric. The granite cap (above Y = 100) is the upper third of the mountain; the limestone body (below Y = 100) is the lower two-thirds. The contact at Y = 100 is visible at the surface as a sharp horizontal color change ringing the mountain — cream limestone on the lower slopes, pink granite on the upper slopes and the peak.

### 5.2 The granite cap (above Y = 100)

- **Footprint:** the upper third of the mountain, from Y = 100 (the contact) to Y = 800 (the peak).
- **Composition:** pink-to-brick-red Pikes Peak syenogranite (1.08 Ga). Minecraft palette: polished diorite (the core rock, pink-grey), with diorite and granite (the weathered layer), pink terracotta (the brick-red accent), smoky-quartz crystals (small clusters, decorative).
- **Profile:** the upper slopes of the mountain, from the contact at Y = 100 up to the peak at Y = 800. Steeper than the limestone slopes (granite is harder, holds steeper angles), but still a *slope*, not a cliff. The peak is a sharp Pikes Peak-style triangle at (X = 0, Z = −550), but only the upper 700 blocks; the lower 100 blocks of the mountain are limestone.
- **Forest cover:** spruce and dark oak on the granite slopes above Y = 100, thinning to bare rock at the treeline (Y = 500 on the north face, Y = 400 on the south face).
- **Snow line:** snow layer on the top 100 blocks (Y = 700 to Y = 800), with a 5-block-wide ice cap at the very summit.
- **Chamber inside:** Y = 250 to Y = 400, deep inside the granite. **1,800+ ft (549+ blocks) of solid granite above the chamber ceiling** (Y = 400 to Y = 800 is 400 blocks; the chamber floor is at Y = 250, so 550 blocks of rock from summit to chamber floor). The chamber is ~80m × 80m horizontal (4.5 acres).
- **Reference:** Cheyenne Mountain, Colorado Springs. 9,565 ft (2,915 m) real peak. At 2:1 vertical compression (Y = 800 vs. real 2,915 m), the build matches the 1:1 horizontal / 2:1 vertical compromise.

### 5.3 The limestone body (below Y = 100)

- **Footprint:** the lower two-thirds of the mountain, from Y = 0 (mountain base, city level) to Y = 100 (the contact).
- **Composition:** cream-to-grey Bethany Falls limestone (270 Ma, Pennsylvanian). Minecraft palette: smooth stone (the core rock, cream-grey), with calcite (the weathered surface), sandstone (cream, decorative), grass-and-dirt overlays on the lower slopes.
- **Profile:** the lower slopes of the mountain, from the base at Y = 0 up to the contact at Y = 100. Gentler than the granite slopes (limestone erodes faster, holds shallower angles). Exposed bedding planes visible from the city (horizontal striations in the limestone face).
- **Forest cover:** oak and birch on the limestone slopes, thinning to bare rock at the treeline (Y = 50 on the south face, Y = 80 on the north face).
- **SubTropolis inside:** Y = −100 to Y = 0, the 200 × 200 block chamber with 8×8×5 block pillars on 65-block centers. The chamber is fully inside the limestone, with 100 blocks of limestone above the chamber ceiling (Y = 0 to Y = 100 at the contact).
- **Reference:** SubTropolis, Kansas City. 270 Ma limestone, 100–160 ft below surface. The 100 blocks of limestone above the chamber matches the 100–160 ft real overburden, *plus* the 100 blocks of limestone between the chamber ceiling and the contact.

### 5.4 The horizontal contact (Y = 100)

The contact is the build's geological spine. It is a horizontal plane at Y = 100, where the granite (above) meets the limestone (below). In the build, the contact is visible in three places:
- **At the surface**, as a sharp color change ringing the mountain. The contact is a "ring" of transition — 1–2 blocks of mixed rock (cobblestone + calcite + diorite) at Y = 100, visible as a horizontal stripe on the mountain face as you look up from the city. A single oak sign reads "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma" at one prominent point on the ring (e.g., the south face, where it is most visible from the city).
- **In the service tunnel**, as the contact crossing (the Telling Detail moment, see §4.2 and §6).
- **At the SubTropolis horizontal portal** on the south face of the mountain (see §5.5), the contact passes just above the portal mouth, visible as a 1-block-wide pink granite band over the cream limestone of the portal frame.

The contact is **real geology**. In the Alps, the Appalachians, the Blue Ridge, and Glacier National Park, granite plutons push up through limestone host rock and create exactly this kind of horizontal contact at a specific elevation. The build's premise is now geologically honest without any "composite terrane" hand-waving.

### 5.5 The SubTropolis horizontal portal (south face)

The SubTropolis horizontal portal is on the **south face of the continuous mountain** (the city-facing side), at the contact elevation (Y = 100). In the no-ravine design, the portal is *not* at a ravine floor (there is no ravine); it is at a *mid-elevation* on the mountain face, accessible from the city by a switchback road that climbs the south slope.

- **Position:** (X = 0, Y = 100, Z = −300) — the south face of the mountain, at the contact elevation.
- **Opening:** 4×5 block opening in the limestone (the limestone body of the mountain, just below the contact).
- **Frame:** smooth stone (the limestone) with chiseled calcite corners; a 1-block-wide polished diorite band directly above the frame (the contact plane, visible as a pink stripe over the cream portal).
- **Sign above the portal:** "Hunt Midwest SubTropolis — Authorized Vehicles" (oak sign, black text, channel-letter-style).
- **Sign below:** "World's Largest Underground Business Complex" (Easter egg #5).
- **Vehicle gate:** oak fence gate, 2 blocks wide, at the portal mouth.
- **Paved road:** 6-block-wide asphalt road from the portal mouth, switchbacking down the south face of the mountain to the city plaza (Y = 0). 6 switchbacks over 100 blocks of elevation, each switchback a 20-block horizontal traverse on a 5-block-wide shelf cut into the limestone slope.
- **Inside the portal:** a security gate, a turnstile, a vehicle checkpoint, with the SubTropolis main avenue (Hushpuckney) visible beyond.
- **Why this position works:** the portal is at the contact elevation, which is the natural break between the limestone body and the granite cap. Real SubTropolis drive-in portals are at *hillside* elevation (the original mine was driven horizontally into the bluff from a road at hillside level). The build's portal follows the same model: it is driven horizontally into the mountain from a road at the contact elevation, where the limestone is most accessible from the surface.

### 5.6 The Cheyenne outer portal (granite face)

The Cheyenne outer portal is on the **granite face of the continuous mountain**, at the chamber access elevation (Y = 300). It is where the service tunnel terminates (the 25-ton blast door is recessed in a 4-block side branch just inside the portal).

- **Position:** (X = 0, Y = 300, Z = −500) — the north-facing granite slope of the mountain, at the chamber access elevation.
- **Opening:** 6×6 opening in the granite (the granite cap, above the contact).
- **Frame:** polished diorite (the granite) with quartz-stair corners; concrete accents around the blast door recess.
- **Sign at the portal:** "U.S. Space Force — Authorized Personnel Only" (oak sign, black text, Easter egg #6).
- **Guard booth:** oak fence + sign, just inside the portal.
- **Inside the portal:** the 4-block concrete-and-granite checkpoint corridor, the 25-ton blast door, and the start of the J-curve access tunnel.
- **Why this position works:** the portal is at the chamber access elevation, so the J-curve tunnel can descend (or stay level) to reach the chamber at Y = 250–400. The 800-block J-curve is inherited from the 01-masterplan.

### 5.7 Surface features on the mountain

- **Antenna arrays:** 3–5 tall thin structures (iron block columns with lightning rods, ~30–50 blocks tall) on the granite ridgeline (Y = 600 to 800). Visible from the city as the only obvious surface feature.
- **Forest:** spruce and dark oak on the granite slopes above Y = 100; oak and birch on the limestone slopes below Y = 100. The forest is *geology-aware* — different species on different rocks, with a sharp transition at the contact.
- **The contact ring (visual signature):** the 1–2-block transition band at Y = 100, ringing the mountain. The most visible part of the build's geology from the city.
- **Parking lots:** one small gravel/cobblestone lot at the base of the mountain (south side, near the SubTropolis horizontal portal switchback start), and a second lot near the funicular base station on the north side.
- **The "Three Sites, One Mountain" sign at the granite summit** (Easter egg #2): a 3×3 oak sign panel on a 1-block stone brick pedestal at the summit, with the text:
  - "THREE SITES, ONE MOUNTAIN"
  - "Cheyenne Mountain (Colorado Springs) — Granite, upper elevation"
  - "SubTropolis (Kansas City) — Limestone, lower elevation"
  - "Houston Tunnels — City in the valley"
  - "Combined by horizontal contact at Y=100, connected by service tunnel"
- **The rock identification chart at the granite summit** (Easter egg #9): a 3-block display near the "Three Sites" sign, with three item frames on three blocks:
  - Block 1: a sample of polished diorite (Pikes Peak granite, 1.08 Ga) with a sign "Pikes Peak Granite — 1.08 Ga, Proterozoic"
  - Block 2: a sample of smooth stone (Bethany Falls limestone, 270 Ma) with a sign "Bethany Falls Limestone — 270 Ma, Pennsylvanian"
  - Block 3: a sample of cobblestone + calcite (thrust-fault breccia) with a sign "Thrust-Fault Breccia — Mixed rock at the horizontal contact"
- **The funicular station at the granite summit** (per Decision 5): a 10×10 block building at the summit, with oak log walls and spruce roof (a small Swiss-style alpine station), a 1-block-wide rail track descending the north face of the mountain to the Cheyenne outer portal at Y = 300, a 2×2 oak door entrance with a sign "FUNICULAR → Cheyenne Mountain Outer Portal / ~5 min ride," and a minecart with chest (the funicular car) at the top of the rail. The rail is *powered* (powered rail every 4 blocks) so the player can ride the funicular down by placing the minecart at the top and letting it coast down with boosts.

### 5.8 The view from the city

Looking north from the city, the player sees:
- The **continuous mountain** rising 800 blocks above the city, with a single dominant peak at center.
- The **granite cap** (the upper third) in pink-grey, with snow at the very top, antenna arrays on the ridgeline, and the funicular station at the summit.
- The **limestone body** (the lower two-thirds) in cream-grey, with horizontal bedding planes visible, oak/birch forest on the slopes, and the SubTropolis horizontal portal at the contact elevation (Y = 100) on the south face.
- The **contact ring** at Y = 100, visible as a horizontal stripe on the mountain face.
- The **forest** in dark green, transitioning sharply at the contact from oak/birch (limestone) to spruce/dark-oak (granite).
- The **sky** above the peak, with distant clouds.

This is the *single most iconic view* in the build. The view is what the visitor sees on arrival, and what they see again from the granite summit on the return.

---

## 6. The Composite Terrane Plaque (the Telling Detail)

The composite terrane plaque is the build's Telling Detail — the single block of the build that makes the premise *honest*. In the no-ravine design, the plaque is at the **service tunnel contact crossing** (not at a ravine bottom, which no longer exists). The plaque's location is preserved from the previous design's service-tunnel midpoint, which already had a geological moment at the contact.

### 6.1 Position

- **Location:** in the service tunnel at the contact crossing, in a 3×5 alcove carved into the upper (granite) wall of the 6×6 cross-section. The alcove is at the midpoint of the ~100-block tunnel, at the elevation of the horizontal contact (Y = 100).
- **Coordinates:** approximately (X = 0, Y = 100, Z = −400), depending on the exact path of the service tunnel. The alcove is on the *upper* (north, ceiling-side) wall so the player can see it as the minecart rides past — the alcove is *above* the player's eye level in the minecart, and the redstone lamp on the alcove ceiling illuminates the plaque.

### 6.2 Material

- **Plaque blocks:** a 1×2 carved-stone marker:
  - **Left block (limestone half):** chiseled calcite, representing the 270 Ma limestone below the contact.
  - **Right block (granite half):** chiseled stone brick (or chiseled polished diorite), representing the 1.08 Ga granite above the contact.
- **Breccia strip:** a 1-block-wide strip of mixed cobblestone + calcite on the floor of the 6×6 at the contact, 1 block tall and 6 blocks long. The breccia is the *visual* marker of the contact plane crossing the tunnel floor.
- **Alcove:** 3 blocks wide × 5 blocks deep × 3 blocks tall, carved into the upper (granite) wall. The alcove has a smooth-stone-slab floor, polished-diorite side walls and ceiling, and a single **redstone lamp** mounted on the alcove ceiling.
- **Signs (text):** 6–7 oak signs on the alcove wall (the back wall, opposite the tunnel), with black text on white background. The signs are stacked vertically, one per line.

### 6.3 Content (text on the plaque)

- **Line 1 (large):** "COMPOSITE TERRANE"
- **Line 2:** "The granite above this alcove is 1.08 Ga Pikes Peak granite."
- **Line 3:** "The limestone below is 270 Ma Bethany Falls limestone."
- **Line 4:** "They are in horizontal contact at this elevation, where"
- **Line 5:** "the granite pluton pushed up through the limestone."
- **Line 6:** "In real mountain ranges (the Alps, the Appalachians, Glacier National Park),"
- **Line 7:** "this is a common geological feature."

### 6.4 Why it matters

The plaque is the build's *Telling Detail* (per the soul document). The previous design required a "composite terrane plaque" to explain why two rocks 800 million years apart coexisted in one mountain — but the plaque had to do double duty as a *geological explanation* and a *narrative crutch* for an implausible ravine geology. In the no-ravine design, the plaque is *only* a geological explanation. The horizontal contact at Y = 100 is real geology (granite plutons push up through limestone in mountain ranges worldwide); the plaque is the *honest* explanation of a *real* feature, not a *workaround* for a *narrative* feature.

The plaque is the single block of the build where a curious player reads the text and *understands* what they are looking at. The single redstone lamp in the alcove makes the plaque readable in the dim tunnel light; the breccia strip on the floor makes the contact plane visible; the carved-stone plaque (1×2) makes the marker feel *permanent* and *geological*, not *casual*.

### 6.5 The Minecraft realization

- **Plaque blocks:** chiseled calcite + chiseled stone brick, placed side-by-side as a 1×2 marker on the alcove back wall.
- **Text:** 6–7 oak signs, stacked vertically, placed by the builder. The signs are the *text*; the chiseled blocks are the *visual marker*.
- **Breccia strip:** a 1-block-wide row of mixed cobblestone + calcite on the floor of the 6×6, running across the full 6-block width of the cross-section. The row is 1 block tall, so it is visible from the minecart as a stripe of mixed rock crossing the tunnel.
- **Alcove lighting:** a single redstone lamp on the alcove ceiling, so the plaque is readable at night and dimly visible by day.
- **Why not a sign block with the full text on one sign?** The previous design used 6 separate oak signs because the text is long and a single sign block is too small. The 6–7 signs stacked vertically is the same approach as a real-world interpretive plaque with multiple lines of text.

---

## 7. The 4-Layer Defense-in-Depth Cross-Section

The defense-in-depth layering is the *visual signature* of the combined complex. Four layers are traversed by the visitor's descent, and the cross-section is the build's architectural diagram.

### 7.1 The four layers

| Layer | Site | Rock | Depth (Y) | Era | Use | Feel |
|---|---|---|---|---|---|---|
| **1. Civilian surface** | City + above-ground | None (city above ground) | 0 to +80 | 1970s | Civilian, retail, workday | Hot, bright, busy, daylit |
| **2. Climate-controlled shallow** | Houston tunnel | None (city underground) | 0 to −6 | 1970s | Civilian, retail, workday | Beige tile, fluorescent, climate-controlled |
| **3. Industrial limestone** | SubTropolis | Limestone (270 Ma) | 0 to −100 | 1964 | Working, commercial, climate-stable | Lit, climate-controlled, road-networked, white pillars |
| **4. Military granite** | Cheyenne | Granite (1.08 Ga) | +100 to +800 (above contact) | 1966 | Military, contingency, 30 MT | Silent, deep, spring-isolated, climate-sealed, blast doors |

The **horizontal contact at Y = 100** is the geological *transition* between Layer 3 and Layer 4. The visitor crosses the contact in the service tunnel (mid-tunnel, at the contact crossing).

### 7.2 The visitor's descent — updated path

The visitor's path is the *single trajectory* through all four layers. In the no-ravine design, the path is:

1. **City surface (Layer 1, Y = 0 to +80):** hot, sunlit, daylit. The visitor arrives via the coastal-plain highway, walks into downtown, sees the T-marker signs, finds the public shaft entrance.
2. **Houston tunnel (Layer 2, Y = 0 to −6):** the 24-block sample, 6 blocks below street grade. Beige VCT tile, fluorescent 4000K light, channel-letter tenant signs. The visitor walks the sample, stops at the food court.
3. **Public shaft (Layer 3 entrance, Y = 0 to −100):** the 7×7 vertical descent through limestone. The visitor descends 100 blocks, pauses at the mid-landing observation landing at Y = −50, emerges at the SubTropolis lobby.
4. **SubTropolis (Layer 3, Y = 0 to −100):** the 200×200 chamber, with the white-painted limestone pillars, the channel-letter tenant signs, the central plaza. The visitor walks Hushpuckney Avenue past the Hunt Hall plaza, the NARA archival center, the USPS stamp fulfillment center, the LightEdge data center.
5. **SubTropolis sub-basement (Layer 3 to service tunnel, Y = −100):** the visitor descends (or drives) from the main chamber to the sub-basement at the NW corner, where the service tunnel begins.
6. **Service tunnel (Layer 3 → Layer 4, Y = −100 to +300):** the 6×6 ascending inclined minecart bore, 80–120 blocks long, climbing at a 4:1 gradient with powered rails every 4 blocks. The visitor rides the minecart up through the limestone, crosses the contact at Y = 100 (the Telling Detail moment, with the composite terrane plaque in its 3×5 alcove), continues up through the granite, and arrives at the Cheyenne outer portal at Y = +300.
7. **Cheyenne outer portal → J-curve → chamber (Layer 4, Y = +300 to +400):** the 25-ton blast door, the 800-block J-curve access tunnel, the chamber with the 1,319 springs, the 15 buildings, the Combat Operations Center.

The visitor's descent is now *vertical for the first half* (city → public shaft → SubTropolis, all going down), then *vertical and ascending for the second half* (service tunnel ascending from SubTropolis sub-basement up through the contact to Cheyenne chamber level). The 4:1 gradient ascent in the service tunnel is the *single moment of speed and climbing* in the build — the visitor is *rising* through the rock instead of just *descending* into it.

### 7.3 The cross-section diagram (textual)

A side-view cross-section through the world (X = 0, looking east), top to bottom:

```
Y = +800   [Granite peak, snow cap, antenna arrays, funicular station]
Y = +700   [Granite — spruce/dark-oak forest, snow line]
Y = +500   [Granite — treeline transition, exposed outcrops]
Y = +400   [Cheyenne chamber ceiling, polished diorite walls]
Y = +300   [Cheyenne outer portal, service tunnel terminus, blast door]
Y = +200   [J-curve side branch, concrete-lined]
Y = +100   *** HORIZONTAL CONTACT — 1.08 Ga granite / 270 Ma limestone ***
Y =    0   [City surface — stone brick, glass, quartz; SubTropolis ceiling (calcite)]
Y =   -6   [Houston tunnel — white concrete, white wool VCT, fluorescent]
Y =  -50   [Public shaft mid-landing observation room, G-Cans window]
Y = -100   [SubTropolis floor (smooth stone); service tunnel start]
Y = -110   [Bedrock buffer begins]
```

The visitor's path through the cross-section is: enter at Y = 0 (city surface) → descend to Y = −100 (SubTropolis) → ascend through Y = 100 (contact crossing) to Y = +300 (Cheyenne outer portal) → continue to Y = +400 (Cheyenne chamber). The path is *not* monotonic — it goes down, then *back up*, traversing all four layers in a single descent-ascent loop.

---

## 8. The City in the Valley — Updated

The city sits in a **wide flat valley at the mountain base**, not below a ravine. The mountain rises directly to the north of the city; the coastal plain extends to the south and east. The city is the *civilian anchor* of the build, the place where the build is bright, busy, and daylit.

### 8.1 City geometry

- **Position:** centered on the world origin (X = 0, Y = 0, Z = 0). The city is bounded by the mountain to the north (Z = −100 onward), the coastal plain to the south (Z = +70 onward) and east (X = +200 onward).
- **Footprint:** 144 × 96 blocks (per the 03-masterplan), oriented with the long axis east-west.
- **Street grade:** Y = 0.
- **Tallest tower:** Y = 80.

### 8.2 Above-ground features

- **4 named anchor towers:** Wells Fargo, JPMorgan Chase, Pennzoil Place, Esperson (matching the real Houston downtown). Each is ~60–80 blocks tall.
- **8–10 generic downtown towers:** mid-rise (30–50 blocks) and high-rise (50–70 blocks) buildings, glass-and-quartz, stone-brick, with windows.
- **2–3 parking garages:** mid-rise concrete structures, ~15–25 blocks tall, with parking markings.
- **Surface streets:** stone-brick roads in a grid pattern, sidewalks, streetlights (redstone lamp posts every 10–15 blocks).
- **Skybridges:** 4–6 glass-enclosed pedestrian skybridges spanning the streets at Y = 50–70, connecting adjacent towers.
- **T-marker signs:** the Houston tunnel visual signature — a red "T" on a white background at the curb entries. At least one T-marker must be at the city surface near the public shaft entrance (Easter egg #7, inherited from 03-masterplan).

### 8.3 Below-ground features (the Houston tunnel sample)

- **Depth:** Y = 0 to Y = −6 (6 blocks below street grade, matching the real Houston tunnel).
- **Footprint:** 24-block sample of the Houston tunnel network (per the 03-masterplan).
- **T-marker entries:** two direct street-level entries (Wells Fargo and McKinney Garage style), marked with the T-marker.
- **Materials:** white-concrete walls, white-wool VCT tile floor, fluorescent 4000K lighting. Beige tile, the "T-marker red" the only consistent color.
- **Tenant signage:** channel-letter signs in tenant brand colors (Wells Fargo red, JPMorgan blue, Hallmark gold, etc.).
- **Public shaft entrance buffer:** a 1-block buffer in the SE corner of the 24-block sample, where the public shaft descent begins.

### 8.4 The Combined Complex Transit Hub plaza

- **Position:** at the NE corner of the city, at (X = +60, Y = 0, Z = −70) — the city edge where the public shaft lands.
- **Footprint:** 20×20 block plaza, paved with stone brick and quartz accents.
- **Features:**
  - The 7×7 glass-and-steel public shaft entrance pavilion at the center of the plaza.
  - A T-marker sign at the curb.
  - A "SubTropolis — Public Access" sign on the pavilion.
  - A "Combined Complex — Helsinki + Switzerland + Colorado Springs" plaque near the pavilion (Easter egg referencing the three real-world precedents).
  - Benches, planters, a small fountain (for "public space" feel).
  - A 4-block-wide pedestrian connection from the plaza to the nearest Houston tunnel entry.

### 8.5 The mountain in the background

From the city, looking north, the visitor sees the **continuous mountain** rising 800 blocks above the city street level. The mountain is a single landform with two rock types, separated by a horizontal contact at Y = 100. The view is:

- The **granite cap** (upper third) in pink-grey, with snow at the summit, antenna arrays on the ridgeline, and the funicular station at the top.
- The **limestone body** (lower two-thirds) in cream-grey, with horizontal bedding planes visible, oak/birch forest on the lower slopes, and the SubTropolis horizontal portal at the contact elevation (Y = 100) on the south face — a small 4×5 opening in the limestone, with the pink contact band visible directly above it.
- The **contact ring** at Y = 100, visible as a horizontal stripe on the mountain face.
- The **forest** in dark green, transitioning sharply at the contact from oak/birch (limestone) to spruce/dark-oak (granite).

The mountain dominates the city skyline. The city is *in the shadow* of the mountain — the civilian anchor is *under* the military fortress, and the descent is the message.

### 8.6 The switchback road up the south face

A 6-block-wide paved road switchbacks up the **south face of the mountain** from the city plaza (Y = 0) to the SubTropolis horizontal portal (Y = 100). 6 switchbacks over 100 blocks of elevation, each switchback a 20-block horizontal traverse on a 5-block-wide shelf cut into the limestone slope. The road is the *vehicle* connection from the city to the SubTropolis (the public shaft is the *pedestrian* connection; the road is for trucks, vans, and SubTropolis employee vehicles).

- **Surface:** asphalt (the road), with 1-block-wide oak-plank sidewalks on the outer edge.
- **Handrails:** oak fence, 1-block-tall, on the outer edge of the road.
- **Sign at the bottom:** "RAVINE TRAIL — SubTropolis Horizontal Portal / 1.5 km, ~20 min walk." (The "ravine trail" sign name is preserved as a historical label, even though the ravine is gone — the trail is now the "subtropolis access road.")
- **The destination:** the SubTropolis horizontal portal at the top (see §5.5).

---

## 9. The Coastal Plain

The coastal plain is the **edge of the world** — the flat, sparse, sun-bleached grassland that the visitor sees when they look south or east from the city. The plain is the *you've reached the edge of the build* feel, the place where the world thins out and the build ends.

### 9.1 Plain geometry

- **Footprint:** Z = +70 to +700 (the south of the city to the south edge of the world), with a wraparound to the east (X = +200 to +750, Z = −200 to +700).
- **Surface:** flat grass (or coarse dirt) with sparse trees (oak, birch, occasional spruce), tall grass, ferns. No structures.
- **Elevation:** Y = 0 to Y = 5 (a slight rise to the south, then flat).
- **Reference:** real Houston coastal plain, or a generic US Gulf Coast landscape.

### 9.2 Features

- **A small river or lake:** at the east end of the plain, where a small stream flows (the "ravine stream" of the previous design is now just a small spring on the east side of the mountain, since there is no ravine to drain). The stream is a 1-block-wide water feature flowing east from the mountain base into the plain.
- **A coastal-plain highway:** a stone-brick road from the city south edge (Z = +70) to the world edge (Z = +700), with the visitor's arrival point.
- **Sparse settlement:** maybe 1–2 small structures (a gas station, a diner) at the city edge, but no downtown density.
- **A small pier or dock:** at the south edge of the world (Z = +700), marking the literal "edge of the build" — a wooden dock extending into the void, with a sign reading "End of the world — turn back."

---

## 10. The Return Route — Updated

The return route is **funicular + road**, with **no skybridge** (the skybridge was a ravine-spanning object and is no longer needed). The return is the *surface route*, the *resolution* of the journey, the moment the visitor sees the scale of the whole world from above.

### 10.1 The two stages

**Stage 1: Funicular ascent (Cheyenne outer portal → granite summit).**
- **From:** (X = 0, Y = +300, Z = −500) — the Cheyenne outer portal.
- **To:** (X = 0, Y = +800, Z = −550) — the granite summit.
- **Length:** ~830 blocks along the funicular rail (lateral + vertical).
- **Elevation gain:** 500 blocks (from Y = +300 to Y = +800).
- **Mode:** funicular rail (1-block gauge, single track, powered rail every 4 blocks for the climb).
- **Time:** ~5–7 minutes of in-game travel (the player rides the minecart with chest down from the summit, or up from the outer portal).
- **Why this works:** the funicular is the *Swiss Alpine* solution to a steep mountain face. It is visually consistent with the rail theme (the service tunnel is also rail), and it is the *one moment of speed and ascent* on the return — the mirror image of the service tunnel's climb on the inbound.

**Stage 2: Paved road descent (granite summit → city).**
- **From:** (X = 0, Y = +800, Z = −550) — the granite summit.
- **To:** (X = 0, Y = 0, Z = 0) — the city center (Combined Complex Transit Hub plaza).
- **Length:** ~600 blocks along the paved road.
- **Elevation loss:** 800 blocks (from Y = +800 to Y = 0).
- **Mode:** paved road (asphalt, 6 blocks wide), switchbacking down the south face of the mountain.
- **Time:** ~6–8 minutes of in-game travel (walking or minecart with chest).
- **Why this works:** the road is the *long, slow* return. The visitor walks (or rides) down the south face of the mountain, passes the contact ring at Y = 100, passes the SubTropolis horizontal portal, and arrives at the city plaza. The road is the *gradual* resolution of the journey.

### 10.2 The return experience

The return route is the *narrative resolution* of the build. The visitor:

1. **Exits the Cheyenne chamber** via the J-curve, the outer portal, and the blast door.
2. **Boards the funicular** at the Cheyenne outer portal (Y = +300). The funicular rail climbs 500 blocks to the granite summit. The visitor sees the mountain face falling away below, the city in the distance, the coastal plain beyond.
3. **Arrives at the granite summit** (Y = +800). The first glimpse of the whole world from above — the city, the mountain, the contact ring, the coastal plain, all visible at once. The "Three Sites, One Mountain" sign and the rock identification chart are here. The visitor pauses, looks, and *understands* what they have just traversed.
4. **Walks (or rides) down the paved road** from the summit to the city. The road switchbacks down the south face of the mountain, passing the contact ring at Y = 100 (the visible geology, the *complement* to the contact crossing in the service tunnel), the SubTropolis horizontal portal (the *other* entry to the underground, visible from above), and the limestone body of the mountain (the *lower two-thirds* of the world).
5. **Arrives at the Combined Complex Transit Hub plaza** in the city. The visitor is back at the start. The journey is complete.

**Total return time:** ~13 minutes. The dramatic arc resolves: civilian (city) → climate-controlled civilian (Houston tunnel) → mixed civilian/industrial (public shaft) → industrial (SubTropolis) → service (sub→Cheyenne tunnel) → military (Cheyenne chamber) → civilian surface return (funicular + road). The arc resolves back to civilian on the surface, completing the defense-in-depth cycle.

### 10.3 What we lost (and what we kept)

**What we lost by dropping the skybridge:** the skybridge was a ravine-spanning object — it crossed the V-shaped ravine at the upper elevation, connecting the granite summit to the limestone summit. In the no-ravine design, there is no ravine to span, and the two summits are no longer distinct (the mountain is one continuous landform, with the granite cap as the single summit). The skybridge is *not* needed; the funicular + road is a cleaner two-mode return.

**What we kept:** the funicular (the *Swiss Alpine* solution to a steep ascent) and the *first glimpse of the world from the granite summit* (the narrative resolution of the journey). The funicular is the *one moment of speed and ascent* on the return; the road is the *gradual descent* back to the city. Together, they are the *mirror image* of the inbound: the inbound was a *descent through the rock* (city → SubTropolis → service tunnel → Cheyenne); the return is a *descent through the air* (funicular up to the summit, then road down to the city).

---

## 11. Lighting Plan — Updated

The lighting plan is by zone, with the *vertical descent* feel preserved in the service tunnel as the visitor moves from limestone (lower) to granite (upper).

### 11.1 Above-ground city (Layer 1)

- **Light level:** 15 (full daylight).
- **Light sources:** the sun (Minecraft's natural day-night cycle), plus redstone lamp streetlights every 10–15 blocks along the streets.
- **Sound:** ambient city; the city is the *anterior*, the public world.
- **What the player looks at:** the sky, the towers, the T-marker at the curb, the skybridges, the mountain in the background.

### 11.2 Public shaft (Layer 3 entrance, Y = 0 to −100)

- **Light level:** 12 throughout (redstone lamp every 8 blocks).
- **Light sources:** redstone lamp wall mounts (every 8 blocks on the shaft wall), plus the glass window at the mid-landing (which lets in dim light from the utility corridor beyond), plus the natural light at the surface pavilion (Y = 0 to −3) and the lobby (Y = −100, where the SubTropolis fluorescent light spills in).
- **Reflected color shift:** from cool blue-grey (gray concrete walls at the top) to warm cream (calcite walls at the bottom). The light level is constant; the *color* of the reflected light changes.
- **Sound:** the mechanical hum of the lift; the *echo* of the shaft; the *hiss* of the utility corridor at the mid-landing.

### 11.3 SubTropolis (Layer 3, Y = 0 to −100)

- **Light level:** 12 (fluorescent, industrial white).
- **Light sources:** sea lantern (the fluorescent analogue) every 12 blocks on the chamber ceiling, plus the channel-letter tenant signs (backlit, the *brand* lights).
- **Sound:** HVAC hiss, forklift motors, the echo of the chamber, occasional truck horns.
- **What the player looks at:** the pillars, the signs, the trucks, the plaza, the food court, the tenant fit-outs.

### 11.4 Service tunnel (Layer 3 → Layer 4, Y = −100 to +300)

- **Light level:** 10 in the limestone section, 8 at the contact crossing, 10 in the granite section, 8 at the Cheyenne outer portal. The contact crossing is the *dimmest* point in the tunnel — the *geological* highlight, and dim lighting makes it feel *deep*.
- **Light sources:** redstone lamp every 8 blocks along the tunnel, plus the single redstone lamp on the alcove ceiling at the contact crossing.
- **Reflected color shift:** from cream-tinted (limestone) at the start to pink-tinted (granite) at the end. The light level is roughly constant; the *color* changes at the contact.
- **Sound:** the wheels-on-rail of the minecart; the *hiss* of the utility strip; the *echo* of the tunnel; the *clack* of the powered-rail boost.

### 11.5 Cheyenne (Layer 4, Y = +250 to +800)

- **Light level:** 12 in the J-curve (fluorescent), 10 in the chamber (dimmer, the *deep* feel), 8 in the side branches (the rough-hewn stage).
- **Light sources:** sea lantern in the J-curve, redstone lamp in the chamber (dimmer, the *climate-sealed* feel), a single redstone lamp in the outer portal corridor.
- **Sound:** HVAC hiss in the J-curve, the *dead air* silence of the chamber, the *hiss* of the blast door's pressure seal.
- **What the player looks at:** the springs, the buildings, the Combat Operations Center, the Granite Inn bar.

### 11.6 The "vertical descent" feel in the service tunnel

The service tunnel is the *one place* in the build where the lighting and the *rock type* change visibly mid-journey. The minecart ride starts in cream-tinted fluorescent light on cream limestone walls; the contact crossing dims to 8 and the walls visibly transition; the granite section has pink-tinted fluorescent light on pink granite walls. The visitor *feels* the geology change through the lighting, even without reading the plaque.

The "vertical descent" feel is also reinforced by the *upward* motion of the minecart — the player is rising through the rock, and the lighting/color shift is the visual confirmation that the rock is changing.

---

## 12. Easter Eggs (Combined-Complex-Specific) — Updated

The no-ravine design preserves all 9 easter eggs. The composite terrane plaque (easter egg #1) is at the service tunnel contact crossing (its location from the previous design's service-tunnel midpoint). The "ravine bottom plaque specific placement" is removed (there is no ravine bottom), but the plaque itself survives in its service-tunnel location. All other easter eggs are unchanged.

### 12.1 The 9 easter eggs

1. **Composite terrane plaque** (Centerpiece #3 + Easter Egg #1) — in the service tunnel at the contact crossing, in a 3×5 alcove carved into the upper (granite) wall. 1×2 carved-stone plaque (chiseled calcite + chiseled stone brick), lit by a single redstone lamp, with 6–7 oak signs of geological text. See §6 for the full spec.
2. **"Three Sites, One Mountain" sign** (Easter Egg #2) — at the granite summit (Y = 800), visible from the funicular arrival. 3×3 oak sign panel on a 1-block stone brick pedestal. Text: "Cheyenne Mountain (Colorado Springs) — Granite, upper elevation / SubTropolis (Kansas City) — Limestone, lower elevation / Houston Tunnels — City in the valley / Combined by horizontal contact at Y=100, connected by service tunnel."
3. **"Service Tunnel — Inspired by the Gotthard Base Tunnel"** (Easter Egg #3) — at the SubTropolis end of the service tunnel. A subtle "SBB CFF FFS" carving on a 1-block chiseled calcite block at the gate frame, plus a 1-line oak sign reading "Service Tunnel — Inspired by the Gotthard Base Tunnel, 57 km, opened 2016."
4. **"Public Shaft — Inspired by the Helsinki Underground Master Plan"** (Easter Egg #4) — at the bottom of the public shaft, in the SubTropolis lobby. A 1-line oak sign reading "HELSINKI 5,500 — the number of civil-defense shelters in Helsinki, the inspiration for this dual-use shaft."
5. **"World's Largest Underground Business Complex"** (Easter Egg #5) — at the SubTropolis horizontal portal on the south face of the mountain, below the main "Hunt Midwest SubTropolis" sign. The real SubTropolis trademark; honest reference.
6. **"U.S. Space Force — Authorized Personnel Only"** (Easter Egg #6) — at the Cheyenne outer portal, on the granite face of the mountain, just before the blast door. The real Cheyenne security signage.
7. **Houston T-marker** (Easter Egg #7, inherited from 03-masterplan) — at the two direct street-level tunnel entries (Wells Fargo and McKinney Garage) and at the public shaft entrance. The visual signature of the world's civilian underground.
8. **Thrust-fault breccia strip** (Easter Egg #8) — in the service tunnel at the contact crossing, a 1-block-wide strip of mixed cobblestone + calcite on the floor, 1 block tall and 6 blocks long, running across the full cross-section. Subtle, walkable (rideable), geologically honest. Also visible as a 1-block transition band at the surface contact ring at Y = 100.
9. **Rock identification chart** (Easter Egg #9) — at the granite summit, near the "Three Sites" sign. 3-block display with item frames on three blocks: a sample of polished diorite (Pikes Peak granite, 1.08 Ga), a sample of smooth stone (Bethany Falls limestone, 270 Ma), and a sample of cobblestone + calcite (thrust-fault breccia). For the curious player.

### 12.2 What was removed

- **The "ravine bottom plaque specific placement"** — the 1×2 carved-stone plaque that was at the bottom of the V-shaped ravine in the previous design is removed. There is no ravine in the no-ravine design. The composite terrane plaque (easter egg #1) survives at the service tunnel contact crossing, where it lives in both the previous and current designs.
- **The thrust-fault breccia strip in the ravine floor paving** — a 1-block strip of mixed granite-and-limestone rubble at the contact crossing in the ravine floor, from the previous design. This is removed. The breccia strip in the *service tunnel* floor (easter egg #8) survives, in a slightly different form (1 block tall instead of 1 block wide, since the tunnel is ascending rather than flat).

### 12.3 What was added

- **The contact ring at the surface (Y = 100)** — a 1–2-block transition band ringing the mountain at the contact elevation, visible from the city. This is *not* a new easter egg; it is a *passive visual feature* that complements easter egg #8 (the breccia strip in the service tunnel) and easter egg #1 (the composite terrane plaque). A single oak sign at the contact ring reads "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma."

### 12.4 Cultural touchstones (preserved)

The 9 easter eggs preserve the build's cultural touchstones:
- **The Gotthard precedent** (Easter egg #3) — Switzerland's single mountain hosting military, civilian-repurposed, and civilian-transit functions.
- **The Helsinki shelter network** (Easter egg #4) — Finland's 5,500 shelters for 1 million people, the model for the dual-use public shaft.
- **The COG mythology** (Easter egg #6) — the U.S. Space Force signage at the Cheyenne outer portal, the iconic American COG facility.
- **The composite terrane** (Easter egg #1) — the geological signature of the build, the horizontal contact at Y = 100.
- **The 1960s American underground** (Easter eggs #5, #6) — the era of American confidence in the possibility of the underground.
- **The movie vault** (deferred to v3.0) — SubTropolis stores the master film elements of *The Wizard of Oz* and *Gone With the Wind*; the reference is preserved as a future extension.

### 12.5 Deferred to v2/v3

- **Hidden rooms, NPCs, mushroom farm** (deferred to v3.0 per Decision 7) — not in v1 scope.
- **The 1980 false alarm equivalent** (deferred) — a reference to the 1980 NORAD computer glitch that falsely indicated a Soviet missile attack; could be a small sign in the Cheyenne chamber, but not in v1 scope.
- **Sandra Lord, the Houston "Tunnel Lady"** (deferred) — a small plaque near one of the T-marker entrances; the Houston tunnels are a *place*, and they have a person.

---

## 13. Summary of the No-Ravine Design

The no-ravine design is **simpler, more honest, and more buildable** than the ravine-era design. The build's premise — a continuous mountain with two rock types separated by a horizontal contact — is *real geology*, not narrative fiction. The composite terrane plaque is the *honest explanation* of a *real feature*, not a *workaround* for a *narrative* feature. The service tunnel is an *ascending inclined minecart bore* through the contact, not a *flat horizontal tunnel* under a ravine — the minecart ride is the *one moment of speed and ascent* in the build, the mirror image of the public shaft's vertical descent. The return route is *funicular + road*, the *Swiss Alpine* solution to a steep mountain face. The 4-layer defense-in-depth cross-section is preserved; the 6 centerpieces are preserved; the 9 easter eggs are preserved. The build is *one Minecraft world that holds the entire history of American underground infrastructure in a single descent* — and the descent is now *up and down*, not just *down*.
