# Combined Zones CZ-R07A: B03 portal tube — EXECUTED

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST-RELEASE QA ACCEPTED  
**Manifest identity:** `ee64005564179da374f4dd2847927363d7b875fcb5a2d4db6421fd1ba87391e8`  
**Execution ledger SHA-256:** `496d511476361af1c981821e8b3e5329c66462e30b5604f5c3bc9da4e20bccb1`  
**Execution source complete save:** `4e35e31cc2be3ff85c19f30b16a8ddaf9465aa7e22dbb48025f137ab07b1c115`  
**Post complete save:** `398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0`

This is the first visible architecture package after the accepted R01–R06
work. It completes the exposed middle of the already-bored P1-B03 Cheyenne
J-curve as a one-block polished-diorite portal tube, then opens the two exact
five-wide mountain plugs. It does not add rail, lighting, utilities, or active
mechanisms.

## Physical result

- The frozen R03 surface route is an exact 8,532-cell, one-component void
  following 425 consecutive B03 centerline points (indices 188–612).
- The tube design is the exact 7,682-cell B03 face shell touching that void.
  Every one of its 7,698 external faces resolves to this shell.
- 7,632 shell cells receive `minecraft:polished_diorite`: 7,631 are exact
  `minecraft:air` sources and one is exact `minecraft:snow[layers=1]`.
- Forty shell cells are already polished diorite and ten mountain-seam cells
  are already enclosing stone, so they are preserved without no-op commands.
- The opening package clears 50 exact R05 polished-diorite portal-plug cells
  and three exact one-layer snow cells to `minecraft:air`.
- Forward order is shell then openings. Rollback order is openings then shell,
  so the route is never intentionally left open without its enclosure.

## Exact artifacts

- Compiler: `scripts/compile_combined_zones_r07_b03_portal_tube.mjs`
- Manifest: `data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json`
- Shell forward/rollback:
  `data/buildops/combined-zones-r07-b03-portal-tube.b03-tube-shell.forward.txt`
  and
  `data/buildops/combined-zones-r07-b03-portal-tube.b03-tube-shell.rollback.txt`
- Openings forward/rollback:
  `data/buildops/combined-zones-r07-b03-portal-tube.b03-portal-openings.forward.txt`
  and
  `data/buildops/combined-zones-r07-b03-portal-tube.b03-portal-openings.rollback.txt`
- Executed evidence ledger:
  `data/world-review/combined-zones-r07a-live-20260821T154500Z/evidence-ledger.json`
- Read-only post-release verifier:
  `scripts/qa_combined_zones_r07_b03_portal_tube_post_release.mjs`
- Sealed post-release QA:
  `data/world-review/combined-zones-r07a-live-20260821T154500Z/r07a-post-release-qa.json`

The two packages contain 7,685 unique one-cell targets and are exact inverses.
The only earlier-release intersection is the declared 50-cell R05 finish
class that forms the two intended portal plugs. No shell operation intersects
an earlier package.

## Hard-safety evidence

- Independent schema-1 guarded-manifest QA: **PASS**, 2/2 packages, 7,685
  unique targets, zero cross-package intersections.
- Fresh-source preflight: **7,632/7,632 PASS** for the shell and **53/53
  PASS** for the openings.
- Strict-noop parser dry-runs: forward and rollback **PASS** for both packages,
  with zero WorldEdit leftovers.
- Current complete-save census: zero fluids, gravity blocks, forbidden
  containers, target block entities, protected relic intersections, saved
  entity halo intersections, and undeclared prior-release intersections.
- Live strict-noop execution: **7,632/7,632** shell groups and **53/53**
  opening groups succeeded, with zero failures and zero no-ops.
- Post save: region identity
  `da788c954d9ee09ec180987c7d9a9ccd89603c6b1bfcd70ced4c608d0bb4e7b9`.
- Read-only physical QA: **8,532/8,532** route cells are exact
  `minecraft:air`; the single face-connected route component contains all
  8,532 cells; the enclosure is exactly **7,672 polished-diorite + 10
  source-bound stone tie-in cells**, with zero mismatches.
- Rollback post-state preflight: **53/53 + 7,632/7,632 PASS** against the
  post snapshot.
- Post-release QA payload identity:
  `2c60b5db4aef7d3fc52f3b5d8b338d4a45dec0e22f5445b40b9f5582275de482`.
- Focused regression:
  `npx vitest run test/build/combinedZonesR07B03PortalTube.test.ts` — **6/6
  PASS**.
- Post-release regression:
  `npx vitest run test/build/qaCombinedZonesR07B03PortalTubePostRelease.test.ts`
  — **4/4 PASS**.

The scope is built and accepted. Rail, lighting, utilities, and active
mechanisms remain separate fit-out work; they are not defects in this bounded
portal-tube framework release.
