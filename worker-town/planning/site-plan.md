# Worker Town — Site Selection

**Status:** site chosen, nothing built. **Date:** 2026-07-24.

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
> travel instead; **(c)** leave it and accept the commute. **(a) is the recommendation** — nothing
> says there may only be one grove, and `mineSite` is a single coordinate that can simply be
> repointed once a northern mine exists.

## 4. Not yet decided

- **Town Hall footprint and style.** The hall centre is the town **capital** passed to
  `POST /api/towns`, and `stylePreset` must be exactly `medieval-communal` or
  `mid-century-civic` — anything else 400s.
- **Who builds the hall.** Founding a town **starts the brain immediately**
  (`createTown → startBrain`), so this is decided before the first 60-second tick: hand-build it
  and found the town paused, or let the TownBrain design one. There is no supported way to tell
  the brain "the hall already exists".
- **The `protectedZones` box.** Once the hall footprint is fixed, this becomes the night muster
  point. Draft, to be finalised against the real footprint:

  ```yaml
  mining:
    protectedZones:
      - name: worker-town-hall
        minX: -110
        minY: 60
        minZ: -395
        maxX: -60
        maxY: 95
        maxZ: -355
        shelter: true
  ```

  Note `getNearestProtectedCenter` returns the box **centre at `y = minY + 24`**, so `minY` is
  chosen with that offset in mind. This **cannot be hot-patched** — `FIELD_TYPES.mining` only
  types `minDigY`, and `validatePatch` silently drops keys it cannot express. It needs a
  `config.yml` edit plus a restart, and `geofence.ts` memoises the whole `mining` section on
  first read per worker thread.

## 5. Sequencing note

Reliable dusk homing needs **more than** this config. The night shelter goal is emitted at
urgency 6 on a clear night and 7 when raining, but the override only fires at `urgency >= 7`.
So `protectedZones` alone fixes in-town bots and rainy nights, and **clear nights still leave
bots out in the field**. The scoped fix is raising the clear-night urgency in `GoalGenerator`,
rather than lowering the gate in `VoyagerLoop` (which would promote every other urgency-6 safety
goal too).

Separately: **"tell the bots to walk to the hall" does not currently work.** The worker IPC
switch has no `walkTo`/`follow`/`returnToBase` case, so those endpoints return HTTP success and
move nothing. Fixing that is arguably a prerequisite to this town being usable at all.
