# COBALT-STATION-01 · Westlight station platform deck with sealed liner

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Network Design §3](2026-08-22-passenger-railway-network-design.md), [Engineering Standard §4.1/§4.2](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md)
**Design source:** accepted post-R08AM snapshot and the Cobalt-S1 station-pair design `data/world-review/cobalt-s1-station-pair-design-20260824/cobalt-s1-design.json`
**Fresh execution source:** `data/worldsnap-cobalt-wl-source-20260825T063533Z` (SHA-256 `2b78f718…`)
**Post snapshot:** `data/worldsnap-cobalt-wl-post-20260825T063602Z` (SHA-256 `76d2a9e9…`)
**Manifest identity:** `5ff9335f9468ee5e577cdd4dbae00a14cc728318c787531488f4101f9c5d176e`

## Scope

Builds the **Westlight (PR-W02) station platform deck** at the corridor head,
immediately south of the future south track band, as the first concrete Westlight
station civil cell. This is the platform-deck foundation that makes the
Westlight↔Ravensreach station pair's Westlight end physically viable.

| Element | Volume |
|---|---|
| Clear deck volume | x=-253..-237, y=18..23, z=-444..-441 (17 wide × 4 deep × 6 tall) |
| Deck walk surface | x=-253..-237, y=18, z=-444..-441 → **polished_andesite** (68 cells) |
| Sub-floor liner | y=17, x=-253..-237, z=-445..-440 |
| Ceiling liner | y=24, x=-253..-237, z=-445..-440 |
| North wall | z=-445, x=-253..-237, y=18..23 |
| South wall | z=-440, x=-253..-237, y=18..23 |
| West cap | x=-254, y=18..23, z=-445..-440 |
| East cap | x=-236, y=18..23, z=-445..-440 |

The **6×6 sealed service corridor** (z=-462..-457, y18..23, x=-254..-236, built by
RAIL-S2-WL-SEGMENT-01/02-03/04-06) is **untouched** — this package sits south of the
track band (z=-445..-440) and is disjoint from it and from the corridor.

## Containment design

**Treatment:** `SEALED_PLATFORM_DECK_LINER_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND`

Every operated cell is an exact-source in-place `REPL` guard — never a removal — so
no flow/gravity physics are triggered:

- **68 deck surface cells** → polished_andesite (the dry platform walk surface).
- **482 liner face cells** → polished_deepslate (the sealed box around the deck).
- **25 face fluid cells sealed**: lake-boundary water sitting on the west cap
  (x=-254), south wall (z=-440), and y24 ceiling is displaced to solid liner in
  place.
- **2 crown-fluid cells displaced**: the lake water entering the clear volume at
  the y23 crown (x=-253, z=-442..-441) becomes liner.
- **0 gravity and 0 forbidden** cells held.
- The **preserved lake water body behind the liner** (west/south of the platform)
  is preserved exactly — not deleted.

Rollback restores every one of the 550 cells to its exact original state.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-cobalt-wl-source-20260825T063533Z` (SHA-256 `2b78f718…`) |
| Exact source guards | 550/550 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (550/550) |
| Strict-noop rollback parser | PASS (550/550) |
| Release-manifest QA | PASS (1 package, 550 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | **550/550 changed, 0 failed, 0 no-op** |
| Immutable post snapshot | `data/worldsnap-cobalt-wl-post-20260825T063602Z` (SHA-256 `76d2a9e9…`) |
| Rollback post-state preflight | PASS (550/550 against post snapshot) |
| Post-state verification | 550/550 at desired target; 68/68 deck polished_andesite; 0 clear-volume fluid (y19..23); preserved lake water behind liner (halo probes) |

## Offline evidence

- Compiler: `scripts/compile_cobalt_wl_platform_01.mjs`
- Forward/rollback: `data/buildops/cobalt-wl-platform-01.platform.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-wl-platform-01.release-manifest.json`
- Post-state verifier: `scripts/verify_cobalt_wl_platform_01_post.mjs`
- Live evidence: `data/world-review/cobalt-wl-platform-live/`
- Regression: `test/build/cobaltStation01.test.ts`

## Boundary / negative claims

- **No whole-station claim.** This is the Westlight platform deck foundation only.
  The surface headhouse entrance, stair, cross-passage, rail, platform edge
  treatment, and station fit-out are NOT part of this package.
- **No track, rail, or route commissioning** — RAIL-S2 platform-deck civil
  containment only. The clear volume above the deck (y19..23) is empty rock
  retained for the later RAIL-S3 station fit-out.
- The **6×6 sealed service corridor** and the **RR access shaft sleeve** are
  untouched.
- The **lake water body behind the liner is not deleted** — it remains preserved
  behind the sealed liner faces.
- The Westlight headhouse and the **Ravensreach second public street-to-platform
  route** are still separate follow-ups (the pair's `readyForFreeze` gate remains
  pending that route survey).
- `routeCommissioned: false`.
