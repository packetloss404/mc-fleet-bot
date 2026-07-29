# Report recipes

Recipes are YAML files under `recipes/`. They describe what a report needs, not
where a particular server keeps its data.

```yaml
version: 1
id: world-catalog
name: World Database Catalog
description: Snapshot identity and durable feature inventory.
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
      limit: 100000
  - id: report
    type: html-report
    options:
      title: World Database Catalog
```

## Available steps

### `snapshot-summary`

Hashes sorted `.mca` filenames and bytes with the established
`filename + NUL + bytes + NUL` algorithm. It also reports region extent,
declared chunks, member hashes, modification times, and byte sizes.

### `block-census`

Decodes copied Anvil chunk sections and counts full block-state labels. The
recipe may declare a `bounds` parameter, supplied as six inclusive coordinates.
Decoder errors remain visible and make the census `complete: false`.

### `database-catalog`

Opens a registered SQLite database with `readonly`, `fileMustExist`, and
`query_only`. It reports schema, table counts, quick-check results, bytes, and
SHA-256.

### `world-features`

Exports rows from the conventional `world_features` table in a registered
database. It reports truncation explicitly and refuses invalid limits.

### `html-report`

Builds a portable HTML handoff from earlier structured step results.

## Parameters

Parameters must be declared by the recipe. Unknown values are rejected. The
current built-in parameter is:

- `bounds` — `x1,y1,z1,x2,y2,z2`, normalized to inclusive minima/maxima.

Recipes cannot execute shell commands, make network requests, or call Minecraft.
New step types require reviewed TypeScript implementation and tests.
