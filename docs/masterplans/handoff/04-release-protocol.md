# MiniMax M3 guarded construction and documentation protocol

This is the mandatory handoff protocol for any future world mutation.  It is
deliberately narrow: the owner authorized accelerated construction, not
unbounded edits or invented topology.

## A package is ready only when all of these exist

1. A **fresh, immutable complete source snapshot** that covers every source,
   target, retained, halo, protected and rollback cell.
2. Canonical source and target block states (including block entity/NBT state
   where applicable), exact coordinates, an owner, an access class, and the
   complete interaction boundary.
3. Forward and rollback files that are an exact ordered inverse.  Do not
   rewrite old files to fit natural drift or an unexpected post state.
4. Exact treatment of containers, block entities, protected fabric, fluids,
   gravity, and live/saved entities.  Unknown state is a hard stop for only the
   affected cells.
5. Functional acceptance: normal-walk/return/egress, receiver, containment,
   rail service, or other behaviour appropriate to the package.  A block count
   alone is not a function proof.
6. Strict parser, source preflight, and projected rollback preflight results.

## Execute and prove it

Use the guarded runner; do not replace it with an ad-hoc RCON command:

```bash
python3 scripts/rcon_runner.py <forward-operation.txt> \
  --strict-noop --report <forward-report.json>
```

Immediately record the journal, capture the post snapshot, rebind all maps and
QA to that post identity, run independent QA, and run the rollback preflight
against the post snapshot.  The usual closeout order is:

```text
fresh source → compile target + inverse → source preflight → entity clearance
→ strict execution → immutable post → independent QA → rollback-post preflight
→ current-state / completion-register / visual update
```

If source preflight yields a strict no-op because the source drifted, that is a
failure: inspect and recompile from the fresh source.  Never treat it as a
successful release.

## Route and public-realm standards

- Primary public concourse/exit/common-room routes: 5 clear wide × 5 clear
  high, no steeper than 1 rise per 2 run, five-deep level landings at ends and
  turns.
- Local public connectors: at least 3 clear wide × 3 clear high with level 3×3
  landings; prove bidirectional no-jump walking.
- Staff routes: 3×3 clear at doors.  High-volume venue stairs: 7×6 with 7×7
  landings and a nearby lift analogue.
- Ladders, trapdoors, one-wide stairs, alternating treads, jumps, unsecured
  thresholds, and a centerline-only scan are not primary public circulation.
- Cobalt requires a continuous, solid-wall-separated 6×6 service corridor,
  controlled exits at stations/portals/turnbacks, exit nodes within 128 running
  blocks, and cross-passages no farther than 64 blocks apart before powered
  passenger trials.
- The above-ground rail amendment uses a 23-block module: directional double
  track, five-clear protected walking path, opaque separation wall, and an
  independent six-clear service gallery.  Existing routes stay usable until a
  replacement route is independently proven.

## Required evidence payload at the end of every agent turn

```text
Scope card / package ID:
Fresh source snapshot and immutable identity:
Exact bounds, owner, and access class:
Exact target/retained/halo/protected/entity sets:
Fluid/gravity/container/block-entity finding:
Forward + inverse operation and source preflight paths:
Live entity clearance + strict runner journal:
Post snapshot + independent QA + rollback-post preflight:
What was actually built:
What remains unproven / explicitly excluded:
Next safe action:
```

## Required documentation after an accepted package

1. Update the affected `CURRENT-STATE.md` and its `MASTERPLAN.md` only with
   evidence-backed scope/counts and exclusions.
2. Update the [Completion Register](../MASTER-PLAN-COMPLETION-REGISTER-2026-08-26.md), retaining the parent programme until it is actually built and
   functionally verified.
3. Add an as-built plan/section, screenshot or map manifest, and release note
   that link to the exact source/post ledger.  Do not use a conceptual render
   as as-built proof.
4. Refresh the world catalog / underground-navigation / POI report only when
   their inputs changed, then validate/seal artifacts under their documented
   workflows.
5. Publish to the dashboard only after the local evidence package is sealed;
   label the precise scope limit (for example, "passive rail only").

## Focused regressions already specified by the repository

Run relevant scope tests, then the backend build:

```bash
npm run build
npx vitest run \
  test/build/combinedZonesR08EmptyEightFitout.test.ts \
  test/build/qaCombinedZonesR08EmptyEightFitoutPostRelease.test.ts \
  test/build/qaCombinedZonesR08BEmptyEightPlatform08PostRelease.test.ts
npx vitest run test/build/combinedZonesR08H* test/build/combinedZonesR08J* test/build/combinedZonesR08L* test/build/combinedZonesR08M*
npx vitest run test/build/combinedZonesR10CheyenneSecureGallery.test.ts test/build/qaCombinedZonesR10CheyenneSecureGalleryPostRelease.test.ts
npx vitest run test/build/combinedZonesR12ACheyenneGalleryCommissioning.test.ts
npx vitest run test/build/combinedZonesR12BB09StaticEnclosureReadiness.test.ts
npx vitest run test/build/combinedZonesR12CB09PassiveRailDesignFreeze.test.ts test/build/qaCombinedZonesR12CB09PassiveRailPostRelease.test.ts
```

The current area instructions in `AGENTS.md` are authoritative for the exact
focused filenames and any later additions.  Run only tests applicable to the
selected scope, but do not report a release without its required focused tests
and proportional build verification.
