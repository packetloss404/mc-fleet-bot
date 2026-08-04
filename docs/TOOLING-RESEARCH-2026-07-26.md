# Third-party tooling survey — what's worth adopting

**2026-07-26.** Four research agents, each briefed with this project's real constraints,
then **re-run against the upgraded hardware** when the estate turned out to be a 42U rack
with 6+ ESXi hosts rather than two small VMs. Every claim I could check against our own
box, I checked; those are marked **VERIFIED**.

> ## The headline, before any tool list
>
> **The binding constraint on this project is not hardware, and never was.** It is the
> **LLM call budget.** At ~400 calls/day across 5 bots that is ~80 calls/bot/day. Twenty
> bots on the same cap is one decision per bot every ~18 minutes — the fleet degrades
> into statues. No amount of rack capacity changes this.
>
> Everything below is worth doing. None of it lifts that ceiling except the three things
> that attack it directly: **semantic caching** (LiteLLM), **local inference for
> high-volume low-stakes calls** (needs a GPU), or **a bigger budget**.
>
> **Do not scale the fleet until that moves.**

---

## 1. Do these first — free, verified, not hardware-gated

| # | Action | Why |
|---|---|---|
| 1 | `/attribute <bot> minecraft:scale base set 0.9999999` on spawn | Documented workaround for a **1.21.11-specific** mineflayer collision bug. **VERIFIED**: the attribute reads `1.0` on Scout and Architect, so it is settable |
| 2 | Fix `player-max-chunk-generate-rate` | **VERIFIED `-1.0` — unlimited** on our `paper-global.yml`. A pathfinding bot in virgin terrain can generate without bound |
| 3 | Set bots to `viewDistance: 'tiny'` | Bots render nothing. Cuts chunk-send cost per bot, and it scales *multiplicatively* with fleet size |
| 4 | `/spark profiler start --timeout 600` under load | **VERIFIED** already bundled — `spark` is in `plugins/`. Tells us whether the bottleneck is chunk gen or pathfinding *before* we spend anything |
| 5 | **CoreProtect** v24.0 on MariaDB, 30-day purge | Per-bot, per-radius, per-timespan rollback. Bots authenticate as ordinary players, so every block is attributed to a username |

**On #1 — this corrects a diagnosis I gave earlier.** I attributed the 68% task-success
rate entirely to the mining-geofence contradiction. That was incomplete. There are
**seven open, unfixed, 1.21.11-specific mineflayer bugs**, and issue #3911 reproduces on
Paper 1.21.11 but **not** on 1.21.8: bots "stuck around 0.2 in the air glued to the
block". #3887 has gravity ceasing to apply after knockback. Both are barebones repros
with no plugins. Some real share of our stuck bots is upstream, not us.

**On #5 — the one that stings.** CoreProtect would have reduced the destroyed-tower
incident (`docs/ravensreach/qa/INCIDENT-2026-07-25-ravensreach-structure-loss.md`) from four hours of
snapshot diffing and a near-permanent loss to **one line**: `/co rollback u:<bot> t:2h r:100`.
It would equally have covered the drained lake. If one item from this whole survey gets
adopted, make it this.

---

## 2. Where independent agents converged

Agreement between researchers who could not see each other's work is the strongest
signal here.

- **`remove-caves-below-y` will silently erase Raven Rock** — flagged independently by
  two agents. BlueMap defaults to culling caves below y≈55. Our entire bunker complex
  would simply not appear on the map, with no error. Set `-10000`.
- **Stand up a second, non-production Paper instance** — reached independently by three
  agents by three different routes: a *shadow* server to host Dynmap's cave map, a
  *museum* server (fleet-free, fixed noon) for clean hero shots and visitors, and a
  *staging* server to test the 26.x upgrade. It's the same VM. Build it once.
- **GPU-accelerated Chunky is a trap** — both rendering agents. `ChunkyClPlugin` was
  archived 2024-04-08; its successor is self-declared work-in-progress, incompatible
  with the denoiser, and warns "render results may change drastically between versions".
  The famous ~400× figure is from January 2022. **Scale Chunky on CPU.**
- **prismarine-viewer does not support 1.21.11** — three independent confirmations, plus
  my own: **VERIFIED** our installed v1.33.0 bundles block-states only up to
  `1.21.4.json`. PR #475 adding 1.21.11 has been open and unmerged since 2026-03-12.

---

## 3. Field resolutions — tested on the fleet host

**Two agents contradict each other. Both did real verification. Neither is obviously wrong.**

### 3.1 Headless Chromium WebGL flags

Chrome 137+ removed the automatic SwiftShader fallback, so a GPU-less screenshot of a
WebGL page returns **blank with no error** — the exact silent-failure shape this project
keeps getting burned by. But the prescribed fix differs:

| Agent | Flags | Claim |
|---|---|---|
| map/render | `--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader` | that flag is a **permanent** developer opt-in |
| 3D/walkable | `--use-gl=angle --use-angle=swiftshader` (+ `--no-sandbox`) | `--enable-unsafe-swiftshader` is **no longer the right flag** |

**Resolution: five-minute empirical test on the VM.** Screenshot a known-good WebGL page
under each flag set. Do not wire this into a skill until one is proven, and build the
screenshot step to **fail loudly on a blank image** rather than return it.

**Tested 2026-07-26:** the first flag set works with the cached Chrome Headless Shell
150 on the GPU-less fleet host:

```text
--use-gl=angle
--use-angle=swiftshader-webgl
--enable-unsafe-swiftshader
--no-sandbox
```

The host needed the normal ATK/X11/GBM/ALSA runtime libraries. Chrome logged expected
SwiftShader/WebGL `ReadPixels` performance warnings, but BlueMap loaded a real 1280×720
WebGL canvas and produced textured screenshots. Chrome's one-shot `--screenshot` mode
did not terminate reliably on BlueMap's perpetual render loop; Puppeteer
`page.screenshot()` after the map loaded did.

### 3.2 BlueMap version pin — RESOLVED, primary source

One agent said pin **5.16**; the other said go to **5.22**. I checked the release notes:

| Version | Minecraft | Java |
|---|---|---|
| 5.16 | 1.13.2 – **1.21.11** | **21** |
| 5.17–5.22 | 1.13.2 – 26.x | **25** |

Both were factually right; they differed on recommendation. 5.22's range **spans**
1.21.11 — the practical decision is the **Java version**, not MC support. On a dedicated
render VM where we install Java 25 anyway, **5.22 is the better choice** and is forward-
compatible with the 26.x staging path.

⚠️ **Skip 5.21 entirely — map-breaking bug, fixed in 5.22.** Confirmed in the release notes.

### 3.3 BlueMap camera grammar and interior capture — RESOLVED in-world

BlueMap 5.16 CLI was run under a local Temurin 21 JRE against a `save-all flush`
snapshot of the 1.21.11 world. `remove-caves-below-y: -10000` preserved the mountain
interiors. A second map with a y72 render mask supplied a useful top-down cutaway.

For a Minecraft player camera, the tested conversion is:

```text
BlueMap rotation = radians(Minecraft yaw) + PI
BlueMap angle    = PI / 2 - radians(Minecraft pitch)
```

The full free-camera anchor remains:

```text
#<map>:x:y:z:0:<rotation>:<angle>:0:0:free
```

At the MainStreet mountain entrance, player yaw `-141.673°` and pitch `15.150°`
converted to rotation `0.670`, angle `1.306`; BlueMap reported direction
approximately `(0.599,-0.262,-0.756)`, matching the Minecraft view. The same-camera
before/after capture exposed a sealed lobby/hangar route that the 51-check material
audit had missed. The resulting reachability repair expanded the connected region
from 3,362 to 28,123 standable cells. This is the first production proof that the
snapshot → BlueMap → headless camera → structural audit loop catches a real defect.

---

## 4. The visualisation problem — and a distinction I had wrong

The most useful architectural insight in the whole survey:

> **A WebGL web map is invisible to the agent.** I can only see a world through the
> `Read` tool on a **PNG file**. BlueMap solves the *human* problem — browsable,
> shareable, walkable. It does **not** replace `world_render.mjs` / `mc-look`.

The bridge is **BlueMap + headless Chromium**: BlueMap encodes full camera state in the
URL hash (`#<mapId>:x:y:z:distance:rotation:angle:tilt:ortho:<controlState>`, where
`free` is free-flight), so a Puppeteer script can navigate to an arbitrary viewpoint and
screenshot it. That gives **correct sub-block geometry and real textures** — directly
fixing a real failure mode: our raycaster draws stairs, slabs, fences and panes as **full
cubes**, which has already caused misreadings during this project.

Design principle both rendering agents landed on: **one canonical artifact, two front
doors.** Render BlueMap once; humans get a URL, the agent gets a camera into the same
thing. No drift between what the operator sees and what I reason about.

**Two things not to skip:**

- **Staleness is a new failure mode.** Today `mc_look.py` refreshes the snapshot and
  force-loads before rendering, so what I see is current. A render VM on an rsync cadence
  can show a 20-minute-old world, and I will confidently report a just-placed build as
  missing. **Burn the world-copy mtime into the HUD**, exactly as camera state already is.
- **Keep `world_render.mjs`.** Not sentiment — availability. Zero dependencies, runs
  locally. If the render VM is down or mid-sync the agent is otherwise blind, and the
  fleet keeps acting whether or not it can see.

**Raven Rock is the hard case, and it's physics not hardware.** Chunky converges far
slower with emitters than with sun, and the bunker is *entirely* emitter-lit — expect
10–40 minutes a frame even denoised. The answer found instead: **Dynmap on the shadow
server**, the only tool surveyed that ships an underground cave map out of the box.

---

## 5. Verdicts that did NOT change with unlimited hardware

Worth recording separately, because "we got a bigger rack" is not an argument against any
of these.

| Ruled out | Reason — and it isn't resources |
|---|---|
| **Gaussian splatting / NeRF** | **Principled.** Splatting is an *inverse problem* — it exists to estimate geometry you don't have. We have ground truth in 18 region files. It would burn GPU-hours to approximately re-derive what we already own, in a fuzzier, larger, non-editable form. Fatal for *our* world specifically: a splat only knows what the cameras saw, and we have a sealed bunker plus 600×600 of building interiors. For a technique this fashionable on a format this popular, **the absence of demos is itself evidence** |
| **Unreal / Unity** | **Architectural.** An engine import is a **snapshot, not a mirror** — frozen the moment it's made. BlueMap re-renders changed chunks, so it tracks the fleet's ongoing construction. Wrong shape for a project whose whole point is autonomous ongoing building. *(The agent did retract one sub-argument: with a GPU, Pixel Streaming would give a good sharing story. The snapshot problem survives.)* |
| **Baritone** | **No build for our version** — still v1.15.0 (Aug 2025), targeting 1.21.6–1.21.8 only, eleven months on. And **no programmatic interface**: it's driven by in-game chat commands, so it would be a second disconnected bot architecture sharing nothing with the fleet. *(Narrow new use: one Baritone client as an **operator power tool** — `#mine`, `#tunnel`, area clearing — replacing bespoke scripts like `rr_enlarge_tunnels.py`. Not a fleet member.)* |
| **Folia** | **Workload shape.** Regionised threading only pays when activity is *spatially dispersed*. Our bots cluster in one or two regions, so Folia yields **zero** — and costs FAWE, which doesn't support it. *(Honest correction from the agent: CoreProtect and WorldGuard **do** now support Folia; its earlier "breaks your whole toolchain" claim was overstated.)* |
| **Vision-policy frameworks** (MineStudio, Optimus-3, TeamCraft, Cradle) | **Wrong architecture at any VRAM.** They consume rendered pixels and emit keyboard/mouse actions — their entire purpose is to reconstruct from images the structured world state mineflayer hands us for free |
| **Overviewer, Mapcrafter, uNmINeD** | Version support, deadness, and licence respectively. uNmINeD is technically excellent but **forbids commercial use** |
| **Self-hosted LiteLLM / Langfuse — REVERSED** | These *were* ruled out on resources and **now flip to yes**. See §6 |

---

## 6. What flipped when the hardware turned out to be a rack

- **Langfuse (self-hosted)** — the most valuable flip. Needs Postgres + ClickHouse +
  Redis + S3-compatible storage: absurd on a small box, routine on a VM. **Why it
  matters beyond infrastructure:** we have *no eval harness*. Langfuse's scores primitive
  lets us trace every codegen call and attach the critic's verdict as a score, giving
  per-model, per-prompt, per-bot success rates. **The TokenLedger tells us what we spent;
  this tells us what we got.**
- **LiteLLM (self-hosted)** — **semantic caching** is a direct attack on the binding
  constraint in a way a ledger cannot be, because a ledger only measures. Curriculum and
  critic loops re-ask structurally similar questions constantly. Put **OpenRouter behind
  it** for a provider-enforced hard ceiling. Keep a direct-to-provider fallback so a
  LiteLLM restart doesn't idle the fleet.
- **Blender + MCprep** — flips from "miserable" to recommended, once the obvious fix is
  seen: **author the `.blend` on the desktop interactively, render headless on the VM.**
  You script *parameters* of a scene a human already validated. Verified constraint:
  EEVEE cannot run headless without a GPU; Cycles CPU works fine in `-b` mode.
- **Chunky** — with the CPU-only **OIDN denoiser** (previously omitted), daylight
  exteriors drop from ~8 min to **~30 s**. Routine for surface, set-piece for interiors.
- **Staging everything** — a Paper 26.x server plus a second fleet instance stops being a
  half-day gamble and becomes permanent infrastructure. That's what makes the eval
  harness actionable: we currently cannot A/B a prompt change, model swap or pathfinder
  setting without experimenting on the live world.

**On the GPU question:** *"Nothing on the critical path needs a GPU. A GPU is an
accelerator, not an unlock."* Don't provision one for Minecraft rendering. **Do**
consider one for **local inference** — that is the only thing that would take the LLM
budget ceiling off the table. Without one, local **embeddings** are still worth doing on
CPU now, removing the VoyageAI dependency at zero marginal cost.

---

## 7. Proposed estate

| VM | Role | vCPU / RAM | Contents |
|---|---|---|---|
| **mc-prod** | Paper 1.21.11 | 8 / 16 | Paper, CoreProtect, WorldGuard, FAWE, Chunky pregen **1.4.40** (pin — 1.5.3 is 26.x only), spark |
| **mc-staging** | Paper 26.x | 4 / 12 | The ViaBackwards proving ground |
| **proxy** | Velocity | 2 / 4 | ViaVersion + ViaBackwards 5.11.0 — cleaner on the proxy than the game server; move the fleet between prod and staging by changing a route |
| **fleet-prod** | Existing bot host | 8 / 15 | Unchanged |
| **fleet-staging** | Second fleet | 4 / 8 | The A/B rig |
| **obs** | Observability + LLM plane | 8 / 24 | Prometheus, Grafana, Loki, **Langfuse**, **LiteLLM**, MariaDB for CoreProtect |
| **render** | Visualisation | 14–16 / 48–64 | **Java 25.** BlueMap 5.22 CLI, Chunky + OIDN, Puppeteer, shadow Paper + Dynmap, nginx |

**Sizing notes.** 14 vCPU rather than 16 on the render VM *if* that's a single-socket
E5-2680 v4 (14c/28t per socket) — a 16-vCPU VM would span NUMA nodes and a path tracer
pays for it. Check host topology first.

**Storage discipline matters more than sizing:** the render VM must **never** read the
live world. Snapshot on the `save-off → save-all flush → snapshot → save-on` cycle and
expose that read-only. Renders then can't contend with the tick loop, can't catch a
half-written region file, and are reproducible.

**Do not split the fleet across VMs.** Shared state (blackboard, social memory, world
model, town brain) lives **in-process** via worker-thread IPC. Splitting means replacing
it with a network store plus distributed coordination — a re-architecture, not a
deployment change, and it buys nothing while fleet-prod sits at 32%. Run **two fleets**,
not one fleet split in two.

**On MC server cores:** 4 → 8 is worth doing (chunk *generation* parallelises, GC gets
headroom, async plugin work moves off-tick). **8 → 32 is largely wasted** — bot-generated
load is main-tick work and does not parallelise. Raising `-Xmx` from 6 G to 8–10 G and
setting bots to `viewDistance: 'tiny'` both beat adding cores.

---

## 8. Traps collected

1. **`remove-caves-below-y` defaults to ~55** → Raven Rock silently vanishes. Set `-10000`.
2. **Chrome 137+ dropped automatic SwiftShader fallback** → blank screenshots, no error.
   The tested fleet-host flags are recorded in §3.1; still make the screenshot step fail
   loudly on a blank or unloaded canvas.
3. **Two unrelated projects are named "Chunky"** — `chunky-dev/chunky` is the path
   tracer; `pop4959/Chunky` is the pregeneration plugin. Most 1.21.11 search results
   point at the wrong one.
4. **Chunky stable 2.4.6 caps at MC 1.20.4** and cannot read our world — the 2.5.0
   **snapshot** is mandatory.
5. **Skip BlueMap 5.21** — map-breaking bug.
6. **BlueMap 5.17+ needs Java 25**; our MC server runs Java 21. Argues for the CLI on its
   own VM rather than a plugin on the game server.
7. **Render staleness** — stamp the world-copy timestamp into every image.
8. **Never point two servers at one world directory**, and don't expose the shadow
   server's port.
9. **prismarine-viewer's assets stop at 1.21.4** — VERIFIED locally. Its headless path is
   also shaky: `node-canvas-webgl` is v0.3.0 and ~3 years stale, with an open
   "headless.js doesn't work" issue.
10. **The LLM-gateway comparison genre is SEO spam.** One agent checked a widely-syndicated
    claim about a "17,000-star OmniRoute" project and found **no such repository exists**.

---

## 9. Confidence and what's still open

**Verified against our own box:** the `minecraft:scale` attribute, `player-max-chunk-generate-rate: -1.0`,
spark bundled in `plugins/`, prismarine-viewer's 1.21.4 asset ceiling, no Java on the bot
host, MC server on Java 21. **Verified from primary source:** the BlueMap version/Java
matrix and the skip-5.21 warning.

**Flagged by the agents as unverified — do not cite without checking:** the arXiv IDs for
the "Ratchet" skill-lifecycle paper; whether Pufferfish has a 1.21.11 build; Chunky SPS
throughput estimates (±2× error bar — one benchmark render settles it); whether vanilla Minecraft renders
acceptably under llvmpipe without a GPU.

**All four agents have now reported.** See §10 and §11.

---

## 10. The finding that changes how we build — "you are using the wrong actor"

> **WorldEdit needs a *player* to hold a session.** That is why every build script here
> fell back to RCON `/fill`. **But we already run a fleet of player-shaped mineflayer
> bots.** Op one, grant it `worldedit.*`, and have it type `//pos1`, `//pos2`, `//set`.

That single change collapses **four of the five standing build pain points at once**:

| Pain point | Today | With a bot driving WorldEdit |
|---|---|---|
| `/fill` silently no-ops above 32,768 blocks | every op hand-chunked | `maxChangeLimit: -1` — no cap |
| RCON writes need loaded chunks | manual `forceload add`/`remove` | WorldEdit handles chunk loading |
| No undo | hand-rolled snapshot diffs | `//undo`, and `//restore` from a backup |
| `/fill` cannot express random patterns | one material per fill | native weighted-random syntax |

**We already knew half of this and never connected it.** HANDOFF's OQ-2 note says plainly
that opped bots are *"the only way to drive WorldEdit `//` commands (the console has no
selection)"* — recorded as a reason **not** to de-op, never as a reason to route builds
through WorldEdit.

**What it would have meant for last night's work, concretely:**

- The greenstone finish ran as **30 hand-chunked `/fill` commands** across three caverns
  with **one material per surface**, because `/fill` cannot speckle. In WorldEdit that is
  three lines with real variation:
  `//set 70%stone,15%mossy_cobblestone,10%andesite,5%emerald_ore`
- **`//restore` is the recovery tool I needed and hand-rolled.** Point `snapshotRepo` at a
  backup directory and `//restore` rebuilds **a selection** from a snapshot, live, no
  downtime. Recovering the destroyed 460-block tower would have been `/snap use` +
  `//restore` instead of a bespoke diff-and-replay script and a `/tmp` archaeology
  expedition.
- FAWE adds `/frb history <bot> <radius> <time>` — *"undo everything this bot did in the
  last 20 minutes within 100 blocks"* — which is the exact shape of the debris-sweep
  disaster.

### WorldGuard — TESTED 2026-07-26, does not block. But read *why*.

Full cycle run **inside the `mainstreet_america` region** (bounds x[-70,70] y[62,319]
z[-235,200]), on a 5×5×5 box of pure air at y250: `//set glass` → *"Operation completed
(125 blocks affected)"*, probes confirmed glass; `//undo` → *"Undid 1 available edits."*,
probes confirmed air. **Nothing was blocked.**

It does not block for **two independent reasons, and the second is a warning:**

1. **No `build` flag is set on any region.** All four carry only `mob-spawning: deny`.
2. **The bots are op level 4, and op bypasses `build: deny`** — so even if the flag were
   set, it would not stop them.

> ⚠️ **This couples two decisions that were previously independent.** OQ-2 (deferred) is
> "de-op the builder bots, *then* set the WorldGuard build flags". The moment that
> happens, **this WorldEdit path breaks** — a de-opped bot loses both the `//` commands
> and the `build` permission. Whoever executes OQ-2 must also grant the build bot
> `worldedit.bypass` or region membership, or bulk building stops working with no
> obvious cause. Record this against OQ-2 before anyone acts on it.

**Bonus capability discovered while testing:** a bot can read WorldGuard's `/rg` output,
which the console cannot. HANDOFF's OQ-3 note said region-command output "is *not* routed
back over RCON, so `rg list` looks empty — check the file". That workaround is now
obsolete: `we_admin.py cmd "/rg info mainstreet_america"` returns the full region info —
type, priority, flags, owners, members and bounds. Any RCON-invisible command output is
now readable this way.

---

## 11. VERIFIED live defect in our own code — `prismarine-schematic`

`src/build/SchematicStore.ts:65` reads `.schem` files via `prismarine-schematic`. I
inspected the installed package. **All three defects are real, and we are on 1.2.3 —
older than the 1.3.0 the agent assessed.**

| Defect | Evidence from `node_modules/prismarine-schematic/lib/spongeSchematic.js` |
|---|---|
| **Cannot read Sponge v3** | Reader uses **flat root access** — `nbt.Palette`, `nbt.Width`, `nbt.BlockData`. v3 nests these under `{"": {"Schematic": {"Blocks": {…}}}}`. **WorldEdit 7.4 writes v3 by default**, so `//schem save` output will fail or decode to garbage |
| **Writes v2 only** | `Version: { type: 'int', value: 2 }` — hardcoded |
| **Drops all block entities** | **Zero** `BlockEntities`/`TileEntities`/`Entities` handling anywhere in the package. Chests, signs, banners, item frames vanish on round-trip |

Plus upstream bug [#82](https://github.com/PrismarineJS/prismarine-schematic/issues/82)
(filed 2026-04-21, unfixed): int-typed block states mis-decode —
`white_stained_glass_pane` reads as `repeater`.

**Why #82 matters more than it looks:** it produces **false mismatches** when diffing a
build against its schematic. That is precisely the failure class that dominated the
2026-07-25 audits — four "missing" findings that turned out to be probe errors. A
verification tool that reports phantom differences is worse than no tool, because it
manufactures work and erodes trust in real findings.

**Stopgap:** force `//schem save sponge.2 <name>` so WorldEdit emits v2.
**Real fix:** move region reads to `prismarine-provider-anvil` 2.13.0 (`loadRaw`/`saveRaw`,
MIT, 2026-04-01), or evaluate `nucleation`.

### nucleation — promising, not yet dependable

MIT, Rust→WASM for Node *and* native Python wheels. Reads/writes `.litematic`, Sponge v2
**and v3**, `.mcstructure`, `.mca`, whole world dirs. Two primitives are directly aimed at
our problems: **`Diff.compute(before, after)`** (structural diff — verification and
rollback in one call) and **`Fingerprint.is_duplicate()`** (translation- and
orientation-invariant: *"did the bots build the right thing, anywhere?"*).

**But:** ~14 stars, pre-1.0, and shipping **breaking releases daily** (0.3.18 → 0.7.0 in
five days). Pin an exact version, wrap it behind an interface, keep prismarine as
fallback. Do not bet the fleet on it yet.

### ⚠️ New trap — a world cleaner would delete our town

**Never run Thanos, PotatoPeeler, or ChunkCleaner on this world.** All three prune chunks
by `InhabitedTime` — and **a bot-built 600×600 town that no human has ever walked through
has near-zero `InhabitedTime`.** PotatoPeeler's own docs warn that worlds *"created or
edited by mods / external softwares rather than manual construction by players"* have
unpredictable values. These are marketed as disk-saving tools; here they are a
world-deleting hazard.

### Also worth knowing

- **Amulet is NOT open source.** Its `LICENSE` reads *"All rights reserved. A licence must
  be purchased."* There was never a permissive period — earlier releases shipped with no
  licence file at all, which defaults to all-rights-reserved. PyPI ships blank licence
  metadata, which is how the "Amulet is open source" myth spreads.
- **The entire MCEdit lineage is dead** — the 1.13 flattening killed it. Hard 1.12 ceiling.
- **WorldEdit 7.4.4** is out; we run **7.4.0**.
- **Never run WorldEdit and FAWE together** — FAWE replaces it.
- **`//fast` disables FAWE logging**, so anything run under it cannot be undone. Never use
  it for automated destructive work.
