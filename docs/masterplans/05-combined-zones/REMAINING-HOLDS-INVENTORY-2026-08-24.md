# Combined Zones + legacy areas — remaining holds inventory

Status: **READ-ONLY INVENTORY — 2026-08-24 UTC**
Authority: expanded all-work-all-areas owner directive
(`OWNER-DIRECTIVE-EXPANDED-ALL-AREAS.md`, recorded 2026-08-24)

This inventory catalogues every material residual hold across Masterplan 05
(Combined Zones) and the legacy Masterplan areas 06–13 after the most recent
accepted live builds (R08AN–R08AP, R09L, R11M, and the civic interior rounds on
2026-08-24). It is planning/research evidence only. Every physical package still
requires the complete hard-safety kernel from the standing authorization.

## Current accepted terminal physical baseline

- The most recent accepted post-build snapshots are:
  - `data/worldsnap-combined-zones-r11m-post-20260824T022800Z` (C1 island stations 1146..1182; region r.2.-1, r.3.-1)
  - `data/worldsnap-combined-zones-r09l-post-20260824T021413Z` (B07 lower-interface still-water liner; region r.4.-1)
  - `data/worldsnap-r08am-post-20260822T161818Z` (Empty Eight full shell; 52 regions)
  - `data/worldsnap-r12r-post-20260822T053631Z` (B09 rail/shuttle terminal)
- No single complete-save snapshot yet unifies all post-2026-08-22 regions; each scoped snapshot is authoritative for its own regions. A fresh same-invocation complete source is required per package.

## MP05 Combined Zones holds

### H1. C1 station 1183 east wet shoulder (high priority)

- **Location:** station 1183 at `(1518,-225)`, the single at-grade gap between the R11M island (ends at station 1182) and the R11J hydraulic bridge (starts at station 1184).
- **Current state:** centerline offsets −2..14 are air; the west shoulder (offsets −14..−5) is already paved/solid ground. Offsets 11–13 have R11J-style `smooth_stone`/`stone_bricks` deck edge; offset 10 and 14 have air support cavities. Water exists at `(1528,-215)` y38 (offset +14), ~26 blocks below the surface datum.
- **Blocker:** the east shoulder crosses a deep air/water cavity, so the at-grade fill would need a very deep foundation. R11M explicitly held this cell out as the "station-1183 wet shoulder."
- **Fix direction:** extend the R11J bridge framework (stone-brick beam/haunch with durable anchors) across station 1183 to join the R11M island to the R11J bridge, OR apply a bounded at-grade treatment only to the supportable west/center cells. Fresh source snapshot and full guarded kernel required.

### H2. B07 upper-route suspended gravel (R09J hold)

- **Location:** inherited floating gravel column at `(2104,-396)` y27..30 with terminal air at y26.
- **Current state (r09l-post):** `(2104,27,-396)` gravel, `(2104,28,-396)` gravel, `(2104,29,-396)` gravel, `(2104,30,-396)` gravel, `(2104,26,-396)` air. The column is below the y31 walkable floor.
- **Blocker:** supporting/removing/replacing the column cannot keep an exact inverse rollback because restoring unsupported gravel schedules falling-block physics. R09J fail-closed stair index 20 with two polished-diorite cells; R09K commissioned the 91-surface upper segment.
- **Resolution: RESOLVED-BY-DESIGN — PERMANENT PHYSICS EXCEPTION.** The column is preserved untouched; the accepted R09J cap + R09K seal route the safe upper circulation around it. No durable exact edit exists. This item is closed (as-designed); no further B07 work required for MVP.

### H3. Empty Eight north-smoke wet/gravity residual (161 cells)

- **Location:** the full north passive-smoke plane; residual `x=1702..1841`, `z=50`, `y=48..54`, 161 cells (105 wet, 56 gravity).
- **Current state:** 21 cells overlap N06-adjacent annotations; 146 residual air cells remain where the plane is not yet built. Verified against r08am-post (unchanged since R08AG).
- **Blocker (proven exhaustively by R08W–R08AF):** zero clean full-height runs remain. The wet band fails closed because target `(1758,50,50)` is `water[level=1]` with no retained upstream neighbor under the flow-order contract; the x=1833..1841 alternative is rejected because rollback would restore air below retained water. The gravity band residual is provably non-durable (falling-block inverse).
- **Resolution: RESOLVED-BY-DESIGN — PERMANENT PHYSICS/TOPOLOGY EXCEPTION.** The R08W–R08AF sequence closed every clean segment; R08T (south boundary), R08U (eight passive caps), and R08AG's dry column close the passive life-safety plane. The 161 residual cells are exact local non-durable exceptions. Closed (as-designed).

### H4. Empty Eight unexcavated riser (900 cells)

- **Location:** four local 3×3 vent risers (EE-VENT-NW 279 cells y55..85, NE 432 cells y55..102, SW 99 cells, SE 90 cells), 900 total capped reservation cells (D06-VENT).
- **Current state:** riser interiors are still filled with natural terrain (e.g. NW: 231 stone, 9 andesite, 10 dirt, 9 grass, 8 gravel; only 8 air). Four 3×3 exterior and four internal vent caps closed (R08U). No excavation, outlet, fan/duct mechanism, power, or controls.
- **Blocker:** excavation would remove terrain including gravity cells (8 gravel per riser), risking falling-block rollback; more importantly, even a hollow shaft is capped at both ends with zero ventilation function until outlets/fans/ducts/controls/commissioning exist.
- **Resolution: DEFERRED — D06 POST-MVP.** Excavation alone provides no useful function and would create an empty capped void. The D06 record keeps the risers sealed and the owner MVP explicitly defers D06 mechanisms. Not a buildable next package; keep closed.

### H5. N06 suspended gravel (4 cells)

- **Location:** `(1737,52,49)`, `(1738,52,49)`, `(1739,51,49)`, `(1739,52,49)` — source gravel suspended over air.
- **Current state:** confirmed suspended (air below each); verified against r08am-post.
- **Blocker:** exact durable rollback impossible (same falling-gravel physics as B07). The R08Q compiler itself failed closed (`BLOCKED_N06_EXACT_DURABLE_ROLLBACK_IMPOSSIBLE_FOR_CURRENT_SOURCE`).
- **Resolution: RESOLVED-BY-DESIGN — PERMANENT PHYSICS EXCEPTION.** Documented in R08N (isolated N06 local source-physics exception). The four cells are preserved untouched; the north-smoke plane and retail shells route around them. No durable exact edit exists. Closed (as-designed).

### H6. B09 lower-station rail interface (indices 0–8)

- **Location:** B09 centerline indices 0–8 (x=2048..2056, west of index 9 where R12C rail begins at `(2057,130,-748)`).
- **Current state:** R12R bounded maintenance shuttle runs indices 9–25 with powered rails (x=2058..2072); index 8 (x=2056) remains air (R12C isolation gap); the lower station is the R07D 84-cell shell whose east interior edge is index 0 (x=2048).
- **Blocker:** the station/vehicle/barrier/drive/brake/power/control/drainage behaviors are not designed. R12C kept index 8 air to keep passive material disconnected from the deferred station interface; MASTERPLAN records "separate lower-station interface ownership" as a prerequisite.
- **Resolution: DEFERRED — TRANSPORT COMMISSIONING (POST-MVP).** Laying passive rail across indices 0–8 would run rail into the empty lower-station shell without platform, barrier, drive/brake, power, or control infrastructure. This is correctly deferred; not a buildable next package without a station-interface design.

### H7. Other MP05 retained nonclaims

- FIRE-EG-B exterior/spine opening (egress not commissioned).
- R09 exterior door, lower wet interface, lift, smoke, power, drainage.
- R10 secure/public access, chamber/terminal/exterior use, active mechanisms.
- R11 whole-corridor/rail/interchange/hydraulic/drainage/utility claims.
- Empty Eight future-line stubs (8 east seals), P1-B12 Grand Avenue shell, C2, C3.

## Legacy area next-tasks (MP06–13)

### H8. Approach Road — `CIRC-WL-ARRIVAL-ROAD-01`

- Six-anchor road/bridge/shoulder/lighting/crossing profile + separate pedestrian edge.
- Needs fresh survey (AR-H01..H05): exact surface/shoulder/bridge/furniture/crossing sets, Town Expansion ownership reconciliation, bidirectional route QA.
- Readiness: `CIRC-00-CENSUS` produced (2026-08-24); `CIRC-WL-ARRIVAL-01` survey produced. Concrete next package: `CIRC-WL-ARRIVAL-ROAD-01`.

### H9. Westlight — `CIRC-WL-ARRIVAL-01` (survey-first)

- Map Gatehead arrival, district street/shoreline walk, venue entry, bowl concourse/aisles/vomitories, theatre, club, backstage/service routes per event mode.
- Classification (public/staff/controlled/emergency) and route width/headroom/landing standards required. Survey done; design/release pending.

### H10. Town Expansion — cross-area interface work

- No open acceptance hold on committed R1. Future physical work HOLD until fresh snapshot, exact ownership/interface review, route/enclosure criteria, guarded ops, and explicit human release approval.
- Legacy `approach-road`/`TE-REGIONAL-APPROACH-ROAD` ownership reconciliation pending.

### H11. Ravensgate — surface-water hydrology + interface holds

- No authorized restricted-facility access; proposed surface water above sensitive underground context needs exact closed-basin proof; library/loggia/Garth/pavilion/Guild Hall edge contracts needed.

### H12. Ravensreach — cross-area release contracts

- Pavilion, Guild Hall, Ravensgate, and Town Expansion adjacent changes need explicit interface contracts and own acceptance.

### H13. Raven Rock — tunnel route/vertical-circulation holds

- Hydrology: T2b excluded aquifer edge, RR-N6, C2/Cavern C remain water-sensitive.
- Route-performance: normal-speed bidirectional trials needed.
- Vertical circulation: prove width, headroom, edges, landings, signs for the ladderless stairs.

### H14. MainStreet — condition refresh + route/safety proof

- Phase MSA-1 read-only condition refresh is next; H11 stair corrected (CIRC-MSA-H11-01 done); observatory rooms furnished (MSA-OBS-S01 done).

## Buildable next-package candidates (prioritized)

1. ~~**C1 station 1183 gap closure**~~ — **DONE (R11N, 2026-08-24).** Extended the R11J beam/haunch framework across 1183, joining R11M+R11J surfaces into one 796-cell component. Executed 54/54 with exact inverse. **(H1 closed)**
2. **Approach-road pedestrian profile (CIRC-WL-ARRIVAL-ROAD-01)** — concrete next legacy-area package. **(H8)**
3. **Legacy-area next-tasks (Ravensreach civic, MainStreet, Raven Rock)** — see H10–H14 and the buildable scan below.

## Buildable scan — legacy-area next-tasks (H8–H14)

### Status of completed 2026-08-24 legacy builds

- CIRC-MSA-H11-01 (MainStreet Midtown stair core correction) — DONE
- MSA-OBS-S01 (MainStreet observatory furnishing) — DONE
- RR-B2 (Raven Rock Signal & Communications equipment racks) — DONE
- CIRC-RG-SURFACE-01 (Ravensgate Stoa garden-loop walk) — DONE
- CIRC-RRCH-LIB-01 (Ravensreach library stair supplement) — DONE
- CIRC-RRCH-MOOT-01 (Ravensreach Moot Hall rooms) — DONE
- RRCH-MOOT-01B (Ravensreach committee furnishing) — DONE

### Remaining buildable scan

| Task | Readiness | Next concrete action |
|---|---|---|
| **BKR-SURVEY-00** (Cheyenne/east-C01/legacy-C01/RR-Z5 fresh condition census) | **FIRST PACKAGE** | Read-only fresh-snapshot walkable-cell graph + station table for every named route. Prerequisite for BKR-C01-PORTAL-01, BKR-C01-DIMENSION-02, BKR-LEGACY-C01-01, BKR-B03-ACCESS-01, BKR-RR-Z5-01, BKR-RR-C2-02. |
| **CIRC-WL-ARRIVAL-ROAD-01** (Approach Road pedestrian profile) | Survey-gated | Fresh exact-cell survey (pedestrian edge, grade, bridge-stair, shoulders, stopping bay, lighting, crossings) + Town Expansion ownership check before any build. |
| **CIRC-WL-ARRIVAL-01** (Westlight arrival) | Survey done | Design release for Gatehead arrival/district walk/venue entry per event mode. |
| **CIRC-RR-C2-01** (Raven Rock C2) | Closed | Station survey + wet/cave boundary design, then a dry 3×3 corridor or explicit closed classification. |
| **Ravensreach ↔ MainStreet** | Proven route | Widen only the four below-three-wide samples conflict-free; don't replace the route. |
| **BKR-LEGACY-C01-01** (legacy MainStreet C01 room recovery) | Survey-gated | Classify the 5,168 changed targets, then small reversible room programs. |
| **AR-H01..H05 / MSA-1 / WLV-1** | Survey/design | Condition refreshes and exact-cell surveys first. |

### Conclusion

The legacy-area queue is **survey-first**. No large legacy build is immediately
executable without a fresh condition census (BKR-SURVEY-00) or the exact-cell
approach-road survey. The bounded, low-risk **Ravensreach↔MainStreet widening**
of four samples is the only near-term physical package that does not require a
full fresh survey first (the route is already proven). All other legacy items
are correctly survey/design-gated and do not block the accepted MVP.

## Non-blocking / keep closed

- N06 (H5, resolved-by-design), B07 suspended gravel (H2, resolved-by-design), north-smoke residual (H3, resolved-by-design), B09 lower-station rail interface (H6, deferred transport), unexcavated riser (H4, deferred D06), FIRE-EG-B, future stubs, P1-B12, C2, C3.
- These are retained local nonclaims; they do not reopen the accepted MVP and are not required for any other package.
