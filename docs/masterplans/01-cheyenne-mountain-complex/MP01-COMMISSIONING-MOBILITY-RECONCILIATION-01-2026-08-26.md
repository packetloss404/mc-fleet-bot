# MP01 commissioning mobility reconciliation 01

**Status:** `NO_GO_NO_CURRENT_OWNER_APPROVED_NORMAL_WALK_ROUTE`
**Scope:** the one interaction-only MP01 isolated reactive-control protocol; no
world, bot, marker, route, zone, role, or configuration state was changed.

## Decision

There is no safe, exact, owner-approved way to add an MP01 staging/access
route from the current fleet boundary without first creating a new, separately
surveyed mobility contract.  This is not a request to enlarge a home radius or
to permit free roaming.  It is also not evidence that a long-distance A* route
is safe merely because the current immutable save contains the relevant region
files.

The commissioning action requires an already-present bot on exactly one of
`(2001..2003, 165, -899)` and only then permits interaction with the lever at
`(2001, 166, -902)`.  It performs no movement itself.  The existing civic
boundary rejects a goal to every one of those staging squares before
pathfinding, and rejects intermediate steps outside its named home,
destination, and corridor geometry.

## Current evidence

| Check | Result |
|---|---|
| Latest accepted complete source | `data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z`, captured `2026-08-26T12:35:47.601Z`; 52 region files; region digest `a197c7d2f6b99cc71dcf3801712f263ba5795a0672f324a05dec7ffe49b10586`; complete-save intake PASS |
| Current fleet boundary | Five individually named bots share home `(-85, -370)` radius `50`, one named destination `mainstreet-rear-staff-staging`, and one three-wide, 49-waypoint Ravensreach--MainStreet corridor ending at `(-82, 90)` |
| Staging authorization | The staging center `(2002, -899)` is `2103` horizontal blocks beyond the nearest approved civic area for every current bot |
| Catalog endpoint | `data/markers.json` has 28 markers and `data/routes.json` has 5 routes; none names MP01/Cheyenne or intersects the staging/control envelope |
| Durable ownership | `data/world-map.db` has no `world_features` record with project/name MP01 or Cheyenne, and no feature overlaps `x=2001..2003`, `z=-902..-899` |
| Current zones/roles | The two persisted zones are MainStreet-only; there are no role assignments. Neither is an MP01 movement or ownership grant |
| Enforcement | `src/bot/BotInstance.ts` delegates goal and intermediate-step enforcement to `src/control/CivicMobility.ts`; neither reads MarkerStore routes or markers as movement authorization |

Inputs bound when this reconciliation was made:

```text
config.yml                         cf681a9067873b5a20882b9f067c2a28c5cb1e57760ac40520d441f45d456225
data/markers.json                  504738767dae439ce739eabc000832661ad4c0a7ee74dd0fcdd110e67a26ccc8
data/routes.json                   558e1a8bb6d1d3fc37e52d580e2d9d21241f8e0b18fa51af0ca5d78850029cc7
data/zones.json                    e4d2d2f10c18bd907695415c6f41de9da33df7c09f0ed08f661436a9069d484b
src/control/CivicMobility.ts       8f18c1ae288717ff82f6833fe6036435e63a2cc2fe17037eeb1fb1007209a24f
src/bot/BotInstance.ts             14464c09efe072ac203576e8779295b6df82a67d03ad575dbf9a786e09ebe241
```

## Why catalog records cannot solve this alone

Creating a MarkerStore marker, a dashboard route, or a role record would be
documentation only.  They are not consumed by the movement guard.  Conversely,
adding a direct staging destination or a broad line to `config.yml` before
survey evidence would silently turn a 2.1-kilometre unknown corridor into an
allowed path.  That would be a leash relaxation in substance and is rejected.

Teleport, RCON movement, a speculative pathfinder probe, a freeform goal, and
a temporary configuration expansion remain out of scope.

## Required successor contract

Only the following bounded process can turn this into a movement candidate:

1. Capture a fresh complete immutable source immediately before survey work;
   choose one named commissioning bot and a currently reachable *physical*
   departure checkpoint.  Do not substitute the home X/Z centroid for a
   surveyed standing cell.
2. Produce both outbound and return normal-walk paths as ordered, exact
   `(x,y,z)` feet cells.  Every segment needs floor, two-high headroom,
   step/fall limit, fluid/lava/gravity, doors/rails, container/block-entity,
   protected-zone, and exact owner/interface findings.  Every cell that cannot
   be classified fails closed.
3. Bind a durable MP01 ownership record and a reviewed route contract to the
   same snapshot.  The contract must identify each external interface owner;
   it may not claim broad unowned terrain between Ravensreach and Cheyenne.
4. Add non-authoritative catalog records only after the survey: named outbound
   checkpoints, an MP01 staging marker, and a distinct return/recovery anchor.
   These records make the route inspectable; the route contract remains the
   source of authorization.
5. Generate the narrowest possible civic-mobility patch: one designated bot,
   only the reviewed corridor centerline/width, the three staging squares, and
   the verified return anchor.  It must have no new general destination circle
   and no shortcut across non-surveyed cells.  Test the patch offline against
   its exact route samples before any restart or movement.
6. Immediately before each supervised checkpoint move, re-capture/compare the
   changed route cells, verify live entity clearance, confirm the return path,
   and abort on any source, entity, or position drift.  The interaction-only
   commissioning protocol remains a separate final step with its own OFF--ON--
   OFF evidence and post-interaction save.

Until steps 1--5 produce an accepted, hash-bound contract, no marker, route,
or configuration mutation is authorized and no bot may be moved toward MP01.

## Non-claims

This reconciliation does not claim a safe arrival or return, a public or
service access route, active-control commissioning, an MP01 release, or
completion of the Cheyenne programme.
