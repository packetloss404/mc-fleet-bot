# RAIL-S3-R07 · lower-water retention design

**Status:** AS-BUILT CIVIL CONTAINMENT — R07 TUBE STILL SEPARATE

The lower R07 source-water component is bounded at 305 level-0 water cells.
The selected external chamber has 429 cells at `x=-136..-126`, `y=2..14`,
`z=-478..-476`, outside both the tube and service corridor.

Its north shell halo has five exact gravel cells. The required release order is:

1. Replace those five gravel halo cells with exact polished-deepslate support
   before adjacent shell changes.
2. Build and close the remainder of the chamber shell.
3. Transfer the 305 declared water-source cells into a deterministic 305-cell
   subset of the chamber, retaining 124 reserve cells.
4. Line the original water pocket; only a later, separately guarded tube
   compiler may create running clearance.

The corrected `retention-03` package is accepted as built after a strict,
staged release: 5 gravity-support cells, 541 non-overlapping shell cells, 305
transferred retained-water cells, and 305 original-pocket liner cells. The
source and post are immutable complete-save packages; all four post-state
rollback preflights pass (305, 305, 541, and 5 cells respectively).

Independent post QA proves all 305 original pocket cells are lined, the exact
305-cell retention set is water with no extras or omissions, all shell/support
cells match, the unowned halo has zero drift, and the R07 service-gallery
interior and R06 floor seam remain intact.

Evidence: `data/world-review/rail-r07-retention3-live-20260826T042000Z/`
(`post-intake.json`, `post-topology-qa.json`, and the four
`*.rollback-poststate-preflight.json` reports); immutable post save:
`data/worldsnap-rail-r07-retention3-post-20260826T043700Z`.

No rail, route, or passenger service is commissioned. A tube clearance is a
new, source-bound release against that accepted post-state.
