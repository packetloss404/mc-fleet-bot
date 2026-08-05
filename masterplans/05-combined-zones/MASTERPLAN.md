# Masterplan 05 — Combined Zones

Status: **PHASE 1 COORDINATION PARTIAL PASS — BUILD HOLD — NOT AUTHORIZED FOR WORLD EDITS**

## Decision

Keep the Combined Complex in the current world, east of the existing catalog, but use the re-sited layout proven by the Phase 0 rerun. The first `(2250,-300)`, 90-degree transform remains negative evidence only. It put decisive anchors in water and gave the Empty Eight adequate cover over only 35.60% of its shell.

The adopted study geometry does four things together:

- keeps **Ravensreach** as the current world's canonical historic town and Old Town;
- keeps **Gateway Approach** as the landscaped transition from the current map, including two future-use passenger stops;
- adopts the north-aligned Combined Complex at `0°` rotation and moves its local origin to `(2048,-328)`;
- moves the hidden eight-track subway terminal wholly south of Gateway Approach to a dry, non-arctic, cover-compliant footprint.

The former northern terminal at `x=1880…2220`, `z=-1008…-848` is retired. Its Phase 0 surface-water count was zero, but its snowy/frozen setting read as an arctic-water placement in-world. The adopted southern site preserves the program while removing that ambiguity.

This is a master plan, not an execution package. It authorizes detailed design only. No excavation, grading, structure removal, protected-feature work, or construction is authorized.

The authority chain is `01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement`. Masterplan 04's [authority reconciliation](../04-combined-complex/AUTHORITY.md) and [machine-readable bridge](../04-combined-complex/authority-reconciliation.json) control that boundary. Masterplan 05 does not replace child internals or normalized 04 architecture; it owns their placement, evidence constraints, adapters, additions, and gates.

Phase advancement is controlled by the dedicated [Phase 1 release-engineering plan](PHASE1-RELEASE-ENGINEERING.md) and [machine-readable release contract](phase1-release-contract.json). They decompose the work into serial releases `R00…R13`: G01–G14 must pass before a physical transaction can start, G15 controls atomic execution, and G01–G19 must all pass before that release can become accepted. Missing, stale, partial, hash-drifting, or narratively equivalent evidence fails closed.

The current offline design wave is recorded in the [exact C1 civil study](phase1-c1-civil-design.json), [D02 authority packet](phase1-d02-civil-authority-packet.json), [30,859,392-cell D02 region audit](phase1-d02-s01-s02-region-evidence.json), [D02 hydrology/outfall audit](phase1-d02-s03-hydrology-outfalls.json), [D02 closed-drainage alternatives](phase1-d02-s04-closed-drainage-alternatives.json), [post-approval D02 technical matrix](phase1-d02-technical-design.json), [mountain hydrology and relic-buffer audit](phase1-d05-hydrology-relic-buffer-design.json), [D05 conservative defaults](phase1-d05-conservative-defaults.json), [relic condition/access survey](phase1-d05-relic-condition-access-survey.json), [future-mountain alternatives](phase1-d05-future-mountain-alternatives.json), [D05 sparse future-state proposal](phase1-d05-future-state.json), [Empty Eight/geology design](phase1-empty-eight-geology-design.json), [D06 surface-egress survey](phase1-d06-egress-geometry-design.json), [D06 mechanism contracts](phase1-d06-mechanisms.json), [B07/B08/B09 connector geometry](phase1-connector-geometry.json), [exact Cheyenne J-curve](phase1-cheyenne-jcurve-geometry.json), [owner-delegated selection ledger](phase1-autonomous-design-selections.json), [recorded sole-owner acceptance](phase1-owner-review-acceptance.json), [P1-B12 Grand Avenue passive-shell candidate](phase1-grand-avenue-passive-shell-candidate.json), [G03 v2 canonical setout](phase1-g03-canonical-setout.json), [proposal-level ownership/interface registry](phase1-proposed-ownership-interface-registry.json), and [R00 readiness audit](phase1-r00-readiness-audit.json). The sole owner delegated autonomous research, design, and planning, so 20 conservative choices plus P1-B11 are now frozen without introducing any other human decision-maker. The subjective geometry-choice count is zero. Post-approval engineering now partitions every FM-01 candidate and support-gap cell, validates all D06 reservation references and 29 commissioning-test contracts, gives the Grand Avenue no-foreclosure option an exact sealed-shell geometry, normalizes eight exact G03 domains while retaining fifteen null domains, and compiles 27 proposed owners plus 78 directional interfaces without wildcard or last-writer-wins rules. D02, D05, and D06 still HOLD on complete-save, technical acceptance, accepted support/mechanism state, final ownership/interface acceptance, and fourteen null interface geometries. R00 therefore remains G01 PASS and G02-G07 HOLD with zero operations. G02 excludes operations, source guards, manifests, preflight, entity clearance, pilots, execution, rollback, route QA, and post-state QA; those belong to G03-G19. D07's factual wording is resolved as an explicitly architectural composite, and C2 remains omitted with no active mechanism or target cells. None of these records emits operations or authorizes world edits.

## Phase 0 rerun verdict

The rerun completed on 2026-08-04 UTC with no block placement or world edits. The revised footprint was already inside the fully generated first-survey atlas, so no additional temporary force-load tile was needed. The live baseline remained exactly 104 force-loaded chunks.

| Evidence | Result |
|---|---|
| Fresh pre-check snapshot | `data/worldsnap-combined-zones-phase0-rerun-pre-20260804T021237Z/region`; SHA-256 `fe7a3e5a75bbf90104c73bf9f78115300fe66f82b300d2dde7cede9fd993ab37` |
| Fresh post-check snapshot | `data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region`; SHA-256 `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b` |
| Coverage | PASS — all 14,238 atlas chunks and all 6,097 revised-reserve chunks are `minecraft:full` |
| Revised siting gate | **PASS — all eleven gates true** |
| Terrain and grade probe | [corridor-terrain-probe.json](corridor-terrain-probe.json) |
| Full evidence | [phase0-survey-evidence.json](phase0-survey-evidence.json) |
| Candidate search | [resiting-candidate-analysis.json](resiting-candidate-analysis.json) |
| Whole-world top-down | [maps/current-plus-proposed-phase0-overlay.png](maps/current-plus-proposed-phase0-overlay.png) |

The eleven passing gates are full atlas coverage, a 1:8-or-flatter engineered passenger-rail profile, five dry core anchors, a dry Empty Eight footprint, the terminal wholly south of Gateway Approach, zero snowy/frozen terminal columns, eight-block cover across every terminal column, zero vertical structure conflicts in the terminal shell, under 5% water exposure in the mountain footprint, under 5% in the urban footprint, and explicit no-touch treatment for the three generated surface relics.

Passing Phase 0 does not mean the terrain is cheap. The corridor's natural surface still ranges from `Y=55…122`; 39 sampled intervals are naturally steeper than 1:8, and three samples are water. The engineered rail profile passes at a maximum grade of `0.125`, but requires as much as **36 blocks of cut** and **23 blocks of fill**. Those are disclosed civil-design inputs, not hidden contingencies.

## What exists now

The accepted construction baseline remains the terminal July 28 snapshot with SHA-256 `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`. The Phase 0 snapshots expand and verify terrain evidence; they are not new accepted construction releases.

The durable catalog contains 1,215 features over `x=-714…1300`, `y=-46…319`, `z=-719…311.5`, including MainStreet America, Raven Rock, Ravensreach, Ravensgate, Westlight, the Data District, C01, the owner estate, and PassageWay. The revised Combined Zones reserve starts at `x=1500`, retaining a 200-block separation from the catalog's eastern maximum.

The map is north-up at one pixel per block. Cyan marks the accepted feature union; amber marks the corridor and revised reserve; purple marks the mountain; pink marks the urban core; cyan-blue marks the Empty Eight shell.

## Coordinate system and adopted transform

World orientation remains:

- north = `-Z`
- east = `+X`
- up = `+Y`

Let `(lx, ly, lz)` be a coordinate in normalized Masterplan 04 no-ravine space. The adopted top-down transform is:

```text
worldX = 2048 + localX
worldZ = -328 + localZ
```

There is no top-down rotation. Local north remains world north, so Houston forms the arrival core and the mountain extends north behind it. Gateway Approach is a separate current-world adapter; it is not forced through the core transform.

| Normalized local point | Adopted world point | Phase 0 terrain | Meaning |
|---|---:|---:|---|
| `(0,0,0)` | `(2048,-328)` | dry `Y=88` | Houston/local origin |
| `(60,0,-70)` | `(2108,-398)` | dry `Y=63` | public shaft head |
| `(0,0,-200)` | `(2048,-528)` | dry `Y=86` | SubTropolis center |
| `(0,200,-420)` | `(2048,-748)` | dry `Y=83` | Cheyenne outer portal |
| `(0,325,-540)` | `(2048,-868)` | inside chamber envelope | Cheyenne chamber center |
| `(0,800,-500)` | `(2048,-828)` | dry `Y=81` | summit footprint |

Standalone child-plan coordinates are not world coordinates. Houston, SubTropolis, and Cheyenne geometry must first be normalized into Masterplan 04 space and then use the transform above.

## Vanilla-height redesign

Masterplan 04 assumes a modded vertical range of roughly `Y=-100…800`. The live Paper world is vanilla `Y=-64…319`, so verbatim insertion is impossible. The retained detailed-design mapping is:

```text
for localY <= 0: worldY = 72 + 1.28 × localY
for localY >= 0: worldY = 72 + 0.29 × localY
```

| Layer | Proposed world Y |
|---|---:|
| SubTropolis floor / design minimum | `-56` |
| public-shaft observation landing | `8` |
| Empty Eight platform rail | `40` |
| Houston street datum | `72` |
| granite/limestone contact | `130` |
| Cheyenne chamber | `145…188` |
| summit | `304` |

The mapping leaves eight blocks above the lower world limit and 15 below the upper limit. The geological/material sequence remains, but the authored vertical distance is explicitly compressed. Terrain tie-ins, city cut/fill, shaft doglegs, and the summit switchback remain detailed-design work.

## Zone plan

All bounds are inclusive planning envelopes, not cleared construction limits.

| Zone | Adopted envelope or anchor | Program and Phase 0 result |
|---|---|---|
| Z00 Revised reserve | `x=1500…2550`, `z=-1150…300` | 1,525,001 surveyed columns; 16.09% water; coordination envelope only |
| C1 East Corridor | `(430,80)` to `(1550,-250)` | 1,244-block multimodal corridor; catalog clearance PASS; sampled rail profile PASS |
| Z01 Gateway | `(1550,68,-250)`, terrain `Y=71` | dry road/rail/forecourt interface replacing the failed meadow anchor |
| Z02 Gateway Approach | `x=1500…2250`, `z=-1100…0` | landscape, utilities, passenger rail, two future stops, and hidden subway branch |
| Z02-U1 Empty Eight south annex | `x=1632…1872`, `z=40…160`, `Y=38…54` | dry eight-track terminal wholly south of Gateway Approach; linked operationally but outside its surface bounds |
| Z03 Grand Avenue | `(1750,-300)` to `(2048,-328)` | civic approach entirely north of the `z=-250` surface rail; no skew crossing |
| Z04 Houston | `x=1979…2117`, `z=-397…-259` | 138×138 downtown and public arrival core |
| Z05 Houston tunnels | same X/Z as Z04, `Y=64…72` | pedestrian city-in-a-city network with flood control |
| Z06 Public shaft | `(2108,72,-398)` to lobby near `(2108,-56,-428)` | dry head anchor; dogleg and egress still require design |
| Z07 SubTropolis | `x=1948…2148`, `z=-628…-428`, `Y=-56…72` | pillar chamber, tenants, public and controlled interfaces |
| Z08 Service/contact | `(1948,72,-628)` via `(2008,130,-688)` to `(2048,130,-748)` | service rail, rock transition, terrane plaque, secure threshold |
| Z09 Mountain | `x=1648…2448`, `z=-1128…-528`, `Y=72…304` | continuous no-ravine mountain; 2.62% water exposure; three no-touch relic voids |
| Z10 Cheyenne | `x=2008…2088`, `z=-908…-828`, `Y=145…188` | J-curve, blast doors, spring-mounted internal program |
| Z11 Summit | `(2048,304,-828)` | dry footprint; switchback funicular and return road |

The mountain intentionally overlaps underground zones in plan. That is vertical nesting, not shared ownership. Every physical cell still requires exactly one canonical owner.

## Gateway Approach passenger rail

The surface passenger line reaches Z02 at `z=-250` on the adopted `Y=68` interface plane. Four surveyed points are dry:

| Node | Coordinate | Terrain Y | Role |
|---|---:|---:|---|
| GW-1 Gateway | `(1550,68,-250)` | 71 | transfer from C1 and Gateway forecourt |
| GA-S1 Gateway Gardens | `(1640,68,-250)` | 65 | future-use request stop; two 48-block side platforms |
| GA-J1 Alpine Junction | `(1780,68,-250)` | 63 | surface stop/turnout and concealed subway split |
| GA-S2 Approach Commons | `(1920,68,-250)` | 63 | future-use request stop; two 48-block side platforms |

GA-S1 and GA-S2 are deliberately built for later demand. Each needs an accessible surface route, stopping control, lighting, signs, weather cover, utilities, and protected extension ends. They are operationally complete stops, not decorative platforms.

## Hidden subway branch and the Empty Eight

At GA-J1, a siding appears to terminate behind a landscaped retaining wall. A subtle marker reveals the continuing tunnel. The easter egg is the discovery; egress and operational safety remain obvious once inside.

The branch turns south after the hidden turnout and remains comfortably within 1:8:

```text
(1780,68,-250)  surface turnout
(1785,64,-215)  dry concealed portal
(1760,56,-130)  descending tunnel
(1700,48,-20)   south-bound approach
(1632,40,100)   west terminal throat
```

The first segment is the steepest at `4/35.355 = 0.1131`; the remaining segments are flatter. The branch descends 28 blocks over about 387 horizontal blocks. Its destination begins at `z=40`, leaving a 39-block planning buffer south of the inclusive Gateway Approach boundary at `z=0`.

### Z02-U1 Gateway Expansion Terminal

Official name: **Gateway Expansion Terminal**. In-world nickname: **The Empty Eight**.

| Element | Adopted Phase 0 definition |
|---|---|
| Shell | `x=1632…1872`, `z=40…160`, `Y=38…54` |
| Surface relationship | wholly south of Gateway Approach; no shell column lies in the arctic/frozen biome set |
| Cover | terrain `Y=62…136`; all 29,161 columns dry; all 29,161 provide at least eight blocks over roof `Y=54` |
| Structure clearance | one mineshaft start intersects in X/Z at `Y=-16…3`, wholly below the shell; vertical conflicts = 0 |
| Rail plane | `Y=40` |
| Tracks | 8 east–west tracks centered at `z=54,67,80,93,106,119,132,145` |
| Track extent | `x=1632…1872`; west throat at `x=1632`; eight sealed future stubs at `x=1872` |
| Platforms | 8, one assigned to each track; approximately 7×101 blocks |
| Future network | four line pairs: 1–2, 3–4, 5–6, 7–8; every interface is sealed and separately owned |
| Concourse/mall | two monumental side gallerias, perimeter mezzanine, four future ticket-hall boxes, 24 capped retail shells, plant, storage, toilets, and open atria |
| Life safety | two independent protected egress/accessible routes, smoke-separated stairs/lifts, ventilation, emergency lighting, platform barriers, drainage sumps, and fire/service access |

The architectural language is late-Soviet-inspired civic monumentality—deep vaults, long sightlines, stone, chandeliers, mosaics, and an oversized mall—without copying a specific station. It should feel fully finished and strangely underused, ready for a future network that may never arrive.

No initial subway connection opens to PassageWay, SubTropolis, Houston's pedestrian tunnels, or secure Cheyenne circulation. Future lines may open only through exact interface contracts, fresh source evidence, guarded operations, rollback, and bidirectional route QA.

## Mountain water and generated-structure treatment

The mountain footprint contains 12,597 water columns out of 481,401 (2.62%). These pockets become deliberately owned drainage, interior lakes, bridged voids, or separately compiled fill after hydrology review; the Phase 0 percentage does not authorize bulk filling.

Three surface generated structures lie inside the broad mountain envelope and are mandatory no-touch exhibits:

- igloo `x=1790…1797`, `z=-926…-920`, recorded `Y=62…66`;
- igloo `x=2304…2310`, `z=-1024…-1017`, recorded `Y=90…94`;
- shipwreck `x=2072…2099`, `z=-661…-653`, recorded `Y=69…77`.

The mountain compiler must exclude their exact blocks and a reviewed buffer from shell ownership. Preserve them in place as outcrops or interior relic galleries; observation access is a separate package. No relocation or destruction is implied.

## Connection to the current map

### C1 East Corridor

The primary physical connection is a single 1,244-block reservation from MainStreet East to Gateway Approach. It carries highway, double-track passenger rail, protected walking, drainage, and utilities together so one mode cannot foreclose another.

```text
W-TERM (430,80)
  → PI-1 (905,80)
  → PI-2 (1065,-80)
  → PI-3 (1330,-80)
  → E-TERM (1550,-250)
```

The first three legs retain their orthogonal/45-degree study geometry. The re-sited final leg is 220 east by 170 north and must use a coarse grid staircase. The full reservation remains 56 blocks with 12-block slope easements on both sides, for an 80-block total land take. The railway keeps the 13-block north flank.

Catalog X/Z clearance still passes. The key existing interfaces remain C01 Owner Tunnel Detour directly below the corridor and the C01 East L1–L3 stack 18 blocks away in plan. Those findings do not authorize embankment loading; detailed structural checks must bind the sampled rail profile and the highway profile.

The passenger-rail profile starts and ends at `Y=68`, ranges `Y=63…114`, and never exceeds 1:8. It is not a claim that the highway can use the same vertical setout. Road geometry, bridge/tunnel choices, drainage, retaining walls, and earthwork volumes remain Phase 1 design.

### Stations

| Station | Proposed coordinate | Role |
|---|---:|---|
| MS-1 MainStreet East | `(430,68,80)` | western terminus |
| DD-1 Data District | approximately `(1240,77,-80)` | district access; nearby water samples require bridge/drainage design |
| GW-1 Gateway | `(1550,68,-250)` | current-world/Combined-Zones transfer |
| GA-S1 Gateway Gardens | `(1640,68,-250)` | future-use stop |
| GA-S2 Approach Commons | `(1920,68,-250)` | future-use stop |

The world currently has no cataloged rail, so MS-1 is a true terminus. If the highway is staged first, the full rail strip must remain empty, every crossing must clear-span it, and every soffit must preserve rail vertical clearance from the accepted profile.

### Data District and local interfaces

The Data District keeps one service interchange on the 265-block tangent. Two separate mainline interchanges do not fit the spacing. All four ramps remain in the southern quadrants so the north-flank railway is undisturbed.

The west terminal's Ravensreach and Observatory links remain concepts tied to cataloged approaches. D03 deletes the proposed MainStreet East L2 gate from active scope because its point `(305,80)` is water and no matching cataloged campus gate exists. This planning deletion authorizes neither demolition nor a substitute connection; a later revision may restore L2 only after a real dry gate is surveyed and accepted.

Grand Avenue no longer crosses the surface passenger rail. Its revised path from `(1750,-300)` to `(2048,-328)` stays north of the `z=-250` track, retiring the former 7.9-degree skew-crossing defect.

P1-B12 preserves a future tunnel option under that exact 299-point profile. The selected review candidate follows a reference line six blocks below road grade, using an 8×6 outer shell, 6×4 retained void, two reserved road-load separation layers, sealed end caps, and sealed bulkheads every 32 stations. Its exact 14,352-cell outer envelope and 19,136-cell influence union include eleven current water/waterlogged cells and 832 cells inside the Houston Z03/Z05 coordination envelope. This makes the long-term sequencing answer explicit: reserve the tunnel now and, only if all complete-save, structural/road-load, hydrology, utilities, D06 occupiable-use, owner/interface, global-audit, and release gates pass before the road, construct a sealed rough shell first. Do not fit it out, open an interface, or excavate it merely because the geometry exists. If any HOLD remains when Grand Avenue is released, build no shell and retain only the no-foreclosure reservation.

The surface road now has a matching exact proposal without changing the accepted B11 profile. Its eight-wide lattice uses Z offsets `-3…+4`, producing 2,392 road cells, an 11,960-cell interaction union, and 5,980 load/drainage/utility reservation cells. The exact 4,784-cell load set coordinates with P1-B12; the Houston interaction is 260 cells while direct surface overlap is zero. These figures remove setout ambiguity, not technical HOLDs: pavement/future states, earthwork, retaining, drainage receivers, utilities, structural load transfer, geotechnical behavior, complete-save clearance, owners/interfaces, and physical release remain unaccepted.

### Optional and future interfaces

- **C2 visitor portal:** logical link only; activation requires a selected mechanism, safe symmetric landings, permission review, and a tested return path.
- **C3 PassageWay:** reserve an endpoint at the SubTropolis public lobby, but do not infer a current tunnel door. C01 east remains contested under ISSUE-002.
- **C4 concealed subway:** internal Z02 provision from GA-J1 to Empty Eight. Surface railway, branch shell, terminal fit-out, and future interfaces remain separate rollback scopes.

## Visitor sequence

1. Enter C1 east of MainStreet by road, walking route, or MS-1 train.
2. Pass the Data District and arrive at Gateway on the dry `Y=68` interface.
3. Continue through Gateway Gardens and Approach Commons.
4. Optionally discover the hidden siding and descend into the Empty Eight.
5. Follow Grand Avenue to Houston.
6. Descend by the public shaft to SubTropolis.
7. Transfer to the controlled service route and cross the limestone/granite contact.
8. Enter Cheyenne behind the secure threshold.
9. Ride the switchback funicular to the summit and return by mountain road.

The material narrative is current-world history → landscaped arrival → monumental latent subway / Houston modernity → limestone industry → granite security → open summit.

## Delivery sequence

### Phase 0 — prove the site — **COMPLETE: PASS**

- Fresh pre/post snapshots, full chunk coverage, terrain raster, structure inventory, exact footprint censuses, candidate analysis, and rail profile are sealed.
- The rerun required no additional chunk generation and preserved the 104-ticket baseline.
- Exit gate: **PASS for detailed design only.**

### Phase 1 — freeze interfaces and civil design

- Compile exact C1 road and rail centerlines, curve staircases, bridges/tunnels, retaining walls, drainage, and earthwork volumes.
- Re-run C01/owner-tunnel structural interfaces against both accepted vertical profiles.
- Freeze the 56-block reservation and 13-block rail strip before any surface package.
- Enforce the D03 deletion of the unsurveyed L2 campus gate from active scope.
- Freeze Z02 stops, GA-J1, subway descent, egress shafts, terminal cross-sections, protected relic buffers, and hydrology ownership.
- Freeze complete accepted design and interfaces at R00, then produce the bounded reversible R01 visual pilot as post-R00 physical validation.

R00 gate: G01-G07 pass from design and external-acceptance evidence only. Phase 1 exit: after R00, R01 passes G01-G19, including ownership, entity clearance, protected-feature clearance, source guards, bidirectional validation, drainage/grade review, immutable post-state, and rollback proof.

### Phase 2 — deep shells first

- Excavate and line Empty Eight, its branch, egress, ventilation, and eight sealed future interfaces.
- Excavate the public shaft lower works and SubTropolis.
- Construct the service/contact route and Cheyenne shell with independent construction access.
- If and only if the separate P1-B12 gates all pass, construct the nonoccupiable Grand Avenue passive shell with every cap, bulkhead, utility reservation, and Houston interface sealed. Otherwise preserve the reservation and omit the shell.
- Preserve required buffers around generated structures and between public, utility, tenant, and secure circulation.

Exit gate: fluids, headroom, lighting, egress, route graphs, shell ownership, and rollback all pass before surface loads.

### Phase 3 — surface framework

- Form the mountain in hydrology-reviewed packages around the three protected relic voids.
- Build Gateway Approach, its two future stops, Grand Avenue, Houston, and the public realm only after the P1-B12 pre-road shell-or-no-shell decision rule is resolved against the accepted evidence identity.
- Build the summit return and funicular as switchbacks, never the obsolete vertical line.

Exit gate: terrain tie-ins, no unintended water diversion, protected relics intact, and surface routes clear of deep shells.

### Phase 4 — fit-out

- Complete Empty Eight's eight platforms, monumental concourse, mall shells, discovery sequence, life safety, and capped future space.
- Fit out Houston, SubTropolis, the contact sequence, Cheyenne, and summit facilities.

Exit gate: safe circulation, enforced access classes, transactional block-entity handling, and evidence for every exact object.

### Phase 5 — transport and commissioning

- Commission C1 highway, roundabouts, Data District interchange, walking route, and passenger railway.
- Commission GA-S1/GA-S2, then commission the concealed branch and terminal as separate operational/rollback scopes.
- Commission the public shaft, internal rail, service rail, funicular, and return road.
- Keep C2 optional and C3 sealed until their separate gates pass.

Exit gate: bidirectional no-dig/no-tower walks, powered-door and minecart tests, entity clearance, immutable post snapshot, rollback preflight, database import, maps, and matched media.

## Release rules

- One canonical compiler owns every transformed coordinate.
- Every physical cell has one canonical zone owner; shared seams need exact interface contracts.
- Generated structures and accepted current features are default-deny unless an exact reviewed contract says otherwise.
- Every physical package requires a fresh immutable source snapshot, exact one-cell forward and rollback operations, strict-noop preflight, live clearance, post snapshot, and final acceptance.
- Use `scripts/rcon_runner.py --strict-noop --report <json>` for any separately authorized physical release.
- Never replay accepted Town Expansion or redevelopment operation files.
- A planned feature remains planned until post-state verification, route QA, media QA, and database import pass.

## Decision status

1. **D01 resolved:** use the current world with Masterplan 05 vertical adaptation. Exact per-owner integer construction setout remains a separate Phase 1 gate.
2. **D02 HOLD:** the exact alignment, independent highway profile, cross-section, diagnostic quantities, and C01 geometric comparisons are frozen. The owner-delegated ledger selects the exact R140/R120/R140 raster and treats the authored staircase rhythm as non-controlling visual detail. The region audit seals 80,363 columns, 30,859,392 full-height cells, 437 chunks with zero missing, all eight C01 volumes, and the old/east/portal/P01 study scopes. D02-S03 expands this to 62,816,256 cells across 639 chunks, identifies 1,458 water-family and 269 lava components, and finds zero acceptable gravity-low receiver candidates under the selected default no-diversion rule. D02-S04 freezes a 432-cell preferred planning alternative with ten strict-clear capped-sump candidates and one explicit no-build preservation hold at `ROAD-LOW-001`. The bounded C01 proposal now gives the 7,803-cell terminal datum and 944,298-cell load-path reservation exact one-owner/sealed-interface geometry: loading precedence withholds 45 of 54 local D02 candidate cells and leaves nine terminal caps as proposals. The technical matrix retains complete-save, capacity, freeboard, failure, future-fluid, structural/geotechnical/loading/settlement, ISSUE-002, hydraulic receiver, material, ownership/interface, and final acceptance HOLDs. The dedicated intake sees 51 region files but no `entities/`, `poi/`, `level.dat`, or capture manifest. R01 subsequently validates the accepted frozen design and cannot resolve D02 or G02.
3. **D03 resolved:** delete the unsurveyed MainStreet East L2 proposal from active scope without authorizing demolition or a substitute coordinate.
4. **D04 resolved:** preserve passenger rail as a fully clear-spanned empty reservation; track construction requires its own later release.
5. **D05 HOLD:** the full-height copied-snapshot fluid/cryosphere census, connected components, surface-routing candidate, and exact relic records are frozen. Under the owner delegation, core-plus-one-cell minimum planning exclusions, absent east-site reservation without reconstruction/reuse, three logical control roles, exact future-state schema, and zero-undeclared-change/no-diversion criteria are selected. D05-S01 now seals 0 east-igloo, 187 west-igloo, and 1,118 shipwreck present cells; it finds exact 14- and 19-cell outside-exclusion observation-route candidates for the west igloo and shipwreck, but authorizes no access. The selected `FM-01-COMPACT-EAST-FACE` proposal now partitions all 14,768,553 candidate cells into 14,580,291 bulk-stone and 188,262 exposed-finish cells. It classifies all 754,224 below-coordination support gaps exactly once: 17,997 receive an explicit treatment-class proposal, while 736,227 hydrology/cryosphere cells and all support canonical states stay null. These are unaccepted proposals: support states, hydrology/geotechnical effects, relic influence, B09 systems, owners, interfaces, complete-save evidence, and independent technical acceptance remain HOLD, so accepted future/construction cells stay zero. Operation, rollback, and post-state proof are later G03-G19 validation.
6. **D06 HOLD:** the internal Empty Eight palette, cue, platforms, retail shells, safety reservations, and eight sealed future-line contracts are frozen. Two independent dry surface landings are exact at `(1652,80,148)` and `(1852,71,148)`, with disjoint 7×7 continuation reservations, no water/lava, and no generated-start intersections. The B07 west-two route clears recorded generated-structure bounds but still contains 38 current water cells. The detailed post-approval compiler binds all 73 source references and emits 31 exact stair/lift, vent, smoke/barrier, normal/emergency power, drainage, and internal fire/service proposal layers. Twenty-one explicit precedence records resolve 242 duplicate coordinates into 9,065 canonical proposal cells; 29 commissioning-test contracts remain non-executable. External egress/discharge/fire routes, actual mechanism/material states, circuit sources and independence, hydraulic receivers, structural/geotechnical design, complete-save clearance, owners/interfaces, technical acceptance, and commissioning remain HOLD; every opening and discharge stays sealed. Source guards, packaging, preflight, pilot, rollback, and operational QA are later G03-G19 validation.
7. **D07 resolved:** use the fact-checked six-panel architectural-composite wording; do not claim a natural contact, thrust/overthrust, laccolith, or `270 Ma` date. The optional C2 visitor portal remains omitted from active construction scope.

The machine-readable selections and closure requirements are in [phase1-design-decisions.json](phase1-design-decisions.json). Until D02, D05, D06 and every later release gate pass, every coordinate here remains a proposed design setout, not a build command.
