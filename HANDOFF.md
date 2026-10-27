# Combined Zones Masterplan — Handoff

Date: 2026-08-08 UTC

## The honest state

The full Combined Zones Masterplan was **not built**. The world was not fully
constructed, and the release system was never authorized to pretend that it
was.

The work became much harder than it needed to be because the plan was treated
as both a design document and an executable block-operation package. It is a
strong Minecraft design/proposal record, but most of its geometry did not have
complete desired block states, accepted owners, exact interfaces, or a
hash-bound release authorization.

## What was actually built in the world

- Several earlier current-state-safe and C01 route/stair releases were executed
  through the guarded runner.
- The latest B03 current-safe package placed and verified 7,328 cells.
- The broader current session recorded 13,562 guarded additions across the
  already-materialized safe supplements.
- The B03 result is independently post-verified here:
  `data/world-review/combined-zones-as-built-b03-verification-20260808.json`
- No full-masterplan transaction was executed.

## What consumed the time

1. Repeated scans were run against historical operation sources that were
   already converged or stale relative to the live world. Those scans correctly
   returned little or no safe delta, but they did not produce visible building.
2. The original Masterplan 05 records contained exact geometry but explicitly
   held construction authorization. They did not contain complete material maps
   for every domain.
3. The release contract requires a strict serial chain: decisions, ownership,
   interfaces, protected relic clearance, compiler determinism, fresh snapshot,
   preflight, entity clearance, authorization, execution, rollback proof, and
   post-QA. Descendant builds cannot be used to resolve earlier design gates.
4. Several existing release packages were old, individually valid packages but
   were not one current, accepted, whole-masterplan transaction.
5. Tooling was missing at the start. T01–T04 were implemented during this
   session, but implementing the gates did not create the missing design inputs.
6. Validation temporarily filled the root filesystem through test-created
   `/tmp` artifacts. Those exact Combined Zones test directories were removed;
   the filesystem recovered roughly 734 MB. No world data was removed.

## Current authoritative blockers

The contract validator still reports `CONTRACT_VALID_BUILD_BLOCKED` with 39
blockers. The meaningful blockers are:

- D02 C1 civil alignment acceptance is unresolved.
- D05 mountain hydrology/relic-buffer acceptance is unresolved.
- D06 Empty Eight mechanism/life-safety detail is unresolved.
- P1-B09 and P1-B12 have no explicit executable operation packages.
- The full official package set has no accepted explicit construction-owner
  records and has unresolved cross-package seams.
- Four conservative package bounds overlap protected relic bounds.
- No external hash-bound authorization artifact exists.

The authoritative contract still says `worldEditAuthorized: false`. That is
not a software defect; it is the current state of the project record.

## Tooling now available

- `scripts/compile_combined_zones_release_layer.mjs` — T01 package compiler and
  source binding.
- `scripts/audit_combined_zones_release_layer_ownership.mjs` — T02 ownership,
  seam, and protected-core gate.
- `scripts/run_combined_zones_release_layer.mjs` — T03 hash-bound atomic wrapper.
- `scripts/verify_combined_zones_as_built.mjs` — T04 post-snapshot verifier.
- `scripts/remediate_combined_zones_blockers.mjs` — reruns all mechanical work.
- `scripts/generate_combined_zones_decision_closure_packet.mjs` — D02/D05/D06
  review packet with existing evidence and recommended defaults.
- `scripts/run_combined_zones_autonomous.mjs` — idempotent fail-closed worker.

Reports:

- `data/world-review/combined-zones-blocker-remediation-20260808.json`
- `data/world-review/combined-zones-decision-closure-packet-20260808.json`
- `data/world-review/combined-zones-release-layer-20260808.json`
- `data/world-review/combined-zones-release-layer-ownership-20260808.json`
- `data/world-review/combined-zones-scoped-gate-ledger-20260808.json`

## Automation state

The autonomous timer was installed while testing the overnight workflow, but it
has been disabled for this handoff so it will not keep consuming resources.
Its last successful run was fail-closed with:

- missing external authorization;
- release layer not executable/authorized;
- ownership/interface gate not PASS.

If re-enabled later, it will regenerate evidence and execute only a complete,
hash-bound, externally authorized release. It cannot invent materials or self-
approve ownership.

The gates have now been split in the scoped ledger. P1-B11 (`b11-road` and
`b11-support`) can be queued independently of unresolved D02/D05/D06 decisions,
although each still lacks its own owner, exact seam clearance, fresh preflight,
entity gate, and authorization. D02/D05/D06/B07/B08/B10 remain attached only to
the decisions they depend on.

## Recommended next session

Do not start with another full-world scan. Choose one of these two paths:

### Path A — Reduced-scope construction

Create a new accepted release scope containing only exact Minecraft packages
with explicit materials, one owner per cell, no relic overlap, forward/rollback
files, and a fresh snapshot. Execute that scope and post-verify it. Repeat one
scope at a time.

### Path B — Finish the whole plan

Use the decision closure packet to resolve D02/D05/D06, compile B09/B12 or
explicitly defer them, assign owners/interfaces, clear protected overlaps, then
generate a new complete release layer and authorization.

The key process correction is to stop treating “the whole Masterplan” as one
undifferentiated job. A visible build requires a small, executable release unit;
the rest can remain queued without blocking that unit.

## Safety notes

- Do not hand-start a second bot instance.
- Do not execute old release manifests against the current world without a new
  source snapshot and complete preflight.
- Do not mark a proposal as built because its geometry or operation file exists.
- The B03 as-built verifier is the model for future claims of completion.

---

## Later autonomous-build record

The record below covers work performed from 2026-08-24 through 2026-08-27.
It is retained as chronological evidence, but it is subordinate to the
authoritative status, blockers, and safety rules above. If a historical
completion claim conflicts with those sections or the current Master Plan
Completion Register, the uppercase `HANDOFF.md` guidance prevails.

### Autonomous build-loop handoff — 2026-08-24 (evening session)

This handoff records the autonomous Master-Plan + passenger-rail build loop run
under the expanded all-work-all-areas owner directive.

### What was built (9 verified physical releases)

| # | Package | Scope | Result | Evidence |
|---|---|---|---|---|
| 1 | CIRC-MSA-PORTAL-01 | MainStreet parking portal → warehouse drive hall (54-cell lintel clear) | 54/54 | `data/world-review/msa-portal-warehouse-live-20260824T120500Z/` |
| 2 | CIRC-RRCH-MSA-WIDEN-01 | Ravensreach↔MainStreet 4-choke widening (wall/fence/andesite → air) | 11/11 | `data/world-review/rr-msa-widen-live-20260824T163500Z/` |
| 3 | CZ-R08AW | Empty Eight south gallery destination wayfinding (176 band + 12 datums) | 188/188 | `data/world-review/combined-zones-r08aw-live-20260824T170100Z/` |
| 4 | RRCH-MOOT-UPPER-ROOMS | Ravensreach Moot Hall upper rooms (Clerks/Meeting/Attic/Committee) | 327/327 | `data/world-review/rrch-moot-upper-rooms-live-20260824T161000Z/` |
| 5 | CIRC-WL-ARRIVAL-ROAD-01 | Approach Road 2-wide pedestrian edge | 85/85 | `data/world-review/approach-road-edge-live-20260824T191620Z/` |
| 6 | BKR-RR-Z5-01 | Raven Rock RR-Z5 landing lights + return sign | 17/17 | `data/world-review/rr-z5-repair-live-20260824T185730Z/` |
| 7 | CIRC-RG-SURFACE-02 | Ravensgate NW Garth pedestrian connection | 63/63 | `data/world-review/ravensgate-surface-live-20260824T211631Z/` |
| 8 | CIRC-WL-ARRIVAL-01 | Westlight arrival pedestrian edge | 54/54 | `data/world-review/westlight-arrival-live-20260824T205333Z/` |
| 9 | TE-R1 red-carpet drift repair | Town Expansion red-carpet restore (40 drifted cells) | 40/40 | `data/world-review/town-expansion-redcarpet-live-20260824T220500Z/` |

Every release passed the full hard-safety kernel: fresh source, exact guards,
strict-noop preflight + parser, block-entity + live-entity clearance, journaled
execution, immutable post, rollback post-state preflight, post-state verify.

### Surveys and designs completed (read-only)

- **BKR-SURVEY-00** (bunker condition census): B03 PASS, RR-Z5 PASS (2-wide
  service shaft), C2 HOLD (wet/cave), all C01 verticals HOLD (1-wide pinches).
- **Approach Road exact-cell survey**: 336 conflict-free pedestrian-edge cells.
- **Cheyenne B03/Z10 seam survey**: all 63 "obstructions" are inside the
  accepted B09 rail shell — nothing buildable, stays sealed.
- **SubTropolis occupancy survey**: tunnels vacant/dry, R07C sealed, one
  maintenance minecart only.
- **Houston wet/gravity survey**: pond dry post-R09L; R06 deep water + gravity
  column are 2 permanent holds.
- **Town Expansion drift survey**: found + repaired 40-cell red-carpet drift;
  natural copper oxidation (4,520) is rollback-only.
- **Westlight venue ops survey**: field-egress gap is a design HOLD.
- **Ravensgate re-census**: district intact; 1 ownership interface open.
- **Cobalt-S1 station-pair design**: Westlight↔Ravensreach, readyForFreeze false.

### Properly recorded HOLDs (not buildable as bounded packages)

- **C01 portal→L1** (CIRC-C01-PORTAL-01): ~25-block stair excavation; staged
  multi-package construction documented; clean shaft columns verified.
- **Observatory→hub** (CIRC-OBS-GALLERY-01): tight corkscrew spiral has no
  2-block headroom; needs stair redesign.
- **C01 stair widening** (BKR-C01-DIMENSION-02): container/decor-bounded.
- **Legacy MainStreet C01** (BKR-LEGACY-C01-01): all finished/intentional.
- **Passenger rail**: B09 corridor terrain-blocked (dedicated bore needed);
  Cobalt pair readyForFreeze false (Ravensreach water pocket).

### Tests and build

- 64/64 tests pass across 9 new focused test files; `npm run build` clean.
- Fleet healthy: `{"status":"ok","botCount":5}`; both systemd services active.

### Runtime safety

- No second bot instance was started; no quarantine incidents.
- No live release or long-running process left running.

### Recommended next loop (fresh session)

1. **C01 portal→L1 stair shaft** — build the staged slices (excavate shaft →
   treads → tunnel → route proof) using the verified clean columns x=694..695.
2. **Observatory stair redesign** — replace the corkscrew spiral top with a
   2-wide straight stair.
3. **Passenger rail RAIL-S2** — Westlight headhouse + first 6×6 corridor
   segment once the Cobalt pair freeze is accepted.
4. **Westlight venue field-egress** — once mode/life-safety engineering is done.

### Session continuation — 2026-08-25 (post-question authorization)

Under explicit owner authorization, four previously-held physical routes were
built and verified (all EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE):

| # | Package | Result | Evidence |
|---|---|---|---|
| 21 | BKR-B03-ACCESS-01 — Cheyenne B03 surface access stair | 78/78 | `data/world-review/b03-access-live-20260825T003100Z/` |
| 22 | CIRC-C01-PORTAL-01 — C01 mountain portal→L1 stair shaft | 256/256 | `data/world-review/c01-portal-l1-live-20260825T005000Z/` |
| 23 | CIRC-OBS-GALLERY-01 — observatory hidden-entry→hub closure | 6/6 | `data/world-review/obs-gallery-live-20260825T010100Z/` |
| 24 | C01-SERVICE-CORRIDOR-WIDEN — service corridor 2-wide | 8/8 | `data/world-review/c01-service-widen-live-20260825T011600Z/` |

These closed the last three failed cross-area routes (C01 portal→L1, observatory→hub,
and the barrel-lined service corridor), plus opened the sealed Cheyenne B03 gallery
to the surface for the first time.

Passenger rail: started investigation. The Westlight station site (WL-SC-1) and
first 6×6 corridor segment were confirmed, but the corridor volume at y18-23
contains 930 water cells and the access shaft crosses water at y40 — the rail
requires a sealed water-managed bore (multi-package engineering), matching the
B09-P0 finding. readyForFreeze remains false; RAIL-S2 water containment is the
next concrete rail step.

All 13 builds this session are verified. 41+ session tests pass; `npm run build` clean.

### Autonomous build loop — final state (2026-08-25 17:20 UTC)

The full autonomous build loop ran continuously. **130 verified physical builds**
(EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE / EXECUTED_AND_VERIFIED) across all
Master Plans plus the passenger rail. 349 test files; 46 release notes;
`npm run build` clean; fleet healthy (5 bots).

#### Passenger rail — now substantially built
- Corridor: RAIL-S2-WL-SEGMENT-01..06 (sealed water-containment liners, x=-254..-136) + BC-connector (Leg B/C to Ravensreach)
- COBALT-RR-ACCESS-01 (sealed-sleeve shaft through water) + COBALT-RR-HEADHOUSE-01 + COBALT-WL-HEADHOUSE-01 (both public headhouses)
- COBALT-WL-PLATFORM-01 + platform lighting (both station platforms)
- Track bed: RAIL-S3-TRACKBED-01 + -02 (floor levelled full length)
- Guideway: RAIL-S3-GUIDEWAY-01 + -02 (two directional track-tube beds, continuous x=-254..-136; 20 held for cave-air/water support-first)
- COBALT-S1-FREEZE: readyForFreeze=true
- Still NOT built: rail blocks/powered rails (deferred to RAIL-S4 controls), station platform separation, the held 20 cave-air/water guideway cells.

#### Remaining holds (documented, not buildable as bounded packages)
- C01 stair widening (container-bounded), legacy MainStreet C01 (finished), observatory (fixed), C01 portal (fixed), B03 gallery (now has access stair), C2 (capped), B09 lower-station rail interface, 161-cell wet/gravity residual, N06, unexcavated riser, FIRE-EG-B, Westlight field→concourse vomitory (load-bearing undercroft), venue arm widening (sightlines), accessibility ramps.

#### What "everything" means now
Every bounded, cleanly-buildable physical item across the 13 Master Plans and
the Cobalt rail corridor is built and verified. The remaining items are either
large multi-package engineering (full rail commissioning, powered systems,
station separation), permanent physics/topology exceptions (wet/gravity
residuals, N06), or deferred scopes (P1-B12, C2 visitor portal, C3, future
line stubs). The build queue ledger at
docs/masterplans/MASTER-PLAN-BUILD-QUEUE-2026-08-24.md records all 46+ entries.

---

### Current continuation correction — 2026-08-27

The preceding autonomous-loop narrative is historical and must not be read as
a claim that the complete Master Plan is built.  The current evidence-backed
handoff for MiniMax M3 is:

- [Master Plan continuation brief](docs/masterplans/handoff/00-master-plan-continuation.md)
- [Cheyenne and SubTropolis](docs/masterplans/handoff/01-cheyenne-subtropolis.md)
- [Combined Zones, PassageWay, and surface rail](docs/masterplans/handoff/02-combined-zones-passageway-surface.md)
- [C01, Raven Rock, and Cobalt](docs/masterplans/handoff/03-c01-raven-rock-cobalt.md)
- [Guarded construction protocol](docs/masterplans/handoff/04-release-protocol.md)

The [Master Plan Completion Register](docs/masterplans/MASTER-PLAN-COMPLETION-REGISTER-2026-08-26.md)
remains the completion authority.  A release can close only its exact bounded
scope; every parent programme remains active until it is both built and
functionally verified.  Any future world mutation requires a fresh source,
exact forward/rollback contract, strict guarded execution, fresh immutable
post capture, rollback-post preflight, and independent functional QA.

#### Fresh frontier research and design — 2026-08-27

The detailed continuation packet for MiniMax M3 is
[docs/masterplans/handoff/05-frontier-research-and-design-2026-08-27.md](docs/masterplans/handoff/05-frontier-research-and-design-2026-08-27.md).
It contains the exact source-bound research, maps, regeneration commands,
design decisions, and stop conditions from this pass.

| Frontier | Exact disposition | Immediate next action | Not authorized |
|---|---|---|---|
| C01 main switchback | **built and post-verified:** 928-cell union (828 main + 100 guards), strict `387/387` journaled changes and exact inverse; fresh post QA passes both main and Return-02 directions | preserve it; design any endpoint/opening/protected-route transition as a new bilateral package | replaying operations, route retirement/gating/closure, public commissioning, or touching Return-02 |
| AG-4 exterior gap | 196,072 wet cells escape `-X`, `-Z`, `+Z` below the 250,000-cell cap | exact source survey expansion only through those three faces | plug, liner, drain, support, receiver, rail, promenade, or route claim |
| MP01 Cheyenne portal | exact rational anchor is only an air source probe at `(2048,130,-748)`; authority remains inactive | accept one cross-section, owners, endpoints/recovery, exact cells, target/halo, and inverse | deriving construction geometry from the probe or rounding vocabulary |

Focused C01, AG-4, and MP01 research regressions pass or deliberately fail
closed as documented. They are read-only design evidence, not physical-release
evidence.
