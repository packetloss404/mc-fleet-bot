# MainStreet Guest Services, Work Club and Roof House

## Independent survey and design review

**Artifact:** `MSA-B01-GUEST-SERVICES-ROOFTOP-WELLNESS-DR-2026-07-28`  
**Decision:** design review complete; structural and water hold; no live release authorized  
**Survey time:** 2026-07-28T04:25:44Z

This memo turns the current `B01` Guest & Design Center into a precise,
reviewable proposal for a much more useful Guest Services building: visitor
orientation, coworking, food and social space, upper patios and gardens, a
controlled adult wellness floor, a hot-tub lounge, and a rooftop pool and bar.
It also resolves the planned employee-lounge connection as a coordinated
dependency.

The proposal is intentionally ambitious, but the survey found one decisive
constraint: the current building has a complete roof slab and a complete
foundation plate, yet **all 420 continuous foundation-to-roof columns are on
the perimeter and there are zero continuous interior columns**. Two new
occupied stories and a rooftop pool therefore cannot be treated as decorative
fitout. A separately generated, independently checked support transaction must
pass before any upper occupancy or water is authorized.

The private adult areas are tasteful and non-graphic. The proposal uses
access control, privacy vestibules, acoustic separation, a red/dark material
palette, bed/lounge furniture, concealed storage, decorative swing or hammock
frames, wash/cleanup support and screened circulation. It does not prescribe
explicit imagery or graphic details.

## 1. Immutable source and scope

The review read only:

- `data/worldsnap-town-expansion-complete-baseline-20260728T0315Z/region`
  — SHA-256
  `0bb1faa61ca69724816afe682080e3a517fa974ec1300c3651e399ea03505501`,
  9 Anvil region files, 59,287,653 bytes; and
- `data/world-map.db` — SHA-256
  `1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`,
  2,547,712 bytes, opened read-only.

No Minecraft connection, RCON command, database write, world edit or service
restart was made.

The machine-readable coordinate contract is
`mainstreet-guest-services-rooftop-wellness-design-review.json` beside this
memo.

## 2. Exact database identity

The selected feature is:

| Field | Value |
|---|---|
| Database ID | `wft_c95d5ccedf49cb25` |
| Project / external ID | `mainstreet-america` / `B01` |
| Name | Guest & Design Center |
| Kind / status | building / complete |
| Exact database bounds | x `-72..72`, y `63..80`, z `90..165` |
| Completion / condition | 1.0 / 100 |
| Source | `mainstreet-america/qa/audit-final-2026-07-26.json` |

The feature has no direct child-room records in the current database. The
expanded design should eventually import separate child features for every
floor, vertical core, pool, wet plant, employee connection and controlled
adult zone. It must not overwrite the accepted B01 record before the post-state
reconciliation succeeds.

The review envelope also intersects broad records for the Arrival and Visitor
Campus, its white picket boundary, Main Street and the removed historic campus
fence. The `RR-T2b` South Personnel Tunnel has a two-dimensional database
overlap, but its known route is far below the B01 work envelope. A same-moment
release survey must still prove vertical separation rather than relying on the
2D index.

## 3. What is actually there

### 3.1 Foundation and floors

Every one of the 11,020 footprint columns is solid at y62, y63 and y64:

| Layer | Condition |
|---|---|
| y62 | 11,020/11,020 `stone_bricks` |
| y63 | 11,020 solid: 9,728 stone brick, 836 gray concrete, 304 smooth stone, 152 yellow concrete |
| y64 | 11,020 solid; mixed finished floors led by smooth quartz, dark oak, oak, light-gray concrete, white concrete and polished andesite |

The current first floor is clear/fitted at y65..69. The second-floor slab is
y70: 9,544 solid cells and a 1,476-cell central void. The clear second-floor
volume is y71..75. That void is a real part of the building's spatial
organization and should become an atrium with controlled bridges, not be
blindly filled.

### 3.2 Roof

The current roof condition is unusually clean:

- y76 is a complete 11,020-cell `smooth_stone` slab;
- y77 contains only 145 `smooth_quartz_slab` cells;
- every cell from y78 through y110 is air within the B01 footprint;
- there are no fluid states from y63 through y110; and
- there are no gravity blocks from y62 through y110.

This is a dry, complete geometric platform. It is **not** proof that the
platform can carry two occupied levels, gardens, a pool and public assembly
loads.

### 3.3 Support finding

The snapshot contains 420 columns that remain solid from y62 through y76.
Every one is on the perimeter. There are **zero** continuous interior columns.

That result changes the release strategy:

1. reserve and test an internal support grid;
2. build exact vertical cores and load paths as their own reversible release;
3. prove them against a post snapshot;
4. only then add dry upper shells;
5. fit out dry rooms;
6. construct empty basins; and
7. place water last.

### 3.4 Existing circulation

The only vertical stair observed above the first floor is a five-block run:

`(-24,65,109) → (-24,66,110) → (-24,67,111) →
(-24,68,112) → (-24,69,113)`.

There are no ladders. The only exterior door set found in the building census
is the south double door at x `-1..0`, y `65..66`, z `165`.

That is not an adequate circulation concept for four occupied floors and an
occupied roof. The proposal therefore reserves four separated vertical cores,
two accessible lifts, multiple direct discharges and a continuous public
spine.

### 3.5 Protected block entities

Fifteen empty-inventory kitchen block entities sit at y65, z95:

- smokers at x `-67..-63`;
- furnaces at x `-61..-57`; and
- barrels at x `-55..-51`.

Their exact states and complete NBT remain protected. A later design may retain
them in place or move them through a reviewed NBT-preserving migration, but it
may not erase or casually replace them.

### 3.6 Subfloor cautions

The occupied building is dry, but the deeper census found waterlogged natural
cells at `(-3,51,146)` and `(-12,53,129)`, plus gravel in the lower geology.
Underpinning below y62 therefore requires a fresh neighbor-fluid and gravity
census. The complete surface plate must not be mistaken for permission to
blindly drill into the terrain.

## 4. Employee lounge and staff path: planned, not existing

The selected immutable snapshot contains natural terrain—not a building—at the
planned employee lounge. The town-expansion generator proposes:

| Element | Exact contract |
|---|---|
| Employee lounge | x `-94..-73`, y `64..76`, z `90..121` |
| Staff greenway destination | `(-82,65,90)` |
| B01 wall connection | x `-73..-72`, y `65..68`, z `103..105` |

The source parcel has zero block entities and zero fluids. At the proposed wall
join, `(-73,65,103)` is air, `(-72,65,103)` is smooth quartz, and the B01 wall
at `(-72,66,104)` and `(-72,68,105)` is tinted glass.

This distinction matters. The lounge and greenway are a dependency package,
not as-built infrastructure. B01, the greenway and the lounge must be rebased
onto one same-moment prerelease snapshot. The connection opens only after both
the greenway and the lounge independently pass.

## 5. Research translated into design

The design uses public primary and government technical sources as planning
precedents:

- [Cape Cod National Seashore visitor centers](https://home.nps.gov/caco/planyourvisit/visitorcenters.htm)
  combine staffed trip planning, exhibits, films, a store, restrooms,
  accessible media and outdoor observation. B01's first floor follows that
  coherent orientation sequence.
- The National Park Service's
  [Wayside Exhibit Planning](https://www.nps.gov/subjects/hfc/wayside-exhibit-planning.htm)
  places orientation where the need to know meets the need to explain. B01's
  map, program board and exterior information start at arrival rather than
  appearing deep inside.
- [GSA commercial coworking](https://origin-www.gsa.gov/real-estate/workplace-optimization/offerings/commercial-coworking)
  mixes open and reservable workspaces, offices, conference rooms, kitchens,
  restrooms and support. B01's second floor provides all of those settings
  around the retained atrium.
- GSA's
  [2024 P100 facilities standards](https://www.gsa.gov/real-estate/facilities-standards-for-the-public-buildings-service)
  treats architecture, accessibility, structure, fire protection, enclosure
  and building systems as coordinated disciplines. The B01 support, water,
  routes and envelope therefore release separately but reconcile together.
- The Department of Justice
  [2010 ADA Standards](https://www.ada.gov/law-and-regs/design-standards/2010-stds/)
  require continuous accessible routes between arrival, occupied levels and
  amenities, and accessible entry to pools and spas. Both lifts, the roof deck
  and the aquatic entries stay in the acceptance contract.
- The CDC
  [Model Aquatic Health Code](https://www.cdc.gov/mahc/index.html) treats pool
  and hot-tub safety as design, construction, operations, maintenance, staff
  and water-quality work—not simply a water vessel. B01 reserves separate wet
  plant, inspection and dry circulation.
- OSHA's
  [exit-route standard](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36)
  calls for permanent, adequately separated, remotely located routes with
  sufficient capacity and direct discharge. The proposal uses four cores and
  does not count the private staff link as public egress.
- OSHA's
  [fall-protection criteria](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.29)
  inform occupied roof-edge, stair and opening protection. Every terrace and
  roof route receives a guard contract.
- The Whole Building Design Guide's
  [vegetative-roof guidance](https://stg.wbdg.org/resources/extensive-vegetative-roofs)
  requires coordinated waterproofing, protection, drainage, root barrier,
  growing medium and wind/load review. B01's roof gardens are complete roof
  assemblies, not dirt placed on a slab.
- WBDG's
  [waterproofing integrity guidance](https://legacy.wbdg.org/resources/integrity-testing-roofing-and-waterproofing-membranes)
  warns that water testing itself can exceed safe load or cause damage. B01's
  basins are divided, inspected dry and filled only in a separately reversible
  final transaction.

These are planning translations for a fictional Minecraft build. A real
project would require the locally adopted code, registered design
professionals and permits.

## 6. Exact proposed program

### Level 1 — y64 floor, y65..69 clear

Level 1 stays fully public and immediately useful:

- arrival/reception: x `-34..34`, z `148..163`;
- west visitor services: x `-70..-38`, z `132..163`;
- east exhibits/retail: x `38..70`, z `132..163`;
- retained production kitchen/BOH: x `-70..-38`, z `92..125`;
- cafe/dining: x `-35..-4`, z `92..125`;
- public social living room: x `4..35`, z `92..125`;
- orientation studio: x `38..70`, z `92..125`; and
- staff connection/service corridor: x `-72..-28`, z `101..107`.

Reception includes a map, accessible counter, program board and direct view to
the main circulation. Visitor services includes trip planning, accessibility,
first aid, family care and lost-and-found. The west service corridor connects
to the planned employee lounge without becoming a public shortcut.

### Level 2 — y70 floor, y71..75 clear

The second floor is the work club:

- west open cowork: x `-70..-24`, z `92..125`;
- east reservable cowork: x `24..70`, z `92..125`;
- quiet work/reference library: x `-70..-24`, z `132..163`;
- meeting/training suite: x `24..70`, z `132..163`; and
- protected atrium: x `-20..20`, z `110..145`.

Open team settings and social work areas are kept apart from quiet work and
private conversations. Two deliberate bridges cross the atrium; a blanket
floor fill is prohibited.

### Level 3 — y76 floor, y77..82 clear

The new third level sets back to x `-60..60`, z `98..157`, preserving the
long lower façades and creating patios on the existing slab:

- display/event kitchen: x `-58..-30`, z `100..125`;
- great social hall: x `-27..27`, z `100..132`;
- club/private dining: x `30..58`, z `100..132`;
- event lounge: x `-38..38`, z `135..155`;
- isolated hot-tub plant: x `-58..-42`, z `142..156`;
- north patio: z `90..97`;
- south patio: z `158..165`; and
- west/east gardens: x `-72..-61` and `61..72`.

The patios and gardens get a real membrane/drainage/root-barrier contract and
remain dry until the roof assembly passes.

### Level 4 — y83 floor, y84..89 clear

Level 4 is a controlled 18-plus hospitality and wellness floor, enclosed within
x `-60..60`, z `98..157`.

The access-control reception is x `-18..18`, z `142..156`. There is no direct
public sightline through it. The west side contains a general wellness suite,
a separately screened clothing-optional lounge and a three-tub hot-tub room.
The east side contains an adult quiet commons and four private red
rooms/wellness suites.

The three hot-tub water cells are bounded:

- x `-53..-49`, y `85..86`, z `146..150`;
- x `-44..-40`, y `85..86`, z `146..150`; and
- x `-35..-31`, y `85..86`, z `146..150`.

Every adult area has a privacy vestibule, accessible route, staff call point
and emergency egress that cannot be defeated by age-control hardware.

The four private red rooms are:

| Suite | Exact bounds |
|---|---|
| RED-A | x `26..40`, y `84..89`, z `128..140` |
| RED-B | x `42..56`, y `84..89`, z `128..140` |
| RED-C | x `26..40`, y `84..89`, z `143..154` |
| RED-D | x `42..56`, y `84..89`, z `143..154` |

Their shared design language is red, burgundy, oxblood, dark oak and charcoal.
Each receives bed/lounge furniture, concealed adult-item and general storage
cabinetry, a decorative swing or hammock frame, wash/cleanup support, acoustic
separation and a two-door privacy vestibule. Evidence images show architecture
and circulation only; no explicit imagery or graphic detail is allowed.

### Occupied roof — y90 deck

The occupied roof envelope is x `-60..60`, y `90..102`, z `98..157`:

- bar: x `-58..-20`, y `91..98`, z `104..130`;
- roof garden: x `-58..-20`, y `91..98`, z `134..154`;
- dining deck: x `-18..8`, z `100..154`;
- pool deck: x `8..58`, z `104..146`; and
- isolated pool plant: x `50..58`, y `91..98`, z `104..143`.

The pool water is bounded by x `12..48`, y `92..94`, z `108..140`.
Its primary basin is x `9..51`, y `90..95`, z `105..143`. A dry secondary
catch/inspection envelope extends to x `7..53`, y `90..96`, z `103..145`.
That outer coordinate box denotes the perimeter curb, catch trench and
inspection zone—not a solid fill.

The accessible entry planning zone is x `12..18`, y `92..94`, z `108..116`.
The final release must implement a compliant means of entry in the project
design vocabulary and retain dry deck circulation around it.

## 7. Circulation and egress

The main public spine is x `-3..3`, z `90..165`; the major cross-spine is
z `126..132`. Four vertical cores are reserved:

| Core | Bounds | Role |
|---|---|---|
| A | x `-30..-18`, z `106..120` | main stair, accessible lift, current-stair replacement |
| B | x `-70..-58`, z `146..160` | remote west stair and discharge |
| C | x `58..70`, z `146..160` | remote east stair and discharge |
| D | x `58..70`, z `94..108` | service stair, second lift, north/east discharge |

All extend from y64 through y100. No ladder, water elevator, trapdoor or
decorative stair counts as a primary route. At least two remote routes must
serve every occupied level and roof. Exit capacity may not decrease toward
discharge.

## 8. Preliminary support grid

The study reserves a 45-line grid at:

- x `{-64,-48,-32,-16,0,16,32,48,64}`; and
- z `{96,112,128,144,160}`.

The y50..90 exact-state review found gravel on four lines. The reserved study
grid therefore makes four local adjustments:

| Remove | Reserve |
|---|---|
| `(48,96)` | `(50,96)` |
| `(64,96)` | `(63,96)` |
| `(32,128)` | `(32,127)` |
| `(32,160)` | `(32,162)` |

The adjusted 45 lines contain zero decoded fluid or gravity cells from y50
through y90 and collide with none of the 15 block entities. This is useful
survey evidence, but it is **not** structural certification or an authorized
operation. A later support design must resolve current room/furniture
conflicts, establish exact foundations and produce an exact inverse.

## 9. Water and enclosure rules

The pool and hot tubs release last:

1. support and vertical cores pass first;
2. dry upper shells and guards pass;
3. dry floor fitouts pass;
4. primary and secondary basins are built empty;
5. plant rooms, drains, catch zones and rollback pass;
6. only then are source-water cells placed in a separate transaction.

Any drift involving neighbor fluids, waterlogged states, gravity blocks,
entities, block entities or protected features aborts the release. A pool that
does not leak in Minecraft is not proof of real structural or aquatic safety.

## 10. Atomic package plan

The release should be decomposed into independently reversible packages:

1. same-moment immutable prerelease snapshot and database hash;
2. matched before media and object census;
3. support and vertical-core transaction;
4. post-support snapshot and independent route/load-path verification;
5. dry upper shells, roof guard and enclosure;
6. employee greenway and lounge, independently accepted;
7. guarded west-wall staff connection;
8. dry public, cowork, hospitality and adult fitouts;
9. empty pool/hot-tub basin and wet-plant transaction;
10. final water transaction;
11. full bidirectional public/staff/accessible/emergency route QA;
12. matched after media; and
13. database child-feature import and reconciliation.

The original B01 database feature and every source artifact remain until the
new child-feature set, media, routes and rollback all reconcile.

## 11. Acceptance checklist

- [ ] New immutable snapshot and database hashes match the release manifest.
- [ ] All 15 B01 block entities have exact before-state/NBT evidence.
- [ ] Support grid and all four cores have exact forward and inverse operations.
- [ ] No unresolved fluid, waterlogged, gravity, entity or feature collision.
- [ ] B01 has at least two remote routes from every occupied level and roof.
- [ ] Every occupied level and aquatic amenity has an accessible route.
- [ ] Lounge and greenway exist before the B01 staff wall opens.
- [ ] The y70 atrium remains deliberate and safely bridged.
- [ ] Roof edges, terraces, stairs and openings have complete guards.
- [ ] Roof garden assembly has membrane, protection, drainage and root barrier.
- [ ] Pool and hot tubs pass empty-basin inspection before water placement.
- [ ] Pool plant and hot-tub plant remain outside guest circulation.
- [ ] Adult areas have age control, privacy vestibules, acoustic separation and
  unobstructed emergency egress.
- [ ] Adult-area fitout and media remain tasteful and non-graphic.
- [ ] Every public, staff, accessible and emergency route passes both directions.
- [ ] Matched before/after images use fixed cameras and exact object IDs.
- [ ] Database child records import only after the accepted post snapshot.

## 12. Bottom line

B01 is an excellent base for a dramatically better Guest Services building.
It already has a full foundation plate, two fitted floors, a valuable atrium,
a verified south arrival and a complete dry roof. The correct move is not to
discard that work. It is to use it as the podium for two set-back levels and a
roof house.

But the pool is not ready to build. The absence of interior continuous support
is an objective stop condition. Finish the support and egress release first,
coordinate the employee lounge and path second, complete dry upper levels
third, and add water only after the empty containment system proves itself.
