# Cross-scope interface contract proposal

**Decision:** `PROPOSED_ZERO_APPROVED_RELEASE_BLOCKING`  
**Machine contract:** [`cross-scope-interface-contract-proposal.json`](cross-scope-interface-contract-proposal.json)  
**Underlying audit:** [`evidence/redevelopment-cross-scope-point-in-time-audit.json`](evidence/redevelopment-cross-scope-point-in-time-audit.json)

This proposal converts cross-scope geometry from an informal last-writer-wins
behavior into a default-deny release contract. It approves **zero** current
interfaces. The underlying counts came from a deliberately stale diagnostic
compile, so the final compiler must regenerate them from a source hash captured
both before and after generation.

An approved interface must name the exact scope direction, source and
destination roles, normalized state transitions, inclusive bounds, cell count,
and SHA-256 of the full sorted cell set. No wildcard, reverse-direction
assumption, sample-only allowance, or count-only allowance is valid. Any drift
must abort generation and report
`BLOCKED_UNAPPROVED_CROSS_SCOPE_OVERRIDES`.

## Non-Iowa decision

The long overlapping roads are not interfaces. They are duplicate ownership:

- Parkway to RV road: 3,169 stale diagnostic cells.
- Freight to Parkway: 1,581 cells.
- Freight to RV road: 682 cells.
- ceremonial road to freight: 481 cells.

Those corridors need one canonical owner, with a small independently reviewed
junction only where routes actually diverge.

Other broad overlaps also need redesign rather than approval: the competing
Adventure Exchange/Ravencrest gate envelopes, Adventure Exchange/Northwind
bath edge, Oasis/freight conflict, and the green link entering the HL-A
building envelope.

Small junctions, bulkheads, lift landings, and quay supports may become valid
interfaces after regeneration. The machine proposal records the required
resolution for all 23 non-Iowa blocker pairs. None becomes approved until its
final exact cell set and route, enclosure, egress, containment, or hydrology
proof are attached.

## Compiler requirement

`Model.set()` must retain the prior role as well as both states, aggregate exact
cells by scope/role/state transition, and compare the final aggregate to the
contract before any operation file is written. `READY_FOR_PREFLIGHT` must
require:

1. zero unapproved cross-scope overrides;
2. every approved entry matching its exact sorted-cell hash;
3. every acceptance predicate true;
4. zero protected block-entity targets and zero unresolved terrain/fluid gates;
5. complete database object and first/second-pass camera manifests for every
   release object.

