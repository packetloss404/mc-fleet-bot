# R11H Retry-v2 C1 Hydraulic-Isolation Bridge

Date: 2026-08-22  
Release node: `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR`  
Status: **AS-BUILT / EXECUTED / POST-VERIFIED / REVERSIBLE / INDEPENDENT QA PASS**

Retry-v2 preserves the complete R11H design: two packages, 1,666 target cells,
355 connected max-step-one pavement cells, 667 headroom cuts, 636 dry
foundation cells, five transverse-beam cells, three durable gravel
dependencies, and the same 110 omitted deep wet-adjacent foundation cells.

Exactly two source guards change from the first attempt. Headroom cells
`(1529,68,-251)` and `(1540,68,-238)` now require
`minecraft:grass_block[snowy=false]` before replacement with air, and exact
rollback restores that grass state. All other 1,664 forward source states,
all target coordinates, all desired states, and all inverse records remain
unchanged. Strict-noop remains mandatory.

Fluid-preservation claim for execution and post-QA:

> The exact 7,120-cell operated halo is fluid-free in the accepted recovery
> source. The distinct snapshot-bound hydraulic-review baseline contains 45
> lava cells in one cardinal component, coordinate-set SHA-256
> `ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8`,
> entirely outside the operated halo at minimum Chebyshev distance two. R11H
> retry-v2 authorizes no fluid operation and claims only preservation of that
> exact accepted-source baseline, not static future flow, hydraulic capacity,
> drainage commission, or an external discharge.

Canonical artifacts:

- `data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json`
- `data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-dependencies.forward.txt`
- `data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-dependencies.rollback.txt`
- `data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-structure.forward.txt`
- `data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.c1-bridge-1189-1206-structure.rollback.txt`
- `data/world-review/combined-zones-r11h-retry-v2-offline-20260822T033000Z/`

Manifest QA, 1,666/1,666 source preflight, both projected rollback preflights,
four strict-noop parser plans, block-entity clearance, the real wrapper
`--print-plan`, independent offline QA, focused deterministic regression, and
the backend build pass. Offline QA payload:
`a9c0d993626a1170633ac5d05b648e93c4a1a46048121843a2a777493921a9d7`.

The guarded retry completed at `2026-08-22T03:26:27Z` with completed release
identity `04f9c6e7ae2b7734da2cfbf85d5f37cd3ba15fea257ace636f601c5acdbe815e`.
All 24 wrapper stages pass. Independent read-only QA verifies 1,666/1,666
target states and inverse guards, one connected max-step-one 355-cell surface,
355/355 stable contacts, 710/710 headroom-air cells, 636 foundation cells,
five beams, 11/11 durably anchored support components, and zero off-target
drift in the exact 7,120-cell operated halo. All 6,426 prior R11 target cells
remain exact.

The failed first attempt remains bound as negative evidence: strict-noop
stopped the stale source at its first lifecycle transition, both packages were
compensated, and retry-v2 rebound only the two accepted dirt-to-grass source
states. The fresh retry source and post preserve the distinct 45-cell lava
baseline byte-for-state and coordinate set, with zero fluid in the operated
halo. This is a snapshot-bound preservation result, not a hydraulic-capacity,
drainage, external-discharge, or static-future-flow claim.

Post-release evidence:

- `data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/evidence-ledger.json`
- `data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json`
- `data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-bridge-commissioning-seal.json`

QA payload SHA-256:
`5ccd20fbb3ec4c89465e09f17f09cccc1922340d234f3ea59bef16dd34e433c5`.
Commissioning-seal payload SHA-256:
`c95112fae1eee22daea368be66e72a49e745f4304d206176148934cc430c9788`.
The QA performed no live call or world mutation.
