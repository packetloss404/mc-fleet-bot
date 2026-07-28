# Town Expansion R1 Database Closeout

Status: `PASS_DATABASE_IMPORTED_AND_CENSUS_VERIFIED`

This is the database boundary for the accepted Town Expansion R1 release and
its ordered supplemental chain. The guarded importer committed the accepted
registry to `data/world-map.db`; it did not mutate the live world. The
independent publication census then reopened the database read-only and passed
every object, relationship, observation, media, integrity, and foreign-key
gate.

The accepted commit report is:

`data/world-review/town-expansion-r1-database-closeout-2026-07-28.json`

The independent publication report is:

`data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json`

The database SHA-256 after commit is
`71876a7ecf73e90475a9b5047938e14f39ea0a20381dea8c5286582059f95f8a`.
The pre-import database and WAL sidecars are preserved under
`data/backups/world-map-town-expansion-preimport-20260728T211037376Z.db*`.

## Canonical registry

The importer consumes:

`data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json`

Its normative shape is:

`docs/redevelopment/2026-07-28-town-expansion/town-expansion-database-registry.schema.json`

Counts are dynamic and must equal the registry arrays. The accepted registry
contains 340 exact objects, 1,178 declared capture files, and 13 map pairs.
Those figures are not hard-coded into the importer.

Each imported object must provide its exact external ID, bounds, source
provenance, requested state, physical as-built claim, database lookup contract,
and paired media IDs. Map-only IDs are evidence, not database features.
Relationships come only from explicit `parentExternalId` values; filenames,
names, proximity, and overlapping bounds never fabricate a relationship.

## Fail-closed evidence gates

The guarded importer refuses to continue unless all of the following agree:

- The canonical registry and generator/design report.
- The exact forward operation package.
- A committed, strict-noop, one-package atomic transaction.
- A byte-for-byte matching immutable post-release Anvil snapshot.
- A `PASS` and `ACCEPTED` post-release QA report with all eight required gates.
- A final `PASS` media QA report tied to that registry, forward package, and
  post snapshot.
- Every declared pass-one/pass-two image, including file hash, dimensions,
  camera geometry, shot ID, object ID, evidence pass, and distinct output file.
- A structurally compatible, integrity-clean, foreign-key-clean database.

An object with `plannedOnly: true` is refused. A future program may be imported
only when the registry certifies an actually built marker, wall, construction
staging treatment, or reserved-parcel treatment. Its database attributes retain
the future program state and explicitly state that the broader requested
program is not complete.

## Accepted dry-run

Run this only after the final post-release snapshot, transaction ledger, media
QA, and post-release QA exist:

```bash
node scripts/import_town_expansion_release.mjs \
  --qa data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json \
  --post <accepted-immutable-post-region-directory> \
  --transaction <committed-town-expansion-transaction-ledger.json> \
  --media-report data/world-review/town-expansion-r1-post-release-media-2026-07-28.json \
  --out data/world-review/town-expansion-r1-database-closeout-2026-07-28.json
```

Dry-run is the default. The accepted dry-run report is
`data/world-review/town-expansion-r1-database-closeout-dry-run-2026-07-28.json`.
It opened the database read-only and emitted
`PASS_DRY_RUN`, the exact pre-import database hash, the evidence hashes, and
the create/update plan. It does not create a backup or write database rows.

## Committed transaction

Only after reviewing a successful dry-run may an operator repeat the command
with both:

```text
--commit --expected-db-sha256 <database.sha256 from that dry-run>
```

The importer rechecks the database hash, creates an integrity-checked SQLite
backup, and upserts all features, one deterministic accepted scan, and one
observation per object inside one `IMMEDIATE` transaction. Any exception rolls
back every logical row. Commit success is
`PASS_DATABASE_IMPORTED`; idempotent repetition updates the same exact feature,
scan, and observation identities.

The commit inserted 340 features, one deterministic accepted scan, and 340
observations inside one immediate transaction. Database counts advanced from
875 to 1,215 features, 23 to 24 scans, and 1,881 to 2,221 observations. The
closeout report exposes:

- `evidence.postSnapshotSha256`
- `evidence.forwardSha256`
- `evidence.crosswalkSha256`
- `evidence.mediaQaSha256`
- `evidence.postReleaseQaSha256`
- `evidence.transactionSha256`
- `database.sha256` and database integrity/foreign-key results

## Read-only publication census

After a successful import, generate the independent registry-to-database census:

```bash
node scripts/report_town_expansion_database.mjs \
  --registry data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json \
  --database data/world-map.db \
  --out data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json
```

It is read-only. The accepted census reports exactly one deterministic scan,
340 features, 340 observations, and 1,152 exact media relations. `PASS`
requires exactly one accepted deterministic scan, every
registry object and observation, no extra project features, exact explicit
parents, complete requested-versus-as-built truth, complete exact media
relations, a common evidence chain, and clean SQLite integrity/foreign keys.
It publishes the same evidence hash aliases plus `database.sha256`.

The first census attempt failed closed because it required in-registry parent
external IDs to be globally unique across historical projects. That rejected
report is preserved at
`data/world-review/town-expansion-r1-database-publication-report-parent-scope-contract-fail-20260728T2110Z.json`.
The corrected census scopes in-registry parents to the accepted project and
requires global uniqueness only for declared external parents.

## Verification

The isolated fixture suite exercises dry-run immutability, commit, idempotent
upsert, exact media relations, independent database census, injected
mid-transaction rollback, planned-only refusal, and media-hash drift refusal:

```bash
npx vitest run test/build/importTownExpansionRelease.test.ts
```

The test database, snapshots, transaction, registry, QA, and media files are all
temporary fixtures. The suite does not mutate the live world or live database.
