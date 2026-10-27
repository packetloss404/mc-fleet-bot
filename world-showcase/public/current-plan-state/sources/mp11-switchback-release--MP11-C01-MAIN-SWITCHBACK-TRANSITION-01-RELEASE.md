# MP11 C01 Main Switchback Transition 01 — as built, post-verified, reversible

**Release ID:** `MP11-C01-MAIN-SWITCHBACK-TRANSITION-01`

**Status:** `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`

**Scope limit:** Main switchback only, with Return-02 retained continuously.

## What was built

- A 30-station main lane, five clear wide by five clear high.
- The selected five-tread upper and lower endcaps.
- 100 two-high polished-deepslate wall guard/handrail cells, including the
  collision-free outboard fold correction.
- 387 exact changed cells from a 928-cell canonical main-plus-guard target
  union. The other 541 target cells already held their exact desired state.

The release changes **zero** current protected-route cells. It neither retires,
connects, gates, nor closes the protected route. It retains the independently
verified 28-station Return-02 and all 768 of its canonical states.

![Fresh-source transition map](../../../data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rebound/transition/mp11-c01-main-switchback-transition-return02-preservation-05.svg)

## Guarded transaction evidence

| Gate | Result |
|---|---|
| Fresh source capture | 130-member immutable save, capture `combined-zones-4f1108e211f44419bacb2b0a2d578299` |
| Source intake | pass; complete-save SHA-256 `7584dff337e93dc03844cd6e977de8fd085e8ee1dcf540b01ccfcd1e793d60e3` |
| Fresh rebind and compiler | pass; 928 canonical targets, 387 exact forward and 387 exact inverse commands |
| Protected/container/block-entity gate | pass; zero blocking block entities |
| Live entity clearance | pass; zero blocking entities |
| Strict forward execution | pass; `387/387` changed, zero no-ops, journaled |
| Fresh post capture | 130-member immutable save, capture `combined-zones-0125f578bc38461ba3d3323d6be70ca0` |
| Post intake | pass; complete-save SHA-256 `55525c8277c7c9f24f6bd3ece262075bf55ea94c5abe1b4fd636da7790162b2b` |
| Rollback poststate preflight | pass; `387/387` exact guards |
| Independent functional QA | pass: main and Return-02 both normal-walk in both directions; all required five-wide/five-clear stations pass |

The full [guarded ledger](../../../data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json), [forward source preflight](../../../data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/forward-source-preflight.json), [rollback poststate preflight](../../../data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/rollback-poststate-preflight.json), and [corrected immutable post QA](../../../data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/independent-post-release-qa-corrected/mp11-c01-main-switchback-transition-01-post-qa.json) are the acceptance evidence.

## Transparent wall-state correction

The first immutable QA read all 100 guards as their full Minecraft wall
connection state while the compiler manifest recorded only the bare material
state. It failed exactly those 100 canonical comparisons; dry/gravity, both
routes, and retained Return-02 checks already passed. The corrected read-only
QA accepts only the exact deterministic state:

```text
minecraft:polished_deepslate_wall[
  east=none,north=none,south=none,up=true,waterlogged=false,west=none
]
```

No world cell was changed for the correction. The ledger preserves both the
initial failure and corrected QA hashes. Future compiles now emit that full
state for the exact guard role.

## What this release does not claim

- No public opening, endpoint, egress, service, rail, power, or passenger
  service.
- No retirement, connection, gate, or closure of the protected route.
- No completion of C01, Town Expansion, the bunkers, PassageWay, or the Master
  Plan.

Any later route transition remains a separate owner-bound package with a new
fresh source, full inverse, and functional proof.
