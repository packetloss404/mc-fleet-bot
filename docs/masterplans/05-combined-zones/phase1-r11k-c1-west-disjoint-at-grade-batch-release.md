# R11K C1 West Disjoint At-Grade Batch

Date: 2026-08-22  
Release node: `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR`  
Status: **FROZEN OFFLINE / READY FOR FRESH GUARDED EXECUTION KERNEL**

R11K combines the largest clean source-proven west at-grade run at stations
1142–1145 with the independently clean station-1172 singleton. Their exact
targets and complete interaction halos are disjoint, so the two scopes share
one snapshot transaction without sharing an ordering dependency.

The release contains 336 exact reversible transitions: 111 pavement cells,
105 stone-brick foundation fills, 71 headroom cuts, and 49 leaf-persistence
stabilizations. The first package stabilizes affected leaves before removing
four owned source logs; its exact reverse restores the logs before returning
the leaves to their source persistence. There are no gravity transitions.

Both surfaces are independently connected with 111/111 stable contacts and
222/222 air headroom cells. The 1,883-cell union halo is the disjoint union of
the two package halos and contains zero fluid, forbidden blocks, block
entities, prior-release targets, or rail/utility reservation intersections.
Four saved entities exist in the broader stations-1142..1183 inventory, but
none intersects either exact target envelope. Fresh same-moment live-entity
clearance remains mandatory.

The entity band at stations 1170–1174, reservation/grade-shadow band at
1175–1183, and all other unbuilt west at-grade stations remain untouched.
This batch does not commission the whole route, rail, utility, drainage,
hydraulic capacity, or external discharge.

Canonical build artifacts:

- `data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.release-manifest.json`
- `data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.c1-west-at-grade-1142-1145.forward.txt`
- `data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.c1-west-at-grade-1142-1145.rollback.txt`
- `data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.c1-west-at-grade-1172.forward.txt`
- `data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.c1-west-at-grade-1172.rollback.txt`

Final manifest and QA identities are recorded below after canonical offline
regeneration. No live call or world mutation was performed while preparing
this release.
