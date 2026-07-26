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
incident (`docs/INCIDENT-2026-07-25-ravensreach-structure-loss.md`) from four hours of
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

## 3. Unresolved — do not guess, test

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
   Flags unresolved (§3.1) — make the screenshot step fail loudly on blank.
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
throughput estimates (±2× error bar — one benchmark render settles it); BlueMap's exact
URL-anchor field grammar (five minutes empirically); whether vanilla Minecraft renders
acceptably under llvmpipe without a GPU.

**Still pending:** the fourth agent, on build/schematic tooling and undo/rollback, has not
reported. Its findings will overlap CoreProtect and FAWE above. This document will need a
section on schematic round-tripping and safe rollback when it lands.
