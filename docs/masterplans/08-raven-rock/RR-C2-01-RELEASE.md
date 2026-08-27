# RR-C2-01 — Raven Rock C2 inter-cavern corridor fail-closed containment cap

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `RAVEN-ROCK`
**Design source:** accepted R08AM post snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-rr-c2-source-20260825T052550Z` (SHA-256 `61fee0643f2ce85407e9f0a9bcacaa86ceec1c0826c05b19ae750831be50512f`)
**Post snapshot:** `data/worldsnap-rr-c2-post-20260825T052631Z` (SHA-256 `8b29946f2001b9746d24fea5367e2668f988260941fe7b8ac7d93a8c9934cb6a`)
**Manifest identity:** `d38b81b67f37501504fa70620535bdac50cb2dbf178576c6b1ef336bbe4f67c5`

## Decision: OPTION B — Cavern C is a permanent wet hold

BKR-SURVEY-00 on the accepted R08AM snapshot found that C2 fails the 3-wide/3-high
dry operational-secondary envelope for two independent reasons:

1. **A 1-wide obsidian pinch at the Cavern C end (x=-114)** is a water-filled
   doorway, not a dry rock pinch. The threshold at `(-114,-17,-12..-10)` is
   standing water over an obsidian floor, with solid stone/stone_bricks walls on
   both sides.
2. **Pervasive fluid adjacency.** The corridor spine east of x=-80 is flooded:
   1,622 water sources + 1,018 falling + 233 flowing cells in the corridor band,
   with the water surface at y=-12 (corridor) / y=-11 (north channel). The dry
   walkable spine stops at x=-80.

**No bounded dry 3-wide carve to Cavern C is buildable** without operating
thousands of fluid cells and reopening an unstable water table. The correct
fail-closed action is a **solid containment cap at the safe dry east point
x=-80**, sealing the dry Cavern A vestibule (x=-77..-80, already 3-wide+) from
the flooded eastern continuation, and recording **Cavern C as a permanent wet
hold**.

## What was built

A solid `stone_bricks` wall across the full C2 corridor cross-section at
**x=-80**:

- **corridor plane** `z=-11..-15`, `y=-11..-4` — the 5-wide passage, feet level
  through ceiling;
- **north channel** `z=-16..-18`, `y=-10..-4` — seals the air above the existing
  north-channel water pool (the pool at `y=-11` is never touched);
- **60 exact air→stone_bricks targets**, zero fluid/container targets. The
  single `deepslate_gold_ore` at `(-80,-5,-13)` is pre-existing solid and left
  in place (held, 1 cell).

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rr-c2-source-20260825T052550Z` (SHA-256 `61fee064…`) |
| Exact source guards (design) | 60/60 PASS |
| Exact source guards (fresh exec source) | 60/60 PASS |
| Strict-noop forward parser | PASS (60/60) |
| Strict-noop rollback parser | PASS (60/60) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | **60/60 changed, 0 failed, 0 no-op** (strict-noop) |
| Immutable post snapshot | `data/worldsnap-rr-c2-post-20260825T052631Z` (SHA-256 `8b29946f…`) |
| Rollback post-state preflight | PASS (60/60 against post snapshot) |
| Post-state verification | 60/60 cap cells exact `stone_bricks`; **0 halo drift**; dry corridor spine west of cap all air; flood route blocked; retained north-channel pool sealed above; **0 drift west of x=-80** |

## Flood-containment proof

The cap at x=-80 is solid across the whole corridor cross-section (z=-11..-18,
y=-11..-4). The east flood (x=-81, water surface y=-12 corridor / y=-11 north
channel) sits below the cap's solid band and **cannot flow upward through
stone_bricks**. The pre-existing north-channel pool at x=-80..-79 y=-11
z=-16..-18 is sealed above by the cap and unchanged (source→post identical).
There is **zero drift west of x=-80** — the dry Cavern A vestibule and its
pre-existing north-edge pool are untouched.

## Offline evidence

- Compiler: `scripts/compile_rr_c2_01_cap.mjs`
- Forward/rollback: `data/buildops/rr-c2-01-cap.cap.{forward,rollback}.txt`
- Manifest: `data/buildops/rr-c2-01-cap.release-manifest.json`
- Live evidence: `data/world-review/rr-c2-live-20260825T052758Z/`
- Regression: `test/build/rrC201.test.ts`

## Boundary

- **Cavern C remains a permanent wet hold.** No claim is made that the corridor
  connects to Cavern C, that Cavern C is reachable, or that any route is
  commissioned (`routeCommissioned: false`).
- The dry Cavern A vestibule x=-77..-80 is **sealed at x=-80**; it does not
  connect to the flooded eastern corridor.
- No public egress, accessibility, or operational acceptance is claimed. The
  north-channel water pool and floor channel water are retained exactly.
