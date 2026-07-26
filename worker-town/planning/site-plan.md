# Worker Town — Site Selection

**Status: BUILD-OUT COMPLETE.** Site chosen · grove + mine planted · Town Hall built ·
town founded · 5 residents enrolled · `protectedZones` applied · stray TownBrain build
demolished · **brain RUNNING** (§8) · **5 cottages + storehouse + plaza + paths built and
registered with the brain** (§9).
Remaining, both awaiting the LLM coming back: flip `mineSite` north once the fleet
actually works up here (§3.1), and delete the phantom `well` row (§8).
**Date:** 2026-07-24.

The third build in this world, distinct from the other two:

| Build | What it is | Where |
|---|---|---|
| **MainStreet America** | surface attraction, a reconstruction | envelope `x,z ∈ [-300,+300]`, base y64 |
| **Raven Rock** | underground complex | beneath MSA, y40 and below |
| **Worker Town** *(this)* | where the bot fleet actually **lives and governs** | **north of the envelope** |

Worker Town is not part of the attraction. It is the fleet's home: housing for the five
bots, and the **Town Hall** that anchors the governance layer.

---

## 1. The decision

**Operator direction (2026-07-24): outside the envelope, north of it.** North is `-Z`, per the
MSA site-plan compass.

**Chosen site — centre `(-85, 67, -375)`, footprint `x ∈ [-130, -40]`, `z ∈ [-415, -335]` (91 × 81).**

Build platform **y = 67**.

## 2. Why here — the survey

Terrain north of the envelope **did not exist** before this survey. Every probe beyond
`z ≈ -320` returned chunk-not-loaded, because nothing has ever been there. The region was
force-loaded to generate it, surveyed, then released (`forceload remove all` — the chunks
remain generated on disk but are no longer pinned in memory).

Method: `scripts/mc_admin.py`'s SSH+RCON channel, reused across one session. Surface height per
column by **binary search on "is air"** (`execute if block <x> <y> <z> minecraft:air run time
query gametime`), then the surface block classified against `#minecraft:leaves`,
`#minecraft:logs` and `minecraft:water`. **Read-only** — nothing mutating was issued.

Two passes, **1,563 probes total**:

1. **Coarse** — `x ∈ [-150,150]` step 25, `z ∈ [-320,-460]` step 25 (853 probes).
2. **Fine** — `x ∈ [-160,-40]` step 15, `z ∈ [-330,-420]` step 15 (710 probes).

Fine-pass heightmap (rows = z north→south, cols = x west→east; `W` = water, `T` = tree):

```
         -160   -145   -130   -115   -100    -85    -70    -55    -40
  -330     63     68     69     68     72     70     71     69     70
  -345     63     66     70     66     63     68     68     69     70
  -360     62     63     67     64     65     67     68     67     69
  -375     62     63     68     67     66     66     67    --?     71
  -390     62     62     66     70     67     67     67    62W     69
  -405     62     63     67     72     71     65     67     68    73T
  -420    62W     88     92     76     68     63     66     67     67
```

Ranked by flatness, the best 45×45 window centres on **`(-85,-375)`: y 65–68, range 3, σ 0.8,
zero water, zero trees** — the flattest non-water ground found anywhere north of the envelope.

**The `z = -420` row is deliberately excluded** from the footprint: it carries an 88/92 hill at
`x = -145/-130` that would cost ~25 blocks of cut in one corner for no benefit.

### Earthworks

Across the chosen footprint (34 sampled columns, y 62–73, mean 67.6, σ 2.4):

| Platform | mean cut | mean fill | est. block-ops |
|---|---|---|---|
| y = 66 | 1.88 | 0.32 | ~16,300 |
| **y = 67** | **1.15** | **0.59** | **~12,800** |
| y = 68 | 0.71 | 1.15 | ~13,700 |

**y = 67 is the cheapest platform.** ~12,800 block-ops is trivial next to MSA's millions —
comfortably a single `/fill` session.

> ⚠️ **Confidence:** this is a **34-column sample on a 15-block grid**, interpolated across a
> 91×81 site. It is enough to choose a site and a platform height; it is **not** a
> block-accurate excavation plan. Expect surprises between sample points — re-probe at 5-block
> resolution before cutting, and treat the earthworks figure as ±50%.

## 3. Clearances

| Against | Distance | Status |
|---|---|---|
| Envelope north edge (`z = -300`) | 75 blocks north of it | ✅ fully outside, as directed |
| **N4 portal approach** (`x ∈ [-15,+15]`, `z ∈ [-300,-270]`) | 25 blocks clear in x; 124 to the portal | ✅ site stops at `x = -40` |
| MSA / Raven Rock geometry | 385 blocks to origin | ✅ no interaction in any axis |
| World spawn `(-9, 76, -10)` | 373 blocks | walkable, far |
| **Communal `mineSite` (80,64,42)** | **448 blocks** | ⚠️ see below |
| **Oak grove (x18–50, z42–54)** | **439 blocks** | ⚠️ see below |

> ⚠️ **Open issue — the town is ~450 blocks from both resource anchors.** The `mineSite` and the
> planted oak grove both sit *south-east* of MSA, chosen back when the fleet worked out of spawn.
> With the town up north, every ore and wood task becomes a ~450-block round trip, and long
> traversal is exactly what the dig-floor and leash guards were added to suppress.
>
> Not a blocker for siting, but it needs resolving before the fleet actually lives here. Options:
> **(a)** plant a second grove and site a second mine just outside the town — cheap, and mirrors
> what `mineSite` is for; **(b)** move `mining.mineSite` north entirely and let MSA-area work
> travel instead; **(c)** leave it and accept the commute.
>
> **Operator chose (a), 2026-07-24 — both are now built. See §3.1.**

### 3.1 Northern grove and mine — BUILT 2026-07-24

Both placed by RCON (`/setblock` + `/fill`) with the work area force-loaded and released
afterwards. 305 RCON commands.

**Oak grove — `x[-125,-59]`, `z[-332,-314]`, 17 trees.** Sited **south of town**, in the strip
between the town's south edge (`z = -335`) and the envelope's north edge (`z = -300`), so it sits
on the natural route between the fleet's home and MSA. Trees are **built geometry** (5-block
`oak_log` trunk, 5×5 `oak_leaves` slab, 3×3 cap), not saplings — saplings need random ticks and
light to grow, which is slow and not verifiable in one pass. Six trunks were probe-verified
present at ground+2.

- **17 of 18 planted.** The column at `(-101,-314)` returned no surface and was skipped.

> **AMENDED 2026-07-25 — the grove is a CROP, not scenery, and 8 trees remain.**
> A world audit found **9 of the 17 gone — logs *and* leaves — on the half nearest
> town** (every absent column is x ≥ −89; every surviving one is x ≤ −95), with five
> bots idle in the plaza. Logs *and* leaves both absent is the signature of removal
> followed by leaf decay, not of a partial build. **The fleet harvested them**, which
> is the system working as designed while the town logs repeated wood requests.
>
> Ratified decision (`docs/DECISIONS-2026-07-25.md`, Ravensreach Q1): **accept and
> de-register.** Do not rebuild in place — that just feeds the same loop. The grove is
> therefore **8 trees and shrinking**, and is deliberately excluded from
> `mining.protectedZones` so the bots may keep taking it.
>
> Note the corroborating detail, which is its own lesson: the build script only ever
> verified `planted[:6]`, and in `GROVE` iteration order that is exactly the x=−125 and
> x=−113 groups — **the trees still standing are precisely the ones that were verified.**
- ⚠️ **The grove is not on level ground.** Most trees sit at y67–72, but three are far lower:
  `(-71,-323)` at **y55**, `(-65,-314)` at **y57**, `(-89,-314)` at **y64**, against neighbours at
  69–72. A 14-block drop between adjacent columns means a **ravine or cave opening** runs through
  the grove's east end. Harmless for harvesting — the trees are real and reachable — but do not
  assume this strip is flat, and survey it before putting anything else there.

**Mine — centre `(-85, 64, -440)`, radius 20** (`x[-105,-65]`, `z[-460,-420]`). Sited **north of
town**, ~110 blocks from the grove, keeping the same discipline as the original south-east pair:
*mining never eats the trees*. Built with a 9×9 `stone_bricks` apron, a 3×3 collar, a starter
shaft cut to y58, and a torch ring. Shaft verified open at y61.

> ⚠️ **`mineSite` is SINGULAR and has NOT been repointed.** `geofence.ts:52` types it
> `mineSite: MineSite | null` — the config supports exactly **one** communal mine, not a list. It
> still points at the original **(80, 64, 42)** beside MSA.
>
> This is deliberate. The fleet does not live in the north yet; repointing now would simply invert
> the problem, giving every MSA-area ore task a ~450-block trek. **Flip it when the town is
> actually occupied**, by editing `config.yml`:
>
> ```yaml
> mining:
>   mineSite:
>     x: -85
>     y: 64
>     z: -440
>     radius: 20
> ```
>
> Requires a **restart**, not a PATCH: `FIELD_TYPES.mining` types only `minDigY`, so `validatePatch`
> would silently drop this, and `geofence.ts` memoises the whole `mining` section per worker thread.
>
> Supporting both mines at once is a code change (`mineSite` → a list, with nearest-site selection
> in `routeToMineBlocks`). Worth doing if the fleet ends up working both ends of the map, but it is
> not needed to occupy the town.

## 4. Town Hall — BUILT 2026-07-24

Operator chose **hand-build the hall, found the town paused**.

**Hall: 25 × 13, `x[-97,-73]`, `z[-381,-369]`, floor y67.** Walls y68–73, gabled roof ridging at
**y80**. Style **medieval-communal** — matched deliberately to the `stylePreset` the town was
founded with, so anything the TownBrain later designs sits beside it coherently.

- Stone-brick shell with spruce-log corner posts and wall plate; glass-pane windows on all four
  elevations.
- **Double spruce door on the SOUTH face**, facing the grove and the route down to MSA.
- Interior: a 13 × 3 spruce council table down the centre, benches either side, and a **lectern on
  a stone-slab dais at the north head** — the mayor's position. Hanging lanterns.
- A bell over the door outside.
- **41 × 41 plaza pad** levelled to y67 around it, stone-brick apron next to the hall, grass beyond.

Built by `scripts/build_town_hall.py` over RCON — 91 commands, every `/fill` volume-checked and
auto-split against the server cap. **6/6 post-build probes passed** (pad, floor, corner post,
hollow interior, roof ridge, lectern).

## 5. Town founded — PAUSED

```
id            town_mrzgshth_9d12c17d
name          Ravensreach
capital       (-85, 67, -375)          <- the hall
styleSeed     medieval-communal
mayorTitle    Mayor
mayorPlayer   packetloss404
paused        true
```

**`data/town.db` now holds its first rows ever** — `towns: 1`, `districts: 1` (the auto-created
"Old Town" 64×64 around the capital), `events: 3`, `chronicle_entries: 1`. Every table had been
empty since the schema was created.

**Paused immediately after founding**, inside the first 60-second tick, because `createTown` calls
`startBrain` straight away and there is no supported way to tell the brain "the hall already
exists". While paused, `demandLoop`, `roleLoop`, `scheduleLoop`, `approvalLoop` and greetings are
all frozen — residents genuinely idle. **It must be resumed for governance to run at all.**

> The name **Ravensreach** was chosen here, not specified. Rename freely:
> `PATCH /api/towns/town_mrzgshth_9d12c17d -d '{"name":"..."}'`.

## 6. Still to do

- **Enrol the five bots as residents.** Valid roles are `lumberjack | miner | farmer | blacksmith |
  builder | guard | gatherer | idle` — `architect`, `surveyor`, `steward`, `scout` and `explorer`
  are **not** valid and the route 400s. The founding tier target is `{lumberjack:1, farmer:1,
  guard:1}`, and `roleLoop` reassigns anyone left `idle`. This is also the **anti-wandering
  switch**: a resident with a non-idle role idles instead of running the roaming curriculum.
- **The `protectedZones` muster box**, now that the footprint is real:

  ```yaml
  mining:
    protectedZones:
      - name: worker-town-hall
        minX: -105
        minY: 43          # NOT a typo -- see the offset note below
        minZ: -395
        maxX: -65
        maxY: 95
        maxZ: -355
        shelter: true
  ```

  `minY: 43` is deliberate. `getNearestProtectedCenter` returns the box centre at
  **`y = minY + 24`**, so 43 puts the returned muster target at **y67** — the plaza surface. Set it
  to 60 and bots would be sent to y84, well above the roof. The box also makes everything inside
  undiggable, which protects the hall from being mined out.

  **Cannot be hot-patched.** `FIELD_TYPES.mining` types only `minDigY`, so `validatePatch` silently
  drops `protectedZones` (an array it cannot express) while still returning `ok:true`. Needs a
  `config.yml` edit plus a restart, and `geofence.ts` memoises the whole `mining` section on first
  read per worker thread.
- **Resume the brain** once the above is in place.

## 7. Sequencing note

Reliable dusk homing needs **more than** this config. The night shelter goal is emitted at
urgency 6 on a clear night and 7 when raining, but the override only fires at `urgency >= 7`.
So `protectedZones` alone fixes in-town bots and rainy nights, and **clear nights still leave
bots out in the field**. The scoped fix is raising the clear-night urgency in `GoalGenerator`,
rather than lowering the gate in `VoyagerLoop` (which would promote every other urgency-6 safety
goal too).

Separately: **"tell the bots to walk to the hall" does not currently work.** The worker IPC
switch has no `walkTo`/`follow`/`returnToBase` case, so those endpoints return HTTP success and
move nothing. Fixing that is arguably a prerequisite to this town being usable at all.

---

## 8. TownBrain duplicate-hall collision — resolved 2026-07-24

Resuming the brain after the hall was hand-built produced exactly the collision
the runbook warned about: *there is no supported way to tell the brain "the hall
already exists."* With `buildings` empty, `buildLoop` planned its own
`town_hall` and cycled on it.

**The protected zone held.** The brain's build was logged with
`skippedProtected`, and every probe of the hand-built hall — floor, corner post,
roof ridge, lectern, bell — passed before and after. Nothing of the real hall
was ever at risk; `mining.protectedZones` did the job it was added for.

What the brain *did* build was a partial structure in the part of its planned
footprint that fell **outside** the protected box.

### Resolution

1. **Paused** the brain to stop further building.
2. **Backed up** `town.db` (+`-wal`, +`-shm`), then **repointed** the
   `town_hall` row to the hand-built hall: origin `(-97, 67, -381)`, 25×14×13,
   `schematic_source: handbuilt`, district `Old Town`.
3. **Demolished** the stray build. Its planned box was `x[-89,-38]`,
   `z[-371,-318]`; subtracting the protected box leaves three regions the brain
   could actually reach — `A x[-64,-38] z[-371,-318]`, `B x[-89,-65]
   z[-354,-318]`, and a `C` sliver at `z[-399,-396]` from the well row.
   Removal was **by block type** (`fill … air replace <type>`) rather than a
   volume clear, so surrounding terrain was not scarred. 12 types were found
   present and removed; 11,975 RCON commands.
   The work window was deliberately capped at `x ≥ -64` for regions A/C so it
   was *structurally impossible* to touch the hall.
4. **Resumed.** Verified over 100 s: brain ticks, demand loop queues supply
   tasks, and **zero build attempts** — because both founding-plan buildings now
   have `complete` rows.

### Known inconsistency, deliberately left

The `well` row is marked `complete` but **no well exists** — the sliver that was
built fell in region C and was demolished with the rest. It is left that way on
purpose: deleting the row would make the brain rebuild immediately, and with the
LLM kill switch off it would fall back to a library schematic and site it the
same way it sited the stray hall. Delete the row once the LLM is re-enabled and
the brain can produce a designed, sensibly-placed well.

---

## 9. Build-out — 2026-07-24 · COMPLETE

Ravensreach now has housing and civic structure, not just a hall.

### Five bot cottages

One per resident, ringing the hall plaza. Each 13 × 11, cobblestone shell with
spruce-log corner posts, gabled spruce roof, glazed elevations, south door, and
a furnished interior (bed, chest, crafting table, furnace, hanging lantern). Each
got its own cut-and-fill pad — only the hall's 41 × 41 was previously levelled,
so the surrounding ground still ran y62–73.

| Resident | Cottage centre |
|---|---|
| Architect | `(-118, -375)` west |
| Mason | `(-52, -375)` east |
| Surveyor | `(-85, -405)` north |
| Steward | `(-112, -345)` south-west |
| Scout | `(-58, -345)` south-east |

### Civic

- **Storehouse** `x[-95,-75] z[-420,-408]` — stone-brick, on the road toward the
  northern mine, with four chests. Placed so hauled ore lands under cover at the
  town end of that route rather than in the hall.
- **Plaza** — the 41 × 41 protected box repaved in stone brick around the hall.
- **Paths** — gravel runs from the plaza edge to every cottage door.

**8/8 verification probes**, including two that re-checked the **hand-built hall
is untouched** (floor and lectern both intact).

### Registered with the TownBrain — deliberately

All six new structures were inserted into `town.db` `buildings` as
`status: complete`, `schematic_source: handbuilt`.

This is the direct lesson from §8: a structure the brain cannot see is a
structure it will decide to build for itself. Leaving five cottages and a
storehouse unregistered would have re-created the duplicate-hall collision, five
times over, the moment the LLM came back. `town.db` was backed up before the
write.

### Not built

Per-resident interior styling by role (a blacksmith's forge, a farmer's store),
walls or gates, and any second-tier civic buildings the brain may plan as the
town grows past the founding tier.

---

## 10. Site grading — 2026-07-25

Reported in-world as "the town hall and the builds don't look complete."

**Confirmed, and it was the ground, not the buildings.** A surface sweep found
the town site ranging **y62 → y82 — a 20-block spread.** Only the hall's 41×41
plaza had ever been levelled (§4); each cottage got its own small cut-and-fill
pad (§9), but the land *between* them was raw generated terrain. Buildings on
disconnected pads amid lumpy ground read as a half-finished site.

Two apparent structural faults were **probe errors, not defects**:

- *"cottage Architect: 18/28 wall gaps"* — the probe box was 1 block outside the
  cottage in z, so it sampled open air along two whole edges. Walls are complete.
- *"hall roof MISSING"* — the probe point sits in the hollow beneath the gable.
  The ridge verifies fine at y80.

### Grading applied

1. **Hollows filled** to y67 across `x[-132,-38] z[-425,-333]`, `replace`-scoped
   to air and water so no built block could be touched.
2. **High ground cut** to y67 — but only in tiles clear of every building
   footprint, since a blanket cut would have decapitated the structures. First
   pass used 10-block tiles with padded exclusions (63 graded, 37 skipped);
   a second pass used **5-block tiles against exact footprints** to recover the
   ground immediately around each building (243 tiles).

**Result: surface spread 20 → 4 blocks**, 78/90 sampled columns exactly on y67.
Hall floor, hall ridge, cottage floor, plaza and storehouse all verified intact.

> This is the same lesson as MSA's grading, applied in the safer order: fill with
> `replace`-scoping (which cannot damage a build), but **cut only where you have
> proven there is no build**. The exclusion list is the safety mechanism — not
> the scoping.
