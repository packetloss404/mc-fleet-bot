# D02-S01/S02 copied-save and region evidence

**Status:** HOLD_D02_S01_S02_INCOMPLETE_NO_WORLD_EDITS  
**Generated:** 2026-08-04T21:56:58Z  
**Selected region identity:** `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`

No complete copied save exists under `data/`: 56 candidate roots were inspected, and none contains all of `region/`, `entities/`, `poi/`, and `level.dat`. The exact region-only work below is useful evidence, but it cannot close D02-S01, D02-S02, ISSUE-002, or R00.

## Snapshot completeness

| Candidates | Complete | Selected region files | Selected bytes | Missing components |
|---:|---:|---:|---:|---|
| 56 | 0 | 51 | 290946492 | entities/, poi/, level.dat |

Inventory hash: `9bb0e7c9e8c23ce428372e19967ac2b56f15611a2f05602f2cbfe0a019fc5411`.

## D02-S01 full-height C1 region census

| Measure | Result |
|---|---:|
| Exact land-take columns | 80,363 |
| Full-height cells decoded | 30,859,392 |
| Touched chunks | 437 |
| Missing chunks | 0 |
| Non-air cells | 12,058,702 |
| Water/bubble cells | 70,032 |
| Waterlogged cells | 537 |
| Lava cells | 11,178 |
| Gravity-sensitive candidates | 179,658 |
| Block entities | 33 |
| Relevant generated starts | 4 |

State-stream hash: `f8de755a2ef320c0611420a8e857f77b9476509df03bf694749a1f4dd64e63eb`. Generated-start overlap is plan-only and does not prove occupied-cell clearance.

### Closed region facts

- The complete hash-bound 80-block C1 land take was reconstructed byte-deterministically.
- Every land-take column was decoded for all 384 world levels with zero missing region chunks.
- Exact block-state, fluid, gravity-candidate, block-entity, and generated-start facts are sealed.

### Remaining S01 blockers

- No same-moment entities, POI, or level.dat evidence exists in any copied-save candidate.
- The region census does not select treatment typologies, foundations, future excavation/fill influence cells, or groundwater-like behavior.
- Hydrology components and accepted outfalls remain D02-S03 work.

## D02-S02 C01 and ISSUE-002 evidence

| Feature | Region cells | Non-air | Block entities | C1 plan overlap | Acceptance |
|---|---:|---:|---:|---:|---|
| C01 Owner Tunnel Detour | 335475 | 319514 | 4 | 7803 | HOLD |
| C01 East L1 Security Garage | 328032 | 186999 | 99 | 0 | HOLD |
| C01 East L2 Living Adult | 246024 | 124584 | 199 | 0 | HOLD |
| C01 East L3 Agriculture Water | 247833 | 122953 | 757 | 0 | HOLD |
| C01 Owner Residence | 165620 | 32980 | 135 | 0 | HOLD |
| C01 East L4 Command Medical | 71604 | 31664 | 114 | 0 | HOLD |
| C01 East L5 Power Escape | 67032 | 26660 | 198 | 0 | HOLD |
| C01 Owner Club Arrival | 106210 | 38813 | 144 | 0 | HOLD |

The old C01 source survey scope is nonempty with 3,505 region-stored block entities. This is consistent with the independent finding that the old source was not retired; it is not a semantic inventory or commissioning test.

P01 has 33,634 region-surveyed surface columns, 46 top block names, and top Y 60..112. That does not establish uninterrupted parking circulation. The road remains HOLD because no exact accepted road cell set exists.

### Closed region facts

- Every catalogued C01 feature volume is state-hashed against the selected August 4 region snapshot.
- The old-source, east-study, portal-study, and P01 surface scopes have exact region-only state identities.
- The old C01 source scope remains nonempty and contains block entities in the selected region evidence.
- The accepted documentary truth keeps ISSUE-002 open and says relocation/arrival were not delivered.

### Remaining S02 blockers

- No complete current copied save establishes entity, POI, level.dat, or same-moment identity.
- Region blocks cannot establish semantic program migration, commissioning, usable road/entrance, full parking circulation, canonical ownership, or loading permission.
- No exact accepted road cell set exists to survey.
- ISSUE-002 requires explicit sole-authority disposition and must remain open in this artifact.

## Exact missing evidence

A current immutable copied save containing region/, entities/, poi/, and level.dat from one frozen capture, with a whole-package identity manifest.

Regenerate this audit against that package, require identical or explicitly superseded region identity, then evaluate entities, POI, world metadata, semantic routes, and sole-authority ownership/ISSUE-002 acceptance.

This audit performs no live calls, opens no database, emits zero operations/material cells, leaves D02 and R00 on HOLD, and authorizes no world edit.
