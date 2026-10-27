# MP11 / BKR C01 independent-return acceptance contract 01

Status: **design contract complete; exact physical post-state mapping required**

The corrected true-3-wide × 3-high feasibility binds a 105-station route and
1,434 canonical source cells. This contract fixes portal/L1 interface points,
forward route order, and exact inverse route order without issuing block
operations.

```bash
node scripts/design_mp11_bkr_c01_independent_return_acceptance_contract_01.mjs \
  --feasibility data/world-review/mp11-bkr-c01-finite-independent-return-feasibility-02-cobalt-wl-post-20260826T233000Z/mp11-bkr-c01-finite-independent-return-feasibility-01.json \
  --out data/world-review/mp11-bkr-c01-independent-return-acceptance-contract-01-cobalt-wl-post-20260826T233000Z
```

It is not self-contained as a physical release: a dedicated route compiler must
first define canonical stepped floor, tread, landing, wall, ceiling, and
interface target states, then prove exact rollback and the complete post-state
route contract.
