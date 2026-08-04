# Combined Zones Phase 1 C1 bounded-pilot coordination

Status: **COORDINATION CANDIDATE FROZEN — PHYSICAL PILOT HOLD — OFFLINE ONLY**

The machine-readable evidence is [phase1-c1-pilot-coordination.json](phase1-c1-pilot-coordination.json). This read-only audit emits zero operations and cannot authorize construction.

## Strongest bounded candidate

The best defensible straight study window is C1 Phase 0 samples `24…28`: reference centerline `x=814…878, z=80`, chainage `384…448`. All five source samples are dry and their sampled rail cut/fill is zero. The 65 integer setout points use exact interpolation between the 16-block anchors and nearest-integer rounding with ties toward the greater Y.

The plan-only cross-section is now exact for this tangent:

- 56-block reservation: `x=814…878, z=44…99` (3,640 columns);
- empty 13-block north rail strip: `z=50…62` (845 columns);
- 80-block land take including slopes: `z=32…111` (5,200 columns);
- reserved rail centerlines: `z=52` and `z=56`; track construction remains unauthorized.

This freezes a coordination envelope, not construction targets. The highway vertical profile remains null.

## Immutable-snapshot findings

All 25 touched chunks decode as `minecraft:full`. Across 5,200 land-take columns, independently selected support terrain spans `Y=92…127`. Comparing the entire cross-section with the rail datum exposes up to 17 blocks of cut and 17 blocks of fill, despite the five centerline samples reading zero. That is why the rail datum cannot become a highway profile.

The surface census finds 0 water columns and 0 lava columns. The exact surface-to-rail-datum spans contain 0 water and 0 lava cells, but the complete copied columns contain 2,671 water and 126 lava cells. No drainage or watershed model exists.

All five source samples are `minecraft:pale_garden`. The exact envelope contains 2 creaking-heart cells and 3,115 organic cells in the ground-to-datum span. There is no reviewed pale-garden preservation policy and the copied package has no entity directory.

## Gates

| Gate | Result | Basis |
|---|---|---|
| source-bindings-and-snapshot-integrity | **PASS** | All six local inputs are hash-bound and the copied Phase 0 post region identity exactly matches its declaration. |
| bounded-candidate-plan-selection | **PASS** | The candidate is a 64-chainage-block east-west tangent bounded by five consecutive dry, zero-cut/fill source samples. |
| exact-integer-reference-and-rail-setout | **PASS_COORDINATION_ONLY** | All 65 reference points and both reserved rail centerlines have deterministic integer X/Y/Z setout; this is not a target cell set. |
| exact-plan-cross-section | **PASS_COORDINATION_ONLY** | The 56-block reservation, 13-block empty rail strip, and 80-block total land take have exact plan bounds, counts, and hashes. |
| candidate-touched-chunk-coverage | **PASS** | 25 touched chunks were decoded directly from the immutable snapshot. |
| limited-fluid-observation | **PASS_LIMITED** | Surface-to-rail-datum spans contain 0 water and 0 lava cells, but the complete land-take columns contain 2671 water and 126 lava cells and no drainage model exists. |
| complete-generated-structure-clearance | **HOLD** | Touched start chunks contain 0 intersecting starts, but the candidate is outside the Phase 0 atlas used for the complete structure-start inventory; adjacent start chunks can own structures crossing this envelope. |
| surface-catalog-plan-separation | **PASS_LIMITED** | The corridor-wide catalog test reports zero surface-feature intersections; catalog separation is not ownership or loading acceptance. |
| pale-garden-and-live-entity-clearance | **HOLD** | All five source samples are pale garden and the exact envelope contains 2 creaking-heart cells; copied entity-region evidence and a preservation policy are absent. |
| block-entity-and-dungeon-clearance | **HOLD** | The copied candidate columns contain 6 block entities, including 2 mob spawners and 2 chests; no target or interaction volume exists to prove non-interference. |
| independent-highway-vertical-profile | **HOLD** | The integer rail study datum cannot be silently reused as the highway profile; cross-section cut/fill reaches the values reported by this census. |
| soil-loading-retaining-and-slope-design | **HOLD** | Block identities do not prove geotechnical capacity, settlement, retained slopes, structures, or C01 loading acceptance. |
| hydrology-and-drainage-design | **HOLD** | No runoff, watershed, infiltration, culvert, ditch, snowmelt, sump, discharge, erosion, or unintended-diversion model is frozen. |
| ownership-and-interface-contracts | **HOLD** | No exact candidate owner/interaction union or default-deny interface audit exists. |
| fresh-release-source-and-entity-identity | **HOLD** | The Phase 0 snapshot is terrain evidence only, lacks entities/POI/level identity, and is not a future execution-moment source snapshot. |
| physical-pilot-cell-set | **HOLD** | Missing civil, hydrology, protected-natural, structure, entity, ownership, source-guard, rollback, and authorization gates prohibit target-cell compilation. |

## Decision

The bounded coordinate envelope and reserved-rail setout may be frozen for offline coordination. A physical pilot cell set may **not** be frozen. R01 remains on HOLD until the independent highway profile, complete structure clearance, pale-garden and entity treatment, soil/loading/retaining design, hydrology/drainage, ownership/interfaces, fresh source snapshot, exact guarded forward/rollback package, and release authorization all pass against the same identities.
