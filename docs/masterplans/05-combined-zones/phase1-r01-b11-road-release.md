# Combined Zones CZ-R01: Grand Avenue surface road — EXECUTED

**Status:** EXECUTED_VERIFIED_REVERSIBLE_2392_CHANGED_0_FAILED
**Finalize identity:** `b854897f450788f87539069f5730d2121cc2bad00b0ea27c99074fb61e54a3ee`

The first physical Combined Zones release is live: all **2,392** frozen P1-B11 construction cells were placed by the strict-noop guarded runner (**0 failures, ~6 s**) after the full prerelease chain (G08 double-compile byte-identity, G09 manifest QA, G10 fresh immutable save, G11 preflight 2392/2392, G12 strict dry-runs, T02 exact domain bijection with zero relic-core overlap, G13 live entity gate 0 blockers, G14 hash-bound owner authorization).

- Forward ops: `1b3ab19294d7d46a7b62c4a69b668489302822d6eb8be5846bac9bceb843f276`
- Rollback ops: `7a3817c8f5a220f59982dddc489d28cbeba6730a040ea257b5bf76b46d95b807` — **2392/2392 guards pass against the post snapshot**; the release is fully reversible.
- Post snapshot: `data/worldsnap-combined-zones-complete-save-20260806T222851Z`

mc-look renders confirm carriageway, dashed centre stripe, curbs, and sidewalk; road spans as an unsupported deck where terrain drops (support cells were influence reservations, not construction scope).

Follow-ups: Owner decision candidate: embankment/pier support treatment where the road spans low terrain (new additive decision; support cells live in the influence reservation). Next release per contract order: R02 Empty Eight (D06) with the frozen EE role palette.
