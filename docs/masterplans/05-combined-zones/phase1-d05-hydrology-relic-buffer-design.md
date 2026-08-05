# D05 mountain hydrology and protected-relic buffer design audit

Status: **PARTIAL PASS — EXACT BASELINE AND CANDIDATES — D05 HOLD — OFFLINE ONLY**

This package reads the immutable Phase 0 post-region snapshot and the current coordination evidence. It hashes current three-dimensional fluid and cryosphere cells through the full overworld build height over the compiled mountain X/Z footprint, partitions water and lava into exact connected components and default-deny coordination classes, derives a deterministic copied-surface routing candidate, and proposes the minimum one-cell adjacency shell around each protected relic core. It emits zero operations and assigns no construction owner.

## Current 3D baseline

| Family | Cells | Exact coordinate SHA-256 |
|---|---:|---|
| water | 1,929,621 | `1c6e3d25121884eb4baba8da8f8713a014360643f78aa30686f8c9785127b04e` |
| lava | 85,088 | `6b414c16d0e5965d2c22c899a1fe2523de39f4564d775433745b983ba313ec18` |
| frozen | 182,791 | `c230a0ed3582c466736101c7c209dda071070645a2c81381408a8a3bc496a071` |
| snow | 359,830 | `0a0af937ba1634ace4d925341465dfa1b1f0a017332744341f9a2cb1a25f4c9b` |

- Mountain coordination volume: `1648…2447, 72…303, -1128…-529` (111,360,000 cells).
- Full-height hydrology survey prism: `1648…2447, -64…319, -1128…-529` (184,320,000 cells).
- Water components: 5,234.
- Lava components: 941.
- The census includes waterlogged blocks as water. Ice and snow remain separate snowmelt/storage context.

These are current copied-snapshot facts, not a future excavation/fill influence model. Neither the survey prism nor the coordination volume is construction ownership.

## Relic buffer candidates

| Relic record | Core cells | One-cell candidate shell | Mountain-shell intersection | Review state |
|---|---:|---:|---:|---|
| igloo-east | 280 | 350 | 350 | HOLD — candidate only |
| igloo-west | 280 | 350 | 0 | HOLD — candidate only |
| shipwreck | 2268 | 1362 | 798 | HOLD — candidate only |

The one-cell Chebyshev shell is the smallest positive separation that prevents future face, edge, or corner adjacency to a protected core. That makes it an exact coordination candidate, not an approved safety buffer. It does not prove structural support, entrance safety, hydrology, exhibit access, or an acceptable construction setback. The east-igloo start remains default-deny even though its recorded 280-cell volume is entirely air; this report does not invent present relic fabric.

## Drainage coordination

The exact D8 copied-surface candidate routes 988 columns to the coordination boundary and 479,012 columns to 328,018 strict local sinks. Its routing relation is `2f0bbb41cc52b8020a13c61c4aedf0a12a286515b2e5b6597dc2659c9f43ad7d`.

This is a reproducible topographic partition only. It is not Minecraft fluid simulation and does not model rainfall, infiltration, groundwater, snowmelt, erosion, depression filling, future grading, sumps, culverts, or discharges. Every exact hydrology set remains unassigned and default-deny.

## D05 disposition

The immutable identity, exact current 3D hydrology/cryosphere census, fluid components and boundary contacts, relic adjacency candidates, and topographic routing candidate pass as offline evidence. D05 remains **HOLD** because reviewed relic buffers, an accepted future mountain model, accepted influence criteria, canonical owners/interfaces, expert civil and geotechnical review, and frozen preservation/no-diversion acceptance criteria do not exist. Operations, rollback, and post-state proof are later G03-G19 validation and cannot resolve D05 or G02.

Reproduce with:

```bash
node scripts/audit_combined_zones_d05_hydrology_relic_buffers.mjs
```
