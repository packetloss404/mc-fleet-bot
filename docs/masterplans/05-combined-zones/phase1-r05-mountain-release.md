# Combined Zones CZ-R05: FM-01 mountain — EXECUTED

**Status:** EXECUTED_VERIFIED_14684824_CELLS_0_FAILURES
**Manifest identity:** `854603ddcd740480f83ecc27bc51a94748eaf5e1659cc287b2a43dc24c9a00eb`

The FM-01 future mountain stands: **14,684,824 cells** (the reshaped composite
domain with the accepted south-open shipwreck toe), executed 2026-08-07
~01:2x UTC in two guarded packages, 373,605 strict-noop commands total:

- **b10-bulk**: 187,696 commands / 14,498,915 stone cells — 0 failures, 320 s.
- **b10-finish**: 185,909 commands / 185,909 designed-surface cells
  (smooth_stone below y130: 75,490; polished_diorite y130+: 110,419) —
  0 failures, 294 s.

## Humane clearance (fresh G13, twice)

38 animals (32 rabbits, 6 polar bears) found inside the footprint were
relocated with `spreadplayers` onto natural terrain west of the mountain
(centre 1900,-820) before the bulk run; one returning rabbit was relocated
again before the finish run; both executions started against a 0-blocker
gate. Only the blockers' 19 chunks were temporarily force-loaded and all were
released; the 104-chunk operator baseline was verified intact.

## Gates

G08 double-compile byte-identity (15.2 s per full compile); G10 bound save
`20260807T001212Z` (`d0aa5693…`); G11 preflights 187,696/187,696 and
185,909/185,909; G12 strict dry-runs all four files; T02
`PASS_EXACT_RESHAPED_DOMAIN_PARTITION_DISJOINT_PACKAGES_ZERO_CORE_AND_R02_OVERLAP_ONE_OWNER_BOUND`
(full re-derivation, per-line inverse proof, finish cells proven exactly on
the design surface); G13 fresh entity gates; G14 hash-bound authorization
`96e47bcf1ee4a24e…`. **G09 substitution disclosed**: the generic manifest QA
tool OOMs materializing 14.5M per-cell entries on this 15GB host; T02 covers
every G09 check at interval granularity, and the substitution is recorded in
the authorization record.

## Verification highlights

Every derived identity reproduced a committed one before compilation:
baseline interval manifest `ed958376…`, reshape columns `26729597…` (2,432
columns / 83,729 cells), reshaped solid manifest `78eda919…`, design surface
`43dfce5f…`, composite payload `94eb21c4…`. Zero ops in the shipwreck
no-build columns, zero intersection with the three relic cores and all
17,380 R02 cells. 203 `cave_air` pockets were entombed per-cell (they cannot
be boxed over by `replace minecraft:air strict`).

## Reversibility

Post save `data/worldsnap-combined-zones-complete-save-20260807T013748Z`;
both rollback files preflight against it (see the post-preflight reports) and
the sealed pre-build save remains the disaster-recovery restore source.

## Unblocked by this release

The parked R03 tunnels (B03 J-curve, B08 service tunnel) can now be re-bound
against the post-mountain save and bored; the B09 funicular east-face
envelope now has its mountain; D05 hydrology/relic buffers are in their
designed context.
