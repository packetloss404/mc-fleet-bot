# Combined Zones CZ-R07J: B07 supported surface headhouse

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE; INDEPENDENT_POST_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Canonical owner:** `P1-B07`  
**Manifest identity:** `7714a583c3e659b0f9d2efac228ad8a1c1fb050a3b78b9010ee40c2ed519f223`

## Exact construction

R07J closes the remaining dry B07 surface architecture as two independently
guarded packages:

1. `b07-grounded-pier-and-deck` — 116 cells. Four continuous polished-diorite
   piers rise from surveyed stable grass to a connected 9x9 deck at Y=72. The
   deck contains the exact 49-cell B07 top face and a one-cell coordination
   apron.
2. `b07-fail-closed-surface-headhouse` — 121 cells. A 72-cell 7x7 perimeter
   and 49-cell full roof enclose one connected 75-cell, three-block-high air
   volume. There is no door or shaft opening.

The package changes 237 unique cells: 233 exact air sources and four exact
one-layer snow sources become polished diorite. Rollback removes the headhouse
first, then the deck and supports, restoring all 233 air states and the four
snow states exactly.

## Why the supports are outside the 7x7 shaft

The accepted top anchor is `(2108,72,-398)` and its exact 7x7 face is
`x=2105..2111`, `z=-401..-395`. The immutable post save proves this footprint
is already void below the natural surface. A pier inside it therefore would
not reach terrain.

R07J uses four points in the one-block B07 coordination ring:

| Pier | Column | Stable ground | Deck contact |
|---|---:|---|---:|
| west | `(2104,63..71,-398)` | grass at Y62 | `(2104,72,-398)` |
| north | `(2107,63..71,-402)` | grass at Y62 | `(2107,72,-402)` |
| south | `(2107,63..71,-394)` | grass at Y62 | `(2107,72,-394)` |
| east tree avoidance | `(2112,64..71,-401)` | grass at Y63 | `(2112,72,-401)` |

Every column is continuous, its top has a full vertical-face contact with the
deck, and its first ground block is non-fluid, non-gravity, non-woody, and not
a container or control block. The east support deliberately moves north of
the spruce rather than cutting it.

## Ownership and preservation

The foundation uses 49 canonical B07 construction cells and 67 additional
cells in the historical B07 interaction union. The Y73 wall layer adds 24
interaction cells. The remaining 97 wall/roof targets at Y74..76 are the
operated subset of the exact 147-cell
`P1-B07-SURFACE-ARCHITECTURE-PRISM-EXTENSION-R07J`. This named reviewed
extension is limited to the closed 7x7 surface prism and is supported by the
CURRENT-STATE direction for B07 surface support/headhouse work, the R07
release-contract active scope, and the standing scoped authorization. It does
not expand shaft, lift, route, smoke, power, or drainage ownership.

The compiler checks all 40 accepted prior Combined Zones release manifests:
zero of their guarded target cells overlaps R07J. It also proves:

- 241 retained log/leaf cells in the surface review prism, zero targets;
- zero target fluid, gravity, woody, container, control, block-entity, saved
  entity, or protected-relic cells;
- zero fluid cells in the operation halo; the one contextual sand and 18
  contextual woody halo cells remain untouched;
- the accepted R09 upper hold has zero target intersection; and
- the exact 49-cell shaft face becomes a solid cap, so no shaft or egress
  interface opens and no route is commissioned.

## Immutable source and rebase

R07J binds the latest accepted terminal state:

- source: `data/worldsnap-combined-zones-r08s-post-20260821T191247Z`;
- complete-save SHA-256:
  `71969f7c558ded938c6e8007b475bd3d8d6430642ee0d2c08e0d43a88741fd64`;
- region SHA-256:
  `c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2`;
- source ledger SHA-256:
  `e5661df1e2f1c5354c2de701e11d4a02da335e55662a95d9c0965335474684f9`;
- completed release identity:
  `97cdc01930456d6cad36457ece95abb8f87232b3c19e5d4c76dfb7cf846b6bf3`.

The complete 6,975-cell B07 surface review prism is byte-for-state identical
between accepted R07I and R08S: both block-state-set hashes are
`f80439d963f47292be8ef1a75831f9bb04d32a667a4a88943a1b6b140f853267`,
with zero mismatches.

## Guarded artifacts and offline evidence

- Manifest:
  `data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json`
- Foundation forward: 116 one-cell guards, operation-body SHA-256
  `6dc61b0b2545ff64a9232d282c74e058ae81a3f17a53842ecefeb38c621db388`
- Foundation rollback: 116 inverse guards, operation-body SHA-256
  `f6f2d0b716dbbea14618129e03188b0bb6085d56040f49d6d13f9347244fcf1c`
- Headhouse forward: 121 one-cell guards, operation-body SHA-256
  `22f80dac82c5f7ee4064cea25b35fe9e1905eb47159931875f5c225013959626`
- Headhouse rollback: 121 inverse guards, operation-body SHA-256
  `66788da2539747f5c445c00c0d04d6b244368a54298565ac4be4d36c6fc1b8dc`

Offline evidence is in
`data/world-review/combined-zones-r07j-b07-supported-surface-headhouse-offline-20260821T192000Z`:

- structural manifest QA: PASS, 2/2 packages, 237 unique targets, zero overlap;
- source preflights: 116/116 and 121/121 PASS;
- projected inverse preflights: 116/116 and 121/121 PASS;
- strict forward/rollback parser checks: PASS, zero WorldEdit leftovers;
- block-entity audit: PASS, zero blockers;
- deterministic focused regression: 6/6 PASS; and
- TypeScript build: PASS.

The wrapper plan is `wrapper-plan.json` in that evidence directory. Any live
release must use a fresh, unused source snapshot, fresh entity clearance,
strict journaled execution in foundation/headhouse order, a distinct post
snapshot, and reverse-order rollback post-state preflights. This compilation
made no live call and no world mutation.

## Execution and independent post-release seal

The strict wrapper completed both packages at
`data/world-review/combined-zones-r07j-live-20260821T193306Z/evidence-ledger.json`.
Its source-bound release identity is
`faaadd98cdeaf9bcd63309015980905fc9ab3c8217fd43995b1fd4474a5eadff` and
its completed release identity is
`5d40a94c69c54a0ab352683d471cd23263efcfaff484334aaa7341478fa48fde`.
All 237 strict forward groups succeeded with zero failure, no-op, unknown
reply, or WorldEdit remainder. Both reverse-order rollback post-state
preflights pass 116/116 and 121/121.

The immutable post is
`data/worldsnap-combined-zones-r07j-post-20260821T193306Z`, complete-save
SHA-256 `8eff7c27e4346ff3ae1d46396ca0da6da1acd3a7eb6fbdcd62bf8c4494b656ac`
and region SHA-256
`c3606576e8ae37929bc9fc72b08a82a978c61a9211a9cc0953cd7d80bebe7125`.

Independent read-only QA in
`scripts/qa_combined_zones_r07j_b07_supported_surface_headhouse_post_release.mjs`
then proved:

- 237/237 exact source-to-post transitions and zero undeclared change across
  the complete 6,975-cell surface review domain;
- four continuous piers with unchanged stable grass contacts and one connected
  81-cell deck;
- a fully closed 49-cell shaft face, 121-cell headhouse, connected 75-cell
  headroom, and complete 110-cell polished-diorite face boundary;
- all 241 tree/log/leaf cells unchanged with zero target intersection;
- all 1,848 R09B/R09C/R09D operated states unchanged, including the retained
  upper hold; and
- exact ledger, execution, evidence-binding, entity, block-entity, and inverse
  identities.

The accepted seal is
`data/world-review/combined-zones-r07j-live-20260821T193306Z/r07j-post-release-qa.json`,
payload SHA-256
`231fe851ffe2b4037c63cf5165bbc0670705388ccaee51b732d080cc3548be8f`.
It accepts supported, fail-closed surface architecture only; it does not open
or commission the shaft, an exterior door, lift, smoke control, power,
drainage, or a route beyond the retained R09 hold. The independent QA made no
live call and no world mutation.

Reproduce offline:

```bash
node scripts/compile_combined_zones_r07j_b07_supported_surface_headhouse.mjs
npx vitest run test/build/combinedZonesR07JB07SupportedSurfaceHeadhouse.test.ts
npx vitest run test/build/qaCombinedZonesR07JB07SupportedSurfaceHeadhousePostRelease.test.ts
npm run build
```
