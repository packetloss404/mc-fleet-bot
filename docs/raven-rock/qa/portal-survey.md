# OQ-6 — Portal-mouth terrain survey

**Date:** 2026-07-24 · **Method:** RCON surface binary-search + material classification
(638 probes, read-only). **Status:** survey COMPLETE, sculpting NOT started — blocked, see §3.

## 1. Results

| Portal | Mouth | Surface over mouth | Cover | Terrain character |
|---|---|---|---|---|
| **N3** | (−150, 18, +285) | **y62** | 44 | **UNDERWATER** — dead flat y62 across the entire ±24 cross-profile *and* the full 30-block outward approach |
| **N4** | (0, 18, −285) | y66 | 48 | Gentle hillside, y60→y69 across the profile |
| **N5** | (+285, 18, −30) | y63 | 45 | **Best case** — mouth sits at the foot of a slope rising to y79 within 30 blocks |
| **N6** | (−290, 10, +5) | **y79** | **69** | High on a ridge that falls away sharply westward: y79 at the mouth → y62 by 12 blocks out |

## 2. ⚠️ N3 is underwater

The surface material directly over N3 classifies as **`water`**, and the surface
is dead flat at **y62** across every probe — the signature of open water, not
terrain. N3 was relocated here by **OQ-8** to get it off MSA's axial entrance;
that decision was made on *plan* clearance and had no terrain data behind it.

Sculpting a rock-face mouth here means either coffering and draining the
approach (the OQ-5 line-then-flood discipline, run in reverse), or accepting a
portal that opens into a lake bed. Neither is what OQ-6 assumed.

## 3. ⚠️ BLOCKER — OQ-4 and OQ-6 are in direct conflict

The design puts every portal floor at **y18**, described as a mouth opening "in a
rock face at the envelope edge". But the surveyed surface above those mouths runs
**y62–y79** — so at all four, y18 is **44–69 blocks underground**. There is no
natural rock face; creating one means cutting an approach down from the surface.

**That cut necessarily removes blocks between y62-ish and y41 — which OQ-4, as
ratified today, forbids.** OQ-4 binds *everything* including operator `/fill`,
and its only exemption is the RR-Z5 shaft column `x[193,207] z[-22,-8]`. The
portal approaches have no exemption.

So the two decisions cannot both be honoured as written:

- **OQ-6** requires surface sculpting at the four mouths.
- **OQ-4** forbids any edit above y41 outside the shaft column.

**Proposed resolution — extend the exemption, don't weaken the rule.** Add the
four portal-approach corridors to `mining.carveCeiling.exempt`, exactly as the
shaft column already is, and apply the same self-check discipline to operator
fills. The buffer OQ-4 exists to protect sits under **MSA** (`x,z` roughly
±130 / +200…−235); all four mouths are at the ±285/±290 envelope edge, **150+
blocks clear of it**, so exempting them protects nothing less. The rule stays
absolute where it matters and gains a second, equally explicit carve-out.

**Not applied — this needs sign-off**, because it edits a guardrail ratified
hours ago and I should not quietly widen my own constraint.
