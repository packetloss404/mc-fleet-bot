# Report recipes

Recipes are YAML files under `recipes/`. They describe what a report needs, not
where a particular server keeps its data.

```yaml
version: 1
id: world-catalog
name: World Database Catalog
description: Snapshot identity, read-only SQLite census, features, and HTML.
parameters:
  limit:
    type: integer
    description: Maximum world_features rows to export (1 to 1,000,000).
    required: false
    min: 1
    max: 1000000
steps:
  - id: snapshot
    type: snapshot-summary
  - id: database
    type: database-catalog
    options:
      database: world
  - id: features
    type: world-features
    options:
      database: world
  - id: report
    type: html-report
    options:
      title: World Database Catalog
```

## Available steps

### `snapshot-summary`

Hashes sorted `.mca` filenames and bytes with the established
`filename + NUL + bytes + NUL` algorithm. It also reports region extent,
declared chunks, member hashes, modification times, and byte sizes. Results
are cached by snapshot path.

### `snapshot-diff`

Compares the registered snapshot of the report's primary world against the
snapshot of another world on the same server. Reports per-region classifications
of `added` (in the comparison world, not the baseline), `removed` (in the
baseline, not the comparison), and `changed` (in both with different SHA-256),
plus the unchanged count and both aggregate snapshot identities. Requires the
`other` recipe parameter naming the comparison world.

### `block-census`

Decodes copied Anvil chunk sections and counts full block-state labels. The
recipe may declare a `bounds` parameter, supplied as six inclusive coordinates.
Decoder errors remain visible and make the census `complete: false`. Emits a
per-region progress event so the dashboard can show a percent-complete label
on long runs.

### `database-catalog`

Opens a registered SQLite database with `readonly`, `fileMustExist`, and
`query_only`. Enables `defaultSafeIntegers` so INTEGER columns that exceed
`Number.MAX_SAFE_INTEGER` survive JSON round-trips. Reports schema, table
counts, quick-check results, bytes, and SHA-256. Results are cached by database
path.

### `world-features`

Exports rows from the conventional `world_features` table in a registered
database. The `limit` step option is overridden by the recipe's `limit`
parameter when present. Reports truncation explicitly and refuses invalid
limits.

### `html-report`

Builds a portable HTML handoff from earlier structured step results. The HTML
report prefers a step's explicit `metrics: [{label, value}, ...]` list when
present and falls back to a heuristic for unknown keys.

## Parameters

Parameters are declared with a `type` and are validated and coerced by
`validateAndCoerceParameters` at submit time. Unknown keys, missing required
values, type mismatches, and out-of-range integers are all rejected before the
job is created.

```yaml
parameters:
  bounds:
    type: bounds
    description: Inclusive x1,y1,z1,x2,y2,z2 box.
    required: false
  limit:
    type: integer
    description: Rows to export.
    required: false
    min: 1
    max: 1000000
  title:
    type: string
    description: Override the report title.
    required: false
```

The built-in types are:

- `string` — passed through as-is.
- `integer` — coerced via `Number(value)` and validated against optional
  inclusive `min` / `max`.
- `bounds` — parsed as six comma-separated integers and normalised to an
  inclusive `{minX, minY, minZ, maxX, maxY, maxZ}` object. The block-census
  step consumes this directly.

Recipes cannot execute shell commands, make network requests, or call Minecraft.
New step types require reviewed TypeScript implementation and tests.
