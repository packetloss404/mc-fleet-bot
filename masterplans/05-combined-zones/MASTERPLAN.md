# Masterplan 05 — Combined Zones

Status: **PHASE 0 SOUTH ANNEX RESITE PASSED — REVISED SCHEME APPROVED FOR DETAILED DESIGN — NOT AUTHORIZED FOR WORLD EDITS**

## Decision

Keep the Combined Complex in the current world, east of the existing catalog, but use the re-sited layout proven by the Phase 0 rerun. The first `(2250,-300)`, 90-degree transform remains negative evidence only. It put decisive anchors in water and gave the Empty Eight adequate cover over only 35.60% of its shell.

The adopted study geometry does four things together:

- keeps **Ravensreach** as the current world's canonical historic town and Old Town;
- keeps **Gateway Approach** as the landscaped transition from the current map, including two future-use passenger stops;
- rotates the Combined Complex back to north–south and moves its local origin to `(2048,-328)`;
- moves the hidden eight-track subway terminal wholly south of Gateway Approach to a dry, non-arctic, cover-compliant footprint.

The former northern terminal at `x=1880…2220`, `z=-1008…-848` is retired. Its Phase 0 surface-water count was zero, but its snowy/frozen setting read as an arctic-water placement in-world. The adopted southern site preserves the program while removing that ambiguity.

This is a master plan, not an execution package. It authorizes detailed design only. No excavation, grading, structure removal, protected-feature work, or construction is authorized.

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

The west terminal's Ravensreach and Observatory links remain concepts tied to cataloged approaches. The proposed MainStreet East L2 gate is unresolved: its point `(305,80)` is water and no matching cataloged campus gate exists. Phase 1 must survey a real dry gate or delete L2.

Grand Avenue no longer crosses the surface passenger rail. Its revised path from `(1750,-300)` to `(2048,-328)` stays north of the `z=-250` track, retiring the former 7.9-degree skew-crossing defect.

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
- Resolve or delete the L2 campus gate.
- Freeze Z02 stops, GA-J1, subway descent, egress shafts, terminal cross-sections, protected relic buffers, and hydrology ownership.
- Produce exact zone/interface contracts and a bounded visual pilot with rollback.

Exit gate: current ownership audit, entity census, no protected conflicts, exact source guards, bidirectional pilot, drainage/grade review, and rollback.

### Phase 2 — deep shells first

- Excavate and line Empty Eight, its branch, egress, ventilation, and eight sealed future interfaces.
- Excavate the public shaft lower works and SubTropolis.
- Construct the service/contact route and Cheyenne shell with independent construction access.
- Preserve required buffers around generated structures and between public, utility, tenant, and secure circulation.

Exit gate: fluids, headroom, lighting, egress, route graphs, shell ownership, and rollback all pass before surface loads.

### Phase 3 — surface framework

- Form the mountain in hydrology-reviewed packages around the three protected relic voids.
- Build Gateway Approach, its two future stops, Grand Avenue, Houston, and the public realm.
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

## Decisions still required

1. Accept the same-world vertical compression or move the native-height concept to a separate world.
2. Choose the C1 highway's exact bridge/tunnel/cut/fill solution around the passing rail profile.
3. Survey a real dry MainStreet East gate for L2 or delete that road.
4. Decide whether passenger rail is built with the highway or preserved as a fully clear-spanned reserved strip.
5. Approve the mountain hydrology plan and exact no-touch buffers around the two igloos and shipwreck.
6. Approve Empty Eight's palette, discovery cue, retail-shell schedule, egress, ventilation, and sealed future-line contracts.
7. Approve the final geological wording and any optional portal mechanism.

Until those decisions and the later release gates pass, every coordinate here remains a proposed design setout, not a build command.
