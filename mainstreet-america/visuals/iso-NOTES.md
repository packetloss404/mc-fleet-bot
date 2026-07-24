# Isometric mockups — provenance notes

Files: `iso-street.svg`, `iso-guest-center.svg` (hand-authored, self-contained SVG, no external
fonts/images/scripts; 2:1 isometric massing, camera in the **+X / −Z** quadrant so the **north** and
**east** faces of every mass are visible).

**These are massing mockups of block shells, not renders and not screenshots of the world.** Both
drawings carry that statement on their face. Nothing here was traced from a capture of the server.

---

## 1. What came from the as-built survey (`qa/as-built-survey.md`, live-server RCON, 2026-07-24)

Every item below was probed block-by-block against the running Paper server and is drawn to those
numbers:

| Drawn element | As-built measurement used |
|---|---|
| Guest Center plan | solid **x −70…+70 (≈141 wide)** at z=128; **z ≈ 90…180+** at x=0; centroid ≈ **(0, ~135)** |
| Guest Center section | solid **y63 → y79** (16 blocks, 2 storeys + roof band); interior air **y65–68**; walls present |
| Guest Center materials | **gray_concrete** roof band, **stone_brick** foundation (y62–63), **polished_andesite** floor, **sea_lantern** interior lighting |
| Street spine | continuous placed surface at **y=63 along x=0**, running **z ≈ +200 → −235** (~435 blocks) |
| Water / causeway | water at **y62 from z ≈ −100 to −235**; the spine bridges it |
| Home lots | flank the spine at **x ≈ ±20–25** (drawn at x = ±22) |
| Home wall band | multi-storey, **y63 → ~y79** — drawn as a uniform 16-block band for all twelve |
| Home wall material | **west = deepslate_bricks, east = stone_bricks** (shown as swatches in the key panel) |
| Confirmed lot positions | west z ≈ **{0, −96, −144, −195}**; east z ≈ **{+21, −48, −93, −144, −195}** — marked **●** |
| Site grading | build area levelled to **y ≈ 63** (natural terrain ~y120 nearby) |
| Fleet / ops | Mason, Architect, Steward, Scout, Surveyor — all opped at level 4 |
| Seed / server | −2712155529552800606 · Paper 1.21.11 · 10.80.13.14 |

Also drawn straight from the defect register (`qa/defects.yaml`):

- **DEF-006** — Guest Center entrance door on the **NORTH** face, off the x=0 drive axis (plan called
  for SOUTH). Drawn at x ≈ +8 on the z=90 wall and called out in red. The survey did **not** probe door
  orientation; this is the overnight build report's self-noted defect, awaiting in-world confirmation.
- **DEF-002** — the 141-wide plate is far larger than either planned scheme (75×75 GRID / 90×60 OVAL);
  noted on both drawings.
- **DEF-003** — the 12-home roster is verified *history* but only ~9 wall clusters were resolved
  in-world; the three unresolved lots are drawn with a **○** marker and a dashed red lot outline.
- **DEF-005** — the road/drive surface block is still unidentified; the drive is drawn a neutral
  asphalt grey and labelled as unidentified.

Verified from the source record (`references/manifest.yaml`, REF-007/009/017), not from the world:
the twelve home **names**, **architectural style names**, **square footages** and **storey counts**,
and the Guest Center at **44,019 SF / 2 storeys**.

---

## 2. What is stylised (creative approximation)

Per REF-019 and `planning/palettes.yaml` A02: **no retrieved source documents the facade material,
colour, roof form or window pattern of any of these buildings.** On top of that, several things in
these drawings depart from what the survey actually found, deliberately, for legibility:

1. **Per-home colour is the *planned* palette, not the as-built material.** Each home is drawn in the
   dominant wall + roof hue of its `planning/palettes.yaml` entry (H01–H12) so the twelve read as
   distinct. **In the world they are two uniform materials** — deepslate brick on the west flank,
   stone brick on the east. Both drawings say so explicitly, and `iso-street.svg` shows the two real
   material swatches in its key panel.
2. **Roof forms are invented.** Hip / gable / flat caps are assigned from the palette's roof block
   (e.g. steep dark slate for The Calais, flat adobe slab for The Valencia). The as-built shells are
   plain walls to y79 with no described roof form. The wall band was split at y75 to make room for a
   4-block roof cap so the total still tops out at the measured y79.
3. **Per-home footprints** are the `planning/buildings.yaml` figures derived from verified square
   footage (e.g. Alexandria 24×22, Midtown 13×12). The survey never measured any individual home's
   footprint.
4. **Home → lot assignment is arbitrary** (`buildings.yaml` A5: no source maps a named home to a lot).
   The order used here is: **west, south→north** — Villa Lago ○, Ashby Manor ●, Calais ○, Alexandria ●,
   Timbergrove ●, Valencia ●; **east, south→north** — Wakefield ○, Casa Lana ●, Cross Creek ●,
   Centennial ●, Midtown ●, Cape Pointe ●. Another agent may reshuffle freely.
5. **The three ○ lots** (Villa Lago z+45, Calais z−48, Wakefield z+66) are **placed by me** to complete
   the verified 12-home roster; only the nine ● positions came off the probe.
6. **All storey counts read the same height.** The as-built shells all rise to the same y79 band, so
   the 4-storey Midtown and the 1-storey Timbergrove are drawn the same height. The verified storey
   count is printed in the label instead. This is faithful to the world, not to the homes.
7. **Everything green, paved or landscaped is invented**: lawns, verges, forecourt apron, home
   footprint pads, lane markings, the fill "islands" under the two northern lot pairs, ground shadows.
8. **Guest Center wall material is unknown** — the survey identified the roof, floor, foundation and
   lighting but never the wall block. Drawn a neutral stone grey and labelled as such.
9. **Guest Center glazing** (the window bays on the north and east faces) is entirely invented; it
   exists to give the 141-block mass a readable scale.
10. **The monument is drawn ghosted because it is NOT BUILT.** A large frontage LED monument is
    verified to have existed at the real site (REF-013); the survey found no monument, billboard,
    porte-cochère, parking field, cooking school or warehouse in-world. It is shown as a dashed
    outline only, never as a solid mass.
11. **Road width** (~10 blocks) is a guess — the survey measured the spine's length and elevation, not
    its width.
12. **Compass bearing** is a build convention (`buildings.yaml` A3): the real parcel fronted I-45 on
    its **west**; this build puts the entrance on the **south (+Z)**. Both drawings state this.

---

## 3. What the as-built survey left ambiguous (and how the drawings handled it)

1. **Guest Center depth is a lower bound.** The probe reported `z ~90…180+`; the south face was never
   pinned. Drawn as z 90→180 and dimensioned "**≥ 90 blocks deep**" with the caveat printed.
   The task brief's "145×76 footprint" could not be reconciled with the survey — the survey measures
   ≈141 wide and ≥90 deep. **The survey numbers were used.** If 145×76 came from the overnight build
   report, that report and the survey disagree and the discrepancy needs settling.
2. **Road vs. Guest Center floor overlap.** The "continuous placed surface at y=63 along x=0" spans
   z +200 → −235, which passes straight *through* the Guest Center footprint (z 90–180). Between those
   z values the y=63 hits are just as likely to be Guest Center floor as road. Flagged on
   `iso-guest-center.svg`; the drive is drawn only *south* of the building.
3. **How much drive exists south of the building.** If the GC's south face really is at z≈180 and the
   surface runs to z≈+200, the entire "entrance drive" is ~20 blocks long. Drawn that way, with the
   continuation labelled rather than invented.
4. **Whether the two northern lot pairs (z ≈ −144, −195) sit on fill or over water.** Water was probed
   only along the x=0 column, from z −100 to −235. The homes sit at x ≈ ±22. I drew graded fill islands
   under them; this is an assumption, and the alternative (homes standing over/beside open water) was
   not ruled out.
5. **Home count.** Nine clusters, twelve verified homes. Unresolved — DEF-003 is still open and the
   drawings mark it rather than papering over it.
6. **Home footprints, heights per home, and which style is on which lot** were never measured; the
   survey only says "west deepslate, east stone brick, walls y63→~79".
7. **Guest Center wall block, and the road surface block** (DEF-005), both fell outside the ~90-entry
   probe palette and remain unidentified.
8. **Door face unconfirmed.** DEF-006 comes from the build report's self-note, not from a probe. The
   drawing labels it as a defect *pending* RCON confirmation, not as measured fact.
9. **Whether a `y62` water reading at z −100…−235 means one lake or several** is unknown; drawn as a
   single body between z −212 and −100 for the causeway read.

---

## 4. Regenerating

The drawings are hand-authored SVG emitted by a small generator kept with the session scratchpad
(`gen_iso.py`); the committed artefacts are the two `.svg` files, which are the deliverable. They use
`viewBox` + `max-width:100%` so they render standalone in a browser at any width and are laid out to
be readable at 1600 px.
