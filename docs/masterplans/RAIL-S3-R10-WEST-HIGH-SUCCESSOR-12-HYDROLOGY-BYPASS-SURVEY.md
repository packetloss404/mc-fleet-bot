# RAIL-S3-R10 · West High Successor-12 hydrology and bypass survey

**Status:** READ-ONLY TOPOLOGY COMPLETE — no containment or bypass operation compiled.

The water touching the blocked direct core is one closed, exact 2,525-cell
component in the accepted Successor-11 post source. Its bounds are
`x=-231..-176`, `y=46..62`, `z=-501..-442`, and its coordinate-set SHA-256 is
`220cf041351f18cd75e8acfa587a2b29f3eaf29fb821e355d910ee93be31271e`.
The traversal exhausted its queue before the 50,000-cell ceiling, so this is a
bounded component rather than an inferred water extent.

The direct envelope also has 27 core, 29 shell, and 36 halo gravel cells. All
92 downward support chains terminate on non-air, non-fluid support in the
current source. This alone is not a containment release: no exact retained
water transfer, liner ownership, or sequential rollback construction has been
derived for the 2,525-cell component, so no fluid operation is emitted.

## Disjoint dry alignment candidate

A high, offset 20×6×6 candidate is fully dry, solid, protected-state-free,
and disjoint from Successor-11 targets and halo:

| Element | Bounds | Static result |
| --- | --- | --- |
| Core | `x=-214..-195`, `y=54..59`, `z=-460..-455` | 720 cells; zero fluid, gravel, protected state, PDS, or air |
| Shell | `x=-215..-194`, `y=53..60`, `z=-461..-454` | 616 surface cells; zero blockers |
| Halo | `x=-216..-193`, `y=52..61`, `z=-462..-453` | 1,064 cells; zero blockers and zero predecessor overlap |

It is an alternate civil alignment candidate only. A future source-bound
connector/grade and interface design is still required before compilation;
this survey does not claim route continuity or passenger service.

Machine-readable topology, every gravel support chain, and candidate screen:
`data/world-review/rail-r10-west-high-successor12-current-source-20260826T082258Z/hydrology-bypass-survey.json`.
