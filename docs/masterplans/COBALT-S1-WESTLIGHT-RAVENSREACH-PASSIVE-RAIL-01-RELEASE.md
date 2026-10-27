# Cobalt S1 Westlight–Ravensreach Passive Rail 01

**Status:** as-built, post-verified, and reversible — passive foundation only.

On 2026-08-26 the guarded scoped-release kernel placed 36 unpowered
east-west rail cells in two existing Westlight approach tubes:

- North slice: `x=-254..-237, y=13, z=-461`
- South slice: `x=-254..-237, y=13, z=-455`

The release used a fresh complete source and post capture, block-entity and
live-entity clearance, strict no-op parsing and source preflight, journaled
`36/36` execution, and exact rollback-poststate preflight. Independent QA
confirms 36 exact supports, 108 clear headroom cells, 288 liner cells, and the
retained 32-cell polished-deepslate diaphragm at `x=-236`. Its complete
500-cell interaction set has no fluid, gravity, or protected-core drift.

Evidence:

- [Scoped execution ledger](../../data/world-review/cobalt-s1-passive-rail-live-20260826T183111Z/evidence-ledger.json)
- [Independent post-release QA](../../data/world-review/cobalt-s1-passive-rail-live-20260826T183111Z/post-release-qa.json)
- [Compiled manifest](../../data/buildops/cobalt-s1-westlight-ravensreach-passive-rail-01.release-manifest.json)

This does **not** commission power, signalling, vehicles, a route, public
access, or passenger service. Those are separate functional scopes; the
retained diaphragm must remain in place until an independently guarded
connection package is accepted.
