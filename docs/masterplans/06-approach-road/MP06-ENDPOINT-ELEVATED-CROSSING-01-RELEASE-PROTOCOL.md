# MP06 endpoint elevated crossing 01 — guarded release protocol

**Current state:** this protocol was used by the accepted bounded release
recorded in [MP06 Endpoint Elevated Crossing 01](MP06-ENDPOINT-ELEVATED-CROSSING-01-RELEASE.md).
It remains a reusable fail-closed procedure, not standing release authority,
and does not complete MP06.

The compiler hard-binds the 117-cell deck at `x=-264..-252`, `y=71`,
`z=-501..-493`, protects all 351 lower-road cells at `y=68..70`, and requires
an exact accepted contract before it can emit a package. The earlier 149-cell
proposal is a design baseline, not a permission to substitute or silently
reduce its edge treatment. The accepted contract may choose a different finite
edge/lighting treatment only if it is explicit, hash-bound, and passes the
compiler; the compiler never invents it from the source snapshot.

## Preconditions

1. Publish an `ACCEPTED_EXACT_3D_BRIDGE_CONTRACT` with contract ID
   `MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT`, two named owner
   approvals, `mutationAuthorityGranted: false`, and source fields bound to
   the fresh immutable capture below.
2. Bind all forward cells and source/target states in `operationBinding.cells`,
   bind the exact ownership cell set, cap interfaces, full 351-cell lower
   clearway, dry/no-waterlogged/no-discharge invariant, zero-cell support
   invariant, and exact one-for-one rollback.
3. Include strict forward and reverse elevated/lower normal-walk paths in the
   compiler contract. The post verifier independently requires 105 elevated
   stations, 98 directed upper endpoint pairs, 117 lower stations, retained
   cap states, and lower floor/headroom preservation.

## Fresh source and static package

Choose a new unique UTC release token, then capture and intake-audit a frozen
save. Do not reuse the MP07 design snapshot as execution evidence.

```bash
MP06_RELEASE=20260826TNNNNNNZ
python3 scripts/capture_combined_zones_complete_save.py --execute \
  --dest data/worldsnap-mp06-endpoint-elevated-crossing-source-${MP06_RELEASE}
node scripts/audit_combined_zones_complete_save.mjs \
  --world-root data/worldsnap-mp06-endpoint-elevated-crossing-source-${MP06_RELEASE} \
  --out data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/source-intake-audit.json \
  --markdown data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/source-intake-audit.md \
  --generated-at <fresh-utc>
node scripts/compile_mp06_endpoint_elevated_crossing_01.mjs \
  --snapshot data/worldsnap-mp06-endpoint-elevated-crossing-source-${MP06_RELEASE} \
  --contract data/world-review/mp06-endpoint-elevated-crossing-contract-${MP06_RELEASE}/accepted-contract.json \
  --out-dir data/buildops \
  --basename mp06-endpoint-elevated-crossing-01-live-${MP06_RELEASE} \
  --generated-at <fresh-utc>
```

The accepted contract must be generated/reviewed against this exact fresh
source. If capture identity, world state, operation set, or owner acceptance
drifts, stop and start a new release token.

## Offline guards and immediate live gates

Set `MP06_OPS` to the generated forward file and `MP06_ROLLBACK` to its inverse.
Every command below must produce the named evidence file with zero failures and
zero strict no-ops.

```bash
python3 scripts/rcon_runner.py ${MP06_OPS} --dry-run --strict-noop \
  --operation-role forward \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/forward-strict-dry-run.json
python3 scripts/rcon_runner.py ${MP06_ROLLBACK} --dry-run --strict-noop \
  --operation-role rollback \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/rollback-strict-dry-run.json
node scripts/preflight_guarded_ops.mjs ${MP06_OPS} \
  --regions data/worldsnap-mp06-endpoint-elevated-crossing-source-${MP06_RELEASE}/region \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/forward-source-preflight.json
node scripts/preflight_guarded_ops.mjs ${MP06_ROLLBACK} \
  --regions data/worldsnap-mp06-endpoint-elevated-crossing-source-${MP06_RELEASE}/region \
  --source-overlay-ops ${MP06_OPS} \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/rollback-projected-preflight.json
python3 scripts/redevelopment_live_entity_gate.py --ops ${MP06_OPS} --capture-blocker-nbt \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/live-entity-clearance-pre-execution.json
python3 scripts/redevelopment_live_entity_gate.py --ops ${MP06_OPS} --capture-blocker-nbt \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/live-entity-clearance-immediate.json
```

Only the second entity clearance may immediately precede mutation. Any blocker,
fluid/container/entity intersection, stale source, failure, or no-op ends this
release attempt without an execution.

## Execution, post state, and seal

```bash
python3 scripts/rcon_runner.py ${MP06_OPS} --strict-noop --operation-role forward \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/forward-execution.json \
  --stream-journal data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/forward-stream-journal.jsonl
python3 scripts/capture_combined_zones_complete_save.py --execute \
  --dest data/worldsnap-mp06-endpoint-elevated-crossing-post-${MP06_RELEASE}
node scripts/audit_combined_zones_complete_save.mjs \
  --world-root data/worldsnap-mp06-endpoint-elevated-crossing-post-${MP06_RELEASE} \
  --out data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/post-intake-audit.json \
  --markdown data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/post-intake-audit.md \
  --generated-at <fresh-utc>
node scripts/preflight_guarded_ops.mjs ${MP06_ROLLBACK} \
  --regions data/worldsnap-mp06-endpoint-elevated-crossing-post-${MP06_RELEASE}/region \
  --report data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/rollback-poststate-preflight.json
node scripts/qa_mp06_endpoint_elevated_crossing_independent_post.mjs \
  --post data/worldsnap-mp06-endpoint-elevated-crossing-post-${MP06_RELEASE} \
  --manifest data/buildops/mp06-endpoint-elevated-crossing-01-live-${MP06_RELEASE}.release-manifest.json \
  --contract data/world-review/mp06-endpoint-elevated-crossing-contract-${MP06_RELEASE}/accepted-contract.json \
  --out-json data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/independent-post-qa.json \
  --out-md data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/independent-post-qa.md
node scripts/finalize_mp06_endpoint_elevated_crossing_01.mjs \
  --evidence data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE} \
  --source data/worldsnap-mp06-endpoint-elevated-crossing-source-${MP06_RELEASE} \
  --post data/worldsnap-mp06-endpoint-elevated-crossing-post-${MP06_RELEASE} \
  --forward ${MP06_OPS} \
  --rollback ${MP06_ROLLBACK} \
  --manifest data/buildops/mp06-endpoint-elevated-crossing-01-live-${MP06_RELEASE}.release-manifest.json \
  --contract data/world-review/mp06-endpoint-elevated-crossing-contract-${MP06_RELEASE}/accepted-contract.json \
  --qa data/world-review/mp06-endpoint-elevated-crossing-live-${MP06_RELEASE}/independent-post-qa.json
```

The finalizer refuses incomplete evidence, stale/rewritten static compiler
provenance, non-exact inverses, non-130-member capture audits, any parser or
preflight drift, missing journal, or a failing independent two-level QA. Its
ledger is the only artifact that may record this bounded bridge as executed,
post-state verified, and reversible.
