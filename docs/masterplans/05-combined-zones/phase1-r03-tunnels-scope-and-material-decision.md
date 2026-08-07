# Combined Zones R03/R04 tunnels scope and material decision

**Status:** OWNER_DECISION_RECORDED_R03_R04_TUNNEL_BORES

Owner authority: build-ready directive + "you wanna keep going?" continuation
(project conversation, 2026-08-07), following the R01/R02 precedent.

## Scope: one release, three packages (contract R03/R04 combined)

The three frozen connector construction domains, executed in one guarded
release with per-package forward/rollback, in this order:

| Package key | Frozen domain | Cells | G03 identity basis |
|---|---|---:|---|
| `b03-jcurve` | P1-B03 CHEYENNE-JCURVE construction | 15,972 | inline cells in `phase1-cheyenne-jcurve-geometry.json` |
| `b08-service-tunnel` | P1-B08 SERVICE-TUNNEL construction | 7,878 | inline centerline in `phase1-connector-geometry.json` |
| `b07-shaft` | P1-B07 B07-C-WEST-2 construction | 8,134 | anchors + west offset in `phase1-d06-life-safety-alternatives.json` |

Combining R03 and R04 into one release is an owner scope adjudication in the
R01 pattern: same toolchain, disjoint one-owner domains, each package
independently reversible. The release contract is not modified.

## Material doctrine: bore voids

Every construction cell in all three domains → `minecraft:air` (excavated bore
void). Linings, rails, portals, stairs, and systems are later fit-out
releases; native rock remains the interim wall surface, matching the R02
shell doctrine.

## Guards and deferral rules (identical to the amended R02 rules)

- CONTAINER GUARD: hard abort on the R01 container/block-entity denylist.
- SURFACE DEFERRAL: to-air cells that are surface-exposed in the bound save
  (only air above to the build limit) are excluded as a hash-accounted class
  (tunnel portals/shaft tops become a later portal-structures release; no
  open holes in terrain now).
- WET-ZONE DEFERRAL: fluid-source cells plus the 1-cell face-adjacent to-air
  buffer are excluded as a hash-accounted class (B07's known water cells land
  here; a sealing liner comes later).
- ALREADY-TARGET: cells already air are accounted, not emitted (strict-noop
  runner contract).
- Partition invariant per domain: operated + surface + wet + alreadyTarget ==
  frozen domain (count and coordinate-set hash).

## Bound source

`data/worldsnap-combined-zones-complete-save-20260807T001212Z` (post-R02 save;
completeSaveSha256
`d0aa5693bdd5e3de001787ba3f8c6e86dad8879e7e7ef6af186159a10cd11b98`, intake
audit `phase1-complete-save-intake-audit-20260807T001212Z.json`, PASS). No
world change has occurred since its capture (fleet stopped; R02 finalized).

World edits authorized by this record: **none**.
