# D05 / B09 / B10 future-mountain planning alternatives

Status: **PARTIAL PASS — EXACT PLANNING ALTERNATIVES — D05 AND G02 HOLD**

This package compiles exact analytic mountain surfaces and sparse candidate-solid interval manifests against the immutable copied snapshot. It does not assign materials, owners, interfaces, hydrology or geotechnical kernels, construction cells, operations, or release authority.

## Alternatives

| Alternative | Face | Modelled columns | Candidate added-solid cells | Below-Y72 support-gap cells | B09 centerline points |
|---|---|---:|---:|---:|---:|
| FM-00-FULL-ENVELOPE-REFERENCE | none | 480,000 | 35,008,029 | 1,916,384 | — |
| FM-01-COMPACT-EAST-FACE | east | 202,501 | 14,768,553 | 754,224 | 561 |
| FM-02-COMPACT-WEST-FACE | west | 202,501 | 14,890,017 | 795,507 | 561 |

The full-envelope model is a comparison reference and does not choose a B09 face. The compact east and west models have equal authored plan dimensions and exact directional-rational surfaces. Their nonzero geometry counts are planning candidates, not material quantities or S02-emitted cells.

## B09 face comparison

| Alternative | B08 interface | Support gaps | Candidate solid | Route fluid/frozen/snow | Current max terrain step | Structure-plan columns | Current mean Y |
|---|---:|---:|---:|---:|---:|---:|---:|
| FM-01-COMPACT-EAST-FACE | 36 | 754,224 | 14,768,553 | 0 | 6 | 293 | 80.357224 |
| FM-02-COMPACT-WEST-FACE | 540 | 795,507 | 14,890,017 | 0 | 42 | 305 | 72.366629 |

Recommended for the next planning review: **FM-01-COMPACT-EAST-FACE**.

This is not an accepted selection. The comparison is deterministic and exact, but the one-cell route shell is not maintenance or evacuation clearance, and no owner/interface, material, mechanism, hydrology, or geotechnical acceptance exists.

## Protected relic voids

| Relic | Core cells | One-cell shell | Exact preserved union | Future rule |
|---|---:|---:|---:|---|
| igloo-east | 280 | 350 | 630 | PRESERVE_EXACT_IMMUTABLE_CURRENT_STATE |
| igloo-west | 280 | 350 | 630 | PRESERVE_EXACT_IMMUTABLE_CURRENT_STATE |
| shipwreck | 2268 | 1362 | 3630 | PRESERVE_EXACT_IMMUTABLE_CURRENT_STATE |

The shell is exactly one Chebyshev cell beyond the recorded core. It is the minimum planning exclusion only—not a structural, groundwater, entrance, exhibit, fall, or construction-influence buffer. D05-S01 observation routes are not promoted.

## Route and egress accommodation

- The exact B08 interaction reservation is withheld from candidate mountain fill.
- Each compact B09 alternative has a cardinal, rail-buildable centerline with level curves and an exact two-cell rail/headroom seed plus one-cell planning shell.
- Both D06 external continuations have zero cells inside Z09 and remain physically unopened and uncommissioned.
- B09 maintenance/egress, passing loop, stations, mechanisms, drainage, fire service, and owner interfaces remain HOLD.

## Readiness

| Check | Status | Result |
|---|---|---|
| D05-B09-B10-R01-EXACT-SOURCE-CHAIN | **PASS** | All permitted upstream geometry/D05/D06/connector inputs and the immutable snapshot are hash-bound. |
| D05-B09-B10-R02-DETERMINISTIC-SURFACE-AND-SPARSE-SOLID | **PASS** | 3 exact analytic surfaces and sparse interval manifests compiled. |
| D05-B09-B10-R03-PROTECTED-RELIC-VOID-ACCOMMODATION | **PASS** | 4890 exact core-plus-one-cell-shell current-state preservation cells are excluded from candidate fill. |
| D05-B09-B10-R04-B09-RAIL-BUILDABLE-CANDIDATES | **PASS** | East and west compact face candidates have exact cardinal <=1:1 centerlines and level curves. |
| D05-B09-B10-R05-B08-D06-ACCOMMODATION | **PASS** | The exact B08 interaction set is withheld from candidate fill; both D06 external continuations are disjoint from Z09. |
| D05-B09-B10-R06-CONSERVATIVE-PLANNING-RECOMMENDATION | **PASS_RECOMMENDATION_ONLY** | FM-01-COMPACT-EAST-FACE ranks first by the frozen fail-closed comparison order. |
| D05-B09-B10-R07-SUPPORT-GEOTECHNICAL-HYDROLOGY | **HOLD** | Below-Y72 support gaps, expert hydrology/geotechnical kernels, treatment classes, and acceptance thresholds remain unresolved. |
| D05-B09-B10-R08-OWNERSHIP-INTERFACES-MATERIAL-STATES | **HOLD** | No exact owner registry, directional interface contracts, accepted material palette, or complete canonical future-state registry exists. |
| D05-B09-B10-R09-B09-MAINTENANCE-EGRESS-ACCEPTANCE | **HOLD** | The one-cell route shell is planning accommodation only; maintenance, evacuation, stations, passing loop, mechanisms, and human acceptance remain absent. |
| D05-B09-B10-R10-D05-G02-CLOSURE | **HOLD** | Planning geometry cannot close B09, B10, D05, or G02 without the remaining accepted expert and authority inputs. |

D05, B09, B10, and G02 remain HOLD. Future, construction, material, and operation cell counts remain **0**, and world editing remains unauthorized.

Reproduce offline with:

```bash
node --max-old-space-size=4096 scripts/compile_combined_zones_d05_future_mountain_alternatives.mjs
```
