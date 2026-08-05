# The Combined Complex — Research Report

> **AUTHORITY NOTICE — RESEARCH HISTORY ONLY.** This report preserves early ravine-era reasoning. It does not control geometry. The reconciled no-ravine local composition is defined by `../02-design/site-coordinates.json` and `../04-contractor/contractor-brief.json`; current-world placement and the plan to develop are owned by `../../05-combined-zones/MASTERPLAN.md`. See `../AUTHORITY.md`.

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex (Cheyenne Mountain + SubTropolis + Houston Tunnel System)
**Research Lead:** General-purpose research agent
**Date prepared:** 2026
**Status:** Research only. Integration design is a downstream task.

> This is the **integration** research package for the three previously-designed underground/mountain installations. The three individual masterplans (Cheyenne Mountain, SubTropolis, Houston Tunnel System) are the *what*; this report is the *how they live together*. The downstream design team will read this before planning the inter-site connections, the city-in-the-valley, the public shaft, and the service tunnel.
>
> **Headline conclusion:** The user-proposed layout — a city above the Houston tunnel system, in a valley between a mountain range split by a deep ravine, with Cheyenne on the north wall and SubTropolis on the south wall — is **geologically defensible, precedent-rich, and visually iconic**. It maps directly onto real-world integrations in Switzerland (Gotthard/Sasso da Pigna/La Claustra), Finland (Helsinki underground master plan), the U.S. (Federal Relocation Arc / Site R / Mount Weather), and a half-dozen other analogues. The downstream design team can build this with high confidence.

---

## 1. Executive Summary

The **Combined Complex** is a single Minecraft world that brings together three real-world underground/mountain installations in one coherent geography: the **Cheyenne Mountain Complex** (NORAD Cold War bunker) carved into the **granite** north side of a deep ravine, the **SubTropolis** underground business park cut into the **limestone** south side of the same ravine, and the **Houston Tunnel System** running under a **city** placed in the valley between the mountain range and a coastal plain. The ravine is the visual and circulation spine of the world — the descent into it is the build's central journey. Above, a sunlit, hot, dense city hums on two levels (street and skybridge); at street grade, the public shaft entrance to SubTropolis marks the civilian transition; down the ravine walls, the SubTropolis entrance on the south face and the Cheyenne tunnel portal on the north face face each other across the gorge, connected at the bottom by a service tunnel. This is not a fantasy collage: the **Helsinki underground master plan** (~10 million m³ of underground space, 400+ premises, 90 dual-use civil-defense/civilian facilities, 5,500 shelters for ~1 million people in a city of 700,000) is a real-world model of civilian underground + civilian surface living on top of military/civil-defense underground space; the **Swiss Réduit national** (Sasso da Pigna, Festung San Carlo, the AlpTransit/Gotthard Base Tunnel) is a real-world model of military + commercial + civilian mountain infrastructure sharing one Alpine massif; and the **U.S. Federal Relocation Arc** (Mount Weather, Site R/Raven Rock, Greenbrier, plus the "warm standby" Cheyenne Mountain itself) is a real-world model of defense-in-depth — geographically dispersed sites of graded hardness serving different functions at different depths. The combined complex is, in short, **Helsinki + Switzerland + Colorado Springs on one map** — and Minecraft is uniquely well-suited to render all three layers (above ground, in the ravine walls, deep underground) because of its native stack of build heights, voxel scale, and lighting model.

---

## 2. The Combined-Complex Concept

### 2.1 The user-directed layout

The user described the layout in plain language: *"build a city above the houston tunnel system, and have it under that city and then have the other 2 close by in the mountains, you go down a revine and then one is on each side maybe?"*

This is a **3-zone vertical stack** with a **lateral mountain-to-mountain axis**:

1. **Surface city (top)** — Houston-tunnel city above, with the tunnels running underneath. Tall office buildings, two pedestrian layers (surface + tunnel), skybridges, the Wells Fargo–style public street-level tunnel entrance on the surface as the civilian anchor.
2. **Valley + ravine (middle)** — the city sits in a valley; the valley narrows into a deep V-shaped ravine; the ravine splits a mountain range into two halves. A stream or seasonal river runs along the ravine bottom.
3. **Mountain flanks (sides)** — on the **north face of the ravine**: granite mountain with the Cheyenne Mountain Complex carved inside. On the **south face**: limestone mountainside with the SubTropolis business park cut horizontally into the bluff.
4. **Coastal plain (one side)** — the city opens out to a flatter coastal-plain side; this is where the rail/road arrival happens, the airport sits, and the city thins out into the plain.

This is a **continuous gradient from public-and-soft → industrial-and-shallow → military-and-deep** that follows a single physical axis: descent. A civilian can be on the city's hottest street corner and within a 10-minute Minecraft walk be inside the granite chamber that is rated to survive a 30-megaton detonation at 1.2 miles.

### 2.2 Why this is a coherent design

Three reasons:

1. **Geological coherence.** Real mountain ranges have *stratigraphic* variation — granite intrusions next to limestone next to sandstone — and ravines are how those layers are exposed at the surface. A single mountain range with one granite half and one limestone half, split by a ravine, is a *plausible* geological feature, not a forced one. (See §4 for the geology in depth.)
2. **Precedent coherence.** Switzerland is the master precedent: the Gotthard massif hosts, simultaneously, a NATO-compatible military command bunker (Sasso da Pigna, declassified 1998), a civilian hotel carved from a former bunker (La Claustra, in Festung San Carlo), the world's longest railway tunnel (Gotthard Base Tunnel, 57 km, opened 2016), and the town of Airolo living in the valley below. The Swiss do not consider this odd; they consider it infrastructure. (See §3.)
3. **Defense-in-depth coherence.** The real world builds *layered* underground infrastructure: surface (civilian) → shallow (industrial/commercial) → deep (military) → harder (Continuity-of-Government). The combined complex is exactly that stack, in a single world, along a single axis. (See §7.)

### 2.3 The user-stated design rules

- *"Go deep"* — the build must commit to depth. Cheyenne is a hollow mountain with 1,800+ ft of rock above. The vertical scale of the build is the build.
- *"Everything should be declassified"* — the build can show the real Cheyenne Mountain, the real SubTropolis, the real Houston tunnels. Real names, real numbers, real tenants, real blast doors. No mystery black-box bunkers; this is a public-facing tour of a real-world complex.
- *"Have it under that city"* — the Houston tunnels *are* under a city. The city is the surface; the tunnels are the basement. The build's defining visual moment is the descent from a sunlit Houston sidewalk into a 72 °F beige-tile tunnel corridor.

---

## 3. Real-World Precedents

The strongest evidence that this combined layout *works* comes from the fact that other countries have built versions of it. Below is the survey, ordered by relevance to the build.

### 3.1 Switzerland — the Sasso da Pigna / Festung San Carlo / AlpTransit model

The **Swiss Réduit national** (Reduit) was a WWII-era strategy to fall back into the Alps and hold the Alpine passes indefinitely. Three fortress complexes anchored it: **St. Maurice**, **St. Gotthard**, and **Sargans**. The Gotthard anchor is the most relevant.

- **Fort Sasso da Pigna** (Festung A 8385) sits on the Gotthard Pass, built 1941–1943 as part of the Réduit, operational 1943–1999, declassified 2001, opened to the public as the **Sasso San Gottardo Museum** on 25 August 2012. It consists of 2,400 m of galleries, four 105 mm gun positions, a 500-man garrison, an 87-bed hospital, and provisions for self-sufficient operation for months. The full museum complex is ~3.2 km of tunnels open to the public. [1][2][3]
- **Festung San Carlo** (A 8390), 300 m north of the Gotthard Pass summit, is the prototype Réduit artillery fortification, built 1942, decommissioned 1998–1999, declassified, and converted in 1998–2004 by artist **Jean Odermatt** into **La Claustra** — a four-star "underground monastery" hotel and seminar center with 17 rooms, 25 beds, dining hall, bistro, library, spa, and 6 conference rooms for up to 350 people. The 4,000 m² complex sits at 2,050 m above sea level, 200 m back from a 200 m entrance tunnel bored into the Gotthard massif. The hotel closed in 2010 for financial reasons, was bought for CHF 1,000 by entrepreneur Rainer Geissmann, and reopened in September 2015. The site has been used for art installations and pop-up events. [4][5][6][7]
- **Gotthard Base Tunnel**, 57.09 km long, opened 1 June 2016, is the world's longest and deepest railway tunnel, with up to 2,300 m of rock cover, cost CHF 12.2 billion over 17 years of construction. It runs under the same Gotthard massif that hosts the Sasso da Pigna and La Claustra. Two single-track tubes, each passable by 250-km/h passenger and 100-km/h freight trains, plus cross-passages every 325 m. [8][9]
- **The town of Airolo** sits in the valley floor below all of this, at 1,179 m above sea level, with a cheese dairy (Caseificio del Gottardo) at the Airolo-Pesciüm cable car station and tourist traffic feeding all three sites. [3]

**Why this matters for the build:** Switzerland is the real-world proof that a *single* mountain can simultaneously host a hardened military bunker, a converted-to-civilian-use former bunker, a record-setting civilian transport tunnel, and a civilian town in the valley below — and that this can be operated as a coherent tourism and infrastructure cluster. The combined complex is doing the same thing in Minecraft, with a ravine instead of a pass and three foreign buildings instead of three Swiss ones.

### 3.2 Finland — the Helsinki Underground Master Plan

**Helsinki is thought to be the only city in the world with an underground master plan.** The numbers, from the City of Helsinki itself and from the Helsinki City Planning Department:

- ~**10 million m³** of underground space beneath the city
- **~500 individual subterranean facilities** (some sources say 400+; both are quoted; the higher number is more recent)
- **220 km of technical tunnels**
- **~5,500 civil defense shelters** with space for **~900,000–1,000,000 people** — in a city of ~700,000 residents
- **~90 facilities with dual civilian / civil-defense use**
- A standard practice of designing *normal-time* facilities (swimming pools, sports halls, parking, metro stations, oil storage, art spaces) with *just enough* strengthening to be convertible to defense shelter use in 72 hours
- An average of **1 m² of underground per 100 m² of ground surface**
- The Itäkeskus swimming pool, for example, can be converted to a defense shelter with showers and toilets in 72 hours
- Underground parking, sports halls, running tracks, metro stations, art spaces, band rehearsal rooms, car parks, swimming pools, a museum, an underground church, retail spaces, and (in some cases) artificial lakes [10][11][12][13]

**Why this matters for the build:** Helsinki is the model of a *civilian city that happens to sit on top of a defense network*. The 90 dual-use facilities are the key insight: civilian and military underground functions are not separated; they share infrastructure, with the *use case* (peace vs. emergency) as a switch. The combined complex's public shaft and shared utility corridor are doing exactly this — a single shaft that is an employee entrance 95% of the time and an emergency egress 5% of the time.

### 3.3 Norway — mountain infrastructure + Oslo Opera House

Norway's contribution to the precedents is two-fold:

- **Mountain infrastructure culture.** Norway builds road tunnels, hydropower stations, military installations, and civilian infrastructure into its mountains as a matter of routine. The Lærdalstunnelen (24.5 km road tunnel, opened 2000) is the world's longest road tunnel and was a deliberate design response to ferry-and-fjord inaccessibility. Norwegian military doctrine embeds command and control in mountain installations. [14]
- **Oslo Opera House** (Snøhetta, 2008, 38,500 m²) is the model of a *signature civilian building as a public-space connector*. The "carpet" white-marble roof slopes up from the harbor and from the city, becoming a public plaza that you can walk on; the building's workshops and stage functions are partially below grade, with windows showing the public what's happening inside. [15][16]

**Why this matters for the build:** The Oslo Opera House is the model for how a *public building can be a transition* between street, slope, and underground functions. In the combined complex, the public shaft entrance at the city surface is a small architectural object that does the same job — it is the *transition* between a sunlit street and a 68 °F limestone mine, and the architecture of that transition is what makes the descent feel intentional, not accidental.

### 3.4 Singapore — the Jurong Rock Caverns

The **Jurong Rock Caverns (JRC)** on Jurong Island are Southeast Asia's first commercial underground rock caverns for hydrocarbon storage. Phase 1, completed 2014:

- 5 caverns at ~130 m below the surface
- 1.47 million m³ total storage capacity (~9.5 million barrels)
- Built in the **Jurong Formation** (sedimentary sandstone/siltstone)
- Phase 1 cost: S$844.2 million (~US$672 million)
- Built beneath an existing petrochemical complex — the caverns serve the surface industry
- Excavation methods: drill-and-blast, with extensive in-situ permeability testing; caverns lined with shotcrete reinforcement [17][18][19]

**Why this matters for the build:** JRC is the *smallest* in scale of the major underground precedents but the *cleanest* model of a *deep-storage facility serving a surface city* — the same relationship as SubTropolis to its surface city (in this combined complex, Kansas City; in the build, the surface city in the valley). The build's south-side limestone mountain is doing the same thing SubTropolis does in real life: host a large industrial space at moderate depth, accessed by horizontal drive-in portals.

### 3.5 Tokyo — the G-Cans / Metropolitan Area Outer Underground Discharge Channel

The **G-Cans** (首都圏外郭放水路, *Shutoken Gaikaku Hōsuiro*), officially the Metropolitan Area Outer Underground Discharge Channel, in Kasukabe, Saitama Prefecture, is the world's largest underground flood diversion facility. Opened 2006:

- **6.3 km** of 50 m-deep tunnels, 10 m diameter
- **59 massive concrete pillars**, each 18 m tall, 500 t, supporting the **"underground temple"** — the pressure-adjusting water tank, 177 m long, 78 m wide, 18 m tall, 22 m below grade
- Connects 5 smaller rivers to a larger one (the Edo River) via a 6.3 km tunnel
- Built 1993–2006 for ~US$2 billion
- Open to public tours (must be reserved in advance) [20][21]

**Why this matters for the build:** G-Cans is the model of a *public-facing* deep-underground civil-engineering structure. The "underground temple" has become a tourism phenomenon; visitors come to see what looks like a sacred space but is actually stormwater infrastructure. This is the design language for the combined complex's deepest chamber: the Cheyenne space, with its 1,319 springs and 15 buildings, can be lit and presented the same way — as a *place*, not just a *function*.

### 3.6 Montreal — the RÉSO (the *other* "Underground City")

The **RÉSO** (*Ville souterraine*, formerly known as *RÉSO* or *la ville souterraine*) is the largest underground pedestrian network in the world:

- **33 km (≈ 20 mi) of tunnels** linking 41+ metro stations and 10+ major buildings
- About **3.3 million sq ft** of commercial space
- Integrated with the Montreal Metro (Green, Orange, Blue, Yellow lines)
- Connected to over 2,000 shops, 200 restaurants, 30+ cinemas, and the Underground City has its own postal code (H2X)
- Privately built by building owners, like the Houston tunnels, but at much larger scale; many of the connections are direct from metro station to basement concourse
- Above-ground city: Montreal, ~1.7 million metro, brutally cold winters — the underground city is the *only* way to move around downtown in January [22]

**Why this matters for the build:** RÉSO is the answer to "could the Houston tunnels be larger?" Yes, in Montreal they are 5× larger by length. But the *model* is the same: a city that has a *second* pedestrian level below ground, climate-controlled, lit, with retail bays. The combined complex is showing the *American cousin* of the same idea, at 1/5 the scale, in a city that has the opposite climate problem (too hot, not too cold).

### 3.7 The SubTropolis / Hunt Midwest model — private commercial underground + surface

SubTropolis (the south-side mountain in the combined complex) is itself a model of *privately developed underground commercial real estate*. The key facts to bring forward in this report:

- 14 million sq ft developed / 55 million sq ft total void
- 10.5 mi of paved illuminated road
- 2.1 mi of rail
- >10,000 limestone pillars (25 ft square, on 65 ft centers)
- 16 ft (4.9 m) ceiling, 40 ft (12 m) corridor width
- Up to 160 ft below surface
- 65 °F year-round, no humidity, no UV
- 55+ tenants including USPS, NARA, EPA, Hallmark, Russell Stover, Pillsbury, LightEdge (data center), and the planned W.W. Grainger "world's largest underground distribution center" (2026)
- Famous for the *film vault* — Underground Vaults & Storage stores master film elements including *The Wizard of Oz* and *Gone With the Wind* negatives [23][24][25]

The model is: **a private company owns a void carved in bedrock, sells climate-controlled industrial space to tenants, and operates it as a multi-tenant business park with its own road network, fire protection, and EMP-resistant climate stability.** This is the *exact* model of the combined complex's south-side mountain.

### 3.8 The Cheyenne Mountain / NORAD model — military command in a mountain

Already deeply documented in the existing 01-cheyenne-mountain-complex masterplan [26], the essential points:

- 1,800–2,000 ft of Pikes Peak granite overburden
- 5.1 acres (4.5 acres of building floor space) of underground complex
- 15 freestanding steel-and-concrete buildings on 1,319 half-ton coil springs
- 30 MT blast overpressure rating at 1.2 mi
- 6 × 1,750 kW diesel generators; 1.5 million gallons of diesel; 6 million gallons of water in four 1.5-million-gallon reservoirs
- Currently in "warm standby" as the Alternate Joint Operations Center for NORAD/USNORTHCOM, with day-to-day operations at Peterson SFB
- 4.5 acres excavated 1961–1964, 693,000 tons of granite removed

The model is: **a hollowed-out mountain, with the buildings inside decoupled from the rock by springs, the entrances protected by baffled blast doors, and the complex designed to be self-sufficient for 30+ days with all utilities generated on site.** This is the *exact* model of the combined complex's north-side mountain.

### 3.9 The Houston Tunnel model — building-by-building private underground

Already deeply documented in the existing 03-houston-tunnel-system masterplan [27], the essential points:

- 6 mi (9.7 km) of pedestrian tunnel under downtown Houston
- 95 city blocks connected
- 20 ft (6 m) below street grade
- 80+ access points, all but two through private building lobbies
- Privately owned, building-by-building (NOT by the city)
- Climate-controlled to ~72 °F
- Operates ~6 a.m.–6 p.m. weekdays only
- Tenants: quick-service food, dry cleaners, banks, barbers, optometrists, small retailers
- Skybridges overhead, tunnels below — a *two-layer city*
- Famous for the Wells Fargo and McKinney Garage being the only two direct street-level entrances

The model is: **a dense city, in a brutal climate, where the private buildings have built their own climate-controlled underground pedestrian network, owned in small segments, connected opportunistically, with no central authority.** This is the *exact* model of the combined complex's surface city.

### 3.10 Synthesis: what the precedents tell us

| Precedent | Lesson for the build |
|---|---|
| **Swiss Réduit (Sasso da Pigna, San Carlo, Gotthard Base Tunnel)** | A single mountain can host military, civilian-repurposed, and civilian-transit functions simultaneously, and the whole cluster can be operated as coherent infrastructure. |
| **Helsinki underground master plan** | A civilian city can sit on top of a defense network if the design is *dual-use* from the start. 90 facilities in Helsinki are dual-use. |
| **Norway + Oslo Opera House** | Mountain infrastructure is a national norm, not an oddity. A signature public building can be the *transition* between surface and underground. |
| **Jurong Rock Caverns** | A deep-storage facility can serve a surface city. 130 m of rock is enough. |
| **G-Cans** | Public tours of deep civil engineering are popular. "Underground temple" is a recognized aesthetic. |
| **Montreal RÉSO** | The "underground city" as a typology exists at 33 km scale. The Houston 6 mi is a smaller cousin. |
| **SubTropolis** | Private commercial underground is viable when the climate is right (limestone) and the cost is right. |
| **Cheyenne Mountain** | Hardened mountain command is feasible at 1:1 in the real world and at 1:1 in Minecraft. |
| **Houston tunnels** | Privately built, building-by-building, with no central authority, in a hostile climate. |

**The combined complex is, in short, a Helsinki-style dual-use underground master plan built on a Swiss-Alpine mountain, with American military + commercial + civilian branding.** The precedents all exist. The combination is novel in Minecraft, not in the real world.

---

## 4. Geological Compatibility

The user has asked for **a single Minecraft mountain range hosting both granite (Cheyenne, north side) and limestone (SubTropolis, south side)**. This needs to be geologically defensible.

### 4.1 The two rocks

**Pikes Peak granite (north side).** The Pikes Peak batholith is a 1.08-billion-year-old Mesoproterozoic anorogenic A-type granite complex. The batholith covers ~1,200 sq mi of the central Front Range, extends east under the Great Plains (visible to aeromagnetic surveys at least 80 mi east of its outcrop), and is exposed over an area ~80 mi N–S × ~25 mi E–W. The dominant rock type is coarse-grained pink-to-brick-red syenogranite (potassic series) with a minor monzogranite phase. The batholith consists of three major intrusive centers (Pikes Peak, Buffalo Park, Lost Creek) plus later sodic-series plutons of gabbro, diabase, syenite, and fayalite-bearing granite. [28][29][30][31]

**Bethany Falls limestone (south side).** The Bethany Falls Limestone is a member of the **Swope Limestone formation** of Missourian (Upper Pennsylvanian) age, deposited ~270 million years ago in a shallow tropical sea. In Kansas City it is mined at 100–160 ft below the surface for the SubTropolis complex. The surrounding Kansas City area also contains significant limestone deposits concentrated and re-exposed by Pleistocene glaciation that rerouted the Missouri River. The mined stratum is "nearly level and very deep." The roof rock is competent, dry, and self-supporting over very large spans, with compressive strength of 18,000–24,000 psi (~6× concrete). [23][24][32]

### 4.2 Can a single mountain range host both?

**Yes — but not in the way one might naively imagine.** The two rocks are:

- **Different ages** by ~800 million years. Pikes Peak granite is 1.08 Ga (Mesoproterozoic, basement). Bethany Falls limestone is 270 Ma (Pennsylvanian, sedimentary).
- **Different origins.** Granite is an intrusive igneous pluton. Limestone is a marine sedimentary deposit.
- **Different tectonic settings.** The granite is anorogenic, emplaced during a period of crustal extension ~1 Ga. The limestone was deposited in a shallow tropical sea and then buried and lithified.
- **Different positions in a stratigraphic column.** In a real mountain range, the *basement* (granite) is at the bottom; the *cover* (limestone and other sediments) is on top, *if* the cover was deposited after the basement crystallized.

This means a *real* mountain range with both Pikes Peak granite and Bethany Falls limestone would have:
- Granite at depth, possibly exposed at the surface where erosion has stripped the cover
- Limestone above the granite *only* in places where (a) limestone was deposited directly on the granite basement, or (b) thrust faulting has brought limestone up next to the granite, or (c) erosion has exposed limestone lenses within or atop the granite

In Colorado, the real Pikes Peak batholith is granite-only at the surface — the overlying Paleozoic and Mesozoic sedimentary cover has been stripped by the Laramide uplift and subsequent erosion. There is no Bethany Falls limestone in the Front Range; Bethany Falls is mid-continent (Kansas, Missouri, Iowa).

**For the combined complex, this means:** the build is a *geographic compression*, not a real-world geology. The user is asking for a ravine with granite on one side and limestone on the other, in a single mountain range. This is *plausible* if we posit that the mountain range is, in the build, a tectonic composite — a thrust-faulted terrane where Paleozoic limestone has been pushed up against Proterozoic granite and then both have been eroded to expose the contact. This is real geology in places like the Alps, the Appalachians, the Rockies of Montana/Wyoming, and the Andes. It is *not* the real geology of either Colorado Springs or Kansas City, but the build is allowed to compress geography for narrative and visual effect.

**Recommendation for the design team:** Frame the build's mountain as a *composite terrane* in the geological notes — e.g., "A Proterozoic granite massif overthrust by a klippe of Paleozoic limestone, with the thrust plane exposed in the ravine walls." This is a real geological setting (the Alps have it; the Glacier National Park has it; the Blue Ridge has it). It explains both the granite and the limestone coexisting in one range, and it provides a visual story: the *bottom* of the ravine exposes the thrust fault itself, with granite on the north wall and limestone on the south wall, and a fault-breccia zone in the ravine bottom where the two meet.

### 4.3 The ravine

The ravine is the central visual and structural feature of the world. How do real ravines form?

- **V-shaped valleys (the form factor for "ravine")** form by **fluvial erosion** — rivers cutting down through bedrock via hydraulic action, abrasion (corrasion), and solution. In the upper course of a river, vertical erosion dominates, producing steep-sided V-shapes. [33][34]
- **U-shaped valleys** form by **glacial erosion** — glaciers gouging broad valleys by plucking and abrasion. [33][35]
- **Gorges and canyons** are narrow V-shaped valleys cut into hard rock, sometimes via a combination of river erosion and geological uplift. The Grand Canyon is a stacked sequence of nearly horizontal sedimentary layers, the Black Canyon of the Gunnison is cut into hard crystalline basement. [36][37]

For the combined complex, the ravine is most plausibly a **fluvially eroded V-shaped gorge** with a perennial stream or seasonal creek at the bottom. The stream flows out of the mountains toward the coastal-plain side and into the city's river. This is geologically defensible and visually iconic.

The depth of the ravine in the build should be **on the order of 80–120 blocks** at the deep end (the SubTropolis limestone is 100–160 ft below its surface, and the ravine is "below the surface" — so the ravine walls are *at or below* the SubTropolis roof in real-world terms, which means the SubTropolis horizontal portals open *directly into* the ravine walls, at ravine-floor level or above). For Cheyenne, the ravine is far above the chamber (1,800+ ft of rock above means the chamber is well below the mountain's surface; the ravine does not even come close to the chamber).

### 4.4 Depth compatibility

| Site | Real-world depth | Minecraft depth at 1 block = 1 m | Notes |
|---|---|---|---|
| **Cheyenne chamber** | 1,800–2,000 ft below summit; chambers at ~0.5× that depth | Chamber at ~Y = 250–400 if surface is Y = 600 | 1,800–2,000 ft = 549–610 m of granite above the chamber. At 1 block = 1 m, that's 549–610 blocks of solid granite above the chamber. The mountain has to be ~700+ blocks tall. |
| **SubTropolis** | 100–160 ft below the surface; limestone roof 8–10 ft thick, then 50–100 ft of soil above | Chamber at ~Y = 100–150 if surface is Y = 200 | 100–160 ft = 30–49 m. At 1 block = 1 m, that's 30–49 blocks below the surface. |
| **Houston tunnels** | 20 ft below street grade | Tunnel at Y = -20 (below sea level) | 20 ft = 6 m. At 1 block = 1 m, that's 6 blocks below street grade. |

**The three sites are at very different depths.** This is the central design challenge and the central design opportunity. The build has to commit to a single world with build-height at least 700 blocks tall (vanilla 384 is not enough; a 1,024-block or higher custom world is required — this is the same constraint the existing Cheyenne masterplan already calls out [37]).

---

## 5. Scale & Compression

The three individual sites have already been compressed for their builds. Bringing them into one world means harmonizing the compression.

### 5.1 Existing scale compressions

| Site | Real | Minecraft target | Compression |
|---|---|---|---|
| **Cheyenne Mountain** | 9,565 ft peak; 1,800–2,000 ft of granite above the chamber; 4.5 acres (195,000 sq ft) of underground building floor | ~1,450-block mountain (per the existing 01-masterplan working plan); chamber ~45×25 blocks; 15 buildings | 2:1 vertical; 4:1 horizontal (rough) |
| **SubTropolis** | 200×200 ft of pillar-on-pillar grid? No: the chamber is 1,100 acres = ~4.5 km²; ceiling 16 ft; pillars 25 ft; corridors 40 ft wide | 200×200 block grid; 8×8×5 block pillars; 5-block ceiling; 6-block-wide corridor; 1:1 vertical; ~1:100 horizontal in the masterplan's curated sample | 1:1 vertical; ~1:100 horizontal |
| **Houston tunnel** | 6 mi (9.7 km); 95 blocks; 20 ft below grade; 8 ft ceilings; 10–20 ft corridors | 6 blocks N–S × 4 blocks E–W = 24-block curated sample; 6 blocks below grade; 80-block-tall above-ground city; ~144 × 96 blocks total footprint | 4:1 linear; 1:1 vertical; 1:1 corridor |

### 5.2 The combined complex scale challenge

Bringing these together means asking: **what is "1 block" in this world?**

Two options:

1. **One global scale: 1 block = 1 meter.** This is the most consistent choice. The 6-mile Houston tunnels become 9,700 blocks long; the 1,800-ft Cheyenne overburden becomes 549 blocks. The whole combined complex is a *gigantic* world — many kilometers across, and a single vertical stack from sea level to the top of the mountain.
2. **Three local scales, three biomes, one world.** Each site keeps its own scale ratio. Houston is 4:1; SubTropolis is 100:1 in floor plan; Cheyenne is 2:1 vertical / 4:1 horizontal. The world is *smaller* in absolute terms but each site feels "right" at its own scale. The transitions between sites are *purposeful scale shifts* — the public shaft from SubTropolis to the city is also a *scale shift* marker.

**Recommendation for the design team:** **Option 1 is more honest and more buildable.** The Houston and SubTropolis individual masterplans have already settled on 1 block = 1 m for their primary geometry; the Cheyenne masterplan has done the same (1,450 blocks tall = 1,450 m tall, which is ~4,800 ft, vs. real 9,565 ft = 2,915 m; a ~2:1 vertical compression). Bringing them into one world at 1 block = 1 m means **the world footprint is on the order of 1,500 × 1,500 blocks in plan** (the SubTropolis 200×200 block footprint at 1:1, the mountain range another 800 blocks across, the city 144×96 blocks per Houston, and the ravine walls 200–400 blocks long), and the vertical scale is **at least 800 blocks** (a 1,500-block-tall mountain would be nicer, but 800 is the minimum to fit the Cheyenne overburden at 2:1).

**A single global scale at 1 block = 1 m means the combined complex is a *city-scale Minecraft build*, not a *chest-scale* build.** It is buildable but large. The 01-cheyenne and 03-houston masterplans have already chosen this; the 02-subtropolis masterplan is at 1:1 vertical. So the combined complex inherits a consistent scale and the transition zones (the public shaft, the service tunnel) are *scale-consistent* with both neighbors.

### 5.3 What this means in concrete numbers

- **Mountain peak elevation:** ~Y = 800 (matches the existing 01-masterplan's 1,450-block mountain if we accept the 2:1 vertical compression; or full ~2,915 blocks if the build commits to 1:1 vertical for Cheyenne and the world is set up with a 4,000-block build height)
- **SubTropolis floor:** ~Y = 100 (100 m = 330 ft, vs. real 100–160 ft; a ~2:1 vertical compression on the SubTropolis depth, but at the limestone-rock strength and 1:1 pillar/grid scale, this is geometrically consistent)
- **Houston tunnel floor:** ~Y = -6 (6 m = 20 ft, 1:1)
- **City street grade:** ~Y = 0
- **Ravine bottom:** ~Y = -60 to -120 (the ravine is 60–120 blocks deep at its center, 1:1 with a real 60–120 m V-shaped gorge)
- **Coastal plain:** Y = 0, dropping to Y = -20 at the sea

The world is **a single 1,500 × 1,500 × 800 block (X × Z × Y) space**, with the Y range set to a custom build-height of at least 1,024 (per the existing 01-masterplan's requirement).

---

## 6. Accessibility & Circulation

How do people move between the three sites? This is the question the design team must answer, and the research gives clear precedents.

### 6.1 The four key transitions

The combined complex has **four circulation connections** that need design decisions:

1. **City street → Houston tunnel** (vertical, downward, civilian, public)
2. **Houston tunnel → SubTropolis** (the **public shaft** — vertical, downward, civilian + industrial, mixed)
3. **SubTropolis → Cheyenne** (the **service tunnel** — horizontal, through the ravine, mixed-civilian + restricted)
4. **City → SubTropolis ravine entrance** (the **horizontal portal** — civilian, into a hillside)

### 6.2 The public shaft (City → SubTropolis)

**Precedent:** the SubTropolis in real life has *no vertical public shaft* — the entire facility is horizontal, with drive-in portals into hillsides, because that's how the limestone mine was originally cut. But Helsinki's 90 dual-use facilities are mostly *vertical* — they are basements of surface buildings, entered from above. The Houston tunnels are *also* vertical entries through building basements.

For the build, the public shaft is a **5×5 block (or 7×7 block) cross-section vertical tunnel** with:
- A **guard booth** at the top (one block, with a desk and a sign)
- A **turnstile** at the descent (small mechanism block, with a *T-marker* sign for "to the SubTropolis")
- A **straight stair down** (cheaper) or a **mechanical lift** (more realistic for public infrastructure) for 30–50 blocks
- A **small lobby at the bottom** with a security gate, a turnstile, and a sign saying "SubTropolis — Hunt Midwest Industrial Complex"
- The lobby opens onto a SubTropolis internal road, with the SubTropolis grid visible

**Width:** 5×5 blocks is the working assumption (matches the user's spec). For visual interest, the public shaft can be **7×7 blocks with the center 5×5 cleared for the lift and the outer ring as a service chase and an emergency stair.**

**Length:** ~30–50 blocks, depending on the depth the design team chooses. At 1 block = 1 m and SubTropolis at ~Y = 100 with city street at Y = 0, the lift is 100 blocks. A 5×5 shaft 100 blocks tall is buildable but visually monotonous. A **switchback stair or a double-deck lift** (two stops, with a mid-level landing at Y = 50 that is a small skylit museum/observation room) breaks the monotony.

**Mode:** pedestrian-only. No vehicles in the public shaft. The SubTropolis vehicle access is via the horizontal ravine portal.

### 6.3 The service tunnel (SubTropolis → Cheyenne)

**Precedent:** the **Gotthard Base Tunnel** (57 km, 2,300 m of rock cover) is the most famous long rail tunnel through an Alpine massif. The **Brenner Base Tunnel** (under construction) will be 55 km. The **Zojila Tunnel** (13 km, India, opens 2026) connects two sides of a mountain pass. The **Lærdalstunnelen** in Norway (24.5 km road) is the world's longest road tunnel. Real-world precedent for *a tunnel through a single mountain between two facilities* is well-established. [8][9][38]

For the combined complex, the service tunnel goes from the SubTropolis side of the ravine, *through* the ravine bottom, *up the north side*, and *into* the Cheyenne Mountain Complex. The realistic features:

- **Cross-section:** **6×6 blocks** (6 m high × 6 m wide, matches the SubTropolis 6-block corridor and the Cheyenne 5-6 block J-curve tunnel). At 1:1 with the Zojila Tunnel's 9.5 m × 7.57 m horseshoe, the build's 6×6 is slightly smaller (more like a single-track rail tunnel), but consistent with both neighbors.
- **Length:** the ravine is ~80–120 blocks across. The service tunnel goes from the SubTropolis ravine-wall portal (at Y = 0, the ravine floor) under the ravine stream (so it has to dip slightly to clear the stream bed) and up the north side to the Cheyenne outer portal or directly into the J-curve.
- **Mode:** **narrow-gauge rail** (Minecraft minecart, 1-block gauge) or **single-lane road** (3 blocks wide, with 1-block shoulders each side, in a 5-block-wide tunnel). The working assumption is **a minecart railway** — it matches both the SubTropolis rail network and the historic Cheyenne rail tradition (the J-curve tunnel was originally driven by mining crews with rail-based muck cars).
- **Defensive features:** the service tunnel has *one* controlled-access checkpoint at the Cheyenne end (a checkpoint building with a guard booth, turnstile, and a 25-ton blast door in the Cheyenne style, but for the service tunnel rather than the J-curve main tunnel). The SubTropolis end is open, with signage ("U.S. Space Force — Authorized Personnel Only") but no blast door.
- **Utility corridor:** the service tunnel also carries the **shared utilities** between the two facilities — a water pipe (Cheyenne's reservoirs could be a backup for SubTropolis's fire-protection water), a power line, a fiber-optic line, and an emergency-escape corridor. The 6×6 cross-section has a 2-block-wide utility strip on one side and a 4-block-wide rail/road on the other.

### 6.4 The horizontal portal (City surface → SubTropolis ravine entrance)

**Precedent:** SubTropolis's real-world ravine-portal model. The SubTropolis 8300 NE Underground Drive address is *literally* a drive-into-the-hillside portal, no vertical shaft. The same model is used at Hunt Midwest's other facilities and at Mega Cavern in Louisville.

For the build, the horizontal portal is on the south face of the ravine, at the SubTropolis side, at ravine-floor level (so trucks and cars can drive in on a shallow grade from the ravine road). The portal has:
- A 4×5 block opening in the limestone hillside
- A sign "Hunt Midwest SubTropolis — Authorized Vehicles"
- A vehicle gate
- A 50-block paved access road from the city surface down the ravine wall (switchbacks)
- Inside: a security gate, a turnstile, and a vehicle checkpoint, with the SubTropolis main avenue visible beyond

### 6.5 The city-side Houston tunnel entrance

This is the standard Houston-tunnel entry, fully documented in the 03-masterplan: a Wells Fargo–style street-level entry with a glass revolving door, a marble lobby, an interior stair or escalator down 6 blocks, and the tunnel corridor beyond. In the combined complex, this is one of **maybe 5–6 such entries in the city**, and the **T-marker** at the curb is the visual signature of the entry.

### 6.6 Public transit between sites

For the build, three transport modes are realistic:

| Mode | Used for | Real-world analogue |
|---|---|---|
| **Foot** | Within Houston tunnels; within SubTropolis; within Cheyenne J-curve | Standard |
| **Car / truck** | Houston surface streets; SubTropolis 15 mph internal road; the city-to-ravine switchback | Standard |
| **Minecart / narrow-gauge rail** | The SubTropolis–Cheyenne service tunnel; possibly the SubTropolis internal rail (2.1 mi in real life) | SubTropolis real-life rail; 1960s mine-haulage rail |

A **HOV (high-occupancy vehicle) lane or a dedicated bus line** through the city, the ravine, and the SubTropolis internal road is a realistic future addition but not required for v1.

### 6.7 The visitor journey

The full visitor journey through the combined complex, in order, is:

1. **Arrive at the city** via the coastal-plain highway, enter downtown, park or ride the Houston METRORail analogue.
2. **Descend to the Houston tunnel** through a Wells Fargo–style street-level entrance.
3. **Walk 6–8 blocks** of Houston tunnel, including a food court stop at the 1001 Fannin or Pennzoil Place equivalent.
4. **Find the public shaft** at the SE corner of the build, marked with the T-marker and a "SubTropolis — Industrial Tour" sign.
5. **Descend 50–100 blocks** in the public shaft, with a mid-level observation landing at Y = 50.
6. **Emerge at the SubTropolis lobby** with a security gate and a turnstile; pass into the SubTropolis internal road network.
7. **Walk or drive** along SubTropolis Hushpuckney Avenue past the Hunt Hall central plaza, the NARA archival center, the USPS stamp fulfillment center, and the LightEdge data center.
8. **Drive out** the horizontal ravine portal on the south face, down to the ravine floor.
9. **Cross the ravine** on a bridge or via the lower service-tunnel entrance at the bottom of the ravine.
10. **Enter the service tunnel** on the north side and ride the minecart to the Cheyenne outer portal.
11. **Walk the J-curve** access tunnel (800+ blocks of curved tunnel, per the 01-masterplan working plan) past the 25-ton blast doors.
12. **Emerge in the chamber** — 1,319 springs, 15 buildings, the Combat Operations Center, the Air Defense Operations Center, the medical clinic, the Granite Inn bar.

This is a 60–90 minute Minecraft experience. The descent axis is the spine; the climb back up is in reverse.

---

## 7. Defense-in-Depth

The user said *"go deep"* and *"everything should be declassified"*. The combined complex has a natural defense-in-depth that maps to the real-world U.S. Continuity-of-Government (COG) and European civil-defense practice.

### 7.1 The U.S. Federal Relocation Arc

The most thoroughly documented real-world defense-in-depth underground system is the **U.S. Federal Relocation Arc**, a network of bunkers within ~300 mi of Washington, D.C., built during the Cold War to house the federal government in the event of a nuclear strike. The CLUI documented the public face of this in 2002; the canonical text is the 2007 National Security Presidential Directive 51 (NSPD-51) and the 102-page National Continuity Plan it spawned. [39][40][41]

The key facts:
- **~100 underground facilities** within the Federal Arc
- **Three layers** of redundancy, each more hardened than the last:
  - **Alpha team** stays in or near D.C., in agency basements
  - **Bravo team** relocates to **Mount Weather** (FEMA, 48 mi west of D.C. in Bluemont, VA, ~200,000 sq ft of above-ground + ~600,000 sq ft of underground space)
  - **Charlie team** disperses to facilities 20–30 mi out from D.C.
- The two biggest bunkers beyond the Beltway are **Mount Weather** and **Site R / Raven Rock Mountain Complex** (6 mi north of Camp David, on the PA–MD border, the Alternate National Military Command Center, ~600,000–700,000 sq ft of underground space)
- The **Greenbrier** (White Sulphur Springs, WV) was a secret Congressional bunker built 1958–1962 under the Greenbrier resort
- Other named facilities in the public record: **Site R**, **Mount Weather**, **Greenbrier**, **Cheyenne Mountain** (NORAD), **the PEOC** (Presidential Emergency Operations Center, under the East Wing of the White House)
- The COGCON (Continuity of Government Readiness Conditions) system has four states, with COGCON 1 meaning full deployment to alternate facilities in preparation for a catastrophic emergency
- After the September 11 attacks, COOP (Continuity of Operations Plan) was activated, and 75–100 government workers rotated in shifts of up to three months at Site R and Mount Weather
- The current American dispersed-continuity architecture, per public statements, includes the **Presidential Emergency Facilities** at Mount Weather, Site R, the Camp David bunker, the Offutt AFB bunker, the bunker under Denver International Airport, and "other still-classified locations"

### 7.2 The Swiss Réduit

The **Réduit national** (1938–1990s) was a three-line defensive strategy: forward defense, middle defense, and **alpine redoubt** in the Gotthard, St. Maurice, and Sargans fortresses. The Sasso da Pigna alone had provisions for a 500-man garrison to operate self-sufficiently for months. The Réduit was never triggered, but the infrastructure was maintained at readiness through the Cold War and was declassified in stages from 1998 onward. [1][2]

### 7.3 Norwegian and Finnish practice

- **Norway** maintains dispersed mountain command-and-control facilities as a matter of standing policy. The Oslofjord region's military infrastructure is heavily tunneled.
- **Finland** maintains ~5,500 civil defense shelters in Helsinki alone, with space for ~1 million people in a city of 700,000. The 90 dual-use facilities are the canonical model of "civilian-by-default, defense-by-override."

### 7.4 How the combined complex maps to defense-in-depth

The combined complex is, in COG terms, a **single COG-system** with three layers:

| Layer | Site | Hardness | Real-world analog |
|---|---|---|---|
| **Surface (soft)** | City + Houston tunnels | None. Civilian, no hardening. | The civilian surface, including the 80+ building lobbies in Houston |
| **Shallow industrial (medium-soft)** | SubTropolis | Soft target, but in 100+ ft of limestone. Climate-stable but not blast-hardened. | A SubTropolis-style business park, the surface industrial zone of a city |
| **Deep military (hard)** | Cheyenne Mountain Complex | 30 MT at 1.2 mi. 1,800–2,000 ft of granite. Spring-isolated buildings. 30-day self-sufficiency. | Cheyenne Mountain as it actually is; Site R; Mount Weather; Sasso da Pigna |
| **Deepest-COG (hardest)** | (Not in the build) | A theoretical "Site R under Cheyenne" would be the absolute deepest layer. | Mount Weather at the COG layer; the PEOC under the East Wing |

For the build, the defense-in-depth story is *the* way to communicate the design to a viewer. As the visitor descends:

- **Y = 0** (city street): no defense, full sun, climate hostile (Houston-style)
- **Y = -6** (Houston tunnel): no defense, climate-controlled, dim
- **Y = -60 to -120** (ravine bottom): open air, climate hostile, *but* the ravine walls offer natural concealment from the city above
- **Y = 0 in the ravine wall** (SubTropolis horizontal portal): 100+ ft of limestone over the chamber, climate-stable
- **Y = -100 to -150** (SubTropolis chamber): 100–160 ft of limestone, climate-stable, no blast hardening
- **Y = 0 on the north ravine wall** (Cheyenne J-curve portal): 1,800+ ft of granite above, in a baffled tunnel, behind 25-ton blast doors
- **Y = -250 to -400** (Cheyenne chamber): 1,800+ ft of granite above, 30 MT blast, self-sufficient for 30 days

This is **the entire COG spectrum in one Minecraft world, on a single physical axis, in a single descent.** That is the design's central narrative.

---

## 8. Public Facts vs. Myth

A few claims about the combined complex, made confidently in other contexts, need to be tested against the public record.

### 8.1 "The Houston tunnels are the largest in the world"

**False.** The **RÉSO** in Montreal is 33 km long with 41+ stations and ~3.3 million sq ft of commercial space; the **PATH** in Toronto is 30 km; the **Chicago Pedway** is smaller; the **Helsinki** underground is 220 km of *technical tunnels* (not all pedestrian). Houston's 6 mi (9.7 km) is **the largest in the U.S. by block count and pedestrian-miles**, not the largest in the world. [22][27]

### 8.2 "Cheyenne Mountain can survive a direct nuclear hit"

**Partly true, mostly false.** The complex is rated for the *overpressure* of a 30-megaton detonation at 1.2 mi (2 km). A *direct hit* by a modern warhead would defeat it. The mountain is not a magical invulnerability. The complex is also "partially resistant" per the NORAD public fact sheet — language that reflects the engineering reality. [26]

### 8.3 "SubTropolis is the world's largest underground business complex"

**True, with caveats.** The 14 million sq ft of developed leasable space is the *commercial* record. The total mined void is 55 million sq ft, of which only a fraction is developed. Some sources claim larger underground spaces exist in former Soviet mining operations, but SubTropolis holds the trademarked "World's Largest Underground Business Complex" because it is *commercially active* business real estate, not abandoned mining. [23][24]

### 8.4 "SubTropolis has a 200,000 daily user count"

**False — this is a Houston-tunnel number that's been misattributed.** SubTropolis has 2,000–2,500 tenant employees on site. The Houston-tunnel "200,000 daily users" is a back-of-envelope estimate from the daytime downtown workforce, not a measured number. [23][27]

### 8.5 "The Gotthard Base Tunnel is the deepest and longest railway tunnel in the world"

**True.** 57.09 km, 2,300 m max rock cover, opened 1 June 2016. Will likely be surpassed in length only by the **Brenner Base Tunnel** (under construction, 55 km planned) when it opens, but for now, Gotthard is the record. [8][9]

### 8.6 "La Claustra is a 4-star hotel that succeeded"

**Half true.** La Claustra *was* a 4-star hotel and is *now* operational as a hotel and seminar center, but it **closed in 2010** for financial reasons and **re-opened in September 2015** under new ownership (Rainer Geissmann bought it for CHF 1,000). The model of "former military bunker → luxury hotel" is real but has a rocky commercial track record. [4][5][6][7]

### 8.7 "Helsinki is the only city in the world with an underground master plan"

**Probably true at the level of *a written, binding, citywide master plan*.** Many cities have underground space plans in various forms (Shanghai, Singapore, Tokyo, Helsinki, Montreal, Toronto), but Helsinki's 2010 *Underground Master Plan* and its 2018 *Urban Underground Space* follow-up are the most thorough public documents. [10][11][12][13]

### 8.8 "The Federal Relocation Arc has ~100 facilities"

**Confidently true per public reporting (CLUI 2002, NYT 1992),** though the exact count and many of the specific sites remain classified. The 75–100 government workers figure, the 600,000–700,000 sq ft of underground space at Mount Weather and Site R, and the existence of the Greenbrier bunker are all from public reporting. [39][40][41]

### 8.9 "Combined complex" is a real-world category

**Not in the sense of this Minecraft build.** A real-world "combined complex" would be a single facility with multiple functions; the term is not used in the literature. But the **concept** of a single geography hosting military + commercial + civilian underground functions is real — Helsinki, Switzerland, and the U.S. Federal Arc all show versions of it.

---

## 9. Visual Description

What does a visitor *see* on the journey through the combined complex? This is the design team's primary deliverable, so the visual narrative is critical.

### 9.1 The approach (from the coastal plain)

The visitor arrives on the coastal plain. The city is visible from miles away as a **dense low-rise cluster of towers and parking garages** on a flat coastal plain. Behind the city, the **mountain range** rises — the easternmost range, dark green with forest, with grey-white granite outcrops near the summit. The mountain range has a **distinctive gap** in the center: a V-shaped notch, the ravine, with a thin line of green (the stream at the bottom) and a small road visible on the ravine floor. The ravine is the **geographic signature of the world**.

### 9.2 The city (surface layer)

The city has **two pedestrian levels**:
- **The surface**, with 4 anchor towers (Wells Fargo, JPMorgan Chase, Pennzoil Place, Esperson — the existing 03-masterplan choices), 8–10 generic downtown towers, 2–3 parking garages, a street grid, and the **skybridge network** overhead (glass-enclosed crossings at the 2nd-floor level of the office buildings).
- **The tunnel level**, 6 blocks below the surface, with painted concrete corridors, fluorescent lighting, beige VCT floors, and the famous Houston food-court archetypes (Esperson, 1001 Fannin, Pennzoil, McKinney Place).

The visual contrast is **bright vs. dim, public vs. private, hot vs. climate-controlled**. The T-marker at the curb is the signature visual element at the public tunnel entries.

### 9.3 The public shaft entrance

The public shaft entrance is a **small architectural object** at one of the city's surface points — perhaps a 7×7 block pavilion with:
- A subtle above-ground entrance (a glass-and-steel stairwell, with a "SubTropolis — Public Access" sign)
- A 5×5 block vertical descent (visible from the surface, with a mechanical-lift cable and a guard booth)
- A **mid-level observation landing at Y = -50** — a 7×7 block room with a single glass window looking out at the side of the city's underground utility corridor (a small scene of pipes, conduits, a *G-Cans*-style concrete pillar)
- A second descent from Y = -50 to Y = -100
- A small **lobby at the bottom** with a security gate, a turnstile, a "Welcome to SubTropolis" sign, and a wide view of the SubTropolis main avenue beyond

### 9.4 The SubTropolis (south-side mountain)

The SubTropolis is a **large, lit, climate-controlled, road-networked underground space** — the visual opposite of the Cheyenne chamber. The first thing the visitor sees is:
- A **40-block-wide avenue** (Hushpuckney, named for the limestone) with yellow center-line paint, white edge lines, 15 mph speed-limit signs, and 25-foot-square limestone pillars on 65-foot centers
- The pillars are **white-painted** with painted pillar numbers ("911.10") and the **iconic SubTropolis tenant signage** in backlit channel letters
- A few **forklifts and trucks** moving at low speed, with reflective vests visible on drivers
- The **central plaza** at the intersection of Hushpuckney and Bethany Falls, with a quartz medallion, the Hunt Hall marker, and the "SubTropolis — Est. 1964" plaque
- A **food court** at one of the larger tenant fit-outs, with hot food and the constant **HVAC hiss** of the climate system
- A 4,000 sq ft *NARA archival area* with rolling shelves, a *USPS stamp fulfillment center* with conveyors, and a *LightEdge data center* with a biometric hand reader and a "No Phones" sign

The visual signature of SubTropolis is **light, activity, climate, and signs**. It is a *city* in the geological sense — a place where people work, eat, and live a working life, 100+ ft below the surface.

### 9.5 The service tunnel (between the two mountains)

The service tunnel is the **descent into the ravine and the climb up the other side**. The visitor:
- Drives out the **horizontal portal** at the south ravine wall, on a paved road switchbacking down to the ravine floor
- Crosses the **ravine bottom** on a small bridge over the stream, with the **limestone hillside** of the south face visible on one side and the **granite hillside** of the north face visible on the other
- Enters the **service tunnel** on the north side, a 6×6 block cross-section with a single minecart rail and a utility strip
- Rides the minecart for **80–120 blocks** under the ravine and up the north side
- Arrives at the **Cheyenne outer portal**, a small concrete-and-granite entry with a "U.S. Space Force — Authorized Personnel Only" sign, a 25-ton blast door (smaller than the J-curve main doors but still imposing), and a 4-block checkpoint corridor

### 9.6 The Cheyenne Mountain Complex (north-side mountain)

The J-curve tunnel is **the iconic visual experience of the build**, already detailed in the 01-masterplan:
- 800 blocks of curved tunnel through Pikes Peak granite
- Three character stages: rough-hewn at the portal, concrete-lined at the side-branch, polished institutional at the chamber
- The 25-ton blast doors in a side branch (positive-pressure airlock)
- The chamber array — 4.5 acres of building floor space, 1,319 springs, 15 buildings, the Combat Operations Center, the Air Defense Operations Center
- The visual signature: **bare granite, fluorescent light, the sound of machinery, the smell of "dead air"** (floor wax and ozone, per the existing 01-masterplan)

### 9.7 The visual storytelling

The full visitor journey tells a single visual story:

> **You start in the heat of a city, descend through a climate-controlled basement, take a lift down through a hundred blocks of stone, emerge into a road-networked underground business park, drive out a hillside portal into a deep V-shaped mountain ravine, cross the stream at the bottom, take a minecart under the ravine and up the other side, and arrive at a baffle-curved tunnel bored into a granite peak — and the granite peak is hiding a city.**

This is **the single most compressed example of human underground infrastructure ever put in one Minecraft world.** The visual scale goes from 1 block (a single T-marker on a curb) to 1,500 blocks (a mountain peak) in one walk.

---

## 10. Minecraft Scaling Notes

The combined complex is buildable. The numbers are large but consistent with what Minecraft can render at view-distance 12+ and simulation-distance 12+ (per the existing 02-subtropolis working plan's flags).

### 10.1 World footprint (1 block = 1 m)

| Component | Footprint (X × Z) | Vertical range (Y) | Reference |
|---|---|---|---|
| **Mountain range (both peaks + ravine)** | 800 × 600 blocks | Y = 0 (ravine floor) to Y = 800 (peak) | New for combined complex |
| **Cheyenne chamber** | 80 × 30 blocks (4 main chambers) | Y = 250–400 (≈ 1,800 ft below summit) | 01-masterplan working plan |
| **SubTropolis chamber** | 200 × 200 blocks | Y = 0 to Y = -50 (chamber + sub-basement) | 02-masterplan working plan |
| **SubTropolis horizontal portal + ravine road** | 10 × 100 blocks (switchback) | Y = 0 to Y = -100 (down the ravine wall) | New for combined complex |
| **Service tunnel** | 6 × 6 blocks (cross-section) | Y = -100 to Y = 0 (under ravine, up the north wall) | New for combined complex |
| **Ravine** | 200 × 600 blocks (between the two peaks) | Y = 0 to Y = -120 (deepest point) | New for combined complex |
| **City surface (Houston-style)** | 144 × 96 blocks | Y = 0 (street grade) | 03-masterplan working plan |
| **City above-ground (skybridges + towers)** | 144 × 96 blocks | Y = 0 to Y = 80 (JPMorgan Chase) | 03-masterplan working plan |
| **City tunnel (Houston-style)** | 24 blocks (6×4) | Y = -6 (6 m below grade) | 03-masterplan working plan |
| **Public shaft** | 5 × 5 or 7 × 7 blocks | Y = 0 (city) to Y = -100 (SubTropolis) | New for combined complex |
| **Coastal plain** | 600 × 1,500 blocks | Y = 0 to Y = -20 (at sea) | New for combined complex |
| **Total world footprint** | **~1,500 × 1,500 blocks** | **Y = -120 to Y = 800** | |

### 10.2 Build height requirement

- The world must support at least **1,024 blocks of build height** (custom world type). Vanilla 384 is insufficient.
- The mountain peak at Y = 800 means the world has a top buffer of at least **200 blocks** for snow, ice, and above-the-peak scenery.
- The ravine bottom at Y = -120 means the world has a top-of-bedrock buffer of at least **100 blocks** (so the SubTropolis sub-basement doesn't hit bedrock).

### 10.3 View distance and render distance

- **simulation-distance: 12** (per 02-subtropolis working plan) is the minimum.
- **view-distance: 16** is the recommended setting for the visitor experience.
- The mountain face is render-heavy. A **fog-and-clipping optimization** for the back of the mountain (the side the visitor doesn't see) is recommended to keep frame rates playable.

### 10.4 Block-count estimate

Order-of-magnitude:

- Mountain shell: ~1 million blocks (mostly the mountain mass)
- Cheyenne chamber + 15 buildings + 1,319 springs + J-curve tunnel: ~500,000 blocks (per 01-masterplan estimate)
- SubTropolis chamber + 200×200 grid + pillars + sub-basement: ~700,000 blocks (per 02-masterplan estimate)
- Houston tunnel + city above + skybridges: ~1.2 million blocks (per 03-masterplan estimate)
- New for combined complex: ravine (200 × 600 × 120 carved = ~14 million blocks carved *out*, plus wall surface and floor ~720,000 placed), service tunnel (~20,000 blocks), public shaft (~3,500 blocks), SubTropolis ravine road (~10,000 blocks), SubTropolis horizontal portal (~5,000 blocks), the ravine stream and bridge (~5,000 blocks)

**Total placed blocks (rough):** ~3.5 million blocks. This is a large build but within the realm of mc-fleet-bot's stated capabilities (the 02-subtropolis working plan already flags Phase 1 alone as 320,000 blocks carved).

### 10.5 What is buildable vs. what is referenced

Following the principle established in the 03-masterplan: **the build should commit to a small, iconic, walkable subset; reference the rest.**

- **Fully built (in detail):** the public shaft, the SubTropolis chamber, the SubTropolis ravine portal, the ravine bottom and stream, the service tunnel, the Cheyenne J-curve, the Cheyenne chamber with the 15 buildings, and the Houston tunnel's 24-block sample
- **Referenced (built in compressed form):** the rest of the 95-block Houston tunnel network (signage and tunnel entry points only), the rest of the mountain range (silhouette and surface only, with the granite composition and the forest cover), the rest of the ravine walls (south face fully built because SubTropolis is the main act; north face fully built because Cheyenne is the main act; east and west walls partially built with the geology exposed)
- **Not built (referenced in lore):** the rest of the 6-mile Houston tunnel, the rest of the SubTropolis's 1,100 acres, the rest of the 1,500-block mountain mass

---

## 11. What a Minecraft Visitor Should Recognize

The combined complex is recognizable by its **five iconic features**:

1. **The mountain silhouette with both a granite peak and a limestone hillside visible, split by a deep ravine.** The two rocks have to be *visually distinct*: the granite peak with its pinkish hue, exposed outcrops, and conifer forest; the limestone hillside with its grey-cream hue, exposed bedding planes, and oak/maple forest. The ravine in between exposes both rocks and the geological contact.

2. **The city in the valley, with a sunlit surface and a dim tunnel below.** The two-layer Houston city is the iconic public face of the world. The T-markers at the curb, the skybridges overhead, and the Wells Fargo–style descent are the visual signature.

3. **The public shaft from SubTropolis up to the city.** The 5×5 or 7×7 block vertical descent is the build's *transition* between civilian and industrial underground. The mid-level observation landing at Y = -50 (the utility corridor view) is a *G-Cans*-style public-facing moment.

4. **The service tunnel from SubTropolis through the ravine to Cheyenne.** The minecart ride is the *journey* between the two mountains. The 6×6 cross-section with the utility strip and the 25-ton blast door at the Cheyenne end is the *spine* of the build.

5. **The Cheyenne Mountain chamber with the 15 buildings on the 1,319 springs.** This is the *destination* — the iconic 4.5-acre underground city that justifies the whole descent. Already detailed in the 01-masterplan; the combined complex inherits it unchanged.

A visitor who has seen all five of these will say *"this is the Cheyenne + SubTropolis + Houston combined complex"* and not *"this is some generic underground base."*

---

## 12. Sources & Confidence

### 12.1 Well-documented (multiple independent sources agree)

- **Cheyenne Mountain Complex location, depth (1,800–2,000 ft granite), 4.5 acres, 15 buildings, 1,319 springs, 30 MT blast rating.** NORAD fact sheet, Air & Space Forces Magazine, Wikipedia, multiple journalistic sources. [26][42]
- **SubTropolis 14M sq ft developed, 1,100 acres, 55M sq ft total, 100–160 ft deep, 25 ft pillars, 16 ft ceiling, 40 ft corridors.** Hunt Midwest, Wikipedia, ULI case study, multiple journalistic sources. [23][24][25][32]
- **Houston tunnels: 95 blocks, 6 mi, 20 ft below grade, weekday hours only, privately owned, Wells Fargo + McKinney Garage as the only two street-level entries.** Wikipedia, downtownhouston.org, Houston Chronicle, multiple sources. [27]
- **Helsinki underground master plan: ~10M m³, 500 premises, 220 km of technical tunnels, 5,500 shelters for ~1M people, 90 dual-use facilities.** Helsinki City Planning Department, finland.fi, multiple sources. [10][11][12][13]
- **Sasso da Pigna / Festung San Carlo / La Claustra: 1941–1943 construction, 2,400 m galleries (Sasso da Pigna), 4,000 m² hotel (San Carlo), 200 m entrance tunnel, 2,050 m above sea level, declassified 1998–1999.** Wikipedia (DE/EN), showcaves.com, swissinfo.ch, Jean Odermatt's site. [1][2][3][4][5][6][7]
- **Gotthard Base Tunnel: 57 km, 2,300 m max cover, opened 2016, CHF 12.2 billion.** China.org.cn citing Xinhua, CNET, Pfannenberg, ITA-AITES. [8][9]
- **Montreal RÉSO: 33 km, 41 stations, ~3.3M sq ft commercial.** Multiple sources (Wikipedia article at exact title does not exist; statistics from tourism and transit authorities). [22]
- **Metropolitan Area Outer Underground Discharge Channel (G-Cans): 6.3 km tunnel, 50 m deep, 59 pillars, 18 m tall "underground temple", opened 2006.** Wikipedia, TripAdvisor, MLIT Japan. [20][21]
- **Jurong Rock Caverns: 130 m deep, 1.47M m³ storage, 5 caverns, S$844M, completed 2014, built in Jurong Formation.** Wikipedia, Springer (Engineering Geology), Straits Times. [17][18][19]
- **Federal Relocation Arc: ~100 facilities, Site R, Mount Weather, Greenbrier, 600,000–700,000 sq ft at the two big bunkers, 75–100 government workers.** CLUI 2002, Public Intelligence, whitehouse.gov1.info, Wikipedia (Raven Rock). [39][40][41]
- **V-shaped valleys form by fluvial erosion (vertical downcutting, hydraulic action, abrasion, solution).** Wikipedia (V-shaped valley), National Geographic, BBC Bitesize. [33][34][35][36][37]
- **Pikes Peak batholith: 1.08 Ga, anorogenic A-type, 1,200 sq mi, 80 mi N–S × 25 mi E–W, potassic syenogranite dominant.** Wikipedia, USGS Professional Paper 1321-A, Trinity University digital commons, AMNH. [28][29][30][31]

### 12.2 Reasonably well-documented (one strong source, others consistent)

- **Pikes Peak granite extends east under the Great Plains to at least 80 mi east of outcrop, per aeromagnetic data.** USGS PP 1321-A. [29]
- **SubTropolis has ~10.5 mi of illuminated paved road; some sources cite 7 mi or 8.2 mi.** Variance reflects "paved corridor" vs. "all drivable internal road." Hunt Midwest current site favors the 8.2 mi figure for paved arterials. [23]
- **Cheyenne chamber dimensions 45 × 60.5 × 588 ft** (vs. Dark Atlas's 100 × 60 ft): the 1967 Lewiston Daily Sun press release is the more reliable primary source. [26]
- **Cheyenne blast door count and weight: 25 tons, 3 ft steel, 20 ft tall, two sets, on a side branch of the main tunnel.** Multiple consistent sources; NORAD-aligned figure. [26]

### 12.3 Estimated or reconstructed (best inference from available evidence)

- **Houston tunnel cross-section (10–20 ft corridors, 8–9 ft ceilings, 12–14 ft food courts).** Reconstructed from photos and LoopNet tenant data. No public source gives a definitive figure. [27]
- **Houston tunnel HVAC setpoint (~72 °F).** Inferred from general commercial-building practice and the SubTropolis comparison. [27]
- **Houston tunnel daily user count (150,000–200,000).** Back-of-envelope from the daytime downtown workforce. [27]
- **The 200,000 daily user count being back-of-envelope is a flag for the build**: the build should *not* put "200,000 daily users" on a plaque. The 03-masterplan flags this. [27]
- **The "pikes peak granite vs. Bethany Falls limestone in one mountain range" geological scenario:** a *plausible* composite-terrane setting, not a real Front Range geology. The design team should frame this honestly in any in-world plaques.

### 12.4 Could not verify (gaps to flag for downstream)

- **Exact combined-footprint block count** for the world: depends on design decisions about ravine depth, mountain height, and city footprint that are not yet made.
- **Service-tunnel cross-section and mode (rail vs. road) for the SubTropolis–Cheyenne connection:** recommended as 6×6 with minecart rail; the design team should confirm.
- **Public-shaft cross-section and mode (lift vs. stair) for the city–SubTropolis connection:** recommended as 5×5 or 7×7 with mechanical lift; the design team should confirm.
- **The Houston tunnel's exact tie-in to the public shaft at the SE corner of the 24-block sample:** the 03-masterplan working plan flags this as a coordination point; the design team should confirm the public shaft is in a buffer block.
- **The depth-compression strategy for the combined complex:** the recommendation is 1 block = 1 m globally, with the mountain peak at ~Y = 800 and a custom 1,024+ build height. The design team should confirm.
- **The exact blast-overpressure rating and the 30-day self-sufficiency figures for Cheyenne** are in the existing 01-masterplan and should be inherited unchanged.
- **The exact 15 mph speed limit and the 25 ft square pillars on 65 ft centers for SubTropolis** are in the existing 02-masterplan and should be inherited unchanged.
- **The exact 95 blocks, 6 mi, 20 ft depth for Houston** are in the existing 03-masterplan and should be inherited unchanged.

### 12.5 Data conflicts noted

- **Sasso da Pigna gallery length: 2,400 m** (English Wikipedia, German Wikipedia) **vs. 3.2 km** (Vietnamese source, citing "bảo tàng đường hầm này có chiều dài khoảng 3,2 kilomet"). The 2,400 m figure is the *Sasso da Pigna fortification* (the gun battery complex); the 3.2 km figure includes the broader museum complex (which incorporates the Caverna Grande and the historical-fortress sector). Both can be true. [1][2][3]
- **Cheyenne chamber dimensions 45 × 60.5 × 588 ft (1967 press release)** vs. **100 × 60 ft (Dark Atlas)**: the 1967 press release is the more reliable primary number; the 100 × 60 likely refers to the *outer envelope* of a single chamber. [26]
- **SubTropolis road length 7 mi (Stolen History, The Drive) vs. 8.2 mi (Hunt Midwest TripAdvisor) vs. 10.5 mi (Wikipedia) vs. 13 mi (Brazilian engineering source)**: the variance is "paved corridor" vs. "all drivable road including spurs." The current Hunt Midwest site (8.2 mi) is the most authoritative for *paved arterials*; 10.5 mi (Wikipedia) is widely cited. [23]
- **Helsinki underground premises: 400+ vs. 500:** the variance reflects which decade's count. The City of Helsinki's 2018 publication says 500. [10][11]
- **Helsinki shelter capacity 900,000 vs. 1,000,000:** the variance is rounding across sources. [11]

These are *flagged* for the design team. None is a research-killer; the build can commit to one of the figures and document the alternative in the source notes.

---

*This report is research only. The integration design — the actual placement of the city, the ravine, the public shaft, the service tunnel, the inter-site connections — is a downstream task. The architectural design team and the AI Contractor Writer should treat the §6 (Accessibility & Circulation) and §10 (Minecraft Scaling Notes) sections as the binding constraints for the build.*
