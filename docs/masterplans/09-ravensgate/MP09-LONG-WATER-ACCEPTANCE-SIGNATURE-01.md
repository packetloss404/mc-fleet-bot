# MP09 Long Water acceptance signature 01

This is the fail-closed design-input gate for the one remaining Ravensgate
surface alignment. It cannot authorize a Minecraft build, RCON call, water
change, deck, landing, public route, or service opening.

![Long Water source-bound acceptance map](../../data/world-review/mp09-long-water-hydrology-ownership-grade-acceptance-contract-01-mp06-post-20260826T143902Z/mp09-long-water-hydrology-ownership-grade-acceptance-map.svg)

The governing source-bound contract records the exact current condition: a
196-cell reviewed deck band, 21 north-tie-in headroom failures, 186 source-water
cells, a 593-cell immediate fluid halo, and a 1,469-cell component still open
at both surveyed vertical faces. The signature is deliberately not a way to
ignore those facts.

Start with [the signature template](MP09-LONG-WATER-ACCEPTANCE-SIGNATURE-01.template.json).
It needs five distinct named owners: containment, water displacement,
receiver/overflow, north grade, and Tempietto landing. Every one of the five
known interfaces must carry an exact finite coordinate set plus source, target,
and rollback state hashes.

The completed signature must prove all of the following against that same
immutable source:

1. A complete six-neighbour census and a finite closed basin or exact controlled
   outlets; closed containment and receiver/overflow acceptance precede any
   water displacement.
2. Every one of the 186 water seeds has canonical forward, target, and rollback
   states and exact inverse evidence.
3. The north-to-Tempietto route is supported, two-wide, two-clear, one-step or
   less, no-jump, and verified in both directions between the exact anchors.
4. Forward and rollback manifests bind the same finite cell set and inverse
   proof, with the hydraulic order containment → water → grade/deck/landing.

Run the validator read-only:

```bash
node scripts/compile_mp09_long_water_acceptance_signature_01.mjs \
  --contract data/world-review/mp09-long-water-hydrology-ownership-grade-acceptance-contract-01-mp06-post-20260826T143902Z/mp09-long-water-hydrology-ownership-grade-acceptance-contract.json \
  --signature <completed-signature.json> \
  --out <decision.json>
```

`ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY` is not a build package. A
separate fresh-source compiler and the complete guarded-release kernel remain
mandatory before any physical work.
