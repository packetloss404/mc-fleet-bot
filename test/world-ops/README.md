# Cross-project checks

`MC_WORLD_OPS_ROOT=/path/to/mc-world-ops npm run test:world-ops` runs the synthetic database/import boundary contract. It creates temporary SQLite databases and fixtures and never accesses the live world.

`npm run test:world-ops:snapshots` also runs the preserved historical commute survey assertions. It needs the original `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json`, config-patch proposal, route-QA proposal, referenced maps, and operation receipts. These inputs are not shipped with a fresh clone and the original route-survey file is not currently present on this deployment host. This optional historical suite does not control the default application CI or change accepted as-built release status.
