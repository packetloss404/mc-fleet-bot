# Combined Zones Integration Plan

Status: **PHASE 0 RERUN PASS — RE-SITED SCHEME — NOT AUTHORIZED FOR WORLD EDITS**

This package integrates Masterplans 01–04 with the accepted current world. It keeps Ravensreach as the canonical Old Town, uses Gateway Approach as the current-world adapter, rotates the Combined Complex north from a new origin at `(2048,-328)`, and places the hidden eight-track subway terminal on a fully dry, cover-compliant footprint.

Start here:

- [MASTERPLAN.md](MASTERPLAN.md) — adopted placement, current-world connection, Empty Eight program, phases, and remaining decisions.
- [maps/current-plus-proposed-phase0-overlay.png](maps/current-plus-proposed-phase0-overlay.png) — authoritative one-block-per-pixel top-down of the current world and re-sited plan.
- [phase0-survey-brief.md](phase0-survey-brief.md) — live procedure, fresh snapshot identities, rerun verdict, and hard limits.
- [phase0-survey-evidence.json](phase0-survey-evidence.json) — coverage, footprint censuses, structure bounds, nine siting gates, and artifact hashes.
- [corridor-terrain-probe.json](corridor-terrain-probe.json) — 79 natural centerline samples plus the 1:8-or-flatter engineered rail profile.
- [resiting-candidate-analysis.json](resiting-candidate-analysis.json) — exact dry-footprint and normalized-core search against immutable Anvil terrain.
- [site-coordinates.json](site-coordinates.json) — machine-readable revised transform, zone bounds, stops, subway descent, terminal, and interfaces.
- [corridor-clearance.json](corridor-clearance.json) — catalog separation and Phase 0 rail-profile result.
- [source-register.md](source-register.md) — source precedence and inherited conflicts.
- [map-qa.json](map-qa.json) — hashes and mechanical checks for the current rerun artifacts.
- [combined-zones-report.html](combined-zones-report.html) — illustrated report; the Markdown/JSON evidence controls any stale pre-rerun body detail.

Key result:

- revised reserve: `x=1500…2550`, `z=-1150…300`;
- core transform: `worldX=2048+localX`, `worldZ=-328+localZ`;
- all 14,238 atlas chunks and all 6,097 revised-reserve chunks full;
- five critical core anchors dry;
- mountain footprint 2.6167% water, urban core 2.7788% water;
- Empty Eight `x=1880…2220`, `z=-1008…-848`, shell `Y=38…54`, rail `Y=40`;
- all 54,901 terminal columns dry and all provide at least eight blocks over the roof;
- zero generated-structure bounds intersect the terminal shell vertically;
- East Corridor passenger-rail profile passes 1:8, with up to 36 blocks of cut and 23 blocks of fill disclosed.

Gateway Approach retains two future-use surface stops at `(1640,68,-250)` and `(1920,68,-250)`. The hidden split at `(1780,68,-250)` descends about 693 blocks to the Empty Eight: eight east–west tracks, eight platforms, an oversized mall/concourse, and eight sealed future-line stubs.

The rerun required no new chunk generation because the complete revised footprint was already inside the full first-survey atlas. It placed and removed no blocks and preserved the live server's 104 force-loaded chunks exactly. Phase 0 passes siting for detailed design only; all physical work still requires ownership/entity gates, civil and hydrology design, exact guarded forward/rollback packages, post-state QA, and separate user authorization.
