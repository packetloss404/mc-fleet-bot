# D02-S04 closed drainage planning alternatives

**Status:** HOLD_D02_CLOSED_DRAINAGE_GEOMETRY_IS_PLANNING_ONLY_NO_WORLD_EDITS

**Generated:** 2026-08-04T22:44:00Z

**Region snapshot:** `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`

This read-only compiler turns all 11 exact D02-S03 gravity-low runs into closed/capped Minecraft planning geometry. Candidate cells are not operations or material authorization. No outfall, overflow, culvert, receiver, capacity, ownership, construction, or world edit is accepted.

## Alternatives

| Alternative | Candidate/preservation cells | Sumps | Pumps | Mains | Tanks | Same-cell fluid | Face-adjacent fluid | Disposition |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| A — distributed capped sumps | 468 | 11 | 0 | 0 | 0 | 6 | 16 | REJECTED_CURRENT_REGION_OR_INTERFACE_INTERACTION |
| B — pumped sealed mains/tanks | 11,680 | 11 | 11 | 2 | 2 | 231 | 465 | REJECTED_CURRENT_REGION_OR_INTERFACE_INTERACTION |
| C — no-build culvert avoidance | 229 | 0 | 0 | 0 | 0 | 0 | 0 | control baseline |
| D — strict-clear sump/no-build hybrid | 432 | 10 | 0 | 0 | 0 | 0 | 0 | ELIGIBLE_FOR_PREFERRED_PLANNING_GEOMETRY_ONLY_WITH_EXPLICIT_UNSERVED_HOLD |

## Conservative planning preference

**ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD** is preferred only for further offline technical development. It assigns 10 strict-clear sump candidates and one explicit no-build hold at ROAD-LOW-001, where the rejected chamber envelope intersects 6 current fluid cells and has 16 current fluid neighbors. It has no pumps or transfer mains, no fluid interaction in its candidate cells, and no outfall/overflow/culvert cells.

This ranking is not capacity, hydraulic, geotechnical, structural, operational, safety, ownership, construction, or expert acceptance. Closed storage can still fill and fail; no inflow or duration criterion exists.

## Default no-diversion proof boundary

For the preferred planning geometry, current same-cell fluid count is **0**, face-adjacent fluid count is **0**, and outfall, overflow, culvert, and receiver counts are all zero/null. That proves only exact present-state geometric compliance with the selected planning default. Future excavation or collected water is not modeled.

## Ownership and interfaces

Every asset is instantiated against schema v1. All drainage, collection, power/control, operations, maintenance, and emergency owner keys remain unassigned. Overflow and outfall interfaces are exact empty manifests and remain prohibited.

## Remaining blockers

- Adopt Minecraft-domain inflow, storage-duration, freeboard, snowmelt-like, groundwater-like void, erosion, and failure criteria; no real-world engineering claim is permitted.
- Size each sump/tank and prove pump duty/standby, power, controls, alarms, recovery, and safe failure behavior if a pumped alternative proceeds.
- Compile exact future excavation, lining, cap, backfill, access, and surrounding influence cells with before/after fluid-component accounting.
- Resolve gravity-sensitive current cells through accepted excavation stability and material handling rules.
- Assign and accept drainage, road, rail, power/control, maintenance, tank, and emergency-response owners and exact interfaces.
- Obtain structural/geotechnical acceptance for chambers, caps, corridor loading, and any future crossing; no culvert is currently selected.
- Repeat entity, POI, and level metadata clearance against one complete immutable copied save before physical planning can close.
- Retain zero outfall/overflow/receiver cells unless an exact sole-authority exception, receiver owner, and complete future topology accounting are separately accepted.

## Safe autonomous continuation

- Compile exact future-state excavation/lining/cap influence sets for the preferred local-sump planning geometry.
- Draft Minecraft-domain storage and pump-failure test schemas with every numeric criterion explicitly unaccepted.
- Instantiate maintenance-access and power/control interface candidates without selecting a live route or owner.

D02 remains on HOLD. No live world, service, database, construction, diversion, or world-edit action occurred or is authorized.
