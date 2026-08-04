# D05 conservative defaults for sole-authority review

Status: **RECOMMENDATION READY — D05, G02, G06, AND G07 REMAIN HOLD — OFFLINE ONLY**

This package converts the current immutable hydrology and protected-relic evidence into a conservative recommendation for the sole project authority. It does not accept its own recommendations, replace expert review, assign construction cells, emit operations, or authorize a world edit.

## What the copied snapshot proves

Bound post-snapshot: `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`.

| Family | Exact current cells | Coordinate-set SHA-256 |
|---|---:|---|
| water | 1,929,621 | `1c6e3d25121884eb4baba8da8f8713a014360643f78aa30686f8c9785127b04e` |
| lava | 85,088 | `6b414c16d0e5965d2c22c899a1fe2523de39f4564d775433745b983ba313ec18` |
| frozen | 182,791 | `c230a0ed3582c466736101c7c209dda071070645a2c81381408a8a3bc496a071` |
| snow | 359,830 | `0a0af937ba1634ace4d925341465dfa1b1f0a017332744341f9a2cb1a25f4c9b` |

There are 5,234 exact water components and 941 exact lava components. The D8 relation partitions 480,000 copied-surface columns, but remains a topographic candidate rather than rainfall, groundwater, snowmelt, erosion, or Minecraft-fluid simulation.

## Recommended relic policy

Adopt the exact recorded core plus exact one-cell Chebyshev shell as the **minimum planning exclusion**, not as an engineering safety distance.

| Relic | Current finding | Core cells | Shell cells | Recommended disposition |
|---|---|---:|---:|---|
| igloo-east | NO_PRESENT_CELLS_IN_DECLARED_BOUNDING_VOLUME | 280 | 350 | ABSENT_FABRIC_RECORDED_SITE_RESERVED_IN_PLACE |
| igloo-west | PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME | 280 | 350 | PRESENT_RELIC_PRESERVE_IN_PLACE_NO_PUBLIC_ACCESS_COMMISSIONED |
| shipwreck | PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME | 2,268 | 1,362 | PRESENT_RELIC_PRESERVE_IN_PLACE_NO_PUBLIC_ACCESS_COMMISSIONED |

The east igloo should be recorded as an **absent-fabric reserved site**. Preserve its generated-start record and planning exclusion, but do not reconstruct it, claim an exhibit, relocate it, remove it, or reuse the site. The west igloo and shipwreck remain preserve-in-place records with no observation access commissioned.

Any structural, groundwater, entrance, exhibit, support, or construction-influence extent outside the one-cell shell remains unknown and default-deny until it is expressed as an exact reviewed set.

## Recommended logical ownership

These are design-control roles, not additional human decision-makers and not current cell ownership.

| Logical control owner | Future responsibility | Precedence |
|---|---|---|
| `CZ05-PROTECTED-RELIC-CONTROL` | the three exact protected cores and minimum planning-exclusion shells | VETO_OVER_CONSTRUCTION_AND_HYDROLOGY_INTERACTION |
| `CZ05-MOUNTAIN-HYDROLOGY-CONTROL` | accepted current/future fluid, cryosphere, drainage, discharge, sump, retaining-water, erosion, dewatering, and hydrology-influence cell sets | VETO_OVER_UNCONTRACTED_CONSTRUCTION_INTERACTION |
| `CZ05-SCOPE-CONSTRUCTION-CONTROL` | only exact direct construction cells assigned to each compiled scope | MUST_YIELD_AT_RELIC_AND_HYDROLOGY_INTERFACES |

Every cell may have at most one canonical owner. Protected-relic control vetoes construction and hydrology interaction; hydrology control vetoes uncontracted fluid, cryosphere, drainage, sump, discharge, or influence interaction. Overlaps remain HOLD rather than being clipped or assigned last-writer-wins.

## Recommended future-state model

After the outstanding geometry choices close, compile `CZ05-FUTURE-MOUNTAIN-STATE-V1` as explicit, sorted, hash-bound cell sets for retained native solid, direct excavation/fill/liner/surface work, staging/access, hydrology and cryosphere interaction, dewatering/sump/drainage/discharge, groundwater/infiltration/erosion, and relic support/access influence. Unknown influence is never an empty set.

The conservative baseline is **zero undeclared change and no diversion**: change no current fluid or cryosphere cells; merge, split, expose, block, reroute, heat, freeze, create, or remove no component; and cross no boundary without an exact receiver contract. A necessary exception must be exact, owned, modelled, and separately accepted before D05 can resolve.

## Evidence still needed

- **D05-S01-RELIC-CONDITION-AND-ACCESS · READ_ONLY_SURVEY:** Review the west igloo and shipwreck beyond their start bounds for template condition, support, entrances, surrounding voids, and any possible observation route; independently confirm the east recorded site remains fabric-absent.
- **D05-S02-EXACT-FUTURE-MOUNTAIN-STATE · DEPENDENT_OFFLINE_DESIGN:** Compile the exact future terrain, excavation, fill, retaining, surface, staging, access, and influence sets after the eleven geometry choices and integer setout close.
- **D05-S03-HYDROLOGY-AND-GEOTECHNICAL-REVIEW · EXPERT_DESIGN_ACCEPTANCE:** Review the exact future model for groundwater, infiltration, snowmelt, erosion, dewatering, sumps, retaining loads, discharge receivers, relic support, and no-diversion accounting.
- **D05-S04-GLOBAL-EXACT-CLEARANCE · DEPENDENT_OFFLINE_AUDIT:** Intersect the final exact direct and influence sets with all accepted relic exclusions and all 50 relevant generated-structure starts.

The first survey is a read-only condition/access review. The remaining work depends on the future exact geometry and cannot be truthfully derived from the present bounded census.

## Gate boundary

- D05 remains **HOLD**.
- G02, G06, and G07 remain **HOLD**.
- Sole-authority acceptance and expert acceptance are not recorded by this generator.
- Exact future influence and construction cells do not yet exist.
- Operation cells: **0**.
- Material cells: **0**.
- World edit authorized: **no**.

Reproduce with:

```bash
node scripts/generate_combined_zones_d05_conservative_defaults.mjs
```
