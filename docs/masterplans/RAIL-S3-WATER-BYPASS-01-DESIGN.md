# RAIL-S3-WATER-BYPASS-01 · retained-water bypass design

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE

The next Cobalt running-tube block has a four-cell water column at
`(-180, 13..16, -454)` inside the south running envelope. The proposed civil
package does not drain the water body or open the service gallery:

1. Complete a temporary cage around the original column and the permanent
   lining around a new inter-tube bypass below the existing gallery floor.
2. Fill the already sealed bypass at `(-180, 13..16, -457)` from the exact
   current source states.
3. Clear the original four future-tube cells.
4. Restore only the temporary cage cells; retain the bypass enclosure and
   south tube-side liner.

The compiler admits one specifically surveyed fluid-facing liner cell only.
It fails closed if that source state, any water state, containment cap, block
entity exclusion, or service-gallery interface drifts. Forward order and
reverse rollback order are explicit and journaled; a failed package sequence
compensates every touched package in reverse order.

Fresh source intake (`79d073…`) passed before execution. The three ordered
packages then changed **25 + 8 + 6 cells** under strict guarded RCON, with a
same-moment zero-entity gate and an automatic reverse-order compensation path.
The fresh post intake (`f6a713…`) and independent post QA pass: 4/4 original
tube cells are air, 4/4 bypass cells retain water, the 22-cell permanent shell
is intact, and the 120-cell gallery-floor interface is intact. Sequential
rollback post-state preflights pass **6/6**, **8/8**, and **25/25**.

Evidence: `data/world-review/rail-water-bypass1-live-20260826T034700Z/`.
This is civil containment and clearance only, not rail, route, or
passenger-service commissioning.
