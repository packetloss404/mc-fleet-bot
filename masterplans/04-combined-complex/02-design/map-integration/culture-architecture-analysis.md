# Culture & Architecture Analysis — The Map Integration

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex, Map Integration (5th deliverable)
**Author:** Culture & Architecture Specialist
**Status:** Cultural/architectural identity for the downstream Map Integration design team
**Companion to:** `01-research/map-integration/research-report.md` and `01-research/map-integration/references.md`
**Sibling deliverable:** `02-design/culture-architecture-analysis.md` (the *Combined Complex* culture analysis — this document is its map-integration companion, not a replacement)

> **Authority notice.** This is cultural history for the retired separate-world/duplicate-Old-Town placement scheme. It is non-geometric and non-executable. See [../../AUTHORITY.md](../../AUTHORITY.md) and Masterplan 05 for the current plan.

> **Scope.** This document is the *soul of the map integration* — how the new 1,500×1,500 Combined Complex world (Cheyenne + SubTropolis + Houston Tunnel) sits inside the existing `D:\projects\mc-fleet-bot\` workspace, how the existing 113 schematics and the live bot world become the *historical layer* of the new world, and how a visitor moves between old and new. It is not a build plan. The geometry, the block count, the placement coordinates, the cluster sizes, the rail-spur alignment, and the construction sequence live downstream. This document names the *feel*, the *stories*, and the *cultural touchstones* that the design team must protect when they build it.

---

## 1. The Soul

You stand in a small surface base — a 200×200 block patch of cleared forest with six furnaces, four chests, a starter cobblestone path, and a couple of friendly little houses named `Cute house.schem`. A portal frame stands at the edge of camp, made of mossy cobblestone and oak fence, with a sign: **GATEWAY TO THE COMBINED COMPLEX**. You step through. The screen fades. You are standing on a stone-brick platform under a wooden shelter, with a sign that reads: **YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER**. In front of you, a paved road runs north for 425 blocks toward a skyline you cannot yet see. On either side of the road, the *old town* — a forest of small houses, a castle on a low hill to the east, a Japanese pagoda on a low hill to the west, statues lining the main road, a giant theme-park Space Mountain replica as the tourist attraction, a small wooden structure half-buried in the coastal plain with a hand-painted sign that reads: **THIS IS THE ONLY UNDERGROUND BUILD IN THE EXISTING LIBRARY. THE COMBINED COMPLEX IS ITS DESCENDANT.** You walk. The small houses grow smaller. The road grows wider. At the 425-block mark, a stone-brick bridge crosses a stream and you step into the new city — 138 meters of sunlit downtown with skybridges and T-markers and Wells Fargo signage — and behind it, the mountain range, with the ravine's V-notch clearly visible. You take the lift down 100 blocks. You walk the 200×200 limestone grid. You take the minecart through the rock under the stream. You open three 25-ton blast doors. You arrive at a city hidden inside a mountain. **The single feeling: the existing bot world is the seed; the new combined complex is the flower. The old town is the petal the seed grew from. The visitor walks through both in a single Minecraft life, and the experience is *one world that knows its own history*.**

---

## 2. Cultural Identity

### 2.1 What the map integration means culturally

The map integration is **legacy-aware expansion**. The existing `D:\projects\mc-fleet-bot\` workspace is *not* a blank canvas — it is a lived-in world with 113 schematic files, 4 active bots, 9 historical bots, 6 unnamed markers, 2 placeholder "Mining Area" zones, 6 empty squads, and a 200×200 block surface base that the bots have been building in for months. The new combined complex is *not* built on top of that world; the new combined complex is built *next to* that world, in a fresh 1,500×1,500 world whose origin is co-located so the legacy can be referenced, copy-pasted, and re-incorporated. The result is a world that *knows its own history* — the old town is the existing schematic library, the Grand Avenue is the literal path the visitor walks to reach the new development, the Gateway station is the literal portal between two worlds, and the data layer (the 6 markers, 6 squads, 2 zones) gets *re-purposed* in the new world so the placeholder names finally mean something.

This is a different cultural move than "place the new build somewhere convenient." The map integration argues that **a build is more meaningful when it acknowledges the work that came before it.** The existing schematic library is 113 surface builds, only one of which is underground. The combined complex is the *first* underground work of any scale in the workspace, and it sits in a world where the *only* underground structure is a 1,048-byte starter bunker that fits in a 5×5×3 block room. The map integration says: **that starter bunker is the root cellar of this city, and the city is its descendant.** The combined complex is the heir to the underground-base.schem the same way a 50-story skyscraper is the heir to a pioneer log cabin.

### 2.2 What stories the world tells

The map integration tells at least seven stories, in order from the visitor's first sight to the visitor's last:

- **The pioneer's story.** A bot — one of the CuteHouse1/2 builders, presumably — once placed the only underground structure in the entire workspace. It was a 5×5×3 wooden room. It had a chest and a crafting table. It is still there, in the existing world, in the data layer's memory, in the schematic library. The new combined complex is *that pioneer's city*, grown up.
- **The portal story.** A portal frame — the Gateway station — connects the small existing world to the vast new one. The portal is not a "magic door." It is a *threshold*, with a sign, a shelter, a bench, and a written book explaining the journey ahead. The portal is the *civic* connection between two worlds that the bot fleet has been building in parallel.
- **The old town's story.** 30–40 of the existing 113 schematics are re-placed in a 600×400 block area in the new world's coastal plain. The Cute houses are at the centre, on a small plaza, because the historical CuteHouse1/2 bots placed them. The castles are on a low hill to the east. The temples are on a low hill to the west. The statues line the main road. The Space Mountain is the old town's tourist attraction. The visitor walks through a town they have *already seen* — every building is recognisable from the schematic library — but now it is *coherent*. The old town is the schematic library made into a place.
- **The journey story.** The Grand Avenue is the 425-block walk from the old town to the new city. The walk is *intentional*. The visitor leaves the small houses behind. The road widens. The scale changes. At the 425-block mark, a stone-brick bridge crosses a stream — the same stream that flows at the bottom of the new city's ravine — and the visitor steps into the new city. The bridge is the *civic* crossing from old to new.
- **The freight story.** A 700-block rail spur runs from the existing bot base (in the existing world) to the new city's south edge (in the new world). It is 3 blocks wide (1 rail + 1 walkway + 1 utility), with powered rail every 8 blocks, and stations at each end. The rail is the *logistics* layer. The freight is the bot fleet's continued work: oak logs, cobblestone, iron, the materials the bots mine. The new world does not displace the old world; the new world is *supplied by* the old world.
- **The data-layer story.** The 6 unnamed markers, 6 empty squads, and 2 placeholder "Mining Area" zones in the existing data layer are *re-purposed* in the new world:
  - The 6 markers become 6 named anchors: `mkr_city_center`, `mkr_public_shaft_top`, `mkr_subtropolis_chamber_center`, `mkr_service_tunnel_contact_crossing`, `mkr_cheyenne_outer_portal`, `mkr_old_town_center`.
  - The 2 "Mining Area" zones become the *real* SubTropolis chamber and the *real* Cheyenne chamber. The placeholder names finally mean what they have always suggested.
  - The 6 empty squads become 6 named squads with real jobs: outer-portal guard, chamber patrol, public-shaft operator, service-tunnel maintenance, old-town ranger, service-tunnel-response.
  - The old data layer is a *blueprint* for the new world's organisation, not just placeholder noise.
- **The two-bot-fleets story.** The 4 active bots (Lilly, Taylor, Marcus, Hazel) and the 9 historical bots (sloth, badbitch, CuteHouse1, CuteHouse2, Packet1, Packet2, Packet3, Builder1, Builder2, Builder5) are the *operators* of both worlds. The active bots are the only humans in the old world. The new world's signage credits them by name: "First surveyed by Lilly, Taylor, Marcus, Hazel, 2026." The bots are not "NPCs in the new world" — they are the *continuing inhabitants* of a world the project has been building for months. The old town has the bots' names on its founding plaques.

### 2.3 The gap between public perception and reality

- **The user might think "place the build somewhere."** The reality is "build a new world that incorporates the old." The map integration does not *retro-fit* the new combined complex into the existing Minecraft world; the new combined complex is its own 1,500×1,500 world, with the existing schematic library re-placed as the *old town* of the new world, and the existing bot base left intact in the existing world as the *origin* of the rail spur. The visitor passes *through* the portal to experience the new world. The portal is the *connection*, not the placement.
- **The user might think "use the existing surface area."** The reality is that the existing surface area is a 200×200 block starter base in a vanilla-height (384) world. The new combined complex requires a 1,024+ build height (CubicWorld mod), an 800-block-tall mountain range, a 200-block-deep ravine, and a 1,500×1,500 footprint. The existing surface area is *insufficient* to host the new master plan. The new world is built fresh; the old world is preserved and *referenced*.
- **The user might think "the existing schematics become the new city's residential blocks."** The reality is more interesting: the existing schematics become the *old town*, a separate district in the new world's coastal plain, south of the new city. The new city is the *commitment* to 1:1 scale and 1-block-equals-1-meter design rigor; the old town is the *legacy* of the schematic library's heterogeneous scales. The two are visually distinct, and the visual distinction is *thematic*: the new city is the future, the old town is the past.
- **The user might think "the bot fleet relocates to the new world."** The reality is that the bot fleet stays in the existing world. The new world is for *visitors* — the humans and bots who step through the portal. The existing bot base is the *origin* of the rail spur. The new world has *its own* logic (the named markers, the named squads, the real zones), but the operators of the new world's supply chain are still the existing bot fleet, in the existing world, running their old missions.
- **The user might think "the underground-base.schem is the *first* underground build in the workspace."** The reality is that it is the *only* underground build in the entire 113-file schematic library. It is 1,048 bytes — the same size as a small surface house. The combined complex is not the *second* underground build; it is the *first* underground build of any scale, and the underground-base.schem is its *ancestor*. The new build is *not* "bigger than the old one." The new build is "the only descendant of a 5×5 wooden room that the workspace has ever known."

### 2.4 Cultural touchstones and Easter eggs

- **The underground-base.schem as the *root cellar*.** The single 1,048-byte underground build, placed in the new world's coastal plain, half-buried in the dirt, with a hand-painted sign explaining its provenance. The root cellar is the *origin myth* of the combined complex: "This is the only underground build in the existing library. The Combined Complex is its descendant." The root cellar is the *thematic* connection between the existing schematic library and the new master plan.
- **The Cute houses as the *historical anchor*.** The 1–2 Cute houses that the historical CuteHouse1/2 bots placed in the existing world are re-placed at the *centre* of the new world's old town, on a small plaza. The plaza is the old town's *founding* square. The Cute houses are the old town's *signature* building, the way the Space Mountain is the old town's *tourist attraction*.
- **The 4 active bots as the *original explorers*.** Lilly, Taylor, Marcus, Hazel. The Gateway station's sign credits them by name: "The Combined Complex was first surveyed by Lilly, Taylor, Marcus, and Hazel of the mc-fleet-bot fleet, 2026." The historical CuteHouse1/2 and Builder1/2/5 bots get their own small monument in the old town.
- **The Disneyland Space Mountain as the *tourist attraction*.** The 58 KB theme-park build is the *largest* surface build in the schematic library, and it is placed in the old town as the *tourist attraction*. The Space Mountain is the old town's *Disneyland* — the place visitors go to *see*. The placement is intentional: the largest existing schematic is the most *public* structure in the old town.
- **The walk_to_coords(100, 64, 200) as a *fulfilled prophecy*.** The lone substantive command in the existing data layer was a 2026-03-23 plan to walk Lilly to (100, 64, 200). The command was never followed up. The map integration *fulfills* the command: the new world has a city hub at (0, 0, 0), and a 700-block rail spur runs from the existing bot base to the new city. The command is the *first evidence* in the data layer that someone was already planning for a build beyond the starter base. The map integration says: *we heard you, Lilly, and we built it.*
- **The "Mining Area" placeholder zones as *fulfilled names*.** Two zones in `data/zones.json` are named "Mining Area" but have no spatial coordinates. They are *names without substance*. In the new world, the SubTropolis chamber is *officially* a "Mining Area" — the chamber is a real room-and-pillar limestone mine. The placeholder names *become* real.
- **The empty squads as *fulfilled roles*.** Six empty squads in `data/squads.json` get *real* jobs in the new world: `sqd_che_outer_portal_guard`, `sqd_sub_chamber_patrol`, `sqd_pub_shaft_operator`, `sqd_svc_tunnel_maintenance`, `sqd_old_town_ranger`, `sqd_service_tunnel_response`. The empty squads *become* the operating crews of the new world.
- **The placeholder markers as *real anchors*.** Six unnamed markers in `data/markers.json` become six named anchors in the new world. The empty markers *become* the coordinate system.
- **The schematics' "mojibake" filenames as *aesthetic* texture.** The `Pokémon Temple Arena.schem` filename is mojibake-encoded. The `sam-cottage.schem` is 245 bytes, the smallest in the library. The schematic library is *uneven* — file sizes range from 245 to 63,492 bytes, a 260× range. The old town is *visibly* heterogeneous: a 245-byte cottage next to a 38 KB Cute house next to a 58 KB Space Mountain. The heterogeneity is *thematic*: the old town is the legacy of a 113-file library assembled from many sources, and the visitor can *see* the legacy in the uneven rooflines.

---

## 3. Architectural Identity

### 3.1 What the map integration architecture *says*

The map integration architecture says: **a world is more meaningful when it knows what came before it.** The new 1,500×1,500 combined complex is not built in a vacuum; it is built in a workspace that already has 113 schematic files, a live bot world, a data layer with 22 JSON files, and a history of bot activity dating back months. The new world is *built to acknowledge* that history, by re-placing the existing schematics as the old town, by re-purposing the data layer as the new world's coordinate system, by crediting the existing bot fleet on the Gateway station's sign, and by leaving the existing bot base intact as the *origin* of the rail spur. The build is *legacy-aware* in a way that no single-site master plan can be.

The *meta-architecture* — the architecture of an *integrated* world — is **layered time.** The visitor moves through layers of time as they move through the world:

| Time layer | What the visitor sees | Where it is |
|---|---|---|
| **The deep past** | The granite (1.08 Ga) and the limestone (270 Ma) | The mountain range, the contact crossing in the service tunnel |
| **The mid past** | The underground-base.schem, the Cute houses, the existing bot base | The root cellar, the old town centre, the existing world |
| **The recent past** | The Space Mountain, the castles, the temples | The old town's surrounding low hills |
| **The present** | The new city, the Grand Avenue, the rail spur | The coastal plain's north end |
| **The deep present** | The public shaft, the SubTropolis chamber, the service tunnel, the Cheyenne chamber | The mountain's interior |

The visitor moves through these layers in order: existing world (mid past) → portal → old town (mid past + recent past) → Grand Avenue (present) → new city (present) → public shaft (deep present) → SubTropolis (deep present) → service tunnel (deep present) → Cheyenne (deep present). The build's architecture is *the layering* and the *transition between layers*.

### 3.2 The old town as the *historical layer*

The old town is the **30–40 selected schematics re-placed in a 600×400 block area in the new world's coastal plain**, centered at (0, 0, 500). The old town is not a "model village" or a "sample pack display." The old town is the *historical district* of the new world. The old town is:

- *Visually heterogeneous.* The 30–40 schematics are at their *native* scales, not normalized. A 245-byte cottage sits next to a 38 KB Cute house next to a 58 KB Space Mountain. The heterogeneity is the *point* — the old town is a *palimpsest* of the schematic library's sources, and the uneven rooflines are the *honest* record of a library assembled over time.
- *Clustered by type.* Seven clusters: residential (~20 small houses), castle/fortress (~3 builds), temple (~3 builds), statue/ornament (~10 builds along the main road), theme-park feature (the Space Mountain), the underground easter egg (the root cellar), and the Cute house anchor (at the centre).
- *Walkable, not just viewable.* The 425-block Grand Avenue runs through the old town's main road, with the statues lining it. The visitor *walks through* the old town, not around it. The Cute house plaza is at the southern entry of the Grand Avenue. The Space Mountain is visible from the new city, miles away.
- *Themed to its location.* The coastal plain is *flat* — a 600×400 rectangle of cleared grass, with the new city to the north, the rail spur to the south, and the existing bot base 700 blocks further south (in the existing world). The old town is *the only* major surface feature in the new world's south; it is the *first thing* a visitor sees when they step off the rail spur from the existing world.

### 3.3 The Grand Avenue as the *connection*

The Grand Avenue is a **4-block-wide stone-brick road, lined with 1-block sidewalks and 1-block planters, running 425 blocks from the old town centre to the new city's SE corner**. The Grand Avenue is not a "highway" or an "avenue" in the Houston-tunnel sense. The Grand Avenue is the *civic spine* of the new world — the road the visitor *walks* (or drives in a minecart) to get from the old town to the new city.

The Grand Avenue's design language is *civic, not industrial*:

- **Surface:** stone brick (matching the new city's surface palette).
- **Sidewalks:** smooth stone, raised 1 block above the road.
- **Planters:** oak fence every 8 blocks, with a torch or a small statue.
- **Statues:** the 10 statue/ornament schematics (snowman, teddy-bear, macaw-statue, dragon-egg, etc.) are placed *along* the Grand Avenue, not in the old town's residential blocks. The statues are the *civic ornaments* of the new world.
- **Crossing at the 425-block mark:** a 3-block-wide stone-brick bridge over the stream that flows from the new city's ravine. The bridge is the *transition* from old town to new city.
- **The only paved road in the new world.** Everything else in the new world (the old town's internal roads, the rail spur, the city's streets) is dirt, cobblestone, or rail. The Grand Avenue is the *one* paved surface — the road that *commits* to scale, that says *this is the new world, and the new world is committed*.

### 3.4 The Gateway station as the *portkey*

The Gateway station is **a small 7×7 platform with a rail line terminating at it, a portal frame, a sign, a bench, and a written book, built in the existing world near the existing bot base**. The Gateway station is the *last surface point in the existing world*; everything beyond it is the new world.

The Gateway station's design language is *portkey, not portal*:

- **Material:** mossy cobblestone and oak fence (matching the existing bot base's "starter" aesthetic).
- **Portal frame:** 4×5 block opening filled with a portal (or, in a non-portal implementation, a `/tp` command block). The portal frame is *not* an end-portal frame; it is a *bespoke* portal frame, made of mossy cobblestone, with a sign above it.
- **Sign:** "GATEWAY TO THE COMBINED COMPLEX" in large oak-sign text.
- **Shelter:** a 7×7 wooden platform with a bench, a torch, and a written book titled "A Visitor's Guide to the Combined Complex." The book explains the 6-stage journey (city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne) and credits the 4 active bots as the original explorers.
- **Rail line terminating at the platform:** the coastal-plain rail spur ends at the Gateway station. The visitor can take the rail spur *to* the new world, or they can walk through the portal directly. Both are valid.

The Gateway station is the *portkey* of the map integration: the single object that, by existing, *makes the two worlds one experience*. Without the Gateway station, the two worlds are separate. With the Gateway station, the two worlds are *connected* by a single, intentional, civic object.

### 3.5 The coastal-plain rail spur as the *logistics layer*

The coastal-plain rail spur is **a 1-block-gauge rail line, 3 blocks wide total (1 rail + 1 walkway + 1 utility strip), running ~700 blocks from the existing bot base (in the existing world) to the new city's south edge (in the new world)**, with powered rail every 8 blocks and stations at each end. The rail spur is the *freight* connection — the bot fleet's continued supply chain.

The rail spur's design language is *logistics, not civic*:

- **Surface:** powered rail (every 8 blocks) on wooden sleepers, with a 1-block dirt walkway alongside.
- **Utility strip:** a 1-block-wide trench on the far side, holding a chest minecart (for freight), a powered-rail activator, and a redstone repeater every 16 blocks. The utility strip is the *freight* channel.
- **Stations:** the existing bot base has a small "Freight Station" platform; the new world's edge has a matching "Arrival Platform" with a sign listing the cities served.
- **Crossing the world boundary:** the rail spur is interrupted at the world boundary. The existing world's last rail block is at the Gateway station; the new world's first rail block is at the Arrival Platform. The visitor dismounts at the Gateway station, walks through the portal, and remounts at the Arrival Platform. The world boundary is the *one place* the rail spur is not continuous.

The rail spur is the *legacy-aware* infrastructure of the map integration: the new world is *supplied by* the old world, via a single freight channel. The bots in the old world continue to do what they have always done (mine, build, place chests); the new world receives the freight at the Arrival Platform and uses it for the new city's construction.

### 3.6 The new combined complex as the *new development*

The new combined complex is the **1,500×1,500×800-block Combined Complex world**, designed in masterplans 01–04, with the 4-layer defense-in-depth palette (civilian surface → climate-controlled shallow → industrial limestone → military granite) and the 6-stage inbound journey. The combined complex is the *destination*; the old town, the Grand Avenue, the Gateway station, and the rail spur are all *approach infrastructure*.

The combined complex's design language is *committed* — it is the only place in the new world where 1 block = 1 m is held rigorously. The 4-layer defense-in-depth palette is the combined complex's *signature*; the 6-stage inbound journey is the combined complex's *narrative*. The combined complex is the *new development*; everything else in the map integration is the *transition into the new development*.

### 3.7 The visitor's journey

The visitor's journey has **two origins** and **11 stages**, depending on which world they start in. The two origins are:

- **Origin 1: New World Spawn.** The visitor spawns in the new world, at the world origin (0, 0, 0) — the centre of the new city. They see the city skyline and the mountain range. They do not see the existing bot world. The map integration is invisible to them; they are *in* the new world, not *transitioning* to it.
- **Origin 2: Existing Bot World.** The visitor starts in the existing bot base, at (935, 60, 300) — a 200×200 surface patch in the existing world. They see the small base, the 4 active bots, the 1–2 Cute houses, and the Gateway station at the edge of camp. The map integration is *visible* to them; they must *walk* to the Gateway station, *step* through the portal, and *travel* the 425 blocks of the Grand Avenue to reach the new city.

The two origins are *not* equal. Origin 2 is the *full experience* — the visitor sees the existing world, the transition, and the new world. Origin 1 is the *fast path* — the visitor skips the transition and starts at the destination. The map integration supports both, but the *full experience* is the one the design team should optimise for.

---

## 4. Iconic Must-Haves (Ranked)

The following 12 features are the *most iconic* of the map integration — the features that, if a visitor has seen them, they will say *"this is the mc-fleet-bot Combined Complex, integrated with the existing schematic library and bot base"* and not *"this is some generic underground base."* Ranked by iconic-ness, with a one-line build spec for each.

1. **The Gateway station (the portal from old to new).** Why iconic: this is the *portkey* of the entire map integration. The single object that, by existing, *makes the two worlds one experience*. A small 7×7 platform in the existing world, near the existing bot base, with a portal frame, a sign, a bench, and a written book. *Build: 7×7 platform of mossy cobblestone and oak fence, portal frame of 4×5 blocks, sign "GATEWAY TO THE COMBINED COMPLEX," bench, written book, torch.*

2. **The Grand Avenue (the 425-block walk).** Why iconic: this is the *civic spine* of the new world — the road the visitor walks to get from the old town to the new city. A 4-block-wide stone-brick road, lined with sidewalks, planters, and 10 statue/ornament schematics, running 425 blocks from the old town centre to the new city's SE corner, with a stone-brick bridge over a stream at the 425-block mark. *Build: 425 blocks of 4-wide stone-brick road, 1-block sidewalks on both sides, oak-fence planters every 8 blocks, 10 statuary schematics along the route, 3-block stone-brick bridge at the 425-block mark over a 3-block-wide stream.*

3. **The old town with 30–40 historical schematics.** Why iconic: this is the *historical layer* — the existing schematic library re-placed as a coherent town. 600×400 block area in the new world's coastal plain, centred at (0, 0, 500), with 7 clusters: residential (~20 houses), castle/fortress (~3), temple (~3), statue/ornament (~10 along the main road), theme-park (1 Space Mountain), underground easter egg (1 root cellar), Cute house anchor (1–2 Cute houses). *Build: 600×400 cleared-grass area with 7 named clusters, each cluster labelled with a sign, the Cute houses at the centre on a small plaza, the Space Mountain as the largest single structure.*

4. **The coastal-plain rail spur (the freight connection).** Why iconic: this is the *logistics layer* — the bot fleet's continued supply chain. A 3-block-wide rail line (1 rail + 1 walkway + 1 utility strip), ~700 blocks long, with powered rail every 8 blocks, running from the existing bot base to the new city's south edge. Stations at each end: a "Freight Station" at the existing bot base, an "Arrival Platform" at the new world's edge. *Build: 700 blocks of 1-block rail on wooden sleepers, 1-block dirt walkway, 1-block utility strip with chest minecart, powered rail every 8 blocks, two named stations.*

5. **The existing bot base as a *remote outpost*.** Why iconic: the *origin* of the rail spur, the *vestibule* of the experience. The 200×200 surface patch in the existing world, with the 4 active bots, the 1–2 Cute houses, the small starter infrastructure. The visitor sees the *smallness* of the existing world before they see the *vastness* of the new world. *Build: preserve the existing bot base; add a small "Freight Station" platform at the rail spur's start, with a sign listing the cities served and a "Last Surface Point in the Existing World" marker.*

6. **The underground-base.schem as the *root cellar*.** Why iconic: the *origin myth* of the combined complex. The single 1,048-byte underground build in the entire schematic library, half-buried in the old town's coastal plain dirt, with a hand-painted sign explaining its provenance. *Build: 5×5×3 wooden structure (the schematic's native footprint), half-buried in dirt, with a hand-painted sign: "THIS IS THE ONLY UNDERGROUND BUILD IN THE EXISTING LIBRARY. THE COMBINED COMPLEX IS ITS DESCENDANT."*

7. **The Space Mountain as the *old town tourist attraction*.** Why iconic: the *largest* surface build in the schematic library (58 KB), placed in the old town as the *tourist attraction*. The Space Mountain is the old town's *Disneyland* — the place visitors go to *see*. Visible from the new city, miles away. *Build: 80–200 block Space Mountain at its native scale, placed at the SE corner of the old town at (100, 0, 600), with a "Tourist Attraction" sign and a small ticket booth.*

8. **The Cute house as the *historical anchor*.** Why iconic: the *founding square* of the old town. The 1–2 Cute houses that the historical CuteHouse1/2 bots placed in the existing world are re-placed at the *centre* of the old town, on a small plaza, with a sign crediting the historical bots. *Build: 1–2 Cute house schematics at the old town centre (0, 0, 450), on a 10×10 block stone-brick plaza, with a sign: "These Cute houses were placed by the CuteHouse1 and CuteHouse2 bots of the mc-fleet-bot fleet. They are the first schematic placements in the workspace's history."*

9. **The 4 active bots as the *original explorers*.** Why iconic: the *data-layer* signature of the map integration. The Gateway station's sign credits Lilly, Taylor, Marcus, and Hazel by name as the *first surveyors* of the new world. The old town's founding plaques credit CuteHouse1/2, Builder1/2/5, Packet1/2/3, sloth, and badbitch. *Build: Gateway station sign "First surveyed by Lilly, Taylor, Marcus, and Hazel of the mc-fleet-bot fleet, 2026"; old town founding plaque listing the 9 historical bots.*

10. **The "Mining Area" zone as the *data-layer signature*.** Why iconic: the *fulfilled* placeholder. The 2 "Mining Area" zones in the existing data layer (names without substance) become the *real* SubTropolis chamber and the *real* Cheyenne chamber in the new world's data layer. *Build: in the new world's `zones.json`, the 2 placeholder zones become `zne_subtropolis_chamber` at (−100, −50, −200) to (100, 0, −100) and `zne_cheyenne_chamber` at (−40, 250, −580) to (40, 400, −500).*

11. **The themed cluster layout (residential / castle / temple / ornament / theme-park / root cellar / Cute house).** Why iconic: the *thematic structure* of the old town. 7 named clusters, each with a sign, each with a distinct architectural character. The visitor can read the old town as a *map* — residential in the centre, castles to the east, temples to the west, ornaments along the main road, the Space Mountain to the SE, the root cellar to the SW, the Cute houses at the founding plaza. *Build: 7 named clusters in the 600×400 old town area, each with a wooden sign at its entry, each with 1–20 schematics placed at native scale.*

12. **The stream-crossing bridge as the *civic crossing*.** Why iconic: the *transition* from old town to new city. A 3-block-wide stone-brick bridge over a 3-block-wide stream, at the 425-block mark of the Grand Avenue. The bridge is the *literal* point where the visitor leaves the old town and enters the new city. The same stream flows from the new city's ravine; the bridge is the *first* crossing of that stream. *Build: 3-block-wide stone-brick bridge at the 425-block mark of the Grand Avenue, with oak-fence railings, a sign: "Crossing into the City of the Combined Complex."*

---

## 5. What Makes It Different From the Individual Sites

The map integration is **not a 5th build.** It is a *meta-build* — a layer that *connects* the existing 113 schematics and the live bot world to the new combined complex. The differences from the individual sites (and from the 4-masterplan package) are:

### 5.1 The map integration is a meta-build, not a build

The 4 master plans (Cheyenne, SubTropolis, Houston, Combined Complex) are about *one Minecraft world* — the 1,500×1,500 combined complex with the city, the mountain range, the public shaft, the service tunnel, and the Cheyenne chamber. The Map Integration is about *two Minecraft worlds* — the existing bot world (with the 113-schematic library and the live bot base) and the new combined complex world — *connected by a portal*. The map integration does not *add* buildings to either world; it adds the *connection* between them.

The single physical object that defines the map integration is the **Gateway station** — a portal frame in the existing world, with a matching arrival shelter in the new world. The Gateway station is the *portkey* of the entire experience. Without the Gateway station, the two worlds are separate. With the Gateway station, the two worlds are one experience.

### 5.2 The 4 master plans describe one world; the map integration describes two

The 4 master plans (and their binding decisions, site coordinates, and contractor briefs) are about the new world's interior — the 6-stage inbound journey, the 4-layer defense-in-depth palette, the 6 centerpieces, the 9 easter eggs. The map integration is about the *exterior* of the new world — the rail spur that brings the visitor from the existing world to the new world's edge, the Grand Avenue that walks them from the rail spur's end to the new city, the old town that they pass through on the way.

The map integration is *not* an alternative to the 4 master plans; it is their *vestibule*. The 4 master plans describe the *interior* of the experience; the map integration describes the *approach*.

### 5.3 The visitor has two origins, not one

The 4 master plans describe a single starting point: the new city surface, at (0, 0, 0). The map integration adds a *second* starting point: the existing bot base, at (935, 60, 300) in the existing world. The visitor can start in either world:

- **Origin 1: New World Spawn.** The visitor spawns in the new world, at the world origin, and proceeds directly to the 6-stage inbound journey. They see the city, the mountain, the descent. They do not see the existing bot world.
- **Origin 2: Existing Bot World.** The visitor starts in the existing bot base, sees the small surface, walks to the Gateway station, steps through the portal, arrives at the Arrival Platform in the new world, walks the Grand Avenue through the old town, and proceeds to the 6-stage inbound journey. They see *both* worlds.

The two origins are *not* equivalent. Origin 2 is the *full experience* — the visitor sees the entire map integration, from the existing bot base to the new combined complex. Origin 1 is the *fast path* — the visitor skips the approach and starts at the destination. The map integration supports both, but the *full experience* is the one the design team should optimise for.

### 5.4 The build is *legacy-aware*

The 4 master plans describe a *fresh* world — a 1,500×1,500 plot of newly-generated terrain with the 4-layer defense-in-depth palette applied from scratch. The map integration describes a *legacy-aware* world — a new world that *knows* the existing schematic library, the existing bot fleet, and the existing data layer, and that *uses* them.

The legacy-awareness is *not* a stylistic choice. The legacy-awareness is a *structural* property of the map integration:

- The 113 existing schematics are *not* ignored; they are *re-placed* as the old town.
- The 4 active bots are *not* displaced; they are *credited* as the original explorers.
- The 6 empty markers are *not* abandoned; they are *re-purposed* as the new world's coordinate system.
- The 2 "Mining Area" zones are *not* forgotten; they are *fulfilled* as the real SubTropolis and Cheyenne chambers.
- The 6 empty squads are *not* wasted; they are *named* as the new world's operating crews.

The map integration says: *the build is more meaningful when it acknowledges the work that came before it.* The 4 master plans alone do not say this. The map integration does.

### 5.5 The two worlds are connected by a single piece of NEW infrastructure

The 4 master plans add *zero* new infrastructure to the existing world. The map integration adds *one* new piece of infrastructure to the existing world: the **Gateway station** (a 7×7 platform with a portal frame, a sign, a bench, and a written book, built in the existing world near the existing bot base). The Gateway station is the *only* new physical object the map integration adds to the existing world.

Everything else in the map integration is in the *new* world: the rail spur (split between worlds, with a portal in the middle), the old town, the Grand Avenue, the Arrival Platform. The map integration is *mostly* a *new*-world build that *references* the existing world. The single exception is the Gateway station.

---

## 6. Design Language for the Build

The map integration uses a *transitional* design language — the existing world's "starter" palette, the new world's "committed" palette, and a *gradient* between them. The gradient is not a hard transition; it is a *slow shift* across the 425 blocks of the Grand Avenue.

### 6.1 The existing world palette (vestibule)

- **Material:** mossy cobblestone, oak fence, dirt path, the existing bot base's "starter" aesthetic. The 1–2 Cute houses are unchanged. The 6 furnaces, 4 chests, 5 crafting tables, and cobblestone stairs are unchanged.
- **Tone:** *ad-hoc, lived-in, organic*. The existing world is not a designed world; it is a *grown* world. The visitor sees the 4 active bots doing their daily work (mining, building, chatting).
- **Gateway station material:** mossy cobblestone and oak fence (matching the existing bot base's starter palette). The portal frame is *not* an end-portal frame; it is a *bespoke* portal frame, with a sign above it.

### 6.2 The old town palette (historical layer)

- **Material:** the existing schematic library's *native* materials — birch, oak, jungle, spruce, dark oak, stone, cobblestone, terracotta, glass, wool. The old town is *visually heterogeneous*; the heterogeneity is the *point*. A 245-byte cottage next to a 38 KB Cute house next to a 58 KB Space Mountain.
- **Tone:** *legacy, recognisable, retrospective*. The visitor sees the *same* buildings from the schematic library, but now in a *coherent* town plan. The Cute houses are at the centre. The Space Mountain is the tourist attraction. The castles and temples are on the surrounding low hills.
- **Roads:** packed dirt with cobblestone edges. *Not* paved stone brick (the Grand Avenue is the only paved surface in the new world).
- **Plaza:** the Cute house plaza is stone brick (the *only* paved surface in the old town), with a sign crediting the historical CuteHouse1/2 bots.

### 6.3 The Grand Avenue palette (the connection)

- **Surface:** stone brick (matching the new city's surface palette).
- **Sidewalks:** smooth stone, raised 1 block above the road.
- **Planters:** oak fence every 8 blocks, with a torch or a small statue.
- **Statues:** the 10 statue/ornament schematics (snowman, teddy-bear, macaw-statue, dragon-egg, etc.) are placed *along* the Grand Avenue. The statues are the *civic ornaments* of the new world.
- **Bridge:** stone brick, 3 blocks wide, with oak-fence railings, at the 425-block mark over the stream.
- **Tone:** *civic, committed, intentional*. The Grand Avenue is the *one* paved surface in the new world. It says *this is the new world, and the new world is committed*.

### 6.4 The new city palette (the destination)

- **Material:** concrete-gray, glass-blue, steel-gray, the city's weather, sun-bleached, hot. T-marker red on white at the curb. Skybridge glass. (Inherited from the 04-masterplan.)
- **Tone:** *busy, daylit, climate-hostile, retail, civilian, 1970s*. The new city is the *anterior* of the combined complex; everything else is *posterior*.

### 6.5 The combined complex palette (the descent)

- **Public shaft:** cool blue/gray to cream/limestone gradient over 100 blocks.
- **SubTropolis chamber:** cream/limestone with white-painted pillars, channel-letter tenant signs, asphalt roads.
- **Service tunnel:** cream/limestone to pink-granite gradient over 120 blocks.
- **Cheyenne chamber:** pink-granite, bare-rock walls, fluorescent light, the "dead air" smell of floor wax and ozone.
- (All inherited from the 04-masterplan and the existing culture-architecture-analysis.)

### 6.6 The transition zones (the gradients)

The map integration has *three* transition zones, each with its own design language:

- **The Gateway station (existing → new world).** Mossy cobblestone (existing) → stone brick (new). The portal frame is the *literal* transition; the materials on either side are different.
- **The Grand Avenue (old town → new city).** Packed dirt (old town) → stone brick (Grand Avenue) → concrete (new city). The 425 blocks of the Grand Avenue are a *gradient*: the first 100 blocks are cobblestone-edged dirt (matching the old town), the middle 225 blocks are stone brick with oak-fence planters, the last 100 blocks are concrete (matching the new city). The transition is *slow* and *intentional*.
- **The stream-crossing bridge (old town → new city).** Stone brick (Grand Avenue) → stone bridge (the bridge itself) → concrete (new city). The bridge is the *literal* crossing; the materials on either side are different.

---

## 7. Visitor Experience (Stage by Stage)

The map integration's visitor experience has **11 stages**, depending on which world the visitor starts in. The two starting points are Origin 1 (New World Spawn) and Origin 2 (Existing Bot World). The 11 stages are:

### Origin 1: New World Spawn (fast path)

A visitor spawning in the new world skips Stages 1–5 and begins at Stage 6. The fast path is the *committed* experience: the visitor sees only the new world.

### Origin 2: Existing Bot World (full experience)

The full experience walks through all 11 stages:

- **Stage 1: The Bot World.** The visitor starts in the existing bot base, at (935, 60, 300) in the existing world. They see a 200×200 block patch of cleared forest with 4 active bots, 1–2 Cute houses, a starter cobblestone path, 6 furnaces, 4 chests, 5 crafting tables, a few cobblestone stairs, a door, and the small mining area where the bots have dug for iron and coal. The world feels *small, lived-in, and ad-hoc*. The 4 active bots (Lilly, Taylor, Marcus, Hazel) are doing their daily work — mining, building, chatting. The visitor sees the bots' *names* on their character models. *Light level 15 (full daylight).* The visitor is in the *vestibule* of the larger experience.
- **Stage 2: The Portal.** The visitor walks to the edge of camp, where the Gateway station stands. The 7×7 platform of mossy cobblestone, the portal frame, the sign, the bench, the written book. The visitor reads the book: "A Visitor's Guide to the Combined Complex." The book explains the 6-stage inbound journey (city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne) and credits the 4 active bots as the original explorers. The visitor sits on the bench for a moment, then steps through the portal. *Light level 12 (shaded by the wooden shelter).* The visitor is at the *threshold*.
- **Stage 3: The Gateway Station.** The screen fades. The visitor is standing on a stone-brick platform under a wooden shelter, with a sign that reads: "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER." Behind them, the Arrival Platform with the rail spur's first block. In front of them, a paved Grand Avenue runs north for 425 blocks toward a skyline they cannot yet see. To the east and west, the *old town* — small houses, a castle on a low hill, a Japanese pagoda on a low hill, statues lining the main road, a giant theme-park Space Mountain replica. The mountain range is visible in the far distance to the north, with the ravine's V-notch clearly visible. *Light level 15 (full daylight).* The visitor is in the *new world*. The first thing they notice is the *scale*: the mountain range is 800 blocks wide, the city is 138m × 138m, the ravine is 100 blocks deep. The old town's small houses look like a *dollhouse* in comparison.
- **Stage 4: The Old Town.** The visitor walks south from the Arrival Platform into the old town. The old town is *recognisably* the same buildings from the existing schematic library — the same `birch house.schem`, the same `cube-house.schem`, the same `Disneyland Space Mountain.schem` — but now placed in a coherent town plan. The Cute houses are at the centre, on a small stone-brick plaza, with a sign crediting the historical CuteHouse1/2 bots. The castles are on a low hill to the east. The temples are on a low hill to the west. The statues line the main road. The Space Mountain looms at the SE corner, visible from miles away. At the SW corner, half-buried in the dirt, the *root cellar* — a 5×5×3 wooden structure with a hand-painted sign: "THIS IS THE ONLY UNDERGROUND BUILD IN THE EXISTING LIBRARY. THE COMBINED COMPLEX IS ITS DESCENDANT." The old town feels like an *established neighbourhood* — older, more cluttered, with more decoration per block than the new city. It is a *visual palimpsest* of the existing schematic library. *Light level 15 (full daylight).* The visitor is in the *historical layer*.
- **Stage 5: The Grand Avenue.** The visitor walks north from the old town's main plaza onto the Grand Avenue. The Avenue is 4 blocks wide, paved with stone brick, lined with 1-block sidewalks and 1-block oak-fence planters every 8 blocks. The 10 statue/ornament schematics (snowman, teddy-bear, macaw-statue, dragon-egg, etc.) are placed *along* the Avenue. The small houses grow smaller. The road grows wider. At the 425-block mark, a 3-block-wide stone-brick bridge crosses a stream — the same stream that flows from the new city's ravine — and the visitor steps into the new city. The bridge has oak-fence railings and a sign: "Crossing into the City of the Combined Complex." *Light level 15 (full daylight).* The visitor is in the *civic crossing*.
- **Stage 6: The New City.** The visitor steps off the bridge into the new city's SE corner. The city is a 138m × 138m sunlit downtown, with 4 anchor towers (Wells Fargo, JPMorgan Chase, Pennzoil Place, Esperson), 8–10 generic downtown towers, 2–3 parking garages, skybridges, and a street grid. T-marker signs are at the curb. The mountain range is visible behind the city, with the ravine's V-notch clearly visible. The city is hot, sun-bleached, busy. The Combined Complex Transit Hub plaza is at the NE corner — a 20×20 block paved plaza with a written book on a lectern: "The Public Shaft: 100 blocks down to SubTropolis." *Light level 15 (full daylight).* The visitor is in the *civilian anchor* of the combined complex.

### Stages 7–11: The 6-Stage Combined Complex Journey

Stages 7–11 are the *interior* of the combined complex, described in detail in the existing culture-architecture-analysis.md (the sibling deliverable). The map integration's 6 stages (city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne) are *unchanged* from the 04-masterplan; the map integration's contribution is the *approach* (Stages 1–6).

The 6 stages of the inbound journey are:

- **Stage 7: Houston Tunnel.** The visitor descends 6 meters below grade to the 24-block Houston tunnel sample, with beige VCT tile, fluorescent 4000K light, T-marker signs at the entries, and channel-letter tenant signs.
- **Stage 8: Public Shaft.** The visitor takes the 7×7 mechanical lift down 100 blocks, with the mid-landing observation window at Y = −50 as the G-Cans moment, and the bottom lobby with the "Welcome to SubTropolis" sign.
- **Stage 9: SubTropolis Chamber.** The visitor walks the 200×200 block limestone grid, with white-painted pillars, channel-letter tenant signs, the central plaza with the quartz medallion, and the horizontal portal on the south face of the ravine.
- **Stage 10: Service Tunnel.** The visitor takes a minecart 120 blocks through the rock under the stream, with the cream-limestone-to-pink-granite wall transition at the midpoint, the thrust-fault breccia visible in the walls, and the 25-ton blast door at the Cheyenne end.
- **Stage 11: Cheyenne Chamber.** The visitor opens three 25-ton blast doors and arrives at the 4.5-acre granite chamber, with 15 spring-mounted buildings, the Combat Operations Center, the Air Defense Operations Center, the medical clinic, the Granite Inn bar, and the central support area. The journey is complete.

---

## 8. Recommendations for the Design Team

The following 8 recommendations are *specific, actionable* guidance for the downstream Map Integration design team. Each recommendation is grounded in the research and the cultural identity of the map integration.

### 8.1 The 30–40 schematics to re-place in the old town, with a prioritised list

The old town should re-place **30–40 of the 113 existing schematics**, in 7 clusters, with the following prioritisation:

| Priority | Cluster | Count | Schematics |
|---|---|---|---|
| **Tier 1 (must place)** | Cute house anchor | 1–2 | `Cute house.schem` (the 38 KB one, the largest in the library) |
| **Tier 1** | Theme-park feature | 1 | `Disneyland Space Mountain.schem` (the 58 KB one) |
| **Tier 1** | Underground easter egg | 1 | `underground-base.schem` (the 1 KB one, the only underground build) |
| **Tier 2 (should place)** | Castle / fortress | 3 | `md castle 2.schem`, `small medieval town hall.schem`, `stone-fortress.schem` |
| **Tier 2** | Temple | 3 | `fantasy-temple-house.schem`, `red-japanese-temple.schem`, `japanese-pagoda.schem` |
| **Tier 2** | Residential (curated 12) | 12 | `birch house`, `cozy-cabin`, `cube-house`, `classic-village-house`, `mushroom-cottage`, `simple-house`, `wood-house`, `rustic-farmhouse`, `stilt-house`, `mud-house`, `cozy-igloo-base`, `rustic-mountain-house` |
| **Tier 2** | Statue / ornament (curated 8) | 8 | `dragon-egg`, `giant-skull`, `stone-statue`, `snowman`, `teddy-bear`, `macaw-statue`, `villager-statue`, `enderman` |
| **Tier 3 (may place)** | Residential (additional 8) | 8 | The remaining 8 small houses from the residential category |
| **Tier 3** | Statue / ornament (additional 2) | 2 | `crab-statue`, `flying-eagle` (placed along the Grand Avenue) |

Total: 1+1+1+3+3+12+8+8+2 = 39 schematics. The remaining 74 schematics in the library are *reserved* for future use (additional residential, additional ornaments, additional decorations).

### 8.2 The 7 clusters, with placement coordinates

The 7 clusters are placed in the 600×400 block old town area, centred at (0, 0, 500):

| Cluster | Approximate centre | Builds | Sign |
|---|---|---|---|
| **Cute house anchor (founding plaza)** | (0, 0, 450) | 1–2 Cute houses on a 10×10 stone-brick plaza | "Cute House Plaza — Founded by CuteHouse1 and CuteHouse2, 2026" |
| **Residential cluster** | (0, 0, 480) | 20 small houses (12 Tier 2 + 8 Tier 3) | "Old Town Residential" |
| **Castle / fortress cluster** | (200, 0, 500) | 3 castles / fortresses on a low hill | "Old Town Castle District" |
| **Temple cluster** | (−200, 0, 500) | 3 temples on a low hill | "Old Town Temple District" |
| **Statue / ornament cluster (along the Grand Avenue)** | (0, 0, 600) | 10 statues along the Grand Avenue's southern segment | "Old Town Civic Ornaments" |
| **Theme-park feature** | (100, 0, 600) | 1 Space Mountain at the SE corner | "Old Town Tourist Attraction" |
| **Underground easter egg** | (−50, 0, 550) | 1 underground-base.schem, half-buried, with a sign | "Root Cellar — The only underground build in the existing library" |

### 8.3 The Gateway station design

The Gateway station is **a 7×7 platform of mossy cobblestone and oak fence**, built in the existing world at the edge of the bot base (e.g., (940, 60, 360), adjacent to the existing 1–2 Cute houses). The platform has:

- A **portal frame** of 4×5 blocks, made of mossy cobblestone, with a sign above it: "GATEWAY TO THE COMBINED COMPLEX."
- A **bench** of oak fence and oak slabs, with a torch on each side.
- A **written book** on a lectern: "A Visitor's Guide to the Combined Complex" — credits the 4 active bots as the original explorers, describes the 6-stage inbound journey, and explains the map integration.
- A **rail terminus** at the back of the platform, with a "Freight Station" sign and a chest minecart for supply runs.
- A **gravel path** leading from the existing bot base to the platform.

The matching **Arrival Platform** in the new world is a 7×7 stone-brick platform with a wooden shelter, a sign ("YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER"), and a rail terminus at the back. The Arrival Platform is at the SE corner of the new world's coastal plain, where the rail spur from the existing bot base meets the new world.

### 8.4 The Grand Avenue design

The Grand Avenue is **4 blocks wide, paved with stone brick, lined with 1-block sidewalks and 1-block oak-fence planters every 8 blocks**, running 425 blocks from the old town centre (0, 0, 450) to the new city's SE corner (60, 0, −70). The Avenue has:

- **10 statue/ornament schematics** placed along its length, at irregular intervals. The statues are the *civic ornaments* of the new world.
- **A 3-block-wide stone-brick bridge** at the 425-block mark, over a 3-block-wide stream. The bridge has oak-fence railings and a sign: "Crossing into the City of the Combined Complex."
- **Tall oak trees** every 16 blocks on the sidewalks, with carpets of grass and flowers.
- **A gradient material transition:** the first 100 blocks (in the old town) are cobblestone-edged dirt, matching the old town's roads; the middle 225 blocks are full stone brick; the last 100 blocks (in the new city) are concrete, matching the new city's surface.

### 8.5 The coastal-plain rail spur design

The coastal-plain rail spur is **3 blocks wide total (1 rail + 1 walkway + 1 utility strip), ~700 blocks long, with powered rail every 8 blocks**, running from the existing bot base (935, 60, 300) to the new world's edge (0, 0, 70). The spur has:

- **A "Freight Station"** at the existing bot base, with a sign listing the cities served ("Combined Complex — City Hub — SubTropolis — Cheyenne"), a chest minecart, and a small platform.
- **An "Arrival Platform"** at the new world's edge, with a sign ("YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER"), a chest minecart, and a wooden shelter.
- **A portal crossing** at the world boundary: the existing world's last rail block is at the Gateway station; the new world's first rail block is at the Arrival Platform. The visitor dismounts at the Gateway station, walks through the portal, and remounts at the Arrival Platform.
- **Powered rail** every 8 blocks (with a redstone torch), to maintain minecart speed.
- **Redstone repeaters** every 16 blocks along the utility strip, for any future signalling.
- **Block budget:** ~20,000 blocks (small relative to the 3.5M block total for the combined complex).

### 8.6 The underground-base.schem as the *root cellar*

The underground-base.schem is placed in the old town at (−50, 0, 550), **half-buried in the dirt of the coastal plain**, with a hand-painted sign on a wooden post:

> **ROOT CELLAR**
> This is the only underground build in the existing library.
> Built by the mc-fleet-bot fleet, 2026.
> The Combined Complex is its descendant.

The sign is in dark-oak text on a light-oak sign, in a *hand-written* style (using a custom font or a sign-placing script). The structure is 5×5×3 wooden blocks (the schematic's native footprint), with a chest and a crafting table inside. The structure is *deliberately* small — the visitor can stand next to it and see that it is the *only* underground build in the entire 113-file library. The root cellar is the *origin myth* of the combined complex.

### 8.7 The visitor's first view (which origin point?)

The design team should *optimise for Origin 2* (the full experience). The reasoning:

- Origin 1 (new world spawn) shows the *destination* but not the *journey*. The visitor sees the new city and the mountain range, but they do not see the *scale* of the approach (the small existing bot world, the 700-block rail spur, the 425-block Grand Avenue, the 30–40-schematic old town).
- Origin 2 (existing bot world) shows the *full* map integration. The visitor sees the *smallness* of the existing world before they see the *vastness* of the new world. The contrast is *the point* — the map integration is about *two worlds*, and the visitor must see both.
- The full experience is *more iconic*. The 12 iconic must-haves (Section 4) are spread across both worlds: the Gateway station is in the existing world; the Grand Avenue, the old town, the rail spur, and the combined complex are in the new world. A visitor who starts in Origin 1 sees only 8 of the 12 iconic must-haves.

The design team should *default* to Origin 2 for the public-facing materials (videos, screenshots, documentation). Origin 1 should be available as a *fast path* for visitors who want to skip the approach, but the *primary* experience is Origin 2.

### 8.8 The data-layer integration (markers, zones, squads)

The existing data layer has 6 unnamed markers, 2 placeholder "Mining Area" zones, and 6 empty squads. The map integration should *re-purpose* all of these in the new world:

- **Markers:** the 6 unnamed markers become 6 named anchors in the new world: `mkr_city_center` at (0, 0, 0), `mkr_public_shaft_top` at (60, 0, −70), `mkr_subtropolis_chamber_center` at (0, −50, −200), `mkr_cheyenne_outer_portal` at (0, 0, −420), `mkr_ravine_bottom` at (0, −90, −400), `mkr_old_town_center` at (0, 0, 500).
- **Zones:** the 2 "Mining Area" zones become 2 named zones: `zne_subtropolis_chamber` at (−100, −50, −200) to (100, 0, −100) and `zne_cheyenne_chamber` at (−40, 250, −580) to (40, 400, −500).
- **Squads:** the 6 empty squads become 6 named squads with real jobs: `sqd_che_outer_portal_guard`, `sqd_sub_chamber_patrol`, `sqd_pub_shaft_operator`, `sqd_svc_tunnel_maintenance`, `sqd_old_town_ranger`, `sqd_ravine_response`.

The data-layer integration is the *invisible* signature of the map integration. A visitor who reads the data files will see that the old placeholders have *real meaning* in the new world. The data layer is *consistent* across both worlds.

---

## 9. Tensions, Surprises, and Open Questions

A few tensions and surprises emerged from the research that the design team should be aware of:

### 9.1 The schematic library is *visually* the old town, but *thematically* the new city is the commitment

The 4 master plans describe the new city as a *commitment* to 1:1 scale and 1-block-equals-1-meter design rigor. The old town is the *legacy* of the schematic library's heterogeneous scales. The two are visually distinct (the new city is concrete-and-glass, the old town is birch-and-cobblestone), but the *thematic* distinction is more subtle: the new city is the *future*, the old town is the *past*. The design team should not let the old town feel *lesser* than the new city. The old town is *older*, not *worse*. The heterogeneity of the schematic library is *intentional*, not a flaw.

### 9.2 The walk_to_coords(100, 64, 200) command is a *fulfilled prophecy*

The lone substantive command in the existing data layer was a 2026-03-23 plan to walk Lilly to (100, 64, 200). The command was never followed up. The map integration *fulfills* the command — the new world has a city hub at (0, 0, 0), and a 700-block rail spur runs from the existing bot base to the new city. The command is the *first evidence* in the data layer that someone was already planning for a build beyond the starter base. The design team should *call this out* in the Gateway station's written book: "In 2026, a bot named Lilly was once given a command to walk to (100, 64, 200). That command was the seed of this build. The Combined Complex is its fulfilment."

### 9.3 The "Mining Area" zone names are *not* a coincidence

The 2 placeholder zones in the existing data layer are named "Mining Area" but have no spatial coordinates. The combined complex is *literally* a mine (SubTropolis is a real room-and-pillar limestone mine) next to a military bunker (Cheyenne). The "Mining Area" names are *prescient*. The design team should *call this out* in the new world's zones.json: the placeholder names were *always* pointing to the SubTropolis chamber, even before the chamber existed. The names are *fulfilled*.

### 9.4 The 9 historical bots are *founders*, not relics

The 9 historical bots (sloth, badbitch, CuteHouse1/2, Packet1/2/3, Builder1/2/5) are *not* abandoned. They are the *founders* of the schematic library's content. The design team should *credit them* in the old town's founding plaques: "The old town was built on the work of CuteHouse1, CuteHouse2, Builder1, Builder2, Builder5, Packet1, Packet2, Packet3, sloth, and badbitch. Their schematic placements are the foundation of the historical layer."

### 9.5 The schematic library's mojibake filenames are *aesthetic* texture

The `Pokémon Temple Arena.schem` filename is mojibake-encoded. The library's file naming is *uneven*. The design team should *not* rename the schematics to fix the mojibake — the mojibake is *part of the library's history*. The old town should display the schematics with their *original* filenames on small signs: a sign next to the Pokémon Temple Arena reads "Pokémon Temple Arena.schem" with the mojibake preserved. The unevenness is *honest*.

### 9.6 Open question: what happens to the existing bot world after the visitor steps through the portal?

The research assumes the existing bot world is *preserved* — the 4 active bots continue to do their daily work, the existing bot base is unchanged, the data layer is preserved. But the *visitor* is no longer in the existing world after they step through the portal. Is the existing world a "lobby" that the visitor can return to? Or is it a "vestibule" that the visitor leaves behind? The design team should clarify this:

- **Option A: Returnable lobby.** The visitor can step back through the portal at any time and return to the existing bot world. The existing world is a *persistent* lobby.
- **Option B: One-way vestibule.** The visitor steps through the portal and the portal closes behind them. The existing world is a *one-time* starting point.
- **Option C: Bidirectional with side effects.** The visitor can return, but the existing world is *slightly different* on return — the bots have done more work, the data layer has new entries, the world has evolved.

The research leans toward Option A (returnable lobby) for the *full experience*, but the design team should confirm.

### 9.7 Open question: which scale wins — the schematic library's native scales or the new world's 1:1?

The research notes that the schematic library is *visually* heterogeneous: file sizes range from 245 to 63,492 bytes, a 260× range. The combined complex is *unambiguously* at 1 block = 1 m. The old town should re-place the schematics at their *native* scales, with the understanding that the visual effect is that the old town looks *slightly smaller* (or *slightly larger*) than the new city. The design team should *commit* to the native scales — normalising the schematics to 1:1 would defeat the *legacy* point of the old town. The old town is *older, denser, more human-scale, less monumental*. The heterogeneity is the *point*.

---

## 10. One-Sentence Summary

The map integration is the *legacy-aware* layer that connects the existing bot world and the 113-schematic library to the new 1,500×1,500 combined complex — through a Gateway station portkey, a 700-block rail spur, a 30–40-schematic old town, a 425-block Grand Avenue, and a data-layer re-purposing of the existing placeholders — so that the new world is not built in a vacuum but *knows what came before it*.
