# WLV-STF-ACCESS-02 — Staff Spine Ramp Release

**Status:** AS-BUILT and route-accepted on 2026-08-26. This is a staff-only
circulation repair. It does not commission public/backstage separation, public
egress, or the whole Westlight program.

## Built scope

- A supported three-wide high-datum bridge from `x=-413..-330`,
  `z=-541..-539`, floor `y=18`, with a 3×9 east landing at
  `x=-332..-330`, `z=-547..-539`.
- A one-cell north jog and three-wide south-facing descent at
  `(-414..-412, 18, -542)`.
- A four-by-eight low landing on the retained `y=17` floor at
  `x=-415..-412`, `z=-550..-543`, joining the WLV-STF-ACCESS-01 dogleg.
- The initial west-facing descent was rejected before execution because its
  headroom would have cut the intact white-glass façade at
  `x=-414, z=-540..-539`. The released north-jog variant does not cut that
  glass or its lighting.

## Immutable source and exact operations

- Fresh source snapshot:
  `data/worldsnap-wlv-staff-access-ramp-source-20260826T034110Z/region`
  (`3ea7bae9c7d58bba0ce8d5d7325bf2b8cf2c450751381e5420815e975f7c5cb0`).
- Forward operation: `data/buildops/wlv-staff-access-ramp-20260826T034110Z.forward.txt`.
- Exact inverse: `data/buildops/wlv-staff-access-ramp-20260826T034110Z.rollback.txt`.
- Manifest: `data/buildops/wlv-staff-access-ramp-20260826T034110Z.release-manifest.json`.
- Strict journaled execution: 306 guarded groups changed; zero no-ops;
  `data/world-review/wlv-staff-access-ramp-forward-execution-20260826T034110Z.json`.

## Required kernel and functional evidence

- Strict forward/rollback parser reports:
  `data/world-review/wlv-staff-access-ramp-forward-parse-20260826T034110Z.json`,
  `data/world-review/wlv-staff-access-ramp-rollback-parse-20260826T034110Z.json`.
- Forward source and projected rollback preflight: 306/306 exact guards pass:
  `data/world-review/wlv-staff-access-ramp-forward-source-preflight-20260826T034110Z.json`,
  `data/world-review/wlv-staff-access-ramp-projected-rollback-preflight-20260826T034110Z.json`.
- Block-entity and live entity clearance passed zero blockers:
  `data/world-review/wlv-staff-access-ramp-block-entity-clearance-20260826T034110Z.json`,
  `data/world-review/wlv-staff-access-ramp-live-entity-clearance-20260826T034110Z.json`.
- Post snapshot:
  `data/worldsnap-wlv-staff-access-ramp-post-20260826T034150Z/region`
  (`6b0e1308bd4ef268c05a728a9b7ad32221b233a26e2c0a3e1ed37336ca0a73e4`).
- Actual rollback post-state preflight: 306/306 pass:
  `data/world-review/wlv-staff-access-ramp-rollback-poststate-preflight-20260826T034150Z.json`.
- Independent exact target and 8,010-cell halo QA passed:
  `data/world-review/wlv-staff-access-ramp-post-state-qa-20260826T034150Z.json`.
- Independent live Mineflayer route acceptance passed in both directions with
  digging, jumping, and sprinting disabled:
  `data/world-review/wlv-staff-access-ramp-live-route-post-20260826T034150Z.json`.

## Boundary retained

The passing route is only East Backstage ↔ WLV-STF-ACCESS-01 low dogleg. A
public route and the public/backstage boundary must be compiled from the new
staff-spine post-state; neither is inferred from this release.
