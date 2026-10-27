# MP10 library perimeter / annex bilateral acceptance signature

This is a fail-closed, source-bound design-input gate for `CIRC-RRCH-LIB-02`.
It cannot authorize a Minecraft build, RCON, route opening, public access,
service operation, or the MP10 civic programme.

The current governing survey has zero compliant 3×3 landings in the seven-by-seven
stair core, 72 protected library fixtures, and a default-deny Library/Loggia
seam. Start with [the signature template](MP10-RRCH-LIBRARY-PERIMETER-ANNEX-ACCEPTANCE-SIGNATURE-01.template.json).

The completed signature must bind all of the following to that one immutable
source: three distinct owners; exact target and interaction-halo hashes;
complete canonical forward/rollback states; every protected fixture retained
or exactly migrated with no loss or duplicate; bilateral Library/Loggia seam
and rollback ownership acceptance; five 3×3/two-clear landing commitments;
and named bidirectional no-jump return anchors.

Run it read-only:

```bash
node scripts/compile_mp10_rrch_library_perimeter_annex_acceptance_signature_01.mjs \
  --contract data/world-review/mp10-rrch-library-perimeter-annex-contract-02-mp01-anvil-post-20260826T163300Z/mp10-rrch-library-perimeter-annex-acceptance-contract-02.json \
  --signature <completed-signature.json> \
  --out <decision.json>
```

`ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY` is still not a build package. A
later compiler must first renew the binding against a fresh complete source and
then pass the full guarded-release kernel.
