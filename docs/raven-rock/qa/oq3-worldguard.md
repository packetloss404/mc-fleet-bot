# OQ-3 (second half) — WorldGuard regions + `mob-spawning: deny` — APPLIED 2026-07-25

Scope of this pass: **server configuration only.** No Minecraft world block was created, changed or
removed. No one was opped or de-opped. No service was restarted.

---

## 1. The premise the planning set was built on was false

`docs/raven-rock/planning/coordinates.yaml` `meta.site_conditions` asserted "stock Paper with **NO plugins** —
no WorldEdit, WorldGuard, Dynmap, or EssentialsX/Citizens", and ~15 other files repeated it. That is why
OQ-3 was framed as *lighting-only* ("no WorldGuard `mob-spawning:deny` will exist") and why both
`integration/worldguard.yaml` files were marked "STAGED, NOT ACTIVE".

Measured reality (`plugins` over RCON):

```
> plugins
Server Plugins (3):
Bukkit Plugins:
 - PacketCraft, WorldEdit, WorldGuard

> worldedit version
WorldEdit version 7.4.0
```

WorldGuard is **7.0.16**. Overworld name **confirmed as `world`** — that resolves assumption `WG02` /
`RR-WG02`, which had been carrying a `<world>` placeholder. Genuinely still absent: **Dynmap/BlueMap,
EssentialsX, Citizens**, and the mc-fleet-bot relay plugin — so `integration/map-marker.yaml`,
`integration/warps.yaml` and `integration/location.yaml` remain correctly dormant.

## 2. Live WorldGuard state BEFORE this pass

`plugins/WorldGuard/worlds/world/regions.yml` contained exactly one region and zero flags:

```yaml
regions:
    __global__:
        members: {}
        flags: {}
        owners: {}
        type: global
        priority: 0
```

`plugins/WorldGuard/worlds/world/config.yml` is defaults-only (`regions.titles-always-use-default-times`).
So: **neither `worldguard.yaml` had ever been applied, and nothing had ever been protected.** Mob
suppression was resting entirely on `difficulty=peaceful` — exactly the fragility OQ-3 named.

## 3. What `docs/mainstreet-america/integration/worldguard.yaml` specified vs. what was applied

| | Staged file | Applied |
|---|---|---|
| Region id | `mainstreet_america` | same |
| Bounds | x[-300,300] **y[-64,320]** z[-300,300] | **x[-70,70] y[62,319] z[-235,200]** |
| Priority | 10 | 10 |
| Flags | 27 flags incl. `build: deny`, greeting/farewell | **`mob-spawning: deny` only** |
| owners/members | empty, "fill in at apply-time" | still empty — see §6 |

Three deliberate deviations:

1. **Bounds narrowed to the developed band.** The staged 600×600 full-column envelope would have put MSA's
   flag set over Raven Rock's entire subsurface and over the Ravensreach approach. Instead the three sites
   get three regions that tile the space with **no gap and no overlap** (`raven_rock` stops at y61,
   `mainstreet_america` starts at y62; Ravensreach is entirely at z ≤ −310, outside the ±300 envelope).
2. **y max is 319, not 320.** A 1.21 overworld is y −64…319; `320` is out of range. Both staged files say
   320. Corrected silently at apply-time.
3. **Only `mob-spawning` applied.** See §5 — the rest is OQ-2's job and would be inert today.

`docs/raven-rock/integration/worldguard.yaml` needed **no** bound changes: its y61 cap (one below MSA's y62
foundation) and its `raven_rock_shaft` sub-region were adopted verbatim. Note the cap is y61, not the
OQ-4 guardrail's y41 — deliberately, so the region also covers the greenstone buffer y41→y61 that OQ-4
exists to protect. It still never reaches MSA's y62 surface band.

There is no staged WorldGuard file for **Ravensreach** at all; `ravensreach` was defined here from the
as-built bounds in `docs/ravensreach/qa/audit-2026-07-25.md` (graded site x[−132,−38] z[−425,−333], grove out
to z −314), padded to x[−140,−30] z[−430,−310].

## 4. Regions now live

```
mainstreet_america   x[ -70, 70]  y[ 62,319]  z[-235,200]   priority 10   mob-spawning: deny
raven_rock           x[-300,300]  y[-64, 61]  z[-300,300]   priority 11   mob-spawning: deny
raven_rock_shaft     x[ 193,207]  y[-12, 64]  z[ -22, -8]   priority 20   mob-spawning: deny
ravensreach          x[-140,-30]  y[-64,319]  z[-430,-310]  priority 10   mob-spawning: deny
```

Method: WorldGuard's `/rg define` needs a WorldEdit selection and the console has none, so the four
selections were made through the opped bot **Scout** via `POST /api/bots/Scout/say`
(`//pos1 x,y,z` / `//pos2 x,y,z` / `/rg define <id>`). Priorities and flags need no selection and went
over RCON with `-w world`. **Note for whoever repeats this:** the bot's WorldEdit selection is shared
state — if another agent has a live `//pos1`/`//pos2` set on the same bot, this clobbers it.

### Verification

`/rg flag` **is synchronous** over RCON and echoes the resulting flag set:

```
> rg flag -w world mainstreet_america mob-spawning deny
Region flag mob-spawning set on 'mainstreet_america' to 'DENY'.
(Current flags: mob-spawning: DENY)
> rg flag -w world raven_rock mob-spawning deny
Region flag mob-spawning set on 'raven_rock' to 'DENY'.
(Current flags: mob-spawning: DENY)
> rg flag -w world raven_rock_shaft mob-spawning deny
Region flag mob-spawning set on 'raven_rock_shaft' to 'DENY'.
(Current flags: mob-spawning: DENY)
> rg flag -w world ravensreach mob-spawning deny
Region flag mob-spawning set on 'ravensreach' to 'DENY'.
(Current flags: mob-spawning: DENY)
```

`rg list -w world` (async — see §7; it landed on the third attempt) confirms in-memory registration:

```
------------------- Regions -------------------
1. __global__     2. mainstreet_america     3. raven_rock
4. raven_rock_shaft     5. ravensreach
```

And after an explicit `rg save -w world`, WorldGuard's own serialization of its live state —
`plugins/WorldGuard/worlds/world/regions.yml`, WorldGuard-written, not hand-edited:

```yaml
regions:
    mainstreet_america:
        min: {x: -70, y: 62, z: -235}
        max: {x: 70, y: 319, z: 200}
        members: {}
        flags: {mob-spawning: deny}
        owners: {}
        type: cuboid
        priority: 10
    raven_rock:
        min: {x: -300, y: -64, z: -300}
        max: {x: 300, y: 61, z: 300}
        members: {}
        flags: {mob-spawning: deny}
        owners: {}
        type: cuboid
        priority: 11
    raven_rock_shaft:
        min: {x: 193, y: -12, z: -22}
        max: {x: 207, y: 64, z: -8}
        members: {}
        flags: {mob-spawning: deny}
        owners: {}
        type: cuboid
        priority: 20
    ravensreach:
        min: {x: -140, y: -64, z: -430}
        max: {x: -30, y: 319, z: -310}
        members: {}
        flags: {mob-spawning: deny}
        owners: {}
        type: cuboid
        priority: 10
    __global__:
        members: {}
        flags: {}
        owners: {}
        type: global
        priority: 0
```

A pre-change backup sits at `regions.yml.bak.pre-oq3` on the server.

**Not verified:** that the flag actually stops a spawn. `difficulty=peaceful` is still set, so no hostile
spawn attempt occurs to be denied. Raising difficulty to test it would put mobs into the museum builds and
was out of scope. The flag is now the durable guard *for* the moment someone raises difficulty — which was
the entire point of OQ-3's second half.

## 5. ORDERING — read this before doing OQ-2

**`build: deny` was not set, and must not be set yet.** Op level 4 bypasses WorldGuard region protection.
Applying the build/grief flags while the five bots hold op would protect nothing while making the site
*look* protected — the worst of both outcomes, and it would silently break the bots the instant they were
de-opped without members being seeded first.

Correct sequence for OQ-2, in order:

1. **Accept construction.** Building is still in progress; nothing below happens before that.
2. **Seed `owners` / `members` on all four regions.** They are empty right now. The human admin is
   `packetloss404` = `dac51b37-928d-35f5-b87a-0fcabb26752a`. Do this *before* step 3, or the de-op removes
   the last edit path into the build.
3. **`deop` the five builder bots** (Mason, Architect, Steward, Scout, Surveyor — all level 4 in
   `ops.json`). ⚠️ De-opping also removes their `/tp`, `/fill`, `/setblock` and WorldEdit access; the
   fleet's own build and movement code uses those. Expect fleet behaviour changes, and re-check the
   bot-driven build path afterwards.
4. **Then apply the build/grief flags** from the two `integration/worldguard.yaml` files: `build`,
   `block-break`, `block-place`, `chest-access`, `item-frame-rotation`, `pvp`, `mob-damage`,
   `damage-animals`, the explosion family (`creeper-explosion`, `other-explosion`, `tnt`,
   `ghast-fireball`, `wither-damage`, `enderman-grief`), the fire family (`fire-spread`, `lava-fire`,
   `lighter`), the weather family (`ice-form`, `ice-melt`, `snow-fall`, `snow-melt`, `vine-growth`),
   `interact: allow`, `use: allow`, `entry`/`exit`/`passthrough: allow`, and the greeting/farewell.
5. **Re-verify** — via `rg flag <id> <flag> <value>` echoes and a `rg save` + `regions.yml` read, not via
   `rg info` (§7).

Also worth deciding at step 4: **Ravensreach is a *living* town, not a museum.** A blanket
`mob-spawning: deny` there also blocks breeding and spawn-egg spawns, so if the TownBrain is ever meant to
keep livestock, replace the blanket flag on `ravensreach` with WorldGuard's `deny-spawn` flag listing
hostile types only. That trade did not need deciding today (difficulty is peaceful, there are no animals),
but it will.

## 6. Not done, deliberately

- No `build`/grief flags (§5).
- No `owners`/`members` seeded — that belongs with the de-op, and seeding them now grants nothing the bots
  don't already have via op.
- No `__global__` flags touched. Setting `passthrough`/`build` on `__global__` would affect the whole
  overworld including other teams' work.
- `difficulty` left at `peaceful`.
- No world blocks touched.

## 7. Tooling trap worth recording

**WorldGuard's `/rg info` and `/rg list` render asynchronously, and their output never reaches an RCON
sender.** `rg info -w world <id>` returns an empty RCON reply, every time, for every region — and nothing
appears in `latest.log` either, despite `broadcast-rcon-to-ops=true`. `rg list` is worse: it *intermittently*
lands, because the async task sometimes finishes before the RCON buffer flushes (it returned empty, empty,
the full list, empty, empty across five identical calls). Treat an empty `rg list` as **no information**,
not as "no regions" — the same three-state discipline the block probes needed.

Consequences:

- Region state must be read from `plugins/WorldGuard/worlds/world/regions.yml` **after an explicit
  `rg save -w world`**, not from `rg info`.
- WorldGuard's disk write is *deferred* (`WorldGuard Region I/O` thread, "background saved"). Immediately
  after `rg define`, the file still shows the old contents. This pass initially misread a
  successfully-created region as a failure for exactly that reason. Always `rg save` before reading.
- `rg flag` and `rg setpriority` **do** reply synchronously, and `rg flag` conveniently echoes the region's
  full current flag set — that is the best read-back channel available from RCON.
- No console channel exists as a fallback: the Paper server runs under
  `packetcraft-paper.service` with no `StandardInput`, so its stdin is `/dev/null`.
- `POST /api/bots/<name>/say` returns `{"success":true}` on *dispatch*, not on execution. Confirm the
  command actually landed by grepping the server log for `issued server command`.

## 8. Docs corrected in this pass

The "no plugins" claim (and, where it co-occurred, "bots are NOT opped") was corrected in:

`docs/raven-rock/`: `planning/coordinates.yaml`, `planning/site-plan.md` (§1 + Assumptions),
`planning/buildings.yaml` A6, `planning/palettes.yaml`, `planning/open-questions.md` (OQ-2/OQ-3 rows +
OQ-3 heading), `qa/qa-report.md` §2.3 + §4, `qa/build-log.md`, `README.md`,
`integration/worldguard.yaml`, `integration/map-marker.yaml`, `integration/location.yaml`,
`integration/warps.yaml`, `visuals/raven-rock-NOTES.md` (C-6 and C-7 closed).

`docs/mainstreet-america/`: `planning/coordinates.yaml`, `planning/site-plan.md` (§1 + Assumptions),
`planning/buildings.yaml` A7, `planning/palettes.yaml`, `qa/qa-report.md` §2.3 + §4, `README.md`,
`integration/worldguard.yaml`, `integration/map-marker.yaml`, `integration/location.yaml`,
`integration/warps.yaml`.
