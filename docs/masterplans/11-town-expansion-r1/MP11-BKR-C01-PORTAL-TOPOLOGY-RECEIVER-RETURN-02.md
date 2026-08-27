# MP11 / BKR C01 portal topology, receiver, and return inventory 02

Status: **source-bound prerequisite inventory — no physical operation**

This read-only gate is the required first stage before a C01 portal gravity
liner or separated dry bypass. It uses the latest complete immutable source to
inventory all portal gravity components, current fluid/receiver state, portal
block entities, and currently evidenced portal returns.

```bash
node scripts/design_mp11_bkr_c01_portal_topology_receiver_return_02.mjs \
  --snapshot data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z \
  --survey data/world-review/bkr-survey-01-cobalt-wl-post-20260826T233000Z/bkr-survey-00.json \
  --out data/world-review/mp11-bkr-c01-portal-topology-receiver-return-02-cobalt-wl-post-20260826T233000Z
```

The portal study contains no container block entities or fluid cells, so a
future portal-only scope can avoid container migration. It still cannot be
compiled: gravity components touch the current study boundary and the source
proves only one portal-to-L1 return. No receiver, overflow, or drainage route
may be invented while the source is dry.
