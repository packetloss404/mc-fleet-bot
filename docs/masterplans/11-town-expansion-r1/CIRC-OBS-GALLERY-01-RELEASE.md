# CIRC-OBS-GALLERY-01 · Observatory hidden-entry → portal-hub route closure

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-OBSERVATORY-ESTATE-PORTALS`
**Source:** accepted R08AM post; fresh live source `data/worldsnap-obs-gallery-source-20260825T010000Z`
**Manifest identity:** `3704b4eee43ef201c1d3f7dcf9a39467cdae63cde4622a421147ada188a87656`

The hub's smooth-quartz spiral staircase was unwalkable: the y104 stair cells
(x=224..226, z=150) were covered by deepslate_bricks at y105, and the y103
stair cells (x=224..226, z=149) were covered by smooth_quartz at y104 — no
2-block headroom. Clearing these 6 headroom-blocker cells makes the whole
spiral walkable from the celestial hidden entry down to the central portal-hub
ring.

## Scope

- **6 exact targets** (deepslate_bricks / smooth_quartz → air):
  - `(224..226, 105, 150)` — the ceiling above the y104 stair treads
  - `(224..226, 104, 149)` — the floor slab above the y103 stair treads
- The y102 floor at z=148 already bridges the y103→y101 step, so no additional
  stair cells were needed.

## Hard-safety kernel evidence

- Forward source preflight: 6/6 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 6/6 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-obs-gallery-post-20260825T010200Z`.
- Post-state verification: 6/6 cells air; flood from the hidden entry reaches
  the portal-hub ring (down to y78).
- Rollback post-state preflight: 6/6 PASS.

## Artifacts

- Compiler: `scripts/compile_obs_gallery_route_closure.mjs`
- Ops: `data/buildops/circ-obs-gallery-route-closure.stair-headroom-clear.{forward,rollback}.txt`
- Manifest: `data/buildops/circ-obs-gallery-route-closure.release-manifest.json`
- Evidence: `data/world-review/obs-gallery-live-20260825T010100Z/`

## Boundary

This opens the observatory hidden-entry to portal-hub pedestrian route. It does
NOT commission the observatory interior, telescopes, portal gallery operation,
public/secure access, or any mechanism. It resolves the second failed
cross-area route from the circulation audit.
