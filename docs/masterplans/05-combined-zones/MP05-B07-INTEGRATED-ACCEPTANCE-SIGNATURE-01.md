# MP05 / B07 integrated acceptance signature

`scripts/compile_mp05_b07_integrated_acceptance_signature.mjs` is the fail-closed handoff between the source-bound B07 vertical contract and any later guarded release compiler. It produces a design-input decision only. It does not create an operation, make an RCON call, or authorize a build.

The supplied signature must bind the current MP03/B07 contract identity, all six exact B07 boundary seams, six named roles, fluid containment/receiver/freeboard/overflow evidence, the exact gravity-exposure set with permanent support and ordered rollback, R09J and R07J cap protections, both directed receivers, and source-bound forward, rollback, and normal-walk/egress manifests.

```bash
node scripts/compile_mp05_b07_integrated_acceptance_signature.mjs \
  --signature <filled-signature.json> \
  --out <new-decision.json>
```

An `ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY` result means only that the submitted design evidence is internally complete against the bound source. A fresh immutable source, full safety kernel, and a separately authorized integrated release compiler are still mandatory before any world mutation.
