# Combined Zones CZ-R07C: B08 cover rollback-recovery rebind

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Recovery manifest identity:** `779bf317b625e085c33673381e6bcbb0bc8b1d6290850c8bb5a6cb763b4d3240`  
**Recovery complete save:** `8fc24683f41d938d58cad06dc2e8b0c83f491ca7cc4f2cc940f66c21b41498bb`  
**Superseded attempt manifest:** `02d8168b758e94e1c3252f5bcf3ae95a41afb96acbcc44a56bf52205fd868ece`  
**Completed release identity:** `4e99735b102bf4aba9485caa34de0c0731e4a7b5af82b2c9dadcddd9e360cb91`

The first live shell attempt correctly stopped at operation line 2,969 when
strict-noop found `minecraft:snow[layers=1]` at `(2009,128,-653)` instead of
the preflighted `minecraft:air`. It completed 2,963 groups, recorded one
failed/no-op group, and stopped before any later group. The compensating
rollback then processed all 5,252 groups with zero failures: 2,963 changed
cells and 2,289 already-source no-ops for operations never reached by the
stopped forward run. The resulting complete same-moment recovery save passed
all 14 intake checks.

The original transaction and failure evidence remain unchanged. This record
adds a new source-bound transaction rather than rewriting that provenance.

## Exact recovery comparison

The compiler compared every one of the 13,185 exact B08 cover/route design
cells between the accepted R07A post save and the rollback-recovery save.
Exactly eight cells changed:

- two cover cells changed from air to one-layer snow:
  `(2009,128,-653)` and `(2011,128,-653)`;
- three route cells changed from air to one-layer snow at `x=1948`, `y=71`,
  `z=-629,-626,-625`;
- three route cells changed from one-layer snow to air at `x=1948`, `y=72`,
  `z=-627,-626,-625`.

The exact eight-cell difference-set SHA-256 is
`fe28c3b64ce7fe2c1c38a76eb61096eb5cc8afc363934dc07e43794de9730d2b`.
There are zero non-snow transitions and no other target or design drift.

The three newly snow-covered route cells overlap the exact accepted R03 B08
clearance target whose desired state was air. Their overlap set is
`57e73520da779b7926d91941d8edc40058b234fae7d3b4a55553c65902ed374d`.
The rebind allows only current one-layer snow at those three points and clears
it back to the already-accepted air state; undeclared prior-release overlap is
zero.

## Current-safe operation identities

- Cover shell: 5,252 operations; 5,237 exact air sources and 15 exact
  one-layer-snow sources.
  - forward: `531e664c901daba901c4b65ba1cfa16f23a86968e6296465b63a5e51b8e6d8b6`
  - rollback: `ff814b6ff84fa57c65d54eee7c70ea62187c9826870dd796f242c27d748aa114`
- Route openings: 28 operations with the same allow-listed source census but
  a current-safe shifted snow target set.
  - forward: `8d36be0d29528e2f4a44a8ad24544a7350482cc23583a6b18f2f1b2c3d231c04`
  - rollback: `99c784e3575bad9542dcdd990406305a5e6ddd25c9f6abaf320096f0acfe38dd`
- Operated union: 5,280 cells,
  `4c1cd124726032c338de14bcce68d83a4f8f17c6de6e794318439df61d9a9944`.

## Artifacts and offline verification

- Manifest:
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json`
- Operation prefix:
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.*`
- Recovery regression:
  `test/build/combinedZonesR07B08ServiceTunnelCoverRecovery.test.ts`
- Manifest QA: **PASS**, two packages, 5,280 unique cells, zero package
  intersections.
- Recovery forward preflights: **5,252/5,252 + 28/28 PASS**.
- Projected reverse-order rollback: **28/28 + 5,252/5,252 PASS**.
- Four strict-noop parser dry-runs: **PASS**, zero WorldEdit leftovers.
- Block-entity audit: **PASS**, zero blocking block entities.
- Compiler isolation: zero protected relic, container, fluid, gravity, saved
  entity halo, or undeclared prior-release intersections.
- Deterministic recovery regression: **6/6 PASS**.

## Successful recovery-bound retry

The retry used a fresh immutable source save with complete-save identity
`350056e1f4f68124e252c2266771ea416d7257bd17e1b20cda094178705b6d66`.
All 24 terminal-ledger stages passed. Strict-noop execution changed all 5,280
groups with zero failures, zero no-ops, and zero unknown replies. The immutable
post save has complete-save identity
`605b8a3f898ac40822036ccb4fe97e7adfaba7b146d13eb3431fb1821b5f6cfa`
and region identity
`81e0a969430134d1d62ec9befd2e74cd38bf517d472c20d22ec72d1cc1233050`.

The read-only post-release QA re-derived the canonical geometry and directly
checked the saved Anvil state. It proves 5,280/5,280 exact operated targets,
5,283/5,283 exact cover states, 7,902/7,902 route and west-entrance air cells,
24/24 west-entrance cells, 20/20 B03 connection cells, and one connected route
component. Rollback preflight passes in the required openings-then-cover order:
28/28 followed by 5,252/5,252 exact guards.

The failed first attempt remains bound by ledger
`c815b59ccb26f688fddab60b82effbeba531a1aaa1ed6b29784a90b3ba63da96`.
Its strict stop, complete compensating rollback, recovery save, and exact
two-snow drift are all incorporated in the accepted QA chain. The successful
retry ledger is
`data/world-review/combined-zones-r07c-retry-live-20260821T162026Z/evidence-ledger.json`
with SHA-256
`5b319623d2dacdcc6c14ad7fb6c8d7c1997224b35f3688cedec433c1da21a42b`.
The QA reports are `r07c-post-release-qa.json` and
`r07c-post-release-qa.md` beside that ledger; QA payload identity is
`ac45ce0082fb5f9a9aba7f9f091f705bae039c52e6e555fda9f2237b8db29bef`.

No live RCON or service mutation was performed by the post-release verifier.
