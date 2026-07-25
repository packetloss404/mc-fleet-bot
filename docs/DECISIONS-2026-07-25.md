# Audit decisions — ratified 2026-07-25

Answers to every open question raised by the three `qa/audit-2026-07-25.md` reports,
decided by the operator (`packetloss404`) in one sitting. **26 questions, 26 answers,
nothing left pending.**

This file is the authority on *what was decided*. The audits remain the authority on
*what was measured*. Where a decision contradicts a build doc, the build doc is to be
amended to match this file — that is itself one of the decisions below.

> **Standing rule that shaped most of these answers:** where the world and the plan
> disagree and the world is sound, **amend the plan**. This project has repeatedly
> damaged finished work in pursuit of a number in a document. Demolition now requires
> a reason beyond non-compliance.

---

## Execution ground rules

| | Decision |
|---|---|
| **Who builds** | **Operator over RCON.** Repairs patch hand-built geometry; LLM repair passes over hand-built work are not wanted. Do **not** mark rows `damaged` to trigger `PhoenixManager` |
| **Bot-driven building** | Reserved for genuinely new structures, where a mistake is not a regression |
| **Verification** | Targeted probes at known defects. No blanket sweeps funded |
| **Grading passes** | **None approved.** The most destructive operation ever run on this project |

---

## Ravensreach — 11 questions

| # | Question | Decision |
|---|---|---|
| 1 | Grove: 9 of 17 trees gone | **Accept and de-register.** The fleet harvested them; logs *and* leaves absent is the signature of removal plus decay, not a partial build. Rebuilding in place feeds the same loop while the town actively requests wood. Amend docs to stop claiming a 17-tree grove |
| 2 | Do we want a well? | **Correct the row to the real well.** A bot-built well already stands in the plaza at `(-85,68,-359)`. Repoint the phantom row at its actual location and measured size — kills the false `complete` and the junk 21×21 avoidRect straddling the Town Hall |
| 3 | Surveyor cottage 13×8 vs 13×11 spec | **Accept 13×8.** The north wall is built at `z=-407` and the cottage is sound. The 13×11 spec was never physically possible — it overlapped the storehouse. Update row to origin `z=-407`, depth 8 |
| 4+5 | Storehouse and cottage fit-out | **Role-specific interiors.** 4 storehouse chests + a `spruce_door`, and per-role cottage fit-outs (forge for Mason, plans/lectern for Architect, …) rather than a uniform crafting table. Makes the docs' long-standing "furnished interiors" claim true |
| 6 | May I edit `town.db`? | **Yes — all four writes**, after backing up the file. Widen hall row to 27×14×14; correct the Surveyor row; insert `plaza:1`; widen Old Town bounds to `x[-126..-45] z[-422..-338]`. All protective, none touches a world block |
| 7 | Extend `mining.protectedZones`? | **Yes, to all structures** — 5 cottages, storehouse, mine apron. Accepts that bots also cannot repair them, which is moot since every repair to date has been RCON. Needs a `config.yml` edit **plus a restart** (PATCH silently drops arrays while returning `ok:true`) |
| 8 | Who executes | **Operator RCON.** See ground rules |
| 9+10 | Grading / residue verification | **Targeted fixes only.** Patch the 2 low columns and the water source at `(-66,68,-352)` directly. **No** 400–600 probe residue sweep and **no** second grading pass |
| 11 | Water/dirt inside old stray-hall regions | **Accepted as terrain**, not build residue, on the tag evidence already gathered |

## Raven Rock — 10 questions

Two were already resolved by the repair session before this review: **OQ-F** (Cavern C
seal — 213 water hits → 0) and **OQ-G** (DS-01 sign wording — 6 signs placed and read
back from block data). The remaining eight:

| # | Question | Decision |
|---|---|---|
| **A** | N9 head-house elevation | **Build at natural y62.** Zero earthworks, R2 already drafted for it, and the 2-block step from the MSA plane is barely legible. Earthworks here would run immediately beside an open 15×15 shaft |
| **B** | N7 "Reservoirs 1 & 2" vs one basin | **Amend the docs to one basin.** The yaml calls the two-reservoir figure non-authoritative, and N7 is the best-executed element in the complex (full clay liner, 0/9 leakage). Cutting a partition into a verified-watertight liner is how the Cavern A bleed happened |
| **C** | RR-B3 built 36×30 vs 44×30 spec | **Accept as-built, amend the plan.** Widening risks cavern clearances and re-opens finished interior work for 8 blocks nobody perceives |
| **D** | Buffer void over Cavern A rotunda | **Determine, then act.** Visual / fresh-seed comparison first. Natural → doc annotation only. Artificial → backfill + SP-03 defect entry. Either way the build log's "(0,41,0) intact at every stage" is false and gets corrected |
| **E** | Blast doors not found at N1/N2 | **Verify before building.** Probe set was sparse; leaves may exist off-axis or stand open |
| **H** | N5/N6 never chunk-loaded | **Force-load the 4 chunks and verify.** Nothing about these is to be assumed in either direction |
| **I** | Shaft landings (0 of 11 found) | **Perimeter ring + open 3×3 centre drop with ladder** (R3 as drafted). Probe-friendly and preserves the bored-shaft read |
| **J** | Z-ROCK greenstone finish | **Authorized now** — *deviates from the audit's recommendation to defer.* Rationale accepted: the caverns are structurally verified at ~95–100%, and the outstanding structural work (N9 on the surface, landings inside RR-Z5) does not touch cavern surfaces, so the re-finishing overlap is minimal. Includes Z-RESERVOIR dressing for N7 |

## MainStreet America — 8 questions

| # | Question | Decision |
|---|---|---|
| 1 | H11/H12 possible wrong-form pitched roofs | **Survey first, then restore flat decks** if pitching is confirmed. Midtown → `smooth_stone_slab` deck + parapet; Valencia → `smooth_sandstone_slab` + mud-brick parapet with viga ends. Two flat roofs are what give a 12-home street variety |
| 2 | Palette drift (B01, H01) | **Accept as-built, repoint `palettes.yaml`.** Makes every future check measure against reality instead of generating fresh false defects |
| 3 | H01 ridge at y87–88 | **Keep the tall roof.** Reads well for the flagship |
| 4 | B01 rooftop massing | **Cornice + clerestory.** Restores the planned centre-taller-than-wings silhouette. Without it B01 is a 145×76 flat slab — which is precisely what made a second roof look plausible up there |
| 5 | H09 courtyard | **Roof the U-plan legs, keep the courtyard open.** Cut the floating `red_terracotta` first, survey the walls, then build the `granite_stairs` roof over the legs only. **Annotate the courtyard as an intended void** so no future audit reports it as a hole |
| 6 | Billboard lettering | **Monogram panel + lawn letters.** Panel text at that scale is only legible head-on; lawn letters read from the approach and from the air |
| 7 | Scope appetite | **Cheap wins first, then reassess** from renders. Includes the genuine defects: missing upper glazing, the sealed-dark ground floor, the absent mezzanine railing |
| 8 | B01 entrance doors | **Dark oak double doors**, per palette. Bot pathing through the Guest Center is not a workflow anything depends on |

---

## What these answers imply, in order

1. **`town.db` edits + `config.yml` protected zones** (needs a restart) — prerequisites for safely resuming brain-driven building
2. **Ravensreach targeted fixes** — 2 low columns, 1 water source, role fit-outs, storehouse door + chests
3. **MSA cheap-wins pass** — the ~15 line items plus the four real defects
4. **MSA H11/H12 survey** — force-load required; decision already pre-made on the outcome
5. **Raven Rock verification pass** — force-load N5/N6, wider probe at N1/N2, buffer-void determination
6. **Raven Rock N9 head-house at y62 + shaft cap** — closes the only open hole to the surface
7. **Raven Rock shaft landings**
8. **Z-ROCK / Z-RESERVOIR finish pass** — largest block count in the project
9. **Doc amendments** — grove count, N7 single basin, RR-B3 dims, palettes, H09 courtyard void, build-log corrections

Items 1–3 are cheap and unblock everything. Item 8 is the long pole.

---

## Execution record — Tier 1, 2026-07-25

Ratification and execution happened in the same session. What actually landed:

**Platform**
- `town.db` — the four approved writes applied against a **stopped service** so the WAL
  checkpointed cleanly first (a live `cp` of a WAL-mode DB is not a backup). Backups at
  `data/town.db.bak-clean-*`. `pragma integrity_check` = ok. All 9 district-assigned
  buildings now fall inside Old Town's bounds; grove and mine sit outside with no
  district, which is correct.
- `config.yml` — `protectedZones` 1 → 8. Mine protected at its **apron only** (y63–70);
  the shaft interior y58–62 is left diggable, because a mine that cannot be dug is not
  a mine. Only the hall keeps `shelter: true` — several shelters would scatter the fleet
  at dusk rather than muster it.
- LLM routing switched to **Gemini primary, Anthropic fallback** (operator request, to
  use free credits). Verified serving; Anthropic spend flat at $8.7763 across the switch
  while total moved, so the delta is all Gemini. The fallback is deliberate — BACKLOG #9
  is the outage where a single-provider chain 404'd the fleet for hours.

**World (Ravensreach)** — three low columns raised to the y67 plane; storehouse
`spruce_door` + 3 hanging lanterns; Surveyor cottage bed/chest/crafting table/cartography
table; role items for the other four cottages (Mason stonecutter + smithing table,
Architect cartography + lectern, Steward barrel + composter, Scout barrel + cartography).

### Where the world contradicted the audits

Recorded because this project's failure mode is documentation outrunning evidence — and
that cuts **both ways**. Four audit findings did not survive contact:

| Audit claimed | Actually |
|---|---|
| Storehouse: "0 of 4 chests exist", 15 explicit probes failed | **All 4 exist**, evenly spaced at z=−418. Nothing was placed |
| "0 of 5 crafting tables" | **4 of 5 existed.** Only Surveyor was bare |
| H09 floating `red_terracotta` debris at y77–78 | **None in the envelope.** Already cleared |
| Water pocket at (−66,68,−352) | **Dry.** Surface is `grass_block` at y67, on-plane |

The lesson is symmetrical with the original one: an audit that samples can produce false
**negatives** as easily as a build log produces false positives. Both were fixed the same
way — read the region files instead of guessing (`scripts/block_census.mjs`).

Two genuine defects the audits **missed**, both found by reading block states:
- **Mason and Scout had half-beds** — `part=foot` with no `head`. A bed missing its head
  is non-functional and pops when used. Both completed.
- **Architect's and Steward's beds were inverted** — `head` one block *west* of `foot`
  while declaring `facing=east`. Fixed by flipping `facing` rather than moving blocks.

### MSA Q5 — RE-ASKED and resolved, because the premise was false

**H09 Casa Lana has no U-plan and never did.** Q5 originally approved "roof the U-plan
legs, keep the courtyard open". Surveying the walls first — as the audit insisted —
showed there are **no legs and no courtyard**. As built, H09 is:

- one enclosed rectangular room, 28×29 outer / **26×27 interior**, x[18,45] z[−31,−59]
- a **complete** oak-plank floor at y64 (812/812 cells solid — no void anywhere)
- **complete** wall courses y65–y70 (110-block ring each), glazing course at y67
- a **stepped** `red_terracotta` parapet: y70 ring at the outer edge, y71 ring inset 1
- **furnished and in use** — bed (20–21,65,−57), chest (43,65,−33), lantern (32,67,−57)
- **no roof at all**

The real defect was therefore not "unroofed legs" but a furnished room standing open to
the sky. Re-asked against the measured geometry; the operator chose **roof the whole
interior**, consistent with the standing rule.

**Executed:** deck laid at **y70**, `fill 19 70 −32 44 70 −58 red_terracotta replace air`
— 702 blocks, exactly the predicted 26×27.

Two decisions inside that one command are worth keeping:

- **`replace air` is the safety mechanism.** It can only add, so walls, parapet, glazing
  and furniture were untouchable by construction. Contrast trap #4, where a `replace`
  scoped by *material* deleted the southern road because the material was not inventoried.
  Scoping to `air` has no such failure mode.
- **The deck belongs at y70, not y71.** Roofing flush with the upper parapet course would
  have left the whole y70 interior as a sealed void layer under the deck — precisely the
  stacked-roof pathology just removed from B01 at a cost of 17,637 blocks. Decking at y70
  instead fills that void, supports the y71 ring (which was floating, carried only by its
  corner connections), and leaves the parapet standing 1 course proud as a parapet should.

**Verified after:** y70 110 → 812 (deck complete), y71 unchanged at 106, y72 still 0 (no
overfill), all four furniture blocks intact at their original positions.

---

## Execution record — Tier 2, 2026-07-25

**Method note that changed the economics:** trap #7 (unloaded chunks) applies to *RCON
probes*, not to region-file reads. A generated chunk is on disk whether or not it is
loaded. So `block_census.mjs` settled every INCONCLUSIVE verdict below **without
force-loading anything** — no world growth, no generation side-effects.

### MSA Q1 — H11 and H12: pitched roofs CONFIRMED, flat decks restored

Both were surveyed, both confirmed, both fixed. Renders were decisive where block
counts were ambiguous.

- **H11 The Midtown** — carried a stepped hip roof in `black_concrete`, y85–91,
  shrinking 4 blocks per course with blackstone stairs at the corners. Its design is the
  street's *only* hard-modern flat-roof palette. Usefully, **all 246 `black_concrete`
  blocks in the building were in the cap**, so the cut was provably exactly the roof:
  246 + 24 stairs removed, matching the census totals exactly. Rebuilt as designed —
  `smooth_stone_slab` deck (110) with a 2-course `light_gray_concrete` parapet (46/level).
  Verified y85=156, y86=46, y87=0.
- **H12 The Valencia** — carried a gable running along x, ridge at z=−195, rings
  shrinking 1 in z per course from y71 to y78. Removed (682 `red_terracotta` + 28
  `brick_stairs`), and rebuilt to the adobe-pueblo design: `smooth_sandstone_slab` deck
  (418), 2-course `mud_bricks` parapet (86/level), and 12 `stripped_spruce_log` **viga
  ends** projecting from the long walls. Verified y70=98, y71=504, y72=86, y73=0.

### Raven Rock OQ-H — N5/N6 resolved, and N6 is a new defect

Both portals' chunks are generated and readable; the INCONCLUSIVE verdicts are closed.

- **N5 east — CLEAN.** 390 `stone_bricks` of structure, no water.
- **N6 west — FLOODED. New defect, not previously known.** 939 water blocks in the
  portal area, **213 of them inside the throat itself**, with water continuous from y6
  to y18. This is N3's problem again — a portal standing in water. **Not touched:**
  draining is the operation that progressively emptied a natural lake here, and N3
  needed a coffer built *first* (line-before-you-hollow, §5). Needs a decision.

### Raven Rock OQ-E — blast doors are genuinely absent, and N1 is flooded too

The audit could only say "not found at probed points" because its probe set was sparse.
A full census closes it: the only iron in either vestibule is **natural ore**
(11 `deepslate_iron_ore` + 1 `iron_ore` at N1, 5 `iron_ore` at N2) and there is **zero
`iron_block`**. The doors were never built. R4 stands in full.

**Also new: N1 is flooded** — 488 water blocks in the chamber core alone (1,583 in the
wider vestibule area). Same class of defect as N6, same reason for not touching it.

### Raven Rock OQ-D — buffer void determined NATURAL; no backfill

Decision D pre-committed the branches, so the determination resolves it: **natural →
doc annotation only.** Evidence:

- the air boundary **wanders** per layer (low-side x extent moves −2, −3, −4, −5)
- air volume **grows monotonically** with height (355 → 478 from y41 to y48), the
  signature of approaching the surface; a dug void has constant cross-section
- Cavern A's cap beneath it is intact at 10/10 probes

Action per D: annotate, and correct the build log's "(0,41,0) intact at every stage",
which is false either way. **No backfill.**

> **A method that looked decisive and was not — recorded so nobody re-runs it.**
> `cave_air` vs `air` seemed like a perfect natural-vs-artificial test: worldgen carves
> `cave_air`, excavation leaves plain `air`. The void probed as plain `air`, which reads
> as a smoking gun for "we dug it". **It is not.** In 1.18+ worldgen most caves are
> *noise* caves formed during terrain shaping, which are plain `air`; only legacy
> carvers emit `cave_air`. Plain air underground is therefore completely normal natural
> terrain. Two of my own control boxes were also invalid — one spanned above-ground
> atmosphere, the other contained a build. The verdict above rests on **shape**, not on
> air type. `--include-air` was added to `block_census.mjs` during this and is still
> worth having; the *inference* is what was wrong, not the tool.

---

## Execution record — Tier 3, 2026-07-25

### OQ-I — shaft landings: they already existed; the real defect was access

**The landings were never missing.** They are solid 9×9 `iron_bars` platforms at
**15 levels** — y−11, −6, −1, 4, 9 … 59, 81 blocks each. The audit reported "0/11 iron
bars found" because it probed y28, y33, y38, y−7 and y−2, and the actual spacing puts
every landing at y ≡ 4 (mod 5). **Every one of its probes was off by one.** That is the
fourth false negative this session produced by probing a guessed coordinate.

Two further corrections: the bore is **9×9** (x[196,204] z[−19,−11]), not the planned
15×15; and there were **zero ladders anywhere in the shaft**. So the shaft was floored
solid at every fifth course with no ladder and no hatch — **not traversable in either
direction**. That, not "missing landings", was the defect.

Executed per the ratified ring-and-drop design: a 3×3 centre drop cut through all 15
landings, and a continuous ladder. **225 blocks = 15 (ladder column) + 135 (15 drops ×
9) + 75 ladders.** Verified: 75 continuous ladders, landings now 71 blocks each
(81 − 9 − 1), centre column 71 air.

The ladder runs on the **east** wall (x=204, backed by x=205). The west wall was the
obvious choice and is wrong: it has a 6-block gap at y−11…−6, which is the **S1 spur
mouth** opening into the shaft base. Filling it for ladder backing would have bricked up
the corridor from Cavern A. x=205 is solid stone 77/77 for the full height.

### OQ-A — N9 head-house built

Measured grade at the mouth is **y63–64**, not the y62 the audit reported — so "natural
grade" here effectively *is* the MSA y64 plane, satisfying both the no-earthworks intent
and skyline consistency. Built on the planned RR-Z5 footprint x[193,207] z[−22,−8]
(15×15), which gives a 3-wide apron round the bore:

- y64 apron `stone_bricks` (144), y65 `polished_blackstone` base course, y66–69
  `stone_bricks` walls (56/level), y70 roof, `iron_door`, 4 hanging lanterns
- an `iron_bars` railing round the 9×9 shaft mouth — the shaft is now enclosed and
  weatherproofed rather than an open hole to the sky

The apron fill used **`replace stone`**, which cannot fill the shaft because the bore is
air. Verified: foundation solid 144/144 at both y62 and y63 — not undermined.

### OQ-J — Z-ROCK greenstone finish applied to all three caverns + N7

**65,442 blocks.** Scheme, deterministic and per-surface (no WorldEdit random patterns,
which would need the opped-bot chat path):

| Surface | Material | Reading |
|---|---|---|
| Floor | `deepslate` (replace `andesite`) | dark base underfoot |
| Lower walls | `mossy_cobblestone` | damp green at the base — carries the "green" |
| Upper walls | `tuff` | grey-green metabasalt body |
| Cap | `deepslate` (replace `stone`) | dark ceiling, reads as depth |

Cavern A 38,934 · Cavern B 17,192 · Cavern C 9,316. N7 dressed to the Z-RESERVOIR
palette: 1,097 `clay` → `prismarine_bricks`, solid-for-solid so there is never an
intermediate gap. Water verified **unchanged at 1,845**.

**Material scoping did the safety work, and it was inventoried first this time.**
`replace andesite` / `replace stone` automatically spared, without any exclusion list:

- the **spring pedestals** on the cavern floors (441 `polished_andesite`, 265
  `iron_block`, 60 `stone_bricks` in Cavern A alone)
- the **N7 reservoir** — note its 369 water columns sit *inside* Cavern C's floor layer
  and read as "water in the cavern floor". That is the reservoir, not leak residue
- the **Cavern C aquifer seal**. Three of its ten fills reported *"No blocks were
  filled"* because the lower walls contain **no stone** — the 5,349-block seal is
  `deepslate`. The finish therefore declined to re-skin a watertight seal with mossy
  cobblestone, on its own, because the scope was a material rather than a volume.
  Deepslate is already in the greenstone palette, so it reads correctly regardless.

This is the inverse of trap #4. There, a material-scoped `replace` destroyed the
southern road because the material had never been inventoried. Here every surface was
censused *first*, and the same mechanism became the protection.

### Still open, deliberately not acted on

The plaza's east flooding is the known **adjacent-lake** problem: the audit is explicit
that draining is futile because it refills from outside any box, and the last person to
try progressively emptied a natural lake. It needs the dam-or-regrade decision and is
explicitly *not* a targeted fix.
