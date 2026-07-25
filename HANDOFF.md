# HANDOFF — mc-fleet-bot

**As of 2026-07-25 (updated late the same day).** Written to hand this project to
the next person (or the next session) without re-deriving anything.

> ## READ THIS FIRST — corrections to the version of this file you may remember
>
> A long working session audited all three builds against the world and found that
> several confident statements in this handoff were **wrong**. They are corrected
> in place below, but the pattern matters more than any single item: **this project's
> documentation has repeatedly been more confident than its evidence.** Verify
> against the world before acting on any claim here, including these.
>
> | Claimed | Actually |
> |---|---|
> | Worker OOM: "5 kills at 512 MB, 2 at 768" | **80 kills** (62 at 512, 18 at 768). Root-caused and fixed — see §3 |
> | "`/fill` probes report FAIL in unloaded areas" (trap #7) | The **server distinguishes** them; *our own tool* was masking it. Fixed |
> | Raven Rock visuals "need the original generator" | **No generator ever existed.** One now does |
> | Ravensreach "no well exists" | A 30-block **tent remnant** did, on the Town Hall's apron |
> | Buffer y41–61 intact, "no assertion ever fired" | **Two 44-block pits** breached it at N3/N4. Now backfilled |
> | Cavern C "no ingress at all" | **213 water hits** from an active aquifer leak. Now sealed |
> | Server is "stock Paper, NO plugins" | **WorldEdit 7.4.0 + WorldGuard 7.0.16** are installed and working |
> | MSA H01/H02 ringed by "floating debris" | Enclosed by **intact leftover buildings** — a different repair entirely |

---

## 1. What this is

An AI bot fleet (mineflayer + LLM) that lives on one host and plays Minecraft on
another. Three builds exist in the world, all constructed by the **operator over
RCON**, not by the bots.

| Host | Address | Runs |
|---|---|---|
| Bot host | `10.80.13.18` (`pdian02mc03`) | `mc-fleet-bot` (API :3001, loopback), `mc-fleet-web` (dashboard :3000) |
| MC server | `10.80.13.14` (`pdian02mc01`) | Paper 1.21.11, `/opt/packetcraft/paper-server` |

> **Connecting a client:** point it at **`10.80.13.14:25565`**, NOT `.18`. The bot
> host serves only :3000 and :3001 — there is no Minecraft server on it. This
> cost real debugging time; the symptom is "can't connect to server" while the
> dashboard works fine. `online-mode=false`, so log in as `packetloss404` to
> arrive as the opped mayor.

**Admin channel:** `scripts/mc_admin.py` — paramiko SSH plus a direct-tcpip
channel to the remote's localhost RCON. Credentials from `.env`.

---

## 2. Current state

**All 20 tracked tasks complete.** Services active, 5 bots online, town running,
LLM enabled.

> **Read that line sceptically — it was true of the task tracker, not of the world.**
> A later audit of all three builds found real defects behind it: a stacked roof over
> the whole Guest Center, two leftover *buildings* enclosing H01/H02, floating
> schematic debris over Ravensreach, an aquifer leak in Cavern C, two buffer
> breaches, tunnel plugs, and a well that was a tent. "Complete" meant *the tasks
> were closed*, not that the builds were verified. See §8 and the `qa/audit-2026-07-25.md`
> reports in each build directory.
>
> Also note the claim above that all three builds were made "by the operator over
> RCON, not by the bots" is **no longer true**: the TownBrain now designs and builds
> autonomously, and a bot-built well stands in the Ravensreach plaza.

### The three builds

| Build | Where | State |
|---|---|---|
| **MainStreet America** | envelope `x,z ∈ [-300,300]`, plane y64 | Surface build complete |
| **Raven Rock** | beneath MSA, y40 and below | Excavation + structure complete |
| **Ravensreach** | north of the envelope, centre `(-85,67,-375)` | Built, graded, town live |

**MSA** — Guest Center (2 storeys, 145×76 at (0,128)), 12 homes each at its
verified footprint/storey count and its own style, parking field (~97,400 ft²),
warehouse, cooking school, drop-off loop, LED billboard, porte-cochère,
cul-de-sac, detention pond, landscaping, full street z+80→−240.

**Raven Rock** — Caverns A/B/C, tunnels T1–T4, vestibules N1/N2, portals N3–N6
(N3 coffered and drained — it sits under a lake), rotunda N10, corridors C1/C2,
spur S1, shaft RR-Z5, buildings RR-B1…B4 on spring pedestals, N7 reservoirs,
OQ-3 lighting.

**Ravensreach** — Town Hall, 5 bot cottages, storehouse, plaza, paths, oak grove,
northern mine. Site graded to y67 (spread 4 blocks).

### Platform fixes landed this session

VoyagerLoop leak guard · per-worker heap cap (`MC_WORKER_HEAP_MB`, systemd
drop-in, currently 768) · worker movement commands + a `default:` case ·
pause/resume actually pauses · no-op config PATCH no longer destroys config.yml
comments · loginFlow P0 inverted to opt-in · y41 carve ceiling · tests no longer
write into production `data/`.

---

## 3. Open items

### Required
- ~~**DS-01 disclosure signs at all four portals.**~~ **DONE 2026-07-25.** Six
  waxed `oak_sign`s placed and verified (text read back from block data): N4
  (3,19,−286) + (−3,19,−286); N3 (−147,19,286) + (−153,19,286); N5 (286,19,−27);
  N6 (−291,11,8). Deviation from the design: the spec called for **wall** signs on
  "the headwall beside each throat", but **there is no headwall** — all four spec
  support blocks are air and a probe grid around N5 at y20 is air throughout. The
  portals are open chambers, not mouths cut into rock, so wall signs would have had
  nothing to attach to. Standing signs on verified-solid floor were used instead.
  Placing them also resolved N5/N6's **INCONCLUSIVE** audit verdicts — both had
  never been chunk-loaded; their throats are confirmed open.

### Build / finish work
- Furnishing (Raven Rock buildings have floors, partitions and lighting but no
  contents; Guest Center zones are floored and partitioned, unfurnished)
- Facade detailing beyond palette and massing
- MSA signage lettering (the billboard has colour bands, not text)
- ~~Regenerate `raven-rock/visuals/level-plans.svg` and `section.svg`~~ **DONE
  2026-07-25.** Both now derive from `planning/coordinates.yaml` via
  `raven-rock/visuals/generate_visuals.py`, and N3 renders at its post-OQ-8
  position. **The premise of the old note was false: there was never an "original
  generator."** The SVGs were hand-authored XML with hand-written `aria-label`
  prose — which is exactly why OQ-8 updated the manifest and the notes and left both
  drawings wrong for a day. `--check` exits 1 when the outputs are stale, so this
  can now be caught by CI or a pre-commit hook instead of by eye.

### Config / ops
- **OQ-2 — DEFERRED by operator decision 2026-07-25. Not an oversight; do not
  "fix" it without asking.** It would mean de-opping the builder bots and *then*
  setting the WorldGuard **build** flags — that order matters, because **op bypasses
  `build: deny`**, so build protection is inert while the bots are opped.
  It was dropped because de-opping is a one-way door for the current tooling: it
  removes the bots' ability to build, the opped-bot chat path that is the documented
  workaround for `gamerule` being broken over RCON (trap #6), and the only way to
  drive WorldEdit `//` commands (the console has no selection).
  **Be explicit about the consequence:** the WorldGuard regions from OQ-3 stop *mob
  spawning only*. There is currently **no build or grief protection on any of the
  three builds** — anyone or anything opped can modify them freely. That is an
  accepted risk, not a gap waiting to be closed.
- ~~**OQ-3 second half**~~ **DONE 2026-07-25.** Four WorldGuard regions with
  `mob-spawning: deny`, verified by reading the live
  `plugins/WorldGuard/worlds/world/regions.yml` (region-command output is *not*
  routed back over RCON, so `rg list` looks empty — check the file):
  `mainstreet_america` y[62,319], `raven_rock` y[−64,61], `raven_rock_shaft`
  (priority 20), `ravensreach`. The y-split keeps MSA and Raven Rock from contending
  over the same column. Before this, `regions.yml` held only `__global__` with zero
  flags — **neither `integration/worldguard.yaml` had ever been applied.**
  `difficulty=peaceful` still masks the need, so the flag is untested in anger.
  Key insight: this did **not** need the OQ-2 de-op, because op bypasses `build`
  but not `mob-spawning`. See `raven-rock/qa/oq3-worldguard.md`.
- ~~**Phantom `well` row**~~ **DONE 2026-07-25**, and the note above was wrong: a
  **30-block red-canvas tent remnant** did exist, on the Town Hall's stone-brick
  apron, inside the protected plaza box — which is why the demolition pass never
  touched it. The row claimed `schematic_source=llm`, `'medieval stone well'`; in
  fact the LLM designer had failed (`"AI is disabled (kill switch)"`) and the brain
  pasted `medieval-tent.schem`. Remnant removed via 9 per-material masked fills
  (exactly 30 blocks, Town Hall untouched), row deleted, and rows added for the
  plaza/path/grove/mine that previously had none — closing the trap-#9 duplicate-build
  risk. A real well now stands **in the plaza** at (−85,68,−359).
  **Four separate bugs had to be fixed to get that outcome** — schematic
  kind-matching, a site-selection refusal that the caller silently overrode, the
  plaza blocking its own centre, and canvas-vs-content footprints. See §8.

### Watch
- **Worker OOM — ROOT-CAUSED AND FIXED 2026-07-25.** It was never a leak, and it
  was **80 kills, not 7** (62 at the 512 MB cap, 18 at 768; independently
  corroborated by 81 `heap out of memory` lines in one log). Cause: an unbounded
  dig-enabled A* search that could never succeed. `mineflayer-pathfinder` ships
  `searchRadius = -1`, so `astar.js:51` computes `maxCost = -1` and the pruning
  test at `astar.js:95` — which only fires when `maxCost > 0` — was disabled
  entirely; with `canDig = true` the search space is the full 3-D volume; and
  `index.js:442` re-enters the *same* AStar context every tick while its status
  stays `'partial'`, and that context's closed/open sets have no eviction. The
  trigger is the mining geofence: bots are told to mine stone while standing inside
  the protected zone, so the goal is permanently unreachable. **79 of 80 kills were
  mid-execution, 65 of them on stone mining.** Raising the cap never helped because
  the growth is unbounded, not merely large.
  Fixed by bounding the search (`config.behavior.pathfinderSearchRadius`, default
  96 — note this is a *detour allowance*, `maxCost = startNode.h + searchRadius`,
  not a range limit) and by adding the **per-worker heap telemetry that did not
  exist**: `/api/admin/heap-snapshot` snapshots the *main* thread (~74 MB) and
  cannot see a worker isolate at all, which is why two cap changes were made blind.
  `getStatus()` now reports `heap{usedMb,totalMb,limitMb,usedPct}`.
  Post-fix: 0 kills, heap steady 54–98 MB of 816 (7–12%).
  **Still open:** the underlying contradiction is untouched — bots are still
  assigned stone-mining inside a protected zone, so those goals still fail, just
  cheaply now. That is probably why the town logs `supply:request stone have:0` on
  repeat.
- **LLM call volume.** First window with quota *and* the leak fixed, correct
  routing, and a registered town. Healthy is ~280 calls/hr, not ~1,400. Check
  `GET /api/llm/usage`.

---

## 4. Traps that cost time — do not re-learn these

1. **Two spend figures disagree.** `/api/llm/usage` is a **capped ring buffer**
   (pins at 10,000 calls and carries stale history). `/api/llm/budget` is
   authoritative and is what gates paid codegen.
2. **`npm test` used to write into production `data/`.** Two test files built
   `new TokenLedger()` with no `dataDir`, adding ~$11.75 per run to the real
   spend file. Fixed with a constructor guard that throws under `VITEST`. If
   spend ever looks impossible again, check this first.
3. **`/fill` silently no-ops above ~32,768 blocks.** A 50,580-block fill did
   nothing and reported nothing. **Always chunk, and always verify after.**
4. **`replace`-scoping does not protect what you have not inventoried.** The MSA
   grading pass deleted the southern road because its surface material was not
   in the protected set. For **cutting**, use an explicit exclusion list of
   building footprints — scoping alone is not a safety mechanism.
5. **Verification geometry produced false failures repeatedly.** Probes landed
   inside roof voids, on window openings, on pedestal columns, and outside wall
   boxes. Before believing a `FAIL`, confirm the probe point is somewhere the
   geometry actually occupies. A clean split (all-west-pass / all-east-fail) is
   a tell that the *probe* is wrong, not the build.
6. **`gamerule` is broken over RCON on this box.** Returns "Incorrect argument".
   Workaround: `POST /api/bots/<name>/say {"message":"/gamerule ..."}`.
7. **`forceload` has a per-command chunk cap.** A 620×620 request silently fails
   and every probe in that area then reports FAIL. Scope force-loads tightly.
   **CORRECTED 2026-07-25 — this was misdiagnosed, and it was our bug.** The server
   replies `"That position is not loaded"`, which is *distinct* from `"Test failed"`.
   `scripts/mc_admin.py` was collapsing both into `no`, so an **unverifiable** point
   read as a **negative** one. It now reports three states (`MATCH` / `no` /
   `NOT-LOADED`, plus `ERROR`). Consequence worth absorbing: **any survey taken
   before this fix, over an area that was not force-loaded, may contain false
   "missing" findings.** Absence of a block and inability to look are not the same
   result, and the tool no longer pretends they are.
8. **The API binds ~200 s after `systemctl restart`** — `index.ts` awaits
   `loadSavedBots()` before `listen()`. A dead port right after a restart is
   expected. Do not re-restart.
9. **A structure the TownBrain cannot see is one it will build itself.** Every
   hand-built structure must get a `complete` row in `town.db` `buildings`, or
   the brain plans a duplicate. This already happened once with the Town Hall.

---

## 5. Build discipline that worked

- **Line before you hollow.** An aquifer bled into Cavern A because it was lined
  afterwards. Every later water-adjacent build (Cavern C, the detention pond, N7)
  lined first — zero ingress in all three. For N7 the enclosure check ran as a
  **precondition**, per OQ-5/BU-10.
- **Cut then fill, never interleaved.** Tunnel floors failed twice because each
  step's headroom-clear deleted its neighbour's tread. Fixed by making the fill a
  final, `replace`-scoped pass.
- **The y41 ceiling was enforced mechanically** — every fill went through a
  helper asserting its upper bound ≤ y41, exempting only the RR-Z5 column and the
  four portal corridors. No assertion ever fired.

---

## 6. Hardware — see §7 of this file for sizing

Measured 2026-07-25:

| | Bot host `.18` | MC server `.14` |
|---|---|---|
| Cores | **2** | **2** |
| RAM | **7 GB** (1 used, 5 avail) | **15 GB** (2 used, 13 avail) |
| Disk | 60 GB (8.9 used, 49 free) | 175 GB (8.7 used, 159 free) |
| Load (1/5/15) | 0.55 / 1.55 / 2.11 | 0.73 / 0.62 / 0.56 |
| Process | `mc-fleet-bot` RSS 0.92 GB | Java `-Xms1G -Xmx2G` |
| Data | repo+data 1.7 GB, log 146 MB | world 66 MB, 18 region files, server dir 476 MB |

---

## 7. Sizing recommendation

**Short version: add CPU, not RAM. Disk is a non-issue on both hosts.**

### Bot host `10.80.13.18` — the one that actually needs help

| | Now | Recommend | Why |
|---|---|---|---|
| **vCPU** | 2 | **8** *(minimum 6)* | The real constraint |
| **RAM** | 7 GB | **16 GB** | Headroom for more bots, not for today's load |
| **Disk** | 60 GB | **leave as is** | 49 GB free; logs now rotate |

**CPU is the bottleneck, and it is measurable.** Each bot is a worker thread
running pathfinding and world-state on 2 cores shared with the main thread, the
Next.js dashboard, and the LLM/IPC layer. Sustained load ran **2.5–4.7 on a
2-core box** through this session — 125–235% subscribed. Everything that felt
slow traced to this.

It also silently caps tooling: the multi-agent workflow's concurrency is derived
from core count, so a 6-agent fan-out ran **2 at a time**. At 8 vCPU that becomes
6 concurrent, and 5-bot pathfinding stops fighting the dashboard.

**RAM is NOT currently short** — 5 GB of 7 GB is free and the service holds
0.92 GB. Go to 16 GB only because bot count is the thing you want to raise, and
each bot is capped at 768 MB (`MC_WORKER_HEAP_MB`). Budget roughly:

```
main thread ~1 GB  +  (bots × 0.8 GB)  +  ~2 GB OS/dashboard/headroom
→  10 bots ≈ 11 GB   ·   16 bots ≈ 16 GB
```

7 GB is fine for 5 bots today; it is not fine for 10–16.

### MC server `10.80.13.14` — one small change

| | Now | Recommend | Why |
|---|---|---|---|
| **vCPU** | 2 | **4** | Paper is largely single-threaded, but chunk gen and I/O benefit |
| **RAM** | 15 GB | **leave at 15 GB** — but raise the **heap** | The box is fine; the JVM is throttled |
| **Disk** | 175 GB | **leave as is** | World is 66 MB of 159 GB free |

**Do not add RAM here — the box has 13 GB free and Java is capped at `-Xmx2G`.**
Adding RAM changes nothing while that flag stands. Instead edit the start script:

```
-Xms4G -Xmx6G        (from -Xms1G -Xmx2G)
```

That is the single highest-value change on this host. 2 GB is tight for a
1.21.11 Paper server once you have three builds, force-loaded chunk work and
several players; 6 GB gives real headroom and still leaves ~9 GB for the OS.

### Disk — no action on either host

Bot host 49 GB free, MC server 159 GB free. The world is **66 MB** across 18
region files; even aggressive expansion will not trouble that. The one thing
that *was* growing without bound — a 152 MB unrotated bot log — now rotates.

### Order of work

1. **Raise the MC server heap to `-Xmx6G`** — free, one line, biggest single win
2. **Bot host 2 → 8 vCPU** — fixes the actual bottleneck
3. **Bot host 7 → 16 GB RAM** — only needed *before* raising bot count
4. **MC server 2 → 4 vCPU** — nice to have
5. **Disk** — nothing

> ⚠️ **Do not raise bot count immediately after resizing.** The worker OOM
> (§3, Watch) is unexplained: steady state is ~200 MB but something occasionally
> balloons past 768 MB. More bots multiply an unresolved leak. Root-cause that
> first, then scale.

---

## 8. Siting and schematic-selection bugs (fixed 2026-07-25)

Ravensreach's well was built **in a pond three times running**, and each attempt
exposed a different defect underneath the last. Recording all four, because any one
of them will silently produce a mis-sited building again.

**1. The schematic matcher scored style adjectives like nouns.**
`SchematicMatcher` had no bucket for `well`, so a query of `"medieval stone well"`
matched `medieval-tent.schem` on the shared word **"medieval"** (5 points intent + 3
style) with zero match on the noun. Any file with "medieval" in its name could win
any medieval contract. Fixed: buckets for the kinds the seed plans actually request,
a `DESCRIPTOR_TOKENS` set so adjectives can never carry a match alone, nouns weighted
6× against descriptors, and a **kind gate** — `TownBrain` passes `PlanItem.kind` and a
candidate that cannot be identified as that kind is rejected outright. When nothing
matches, the brain skips and logs `design:no-match` rather than building the wrong
thing.

**2. A failed schematic parse looked exactly like a measurement.**
`getSchematicInfo` returns `size: {x:0,y:0,z:0}` when a schematic will not parse, and
`{x:0,y:0,z:0}` is a **truthy object** — so every `if (!info.size)` guard sails past
it. Those zeros were written onto town registry rows; `SiteSelector` derives its
`avoidRects` from those rows; zero-area rects make siting blind. That is the
documented "a well ended up fully inside the town hall" failure. Fixed with an
explicit `parseFailed` flag, and `TownBrain` now refuses to build anything whose
footprint is unmeasurable rather than recording a dimensionless row.

**3. `SiteSelector` was *attracted* to water, not merely careless about it.**
`isSolidGround()` treats fluid as not-ground, so `topSolidY()` scanned **down through
a lake** and returned the lake **bed**. A lake bed is the flattest terrain in
Minecraft, so it *beat* real ground on the flatness test; `originY = minY + 1` put the
floor one block above the bed; and the ground-layer fluid probe sampled the bed
(sand/dirt), so `FLUID_PENALTY` frequently never fired for the very case it existed
to catch. Fixed: fluid is a **hard reject** on two axes (`maxSubmergedCols`,
`maxFluidBlocks`), with early bail-out so rejected candidates do not exhaust the
probe budget, and a **capped** fluid penalty so the opt-in for docks and bridges is
actually usable (uncapped, 100 water blocks × 20 drove any permitted site below the
`score > 0` gate).

**4. `BuildCoordinator` silently overrode the refusal — the one that actually mattered.**
On `selectBuildSite → null` it fell back to `nearestAvoidClearOrigin`, a purely
**geometric** spiral that checks `avoidRects` and nothing else, and failing that to the
raw origin. Every terrain, water and obstacle judgement was discarded. This is why the
well kept landing in the pond **while the log correctly read "no acceptable site
found"**, and how it reached a pond ~57 blocks away — outside the selector's own 24/48
radius, reachable only by the unbounded geometric spiral. Fixed: the avoid-clear seed
is **re-validated** with a tight search, and if that fails the build throws so
`TownBrain`'s per-kind exponential backoff applies. Refusing is the right default —
a missing building is a visible gap, whereas one in a lake also poisons the registry
that later siting decisions are derived from.

**Two further siting fixes that fell out of the above:**

- **The plaza blocked its own centre.** `avoidRects` came from *every* registry row,
  including `plaza:1` (41×41 over the whole town centre) and `mine:1` (at y58,
  vetoing surface sites directly above it). A village well belongs in the plaza.
  `TownBrain.NON_BLOCKING_KINDS` now exempts `plaza`/`path`/`road`/`mine`. The grove
  stays blocking — trees are real obstacles — and structures inside an exempt rect
  (the Town Hall sits inside the plaza) still block on their own account.
- **Canvas vs content.** A schematic's declared size is its **canvas**. The
  LLM-designed well is 66 solid blocks occupying **5×10×3** inside a **19×12×23**
  canvas — 97% empty air. Siting therefore demanded a flat, dry 19×23 area plus
  margin (~1,085 columns) for a building covering 15 columns, so nothing in the plaza
  could ever qualify and only a lake was big and flat enough. `computeContentBounds()`
  now measures the real extent, site selection uses it, and the paste anchor is
  shifted by `−offset` so the **structure** lands on the validated ground
  (`'coords'` mode is exempt — an explicit anchor must be honoured).

### Still open here

- Registry rows still record the **canvas** size, not content, so `avoidRects`
  over-reserve. Conservative (it prevents stacking) so left alone — but it is why the
  tent row claimed 21×11×21 for an 11×6×13 structure, and why `plaza:1` over-claims.
- The well design's **5 water sources have no containment**, so on flat ground they
  sheet outward; 282 blocks of spill were drained off the plaza. The schematic needs a
  contained basin or the water removed.
- **The plaza's east corner is flooded by an adjacent lake.** Draining is futile — it
  refills from outside any box. Needs a dam or a regrade decision.
- `SiteSelector` optimises for flatness with **no notion of "central to the town"**.
  Nothing stops the next building landing on the outskirts.
