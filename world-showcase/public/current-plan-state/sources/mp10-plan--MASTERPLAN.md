# Ravensreach — Retroactive Area Masterplan

**Plan date:** 2026-08-05
**Plan class:** retroactive stewardship and completion plan
**World:** `world`
**Authority:** planning/documentation only; no live or database mutation is authorized.

## 1. Executive intent

Steward Ravensreach as a built civic settlement: preserve its eleven durable structures and 46 named rooms, keep the public realm connected, close remaining external-route/configuration interfaces, and prevent a return to broad destructive grading or furniture-without-shell failure modes.

Ravensreach has a deep legacy document set. This plan reconciles it against the later durable catalog and saved-world QA. Old design and incident documents remain valuable provenance, but their once-open decisions are not automatically current blockers when later accepted evidence resolves them.

## 2. Evidence authority and reconciliation

When records conflict, use:

1. immutable accepted transactions, terminal snapshots, and saved-world QA;
2. current durable `world_features` and bound scan records;
3. post-build audits and route QA;
4. design narratives and incident analyses;
5. early briefs and unexecuted proposals.

The 2026-07-26 public-realm/redesign documents recorded severe pre-build defects and decisions. Later records show substantial construction, repair, ladderless circulation, room fitout, and accepted route evidence. Therefore this plan treats those documents as design/incident history, not as a claim that the current town is still in that early state.

## 3. Area scope, bounds, and anchors

North is `-Z`; bounds are inclusive.

| Scope | Bounds / entrance | Current evidence |
|---|---|---|
| Ravensreach district | `X -147..-40`, `Z -451..-324` | Built/cataloged complete |
| Saved-world scan | `X -144..-39`, `Y 24..110`, `Z -448..-323` | Audited occupied envelope |
| RRCH-LIBRARY | `X -144..-111`, `Z -448..-426`; entrance `(-128,68,-424)` | 6 levels, complete |
| RRCH-MOOT | `X -100..-70`, `Z -392..-341`; entrance `(-85,68,-370)` | 9 levels, condition 95; complete |
| RRCH-TOWN-HALL | `X -98..-72`, `Z -381..-368`; entrance `(-85,68,-368)` | Nested historic shell, 3 levels, complete |
| RRCH-STOREHOUSE | `X -95..-75`, `Z -420..-408`; entrance `(-85,68,-408)` | Complete |
| RRCH-SURVEYOR | `X -91..-79`, `Z -407..-400`; entrance `(-85,68,-400)` | Complete |
| RRCH-MARKET | `X -73..-39`, `Z -344..-323`; entrance `(-51,68,-343)` | 3 levels, complete |
| RRCH-GRANGE | `X -65..-41`, `Z -370..-352`; entrance `(-66,68,-361)` | 3 levels, complete |
| Four cottages | Architect, Steward, Scout, Mason | Complete; exact bounds and entrances remain catalog-controlled |

The district and scan envelopes include civic space between the structures. They do not prove that every surface cell is intentionally authored.

### Map and visual evidence

- [Current Ravensreach floorplan](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/03-ravensreach-overview.png)
- [Core and Old Town surface map](../../../data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/01-ravensreach-core-and-old-town.png)
- [Catalog screenshot of the civic core](../../../data/exports/world-catalog-post-2026-07-27/screenshots/RRCH-ravensreach-core.png)
- [Moot Hall floorplan](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/structures/ravensreach-rrch-moot.png)
- [Civic library floorplan](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/structures/ravensreach-rrch-library.png)
- [Accepted Ravensreach–MainStreet route map](../../../data/world-review/citizen-ravensreach-mainstreet-route-map-terminal-20260728T1839Z.png)

## 4. Current state

The read-only 2026-08-05 catalog census records:

| Feature class | Count | Catalog state |
|---|---:|---|
| District | 1 | complete |
| Buildings | 11 | complete |
| Rooms | 46 | complete |
| Custom circulation records | 5 | complete |
| **Total** | **63** | **all cataloged complete** |

The bound saved-world scan reports eleven structures, five multi-floor structures, zero structures using ladders as primary circulation, zero multi-floor structures without stairs, 46 named rooms, zero empty rooms, and zero under-detailed rooms. Separate post-route and room-fitout QA each record `7/7` checks passed.

The terminal Ravensreach–MainStreet route survey records `PASS` against snapshot SHA-256 `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`. Its companion configuration patch remains `PROPOSED_NOT_APPLIED`; physical route truth and citizen configuration are therefore distinct states.

## 5. Built versus proposed

### Built / accepted evidence

- Eleven cataloged structures and 46 room programs, including the library, Moot/Sanctum stack, original Town Hall shell, Market Hall, Grange Hall, storehouse, and cottages.
- Ladderless primary vertical circulation in the multi-floor structures covered by the saved-world scan.
- Post-build room fitout and selected route assertions at `7/7` each.
- A terminal, exact-path Ravensreach–MainStreet physical route survey with `PASS` status.
- `MP10-RRCH-COMMITTEE-BRIDGE-01`: a 14-cell, level Committee Room deck that reconnects its west/east normal-walk components. It has a new complete source/post pair, strict forward and exact rollback-poststate proof, zero live-entity clearance, protected furniture retention, and independent 20-station route QA. This contained repair is not programme completion; its exact release evidence is in [`MP10-RRCH-COMMITTEE-BRIDGE-01-OFFLINE.md`](MP10-RRCH-COMMITTEE-BRIDGE-01-OFFLINE.md).
- Later public-realm/civic-quarter work documented as built and audited; current physical truth must still be checked against the bound snapshot before alteration.

### Proposed / unclosed work

- The citizen-fleet configuration patch that would activate/use the terminal inter-area route remains proposed and unapplied.
- Town Expansion projects adjacent to Ravensreach have their own ownership, evidence, and release chains; they are not silently absorbed into this plan.
- Any future library–Guild Hall tunnel or pavilion work remains governed by its separate planning/release status.
- Legacy redesign alternatives are not executable instructions. Reopen one only after checking whether later construction already resolved or superseded it.

## 6. Dependencies and interfaces

| Interface | Rule |
|---|---|
| Ravensreach–MainStreet citizen route | Preserve the accepted exact path. Configuration activation is a separate reviewed change with return-route and safety gates. |
| Ravensgate / civic library edge | Keep RRCH-LIBRARY ownership distinct from RG-LOGGIA, Garth, pavilion, and Guild Hall scopes; use exact transition cells. |
| Town Expansion | Respect its immutable transaction and supplemental-release chain. Do not modify accepted expansion cells as “town maintenance.” |
| Underground circulation | Keep the documented worker-town/PassageWay relationships distinct from surface streets; no inferred connection from nearby geometry. |
| Town automation | Do not resume or redirect autonomous build/repair behavior on stale database/design assumptions. Reconcile config, protected zones, and physical truth first. |
| Containers and authored interiors | Preserve inventories and named room programs. Avoid operations that move/overwrite chests or fittings. |

## 7. Risks and holds

- **Destructive-operation risk:** the incident record shows why broad sweeps and blanket fills are unacceptable. Every future operation must be exact, bounded, and reversible.
- **Legacy-status risk:** early documents contain observations and proposals that later builds superseded. Do not execute from them without current snapshot reconciliation.
- **Nested-ownership risk:** the original Town Hall shell sits within the larger Moot Hall stack; collision and media ownership must preserve both identities without double-authorizing cells.
- **Route/config split:** the inter-area route passes physical evidence, but the configuration patch is not applied.
- **Condition watch:** RRCH-MOOT is cataloged complete with condition score 95 rather than 100; inspect rather than assuming the reason.
- **Cross-area release hold:** adjacent pavilion, Guild Hall, Ravensgate, and Town Expansion changes need explicit interface contracts and their own acceptance.

## 8. Phased roadmap

### Phase 0 — Current-state reconciliation

Bind the 63 feature records, accepted route, post-build audits, and latest immutable snapshot. Produce a supersession table for every legacy design/proposal item that is still cited operationally.

### Phase 1 — Condition and ownership survey

Inspect all eleven structures, public-space surfaces, containers, entrances, and nested Moot/Town Hall geometry. Record exact defects and one physical owner per cell/interface. Do not grade or repair during the survey.

### Phase 2 — Route and accessibility closure

Re-run public-route, doorstep, stair, lighting, and destination-legibility checks from all civic anchors. Preserve the accepted MainStreet path and verify its return direction. Separate physical defects from configuration state.

### Phase 3 — Safe maintenance packages

Author small exact-state packages for confirmed defects only. Use natural-material allowlists for landscape work, protect structures/containers/routes, bind complete inverses, and reject broad coordinate fills.

### Phase 4 — Citizen configuration integration

Review the proposed route/config patch against terminal physical evidence and current automation behavior. Apply only through a separately approved configuration deployment with rollback and post-restart verification.

### Phase 5 — Cross-area interfaces and publication

Close exact interfaces to Ravensgate, the civic library/pavilion ensemble, Town Expansion, and underground routes. Run saved-world and route QA, then refresh catalog maps, screenshots, and this report.

## 9. Acceptance criteria

- All 63 current feature records reconcile to a named snapshot and evidence source.
- Zero blanket fills/sweeps across structures, containers, roads, water, or authored landscape.
- Every physical target has one owner and an exact pre-state; exact inverse passes terminal post-state.
- All public destinations pass bidirectional route, headroom, lighting, and legibility checks.
- RRCH-MOOT condition finding is explained and either accepted or repaired with evidence.
- The Ravensreach–MainStreet config state is explicit: proposed or deployed, never implied from physical route PASS.
- Cross-area transition cells and protection responsibilities are exact and reviewed.
- Matched maps/images reference the correct object and snapshot.

## 10. Evidence provenance

- `data/world-map.db`, opened read-only 2026-08-05: 63 features, district/structure bounds, entrances, class/status counts, and scan bindings.
- [`active-interior-register-2026-07-27.json`](../../../data/world-review/active-interior-register-2026-07-27.json): eleven structures and district record.
- [`worldwide-interior-programs-2026-07-27.json`](../../../data/world-review/worldwide-interior-programs-2026-07-27.json): 46 room programs.
- [`worldwide-room-fitout-wave4-ravensreach-saved-world-qa-2026-07-27.json`](../../../data/world-review/worldwide-room-fitout-wave4-ravensreach-saved-world-qa-2026-07-27.json): `7/7` saved-world room assertions.
- [`ravensreach-ladderless-wave3-post-route-qa-2026-07-27.json`](../../../data/world-review/ravensreach-ladderless-wave3-post-route-qa-2026-07-27.json): `7/7` post-route assertions.
- [`citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json`](../../../data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json): accepted exact-path route evidence.
- [`citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json`](../../../data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json): `PROPOSED_NOT_APPLIED` configuration state.
- [`MASTERPLAN-RAVENSREACH-PUBLIC-REALM.md`](../../ravensreach/design/MASTERPLAN-RAVENSREACH-PUBLIC-REALM.md), [`RAVENSREACH-REDESIGN-2026-07-26.md`](../../ravensreach/design/RAVENSREACH-REDESIGN-2026-07-26.md), and the [`2026-07-25 incident`](../../ravensreach/qa/INCIDENT-2026-07-25-ravensreach-structure-loss.md): design/incident provenance, not current release authority.

**Derived/inferred in this plan:** the authority hierarchy, supersession approach, and phased roadmap are planning judgments; the scan envelope is summarized from the scan record; the nested-ownership and condition-watch priorities are inferred from catalog structure relationships and scores. No unverified legacy proposal is promoted to built or accepted status.

## 11. 2026-08 circulation readiness addendum

The six-level library's ladder-retirement operation is a confirmed one-tread spiral (`x=-118..-116`, `z=-443..-441`). The 7/7 route QA proves that the six levels were reachable in the historical snapshot; it does not certify a two-wide public stair, 3×3 landings, or current headroom. `CIRC-RRCH-LIB-01` must survey the core and install a two-clear-wide switchback or widened perimeter primary route with three-clear headroom, 3×3 turn landings, edge cues, level signs, and bidirectional no-jump proof. The original spiral may remain only as a signed private/service feature after that compliant route exists.

The accepted Ravensreach–MainStreet route is usable evidence, not proof of a finished five-wide promenade: it passes normal walking with two-block body clearance and at least four clear headroom, while reporting four samples below three-wide and 261 below the five-wide target. Preserve it; inspect the four narrow samples first and widen only disjoint, ownership-cleared segments. See [`cross-district-circulation-audit-20260822.md`](../../../data/world-review/cross-district-circulation-audit-20260822.md).

## 12. 2026-08 fresh defect census

The 2026-08-22 complete-save census confirms that the six-level library still
connects its registered floors by normal walking, but its one-tread spiral is
not promoted to public/common-area acceptance. More importantly, it identifies
a real incomplete programme in the nested Moot Hall stack: Clerks Hall is
walkable but unfurnished, Committee and Meeting rooms are under-detailed, and
Attic Store has no standable interior cells. These are separate from the
historic condition score and require the contained `RRCH-MOOT-01` package;
Attic Store stays closed/service-only until it has a supported floor and
normal-walk service approach. Exact room bounds, release sequencing and
non-destructive gates are in [the public-realm defect lane](../../redevelopment/2026-08-22-public-realm-defect-lane.md).

## 13. 2026-08 bounded Committee Room circulation release

`MP10-RRCH-COMMITTEE-BRIDGE-01` is accepted as a narrow as-built correction,
not a change to the programme's completion state. It adds 14 exact
polished-deepslate deck cells at y=76 inside the owned Committee Room void,
reconnecting y=77 stations `(-90,77,-357)` and `(-81,77,-357)` around the
retained table and chairs. The x=-92 partition, lectern, chiseled bookshelf,
table, chairs, upper spine, and all cross-area boundaries remained excluded.

The release is bound to complete sealed source and post captures, exact forward
and rollback operations, parser/source/inverse proof, zero live entities,
journalled strict execution (14 changes, zero no-ops), post rollback proof,
and an independent conservative reachability pass across all 20 named route
stations. The evidence ledger is
[`mp10-rrch-committee-bridge-01-live-20260826T063859Z/release-ledger.json`](../../../data/world-review/mp10-rrch-committee-bridge-01-live-20260826T063859Z/release-ledger.json).

No public accessibility, venue/egress, citywide continuity, citizen-route
configuration, library-stair, or MainStreet/Town Expansion-interface claim is
created by this repair. Those remain separate programme work under the
completion register.
