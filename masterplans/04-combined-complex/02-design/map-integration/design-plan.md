# Map Integration — Design Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex, Map Integration (5th and final deliverable)
**Author role:** Architectural Designer (integration architecture only — not site planning)
**Date prepared:** 2026-08-02
**Status:** **SUPERSEDED FOR CURRENT-WORLD PLACEMENT — HISTORICAL STUDY ONLY**
**Companion to:** `01-research/map-integration/research-report.md`, `02-design/map-integration/culture-architecture-analysis.md`, `02-design/map-integration/discussion-notes.md`
**Inherits from:** `discussion-notes.md` §3 — the seven binding decisions

> **Authority notice.** The separate new world, portal, duplicate schematic Old Town, coastal rail spur, and related data-layer mutations are retired for current-world placement. See [../../AUTHORITY.md](../../AUTHORITY.md) and Masterplan 05. No world edits are authorized.

> **Scope.** This document specifies the *integration architecture*: the two Gateway pavilions, the Grand Avenue, the coastal-plain rail spur, the seven old town clusters, the underground easter egg, and the visitor journey. It does not specify the internal layout of the Combined Complex itself (SubTropolis chamber, public shaft, service tunnel, Houston Tunnel, Cheyenne chamber) — those live in the 04-masterplan and the four sub-masterplans. It also does not produce the contractor brief; that is a separate downstream task. This document is the *architectural contract* between the deliberation panel's decisions and the build team.

---

## 1. Design Philosophy

The existing bot world is the *vestibule* — a small, lived-in clearing with a starter base, four active bots, and a 113-file schematic library that has been accumulating for months. The new 1,500 × 1,500 combined complex world is the *primary experience*: a deliberate architectural object with a coastal plain, a mountain range, a 100-block public shaft, a 200 × 200 SubTropolis chamber, and a Cheyenne chamber inside an 1,800-foot granite peak. The map integration's job is to make the two worlds **one integrated Minecraft experience**, not two adjacent containers.

The two worlds become one experience through three architectural moves:

- **The old town as the *historical layer*.** Thirty to thirty-five of the existing 113 schematics are re-placed as a 600 × 400 coastal-plain district in the new world. The old town is *visibly heterogeneous* — file sizes range from 245 bytes to 63,492 bytes, a 260× range — and the heterogeneity is *thematic*. A 245-byte cottage sits next to a 38 KB Cute house next to a 58 KB Space Mountain, and the uneven rooflines are the *honest record* of a schematic library assembled from many sources over time. The old town is the legacy made into a place.
- **The Grand Avenue as the *urban design choice*.** A 425-block stone-brick road runs from the old town plaza to the new city's SE corner. The Grand Avenue is a *deliberate* urban design choice in the tradition of the Champs-Élysées, the Unter den Linden, and the Avenue de la Paz — wide, straight, lined with civic ornaments, terminating at a bridge over a stream. The road is the *civic spine* of the new world, the path the visitor walks (or rides) to leave the past behind and enter the future.
- **The Gateway station as the *portkey*.** Two matching 7 × 7 pavilions — one in the existing world, one in the new world — frame a single, shared obsidian portal. The pavilions are mirrors: one stone-brick (older, established), one wooden (newer, fresh). The portal is *visual* (obsidian-and-glowstone, the standard end-portal frame), the transit is a `/tp` command block. The Gateway is the single object that, by existing, makes the two worlds one experience. Without the Gateway, the two worlds are separate; with the Gateway, the two worlds are *connected* by a single, intentional, civic object.

The design philosophy is **legacy-aware expansion**. The new world is not built in a vacuum; it is built in a workspace that already has 113 schematics, 4 active bots, 9 historical bots, 6 unnamed markers, 2 placeholder "Mining Area" zones, and 6 empty squads. The new world *acknowledges that history* by re-placing the existing schematics as the old town, by re-purposing the data layer as the new world's coordinate system, by crediting the existing bot fleet on the Gateway station's sign, and by leaving the existing bot base intact as the *origin* of the rail spur. The build is *meaningful* because it knows what came before it.

---

## 2. The Old Town Composition

The old town is a **600 × 400-block coastal-plain district centered at (0, 0, 500)** in the new world. It is the *first* major surface feature a visitor sees when they step off the rail spur from the existing world, and the *last* major surface feature they see on the return leg. The old town is the historical layer; the new city is the commitment; the Grand Avenue is the seam between them.

### 2.1 Era discipline

The old town reads as **2010s vernacular Minecraft** — small, ad-hoc, scale-heterogeneous, with the 1–2 Cute houses (the 38 KB historical `Cute house.schem`) as the *anchor structures*, not the background. The new city reads as **1970s Houston-modern** (per the 03-masterplan Houston tunnel's 1960s–70s boom era), with 4 anchor towers at 80 blocks and a Wells Fargo-style descent. The SubTropolis reads as **1964 Hunt Midwest** (the real SubTropolis was carved in 1964), and Cheyenne reads as **1966 NORAD/Cheyenne Mountain Complex**. The era discipline is *visible* at every transition: material palette changes, sign typography changes, lighting changes, and the scale of the structures changes. The old town is *smaller* than the new city; the Cute houses are *shorter* than the anchor towers. The visual difference is the historical difference.

The existing bot world is **outside time** — a generic Minecraft forest at sea level, with no era discipline. The Gateway station is the *seam*: the visitor crosses it and is *in* the era gradient.

### 2.2 The seven clusters

The old town is organized into **7 clusters totaling 30–35 schematics**. Each cluster has a designated *center coordinate* (a single block in the cluster) and a *thematic role* (what kind of buildings the cluster holds).

#### Cluster 1 — Residential (10 small + 2 anchors + 1 victorian palace = 13 builds)
- **Center:** (0, 0, 480)
- **Role:** the *where people live* cluster. This is the largest cluster by count and the densest by floor area. The 10 small houses are the *everyday fabric* of the old town; the 2 Cute houses (re-placements of the historical `Cute house.schem` placed by the `CuteHouse1/2` bots in the existing world) and the 1 victorian palace are the *anchors*.
- **Schematics (10 small houses):** `birch house`, `cozy-cabin`, `cube-house`, `classic-village-house`, `mushroom-cottage`, `simple-house`, `wood-house`, `rustic-farmhouse`, `stilt-house`, `mud-house`.
- **Anchors:** `Cute house.schem` × 2 (the historical CuteHouse1/2 placement, at the *plaza center*), `victorian palace.schem` × 1 (on a small low hill just north of the plaza).
- **Layout:** a loose grid of 10 small houses around a 30 × 30 block central plaza. The 2 Cute houses face each other across the plaza; the victorian palace is on a 5-block-tall hill to the north. Oak-plank roads (not stone-brick — the old town's internal roads are oak to mark it as vernacular) connect the houses to the plaza.
- **Height discipline:** no structure taller than 2 floors (matching the Cute house's 2-floor scale). The victorian palace is *3* floors, but its hill gives it a 4-floor visual height; the cluster is *intentionally* residential-scale.

#### Cluster 2 — Castle/Fortress (3 builds)
- **Center:** (200, 0, 500)
- **Role:** the *where people defend* cluster. This is the eastern high ground of the old town, with 3 medieval-style defensive structures on a low hill.
- **Schematics:** `md castle 2`, `small medieval town hall`, `stone-fortress`.
- **Layout:** the 3 builds are placed on a 10-block-tall artificial hill (built from cobblestone-and-mossy-cobblestone), with the castle on top, the town hall on the south slope, and the fortress on the east slope. The hill is the old town's *eastern landmark* — visible from the Grand Avenue.
- **Height discipline:** 3–4 floors. The castle is the tallest structure in the old town; it is the *skyline anchor* from the new city side.

#### Cluster 3 — Temple (3 builds)
- **Center:** (−200, 0, 500)
- **Role:** the *where people worship* cluster. This is the western high ground, mirrored against the castle cluster, with 3 Asian-/fantasy-style cultural structures on a low hill.
- **Schematics:** `fantasy-temple-house`, `red-japanese-temple`, `japanese-pagoda`.
- **Layout:** the 3 builds are placed on a mirrored 10-block-tall artificial hill (built from spruce-plank and stone brick), with the pagoda on top, the red temple on the south slope, and the fantasy temple on the west slope. The hill is the old town's *western landmark* — visible from the rail spur.
- **Height discipline:** 2–3 floors. The pagoda is the *visual counterpart* of the castle; the two hills frame the old town's east-west axis.

#### Cluster 4 — Statue/Ornament (4 in cluster + 6 along Grand Avenue = 10 builds)
- **Cluster center:** (0, 0, 600) — *between* the old town plaza and the rail spur.
- **Grand Avenue placements:** blocks 70, 140, 210, 280, 350, 420 of the Grand Avenue (see §4).
- **Role:** the *where people decorate* cluster. This is the cluster of civic ornaments — statues, decorations, and curiosities — placed both in their own dedicated cluster and along the Grand Avenue.
- **Cluster (4 builds):** `stone-statue`, `dragon-egg`, `giant-skull`, `snowman`. These are placed on 1-block-tall stone-brick pedestals in a 4 × 30-block ornamental avenue running north-south through the cluster center.
- **Grand Avenue (6 builds):** `teddy-bear` (block 70), `macaw-statue` (block 140), `parrot-statue` (block 210), `flying-eagle` (block 280), `villager-statue` (block 350, on the material transition), `enderman` (block 420, the "boss" at the city approach). See §4 for placement details.
- **Each statue has a *founding-era sign*** (a 1 × 1 oak sign on a fence-post, with the schematic's name and "Placed by the mc-fleet-bot fleet, 2026"). The signs are the *historical layer* of the old town: every ornament is *credited* to the bot fleet that assembled the schematic library.

#### Cluster 5 — Theme Park (1 build)
- **Center:** (100, 0, 600)
- **Role:** the *where people play* cluster. This is the old town's *tourist attraction* — a single large theme-park build.
- **Schematic:** `Disneyland Space Mountain.schem` (58,933 bytes — the largest surface build in the library).
- **Layout:** placed on a 30 × 30 block cleared area, with a 3-block-wide oak-plank road connecting it to the Grand Avenue. The Space Mountain is the *only* theme-park build in the old town; the Pokémon Temple Arena is *deferred* to a separate coastal-plain "attractions zone" outside the old town (see §3 and the open questions in discussion-notes.md §5).
- **Why Space Mountain, not Pokémon Temple Arena:** Space Mountain is 58 KB (large, but not dominant); the Pokémon Temple Arena is 63 KB *and* has a mojibake-encoded filename. The mojibake is a *real bug* (the special characters in "Pokémon" are not encoded as plain ASCII), and 63 KB is *larger* than the entire residential cluster of the old town. The Pokémon Temple Arena deserves its own space.

#### Cluster 6 — Underground Easter Egg (1 build)
- **Center:** (−50, 0, 550) — partially buried.
- **Role:** the *where people hide* cluster. This is the *only* underground feature in the new world outside the Combined Complex itself, and it is the *most important easter egg* in the project.
- **Schematic:** `underground-base.schem` (1,048 bytes — the only existing underground build in the entire workspace).
- **Layout:** see §6 for the full placement specification.
- **Why it matters:** the underground-base is the *only* underground build in the entire 113-file schematic library. The Combined Complex is *the first underground build of any scale* in the workspace, and the underground-base is its *ancestor*. The new build is not "bigger than the old one"; the new build is "the only descendant of a 5×5 wooden room that the workspace has ever known." The underground-base is the Combined Complex's *origin myth*.

#### Cluster 7 — Cute House Anchor (folded into Cluster 1)
- **Center:** the old town plaza at (0, 0, 500).
- **Role:** the *historical anchor*. The 2 Cute houses at the center of the plaza are the *founding structures* of the old town, marking the location where the historical `CuteHouse1/2` bots first placed them in the existing world.
- **Layout:** the 2 Cute houses face each other across a 30 × 30 block central plaza, with a 1-block-wide cobblestone path connecting them. The plaza has a 5-block-tall central fountain (built from stone brick and water, no schematic — hand-built), a 1 × 1 glass viewing window (see §6), and a founding plaque crediting the CuteHouse1/2 bots by name.

### 2.3 Historical sign for each re-placed schematic

Every re-placed schematic in the old town has a **1 × 1 oak sign on a fence-post** at its entrance or front face, with:

1. The schematic's name (e.g., "BIRCH HOUSE", `cozy-cabin.schem`).
2. A one-line origin note: "Placed by the mc-fleet-bot fleet, 2026" (or "Placed by CuteHouse1, 2026" for the historical Cute houses; or "The only existing underground build in the workspace" for the underground-base).
3. (For the Cute houses, the Space Mountain, and the underground-base) A *founding plaque* — a 2 × 1 oak sign on a lectern — with a longer narrative explaining the historical significance.

The historical signs are the *thematic spine* of the old town. The old town is not just a collection of re-placed schematics; it is a *museum of the bot fleet's work*, with each build credited to the schematic library it came from.

### 2.4 What is excluded from the old town

- **`Pokémon Temple Arena.schem`** — deferred to a separate coastal-plain attractions zone (see discussion-notes.md §4 tradeoff 1).
- **Watercraft** (`luxury-yacht.schem`, etc.) — there is no water in the old town footprint.
- **Beach content** (`beach-ball.schem`, `beach-chair.schem`, `beach-umbrella.schem`, `bbq-grill.schem`, `lifeguard-tower.schem`) — wrong era (2010s Minecraft beach is not the old town's 2010s vernacular) and wrong climate.
- **`holiday-express-train.schem`** — this is the rail spur's *mode*, not an old-town feature (it is a *visual* of the rail spur, not a static build).
- **Any schematic already used in the new city's 138 × 138 downtown** — to avoid duplication with the 04-masterplan's 8–10 generic downtown towers.
- **Any schematic that does not fit the 2010s vernacular era** — including modern apartments, white-modern-villa, and other *post-2010* surface content that is *more modern* than the new city (it would break the era gradient by being newer than the 1970s new city).

---

## 3. The Gateway Station (Two Pavilions)

The Gateway is the *single most important piece of integration architecture* in the project. It is the only place where the two worlds touch. The Gateway is *not* a "magic door"; it is a *threshold*, with a sign, a shelter, a written book, and a portal frame. The pavilions are mirrors — one stone-brick (the old world), one wooden (the new world) — both with the *same* obsidian portal frame.

### 3.1 Existing-world Gateway pavilion

- **Position:** (935, 60, 280) — 3 blocks south of the existing bot base.
- **Footprint:** 7 × 7 cross-section, 6 blocks tall (a single floor + a glass roof).
- **Material:** stone brick (the *older* material — the existing world is "stone", established, weathered).
- **Walls:** 1-block-thick stone brick, with 2-block-tall glass-pane windows on the north, south, east, and west faces (so the visitor can see out from inside the pavilion).
- **Roof:** light gray stained glass (a glass roof, per the Realist's contribution; lets the sun in and makes the pavilion feel *welcoming*).
- **Floor:** stone brick, with a 1 × 1 pressure plate in the center (the *entering* plate, which triggers a written-book update).
- **Portal frame:** 4 × 5 obsidian-and-glowstone end-portal frame in the *center* of the pavilion, oriented north-south. The frame is *visual* (the standard end-portal dimensions: 4 wide × 5 tall), but it is *not* a functional end-portal (it does not transport the player to The End). The frame is a *bespoke* portal frame, made of obsidian with glowstone in the corner notches, with a sign above it reading "GATEWAY TO THE COMBINED COMPLEX — 0,000 m".
- **Command block:** a `/tp` command block hidden *behind* the portal frame (1 block north of the frame's inner edge), running `tp @p 0 60 700` (the new world Gateway coordinates). The command block is invisible to the visitor; the visitor sees only the obsidian frame.
- **Furnishings:** a lectern with a *written book* titled "A Visitor's Guide to the Combined Complex," explaining the 6-stage journey (city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne) and crediting the 4 active bots (Lilly, Taylor, Marcus, Hazel) as the original explorers. A bench (oak stairs) along the north wall for visitors to sit and read.
- **Sign on the outside:** a 2 × 1 oak sign on a fence-post at the entrance, reading "GATEWAY TO THE COMBINED COMPLEX — 0,000 m FROM CITY CENTER — EST. 2026".

### 3.2 New-world Gateway pavilion (mirror)

- **Position:** (0, 0, 700) — the new world's southern coastal plain.
- **Footprint:** 7 × 7 cross-section, 6 blocks tall (matching the existing-world pavilion).
- **Material:** wooden (oak plank and spruce plank — the *newer* material; the new world is "wood", fresh, just-built).
- **Walls:** 1-block-thick oak plank, with 2-block-tall glass-pane windows on all four faces.
- **Roof:** light gray stained glass (matching the existing-world pavilion — the *only* material shared between the two pavilions, marking the seam).
- **Floor:** oak plank, with a 1 × 1 pressure plate in the center (the *arriving* plate, which triggers a *welcome* message in chat).
- **Portal frame:** 4 × 5 obsidian-and-glowstone end-portal frame, matching the existing-world pavilion exactly. Sign above reading "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER". A second `/tp` command block behind the frame running `tp @p 935 60 280` (the existing-world Gateway coordinates).
- **Furnishings:** a matching lectern with the *same* written book. A matching bench. A *minecart* on a 1-block-gauge rail extending out of the pavilion's south face (the rail spur's first block — see §5).
- **Sign on the outside:** matching 2 × 1 oak sign reading "COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER — EST. 2026".
- **1-block-wide dirt path** extending north from the pavilion's north face, leading 5 blocks to a small "Old Town → 425 m" sign, then continuing as the Grand Avenue.

### 3.3 The mirror design rationale

The two pavilions are *mirrors* — the same 7 × 7 cross-section, the same obsidian portal frame, the same sign typography, the same written book, the same glass roof. The only differences are:

- **Material:** stone-brick (old world) vs. wooden (new world). The material difference is the *era* difference: the old world is established, weathered, "stone"; the new world is fresh, just-built, "wood."
- **Direction of transit:** the old-world pavilion *sends* the visitor to the new world; the new-world pavilion *sends* the visitor back. The `/tp` command blocks are reciprocal.
- **Surroundings:** the old-world pavilion is at the *edge* of the existing bot base, on a forest floor; the new-world pavilion is on a *cleared* coastal plain, with the old town in the distance and the mountain range beyond.

The two pavilions together form a *single architectural object* that exists *across* the two worlds. The portal frame is the same frame; the visitor can see *through* it from either side.

### 3.4 The `/tp` mechanism

The discussion-notes.md §5 (open question 4) leaves the world-transit mechanism open: `/tp` command block vs. world-portal datapack. The design recommendation is:

- **MVP:** use a `/tp` command block. It is simple, vanilla, and works in any Minecraft version. The command block is hidden behind the obsidian frame, so the *visual* experience is "step through the portal, arrive in the new world." The *mechanism* is invisible.
- **Polish (post-MVP):** if the bot team has a world-portal datapack (a custom datapack that handles cross-world teleportation with screen-fade and sound effects), use it instead. The world-portal datapack is more elegant — it produces a visual portal effect (a fading screen, the End-portal sound, etc.) — but it requires custom code.

Either way, the *architecture* is the same: a 4 × 5 obsidian frame, a sign, a written book, and a hidden command mechanism.

---

## 4. The Grand Avenue

The Grand Avenue is **a 425-block stone-brick road, 8 blocks wide, running from the old town plaza (0, 0, 500) to the SE corner of the new city (60, 0, 70)**. The Grand Avenue is the *civic spine* of the new world — the road the visitor walks (or rides) to leave the old town and enter the new city. The Avenue is *not* a highway; it is a *promenade*, in the tradition of the Champs-Élysées, the Unter den Linden, and the Avenue de la Paz.

### 4.1 Geometry

- **Start:** old town plaza, (0, 0, 500).
- **End:** new city SE corner, (60, 0, 70).
- **Direction:** due north (Z-axis decreasing from 500 to 70). The Avenue is *straight* — real grand avenues are straight, not curved.
- **Length:** 425 blocks (Z = 500 → Z = 70, with a 5-block offset on the X-axis to align with the city's SE corner).
- **Cross-section (8 blocks total):**
  - **Road:** 4 blocks wide, centerline of the Avenue. Stone-brick surface (blocks 0–350) or granite-and-glass surface (blocks 350–425).
  - **Sidewalks:** 2 blocks wide, each side, raised 1 block above the road. Smooth stone surface.
  - **No planters** — the cross-section is intentionally Minecraft-pedestrian-friendly at 8 blocks, not Champs-Élysées-grand at 70 m. (The deliberation's compromise — see discussion-notes.md Topic 4.)
- **Total footprint:** 8 × 425 = 3,400 blocks of paved surface, plus 2 × 2 × 425 = 1,700 blocks of sidewalk. The Avenue is the *only* paved surface in the new world.

### 4.2 Material transition

The Avenue's material telegraphs the era shift:

- **Blocks 0–350 (the "old-town era" segment):** stone brick. Same material as the old town's plaza, same material as the Gateway pavilions' stone-brick old-world side. The visitor is *still* in the old town's material world.
- **Blocks 350–425 (the "city-era" segment):** granite-and-glass. The road surface is polished granite (matching the new city's surface palette per the 04-masterplan); the sidewalks are smooth stone with glass-pane inserts every 8 blocks (matching the new city's skyscraper material).
- **Transition at block 350:** a 5-block-long *gradient strip* where stone brick gives way to granite block-by-block, ending at the *villager-statue* pedestal (which sits *on* the transition). The transition is *visible* to the walking visitor.

### 4.3 The 6 statuary ornaments (founding-era markers)

The 6 statues are placed at 70-block intervals along the Avenue. Each statue sits on a 1-block-tall stone-brick pedestal at the *center* of the road's east sidewalk, with a 1 × 1 oak sign on a fence-post. The statues are the *civic ornaments* of the Avenue, in the tradition of monumental public sculpture.

| Block | Statue | Position | Sign |
|---|---|---|---|
| 70 | `teddy-bear` | east sidewalk, 1 block off the road | "TEDDY BEAR — A founding-era marker of the mc-fleet-bot fleet, 2026" |
| 140 | `macaw-statue` | east sidewalk | "MACAW STATUE — A founding-era marker of the mc-fleet-bot fleet, 2026" |
| 210 | `parrot-statue` | east sidewalk | "PARROT STATUE — A founding-era marker of the mc-fleet-bot fleet, 2026" |
| 280 | `flying-eagle` | east sidewalk | "FLYING EAGLE — A founding-era marker of the mc-fleet-bot fleet, 2026" |
| 350 | `villager-statue` | east sidewalk, *on* the material transition | "VILLAGER STATUE — The threshold of the new city" |
| 420 | `enderman` | east sidewalk, "boss" at the city approach | "ENDERMAN — ENTER THE CITY" |

The enderman at block 420 is the *boss* — a 1.6-block-tall statue that visually *blocks* the path to the city, with a sign reading "ENTER THE CITY." The visitor walks around the enderman to step into the new city. The enderman is the *threshold marker*, the last ornament of the old-town era and the first sight of the city-era.

### 4.4 The 3 milestones

The 3 signposts are the *Gameplay Advocate's compromise* — signposted waypoints that tell the visitor where they are on the Avenue. The signposts are 2 × 1 oak signs on 2-block-tall oak-fence posts, placed at the *center* of the road's west sidewalk (so they do not block the statues on the east side).

| Block | Milestone | Sign |
|---|---|---|
| 100 | "Old Town 1/4 mile" | "OLD TOWN 1/4 MILE — Castle Row to the east, Temple Hill to the west" |
| 250 | "Old Town Center" | "OLD TOWN CENTER — Cute House Plaza 250 m behind you, City Approaching 175 m ahead" |
| 400 | "City Approaching" | "CITY APPROACHING — Stream Crossing 25 m, New City 50 m, Public Shaft 175 m" |

The milestones are *narrative* — they tell the visitor *where they are* and *what is coming*. The 100-block milestone is past the castle and temple hills; the 250-block milestone is past the old town plaza; the 400-block milestone is past the enderman and approaching the stream.

### 4.5 The stream bridge

At block 380 (just before the villager-statue at 350 — wait, the villager-statue is at 350, so the stream bridge is at 380, *after* the villager-statue and *before* the enderman), the Avenue crosses a 3-block-wide stream that flows from the mountain southward toward the coastal plain. The bridge is:

- **5-block-wide** stone-brick arch (1 block wider than the stream, with 1-block shoulders on each side).
- **3-block-long** (the bridge spans the 3-block-wide stream).
- **1-block-tall** railings on each side (stone-brick walls, 1 block high, with 1-block gaps for visibility).
- **Surface:** stone brick (the old-town era material — the bridge is *before* the material transition).

The bridge is the *civic crossing* from old to new. Below the bridge, the stream flows south into the coastal plain; the visitor can see the old town from the bridge and the new city beyond.

### 4.6 Lighting

The Avenue is *lit at night* — a continuous line of sea lanterns every 10 blocks, mounted on 2-block-tall oak-fence posts at the *edge* of the road (between the road and the sidewalk). The sea lanterns are the *same* lanterns used in the 04-masterplan's SubTropolis chamber and Cheyenne chamber — they mark the Avenue as a *deliberate architectural object*, not just a road.

The Avenue is also *flanked* by the 6 statues (which are themselves lit by their own pedestal-mounted sea lanterns) and the 3 milestones (which have a single sea lantern on top of the signpost). The result is a continuously-lit promenade, visible from the new city and from the old town plaza at night.

### 4.7 The visitor experience

The visitor's experience on the Grand Avenue is a *deliberate* sequence:

1. **Depart the old town plaza** (block 0). The Cute houses are behind you; the Avenue stretches ahead.
2. **Walk past the teddy-bear** (block 70). The first statue. The Avenue is wide; the surrounding terrain is empty coastal plain.
3. **Cross the 100-block milestone** (block 100). "Castle Row to the east, Temple Hill to the west." Look left, look right — the hills are visible.
4. **Walk past the macaw** (block 140). The Avenue continues. The new city's silhouette is barely visible in the distance.
5. **Walk past the parrot** (block 210). The Avenue continues. The new city's silhouette is clear.
6. **Cross the 250-block milestone** (block 250). "Cute House Plaza 250 m behind you, City Approaching 175 m ahead." You are halfway.
7. **Walk past the flying eagle** (block 280). The material is still stone brick. The new city is *close*.
8. **Cross the 350-block threshold** (block 350). The villager-statue marks the *material transition*. Stone brick gives way to granite. The era shifts.
9. **Cross the stream bridge** (block 380). The bridge is a *visible* marker — the water flowing below, the old town behind, the new city ahead.
10. **Cross the 400-block milestone** (block 400). "City Approaching." The new city is *very close*.
11. **Confront the enderman** (block 420). The statue *blocks* the path. "ENTER THE CITY." Walk around it.
12. **Step into the new city** (block 425). The Avenue ends at the SE corner. The city streets begin.

The full walk is **10–12 minutes** at a Minecraft walking pace. The visitor is *never bored* — the 6 statues, the 3 milestones, the material transition, the stream bridge, and the enderman are 12 distinct visual events in a 425-block walk.

---

## 5. The Coastal-Plain Rail Spur

The coastal-plain rail spur is **a 960-block, 3-block cross-section passenger minecart line from the new world Gateway station (0, 0, 700) to the city approach station (0, 0, 70)**, with a spur into the old town station at (0, 0, 500). The rail spur is the *logistics layer* — the new world's first piece of transit infrastructure, and the bot fleet's continued supply chain.

### 5.1 Geometry

- **Start:** new world Gateway station, (0, 0, 700).
- **End:** city approach station, (0, 0, 70). The spur continues through the portal to the existing bot base at (935, 60, 300).
- **Direction:** due north (Z-axis decreasing from 700 to 70), with a *spur* branching west to the old town station.
- **Length:** 960 blocks total (Z = 700 → Z = 70 on the main line, plus a 50-block spur west to the old town station).
- **Cross-section (3 blocks total):**
  - **Rail:** 1 block wide, centerline. Powered rail every 8 blocks, regular rail otherwise.
  - **Walkway:** 1 block wide, east side. Oak-plank surface.
  - **Utility strip:** 1 block wide, west side. Grass surface (or dirt where redstone runs underneath).
- **Gauge:** 1-block-gauge (Minecraft standard, accepted for playability per the Realist's compromise in discussion-notes.md Topic 5).
- **Mode:** passenger minecart (not freight). The visitor sits in the minecart and *watches* the new world scroll by.

### 5.2 Material

- **Rail ties:** smooth stone slabs (era discipline: 1970s Houston-modern, distinct from the stone-brick Grand Avenue and the granite-and-glass city).
- **Powered rail:** standard Minecraft powered rail, with a redstone torch underneath each one (visible redstone dust on the utility-strip side).
- **Walkway:** oak-plank.
- **Utility strip:** grass (or dirt where redstone runs).

The smooth-stone-slab material is the *era marker*: the rail spur is *modern*, not historical. The visitor can tell, just by looking at the surface, that the rail is a *new-world* build.

### 5.3 Route geometry

The spur runs **north-south** along the X = 0 axis, *bypassing* the old town on the east side (the spur is at X = 200, not X = 0 — see below). A short *spur* branches west from the main line to the old town station.

- **Main line:** from (200, 0, 700) to (200, 0, 70). 630 blocks. The new world Gateway station is at (200, 0, 700), connected to the *pavilion* at (0, 0, 700) by a 200-block east-west rail connector (this connector is the *first* 200 blocks of the spur — the pavilion to the spur).
- **Spur to old town station:** from (200, 0, 500) west to (0, 0, 500). 200 blocks. The spur branches west at Z = 500 and terminates at the old town station.
- **Total:** 200 (pavilion connector) + 630 (main line) + 200 (old town spur) − 70 (the old town spur overlaps the last 70 blocks of the main line) = **960 blocks** of rail.

Wait — re-checking the deliberation: the deliberation specifies 960 blocks total. The actual geometry is:

- **Pavilion connector:** (0, 0, 700) → (200, 0, 700) — 200 blocks east.
- **Main line:** (200, 0, 700) → (200, 0, 70) — 630 blocks north.
- **Old town spur:** (200, 0, 500) → (0, 0, 500) — 200 blocks west.
- **Total track length:** 200 + 630 + 200 = **1,030 blocks**.

This is 70 blocks more than the deliberation's 960. The design team should *confirm* the geometry: either the rail is 1,030 blocks (with the pavilion connector counted), or 960 blocks (with the pavilion connector *not* counted, since the spur *starts* at (200, 0, 700)). The recommendation is **960 blocks main+spur + 200 blocks pavilion connector = 1,030 blocks total**, with the 960 specified by the deliberation being the *main+spur* length. **This is an open item** for the design team to resolve.

### 5.4 The 3 named stations

- **New world Gateway station** at (200, 0, 700): a 7 × 7 oak-plank platform with a sign reading "NEW WORLD GATEWAY — Combined Complex Rail Spur," connected to the pavilion at (0, 0, 700) by a 200-block east-west rail. The platform has a *powered rail activator* (a stone button that launches the minecart), a chest with 4 spare minecarts, and a sign listing the cities served: "Cities: Old Town Plaza, City Approach." A 1-block-wide dirt path connects the platform to the pavilion.
- **Old town station** at (0, 0, 500): a 5 × 7 spruce-plank platform with a sign reading "OLD TOWN STATION — Cute House Plaza 30 m east." The platform is at the *western edge* of the old town plaza, with a 1-block-wide oak-plank path connecting it to the Cute houses. Passengers disembark to walk the plaza and visit the 7 clusters.
- **City approach station** at (200, 0, 70): a 7 × 7 stone-brick platform with a sign reading "CITY APPROACH — Grand Avenue 425 m south, City Center 138 m north." Passengers disembark to walk the Grand Avenue into the city, or to take a *shortcut* (the city approach station is also the *terminus* of a 1-block-gauge *city streetcar* that runs through the new city's downtown — this is a future extension, see the development plan).

The old town station is on the *west* spur; the city approach station is at the *north end* of the main line. The new world Gateway station is at the *south end* of the main line, with a 200-block east-west connector to the pavilion.

### 5.5 Powered rail and redstone

- **Powered rail every 8 blocks** on the centerline (1 powered rail, 7 regular rails, repeat). Powered rails keep the minecart at full speed.
- **Redstone torch** under each powered rail (on the utility-strip side), visible to the visitor from the walkway.
- **Redstone repeater** every 16 blocks (between powered rails) to maintain the signal.
- **Power source:** a single redstone block at the new world Gateway station, with redstone dust running the length of the spur. The dust is *visible* on the utility-strip side, marking the spur as a *deliberate* piece of infrastructure.

### 5.6 Why bypasses the old town

The spur runs at X = 200, *east* of the old town center at X = 0. The bypass is *intentional*: the old town is *pedestrian-only* (a "historical district" with cobblestone-and-oak internal roads, no transit), and the spur is *transit-only*. The two systems do not share right-of-way. The old town spur branches west to the old town station, so passengers can disembark to walk the plaza, but the spur does not *enter* the old town proper.

The bypass also gives the old town a *quieter* character: the old town's only sounds are footsteps, the fountain, and the bot fleet's occasional chatter. The spur's minecart wheels and redstone hum are *east* of the plaza, audible but not intrusive.

### 5.7 Data layer integration

- **1 new route** `rte_coastal_plain_rail_spur` in a new `routes.json` file (which does not currently exist — to be created).
- **3 new station markers** in `markers.json`: `mkr_spur_new_world_gateway`, `mkr_spur_old_town`, `mkr_spur_city_approach`.
- **1 supply chain** in a new `supply_chains.json` file (currently empty): powered-rail maintenance — rails, powered rails, redstone, minecarts as recurring supplies.
- **1 squad** mapped from the 6 empty squads: `sqd_svc_tunnel_maintenance` is extended to cover the rail spur (the service-tunnel maintenance squad is also the rail-spur maintenance squad).

---

## 6. The Underground Easter Egg

The underground easter egg is **one, only one**: the `underground-base.schem` (1,048 bytes, the only existing underground build in the entire workspace), placed in the old town at (−50, 0, 550), partially buried. The easter egg is the *origin myth* of the Combined Complex.

### 6.1 Position and form

- **Position:** (−50, 0, 550) — 50 blocks west of the old town plaza, in the *residential* cluster's western edge.
- **Form:** partially buried, with the schematic's floor at Y = −3 (just below surface grade) and its roof at Y = +2. The schematic is a 5 × 5 × 3 enclosed room (per the research; to be confirmed by the schematic-inspector step).
- **Entrance:** a 1-block-wide opening at the *back* of a residential house (the `mushroom-cottage` placed at the western edge of the residential cluster). The entrance is at the cottage's basement level, with a 1 × 1 oak door.
- **Burial:** 2–3 blocks of dirt and cobblestone above the schematic's roof, with a single oak sign on a fence-post at the surface: "THIS STRUCTURE IS THE ONLY EXISTING UNDERGROUND BUILD IN THE WORKSPACE. IT WAS THE SEED OF THE COMBINED COMPLEX. THE SUBTROPOLIS CHAMBER IS ITS DESCENDANT."

### 6.2 Interior

- **A small chest** (1 chest) at the center of the schematic's floor, containing:
  - A *written book* (the same written book from the Gateway station, plus a single "SubTropolis Engineer" name tag).
  - 1–2 stone tools (a stone pickaxe, a stone shovel) — period-appropriate to the schematic's era.
- **A redstone lamp** that toggles when the player enters (pressure plate at the entrance, 1-block redstone dust to the lamp).
- **No unique items** beyond the name tag and tools. The chest is *historical*, not *loot*.

### 6.3 Glass viewing window

A **1 × 1 glass block in the floor of the old town central plaza at (0, 0, 500)**, with a 1 × 1 oak sign on a fence-post explaining that the underground-base is *below*. The glass window is the *first vertical view of underground from above* in the new world, foreshadowing the Combined Complex's public shaft (which is also a vertical view from surface to underground).

The glass window is placed in a *discreet* location — a corner of the plaza, near the Cute houses, not at the center — so the visitor has to *find* it. The sign explains: "LOOK DOWN — THE FIRST UNDERGROUND BUILD IN THE WORKSPACE LIES BENEATH YOU."

### 6.4 Pre-build requirements

The design team must **inspect the schematic** with a schematic-inspector tool before placing it:

- **Confirm contents:** the `.schem` format is gzipped NBT; a simple Python or Node.js script can parse it. The script must report the schematic's footprint (X, Y, Z dimensions), the block types, and any tile entities (chests, signs, etc.).
- **Check for legacy block IDs:** the schematic may contain blocks that no longer exist in the current Minecraft world version. The test must be run in a *sandbox* world, not the production bot world.
- **Fallback:** if the schematic has compatibility issues, build a hand-built replica at the same location (a 5 × 5 × 3 stone-brick room with a chest, a crafting table, and a redstone lamp). The replica must be *visually* similar to the schematic, with the same historical sign.

The schematic-inspector tool is **not currently in the workspace**. The design team must either build one (recommended — a small Python or Node.js script) or use a third-party tool (e.g., the Sponge schematic inspector).

---

## 7. The Visitor Journey

The visitor has **two origin points** — the new world (default spawn, the primary experience) and the existing bot world (a secondary visit). The full journey is a **60–90 minute linear descent** through 6 named markers, with a *single return portal* at the end. Fast travel is available *after* the first descent, not on it.

### 7.1 The two origin points

- **New world (default spawn):** the visitor arrives at the new world Gateway station at (0, 0, 700), with a sign reading "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER." This is the visitor's *first* experience.
- **Existing bot world (secondary visit):** the visitor can `/tp` from the existing bot base to the new world via the existing-world Gateway pavilion at (935, 60, 280). The pavilion is a *deliberate architectural object* (stone-brick, obsidian frame, written book), so the existing world is not experienced as a *throwaway*.

The default spawn is the *new world* because the new world is the *primary experience* — the existing world is the *vestibule*, not the *destination*. A visitor who wants to see the existing world can do so as a *secondary visit* (e.g., to read the CuteHouse1/2 founding plaques or to see the existing bot base's starter kit).

### 7.2 The full journey (60–90 minutes, one-way descent)

| Stage | Time | Marker | What happens |
|---|---|---|---|
| 1. **Spawn at new world Gateway** | 0 min | `mkr_new_world_gateway` (0, 0, 700) | Visitor arrives at the wooden pavilion. Reads the sign, the written book, the founding plaque crediting the 4 active bots. |
| 2. **Walk to old town** | 10 min | (walk the rail spur to old town station, or walk the dirt path north) | The visitor can ride the rail spur (5 min) or walk the dirt path (15 min). Either way, the old town plaza comes into view. |
| 3. **Explore old town** | 15 min | `mkr_old_town_center` (0, 0, 500) | Walk the 7 clusters, read the historical signs, find the underground easter egg, see the Space Mountain tourist attraction, find the glass viewing window in the plaza floor. |
| 4. **Walk Grand Avenue to new city** | 10 min | `mkr_grand_avenue_center` (0, 0, 285) | Walk the 425 blocks: 6 statues, 3 milestones, the material transition, the stream bridge, the enderman. Arrive at the city's SE corner. |
| 5. **Explore new city** | 10 min | `mkr_city_center` (0, 0, 0) | Walk the 138 × 138 downtown, see the 4 anchor towers, the skyscrapers, the Wells Fargo-style descent, the Houston tunnel entrance. |
| 6. **Public shaft descent** | 5 min | `mkr_public_shaft_top` (60, 0, −70) | Take the lift down 100 blocks. Mid-landing at Y = −50 with a viewing window. Arrive at the SubTropolis chamber. |
| 7. **SubTropolis exploration** | 15 min | `mkr_subtropolis_chamber_center` (0, 0, −300) | Walk the 200 × 200 limestone grid, see the room-and-pillar mine, the Houston tunnel entrance. |
| 8. **Service tunnel minecart ride** | 5 min | `mkr_service_tunnel_contact_crossing` (−40, 200, −360) | Take the minecart through the rock, past the contact crossing, up to the Cheyenne chambers. |
| 9. **Cheyenne exploration** | 10 min | `mkr_cheyenne_outer_portal` (0, 200, −420) | Open the 25-ton blast door, enter the Cheyenne chamber, see the 1966 NORAD-style architecture. |
| 10. **Return** | 10 min | `mkr_cheyenne_return_portal` (0, 200, −420) | Take the funicular to the granite summit (Y=800), then the summit road switchbacks down to the city. Total ~13 min. |

The full journey is **80 minutes** at the midpoint of the 60–90 minute target. A fast visitor can complete it in 60; a thorough visitor can spend 90.

### 7.3 The 6 named markers (fast travel destinations)

After the first descent, the visitor can `/tp` to any of the 6 named markers via a command-block menu at the new world Gateway station. The 6 markers are:

1. `mkr_old_town_center` (0, 0, 500) — the old town plaza.
2. `mkr_grand_avenue_center` (0, 0, 285) — the Grand Avenue midpoint.
3. `mkr_city_center` (0, 0, 0) — the new city center.
4. `mkr_public_shaft_top` (60, 0, −70) — the public shaft entrance.
5. `mkr_subtropolis_chamber_center` (0, 0, −300) — the SubTropolis chamber center.
6. `mkr_cheyenne_outer_portal` (0, 200, −420) — the Cheyenne outer portal.

(The 6 markers do not include `mkr_service_tunnel_contact_crossing` (−40, 200, −360), which is on the service tunnel route but not a fast-travel destination — the service tunnel is a one-way minecart ride, not a teleportable waypoint.)

Fast travel is *not* available on the first descent — the visitor must walk the journey the first time. This is the *pilgrimage rule*: the first time is the *intended experience*.

### 7.4 The return portal

At the Cheyenne outer portal (0, 0, −420), a **single portal frame** in obsidian-and-glowstone, with a sign reading "RETURN TO GATEWAY." A hidden `/tp` command block runs `tp @p 935 60 280` — the existing-world Gateway station coordinates.

The return portal is a *deliberate architectural object*, not a `/tp` command alone. The visitor must *step through* the obsidian frame to return. The frame is the *threshold* between the new world and the existing world.

### 7.5 Data layer

- **1 new named route** `rte_visitor_journey_full` in `routes.json` — covers the full 6-marker descent.
- **6 markers** (already specified in Topic 5 + 04-masterplan) — the fast-travel destinations.
- **1 new return portal marker** `mkr_cheyenne_return_portal` at (0, 0, −420).

---

## 8. Inter-Build Coordination

The map integration requires coordination between the **bot fleet, the schematic library, the data layer, and the design team**. The decisions in this document must be honored across all four.

### 8.1 For the bot fleet (existing 4 active bots + 9 historical)

- **The 4 active bots (Lilly, Taylor, Marcus, Hazel) stay in the existing world.** They do not migrate to the new world. The existing bot base at (≈935, 60, 300) is preserved.
- **The 2 queued missions are re-targeted:**
  - `birch house` mission: from (904, 79, 390) in the existing world → (0, 0, 480) in the new world's residential cluster.
  - `md castle 2` mission: from (973, 1, 453) in the existing world → (200, 0, 500) in the new world's castle cluster.
  - The bot team updates the mission coordinates in `data/missions.json`.
- **The 6 empty squads are mapped to 6 named squads:**
  - `sqd_che_outer_portal_guard` — guards the Cheyenne outer portal.
  - `sqd_sub_chamber_patrol` — patrols the SubTropolis chamber.
  - `sqd_pub_shaft_operator` — operates the public shaft.
  - `sqd_svc_tunnel_maintenance` — maintains the service tunnel *and* the rail spur.
  - `sqd_old_town_ranger` — patrols the old town.
  - `sqd_service_tunnel_response` — responds to events at the service tunnel contact crossing.
- **The 6 placeholder markers are mapped to 6 named markers:** `mkr_city_center`, `mkr_public_shaft_top`, `mkr_subtropolis_chamber_center`, `mkr_service_tunnel_contact_crossing`, `mkr_cheyenne_outer_portal`, `mkr_old_town_center`.

### 8.2 For the schematic library

- **30–35 schematics are re-placed** in the new world's old town per §2.
- **The `underground-base.schem` must be inspected** before placement to confirm contents and check for legacy block IDs.
- **The `Pokémon Temple Arena.schem` filename should be renamed** to plain ASCII (e.g., `pokemon-temple-arena.schem`) to fix the mojibake encoding. The file is *deferred*, not dropped — when it is placed in the future "attractions zone," the filename should be ASCII-clean.
- **The schematic library is now a *content library* for both worlds**, not just the existing world. Bot team build missions should reference the library's file names directly.

### 8.3 For the data layer

- **`data/markers.json`:** 6 placeholder markers → 6 named markers + 2 new Gateway markers + 3 new rail spur station markers + 1 Grand Avenue marker + 1 underground easter egg marker + 1 Cheyenne return portal marker + 1 service-tunnel-contact-crossing marker = **14 markers** in the new world (8 new, 6 renamed from placeholders, plus the 2 Gateway markers — wait, the Gateway markers are *separate* from the 6 named markers, so the total is 14).
- **`data/zones.json`:** 2 placeholder "Mining Area" zones → 2 named zones (`zne_subtropolis_chamber`, `zne_cheyenne_chamber`), with the spatial extents from the 04-masterplan.
- **`data/squads.json`:** 6 empty squads → 6 named squads (per §8.1).
- **`data/routes.json`:** a *new file* (does not currently exist). Contains 2 named routes: `rte_coastal_plain_rail_spur`, `rte_visitor_journey_full`.
- **`data/supply_chains.json`:** a *new file* (currently a 2-byte empty array). Contains 1 supply chain for the rail spur's powered-rail maintenance.
- **`data/missions.json`:** the 2 queued missions are re-targeted to the new world's old town.
- **`data/commands.json`:** the 1 historical `walk_to_coords(100, 64, 200)` command is *resolved* — the destination is now the new world's old town at (0, 0, 500), so the command is marked as completed and re-targeted.

### 8.4 For the design team (downstream)

- The design team must **build the new world** with the specifications in this document + the 04-masterplan.
- The design team must **build the 7 clusters of the old town** per §2.
- The design team must **build the Gateway pavilions** in both worlds per §3.
- The design team must **build the Grand Avenue** per §4.
- The design team must **build the rail spur** per §5.
- The design team must **inspect the `underground-base.schem`** before placing it per §6.
- The design team must **implement the return portal at the Cheyenne outer portal** per §7.
- The design team must **create the new data files** (`routes.json`, `supply_chains.json`) per §8.3.

---

## 9. Easter Eggs (Integration-Specific)

The map integration has **6 named easter eggs**, each tied to a specific design decision:

1. **The 2 matching Gateway pavilions.** Stone-brick in the old world, wooden in the new world, both with the same obsidian portal frame. The pavilions are *mirrors* across the two worlds. The visitor who steps from one to the other sees the *same architecture*, in two materials.
2. **The `underground-base.schem` as the root cellar.** The only existing underground build in the entire workspace, placed at (−50, 0, 550), partially buried, with a glass viewing window in the old town plaza. The Combined Complex is its *descendant*.
3. **The historical sign for each re-placed schematic.** Every build in the old town has a 1 × 1 oak sign crediting the schematic library and the bot fleet. The old town is a *museum of the bot fleet's work*.
4. **The Space Mountain as the old town tourist attraction.** The 58 KB theme-park build is the old town's *Disneyland* — the place visitors go to *see*. It is the *largest* existing schematic, and its placement is *intentional*: the largest existing schematic is the most *public* structure in the old town.
5. **The Cute house as the historical anchor.** The 2 Cute houses at the plaza center are the *founding structures* of the old town, marking the location where the historical `CuteHouse1/2` bots first placed them. The plaza has a founding plaque crediting the bots by name.
6. **The stream bridge on the Grand Avenue.** A 5-block-wide stone-brick arch at block 380, crossing the stream that flows from the mountain. The bridge is the *civic crossing* from old to new, and the water below connects the old town's surface to the new city's underground.

The 6 easter eggs are the *thematic spine* of the map integration. They are the *moments* a visitor remembers: stepping through the obsidian frame, looking down through the glass window, reading the historical sign, riding the minecart past the Space Mountain, standing between the 2 Cute houses, crossing the stream bridge.

---

## 10. Lighting Plan

The map integration's lighting is a *deliberate era marker* — the lighting *style* changes between the old town, the Gateway, the Grand Avenue, the rail spur, and the underground easter egg.

### 10.1 Old town (1970s feel)

- **Primary lighting:** torch + lantern. The old town uses Minecraft's standard torch (placed on walls and fence-posts) and lantern (placed on the 2 Cute houses' entrances and the castle cluster's gatehouse). The torch/lantern combination is the *vernacular* Minecraft lighting of the 2010s.
- **Density:** 1 light source per 8–10 blocks, with extra lights at the plaza center (fountain), the historical-sign posts, and the cluster entrances.
- **Era marker:** the torch/lantern lighting is *warm* and *low* — the old town is *darker* at night than the new city. The visitor notices the lighting shift when they step onto the Grand Avenue.

### 10.2 Gateway pavilions (decorative)

- **Primary lighting:** sea lantern + glowstone. The pavilions use 1 sea lantern at the center of the ceiling (visible through the stained-glass roof) and 4 glowstone blocks at the corners of the obsidian portal frame. The sea lantern + glowstone is *brighter* and *cleaner* than the old town's torch/lantern — the pavilions are *architectural objects*, not vernacular buildings.
- **Density:** 5 light sources per pavilion (1 sea lantern + 4 glowstone). The pavilions are *always* lit, even at night.
- **Era marker:** the pavilions are the *only* structures in the entire map integration with glowstone lighting. The glowstone marks them as *civic* objects, distinct from the surrounding vernacular.

### 10.3 Grand Avenue (lit at night)

- **Primary lighting:** sea lantern every 10 blocks, mounted on 2-block-tall oak-fence posts at the *edge* of the road (between the road and the sidewalk). The Avenue is *continuously* lit, with no dark gaps.
- **Density:** 1 sea lantern per 10 blocks = 43 sea lanterns on the 425-block Avenue.
- **Era marker:** the sea-lantern lighting is *bright* and *even* — the Avenue is a *modern* urban-design choice (per the Champs-Élysées tradition), with deliberate, periodic lighting. The Avenue is the *best-lit* surface in the new world.

### 10.4 Rail spur (functional)

- **Primary lighting:** redstone lamp every 8 blocks, alongside the powered rails. The redstone lamps are *functional* (they mark the powered-rail locations for maintenance) and *decorative* (they light the spur for night riding).
- **Density:** 1 redstone lamp per 8 blocks = 120 redstone lamps on the 960-block spur.
- **Era marker:** the redstone-lamp lighting is *red-tinted* (the default redstone-lamp color) and *industrial* — the spur is a *logistics* layer, not a civic promenade.

### 10.5 Underground easter egg (single)

- **Primary lighting:** 1 soul lantern inside the schematic, placed at the center of the ceiling. The soul lantern is *blue-tinted* and *atmospheric* — the underground easter egg is the *only* underground feature in the new world outside the Combined Complex itself, and the soul-lantern lighting marks it as *subterranean*.
- **Density:** 1 light source total. The interior is *dim*.
- **Era marker:** the soul lantern is the *same* lighting used in the 04-masterplan's SubTropolis chamber and Houston tunnel — the underground-base is *visibly* part of the same underground world.

---

**End of design plan.** This document is the *architectural contract* between the deliberation panel's decisions and the downstream AI contractor brief. The 10 sections above specify the integration architecture in enough detail for the contractor to build the map integration without further design input. Open items are listed in §11 of the development plan (`development-plan.md`).
