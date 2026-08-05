# Ravensgate — Retroactive Area Masterplan

**Plan date:** 2026-08-05
**Plan class:** retroactive preservation and interface plan
**World:** `world`
**Authority:** documentation/planning only; no live mutation is authorized.

## 1. Executive intent

Preserve Ravensgate as a compact, complete civic-garden district; make its boundary and interfaces authoritative; and prevent neighboring pavilion, Guild Hall, library, water, or underground work from being mislabeled as a Ravensgate expansion. The forward plan emphasizes preservation, public-realm continuity, evidence freshness, and a default-deny underground policy.

## 2. Evidence authority

Current durable catalog and saved-world evidence override older design language. A neighboring Town Expansion coordinate schedule is authoritative only for its stated reservations and prohibitions: it is `PLANNING_COORDINATE_RESERVATION_NOT_A_BUILD_RELEASE` and cannot prove that any proposed pavilion, pool, monument, tunnel, or access study was built.

## 3. Area scope, bounds, and anchors

North is `-Z`; bounds are inclusive.

| Scope | Bounds / entrance | State |
|---|---|---|
| Frozen Ravensgate district | `X -148..-64`, `Z -562..-420` | Built/cataloged complete; do not expand by implication |
| Saved-world structure scan | `X -111..-65`, `Y 68..109`, `Z -562..-426` | Audited occupied structure envelope; narrower than district |
| RG-BELL Bell-Gate campanile | `X -110..-106`, `Z -432..-428`; entrance `(-108,68,-430)` | Built/cataloged complete |
| RG-LOGGIA Library loggia | `X -111..-106`, `Z -447..-433`; entrance `(-110,69,-438)` | Built/cataloged complete |
| RG-STOA South stoa | `X -105..-65`, `Z -431..-426`; entrance `(-85,69,-431)` | Built/cataloged complete |
| RG-TEMPIETTO Long Water tempietto | `X -93..-77`, `Z -562..-551`; entrance `(-85,69,-552)` | Built/cataloged complete |

The district box includes landscape and protected context beyond the four building footprints. It is not evidence of wall-to-wall construction.

### Map and visual evidence

- [Current Ravensgate overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/04-ravensgate-overview.png)
- [Surface atlas map](../../../data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/02-ravensgate.png)
- [Catalog screenshot](../../../data/exports/world-catalog-post-2026-07-27/screenshots/RG-ravensgate.png)
- [Bell-Gate campanile floorplan](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/structures/ravensgate-rg-bell.png)
- [Library loggia floorplan](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/structures/ravensgate-rg-loggia.png)
- [Long Water tempietto image](../../../data/exports/redevelopment-media-wave2-2026-07-28/buildings/ravensgate/rg-tempietto--long-water-tempietto.png)

## 4. Current state

The read-only 2026-08-05 catalog census records:

| Feature class | Count | Catalog state |
|---|---:|---|
| District | 1 | complete |
| Buildings | 4 | complete |
| Rooms | 7 | complete |
| Custom circulation | 1 | complete |
| **Total** | **13** | **all cataloged complete** |

The bound interior scan reports four structures, seven cataloged rooms, one multi-floor structure, zero ladder-dependent primary circulation, zero empty rooms, and zero under-detailed rooms. This is strong saved-world evidence for the authored structures. It does not automatically accept every surrounding landscape, route, or neighboring proposal.

## 5. Built versus proposed

### Built / current

- Bell-Gate campanile, Library loggia, South stoa, and Long Water tempietto.
- Their seven named room programs and the campanile's cataloged vertical circulation.
- The current district identity and frozen `X/Z` boundary.
- Existing Garth/public-realm material within the district is protected context; changes require exact source evidence.

### Proposed or reserved, not established as built by this plan

- Any “eastward grounds extension,” central pavilion replacement, reflecting pools, fountain, civic monument, allée, or statuary program in the Town Expansion schedule.
- The isolated library–Guild Hall tunnel and its archive/station rooms.
- `RG-ACCESS-A-STUDY`; its status is explicitly `SEALED_NOT_AUTHORIZED_NOT_BUILT`.
- Any connection into the restricted underground volume.
- Any redefinition of adjacent pavilion/Guild Hall work as a Ravensgate district expansion.

## 6. Dependencies and interfaces

| Interface | Governing rule |
|---|---|
| Ravensreach civic library | RG-LOGGIA and the library edge require exact object/interface ownership; preserve both envelopes and public circulation. |
| RG-GARTH / adjacent pavilion | Surface overlay work may improve the shared civic ensemble but must not move the frozen Ravensgate boundary. |
| Guild Hall / pavilion grounds | Treat as neighboring scopes. Use exact transition cells, route continuity, and sightline checks before release. |
| Surface water proposals | Closed enumerated basins only, with liner, leak, neighbor-fluid, and two-route evidence. None is accepted merely because it appears in a schedule. |
| Restricted underground | Default deny. The reserved exclusion is `X -148..-64`, `Y -64..35`, `Z -562..-420`; its `Y 36..43` buffer admits no civilian foundation, room, utility, route, or access penetration. |
| Library–Guild tunnel | If separately approved, it stays isolated above the restricted buffer and has only the two named endpoints; no network branches. |

## 7. Risks and holds

- **Boundary mislabeling:** adjacent development can visually merge with Ravensgate. Documentation must keep ownership and district identity separate.
- **Underground hold:** no authorized restricted-facility access is confirmed. The exclusion stays sealed.
- **Hydrology hold:** proposed surface-water features sit above sensitive underground context and require exact closed-basin proof.
- **Interface hold:** the library, loggia, Garth, pavilion, and Guild Hall edges cannot rely on broad overlap permissions.
- **Evidence-age risk:** the primary structure scan is dated 2026-07-27. Revalidate before physical work.
- **Release hold:** the coordinate schedule is planning evidence, not a release or completion record.

## 8. Phased roadmap

### Phase 0 — Freeze and re-census

Bind the district boundary and 13 current feature records to a fresh immutable snapshot. Confirm the four structures, room count, entrances, Garth edge, and current public routes without mutation.

### Phase 1 — Public-realm condition plan

Map surface grades, paving, planting, water, lighting, stairs/ramps, and route widths across the district. Classify defects separately from authored patina or landscape. Exit with exact object-level condition findings.

### Phase 2 — Neighbor interface contracts

Create exact transition-cell contracts for RG-LOGGIA/library, RG-GARTH/pavilion, and the district's approach routes. Assign one physical owner per cell; use explicit shared interface records only where necessary.

### Phase 3 — Accessibility and legibility

Prove step-free or explicitly alternate public routes between the four anchors and adjacent destinations. Verify campanile circulation, lighting, signs, rest points, and Long Water edge safety.

### Phase 4 — Underground and hydrology protection

Import/verify the restricted exclusion and vertical buffer as protected 3D evidence. Any water or tunnel proposal receives separate exact preflight and remains held until zero forbidden intersections and leak/flow criteria pass.

### Phase 5 — Acceptance and publication

Execute only separately authorized, snapshot-bound packages. Require exact rollback, saved-world QA, route/accessibility evidence, matched media, and a refreshed catalog/report. Preserve earlier evidence rather than overwriting it.

## 9. Acceptance criteria

- Frozen district bounds remain `X -148..-64`, `Z -562..-420` unless a new explicit authority changes them.
- All four structures and seven rooms retain exact catalog/source identity.
- Zero unowned or multiply owned physical interface cells.
- Zero civilian target cells in the restricted underground exclusion or `Y 36..43` buffer.
- No new underground access without a separately authorized, surveyed, double-vestibule design.
- Any surface water passes exact basin, containment, overflow, and neighbor-fluid QA.
- Public routes pass bidirectional accessibility/legibility checks.
- Human media is matched to named objects and a bound snapshot.

## 10. Evidence provenance

- `data/world-map.db`, opened read-only 2026-08-05: 13 feature records, status/classes, district/structure bounds, entrances, and scan identity.
- [`active-interior-register-2026-07-27.json`](../../../data/world-review/active-interior-register-2026-07-27.json): district and four structure records.
- [`worldwide-interior-programs-2026-07-27.json`](../../../data/world-review/worldwide-interior-programs-2026-07-27.json): seven room programs.
- [`worldwide-interior-final-census-2026-07-27.json`](../../../data/world-review/worldwide-interior-final-census-2026-07-27.json): saved-world structure census.
- [`pavilion-east-grounds-and-ravensgate-exclusion-coordinate-schedule.json`](../../redevelopment/2026-07-28-town-expansion/pavilion-east-grounds-and-ravensgate-exclusion-coordinate-schedule.json): frozen boundary, restricted exclusion, interface reservations, and explicit proposed/not-built statuses.
- [`ravensreach-physical-regression-post-2026-07-27.yaml`](../../ravensreach/audits/ravensreach-physical-regression-post-2026-07-27.yaml): exact Ravensgate Garth preservation assertions used by a neighboring repair package.

**Derived/inferred in this plan:** the saved-world occupied envelope is summarized from the scan record; the phased ordering and risk priority are planning judgments; the requirement to treat visual continuity separately from district ownership is inferred from the schedule's explicit scope correction. No proposed coordinate schedule item is promoted to built status.
