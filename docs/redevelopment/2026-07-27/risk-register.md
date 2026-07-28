# Redevelopment Risk Register

Date: 2026-07-27  
Owner: Program Control  
Review cadence: before every design release, preflight, live operation, and
final publication

Implementation state: **DESIGN ONLY**. Risks and controls are proposed program
governance; this package records no live build or deployment result.

## 1. Scoring

Likelihood and impact use 1–5:

- 1: rare/minor;
- 2: unlikely/limited;
- 3: possible/material;
- 4: likely/major;
- 5: near-certain/critical.

Score is likelihood × impact. Treat 15–25 as critical, 8–14 as high, 4–7 as
moderate, and 1–3 as low. A stop-work trigger applies regardless of score.

## 2. Governance and ownership

### 2.1 Roles

| Role | Accountability |
|---|---|
| Program Control | Scope, requirements, baseline, area locks, decisions, dependencies, release gate |
| Planning/Research | Alternatives, regulating plan, standards, source interpretation |
| Survey/Catalog | Snapshot, DB, collision geometry, IDs, scans, observations, data quality |
| Atlas/Media | Maps, cameras, screenshots, manifests, object/media relation |
| MainStreet Surface | Roads, sidewalks, frontage, B01/B02/B03, landscape |
| Residential | H01–H12, C02–C07, garages, alleys, addresses |
| Secure Complex | C01 portal, mountain road, concealment, protected rooms |
| Tunnel/Vertical | Tunnel types, stairs, shafts, route performance |
| Venue | Westlight and C01 arena focal points, screen, seating, sightlines |
| QA/Release | Independent preflight, block/fluid/entity/route tests, acceptance, rollback |
| Documentation | Traceability, research paper, master-plan PDF, status reconciliation |
| Sites/Web | Versioned export, site build, saved version, production deployment |

### 2.2 RACI-like workstream matrix

`A` = accountable; `R` = responsible; `C` = consulted; `I` = informed.

| Workstream | Program | Plan | Survey | Atlas | Surface | Residential | Secure | Tunnel | Venue | QA | Docs | Web |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Immutable baseline | A | I | R | C | I | I | I | I | I | C | I | I |
| Master/regulating plan | A | R | C | C | C | C | C | C | C | C | R | I |
| MainStreet streets/B02/B03 | A | C | C | C | R | C | I | I | I | R | I | I |
| Houses/garages/alleys | A | C | C | C | C | R | I | I | I | R | I | I |
| C01 portal/concealment | A | C | C | C | I | I | R | C | I | R | I | I |
| Tunnels/stairs | A | C | C | C | I | I | C | R | I | R | I | I |
| Venue screen/sightlines | A | C | C | C | I | I | C | I | R | R | I | I |
| Final atlas/media | A | I | C | R | C | C | C | C | C | R | C | I |
| DB/media export | A | I | R | C | I | I | I | I | I | C | C | C |
| PDF | A | C | C | C | I | I | I | I | I | C | R | I |
| Sites release | A | I | C | C | I | I | I | I | I | C | C | R |

Program Control is the single release authority. QA/Release remains
independent of the team that authored the operations.

## 3. Active risk register

| ID | Risk / cause | L | I | Score | Owner | Prevention / mitigation | Trigger and contingency |
|---|---|---:|---:|---:|---|---|---|
| RSK-001 | Snapshot path is reused or changes after scan | 4 | 5 | 20 | Survey | Content-addressed immutable directory; full SHA in every artifact | Any same path/different hash: stop, invalidate preflight/media, rebaseline |
| RSK-002 | Concurrent agents or builders mutate overlapping world/files | 4 | 5 | 20 | Program | Area/file locks; one release window; shared register; exact package owner | Unexpected file/world diff: stop affected packages, compare hashes, re-preflight |
| RSK-003 | A live second bot/server instance causes duplicate login/quarantine | 2 | 5 | 10 | Program | Follow systemd-only operations; never hand-start second instance | Duplicate process/login: stop unauthorized instance and use approved service recovery |
| RSK-004 | “Complete/100” masks experience defects | 5 | 4 | 20 | QA | Separate functional, walkability, legibility, sightline, concealment scores | User/eye-level failure overrides score; reopen requirement |
| RSK-005 | Stale planning prose disagrees with DB/snapshot | 5 | 4 | 20 | Docs | Generate counts/status appendix from DB; source hierarchy | Count/coordinate conflict: mark stale, use accepted scan and record decision |
| RSK-006 | Same screenshot batch is treated as proof for many objects | 4 | 4 | 16 | Atlas | Exact primary media relation; semantic framing QA | Missing camera/object match: media cannot close feature |
| RSK-007 | C02–C07 orphan parent IDs break hierarchy/site navigation | 5 | 3 | 15 | Survey | Assign approved parcel/block parents before construction/media release | Orphan check nonzero: block final export |
| RSK-008 | Moving all C01 damages protected rooms/routes/inventories | 3 | 5 | 15 | Secure | Prefer re-portal/landform solution; protected-volume inventory | Any protected overlap: reject move alternative or preserve source until full target QA |
| RSK-009 | C01 relocation pushes beyond project/WorldGuard edge | 3 | 5 | 15 | Secure | Compare target to SITE x=-300..300 and region definitions | Bounds breach: stop; select portal-only or revise region through separate approval |
| RSK-010 | New portal/road collides with shelter, vault, hangar, observatory, heliport, routes | 4 | 5 | 20 | Secure | 3D feature collision and terrain section before coordinates freeze | Any unmodeled collision: reject alignment and return to alternatives |
| RSK-011 | Old portal removed before new route works | 3 | 5 | 15 | Secure | Build target first; retain old route; staged cutover | New route fails either direction: keep/restore old portal |
| RSK-012 | Parking recovery corrupts 236-space program or categories | 3 | 4 | 12 | Secure | Exact P01 cell/feature census before/after; category totals | Any unexplained stall/category delta: rollback parking portion |
| RSK-013 | User’s “entire complex underground” conflicts with intentional observatory | 5 | 4 | 20 | Program | Obtain explicit retain/relocate decision before concealment design freeze | No decision: hold HGR/OBS terrain package |
| RSK-014 | Landform fill exposes/floods/blocks underground shell | 3 | 5 | 15 | Secure | Terrain thickness, fluid-neighbor, shell, headroom, and route scan | Fluid/shell/route failure: rollback fill and repair from baseline |
| RSK-015 | Vegetation-only screen decays or reveals rectangular shell | 3 | 3 | 9 | Secure | Use continuous landform for concealment; planting as secondary layer | Public viewpoint sees shell: concealment gate fails |
| RSK-016 | Mountain road grade or edge is uncomfortable/unsafe | 4 | 4 | 16 | Secure | Longitudinal profile, consistent width, edge guards, bidirectional test | Jump/sprint/crouch or fall risk: regrade before release |
| RSK-017 | R02 widening hits fences, gates, homes, or terrain | 3 | 4 | 12 | Surface | Treat widening as study; use exact masks; preserve 3-wide where needed | Collision or poor grade: keep R02 at 3 and improve edges |
| RSK-018 | Conceptual R08 near z=-120 collides with B02/houses/grade | 4 | 3 | 12 | Surface | Compare alternative centerlines and pedestrian-only option | No collision-free corridor: provide named pedestrian link or approved exception |
| RSK-019 | x≈±55 alleys/garages do not fit 15–16-block bands | 4 | 4 | 16 | Residential | House-by-house section, turning/access test, reversible two-house pilot | Any shell/fence/room conflict: use side garage/short court for that lot |
| RSK-020 | Garage additions erase authored house identity | 3 | 4 | 12 | Residential | Recess, frontage cap, matching palette, preserve principal entry | Front elevation becomes garage-dominant: reject design |
| RSK-021 | B02 is moved unnecessarily and floorplan/source identity is lost | 3 | 4 | 12 | Surface | Test east-frontage intervention first | Frontage pilot passes: relocation is out of scope |
| RSK-022 | B03 is moved into homes and causes freight conflict | 3 | 4 | 12 | Surface | Retain service terminus; screen R07 loading | Freight crosses residential front space: redesign |
| RSK-023 | More open space worsens wayfinding by increasing blank gaps | 4 | 3 | 12 | Plan | Eye-level view corridors; active frontage; confirmation cues | Turn-corner test remains ambiguous: add identity/edge before further spreading |
| RSK-024 | Westlight screen blocks field, stage, or canopy | 4 | 5 | 20 | Venue | 3D obstruction model; 48-view minimum matrix; reversible mockup | Any representative view lacks field/stage and screen: resize/raise/relocate |
| RSK-025 | Screen solves sports but fails concert mode | 3 | 4 | 12 | Venue | Test sports and north-stage concert modes; side-board alternative | Concert sectors fail: adopt hybrid or event-specific display |
| RSK-026 | C01 arena complaint is incorrectly ignored because traceability maps it to Westlight | 3 | 3 | 9 | Venue | Separate C01 arena sightline/focal review using its screenshot | Dominant view is door/blank surface: add/rotate focal display/seating |
| RSK-027 | Tunnel standardization opens adjacent cave/bore | 4 | 5 | 20 | Tunnel | Segment bounds, cave adjacency, shell thickness, exact REPL guards | Unexpected void/merge: stop segment, restore shell, redesign |
| RSK-028 | Tunnel regrade breaches water or protected room | 3 | 5 | 15 | Tunnel | Fluid-neighbor and feature-volume scan; dry census | Water/room breach: rollback and isolate |
| RSK-029 | Uniform material palette erases route identity | 3 | 3 | 9 | Tunnel | Standard section plus persistent family colors/names | Player confuses branches in blind test: strengthen route differentiation |
| RSK-030 | Reachability test passes but stair remains hard to walk | 5 | 4 | 20 | QA | Normal-speed no-prior-knowledge experience test and timing | Jump/sprint/crouch/backtrack: fail route despite graph pass |
| RSK-031 | Lift/ramp alternative is remote and invisible | 3 | 4 | 12 | Tunnel | Pair with general circulation; same-node signs | Blind tester cannot find it: re-site or improve route hierarchy |
| RSK-032 | Wayfinding names differ across world, DB, map, PDF, and site | 4 | 3 | 12 | Docs | Canonical name/alias registry; generated exports | Name mismatch: block publication/deployment |
| RSK-033 | “GrandStreet” alias replaces machine-facing MainStreet IDs | 3 | 4 | 12 | Docs | Alias only in display layer; preserve `mainstreet-america` keys | Script/DB/region target changes: stop and restore canonical ID |
| RSK-034 | Final media mixes snapshots | 4 | 5 | 20 | Atlas | Hash and scan on every image/map; mismatch report | Mixed hash: image is illustrative only and cannot close QA |
| RSK-035 | Large atlas/PDF/site assets are unusably slow | 4 | 3 | 12 | Atlas/Web | Tiled maps, responsive derivatives, lazy images, downloadable originals | Performance/accessibility test fails: optimize before production |
| RSK-036 | Owner-only Sites release is accidentally given broader access | 2 | 5 | 10 | Program/Web | Complete maps/screenshots are approved for the owner-only initial release; verify deployment access control and do not broaden it implicitly | Access is broader than owner-only: stop handoff, correct access control, revalidate |
| RSK-037 | Sites deploys stale data after world changes | 4 | 4 | 16 | Web | Versioned export pinned to final snapshot and DB hash | World/DB changes after export: label historical or rebuild before release |
| RSK-038 | Research source is treated as literal Minecraft code | 3 | 3 | 9 | Plan | Label every block metric as adaptation; cite principle and limit | Unjustified dimensional claim: remove or mark project decision |
| RSK-039 | Historic MainStreet source intent is overwritten by invented grid claim | 3 | 3 | 9 | Plan | Separate reconstructed/historic facts from creative plan | Publication implies unsupported history: correct narrative |
| RSK-040 | Detailed maps clip unloaded chunks or incomplete regions | 3 | 5 | 15 | Atlas | Full requested-chunk completeness check and nonblank visual review | Missing chunk/pixel region: rerender after source repair |
| RSK-041 | Build source and generated operations diverge | 4 | 4 | 16 | QA | Hash generator/source/ops; regenerate from committed source state | Hash drift: invalidate dry run |
| RSK-042 | Rollback does not restore block entities/inventories | 2 | 5 | 10 | QA | Inventory snapshot; source/target cuboid preservation; test inverse | Entity mismatch: stop release, restore saved-world snapshot |
| RSK-043 | Final counts repeat “237 parking spaces” instead of 236 stalls + parent | 4 | 2 | 8 | Docs | Generated definitions and data dictionary | Publication ambiguity: correct before PDF/site release |
| RSK-044 | Final room count repeats obsolete 236 instead of current 259 rows | 4 | 2 | 8 | Docs | Generate current count from frozen DB | Count mismatch: correct and note source date |
| RSK-045 | Many simultaneous teams create review bottleneck | 4 | 3 | 12 | Program | Package-level owners, bounded review windows, dependency board | Queue exceeds capacity: prioritize P0/P1 and hold lower phases |

## 4. Critical decisions

| Decision | Owner | Needed before | Default if delayed |
|---|---|---|---|
| Retain or relocate OBS-S01 | Program/user | C01 concealment design freeze | Hold surface terrain package |
| Approve MainStreet M-B alternative | Program/user | Garage/street detailed design | Continue non-mutating analysis only |
| Approve R08 study | Program/user | New cross-connection preflight | Test pedestrian-link alternative |
| Westlight ring vs hybrid screen | Program/user | Venue generator | Model both; execute neither |
| Scope of no-jump routes | Program/user | Tunnel detailed design | Provide for principal public stacks |
| Complete-map/media publication classification | Program/user | Resolved | **Approved for owner-only initial Sites release**; a broader/public release remains a separate decision |

## 5. Stop-work triggers

The following stop an affected release immediately:

1. Snapshot or source hash differs from preflight.
2. An unexpected protected block entity enters an operation volume.
3. A route intersects a cave, bore, room, water body, or neighboring feature
   not shown in the approved design.
4. The world changes after preflight.
5. A route passes in only one direction.
6. A new portal, road, garage, or screen fails any representative viewpoint.
7. An operation crosses a region or project boundary.
8. Post-run census cannot reconcile expected and observed changes.
9. Rollback artifact or saved-world backup is missing.
10. Final evidence has a different snapshot hash from the observed feature.

## 6. Issue escalation

1. Author reports issue with feature IDs, bounds, package, and snapshot hash.
2. Program Control marks the area/package locked.
3. Survey/QA reproduces against the immutable snapshot.
4. Planning provides alternatives if design intent is affected.
5. Program owner records accept, revise, defer, or reject.
6. Author regenerates the complete package; partial reuse requires hash proof.
7. Independent QA closes the issue.

No team resolves a scope conflict by silently moving into another team's area.

## 7. Residual-risk acceptance

Residual risks may be accepted only when:

- the requested outcome is still met;
- the exception is visible in the regulating/as-built plan;
- the owner, reason, affected feature IDs, and evidence are recorded;
- the website/PDF does not make a stronger claim than the evidence;
- a future corrective package can be defined.

There is no blanket acceptance for “looks fine,” “complete,” or “condition 100.”
