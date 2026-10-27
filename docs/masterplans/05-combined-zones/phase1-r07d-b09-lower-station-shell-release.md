# Combined Zones CZ-R07D: B09 lower-station shell

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Manifest identity:** `1bd7cafaa9f37a9b63e681fd73114b836b77b54544fee586ccabfe64ed19f49a`  
**Completed release identity:** `d2e446216f55a7f6b67432c2203e3624a64606eb64b25eb2e5439d8c8d286bfe`  
**Execution source complete save:** `f2048c5d1dd2349bef2629f2f15ce995cc27cbfaa86121ff10b5ac13bd3ab2a3`  
**Post complete save:** `fdffaae24e4adb32ac32df7f14a1efef14e70922b6633562f093bbfafca4b858`

CZ-R07D is the smallest complete dry framework partition available inside the
frozen P1-B09 funicular system. It constructs only the non-B08 portion of the
lower-station envelope as a static polished-diorite shell. It preserves a
two-block-high interior air void and closes both ends, so neither the B08
transfer nor the unbuilt running guideway is opened or commissioned.

The R07 label identifies the summit-return framework program. Its source is
the later accepted R08B post save, so the package includes every accepted R07
and R08 physical release in its predecessor state.

## Current B09 inventory

The compiler reproduced the selected FM-01 route and all 7,800 cells of the
canonical minimum accommodation. In the accepted R08B post save, that exact
set contains 7,797 air cells and three polished-diorite cells. The three
material cells are the existing R07C floor edge at `x=2049`, `y=129`,
`z=-749…-747`; no other B09 accommodation cell has been changed.

- Frozen minimum accommodation: 7,800 cells,
  `e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca`.
- Lower-station envelope: 132 cells,
  `d13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b`.
- Exact B08 seam retained untouched: 36 cells, 33 air plus the three accepted
  polished-diorite floor cells,
  `b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3`.
- Exact summit interface retained untouched and disconnected: 12 air cells,
  `d1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093`.

## Exact physical design

Subtracting the 36-cell B08 seam leaves a 96-cell lower-station residual at
`x=2050…2057`, `y=129…132`, `z=-749…-747`. The package partitions it exactly:

- 84 polished-diorite shell cells,
  `e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d`;
- 12 preserved air cells at `x=2051…2056`, `y=130…131`, `z=-748`,
  `4062250031378a6fd8ee3a499df1c38cfb9af751e28876bb90c06bf00cd6eae7`.

Six disjoint guarded bands install an 18-cell floor, 18-cell roof, two 12-cell
sidewalls, and two 12-cell isolation caps. The west cap at `x=2050` provides a
physical barrier one block beyond the untouched B08 seam. The east cap at
`x=2057` leaves the remaining guideway inaccessible. The summit interface is
far outside the operation set and remains default-deny and unreachable.

This is rough framework only. It does not install or commission rail, vehicle,
drive, braking, platform barriers, power, controls, drainage, outfall, rescue,
egress, guideway continuation, or either transfer opening.

## Guarded package

- Compiler:
  `scripts/compile_combined_zones_r07d_b09_lower_station_shell.mjs`
- Manifest:
  `data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json`
- Forward:
  `data/buildops/combined-zones-r07d-b09-lower-station-shell.b09-lower-station-shell.forward.txt`
  - six guarded commands / 84 exact targets;
  - operation-body SHA-256
    `925726172be02fc4cc6ef272bf24d2e4a9b4fbb2ff78cd61fcd07b37bb154bbc`.
- Exact inverse rollback:
  `data/buildops/combined-zones-r07d-b09-lower-station-shell.b09-lower-station-shell.rollback.txt`
  - six reverse-order guarded commands / 84 exact targets;
  - operation-body SHA-256
    `ac0a72b8de8ba3a80dae7c3afc501aa1fdb348339e0232bcf65113ddbdab85fe`.
- Focused regression:
  `test/build/combinedZonesR07DB09LowerStationShell.test.ts`.
- Terminal live ledger:
  `data/world-review/combined-zones-r07d-live-20260821T164505Z/evidence-ledger.json`.
- Read-only post-release seal:
  `data/world-review/combined-zones-r07d-live-20260821T164505Z/r07d-post-release-qa.json`
  and
  `data/world-review/combined-zones-r07d-live-20260821T164505Z/r07d-post-release-qa.md`.
- Post-release regression:
  `test/build/qaCombinedZonesR07DB09LowerStationShellPostRelease.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r07d-b09-lower-station-shell-offline-20260821T163500Z/`.

- Independent guarded-manifest QA: **PASS**, one package, 84 unique targets,
  zero target intersections.
- Exact source preflight: **6/6 PASS** against the bound R08B region snapshot.
- Projected rollback with the exact forward source overlay: **6/6 PASS**.
- Strict-noop parser dry-runs: forward and rollback **PASS**, with zero
  WorldEdit leftovers.
- Block-entity audit: **PASS**, zero blocking block entities.
- Compiler scan: 84/84 targets are exact air; the preserved interior is 12/12
  air; zero fluid, gravity, forbidden container/control, saved entity,
  protected relic, prior-release target, B08 seam, summit-cap, or preserved-
  interior target intersections.
- Deterministic focused regression: **8/8 PASS**.

## Executed and sealed result

The live kernel captured a fresh complete source save, reran the exact source,
block-entity, and live-entity gates, and executed all six strict-noop groups.
All six changed successfully with zero failures, no-ops, unknown replies, or
WorldEdit leftovers. The terminal ledger has SHA-256
`2f0dc839868302458a122796782f99f056af58d62d7f1fb29d91366f4cf5a6b1`;
all 17 stages pass.

The read-only post-release verifier re-derived the full 7,800-cell B09
accommodation from the frozen FM-01 design and compared the exact source and
post Anvil saves. It proves:

- 84/84 shell cells are polished diorite;
- 12/12 preserved interior cells remain air in one connected component;
- 36/36 B08 seam states are unchanged, behind a complete 12-cell west cap;
- 12/12 summit-interface states are unchanged, with the unbuilt guideway
  inaccessible behind a complete 12-cell east cap;
- the only changes anywhere in the 7,800-cell B09 accommodation are the 84
  declared air-to-polished-diorite targets;
- the exact reverse-order rollback passes 6/6 guards against post region
  identity
  `5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d`.

All 11 post-release acceptance checks pass. QA payload identity is
`5e3b2f4859e8bcb1832c0dddda3f9baf7607d098af4c9aa87ad4afff3c83ef30`.
The post-release verifier made no live RCON or service call and performed no
world mutation.
