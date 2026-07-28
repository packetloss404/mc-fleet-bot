# Independent Coordinated-Release Geometry and Safety Audit

**Audit state:** `BLOCKED_DO_NOT_RELEASE`  
**Audit type:** offline/read-only; no generator or live-world mutation  
**Generator audited:** `scripts/generate_town_expansion_r1.mjs`  
**Captured generator SHA-256:** `37589d47df864163e1f54a6f689e9ef1b15dc324602c66f84d6b957fd39cdde3`  
**Design snapshot:** `data/worldsnap-town-expansion-expanded-baseline-20260728T0405Z/region`  
**Snapshot SHA-256:** `e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a`

## Executive decision

The coordinated package is not safe to preflight or execute yet. The current
generator does not complete, several newest scopes are not dispatched, and
multiple planning schedules contradict the geometry actually modeled.

This is not a judgment on the overall master plan. The large-campus layout,
deep Ravensgate exclusion, isolated library–Guild concept, owner estate, and
three distinct Westlight venue identities are all viable design directions.
The hold is caused by exact implementation defects that would otherwise create
flood exposure, inaccessible rooms, misleading counts, incomplete C01
migration, or destructive cross-scope overwrites.

## Immediate blockers

1. **The generator crashes before writing a report.** At the captured source,
   generation reaches report construction and throws:
   `RangeError: Maximum call stack size exceeded` in `boundsOf()`. The cause is
   `Math.min(...cells.map(...))` / `Math.max(...)` over a multi-million-cell
   scope. Replace all six spread reductions with one iterative bounds reducer.
2. **The newest civic function is dead code.**
   `modelCivicPavilionEastGrounds()` is defined but is not called by `main()`.
   Therefore the pools, fountain, monument, east allée, secret tunnel and its
   rooms are absent from the generated model.
3. **There is no observatory-estate/portal-gallery model and no Westlight
   three-venue model.** The existing `modelPenthouse()` is the Ravensreach Moot
   Hall penthouse at negative coordinates; it does not satisfy the new
   observatory estate request.
4. **The report readiness rule is insufficient.** `READY_FOR_PREFLIGHT`
   currently depends only on zero protected block-entity targets. It does not
   fail on direct water/lava targets, cross-scope overwrites, missing requested
   scopes, impossible routes, stale design authority, or final-state count
   failures.

## Data-campus audit

### Direct hydrology conflicts

An exact temporary compile of the unchanged data/warehouse functions against
the design snapshot found these source states inside current data-campus
targets:

| Scope | Water | Bubble columns | Lava |
|---|---:|---:|---:|
| `TE-IA-DATA-DM05` | 61 | 4 | 0 |
| `TE-IA-DATA-DM06` | 7 | 0 | 0 |
| `TE-IA-DATA-DM07` | 389 | 0 | 0 |
| `TE-IA-DATA-DM08` | 75 | 0 | 0 |
| `TE-IA-DATA-DM09` | 4 | 0 | 0 |
| `TE-IA-DATA-DM10` | 31 | 0 | 18 |
| `TE-IA-POWER-CAMPUS` | 0 | 0 | 22 |
| `TE-IA-OUTER-WAREHOUSE-A` | 99 | 0 | 0 |

The total is **666 direct water blocks, four bubble columns and 40 lava
blocks**. The source of most conflicts is the blanket
`model.box(..., 60, ..., baseY, ..., stone_bricks)` foundation strategy. A
surface parcel with no top-water columns is not proof that every cell between
`y60` and a `y90` slab is dry.

**Required fix:** remove blanket foundations. Use a newly censused stepped pad,
individual structural piers that stop at the first reviewed competent layer,
or shift the affected halls. A selected occupied prism must have zero direct
fluid states and a reviewed neighbor-fluid halo.

### Geometry and circulation defects

- `modelWarehouseRackRun()` hardcodes racks at `y51..59`. Both outer equipment
  warehouses have floors at `y75`, so their “computer gear” racks are
  underground, roughly 16–24 blocks below the buildings. Parameterize the rack
  floor and pass the warehouse floor elevation.
- The 40-row counter is a construction-loop counter, not a final-state proof.
  In each controlled-cage hall, the cage overwrites portions of four upper
  rack-row planes. Count surviving row identities after every override and
  require 40 walkable, visibly continuous row records per hall.
- Each data hall has one stair, despite the coordinate schedule requiring
  remote stairs and two transverse cross aisles per floor. Add a second remote
  protected stair and explicit row breaks/cross aisles.
- The staff lodge increments `lodgeBeds` once per 3-by-4 wool platform, has no
  room partitions, and has no stair or lift between its four floor plates. It
  is not a walkable 48-bed dormitory.
- The auditorium and cinema emit exactly 200 wool cells each, but have no
  center aisle, no integral accessible positions, and only block strips for
  risers. The “green room” and “projection/storage” additions are solid
  concrete volumes, not enterable rooms.
- The Info annex surface stair starts at approximately
  `(773,46,-498)` and ends near `(773,74,-442)`, while the DM10 threshold is
  near `z=-500`. Most of that stair leaves the declared access-core envelope
  (`z=-500..-476`), and its upper endpoint does not meet the DM10 door. Replace
  it with a contained switchback/shaft whose top and bottom landings touch
  their named thresholds.
- The annex partitions generated at `y46..51` extend above the annex roof at
  `y48`; the nominal `y45` floor consequently has only two clear blocks before
  the roof. Remove the unusable level or raise the proven dry envelope.

### Cross-scope defects

- The campus road overwrites **1,463 cells** of the power-yard boundary. It
  runs along and through the east fence without a designed gate.
- The road overwrites the southwest corner of DM03 rather than meeting its
  named entrance.
- The east-campus loop overwrites 70 cells of the venue back-of-house east
  wall.

**Required fix:** reserve exact gate/door openings first and treat any other
road-to-building overwrite as a release failure.

## MainStreet underground warehouse audit

The newest warehouse feasibility schedule and the generator are not the same
plan.

- The schedule rejects the broad west excavation and selects a dry high bay at
  `x32..88, y40..60, z200..296`.
- The generator still builds the earlier west hall at
  `x-112..-20, y50..61, z181..262`, then adds east pods at `y50..61`.
- The west-hall targets include 70 bubble columns, 362 kelp-plant cells, 312
  seagrass cells, 252 tall-seagrass cells, 43 kelp cells, six magma blocks,
  3,338 sand cells and 1,667 gravel cells. This is an aquatic column, not a
  dry high bay.
- All three “remote exit” boxes are too short for their stairs. For example,
  the NW shaft ends at `z181`, while its straight stair continues to about
  `z197`. The stair leaves its liner and enters raw ground.
- The generated vehicle ramp is the kind of wet approach the feasibility
  study explicitly rejects.
- The E2 pod lies only two blocks above the known source-water seam at
  `x114..117, y48, z232..233`; this violates the schedule's five-block review
  halo.
- The generated recovered pods stop around `z262`, while the later reservation
  extends the south wing to `z296`.

**Required fix:** select one warehouse authority. The defensible choice is the
later dry-core schedule. Delete the wet west hall/ramp from this release,
re-site the operational high bay to the proven dry prism, use contained
switchback exits, keep `y62..64` untouched, and open each east wing only after
its shell and fluid halo pass.

## C01 relocation and parking audit

### Conflicting source-of-truth schedules

Two incompatible decisions are present:

- `c01-east-relocation-coordinate-schedule.json` reserves a dry C01 rebuild at
  approximately `x700..900`, with the current generator using the northern
  `x797..888, y20..52, z-140..-85` module.
- `northeast-datacenter-c01-relocation-engineering.json` recommends the compact
  `x325..388, y0..45, z205..265` shell.

The generator combines the first C01 choice with warehouse geometry from the
second artifact, while its data campus comes from a third, larger ten-hall
schedule. Publish an explicit supersession record and retain only one
coordinate authority per subsystem.

### Current C01 geometry defects

- The new main module is directly dry, but contains 2,175 gravity-sensitive
  cells. Staged support and neighbor-fluid checks remain mandatory.
- The C01 road deck itself is dry, but its blind piers from `y40` upward target
  **647 water/bubble cells, three lava cells and 311 gravity-sensitive cells**.
  Stop each pier at reviewed competent ground; never drive every twelfth pier
  blindly to `y40`.
- The west access and portal volumes are directly dry, but the main inner
  airlock door is placed at `z=-91`, outside the connector whose minimum is
  `z=-86`.
- The generated double doors never close the full corridor cross-section.
  Players can walk around the two door blocks inside the seven- to nine-wide
  passages. Add a full bulkhead wall with only the paired door openings, then
  place two separated bulkheads around a clear holding vestibule.
- The independent east egress is a reinforced-deepslate shaft rising to
  `y82`. It has no concealment landform and can visibly daylight, contradicting
  the zero-exposed-shell requirement.
- The module has 12 broad program rooms, not a demonstrated one-to-one
  recreation of all 36 C01 database objects and semantic routes.

### The old C01 is not actually moved

`modelFullParkingRecovery()` clears only the old C01 surface intrusion inside
`x100..125, y71..100, z172..235`. It does not migrate and retire the full old
C01 program. Both old and new complexes would remain.

The accepted source census contains 1,896 block entities, 12 non-empty
inventories, 5,132 items and 36 database objects. These require a migration
ledger and a commission-before-retire sequence. The owner observatory,
penthouse, hangar, shelter and grand vault belong to the sibling
`DIV-C01-SURFACE` tree even though they overlap the broad C01 envelope. Never
decommission the old complex by clearing its bounding box; retire only
object-owned C01 cells after independent estate support exists.

The parking surface itself hits only three known signs in the design snapshot,
and the generator attempts to preserve them. That does not authorize parking
completion before the old C01 subtree has been reconciled and retired.

## Westlight three-venue audit

No Westlight three-venue function is present in the generator. The waterfront
work does not implement the Blue Drum entrance, Lantern Studio, backstage
rooms, basements, dock, freight lift or service road.

The planning schedule also needs these corrections before implementation:

- The Blue Drum vertical core is bounded at `y40..70` but claims route levels
  `y40`, `y29` and `y18`. Either extend the protected core to `y18` or identify
  and prove the existing internal stairs used below `y40`.
- Lantern's audience floor and rear bar overlap at
  `x-408..-404, y35..39, z-557..-553`—125 program cells. Shrink the audience
  reserve to a true 40–60-seat arrangement with two aisles, or move the bar.
- The service spur still states that pile/causeway segments may be needed.
  It needs an exact width-buffer surface/fluid census before it can become
  operations.

The deep B1/B2 boxes, dungeon exclusions, dock parcel and fixed pier/crater
separations are otherwise internally coherent at planning level.

## Pavilion east grounds and Ravensgate audit

The underground separation concept is sound: the restricted Ravensgate object
ends at `y35`, its hard buffer ends at `y43`, and the civilian
library–Guild tunnel is at `y58..64`. That leaves 14 untouched levels
(`y44..57`) between the buffer and tunnel floor. Keep the restriction sealed;
no Ravensgate entrance is authorized in this package.

The surface/tunnel implementation has four blockers:

1. The south reflecting pool at
   `x-58..-32, y66..70, z-417..-406` overlaps the actual Guild Hall, whose
   generated envelope/roof reaches `z=-408`. Shift the pool south into a newly
   surveyed reservation or rotate it to an east/west framing position.
2. Statues at `(-28,-456)` and `(-28,-428)` are inside the Guild Hall.
   Move them outside the actual `x-60..-6, z-463..-408` envelope.
3. The westward monument steps enter the Guild Hall around
   `x-10..-7, z-447..-440`. Turn the steps and accessible approach east or
   south.
4. The tunnel's three south rooms are sealed by their `z=-435` hollow walls;
   no doorway is cut from the main gallery. The endpoint doors are also placed
   along the gallery's south wall rather than across the west/east endpoint
   openings. Cut one controlled doorway per room, and build real closable
   endpoint vestibules in full cross-section.

The lawn exclusion should use the actual Guild Hall outer bounds
`x-60..-6, z-463..-408`, not the smaller protected-interface rectangle.

## Observatory mega-estate and inactive portal gallery audit

No estate implementation exists yet. The planning schedule correctly calls
for an independent podium before C01 retirement, but these exact conflicts
remain:

- The full estate reservation at `x145..275, y75..150, z100..225` contains
  1,058 current block entities in the design snapshot. Three are non-empty,
  with 1,292 items in total. The narrower support study's 784 count must not be
  mistaken for the whole-estate ledger.
- The hidden entry at `x211..219, y104..114, z145..155` overlaps the current
  penthouse safe room/vestibule, while the proposed “owner library” is in the
  east wing at `x233..270`. Move the celestial-bookcase trigger into the
  proposed library or explicitly redesign and re-register the current safe
  room.
- The portal-gallery overall reservation includes `y75..76` at
  `x230..262, z184..190`, intersecting the existing grand-vault upper roof.
  Keep all portal construction at `y78+` there and add the vault roof as an
  exact no-target object.
- One existing sign at `(237,91,187)` requires an NBT disposition.
- Every offline destination needs a full-width two-door vestibule; two isolated
  door blocks in a wider corridor do not satisfy that requirement.
- Final acceptance must enumerate zero `nether_portal`, `end_portal`,
  `end_gateway` or activation mechanism cells.

## Required release order

1. Fix generator completion and make all requested scope dispatch explicit.
2. Freeze one authoritative coordinate schedule per subsystem.
3. Resolve every cross-scope collision listed above.
4. Rebuild data foundations and warehouse access around exact fluid/gravity
   censuses.
5. Build and commission the new C01 while the old C01 and owner estate remain
   untouched.
6. Build independent owner-estate support and reconcile all estate/C01 NBT.
7. Migrate C01 objects and inventory; then retire only owned old-C01 cells.
8. Complete P01 and the separately accepted dry warehouse wings.
9. Generate a fresh same-moment snapshot, exact forward/rollback operations,
   strict-noop preflight, entity clearance, post snapshot, route tests and
   matched media.

Until every failed gate in the companion matrix is closed, the release status
must remain `BLOCKED_DO_NOT_RELEASE`.
