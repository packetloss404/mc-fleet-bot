# MP02 B08 restricted chamber / dry receiver 01 — executed release record

**State:** `AS_BUILT_POST_VERIFIED_WITH_SOURCE_BOUND_PRESERVATION_REMEDIATION`  
**Physical status:** executed with no B03/B09 opening, rail/control, or public-access commissioning.

## Bounded package

The exact source-bound candidate converts a finite B08 segment into a restricted
SubTropolis controlled-entry and crew-recovery chamber. It contains:

- a `6×9×5` chamber interior at `x=2006..2011`, `y=129..133`,
  `z=-750..-742`;
- a 125-cell dry containment receiver: 89-cell outer liner, a 27-cell core,
  and nine sealed inlet cells; it has no passive or automated fluid outfall;
- a 608-cell vertical shaft overflow/fire collar, preserving the backed
  one-cell ladder while preventing a route around a failed north boundary;
- an east 15-cell isolation bulkhead that stays 37 blocks west of the B03
  aperture, a roof, and a 42-cell north fire boundary with a normal-open
  three-wide controlled door set.

The release contains **835** exact forward operations across seven ordered
packages, with an exact reverse inverse. The 1,362-cell target halo had zero
fluid, waterlogged, gravity, stored block-entity, or saved movable-entity
hazards in its immutable source.

## Functional projection

Projected source-state QA passes six checks:

1. Normal chamber → north accepted B08 handoff.
2. Normal chamber → shaft → guarded surface landing.
3. A closed north boundary stops the north route.
4. That same north-boundary failure retains the shaft return.
5. A blocked shaft retains the north return.
6. That shaft failure stops only the shaft return.

The source and projected package retain all 20 B03 aperture cells as air, all
12 B09 cap cells as polished diorite, and all 19 B09 guideway/control cells
outside the target set.

## Executed kernel and post evidence

The dedicated fresh-kernel wrapper rebound the package on its immediate source,
then executed the ordered package after live entity clearance. Its post capture
and rollback-poststate preflights passed. The original full QA correctly
fail-closed because the executed manifest retained the 19-cell B09 coordinate
identity/census but omitted the per-cell source-state list. The immutable
transaction source was separately bound to the same manifest and post capture;
its reconstructed B09 states match post exactly. The full independent QA then
passed `835/835` targets, six route checks, B03 `20/20`, B09 cap `12/12`, and
B09 guideway/control `19/19`.

The release entrypoint remains:

```bash
node scripts/run_mp02_b08_restricted_chamber_dry_receiver_release.mjs \
  --source-snapshot-root <fresh-complete-immutable-source> \
  --out-dir <fresh-evidence-directory>
```

Without `--execute`, it remains prepare-only and has no mutation authority;
future release attempts must still pass its full immediate-capture kernel.

If any fresh source cell or halo contains water or lava, stop this package and
first compile that exact finite component’s sealed, supported, flow-ordered
containment. No B03/B09 opening or automated drainage discharge is in scope.

Artifacts:

- [Feasibility record](../../../data/world-review/mp02-b08-integrated-chamber-receiver-feasibility-20260827T015500Z/MP02-B08-INTEGRATED-CHAMBER-RECEIVER-FEASIBILITY-01.md)
- [Static manifest](../../../data/buildops/mp02-b08-restricted-chamber-dry-receiver-01.release-manifest.json)
- [Projected functional QA](../../../data/world-review/mp02-b08-restricted-chamber-dry-receiver-static-20260827T015500Z/projected-functional-qa.json)
- [Fresh-kernel evidence ledger](../../../data/world-review/mp02-b08-restricted-chamber-dry-receiver-prepared-20260827T020500Z/fresh-kernel-ledger.json)
- [Executed transaction ledger](../../../data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z/fresh-kernel-ledger.json)
- [Source-bound preservation remediation](../../../data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z/post-qa-preservation-remediation-acceptance-ledger.json)
- [Independent post QA](../../../data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z/independent-post-release-qa-remediated.json)
