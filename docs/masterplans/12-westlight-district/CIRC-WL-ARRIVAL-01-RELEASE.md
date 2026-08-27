# CIRC-WL-ARRIVAL-01 · Westlight arrival pedestrian-edge completion

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `WESTLIGHT-DISTRICT`
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-westlight-arrival-source-20260824T205209Z`
**Post snapshot:** `data/worldsnap-westlight-arrival-post-20260824T205333Z`
**Manifest identity:** `9995fa4bb99678f6a44ef3769eb98a380119138d92a9745489271ebb39f0b180`

## Scope

CIRC-WL-ARRIVAL-01 closes the last unbuilt gap in the Western Approach Road
pedestrian edge at the Westlight/Gatehead arrival. The prior
`CIRC-WL-ARRIVAL-ROAD-01` release built the east/central 2-wide edge (x=-322,
x=-319, and every conflict-free column east to x=-148). The accepted survey's
deck model classified x=-316..-310 at the gravel plaza level (y67) with a
south-edge obstruction, but the **actual gray_concrete bridge-approach deck**
at those columns sits at deckY 69–71 with a clean air south edge at z=-492,-491
— the exact structural pattern the prior release already built at x=-319 and
x=-322.

This package adds the missing 2-wide edge there:

- **18 edge cells** (`minecraft:gray_concrete`): `(x, deckY, z=-492..-491)` for
  x = -318..-310 at deckY 69–71.
- **36 support fills** (`minecraft:stone`): every air/plant cell from deckY-1
  down to the solid gravel/stone terminal, bounded depth ≤ 3.
- **54 exact targets**, zero held, zero hazards.

The 7-wide carriageway (`gray_concrete` deck run z=-501..-493) is preserved
exactly; every operated cell is a road-adjacent edge cell at the same deck
elevation.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-westlight-arrival-source-20260824T205209Z` (SHA-256 `98e8a49c…`) |
| Exact source guards | 36/36 + 18/18 PASS against the fresh execution source; all 18 edge targets byte-identical to the design snapshot |
| Strict-noop forward parser | PASS (36/36 + 18/18) |
| Strict-noop rollback parser | PASS (36/36 + 18/18) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 36/36 + 18/18 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-westlight-arrival-post-20260824T205333Z` (SHA-256 `50daa502…`) |
| Rollback post-state preflight | PASS (36/36 + 18/18 against the post snapshot) |
| Post-state verification | 18/18 edge cells exact `gray_concrete`; 36/36 support fills `stone`; 99/99 pre-existing carriageway `gray_concrete` cells unchanged; zero halo drift outside the 54 targets + 4 already-built x=-319 cells |

## Offline evidence

- Compiler: `scripts/compile_westlight_arrival_pedestrian_edge.mjs`
- Forward/rollback: `data/buildops/westlight-arrival-pedestrian-edge.{support-fill,edge-pave}.{forward,rollback}.txt`
- Manifest: `data/buildops/westlight-arrival-pedestrian-edge.release-manifest.json`
- Live evidence: `data/world-review/westlight-arrival-live-20260824T205333Z/`
- Regression: `test/build/westlightArrival.test.ts`

## Boundary

- **No whole-corridor claim.** This closes a bounded gap between the accepted
  x=-319 edge and the White Bridge; it does not commission the route, lighting,
  drainage, or any crossing.
- The Gatehead plaza, Westlight district structures, and the gravel plaza at
  y67 are preserved unchanged.
- `routeCommissioned: false`.
