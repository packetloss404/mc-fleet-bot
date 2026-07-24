# Raven Rock Mountain Complex (Site R) — Master Site Plan

**Subject:** Minecraft Java 1.21.x reconstruction of the **Raven Rock Mountain Complex ("Site R")**,
the U.S. government's underground continuity-of-government / alternate-command bunker near Blue Ridge
Summit, Adams County, PA — the "underground Pentagon."
**Document:** master site-plan narrative + zoning + circulation + overhead & section diagrams.
**Author role:** spatial-design engineer. **This file is the declared MASTER.** The two sibling files
`coordinates.yaml` and `buildings.yaml` cross-check against it and must agree on every centroid and
dimension. There is exactly ONE layout here — no alternate schemes.

---

## 0. How to read this document (confidence discipline)

Every spatial assertion carries exactly one tag, never upgraded (vocabulary inherited unchanged from
`references/manifest.yaml`):

- **[VERIFIED]** — a primary/multi-source public fact from the manifest.
- **[INFERENCE]** — a strong read of one good source (high-confidence inference).
- **[RECONSTRUCTION]** — assembled from weak/qualitative hints (moderate-confidence reconstruction).
- **[CREATIVE]** — no evidence; a design decision this build invents (creative approximation).

> ### THE CENTRAL HONESTY FLAG — READ THIS FIRST
>
> **Raven Rock's interior is CLASSIFIED. There is NO public floor plan, and since 2007 DoD policy has
> forbidden making "any photograph, sketch, picture, drawing, map or graphical representation" of the
> complex [VERIFIED, manifest REF-015].** Therefore **every coordinate, every cavern outline, every
> building footprint, every tunnel route, every room, and every dimension in this plan is
> `[CREATIVE]` — invented for the build.** What is real is only the *setting and concept*: a mountain of
> greenstone [VERIFIED REF-003], freestanding multi-story buildings on giant shock-isolation springs
> inside blasted caverns [INFERENCE REF-005], several tunnel portals [INFERENCE REF-007], and a
> continuity-of-government mission [VERIFIED REF-010]. **This build is an openly-labeled imaginative
> interpretation of a public landmark's public history — NOT a claimed map of the real, secret
> facility, and it must present itself to visitors that way.** When prose polish and a confidence tag
> seem to disagree, trust the tag. When any number below is read, read it as `[CREATIVE]` unless it
> quotes a verified public fact.

### Two build conventions that govern this whole plan

1. **DEPTH IS A CONVENTION, NOT A SURVEY.** The real complex is popularly said to sit ~650 ft below the
   ~1,527 ft summit [INFERENCE REF-008]. Reproduced literally at this world's scale (1 block ≈ 2 ft)
   that is ~325 blocks down and off-envelope. Per the manifest's explicit build-scale note, we bury the
   complex only **~20 blocks** beneath the MainStreet America (MSA) surface plane as a deliberate
   stand-in for "deep inside the mountain." **[CREATIVE convention over an INFERENCE depth.]**

2. **BUILDING COUNT AND ARRANGEMENT ARE A DESIGN CHOICE.** Public sources disagree even on the count —
   Wikipedia says **three** buildings completed 1953; popular sources say **five** three-story buildings
   [contested, REF-006]. This build places **four** freestanding buildings as a reasoned middle choice,
   and treats their number, sizes, and arrangement as `[CREATIVE]`, not documented fact.

---

## 1. The protected envelope, the rock, and the vertical relationship to MSA

- **Envelope:** the shared 600×600 protected square, **X ∈ [−300, +300]**, **Z ∈ [−300, +300]**,
  centered on world origin. Raven Rock occupies the **sub-surface** volume of this same envelope.
- **Compass:** North = −Z (top of every plan diagram), South = +Z (bottom), East = +X, West = −X.
- **Scale:** 1 horizontal block ≈ 2 real feet; **~5 blocks of height per story** (≈10 ft). `[CREATIVE
  convention, shared with MSA.]`
- **The rock body:** the mountain reads as **dark greenish hard metabasalt (Catoctin greenstone), NOT
  granite** [VERIFIED REF-003]. All undug volume in the sub-surface is this greenstone mass; caverns and
  tunnels are voids blasted into it.
- **Site condition:** target server is stock Paper with **no plugins — no WorldEdit / WorldGuard / Dynmap /
  EssentialsX / Citizens** (the staged integration files stay dormant until a plugin exists). **CORRECTION:
  the builder bots ARE now opped (level 4, per the MSA as-built survey / `ops.json`)** — the earlier "bots
  not opped" premise is stale. The build still assumes only plain `/fill`-style block placement and no
  `//`commands or NPCs. "Protected envelope" is a *planning boundary*, not an enforced region; note that
  opped bots would **bypass any WorldGuard `build:deny`** even if it were added later. **Protection model —
  DECIDED (OQ-2): builder bots stay opped during construction, then are DE-OPPED once the build completes,
  after which WorldGuard `build:deny` protects the museum normally** — a post-build operational step, not
  yet performed (same decision applies to MSA; see `planning/open-questions.md`).

### 1.1 VERTICAL STACKING — the MSA-vs-Raven-Rock Y relationship (explicit)

This is the single most important cross-build constraint. Reading top (high Y) to bottom (low Y):

| Band | Y-range | Content | Basis |
|---|---|---|---|
| **MSA surface build** | **y62 → y79** | Solid MainStreet America (foundation y62; road spine y63; buildings/roofs to ~y79), over x∈[−70,+70], z∈[−235,+200] | MSA as-built survey (2026-07-24) |
| **Rock buffer** | **y41 → y61** | **~20 blocks of undisturbed greenstone** — the solid mountain roof over the complex. **Nothing is excavated here** (except the one deliberate access shaft, §3.6). | [CREATIVE convention] |
| **Raven Rock ceilings** | **y≈40** (down to y28 in the utility cavern) | Blasted cavern roofs begin here | [CREATIVE] |
| **Raven Rock cavern void** | **y40 → y−12** | The tall blasted caverns and their freestanding buildings-on-springs | [CREATIVE] |
| **Raven Rock floors** | **y−12** (main), **y−18** (reservoir sump, deepest) | Cavern floors; deepest point y−18 | [CREATIVE] |
| **Bedrock buffer** | **below y−18** | Left solid; deepest floor y−18 stays well above bedrock | [CREATIVE] |

**Key numbers:** Raven Rock's highest CAVERN/complex point (ceilings **y40**) sits **22 blocks below MSA's
y62 foundation** — a solid greenstone buffer thicker than the required ~20. The deepest floor (**y−18**) is
comfortably inside the buildable range (~y−20..y40) and far above bedrock. **No Raven Rock cavern or
building geometry enters the y62→y79 band.** The one intentional exception is the vertical access shaft
(§3.6): the RR-Z5 shaft **ALONE rises to y64 — into MSA's Y band** — but at **x=+200, z=−15 (x∈[193,207],
z∈[−22,−8]) — OUTSIDE MSA's x∈[−70,+70] footprint and east of every MSA planned surface element** (nearest
is the Z09 event lawn at x≤160, ~33 blocks west) — so its Y-overlap collides with no MSA structure, only
rock/greenbelt. This is a labeled deliberate liberty.

> ### BUILD-SPEC HARD RULE — excavation Y-ceiling (ADOPTED, OQ-4)
>
> **No excavation/build bot may place or break any block above `y41`, anywhere in the Raven Rock build.**
> This is a standing build-spec rule, wired into the dig/build routines — not a review-time check. It
> protects the 22-block solid greenstone buffer (y41→y61) beneath the live MSA road at x=0 and foundation
> at y62. **The single sanctioned exception is the RR-Z5 vertical access shaft column** (x∈[193,207],
> z∈[−22,−8]), which is whitelisted to rise through the buffer to y64 — and it is outside MSA's footprint.
> Every cavern ceiling (y40), tunnel crown, and vestibule roof therefore tops out at or below y40; the
> y41 line is the hard ceiling for all other work.

---

## 2. The five zones (RR-Z1 … RR-Z5)

> **Zone-scheme flag:** No canonical zone enumeration exists in the evidence layer (the interior is
> classified; the manifest deliberately invents nothing spatial). The five zones below are **my authored
> construction** from the public *concept* (springs-in-caverns + several portals + self-sufficient
> utilities + alternate-command mission). Every box, floor, and ceiling is **[CREATIVE].**

Coordinate boxes are horizontal footprints `X ∈ [min,max], Z ∈ [min,max]` with a floor and ceiling Y.
The numbers here are authoritative for cross-check.

### RR-Z1 — Central Operations Cavern ("Cavern A")
- **Plan box:** X ∈ [−75, +75], Z ∈ [−45, +15].
- **Vertical:** floor **y−12**, ceiling **y40** (a ~52-block-tall blasted chamber — the dramatic main
  cavern). `[CREATIVE]`
- **Contains:** **Building RR-B1 Command & Operations Center (ANMCC)** and **Building RR-B2 Signal &
  Communications Center**, both freestanding on visible spring isolation. The **central junction
  rotunda** (N10) at (0, −12, 0) is where the four portal tunnels and the inter-cavern corridors meet —
  the heart of the complex. Mission basis: alternate national military command [VERIFIED REF-010];
  buildings-on-springs concept [INFERENCE REF-005]; all geometry [CREATIVE].

### RR-Z2 — Habitation & Support Cavern ("Cavern B")
- **Plan box:** X ∈ [−45, +45], Z ∈ [+70, +130].
- **Vertical:** floor **y−10**, ceiling **y36**. `[CREATIVE]`
- **Contains:** **Building RR-B3 Quarters, Dining & Medical** — the self-sufficient "underground
  community" that lets the site seal off for months [INFERENCE REF-009]. South end meets the South
  Personnel Portal tunnel. All geometry [CREATIVE].

### RR-Z3 — Utility & Reservoir Cavern ("Cavern C")
- **Plan box:** X ∈ [−185, −115], Z ∈ [−35, +15].
- **Vertical:** floor **y−18** (the reservoir sump — deepest point in the complex), ceiling **y28** (a
  lower, working cavern). `[CREATIVE]`
- **Contains:** **Building RR-B4 Power & Ventilation Plant** and **two underground reservoirs**
  (Reservoir 1 & 2). Self-sufficiency systems — reservoirs, on-site power, ventilation — are a stable
  public theme [INFERENCE REF-009]; **the "two reservoirs / dual power" counts are popular figures, not
  authoritative** [conflict, REF-009]; the sizes and positions here are [CREATIVE].

### RR-Z4 — Portal & Blast-Vestibule Network (the four tunnels)
- **Not a single box** — the four gently-curving portal tunnels plus their blast-door vestibules,
  threading the greenstone from the caverns out toward the envelope edges. Tunnels **curve gently** to
  blunt a blast wave [INFERENCE REF-005/REF-017]. **Four portals** matches the most-common public
  statement [INFERENCE REF-007]; exact positions and all geometry are [CREATIVE]. See §3.1–3.4.

### RR-Z5 — Vertical Access Shaft (deliberate creative liberty)
- **A single shaft** at **x=+200, z=−15**, rising from a spur off Cavern A's east wall (y−12) straight up
  through the rock buffer to emerge at the MSA surface plane (y64) in MSA's **east greenbelt**, well clear
  of every MSA planned surface element — x=+200 is far east of MSA's x=+70 building edge and ~33 blocks
  east of the nearest planned element (the Z09 event lawn, x≤160), and z=−15 keeps it separated from the
  parking field (z≥125) and the rear detention/landscape (z≤−215). **RELOCATED from the former (120,60)
  head, which sat inside MSA's planned east parking/event-lawn flank (see `planning/open-questions.md`
  OQ-1).** An invented convenience link, tagged a deliberate liberty — it locally interrupts the "solid
  rock buffer" but collides with nothing. `[CREATIVE liberty]` See §3.6.

---

## 3. Circulation — tunnels, corridors, portals, and the shaft

All routes are blasted voids in greenstone, walkable by un-opped bots. Tunnels are ~**6 wide × 7 tall**
with gently curving centerlines [curve rationale INFERENCE REF-005/017; all geometry CREATIVE]. Portal
mouths open at the envelope edge in a rock face at floor **y≈18**, and each tunnel descends on a gentle
grade to its cavern floor.

1. **North Vehicle Tunnel (T1).** Portal **N4 at (0, y18, −285)** → gentle S-curve south → **North Blast
   Vestibule N1 at (0, y−6, −120)** (twin blast doors) → **Cavern A north wall (0, −45)** at y−12. The
   largest portal; the vehicle/main entrance. `[CREATIVE]`
2. **South Personnel Tunnel (T2).** Portal **N3 at (−150, y18, +285)** → north along x=−150 → **dogleg
   turn at (−150, y2, +190)** → bear east and descend → **Cavern B south wall at its WEST end
   (−45, +130)** at y−10. Personnel/pedestrian entrance serving the habitation cavern. **N3 relocated
   2026-07-24 (OQ-8) from (0, y18, +285)**, which sat on MSA's grand axial entrance; x=−150 puts it
   behind MSA's SW service gate. The tunnel is no longer axial — that is the point. `[CREATIVE]`
3. **East Tunnel (T3).** Portal **N5 at (+285, y18, −30)** → curve west → **East Blast Vestibule N2 at
   (+180, y0, −30)** → **Cavern A east wall (+75, −15)** at y−12. `[CREATIVE]`
4. **West Utility Tunnel (T4).** Portal **N6 at (−290, y10, +5)** → curve east → **Cavern C west wall
   (−185, −10)** at y−18. Brings the external air/water/utility run into the plant. `[CREATIVE]`
5. **Inter-cavern corridors.**
   - **C1 (A↔B):** Cavern A south (0, +15) → curve → Cavern B north (0, +70), a gentle dog-leg. `[CREATIVE]`
   - **C2 (A↔C):** Cavern A west (−75, −15) → Cavern C east (−115, −10), linking operations to utilities.
     `[CREATIVE]`
   - All corridors meet at the **central junction rotunda N10 (0, −12, 0)** inside Cavern A.
6. **Vertical Access Shaft (RR-Z5, deliberate liberty).** A spur (S1) branches off **Cavern A's east wall
   at (+75, −12, −15)** (the East Tunnel T3 junction) and runs east to the **shaft base at (+200, −12,
   −15)**; the shaft then rises vertically through the y41→y61 rock buffer to a **surface head-house N9 at
   (+200, y64, −15)** in the MSA east greenbelt. Relocated east from the former (120,60) head per OQ-1.
   Labeled to visitors as an invented link, not a claimed real feature. `[CREATIVE liberty]`

**Blast-door vestibules.** Each main portal tunnel passes through at least one blast-door vestibule (N1
north, N2 east; the south and west tunnels each get a single vestibule chamber at their cavern mouths).
Blast doors exist in concept for a hardened Cold-War facility; **their number and placement are
[CREATIVE].**

---

## 4. Design intent — a hardened alternate-command bunker, not a mine

The complex must *read as the "underground Pentagon"* — a purpose-built, self-sufficient, blast-hardened
command site, not a natural cave. Concrete moves, each honest about its basis:

- **Freestanding buildings on visible springs.** The four buildings stand **clear of the cavern walls**
  on exposed **spring/pillar isolation pedestals** (rendered as iron/copper spring stacks and chains) so
  the shock-isolation concept is legible at a glance. *This concept is the single most build-relevant
  public fact* [INFERENCE REF-005]; the spring counts and building sizes are [CREATIVE].
- **Gently curving tunnels.** No straight shots from portal to cavern — every tunnel curves, echoing the
  reported blast-blunting design [INFERENCE REF-005/017]. Curve radii are [CREATIVE].
- **A tall, blasted main cavern.** Cavern A rises ~52 blocks (y−12→y40) with the two command buildings
  dwarfed inside it, to sell "blasted out of the mountain" [VERIFIED excavation, REF-004; dimensions
  CREATIVE].
- **Self-sufficiency zone.** A dedicated utility cavern with reservoirs, power, and ventilation stands in
  for the sealed-for-months capability [INFERENCE REF-009]; counts are [CREATIVE].
- **Front-of-house / back-of-house separation.** Command (Cavern A) and habitation (Cavern B) are on the
  clean personnel circuit; the noisy/wet utility cavern (Cavern C) is off the west utility tunnel.
- **On-site interpretive signage** must state plainly that the interior is invented — a labeled imaginative
  interpretation of a public landmark, per REF-015. **[REQUIRED]**

---

## 5. Overhead plan diagram (X–Z)

Schematic only — the coordinate boxes in §2 and the numbers in `coordinates.yaml` are authoritative.
Top = NORTH = −Z. Bottom = SOUTH = +Z. Left = WEST = −X. Right = EAST = +X.

```
                                   NORTH ▲ (−Z)
   Z=−300 +-------------------------------------------------------------------+
          |                     [N4] NORTH VEHICLE PORTAL (0,−285)            |
   Z≈−285 |                              |                                    |
          |                       (T1 curves)                                 |
   Z≈−120 |                     [N1] NORTH BLAST VESTIBULE                    |
          |                              |                                    |
   Z≈−45  |     +------------------------+------------------------+           |
          |     |            RR-Z1  CENTRAL OPERATIONS CAVERN (A) |           |
[N6]------|-----|--(T4)   [RR-B1]        (N10)          [RR-B2]   |---(T3)----|[N5]
 WEST     |  +--------+ C2 | Command &   rotunda        Signal &  |  EAST     | E.
 UTILITY  |  | RR-Z3  |----| Operations   (0,0)         Comms     |  BLAST    | PORTAL
 PORTAL   |  | UTILITY|    | (−30,−15)               (+38,−15)    |  VEST[N2] |(+285,
(−290,+5) |  | &RES(C)|    +------------------------+-------------+ (+180,−30)|  −30)
   Z≈−15  |  |[RR-B4] |    (S1 spur off Cavern A east wall) ----> [N9] SHAFT   |
          |  | Res1/2 |                                          HEAD (+200,  |
   Z≈+15  |  +--------+             (C1 curve)      |            −15 → y64)    |
   Z≈+60  |  (−150,−10)          +---------+--------+                         |
          |                      |   RR-Z2  HABITATION &                      |
   Z≈+100 |                      |   SUPPORT CAVERN (B)                       |
          |                      |   [RR-B3] Quarters/Dining/Medical (0,+100) |
   Z≈+130 |                      +---------------+----------------+           |
          |                              |                                    |
          |                       (T2 curves)                                 |
   Z≈+285 |  [N3] SOUTH PERSONNEL PORTAL (−150,+285)                          |
   Z=+300 +-------------------------------------------------------------------+
                                   SOUTH ▼ (+Z)

  Legend: [RR-Bn]=freestanding building on springs   (Tn)=portal tunnel   (Cn)=inter-cavern corridor
          [Nn]=notable location / portal / vestibule   (N10)=central junction rotunda
          Boxes are cavern outlines; buildings float inside them clear of the walls.
```

## 5b. Vertical section diagram (looking NORTH; Y up, X across) — the stacking

```
   y79 ======================  MSA BUILDINGS / ROOFS  ======================   (MSA solid y62→y79)
   y63 --------------------------  MSA road spine  --------------------------
   y62 ========================  MSA FOUNDATION  ============================
        ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::  |shaft|
   y61  :::::::::::::  ~20-BLOCK SOLID GREENSTONE ROCK BUFFER  ::::::::::| N9  |  (nothing dug
   y41  ::::::::::::::  (no excavation here except the shaft) :::::::::::| Z5  |   here but Z5)
   y40  ______________________  RAVEN ROCK CAVERN CEILINGS  ____________|_____|__
        \                                                              /  |shaft|
        |            CAVERN A void (y40 → y−12, ~52 tall)             |   | to  |
        |    [RR-B1]###          (N10)          ###[RR-B2]           |   |y−12 |
   y9   |    #######  <- buildings on springs ->  #######           |         |
        |    ~||~ springs                          ~||~ springs      |         |
   y−12 |____/\/\/\____ CAVERN A FLOOR ____/\/\/\____________________ |         |
   y−18 ................ Cavern C reservoir sump (deepest) ..........................
        ####################### solid greenstone / bedrock buffer below y−18 #######
        WEST (−X)  <-------------------------------------------------->  EAST (+X)
```

**Reading the section:** MSA (y62→y79) and Raven Rock (y40 and below) are separated by a solid ~20-block
greenstone buffer (y41→y61). The two builds share the same X–Z envelope and their cavern/building
geometry **never overlaps in Y**. The one exception is the RR-Z5 shaft (far right, at x=+200 — well beyond
MSA's x=+70 edge), which rises through the buffer to y64 (into MSA's Y band); because it sits at x∈[193,207],
outside MSA's x∈[−70,+70] footprint and east of every MSA planned surface element, it passes through
rock/greenbelt alone and touches no MSA block.

---

## 6. Evidence-based vs. creative — explicit ledger

| Spatial decision | Basis | Tag |
|---|---|---|
| Mountain body is greenstone/metabasalt (not granite) | REF-003 | **VERIFIED** |
| Continuity-of-government / ANMCC command mission drives the program | REF-010 | **VERIFIED** |
| Excavated ("blasted-out") caverns exist | REF-004 | **VERIFIED** |
| Freestanding multi-story buildings on shock-isolation springs | REF-005 | **INFERENCE** |
| Several tunnel portals (rendered as four) | REF-007 | **INFERENCE** |
| Gently curving tunnels to blunt blast | REF-005/017 | **INFERENCE** |
| Self-sufficient utilities: reservoirs, power, ventilation | REF-009 | **INFERENCE** |
| Four buildings (vs contested three/five) | REF-006 | **CREATIVE (design choice)** |
| ~20-block burial instead of ~650 ft real depth | manifest build-scale note | **CREATIVE convention** |
| **All cavern outlines, building footprints/centroids, floors, ceilings** | — | **CREATIVE** |
| **All tunnel/corridor routes, portal positions, vestibule placement** | — | **CREATIVE** |
| Two reservoirs / building count / spring counts (specific numbers) | popular figures, contested | **CREATIVE** |
| Vertical access shaft up to MSA surface | — | **CREATIVE (deliberate liberty)** |
| Every building/cavern material & block palette | REF-016/REF-003 | **CREATIVE** |
| Every interior room list | REF-016 | **CREATIVE** |

---

## 7. Self-check (collision / envelope / Y-range) — summary

Full arithmetic is in `coordinates.yaml → consistency_check`. Summary:

- **No building overlaps another.** RR-B1 (x[−50,−10]) and RR-B2 (x[+22,+54]) are 32 blocks apart in X;
  RR-B3 (z[+85,+115]) is 83 blocks south of the Cavern-A pair; RR-B4 (x[−170,−130]) is far west of all.
- **Every building sits inside its cavern box** and every cavern box + portal is inside the envelope
  X,Z ∈ [−300,+300].
- **Y-range holds:** all buildings occupy y−18..y11; deepest floor y−18 (> the ~y−20 floor target);
  highest roof y11 (< the y40 ceilings). **No cavern or building geometry enters MSA's y62→y79 band.**
- **MSA collision:** Raven Rock's highest CAVERN/complex point (ceilings y40) is 22 blocks below MSA's
  y62 foundation; the RR-Z5 shaft ALONE rises to y64 (into MSA's Y band) but at x∈[193,207] — outside
  MSA's x∈[−70,+70] footprint and east of every MSA planned surface element — so there is no block
  collision, only rock/greenbelt.

---

## 8. Open items for cross-check (with the sibling files and other agents)

- **This file is master.** `coordinates.yaml` and `buildings.yaml` restate the same centroids, footprints,
  floors, and ceilings; any divergence is a bug in those files, not here.
- **Building count.** Four is a [CREATIVE] design choice between the contested three/five. If a later
  decision standardizes on three or five, reconcile all three files together.
- **Spring/vestibule/reservoir counts.** All [CREATIVE]; adjust as a set if the concept art changes.
- **Shaft as liberty.** If the shaft is cut for purity, RR-Z5 and N9 drop with no effect on the four
  buildings or the four portals.
- **No WorldGuard/Dynmap/Citizens plugins** (integration files stay dormant). **Bots ARE opped (level 4)**,
  so all "protection" is a planning boundary only, and opped bots would bypass WorldGuard `build:deny` even
  if it were added. **Protection model — DECIDED (OQ-2): de-op the builder bots after the build completes,
  then WorldGuard `build:deny` protects the museum normally** (a post-build step, not yet performed; same
  for MSA). See `planning/open-questions.md`.
