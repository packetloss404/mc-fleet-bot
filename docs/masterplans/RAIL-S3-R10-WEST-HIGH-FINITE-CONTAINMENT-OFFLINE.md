# SYS03 R10 West High finite containment 01 — offline package

**Status:** `COMPILED_OFFLINE_FINITE_WATER_AND_GRAVITY_CONTAINMENT_AWAITING_FRESH_KERNEL`  
**This is not an executed release.** It opens no corridor, rail, public route, service route, or passenger service.

The latest complete immutable post-state proves that the West High frontier is
a finite treatment problem rather than an unbounded-water hold:

| Exact treatment set | Current result | Permanent target |
| --- | ---: | --- |
| Water/bubble component | 2,525 cells; `220cf041…31271e`; no fluid-bearing exterior-halo cells | Polished deepslate, zero discharge |
| Scoped gravity targets | 92 cells; `97361427…c886fa`; every current chain has a non-air/non-fluid terminal | Polished deepslate foundation lock |
| Union | 2,617 cells; `f6b1725f…0b767e0` | Sealed, non-flowing containment mass |

The component is `x=-231..-176`, `y=46..62`, `z=-501..-442`. It has 2,513
water sources and 12 bubble-column cells. Its 2,076-cell immediate exterior
halo is non-fluid. The package therefore has a finite no-outfall terminal:
every observed fluid cell is replaced by a permanent solid cell; it neither
retains a liquid receiver nor diverts water to an uncontrolled discharge.

## Ordered package and inverse

1. Lock the 92 gravity cells bottom-up as polished deepslate.
2. Plug the complete fluid component low-to-high as polished deepslate.
3. Rollback is the exact reverse: restore the fully bounded water/bubble
   volume while the gravity locks remain, then restore the original gravity
   cells. No rollback stage opens a void beneath an unbounded or external
   fluid component.

The static source preflights pass `92/92` and `2,525/2,525`; projected
rollback preflights also pass `92/92` and `2,525/2,525`. Both forward and
rollback files pass strict parser checks. These are offline results, not
permission to mutate the world.

- [Manifest](../../data/buildops/sys03-west-high-finite-containment-01.release-manifest.json)
- [Source plan at Y=47](../../data/buildops/sys03-west-high-finite-containment-01.plan-y47.svg)
- [Offline preflight bundle](../../data/world-review/sys03-west-high-finite-containment-offline-20260827T020000Z/)

Before any execution, the implementation team must take a fresh complete
immutable source snapshot, recompile this exact full component, re-run
protected-core/block-entity and live-entity gates, strict source and rollback
preflights, journal the ordered run, capture a fresh post snapshot, and prove
zero fluid in all 2,617 operated cells plus all 92 gravity locks. Any source
drift, new fluid halo contact, entity, or non-finite component fails closed.

## Source-rebound guarded preparation

The source-bound compiler is wrapper-compatible and is intentionally never
promoted using the historical package alone. Use the preparation wrapper with
one new immutable capture destination and new package/evidence destinations:

```bash
node scripts/prepare_sys03_west_high_finite_containment_release.mjs \
  --capture-source-dest data/worldsnap-sys03-west-high-containment-source-<UTC> \
  --package-dir data/buildops/sys03-west-high-containment-rebind-<UTC> \
  --out-dir data/world-review/sys03-west-high-containment-prepare-<UTC>
```

It captures the source without any block operation, recompiles all four exact
operation files from that capture, checks that the manifest capture ID equals
the fresh capture ID, and invokes the generic scoped runner in
`PREPARE_ONLY`. That runs immutable-source intake, source and projected
rollback preflights, strict parser checks, protected-core/block-entity review,
and a fresh live-entity clearance. The wrapper rejects `--execute`; this keeps
the capture/rebind reconciliation distinct from later guarded execution.

The standing scoped authorization is
[here](05-combined-zones/sys03-west-high-finite-containment-governor-standing-execution-authorization.json).
After a separately journaled guarded run, use
`scripts/qa_sys03_west_high_finite_containment_01_post_release.mjs` against
the fresh immutable post snapshot. Its projected mode is regression-only;
only `PASS_EXECUTED_SYS03_WEST_HIGH_FINITE_CONTAINMENT_QA` counts as post-state
evidence.

The separate atomic executor is
`scripts/run_sys03_west_high_finite_containment_atomic_release.mjs`. Its
tested default is `PREPARE_ONLY`; its `--execute` path is the only one that can
mutate the world. That path captures the source, recompiles and capture-ID
binds the package, runs the generic preparation kernel, performs same-moment
entity checks before each strict stage, captures/audits the post state, proves
both rollback stages against it, and then runs independent QA. Its future
invocation requires fresh, nonexistent destinations:

```bash
node scripts/run_sys03_west_high_finite_containment_atomic_release.mjs \
  --execute \
  --source-snapshot-root data/worldsnap-sys03-west-high-containment-source-<UTC> \
  --post-snapshot-root data/worldsnap-sys03-west-high-containment-post-<UTC> \
  --package-dir data/buildops/sys03-west-high-containment-<UTC> \
  --out-dir data/world-review/sys03-west-high-containment-live-<UTC>
```
