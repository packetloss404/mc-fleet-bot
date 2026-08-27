# MP11 / BKR C01 finite independent-return feasibility 01

Status: **read-only source-bound feasibility only**

This search tests a new, finite 3×3 conceptual portal-return corridor using
existing source geometry. It excludes the current-route halo, every block
entity halo, fluids/waterlogging, and gravity. It is not an operation plan.

```bash
node scripts/design_mp11_bkr_c01_finite_independent_return_feasibility_01.mjs \
  --out data/world-review/mp11-bkr-c01-finite-independent-return-feasibility-01-cobalt-wl-post-20260826T233000Z
```

A feasible corridor remains only design input. Both endpoint interfaces and
two independent return proofs must be exact and accepted before a separate
physical compiler can be considered.
