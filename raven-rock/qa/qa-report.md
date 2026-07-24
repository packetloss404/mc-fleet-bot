# Raven Rock Mountain Complex (Site R) — QA Framework & Inspection Report

**Subject:** Minecraft Java 1.21.x reconstruction of the **Raven Rock Mountain Complex ("Site R")** —
the U.S. government's underground continuity-of-government / Alternate National Military Command Center
bunker (the "underground Pentagon") near Blue Ridge Summit, Adams County, PA — sited **~20 blocks
beneath** the "MainStreet America" (MSA) surface build on the same server.
**Document:** `qa/qa-report.md` — the acceptance / inspection framework: definition-of-done gates plus
concrete, checkable in-world inspection items, **adapted to this build's defining constraint (below).**
**Author role:** QA / acceptance engineer. A cross-check reviewer will countersign the coordinates
asserted here against the rest of the planning set.
**Build status at time of writing:** **NOTHING HAS BEEN BUILT.** The planning set is complete
(`references/` + `planning/site-plan.md` [master] + `coordinates.yaml` + `buildings.yaml` +
`palettes.yaml`); no block of Raven Rock exists yet. **Every inspection item below is `PENDING`**, and the
defect register (`qa/defects.yaml`) is intentionally **EMPTY** — there is nothing built to have defects.

---

## 0. THE DEFINING CONSTRAINT — read this before anything else

**Raven Rock's interior is CLASSIFIED, and since 25 May 2007 DoD policy has made it unlawful to make
"any photograph, sketch, picture, drawing, map or graphical representation" of the complex**
(`references/manifest.yaml` REF-015). There is **no public floor plan, room list, corridor plan, tunnel
map, or interior dimension** — and none was sought. Consequently:

> **There is NO public ground truth to inspect interior fidelity against.** Every coordinate, cavern
> outline, building footprint, tunnel route, room, spring, blast door, and block palette in this build
> is a **creative approximation** (REF-016/REF-017). Inspecting the interior for *historical accuracy*
> is therefore a **category error** — it would demand fidelity to a fact that does not, and legally
> cannot, publicly exist.

**This QA framework deliberately writes NO inspection item that demands historical interior accuracy.**
We do not check "is the war room where the real war room is," "is this the correct number of tunnels,"
"is this reservoir the right size" — those are unanswerable and it would be dishonest to pretend a pass
or fail means anything. Interior fidelity is **non-inspectable by design.**

What QA *can* and *does* inspect instead — the five families of this report — are things that have a real
right answer even when the interior does not:

- **(a) Internal consistency** across the planning files (site-plan master vs the two YAMLs). §3, family **PC**.
- **(b) Buildability** on stock Paper by un-opped bots via plain `/fill`-style placement. Family **BU**.
- **(c) Spatial integrity** — envelope, Y-range, no building overlap, and the ~20-block greenstone buffer
  beneath MSA (no Y-collision with MSA's `y62→y79`). Family **SP**.
- **(d) Confidence-labeling integrity** — nothing invented is presented anywhere as verified; the interior
  is labeled creative approximation throughout. Family **CL**.
- **(e) Mandatory visitor-facing disclosure signage** per the 2007 depiction ban (REF-015). Family **DS**.
- Plus the *single* evidence-anchored fidelity check the public record actually supports: **geology**
  (the mountain is greenstone/metabasalt, **not** granite — REF-003). Family **GE**.

That is the whole honest scope. This is the **mirror image of MSA's QA problem**: MSA verified the
*shape and program* and only invented the *surfaces*, so MSA could inspect footprints against verified
square footages. Here the *context/mission/geology* are verified but the *entire interior is invented*,
so QA inspects **self-consistency, buildability, spatial safety, honesty, and geology** — never interior
truth.

---

## 1. How to read this document (confidence discipline — inherited, never upgraded)

Every assertion of *what the build should be* carries exactly one confidence tag, matching
`references/manifest.yaml` and the `planning/` docs. **The vocabulary is never upgraded:**

- **[VERIFIED]** — a primary / multi-source public fact. Here that is only: greenstone geology (REF-003);
  the continuity-of-government / ANMCC mission (REF-010); that caverns were blasted out (REF-004); the
  1951–1953 era; the signals/comms tenancy (REF-011).
- **[INFERENCE]** — a strong read of one good source (high-confidence inference): buildings-on-springs
  concept (REF-005); ~four tunnel portals (REF-007); self-sufficient utilities (REF-009); gently curving
  tunnels (REF-005/017).
- **[RECONSTRUCTION]** — assembled from weak/qualitative hints (moderate-confidence reconstruction):
  building count (three vs five, REF-006); later expansion/contract figures (REF-014).
- **[CREATIVE]** — no evidence; a build decision this project invents: **every coordinate, cavern box,
  building footprint/centroid, floor, ceiling, tunnel route, portal position, room, spring array, blast
  door, block palette, the ~20-block burial depth, the four-building count, and the vertical access shaft.**

**An inspection item can only demand fidelity to the confidence level of the underlying fact.** We inspect
the mountain body as greenstone-not-granite at the **[VERIFIED]** bar (GE family); we inspect a building's
geometry only as *"does the as-built match the build's own declared [CREATIVE] plan,"* **never** as
historical accuracy. **Holding a creative approximation to a "verified interior" bar is itself a QA
defect.** When prose polish and a confidence tag disagree, **trust the tag.**

---

## 2. Assumptions this framework had to make (read before trusting any target)

1. **No literal QA brief / no numbered "section" spec was recovered.** The repo contains
   `references/manifest.yaml`, `references/README.md`, and the four `planning/` files only. This framework
   is reconstructed from those, adapted to the classified-interior constraint. If a canonical acceptance
   spec surfaces elsewhere, it wins; reconcile against it. **[CREATIVE structure over VERIFIED/INFERENCE
   content.]**

2. **`site-plan.md` is the declared spatial MASTER.** It states there is exactly ONE layout and that
   `coordinates.yaml` and `buildings.yaml` cross-check against it. QA adopts the site-plan numbers as
   canonical and treats any divergence in the two YAMLs as a bug in those files. **This project
   deliberately used a single spatial owner precisely to avoid the GRID/OVAL coordinate fork that bit
   MSA.** §3 verifies whether that discipline actually held. (It did — see §3.)

3. **NO-OP STOCK PAPER governs *how* we inspect and *what can be built*.** Target server is stock Paper:
   **no WorldEdit, no WorldGuard, no Dynmap, no Citizens; builder bots are NOT opped.** That removes
   `//count`, `//size`, Dynmap renders, schematic-diff, region queries, and NPC pathing from the toolkit.
   "Protected envelope" is a *planning boundary*, not an enforced region. All geometry must be placeable by
   an un-opped mineflayer bot via plain block placement. "Verify in-world" always means one of the §4
   methods, never a WorldEdit selection.

4. **Tolerances are mine and [CREATIVE].** Since every dimension is itself a creative approximation, there
   is no "true" figure to hit — tolerances here check *fidelity to the build's own plan*, not to history.
   Unless an item says otherwise:
   - As-built centroid position: **±3 blocks** in X and Z from the planned coordinate.
   - As-built footprint edges: **±2 blocks** per face from the planned AABB.
   - Wall height: **≈5 blocks per story, ±1**.
   - Y-range, envelope, buffer, and no-overlap: **HARD constraints, zero tolerance** — these protect the
     MSA build above and the world envelope, so a violation is a blocker regardless of the [CREATIVE] status
     of the numbers.

5. **Interior content items check *presence and internal coherence*, not correctness.** Where an item
   references a room list or a spring array, it verifies the build realized *its own declared plan*
   (`buildings.yaml` rooms, `palettes.yaml` motifs) and labeled it creative — **not** that it matches a
   real facility. This is stated on every such item so no reader mistakes a "pass" for a historical claim.

6. **The four-building count, the utility/reservoir/portal/spring counts, and the vertical access shaft
   are documented open design choices**, not defects (see the planning docs' GAP-02/04/05). QA carries them
   as open items in §8, to be reconciled *as a set* if the design changes — they are not build defects and
   are not in `defects.yaml`.

---

## 3. Internal-consistency audit — did the single-spatial-owner discipline hold? (family PC)

This is the Raven Rock analog of MSA's §2 coordinate-reconciliation table — **but with the opposite
result.** MSA carried two incompatible layouts (GRID vs OVAL) that had to be reconciled before build.
Raven Rock deliberately used **one spatial owner** (`site-plan.md`, master) and required the two YAMLs to
restate the same numbers. **QA's job here is to confirm that held.** I recomputed the centroids, footprint
AABBs, zone containment, Y-ranges, overlaps, and the MSA buffer across all three files by hand.

**RESULT: the three files AGREE on every centroid, footprint, floor, ceiling, and derived extent. No
GRID/OVAL-style fork exists. The single-spatial-owner discipline held.** The check is recorded here (not
in `defects.yaml`, which is for as-built defects only). Because it passed, there is **no open planning
inconsistency to log**; the only carried-forward items are the *documented design choices* in §8.

| Element | `site-plan.md` (MASTER) | `coordinates.yaml` | `buildings.yaml` | Agree? |
|---|---|---|---|---|
| RR-B1 Command centroid / footprint / floors | (−30,−8,−15) · 40×34 · 3fl · top y9 | (−30,−8,−15) · 40×34 · 3fl · top 9 | (−30,−8,−15) · 40×34 · 3fl · top 9 | ✅ |
| RR-B2 Signal centroid / footprint / floors | (+38,−8,−15) · 32×30 · 3fl · top y9 | (38,−8,−15) · 32×30 · 3fl · top 9 | (38,−8,−15) · 32×30 · 3fl · top 9 | ✅ |
| RR-B3 Quarters centroid / footprint / floors | (0,−6,+100) · 44×30 · 3fl · top y11 | (0,−6,100) · 44×30 · 3fl · top 11 | (0,−6,100) · 44×30 · 3fl · top 11 | ✅ |
| RR-B4 Power centroid / footprint / floors | (−150,−14,−10) · 40×28 · 2fl · top y−2 | (−150,−14,−10) · 40×28 · 2fl · top −2 | (−150,−14,−10) · 40×28 · 2fl · top −2 | ✅ |
| RR-Z1 Cavern A box / floor / ceiling | x[−75,75] z[−45,15] · −12 / 40 | [−75,−45,75,15] · −12 / 40 | (via zone_source) | ✅ |
| RR-Z2 Cavern B box / floor / ceiling | x[−45,45] z[70,130] · −10 / 36 | [−45,70,45,130] · −10 / 36 | (via zone_source) | ✅ |
| RR-Z3 Cavern C box / floor / ceiling | x[−185,−115] z[−35,15] · −18 / 28 | [−185,−35,−115,15] · −18 / 28 | (via zone_source) | ✅ |
| RR-Z5 shaft footprint / head-house N9 | x=+200, z=−15 → surface y64 | [193,−22,207,−8] · −12 / 64 · N9 (200,64,−15) | shaft summarized | ✅ |
| Spring pedestal height (all buildings) | 4 blocks (base = floor + 4) | 4 | 4 | ✅ |
| Vertical stacking (RR ceiling / buffer / MSA) | y40 / 22-block buffer / MSA y62→79 | y40 / buffer 22 / MSA y62→79 | y40, buildings y−18..11, MSA y62→79 | ✅ |

**Derived cross-checks (recomputed, all consistent across files):**

- **Zone containment PASS** — RR-B1 x[−50,−10] z[−32,2] and RR-B2 x[22,54] z[−30,0] both inside RR-Z1
  x[−75,75] z[−45,15]; RR-B3 x[−22,22] z[85,115] inside RR-Z2 x[−45,45] z[70,130]; RR-B4 x[−170,−130]
  z[−24,4] inside RR-Z3 x[−185,−115] z[−35,15].
- **No building overlap PASS** — RR-B1↔RR-B2 gap 32 blocks (X); Cavern-A pair↔RR-B3 gap 83 blocks (Z);
  RR-B4↔RR-B1 gap 80 blocks (X). No two footprints intersect.
- **Y-range PASS** — buildings occupy y−18..y11; each `building_top_y` (9, 9, 11, −2) is below its cavern
  ceiling (40, 40, 36, 28); deepest floor y−18 (Cavern C sump) is above the ~y−20 target and well above
  bedrock.
- **MSA buffer PASS** — RR's highest CAVERN/complex point (ceilings y40) is **22 blocks below MSA's y62
  foundation**; no cavern or building geometry enters MSA's y62→y79 band. The RR-Z5 shaft ALONE rises to
  **y64** into that band, but at **x=+200 (x∈[193,207], z∈[−22,−8]) — east of every planned MSA element,
  clearing the widest planned MSA footprint (x≈130) by ~70 blocks and the Z09 event lawn (x≤160) by 33** —
  so its Y-overlap touches no MSA block, only rock (see SP-02/SP-03/SP-08). Note the clearance is in **X
  only**: the shaft head's z∈[−22,−8] overlaps Z09's z-range at z−15…−8.
- **Envelope PASS** — extreme extents (east portal N5 x=+285; **west portal N6 x=−290 — the true western
  extreme, NOT RR-B4's x=−170 west edge**; north portal N4 z=−285; south portal N3 z=+285) are all inside
  X,Z ∈ [−300,+300]; the tightest margin is **10 blocks west** (N6 x=−290 to boundary x=−300).
- **Reservoir clearance PASS** — N7 basins z[−34,−26] sit south of RR-B4 z[−24,4] with a ~2-block gap,
  inside Cavern C z[−35,15].

> **PC items in §5 re-run this audit against the AS-BUILT world once construction exists.** Today the
> *planning* files are internally consistent; PC-01…PC-06 will confirm the *build* honors the plan it agrees on.

---

## 4. Verification toolkit (what QA actually has on a no-op Paper server)

Every "How to verify" cell cites one or more of these by tag. Underground work changes *emphasis* (light
and enclosure matter more; no daylight silhouettes) but the methods are the same as MSA's.

- **[M1] F3 Debug HUD** — any player reads live XYZ, block-under-crosshair, facing, light level, biome.
  Primary tool for coordinate/height spot checks, confirming a door faces the intended axis, and reading
  the light level in a cavern or corridor.
- **[M2] Human-op spectator/creative fly-through** — a *human admin* with op (the **bots** stay un-opped)
  flies the caverns for visual, enclosure, spring-legibility, blast-door, and signage inspection. The main
  channel for GE/DS and most buildability-appearance items.
- **[M3] mc-fleet-bot terrain-scan API** — `GET /api/terrain?x&y&z&radius` returns block ids in a cube;
  `GET /api/terrain/height?x&z` returns column height. The **programmatic, op-free** backbone: measure
  cavern voids and footprints, recompute as-built centroids/AABBs, confirm the ~20-block buffer is solid
  greenstone (scan the y41→y61 columns over the caverns and confirm no air), detect off-palette blocks,
  confirm granite is absent from the rock body, and confirm no block sits in MSA's y62→y79 band.
- **[M4] World-model / world snapshot** — `GET /api/world/model`, `GET /api/world`. Set night/rain to run
  light and water-ingress checks; confirm environmental state during a probe.
- **[M5] Bot walkability probe** — dispatch an **un-opped** bot with `POST /api/bots/:name/walkto`,
  `/follow`, or a queued task, then watch `/api/bots/:name/detailed` + `bot:position`. If a bot that
  *cannot fly or op* walks portal → vestibule → cavern → rotunda → each building door and up the corridors,
  the circulation is genuinely walkable. The definitive functional test underground.
- **[M6] Prismarine-viewer capture** — `GET /api/bots/:name/viewer-port` renders in-world without a game
  client; feeds enclosure, lighting-mood, spring-array, and blast-door captures (overhead silhouettes are
  less useful underground; interior captures dominate).
- **[M7] Manual tape-measure** — two F3 readings to count blocks along an axis (wall heights, tunnel
  section ~6×7, aisle widths) where a scan is overkill.

Explicitly **unavailable** (do not write steps that assume them): WorldEdit `//count`/`//size`, Dynmap
tiles, schematic-diff, WorldGuard region queries, Citizens NPC pathing. They return only if the staged
integrations are later activated.

**Result legend for every table:** `☐ pass  ☐ fail  ☐ N/A` — **all currently PENDING (nothing built).**
Log any future fail as a record in `qa/defects.yaml`.

---

## 5. Inspection items — the six families

> **Reminder (the whole point of §0):** none of these items demands historical interior accuracy. Every
> "target" below is either an evidence-anchored public fact (mission-as-program-scaffold, geology), a
> self-consistency check against the build's own plan, a spatial-safety constraint, a buildability
> constraint, or an honesty/disclosure requirement. A "pass" **never** asserts the real facility looks
> like this.

### 5.1 Planning Consistency — as-built honors the one agreed plan (family PC)

| ID | Inspection item | Target / tolerance | How to verify | Basis | Result |
|---|---|---|---|---|---|
| PC-01 | As-built centroids match the master plan | each of RR-B1..B4 within ±3 blocks (X,Z) of its `site-plan.md`/`coordinates.yaml`/`buildings.yaml` centroid | [M3] scan AABB, recompute centroid; compare to §3 table | [CREATIVE] plan, single owner | ☐ pending |
| PC-02 | As-built footprints match the plan | each footprint within ±2 blocks/face of the planned AABB (RR-B1 40×34, RR-B2 32×30, RR-B3 44×30, RR-B4 40×28) | [M3] scan ground plate | [CREATIVE] plan | ☐ pending |
| PC-03 | As-built floor/ceiling Y match the plan | each building base/top and each cavern floor/ceiling within ±1 of §3 values | [M1]/[M7] measure; [M3] scan void top & floor | [CREATIVE] plan | ☐ pending |
| PC-04 | Story counts match the plan | RR-B1/B2/B3 = 3 storeys, RR-B4 = 2 storeys (exact) | [M1]/[M7] count floor-to-floor | [CREATIVE] design choice | ☐ pending |
| PC-05 | Zone/tunnel/portal positions match the plan | four portals (N3/N4/N5/N6), two vestibules (N1/N2), rotunda N10, reservoirs N7, shaft head N9 at planned coords ±3 | [M1] F3 at each notable location; [M3] scan | [CREATIVE] plan | ☐ pending |
| PC-06 | No third geometry emerged (the MSA lesson) | as-built matches the ONE planned layout; no unplanned scheme was substituted mid-build | [M3] full-extent scan vs §3; [M2] fly-through | single-spatial-owner discipline | ☐ pending |

### 5.2 Buildability on stock Paper — placeable by un-opped bots (family BU)

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| BU-01 | Vanilla 1.21.x blocks only | zero modded / resource-pack blocks anywhere | [M3] scan block ids vs the vanilla 1.21 set | project constant | ☐ pending |
| BU-02 | Palette blocks confirmed present on the target server | tuff family + copper build set (`palettes.yaml` A06) exist on the 1.21.x Paper server; no 1.21.4+ blocks (pale oak/resin/creaking) used | [M3] place-test each questioned id with a bot; [M2] confirm | `palettes.yaml` BLOCK-ID DISCIPLINE | ☐ pending |
| BU-03 | Achievable by un-opped bots — no op-only artifacts | no command_block / structure_block / structure_void / barrier / light block; no `//` commands assumed | [M3] scan for op-only ids | no-op constraint | ☐ pending |
| BU-04 | Every void is bot-reachable to build | caverns/tunnels dug and lined by bots that cannot fly; no geometry requiring flight or op to place | [M5] bot reaches each build face on foot during/after dig; [M2] confirm | no-op constraint | ☐ pending |
| BU-05 | Buildings sit on their spring pedestals with a real air gap | each building base is 4 blocks above its cavern floor with a visible `[air]` isolation gap (per `palettes.yaml` spring_isolation_footing) | [M3] scan the underside plane; confirm air between pad and building | [INFERENCE] concept / [CREATIVE] rendering | ☐ pending |
| BU-06 | Foundations/pedestals fully supported | spring pads land on solid cavern floor; no floating buildings, no unsupported spans except the deliberate spring gap (BU-05) | [M3] scan for unsupported columns; [M2] visual | technical | ☐ pending |
| BU-07 | No builder litter | no stray scaffolding / temp cobble / dirt columns / torch-spam left from bot construction | [M3] scan for out-of-palette blocks; [M2] sweep | bot-build hygiene | ☐ pending |
| BU-08 | Interiors enclosed, lit, and circulated | no rain/light ingress from the surface; rooms ≥ mob-safe light; stairs connect every storey; every room reachable through an operable ≥1-wide door | [M4] night/rain; [M1] light; [M5] bot floor-to-floor; [M2] walk | technical | ☐ pending |
| BU-09 | Tunnels/corridors walkable at the planned section | tunnels ~6 wide × 7 tall, corridors ~5×6; no <1-block traps, water gaps, or jumps >1 on any route | [M5] un-opped bot walks portal→rotunda→every building; [M7] measure section | [CREATIVE] geometry / no-op | ☐ pending |
| BU-10 | Redstone/utility accents are safe & decorative | reservoir water, "machinery," lighting use no fast clocks / lag sources; water only in intended basins, no leaks | [M2] inspect; [M3] scan for stray water | technical | ☐ pending |

### 5.3 Spatial integrity — envelope, Y-range, no-overlap, MSA buffer (family SP) — HARD constraints

| ID | Inspection item | Target (zero tolerance) | How to verify | Basis | Result |
|---|---|---|---|---|---|
| SP-01 | All geometry inside the protected envelope | every block X,Z ∈ [−300,+300] | [M3] scan the extreme extents (N5 x+285, **N6 x−290** — the true western extreme, not RR-B4 x−170; N4 z−285, N3 z+285) | envelope constant | ☐ pending |
| SP-02 | Nothing enters MSA's vertical band | **no Raven Rock block in y62→y79, EXCEPT the single RR-Z5 shaft column at x∈[193,207], z∈[−22,−8]** (the shaft head-house N9 sits at y64 by design, east of every planned MSA element) | [M3] scan the y62→y79 columns over the whole build; confirm zero RR blocks save the RR-Z5 shaft column | MSA-protection constraint | ☐ pending |
| SP-03 | The ~20-block greenstone buffer is intact | y41→y61 over every cavern is **solid greenstone**, no excavation, EXCEPT the single RR-Z5 shaft column | [M3] scan buffer columns above each cavern for air; confirm solid save the shaft | [CREATIVE] convention protecting MSA | ☐ pending |
| SP-04 | Buffer thickness ≥ target | RR ceiling y40 is ≥20 blocks below MSA foundation y62 (planned = 22) | [M3]/[M1] measure ceiling-to-foundation gap | [CREATIVE] convention | ☐ pending |
| SP-05 | No building footprint overlaps another | AABB non-intersection across RR-B1..B4 (planned min gap 32 blocks) | [M3] scan as-built AABBs; recompute pairwise overlap | planning collision check | ☐ pending |
| SP-06 | Each building sits inside its cavern box | as-built centroid + footprint within its RR-Z1/Z2/Z3 bounds | [M3] scan centroid/AABB vs zone box | [CREATIVE] zones | ☐ pending |
| SP-07 | Y-range holds | buildings within y−18..y11; each top below its cavern ceiling (40/40/36/28); deepest floor y−18 above bedrock | [M3] scan floor & roof planes | [CREATIVE] plan | ☐ pending |
| SP-08 | The RR-Z5 shaft crosses rock only, clear of MSA | shaft rises at x=+200 (east of every planned MSA element; ~70 blocks clear of the widest planned footprint x≈130); its buffer-crossing column touches no MSA block | [M3] scan the shaft column against MSA extents; [M1] F3 at N9 (200,64,−15) | [CREATIVE] deliberate liberty | ☐ pending |
| SP-09 | Deepest and highest points as planned | lowest floor = Cavern C sump y−18; highest excavated point = cavern ceilings y40; no accidental dig below y−18 or above y40 | [M3] extents scan | [CREATIVE] plan | ☐ pending |

### 5.4 Confidence-labeling integrity — honesty preserved end-to-end (family CL)

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| CL-01 | No [CREATIVE] presented as [VERIFIED] — in docs | no doc, sign, or label asserts any invented coordinate/room/tunnel/count as documented fact | [M2] review docs + in-world text vs the confidence tags | honesty discipline / REF-016 | ☐ pending |
| CL-02 | Interior labeled creative approximation throughout | every interior room, spring, blast door, corridor, and palette is tagged creative in the docs and disclosed on site | cross-check `buildings.yaml`/`palettes.yaml` tags; [M2] read signage | REF-016/REF-017 | ☐ pending |
| CL-03 | Only genuinely public facts carried as evidence | evidence claims are limited to manifest public items (greenstone, mission, era, tenants, springs-concept, ~4 portals, utilities); nothing beyond REF-001..REF-018 is asserted as fact | [M2] audit any on-site interpretive text against the manifest | manifest scope | ☐ pending |
| CL-04 | Counts flagged as popular figures, not authoritative | signage/labels for four buildings, two reservoirs, dual power, four portals, spring counts state these are design choices / popular figures, not verified | [M2] read the relevant signs/labels | REF-006/007/009 conflicts | ☐ pending |
| CL-05 | Confidence vocabulary never upgraded | the four-term vocabulary (verified / high-confidence inference / moderate-confidence reconstruction / creative approximation) appears unaltered; no term promoted | [M2] doc + signage audit | inherited discipline | ☐ pending |
| CL-06 | Depth-as-convention disclosed | any reference to depth states the ~20-block burial is a build convention, not the real ~650 ft | [M2] read signage/labels | REF-008 / build-scale note | ☐ pending |

### 5.5 Disclosure signage — mandatory per the 2007 depiction ban (family DS)

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| DS-01 | Primary disclosure sign at every portal | at each of the four portals (N3/N4/N5/N6) a legible sign states: this is an imaginative interpretation of a public landmark's public-record history & geology, **NOT** a map of the real (classified) interior | [M2] read each portal sign; [M1] confirm placement | **REQUIRED** REF-015 | ☐ pending |
| DS-02 | Disclosure repeated at blast vestibules & shaft head | N1, N2, and the N9 surface head-house each carry the same disclosure before a visitor enters the interior | [M2] read | REF-015 | ☐ pending |
| DS-03 | The depiction-ban context is stated plainly | signage explains *why* the interior is invented — the interior is classified and 2007 DoD policy forbids depicting the real complex | [M2] read | REF-015 (verified) | ☐ pending |
| DS-04 | Interior "creative approximation" reminders present | at least the rotunda (N10) and each building lobby carry a short "interior = creative approximation" note | [M2] walk & read | REF-016 | ☐ pending |
| DS-05 | Signage is vanilla & bot-placeable | signs/item-frames use `oak_sign`/`dark_oak_sign`/`item_frame`/`white_glazed_terracotta` (per `palettes.yaml`), placeable by an un-opped bot | [M3] scan sign ids; [M2] confirm readable | no-op constraint | ☐ pending |
| DS-06 | Surface visitor arriving via the shaft is disclosed | a visitor reaching N9 from the MSA east greenbelt meets the disclosure before descending | [M2]/[M5] approach N9 from MSA and confirm the sign | REF-015 | ☐ pending |

### 5.6 Geology fidelity — the ONE evidence-anchored fidelity check (family GE)

This is the *only* fidelity-to-reality family the public record supports, because geology is the one
material fact on the record (REF-003, VERIFIED). Everything else is self-consistency or honesty.

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| GE-01 | Mountain body reads as greenstone/metabasalt | cavern walls/ceilings/pillars are the dark, faintly-green metabasalt palette (`palettes.yaml` living_rock_greenstone): stone+deepslate+tuff+andesite stippled with moss/mossy_cobblestone/glow_lichen | [M2] visual; [M3] sample wall block ids vs the rock palette | **[VERIFIED]** REF-003 | ☐ pending |
| GE-02 | Granite is ABSENT from the rock body | zero granite / polished_granite / granite_stairs in cavern walls, pillars, or tunnel bores (the `avoid` list) | [M3] scan rock faces for granite ids | **[VERIFIED]** REF-003 + geology conflict | ☐ pending |
| GE-03 | Green cast is legible, not grey | the shell reads visibly greenish (chlorite film) via moss/glow_lichen stipple, not a flat grey stone box | [M2]/[M6] visual; [M3] confirm moss-family presence on faces | [VERIFIED] identity / [CREATIVE] mapping | ☐ pending |
| GE-04 | Excavated ("blasted-out") read is present | caverns read as blasted voids with spoil/scree detail, not natural smooth caves (half-million cu yds hauled out, REF-004) | [M2] visual; [M6] capture | [VERIFIED] excavation / [CREATIVE] rendering | ☐ pending |

---

## 6. Per-zone / per-building acceptance matrix (five completion booleans)

Mirrors the `completion` block in `buildings.yaml`. A structure is *accepted* only when all five booleans
are true **and** its PC/BU/SP/CL/GE items pass. **All currently `false` / PENDING (nothing built).**

| ID | Structure / element | Footprint staked | Exterior shell | Roof | Interior | Palette & detailing |
|---|---|---|---|---|---|---|
| RR-B1 | Command & Operations Center (ANMCC) | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-B2 | Signal & Communications Center | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-B3 | Quarters, Dining & Medical | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-B4 | Power & Ventilation Plant | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-Z1 | Cavern A void + rotunda N10 + spring array N8 | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-Z2 | Cavern B void | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-Z3 | Cavern C void + reservoirs N7 | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-Z4 | Portal/tunnel network (T1–T4, C1–C2, vestibules N1/N2) | ☐ | ☐ | ☐ | ☐ | ☐ |
| RR-Z5 | Vertical access shaft + head-house N9 (droppable liberty) | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## 7. Definition-of-Done gates (final gate; ALL must pass to ship)

The build is **DONE** only when every gate below is satisfied. **Each is PENDING (nothing built).**

| Gate | Condition | Ties to |
|---|---|---|
| ☐ DoD-01 | All 9 structures/elements in §6: five completion booleans = true | §6 |
| ☐ DoD-02 | Every §5 inspection item (PC/BU/SP/CL/GE/DS) = **pass** or a signed-off **N/A** | §5 |
| ☐ DoD-03 | Zero open **blocker**/**major** defects in `qa/defects.yaml`; all logged defects `fixed`+`verified` or explicitly `deferred` with sign-off | defects.yaml |
| ☐ DoD-04 | **Planning consistency confirmed on the as-built** — PC-01..PC-06 pass; the single agreed layout was honored and no third geometry emerged (the MSA GRID/OVAL bypass did NOT recur) | §3 / 5.1 |
| ☐ DoD-05 | **Spatial safety re-verified on the as-built scan** — SP-01..SP-09 pass: inside envelope, no block in MSA's y62→y79, ≥20-block buffer intact, no building overlap | 5.3 |
| ☐ DoD-06 | **Walkability proven** — an **un-opped** bot traverses each portal → its vestibule → rotunda N10 → every building door → up every storey (BU-08/BU-09 pass) | 5.2 |
| ☐ DoD-07 | **Mandatory disclosure signage installed** — DS-01..DS-06 pass: every portal, vestibule, shaft head, rotunda, and building lobby discloses this is a creative approximation, not a real interior map (REF-015) | 5.5 |
| ☐ DoD-08 | **Vanilla-legality + no-op buildability confirmed** and no builder litter (BU-01/BU-03/BU-07) | 5.2 |
| ☐ DoD-09 | **Geology fidelity confirmed** — GE-01..GE-04 pass: greenstone/metabasalt read, no granite in the rock body | 5.6 |
| ☐ DoD-10 | This QA report countersigned by a second (cross-check) reviewer against every other agent's coordinates | process |
| ☐ DoD-11 | **Confidence labels preserved end-to-end** — no [CREATIVE] approximation is presented anywhere, in-world or in docs, as [VERIFIED] fact; the interior is labeled creative approximation throughout (CL-01..CL-06) | honesty discipline |
| ☐ DoD-12 | **No item ever demanded interior historical accuracy** — the acceptance record contains zero pass/fail against undocumentable interior truth (the category-error guard of §0 held) | §0 integrity |
| ☐ DoD-13 | Final record set captured & archived (prismarine-viewer [M6] cavern + per-building + lighting-mood + signage captures) | process |

---

## 8. Handoff notes & carried-forward open items (for the cross-checking agent)

- **Adopted canonical geometry:** `site-plan.md` (declared master); `coordinates.yaml` and `buildings.yaml`
  restate it and — per the §3 audit — **agree with it exactly.** Unlike MSA, there is **no coordinate fork
  to reconcile**; the single-spatial-owner discipline held. If any future edit desyncs the two YAMLs from
  the master, that is a bug in the YAMLs, and it becomes an open PC item (not a build defect).
- **`qa/defects.yaml` is intentionally EMPTY** — nothing is built, so there are no as-built defects. It
  carries the same schema and "nothing built" header convention as MSA's register, ready to populate on
  first inspection. **Planning-consistency notes are NOT build defects and are not recorded there;** they
  live here in §3/§8.
- **Documented design choices carried forward (NOT defects — reconcile as a set if the design changes):**
  - **Four buildings** is a [CREATIVE] middle between the contested three (Wikipedia) and five (popular)
    counts (GAP-02 / REF-006). If a decision standardizes on three or five, reconcile all three planning
    files together, then re-run §3.
  - **Utility / reservoir / portal / spring counts** (two reservoirs, dual power, four portals, spring
    arrays) are popular figures, not authoritative (GAP-04 / REF-007/009). CL-04 requires them labeled as
    design choices on site.
  - **The RR-Z5 vertical access shaft** is a labeled deliberate liberty (GAP-05). If it is cut for purity,
    RR-Z5, N9, and the S1 spur drop with no effect on the four buildings or four portals; retire SP-08,
    DS-06, and the RR-Z5 matrix row with it.
- **The category-error guard is load-bearing.** Reviewers must resist the instinct to "check the layout
  against the real facility." There is no such check available or legal (REF-015). DoD-12 exists to make
  that a shippable gate: the acceptance record must contain **zero** interior-historical-accuracy pass/fail.
- **Tolerances** (§2.4) are my [CREATIVE] call; the HARD spatial constraints (envelope, MSA buffer,
  no-overlap, Y-range) are non-negotiable regardless of the [CREATIVE] status of the underlying numbers,
  because they protect the MSA build above and the shared envelope.
