# Combined Zones CZ-R07I: B09 maximal curve/summit-return

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Manifest identity:** `a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8`  
**Execution source complete save:** `816df60a41641b1fd59e2aa8cf3a85c647fe8e99bcd7335949ebfa627aa684fc`  
**Post complete save:** `569e8ab80a5ea4ea2ef35ef994de75b4fbc6d18f721c47453c9dc70ebedff0a0`  
**Completed release identity:** `fc488920b7eed11c0d3a86a4296ca51ed0308abffd6deee1eddfeeee5f8cc252`

CZ-R07I is the maximal dry static B09 framework package after accepted R07H.
It spans frozen FM-01 centerline indices 240…550: the lower hairpin, complete
face ascent, summit curve, and summit-return ascent. It stops against the
accepted 12-cell R07E guideway-approach cap before index 551. That cap remains
closed, as do the summit headhouse and Z11 interface.

The package installs no rail, vehicle, drive, brake, power, controls,
drainage, outfall, rescue, egress, or commissioned transport function.

## Bound current state

The compiler binds immutable R08P post snapshot
`data/worldsnap-combined-zones-r08p-post-20260821T184147Z`, region identity
`b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25`,
and completed R08P release identity
`f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3`.
The R08P rebase exactly reproduces accepted R07H B09 state-set identity
`b5f545101ceb768cc765daa9e668c2f6ffefa623864faba70db656cafb758b20`
across all 7,800 accommodation cells.

Accepted R07H is bound by manifest identity
`a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416`,
completed release identity
`1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f`,
and post-QA payload
`b849c99bf162da8bbd3eee063d4bab6699b04acaef73652b84612b07a25ed7ed`.

## Exact geometry and turn correction

The 311 selected centerline points produce 622 rail/headroom seeds and a
4,740-cell raw envelope. Removing accepted R07H and R07E envelopes leaves:

- 618 preserved new interior-air cells;
- 4,092 new static polished-diorite shell cells;
- four exact R07H far-cap cells opened as the internal turn aperture;
- eight retained R07H far-cap collar cells;
- the complete 12-cell R07E approach cap retained polished diorite.

The four-cell aperture is `x=2288`, `y=130…131`, `z=-749…-748`, SHA-256
`9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb`.
It includes the nominal two-cell R07H seam plus the two exact collar cells
occupied by centerline index 241.

This migration is required by an explicit negative control. Opening only the
nominal two cells produces two route components of 618 and 476 cells. Opening
the exact four-cell aperture produces one 1,096-cell connected air void,
SHA-256
`2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855`.
Its complete 3,286-cell face boundary projects to polished diorite, SHA-256
`491ab71d982ad1ecce1eb1aea39b7e2bc487d04316c0764e51d6648ea041ab3f`.

The exact operated set has 4,096 cells and SHA-256
`f33fd0ef5f5139261e5408429b2111271b1e776c18dd67c3932db2e6becc269b`.
All targets lie in the frozen 7,488-cell B09 running-guideway construction
domain. The only prior-release intersection is the reviewed four-cell R07H
internal aperture.

## Guarded package

- Compiler:
  `scripts/compile_combined_zones_r07i_b09_maximal_curve_summit_return.mjs`.
- Manifest:
  `data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json`;
  file SHA-256
  `d89fb62731a8d4d3a238d029a43d0be246e1170b3ff222b5e61cc380d5745098`.
- Forward:
  `data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.b09-maximal-curve-summit-return.forward.txt`;
  4,096 exact one-cell guards, operation-body SHA-256
  `4c5dc2ad083ab18140088d9f69d56c4ce76bae2b3b9247de3296f9406ebc4501`,
  file SHA-256
  `653c4173be744e2efc3fa2ea632e07b8af1ee8abf92dda4b3f9cfd648ac80c8c`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.b09-maximal-curve-summit-return.rollback.txt`;
  4,096 exact one-cell guards, operation-body SHA-256
  `a9c40fea93624f5a19bea19a317e5b97622bb49bc3c5edb9a5c1333bd83356c7`,
  file SHA-256
  `72ea351a4d6b57b4b22989e080fbbbc1aa5be9b1299483a083ead21bae63ed1b`.
- Focused regression:
  `test/build/combinedZonesR07IB09MaximalCurveSummitReturn.test.ts`.

Forward order builds all 4,092 shell cells before opening any aperture cell.
Rollback reseals all four aperture cells before removing shell cells in exact
reverse order, restoring the R08P post state.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r07i-b09-maximal-curve-summit-return-offline-20260821T190200Z/`.

- Independent manifest QA: **PASS**, one package and 4,096 unique targets.
- Exact forward source preflight: **4,096/4,096 PASS** against R08P post.
- Projected exact rollback preflight: **4,096/4,096 PASS**.
- Strict-noop forward and rollback parser dry-runs: **PASS**, 4,096 groups
  each and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, 42 target chunks, zero blocking block
  entities or missing chunks.
- The complete 12,692-cell halo contains 9,428 air, 2,600 stone, 636 polished
  diorite, and 28 smooth stone cells; fluid, waterlogged, gravity,
  container/control, block-entity, saved-entity, and relic counts are zero.
- The nominal two-cell seam negative control is two components; the four-cell
  aperture projection is one connected component with zero interior or
  boundary mismatch.
- Deterministic focused regression: **9/9 PASS**.

## Execution boundary

The scoped live wrapper passed all 17 terminal stages and executed
4,096/4,096 strict groups with 4,096 changes, zero failure, no-op, unknown
reply, or WorldEdit leftover. Exact rollback preflight passes 4,096/4,096
against immutable post region
`3bc894ee8455600f1559351ed67dd76c9779efbe8561d262d306b40d39043572`.
The terminal ledger is
`data/world-review/combined-zones-r07i-live-20260821T190347Z/evidence-ledger.json`,
SHA-256
`0d5b4d7bf233f9d383d4ea6cd507ee6932bf86dba78eb84fac836478582d4cb6`.

## Independent post-release seal

The read-only verifier
`scripts/qa_combined_zones_r07i_b09_maximal_curve_summit_return_post_release.mjs`
re-derived the FM-01 route, the two-cell negative control, the exact four-cell
aperture, and the complete boundary. It proves:

- 4,092/4,092 exact shell transitions and 4/4 aperture transitions;
- 1,096/1,096 route cells are air in one component;
- 3,286/3,286 boundary cells are polished diorite;
- all 12 R07E approach-cap cells remain unchanged and physically closed;
- all 84 R07D, 162 R07E, 164 R07F, and 2,150 non-aperture R07H target cells
  retain their execution-source state;
- B08 and Z11 remain unchanged;
- exactly the declared 4,096 cells changed across all 7,800 B09 cells, with
  zero undeclared drift;
- strict execution and all 4,096 exact inverse guards remain identity-bound;
- the nominal two-cell aperture remains correctly rejected as two components.

All 15 checks pass. QA payload identity is
`2f7b3da436ce5790f53a076befeb4b24aead7881b0f064c75e4242f00ef85d48`.
Sealed reports are
`data/world-review/combined-zones-r07i-live-20260821T190347Z/r07i-post-release-qa.json`
and
`data/world-review/combined-zones-r07i-live-20260821T190347Z/r07i-post-release-qa.md`.
The focused regression is
`test/build/qaCombinedZonesR07IB09MaximalCurveSummitReturnPostRelease.test.ts`.
The verifier made no live call, service mutation, or world edit.
