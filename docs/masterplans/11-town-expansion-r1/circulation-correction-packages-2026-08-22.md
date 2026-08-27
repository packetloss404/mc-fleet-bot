# Town, underground, and bunker circulation correction packages

Status: **builder-ready design and QA only — no world mutation authorized by this document**

Source-bound audit: [circulation-audit-2026-08-22.json](circulation-audit-2026-08-22.json)

## Non-negotiable design correction

The existing checker proves a normal Minecraft walker can follow one line with
two blocks of headroom. It does not prove clear width, stair rhythm, landing
depth, door operation, or two routes out. A passing centerline is not permission
for a one-block stair or a one-block pinch point.

| Class | Minimum clear route | Vertical / landing rule |
|---|---|---|
| public concourse, public exit, main common-room route | 5 wide × 5 high | 1 rise per 2 run; 5-deep landing at both ends and every turn |
| high-volume theatre / major civic stair | 7 wide × 6 high | 1 rise per 2 run; 7×7 landing and nearby lift analogue in the same visible hall |
| staff/BOH and service hallway | 3 wide × 3 high | 1 rise per 2 run; 3×3 level zone at each door |
| owner/controlled corridor | 5 wide × 5 high | 1 rise per 2 run; 5×5 landings and visible boundary vestibule |
| mixed vehicle route | 7 wide × 5 high vehicle envelope plus separated 3-wide pedestrian walk | no abrupt step; protected pedestrian crossings and level door zones |
| restricted annex route | 5 wide × 5 high common spine; 3×3 suite approach | 1 rise per 2 run; privacy door never counts as exit |

Ladders, trapdoors, alternating treads, jumps, and unsecured door thresholds
are never primary circulation. Every occupied underground room needs two
deliberately separated directions to protected endpoints. A staff path can
connect a backroom to a common area but never substitutes for an exit.

## Release order

1. Run `CIRC-QA-CORE-01` on a fresh immutable snapshot.
2. Release the three failed-route repairs separately; they have different
   ownership and interaction surfaces.
3. Retain Empty Eight and B03 nonclaims until their dedicated access packages
   pass. Neither has released public exterior egress today.
4. Re-survey the historical citizen pinch point before assigning a citizen bot.

## CIRC-QA-CORE-01 — cross-section and stair audit

**Purpose:** upgrade acceptance from a one-cell walk test to a
cross-section-aware test.

**Inputs:** fresh copied saved-world snapshot, current route manifest, exact
anchors, protected-zone and entity/container census.

**Compiler requirements:** at every route station measure clear width and
headroom; split at width, headroom, grade, door, and floor changes; identify
all stair rise/run sequences and landing rectangles; reject a primary route that
misses its class standard or has a rise other than one per two horizontal
stations; report public, staff, owner, service, and restricted paths separately.

**Acceptance:** retain bidirectional normal walking, and add exact
width/headroom/landing evidence. A two-headroom centerline alone never unlocks
public, owner, employee, or restricted-area activation.

## CIRC-C01-PORTAL-01 — C01 external portal continuity

**Problem:** `TE-ROUTE-C01-MOUNTAIN-PORTAL-L1` fails both offline directions;
no bounded normal-walk path exists.

**Design:** a controlled five-by-five pedestrian spine beside—not inside—the
vehicle ramp; two level 5×5 airlock vestibules; a separate vehicle envelope;
and two protected directions from L1 before any public label. Keep the route
controlled until live door, entity, and movement checks pass.

**Do not touch:** C01 source retirement, unproven surface recovery, unlisted
tunnel branches, utilities, or inactive portal frames.

**Release proof:** fresh source; 5×5 station census; dry envelope;
protected-core/entity/container clearance; exact inverses; strict-noop parser
checks; bidirectional offline/live walk; exit-side door test; separated L1
protected endpoints.

## CIRC-MSA-PORTAL-01 — MainStreet warehouse arrival

**Problem:** `TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL` fails both offline
directions; no bounded normal-walk path exists.

**Design:** retain a seven-wide vehicle ramp, add a separated three-wide,
three-high pedestrian walk behind curb/guard separation, and make 5×5 level
arrival vestibules at portal and hall. If grade cannot fit, use a switchback
3×3 staff stair plus adjacent lift analogue—never a one-block neck or a
pedestrian line in the vehicle lane.

**Do not touch:** excluded aquifer seam, warehouse bulkhead ownership, wet
interfaces, or unrelated MainStreet parcels.

**Release proof:** fresh fluid/gravity census, vehicle/pedestrian separation,
grade/width/headroom report, exact inverses, strict parser checks, and
bidirectional pedestrian walking.

## CIRC-OBS-GALLERY-01 — Observatory portal-gallery route

**Problem:** `TE-ROUTE-OBSERVATORY-PORTAL-HUB` fails both offline directions.

**Design:** preserve owner-only classification. Provide one continuous 5×5
descending gallery, 5×5 landings, one visible controlled vestibule at each end,
and no service, public, Ravensgate, Raven Rock, or C01 branch. Keep destination
frames inactive; this is not a new public attraction.

**Release proof:** fresh intersection census, branch-denial check, exit-side
door check, bidirectional owner walker, inactive-frame check, inverse/rollback.

## CIRC-EE-EGRESS-01 — Empty Eight public-route completion

**Current truth:** eleven south bays are internally explorable. The BOH spine is
restricted with two marked public-to-staff doors. The lower annex uses a
seven-wide secured grand stair. None is exterior public egress or an accessible
emergency route.

**Design:** separately survey and build two route-disjoint 5×5 public paths to
safe exterior/protected endpoints; use a 7×6 public stair hall and nearby lift
analogue only where a vertical public change is needed; retain the 3×3 BOH spine
through its two named staff vestibules and provide a distinct staff discharge;
and give the restricted annex a protected exit that does not depend on a privacy
door.

**Never open here:** rail, utility, drainage, ventilation, fire/service,
mechanism, wet/gravity, N06, or sealed-stub interfaces.

**Release proof:** fresh source/fluid/gravity census, exact interface map, two
route-disjoint path checks, lighting/wayfinding census, dimensional QA, live
bidirectional walking, exit-side doors, exact inverse, rollback preflight.

## CIRC-B03-ACCESS-01 — Cheyenne access after full route design

**Current truth:** R12O proves an enclosed inspection component at indices
188–800. Indices 0–187 are held and index 800 is capped. No public or exterior
access is commissioned.

**Design constraint:** never make access by merely removing a cap. First design
two protected directions, a 5×5 common spine, 5×5 landings, a paired lift
analogue for major changes, controlled boundaries, and a separately surveyed
chamber/terminal package.

## CIRC-CITIZEN-RECHECK-01 — historic narrow-point re-survey

An older snapshot recorded recurring citizen-route widths of 2, 2, 2, and 1.
They are not claimed current. On the next fresh source, measure the full route
and either widen every recurring citizen path to three clear blocks or keep its
schedules inactive.

## Required propagation into the unified plan and runbook

The following wording must be copied into the central documents; this review is
not complete if it stays isolated here.

| Target | Section | Copy-ready wording |
|---|---|---|
| unified `MASTERPLAN.md` | circulation and sequencing | “Passing normal-walk geometry proves only a traversable centerline unless a cross-section report measures clear width, headroom, stair rhythm, and landing depth. One-block stairs, necks, ladders, trapdoors, jump geometry, and unsecured door thresholds are not primary circulation. Run CIRC-QA-CORE-01 before expanding public, staff, owner, or restricted access.” |
| unified `MASTERPLAN.md` | open work / next packages | “CIRC-C01-PORTAL-01, CIRC-MSA-PORTAL-01, and CIRC-OBS-GALLERY-01 repair three R08AM-bound routes that fail in both directions. They are independent scoped releases and are not available routes until post-state route and cross-section QA pass.” |
| Combined Zones `CURRENT-STATE.md` | R08AL/R08AM row and nonclaims | “R08AL is internal public exploration only; it has no released exterior discharge or accessible egress. R08AM is restricted-only. CIRC-EE-EGRESS-01 is separately surveyed, requires two protected route-disjoint endpoints, and must not open rail, utility, drainage, ventilation, fire/service, wet/gravity, N06, or sealed-stub interfaces.” |
| central builder runbook | route QA gate | “Every release that adds or changes a path, stair, hall, door threshold, common area, BOH link, or restricted-annex route must run CIRC-QA-CORE-01-equivalent QA on a fresh snapshot: width/headroom station census, stair rise/run and landings, route class, exit-side door operation, and separated egress. A one-cell pathfinding pass is insufficient.” |
| bunker report | Cheyenne B03 limit | “B03 remains passive internal inspection circulation only. Its capped/held ends are not entry, egress, or public access. Future access starts with CIRC-B03-ACCESS-01, not cap removal.” |

## Builder handoff rule

Start each correction with a new scoped survey. The survey—not this design
note—selects exact cells. Then compile an exact reversible package, run the
hard-safety kernel, release only that scope, and bind post-state cross-section
and live-route evidence to the new snapshot.
