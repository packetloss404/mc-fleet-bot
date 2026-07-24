# Raven Rock — drawing notes, sources and document conflicts

**Deliverables in this directory**

| File | Content |
|---|---|
| `section.svg` | Sheet RR-V01 — two vertical sections. **A–A** east–west looking north (cut plane z ≈ −15) and **B–B** north–south looking east (cut plane x = 0). Y-axis to true scale in blocks; horizontal run compressed (vertical exaggeration ×2.5, stated on the sheet). |
| `level-plans.svg` | Sheet RR-V02 — master sub-surface plan of the whole 600 × 600 envelope plus three zone detail plans (Cavern A, Cavern B, Cavern C) at their own scales. |
| `raven-rock-NOTES.md` | This file. |

Both SVGs are hand-authored, fully self-contained (no external fonts, images, scripts or network
requests), render standalone in a browser, and are laid out to read at 1600 px wide. Both carry a
scale bar, a legend with per-element confidence chips, a north arrow (plans) or view-direction note
(sections), and a mandatory honesty panel.

---

## 1. The honesty position these drawings take

Raven Rock's interior is **classified**. There is **no public floor plan**, and since 2007 US DoD
policy has forbidden making *"any photograph, sketch, picture, drawing, map or graphical
representation"* of the complex (`references/manifest.yaml` REF-015).

Accordingly both sheets state, in a boxed panel that cannot be missed, that they are an
**openly-labelled imaginative interpretation of a public landmark drawn for a Minecraft build**,
that they are **not** a map of the real facility, and that they **contain no classified
information**. Nothing on either sheet was derived from a non-public source; nothing invented is
presented as documented fact. Each legend entry carries a `VERIFIED` / `INFERENCE` / `CREATIVE`
chip, and both sheets carry an explicit ledger separating the two.

**What the drawings attribute to the public record**

| Element | Basis |
|---|---|
| The mountain is Catoctin **greenstone / metabasalt**, not granite | VERIFIED (REF-003) |
| Caverns were **blasted out**, 1951–53, ~½ million cubic yards hauled away | VERIFIED (REF-004) |
| Continuity-of-government / **ANMCC** command mission | VERIFIED (REF-010) |
| 114th Signal Bn / DISA signals tenancy (drives the RR-B2 program) | VERIFIED (REF-011) |
| **Freestanding multi-story buildings on giant shock-isolation springs**, standing clear of the cavern walls, caverns separated by rock pillars | INFERENCE (REF-005) |
| **Several hillside tunnel portals** (commonly said to be four); tunnels curve gently to blunt a blast wave | INFERENCE (REF-007 / REF-017) |
| Self-sufficiency: on-site **power, ventilation, reservoirs** | INFERENCE (REF-009) |

**What the drawings invent [CREATIVE]** — everything spatial. The five-zone scheme, every cavern
outline and size, every floor and ceiling elevation, all four building footprints and their
arrangement, every tunnel and corridor route and curve, all four portal positions, both blast
vestibules, the central rotunda, the reservoir count/size/position, the room lists, and the RR-Z5
vertical shaft. The **four-building count** is a design choice between contested public claims of
three (Wikipedia) and five (popular sources) — REF-006. "Two reservoirs" and "dual power" are
likewise popular figures, not authoritative — REF-009. The **~20-block burial depth** is a build
convention, not a survey: the real complex is popularly said to sit ~650 ft below the summit
(REF-008), which at this world's scale (1 block ≈ 2 ft) would be ~325 blocks down and off-envelope.

---

## 2. Sources read (in authority order)

1. `raven-rock/planning/site-plan.md` — **declared master**; §1.1 vertical stacking, §2 zones, §3 circulation.
2. `raven-rock/planning/coordinates.yaml` — coordinate manifest, `consistency_check`, `assumptions_and_gaps`.
3. `raven-rock/planning/buildings.yaml` — building records RR-B1…RR-B4.
4. `raven-rock/planning/palettes.yaml` — Z-* palettes (drove the drawing colour language: greenstone
   green, institutional grey concrete, copper/iron accents, cyan water, yellow/black hazard).
5. `raven-rock/planning/open-questions.md` — **the DECIDED table at the top (six items signed off 2026-07-24)**.
6. `raven-rock/references/manifest.yaml` — REF-001…REF-018, confidence vocabulary, conflicts.
7. `raven-rock/qa/qa-report.md`, `raven-rock/integration/*.yaml` — read for cross-checking only (see conflicts).
8. `mainstreet-america/qa/as-built-survey.md` — MSA foundation y62 / road spine y63 / surface y64 /
   Guest Center solid y63→y79 at x −70…+70, z ≈ 90…180.
9. `mainstreet-america/planning/buildings.yaml`, `site-plan.md` — MSA building positions used for the
   schematic surface band on section A–A, and the **Z09 event lawn box x ∈ [+70,+160], z ∈ [−15,+120]**.

---

## 3. Document conflicts found

### C-1 — STALE RR-Z5 SHAFT COORDINATES (the significant one)

OQ-1 was decided **(b) RELOCATE** on 2026-07-24. The shaft head-house **N9 is now at (200, 64, −15)**,
footprint **x ∈ [193, 207], z ∈ [−22, −8]**. The superseded location was **(120, 64, 60)**,
x ∈ [113, 127], z ∈ [53, 67].

**Both drawings use the CURRENT (200, 64, −15) location** and label it as relocated.

| File | State |
|---|---|
| `planning/site-plan.md` | ✅ current (200, 64, −15) |
| `planning/coordinates.yaml` | ✅ current |
| `planning/buildings.yaml` | ✅ current |
| `integration/worldguard.yaml` | ✅ current (records the relocation) |
| `planning/open-questions.md` | ⚠️ **mixed** — the DECIDED table is correct, but the retained OQ-1 body (§OQ-1, "N9 at (120, 64, 60)… x∈[113,127], z∈[53,67]") and **OQ-4** ("the RR-Z5 shaft at x∈[113,127] is the single sanctioned exception") are stale |
| `qa/qa-report.md` | ❌ stale in ≥4 places — §2 cross-check table, §3 prose, **SP-02**, **SP-08** |
| `integration/map-marker.yaml` | ❌ stale — `corners_x: [113,127,127,113]`, `corners_z: [53,53,67,67]` |
| `integration/location.yaml` | ❌ stale — shaft base `(120, −12, 60)`, head `(120, 64, 60)` |
| `mainstreet-america/planning/open-questions.md` | ❌ stale — still asks MSA to reserve x 113–127, z 53–67 |

**Operational consequence:** OQ-4's build-script guardrail whitelist must be wired with
**x ∈ [193, 207], z ∈ [−22, −8]**. If it is copied from the stale OQ-4 text, the guardrail will
whitelist empty rock at x 113–127 *and refuse the real shaft*, and MSA will reserve the wrong
surface parcel.

### C-2 — "MSA's footprint is x ∈ [−70, +70]" understates MSA's planned east/west extent

The ±70 figure is the **as-built Guest & Design Center** width, not MSA's outer bound. MSA's planned
homes sit at x ≈ −118 / −116 (MSA-01, MSA-02, MSA-04) and x ≈ +116 / +118 (MSA-05, MSA-08, MSA-10,
MSA-12), with footprints reaching roughly **x ±130**. The Raven Rock docs repeatedly justify the
shaft's clearance against "outside MSA's x ∈ [−70,+70] footprint".

**The OQ-1 conclusion still holds** — the shaft at x ∈ [193, 207] clears the widest planned MSA
element (x ≈ 130) by ~63 blocks and the Z09 event lawn (x ≤ 160) by 33 blocks — but the ±70 figure
should not be used as MSA's outer bound in any future clearance argument. The plan sheet therefore
draws MSA's reference outline at **x −130…+130, z −235…+200**, not at ±70.

### C-3 — The shaft head shares Z09's latitude; the clearance is in X only

Z09 event lawn is **x ∈ [+70,+160], z ∈ [−15,+120]**. The shaft head is z ∈ [−22, −8], which
**overlaps Z09's z-range at z −15…−8**. The separation between them is purely the 33-block gap in X.
That is a real clearance, but the docs' phrasing ("z = −15 keeps it separated from the parking field
and the rear detention/landscape") describes different elements and could be misread as a z-clearance
from Z09. The plan sheet draws both boxes so the relationship is visible.

### C-4 — Reservoir N7 compass wording is inverted

`coordinates.yaml` N7 describes the basins as "two adjacent basins in the **south** strip of Cavern C"
and "**south of** RR-B4 (z −24…4)". With the project's own convention (north = −Z), the basins at
**z −34…−26** are **north** of RR-B4 (z −24…+4) and sit in Cavern C's **north** strip
(cavern z −35…+15). The numbers are unambiguous and internally consistent; only the compass words are
wrong. **The drawings follow the numbers** — basins north of RR-B4.

Also: the stated "~2-block gap" between the basins (z max −26) and RR-B4 (z min −24) is **1 block**
(z = −25).

### C-5 — Buffer thickness is quoted three ways

`site-plan.md` §1.1 table says "**~20 blocks** of undisturbed greenstone"; the same section's Key
numbers and `coordinates.yaml` `buffer_thickness_blocks` say **22**. Both are defensible readings of
the same geometry, so the drawings state it precisely: the band **y41 → y61 is 21 block layers**, and
the **clear gap from cavern ceiling y40 to MSA foundation y62 is 22 blocks**.

### C-6 — "Stock Paper, no plugins" is false, and is still asserted in three files

`open-questions.md` OQ-3 records that **WorldEdit 7.4.0 and WorldGuard 7.0.16 are installed**. The
"stock Paper with no plugins" premise is still stated in `site-plan.md` §1, `coordinates.yaml`
`meta.site_conditions`, and `palettes.yaml` SITE CONDITIONS. Not a geometry issue; not drawn.

### C-7 — "Builder bots are NOT opped" is stale in two files

Corrected in `site-plan.md` and `coordinates.yaml` (bots **are** opped, level 4). Still asserted in
`palettes.yaml` SITE CONDITIONS and `buildings.yaml` assumption **A6**. Not drawn.

### C-8 — Three of four building entrances sit on the wall plane, not 1 block outside it

`buildings.yaml`'s own field legend defines `entrance_coordinate` as "main door, **1 block outside**
the facing wall". Checked against each footprint:

| Building | Footprint edge | `entrance_coordinate` | Verdict |
|---|---|---|---|
| RR-B1 | z max = +2 | `[−30, −8, 3]` | ✅ 1 outside |
| RR-B2 | x min = +22 | `[22, −8, −15]` | ⚠️ on the wall (expect 21) |
| RR-B3 | z min = +85 | `[0, −6, 85]` | ⚠️ on the wall (expect 84) |
| RR-B4 | x max = −130 | `[−130, −14, −10]` | ⚠️ on the wall (expect −129) |

Cosmetic, but it will place three doors inside their own walls if a build routine takes the field
literally. Not visible at drawing scale; recorded here only.

### C-9 — West portal N6 breaks the "portal mouths open at floor y≈18" rule

`site-plan.md` §3 says portal mouths open "in a rock face at floor **y ≈ 18**". N6 is specified at
**(−290, y10, +5)** — floor y10, and at x = −290 rather than ±285, leaving the tightest envelope
margin in the build (10 blocks). This is documented in `coordinates.yaml` `extents_summary` and is
not an error, but the §3 generalisation does not cover it. **The drawings show N6 at y10, x −290.**

---

## 4. Information the drawings needed that no planning document supplies

These were drawn **indicatively and labelled as such** on the sheets. None should be read back into
the planning set as a decision.

| Missing datum | How the drawings handle it |
|---|---|
| **Natural terrain profile** between MSA's graded y64 plane and the ±285 portal mouths | Drawn as an indicative graded hillside falling to each portal bench, with a note that the ±285 edge terrain is **not yet surveyed or sculpted (OQ-6)**. |
| **Reservoir water depth** | No depth is specified anywhere. Section A–A shows a shallow indicative body on the y−18 sump; the sheet does not quote a figure. |
| **Head-house N9 massing** (footprint given, height/form not) | Drawn as a small gabled structure on the y64 plane; indicative. |
| **Blast-vestibule chamber heights** (N1, N2) | Drawn ~12 blocks; indicative. |
| **Cavern wall/ceiling profile** — vaulted, stepped or flat | Drawn as blasted vaults springing at ~60 % of chamber height. The **authoritative** figure is the zone plan box, which both sheets draw as a dashed rectangle over the indicative outline. |
| **Tunnel curve radii** | "Gently curving" is the only guidance (INFERENCE REF-005/017). Curves drawn freehand within the specified from/via/to points, which are honoured exactly. |
| **MSA building positions on section A–A** | Projected from `mainstreet-america/planning/buildings.yaml` onto the cut plane and labelled *schematic — true z varies*. Their true z spans −235…+200; the section cut is at z ≈ −15. |

---

## 5. Geometry the drawings assert (all taken straight from the planning set)

Vertical stack, top to bottom: MSA roofs ~y79 · MSA surface plane y64 · road spine y63 · MSA
foundation y62 · **solid greenstone buffer y61 → y41 (21 layers, 22-block clear gap)** · cavern
ceilings y40 (Cavern B y36, Cavern C y28) · main cavern floor y−12 (Cavern B y−10) · **reservoir sump
y−18, deepest point** · bedrock buffer left solid below y−18.

Zones: **RR-Z1** Cavern A x[−75,+75] z[−45,+15], y−12→y40 (≈52 tall) · **RR-Z2** Cavern B x[−45,+45]
z[+70,+130], y−10→y36 · **RR-Z3** Cavern C x[−185,−115] z[−35,+15], y−18→y28 · **RR-Z4** the four
portal tunnels and vestibules · **RR-Z5** shaft x[193,207] z[−22,−8], y−12→y64.

Buildings: **RR-B1** (−30,−8,−15) 40×34, 3 floors, top y9 · **RR-B2** (38,−8,−15) 32×30, 3 floors,
top y9 · **RR-B3** (0,−6,100) 44×30, 3 floors, top y11 · **RR-B4** (−150,−14,−10) 40×28, 2 floors,
top y−2. All on 4-block spring pedestals.

Circulation: **T1** N4 (0,y18,−285) → N1 (0,−6,−120) → Cavern A (0,−12,−45) · **T2** N3 (0,y18,+285)
→ Cavern B (0,−10,+130) · **T3** N5 (285,y18,−30) → N2 (180,y0,−30) → Cavern A (75,−12,−15) ·
**T4** N6 (−290,y10,+5) → Cavern C (−185,−18,−10) · **C1** (0,−12,+15) → (0,−10,+70) · **C2**
(−75,−12,−15) → (−115,−18,−10) · **S1** (75,−12,−15) → (200,−12,−15) · **N10** rotunda (0,−12,0) ·
**N7** reservoirs x −170…−130, z −34…−26, sump y−18 · **N8** spring array under RR-B1 ·
**N9** head-house (200,64,−15).

The four ±285 portal-approach corridors are drawn as **reserved no-build zones**, per the second half
of the OQ-1 decision (that reservation is **not yet written into MSA's surface plan**).

---

## 6. Regenerating

Both SVGs were authored as literal SVG source (generated from a scratch build script for geometric
accuracy, then written to disk). They are plain text and can be edited directly. If the shaft moves
again, or C-1 is resolved by updating the stale files, the elements to change are:

- `section.svg` — the `RR-Z5 shaft + head-house` group (search `RR-Z5 VERTICAL ACCESS SHAFT`),
  keynotes 14 and 15, and the DOCUMENT CONFLICT footer.
- `level-plans.svg` — the shaft square and `RR-Z5` label (search `RR-Z5`), keynote 15, and the
  DOCUMENT CONFLICT footer.

If C-1 is ever closed by updating `qa/qa-report.md`, `integration/map-marker.yaml`,
`integration/location.yaml`, `planning/open-questions.md` (OQ-1 body + OQ-4) and
`mainstreet-america/planning/open-questions.md`, delete the DOCUMENT CONFLICT footer from both sheets
and this section 3 C-1 entry with it.
