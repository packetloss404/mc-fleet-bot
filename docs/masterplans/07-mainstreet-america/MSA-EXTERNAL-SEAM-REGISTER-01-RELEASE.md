# MSA-EXTERNAL-SEAM-REGISTER-01 · MainStreet America external seam register

**Status:** READ-ONLY SURVEY — PASS_MSA_EXTERNAL_SEAM_REGISTER_READONLY
**MP07 phase:** Phase MSA-1 — read-only condition refresh / next-task
**Snapshot:** accepted immutable `data/worldsnap-r08am-post-20260822T161818Z`
(region SHA-256 `30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`,
complete-save SHA-256 `0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699`)
**Payload SHA-256:** `6ea1500f3f748289a79070b6204e5bf7c2641c72659e0e78073c423d22cb47e9`

Read-only deliverable. No world edit, no RCON call, no live service mutation.

## What was surveyed

The MP07 next-task is a "fresh condition/obstruction survey and exact external
seam register." This package produces that register: the eight external seam
planes that bound the MainStreet America district against its mountain, road,
and rail neighbours, all read from the accepted immutable r08am post snapshot.

| seam | label | cells | fluid | gravity | container/control |
|---|---|--:|--:|--:|--:|
| mountain-west-face | C01 public mountain west edge (x=89, z=135..235) | 2121 | 0 | 3 | 0 |
| mountain-south-face | Mountain south/road edge (z=235, x=90..300) | 4431 | 56 | 137 | 0 |
| road-west-terminus | R02/R08 west road termini (x=-85, z=-220..85) | 2448 | 0 | 11 | 0 |
| road-r07-south-edge | R07 south road edge (z=-218, x=-85..222) | 1540 | 0 | 8 | 0 |
| south-arrival | P01 south arrival carriage edge (z=305, x=-135..135) | 3523 | 208 | 25 | 0 |
| rail-anchor | PR-C01 MainStreet Central rail reservation (x=-8..8, z=13..21) | 1377 | 0 | 0 | 0 |
| property-west | SITE west boundary (x=-305, z=-300..300) | 15626 | 1537 | 311 | 0 |
| property-north | SITE north boundary (z=-300, x=-300..300) | 15626 | 453 | 53 | 0 |

**Total surveyed cells:** 46,687 · **Block entities:** 0 · **Saved entities:** 2
(a transient cow at `(89.2,65.0,146.8)` in the mountain-west-face seam and a
dropped item at `(-304.3,57.7,103.9)` in the property-west seam) ·
**Containers/controls in seams:** 0.

## Key findings

- The **rail-anchor** seam (PR-C01 MainStreet Central reservation at the
  R05/R01 junction) contains **zero built rail** — the Cobalt/Amber lines
  remain a reservation only, matching the stop-register status.
- The **mountain faces** carry the expected earth/stone construction with
  small gravity and fluid hazards at the south/road edge (sand and water),
  documented for any future interface work.
- The **road termini** (R02/R08 at x=-85) and **R07 south edge** are clean
  district-to-countryside seams with no containers.
- The **property envelope** west boundary crosses a mangrove/swamp shoreline
  (1458 fluid cells) and the north boundary is mostly terrain — both are
  natural, not constructed seams.

## Boundary

This is a read-only register. It documents the district boundary planes and
their current state; it authorizes no world edit, interface change, interface
contract, or release.

## Artifacts

- Survey script: `scripts/survey_msa_external_seams.mjs`
- JSON: `data/world-review/msa-seam-register-20260825/msa-external-seam-register.json`
- Markdown: `data/world-review/msa-seam-register-20260825/msa-external-seam-register.md`
- Regression: `test/build/msaExternalSeamRegister.test.ts` (7 tests)
