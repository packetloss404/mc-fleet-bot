# MP10-RRCH-COMMITTEE-BRIDGE-01 — release record and retained offline provenance

Status: **AS-BUILT BOUNDED FUNCTIONAL REPAIR — 2026-08-26**

The retained `data/worldsnap-moot-upper-post-20260824T161200Z` snapshot shows
that the dry Committee Room's y=77 normal-walk graph splits into a 14-station
west component and a 27-station east component around the accepted table and
chairs. This is a circulation defect, not an invitation to replace existing
furnishings.

`scripts/compile_mp10_rrch_committee_bridge_01.mjs` compiles a 14-cell,
level polished-deepslate bridge deck at y=76, entirely within the owned
interior (`x=-91..-71`, `z=-366..-342`) and outside the x=-92 partition /
upper-spine boundary. Its virtual route has 20 y=77 stations from
`(-90,77,-357)` to `(-81,77,-357)`, two clear body blocks at every station,
and zero vertical transitions. It keeps the table, chairs, lectern, and
chiseled bookshelf untouched; the nearby lectern is explicitly retained as a
reviewed adjacent block-entity interface.

The source is historical as of 2026-08-26. Before any live release, recapture
the source and rerun the complete guarded kernel: source/rollback parser,
source and projected rollback preflights, fresh block-entity/protected-core
and live-entity gates, journalled execution, post capture, post rollback
preflight, and independent normal-walk route QA. A changed source state,
container, fluid, ownership boundary, or route result rejects this candidate.

## 2026-08-26 read-only re-survey — static safety hold

The compiler was strengthened to require and inspect a matching immutable
`entities/` plane across the exact target-plus-halo interaction set, in
addition to the retained-block and block-entity checks. The newest retained
Committee Room post source, `data/worldsnap-moot-upper-post-20260824T161200Z`,
contains only `region/`; it has no matching `entities/` directory. It therefore
cannot prove the saved-entity exclusion required even for offline static
readiness. The compiler now fails closed with the exact condition:

`immutable entities plane missing: data/worldsnap-moot-upper-post-20260824T161200Z/entities; cannot prove saved-entity clearance`

The 14 exact air-to-polished-deepslate guards, protected x=-92 partition,
retained furniture/lectern, zero-fluid halo, 20-station level virtual route,
strict parser, and source/projected inverse preflights previously passed on
the block plane; those checks do **not** override the missing immutable entity
evidence. An older complete-save snapshot is not a substitute: it fails the
projected route at `(-90,77,-362)` because its deck support is still air.
No MP10 operation is queued. A new complete current source with matching
`region/` and `entities/` data is the precise prerequisite.

## 2026-08-26 A03 complete-source revalidation

That prerequisite is now met by A03's complete source
`data/worldsnap-mp01-a03-passive-planning-bay-01-live-source-20260826T083000Z`
(region plus entities). The recompiled 14-cell package is **static-ready**,
not historical-only: zero saved entities, zero unreviewed block entities,
zero halo fluids, protected lectern/furniture retained, 20-station normal-walk
route pass, and 14/14 forward plus projected-rollback preflights. Its manifest
is `5f29fb9091b6c07eadf3e5bc31adfc47be355930521adccb32f7164da540e64c` and
status is `COMPILED_FROM_COMPLETE_FRESH_SOURCE_AWAITING_LIVE_KERNEL`. It still
requires the remaining same-moment live entity/protected gates, journalled
execution, post snapshot, rollback poststate, and independent route QA; it is
not executed while another release owns the capture lane.

## 2026-08-26 guarded release — accepted as-built repair

With the lane clear, a new sealed complete source was captured at
`data/worldsnap-mp10-committee-bridge-source-20260826T063859Z`; it contains
`region/`, `entities/`, `poi/`, and `level.dat` and has capture-manifest SHA-256
`d060255c85ca33d9792247274f29f05d35ba98fb23310cadfed248b0790077dc`.
The compiler emitted the 14 exact `minecraft:air` to
`minecraft:polished_deepslate` guards and inverse in
`data/buildops/mp10-rrch-committee-bridge-01-live-20260826T063859Z.*`.

Both strict parsers passed; forward and projected rollback preflights passed
`14/14`; the source block-entity gate had zero blockers; and the immediate live
entity gate returned zero entities in the target-plus-halo envelope. Strict,
journalled forward execution changed all 14 cells with zero no-ops. The sealed
post capture is `data/worldsnap-mp10-committee-bridge-post-20260826T064015Z`
(manifest SHA-256 `a35bcebf5d6e485d6dd6d3cc2e65971194e4d357eb9eae927adbff1b4f78015c`);
the exact rollback post-state preflight also passed `14/14`.

Independent post-state QA used the conservative route flooder rather than the
compiler projection. It reached every one of the 20 named, y=77 normal-walk
stations from `(-90,77,-357)` to `(-81,77,-357)` (109 standable cells reached;
two chunks read, none absent), with no jump, sprint, dig, swim, or climb.
The complete evidence index is
`data/world-review/mp10-rrch-committee-bridge-01-live-20260826T063859Z/release-ledger.json`.

This fixes only the contained Committee Room circulation defect. It does not
complete Ravensreach or RRCH-MOOT; certify the library spiral as accessible;
deploy the Ravensreach–MainStreet citizen configuration; or accept any public
egress, citywide route, or cross-area interface.
