# Wave 2 Decision and Rejection Log

Program: `REDEV-2026-07-28-R2`  
Purpose: retain alternatives, defects, and failed evidence instead of silently
overwriting them.

## D-01 — Raven Rock T2b extent

### Measured condition

T2b loses route identity inside a large natural cavern. A candidate
tunnel-within-cavern section was measured at x=-145 through x=-135.

The immutable Wave 2 baseline contains an active water column at and beyond the
east end of that study:

- x=-135/-134;
- z=177..179;
- y=1..9.

### Rejected alternative

**Extend the dry liner through x=-135.**

Rejected because the terminal shell would become fluid-adjacent. A visually
larger pilot did not justify introducing a wet-threshold failure mode into a
dry, additive package.

### Selected decision

`INF-RR-02` ends at x=-136. It contains ten measured stations, 151 exact
addition-only targets, no excavation, and no target that is fluid or
face-adjacent to a fluid/gravity/waterlogged hazard. The aquifer remains
visible in the buffer census and becomes a hard pre-release stop condition if
it advances.

## D-02 — MainStreet R08 first width

### Measured condition

R06 to R07 is approximately 135 blocks without an intermediate public cross
connection. This exceeds the 100-block project target and contributes to the
user's “turn a corner and have no idea what you are looking at” experience.

### Rejected alternative

**Build R08 continuously from x=-80 through x=80 at z approximately -127..-121.**

Rejected after coordinate audit because its edge treatment entered the real
neighborhood fence at x=-80 and x=80. A road diagram that silently deletes a
perimeter is not a valid connected-grid solution.

### Revised candidate

The current candidate connects the two accepted R1 alleys through R01 and uses
six deliberately designed gate cells at the exact inner fence crossings.
Coarse registered fence bounding boxes cover entire neighborhood districts and
are retained as a database-warning overlap; they are not treated as if every
cell inside the rectangle were a fence block.

Acceptance still requires:

- zero target intersections with buildings, rooms, garages, and protected
  landscape;
- exact enumeration of the six physical gate cells;
- enumeration of every adjacent fence whose connection properties change;
- complete pre/post/rollback fence states;
- no material-only fence source guard;
- a registered gate feature and matched evidence.

## D-03 — Screenshot byte count is not image quality

### Rejected evidence

Initial automatic exact-object captures produced:

| Object | Failure |
|---|---|
| H09 / The Casa Lana | Entire frame was uniform gray; the small overlay was the only content |
| C02 / West Garden Villa | Principal object was heavily occluded by foreground leaves |
| H01 / The Alexandria | First view filled the frame with an uninformative rear/blank gable |
| RR-B1 / Command Operations Center | Anonymous dim corridor and blank walls did not establish the named building |
| T2b section camera | Near wall/floor plane occluded the lower frame; the revised attempt became fully uniform |

All were rejected even though the files existed and most exceeded the former
8,000-byte threshold.

### Selected control

`render_redevelopment_camera_manifest.mjs` now records sampled luminance and
quantized-color metrics and fails a blank/low-information image. The media
workstream must additionally review frontage, target visibility, foreground
occlusion, and whether a named underground building is represented by a
recognizable entrance, principal room, or useful sectional context.

Distinct hashes prove files differ; they do not prove the subject is visible.

## D-04 — Material-only fence guards

The new generic manifest QA was run retrospectively against the accepted R1
package set. It confirmed:

- 36,781 total target cells;
- zero cross-package target intersections;
- four packages meeting the new strict structural rule.

It also identified five Phase 1 gate cells grouped under two
`minecraft:birch_fence` source masks that did not enumerate connection and
waterlogged properties. R1 executed successfully and its exact rollback
postflight passed; this is not a claim that the accepted world is currently
wrong. It is a retrospective process finding: a material-only source mask can
accept multiple neighbor-dependent states and therefore does not meet the
stricter Wave 2 exact-state definition.

Wave 2 does not repeat that exception. Any R08 fence gate must use complete
source properties or an explicitly enumerated finite exact-state union, with
exactly one alternative allowed to match.

Evidence:

- `data/buildops/redevelopment-r1-release-manifest.json`
- `data/world-review/redevelopment-r1-release-manifest-retrospective-qa.json`
- `scripts/qa_guarded_release_manifest.mjs`

## D-05 — Release composition

The Wave 2 transaction is manifest-driven. Passing one candidate does not
grant authority to a weaker candidate.

Current integration state:

| Package | State |
|---|---|
| `INF-RR-02` T2b dry liner | Offline structural and focused QA pass; corrected camera contract pending |
| MainStreet R08 | Revised candidate engineering; exact neighbor-fence audit pending |
| C01 plan/media expansion | Offline generation and visual QA in progress |

The final manifest contains only packages that independently pass and have zero
mutual target intersections.
