# MP02 B08 egress lighting 01 — static release readiness

**Release:** `MP02-B08-EGRESS-LIGHTING-01`  
**State:** `STATIC_READY_FROM_FRESH_POST_SOURCE_AWAITING_FRESH_LIVE_KERNEL`

The built B08 second egress creates a 59-block return-to-shaft segment. Its
fresh post source has no fixed light sources along that segment. This finite
functional package places five supported hanging lanterns at a 12-block
cadence: `(2008,134,-700/-712/-724/-736/-744)`.

It changes neither the accepted B08 handoff (`z >= -689`), B03/B09, rail,
control cells, nor the shaft structure. The compiler requires source air,
solid non-hazardous ceiling support, a hazard-free one-cell halo, zero saved
entity/block-entity interaction, exact inverse, and four directed egress
routes. It is not a public opening or chamber completion.

Execute only through the fresh guarded runner and then its immutable-post QA:

```bash
node scripts/run_mp02_b08_egress_lighting_release.mjs --execute \
  --source-snapshot-root data/worldsnap-mp02-b08-light-source-<utc> \
  --post-snapshot-root data/worldsnap-mp02-b08-light-post-<utc> \
  --out-dir data/world-review/mp02-b08-egress-lighting-01-live-<utc>

node scripts/qa_mp02_b08_egress_lighting_01_post_release.mjs \
  --regions data/worldsnap-mp02-b08-light-post-<utc>/region \
  --manifest data/world-review/mp02-b08-egress-lighting-01-live-<utc>/rebound-buildops/mp02-b08-egress-lighting-01.release-manifest.json \
  --out data/world-review/mp02-b08-egress-lighting-01-live-<utc>/post-release-qa.json
```
