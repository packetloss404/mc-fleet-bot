# RAIL-S3-R10 · West High Successor-11 current-source hold

**Status:** STATIC SAFETY HOLD — no operation package compiled or executed.

**Historical note:** this initial direct-clear hold was resolved by the later
staged, gravity- and water-preserving civil release; see
[Successor-11 release](RAIL-S3-R10-WEST-HIGH-SUCCESSOR-11-RELEASE.md).

The read-only successor survey uses the accepted Successor-10 fresh post source
`data/worldsnap-rail-r10-west-high-successor10-direct-post-20260826T080841Z`.
It examined the next westward 20×6×6 core, its shell surface, and an exact
one-cell halo before considering any build operation.

| Layer | Bounds | Result |
| --- | --- | --- |
| Core | `x=-194..-175`, `y=42..47`, `z=-472..-467` | 720 cells; seven gravity intrusions |
| Shell surface | `x=-195..-174`, `y=41..48`, `z=-473..-466` | 616 cells; 56 predecessor-owned PDS seam cells, 560 otherwise mutable cells, and seven gravity intrusions |
| Halo | `x=-196..-173`, `y=40..49`, `z=-474..-465` | 1,064 cells; exact predecessor contract remains `56/28/100/0/0`, but one water cell and 18 gravel cells prevent preservation acceptance |

The core gravity cells are `(-194,42,-472..-470)`,
`(-194,43,-472..-471)`, and `(-193,42,-472..-471)`. The shell gravity cells
are `(-195,41,-472..-470)`, `(-194,41,-472..-470)`, and
`(-193,41,-471)`. The preserved halo contains water at `(-186,40,-467)` and
the 18 exact gravel points in the machine-readable survey.

There are no saved entities, no protected/container states, and no fluid in
the proposed core or shell. Those clean checks do not permit bypassing the
gravity and halo-fluid hard stops. The retained predecessor ownership is also
intact: shell PDS `56`, halo PDS `28`, predecessor halo interface `100`, local
halo PDS `0`.

Full raw evidence, including exact cell states and coordinate hashes, is in
`data/world-review/rail-r10-west-high-successor11-current-source-20260826T080841Z/survey.json`.
This is a civil-only survey, not rail or passenger-service acceptance.
