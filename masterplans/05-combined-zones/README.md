# Combined Zones Integration Plan

Status: **SITING STUDY — NOT AUTHORIZED FOR WORLD EDITS**

This package turns the design library in Masterplans 01–04 into a current-world integration study. It replaces Masterplan 04's obsolete assumption that the current map is a small starter base near `(935, 60, 300)` with the accepted terminal world evidence now in this repository.

Start here:

- [combined-zones-report.html](combined-zones-report.html) — the full illustrated report (A4, print-ready), in the same format as the Masterplan 04 reports.
- [MASTERPLAN.md](MASTERPLAN.md) — the recommended placement, connections, build sequence, and acceptance gates.
- [phase0-survey-brief.md](phase0-survey-brief.md) — **the live-server action list**: what to verify, generate, probe, and bring back to turn this study into a survey.
- [source-register.md](source-register.md) — source precedence, current-world evidence, and conflicts inherited from Masterplan 04.
- [site-coordinates.json](site-coordinates.json) — machine-readable study transform, zone bounds, and interface points.
- [corridor-clearance.json](corridor-clearance.json) — machine-generated separation test of the East Corridor against all 1,215 catalog records.
- [maps/east-corridor-plan.png](maps/east-corridor-plan.png) — the East Corridor: alignment, cross-section, both terminal roundabouts, and the Data District interchange.
- [maps/east-corridor-plan.svg](maps/east-corridor-plan.svg) — scalable, coordinate-aware source for the corridor plan.
- [maps/current-and-proposed-whole-world.png](maps/current-and-proposed-whole-world.png) — the requested top-down map of the accepted current baseline plus the proposed east-side build.
- [maps/current-and-proposed-whole-world.svg](maps/current-and-proposed-whole-world.svg) — scalable, coordinate-aware source for the top-down map.
- [maps/gateway-approach-and-terminal-plan.png](maps/gateway-approach-and-terminal-plan.png) — layer-separated Z02 plan showing the two surface stops, concealed subway branch, and eight-track expansion terminal.
- [maps/gateway-approach-and-terminal-plan.svg](maps/gateway-approach-and-terminal-plan.svg) — scalable, coordinate-aware source for the Z02 plan.
- [maps/vertical-zoning-section.png](maps/vertical-zoning-section.png) — the vanilla-height redesign that makes a same-world version possible in principle.
- [maps/vertical-zoning-section.svg](maps/vertical-zoning-section.svg) — scalable source for the vertical study.
- [map-qa.json](map-qa.json) — source/output hashes and mechanical map checks.

The top-down proposal reserves an east-side study envelope at `x=1500…3050`, `z=-1050…450`. It does not overlap the cataloged current feature union, whose eastern limit is `x=1300`. Most of the proposed envelope is outside the accepted snapshot's rendered terrain, so the dark/hatched area on the map means **not surveyed**, not empty.

The connection to the current world is the **East Corridor**: a 1,277-block multimodal reservation from a terminal roundabout east of MainStreet America to the Gateway, carrying a 4-lane divided highway, a double-track passenger railway, a protected pedestrian route, and utilities in one 56-block cross-section. It swings south of the Data District, serves it with a single interchange, and ends in local roads — two of which tie into cataloged existing roads. The current world has no railway of any kind, so this line would be its first. Road and rail are designed together because staging them apart forecloses the rail permanently.

Z02 is the **Gateway Approach**, not a duplicate Old Town. Ravensreach retains the historic-town identity. Z02 provides the landscaped arrival, two future-use passenger stops, utilities, and the concealed Gateway Expansion Terminal (“The Empty Eight”) with eight tracks, eight platforms, mall shells, and sealed future-line interfaces.

No Minecraft, RCON, fleet API, systemd, or live-world operation was used to create this package.
