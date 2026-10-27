# MP05 B07 ice-edge finite water plug 01

**Status:** `OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL`  
**Scope:** Exterior-only, finite 35-cell water containment immediately north-west of the already sealed B07 ice-edge inspection receiver.

**Current static source:** `data/worldsnap-mp11-bkr-c01-finite-gravity-liner-post-20260827T231000Z`  
**Prepared-kernel ledger:** [seven offline safety gates PASS](../../../data/world-review/mp05-b07-ice-edge-finite-water-plug-01-prepared-20260827T234000Z/fresh-kernel-ledger.json)  
**Map:** [source plan at Y=62](../../../data/world-review/mp05-b07-ice-edge-finite-water-plug-01-prepared-20260827T234000Z/rebound-buildops/ice-edge-finite-water-plug-plan-y62.svg)

The four source-water cells at the receiver face are not part of the unbounded B07 transfer body. A complete current-world capture traces them to two disconnected, all-source, one-level pockets: west `25` cells and north `10` cells, `35` in total. This one atomic package replaces both finite pockets with permanent polished deepslate, from the far exterior cells toward the four receiver-facing cells.

The existing five-wide bulkhead remains closed throughout both directions. Rollback restores the receiver-facing water only behind that bulkhead, then reverses outward. No door, bulkhead, receiver core, floor, roof, access aperture, route, egress, terrain receiver, or discharge is changed or commissioned.

Before any future `--execute`, the package must be recompiled from a fresh same-invocation complete source and pass the full guarded kernel, including fresh live-entity clearance, journalled strict execution, post capture, rollback-poststate preflight, and independent QA.

If strict forward execution ever fails, the wrapper uses the exact non-strict compensating inverse for the partial transaction, captures a fresh recovery post, and requires the original forward source preflight to pass again. A failed compensation or recovery proof remains a local manual-intervention condition; it cannot be treated as a release.
