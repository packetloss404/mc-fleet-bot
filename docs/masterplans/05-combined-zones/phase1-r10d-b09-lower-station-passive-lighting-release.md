# Combined Zones CZ-R10D: B09 lower-station passive lighting

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED  
**Release node:** `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`  
**Manifest identity:** `07b41c9651562cc01e5ae6d072dca626ddff443d6ba24fbf247120e2bccfb601`  
**Compile source:** accepted R10C post, complete-save SHA-256
`e2ff106a2fc19ae8a175dc31e646eb4cd8e85ff8c5262e98ce0faecbde81b2d7`
**Live execution source:** `data/worldsnap-combined-zones-r10d-source-20260821T235524Z`,
complete-save SHA-256
`8f6370953a12bf66dcb2b2fb3bc92eb90b7fbf384d60491d053d532dcd77f204`  
**Immutable post:** `data/worldsnap-combined-zones-r10d-post-20260821T235524Z`,
complete-save SHA-256
`f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb`

CZ-R10D is a bounded static B09 transport fit-out. It replaces the exact
polished-diorite ceiling cells `(2052,132,-748)` and `(2055,132,-748)` with
full-cube sea lanterns. They are FM-01 centerline indices 4 and 7, inset along
the accepted six-index lower-station route. Every station index 3 through 8 is
at most one index from a fixture.

This is a passive visual fixture cadence only. It is not a photometric,
emergency-lighting, power, or operational commissioning claim.

## Exact geometry and preservation

The two-cell target has coordinate-set SHA-256
`07a255938e33df38d4a3b8381e0aacc5b024a26f8fc38019452ec6f75cd93d73`.
Both cells are exact R07D polished-diorite ceiling fabric inside the accepted
84-cell lower-station shell. Their only prior-release intersection is this
reviewed R07D-to-R10 fit-out migration; all other prior target intersections
are zero.

The complete 12-cell rail/headroom void stays air. The 12-cell B08-facing west
cap stays polished diorite. The two-cell R07F guideway seam stays air and its
ten-cell collar stays polished diorite. Sea lanterns are full-cube,
non-gravity, non-block-entity replacements, so enclosure and route clearance
remain unchanged.

The compiler binds the accepted R10C B09 state-set identity
`8516c1ffb69c6f9ca7eed5aa46e99491042501352289392129e1f8260ff44a79`
across all 7,800 accommodation cells, R10C QA payload
`0c3e390a7b1b4a2e9907c50f2a527b6fc2e74eceeaf007d9bfe4a595fe6704cd`,
and completed R10C release identity
`e3ac73231d641952e4c4bae22f5f54173626b15ee26dfbf2841bf9e776c3eb14`.

## Frozen guarded package

- Compiler:
  `scripts/compile_combined_zones_r10d_b09_lower_station_passive_lighting.mjs`,
  file SHA-256
  `6fbf58d1d0ffad52c71e199245aa69196711945600424e0fba339e9933e52e2b`.
- Manifest:
  `data/buildops/combined-zones-r10d-b09-lower-station-passive-lighting.release-manifest.json`,
  file SHA-256
  `73ff36b566b00ec263e9f6080bca16b235fbde7dcc685b6eb21bc2c3c145c86e`.
- Forward operation:
  `data/buildops/combined-zones-r10d-b09-lower-station-passive-lighting.b09-lower-station-passive-ceiling-lights.forward.txt`,
  two exact one-cell guards, operation-body SHA-256
  `a15e923fff0317c0e74cf44054be15fffe57c0760bcd74c0fccd2a307e1d3bf9`,
  file SHA-256
  `1c967adef315ce180a252f71df8690db1e99533a3db55e7e1ee9d89341723a1c`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r10d-b09-lower-station-passive-lighting.b09-lower-station-passive-ceiling-lights.rollback.txt`,
  operation-body SHA-256
  `964e9f1740cfb7ab1af27eab86e87838cd3311d28b3e9cee9081cc84e4ececb5`,
  file SHA-256
  `38333dcb0aea6edfb0bdb4d7b5f8c440e0d87f5be1201300bc080e1fc6680823`.
- Focused regression:
  `test/build/combinedZonesR10DB09LowerStationPassiveLighting.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r10d-b09-lower-station-passive-lighting-offline-20260821T235500Z/`.

- Independent manifest QA: **PASS**, one package and two unique targets.
- Exact R10C forward source preflight: **2/2 PASS**.
- Projected exact rollback preflight: **2/2 PASS** using only the hash-bound
  forward operation as its logical source overlay.
- Strict-noop forward and rollback parser dry-runs: **PASS**, two groups each
  and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, zero blocking block entities.
- The complete 14-cell face halo contains four air and ten polished-diorite
  cells. Fluid, gravity, active-mechanism, block-entity, saved-entity, and
  protected-relic counts are all zero.
- The real scoped wrapper `--print-plan` path accepts `mvpScope: true`, the R10
  release node, and the complete ten-stage prepare-only plan.
- Deterministic focused regression: **8/8 PASS**.

## Live execution and independent post-QA

The journaled wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its evidence ledger is
`data/world-review/combined-zones-r10d-live-20260821T235524Z/evidence-ledger.json`,
file SHA-256
`4371d975528be948049d4ca31fec234e58029e92f33e72179a4d1b439863addb`,
and completed release identity
`f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7`.

Independent read-only post-QA returns
`PASS_EXACT_LOWER_STATION_FIXTURES_ROUTE_CAP_AND_SEAM_PRESERVED_REVERSIBLE`
with payload SHA-256
`e6e78f778774bb1bb6b0df6bf1bd594bc39fc50f9cddb1304e118f81f94eff03`.
It proves:

- both exact polished-diorite-to-sea-lantern transitions;
- all 12 lower-station route/headroom cells remain air;
- the 84-cell shell remains exactly 80 polished-diorite cells, two full-cube
  fixtures, and the accepted two-cell R07F guideway seam;
- the 12-cell B08-facing cap and ten-cell guideway-seam collar remain polished
  diorite;
- the 14-cell fixture halo has exactly two declared differences and no
  undeclared change;
- all 7,798 non-target cells in the 7,800-cell B09 accommodation are preserved;
- all 17 wrapper stages and 17 evidence bindings pass, the ten-entry execution
  journal ends complete and cleaned, and exact rollback preflight passes 2/2.

The deterministic post-QA verifier and regression are
`scripts/qa_combined_zones_r10d_b09_lower_station_passive_lighting_post_release.mjs`
and
`test/build/qaCombinedZonesR10DB09LowerStationPassiveLightingPostRelease.test.ts`.
The sealed JSON and Markdown reports are beside the ledger as
`r10d-post-release-qa.json` and `r10d-post-release-qa.md`.

## Active-transport boundary

Rail, drive, braking, vehicle, platform barriers, controls, power, drainage,
and commissioning are not compiled here. The frozen B09 technical record still
has null exact cell sets for those mechanisms. The next actionable transport
evidence task remains a deterministic rail/drive/brake failure-state design
that assigns exact cells and complete block states, proves neighbor-update
behavior, keeps both stations fail-closed during partial deployment, and
defines exact rollback and commissioning acceptance. That local gap does not
block this static passive-fixture package.

R10D is accepted only as the exact two-fixture passive visual fit-out. The B08
external interface remains fail-closed, the guideway seam remains unchanged,
and this acceptance does not claim photometric or emergency-lighting
compliance, a powered system, funicular operation, or pedestrian-route
commissioning.
