# RAIL-S3-R10 · West High Successor-07 offline survey

**Status:** STATIC-READY DRY CIVIL CANDIDATE — NO LIVE CAPTURE OR WORLD MUTATION

The accepted Successor-06 immutable post snapshot was read only to survey a
separate westward civil envelope. The proposed core is
`x=-114..-95, y=42..47, z=-472..-467` (720 cells; coordinate-set SHA-256
`2ef8e4a0f11b04729d245515b3012e73260d3ba1473d1d116f67db3531d0742f`). It
contains no fluid, gravel, polished-deepslate interface cell, or observed
forbidden block state.

Its open-ended shell surface in `x=-115..-94, y=41..48, z=-473..-466` has 616
cells (SHA-256 `85cf75fcf3e8f9dd17e5ccae38540dd1381140896b97e39e0ba1ea295600b14c`).
Exactly 56 are predecessor-owned polished-deepslate interface cells and must
remain unchanged; the remaining 560 dry source-backed cells are candidate
shell mutations. There are zero local PDS, fluid, and gravel shell cells.

The checked halo `x=-116..-93, y=40..49, z=-474..-465` has 1,064 cells
(SHA-256 `170b51dd1cc1e5d17546818fe79eb5daffb3826b7f2cf5cfe8f1985c40aad627`),
with no fluid or gravel. It contains 28 PDS cells, all predecessor-owned, and
100 predecessor interface cells in total; no local interface ownership was
assumed.

Before any release, compile this geometry afresh against a new complete source,
bind every source state and inverse, and pass the full guarded live kernel.
Civil-only scope: this is not rail, route, station, power, or passenger-service
commissioning.

## Static package outcome

The source-bound compiler emitted a 560-cell external-shell stage and a
720-cell core-clear stage. All four strict parsers pass; source preflights pass
shell `560/560` and core `720/720`; the block-entity/protected audit has zero
blockers. The projected sequential rollback preflights pass core `720/720`
after both forward stages and shell `560/560` after core restoration. The
independent static QA confirms 1,280 unique forward targets, exact stage
inverses, and the full `56/28/100/0/0` ownership contract.

Static evidence: `data/world-review/rail-r10-west-high-successor07-offline-20260826T074000Z/`.
