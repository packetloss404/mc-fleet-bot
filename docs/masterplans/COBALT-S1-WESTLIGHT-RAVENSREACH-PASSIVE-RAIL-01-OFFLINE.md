# COBALT-S1 Westlight–Ravensreach passive rail 01 — offline release packet

**Status:** `COMPILED FROM COMPLETE HISTORICAL SOURCE — AWAITING FRESH EXECUTION KERNEL`  
**Release ID:** `COBALT-S1-WESTLIGHT-RAVENSREACH-PASSIVE-RAIL-01`  
**Selected pair:** Westlight (PR-W02) ↔ Ravensreach (PR-W04)  
**Mode:** offline compiler only; no RCON, world mutation, route, or passenger service.

This is the first finite passenger-guideway release for the pair. It places
two unpowered, isolated 18-cell east-west rails in the built Westlight approach
tubes:

| Track | Exact cells |
| --- | --- |
| north / westbound | `x=-254..-237, y=13, z=-461` |
| south / eastbound | `x=-254..-237, y=13, z=-455` |

The source-bound compiler proves 36 dry-air targets, 36 polished-deepslate
supports, 108 clear headroom cells, and retains the 32-cell polished-deepslate
diaphragm at `x=-236`. The diaphragm intentionally leaves this first slice
physically isolated; it cannot form a passenger route or permit a vehicle
trial.

## Governor-delegated implementation roles

The Governor's 2026-08-26 directive removes external-signature waiting for
this finite package. The internal accountable roles are:

- Passenger Railway implementation lead — scope owner;
- SYS-03 civil interface lead — counterpart owner;
- Passenger Railway safety/recovery lead — safety and recovery owner;
- Guarded-release implementation operator — release operator.

This delegation does not relax any execution-kernel check.

## Independent interaction boundary

The complete historical source was capture
`combined-zones-b64f94124c124df98275f8a341ef1438`, captured at
2026-08-26T05:02:51Z with all 130 required members hash-verified. The package
has a 500-cell local interaction set. It intersects neither active R10 hold:

| Excluded hold | Interaction overlap | Nearest X separation |
| --- | ---: | ---: |
| normal-alignment fluid/gravity hold | 0 | 162 blocks |
| north-turn water/bubble hold | 0 | 262 blocks |

No fluid remediation is needed for this slice. The Governor's authorization to
contain dynamic fluids remains available for a future local package if a fresh
source shows a fluid contact; it does not expand this package into either held
envelope.

## Offline evidence

- Compiler: `scripts/compile_cobalt_s1_westlight_ravensreach_passive_rail_01.mjs`
- Forward operation: `data/buildops/cobalt-s1-westlight-ravensreach-passive-rail-01.passive-rail.forward.txt`
- Exact inverse: `data/buildops/cobalt-s1-westlight-ravensreach-passive-rail-01.passive-rail.rollback.txt`
- Manifest: `data/buildops/cobalt-s1-westlight-ravensreach-passive-rail-01.release-manifest.json`
- Governor standing authorization: `docs/masterplans/05-combined-zones/sys03-cobalt-station-pair-governor-standing-execution-authorization.json`
- Parser and historical/projected-state checks: `data/world-review/cobalt-s1-passive-rail-offline-20260826T182500Z/`

The focused compiler regression passes:

```bash
npx vitest run test/build/cobaltS1WestlightRavensreachPassiveRailFirstRelease.test.ts
```

Both forward and rollback parser checks have 36 strict commands and zero
WorldEdit leftovers. The historical forward source preflight and the projected
rollback poststate preflight each pass 36/36 guards.

The release manifest is directly compatible with the scoped guarded runner at
node `CZ-SYS03-COBALT-STATION-PAIR-PASSIVE-RAIL`; it has one package with both
operation paths under `data/buildops`. Run it in `PREPARE_ONLY` first, then use
`--execute` only after that fresh preparation record is accepted. After a
successful executed ledger, run:

```bash
node scripts/qa_cobalt_s1_westlight_ravensreach_passive_rail_01_post_release.mjs \
  --ledger <scoped-runner-evidence-ledger.json> \
  --out <fresh-post-qa.json>
```

## Required immediately before any execution

The historical packet is not authority to mutate. Recapture a fresh immutable
complete source, recompile against it, prove container/block-entity and fresh
live-entity clearance, run strict-noop forward and rollback checks plus exact
source preflight, execute with a journal, capture a fresh post, run passive-rail
isolation QA, and prove rollback against that post. No cart, power, signal,
station operation, public opening, or passenger-service claim follows from this
package.
