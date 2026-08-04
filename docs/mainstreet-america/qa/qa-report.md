# MainStreet America — QA Framework & Inspection Report

**Subject:** Minecraft Java 1.21.x reconstruction of the former *MainStreet America* home-design
attraction, 18750 Interstate 45 N, Spring, Texas 77373 (closed).
**Document:** `qa/qa-report.md` — the acceptance/inspection framework. Turns the Section 21
requirement families into concrete, checkable in-world inspection items, and adds the Section 25
definition-of-done as a final gate.
**Author role:** QA / planning engineer. Another agent will cross-check the coordinates asserted here
against the rest of the planning set.
**Build status at time of writing:** CONSTRUCTION UNDERWAY (as-built, per `qa/as-built-survey.md`,
live-server RCON, 2026-07-24). An overnight bot build placed much of the core — a two-story hollow Guest
Center shell, a y=63 road/street spine, and flanking model homes (see the survey for exact measurements).
Inspection can now begin against **real geometry**: the survey supersedes the earlier "nothing built"
state. Most inspection items below remain `status: PENDING` until each is individually run, but they are
no longer blocked on the absence of a build. The defect register (`qa/defects.yaml`) has been populated
with the first plan-vs-as-built divergences the survey documents.

> **2026-07-26 recovery status.** This document remains the historical/manual acceptance framework; its
> unchecked boxes are not the current automated result. The executable suite in
> `docs/audits/mainstreet-america.yaml` passes **66/66**, including ten parking/arrival checks. The recovered
> parking field contains 236 mapped spaces and the south gate is walkably connected to the Guest Center,
> Discovery Court, mountain portal, hangar, and arena. See `qa/audit-2026-07-26.md`,
> `qa/audit-post-parking-2026-07-26.json`, and `qa/parking-recovery-2026-07-26.md`.

---

## 0. How to read this document (confidence discipline — inherited, never upgraded)

Every assertion of *what the build should be* carries exactly one confidence tag, matching
`references/manifest.yaml` and the planning docs:

- **[VERIFIED]** — primary/multi-source fact (home roster, building square footages, site sequence).
- **[INFERENCE]** — a strong read of one source (the Colliers annotated aerial; front-to-back order).
- **[RECONSTRUCTION]** — assembled from weak/unlabeled evidence (detention pond).
- **[CREATIVE]** — no evidence; a build convention (rotated bearing, oval loop, all facades/materials,
  all exact coordinates, home→lot ordering, tolerances).

**A QA item can only demand fidelity to the confidence level of the underlying fact.** We inspect a
home's *square footage and story count* as **[VERIFIED]** truth; we inspect its *facade materials*
only as *"does it match the build's own declared [CREATIVE] palette,"* never as historical accuracy.
Holding a creative approximation to a "verified" bar is itself a QA defect. When prose and a tag
disagree, trust the tag.

---

## 1. Assumptions this framework had to make (read before trusting any target number)

1. **No literal brief / no literal "Section 21" or "Section 25" text was recovered.** The repo
   contains only `references/manifest.yaml`, `references/README.md`, and the three `planning/` files.
   The task enumerates Section 21's six requirement families (site accuracy, architecture, interiors,
   site function, technical quality, visual quality) and a Section 25 definition-of-done. I have
   **reconstructed** the checklists from those family names plus the verified planning content. If a
   canonical Section 21/25 exists elsewhere, it wins; reconcile against it. **[CREATIVE structure over
   VERIFIED content].**

2. **TWO COORDINATE SCHEMES EXIST IN THE PLANNING SET — they disagree.** This is the single most
   important thing for a cross-checking agent to know. See §2. This report adopts the
   **`site-plan.md` + `buildings.yaml` OVAL scheme as canonical** for all coordinate targets, because
   `site-plan.md` is the declared master ("other agents will cross-check their coordinates against
   this file") and `buildings.yaml` concurs with it. The divergent numbers in `coordinates.yaml` are
   logged as a **reconciliation item (DoD-4)** that must be closed before the build is accepted. (This
   began as a pre-build blocker; an overnight build has since placed core geometry in a *third*, compact
   central-street layout matching neither column — see `qa/as-built-survey.md` — so DoD-4 is now a
   plan-vs-as-built reconciliation.) I did not silently merge them.

3. ~~**STOCK PAPER (no plugins) governs *how* we inspect.**~~ **CORRECTED 2026-07-25 — false premise.**
   `plugins` over RCON reports **PacketCraft, WorldEdit 7.4.0, WorldGuard 7.0.16**. Only **Dynmap/BlueMap
   and Citizens** are absent, so only Dynmap renders and NPC pathing are actually off the toolkit;
   `//count` / `//size` ARE available through an opped bot. **CORRECTION: the builder bots ARE now opped (level 4 in `ops.json`, per
   `qa/as-built-survey.md`)** — the earlier "not opped" premise is stale. QA nonetheless **deliberately
   uses OP-FREE inspection methods only** (F3, the terrain-scan API, and un-opped walkability probes), so
   every §3 method stays valid *regardless* of op state. The "un-opped bot" *test designs* elsewhere
   (M2/M5, SF-07, TQ-10, DoD-06) are intentional and retained: they prove a route/build is achievable
   without op even though the bots now hold it. What remains is real and sufficient — see §3. "Verify
   in-world" throughout means *one of the §3 methods*, not a WorldEdit selection.

4. **Tolerances are mine, and [CREATIVE].** Block dimensions are derived approximations of verified
   square footages, so exact-block equality is not expected. Unless an item says otherwise:
   - Floor-area tolerance: **±10%** of target block-area (per floor, then × story count).
   - Centroid position tolerance: **±3 blocks** in X and Z from the canonical coordinate.
   - Wall height: **≈5 blocks per story, ±1**.
   - Count tolerances (home count, story count, bed/bath count): **exact, zero tolerance** — these are
     [VERIFIED] and non-negotiable.

5. **Cooking-school placement is unresolved across the planning set** (embedded annex of the Guest
   Center vs a separate 8,342 SF pad). The relevant items (SA-04, SF-04) are written to pass under
   *either* resolution, provided the 8,342 SF is represented exactly once (never double-counted).

6. **The Ashby Manor story count is [VERIFIED-as-unknown]** (source lists it null; the build assumes
   2). SA-08/AR-06 inspect it against the *assumed* 2 and flag it, rather than asserting a fact.

---

## 2. Coordinate reconciliation required BEFORE build (blocking pre-build defect → DoD-4)

The planning documents describe two incompatible layouts. QA targets below use the **canonical (oval)**
column; the **divergent** `coordinates.yaml` column must still be reconciled to zero (DoD-4). This began
as a pre-build blocker; the overnight build (`qa/as-built-survey.md`) has since placed core geometry in a
*third*, compact central-street layout matching neither column, so DoD-4 is now a plan-vs-as-built
reconciliation and its first divergences are logged in `qa/defects.yaml`.

| Element | Canonical — `site-plan.md` / `buildings.yaml` (OVAL) | Divergent — `coordinates.yaml` (GRID) |
|---|---|---|
| Home arrangement | Graceful **oval ring** (8 outer + 4 inner island) around center ≈(0, −55) | **Two straight rows** at X = −85 (west) and X = +85 (east) |
| Guest Center centroid / plate | (0, 64, **+88**), 90×60 ground plate | (0, 64, **+75**), 75×75 ground plate |
| Cooking school / Building 2 | Embedded annex of MSA-00 **or** separate pad **(−112, 64, −7)**, ~45×46 | Separate pad **(−190, 64, −90)**, 46×46 |
| Warehouse / Building 3 | **(−96, 64, −206)**, 47×47 | **(0, 64, −255)**, 48×47 |
| Billboard monument | ≈ **(+95, 64, +272)** (south frontage, offset to entry throat) | **(−260, 64, +280)** (SW corner) |
| Detention pond | Build-NE rear, X∈[+90,+205], Z∈[−240,−150] | (+190, 64, −250) — roughly consistent (NE rear) |
| Site gateway on south drive | Drive enters at Z = **+300**, X≈0 | Gateway block at **(0, 64, +275)** |

Both schemes honor the *verified* facts (sizes, roster, front-to-back order, south entrance). They
differ only in *invented* geometry — which is exactly the class the manifest says is the builder's
choice. **Pick one, update the loser, then build.**

---

## 3. Verification toolkit (what QA actually has on a no-op Paper server)

Every "How to verify" cell cites one or more of these methods by tag.

- **[M1] F3 Debug HUD** — any player (op or not) reads live XYZ, the block under the crosshair,
  facing (`f:`), light level, biome, and chunk borders. Primary tool for coordinate and height spot
  checks and for confirming a door faces the intended axis.
- **[M2] Human-op spectator/creative fly-through** — a *human admin* with op (the **bots** are
  un-opped; a human reviewer is not) flies the site for visual, silhouette, enclosure, and reachability
  inspection. The standard channel for all VQ and most AR/IN items.
- **[M3] mc-fleet-bot terrain-scan API** — `GET /api/terrain?x&y&z&radius` returns block ids in a
  cube; `GET /api/terrain/height?x&z` returns column height. This is the **programmatic, op-free** way
  to measure footprints, count floor blocks, confirm foundations meet Y=64, detect off-palette blocks,
  and recompute as-built centroids/AABBs. The backbone of automated SA/TQ/VQ checks.
- **[M4] World-model / world snapshot** — `GET /api/world/model`, `GET /api/world` (time, weather,
  online) to run enclosure checks under rain/night and confirm environmental state during a probe.
- **[M5] Bot walkability probe** — dispatch an **un-opped** bot with `POST /api/bots/:name/walkto`,
  `/follow`, or a queued task, then watch `/api/bots/:name/detailed` + `bot:position` events. If a bot
  that *cannot fly or op* reaches the target on foot, the route is genuinely walkable (doors wide
  enough, no 1-block traps, no water gaps). The definitive functional (SF) test.
- **[M6] Prismarine-viewer capture** — `GET /api/bots/:name/viewer-port` yields an in-world render per
  bot for screenshots without a game client; feeds VQ silhouette/night/cohesion checks.
- **[M7] Manual tape-measure** — count blocks along an axis using two F3 readings (dimensions, wall
  heights, aisle widths) where a scan is overkill.

Explicitly **unavailable** *(revised 2026-07-25)*: **Dynmap/BlueMap tiles**, **Citizens NPC pathing**, and
**WorldGuard `/rg info` / `/rg list` read-back over RCON** (those two commands render asynchronously and
their output never reaches an RCON sender — verify region state from
`plugins/WorldGuard/worlds/world/regions.yml` after an explicit `rg save` instead). Now **available**:
WorldEdit `//count` / `//size` and `//` selections via an opped bot (`POST /api/bots/<name>/say`), and
WorldGuard `/rg flag` / `/rg setpriority`, which do reply over RCON. schematic-diff is still unavailable
(missing tooling, not a missing plugin).

**Result legend for every table:** `☐ pass  ☐ fail  ☐ N/A` — every item is **PENDING** until individually
run. Construction is underway (`qa/as-built-survey.md`), so these are no longer blocked on the absence of a
build; each stays PENDING only until its inspection is executed. Log any fail as a record in `qa/defects.yaml`.

---

## 4. Section 21 — QA inspection items

### 21.1 Site Accuracy — faithfulness to the VERIFIED site record

| ID | Inspection item | Target / tolerance | How to verify in-world | Basis | Result |
|---|---|---|---|---|---|
| SA-01 | All built geometry lies inside the protected envelope | X,Z ∈ [−300,+300]; base plane Y=64 | [M3] scan the four corner columns + extents; [M1] F3 at outermost blocks | [VERIFIED] envelope | ☐ pending |
| SA-02 | Front-to-back program order, south→north | frontage → billboard → parking → guest center → homes → cooking school (mid) → warehouse (rear) | [M5]/[M2] traverse the X≈0 spine reading Z on [M1]; confirm each function appears in order | [VERIFIED/INFERENCE] REF-014 | ☐ pending |
| SA-03 | Guest Center floor area | ≈44,019 SF ⇒ ≈10,800 floor-blocks; ground plate 90×60=5,400 ±10%; 2 floors | [M3] scan ground AABB at (0,64,+88), count solid floor blocks, ×2 | [VERIFIED] REF-007 | ☐ pending |
| SA-04 | Cooking school / retail represented at correct area, exactly once | ≈8,342 SF ⇒ ≈2,086 blk (~45×46), 1 floor; embedded annex OR separate pad — not both, not double-counted | [M3] scan the chosen location; confirm one 8,342 SF space only | [VERIFIED] REF-009 | ☐ pending |
| SA-05 | Warehouse floor area & rear position | ≈8,944 SF ⇒ ≈2,209 blk (47×47), 1 floor, far-rear (−Z) service end | [M3] scan AABB at (−96,64,−206); [M1] confirm it is the northmost structure | [VERIFIED] REF-010 | ☐ pending |
| SA-06 | Exactly twelve model homes | 12 — no more, no fewer (do NOT use the disputed "11") | [M2] count distinct home structures in the homes zone; [M3] confirm 12 footprints | [VERIFIED] REF-017 | ☐ pending |
| SA-07 | Each home's floor area within tolerance of its verified SF | per-home SF/4 × stories, ±10% (see roster table §4a) | [M3] scan each home AABB, count floor blocks × stories, compare | [VERIFIED] REF-017 | ☐ pending |
| SA-08 | Each home's story count matches roster | Alexandria 3, Villa Lago 2, Cape Pointe 2, Calais 2, Ashby **2 (assumed — flag)**, Casa Lana 1, Centennial 2, Cross Creek 1, Midtown 4, Timbergrove 1, Valencia 1, Wakefield 1 | [M1]/[M7] measure floor-to-floor; count storeys | [VERIFIED] REF-017 (Ashby [VERIFIED-unknown]) | ☐ pending |
| SA-09 | Parking field size & stall count | ≈100,000 SF concrete ⇒ ≈25,000 blk paving; **236** stalls (Colliers; note 258 conflict) | [M3] scan paving area; [M2] count stall stripes | [VERIFIED] REF-012 | ☐ pending |
| SA-10 | Frontage LED monument billboard present | one large sign structure at the frontage per canonical (≈(+95,+272)) | [M2] locate; confirm single prominent monument, not a small sign | [VERIFIED] REF-013 | ☐ pending |
| SA-11 | Homes line a single self-contained non-through circuit, both sides — NOT a grid | one closed loop, homes on inner & outer faces, no through-street | [M5] a bot traversing the loop returns to start without exiting; [M2] confirm no grid | [VERIFIED] REF-015 | ☐ pending |
| SA-12 | Scale fidelity (1 block ≈ 2 ft) applied consistently | spot-check 3 buildings: block-area×4 ≈ verified SF within ±10% | [M3] scan + arithmetic | [VERIFIED] scale constant | ☐ pending |
| SA-13 | Detention pond at rear corner | a water body at build-NE rear (X∈[+90,+205], Z∈[−240,−150]) | [M2]/[M3] locate water; confirm rear-corner placement | [RECONSTRUCTION] REF-016 | ☐ pending |
| SA-14 | Principal entrance on the SOUTH (+Z) edge | site gateway/drive opens toward +Z at the south boundary, X≈0 | [M1] F3 at gateway; confirm approach axis runs −Z into the site | [CREATIVE convention] over [VERIFIED west gradient] | ☐ pending |
| SA-15 | Honesty signage installed on site | a visible plaque stating: bearing is rotated (real front = WEST), the loop is an oval not the real straight cul-de-sac, and all facades/materials are approximations | [M2] read the sign(s) at the entrance and near the homes loop | required by planning honesty discipline | ☐ pending |

#### 4a. Verified home roster — the SA-07/SA-08 target table

| Home | Style | Verified SF | Stories | Target blk/floor (SF/4/stories) | ±10% floor-block band |
|---|---|---|---|---|---|
| The Alexandria | Greek Revival | 6,011 | 3 | ~501 | 451–551 |
| The Villa Lago | Italian Mediterranean | 5,979 | 2 | ~747 | 673–822 |
| The Cape Pointe | Coastal Beach House | 1,815 | 2 | ~227 | 204–250 |
| The Calais | French Hill Country | 4,101 | 2 | ~513 | 461–564 |
| The Ashby Manor | Old World | 4,138 | 2 (assumed) | ~517 | 466–569 |
| The Casa Lana | Spanish Courtyard | 3,240 | 1 | ~810 | 729–891 |
| The Centennial | Craftsman | 2,715 | 2 | ~339 | 306–373 |
| The Cross Creek | Texas Hill Country | 3,223 | 1 | ~806 | 725–886 |
| The Midtown | Contemporary Townhome | 2,417 | 4 | ~151 | 136–166 |
| The Timbergrove | Classic Stone & Siding | 2,321 | 1 | ~580 | 522–638 |
| The Valencia | Southwestern Mediterranean | 1,881 | 1 | ~470 | 423–517 |
| The Wakefield | Traditional Brick | 2,622 | 1 | ~655 | 590–721 |

*Values [VERIFIED] REF-017. Block figures [INFERENCE] (arithmetic). The Ashby story count is
[VERIFIED-as-unknown]; if a real count surfaces, refactor its band before inspecting.*

### 21.2 Architecture — massing, rooflines, entries, style legibility (all facades [CREATIVE])

Each home was assigned a deliberately **distinct** massing/roof/entry concept in `buildings.yaml`.
QA checks that the *build's own* concept is realized, not that it matches undocumented history.

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| AR-01 | Twelve distinct rooflines — no two homes share a massing/roof concept | 12 unique silhouettes | [M6]/[M2] side-by-side silhouette compare vs the `buildings.yaml` "notes" concepts | [CREATIVE] design intent | ☐ pending |
| AR-02 | Alexandria | full-height tetrastyle portico + central pediment, symmetric, 3-story, low hip behind | [M2] visual; [M1] confirm 3 storeys | [CREATIVE] facade / [VERIFIED] 3-story | ☐ pending |
| AR-03 | Villa Lago | arcaded round-arch loggia entry, stepped low-pitch terracotta hips, projecting 3-car garage wing | [M2] visual | [CREATIVE] / garage [VERIFIED] | ☐ pending |
| AR-04 | Cape Pointe | gabled raised cottage, external front porch stair, dormered loft, smallest mass | [M2] visual; smallest footprint confirmed by SA-07 | [CREATIVE] (pier expression unverified) | ☐ pending |
| AR-05 | Calais | steep French hip (near-mansard), corner stair turret, round-arch entry, eyebrow dormers | [M2] visual | [CREATIVE] | ☐ pending |
| AR-06 | Ashby Manor | asymmetric mixed-masonry cross-gables (unequal height) + off-center arched porch + walled garden | [M2] visual; flag if built as 1-story | [CREATIVE]; stories [VERIFIED-unknown] | ☐ pending |
| AR-07 | Casa Lana | single-story U-plan around open central courtyard, barrel-tile, detached casita, arched portal | [M2] visual; [M1] confirm 1 story | [CREATIVE] / casita [VERIFIED] | ☐ pending |
| AR-08 | Centennial | Craftsman low front gable, deep eaves, exposed rafter tails, full-width porch on battered stone piers | [M2] visual | [CREATIVE] | ☐ pending |
| AR-09 | Cross Creek | limestone dog-trot breezeway entry + full-length rear porch, light standing-seam gable, 1-story | [M2] visual; confirm pass-through | [CREATIVE] / rear porch [VERIFIED] | ☐ pending |
| AR-10 | Midtown | 4-story cantilevered glass-curtain-wall tower, flat roof + rooftop terrace, tuck-under entry | [M2] visual; [M1] confirm 4 storeys | [CREATIVE] / 4-story [VERIFIED] | ☐ pending |
| AR-11 | Timbergrove | stone-gable + lap-siding wings under cross-gable, small gable-portico stoop | [M2] visual | [CREATIVE] | ☐ pending |
| AR-12 | Valencia | flat parapet stucco (pueblo-adjacent), projecting vigas, recessed arched portal, 1-story | [M2] visual | [CREATIVE] | ☐ pending |
| AR-13 | Wakefield | symmetric brick hip, centered door w/ sidelights, visible rooftop solar/NRG tech-demo | [M2] visual; confirm rooftop tech accent | [CREATIVE] / energy-home [VERIFIED] | ☐ pending |
| AR-14 | Guest Center | central-pavilion portico + flanking hipped wings, long face SOUTH, distinct from every home | [M2] visual; [M1] confirm south main face | [CREATIVE] / [VERIFIED] 2-story anchor | ☐ pending |
| AR-15 | Warehouse | plain wide low-slope metal shed, roll-up loading doors on the south service-yard face, least ornamented | [M2] visual | [CREATIVE] / [VERIFIED] utilitarian | ☐ pending |
| AR-16 | Every building has a real front door at its planned entrance coordinate | door present within ±2 blocks of each `entrance_coordinate`, facing the intended axis | [M1] F3 at each entrance coord; confirm openable door | [CREATIVE] placement | ☐ pending |
| AR-17 | Wall heights read at ≈5 blocks/story | 5 ±1 per story | [M7] measure a wall on 3 sample buildings | [CREATIVE] convention | ☐ pending |
| AR-18 | Facade-approximation disclaimer applied | docs + on-site signage mark all facades/materials as [CREATIVE], never as documented fact | [M2] read signage; cross-check `buildings.yaml` palette tags | honesty discipline / REF-019 | ☐ pending |

### 21.3 Interiors — program rooms present, enclosed, lit, furnished, connected

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| IN-01 | Guest Center program rooms all present | orientation lobby, T.E.D. distribution desk, furniture showroom, design studio, MAIN restaurant dining + kitchen, event hall/ballroom, retail gallery, offices, public restrooms, BOH (+ cooking-school demo kitchen if embedded) | [M2] walk each room; tick against `buildings.yaml` MSA-00 room list | functions [VERIFIED] REF-008/018 | ☐ pending |
| IN-02 | Design studio sub-space sized | ≈10,000 SF ⇒ ≈2,500 blk enclosed area within the Guest Center | [M3] scan the sub-room footprint | [VERIFIED] REF-018 | ☐ pending |
| IN-03 | Each home contains its VERIFIED signature room | Alexandria media room; Villa Lago covered outdoor living + 3-car garage; Cape Pointe loft; Calais game room; Ashby private garden; Casa Lana casita; Cross Creek full-length rear porch; Midtown rooftop terrace; Timbergrove covered rear porch; Valencia bonus 4th bedroom; Wakefield geothermal/NRG mechanical room; Centennial per program | [M2] walk each home; confirm the named feature exists | [VERIFIED] REF-017 | ☐ pending |
| IN-04 | Bed/bath counts match roster per home | exact counts per REF-017 (e.g. Alexandria 4bd/3ba, Villa Lago 5bd/4ba, Valencia 4bd/2ba …) | [M2] count enclosed bedrooms & baths | [VERIFIED] REF-017 | ☐ pending |
| IN-05 | All interiors fully enclosed | no missing wall/roof gaps; no rain/light ingress | [M4] set rain/night, [M2] walk; [M3] scan roof plane for holes | technical | ☐ pending |
| IN-06 | Interior lighting adequate | no fully dark rooms; occupied rooms light level ≥ mob-safe threshold | [M1] F3 light readout while walking; [M2] night pass | technical | ☐ pending |
| IN-07 | Baseline furnishing per room type | bedrooms have beds; kitchens have counters/appliances; dining has table/seating; restrooms fitted | [M2] visual per room | [CREATIVE] dressing | ☐ pending |
| IN-08 | Vertical circulation connects every floor | stairs/ladders reach every storey of multi-floor builds (Guest Center 2, Alexandria 3, Midtown 4, Villa Lago/Calais/Centennial 2, Cape Pointe 2) | [M5] bot walks floor-to-floor where possible; [M2] confirm | technical | ☐ pending |
| IN-09 | Warehouse interior program | loading bay, bulk storage racks, staging area, small office, restroom | [M2] walk | [VERIFIED] function REF-010 | ☐ pending |
| IN-10 | No sealed-off / inaccessible rooms | every interior room reachable through an operable ≥1-wide door | [M5] bot path samples; [M2] confirm no walled-in voids | technical | ☐ pending |

### 21.4 Site Function — circulation, zoning, reachability by an UN-OPPED bot

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| SF-01 | Primary entrance drive is continuous & walkable | south edge (X≈0, Z=+300) north to the drop-off; no gaps/steps >1 | [M5] bot walks (0,64,300) → Guest Center forecourt | [CREATIVE] geometry / [VERIFIED] approach | ☐ pending |
| SF-02 | Visitor drop-off loop at the forecourt | teardrop turnaround ≈(0,+135) tangent to the south face | [M5]/[M2] trace | [CREATIVE] | ☐ pending |
| SF-03 | All 12 home entrances reachable on foot without crossing the carriageway | a loop-side promenade links every front door | [M5] bot walks door→door around the loop | [CREATIVE] / [VERIFIED] loop | ☐ pending |
| SF-04 | Service route separated from visitors | narrow drive hugging west edge (≈X−150), spur to Building 2 + warehouse, no at-grade crossing of drive/loop | [M5]/[M2] trace; confirm no visitor-route intersection | [CREATIVE] geometry | ☐ pending |
| SF-05 | Warehouse NOT on the visitor network | no public pedestrian path leads to Building 3 | [M2] confirm; [M5] bot from entrance cannot reach it via public paths | [VERIFIED] BOH intent | ☐ pending |
| SF-06 | Parking aisles walkable & connected | double-loaded bays link to the forecourt sidewalk | [M5]/[M2] trace aisle → forecourt | [CREATIVE] layout | ☐ pending |
| SF-07 | Every zone reachable on foot from the entrance by an un-opped bot | no route needs a jump >1, a ladder on a public path, or a water gap | [M5] walkability probe from entrance to each zone centroid (Z01–Z09) | no-op constraint | ☐ pending |
| SF-08 | Path widths adequate | main routes ≥2 wide; all gate openings passable | [M7] measure; [M5] bot passage | technical | ☐ pending |
| SF-09 | Event lawn (Z09) accessible & equipped | open lawn east of Guest Center with stage + market row | [M2] walk | [VERIFIED] events / [CREATIVE] placement | ☐ pending |
| SF-10 | Pond footpath | short scenic path off the loop's north promenade to the pond | [M2]/[M5] trace | [CREATIVE] | ☐ pending |
| SF-11 | No accidental cliffs/holes on walkable routes | continuous Y=64 surface along all public paths | [M3] height scan along route centerlines | technical | ☐ pending |
| SF-12 | Each structure sits inside its assigned zone box | as-built centroid within the `site-plan.md §2` zone bounds | [M3] scan centroid vs zone AABB | [CREATIVE] zones | ☐ pending |

### 21.5 Technical Quality — legality, structural soundness, coordinate integrity

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| TQ-01 | Vanilla 1.21.x blocks only | zero modded / resource-pack-dependent blocks | [M3] scan block ids against the vanilla 1.21 set | project constant | ☐ pending |
| TQ-02 | No unintended floating/unsupported blocks | only deliberate cantilevers (e.g. Midtown) allowed, and they must read as supported | [M3] scan for unsupported spans; [M2] visual | technical | ☐ pending |
| TQ-03 | Foundations meet ground; no void holes | every footprint column solid down to/through Y=64; no gaps to void/bedrock | [M3] `terrain/height` under each footprint | technical | ☐ pending |
| TQ-04 | No overlapping building footprints | AABB non-intersection across all 15 structures (planning gap ≥ ~10 blk) | [M3] scan as-built AABBs; recompute pairwise overlap | planning collision check | ☐ pending |
| TQ-05 | Nothing crosses the envelope or its zone | all extents within X/Z ∈ [−300,+300] and within assigned zone | [M3] extents scan | envelope constant | ☐ pending |
| TQ-06 | Coordinate integrity vs canonical plan | as-built centroid within ±3 blocks of the canonical coordinate for all 15 structures | [M3] scan centroid vs §2 canonical table / `buildings.yaml` | [CREATIVE] coords | ☐ pending |
| TQ-07 | No hostile-spawn / hazard conditions in public areas | light ≥ spawn-safe on paths & interiors; no lava/fire near guests | [M1] light readout; [M2] night pass | technical | ☐ pending |
| TQ-08 | No unintended water/flooding | water only in the pond & intended features; no leaks into buildings/paths | [M3] scan for stray water; [M2] visual | technical | ☐ pending |
| TQ-09 | Tech/redstone accents are safe & decorative | Wakefield "solar", billboard "LED" etc. use no fast clocks / lag sources | [M2] inspect; confirm no ticking redstone loops | technical | ☐ pending |
| TQ-10 | Build is achievable by un-opped bots | no command blocks, structure-void, or op-only artifacts anywhere | [M3] scan for command_block/structure_block ids | no-op constraint | ☐ pending |
| TQ-11 | Terrain regraded cleanly at foundations | no 1-deep moats, floating dirt, or abrupt cliffs at building perimeters | [M3] perimeter height scan; [M2] visual | technical | ☐ pending |
| TQ-12 | No builder litter left behind | no stray scaffolding/temp cobble/dirt columns from bot construction | [M3] scan for out-of-palette blocks; [M2] sweep | bot-build hygiene | ☐ pending |

### 21.6 Visual Quality — cohesion, palette, silhouette, landscape, "reads as a $20M destination"

| ID | Inspection item | Target | How to verify | Basis | Result |
|---|---|---|---|---|---|
| VQ-01 | Each building matches its declared palette | facade block ids match the `buildings.yaml` palette for that structure | [M3] scan facade sample vs declared palette; [M2] visual | [CREATIVE] palette | ☐ pending |
| VQ-02 | Palette discipline | consistent material families per building; no jarring off-palette blocks | [M2] visual; [M3] spot scan | [CREATIVE] | ☐ pending |
| VQ-03 | Silhouettes legible & distinct | each roofline reads clearly from ground and overhead; 12 homes distinguishable | [M6] capture silhouettes; compare | design intent | ☐ pending |
| VQ-04 | Landscaping present | greenbelt buffer wrap (thickest N & E), inter-lot planting, forecourt symmetry | [M2] walk perimeter & loop | [RECONSTRUCTION]→[CREATIVE] | ☐ pending |
| VQ-05 | Curated-destination read (not a tract subdivision) | axial arrival terminates the sightline on the Guest Center; varied setbacks; no uniform grid of equal lots | [M2] view down the entrance axis; [M6] capture | [VERIFIED] $20M destination / [CREATIVE] moves | ☐ pending |
| VQ-06 | Facade depth & detailing | walls are not flat single-plane; window bays, trim, quoins, entries modeled with relief | [M2] visual per building | [CREATIVE] | ☐ pending |
| VQ-07 | Human-scale openings | doors 2 high; windows proportioned; no oversized/undersized apertures | [M2] visual; [M7] measure samples | technical | ☐ pending |
| VQ-08 | Event space reads as an event venue | lawn + market row + stage legible as programmable space | [M2]/[M6] view | [VERIFIED] function | ☐ pending |
| VQ-09 | Pond naturalized | irregular edge, reeds/planting — not a square hole | [M2]/[M6] view | [RECONSTRUCTION] | ☐ pending |
| VQ-10 | Parking reads as a striped concrete field | stall lines & aisles visible, not a flat gray blob | [M6] overhead capture | [VERIFIED] program | ☐ pending |
| VQ-11 | Night read | warm inhabited lighting; no dark dead zones across the campus | [M4] set night; [M6] capture | design intent | ☐ pending |
| VQ-12 | Campus cohesion | the 15 structures read as one curated campus despite style variety (shared ground plane, paths, planting, signage) | [M6] overhead capture; [M2] whole-site fly | design intent | ☐ pending |

---

## 5. Per-building acceptance matrix (the five completion booleans × 15 structures)

Mirrors the `completion` block in `buildings.yaml`. A structure is *accepted* only when all five are
true **and** its SA/AR/IN items pass. All currently `false` / PENDING.

| ID | Structure | Footprint staked | Exterior shell | Roof | Interior | Palette & detailing |
|---|---|---|---|---|---|---|
| MSA-00 | Guest & Design Center | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-01 | The Alexandria | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-02 | The Villa Lago | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-03 | The Cape Pointe | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-04 | The Calais | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-05 | The Ashby Manor | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-06 | The Casa Lana | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-07 | The Centennial | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-08 | The Cross Creek | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-09 | The Midtown | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-10 | The Timbergrove | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-11 | The Valencia | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-12 | The Wakefield | ☐ | ☐ | ☐ | ☐ | ☐ |
| MSA-13 | Service Warehouse | ☐ | ☐ | ☐ | ☐ | ☐ |
| — | Cooking School / Retail (Bldg 2) — if built as a **separate** pad (else counted inside MSA-00) | ☐ | ☐ | ☐ | ☐ | ☐ |

*Row 15 is conditional on the SA-04 / DoD-4 resolution of the embedded-vs-separate cooking school.*

---

## 6. Section 25 — Definition-of-Done (final gate; ALL must pass to ship)

The build is **DONE** only when every gate below is satisfied. Each is PENDING.

| Gate | Condition | Ties to |
|---|---|---|
| ☐ DoD-01 | All 15 structures: five completion booleans = true (§5 matrix) | §5 |
| ☐ DoD-02 | Every Section 21 item (SA/AR/IN/SF/TQ/VQ) = **pass** or a signed-off **N/A** | §4 |
| ☐ DoD-03 | Zero open **blocker** or **major** defects in `qa/defects.yaml`; all logged defects `fixed`+`verified` or explicitly `deferred` with reviewer sign-off | defects.yaml |
| ☐ DoD-04 | **Coordinate reconciliation closed** — one canonical layout adopted; all `coordinates.yaml`↔`site-plan.md`/`buildings.yaml` divergences (§2) resolved | §2 |
| ☐ DoD-05 | Collision + envelope re-verified on the **as-built** scan (TQ-04/05/06 pass) | 21.5 |
| ☐ DoD-06 | Walkability proven: an **un-opped** bot traverses entrance → every zone → every one of the 12 home doors (SF-03/SF-07 pass) | 21.4 |
| ☐ DoD-07 | Honesty signage installed on site (rotated bearing, oval-vs-straight-street, invented facades) (SA-15/AR-18) | 21.1/21.2 |
| ☐ DoD-08 | Vanilla-legality confirmed and no builder litter (TQ-01/TQ-10/TQ-12) | 21.5 |
| ☐ DoD-09 | Roster fidelity: exactly 12 homes with names/styles/SF/stories per REF-017; Guest Center ≈44,019 SF / 2 floors; Warehouse ≈8,944 SF; Cooking school ≈8,342 SF represented once | 21.1 |
| ☐ DoD-10 | This QA report countersigned by a second (cross-check) reviewer against every other agent's coordinates | process |
| ☐ DoD-11 | Confidence labels preserved end-to-end: **no [CREATIVE] approximation is presented anywhere — in-world or in docs — as [VERIFIED] fact** | honesty discipline |
| ☐ DoD-12 | Final record set captured & archived (prismarine-viewer [M6] overhead + per-building + night screenshots) | process |

---

## 7. Handoff notes for the cross-checking agent

- **Adopted canonical geometry:** `site-plan.md` + `buildings.yaml` (OVAL). If your master brief
  canonizes the `coordinates.yaml` GRID instead, swap the §2 targets accordingly — the *checks* are
  layout-agnostic; only the target coordinates change.
- **Do not** treat `coordinates.yaml` numbers as passing targets until DoD-04 is closed; today they are
  a documented conflict, not a build defect.
- **Cooking school** (SA-04) and **Ashby story count** (SA-08/AR-06) are deliberately written to
  tolerate the open question rather than assert a resolution.
- **Tolerances** (§1.4) are my [CREATIVE] call; if the project sets stricter ones, they win.
- The defect register `qa/defects.yaml` is **no longer empty**: the first pass against the as-built survey
  (`qa/as-built-survey.md`) populated it with the plan-vs-as-built divergences (layout scheme mismatch,
  Guest Center centroid/size, unconfirmed home count, stale docs, road surface, entrance-door face).
  Subsequent inspections append to it.
