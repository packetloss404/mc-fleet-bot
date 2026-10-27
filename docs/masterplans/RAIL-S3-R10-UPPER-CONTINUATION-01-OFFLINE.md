# RAIL-S3-R10 · upper continuation-01

**Status:** SUPERSEDED BY AS-BUILT CONTINUATION-02

This is the next dry upper civil segment after the accepted ramp-02 post
state. It is an offline source-bound package only and has not captured or
mutated the live world.

## Scope and interfaces

- horizontal `x=-58..-39` at tube base `y=28` and gallery floor `y=32`;
- 320 tube-interior air cells and 720 gallery-interior air cells;
- exact 52-cell predecessor migration at the accepted ramp cap `x=-59`;
- sealed terminal cap at `x=-38`;
- 2,052 changed cells with exact forward/inverse operations.

The accepted ramp-02 interface is the only predecessor ownership taken. The
roof-retention-03 shell, retained five-water component, and disconnected
pre-existing water cell are outside this package and must remain unchanged in
any eventual post QA.

## Offline gates

Compiled from
`data/worldsnap-rail-r10-upper-ramp-post-20260826T052900Z`. The exact target
survey found zero fluid, gravel, and container targets. Forward source
preflight is 2,052/2,052, projected inverse is 2,052/2,052, strict forward and
rollback parser checks pass, and block-entity clearance passes.

Operations and manifest: `data/buildops/rail-s3-r10-upper-continuation-01.*`.
Evidence: `data/world-review/rail-r10-upper-continuation-offline-20260826T053100Z/`.

Continuation-02 completed the required fresh rebind and full guarded kernel;
see `RAIL-S3-R10-UPPER-CONTINUATION-02-RELEASE.md`. This remains offline design
provenance. Any successor must receive its own fresh source and kernel.
