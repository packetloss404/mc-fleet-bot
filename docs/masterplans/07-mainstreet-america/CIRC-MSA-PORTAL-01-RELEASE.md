# CIRC-MSA-PORTAL-01 · MainStreet parking portal → warehouse drive hall

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CIRC-MSA-PORTAL-01` (canonical owner `mainstreet-america`)
**Source:** accepted R08AM post `data/worldsnap-r08am-post-20260822T161818Z`
(region SHA-256 `30f5c339…`), fresh live source captured at
`data/worldsnap-msa-portal-source-20260824T120000Z` and re-captured immediately
before execution at `data/worldsnap-msa-portal-exec-source-20260824T120500Z`)
**Post snapshot:** `data/worldsnap-msa-portal-post-20260824T120600Z/region`
(SHA-256 `3479e401c6a14bc779dd7874f9a13bc6875f5a23ee1f08ac322425bd6a348c7c`)
**Manifest identity:** `a77475f243b518415a33c209f1e61ac76925814441f67f8b961948de0439fdf0`

The "opulent surface vehicle portal" (start anchor) opened into a fully enclosed
lobby pocket at x=32..44, y=64..71, z=195..202. Its east face at z=203 was a
near-full-height `polished_blackstone_bricks` wall leaving only a 1-block-tall
slit (air at y=64, floor `gray_concrete` at y=63). The dry drive-down ramp and
the warehouse drive hall beyond z=204 were already built; the reverse flood
reached `(42,64,204)` — exactly 2 blocks from the pocket. The lintel slab was
the sole separator (`TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL` failed both
directions).

## Scope

- **54 exact targets** in one package (`portal-lintel-clear`): x=34..42, y=65..70,
  z=203, all `minecraft:polished_blackstone_bricks` → `minecraft:air`.
- This clears the **full portal mouth** matching the existing z=204 corridor
  interior (air y=64..70, `reinforced_deepslate` roof at y=71, jambs x=33/x=43).
- The lintel layer y=71..72 above the opening and the x=33/x=43 jamb cells are
  retained intact, so the crown stays supported and the corridor profile is
  matched.
- The y=64 slit, y=63 floor, lobby pocket, ramp, and drive hall are preserved
  untouched. No containers, doors, fluids, or gravity blocks were touched.

## Hard-safety kernel evidence

- Fresh immutable source snapshot captured at `2026-08-24T12:00:00Z`
  (SHA-256 `6162da62…`); re-captured immediately before execution at
  `2026-08-24T12:05:00Z` (SHA-256 `eb68d9ca…`), 54/54 guards pass on both.
- Forward source preflight: 54/54 PASS. Exec-source preflight: 54/54 PASS.
- Manifest QA (`qa_guarded_release_manifest.mjs`): PASS, 54 unique targets.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers (no entities in the target-halo envelopes).
- Strict-noop parser dry-runs (forward + rollback): 0 failures, 0 no-ops.
- Exact inverse: 54/54 rollback guards reverse every forward state.
- Strict-noop live execution: 54/54 changed, 0 failed, 0 no-op.
- Immutable post snapshot captured at `2026-08-24T12:06:00Z`.
- Rollback post-state preflight: 54/54 PASS against the post snapshot.
- Post-state QA: 54/54 targets are air, 108/108 retained crown cells
  (`y=71..72`) intact lintel, 210-cell halo has 0 fluid / 0 forbidden / 0
  gravity, 0 off-target drift. The two surveyed decorative `yellow_concrete`
  lane blocks at `(35/41,64,204)` are preserved as expected retained halo.

## Offline evidence

- Compiler: `scripts/compile_msa_portal_warehouse_route_closure.mjs`
- Offline QA: `data/world-review/msa-portal-warehouse-offline-20260824T120000Z/offline-qa.json`
  (PASS_MSA_PORTAL_01_OFFLINE_RELEASE_READY)
- Live evidence: `data/world-review/msa-portal-warehouse-live-20260824T120500Z/`
- Post QA: `data/world-review/msa-portal-warehouse-live-20260824T120500Z/post-release-qa.json`
- Regression: `test/build/msaPortalWarehouseRouteClosure.test.ts`

## Boundary

- **No whole-route commissioning claim.** This opens the bounded portal mouth;
  it does not commission a vehicle lane, the 5×5 vestibule, vehicle/pedestrian
  separation, or any mechanism.
- The route itself is `TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL`; the ramp and
  drive hall beyond were already built and dry.
- The `aquifer seam`, `warehouse bulkhead ownership`, `wet interfaces`, and
  unrelated MainStreet parcels were not touched.
