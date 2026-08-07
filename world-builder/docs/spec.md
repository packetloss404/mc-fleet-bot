# mcwb masterplan spec reference

The binding spec mcwb consumes is `04-contractor/contractor-brief.json`
inside a masterplan directory. The JSON Schema lives at
[`schemas/contractor-brief.schema.json`](../schemas/contractor-brief.schema.json).

This document is the human-facing reference. The schema is the source
of truth for validation; this explains intent and conventions.

## Top-level fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `spec_version` | string | yes | `MAJOR.MINOR`. Bump on breaking changes. |
| `tool_version` | string | no | mcwb version that last validated this brief. |
| `build_name` | string | yes | Display name. |
| `build_id` | string | yes | Slug. Lowercase, hyphenated. Stable across versions. |
| `version` | string | yes | Free-form version label, e.g. `"2.0"`. |
| `edition` | string | yes | Only `"java"` is supported in v0.1. |
| `java_version` | string | yes when `edition=java` | e.g. `"1.21"`. |
| `scale` | object | yes | Scale notes. Always includes `global_block_size`. |
| `world_footprint` | object | yes | `{ width_blocks, length_blocks, height_blocks, ... }`. |
| `world_origin` | object | yes | `{ x, y, z, description }`. |
| `compass_orientation` | string | yes | e.g. `"north = -z, east = +x, up = +y"`. |
| `phases` | object | yes | `{ "1_site_prep": 50000, ... }`. Slug → block count. |
| `block_budget_total` | integer | yes | Total blocks across all phases. |
| `phase_count` | integer | yes | `len(phases)`. Used for sanity checks. |
| `mountain_layout` | object | no | Geological framing: granite intrusion, limestone body, contact elevation. |
| `horizontal_zones` | object | no | Zone → block palette. |
| `subterranean_zones` | object | no | Same shape as `horizontal_zones`. |
| `key_locations` | object | no | Named coords. Each value is `{ x, y, z, description }`. |
| `inter_site_connections` | object | no | Tunnels, shafts, funiculars. |
| `block_palette` | object | no | Per-zone `minecraft:` block lists. |
| `centerpieces` | array | no | Strings describing signature architectural objects. |
| `easter_eggs` | array | no | Strings describing hidden references. |
| `visitor_journey` | object | no | Time-staged player experience with stage durations. |
| `binding_decisions_respected` | array | no | Decisions this brief locks in. |
| `open_items` | array | no | Known unresolved questions. |

## Coordinate system

mcwb follows Minecraft's convention:

- **+X** = east
- **+Y** = up
- **+Z** = south (north = -Z)
- The world origin is a deliberate choice — typically the center of
  the city at ground level (Y=0), **not** sea level.

The brief must declare its `compass_orientation` and `world_origin`
explicitly. mcwb does not assume Minecraft default sea level.

## Phases

`phases` is the diff granularity. Each key is a slug, each value is
the block count for that phase. Re-running mcwb on a masterplan with
unchanged phases skips those phases entirely.

Slug convention: `<n>_<short_name>`, e.g. `1_site_prep`,
`6_public_shaft_vertical_centerpiece`. mcwb sorts phases by the
leading numeric prefix when iterating.

## Block IDs

All `minecraft:` block IDs in the brief must be in the palette for the
target edition (`mcwb/palette/java_<version>.json`). The palette is
the controlled vocabulary. Don't invent block names — extend the
palette file when a new block is needed.

## Versioning

- `spec_version` is `MAJOR.MINOR`. Bump `MAJOR` on breaking shape
  changes; bump `MINOR` for additive changes.
- `build_id` stays stable across versions of the same build. Different
  builds get different `build_id` values.
- `version` is the build's own version (e.g. `"2.0"`) and is free-form.
- mcwb's `migrate.py` chain runs brief transformations between spec
  versions. For MVP there are no migrations.

## What mcwb does NOT do

- **Author coordinates.** Coords come from the brief. The LLM (in a
  later release) can suggest details, but the binding spec is the
  source of truth.
- **Run a Minecraft server.** The user is responsible for stopping the
  server before `mcwb build` and starting it after.
- **Validate visual quality.** The `mcwb verify` step runs the 10-point
  QA list mechanically (block presence, easter egg reachability) but
  cannot judge aesthetics.
- **Convert between editions.** Java-only for v0.1. Bedrock and
  Education Edition support is not planned.
