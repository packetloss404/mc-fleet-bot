# MainStreet America — Master Site Plan

**Subject:** Minecraft Java 1.21.x reconstruction of the former *MainStreet America* home-design
attraction, 18750 Interstate 45 N, Spring, Texas 77373 (closed).
**Document:** master site-plan narrative + zoning + circulation + overhead diagram.
**Author role:** planning engineer. Other agents will cross-check their coordinates against this file.

---

## 0. How to read this document (confidence discipline)

Every spatial assertion below carries exactly one tag, never upgraded:

- **[VERIFIED]** — grounded in a primary/multi-source fact from `references/manifest.yaml`.
- **[INFERENCE]** — a strong read of one source (typically the Colliers annotated aerial).
- **[RECONSTRUCTION]** — assembled from weak/unlabeled evidence.
- **[CREATIVE]** — no evidence; a design decision this build invents. Legitimate, but not history.

The **shape and program** of this site are real history. The **exact coordinates, the zone
boundaries, and the curved-loop geometry are this build's invention** and are tagged accordingly.
When prose polish and a confidence tag seem to disagree, trust the tag.

### Two honesty flags that govern this whole plan

1. **ORIENTATION IS ROTATED — this is not the real bearing.** The real parcel fronts I-45 on its
   **WEST** side; its functional gradient runs **west→east** (freeway → billboard → parking → guest
   center → homes street → warehouse) — that sequence is **[VERIFIED/INFERENCE]** from the aerial
   (manifest REF-014). The project constants **mandate** the principal entrance on the **SOUTH**
   side of the Minecraft envelope. I have therefore **rotated the entire real gradient 90°
   clockwise**: real-**west** (freeway/front) → build-**south** (+Z, front); real-**east** (rear)
   → build-**north** (−Z, rear). The *front-to-back ordering of functions is preserved and faithful*;
   the *compass bearing is a build convention, not the surveyed azimuth.* **[CREATIVE convention over
   VERIFIED gradient]**.

2. **THE LOOP IS AN OVAL BY DIRECTION, NOT BY EVIDENCE.** The real homes lined **one straight
   linear dead-end street / cul-de-sac**, homes on both sides — **[VERIFIED]** (REF-015). The brief
   directs a *graceful oval/curve rather than a grid*. I honor that. The oval preserves the real
   street's essential truths (a single **self-contained, non-through** circuit; **homes on both
   sides**; **not a grid**), but the **curved geometry itself is a [CREATIVE] deviation** from the
   documented straight street. A visitor sign should say so.

---

## 1. The protected envelope

- **Envelope:** a 600×600-block protected square, **X ∈ [−300, +300]**, **Z ∈ [−300, +300]**,
  centered on world origin **(0, 64, 0)**. Base build elevation **Y = 64**.
- **Compass:** North = −Z (top of every diagram), South = +Z (bottom), East = +X, West = −X.
- **Principal entrance:** SOUTH side (+Z), off the frontage road. **[CREATIVE convention]** (see flag 1).
- **Scale:** 1 horizontal block ≈ 2 real feet, so 1 block² ≈ 4 ft². Areas below convert with this.
- **Envelope vs. real acreage:** the real core parcel is **~12.41 acres [VERIFIED]** (≈540,000 ft²
  ≈ **135,000 block²** ≈ a 367×367 area). The 600×600 envelope (≈360,000 block² ≈ 1.44M ft² ≈ 33
  acres) comfortably holds the 12.41-acre developed core **plus** landscaped buffer, which also lets
  us represent the *"additional 28 acres available adjacent"* **[VERIFIED]** as an undeveloped
  greenbelt reserve rather than pretending it was built. The developed core is deliberately kept as
  a **long, narrow strip [VERIFIED site character]**, not spread to fill the square.
- **Reserved no-build inside the envelope:** the four Raven Rock portal-approach corridors at the
  ±285 edges. All four sit within the Z08 greenbelt band — see **Z08-R** for the boxes, and note the
  **N3 / entrance-drive collision, resolved 2026-07-24 (OQ-8)** by relocating N3 to the SW service
  gate — see Z08-R.
- **Site condition** *(corrected 2026-07-24 — the two premises below were previously stated the
  opposite way round, and both were false):*
  - **WorldEdit 7.4.0 and WorldGuard 7.0.16 ARE installed** on the target server. Dynmap/BlueMap
    and Citizens are **not**.
  - **All five bots ARE opped at permission level 4**, verified placing blocks. `/setblock` and
    `/fill` work; the build channel in practice is chunked `/fill` driven over **RCON** (SSH →
    the remote's localhost RCON), max 16,384 volume per fill.
  - **UPDATED 2026-07-25 — partly applied.** WorldGuard region **`mainstreet_america`** now exists at
    **x[-70,70] y[62,319] z[-235,200]**, priority 10, with **`mob-spawning: deny`** set (OQ-3's second
    half). That is the *developed band*, deliberately narrower than `integration/worldguard.yaml`'s
    staged full ±300 / y−64→320 envelope; the subsurface column beneath it is covered by `raven_rock`
    (y ≤ 61). See `../../raven-rock/qa/oq3-worldguard.md`.
  - Still true for BUILD protection: `build`/`block-break`/`block-place` deny are **NOT** set, so the
    envelope is still a planning boundary for grief purposes. Setting them now would accomplish nothing —
    op bypasses WorldGuard `build:deny`. Applying them is the post-build step in Raven Rock **OQ-2**
    (de-op the builders **first**, *then* apply the build flags). The map marker set remains
    staged-and-inactive (no Dynmap/BlueMap).
  - So this plan **may** assume op, `//` commands, and mob-spawn suppression, but **may not yet** assume
    active build protection or map markers.

---

## 2. The nine zones (Z01–Z09)

> **Assumption flag:** No explicit Z01–Z09 enumeration was present in the brief text I received or in
> `references/manifest.yaml`. I derived the nine-zone scheme below **from the verified front-to-back
> building program** (manifest REF-007 through REF-016). If another agent holds a canonical Z01–Z09
> list, treat *that* list as authoritative and reconcile the labels; the **coordinate boxes and
> circulation geometry here are my proposal for cross-check.** All boundary numbers are **[CREATIVE]**
> unless a building footprint cites a verified square footage.

Ordering runs front→back (south +Z → north −Z), matching the real functional gradient.

### Z01 — Gateway & South Frontage
- **Box:** X ∈ [−170, +170], Z ∈ [+235, +300].
- **Contains:** the east–west **frontage road** (centerline Z ≈ +288, just inside the south edge);
  the **electronic LED monument billboard** ("MainStreet America / Design Tech Homes"); the
  **principal entrance drive** breaking north at X ≈ 0; a **secondary/service gate** at the SW
  (X ≈ −150).
- **Billboard placement:** near **X ≈ +95, Z ≈ +272** (south frontage, offset toward the entrance
  throat so it reads from the approaching road). *Existence of a large frontage LED monument at the
  road corner is* **[VERIFIED]** *(REF-013); its exact rotated position is* **[CREATIVE].**

### Z02 — Arrival & Parking Field
- **Box:** X ∈ [−170, +170], Z ∈ [+120, +235].
  > ⚠️ **SUPERSEDED BY AS-BUILT, 2026-07-24.** This box **overlaps the Guest Center**, which was
  > built at **z[+90, +165]** — 45 blocks of collision. The box was written against the GRID
  > assumption that the Center sat at z75; it does not. The parking field was therefore built
  > **south of the Center** at **x[−125, +125], z[+172, +268]** — 251 × 97 = **24,347 block²
  > ≈ 97,400 ft²**, against the **VERIFIED ~100,000 ft²** (REF-012).
  >
  > **AS-BUILT UPDATE, 2026-07-26.** The field is now fully striped and database-inventoried as
  > **236 spaces**: 205 standard, 8 accessible, 14 EV, and 9 premium. Three double-loaded aisle
  > bands occupy z[192,200], z[219,227], and z[246,254]. It includes shared accessible access
  > aisles, step-free walks, crosswalks, 23 dual-head poles, 32 flush lights, two EV/solar canopies,
  > formal/rain gardens, bike parking, and Discovery Court. Exact geometry and evidence are in
  > `planning/parking-arrival-gardens.md` and `qa/parking-recovery-2026-07-26.md`.
- **Contains:** the large **concrete parking field** flanking the central drive; the **visitor
  drop-off loop** at its north end against the guest-center forecourt.
- **Program:** **~100,000 ft² of concrete / 236 spaces [VERIFIED]** (REF-012). 100,000 ft² ÷ 4 ≈
  **25,000 block²** of paving (e.g. ~200×125). A single large field between frontage and guest
  center is **[VERIFIED position]** (REF-014). Aisle/space layout is **[CREATIVE].** (Space count
  conflict noted: Colliers 236 vs LoopNet/TenantBase 258 — build uses **236**.)

### Z03 — Guest & Design Center (Building 1)
- **Footprint:** X ∈ [−45, +45], Z ∈ [+58, +118]  → **90 × 60 = 5,400 block²/floor × 2 floors ≈
  10,800 block² ≈ 43,200 ft²**, matching the **44,019 ft², 2-story Class A [VERIFIED]** anchor
  (REF-007). Zone band Z ∈ [+40, +120].
- **Orientation:** long face and main entrance on the **+Z (south) side**, facing the parking and
  the approach — the "primary entrance facility" **[VERIFIED]** (REF-008). Houses the MAIN
  Restaurant, event hall, furniture showroom, T.E.D. distribution, and the ~10,000 ft² design studio
  (a sub-space, ≈2,500 block²) **[VERIFIED functions]** (REF-008/REF-018).
- **Appearance:** **[CREATIVE].** No source documents facade, material, color, or roof (REF-019).
  Rendered as a two-story stucco-and-brick "mansion" massing *by approximation only* — must be
  labeled as such to visitors.

### Z04 — Showcase Homes Loop (the model-home neighborhood)
- **Box:** X ∈ [−145, +145], Z ∈ [−150, +40] — the largest zone, the heart of the attraction.
- **Contains:** the **12 showcase model homes [VERIFIED roster]** (REF-017) arranged around a
  **graceful oval ring road** (see flag 2). Oval centerline ≈ centered (0, −55), spanning roughly
  X ∈ [−110, +110], Z ∈ [−140, +30], carriageway ~7 blocks wide, homes on **both** the outer and
  inner faces.
- **Homes:** all 12 face the loop. Lot sizes scale to the verified square footages — largest **The
  Alexandria** (Greek Revival, 6,011 ft², 3-story ≈ 1,500 block² total, ~500/floor) down to smallest
  **The Cape Pointe** (Coastal, 1,815 ft², 2-story ≈ 454 block² total). Generous inter-lot spacing
  (see §4 design intent). **Which named home sits on which arc is UNKNOWN [VERIFIED-as-unknown]**
  (REF-015 / unknowns) — ordering is the builder's choice and must be tagged **[CREATIVE].** A
  suggested non-binding sequence and per-home footprints will be delivered by the homes-detail agent;
  this plan only fixes the *loop envelope and pad count (12)*.
- **Facades/materials of every home:** **[CREATIVE]** (style names guide approximation only; REF-019).

### Z05 — Cooking School & Retail (Building 2)
- **Footprint:** X ∈ [−135, −90], Z ∈ [−30, +16]  → **45 × 46 ≈ 2,070 block² ≈ 8,280 ft²**, matching
  **8,342 ft² retail w/ cooking school [VERIFIED]** (REF-009). Zone band X ∈ [−145, −80], Z ∈ [−40, +20].
- **Position:** **mid-row along the internal street [VERIFIED]** (REF-009), placed on the **west
  flank** of the homes loop so it reads as part of the neighborhood spine, reachable on foot from the
  loop and by a service spur. Exact flank/side is **[CREATIVE]** (source says "mid-row," not which side).
- **Note:** sources conflict on whether the cooking school was physically inside the Guest Center or
  a separate building (manifest conflict). Build follows the **Colliers survey**: a **separate 8,342
  ft² structure.**

### Z06 — Service & Warehouse (Building 3)
- **Footprint:** X ∈ [−120, −73], Z ∈ [−230, −183]  → **47 × 47 ≈ 2,209 block² ≈ 8,836 ft²**,
  matching **8,944 ft² warehouse [VERIFIED]** (REF-010). Zone band X ∈ [−145, +80], Z ∈ [−240, −160].
- **Position:** the **far rear (north, −Z) service end [VERIFIED]** — real-world "far east, behind
  the last homes" (REF-010/REF-014), rotated to the build-north rear. Surrounded by a service yard,
  loading apron, and back-of-house screening. Reached **only** by the discreet service route (§3), not
  the visitor loop.

### Z07 — Detention Pond & Water Feature
- **Box:** X ∈ [+90, +205], Z ∈ [−240, −150] — a rear corner.
- **Contains:** a **naturalized detention pond / small water body [RECONSTRUCTION]** (REF-016 —
  an unlabeled feature read from satellite; the aerial shows it at the real **SE-rear**, rotated here
  to the build **NE-rear**), plus reeds/landscape. Exact size, outline, and rotated corner are
  **[CREATIVE].** Doubles as a scenic terminus for the loop's north end.

### Z08 — Perimeter Greenbelt & Landscape Buffer
- **Box:** the frame — from the envelope edges inward to the developed core, roughly the band outside
  X ∈ [−170, +170] / Z ∈ [−250, +295], wrapping all four sides; **thickest on the north and east**
  edges to match the aerial's **undeveloped grass/woodland wrap [RECONSTRUCTION]** (REF-016) and to
  stand in for the **"28 adjacent acres available" [VERIFIED existence, undescribed use]**.
- **Function:** visual screen of the service route and warehouse; setback that makes the site read as
  a curated estate, not a lot-line subdivision; the outer edge of the protected envelope. Planting
  design is **[CREATIVE].**

#### Z08-R — Raven Rock portal-approach corridors: **RESERVED NO-BUILD**

Decided **2026-07-24** (Raven Rock **OQ-1**, orchestrator sign-off). The shaft head was *relocated*
rather than reserved, but the **four portal approaches are reserved**. All four fall inside Z08's
greenbelt band, so this reservation constrains **planting and grading only** — no MSA structure is
affected.

No surface feature — no berm, no access road, no planting mass, no signage, no landscape wall — may
be placed in these boxes. They must stay clear so the ±285 portal mouths can be surveyed and sculpted
before the tunnels behind them are carved (**OQ-6**).

| Portal | Coordinate | Reserved corridor (X, Z) | Notes |
|---|---|---|---|
| **N3** south | **(−150, 18, +285)** | X ∈ [−165, −135], Z ∈ [+270, +300] | **relocated 2026-07-24 (OQ-8)** — now co-located with MSA's SW service gate; see below |
| **N4** north | (0, 18, −285) | X ∈ [−15, +15], Z ∈ [−300, −270] | clear; ~35 blocks north of the street's z−235 end |
| **N5** east | (+285, 18, −30) | X ∈ [+270, +300], Z ∈ [−45, −15] | clear; 70 blocks east of the RR-Z5 shaft head at x=200 |
| **N6** west | (−290, 10, +5) | X ∈ [−300, −275], Z ∈ [−10, +20] | **tightest margin in the whole project** — only 10 blocks from the x=−300 envelope edge |

Corridor width (±15 blocks about each portal axis, extending 30 blocks inward from the envelope
edge) is **[CREATIVE]** — it is sized to clear the 4-wide × 6-tall tunnel section with working room
for a sculpted mouth, not derived from any source. Re-cut it once OQ-6's survey establishes the real
terrain at each mouth.

> ✅ **RESOLVED 2026-07-24 (OQ-8) — N3 relocated to the SW service gate.**
>
> **The conflict.** N3 was at **(0, 18, +285)**: 3 blocks off the frontage-road centerline (z ≈ +288)
> and dead on the **x = 0 axial entrance spine**. Its reserved corridor therefore swallowed the
> entrance-drive throat, the frontage crossing, and the billboard approach. The as-built overlap
> looked small (the drive stops at z275, 25 blocks short of its designed z300 start) — but finishing
> the drive as designed would have put the full 31-block corridor across MSA's front gate.
>
> **The decision.** Same trade as OQ-1, resolved the same way: the portal network is
> `creative approximation`, MSA's axial arrival is anchored design (*"the single grand public
> approach… so the anchor building terminates the view on arrival"*), so **the invented element moved.**
>
> **N3 → (−150, 18, +285)**, co-located with MSA's **SW service gate** (Z01, x ≈ −150, z = +300).
> That gate is already back-of-house, screened by Z08 greenbelt planting, and by design *"never
> crosses the entrance drive or the oval at grade"* — so the bunker's south portal now hides behind a
> service entrance rather than the front door. The grand axial approach is completely freed.
>
> **Consequences.** `z` is unchanged, so every envelope-extent statement still holds. **T2 becomes a
> dogleg**: north along x=−150 to a turn at (−150, y2, +190), then bearing east and descending into
> **Cavern B's south wall at its west end (−45, −10, +130)** — Cavern B spans x[−45,+45], so it can no
> longer be entered on the x=0 axis. Longer and non-axial, which is the point.
>
> ⚠️ **The two Raven Rock drawings still show N3 at (0, +285)** — `visuals/level-plans.svg` and
> `visuals/section.svg` were not regenerated. Treat `planning/coordinates.yaml` as authoritative.

### Z09 — Event Lawn & Special Events
- **Box:** X ∈ [+70, +160], Z ∈ [−15, +120] — the **east flank of the Guest Center.**
- **Contains:** an open ceremony lawn, a market row, and a small stage for the venue's documented
  programming — **weddings, private events, live music, farmers markets, and "Christmas on
  MainStreet" [VERIFIED functions]** (REF-008). *That these events happened at the venue is verified;
  carving out a dedicated separate lawn zone beside Building 1 is* **[CREATIVE]** *(no source maps a
  distinct event lawn — the events are documented as hosted by/inside the guest center).*

---

## 3. Circulation design

All routes are surface roads/paths at Y = 64 (concrete, concrete-powder, and path blocks; vanilla
only). No Citizens/NPC pathing assumed — geometry must be walkable by un-opped mineflayer bots.

1. **Primary entrance drive (SOUTH).** The final public threshold is centered at **(0,79,305)** with
   a fully clear x[−10,+10] gate opening. A terraced carriage approach and two step-free walks descend
   northward through the frontage cut, join the parking circulation, and continue on the X≈0 axis to
   the Guest Center. This is the single grand public approach — axial and centered on the Guest
   Center's south face. **[CREATIVE geometry; VERIFIED that the entrance/approach fronted the guest
   center].**

2. **Visitor drop-off loop.** A teardrop turnaround centered ≈ **(0, +190)**, radius ~18, tangent to
   the Guest Center approach. It lets guests be set down at the door before parking peels off into
   Z02. **[CREATIVE]** — not documented; a hallmark of a curated attraction.

3. **Showcase-home circulation loop (the oval).** A single closed **oval ring road** around Z04
   (carriageway ~7 wide), fed by **two short connectors** from the NE and NW corners of the Guest
   Center forecourt (≈ X ±35, Z ≈ +38). Traffic enters, circulates past all 12 homes on a gentle
   curve, and returns — a **self-contained, non-through circuit** (faithful to the real dead-end
   character) rendered as a **graceful oval instead of a straight cul-de-sac** (the directed
   deviation, flag 2). The pond (Z07) sits just beyond the loop's north bulge as a scenic cap.

4. **Discreet service route.** A narrow (~4-block) back-of-house drive entering at the **SW service
   gate** (Z01, X ≈ −150, Z = +300), running **north hard against the west greenbelt edge (X ≈
   −150)** — screened from all visitor areas by Z08 planting — with **one spur east to Building 2**
   (cooking-school loading, Z05) and continuing to the **warehouse yard (Z06)** at the rear. It never
   crosses the entrance drive or the oval at grade. **[CREATIVE geometry; INFERENCE that a service
   circuit reached the rear warehouse — the warehouse is the verified service terminus].**

5. **Parking aisles.** Within Z02, double-loaded bays run **east–west** off the central spine in
   z[192,200], z[219,227], and z[246,254]; **236 individually mapped stalls** total. Layout
   **[CREATIVE]**; count/area **[VERIFIED].**

6. **Pedestrian links (every major area connected).**
   - Continuous sidewalk up the **east side of the entrance drive**, from the frontage sidewalk to
     the Guest Center south porch.
   - A **forecourt plaza** wrapping the Guest Center's south and east faces, linking to **Z09 event
     lawn** (east) and to both **oval connectors** (north).
   - A **loop-side promenade** ringing the oval so all 12 homes are reachable on foot without touching
     the carriageway.
   - A **garden path** from the loop's west side to **Z05 cooking school** (public pedestrian
     entrance, distinct from its rear service spur).
   - The **warehouse (Z06) is intentionally NOT on the visitor pedestrian network** — back-of-house.
   - Pond (Z07) reached by a short scenic footpath off the loop's north promenade.
   All pedestrian geometry is **[CREATIVE].**

---

## 4. Design intent — a curated attraction, not a subdivision

The plan must *read as a $20M destination*, which the real site was **[VERIFIED]** (REF-002), and
must actively avoid looking like a tract neighborhood. Concrete moves:

- **Axial arrival.** One grand centered drive that dead-ends the sightline on the Guest Center —
  destination framing, not a street network.
- **The curve does the work.** A single sweeping **oval** (flag 2) with homes set at *varied
  setbacks and non-uniform lot widths* (sizes already differ 1,815→6,011 ft² **[VERIFIED]**), so no
  two frontages repeat. A subdivision reads as a grid of equal lots on straight streets; this reads
  as a promenade of showpieces.
- **Generous landscaped setbacks / greenbelt frame (Z08).** The developed strip floats inside a
  planted buffer; no lot lines touch the boundary. Estate, not plat.
- **Front-of-house / back-of-house separation.** Visitors never see service traffic or the warehouse:
  the service route hugs the screened west edge; the warehouse sits at the rear behind planting.
- **A monument threshold (Z01).** The LED billboard + gateway announce an attraction with an
  admission threshold (real: ~$10 adult, T.E.D. tablets **[VERIFIED]**), not an open residential
  street.
- **A civic "front lawn" (Z09).** The event lawn beside the Guest Center signals a venue/campus with
  public programming, reinforcing "destination."
- **Restrained palette & symmetry** around the Guest Center forecourt; boutique spacing (wide green
  gaps) between homes rather than fence-line-to-fence-line packing.

---

## 5. Overhead zone diagram

Schematic only — box positions approximate the coordinate boxes in §2; read the numbers in §2 as
authoritative. Top = NORTH = −Z (rear). Bottom = SOUTH = +Z (entrance).

```
                              NORTH  ▲  (−Z, rear of site)
        WEST (−X) <───────────────────────────────────────────> EAST (+X)
   Z=−300 +--------------------------------------------------------------+
          |            Z08  PERIMETER GREENBELT / BUFFER                  |
          |   (thickest on N & E — stands in for the +28 adj. acres)      |
          |     +-------------------------+    +-------------------+      |
   Z≈−200 |     |  Z06 SERVICE & WAREHOUSE|    |  Z07 DETENTION    |      |
          |     |  Building 3  8,944 ft²  |    |  POND & WATER     |      |
          |     |  service yard / loading |    |  (naturalized)    |      |
   Z≈−160 |     +------------|------------+    +-------------------+      |
          |  (service route  |  hugs west edge X≈−150, screened)         |
          |            . - - - - - - - - - - - - - - .                   |
   Z≈−120 |          /     Z04  SHOWCASE HOMES LOOP    \                 |
          |         |    graceful OVAL ring road         |               |
          |  +----+ |  [H] [H] [H]        [H] [H] [H]    |               |
   Z≈−40  |  |Z05 | |                                    |               |
          |  |COOK| |  [H] [H] [H]  (12)  [H] [H] [H]    |               |
          |  |Bld2| |                                    |               |
    Z=0   |  +----+  \      connectors  .  .            /                |
          |           ` - - - - - - - - |  | - - - - - '                 |
   Z≈+40  |     +----------------------.+  +.------------------------+    |
          |     |   Z03 GUEST & DESIGN CENTER  |   Z09 EVENT LAWN    |    |
          |     |   Building 1  44,019 ft²     |   weddings/market/  |    |
   Z≈+120 |     |   2-story, faces SOUTH ▼     |   stage             |    |
          |     +-----------( o )-------------++--------------------+     |
          |                drop-off loop                                  |
          |     :::::::::::::::  Z02 PARKING FIELD  :::::::::::::::::      |
   Z≈+178 |     ::::  ~100,000 ft² concrete  /  236 spaces  ::::::::      |
          |     ::::::::::::::::::: | :::::::::::::::::::::::::::::::       |
   Z≈+235 |          Z01 GATEWAY   |  entrance drive (X≈0)                |
          |    [SW service gate]   |            [ BILLBOARD ]             |
          |========================|===== I-45 FRONTAGE ROAD ============|
   Z=+300 +------------------------|-------------------------------------+
                       PRINCIPAL ENTRANCE  ▼  (SOUTH, +Z)
                              SOUTH  ▼  (+Z, public approach)

   Legend: [H] = one of 12 model homes (positions schematic; ordering UNKNOWN/CREATIVE)
           :::: = concrete parking     ==== = frontage road     ( o ) = drop-off loop
```

---

## 6. Evidence-based vs. creative — explicit ledger

| Spatial decision | Basis | Tag |
|---|---|---|
| Front-to-back program order (frontage→billboard→parking→guest ctr→homes→cooking school mid-row→warehouse rear) | Colliers aerial, corroborated | **VERIFIED / INFERENCE** |
| Guest Center is the front anchor, 44,019 ft², 2-story, faces the approach | REF-007/008 | **VERIFIED** |
| Single self-contained street w/ 12 homes on both sides, not a grid | REF-015 | **VERIFIED** |
| Cooking school = separate 8,342 ft² building, mid-row | REF-009 | **VERIFIED** |
| Warehouse 8,944 ft² at the rear service end | REF-010 | **VERIFIED** |
| Parking field ~100,000 ft² / 236 spaces between frontage and guest ctr | REF-012 | **VERIFIED** |
| LED monument billboard at the frontage corner | REF-013 | **VERIFIED** |
| Home names/styles/sizes (roster of 12) | REF-017 | **VERIFIED** |
| Detention pond at a rear corner + grass/woodland edge wrap | REF-016 | **RECONSTRUCTION** |
| Rotating the whole gradient so entrance faces SOUTH (real = WEST) | project constant | **CREATIVE convention** |
| Rendering the street as a graceful OVAL (real = straight cul-de-sac) | brief directive | **CREATIVE** |
| Visitor drop-off loop | — | **CREATIVE** |
| Discreet west-edge service route + spurs | — | **CREATIVE (geometry)** |
| Dedicated Z09 event lawn beside Building 1 | events verified, lawn placement not | **CREATIVE (placement)** |
| Greenbelt buffer as a designed frame / the +28 acres as reserve | edge wrap reconstructed; buffer design invented | **RECONSTRUCTION → CREATIVE** |
| **All exact zone boxes, coordinates, dimensions, aisle/lot geometry** | — | **CREATIVE** |
| Which named home sits on which lot | explicitly unknown (REF-015) | **CREATIVE (UNKNOWN)** |
| Every building facade / material / roof / color | REF-019 | **CREATIVE** |

---

## 7. Open items for cross-check (to reconcile with other agents)

- **Canonical Z01–Z09 list.** If a master brief enumerates the nine zones differently, that list wins;
  my labels are a derivation from the verified program (see §2 assumption flag).
- **Home ordering & per-home footprints (Z04).** This plan fixes only the oval envelope and the count
  (12). The homes-detail agent should map named homes → arc positions and confirm each footprint
  against the verified square footages in the manifest; flag any lot that would overflow the
  X∈[−145,+145] / Z∈[−150,+40] box.
- **Parking count.** Build uses **236** (Colliers); if another doc standardizes on 258, note the
  conflict rather than silently switching.
- **Pond corner.** I placed the pond at the build-NE rear (rotated from real SE-rear). Confirm the
  rotation is consistent with everyone else's read of "rear corner."
- **Building footprint centroids for the builders:** Guest Center ≈ (0, +88); Cooking School ≈
  (−112, −7); Warehouse ≈ (−96, −206). These are the numbers other agents should collide-check.
- **Service condition** *(corrected 2026-07-25).* WorldEdit 7.4.0 + WorldGuard 7.0.16 **are** installed and
  the bots **are** opped; only Dynmap/BlueMap and Citizens are absent. Region `mainstreet_america` is live
  with `mob-spawning: deny`; **build/grief protection and NPC assumptions remain staged and inactive**
  (build flags wait on the OQ-2 de-op — op bypasses them). Any downstream plan relying on build protection
  or NPCs is still out of scope.
