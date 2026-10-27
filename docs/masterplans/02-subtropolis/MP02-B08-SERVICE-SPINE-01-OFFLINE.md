# MP02-B08-SERVICE-SPINE-01 — historical offline functional starter

Status: **COMPILED FROM A RETAINED HISTORICAL SOURCE — NOT AUTHORIZED FOR EXECUTION**

The accepted R08AM post snapshot shows the P1-B08 tunnel vacant, dry, and free
of containers/entities, but completely unlined and without a walkable floor.
The first bounded functional component is therefore not a tenant fit-out or
public lobby. It is a six-wide smooth-stone service spine from the existing
west aperture at `(1947,72..75,-630..-625)` through B08 centreline indices
`0..121`, ending at a 6×3 level contact landing around index 120
`(2008,130,-688)`.

`scripts/compile_mp02_subtropolis_b08_service_spine_01.mjs` emits exact floor
and rollback operations only for the B08 interior. It leaves the west aperture
open and stops before the B03/B09 rail exclusion (`x=2048..2062`,
`y=129..134`, `z=-750..-746`). The virtual route starts at `(1947,72,-628)`,
has 123 normal-walk stations with no jump/sprint/dig/swim/climb transition,
and reaches the contact landing without claiming any B03, public, tenant,
vehicle, egress, utility, or climate function.

The source is historical. A fresh full source capture, ownership confirmation
at the west aperture and B03/B09 exclusion, all entity/container gates, exact
preflights, journalled execution, post snapshot, rollback post-preflight, and
independent route QA are mandatory before this can enter a live queue.

## 2026-08-26 offline re-survey

The compiler was re-run read-only against the same retained R08AM source under
an explicitly non-executable artifact identity. It still passes every static
gate: **729/729** exact air targets, two-clear headroom, zero fluid/forbidden
halo cells, zero saved entities/block entities, and a 123-station six-wide
normal-walk route from the retained west aperture to the 6×3 contact landing.
The B03/B09 exclusion remains untouched. Strict forward/rollback parsers and
source/projected-rollback preflights each pass **729/729**.

- Forward: `data/buildops/mp02-subtropolis-b08-service-spine-01-offline-resurvey-20260826T080000Z.forward.txt`
- Inverse: `data/buildops/mp02-subtropolis-b08-service-spine-01-offline-resurvey-20260826T080000Z.rollback.txt`
- Manifest: `data/buildops/mp02-subtropolis-b08-service-spine-01-offline-resurvey-20260826T080000Z.release-manifest.json`
- Identity: `589df143719e4599d6137b976049e9a5b0d4cd9094065e9f2ad2df6b622459be`

This confirms an offline functional candidate only. It is **not** a current
live source and does not authorize a release or any public/tenant/vehicle/B03
claim.
