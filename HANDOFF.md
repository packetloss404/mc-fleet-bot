# HANDOFF — mc-fleet-bot

**As of 2026-07-25.** Written to hand this project to the next person (or the
next session) without re-deriving anything.

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
- **DS-01 disclosure signs at all four portals.** Marked REQUIRED in
  `raven-rock/qa/qa-report.md` (REF-015): Raven Rock's real interior is
  classified and every coordinate here is invented. The signs are what keep this
  an openly-labelled interpretation. **Not placed.**

### Build / finish work
- Furnishing (Raven Rock buildings have floors, partitions and lighting but no
  contents; Guest Center zones are floored and partitioned, unfurnished)
- Facade detailing beyond palette and massing
- MSA signage lettering (the billboard has colour bands, not text)
- Regenerate `raven-rock/visuals/level-plans.svg` and `section.svg` — both still
  draw portal N3 at its **pre-OQ-8** position. `planning/coordinates.yaml` is
  authoritative. Needs the original generator, not a hand-edit.

### Config / ops
- **OQ-2** — de-op the builder bots, then apply WorldGuard
- **OQ-3 second half** — WorldGuard `mob-spawning: deny`. The gamerule was set
  via the opped-bot chat path, but `difficulty=peaceful` is doing the real work
- **Phantom `well` row** in `town.db` says `complete` but no well exists. Delete
  it now the LLM is back and the brain can *design* one rather than fall back to
  a library schematic and site it badly

### Watch
- **Worker OOM.** 5 kills at 512 MB, 2 at 768 MB. The cap contains the failure
  but does not explain it: steady state is ~200 MB/worker, so something
  occasionally balloons 3–4×. Raising the cap widens the margin; it does not fix
  the leak. Root-cause before scaling bot count.
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
