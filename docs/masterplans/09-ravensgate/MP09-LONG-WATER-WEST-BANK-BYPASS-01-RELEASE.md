# MP09 Long Water west-bank bypass 01 — as-built release

Status: `PASS_EXECUTED_DRY_WEST_BANK_BYPASS_RETAINS_SEALED_LONG_WATER_COMPONENT`.

The guarded release changed exactly 274 cells to `minecraft:polished_andesite`
in `x=-105..-80`, `y=67..69`, `z=-556..-456`.  The fresh kernel ledger is
[`fresh-kernel-ledger.json`](../../../data/world-review/mp09-long-water-west-bank-live-20260826T183700Z/fresh-kernel-ledger.json);
the independent post-release result is
[`post-release-qa.json`](../../../data/world-review/mp09-long-water-west-bank-live-20260826T183700Z/post-release-qa.json).

Independent post QA re-opened the immutable source and post snapshots. It
proved the exact forward target set, exact reverse rollback, a normal-walk
two-wide connection from the Stoa west-bank anchors to the Tempietto anchors,
two clear headroom cells, and no fluid, protected block, block entity, or
saved entity in the 814-cell route interaction set.

Long Water was intentionally retained. Its finite six-neighbour component is
unchanged from source to post: 1,477 cells, `x=-92..-78`, `y=61..71`,
`z=-550..-454`, with no census-boundary contact. No water was drained,
displaced, lined, capped, or rerouted.

This records only the bounded dry west-bank bypass. It does not commission a
public route or any unrelated Ravensgate scope.
