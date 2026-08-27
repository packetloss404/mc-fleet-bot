# C01 independent-return feasibility correction

The initial generated feasibility artifact at
`data/world-review/mp11-bkr-c01-finite-independent-return-feasibility-01-cobalt-wl-post-20260826T233000Z/`
used a 27-cell station cube: one floor cell layer and only two clear vertical
cells. It is **not** a valid true-3-wide × 3-high corridor input and must not
be used for a physical package, interface contract, or post-state QA.

The corrected feasibility kernel uses 36 cells per station: a floor plus three
clear vertical cells. Its accepted design input is the fresh output at:

`data/world-review/mp11-bkr-c01-finite-independent-return-feasibility-02-cobalt-wl-post-20260826T233000Z/`

Only the corrected output is referenced by
`MP11-BKR-C01-INDEPENDENT-RETURN-ACCEPTANCE-CONTRACT-01`. Neither artifact
authorizes a physical operation.
