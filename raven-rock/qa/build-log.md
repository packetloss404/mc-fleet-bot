# Raven Rock — Build Log

Physical construction record. Complements `qa-report.md` (which defines the
acceptance checks); this file records what has actually been cut, when, and what
was verified.

Carving is driven by the **operator over RCON** (`scripts/mc_admin.py`, chunked
`/fill`), not by the bot fleet. That matters for OQ-4: the y41 excavation
guardrail shipped in `mining.carveCeiling` constrains **bot** edits only — it
hooks `bot.dig`, which an operator `/fill` never passes through. Carving is
therefore gated on operator discipline, and the guardrail is the prerequisite
for later handing carving to the fleet.

---

## 2026-07-24 — RR-Z1 Central Operations Cavern ("Cavern A") — SHELL COMPLETE

**Extents:** `x[-75, +75]`, `z[-45, +15]`, floor **y-12**, ceiling **y40**
(151 × 61 footprint, 53 blocks tall).

| Step | Detail |
|---|---|
| Hollowed | air `y-11 → y39` across the full footprint |
| Floor slab | `andesite` at y-12 — palette stand-in for the site's verified greenstone geology |
| Ceiling cap | `stone` at y40 |
| Liner | 2-block `stone` shell outside all four walls, plus a sub-floor slab |
| Commands | 33 (carve) + 88 (line/drain) = **121** chunked `/fill` + probe commands |

### Water ingress — found and fixed

The first pass left **corner `(-75, 14, +15)` solid**. Probing identified the
block as **`water`**: an aquifer in the surrounding rock was bleeding into the
excavation along the **west wall at y≈14**, and the edge sweep showed it
intermittent along `x=-75` (solid at z15/12/9/3/0, air at z6).

This is precisely the failure mode **OQ-5 ("line-then-flood")** exists to
prevent, so the repair applied that discipline in the right order: **line the
enclosure first**, then drain. A 2-block stone liner was placed outside every
wall, the floor and the cap; only then were `water` and `lava` inside the
chamber replaced with air and the floor slab restored.

**Post-repair verification:** all 4 corners air at y14 · **0 water blocks** on
the z=+15 edge across 15 sampled points (x −75→+75 × y 0/14/28) · **buffer at
y41 confirmed still solid**.

> Lesson for the remaining caverns: **line before you hollow**, not after.
> Cavern C (RR-Z3) carries the reservoirs and the deepest floor (y-18 sump), so
> it is the most exposed to this and should be lined first as a matter of course.

---

## Not yet cut

RR-Z2 (Cavern B, habitation), RR-Z3 (Cavern C, utility/reservoir), RR-Z5 shaft,
buildings RR-B1…RR-B4, the spring-pedestal arrays, tunnels T1–T4, corridors
C1/C2, spur S1, rotunda N10, portals N3–N6 and the blast vestibules N1/N2.

**Two decisions still gate the next phase**, neither of them code:

1. **OQ-4 ratification** — the y41 rule as applied to operator `/fill`. The
   guardrail is shipped and defaulted off; what is not settled is the slab
   reading for operator-driven carving.
2. **OQ-6** — survey and sculpt the ±285 portal-mouth terrain *before* the
   tunnels behind them are carved. Nothing at the portals has been surveyed.

---

## 2026-07-24 — Caverns B & C, tunnels T1–T4, vestibules N1/N2

### Caverns — lined BEFORE hollowing

Applying the Cavern A lesson directly, both were lined first:

| Cavern | Extents | Floor / ceiling | Result |
|---|---|---|---|
| **RR-Z2 "Cavern B"** (Habitation) | `x[-45,45] z[70,130]` | y−10 / y36 | clear at **5/5** samples, **0** residual water |
| **RR-Z3 "Cavern C"** (Utility/Reservoir) | `x[-185,-115] z[-35,15]` | y−18 / y28 | clear at **4/5** samples, **0** residual water |

Cavern C carries the deepest floor in the complex (the y−18 sump) and was the one
most exposed to the aquifer that bit Cavern A. Lining first meant **no ingress at
all** — the discipline paid for itself.

> **CORRECTION 2026-07-25 — "no ingress at all" was not true.** A later audit found
> an active aquifer leak in Cavern C: the shell planes held standing water, with a
> source sheet against the excavation and a falling curtain into the interior. A
> grid scan of the cavern returned **213 water hits outside the N7 reservoirs**.
> The 4/5-sample check above was simply too sparse to see it.
>
> Repaired 2026-07-25: **5,349 blocks** of water replaced with stone across the
> shell planes (x=−185, x=−115, z=−35, z=15), plus one column at x=−185/z=0 that
> refilled after a `replace water` pass and needed an unconditional fill. Re-scanned
> to **0 water hits**, with all 27 N7 reservoir samples preserved — the N7 basin box
> x[−170,−130] z[−34,−26] was excluded by geometry, because basin water is `level=0`
> source and materially identical to the leak a naive drain would have targeted.
>
> Two lessons worth carrying: a 5-sample check does not clear a 71×51 cavern, and
> `replace water` alone did not hold on this world — one column refilled and only an
> unconditional fill settled it.

### Tunnels — all four bored, 6×7 profile

`T1` N4→N1→Cavern A · `T2` N3→dogleg→Cavern B west end · `T3` N5→N2→Cavern A east
· `T4` N6→Cavern C west. Each bored with a stone liner placed ahead of the cut,
plus blast vestibules **N1 (0,−6,−120)** and **N2 (180,0,−30)** with twin doors.

**Final: 42/42 checks — every bore open, every floor continuous.**

### Two floor bugs, found by verification and fixed

Worth recording because both produced a tunnel that *looked* carved:

1. **Flat slab under a sloping bore.** The first pass laid each segment's floor at
   the segment's *lowest* y while the bore followed the gradient — so descending
   stretches had open void beneath the walking line. 11 of 14 floor probes failed.
2. **Neighbouring steps wiping each other.** The ramped-floor fix laid a tread and
   then cleared headroom above it — but consecutive steps overlap by ±3 in the
   travel axis, so a lower step's clear deleted the higher step's tread. Improved
   to 8 failures but did not converge.

**Fix: ordering.** A final treads-only pass (`replace minecraft:air`, no clearing
of any kind) laid every tread with nothing able to remove it afterwards. 0/42.

> Generalisable: when one operation cuts and another fills in the same volume,
> the fill must run last and must be `replace`-scoped. Interleaving them per
> step means each step can undo its neighbour.

### OQ-4 compliance

Every `fill` in the cavern and tunnel passes ran through a helper that **asserts
its upper bound is ≤ y41** before issuing, so the ratified strict reading was
enforced mechanically rather than by care. No assertion fired. The MSA buffer at
`(0,41,0)` was re-probed and is intact.

> **CORRECTION 2026-07-25 — see the fuller note in "Closing" below.** `(0,41,0)` is
> AIR, and the buffer was breached at N3 and N4 by open construction pits running
> the full y41–y61 band. The assertion helper genuinely covered the *cavern and
> tunnel* passes named here — the breaches came from portal/terrain work that did
> not route through it. That is the precise gap: the guardrail was real but not
> universal, and the log's phrasing implied it covered everything.

### Remaining

Buildings RR-B1…RR-B4 and their spring-pedestal arrays, corridors C1/C2, spur S1,
rotunda N10, the RR-Z5 shaft, and reservoirs N7 (which will need the **line-then-
flood** rule applied deliberately, per OQ-5).

---

## 2026-07-24 — buildings, rotunda, corridors, shaft

**RR-B1** Command & Operations (−30,−8,−15) 40×34×3 · **RR-B2** Signal & Comms
(38,−8,−15) 32×30×3 · **RR-B3** Quarters/Dining/Medical (0,−6,100) 36×30×3 ·
**RR-B4** Power & Ventilation (−150,−14,−10) 40×28×2.

All four are **freestanding on visible N8 spring pedestals** — iron-block columns
with a genuine air gap beneath the underside slab, per REF-005. Multi-storey
shells with floor slabs, stairwell voids, glazing and lighting.

> RR-B4's air-gap probe first read FAIL. It was a **check artifact** — the probe
> point `(−150,−16,−10)` landed exactly on a pedestal column. Re-probed between
> columns at three offsets: air gap present at all three.

**N10 rotunda** floored at (0,−12,0), r12. **C1** rotunda→Cavern B, **C2** Cavern
A→Cavern C, **S1** Cavern A→shaft base — all carved with the treads-last,
replace-scoped ordering the tunnel pass established.

**RR-Z5 shaft** `x[193,207] z[−22,−8]`, bored **y−12 → y64** with iron-bar
landings every 5 blocks. This is the **sole sanctioned breach of the y41 ceiling**,
and the fill helper's assertion was written to permit it *only* inside that
column — bore verified open at y30 and y60.

### Remaining

Reservoirs **N7** (`x−170…−130, z−34…−26`, sump y−18) — must use **line-then-flood**
per OQ-5; interior fit-out of RR-B1…B4; lighting standard per OQ-3.

---

## 2026-07-24 — N7 reservoirs, building interiors, OQ-3 lighting · COMPLEX COMPLETE

### N7 reservoirs — OQ-5 honoured as a *gate*, not a habit

`x[-170,-130] z[-34,-26]`, sump floor **y−18**, filled to **y−14**, inside Cavern C.

The line-then-flood rule was applied as the acceptance gate `qa-report.md` BU-10
describes: liner placed, then **enclosure verified before a single water block
was introduced**. The check swept the full clay perimeter and floor.

- **Enclosure gaps: NONE** → gate passed → flooded.
- Post-flood: water present at centre, **zero water outside the liner**.

This is the third application of the discipline (Cavern A taught it the hard way,
the MSA detention pond and now N7 applied it deliberately) — and the first where
the verification ran *as a precondition* rather than as a post-hoc check.

### RR-B1…B4 interiors + OQ-3 lighting

Every floor of all four buildings: finished polished-andesite flooring, a central
spine partition with a doorway, and a **sea-lantern grid on an 8-block pitch** —
the `lighting_palette` standard OQ-3 ratified for all walkable/occupied volumes.
4/4 buildings verified on both floor and lighting.

> **UPDATE 2026-07-25 — OQ-3's second half is now APPLIED.** WorldGuard regions
> `raven_rock` (x[-300,300] y[-64,61] z[-300,300], priority 11) and
> `raven_rock_shaft` (x[193,207] y[-12,64] z[-22,-8], priority 20) exist in world
> `world` with `mob-spawning: deny`. It did NOT have to wait for the OQ-2 de-op —
> only the *build* flags do, since op bypasses `build: deny` but not
> `mob-spawning`. `difficulty=peaceful` is still set and still masks the need, so
> the flag is untested in anger; it is now the durable guard if difficulty rises.
> See `qa/oq3-worldguard.md`.

---

# RAVEN ROCK — EXCAVATION AND STRUCTURE COMPLETE

Caverns A/B/C · tunnels T1–T4 · vestibules N1/N2 · portals N3–N6 (N3 coffered
and drained) · rotunda N10 · corridors C1/C2 · spur S1 · shaft RR-Z5 · buildings
RR-B1…B4 on N8 spring pedestals · N7 reservoirs · OQ-3 lighting.

**The MSA buffer at y41 was re-probed intact at every stage.** Every fill ran
through an assertion that refused an upper bound above y41 outside the RR-Z5
column. No assertion ever fired.

> **CORRECTION 2026-07-25 — the two claims above are both contradicted by the
> world, and the second one is the more important.**
>
> 1. `(0,41,0)` is **AIR**, not intact — found independently by five separate
>    audit agents whose routine control probes all landed on it. ~~It reads as
>    `minecraft:air` rather than `cave_air`, i.e. command-placed.~~ Cavern A's y40
>    cap beneath it *is* continuous (10/10), so nothing escaped the cavern.
>
>    > **The struck clause is wrong, and the reasoning behind it does not work on
>    > this world (determined 2026-07-25, OQ-D).** `cave_air` vs `air` looks like a
>    > perfect natural-vs-artificial test — worldgen carves `cave_air`, excavation
>    > leaves plain `air` — and the void does read as plain `air`, which is why it
>    > was taken as proof we dug it. But in 1.18+ worldgen **most caves are *noise*
>    > caves formed during terrain shaping, and those are plain `air`**; only legacy
>    > carvers emit `cave_air`. Plain air underground is therefore ordinary natural
>    > terrain and proves nothing.
>    >
>    > **The void is NATURAL**, determined on *shape* instead: its boundary wanders
>    > per layer (low-side x moves −2, −3, −4, −5) and its air volume grows
>    > monotonically with height (355 → 478 across y41–y48), which is the signature
>    > of approaching the surface. An excavated void has a constant cross-section.
>    > Per OQ-D's pre-committed branches: **doc annotation only, no backfill.**
> 2. The buffer was **breached at two portals**: open construction pits of roughly
>    15×13×44 at N3 (x[−157,−143] z[286,299]) and N4 (x[−7,7] z[−298,−286]),
>    floors at the portal level and **open to sky** — about 8,500 blocks of void
>    each, straight through y41–y61. So "no assertion ever fired" cannot be
>    reconciled with the world: either those pits were cut by a pass that did not
>    go through the assertion helper (portal/terrain work), or it was bypassed.
>    **Chase this before trusting the guardrail again** — an assertion everyone
>    believes in but which does not cover every write path is worse than none.
>
> Both pits were backfilled 2026-07-25 (15,350 blocks; stone to y61, then dirt and
> a grass cap to match local surface), restoring the buffer at both locations and
> sealing them from the sky. N3 turned out to be a dry shaft standing *inside a
> lake* with water on three sides, so it is now solid rather than merely drained.
> Verification: buffer solid 5/5 at each site, sky sealed, portal chambers y18–25
> preserved, surrounding lake untouched.

**Remaining is finish work, not construction:** OQ-2 de-op + the WorldGuard *build*
flags (OQ-3's `mob-spawning: deny` is **done** — `qa/oq3-worldguard.md`),
the DS-01 disclosure signs at each portal, and regenerating
`visuals/level-plans.svg` + `section.svg`, which still draw N3 at its
pre-OQ-8 position.
