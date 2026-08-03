# Combined Zones Integration Plan

Status: **SITING STUDY — NOT AUTHORIZED FOR WORLD EDITS**

This package turns the design library in Masterplans 01–04 into a current-world integration study. It replaces Masterplan 04's obsolete assumption that the current map is a small starter base near `(935, 60, 300)` with the accepted terminal world evidence now in this repository.

Start here:

- [MASTERPLAN.md](MASTERPLAN.md) — the recommended placement, connections, build sequence, and acceptance gates.
- [source-register.md](source-register.md) — source precedence, current-world evidence, and conflicts inherited from Masterplan 04.
- [site-coordinates.json](site-coordinates.json) — machine-readable study transform, zone bounds, and interface points.
- [maps/current-and-proposed-whole-world.png](maps/current-and-proposed-whole-world.png) — the requested top-down map of the accepted current baseline plus the proposed east-side build.
- [maps/current-and-proposed-whole-world.svg](maps/current-and-proposed-whole-world.svg) — scalable, coordinate-aware source for the top-down map.
- [maps/vertical-zoning-section.png](maps/vertical-zoning-section.png) — the vanilla-height redesign that makes a same-world version possible in principle.
- [maps/vertical-zoning-section.svg](maps/vertical-zoning-section.svg) — scalable source for the vertical study.
- [map-qa.json](map-qa.json) — source/output hashes and mechanical map checks.

The top-down proposal reserves an east-side study envelope at `x=1500…3050`, `z=-1050…450`. It does not overlap the cataloged current feature union, whose eastern limit is `x=1300`. Most of the proposed envelope is outside the accepted snapshot's rendered terrain, so the dark/hatched area on the map means **not surveyed**, not empty.

No Minecraft, RCON, fleet API, systemd, or live-world operation was used to create this package.
