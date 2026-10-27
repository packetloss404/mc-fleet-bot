# Masterplan 05 — Combined Zones

Status: **BOUNDED MVP ACCEPTED — R13 CONSOLIDATED MVP ACCEPTED — R08AL/R08AM EMPTY EIGHT PUBLIC-RETAIL ROUND ACCEPTED**

## Decision

Keep the Combined Complex in the current world, east of the existing catalog, but use the re-sited layout proven by the Phase 0 rerun. The first `(2250,-300)`, 90-degree transform remains negative evidence only. It put decisive anchors in water and gave the Empty Eight adequate cover over only 35.60% of its shell.

The adopted study geometry does four things together:

- keeps **Ravensreach** as the current world's canonical historic town and Old Town;
- keeps **Gateway Approach** as the landscaped transition from the current map, including two future-use passenger stops;
- adopts the north-aligned Combined Complex at `0°` rotation and moves its local origin to `(2048,-328)`;
- moves the hidden eight-track subway terminal wholly south of Gateway Approach to a dry, non-arctic, cover-compliant footprint.

The former northern terminal at `x=1880…2220`, `z=-1008…-848` is retired. Its Phase 0 surface-water count was zero, but its snowy/frozen setting read as an arctic-water placement in-world. The adopted southern site preserves the program while removing that ambiguity.

This master plan now carries standing owner authority for continued construction. The exact controlling instruction, its scope, and the retained safety boundary are recorded in [OWNER-DIRECTIVE.md](OWNER-DIRECTIVE.md) and [phase1-standing-build-authorization.json](phase1-standing-build-authorization.json). Individual operation files remain exact, guarded execution packages; this plan does not itself contain RCON commands.

The authority chain is `01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement`. Masterplan 04's [authority reconciliation](../04-combined-complex/AUTHORITY.md) and [machine-readable bridge](../04-combined-complex/authority-reconciliation.json) control that boundary. Masterplan 05 does not replace child internals or normalized 04 architecture; it owns their placement, evidence constraints, adapters, additions, and gates.

Current status is controlled by the [authoritative current-state ledger](CURRENT-STATE.md) and the reconciled [machine-readable release contract](phase1-release-contract.json). R07–R12 have six of six required bounded dependency closures. R12R closed the original MVP denominator with a bounded B09 maintenance shuttle, and the consolidated R13 verifier accepted G16–G19. The later R08AL/R08AM post-MVP round is a separate, exact, reversible Empty Eight conversion; it does not broaden the R12R transport claim or reopen any retained rail, utility, drainage, fire/service, ventilation, or external interface.

R12R remains the immutable terminal MVP baseline. The latest accepted physical baseline is now `data/worldsnap-r08am-post-20260822T161818Z`, complete-save SHA-256 `0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699`. It includes R08AL's clean dystopian public vacant-retail gallery and maintained restricted back-of-house, followed by R08AM's connected restricted theatre/private-club annex. Every successful package retains distinct source/post evidence and exact reverse-order rollback verification. N06, the wet/gravity north-smoke residual, the unexcavated riser, FIRE-EG-B, exterior mechanisms, whole-corridor/rail/hydraulic/utility claims, and optional future interfaces remain local nonclaims rather than project blockers.

The preconstruction design wave is preserved in the linked D02, D05, D06, G03, ownership, interface, and owner-review records. Its final [R00 readiness audit](phase1-r00-readiness-audit.md) supersedes earlier partial counts and reports G01–G07 **PASS with zero blockers**. Later guarded releases then built R01–R06; the [current-state ledger](CURRENT-STATE.md) and [whole-build live decision](../../redevelopment/2026-08-08-whole-build-live-decision.md) control their as-built status. Non-verbatim historical language claiming that the owner did not authorize construction is retained only as provenance and cannot override the exact 2026-08-21 directive.

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
| Concourse/mall | two monumental side gallerias, perimeter mezzanine, four future ticket-hall boxes, and 24 authored retail-shell reservations. Eleven south bays are now clean, lit, publicly viewable vacant-retail spaces reached from a bounded internal gallery; S06 and every north bay remain capped. Maintained restricted back-of-house and the lower restricted annex are not public space. |
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

### Phase 1 — freeze interfaces and civil design — **COMPLETE / AS-BUILT**

- Compile exact C1 road and rail centerlines, curve staircases, bridges/tunnels, retaining walls, drainage, and earthwork volumes.
- Re-run C01/owner-tunnel structural interfaces against both accepted vertical profiles.
- Freeze the 56-block reservation and 13-block rail strip before any surface package.
- Enforce the D03 deletion of the unsurveyed L2 campus gate from active scope.
- Freeze Z02 stops, GA-J1, subway descent, egress shafts, terminal cross-sections, protected relic buffers, and hydrology ownership.
- R00 froze the accepted design and interfaces at seven of seven PASS. R01 then executed guarded physical work and verification.

Current result: R00 is complete and R01 is as-built. Historical design and pilot records remain evidence, but no longer block later disjoint scopes.

### Phase 2 — deep shells first — **MATERIALLY AS-BUILT**

- Excavate and line Empty Eight, its branch, egress, ventilation, and eight sealed future interfaces.
- Excavate the public shaft lower works and SubTropolis.
- Construct the service/contact route and Cheyenne shell with independent construction access.
- If and only if the separate P1-B12 gates all pass, construct the nonoccupiable Grand Avenue passive shell with every cap, bulkhead, utility reservation, and Houston interface sealed. Otherwise preserve the reservation and omit the shell.
- Preserve required buffers around generated structures and between public, utility, tenant, and secure circulation.

Current result: R02 and the combined R03/R04 physical releases executed with strict-noop guards and verified rollback. Deferred surface tops, wet-zone details, portals/headhouses, lining, rail, and fit-out move forward as exact local packages.

### Phase 3 — surface framework — **R05/R06/R07A–R07K AS-BUILT; R07 ARCHITECTURE COMPLETE**

- Form the mountain in hydrology-reviewed packages around the three protected relic voids.
- Build Gateway Approach, its two future stops, Grand Avenue, Houston, and the public realm only after the P1-B12 pre-road shell-or-no-shell decision rule is resolved against the accepted evidence identity.
- Build the summit return and funicular as switchbacks, never the obsolete vertical line.

Current result: the FM-01 mountain, wet liners, Grand Avenue support, R07A P1-B03 polished-diorite portal tube/openings, R07B viaduct bents, R07C B08 service-tunnel cover/openings, the R07D/R07E B09 lower/summit station shells, the complete connected R07F/R07H/R07I B09 guideway framework through the retained summit cap, both R07G Empty Eight surface headhouse shells, the R07J supported fail-closed B07 surface headhouse, and the R07K twin B03 portal collars are materially present. Sixteen exact lava-pocket cells remain a local no-blind-placement exception. The bounded R07 architecture wave is complete; rails, vehicles, drives, brakes, controls, drainage, rescue, and commissioning remain R10/R12 systems work.

R10B is as-built, post-verified, reversible, and independently accepted. Its
exact two-cell internal summit threshold joins the accepted 1,096-cell B09
guideway void to the 18-cell summit interior as one 1,116-cell component while
preserving the complete exterior Z11 cap and all 7,798 non-target B09 cells.
This does not install or commission rail, vehicle, drive, brake, controls,
power, drainage, or external summit access. See the
[R10B release note](phase1-r10b-b09-summit-internal-approach-release.md).

R10C is as-built, post-verified, reversible, and independently accepted. Its
three full-cube summit ceiling fixtures provide a passive visual cadence while
preserving the complete 18-cell route void, exact 162-cell enclosure including
the retained R10B seam, ten-cell approach collar, 12-cell exterior Z11 cap,
21-cell halo, and all 7,797 non-target B09 accommodation cells. Active rail,
drive, brake, vehicle, control, power, drainage, emergency-lighting, and
commissioning scope remains unclaimed pending exact mechanism geometry. See
the [R10C release note](phase1-r10c-b09-summit-passive-lighting-release.md) and
[post-QA](../../../data/world-review/combined-zones-r10c-live-20260821T233530Z/r10c-post-release-qa.json).

R10D is as-built, post-verified, reversible, and independently accepted. Its
two full-cube lower-station ceiling fixtures provide a passive visual cadence
at FM-01 indices 4 and 7 while preserving the complete 12-cell route void,
exact 84-cell shell including the retained R07F seam, 12-cell B08 cap,
ten-cell seam collar, 14-cell interaction halo, and all 7,798 non-target B09
accommodation cells. Active rail, drive, brake, vehicle, barrier, control,
power, drainage, emergency-lighting, and commissioning scope remains unclaimed
pending exact mechanism geometry. See the
[R10D release note](phase1-r10d-b09-lower-station-passive-lighting-release.md)
and [post-QA](../../../data/world-review/combined-zones-r10d-live-20260821T235524Z/r10d-post-release-qa.json).

R10E is as-built, post-verified, reversible, and independently accepted. Its
15 full-cube
lower-guideway ceiling fixtures extend the passive visual cadence across the
complete 474-cell lower straight at 16-index spacing. The 1,426-cell boundary,
12-cell B08 cap, four-cell R07I curve aperture, eight-cell collar, and 105-cell
halo remain exact with no undeclared drift. Including R10D, the maximum
route-index distance to an accepted fixture is eight. Active rail, drive,
brake, vehicle, barrier,
control, power, drainage, life-safety lighting, and commissioning scope remains
unclaimed pending exact mechanism geometry. See the
[R10E release note](phase1-r10e-b09-lower-guideway-passive-wayfinding-release.md)
and [post-QA](../../../data/world-review/combined-zones-r10e-live-20260822T001339Z/r10e-post-release-qa.json).

R10F is as-built, post-verified, reversible, and independently accepted. Its
19 full-cube ceiling
fixtures continue the passive visual cadence across the complete R07I curve,
face ascent, and summit return at 16-index spacing. The 622-cell segment route,
complete 1,116-cell B09 route, 1,866-cell segment boundary, 3,346-cell complete
boundary, both 12-cell external caps, and 133-cell halo remain exact with zero
undeclared B09 drift. Together
with R10C–R10E, the maximum route-index distance to an accepted fixture is
eight. Active rail, drive, brake, vehicle, barrier, control, power, drainage,
life-safety lighting, and commissioning scope remains unclaimed pending exact
mechanism geometry. See the
[R10F release note](phase1-r10f-b09-curve-summit-passive-wayfinding-release.md)
and [post-QA](../../../data/world-review/combined-zones-r10f-live-20260822T003320Z/r10f-post-release-qa.json).

R10G is as-built, post-verified, reversible, and independently accepted as the
complete B03 institutional contact-sequence fit-out. Its exact two-package
release covers 5,346 liner cells across frozen centerline indices 471–767 and
preserves the connected 5,940-cell air route, both adjacent 20-cell seams, all
49 fixtures, and the complete accepted R10A liner/route/terminus. The
21,528-cell interaction domain has zero undeclared drift. It remains a physical
fit-out, not a secure/public route, access-control, or active-system
commissioning claim. See the
[R10G release note](phase1-r10g-b03-institutional-contact-sequence-fitout-release.md)
and [post-QA](../../../data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json).

R10H is as-built, post-verified, reversible, and independently accepted as the
exact 48-cell passive-lighting enabler for B03 centerline indices 188–470. Its
1,296-cell halo has exactly 48 declared changes and zero drift, all 5,346 R10G
predecessor targets remain exact, and its post-state inverse passes 48/48.
This physical package does not itself commission access or any route. See the
[R10H release note](phase1-r10h-b03-preinstitutional-passive-route-lighting-release.md)
and [post-QA](../../../data/world-review/combined-zones-r10h-live-20260822T035805Z/r10h-post-release-qa.json).

### Phase 4 — fit-out — **BOUNDED MVP FIT-OUT ACCEPTED; R08AL/R08AM PUBLIC-RETAIL ROUND ACCEPTED**

- Complete Empty Eight's eight platforms, monumental concourse, mall shells, discovery sequence, life safety, and capped future space.
- Fit out Houston, SubTropolis, the contact sequence, Cheyenne, and summit facilities.

Exit gate: safe circulation, enforced access classes, transactional block-entity handling, and post verification for each exact package. Empty Eight, public-core, secure-core, and summit fit-outs may advance independently where their target and interaction sets are disjoint.

Current Empty Eight life-safety result: R08T closes the full south smoke-compartment plane as a passive fail-closed boundary, R08U closes four internal and four exterior VENT-A cap planes, R08V adds a bounded connected 5×99 fire/service-spine floor with both selected ends statically closed, R08W/R08X/R08Y/R08Z build the maximal clean 50×7 western, 35×7 eastern, 33×7 central-west, and 21×7 central-east north-smoke segments with one static 3×3 cap each, R08AA adds the maximal clean 14×7 center wall-only segment, R08AB closes the unique residual clean 2×7 far-east wall-only segment, R08AC/R08AD close the durable supported-gravity segments without touching their gravel dependency closures, R08AE closes the maximal topology-preserving retained-wet segment, R08AF closes the exact dry far-east upper completion, R08AG closes the unique seven-cell dry source-state column, R08AH lines the exact dry EG-B internal reservation while retaining its floor, roof cap, and air interior, R08AI adds its exact 64-cell passive internal wayfinding field, and R08AJ adds the accepted exact nine-cell passive normal-illumination package. The accepted-post 161-cell north-smoke residual is confined to 105 wet and 56 gravity cells; 21 carry overlapping N06-adjacent annotations. These exact cells are local non-durable physics exceptions, not a hold on another disjoint fit-out or the Master Plan. The 900-cell riser reservation remains unexcavated; FIRE-EG-B remains closed; EG-B has no stair/lift or commissioned egress/accessibility; the new spine space is not commissioned as a public or fire-service route; and operational smoke control and ventilation remain uncommissioned.

Current Empty Eight public-use result: R08AL supersedes the earlier capped-state narrative only for the exact south bays `EE-R-S01…S05` and `EE-R-S07…S12`. Those eleven bays now form a clean, lit, dystopian public vacant-retail gallery with eleven 4×2 openings, eleven manual smoke doors, 33 normal lights, and two bounded PF08 internal stairs. Nothing is occupied or operating as commerce. S06, all north bays, the future rail stubs, and every drainage, fire/service, utility, mechanism, and exterior interface remain closed. Behind the gallery, twelve maintained back-of-house rooms share a continuous service spine and have only two marked staff/service doors from public space; the BOH is restricted and non-public. A post-acceptance circulation review found both PF08 stairs are one block wide with two blocks of headroom: accepted as-built, but not public-grade primary stairs. The next public access package must widen both to three blocks, provide three clear headroom blocks and level 3×3 end landings, add a BOH staff-only orientation/map room, and prove bidirectional normal-walk access before any surface/public-egress claim. The seven-wide R08AM BOH-to-annex grand stair is a conforming restricted connection; it does not make the annex public. See [the current circulation review](CIRCULATION-REVIEW-R08AM-2026-08-22.md).

R08AM adds a secured seven-wide grand stair from that BOH to a lower annex. The annex contains a 100-seat theatre and a separate private-club wing with four consensual adults-only restricted suites, a communal lounge, two simulated fireplaces, two non-explicit swing seats, billiards, and a six-seat cinema. The presentation is non-explicit, introduces no entities or occupants, and depicts no anatomy, sex acts, coercion, confinement, or violence. The annex is not public; future rail, utility, drainage, fire/service, ventilation, and external discharge interfaces remain sealed.

### Phase 5 — transport and commissioning — **BOUNDED MVP ACCEPTED; R11K AS-BUILT; R12Q CONTINUOUS PASSIVE RAIL; R12R MAINTENANCE SHUTTLE COMMISSIONED**

- Commission C1 highway, roundabouts, Data District interchange, walking route, and passenger railway.
- Commission GA-S1/GA-S2, then commission the concealed branch and terminal as separate operational/rollback scopes.
- Commission the public shaft, internal rail, service rail, funicular, and return road.
- Keep C2 optional and C3 sealed until their separate gates pass.

R11J has physically accepted the bounded C1 stations-1184..1188 static
hydraulic-isolation bridge. Its exact 411-cell release provides a 344-cell
face-connected support framework and a 94-cell supported deck, joining R11H as
one 449-cell max-step-one surface. Independent QA verifies exact rollback,
zero off-target drift, exact preservation of all 8,409 prior R11 targets, and
an unchanged separate 38-cell water/lava baseline at least 23 blocks below the
operated scope. The accepted R11J/R11H surface joins R11I and the R11E
station-1213..1215 island as one 620-cell component. Stations 1142–1183,
whole-route use, hydraulic capacity, drainage, rail, utility, and external
discharge remain uncommissioned. See the
[R11J release note](phase1-r11j-c1-west-hydraulic-isolation-bridge-release.md).

R11K executed as one amortized, two-package west at-grade transaction:
the maximal clean stations-1142..1145 run and the independently clean
station-1172 singleton. Their 336 targets and complete interaction halos are
disjoint. The package adds 111 supported pavement cells, 105 exact foundation
fills, 71 headroom cuts, and 49 pre-removal leaf stabilizations while leaving
all entity, reservation, grade-shadow, fluid, and prior-release cells
untouched. Independent post-QA and rollback evidence accept the package. It is
a bounded physical build, not a whole-route, railway, hydraulic, drainage, or
utility commission. See
the [R11K release note](phase1-r11k-c1-west-disjoint-at-grade-batch-release.md).

R12B now accepts the complete B09 lower-to-summit static enclosure as ready
for separately guarded mechanism-installation packages. The R10E-bound seal
proves one connected 1,116-cell air void, its complete 3,346-cell solid
boundary, closed external caps, a clean accommodation/halo census, and the
6,604-group global projected reverse rollback chain. It does not commission
rail, vehicle, drive/brake/barriers, power/control, drainage, rescue,
emergency lighting, transport, or either external opening. See the
[R12B readiness note](phase1-r12b-b09-static-enclosure-readiness.md).

R12C has installed the first isolated passive B09 guideway subsystem: 231
exact unpowered east-west rails on the accepted lower straight. Independent
post-QA verifies one unbranched rail component, exact support/headroom, both
retained air isolation gaps, both external caps, zero shape-update or
undeclared B09 drift, and 231/231 rollback readiness. It does not install
station/curve rail, barriers, vehicles, drive/brake, power/control, drainage,
or authorize passenger, rescue, or funicular operation. See the
[R12C release note](phase1-r12c-b09-passive-rail-design-freeze.md).

R12D has installed the next independently bounded B09 datum subset: 19 exact
unpowered north-south rails on the level hairpin leg at indices 241–259.
Independent post-QA verifies exact topology and states, all supports/headroom,
both real turn cells still air, all 231 R12C rails unchanged with zero cardinal
adjacency, zero undeclared B09 drift, and exact execution/rollback evidence.
Turn and slope rail states remain a local update-simulation hold; no active
system or transport use is commissioned. See the
[R12D release note](phase1-r12d-b09-hairpin-cardinal-passive-rail-release.md).

R12E has installed the unique largest remaining independently isolated
level-cardinal datum: 80 exact east-west rails at indices 420–499. Independent
post-QA verifies one unbranched component, exact supports/headroom, both air
gaps, all 250 R12C/R12D rails, zero undeclared halo/B09 drift, all 17 wrapper
stages, and 80/80 inverse guards. The complete remaining-datum census proves
no nontrivial two-sided isolated level run remains. Further rail work requires
exact turn/grade state and update-order proof or separate lower-station
interface ownership. Active systems and transport remain uncommissioned. See the
[R12E release note](phase1-r12e-b09-upper-level-cardinal-passive-rail-release.md).

R12F is the first exact graded-rail package: three still-isolated cells at
indices 261–263, with two ascending-west states and one east-west upper state.
The upper-to-lower placement order and exact reverse rollback are proven on the
production Paper 1.21.11 binary in a disposable runtime. The source-bound
package passed all 15 offline gates and the guarded live release; independent
QA verifies its exact post state and inverse while preserving both air gaps,
all 330 prior rails, both external caps, and the inactive-system boundary. It
does not commission transport. Turn cells, every other grade, and
the lower-station interface remain local exact-state/update blockers. See the
[R12F release note](phase1-r12f-b09-isolated-graded-passive-rail-release.md).

R12G expands the proven graded pattern to the maximum independently isolated
ascending-west run length on the frozen datum. It selects indices 271–274 with
both adjacent level cells retained as air, binds a four-cell exact-production
Paper proof, passed 15/15 offline gates, and completed guarded execution.
Independent post-QA verifies the four exact states, one unbranched component,
supports/headroom/gaps, all 333 prior rails, both caps, exact B09 accounting,
17/17 stages, and 4/4 inverse guards. It does not commission transport. See the
[R12G release note](phase1-r12g-b09-maximal-isolated-graded-passive-rail-release.md).

R12H is the next accepted maximal graded subset. The deterministic census skips
the four-cell run whose boundary touches accepted R12G and selects indices
282–285 between exact air gaps 281/286. A fresh exact-production Paper proof,
exact inverse, source-bound support/headroom/halo, all 337 predecessor rails,
and all 15 offline gates pass. Guarded execution and independent post-QA now
verify exact state/topology, zero drift, 17/17 stages, and 4/4 inverse guards.
It does not commission transport. See the
[R12H release note](phase1-r12h-b09-next-maximal-isolated-graded-passive-rail-release.md).

R12I installed the next independently isolated maximum run at indices
293–296. Independent post-QA passes 21/21 and binds all four desired states,
upper-to-lower placement, exact reverse rollback, retained gaps 292/297, all
341 predecessor rails, both caps, and zero drift. See the
[R12I release note](phase1-r12i-b09-next-maximal-02-isolated-graded-passive-rail-release.md).

R12J is the first accepted adjacency consolidation. It closes the exact
seven-cell gap at indices 264–270 between R12F and R12G. Independent post-QA
passes 19/19 and verifies five ascending-west plus two east-west states, one
unbranched 14-cell component, exact rollback, all 345 prior rails/caps, and
zero drift. See the
[R12J release note](phase1-r12j-b09-r12f-r12g-rail-adjacency-closure-release.md).

R12K installed seven exact states across indices 286–292, joining accepted
R12H and R12I into one 15-cell passive component. Independent post-QA verifies
the exact Paper result, all 352 prior rails, both caps, zero undeclared drift,
17/17 stages/evidence, journal20, and inverse7/7.

R12L then installed the exact indices 275–281 closure, joining accepted
components 261–274 and 282–296 into one unbranched 36-cell passive component.
Its independent post-QA verifies all 359 prior rails, both caps, exact
seven-cell bounded diff, the 366-rail shape census, 17/17 stages/evidence,
journal20, and inverse7/7. Transport and every active mechanism remain
uncommissioned. See the
[R12K release note](phase1-r12k-b09-r12h-r12i-rail-adjacency-closure-release.md)
and [R12L release note](phase1-r12l-b09-continuous-261-296-rail-adjacency-closure-release.md).

R12N installs all 123 formerly-air cells at indices 297–419, with 90
ascending-west and 33 east-west exact states. It joins accepted 261–296 to
accepted R12E indices 420–499 as one unbranched 239-cell passive component.
Independent post-QA verifies exact production Paper state, all 366 prior rails,
both caps, zero undeclared B09/halo drift, the exact 489-rail census, 17/17
stages/evidence, journal252, and rollback123/123. Transport and every active
system remain uncommissioned. See the
[R12N release note](phase1-r12n-b09-continuous-261-499-rail-adjacency-closure-release.md).

R12P executed and passed independent post-QA for the complete summit return at indices
500–560. Its exact-production Paper proof and accepted live state cover the internal north-east turn,
58 ascending-north cells, two north-south landings, all 239 accepted R12N rail
states, and the exact reverse-order inverse. A clean release yields one
300-cell passive component across indices 261–560 while leaving the exterior
Z11 cap closed. Indices 240 and 260 still separate the lower passive runs;
powered rails, vehicle, drive/brake, controls, power, drainage, rescue use, and
transport commissioning remain excluded from R12P. See the
[R12P release note](phase1-r12p-b09-continuous-261-560-summit-return-rail-closure-release.md).

R12M extends bounded passive internal inspection/circulation across the
complete finished B03 institutional route. Against the accepted R10G post it
verifies 330 stations, 6,600 connected route-air cells, 2,970 central-clearance
cells, 1,650 floor and 1,650 ceiling cells, 54 fixtures, both internal seams,
the fail-closed Cheyenne cap, and a clean 23,904-cell interaction domain. The
physical reverse chain passes 5,940/5,940 exact guards. Secure/public access,
controls, chamber/terminal use, and every active mechanism remain closed. See
the [R12M commissioning note](phase1-r12m-b03-institutional-route-commissioning.md)
and [machine seal](../../../data/world-review/combined-zones-r12m-b03-institutional-route-commissioning-20260822T034000Z/r12m-commissioning.json).

R12O extends that bounded acceptance over the complete as-built enclosed B03
run from index 188 through index 800. Against the accepted R10H post it proves
613 contiguous stations, 12,212 connected route-air cells, 5,505 central
clearance cells, exact 3,053-cell floor and ceiling sets, a 4,856-cell fall
boundary, 102 passive fixtures, the clear index-187 seam, the retained
Cheyenne cap, a hazard/entity-clear 41,652-cell domain, and a disjoint
5,988/5,988 reverse chain. Indices 0–187 remain an explicit local hold; no
secure/public access, chamber/terminal/exterior use, or active mechanism is
commissioned. See the
[R12O commissioning note](phase1-r12o-b03-complete-enclosed-route-commissioning.md)
and [machine seal](../../../data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z/r12o-commissioning.json).

R12Q installed the exact two lower-turn rail states and closed B09 into one
unbranched 552-cell passive rail component spanning indices 9–560. Independent
post-QA passes 20/20 with exact support, headroom, predecessor preservation,
zero undeclared drift, and rollback proof. This is passive topology, not active
transport, public/passenger use, rescue service, or full-funicular commissioning.

R12R is the terminal physical release. It adds 19 exact block targets and one
authenticated minecart for a bounded maintenance shuttle over indices 9–25,
parked at the west endpoint. Its exact post-QA passes 17/17 and the bounded
commissioning seal passes 12/12. No public, passenger, rescue, full-funicular,
or full-guideway service is claimed.

MVP exit gate: **PASS.** All six R07–R12 bounded dependency closures pass; G16,
G17, G18, and G19 pass; exact post states and rollback evidence are accepted;
and terminal media, map QA, database verification, and the local publication
manifest are sealed. G18 records acceptance evidence only and does not claim
that an external website or third-party publication was performed.

### MVP deferrals

P1-B12, C2, C3, and opening the eight future Empty Eight line stubs are outside the MVP boundary. Keep them sealed or reservation-only. They cannot block R07–R13 MVP delivery and may be released later as independent scopes.

## Release rules

- One canonical compiler owns every transformed coordinate.
- Every physical cell has one canonical zone owner; shared seams need exact interface contracts.
- Generated structures and accepted current features are default-deny unless an exact reviewed contract says otherwise.
- Every physical package requires a fresh immutable source snapshot, exact guarded forward operations, entity/container and protected-feature clearance, strict-noop journaled execution, exact rollback, and immutable post verification.
- Use `scripts/rcon_runner.py --strict-noop --report <json>` for any separately authorized physical release.
- Never replay accepted Town Expansion or redevelopment operation files.
- A planned feature becomes as-built only after exact post-state verification. Route QA applies where the package creates or changes a route. Media QA and database import apply to consolidated publication, not as universal prerequisites to the next disjoint build.
- Standing owner authorization is recorded in `phase1-standing-build-authorization.json`; exact package manifests bind its application without requiring another conversational approval.
- Release eligibility is scope-local. A failure blocks the exact package and dependent interfaces only.
- Disjoint target and interaction sets may compile, preflight, and execute in parallel; the historical serial graph is not a global advancement rule.

## Historical design decision status and current disposition

The detailed notes below preserve the pre-R00 reasoning. They are not current release holds: the R00 audit closed D01–D07 and passed G01–G07. Current work follows [CURRENT-STATE.md](CURRENT-STATE.md).

1. **D01 resolved:** use the current world with Masterplan 05 vertical adaptation. Exact per-owner integer construction setout remains a separate Phase 1 gate.
2. **D02 CLOSED AT R00:** the exact alignment, independent highway profile, cross-section, diagnostic quantities, and C01 geometric comparisons were frozen. The owner-delegated ledger selected the exact R140/R120/R140 raster and treated the authored staircase rhythm as non-controlling visual detail. Earlier technical matrices and incomplete intake findings are retained as historical design evidence; the additive R00 closure and later complete-save guarded releases control current status.
3. **D03 resolved:** delete the unsurveyed MainStreet East L2 proposal from active scope without authorizing demolition or a substitute coordinate.
4. **D04 resolved:** preserve passenger rail as a fully clear-spanned empty reservation; track construction requires its own later release.
5. **D05 CLOSED AT R00; R05/R06 MATERIALLY AS-BUILT:** the frozen hydrology, relic, mountain, and support design led to guarded R05 and R06 releases. The later live census controls exact as-built totals. The 16 lava-pocket cells remain a local treatment exception, not a D05 or project hold.
6. **D06 CLOSED AT R00; BOUNDED EMPTY EIGHT MVP AND R08AL/R08AM ROUND ACCEPTED:** the Empty Eight shell reservations, mechanism-state cells, surface headhouses, bounded static fit-out, passive life-safety planes, and bounded internal orientation packages executed with guarded source checks and verified rollback. The exact eleven south bays now supersede their historical capped state as clean public vacant retail; maintained BOH and the lower theatre/private-club annex are restricted and non-public. S06, all north bays, N06, wet/gravity residuals, the unexcavated riser, FIRE-EG-B, and all rail, utility, drainage, fire/service, ventilation, mechanism, and external interfaces remain sealed or local nonclaims unless separately released.
7. **D07 resolved:** use the fact-checked six-panel architectural-composite wording; do not claim a natural contact, thrust/overthrust, laccolith, or `270 Ma` date. The optional C2 visitor portal remains omitted from active construction scope.

The historical machine-readable selections and closure requirements are in [phase1-design-decisions.json](phase1-design-decisions.json). The reconciled release contract and current-state ledger control new work: compile exact packages, pass the local hard safety kernel, execute, verify, and proceed to the next eligible scope.
