# Phase 1 D02 C1 civil sole-authority packet

**Status:** HOLD_D02_NOT_RESOLVED_NO_WORLD_EDITS  
**Generated:** 2026-08-04T21:45:58Z  
**Immutable evidence snapshot:** `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`

You are the sole human authority. No additional decision-maker is required. This packet gives conservative defaults and turns the remaining technical work into bounded, read-only surveys and deterministic checks. It does **not** accept a choice on your behalf, resolve D02, authorize R00, or authorize a world edit.

## Recommended decision now

Accept the exact R140/R120/R140 integer raster as the controlling C1 alignment. Keep the authored `1:16→1:12→1:8→1:6→1:8→1:12→1:16` staircase only as a non-controlling surface-detail rhythm. This preserves the hash-bound centerline and empty rail strip while allowing later visual detailing. No field survey is needed for this subjective choice.

## Six D02 acceptances

| Blocker | Readiness | Conservative default | What is still needed |
|---|---|---|---|
| D02-B01 | HOLD_READ_ONLY_FIELD_SURVEY_REQUIRED | Use Minecraft-domain fail-closed ground rules: no unsupported blind excavation, no terrain-strength or groundwater assumption, no bulk fill across fluid or void components, and no foundation type until the full-height influence census selects a hash-bound bridge, retained cut, tunnel, culvert, embankment, or at-grade treatment. | D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS |
| D02-B02 | HOLD_READ_ONLY_FIELD_SURVEY_AND_DESIGN_CHECK_REQUIRED | Treat structure as Minecraft geometry rather than a real-world code claim: keep the complete offsets -30..-18 rail strip empty, clear-span every crossing, assume no load-transfer permission over C01, use no pier/abutment/utility/drainage cell inside protected strips, and reject any option lacking deterministic headroom, support-shell, collision, route, and independent recomputation checks. | D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS, D02-S02-C01-ISSUE-002-INTERFACE-SURVEY |
| D02-B03 | HOLD_READ_ONLY_FIELD_SURVEY_REQUIRED | Preserve existing fluid components by default: keep road and rail collection separate, permit no bulk diversion or unowned discharge, prefer clear-span/culvert continuity over fill, and accept no outfall until its exact path, receiving component, erosion treatment, owner, and no-adverse-diversion check are hash-bound. | D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS, D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY |
| D02-B04 | HOLD_AUTHORITATIVE_READ_ONLY_FIELD_SURVEY_REQUIRED | Make C01 default-deny: preserve every catalogued C01 volume plus the exact C1 overlap/influence cells, infer no relocation, recovered parking, road, entrance, load capacity, or permission, and assign no construction ownership across the seam until ISSUE-002 is resolved from a current complete read-only survey. | D02-S02-C01-ISSUE-002-INTERFACE-SURVEY |
| D02-B05 | READY_FOR_SOLE_AUTHORITY_VISUAL_ACCEPTANCE_FROM_CURRENT_EVIDENCE | Accept the R140/R120/R140 exact-radius integer raster as the controlling C1 centerline. Retain the authored 1:16→1:12→1:8→1:6→1:8→1:12→1:16 sequence as a non-controlling surface-detail rhythm that may be fitted inside the frozen reservation without moving the centerline or rail strip. | Explicit sole-authority visual acceptance only |
| D02-B06 | HOLD_ACCEPTED_TYPOLOGIES_AND_DETERMINISTIC_TAKEOFF_REQUIRED | Use the present prismatic quantities only to compare options. Give no spoil-reuse, bulking, unsuitable-material, borrow, disposal, or terrain-balancing credit until exact design cells exist; then require a byte-reproducible one-owner takeoff and use the conservative no-credit mass-haul balance for planning. | D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS, D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY, D02-S04-OPTION-SPECIFIC-QUANTITY-TAKEOFF |

## What the current world evidence proves

- Exact C1 reference setout: 1,216 points, hash `34fb2d5b349c71421ce2959a4dc0b090f0ab2df139d06ac9d42ff71e3c39f48b`.
- Exact rail profile: Y63..Y114, maximum grade 0.125.
- Independent highway profile: Y63..Y107, maximum grade 0.083333.
- Exact 56-block reservation, 80-block land take, empty 13-block rail strip, surface-derived treatment runs, and diagnostic quantities.
- Exact plan-gap or overlap comparisons for every catalogued C01 interface.

It does not prove the full subsurface/influence volume, current C01 conditions under ISSUE-002, accepted structural typologies, fluid/outfall behavior after grading, or construction quantities.

## Read-only survey program

### D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS

**Status:** REQUIRED_NOT_YET_PERFORMED  
**Mode:** READ_ONLY_IMMUTABLE_COPIED_SAVE

Replace surface-only assumptions with exact terrain, fluid, block-entity, generated-structure, and void evidence below and beside the complete C1 land take.

Minimum scope:

- Every plan column in the hash-bound 80-block total land take, full world height Y=-64..319.
- A deterministic one-chunk horizontal influence halo around that column union.
- Block states, waterlogged properties, fluid connectivity, block entities, POI records, generated-structure starts, and missing/unreadable chunks.

Required outputs:

- immutable full-save identity including region, entities, poi, and level.dat
- exact surveyed-cell and influence-cell hashes
- fluid-component and protected-feature collision registers
- candidate-specific cut, fill, foundation, retaining, tunnel, bridge, and culvert constraint sets

### D02-S02-C01-ISSUE-002-INTERFACE-SURVEY

**Status:** REQUIRED_NOT_YET_PERFORMED  
**Mode:** READ_ONLY_CURRENT_FULL_SAVE_AND_CATALOG_RECONCILIATION

Establish the current C01 east-stack, owner-tunnel, road, parking, entrance, and surface conditions that catalog geometry cannot prove.

Minimum scope:

- All eight C01 features compared by the civil artifact and the complete C1 overlap/influence columns.
- ISSUE-002 road, parking-recovery, relocation, and sunken-entrance assertions.
- Present block states, block entities, protected inventory, entities/POI, usable interfaces, exact exclusion cells, and current canonical ownership.

Required outputs:

- immutable current full-save identity
- exact C01 feature and interface cell-set hashes
- ISSUE-002 finding-by-finding disposition without inferred relocation or recovery
- sole-authority ownership and loading/exclusion acceptance record

### D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY

**Status:** REQUIRED_NOT_YET_PERFORMED  
**Mode:** READ_ONLY_IMMUTABLE_COPIED_SAVE_MODEL

Trace current fluid components and terrain fall before selecting any collection, culvert, bridge, erosion-control, or outfall solution.

Minimum scope:

- The D02-S01 land-take and influence cells.
- Every water/lava/waterlogged component touching that scope and every candidate discharge path to a stable receiving component.
- The frozen road south-drain and rail north-cess collection geometry.

Required outputs:

- exact component and catchment hashes
- no-diversion/no-unowned-discharge proof for the selected option
- capacity assumptions stated as Minecraft-domain design rules
- sole-authority outfall owner and preservation acceptance record

### D02-S04-OPTION-SPECIFIC-QUANTITY-TAKEOFF

**Status:** WAITING_ON_S01_S03_AND_ACCEPTED_TYPOLOGIES  
**Mode:** DETERMINISTIC_OFFLINE_COMPILATION

Convert accepted exact formation, structure, slope, unsuitable-material, drainage, and exclusion rules into construction quantities and a mass-haul schedule.

Minimum scope:

- Every selected option-specific design cell and interaction cell, without creating release operations.
- Separate cut, fill, lining, structure, drainage, unsuitable, spoil, borrow, and protected/no-touch totals.

Required outputs:

- one-owner exact design-cell manifest
- deterministic quantities with component hashes and zero duplicate ownership
- conservative no-credit mass-haul balance and declared staging assumptions
- independent recomputation with byte-identical totals

## Autonomous sequence

1. Generate D02-S01 full-height C1 world census from a complete immutable copied save.
2. Generate D02-S02 C01/ISSUE-002 interface survey from the same complete save and catalog evidence.
3. Generate D02-S03 C1 hydrology/outfall candidate evidence.
4. Compile and independently check treatment options against the accepted fail-closed defaults.
5. Generate D02-S04 option-specific quantities only after exact typologies and design cells are selected.
6. Return one compact sole-authority acceptance sheet; keep D02 HOLD until every acceptance is explicit and hash-bound.

## Release boundary

D02 may close only from accepted pre-R00 design evidence. Source guards, operations, preflight, live clearance, authorization, the physical pilot, rollback, route QA, and post-state QA are later gates. R01 validates the accepted design after R00; it cannot resolve D02.
