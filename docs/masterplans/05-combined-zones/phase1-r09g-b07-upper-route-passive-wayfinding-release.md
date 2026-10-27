# Combined Zones CZ-R09G: B07 upper-stair passive wayfinding

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED; ROUTE NOT COMMISSIONED  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Manifest identity:** `4df5a9df25c56e4c0145e0a566354ecbd8d489fdde00cd585000c8328ebc67bb`  
**Compile source:** accepted R09F post, complete-save SHA-256
`df6b887176e00a708d55e9022058781a0909df02603f91e482ed78234e1627d0`
**Live source:** `data/worldsnap-r09g-source-20260822T020232Z`, complete-save
SHA-256 `286aa211eb2aae65e1521a78fa9aefbb34e96e27ac95e5bb059d8faa8a2e33a9`  
**Immutable post:** `data/worldsnap-r09g-post-20260822T020232Z`, complete-save
SHA-256 `123df9eb90e212c7de7497b189f28b41ee5ca03603d4f4dee2ba6c0895dd1e00`

CZ-R09G is a bounded passive visual-fit-out package for the accepted B07
upper-stair construction. It replaces eight exact polished-andesite core-face
cells with full-cube sea lanterns at ordered stair indices 1, 17, 33, 49, 65,
81, 97, and 104. The first seven fixtures follow a 16-index cadence; the
index-104 endpoint supplement keeps every one of the 111 stair indices within
eight indices of a fixture.

This is passive visual wayfinding only. It does not claim a photometric result,
emergency or life-safety lighting, supplied power, public/fire-service route
commissioning, or lift/smoke/drainage operation.

## Exact geometry and preservation

The eight-cell target has coordinate-set SHA-256
`2daad521ed5e94bea26f765fb19c394d460355315fe01e27b9b586c6e0898e87`.
Every target is a source-exact polished-andesite cell immediately beside the
conservative clearance cell for its authored stair index. Sea lantern and
polished andesite are both full-cube collision blocks, so these substitutions
do not change the stair void, headroom, core collision boundary, or fall
containment.

The compiler independently preserves and checks:

- the complete 111-cell R09E/R09F ordered stair construction;
- all 222 conservative head-clearance cells;
- all 216 outer fall-barrier cells, including 14 retained stable gravity
  states outside the fixture halos;
- the closed 49-cell R09E deck above the lower wet interface;
- all 72 doorless R07J wall cells and all 49 roof cells;
- the exact five-cell R07J internal seam and its retained interior deck
  continuation;
- zero fixture-halo fluid, gravity, active mechanism, woody state, block
  entity, saved entity, or protected-relic intersection.

The prior-ownership chain is exact: the first six targets are reviewed R02
excavation cells later filled by R09E core construction, and the last two are
R09F core cells. No other prior release targets intersect the package.

## Inherited two-cell commissioning hold

The combined read exposed a pre-existing interface conflict that R09G does not
hide or alter. R09F placed polished-diorite barrier cells at
`(2108,62,-395)` and `(2109,62,-395)`. Those two cells also belong to the
older R09E 222-cell conservative head-clearance set. The accepted R09F post
therefore contains 220 air clearance cells and these two exact closed cells.

This does not make the eight disjoint fixture substitutions unsafe, but it
does prevent R09G from claiming route commissioning. Resolving the conflict
requires its own exact reversible R09 package with a replacement containment
proof; it must not be folded silently into lighting work.

## Frozen guarded package

- Compiler:
  `scripts/compile_combined_zones_r09g_b07_upper_route_passive_wayfinding.mjs`,
  file SHA-256
  `20d900d11c75ba8ba20f8fca5c0e1c057a8b15652edc3478cb6ddf974ad377c7`.
- Manifest:
  `data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json`,
  file SHA-256
  `b848df51c4bc9672044401ca27a9ca116b6b2d66c3f80f501df180f5aede624c`.
- Forward operation:
  `data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.b07-upper-route-passive-wall-wayfinding.forward.txt`,
  eight exact one-cell guards, operation-body SHA-256
  `84cf238de8929755bb3b80738f1aa6b8b95776172d27a1931a51b44461e92226`,
  file SHA-256
  `49d1c82647fdf31d901bd46122cc43db02d0cb3148780a1668042130a67d5d65`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.b07-upper-route-passive-wall-wayfinding.rollback.txt`,
  operation-body SHA-256
  `fe9420d8d5a73e028902a2d7a389e2053a6fada40fff85af3bde17f52fbfa678`,
  file SHA-256
  `54a78510ac68e9bc72fc4cba11c5329a162e01b2b1d183c3326f9df409ed71c9`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r09g-b07-upper-route-passive-wayfinding-offline-20260822T015500Z/`.

- Independent manifest QA: **PASS**, one package and eight unique targets.
- Exact accepted-R09F source preflight: **8/8 PASS**.
- Projected exact rollback preflight: **8/8 PASS** using only the hash-bound
  forward operation as a source overlay.
- Strict-noop forward and rollback parser dry-runs: **PASS**, eight groups
  each and zero WorldEdit leftovers.
- Block-entity and immutable saved-entity checks: **PASS**, zero conflicts;
  the wrapper's fresh live-entity gate remains mandatory.
- The 216-cell target cube halo contains 73 air, 112 polished-andesite, 19
  bottom slabs, and 12 top slabs; every scoped hazard count is zero.
- The real scoped wrapper `--print-plan` accepts `mvpScope: true`, the exact
  R09 release node, and the full prepare-only safety kernel.
- Offline seal:
  `PASS_R09G_B07_UPPER_STAIR_PASSIVE_WAYFINDING_OFFLINE_RELEASE_READY`,
  12/12 checks, report identity
  `c502975503b95db4f7117ba76f438865caa9c73eeb479e664584a2721e4f676c`.
- Focused deterministic regression: **8/8 PASS**.

No live system was contacted and no world or service state was mutated while
compiling or validating CZ-R09G. Any execution must use
`scripts/run_combined_zones_scoped_release.mjs` with release node
`CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute the operation file directly.

## Live execution and independent post-QA

The scoped wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its evidence ledger is
`data/world-review/combined-zones-r09g-live-20260822T020232Z/evidence-ledger.json`,
file SHA-256
`d48df08b9161cf9e0e5591581d96ebcdcfbedcc3948b1ae40b4729d10852d624`,
and completed release identity
`6777fdf8c9629c32de06ef11348da49976fa8a9143560f34b7a0890645d18bf1`.

Independent read-only post-QA returns
`PASS_R09G_B07_PASSIVE_WAYFINDING_POSTSTATE_VERIFIED_REVERSIBLE` with
payload SHA-256
`601a83d4ed8bed0e5e26abd28bb7b0f44fba99554f80223a94e7f0f3ae585fe0`.
It proves all eight exact fixture states and cadence, exactly eight declared
changes across both the 216-cell halo and full 13,608-cell B07 interaction
domain, zero off-target sea lanterns, all 1,377 retained non-fixture R09E/R09F
cells unchanged, the exact 220-air plus two-cell hold state, 17/17 wrapper
stages, a complete 22-entry execution journal, and 8/8 inverse guards.

The canonical machine and Markdown reports are beside the ledger as
`r09g-post-release-qa.json` and `r09g-post-release-qa.md`. The verifier and
focused regression are
`scripts/qa_combined_zones_r09g_b07_upper_route_passive_wayfinding_post_release.mjs`
and
`test/build/qaCombinedZonesR09GB07UpperRoutePassiveWayfindingPostRelease.test.ts`.
