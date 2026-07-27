# MainStreet America parking recovery — 2026-07-26

## Result

Parking, Arrival Gardens, the south-gate approach, and arena-to-hangar wayfinding
are built and verified. This record separates historical facts, old execution
claims, the snapshot-observed defect, the recovery that actually ran, and the
acceptance evidence.

| Measure | Final |
|---|---:|
| Individually defined spaces | 236 |
| Standard / accessible / EV / premium | 205 / 8 / 14 / 9 |
| Nine-block drive aisles | 3 |
| Dual-head poles / flush lights | 23 / 32 |
| Solar-style EV canopies | 2 |
| Executed commands | 1,466 / 1,466 successful |
| Unique final desired cells | 41,809 |
| Snapshot matches | 41,809 / 41,809 |
| Protected-volume changes | 0 / 3 |
| Reachability targets | 8 / 8 |
| Campus audit | 66 pass / 0 fail / 0 unknown |

## Provenance correction

The old record did not prove a completed parking system.

- `references/manifest.yaml` and the references README support the historical
  approximately 100,000-square-foot field and the Colliers count of 236 spaces.
  A secondary 258-space count remains a documented source conflict.
- `planning/site-plan.md` and `qa/as-built-survey.md` record the collision that
  moved the Minecraft slab to x `[-125,125]`, z `[172,268]`. The 2026-07-24
  addendum explicitly says the individual bays were not striped and forbids
  claiming 236 built spaces.
- A later 2026-07-24 “surface complete / open defects none” statement was too
  broad. It did not retract the parking caveat and had no reproducible parking
  operations file.
- The 51-check and 56-check 2026-07-26 audits had no parking group. They could
  not certify capacity, lighting, accessibility, gardens, or gate access.
- The refreshed pre-recovery snapshot found 21,509 light-gray surface cells and
  only three full-width white bands. It also proved the drive stopped at z268
  against terrain while the south gate stood around y78 at z305.

The original build cause cannot be reconstructed. The host's two-vCPU limit and
task timeout/cancellation behavior are real operating context, but no
feature-level record proves they caused this specific loss. The concrete evidence
is an observability gap, an old oversized `/fill` failure elsewhere in the MSA
history, and missing execution artifacts. This document therefore does not turn
the vCPU explanation into an unsupported fact.

## What ran

| Artifact | Purpose | Result | SHA-256 |
|---|---|---:|---|
| `data/buildops/mainstreet-parking-arrival-gardens-2026-07-26.txt` | bays, aisles, gardens, court, lamps, canopies, terraced cut | 1,354 / 1,354 | `2627dd74b15a733710032b765145e2e49f9797da452e62576b970901102177f9` |
| `data/buildops/mainstreet-parking-access-wayfinding-phase8b-2026-07-26.txt` | full gate width, shared accessible aisles, full-depth premium row, rain garden, hangar route | 84 / 84 | `11bcec12661618e57386bc4f9c36917ab2d5f8eeb39464def4034c82842fe22a` |
| `data/buildops/mainstreet-parking-low-lighting-phase8c-2026-07-26.txt` | flush lights between pole intervals and along the axial walk | 28 / 28 | `561bb3113c1cb1d384d59c8f350c58b814cd83b0bbe3adcb6f4916f60e115b6a` |

The south approach is a deliberately reviewed excavation, not a cosmetic
surface pass. The natural wall rises roughly 13–16 blocks immediately behind the
lot. The build opens a daylighted, 21-wide terraced approach from floor y64 at
z268 to floor y78 at z305, with a thirteen-wide carriageway, paired three-wide
walks, retained and planted sides, three lit copper arches, and the original
fence piers preserved at x±11.

The proposed full-width garden spines were rejected because cutting them through
the six parking bands would erase the capacity being reconstructed. The executed
composition divides the field with paired center gardens, crosswalks, perimeter
walks, the southeast rain garden, Discovery Court, canopy rooms, pole rhythm, and
flush lighting while retaining all 236 bays.

## Acceptance evidence

The pre-build snapshot is retained under
`data/worldsnap-parking-before/region`. The post-build scan uses
`data/worldsnap/region`; its relevant `r.0.0.mca` hash is
`b7736553eeb766760580c31165e9db26bb7bf3e991fe6600e5619d455b8c9c3d`.

- Both operation files sampled by `verify_ops.py` passed 20/20 before the final
  low-light phase; the merged desired-state comparison then passed all
  41,809/41,809 final cells.
- Before/after whole-volume diffs are zero for the Guest Center
  x `[-72,72]`/z `[90,176]`, mountain public-entry buffer
  x `[96,125]`/z `[168,239]`, and billboard x `[84,106]`/z `[267,278]`.
- The south gate, lot, Guest Center, west and east accessible pods, Discovery
  Court, mountain portal, hangar, and arena are one connected walkability flood.
- The sampled aisle/axial-light maximum is 11.18 blocks, below the 12-block gate.
- `audits/mainstreet-america.yaml` now includes ten parking/wayfinding
  regressions. `qa/audit-post-parking-2026-07-26.json` records 66/66.

Visual evidence:

- `qa/msa-parking-bluemap-overview-after.png`
- `qa/msa-parking-bluemap-arrival-after.png`
- `qa/msa-parking-bluemap-night-after.png`

The EV canopies are described as **solar-style**, not power-producing. The exact
bay geometry, accessible layout, Arrival Gardens, Festival Row, Discovery Court,
and canopy design are creative reconstruction. Only the approximate historical
area and 236-space count are source-grounded facts.

## First-class world map records

`scripts/import_mainstreet_parking.js` promoted P01 and imported the verified
geometry into `data/world-map.db`:

- P01 is complete at revisioned condition 100 with the count, classifications,
  hashes, connectivity results, and creative/verified ledger;
- 236 individual bay child records;
- six aisle segments, six crossings, two accessible pods;
- carriage and two pedestrian arrival paths;
- 23 pole lights and 32 flush lights;
- two canopies, four gardens, Discovery Court, bicycle corral, and three arches;
- a C01 child route for the illuminated arena-to-hangar ribbon.

The import produced 320 feature updates, 319 P01 children, and completed scan
`wsc_9b65b3830e226db9` with 321 observations. The live API returns all 236 bays,
55 lighting records, and P01 as complete.

## Residual work outside this recovery

This recovery closes P01 and the reported hangar-finding problem. It does not
close:

- full-property WorldGuard build protection; the active region still covers
  only the narrower developed band, and opped builders bypass build denial;
- L01 detention-pond landscape/safety-edge refinement;
- L02 monument-specific frontage landscaping beyond its preserved structure;
- the separate `walkways`, `ravensgate`, and `farms` regressions outside this
  campus audit;
- broader staged coordinate documentation not touched by the parking repoint.
