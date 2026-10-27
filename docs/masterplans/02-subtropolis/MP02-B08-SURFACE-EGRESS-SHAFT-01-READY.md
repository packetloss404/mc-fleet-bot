# MP02 B08 surface egress shaft 01 — static release readiness

**Release:** `MP02-B08-SURFACE-EGRESS-SHAFT-01`  
**State:** `STATIC_READY_FROM_FRESH_POST_SOURCE_AWAITING_FRESH_LIVE_KERNEL`  
**Not executed:** this record authorizes no mutation by itself.

## Functional delta

The raw B08 continuation has only the accepted B08 return. This finite package
adds a backed ladder shaft from `[2008,129,-748]` to a supported west surface
discharge at `[2005,208,-748]`. It therefore gives the restricted B08 spine a
second, independently directed discharge while leaving the B03 aperture and
B09 protected rail envelope untouched.

It is not a B03/B09 opening, rail action, public opening, chamber completion,
or a claim that MP02 is complete.

## Source-bound static package

- Immutable complete source: `data/worldsnap-mp10-rrch-library-parapet-post-20260826T195000Z`
- Rebound manifest: `data/world-review/mp02-b08-surface-egress-shaft-01-prepared-20260826T195000Z/rebound-buildops/mp02-b08-surface-egress-shaft-01.release-manifest.json`
- Exact target: 495 cells, `x=2005..2009`, `y=129..212`, `z=-749..-747`.
- Exact forward/rollback: 495 unit operations each; rollback is the exact
  reverse inverse.
- Surface treatment: a three-wide supported west terrace descent and collar;
  not an unbounded excavation or uncontained fluid path.
- Ladder backing: 76 retained/installed solid cells at `x=2007, z=-748,
  y=135..210`.
- Two-cell halo: 3,322 cells, with zero water/lava/gravity hazards, zero
  stored block-entity interaction, and zero saved-entity interaction in the
  frozen source.
- Scope exclusion: target maximum `x=2009`, 39 blocks west of the B03 aperture
  at `x=2049`; B09 begins at `x=2048`. Neither is an operation target.

The static compiler passed both directed return/discharge pairs in both
directions (4/4): B08 return anchor to surface discharge and shaft bottom to
surface discharge.

## Guarded release only

Prepare-only verification passed fresh compiler rebind, source and projected
rollback preflights, block-entity clearance, and strict forward/rollback
parser checks. Physical execution remains conditional on a new immediate
complete save, live entity clearance, strict journaled execution, fresh post
save, rollback-poststate preflight, and the independent immutable-post QA.

```bash
node scripts/run_mp02_b08_surface_egress_shaft_release.mjs \
  --execute \
  --source-snapshot-root data/worldsnap-mp02-b08-egress-source-<utc> \
  --post-snapshot-root data/worldsnap-mp02-b08-egress-post-<utc> \
  --out-dir data/world-review/mp02-b08-surface-egress-shaft-01-live-<utc>

node scripts/qa_mp02_b08_surface_egress_shaft_01_post_release.mjs \
  --regions data/worldsnap-mp02-b08-egress-post-<utc>/region \
  --manifest data/world-review/mp02-b08-surface-egress-shaft-01-live-<utc>/rebound-buildops/mp02-b08-surface-egress-shaft-01.release-manifest.json \
  --out data/world-review/mp02-b08-surface-egress-shaft-01-live-<utc>/independent-post-qa.json
```
