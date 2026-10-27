# Master Plan + Passenger Railway — complete remaining-build queue

Status: **AUTONOMOUS BUILD LOOP — LIVE**
As of: 2026-08-24 UTC
Authority: expanded all-work-all-areas owner directive + standing build authorization.

This is the authoritative queue for everything remaining to build across Master
Plans 01–13 and the passenger railway. Each item follows the hard-safety kernel:
fresh source snapshot, exact guards, preflight, entity/container/block-entity
clearance, strict-noop journaled execution, exact inverse, immutable post
snapshot, rollback post-state preflight, and independent QA.

Dependency rule: surveys and design freeze first; guarded physical release only
after a PASS. Items with a dependency that is not ready remain HOLD.

## Completed this loop (2026-08-24)

| # | Package | Status | Evidence |
|---|---|---|---|
| 1 | CIRC-MSA-PORTAL-01 (MainStreet parking portal → warehouse drive hall) | DONE 54/54 | `data/world-review/msa-portal-warehouse-live-20260824T120500Z/` |
| 2 | CIRC-RRCH-MSA-WIDEN-01 (Ravensreach↔MainStreet 4-choke widening) | DONE 11/11 | `data/world-review/rr-msa-widen-live-20260824T163500Z/` |
| 3 | CZ-R08AW (Empty Eight south gallery destination wayfinding) | DONE 188/188 | `data/world-review/combined-zones-r08aw-live-20260824T170100Z/` |
| 4 | RRCH-MOOT-UPPER-ROOMS (Clerks/Meeting/Attic/Committee completion) | DONE 327/327 | `data/world-review/rrch-moot-upper-rooms-live-20260824T161000Z/` |
| 5 | CIRC-WL-ARRIVAL-ROAD-01 (Approach Road 2-wide pedestrian edge) | DONE 85/85 | `data/world-review/approach-road-edge-live-20260824T191620Z/` |
| 6 | BKR-RR-Z5-01 (Raven Rock RR-Z5 landing lights + return sign) | DONE 17/17 | `data/world-review/rr-z5-repair-live-20260824T185730Z/` |
| 7 | BKR-SURVEY-00 (fresh condition census) | DONE read-only | `data/world-review/bkr-survey-00-20260824/` |
| 8 | CIRC-WL-ARRIVAL-ROAD-01 survey (exact-cell) | DONE read-only | `data/world-review/approach-road-exact-cell-survey-20260824/` |
| 9 | CIRC-RG-SURFACE-02 (Ravensgate NW Garth connection) | DONE 63/63 | `data/world-review/ravensgate-surface-live-20260824T211631Z/` |
| 10 | CIRC-WL-ARRIVAL-01 (Westlight arrival pedestrian edge) | DONE 54/54 | `data/world-review/westlight-arrival-live-20260824T205333Z/` |
| 11 | BKR-C01-DIMENSION-02 (C01 stair widening) | HOLD — container/decor-bounded | `data/world-review/c01-dimension-02-live-20260824T201429Z/c01-dimension-02-hold.json` |
| 12 | Cheyenne B03/Z10 seam survey (MP01) | DONE read-only — all HOLD | `data/world-review/cheyenne-b03-seam-survey-20260824/` |
| 13 | SubTropolis occupancy survey (MP02) | DONE read-only — vacant, R07C sealed | `data/world-review/subtropolis-occupancy-survey-20260824/` |
| 14 | Houston wet/gravity survey (MP03) | DONE read-only — 2 permanent holds | `data/world-review/houston-wet-gravity-survey-20260824/` |
| 15 | Town Expansion drift survey (MP11) | DONE read-only — found 40-cell red-carpet drift | `data/world-review/town-expansion-drift-survey-20260824/` |
| 16 | Westlight venue ops survey (MP13) | DONE read-only — field egress gap HOLD | `data/world-review/westlight-venue-ops-survey-20260824/` |
| 17 | TE-R1 red-carpet drift repair | DONE 40/40 | `data/world-review/town-expansion-redcarpet-live-20260824T220500Z/` |
| 18 | BKR-LEGACY-C01-01 (legacy MainStreet C01) | HOLD — all finished/intentional | probed read-only (colonnade = intentional) |
| 19 | COBALT-S1 station-pair design | DONE read-only — readyForFreeze false | `data/world-review/cobalt-s1-station-pair-design-20260824/` |
| 20 | Ravensgate re-census (MP09) | DONE read-only — district intact, 1 ownership interface open | `data/world-review/ravensgate-recensus-20260824/` |
| 21 | BKR-B03-ACCESS-01 (Cheyenne surface access stair) | DONE 78/78 | `data/world-review/b03-access-live-20260825T003100Z/` |
| 22 | CIRC-C01-PORTAL-01 (C01 portal→L1 stair shaft) | DONE 256/256 | `data/world-review/c01-portal-l1-live-20260825T005000Z/` |
| 23 | CIRC-OBS-GALLERY-01 (observatory route closure) | DONE 6/6 | `data/world-review/obs-gallery-live-20260825T010100Z/` |
| 24 | C01-SERVICE-CORRIDOR-WIDEN (2-wide service corridor) | DONE 8/8 | `data/world-review/c01-service-widen-live-20260825T011600Z/` |

## Master Plan scope cards (MP01–MP13)

| # | Scope card | Built proof | Next task | Status |
|---|---|---|---|---|
| MP01 | Cheyenne Mountain Complex | R10A/G/H, R12A/M/O | Survey uncommissioned B03/Z10 indices + every secure/exterior seam | **SURVEY DONE — all HOLD (B09-rail-bounded)** |
| MP02 | SubTropolis | R03/R04 tunnel, R07C cover | Map actual occupancy + route envelope before tenant/lobby work | **SURVEY DONE — vacant, R07C sealed** |
| MP03 | Houston Tunnel System | B07 lower lobby/stairs, upper inspection | Resolve wet lower interface + unsupported-gravity boundary | **SURVEY DONE — 2 permanent holds (R06 water + gravity)** |
| MP04 | Combined Complex | normalized program | Translate cells into MP05/later successor | CLOSED (no release) |
| MP05 | Combined Zones / Empty Eight | R07–R12 MVP, R08AL/AM | One substantial disjoint package (public-realm/hold resolution) | READY |
| MP06 | Western Approach Road | cataloged road | CIRC-WL-ARRIVAL-ROAD-01 pedestrian edge | **2-WIDE EDGE BUILT (85/85)** |
| MP07 | MainStreet America | internal connectivity | CIRC-MSA-PORTAL-01 done; fresh seam register | **PORTAL BUILT (54/54)** |
| MP08 | Raven Rock / Site R | 81 features, dry T2b | BKR-SURVEY-00 done; RR-Z5 lit; C2 HOLD | **SURVEY DONE; RR-Z5 BUILT** |
| MP09 | Ravensgate | frozen district | Re-census condition + Approach Road endpoint; close ownership | **RE-CENSUS DONE — district intact; 1 ownership interface open** |
| MP10 | Ravensreach | 63 features, route | CIVIC-RRCH-MOOT-UPPER-01 rooms | **ROOMS BUILT (327/327)** |
| MP11 | Town Expansion R1 | 3,665,580-cell release | Current-drift survey before repair | **SURVEY DONE; red-carpet drift REPAIRED (40/40)** |
| MP12 | Westlight District | 59 records, 10 structures | CIRC-WL-ARRIVAL-01 + CIRC-WL-ARRIVAL-ROAD-01 surveys | **PEDESTRIAN EDGE BUILT (54/54)** |
| MP13 | Westlight Venue | bowl/theatre/club | Read-only circulation/modes/lighting/accessibility/operations survey | **SURVEY DONE — field-egress HOLD; WLV-EGRESS-01 field-rim + WLV-CONCOURSE-ARM-01 ring cadence BUILT** |

## Cross-area route repairs (from runbook)

| Package | Route | Status |
|---|---|---|
| CIRC-C01-PORTAL-01 | C01 mountain portal → L1 (fails both directions) | **DESIGN HOLD** — clean 2-wide stair columns exist (x=694..695 z=-62..-48, no gravity), but the route needs a full ~25-block stair shaft + horizontal tunnel (~200+ cells) through the existing (701,-81) shaft gap. Staged engineering package. |
| CIRC-MSA-PORTAL-01 | MainStreet parking portal → warehouse drive hall | **DONE (54/54)** |
| CIRC-OBS-GALLERY-01 | Observatory hidden entry → portal hub | **DESIGN HOLD** — tight corkscrew spiral has no 2-block headroom; needs stair redesign |
| Ravensreach ↔ MainStreet widening | four below-3-wide samples | **DONE (11/11)** |

## Empty Eight post-MVP (MP05 sub-scope)

| Package | Scope | Status |
|---|---|---|
| Public-realm completion | one substantial disjoint package | READY |

## Bunker program (MP08 gate)

| Package | Scope | Status |
|---|---|---|
| BKR-SURVEY-00 | fresh condition census (B03, east-C01, legacy-C01, RR-Z5) | HOLD — first package |
| BKR-C01-PORTAL-01 | east-C01 pedestrian spine (after survey) | HOLD |
| BKR-C01-DIMENSION-02 | east-C01 stairs/nodes/BOH (after survey) | HOLD |
| BKR-LEGACY-C01-01 | legacy MainStreet C01 room recovery (after survey) | HOLD |
| BKR-B03-ACCESS-01 | B03 access design (after survey) | HOLD |
| BKR-RR-Z5-01 / C2-02 | Raven Rock pilots (after survey) | HOLD |

## Passenger railway

| Packet | Scope | Status |
|---|---|---|
| RAIL-S0 / B09-P0 | survey existing rail | DONE — readyForS1: false (corridor blocked by terrain; needs dedicated bore) |
| COBALT-S0 | choose first passenger station pair | DONE — no centreline yet (both towns dry; exact cell survey pending) |
| RAIL-S1 / B09-P1 | freeze one conversion segment | HOLD — requires bore design after survey |
| COBALT-S1 | freeze chosen station pair + first segment | HOLD — requires fresh cell survey |
| RAIL-S2 | access before track (public + service access) | HOLD |
| RAIL-S3..S7 | repeatable release order (corridor, controls, trials, opening) | HOLD |

## Execution rules

1. One scope card / packet at a time, one fresh source snapshot per package.
2. Survey and design freeze first; guarded physical release only after PASS.
3. Every physical package runs the complete hard-safety kernel.
4. Never hand-run loose RCON; use `scripts/rcon_runner.py --strict-noop`.
5. Record PASS/HOLD per item; a failed check stops only the affected item.
6. Independent disjoint scopes may build in parallel.

## Autonomous-loop continuation — 2026-08-25 (rail + more)

| # | Package | Result | Evidence |
|---|---|---|---|
| 25 | RAIL-S2-WL-SEGMENT-01 (Westlight water-containment liner) | 540/540 | `data/world-review/rail-wl-segment-live-20260825T051608Z/` |
| 26 | RAIL-S2-WL-SEGMENT-02-03 | 1032/1032 | `data/world-review/rail-wl-seg23-live-20260825T0548Z/` |
| 27 | RAIL-S2-WL-SEGMENT-04-06 | 1548/1548 | `data/world-review/rail-wl-seg456-live-20260825T061200Z/` |
| 28 | COBALT-RR-ACCESS-01 (Ravensreach sealed-sleeve shaft) | 711/711 | `data/world-review/cobalt-rr-live-20260825T061739/` |
| 29 | COBALT-WL-PLATFORM-01 (Westlight station platform) | 550/550 | `data/world-review/cobalt-wl-platform-live/` |
| 30 | WLV-EGRESS-01 (Westlight venue field lighting) | 18/18 | `data/world-review/wlv-egress-live-20260825T053200Z/` |
| 31 | RR-C2-01 (Raven Rock C2 containment cap) | 60/60 | `data/world-review/rr-c2-live-20260825T052758Z/` |
| 32 | EE-PUB2 (Empty Eight arrival markers + light cadence) | 16/16 | `data/world-review/ee-pub2-live-20260825T060000Z/` |
| 33 | RAIL-S2-BC-CONNECTOR (Leg B/C corridor) | 845/845 | `data/world-review/rail-bc-live-20260825T080500Z/` |
| 34 | WL-DISTRICT-NEXT-01 (Gatehead plaza lighting) | 5/5 | `data/world-review/wl-district-next-live-20260825T073021Z/` |
| 35 | TE-NEXT-01 (owner rest-suite lighting) | 21/21 | `data/world-review/te-next-live-20260825T073500Z/` |
| 36 | RAVENSGATE-NEXT-01 (arrival-pad lighting) + ownership contract | 8/8 | `data/world-review/ravensgate-next-live-20260825T074559Z/` |
| 37 | C01-NEXT-01 (arrival-corridor wayfinding lights) | 9/9 | `data/world-review/c01-next-live-20260825T090000Z/` |
| 38 | COBALT-RR-HEADHOUSE-01 (Ravensreach public headhouse) | 881/881 | `data/world-review/cobalt-rr-headhouse-live-20260825T093500Z/` |
| 39 | WLV-CONCOURSE-ARM-01 (Westlight venue bowl concourse-ring ceiling lighting cadence) | 36/36 | `data/world-review/wlv-concourse-live-20260825T120300Z/` |
| — | COBALT-S1-FREEZE | readyForFreeze=TRUE | `data/world-review/cobalt-s1-freeze-20260825/` |
| — | MSA external seam register | read-only | `data/world-review/msa-seam-register-20260825/` |
| — | RRCH ownership interfaces | read-only | `data/world-review/rrch-ownership-interfaces-20260825/` |
| 39 | RAIL-S3-TRACKBED-02 (corridor floor levelled full length) | 526/526 | `data/world-review/rail-trackbed-2-live-20260825T091500Z/` |
| 40 | APPROACH-LIGHTS-01 (road lighting cadence) | 6/6 | `data/world-review/approach-lights-live-20260825T154047Z/` |
| 41 | EE-LIGHTS-01 (stair-well ceiling lighting) | 12/12 | `data/world-review/ee-lights-live-20260825T154809Z/` |
| 42 | RAIL-S3-GUIDEWAY-01 (two track-tube beds) | 76/76 | `data/world-review/rail-guideway-live-20260825T170000Z/` |
| 43 | RAIL-S3-GUIDEWAY-02 (two track-tube beds, slices 2-6) | 380/380 | `data/world-review/rail-guideway-2-live-20260825T165000Z/` |
| 44 | COBALT-STATION-PLATFORM-LIGHTING-01 | 10/10 | `data/world-review/cobalt-station-lighting-live-20260825T173500Z/` |
| 45 | WLV-CROWN-01 (Westlight venue bowl crown-walk floor lighting cadence) | 58/58 | `data/world-review/wlv-crown-live-20260825T181000Z/` |
| 44 | RAIL-S3-GUIDEWAY-02 (guideway tubes full length) | 380/380 | `data/world-review/rail-guideway-2-live-20260825T165000Z/` |
| 45 | RAVENSGATE-NEXT-02 (Garth plaza lighting) | 22/22 | `data/world-review/sweep3-live-20260825T164707Z/` |
| 46 | WLV-CROWN-01 (venue crown-walk lighting) | 58/58 | `data/world-review/wlv-crown-live-20260825T181000Z/` |
| 47 | RAIL-S3-GUIDEWAY-03 (held-cell completion: beds + supports + water seal) | 52/52 | `data/world-review/rail-guideway-3-live-20260825T175500Z/` |
| 48 | CIRC-RG-BELL-01 (Bell-Gate campanile 2-wide stair) | 103/103 | `data/world-review/rg-bell-live-20260825T180500Z/` |

## Autonomous-loop continuation — 2026-08-26

| Package | Result | Evidence |
|---|---|---|
| SYS03-R10-HIGH16-DESCENDING-BYPASS-02 | **DONE — civil only**. Shell `1,638/1,638`, then core `3,227/3,227`, strict zero-noop; independent post and ordered rollback proof pass. No rail, public route, station, or passenger service claimed. | `data/world-review/sys03-high16-descending-live-20260826T153100Z/evidence-ledger.json` |
| MP01-SERVICE-STAGING-MANUAL-SUPPORT-02 | **DONE — restricted manual fit-out only**. Crafting + cartography surfaces `2/2`, strict zero-noop; fresh source/post pair, inverse and independent support/headroom/approach/door QA pass. No automation, public access, egress, utility, or Cheyenne-completion claim. | `data/world-review/mp01-service-staging-manual-support-live-20260826T160200Z/evidence-ledger.json` |
| MP01-SERVICE-STAGING-MANUAL-MAINTENANCE-01 | **DONE — restricted manual fit-out only**. Smithing + grindstone surfaces `2/2`, strict zero-noop; fresh source/post pair, inverse, and independent retained-row/support/headroom/approach/threshold/two-door QA pass. No automation, public access, egress, utility, or Cheyenne-completion claim. | `data/world-review/mp01-service-staging-manual-maintenance-live-20260826T162200Z/evidence-ledger.json` |
| MP01-SERVICE-STAGING-ANVIL-REPAIR-01 | **DONE — restricted manual repair only**. One gravity-supported north-facing anvil `1/1`, strict zero-noop; fresh source/post pair, entity gates, exact inverse, and rollback-poststate proof pass. No automation, public access, egress, utility, or Cheyenne-completion claim. | `data/world-review/mp01-service-staging-anvil-repair-live-20260826T163300Z/evidence-ledger.json` |
