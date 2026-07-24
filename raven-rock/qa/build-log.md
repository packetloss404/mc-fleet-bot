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
