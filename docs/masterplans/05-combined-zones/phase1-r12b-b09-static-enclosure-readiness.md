# Combined Zones CZ-R12B: B09 static enclosure readiness

**Status:** PASS — STATIC ENCLOSURE AND MECHANISM-INSTALLATION READINESS ACCEPTED  
**Release node:** `CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING`  
**Commissioning scope:** `CZ-R12B-P1-B09-STATIC-ENCLOSURE-AND-INSTALLATION-READINESS`  
**MVP scope:** `true`  
**Readiness identity:** `bf2a1a6a93ca51c2a2ba3e6bbdbb95ec7ff3a8f97434205abaa899edd9269044`

R12B closes the next deterministic B09 milestone without changing the world.
It accepts the already-built lower-to-summit enclosure as a source-proven
installation envelope for separately guarded transport mechanisms. It does
not commission a funicular, passenger route, rescue route, or powered system.

## Accepted terminal and exact state

The seal binds the accepted R10E wrapper ledger and its independent 14/14 PASS
post-release QA. The immutable R10E terminal is complete-save SHA-256
`4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0`
and region SHA-256
`8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443`.

Against that terminal the verifier proves:

- the accepted 1,096-cell B09 guideway route;
- a complete 1,116-cell lower-to-summit air void in one face-connected
  component;
- a complete 3,346-cell solid boundary comprising 3,326 polished-diorite
  cells and 20 passive sea lanterns;
- all 7,800 exact accommodation cells, with a three-state census of 1,155 air,
  6,625 polished diorite, and 20 sea lanterns;
- exactly 15 changes from the accepted R10D accommodation, all matching the
  R10E fixture target and all polished-diorite-to-sea-lantern transitions;
- the retained 12-cell lower B08 cap and 12-cell summit Z11 cap, both closed;
- zero fluids, active mechanisms, containers/control blocks, block entities,
  or saved movable entities in the exact accommodation review domain; and
- zero route obstructions or non-solid boundary cells.

The 20 passive fixtures are accepted only as present full-cube visual markers.
No photometric, emergency-lighting, power, or life-safety claim is inferred.

## Global projected rollback

Nine exact rollback packages pass against the R10E post in strict global
reverse order:

`R10E → R10D → R10C → R10B → R07I → R07H → R07F → R07E → R07D`

The chain proves 6,604/6,604 operation groups with zero failed guards. Each
older package is preflighted after applying every preceding rollback as a
logical source overlay; the final R07D check binds 6,598 preceding overlay
operations. This is projected rollback evidence only and performs no world
mutation.

The earlier R08X-bound eight-package reverse-chain reports are preserved as
preliminary provenance in
`data/world-review/combined-zones-r12b-b09-static-readiness-20260822T002500Z`.
They are superseded by this R10E-bound nine-package seal and cannot satisfy the
current R12B milestone.

## Exact commissioning boundary

R12B accepts static enclosure and mechanism-installation readiness only. It
does **not** install or commission rail, vehicle, drive, brake, barriers,
controls, power, drainage, emergency lighting, passenger transport,
pedestrian/rescue circulation, or either external opening. Both B08 and Z11
interfaces remain fail-closed.

The next concrete evidence task is to freeze exact cell sets and fail-safe
states for drive/brake/vehicle/barrier, power/control, drainage, and rescue
systems. Each must then be compiled and executed as its own guarded R10/R12
physical package before functional commissioning can advance.

## Evidence and regression

- Machine-readable seal:
  `data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z/r12b-readiness.json`
- Human-readable seal:
  `data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z/r12b-readiness.md`
- Ordered rollback reports:
  `data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z/01-r10e-rollback-preflight.json`
  through `09-r07d-rollback-preflight.json`
- Read-only verifier:
  `scripts/commission_combined_zones_r12b_b09_static_enclosure_readiness.mjs`
- Focused regression:
  `test/build/combinedZonesR12BB09StaticEnclosureReadiness.test.ts`

The verifier reads only immutable Anvil data and hash-bound evidence. No live
API, RCON, service, or world mutation was performed.
