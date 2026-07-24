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
