# CZ-R07G Empty Eight egress headhouses

Status: **EXECUTED; POST-RELEASE QA SEALED; FAIL-CLOSED AND REVERSIBLE**

R07G completes two dry, sealed surface headhouse shells around the frozen D06
EG-A and EG-B 7×7 cores. It uses the exact surveyed endpoints and landing Ys:
EG-A `1652,80,148`; EG-B `1852,71,148`. The shell fabric is
`minecraft:polished_deepslate`, the frozen EE-P13 default-closed cap material.

The R09D terminal post already contains both complete 49-cell landing/caps and
14 cells of the EG-B south approach-cap wall. R07G preserves all 112 of those
R02 cells and adds only exact current-air cells:

| Package | New wall/roof cells | Preserved landing | Preserved R02 wall | Preserved headroom |
|---|---:|---:|---:|---:|
| EG-A | 121 | 49 | 0 | 75 |
| EG-B | 107 | 49 | 14 | 75 |
| **Total** | **228** | **98** | **14** | **150** |

Each resulting surface envelope is 7×5×7: a complete 170-cell static shell
around one connected 75-cell, three-block-high air volume. The accepted
49-cell smooth-stone roof-transition cap at Y=54 also remains untouched for
each core. No grading or below-landing supports are changed because those
cells are shaft/terrain context; the already-built solid landing caps are the
exact base.

The shells stay intentionally closed. R07G installs no doorway, stair, lift,
power, control, smoke system, or exterior route and makes no egress or
accessible-route commissioning claim. All future interfaces remain sealed.

## Source and safety

- Source: `data/worldsnap-combined-zones-r09d-post-20260821T181124Z`
- Complete-save SHA-256: `899e8ce2b42bfa77ec01cbaba9088880a6760d30ff328722ec40958be34582ac`
- Region SHA-256: `8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3`
- Predecessor completed identity: `39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0`
- Manifest identity: `f0733a6a4b925043eb495299dd682290ad943cd4a8184ec516c4e3c7353d9d0e`
- Canonical owners: `OWN-D06-EG-A`, `OWN-D06-EG-B` at both release and per-core levels.

The exact operated halos contain zero fluids, gravity blocks, containers,
control blocks, block entities, saved entities, protected relic cells, or
woody blocks. Five natural oak-leaf cells remain deeper in the frozen EG-B
continuation context, below/outside the operated halo and separated from the
new work by the accepted landing cap; R07G neither targets nor relies on them.

The accepted bee relocation is independently rebound to the current post: the
former source `1849,66,145` is air with no block entity, and the destination
`1811,67,378` remains a south-facing, honey-level-zero bee nest whose beehive
block entity contains all three bees. Neither point intersects a target or the
operated halo.

## Offline evidence

Canonical evidence directory:
`data/world-review/combined-zones-r07g-empty-eight-egress-headhouses-offline-20260821T181300Z`

- Manifest QA: PASS, 2/2 packages, 228 unique targets, zero overlap.
- Forward source preflight: EG-A 121/121; EG-B 107/107.
- Strict-noop parser checks: all four forward/rollback files clean; zero
  WorldEdit leftovers.
- Projected reverse-order rollback: EG-B 107/107 after both forwards; EG-A
  121/121 after both forwards and the EG-B rollback.
- Block-entity clearance: PASS, 228 operations, two target chunks, zero
  blockers or missing chunks.

The earlier `...discarded-owner-defect-20260821T180000Z` directory is explicitly
noncanonical: it predates correction of two shortened per-core owner literals.
Operation bytes never changed and no live call or world mutation occurred.
The later `...discarded-r08n-terminal-superseded-20260821T180800Z` evidence is
also noncanonical because R09D became the accepted terminal before handoff;
its operation bodies are identical to the R09D-bound package.

## Executed release and post-release seal

The manifest-bound wrapper executed R07G on 2026-08-21 in EG-A then EG-B order.
The terminal ledger is
`data/world-review/combined-zones-r07g-live-20260821T181527Z/evidence-ledger.json`:
all 24 stages pass, both strict executions completed 228/228 groups with zero
failure, no-op, unknown reply, or WorldEdit leftover, and the reverse-order
rollback guards pass 228/228. The completed release identity is
`79b6e5972cfc24770cb402f740407bc7c01113d728d5cca0b765894c0066335e`.

The immutable post is
`data/worldsnap-combined-zones-r07g-post-20260821T181527Z`, complete-save SHA-256
`98086a3bc4584ba82ee287f1425f32435a2f41e1ce5f3a72482a50e225f8b8e4`
and region SHA-256
`d3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8`.
Independent read-only QA is sealed at
`data/world-review/combined-zones-r07g-live-20260821T181527Z/r07g-post-release-qa.json`
with payload SHA-256
`cf911cfed8f790e2b5eaf1177d9cb485a8282bb1e9d35a7eb0a498c3228fa964`.

That seal verifies all 121 EG-A and 107 EG-B exact target states; both complete
170-cell shells including both unchanged 49-cell landings and the unchanged
14-cell EG-B approach wall; two connected 75-cell air interiors; two closed
110-cell face boundaries; both unchanged 49-cell Y=54 roof-transition caps;
and the accepted bee relocation. Across the full 2,597-cell two-core review
domain, all 228 and only the 228 declared cells changed. The resulting shells
remain deliberately uncommissioned: no door, shaft, lift, or egress-route
opening exists, and all future interfaces remain sealed.
