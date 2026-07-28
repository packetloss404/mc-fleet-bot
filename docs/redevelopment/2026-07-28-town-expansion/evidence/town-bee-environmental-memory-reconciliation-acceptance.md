# Bee environmental-memory reconciliation acceptance

Status: `CONDITIONAL_ACCEPTANCE_CONTRACT — EVIDENCE RECORD REQUIRED`

Scope: the failed/compensated `clearance2b` move for
`minecraft:bee` UUID-int-array
`1756132036,-1677505675,-1434477177,1286552243`. This contract does
not authorize construction or final world release.

## Independent classification

`hive_pos`/`HivePos` and `flower_pos`/`FlowerPos` are environmental
navigation memories. They are not entity identity: identity is the exact
entity type plus four-int UUID. They may change or disappear as bee AI
revalidates nearby world state.

The fields are not equally disposable:

- `flower_pos` is volatile navigation state and may be accepted as absent or
  changed after a verified rollback.
- `hive_pos` is environmental rather than identity state, but it is
  behaviorally significant because it records the bee's remembered home.
  Treat it as **reconcilable semantic state**, not as an ordinary tick counter
  and not as an unexplained ignored mismatch.

## Required reconciliation evidence

A row may be reclassified from `rollback-failed` to
`rolled-back-with-environmental-memory-reconciliation` only when one immutable
JSON record, bound by SHA-256 to the manifest and original journal, proves all
of the following:

1. Exact type plus four-int UUID resolves to exactly one entity.
2. Exact source `Pos` and `Rotation` are restored.
3. Every captured projection field and vehicle/passenger relationship is
   identical except the explicit four-name whitelist
   `hive_pos`, `HivePos`, `flower_pos`, and `FlowerPos`.
4. The record includes a path-by-path before/after diff. No wildcard,
   prefix-based, or unspecified NBT difference is accepted.
5. No temporary rail, temporary force-load, passenger, vehicle, leash, or
   duplicate-entity residue remains.
6. For a missing or changed `hive_pos`, one of these two mutually exclusive
   resolutions is recorded:
   - **restore-and-verify:** restore the exact remembered hive coordinate and
     requery the same UUID; or
   - **semantic waiver:** verify the referenced hive block still exists,
     remains outside the construction targets, and explicitly accept that AI
     may reacquire or select a hive naturally.
7. The reconciliation writer uses durable create/replace semantics and fsyncs
   both file and containing directory. The transaction journal references the
   reconciliation path and SHA rather than silently changing the terminal
   state.

## Current clearance2b observation

- Source position:
  `[805.5,73.19999998807907,-578.6000000059605]`
- Source rotation: `[0.0,0.0]`
- Before environmental memory:
  `hive_pos=[I;805,73,-580]`
- Observed post-rollback difference: the lowercase `hive_pos` path is absent;
  the supplied comparison reports no other NBT, relation, position, or
  rotation difference.
- An offline scan of
  `data/buildops/town-expansion-r1-2026-07-28.txt` found zero `SET`/`REPL`
  target boxes containing `[805,73,-580]`.

That evidence is consistent with an environmental-memory-only reconciliation,
but a journal state edited to `rolled-back` is not independently sufficient.
The bound reconciliation record above is still required. This finding cannot
remove the independent Egg blockers or authorize the Town Expansion world
release.
