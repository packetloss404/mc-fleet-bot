# Phase 0 Survey Brief — Combined Zones Rerun

Status: **COMPLETED 2026-08-04 UTC — SOUTH ANNEX RESITE PASS — PROCEDURE RETAINED FOR AUDIT**

## Outcome

The first live Phase 0 generated and sealed the complete `x=1200…3200`, `z=-1200…600` atlas, then correctly rejected the original `(2250,-300)`, 90-degree transform. The rerun used that immutable terrain to select a coupled replacement for Gateway, Houston, the public shaft, SubTropolis, Cheyenne, and the mountain. A subsequent owner-directed correction moved Empty Eight from the technically dry but arctic northern site to a fully dry, non-arctic site wholly south of Gateway Approach, using the same sealed snapshot and no live world mutation.

The rerun passed every declared siting gate. Nothing in either session placed or removed a block.

| Evidence | Result |
|---|---|
| First-run pre-generation snapshot | `data/worldsnap-combined-zones-phase0-pre-20260803T234132Z/region`; SHA-256 `72a10688ec9f10f80db98820433d251013ccc3f946428375ce7d8b1077d6e16d` |
| Rejected patchy intermediate | `data/worldsnap-combined-zones-phase0-post-20260803T235154Z/region`; SHA-256 `d9f7fcefdd47ac865312369ebe969129ce30c89295c322f9938f6d9c9fe6f481` |
| First-run final generated atlas | `data/worldsnap-combined-zones-phase0-final-post-20260804T001002Z/region`; SHA-256 `979e78052b1336e90be664dc7215b6df14962c4203a9cbce8b567ebb98e74ead` |
| Rerun pre-check snapshot | `data/worldsnap-combined-zones-phase0-rerun-pre-20260804T021237Z/region`; SHA-256 `fe7a3e5a75bbf90104c73bf9f78115300fe66f82b300d2dde7cede9fd993ab37` |
| Rerun post-check snapshot | `data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region`; SHA-256 `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b` |
| Chunk generation during rerun | none required; every revised target chunk was already `minecraft:full` |
| Preserved live force-load baseline | exactly 104 before and after |
| Rerun verdict | `PASS_REVISED_SITING_PHASE0` |

## Adopted study geometry

The current-world adapter ends at the dry Gateway interface `(1550,68,-250)`. The normalized Combined Complex uses:

```text
worldX = 2048 + localX
worldZ = -328 + localZ
```

The revised reserve is `x=1500…2550`, `z=-1150…300`. Gateway Approach is the larger adapter envelope `x=1500…2250`, `z=-1100…0`; it is deliberately decoupled from the normalized core transform.

The retained East Corridor alignment is:

```text
(430,80) → (905,80) → (1065,-80) → (1330,-80) → (1550,-250)
```

It is sampled every 16 Euclidean blocks. The natural surface is not the proposed rail formation. The accepted Phase 0 rail study profile starts and ends at `Y=68`, ranges `Y=63…114`, and never exceeds 1:8.

## Passing gates

| Gate | Result |
|---|---|
| Atlas coverage | PASS — 14,238/14,238 chunks full |
| Revised reserve coverage | PASS — 6,097/6,097 chunks full |
| Engineered passenger-rail grade | PASS — maximum `0.125` |
| Critical core anchors | PASS — Houston, shaft, SubTropolis, Cheyenne portal, and summit all dry |
| Mountain water exposure | PASS — 12,597/481,401 = 2.6167% |
| Urban-core water exposure | PASS — 2,524/90,831 = 2.7788% |
| Empty Eight footprint | PASS — 0/29,161 water columns and 0/29,161 snowy/frozen biome columns |
| Empty Eight cover | PASS — 29,161/29,161 columns provide at least eight blocks over roof `Y=54` |
| Empty Eight structure clearance | PASS — zero generated-structure bounds intersect shell `Y=38…54` |
| Surface generated structures | PASS as a planning constraint — two igloos and one shipwreck declared no-touch |

The natural corridor profile still records three water samples, 39 intervals steeper than 1:8, up to 36 blocks of proposed cut, and up to 23 blocks of fill. A Phase 0 PASS does not price or authorize those works.

## Empty Eight setout

The dry southern terminal shell is:

```text
x = 1632…1872
z = 40…160
shell Y = 38…54
rail Y = 40
```

Gateway Approach ends at `z=0`, so every terminal column is south of the surface zone. The 241×121 shell retains eight east–west tracks, eight 101-block platforms, two mall wings, and sealed future-line interfaces.

The concealed branch study centerline is:

```text
(1780,68,-250)
(1785,64,-215)
(1760,56,-130)
(1700,48,-20)
(1632,40,100)
```

Its steepest segment is `4/35.355 = 0.1131`. One mineshaft start intersects the terminal footprint in plan at recorded `Y=-16…3`, wholly below the shell; this is an exact vertical-clearance finding, not permission to disturb it.

## Retained live procedure

Phase 0 ordering is mandatory whenever the target expands outside already-full chunks:

1. Verify the live world identity and world border.
2. Query and record the current force-load baseline.
3. Take a fresh immutable saved-world pre snapshot.
4. Decode the copied Anvil snapshot and identify missing target chunks.
5. Generate only missing bounded chunks, one temporary tile at a time.
6. Remove each exact temporary tile in a `finally` path; never use `forceload remove all`.
7. Verify the force-load count exactly matches the initial baseline.
8. Take a fresh immutable post snapshot.
9. Run the full coverage, terrain, fluid, biome, structure, footprint, grade, map, and hash gates offline.

The bounded first-run generator is:

```bash
python3 scripts/generate_phase0_survey_chunks.py \
  --start <zero-based-tile-index> \
  --count <bounded-batch-size>
```

It requires the preserved 104-ticket baseline and refuses drift. Do not run it merely to reload chunks that are already full.

Generate the sealed rerun evidence from copied Anvil files only:

```bash
node --max-old-space-size=4096 \
  scripts/generate_combined_zones_phase0_survey.mjs \
  --regions data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region \
  --pre-regions data/worldsnap-combined-zones-phase0-rerun-pre-20260804T021237Z/region \
  --out-dir docs/masterplans/05-combined-zones
```

Rank candidate placements from an immutable copy with:

```bash
node --max-old-space-size=8192 \
  scripts/analyze_combined_zones_resiting.mjs \
  --regions data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region \
  --out docs/masterplans/05-combined-zones/resiting-candidate-analysis.json
```

Both Node scripts are offline and read-only with respect to Minecraft. They open copied region files and write local evidence only.

## Hard limits

- Phase 0 authorizes chunk generation only when required; it never authorizes block placement, excavation, grading, or construction.
- Never start a second fleet instance to survey the world.
- Never use `forceload remove all`; the 104 baseline tickets belong to existing systems.
- A copied overworld region package is not a live entity census.
- Structure-start records prove generated structure bounds, not present-day preservation or entrance safety.
- Terrain Y, water, biome, and cover results are constraints. They are not landing-safety or ownership claims.
- Phase 1 still requires exact current ownership/protected-feature audits, a live entity gate, detailed civil design, guarded forward/rollback packages, and route QA.

## Outputs

- [corridor-terrain-probe.json](corridor-terrain-probe.json) — natural samples plus the accepted sampled rail profile
- [phase0-survey-evidence.json](phase0-survey-evidence.json) — snapshots, coverage, censuses, structure bounds, gates, and artifact hashes
- [resiting-candidate-analysis.json](resiting-candidate-analysis.json) — exact dry-footprint and transform search
- [maps/current-plus-phase0-terrain.png](maps/current-plus-phase0-terrain.png) — raw one-block-per-pixel terrain
- [maps/current-plus-proposed-phase0-overlay.png](maps/current-plus-proposed-phase0-overlay.png) — current world and adopted revised layout
