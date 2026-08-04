# Phase 1 connector geometry — B07/B08 candidates and B09 face comparison

Status: **PARTIAL PASS — EXACT OFFLINE CANDIDATES — ALL THREE BLOCKERS HOLD — ZERO OPERATIONS**

This package binds the reconciled Masterplan 04/05 anchors and the immutable Phase 0 copied snapshot. It freezes deterministic review geometry for the public-shaft dogleg and service-tunnel rail, and compares existing terrain along paired east/west envelope-edge transects for the funicular. It does not create construction ownership, operations, source guards, or world-edit authority.

## P1-B07 public shaft

- Exact anchors: top `2108,72,-398`; observation `2108,8,-398`; lower lobby `2108,-56,-428`.
- Candidate: two vertical 7×7 shafts joined by a level 7×7 observation-transfer gallery.
- Side convention: west one-block stair strip, centered 5×5 lift core, east one-block service chase.
- Excavation reservation: 7,791 cells, hash `1cf518d7b62044349356926bb1a0902c9955c19f456d8ab4806ae38fe0bfa5f1`.
- **HOLD:** the two-lift transfer is not an accepted mechanism; the one-block stair strip is not accessible independent egress; structure, smoke, drainage, ownership, and life-safety evidence remain absent.

## P1-B08 service tunnel

- Exact cardinal centerline: 220 horizontal steps through all three anchors; 58 rising and 162 level steps.
- The 58-block rise occurs on the first 60-step east tangent, followed by a 120-step north tangent through the straight/level contact anchor and a 40-step east tangent to the outer portal.
- Both curves are level. Maximum grade is 1:1. The 6×6 section uses the explicit lateral range −2…+3 and vertical range −1…+4 around the rail datum.
- Centerline hash: `822293ad9f30cabf7211fe652c8a15ef6e6afae2943775c01861afa4f33a9903`; excavation reservation: 7,878 cells, hash `967a9ddd39775cfc4cbc851fd51abc4726a1e20ab632b433b45d386393254882`.
- **HOLD:** axis ordering, curve component ownership, lining/loading, drainage, escape, source, commissioning, and route acceptance remain unapproved.

## P1-B09 funicular

| Survey-only profile | Horizontal steps | Current surface Y | Generated-start plan intersections | Relic plan intersections |
|---|---:|---:|---:|---:|
| east-envelope-edge-profile | 878 | 63…103 | 3 | 0 |
| west-envelope-edge-profile | 880 | 30…96 | 3 | 0 |

Both transects have more horizontal run than the transformed 174-block rise requires at the absolute Minecraft 1:1 rail limit. That does **not** select a face: the future mountain solid is absent, and the summit design anchor is 223 blocks above the immutable current surface at that X/Z. B09 remains HOLD pending an accepted future face, integer switchbacks with level curves, station throats, maintenance/egress, protected-feature clearance, hydrology, and ownership.

This packet is the source-bound precursor comparison. Consult **phase1-d05-future-mountain-alternatives.json** and **phase1-autonomous-design-selections.json** for later planning-selection status; those downstream records do not alter this packet's historical input finding or authorize construction.

## Snapshot and release boundary

- Immutable copied snapshot: `data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region`
- Snapshot SHA-256: `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`
- World edits authorized: **no**
- Operation cells: **0**
- Material cells: **0**

Regenerate:

```bash
node scripts/compile_combined_zones_phase1_connector_geometry.mjs
```
