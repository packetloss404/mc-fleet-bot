# MP12 / MP13 Gatehead–Venue acceptance signature 01

This is the finite, source-bound **I01 Gatehead → East Arrival → venue
receiver** interface gate. It is design input only: no build operation, RCON
call, route opening, public commissioning, event readiness claim, or world
edit is created.

![I01 acceptance boundary](../../../data/world-review/mp12-mp13-gatehead-venue-acceptance-signature-01-sys03-post-20260826T153100Z/mp12-mp13-gatehead-venue-acceptance-map-01.svg)

The signature template inventories the exact support, feet, and head cells for
the current `gatehead-to-east-arrival` and `east-arrival-to-bowl` traces, all
their directed faces, and all **75 protected Gatehead façade cells**. The
façade is always `X0`, District-owned retained fabric: it cannot be a target,
an interaction halo, or a route-envelope cell.

The required independent signers are the MP12 District, MP13 Venue, Western
Approach Road, and Town Expansion Westlight/road roles. Every finite cell gets
one named owner and `P0`, `P1`, or `X0` class; every directed face gets named
from/to/accepting owners plus normal and failure state. A signature also needs
the bidirectional Gatehead/venue return proof, explicit public/staff
separation, and two distinct public egress records that do not use the west
service tower.

The MP13 lower-lobby/staff (`I05`) and west-service-tower (`I06`) ledger is
intentionally separate. It remains default-deny, but does not block this
finite surface threshold merely because it is unrelated geometry.

Generate a fresh default-deny template/map and validate only as a read-only
design check:

```bash
node scripts/compile_mp12_mp13_gatehead_venue_acceptance_signature_01.mjs \
  --template-out docs/masterplans/12-westlight-district/MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-SIGNATURE-01.template.json \
  --map-out data/world-review/mp12-mp13-gatehead-venue-acceptance-signature-01-sys03-post-20260826T153100Z/mp12-mp13-gatehead-venue-acceptance-map-01.svg \
  --signature docs/masterplans/12-westlight-district/MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-SIGNATURE-01.template.json \
  --out data/world-review/mp12-mp13-gatehead-venue-acceptance-signature-01-sys03-post-20260826T153100Z/mp12-mp13-gatehead-venue-acceptance-decision-01.json
```

An accepted decision still expires on source/evidence drift and is only an
input to a separately invoked fresh-source guarded-release compiler.
