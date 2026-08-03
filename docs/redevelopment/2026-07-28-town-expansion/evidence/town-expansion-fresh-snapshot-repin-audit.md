# Town expansion fresh-snapshot repin audit

**Decision:** `PASS_REGENERATE_EXACT_GUARDS_DO_NOT_BLIND_REPIN`

The full flushed prerelease snapshot is
`data/worldsnap-town-expansion-prerelease-20260728T0930Z/region`,
SHA-256
`f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e`,
with 26 region files. This audit was entirely offline and did not mutate the
live world, services, configuration, or databases.

## Exact comparison

The prior combined package had 3,642,911 unique targets. Regeneration from the
fresh snapshot has 3,642,910. Across the union:

- Desired post-state differences: **0**
- Scope-ownership differences: **0**
- Fresh-only targets: **0**
- Source-guard differences: **22**
- Already-satisfied target dropped: **1**
- Guarded commands: 1,660 in both packages; **1** command changed

The 22 guard changes are bounded runtime drift: seven H07 garage surface cells,
two open door halves at Guest Services, ten naturally oxidized copper cells in
the observatory estate, one removed short-grass cell, one dirt-to-grass surface
cell, and one Manager Vale dirt-to-grass surface cell. The dropped cell is
already air, which is its desired state.

No C01 or CBE target guard changed. Their shared target region
`r.1.-1.mca` is byte-for-byte unchanged.

## Protected source state

Manager Vale still has all 41 scheduled block entities and all source block
states match. One chest at `(-48,68,-378)` changed from 31 to 30 oak logs. Its
typed-NBT hash changed from
`523a4f1f560579f9514027667a2803998e13dfd8e5c6afc2b4e7fc5e2bd0805a`
to
`ecee288d7adfdb63fec3d7c14074f56ff714b276639d53c6fa7038216dd74563`.
The fresh ledger must therefore be regenerated; copying the old 31-log payload
would be incorrect.

All 1,896 C01 source block entities are present and all typed-NBT hashes still
match the pinned ledger. All 1,619 moved entries retain their exact source block
state. The only C01 state drift is retained entry 1870 at `(207,122,140)`, where
a daylight detector's dynamic power changed from 8 to 11. It is not moved or
retired.

## Pin policy

Every operational pin was classified by role. The shared generator default,
Manager Vale hard hash, Manager Vale schedule evidence, independent QA, focused
tests, and workflow documentation now point to the fresh snapshot. C01's
`d05ac782...` coordinate-survey record, `e612...` classification survey, and
`f8edf994...` source-NBT ledger remain historical evidence; none is used to
override fresh release guards. CBE's main/annex and Iowa schedule pins likewise
remain historical design/survey evidence. C01 and CBE both passed fresh-snapshot
model audits, and neither had a target-state difference.

The safe release procedure is:

1. Pin the shared release generator and Manager Vale compiler/schedule to the
   fresh snapshot.
2. Regenerate every exact guard and the Manager Vale NBT ledger.
3. Keep C01's immutable historical source-migration ledger pinned; its contents
   were independently reconciled to the fresh snapshot.
4. Keep C01/CBE historical design-survey evidence as historical evidence. The
   combined release report records the fresh snapshot as its exact release
   source.
5. Re-run independent Manager Vale, C01, CBE, cross-scope, rollback, and focused
   test gates.

The regenerated combined package has 3,642,910 guarded targets in 473,859
operation groups, zero protected-target block entities, and zero unreviewed
global interfaces. Manager Vale passed 16/16 independent checks and
37,584/37,584 exact-source preflight guards. C01 passed all 30 model checks,
CBE passed all 11 model checks, and the focused suites passed 12/12 tests.

The machine-readable coordinate/state evidence is in
`town-expansion-fresh-snapshot-repin-audit.json`. Offline PASS does not
authorize live execution.
