# RAIL-S3-R10 · upper roof-pocket retention-03

**Status:** AS-BUILT CIVIL CONTAINMENT ONLY

The isolated upper R10 roof pocket has a verified containment release. It is
not a running tube, service corridor, railway, route, or passenger-service
release.

## Accepted physical scope

- 82 exact polished-deepslate shell cells;
- five source-water cells transferred to the designated retention chamber;
- five original roof-pocket cells lined with polished deepslate;
- 13 unused chamber reserve cells preserved;
- one pre-existing, disconnected water cell at `(-66,39,-466)` explicitly
  preserved unchanged. It is not part of the five-cell transferred component.

Retention-02 was fully compensated after the initial QA incorrectly treated
that existing water cell as introduced water. A fresh source and fully
recompiled retention-03 bound that residual coordinate, then completed the
entire guarded kernel. Retention-02 is not an accepted as-built release.

## Evidence

Source complete save:
`data/worldsnap-rail-r10-roof-retention3-source-20260826T052126Z`
(`fd1805ed6364602335ea2a8562c8ca562776f1e5daaa3e3691f9ca73cbd4b74d`).

Post complete save:
`data/worldsnap-rail-r10-roof-retention3-post-20260826T052300Z`
(`f9bc3e6b099ddcf94316b87ccbf7199a2dadb4d35b935f07f9dca7d429785a6f`).

The evidence directory
`data/world-review/rail-r10-roof-retention3-live-20260826T052126Z/` contains:

- immutable source/post intake audits;
- source and projected rollback preflights for shell (82), transfer (5), and
  liner (5);
- strict forward/rollback parser reports, block-entity clearance, all-scope
  and same-moment live-entity clearances, plus strict execution journals;
- independent `post-qa.json`: 82/82 shell, 5/5 retained water, 5/5 liner,
  13/13 reserve preserved, zero non-target halo drift, zero introduced water,
  and the one pre-existing water cell unchanged;
- sequential post-state rollback preflights: liner 5/5, transfer 5/5, shell
  82/82.

The recovery provenance record is
`data/world-review/rail-r10-roof-retention-live-20260826T051418Z/recovery-fluid-provenance.json`.
It proves six source fluids in the review volume as two disconnected
components (five plus one) and zero drift after compensation.

## Explicit boundary

The dry R09-to-upper ramp remains a separate offline candidate. The open-basin
R10 normal-elevation service/tube scope remains held. This release installs no
rail, trackbed, power, signalling, vehicle, platform, route, or passenger
operation.
