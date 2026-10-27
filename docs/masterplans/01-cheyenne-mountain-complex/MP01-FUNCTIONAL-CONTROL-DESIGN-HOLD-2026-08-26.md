# MP01 functional-control current-source design hold

**Status:** `HOLD_NO_CURRENT_WORLD_FUNCTIONAL_CONTROL_RELEASE_CANDIDATE`. No guarded operation package was emitted.

The latest complete immutable source is `data/worldsnap-mp08-rr-t1b-wayfinding-post-20260826T104858Z` (complete-save SHA-256 `b3743ed577a04d2d0ef8d86ee6f1f953ba90cd92b402295a9cf18f985f3a9c76`; region SHA-256 `f3ad99c25f5211fc17a0bd29fd82d0dad649fa4543f2f0a69a47449526907613`). It retains the exact seven-cell OFF indicator at `x=2001..2004, y=165..166, z=-902`: four polished-blackstone support cells, an OFF lever, a `power=0` wire, and an unlit lamp. The seven operated cells and their immediate halo are free of saved entities and block entities in this snapshot.

## Why this is held

The earlier release was structurally reversible, but its immutable live ON capture set the lever to `powered=true` while the wire remained `power=0`. A disposable server and an RCON block-state write do not prove a real production-world interaction. Rebuilding the same topology, or attaching it to a door, reservoir, route, boundary, or utility, would repeat that failure with a larger blast radius.

## Successor gate

A successor must be a new isolated non-safety-critical indicator topology, selected only after same-version runtime testing. Its ON/OFF test must be caused by genuine Minecraft interaction (player or interaction-only bot), not `/fill` or `/setblock`, and must independently observe exact ON and OFF signal/output states twice after normal ticks. It then needs the full fresh guarded-release kernel and a post-interaction immutable save. Until that protocol is available and passes, this is a local control-design hold only—not a hold on unrelated Cheyenne work.
