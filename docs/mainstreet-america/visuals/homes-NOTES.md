# MainStreet America — Home Visuals: Provenance Notes

Companion to `visuals/home-cards.svg` (Sheet 1) and `visuals/elevations.svg` (Sheet 2).

**Purpose of this file:** to state, per home, exactly which attribute on those two drawings is
source-verified, which is arithmetic inference from verified data, and which was invented for this
build. The drawings themselves carry the headline warning; this file carries the detail.

## Sources consulted

| Source | Role |
|---|---|
| `references/manifest.yaml` **REF-017** | The verified roster — names, styles, square footages, beds, baths, storey counts. Recovered from MainStreet America's own "Showcase of Homes" pages via the Wayback Machine (2013 captures, corroborated 2017). |
| `references/manifest.yaml` **REF-018** | CultureMap (2013) — secondary corroboration of the style list. |
| `references/manifest.yaml` **REF-019** | The governing gap: *no retrieved source documents any building's facade materials, colour, roof form or window pattern.* |
| `planning/buildings.yaml` | Footprint arithmetic, storey counts, massing concepts, per-record confidence tags. |
| `planning/palettes.yaml` | The 8-role block palette per home (`building_palettes` H01–H12). Explicitly authored, not transcribed. |
| `planning/open-questions.md` | OQ-6 (Ashby storeys) closed 2026-07-24 as "no change — keep the assumption, keep the flag." |
| `qa/as-built-survey.md` | Live-server RCON survey, 2026-07-24. See "Conflicts and gaps" below. |

## Confidence vocabulary

Inherited from the manifest and never upgraded:

- **verified** — primary/multi-source fact.
- **high-confidence inference** — arithmetic or a strong single-source read on verified data.
- **creative approximation** — no evidence; this build invented it.

---

## The blanket rule for both drawings

**Every facade on `elevations.svg` is a creative approximation.** What is drawn between the ground
line and the ridge — composition, roof form, window pattern, entry treatment, porches, dormers,
turrets, columns, arcades, solar panels, garden walls — is invented to express a *verified style
name*. It is not a record of what these houses looked like. Only two dimensions of each drawing are
evidence-anchored:

- **Overall width** = the footprint width in blocks, derived from verified square footage.
- **Overall height** = storey count (verified for 11 of 12) × 4 blocks of wall, plus an invented roof.

**Every block id on `home-cards.svg` is a creative approximation.** `palettes.yaml` states this in
its own provenance header: the style *names* the palettes are keyed to are verified; the materials
chosen to express them are invented.

---

## Per-home breakdown

Ordered as the sheets are: largest to smallest by verified 2013 square footage.

### The Alexandria — MSA-01 / palette H01

- **Verified:** name; style "Greek Revival"; 6,011 sq ft; 4 bed / 3 bath; **3 storeys**; largest of
  the twelve and the only home above 6,000 sq ft; oversized media room.
- **High-confidence inference:** 24 × 22 block footprint (6,011 ÷ 4 ÷ 3 ≈ 501 blk/floor).
- **Invented:** the entire facade — tetrastyle portico, pediment and tympanum, low hip roof behind,
  window rhythm, plinth and steps. All eight palette blocks.
- **Note:** REF-017 confirms this *is* the "Greek Revival mansion" of the project baseline.

### The Villa Lago — MSA-02 / palette H07

- **Verified:** name; style **"Italian Mediterranean"**; 5,979 sq ft; 5 bed / 4 bath; 2 storeys;
  expansive outdoor living; 3-car garage.
- **High-confidence inference:** 28 × 27 block footprint.
- **Invented:** stepped volumes, arcaded loggia, terracotta hip roofs, garage-wing massing, arched
  window heads. All eight palette blocks.
- **Note:** the label is *not* "Tuscan." REF-017 is explicit that the "Tuscan" descriptor in press
  coverage belongs to the separate welcome/guest centre. Chief Outsiders' loose "6,000+ sq ft" is
  superseded by the official 5,979.

### The Ashby Manor — MSA-05 / palette H03  ⚠️

- **Verified:** name; style "Old World"; 4,138 sq ft; 4 bed / 3 bath; private garden.
- **NOT ESTABLISHED BY EVIDENCE — storey count.** REF-017 lists `stories: null`. **Two storeys is an
  assumption**, carried from peer Old-World homes, and it is flagged on both drawings (†), in
  `buildings.yaml` (MSA-05 defect), in `coordinates.yaml` (CONFLICT-06), in the QA report (SA-08 /
  AR-06), and in `open-questions.md` OQ-6 (closed 2026-07-24: keep the assumption, keep the flag).
- **Depends on that assumption:** the 24 × 22 footprint. A one-storey Ashby would be roughly twice
  as wide on the plate — the elevation would be a substantially different drawing.
- **Invented:** asymmetric cross-gables, mixed brick/fieldstone/half-timber walls, off-centre arched
  entry porch, chimney, the walled garden's built form. All eight palette blocks.
- **Also noted:** dth.com's catalogue lists a different "Ashby Manor" at 4,507 sq ft. The official
  4,138 is used.

### The Calais — MSA-04 / palette H08

- **Verified:** name; style "French Hill Country"; 4,101 sq ft; 4 bed / 4 bath; 2 storeys; large
  game room.
- **High-confidence inference:** 24 × 21 block footprint.
- **Invented:** steep near-mansard hip, arched eyebrow dormers, corner stair turret and its copper
  spire, chimney, round-arched entry. All eight palette blocks.
- **Also noted:** dth.com's catalogue lists a different "Calais" at 4,093 sq ft. Official 4,101 used.

### The Casa Lana — MSA-06 / palette H09

- **Verified:** name; style "Spanish Courtyard"; 3,240 sq ft; 3 bed / 3 bath; **1 storey**; an
  additional **casita** (the detached volume drawn at the right is therefore a verified *programme*
  element rendered in an invented form).
- **High-confidence inference:** 28 × 29 block footprint (includes the courtyard void and casita).
- **Invented:** U-plan-implying massing, barrel-tile hip, arched entry portal, reja window grilles,
  casita's built form. All eight palette blocks.

### The Cross Creek — MSA-08 / palette H10

- **Verified:** name; style "Texas Hill Country"; 3,223 sq ft; 4 bed / 4 bath; 1 storey;
  rustic-but-elegant; **expansive rear porch** (a verified programme element — not visible on a
  front elevation, which is why the dog-trot is drawn as a view through to it).
- **High-confidence inference:** 28 × 29 block footprint.
- **Invented:** limestone/board-and-batten split, standing-seam metal gable, the dog-trot breezeway
  itself, front porch and cedar posts. All eight palette blocks.

### The Centennial — MSA-07 / palette H04

- **Verified:** name; style "Craftsman"; 2,715 sq ft; 3 bed / 2 bath; 2 storeys.
- **High-confidence inference:** 19 × 18 block footprint.
- **Invented:** broad front gable, deep eaves, exposed rafter tails, full-width porch on battered
  piers, two-tone shingle/siding wall. All eight palette blocks.
- **Drawing note:** the sash treatment (clear lower, brown upper) follows `palettes.yaml` H04's
  stated `window_treatment`; it is invented like the rest of the palette.
- **Also noted:** some secondary coverage calls it a "Craftsman bungalow"; REF-017's "Craftsman" and
  the 2-storey count are the verified values.

### The Wakefield — MSA-12 / palette H06

- **Verified:** name; style "Traditional Brick"; 2,622 sq ft; 4 bed / 3 bath; 1 storey; **the
  energy/technology showcase home** — geothermal HVAC, air-sealing, efficient appliances; called
  "an NRG home" on the 2017 site.
- **High-confidence inference:** 26 × 25 block footprint.
- **Invented:** symmetric brick facade, hip roof, sidelit centre door and pediment stoop, shutters —
  **and the rooftop solar array**, which is an honest *nod to the verified energy programme*, not a
  claim about the real roof. No source says this house had visible PV. All eight palette blocks.
- **Also noted:** dth.com's catalogue lists a "Wakefield" at 2,601 sq ft. Official 2,622 used.

### The Midtown — MSA-09 / palette H11  ‡

- **Verified:** name; style "Contemporary Townhome"; 3 bed / 3 bath; **4 storeys** — tallest by
  storey count.
- **DISPUTED — square footage.** 2,417 sq ft (2013 official) vs **2,553 sq ft (2017 capture)**. The
  drawings use 2,417, consistent with `buildings.yaml` MSA-09. Marked ‡ on the card.
- **High-confidence inference:** 13 × 12 block footprint (depends on which sq ft figure is used).
- **Invented:** cantilevered stacked volumes, curtain wall, parapet and roof terrace, tuck-under
  garage. All eight palette blocks.

### The Timbergrove — MSA-10 / palette H05  ‡

- **Verified:** name; style "Classic Stone & Siding"; 3 bed / 2 bath; 1 storey; covered rear porch.
- **DISPUTED — square footage.** Three published figures: **2,321 (official)**, 2,231 (OutSmart),
  2,344 (dth.com catalogue). The drawings use the official 2,321. Marked ‡ on the card.
- **High-confidence inference:** 24 × 24 block footprint.
- **Invented:** the stone-gable / lap-siding split, cross-gable roof, gable-portico stoop, shutters.
  All eight palette blocks.
- **Note:** the style *name* does constrain the material split (stone below, siding above); which
  stone and which siding is still invented.

### The Valencia — MSA-11 / palette H12

- **Verified:** name; style "Southwestern Mediterranean"; 1,881 sq ft; 4 bed / 2 bath; 1 storey;
  efficient plan with a bonus fourth bedroom.
- **High-confidence inference:** 22 × 21 block footprint.
- **Invented:** flat stepped parapet, projecting viga ends, canale scupper, recessed arched portal,
  deep-set openings. All eight palette blocks.
- **Also noted:** dth.com's catalogue lists a "Valencia" at 1,896 sq ft. Official 1,881 used.

### The Cape Pointe — MSA-03 / palette H02  ⚠️

- **Verified:** name; style **"Coastal Beach House"**; 1,815 sq ft; 3 bed / 2 bath; 2 storeys;
  **smallest of the twelve**; two-storey with loft.
- **NOT VERIFIED — the raised/pier-and-beam expression.** The project baseline's words
  "Galveston-style", "elevated" and "pier-and-beam" are **paraphrase**, not source. REF-017's page
  says only "Coastal Beach House." The pilings drawn under this elevation, and the external porch
  stair they imply, are a design choice honouring that paraphrase — flagged on the sheet and in
  `palettes.yaml` A06. Do not let the raised look harden into fact.
- **High-confidence inference:** 15 × 15 block footprint.
- **Invented:** everything above the ground line — steep gable, board-and-batten, loft gable window,
  shed porch. All eight palette blocks.

---

## Conflicts and gaps encountered while producing these sheets

1. **`buildings.yaml` and `palettes.yaml` specify different materials for the same homes.**
   `buildings.yaml` carries an informal `palette:` block per record; `palettes.yaml` carries the
   formal 8-role `building_palettes` set. They agree on hue family but diverge on block ids —
   e.g. The Valencia is `smooth_red_sandstone / orange_terracotta` in `buildings.yaml` but
   `mud_bricks` (adobe) in `palettes.yaml`; The Ashby Manor is `bricks + mossy_cobblestone` vs
   `stone_bricks + smooth_sandstone`; The Cross Creek is `calcite / diorite` vs `cobblestone`.
   **These sheets use `palettes.yaml`** as the authority, per the task brief and because it is the
   dedicated, role-complete palette document. Both files tag every block as creative approximation,
   so nothing factual turns on the choice — but the two files should be reconciled.

2. **Home → lot assignment is arbitrary.** `buildings.yaml` A5 records that no source maps a named
   home to a lot; the MSA-01…MSA-12 id assignment is the builder's choice. The MSA ids printed on
   these sheets are therefore *labels for the plan records*, not positional facts.

3. **The palette ids are not in roster order.** `palettes.yaml` numbers homes H01–H12 in a different
   sequence from `buildings.yaml`'s MSA-01…MSA-12 (e.g. The Ashby Manor is MSA-05 but palette H03).
   Both ids are printed on each card so the cross-reference is unambiguous.

4. **The as-built server state contradicts the plan, and these sheets follow the plan.**
   `qa/as-built-survey.md` (2026-07-24 RCON survey) reports homes actually built at x ≈ ±20–25 on a
   narrow central street — a third scheme matching neither the GRID nor the OVAL plan — with west
   homes in `deepslate_bricks` and east homes in `stone_bricks`. Those as-built materials match
   *neither* palette document. The survey also found only **~9 wall clusters, not 12**, and calls for
   a fine per-lot sweep to confirm the full roster is present and correctly styled. **These drawings
   are design intent, not an as-built record.** If the sheets are ever used to verify the server,
   that divergence has to be resolved first.

5. **No canonical brief exists.** Both `buildings.yaml` (A1) and `palettes.yaml` (A01) record that
   the "sections 11 / 13 / 14 / 15 / 20" the task chain references are not present in this repo.
   The palettes and the room programmes were authored, not transcribed. Anything downstream of them
   — including these sheets — inherits that.

6. **Storey height is a build convention.** The 4-blocks-per-storey figure used to set elevation
   heights is a Minecraft construction choice, not derived from any source. Only the *count* of
   storeys is verified.
