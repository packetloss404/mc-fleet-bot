# BKR-C01-DIMENSION-02 — C01 public vertical stair widening

Status: **HOLD — NO CONFLICT-FREE WIDENING SEGMENT** (read-only probe, no world mutation)

- Date: 2026-08-24
- Evidence: `data/world-review/c01-dimension-02-live-20260824T201429Z/c01-dimension-02-hold.json`
- Source snapshot: `data/worldsnap-r08am-post-20260822T161818Z/region`
- Source survey: `data/world-review/bkr-survey-00-20260824/bkr-survey-00.md`

## Task

Widen the C01 public vertical stair pinches (and owner/service verticals) to the
public standard — 2-wide x 3-high public stair (3x3 landing), 5-wide x 5-high
public common, 3-wide x 3-high owner/service.

## Finding

The three C01 verticals are **finished, decorated switchback stairwells**, not
raw-rock tunnels:

- **Public C01 (L1→L3)** — the 1-wide / 2-wide path stations (68–85) are offset
  dogleg steps inside a polished_blackstone / polished_deepslate stairwell
  bounded by structural light_blue_concrete floor slabs, cut-copper columns,
  bookshelf/tinted-glass decor, and protected polished_blackstone_stairs treads.
  The two candidate flank cells that are plain rock are isolated single cells,
  not coherent removable columns, and carving them opens into existing voids
  rather than creating a clear 2-wide passage.
- **Owner C01 (L4→owner-club)** — the 5-cell st47–51 run's flank is a
  single-level polished_deepslate wall below an open stairwell void with
  protected stair treads on the flight; st87–89 is bounded by protected
  polished_blackstone_stairs. Same decorated-stairwell structure.
- **Service C01 backbone** — the 1-wide apertures at x=870, z=-115/-113/-111 are
  **barrel-bounded**: the corridor wall at x-1 and x+1 is a functioning
  `minecraft:barrel` block-entity (69 barrels in the corridor segment). Widening
  would require removing/displacing containers.

## Blocked cells (exact)

See the hold JSON for full cell-by-cell detail. Headline blockers:

- `(869,43,-115)`, `(871,43,-115)`, `(869,43,-113)`, `(871,43,-113)`,
  `(869,43,-111)`, `(871,43,-111)` — `minecraft:barrel` containers flanking the
  service 1-wide apertures.
- `(840,42,-47)`, `(841,42,-47)`, `(840,42,-45)` — structural
  `light_blue_concrete` floor slabs flanking public st68–69.
- `(840,35,-38)`, `(840,36,-38)`, `(840,37,-38)` — `cut_copper`/`bookshelf`
  decorative column flanking public st77–78.
- `(837,31,-42)`, `(845,-3,-51)`, `(845,-2,-51)`, `(846,-3,-51)` — protected
  `polished_blackstone_stairs` treads on the flights.

## Safety reasoning

The hard-safety kernel requires conflict-free exact widening. No contiguous
segment has a flanking column of removable solid rock with clean 3-high
headroom and a halo free of fluid, containers, block entities, gravity, and
protected decor. The service pinches are container-bounded; the public/owner
pinches are structure/decor-bounded. Both are hard stops under the task's own
rule ("if the pinch is bounded by containers/lava on both sides, widening is NOT
safely possible in that segment — mark it HOLD").

## Non-claims

- No world mutation performed.
- No operation file compiled.
- No widening executed.
- This is a probe/hold assessment, not a release.

## Recommended next step

BKR-C01-DIMENSION-02 cannot be a clean bounded rock-carve. It requires a
coordinated **stairwell redesign package**: reposition the protected switchback
flights and structural floor slabs while preserving the decorative envelope,
then carve the new 2-wide x 3-high route. Run a follow-up survey with the public
stair movement policy to enumerate the exact redesign cells first.
