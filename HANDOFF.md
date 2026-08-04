# HANDOFF — mc-fleet-bot

## Current closeout — 2026-07-29 IANLAN NextGen

The authenticated report workspace now runs on Railway at
`https://ianlan-nextgen-production.up.railway.app`. Its production project,
service, and display name are all **IANLAN NextGen**. The production deployment
`bd072387-4f99-4e49-922a-c8ef9e22a2d6` is `SUCCESS` with image digest
`sha256:d3ff7878be51c4b0cb72cfd57fdadfe04e1d04a3788818b2dd4fa7324d91249a`.
Do not replace or create a second Railway project; deploy `world-showcase/` to
the already-linked service.

The report library has three adjacent authenticated reports. Report 04 is
intentionally numbered as requested; no Report 03 has been fabricated:

1. **Master Plan** — `/reports/master-plan`
2. **Underground Navigation** — `/reports/underground-navigation`
3. **POI Coordinate Directory (Report 04)** —
   `/reports/poi-coordinate-directory`

Report 04 is a searchable operator directory of all 1,215 durable catalog
records. Each record appears exactly once under surface builds, remote sites,
PassageWay access, route/station infrastructure, anomalies/controls, or
candidate parcels. It includes copy-ready `/tp` commands and sealed HTML, JSON,
CSV, and 135-page PDF artifacts. PassageWay is the proper name of the
underground tunnel system. The package and production verification receipt live
at `docs/redevelopment/2026-07-29-poi-coordinate-directory/`.

Coordinates prefer authored entrances and exact points. Derived area centers
are labeled as references rather than safe landing claims, and records without
a narrow usable Y retain the operator's current elevation with `~`. Generate,
print, seal, and sync the directory with:

```bash
node scripts/generate_poi_coordinate_directory.mjs
# Print poi-coordinate-directory.html to the package PDF with Chromium.
node scripts/finalize_poi_coordinate_directory.mjs
npm run sync:coordinates --prefix world-showcase
```

The reusable scanner/report-engine extraction now lives in the separate local
repository `/opt/stacks/mc-fleet-devtools` on `main` at commit `420ca98`. It
provides a read-only Anvil scanner, SQLite catalog exporter, YAML report
recipes, serialized job worker, CLI, REST API, and browser dashboard. Its local
IANLAN registry and generated jobs/artifacts are ignored. The repository has no
remote yet; do not push it into `mc-fleet-bot` or invent a destination. Validate
it with:

```bash
cd /opt/stacks/mc-fleet-devtools
npm run check
npm run cli -- registry check
npm start
```

Underground Navigation is the comprehensive, map-first guide to the cataloged
tunnels, bunkers, vaults, below-grade venues, bars, adult-only hospitality
areas, rooms, and access nodes. Its sealed package lives at
`docs/redevelopment/2026-07-28-underground-navigation/` and contains a 97-page
PDF, 18 maps, 289 underground/navigation records, 168 C01 spaces, 22
entrance/access records, and 20 accepted source screenshots plus two contact
sheets. Generate and seal it with:

```bash
node scripts/generate_underground_navigation_report.mjs
# Print underground-navigation-report.html to the package PDF with Chromium.
node scripts/finalize_underground_navigation_report.mjs
npm run sync:underground --prefix world-showcase
```

The report is read-only. **No world edits were made.** ISSUE-001 and ISSUE-002
remain open in `ISSUES.md`. In particular, the C01 east-stack maps are marked
cataloged/contested: they do not prove that the complex was moved east or that
the road, recovered parking, and sunken entrance exist. The legacy MainStreet
C01 portal remains the reliable mapped public arrival.

The Railway access-code and session-signing values are not in Git. The local
0600 recovery record is
`/home/ianwalmsley/.config/ianlan-nextgen/credentials.env`; do not copy its
values into documentation, commands, logs, commits, or Box. Production auth,
the report page, all 26 page images, PDF byte ranges, and security headers were
verified after deployment.

Box contains the report under
`exports/town-expansion-r1-final-2026-07-28/reports/underground-navigation/`.
The verified upload has 637 files and zero failures; see
`docs/redevelopment/2026-07-28-town-expansion/box-upload-verification.json`
and its receipt.

The owner authorized deletion of the superseded ChatGPT Sites project. The
connected Sites control surface has no delete, unpublish, archive, or disable
operation, so it could not truthfully be removed. It remains owner-only at
`https://mc-fleet-world-atlas.ianwalmsley.chatgpt.site`. Delete it manually
when an authorized Sites UI/API exposes that action; do not publish new
versions there.

> ### ⇒ Before any WORLD work, run `python3 scripts/build_status.py`.
> The 2026-07-26 Westlight session relocated the stadium, built the Westlight complex,
> and — more useful — established that **placement and traversability are different
> properties**, and that we had only ever checked placement. Three finished builds
> turned out to be completely sealed. That session's durable findings are merged into
> this file: its build-tooling traps are §4 items 16–20, and the work it left
> unverified is §9.
>
> This file remains correct for the platform, the hosts, and the 2026-07-25 audit.

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

> **All 26 audit open questions were ratified on 2026-07-25 — see
> `docs/DECISIONS-2026-07-25.md`.** The three `qa/audit-2026-07-25.md` reports each end
> with a list of questions "a human must answer first"; every one now has an answer, so
> nothing below is blocked on a decision. That file also carries the execution order and
> the standing rule that came out of it: **where the world and the plan disagree and the
> world is sound, amend the plan.** Demolition now needs a reason beyond non-compliance.

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
- ~~Regenerate `docs/raven-rock/visuals/level-plans.svg` and `section.svg`~~ **DONE
  2026-07-25.** Both now derive from `planning/coordinates.yaml` via
  `docs/raven-rock/visuals/generate_visuals.py`, and N3 renders at its post-OQ-8
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
  `plugins/WorldGuard/worlds/world/regions.yml` (~~region-command output is *not*
  routed back over RCON, so `rg list` looks empty — check the file~~ **that workaround
  is obsolete as of 2026-07-26: `scripts/we_admin.py cmd "/rg info <region>"` runs the
  command as an opped *bot* and reads the reply back, printing the full region info
  including bounds and flags. The console still can't see it; a player can**):
  `mainstreet_america` y[62,319], `raven_rock` y[−64,61], `raven_rock_shaft`
  (priority 20), `ravensreach`. The y-split keeps MSA and Raven Rock from contending
  over the same column. Before this, `regions.yml` held only `__global__` with zero
  flags — **neither `integration/worldguard.yaml` had ever been applied.**
  `difficulty=peaceful` still masks the need, so the flag is untested in anger.
  Key insight: this did **not** need the OQ-2 de-op, because op bypasses `build`
  but not `mob-spawning`. See `docs/raven-rock/qa/oq3-worldguard.md`.
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
10. **`scripts/find_floating.mjs` deleted a real furnished building** and its guards
    did not fire. 460 built blocks — 36 chests, an anvil, a loom, a brewing stand,
    beds, signs — were removed from a tower east of the Ravensreach plaza as
    "floating debris". The `--max-cluster` guard protects against deleting one big
    thing; it does nothing about deleting a big thing **in pieces**, which is what
    happened. Restored in full 2026-07-25, but only because an unrelated session had
    left a 17:41 world snapshot in `/tmp` — that is luck, not process. **Do not run
    that sweep without the review step, a durable pre-snapshot, and a furniture veto.**
    Full write-up: `docs/INCIDENT-2026-07-25-ravensreach-structure-loss.md`.
11. **A material filter must match whole block names, never substrings.** The restore
    above initially left the tower body out because `grep -vE "deepslate|stone"`,
    meant to skip *natural* deepslate and stone, also swallowed `deepslate_brick_stairs`,
    `stone_bricks` and `cobblestone`. Minecraft names make **every natural block a prefix
    of a built one**, so substring filters silently eat structure. Same class as trap #4.
12. **`scripts/mc_admin.py` cannot write files on the MC server, and does not say
    so.** The SSH user is **`ianwalmsley` (uid 1000), not root** — it is in the
    `sudo` group but the tool never escalates. Everything under
    `/opt/packetcraft/paper-server` is root-owned, so every file write fails with
    `Permission denied`. RCON is unaffected (it authenticates separately), which is
    why this went unnoticed: the *runtime* half of each command works and only the
    *persistence* half silently dies.
    Concretely, `set-difficulty` runs `cp -n … 2>/dev/null; sed -i …` and then reads
    only **stdout**, so the permission error on stderr is discarded and it prints
    `server.properties persisted:` with an empty value — indistinguishable from
    success. Proof it has never worked: no `server.properties.bak.mcadmin` exists on
    the server despite the command having been run. **Consequence: any difficulty set
    through this tool reverts on the next server restart.** `server.properties` still
    reads `difficulty=peaceful`.
    This is trap #7 all over again — a tool collapsing "I could not do it" into a
    result that reads as done. Fix requires deciding whether `mc_admin.py` should
    escalate (`sudo -S` fed from `MC_SERVER_SSH_PASS`) or should refuse loudly; until
    then, treat every file-writing action in that tool as a no-op and verify by
    reading the file back.

12. **Never drive a player-relative WorldEdit command from a bot.** `//cyl`, `//sphere`,
    `//pyramid` and `//forest` are all centred on the *player*, and the bot **falls**
    between the `/tp` and the command reaching the server. Measured on 2026-07-26: a
    cylinder aimed at y=100 landed at y=98; one aimed at y=104 landed at y=101. The
    drift is non-deterministic, so a fill and a carve issued at the "same" level miss
    each other and you get a solid lump instead of a bowl. Spectator mode does **not**
    fix it. Rasterise the shape in Python and emit `//pos1`/`//pos2`/`//set` boxes —
    absolute coordinates depend on nothing. It costs ~13× the ops and is still right.

13. **A road that clears headroom will eat a building.** `road()` in
    `scripts/gen_civic.py` sets y68-71 to air along its route. Three legs ran through
    cottage footprints and destroyed walls, two fittings and half a bed — chest
    *contents* are unrecoverable. Before running any path/road generator, intersect its
    route boxes against known building footprints. The generator is now re-routed and
    carries the footprints it must avoid in a comment.

14. **`REPL <mask> air → X` does not fill cells that were never air-masked.** Laying
    farmland with `REPL dirt,grass_block,… → farmland` leaves pre-existing **air** gaps
    as air, so a water channel run through it spreads out through those gaps. Two
    separate floods came from this. When a fill must be watertight, fill the air too,
    and wall the ends of any channel.

15. **Dig no canal without capping both ends.** Both Ravensreach canals were cut with
    open ends and drained themselves across the town — 130 blocks of stray water, 23 of
    them inside a resident's cottage. Same class as the N1/N6 floods.

16. **Build ops belong on RCON `/fill`, not on a bot's WorldEdit selection.** WorldEdit
    needs a *player* selection, so `build_runner.py` drives an opped mineflayer bot and
    spends three chat round-trips per op (`//pos1`, `//pos2`, `//set`) plus a reply
    poll — measured **~1.5 s per op**, which is four hours for a 9,500-op build.
    Vanilla `/fill` needs no selection: one command per box, measured **0.002 s** over
    an already-open RCON channel. The same 9,500 ops took **19 seconds**. Use
    `scripts/rcon_runner.py`. Three caveats it handles, all of which bite silently:
    - `/fill` **refuses unloaded chunks** with `That position is not loaded` — the bots
      never move (we place by coordinate), so nothing at a remote site is loaded. It
      force-loads the ops' bounding box and restores any of the operator's ~281 pinned
      chunks that its own `forceload remove` takes with it.
    - `/fill` caps at **32768 blocks**; bigger boxes are split.
    - `/fill` has **no random patterns**. Lay geometry down in flat single materials and
      scatter accents afterwards in a handful of big WorldEdit `//replace` passes —
      1,540 per-row mix ops cost ~38 min through a bot; four `//replace` cost seconds.

17. **This server's command parser rejects `chain`.** `setblock <x> <y> <z> chain` and
    `fill … chain` both answer `Unknown block type 'minecraft:chain'`, with or without
    an explicit axis state, while WorldEdit places the same block happily. Also
    **`smooth_basalt_slab` does not exist** in vanilla — smooth_basalt has no slab
    variant, and an LLM design suggested it. The valid 1.21.11 registry name is
    **`minecraft:iron_chain`**, which works directly through `/fill`; the 59 theatre
    rigging placements were rebuilt that way and sampled 8/8. `rcon_runner.py` still
    blocks the legacy id so old ops cannot lose blocks silently.

18. **Carve vertical shafts LAST.** Three separate corridor ceilings each re-sealed the
    Moot Hall shaft during a single repair. Any op laying a floor or ceiling across a
    shaft's footprint will close it. Put the shaft carve at the end of the file and it
    cannot be undone by its own build.
19. **Doors need two ops.** A door is two blocks with *different* block states. Setting
    a 2-tall selection to a door id writes two `half=lower` halves, which is invalid and
    pops off on load. **Every door placed in the 2026-07-26 session vanished this way** —
    29 of them, across the library, the canal houses, the Grange Hall, three cottages and
    the penthouse. All four generators now carry a `door()` helper; use it.
20. **Never wait on a `pgrep` that matches your own command line.** A sequencer waited on
    `pgrep -f "buildops/ch2_bowl"` — which matched *itself*. It waited forever and **seven
    ops files were never run**: the whole concert-hall fit-out and the entire members'
    club. The runner logs looked healthy throughout; nobody noticed for hours.

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

## 6. Hardware — RESIZED 2026-07-26. §7's plan is COMPLETE.

**Both hosts were upgraded by the operator and every item in the §7 order of work is
now done.** Re-measured 2026-07-26:

| | Bot host `.18` | MC server `.14` |
|---|---|---|
| Cores | **8** *(was 2)* — Xeon E5-2680 v4 @ 2.40GHz | **4** *(was 2)* |
| RAM | **15 GB** *(was 7)* — 2 used, 13 avail | **15 GB** — 5 used, 10 avail |
| Disk | 60 GB (8.9 used, 49 free) | 175 GB (8.7 used, 159 free) |
| Load (1/5/15) | **2.54 / 2.23 / 2.08 on 8 cores ≈ 32% subscribed** | low |
| Process | 5 bot workers, heap 62–101 MB of 816 (8–12%) | Java `-Xms4G -Xmx6G`, RSS 4.5 GB |
| Data | repo+data 1.7 GB, log 146 MB | world 66 MB, 18 region files, server dir 476 MB |

**The CPU bottleneck is gone.** Sustained load ran 2.5–4.7 on a 2-core box through the
2026-07-25 session — 125–235% subscribed, and everything that felt slow traced to it.
The same workload now sits at ~32%.

Two consequences worth knowing:

- **Multi-agent fan-out is no longer throttled.** Concurrency is derived from core count
  (`min(16, cores − 2)`), so a 6-agent fan-out that previously ran **2 at a time** now
  runs **6**.
- **Bot count can finally rise — the old warning against it is STALE.** §7 used to end
  with "do not raise bot count immediately after resizing, the worker OOM is unexplained."
  That blocker is gone: the OOM was root-caused to `mineflayer-pathfinder` shipping
  `searchRadius = -1` (which disabled A* pruning entirely) and fixed via
  `config.behavior.pathfinderSearchRadius`; there have been **0 kills since**, and workers
  idle at 8–12% of their 816 MB cap. Budget `main ~1 GB + (bots × 0.8 GB) + ~2 GB OS`
  → **15 GB comfortably carries 10–12 bots**, and the honest limit is ~15.

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
| **RAM** | 15 GB | **leave at 15 GB** — heap already raised | The box is fine; the JVM is no longer throttled |
| **Disk** | 175 GB | **leave as is** | World is 66 MB of 159 GB free |

**~~Do not add RAM here — Java is capped at `-Xmx2G`.~~ ALREADY DONE — verified
2026-07-25.** The heap is `-Xms4G -Xmx6G` and has been since the process started
(Jul 25 01:31). It is set in the **systemd unit**, not the start script:

```
# /etc/systemd/system/packetcraft-paper.service
ExecStart=/usr/bin/java -Xms4G -Xmx6G -jar paper.jar --nogui
```

The unit is `packetcraft-paper.service` (`Restart=always`, `SuccessExitStatus=0 143`,
`TimeoutStopSec=180`) — note this is **unlike the bot host's units**, so a clean exit
here *does* respawn. Measured after the change: java RSS 4.6 GB, box 4 of 15 GB used,
10 GB available, load 0.13/0.32/0.34. There is nothing left to do on this line.

> ⚠️ **`start.sh` still reads `-Xms1G -Xmx2G` and is a live footgun.** It is dormant —
> systemd does not use it — but anyone who runs it by hand during debugging gets a
> 2 GB server, and anyone who reads it to answer "what heap are we running?" gets the
> wrong answer. That is exactly how §7 of this file came to claim the change was
> outstanding when it had already shipped. Fixing it needs root (see below).

### Disk — no action on either host

Bot host 49 GB free, MC server 159 GB free. The world is **66 MB** across 18
region files; even aggressive expansion will not trouble that. The one thing
that *was* growing without bound — a 152 MB unrotated bot log — now rotates.

### Order of work

**ALL FIVE ITEMS ARE DONE as of 2026-07-26. Nothing here is outstanding.**

1. ~~**Raise the MC server heap to `-Xmx6G`**~~ **DONE** — was already live; see above
2. ~~**Bot host 2 → 8 vCPU**~~ **DONE** — the bottleneck is gone (235% → 32% subscribed)
3. ~~**Bot host 7 → 16 GB RAM**~~ **DONE** — now 15 GB, 13 available
4. ~~**MC server 2 → 4 vCPU**~~ **DONE**
5. **Disk** — nothing needed, and still nothing

> ~~⚠️ **Do not raise bot count immediately after resizing.** The worker OOM is
> unexplained…~~
>
> **THIS WARNING IS RETIRED — do not act on it.** It was written while the OOM was
> still a mystery ("steady state ~200 MB but something occasionally balloons past
> 768 MB"). It is no longer a mystery and it was never a leak: `mineflayer-pathfinder`
> ships `searchRadius = -1`, which makes `astar.js` compute `maxCost = -1` and disables
> its pruning test entirely; with `canDig = true` the search space became the full 3-D
> volume, and the same AStar context was re-entered every tick with no eviction. Bounded
> via `config.behavior.pathfinderSearchRadius` (default 96). **0 kills since; workers
> idle at 8–12% of their 816 MB cap.**
>
> Scaling is therefore unblocked. The real limit now is RAM, not stability:
> `main ~1 GB + (bots × 0.8 GB) + ~2 GB OS` → **10–12 bots comfortable, ~15 the ceiling.**
> Before adding any, note the open contradiction in §3: bots are still assigned
> stone-mining inside protected zones, so those goals fail permanently. More bots would
> multiply *that*, not a leak. Fix the geofence contradiction first, then scale.

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

---

## 9. Carried forward from the 2026-07-26 Westlight session

That session's own handoff has been merged into this file and removed. Its completed
build log is history and is not repeated here; what follows is only what it left
**open, unverified, or dangerous to assume**.

### 9.1 Fresh-session checklist — nothing built in a prior session may be skipped

```bash
# 1. Is anything still building or still waiting? Expect NOTHING — see trap 20.
#    Three self-deadlocked waiters were killed at the end of that session, one of
#    them still armed to build the members' club into a field already demolished.
pgrep -af buildops || echo "clear"

# 2. Fresh region snapshot. Every check below reads the snapshot, not the live world.
#    A stale snapshot once reported a complete bowl as "only built to y75".

# 3. The source of truth for build state:
python3 scripts/build_status.py
```

### 9.2 Built earlier and never re-verified

The Moot Hall basements are *reachable* (B1 97%, B2 99%), but reachability only says you
can get there. **Nobody has confirmed the venues inside them still match what the docs
claim**, and they were built before that session's tooling existed: three-screen
multiplex, bowling alley, two-level bar with the grand staircase, arcade, bank, IT
office, strip club, brothel, and on the upper storeys the courtroom and post office.

Census each against `docs/ravensreach/design/RAVENSREACH-INTERIORS-2026-07-26.md` and
treat that document as **unverified** — its basement floor levels are already known
wrong.

### 9.3 Assume nothing about these

- **The Sanctum finished on the slow WorldEdit path** (1,904 ops) after the RCON runner
  existed. It verified PLACED but was never re-run through the faster path, so its ops
  file and the world may diverge if anyone regenerates it.
- **`pav1.txt` (the old Central Pavilion) is retired and demolished.** Ravensgate now
  owns the measured footprint at `x[-105,-65] z[-449,-425]`. **Never replay `pav1`.**
- **The old town stadium site is bare graded grass** at `x[-155,-10] z[-570,-451]`, y67.
  Deliberate — the Ravensgate design treats it as available parkland.
- **Four background design agents' full reports exist only in that session's
  transcript** — SoFi Stadium research, YouTube Theater research, the stacked-section
  design, and the Westlight district design. The *decisions* survive in this file and in
  `builds/manifest.yaml`; the reports do not. Re-run the agents if the detail is needed
  rather than half-remembering them.
- **Server-side state that session touched:** bots should all be `gameType 0` (survival)
  — Architect was left in SPECTATOR (3) for hours. Force-loaded chunks should be back to
  roughly the operator's own ~104 around the town.

### 9.4 Ops files that ran but nobody is checking

Nine early repair batches remain on disk as **one-shot migration history**. They are
deliberately excluded from stray-unit reporting; their durable results are covered by
the canonical units' final placement ops, bidirectional routes and structural audit.
If a stray-unit check ever flags them, this is why:

```
dm1_oldstadium.txt   fix1_repairs.txt  fix2_cottage.txt  fix3_canals.txt
fix4.txt             fix5.txt          fix6_irrigation.txt
fix7_doors.txt       fix8_gaps.txt
```

`fix7_doors.txt` remains useful provenance — it re-placed the **29 doors** that had
silently vanished (trap 19) — but it is not a separately rerunnable build unit.
