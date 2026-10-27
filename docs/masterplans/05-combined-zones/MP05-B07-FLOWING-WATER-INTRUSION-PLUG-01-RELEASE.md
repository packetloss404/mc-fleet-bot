# MP05 B07 flowing-water intrusion plug 01

Status: **COMPILED / OFFLINE VERIFIED / AWAITING FRESH GUARDED EXECUTION**

This is the first Governor-authorized B07 containment correction. It is a
five-cell permanent `minecraft:deepslate_tiles` liner at
`x=2110..2111, y=5..6, z=-396..-395`, applied only to the flowing-water cells
already inside the B07-C-WEST-2 construction reservation.

It is deliberately a containment function, not a substitute for B07 route,
headhouse, or SYS-02 commissioning. The adjacent exterior water component is
retained outside the liner; five direct interaction-halo fluid cells document
that boundary. The package does not touch gravity, the R09J cap, R07J
headhouse, any route cell, or an exterior receiver.

## Bound release

- [Manifest](../../../data/buildops/mp05-b07-flowing-water-intrusion-plug-01.release-manifest.json)
- [Forward operation](../../../data/buildops/mp05-b07-flowing-water-intrusion-plug-01.liner.forward.txt)
- [Exact inverse](../../../data/buildops/mp05-b07-flowing-water-intrusion-plug-01.liner.rollback.txt)
- [Governor scoped authorization](mp05-b07-flowing-water-intrusion-plug-governor-standing-execution-authorization.json)
- [Independent post-release QA](../../../scripts/qa_mp05_b07_flowing_water_intrusion_plug_01_post_release.mjs)

The historic complete source preflight and projected rollback both pass `5/5`.
Both operation files pass the strict parser with five exact guarded commands.
Those are compilation evidence only; they are not a live release.

## Fresh guarded execution command

Use fresh, unused source/post destinations. The scoped runner will capture the
source itself, do not prepopulate either directory.

```bash
node scripts/run_combined_zones_scoped_release.mjs \
  --manifest data/buildops/mp05-b07-flowing-water-intrusion-plug-01.release-manifest.json \
  --release-node CZ-MP05-B07-FLOWING-WATER-INTRUSION-PLUG \
  --authorization docs/masterplans/05-combined-zones/mp05-b07-flowing-water-intrusion-plug-governor-standing-execution-authorization.json \
  --execute \
  --source-snapshot-root data/worldsnap-mp05-b07-flowing-water-plug-source-<UTC> \
  --post-snapshot-root data/worldsnap-mp05-b07-flowing-water-plug-post-<UTC> \
  --out-dir data/world-review/mp05-b07-flowing-water-plug-live-<UTC>
```

Immediately after the guarded runner reports
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`, independently run:

```bash
node scripts/qa_mp05_b07_flowing_water_intrusion_plug_01_post_release.mjs \
  --ledger data/world-review/mp05-b07-flowing-water-plug-live-<UTC>/evidence-ledger.json \
  --out data/world-review/mp05-b07-flowing-water-plug-live-<UTC>/post-release-qa.json
```

Only a successful independent QA establishes the as-built containment claim.
