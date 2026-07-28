# Town Expansion cross-scope point-in-time audit

**Decision:** `FAIL_UNREVIEWED_CROSS_SCOPE_OVERRIDES`  
**Audit report time:** 2026-07-28T05:20:20.691Z  
**World snapshot SHA-256:** `e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a`  
**Machine audit:** [`redevelopment-cross-scope-point-in-time-audit.json`](redevelopment-cross-scope-point-in-time-audit.json)

This is a deliberately stale, point-in-time failed audit. The compiler changed
after the audit run, and its exact SHA-256 at run time was not captured. The
machine file records the later observed compiler SHA-256 and the two narrow
in-memory bypasses used to expose downstream defects. It must be regenerated
from the final compiler before release.

The bypass report contained 125 cross-scope override pairs affecting 46,537
cells:

| Classification | Pairs | Cells | Meaning |
|---|---:|---:|---|
| Confirmed design collision | 4 | 4,859 | A road or generic campus scope overwrote an occupied hall, lodge, or power-yard program |
| Unreviewed release blocker | 32 | 12,484 | No binding allowlist or invariant proves the overlap is deliberate |
| Intentional component-interface candidate | 88 | 29,113 | A parent/child or attachment relationship is apparent, but exact roles and cell counts still need a reviewed allowlist |
| Stale report, corrected in source | 1 | 81 | The pavilion south walk was shifted to x=22 after this run; regeneration must prove zero theater overlap |

The four confirmed collisions were:

- `TE-IA-STAFF-LODGE -> TE-IA-MEGACAMPUS`: 1,407 cells;
- `TE-IA-POWER-CAMPUS -> TE-IA-MEGACAMPUS`: 1,339 cells;
- `TE-IA-DATA-DM12 -> TE-IA-CONCORD-ROAD`: 1,318 cells; and
- `TE-IA-DATA-DM11 -> TE-IA-CONCORD-ROAD`: 795 cells.

No candidate is approved merely because it resembles a parent/child
connection. Final generation must fail on every cross-scope override not
covered by a binding pair, allowed roles, exact bounds, and exact expected cell
count. A changed count or role is a new defect, not an automatic allowance.

