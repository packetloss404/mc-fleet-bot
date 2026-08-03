# World Redevelopment Wave 2

Program ID: `REDEV-2026-07-28-R2`  
State: **ACCEPTED — LIVE TRANSACTION AND POST-RELEASE QA PASS**  
Supersedes: no prior release; R1 remains accepted and immutable.

## Objective

Wave 2 continues the work deliberately left outside the first atomic release:

1. apply the Raven Rock tunnel standard beyond the S1 pilot;
2. repair a larger stair/landing/decision-node sequence without weakening
   production movement or mining safeguards;
3. close the C01 recessed-portal floor-plan gap;
4. materially increase exact-object screenshot coverage;
5. select and build the next highest-impact MainStreet spacing, road,
   wayfinding, or destination-integration package.

This wave begins from measured post-R1 conditions. It does not replay or amend
R1 operations.

The PM baseline, live hold, database/media starting counts, and release-state
definitions are recorded in
[`baseline-and-release-readiness.md`](baseline-and-release-readiness.md).
Rejected physical alternatives, failed camera evidence, and the stricter
neighbor-state decision are retained in
[`decision-and-rejection-log.md`](decision-and-rejection-log.md).
The complete live and post-state result is recorded in
[`as-built-release-report.md`](as-built-release-report.md), with the independent
post decision in
[`post-release-independent-acceptance.md`](post-release-independent-acceptance.md).

## Immutable engineering baseline

| Field | Value |
|---|---|
| Saved-world directory | `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region` |
| SHA-256 | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` |
| Region files | 26 |
| Bytes | 122,744,700 |
| Hash algorithm | SHA-256 over sorted filename + NUL + bytes + NUL |
| Captured | 2026-07-28 after `save-all flush` |

`data/worldsnap/region` is mutable and must not be named as the Wave 2 design
baseline. A separate same-moment pre-release snapshot will still be required
immediately before any live execution.

## Workstreams

| Workstream | Scope | Required output | Live authority |
|---|---|---|---|
| `R2-INF-RR` | Remaining Raven Rock tunnel leg, junction, and stair defects | inventory, selected package, forward/rollback, database features, cameras, tests, route schedule | `INF-RR-02` committed and accepted |
| `R2-MSA` | Remaining MainStreet spacing/road/corner/destination problem | measured alternatives, selected non-overlapping package, guarded ops, database/media contract, tests | R08 committed and accepted |
| `R2-MEDIA` | C01 portal plan plus exact-object building/circulation captures | floor-plan artifact, camera manifests, images, hashes, media relations, coverage delta | 79/79 media QA PASS |
| `R2-PM-QA` | Dependencies, overlap, evidence, release/rollback | traceability, target intersection report, risk/decision logs, atomic controller, post-QA | Final post verifier PASS |

## Selection rules

### Tunnel package

The next package should be the largest coherent segment that can be understood
and rolled back as one unit, not the largest possible volume. Priority order:

1. the measured T2b route-identity defect;
2. a complete RR-Z5 stair flight/landing sequence if it can be isolated;
3. one T2/T3 decision node with advance and confirmation signage;
4. only then, longer primary-spine rollout.

T2b should read as a five-wide tunnel within a natural cavern. It must not fill
the full cave. Selected windows are intentional; accidental openings, route
dissolution, variable tread/headroom, and arbitrary light placement are not.

### MainStreet package

Selection must prove a remaining defect on the Wave 2 snapshot. Preference:

1. a route that terminates ambiguously or at an unfinished edge;
2. a decision corner where the next destination cannot be read;
3. an unresolved C01 arena/stadium-finding sequence;
4. a B02/B03 frontage or service relationship not already solved by R1;
5. residual spacing/crowding that can be fixed without relocating protected
   authored interiors.

No package may overwrite R1 solely to make a visually different version.

### Media package

Exact-object coverage is prioritized over raw screenshot count:

1. the new C01 recessed portal floor plan;
2. the 55 buildings without exact perspectives;
3. every new Wave 2 circulation feature;
4. important tunnel nodes and stairs;
5. day/night or context variants only after exact primary relations exist.

## Required engineering gates

Every physical candidate must provide:

- immutable baseline hash equality;
- complete source-state properties, not material names alone;
- unique target cells;
- explicit finite alternatives for any neighbor-sensitive state;
- source/desired/rollback bijection;
- block-entity, inventory, fluid, gravity, and support-dependent census;
- database intersection check, including vertical overlap;
- cross-package target intersection check;
- declared operation envelope for live entity clearance;
- cameras captured or frozen before execution;
- generator and independent QA tests;
- dry-run in group-aware strict mode;
- database feature and observation payloads;
- route tests that require both directions and forbid dig/tower.

## Live-release gates

Offline acceptance does not authorize live mutation. The release coordinator
must additionally require:

1. fleet bots paused and no human player in an operation envelope;
2. no active or queued world-building mission;
3. `save-all flush`;
4. new immutable pre-release snapshot;
5. every forward guard passing that same snapshot;
6. all-package live entity gate immediately before execution;
7. fixed package order with automatic reverse-order compensation;
8. post-flush immutable snapshot;
9. every rollback guard matching installed state;
10. exact census, bidirectional routes, matched post media, database import,
    atlas/catalog refresh, dossier update, and Sites version.

## Final R2 acceptance matrix

| Requirement | Current state | Completion evidence |
|---|---|---|
| R2 baseline frozen | Complete | directory and SHA above |
| Tunnel inventory | Complete | 10 legs, 15 nodes, 15 RR-Z5 flights in `data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json` |
| Tunnel package | Accepted | `INF-RR-02`; 151/151 strict live groups; route passes both directions; six matched after cameras |
| MainStreet defect selection | Complete | missing R06/R07 midblock connection selected as R08 |
| MainStreet package | Accepted | 740/740 strict live groups; 736 explicit plus two reactive states; route passes both directions |
| C01 portal floor plan | Complete | exact 1,600×1,100 plan PNG plus PDF relation |
| Exact screenshot expansion | Complete | 79/79 target-valid unique images; 69/69 buildings exact |
| Cross-package overlap | PASS | zero cross-package, R1, or protected-feature intersections |
| Live execution | Committed | `data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json` |
| Post-release QA | PASS / accepted | 887 explicit, two reactive, 887 rollback, four route directions, 14 matched cameras |
| Database import | PASS | 51/51 features; database now 875 features, 23 scans, 1,881 observations |
| Atlas and dossier | Complete | seven-sheet d05ac782… atlas plus Wave 2 artifact register and master PDF |
| Sites publication | Separate publication step | must identify the accepted d05ac782… release and 1bd71512… database |

## Stop-work conditions

Stop before mutation if:

- the same target cell appears in two packages;
- a package intersects a registered room, inventory, fluid, or protected entity
  not explicitly handled;
- a route fix depends on widening the resident leash or lowering production
  mining safeguards;
- a camera, map, or plan is assigned a snapshot it was not generated from;
- rollback cannot reconstruct exact prior block properties;
- a finite-state union has zero or multiple matching alternatives;
- any human player or blocking entity remains inside a live operation envelope;
- an apparent aesthetic improvement reduces route legibility, clearance, or
  destination identity.

## Documentation rule

Wave 2 retains failed attempts and rejected alternatives. Reports must
distinguish:

- measured condition;
- researched recommendation;
- selected design;
- generated/offline-ready state;
- preflighted state;
- live built state;
- independently verified state;
- published state.

No stage is silently promoted to the next.
