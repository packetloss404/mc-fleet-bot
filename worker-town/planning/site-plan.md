# Worker Town — Site Selection

**Status:** site chosen · grove + mine planted · **Town Hall built** · town founded and **PAUSED**.
Remaining: enrol residents, apply `protectedZones`, resume the brain. **Date:** 2026-07-24.

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
