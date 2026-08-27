# MP05 R05 west-toe lava plug 01

**Status:** compiled, structurally QA-passed, and ready only for the fresh
guarded-release kernel. This record does not execute or claim an as-built
change.

## Observed finite condition

The newest complete immutable source,
`data/worldsnap-mp05-b07-surface-receiver-descent-post-20260826T221000Z`,
contains the previously deferred R05 west-toe seep as one finite six-connected
lava component:

- 36 cells: `x=1961..1962`, `y=76..91`, `z=-824..-815`.
- Canonical source states: one `lava[level=0]`, 12 `level=2`, two `level=4`,
  and 21 `level=8` cells.
- The source is at `(1961,91,-815)`; the component has zero contacts with the
  conservative census boundary `x=1880..2040`, `y=-64..180`,
  `z=-940..-700`.
- The 104-cell immediate halo has zero fluid states, zero protected
  container/core types, and the complete snapshot has zero block entities or
  saved movable entities in the target/halo envelope.

## Containment release

`MP05-R05-WEST-TOE-LAVA-PLUG-01` replaces only the 36 observed canonical lava
states with `minecraft:deepslate_tiles`. The forward operation starts with the
lowest downstream tail and seals the one level-zero source last. Rollback is
the exact reverse, restoring only those canonical source states.

- [Release manifest](../../../data/buildops/mp05-r05-west-toe-lava-plug-01.release-manifest.json)
- [Finite-component section map](../../../data/buildops/mp05-r05-west-toe-lava-plug-01.section.svg)
- [Static manifest QA](../../../data/world-review/mp05-r05-west-toe-lava-plug-01-offline/manifest-qa-source.json)
- [Scoped authorization](mp05-r05-west-toe-lava-plug-governor-standing-execution-authorization.json)

The manifest's guarded runner defaults to `PREPARE_ONLY`. A later live
invocation must obtain a fresh complete source, rebind all exact states, clear
live entities, pass strict forward/rollback parser checks, journal the run,
capture a fresh post-state, prove rollback post-state, and run
`scripts/qa_mp05_r05_west_toe_lava_plug_01_post_release.mjs`.

## Explicit exclusions

This is a local lava-containment correction only. It does not extend the R05
mountain, reshape terrain, open a route, alter water, or touch any unobserved
fluid component.
