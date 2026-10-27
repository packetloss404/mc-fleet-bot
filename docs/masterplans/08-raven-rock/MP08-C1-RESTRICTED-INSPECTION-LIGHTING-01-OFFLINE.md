# MP08 C1 restricted inspection lighting 01

**State:** `COMPILED_OFFLINE_AWAITING_FRESH_GUARDED_RELEASE_KERNEL`

This is an eight-cell, alternating-wall, static-light package for the already
sealed C1 restricted inspection corridor. It is a functional legibility and
recovery aid: all fixtures are full-cube sea lanterns replacing exact retained
polished-deepslate wall cells, never the three-wide `x=-1..1` walking lane.

The compiler is bound to the newest complete immutable post snapshot:
`data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z`.
It proves zero fluid/waterlogged or gravity cells in the 48-cell fixture halo,
and zero block entities or saved entities in the exact interaction envelope.
The forward and reverse operations are exact inverses. It creates no execution
authority and does not open C1 vestibules or alter C2, either cavern, fluids,
public access, egress, transport, rail power, or signals.

Compile only:

```bash
node scripts/compile_mp08_c1_restricted_inspection_lighting_01.mjs \
  --out-dir data/world-review/mp08-c1-restricted-inspection-lighting-01-cobalt-wl-post-20260826T233000Z/buildops
```

Any later release must recapture a fresh complete source and satisfy the
manifest's entity, protected-core, strict-noop, journal, post-capture,
rollback-preflight, and independent immutable-post QA gates.
