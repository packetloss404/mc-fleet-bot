# MP02 B08 service spine — current-source release-readiness audit

**Status: DESIGN REVISION REQUIRED BEFORE FRESH CAPTURE OR RELEASE.** This is
a read-only engineering audit. It did not capture a save, query live entities,
run RCON, or modify the world.

The retained-source candidate is useful survey intake, but it is not a
releasable operation. Its 729-cell smooth-stone floor would overwrite ten
cells whose accepted R07C B08 route-opening release owns as retained air. A
fresh source capture is still required after the design is corrected, but it
cannot by itself resolve that ownership conflict.

The nearest available complete immutable source is
`data/worldsnap-rail-r10-high15-post-20260826T091700Z`, captured at
`2026-08-26T09:33:10.076Z` and sealed as complete-save SHA-256
`39a364013d3934b5fb560d563b09cf6b6902932e73cac23953bd3fe4b2f8385c`.
It contains the required B08 region, entity, and POI files and is suitable
for **read-only redesign compilation only**. It cannot substitute for the
new same-moment source required immediately before an execution.

## Candidate and required capture coverage

| Item | Exact value |
| --- | --- |
| Candidate target | 729 floor cells, `x=1948..2011`, `y=71..129`, `z=-689..-625`; coordinate-set SHA-256 `d00cafa6aa73797f61abba3d2e6897e08c399a6f5b20db74b9d3844edb8a318a` |
| Interaction envelope | 3,172 non-target halo cells; combined target/halo bounds `x=1947..2012`, `y=70..130`, `z=-690..-624`; halo SHA-256 `4cf38a9c7502ad5a4fb40bb42e8d6463ff75097fabb7ba8376ca16360346e685` |
| Minimum spatial evidence | Chunks `x=121..125`, `z=-44..-39` (30 chunks); therefore current `region/r.3.-2.mca` **and** `entities/r.3.-2.mca` must be present and sealed. A complete capture also requires `poi/` and `level.dat`; this is why the complete-save capture, not a loose region copy, is mandatory. |
| Retained west interface | Aperture `x=1947`, `y=72..75`, `z=-630..-625` remains air and is not an MP02 target. |
| Far exclusion | B03/B09 stays excluded: `x=2048..2062`, `y=129..134`, `z=-750..-746`. |
| Intended route acceptance | 123 stations from `(1947,72,-628)` to the index-121 landing, six-wide floor, two clear headroom blocks, cardinal unit steps and vertical delta at most one. It is a service spine/contact landing only—not a public, tenant, vehicle, egress, or B03/B09 connection. |

## Accepted-interface result

The nearest accepted B08 structure/interface evidence is the executed and
post-release-verified R07C recovery:

- `docs/masterplans/05-combined-zones/phase1-r07-b08-service-tunnel-cover-recovery.md`
- `data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.b08-cover-shell.forward.txt`
- `data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.b08-route-openings.forward.txt`

The candidate has **zero** direct target overlap with R07C's 5,252-cell cover
shell, but 1,318 cover cells lie in its interaction halo. That is an
interface-review obligation, not permission to edit the shell.

It has a **direct, incompatible 10-cell overlap** with R07C's 28 retained
route-opening targets. R07C's accepted final state is air; the MP02 candidate
would change each to smooth stone. The exact coordinate-set SHA-256 is
`7f6bc0df2e23a27b10a51dae149ae8917e2d8dbb00e5c61657959c272e2e1dac`:

```text
1948,71,-625  1948,71,-626  1948,71,-629
1949,72,-625  1949,72,-626
1950,73,-627  1950,73,-628  1950,73,-629
1951,74,-629  1951,74,-630
```

These cells must either remain air in a revised service-floor geometry, or be
the subject of a separately approved, reversible R07C interface migration
that preserves a normal-walk B08 route. No current ownership record delegates
that migration to this MP02 floor release. The compiler now reads the accepted
R07C route-opening operation and fails closed on this intersection; the
historical candidate's old "all air" source guard must not be mistaken for
unowned space.

The historical B08 compiler probe was deliberately stopped by that guard with
the ten coordinates above. It generated no package and made no world change.

## Release-readiness checklist after a redesigned geometry

1. **Design/interface gate — currently failing.** Replace the overlapping ten
   targets with a six-wide, normal-walk-safe geometry that has zero direct
   R07C route-opening overlap. Bind the revised coordinate set and its
   interface/halo relation to the R07C cover and openings artifacts. Re-run
   the compiler against a read-only source before requesting a capture.
2. **Fresh complete source.** With the live lane authorized, use a unique
   destination (never the historical R08AM tree):

   ```bash
   python3 scripts/capture_combined_zones_complete_save.py --execute \
     --dest data/worldsnap-mp02-b08-service-spine-source-<UTC> \
     --world-identity packetcraft-paper-overworld
   node scripts/audit_combined_zones_complete_save.mjs \
     --world-root data/worldsnap-mp02-b08-service-spine-source-<UTC> \
     --out data/world-review/mp02-b08-service-spine-live-<UTC>/source-intake.json \
     --markdown data/world-review/mp02-b08-service-spine-live-<UTC>/source-intake.md
   ```

   Require the audit's complete-save PASS and verify the exact B08 chunk files
   above occur in the sealed inventory. Missing `region`, `entities`, `poi`,
   `level.dat`, capture manifest, or either `r.3.-2.mca` member is a hard
   source-input failure for this scope.
3. **Fresh source-bound compilation.** Compile only the revised geometry using
   `--snapshot` set to that new world root and `--source-class current`. The
   compiler must prove exact source air, two-block headroom, dry/forbidden-free
   target and halo, saved block-entity/entity clearance, aperture retention,
   B03/B09 exclusion, zero accepted-interface collision, and the normal-walk
   route.
4. **Static operation checks.** Run strict parser dry-runs for forward and
   rollback and source/projected-inverse preflights; the projected rollback is
   evaluated with the forward operation as the source overlay:

   ```bash
   python3 scripts/rcon_runner.py <forward.txt> --dry-run --strict-noop \
     --operation-role forward --report <forward-parser.json>
   python3 scripts/rcon_runner.py <rollback.txt> --dry-run --strict-noop \
     --operation-role rollback --report <rollback-parser.json>
   node scripts/preflight_guarded_ops.mjs <forward.txt> --regions <source>/region \
     --report <forward-source-preflight.json>
   node scripts/preflight_guarded_ops.mjs <rollback.txt> --regions <source>/region \
     --source-overlay-ops <forward.txt> --report <projected-rollback-preflight.json>
   ```

5. **Same-moment live clearance.** Run the saved-source block-entity/container
   audit supplied by the compiler and then a live entity gate against the exact
   revised forward set:

   ```bash
   python3 scripts/redevelopment_live_entity_gate.py --ops <forward.txt> \
     --capture-blocker-nbt --chunk-batch-size 64 --report <live-entity-gate.json>
   ```

   Any entity, container/block entity, protected core, rail/control, fluid,
   or source-state drift in the exact target/halo stops only this release.
6. **Execution and closeout (only after all prior gates pass).** Strict,
   journalled forward execution; fresh immutable post capture and intake;
   independent exact target/halo/aperture/exclusion plus 123-station no-jump
   route QA; then exact rollback post-state preflight. Record the resulting
   source/post identities, operation hashes, journal, QA, and civil-only
   nonclaims in the MP02 register.

## Inputs presently missing or insufficient

- A revised, owner-safe floor geometry for the ten R07C route-opening cells.
  This is the immediate release blocker; without it, a fresh capture must not
  be requested for this candidate.
- A new sealed same-moment complete world source. The existing
  `data/worldsnap-r08am-post-20260822T161818Z` evidence is explicitly
  historical-only and cannot satisfy live source, current entities, or current
  block-entity/container clearance.
- Following redesign, fresh confirmation of the 1,318-cell R07C cover-halo
  interface, west-aperture handoff, and B03/B09 exclusion ownership. The
  historical facts establish boundaries, not current operational permission.

No release claim is made by this audit.
