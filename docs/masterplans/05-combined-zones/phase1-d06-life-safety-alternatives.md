# D06/B07 fail-closed life-safety alternatives

Status: **PARTIAL PASS — OFFLINE RESERVATIONS ONLY — B07, D06, AND G02 HOLD — ZERO OPERATIONS**

This package compares exact planning geometry against the immutable Phase 0 copied snapshot and makes recommendations for sole-authority review. A recommendation is not a selection or approval. It does not claim code compliance, expert acceptance, commissioning, construction ownership, or permission to open or build anything.

## B07 public-shaft transfer

| Candidate | West shift | Excavation cells | Generated-structure excavation overlap | One-cell interaction overlap | Recommendation |
|---|---:|---:|---:|---:|---|
| B07-A-CENTERED | 0 | 7,791 | 217 | 558 | do not recommend |
| B07-B-WEST-1 | 1 | 8,036 | 0 | 279 | do not recommend |
| B07-C-WEST-2 | 2 | 8,134 | 0 | 0 | recommend for review |

The two-block west candidate is the smallest tested offset that clears the cataloged mineshaft bounding box in both its excavation set and one-cell interaction union. It preserves all three authored anchors and the 7×7 cross-section, then returns level at the lower-lobby Y. B07 remains HOLD because bounding-box clearance is not a shaft, structural, lift, egress, or commissioning approval. Recommended-for-review excavation: 8,134 cells, hash `d58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59`. Its excavation contains the same 38 water cells as the centered baseline, while its interaction union contains more water and therefore still requires explicit drainage/hydrology treatment.

## D06 protected egress and ventilation

The existing two disjoint 7×7 cores remain unchanged: west stair and east accessible-lift reservations are recommended for retention, with a static separator, roof-transition cap, and surface cap. Mirrored component layouts are recorded only as non-recommended comparisons. No lift or door mechanism is selected.

Four local 3×3 vent risers are recommended as capped planning paths because their exact sets are mutually disjoint and the immutable-snapshot audit finds no fluid, generated-structure, egress-core, or block-entity intersections. The two grouped-header alternative is not recommended because it couples two plants per header before smoke engineering.

| Local riser | Surface landing Y | Cells | Water/lava | Structure intersections | Outlet state |
|---|---:|---:|---:|---:|---|
| EE-VENT-NW | 85 | 279 | 0 | 0 | capped |
| EE-VENT-NE | 102 | 432 | 0 | 0 | capped |
| EE-VENT-SW | 65 | 99 | 0 | 0 | capped |
| EE-VENT-SE | 64 | 90 | 0 | 0 | capped |

## Fail-closed interfaces

- 192 platform gate-bay cells and 72 smoke-opening cells remain static caps; powered mechanisms are unselected.
- Eight three-cell local sump caps preserve independent drainage interfaces. The existing boundary header stub stays capped; external discharge remains null.
- EG-B is the minimum-geometry fire-service planning interface because it is adjacent to the frozen internal spine. Its spine interface and surface approach remain capped; no external fire-appliance route is claimed. EG-A remains independent escape-only planning geometry.

## Release boundary

B07, D06, and G02 remain HOLD. World edits authorized: **no**. Operation cells: **0**. Material cells: **0**. No live service or database was contacted.
