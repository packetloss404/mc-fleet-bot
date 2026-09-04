# MP01 Cheyenne ↔ MP02 SubTropolis handoff

**Status:** source-bound design handoff only. It records no release authority,
world mutation, route opening, egress, rail service, or public access.

## Coordinate and evidence baseline

The authored Cheyenne portal is local `(0,200,-420)`, not a direct live-world
coordinate. The adopted Masterplan 04 transform places it at world
`(2048,130,-748)` (`worldX=2048+localX`, `worldZ=-328+localZ`, and local
`Y=200` maps to world `Y=130`). Its Phase-0 terrain reference at the same
X/Z is Y83. This distinction is mandatory: a plan-local coordinate must never
be used as an RCON or bot target.

The current source used for the portal census is the 130-member immutable
support post `data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z`.
The reproducible evidence/map generator is
[portal reservation survey](../../../scripts/survey_mp01_cheyenne_outer_portal_reservation_01.mjs).
It binds the source manifest before reading cells and defaults to a read-only
report/map output.

| Reservation | Exact world bounds | Current source census |
| --- | --- | --- |
| Portal clear reservation | X2045..2050, Y130..135, Z-755..-748 (6×6×8; inward `-Z`) | 91 air, 41 polished diorite, 156 stone |
| Checkpoint reservation | X2045..2050, Y130..135, Z-747..-744 (6×6×4; service-tunnel side `+Z`) | 86 air, 42 polished diorite, 16 stone |
| Combined reservation | X2045..2050, Y130..135, Z-755..-744 (432 cells) | no fluid/waterlogging, gravity, forbidden container, block entity, or saved entity in the reservation or one-cell halo |

The canonical source state of all 432 cells is captured by that survey, so it
is the only possible inverse record for a future, separately compiled
clearance package. It is not a material target or an authorization to clear
anything.

## MP01 Cheyenne

The current physical Cheyenne programme is a restricted interior component:
the terminal/chamber shell, all fifteen structural bays, passive bay fit-outs,
Battle Cab envelope, contained reservoir, and restricted support/service rooms
are as-built in their stated scopes. The current control ledger is
[MP01 current state](../01-cheyenne-mountain-complex/CURRENT-STATE.md).

The outer portal, its checkpoint, the 25-ton door, J-curve access, service
tunnel endpoint, funicular, summit road, and any public or emergency route are
designed but not built or commissioned. The reservation census is dry and
entity-free, but it does **not** prove face-to-face passage, an existing
service-tunnel endpoint, a Cheyenne/J-curve endpoint, a normal-walk route, a
rail relation, a marker, ownership, or a recovery route.

The authored record needs one reconciliation before a material compiler can be
considered: it specifies a 6×6 opening and a 6-wide, four-deep checkpoint,
while separately describing a three-block-thick 6×12 blast-door treatment.
No canonical frame cells, door states, airlock failure state, or transition
between those dimensions has been adopted. The appropriate next MP01 work is
therefore an exact portal-interface decision, not a carve or a decorative
frontage.

## MP02 SubTropolis

MP02 is a partial, bounded restricted chamber and service-spine system, not a
public terminus. Its authoritative summary is
[MP02 current state](../02-subtropolis/CURRENT-STATE.md), with the executed
chamber [plan, section, and route/failure maps](../../../data/world-review/mp02-b08-restricted-chamber-dry-receiver-live-20260827T023000Z/post-snapshot-maps/mp02-b08-restricted-chamber-post-maps-evidence.json).

The accepted work includes the 719-cell B08 ramp handoff and an 835-cell
restricted B08 chamber/dry receiver package. Its post QA proves 835/835
targets, a sealed 125-cell dry contingency receiver, preserved B03 aperture
20/20 air, B09 cap 12/12 polished diorite, preserved B09 guideway/control
states 19/19, and six restricted normal/single-return-failure checks.

It does not establish a public lobby, tenant programme, utility/drainage
system, B03/B09 connection, rail/control action, public or emergency egress,
or a connection to the Cheyenne portal. The retained far aperture is
`x=2049, y=130..133, z=-750..-746`, next to the protected B09 envelope
`x=2048..2062, y=129..134, z=-750..-746`; neither bilateral ownership nor a
control/egress contract exists there. The latest support-post audit found no
finite tenant, lobby, service-crosspassage, or public/restricted circulation
package: 565 dry continuation cells remain, but 19 cells are protected and the
current public-return count is zero. See the
[owned-programme audit and map](../../../data/world-review/mp02-b08-owned-programme-lane-02-support-post-20260827T043000Z/MP02-B08-OWNED-PROGRAMME-LANE-AUDIT-02.md).

## Gateway, ownership, and hydrology constraints

1. The portal is an authored interface reservation only. The service-tunnel
   side is `+Z`; the Cheyenne interior side is `-Z`. Both exact endpoint
   station arrays, their owners, and their inverse/failure behaviour are
   absent.
2. Existing MP01 access evidence has no permitted exterior origin, staging
   marker, checkpoint chain, or distinct recovery anchor. Do not relax bot
   mobility, teleport, or infer a route from straight-line geometry.
3. The portal reservation and one-cell halo are currently dry and free of
   gravity, block entities, and saved entities. That is a local condition
   only; every future tunnel, door, frame, support, and route cell needs a
   fresh source/halo census. Any water or lava discovered outside that bounded
   census requires a finite, sealed, flow-ordered containment design before
   it can be touched.
4. MP02's B03 aperture and B09 cap are protected interfaces. The Cheyenne
   interface must not borrow them, reclassify a restricted return as public,
   or use B09 rail/control fabric as an access substitute.

## Feasible next decision/design

Adopt one source-bound `MP01-PORTAL-INTERFACE-01` decision packet before any
physical package. It must fix all of the following on a fresh complete save:

- one reconciled portal/door/airlock geometry, including the exact 6×6×8 core,
  checkpoint depth, frame cells, door leaf states, default closed/failed state,
  and rollback order;
- named owners for portal frame, checkpoint, service-tunnel handoff,
  Cheyenne-side handoff, and the protected MP02/B03/B09 boundaries;
- two exact endpoint arrays and a bidirectional recovery design. A future rail
  option must be designed as rail, not asserted by the portal reservation; a
  future walk option needs complete footing/headroom stations and a distinct
  return;
- a finite water/gravity/container/block-entity census over the full proposed
  target, liner/support, route, and interaction halo; and
- a declaration of whether the result remains restricted controlled access or
  is later eligible for a separately accepted public programme. No current
  evidence supports the latter.

## Strict release sequence

Only after that decision has passed its source-bound design checks may a
dedicated compiler be considered. Its release kernel must include:

1. fresh immutable complete source and recompiled canonical forward/inverse
   operations;
2. exact portal, checkpoint, frame, door, support, fluid/gravity, protected
   interface, container/block-entity, and route preflights;
3. fresh live-entity and checkpoint clearance immediately before mutation;
4. strict-noop forward and rollback parser checks, exact source preflight, and
   journaled guarded execution;
5. fresh immutable post capture, rollback post-state preflight, and independent
   QA of material targets plus both directed access/recovery traces.

Until then, retain all current portal, MP02 B03/B09, public, egress, service,
and rail non-claims.
