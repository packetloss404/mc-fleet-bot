# Town Activation & Elections

**Date:** 2026-07-24
**Scope:** audit of the dormant town/social/governance layer, an activation runbook, and an election design built on the existing approvals machinery.
**Status:** analysis only. No code, config, or mutating endpoint was touched producing this document.

---

## 0. TL;DR

The civilization layer is **real, wired, and running** — a `TownBrain` with 14 sub-loops, a durable approvals/voting engine with restart rehydration, a decree→standing-rule path that genuinely biases task selection, a chronicle generator, districts, diplomacy, and disaster recovery. It has simply never had a row in it.

`data/town.db`: 11 tables, `user_version = 3` (migrations applied), WAL enabled, **0 rows in every table**. `governance.enabled: true` and `social.culture: true` in `config.yml` are currently **pure no-ops**, because both gate on *town residency* and no bot is a resident of anything.

The activation is mostly two HTTP calls and one config block. What is *not* wiring — and needs code — is the operator's three headline wants: bots gathering at a place, bots asking each other for help, and elections.

---

## 1. The `GET /api/towns` 500 — root cause

**It is not a town-layer bug. The probe hit the wrong port during a restart window.**

Evidence:

1. `GET /api/towns` currently returns `200 {"towns":[]}` on **both** `127.0.0.1:3001` (the API) and `127.0.0.1:3000` (the dashboard). Verified 5/5 consecutive probes on each.
2. `/var/log/mc-fleet-web.log:76` contains exactly one proxy failure, and it names the endpoint:
   ```
   Failed to proxy http://127.0.0.1:3001/api/towns Error: connect ECONNREFUSED 127.0.0.1:3001
     errno: -111, code: 'ECONNREFUSED', address: '127.0.0.1', port: 3001
   ```
3. Timing: `mc-fleet-web.service` started **20:21:27**, `mc-fleet-bot.service` started **20:29:18**. For those ~8 minutes the dashboard was up and the API was down (other agents restarted the bot service ~13 times today; `NRestarts=0`, so all were manual `systemctl restart`, not crashes).
4. `web/next.config.ts:29-33` rewrites `/api/:path*` → `http://127.0.0.1:3001/api/:path*`. On `ECONNREFUSED` Next's rewrite proxy answers with a plain-text **`Internal Server Error`** — which is precisely the string reported, and precisely *not* the JSON `{"error": ...}` shape every real handler in `townRoutes.ts` returns.

**Conclusion:** the probe went to port 3000 while `mc-fleet-bot` was restarting. Nothing blocks activation.

**Secondary finding worth a one-line fix (real, but not what happened):** `GET /api/towns` at `src/server/routes/townRoutes.ts:61-67` is one of the few handlers in that file with **no try/catch**. If `listTowns()` / `listResidents()` / `townToDTO()` ever throws (locked DB, corrupt row), Express's default handler emits the identical plain-text `Internal Server Error`. Every neighbouring route (`/designs`, `/trade-routes`, `/town-relationships`) is wrapped. Worth hardening so this symptom can never be ambiguous again — but it is not today's cause.

**Operational note:** always probe the API on **3001** when diagnosing. A 500 from 3000 tells you about the proxy, not the API.

---

## 2. Part A — capability audit

| Operator's want | Verdict | One-line reason |
|---|---|---|
| Bots gather socially at a location | **Must be built** — config gets you most of the way, one line finishes it | No "go to the hall" behaviour exists; `protectedZones` is the only home-target mechanism, it's `[]`, and the goal it feeds is suppressed on clear nights |
| Bot asks another for help | **Partly** — receiver works, sender is dead | `help_request` handling exists and queues a task; *nothing in production ever sends one* |
| Ideas spreading bot-to-bot | **Exists mechanically, inert in practice** | Trust gate unreachable, bootstrap deadlock, belief changes no behaviour |
| Proposals / voting / approvals | **Exists, end-to-end, durable** | Only 2 producers; heuristic voting is LLM-free and hardcoded |
| Mayor + city council | **Mayor exists (a human). Elections do not. Council does not.** | `setMayor`'s own docblock promises a re-election caller that was never written |
| Town growing by collective decision | **Partly** | Buildings follow a hardcoded seed plan; only *expansion* is voted on |

### 2.1 Bots gathering at a location

**No "go to the town hall" behaviour exists anywhere in the codebase.**

What actually drives a bot's destination today, in priority order (`src/voyager/VoyagerLoop.ts:1255-1262`):

1. Goal-override / long-term goal task
2. `playerTaskQueue` — explicit player tasks, and (see 2.2) inbound `help_request` messages
3. **Blackboard claim** — `claimBestTask` (`src/voyager/BlackboardManager.ts:193-224`); this is a real control-flow branch, not prompt context, and a successful claim **suppresses the curriculum LLM call entirely**
4. Caretaker place-only loop (only for leashed builders — see the trap in §3.6)
5. `CurriculumAgent.proposeTask` — the roaming LLM curriculum, the source of most wandering

Overlaid on that: `GoalGenerator`'s per-personality role goals (`src/voyager/GoalGenerator.ts:79-119`) send explorers walking 100 blocks and guards on patrols; `mining.mineSite` routes ore tasks to a fixed coordinate; `behavior.wanderRadius: 15` idles; `leash` clamps movement.

**The only home-target mechanism that exists** is `getNearestProtectedCenter` (`src/actions/geofence.ts:165-182`), which scans `mining.protectedZones` for the nearest zone with `shelter !== false` and returns its centre at `y = minY + 24`. `VoyagerLoop` feeds it to `GoalGenerator` as `shelterTarget` (`src/voyager/VoyagerLoop.ts:487-491`), and sets `hasShelter` from `isProtected(pos)` — note that is *"am I standing inside a protected box"*, **not** a roof-and-walls check. (`src/actions/shelterCheck.ts` does implement a real enclosure check and has **zero callers**.)

With `protectedZones: []`:

- `hasShelter` is always `false` → every bot generates a nightly shelter goal
- `shelterTarget` is always `null` → nowhere to send them → **each bot builds its own ad-hoc hut**

**Important correction to the obvious plan:** adding a protected zone is necessary but *not sufficient*. The night goal is emitted at **urgency 6 on a clear night, 7 when raining** (`src/voyager/GoalGenerator.ts:352-369`), and `computeSurvivalGoal` only returns a goal as a task override when **`urgency >= 7`** (`src/voyager/VoyagerLoop.ts:498-500`). So:

| Situation | With `protectedZones` set | Effect |
|---|---|---|
| Bot already inside the zone at dusk | `hasShelter: true` → no night goal at all | ✅ stops redundant in-town huts |
| Bot in the field, **raining** | urgency 7 → override fires, "travel to town near (x,y,z)" | ✅ comes home |
| Bot in the field, **clear night** | urgency 6 → **goal generated then discarded** | ❌ stays out |

So the config change delivers two of three cases. Reliable dusk homing needs **one line**: either raise the clear-night urgency to 7 (`GoalGenerator.ts:362`) or lower the override gate to `>= 6` (`VoyagerLoop.ts:498`). Prefer the former — it is scoped to this goal, whereas lowering the gate promotes every other urgency-6 safety goal too.

**`ScheduleManager` is a near-miss.** It maps (role × day/night) → task descriptions and pushes them onto the blackboard (`src/town/ScheduleManager.ts:387-421`), tagged `town`, `town:<id>`, phase, role. Deduped, GC'd, genuinely working. But `addTask` is called **without the `location` argument** — so `"seek shelter and rest until dawn"` is free text with no coordinate. The scoring function already supports distance (`BlackboardManager.scoreTaskEnhanced`), so **daytime gathering is a small build**: emit a muster task *with* a location. Perhaps 20 lines.

`GreetingDispatcher` (`src/town/GreetingDispatcher.ts`) is the only genuinely social behaviour: residents greet the mayor **player** within 16 blocks, personality-flavoured, 5-min cooldown. Reactive and chat-only — it moves nobody.

> **⚠ The obvious workaround is broken. Do not plan around it.**
> `CommandCenter` dispatches movement via `worker.sendCommand('walkTo'|'follow'|'returnToBase'|'unstuck'|'equipBest'|'depositInventory', …)` (`src/control/CommandCenter.ts:546-668`). The worker's IPC command switch (`src/worker/botWorker.ts:175-266`) handles only `disconnect, reconnect, releaseQuarantine, setMode, queueTask, reorderQueue, clearQueue, queueChat, swarmDirective, chat, setBotState, pauseVoyager, resumeVoyager, stopMovement, config:patch`. **There is no `walkTo`, `follow`, or `returnToBase` case**, and `sendCommand` is fire-and-forget with no ack.
> Consequently `POST /api/bots/:name/walkto`, `/follow`, `/return-to-base`, `/unstuck`, `/equip-best`, and the `walk_to_coords` / `move_to_marker` / `regroup` / `guard_zone` / `patrol_route` mission commands all **return HTTP success and move nothing**. Separately, `src/actions/patrol.ts` has no live caller anywhere.
> The only working command-side movement channel is `queueTask` — which becomes an English string for the LLM again. So "just tell the bots to walk to the hall" is not currently an option, and fixing the worker switch is arguably a better first build than a muster task.

**The under-appreciated lever:** `src/voyager/VoyagerLoop.ts:1241-1252`. A bot with a **non-idle town role** and no higher-priority task **idles rather than running the curriculum**, with the comment *"Curriculum-proposed tasks tend to be exploratory Voyager-style mining/exploring quests that pull residents away from their town."* Enrolling the fleet as residents with real roles is itself the anti-wandering switch. That is wiring, and it is free.

### 2.2 Bot asking another for help

**Partly exists — and the break is precisely in the middle.**

Receiver side, working: `VoyagerLoop.processBotMessage` (`src/voyager/VoyagerLoop.ts:2222-2303`) drains up to 3 messages per cycle. A `help_request` from a non-disliked peer is pushed onto `playerTaskQueue` — which sits **above** blackboard tasks in the priority ladder. A `request` for an item scans inventory and queues `Give <item> to <from>` plus a reply. This is a working assist protocol.

Sender side, dead: **no production code ever sends `type: 'help_request'`.** Every `sendMessage` / `broadcast` call site uses `'chat'` (`VoyagerLoop.ts:2216, 2259, 2266, 2268, 2292, 2295`; `botsRoutes.ts:371`). `ProactiveCommunicator.formatForBotComms` — which exists specifically to put an announcement into another bot's inbox — has **zero callers**. A `'chat'` message falls through to `default:` and is logged as unknown. `help_request` is produced only in tests.

**Is the blackboard the channel? No.** `request_help` is a member of the `BlackboardMessage` kind union (`BlackboardManager.ts:55`) and **nothing ever posts one**. Messages are a passive 200-entry log. Crucially, `blockTask()` flips a task to `blocked` and `claimBestTask` filters `status === 'pending'` only — **a blocked task is never re-offered to anyone.** A blocker is a dead end, not a help request.

Claiming *is* correct where it exists: `claimBestTask` is atomic and exclusive (single main-thread `BlackboardManager` in `BotManager.ts:97`, synchronous read-modify-write, every worker's claim serialized through IPC), with a 5-minute `releaseStale` steal-back. Separately, `claimReservation` is a proper TTL mutex for physical space.

**To get "come help me grab this": build the sender.** When a task blocks, emit a `help_request` to the nearest/most-affine resident instead of only calling `blockTask`. The receiving half already works. Small build.

### 2.3 Ideas spreading bot-to-bot (CultureManager)

**Mechanically real, practically inert, and behaviourally hollow.** Honest answer: the "priest converting others" example is a substantial build, not a switch.

What a meme *is* (`src/social/CultureManager.ts:41-52`): a label plus a list of lowercase keyword substrings. No doctrine, no stance, no opposing beliefs. Stored in `data/culture.json` — currently literally `{"memes": [], "adoptions": [], "keywordCounts": {}}`.

How spread works: purely reactive to the inter-bot inbox drain (`VoyagerLoop.ts:2174-2223`). On each message: observe chat → substring-match a meme → skip if already held → **trust gate** (bot→bot affinity ≥ `affinity.trustThreshold: 70`) → adopt → re-broadcast `"I believe in <label>."`.

Four independent reasons it will never fire as configured:

1. **Trust gate is unreachable.** Default affinity is 50, threshold is 70, `chatBonus` is +2 → a peer needs 10 positive inter-bot messages first. `data/affinities.json` **does not exist**.
2. **Bootstrap deadlock.** The only `broadcast()` call site *is* the post-adoption echo. Nothing preaches first, so nothing is ever adopted, so nothing ever broadcasts.
3. **No seeding path.** `addMeme()` has zero callers outside the class and tests. There is no API route and no config. **You cannot currently give a bot a belief to preach.**
4. **`data/bot_comms.json` is 92 bytes** — all inboxes empty. There is essentially no inter-bot traffic to carry anything.

Adoption is **deterministic**, not probabilistic: trusted sender + substring present + not already held ⇒ adopt, 100%. No resistance, no repeated-exposure requirement, no decay, no deconversion, no per-adopter conviction (strength is global to the meme). Matching is naive substring — `"ore"` matches `"explore"`, and *"I don't believe in X"* adopts X.

**Does belief change behaviour? Effectively no.** Adopted memes inject one line into the curriculum prompt (`CurriculumAgent.ts:395-400`) and one into ambient chat. The roadmap's own anti-gimmick mitigation — a blackboard score bias keyed on meme keywords — was **never built** (`grep meme src/voyager/BlackboardManager.ts` is empty). A convert behaves identically to a non-convert.

To reach a working priest: a seed route + preacher role, a proactive evangelism emitter, a real adoption model (conviction × affinity × exposure, with resistance), per-adopter conviction, and **at least one mechanical consequence** (the blackboard boost is the cheapest and was already specified). Defer this; it is the largest of the three builds and the least load-bearing for governance.

### 2.4 Proposals, voting, approvals

**This exists end-to-end and is production-grade.** It is the right foundation for elections.

- **Producers — only two.** `ExpansionManager` (child town, gated on `population ≥ populationTarget ?? 8`) and `DecreeManager` (proposed standing rule, via `POST /api/towns/:id/propose-rule`). The `construction` and `milestone` kinds exist in the vote table but **nothing ever creates them** — buildings are *not* voted on.
- **Who can vote.** Any resident bot. The brain's `approvalLoop` (`TownBrain.ts:1387-1425`) casts heuristic votes for every alive resident, **but only when `town.config.approvalMode === 'vote'`** — and the default is `'mayor'`. Humans/scripts can also `POST .../vote` with any `voterBotName`; note the route **does not verify the name is actually a resident** (`townRoutes.ts:1003-1027`).
- **What a vote does.** Appends the bot name to `votes.yes` / `votes.no`; re-casting moves it cleanly (`ApprovalManager.castVote:217-230`). Nothing resolves until the window closes.
- **On pass / fail.** At `expiresAt`, `tally()`: in `vote` mode `yes > no` → approved, else denied (**ties and zero-vote rows go to denied** — deliberate, the proposer must re-issue). In `mayor` mode, no mayor decision before the deadline → **expired**. On `approved` the `resolveOnce` handler fires exactly once (create the child town / write the standing rule). On denied/expired the handler is dropped and nothing happens.
- **Timing.** `DEFAULT_VOTE_WINDOW_MS = 5 min`; the heuristic stays silent until `HEURISTIC_DELAY_FRACTION = 0.6` of the window has elapsed, so a human gets the early window.
- **Durability.** A serialisable `HandlerDescriptor` is persisted to `handler_descriptor_json` and `rehydrate()` re-attaches handlers on boot, with async callers awaiting rehydration before firing. This is careful code.
- **The voting itself is LLM-free.** `VoteHeuristic.voteFor` (`src/town/VoteHeuristic.ts:89-102`) is a pure static `personality × kind` table. **Unknown kind → `'yes'`.** So a brand-new approval kind gets *unanimous approval* from every bot — critical for the election design (§4).

**Decrees genuinely bite.** With `governance.enabled: true`, an approved decree becomes a `TownRule` (`data/town_rules.json`) whose keywords boost matching tasks in `BlackboardManager.scoreTaskEnhanced` **and** get injected into the resident's task-proposal prompt (`VoyagerLoop.ts:1207-1221`). But both paths gate on `isResident` — which is why the flag is a no-op today. `data/town_rules.json` does not exist.

### 2.5 Mayor and city council

**Confirmed: elections do not exist. A council does not exist. The mayor is a human, assigned at founding.**

- `createTown` writes `config.mayor = { title, playerName, stealth: false, voteWeight: 1.0 }` (`TownManager.ts:601-615`). `mayorPlayerName` comes straight from the `POST /api/towns` body.
- `MayorService.setMayor(townId, playerName, title)` exists and works. Its docblock says, verbatim: *"Phase 6-B (voting + approvals) will call setMayor on re-election; the setter is exposed here so that path doesn't have to know about TownManager internals."* **That caller was never written.** Grep confirms `setMayor` is called only from the service and `TownManager`.
- **`config.mayor.voteWeight` and `config.mayor.stealth` are written at founding and read nowhere.** Dead fields — useful free real estate for an election design.

**The hard constraint on electing a bot.** `requireMayor` (`townRoutes.ts:36-59`) authenticates **only** via the signed `pid` session cookie minted by `POST /api/auth/login` (the legacy `?legacyAuth=true` body fallback was removed 2026-07-24, commit `6c2de46`). A bot has no browser and no session. **Writing a bot name into `config.mayor.playerName` would permanently lock out every mayor-gated route** — `mayor/decree`, `approvals/:id/decide`, `approval-mode`, and the diplomacy setter. This is the single most important design constraint in Part C, and it is why the election below elects a **council**, not the mayor.

### 2.6 Town growing by collective decision

**Partly — and less collectively than it looks.**

- **`buildLoop` follows a hardcoded plan, with no vote.** `src/town/seed/medieval.ts`: founding = `town_hall` + `well`; village adds 5 houses, farm, tavern, storage; town adds guildhall, walls, blacksmith, market, 2 watchtowers. The loop diffs the plan against the `buildings` table and queues **one** gap per tick, **one** build in flight per town, with an exponential 5→30 min per-kind failure cooldown. Design goes through the LLM designer (`taskType: 'codegen'`, i.e. Opus) with a schematic-matcher fallback.
- **`demandLoop` works well.** Aggregates resident inventory against tier thresholds and posts `town:<id> needs N more <resource>` blackboard tasks, with duplicate reaping.
- **`roleLoop`** staffs roles from the idle pool against tier targets; it **never demotes a busy bot**, so manual roles stick.
- **`expansionLoop` is the only genuinely collective decision** — a child town requires an approval to pass.

> **⚠ Collision risk for the parallel Town Hall build.** The moment a `medieval-communal` town is founded, its brain starts and — within 60 seconds — `buildLoop` will queue **its own `town_hall`** at the capital, because the `buildings` table is empty. There is **no API route to register a hand-built building** (`onBuildCompleted` is the only writer, and it keys off a `BuildJob.townId`). Coordinate with the hall agent: either found the town **paused**, or found it only after the hall exists and accept that the brain will still see zero `town_hall` rows. See §3 step 3.

---

## 3. Part B — the activation runbook

All calls target **`127.0.0.1:3001`** (not 3000). Nothing below has been executed.

### Step 0 — preflight

```bash
systemctl is-active mc-fleet-bot mc-fleet-web
curl -s http://127.0.0.1:3001/api/towns          # expect {"towns":[]}
curl -s http://127.0.0.1:3001/api/bots | head -c 400
```

If `/api/towns` errors, check `journalctl -u mc-fleet-bot -n 50` before anything else — do not diagnose through port 3000.

### Step 1 — choose the capital

The capital is the town's anchor: build origin, district centre, diplomacy distance reference, and (via §3.5) the night muster point. **It should be the Town Hall site the other agent names.**

Reference points in this world: spawn is `(-9, 76, -10)` (per the `config.yml:193` comment); `Scout.spawnLocation = (78, 62, -158)`; `Steward.spawnLocation = (122, 71, -156)`; the communal `mineSite` is `(80, 64, 42)` with radius 20; an oak grove was planted at `x18-50 / z42-54`.

Placeholder below is `CAPITAL = { x: 100, y: 68, z: -150 }` — **replace with the real hall site.**

### Step 2 — found the town

```bash
curl -s -X POST http://127.0.0.1:3001/api/towns \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Mainstreet",
    "capital": { "x": 100, "y": 68, "z": -150 },
    "stylePreset": "medieval-communal",
    "mayorTitle": "Mayor",
    "mayorPlayerName": "packetloss404"
  }'
```

Notes:
- `stylePreset` is validated against exactly `medieval-communal | mid-century-civic` (`townRoutes.ts:96-99`); anything else 400s.
- `mayorPlayerName` **must be the real Minecraft player name** — it is matched case-insensitively against the `pid` session cookie by `requireMayor`. Get this wrong and you lock yourself out of every mayor-gated route.
- Side effects: creates the "Old Town" default district (64×64 around the capital), records `town_founded`, and **starts the brain immediately** (`createTown` → `startBrain`).
- Capture the returned `town.id` as `$TOWN`.

### Step 3 — decide the hall-build collision *now*

Pick one before the first 60-second tick:

- **(a) Found paused.** `curl -X POST http://127.0.0.1:3001/api/towns/$TOWN/pause` immediately after step 2. The brain freezes (all loops no-op) while the hall is hand-built. Resume when it's up. **Recommended** while another agent owns the hall.
- **(b) Let the brain build it.** Accept an LLM-designed hall at the capital and let the other agent build something else.
- **(c) Found the town on `mid-century-civic`** if that seed's founding plan suits better — but it still requires a `town_hall`.

There is no supported way to tell the brain "the hall already exists". Note that pausing also freezes `demandLoop`, `roleLoop`, `scheduleLoop`, `approvalLoop` and greetings — so residents will genuinely idle while paused. That is fine for a build window; it must be resumed for governance to run at all.

### Step 4 — enrol the five bots as residents

Valid roles (`TOWN_ROLES`, `src/town/RoleManager.ts:29-38`): `lumberjack, miner, farmer, blacksmith, builder, guard, gatherer, idle`. **`architect`, `surveyor`, `steward`, `scout`, `explorer` are NOT valid** — the route 400s.

```bash
for pair in "Architect:builder" "Mason:builder" "Surveyor:gatherer" "Steward:farmer" "Scout:gatherer"; do
  curl -s -X POST http://127.0.0.1:3001/api/towns/$TOWN/residents \
    -H 'Content-Type: application/json' \
    -d "{\"botName\":\"${pair%%:*}\",\"role\":\"${pair##*:}\"}"
done
```

Rationale and consequences:
- Roles drive `ScheduleManager`'s day/night task emission and the role-keyword boost in blackboard scoring.
- The founding tier target is `{lumberjack: 1, farmer: 1, guard: 1}`. `roleLoop` pulls **only from the idle pool** and never demotes, so these explicit assignments stick — but any bot left at `idle` will be reassigned. Consider giving one bot `guard` and one `lumberjack` to match the tier target and stop the loop churning.
- **This is the anti-wandering switch.** A resident with a non-idle role and no higher-priority task idles instead of running the roaming curriculum (`VoyagerLoop.ts:1241-1252`).
- It is also what switches on `governance.enabled` — standing rules only inject for residents.
- The unique constraint is `(town_id, bot_name)`; a re-run 409s, harmlessly.

### Step 5 — the night muster point (`mining.protectedZones`) — **the highest-value change**

This is what stops the ad-hoc huts and gives bots somewhere to return to.

**This must be a `config.yml` edit + restart — it cannot be hot-patched.** See the patchability table in step 9: `mining` is a patchable *section*, but `FIELD_TYPES.mining` contains only `minDigY: 'number'` (`src/util/configPersist.ts:136-141`), and `validatePatch` drops any key it doesn't recognise. `protectedZones` is an array, which the flat type-guard map cannot express, so a PATCH would silently drop it with a warning.

```yaml
mining:
  protectedZones:
    - name: town-hall
      minX: 85
      minY: 60
      minZ: -165
      maxX: 115
      maxY: 95
      maxZ: -135
      shelter: true          # default is true; this zone is a night destination
```

Semantics (`src/actions/geofence.ts:34-39, 111-147, 165-182`):
- Any block inside the box is undiggable, enforced at three choke points: the `mineBlock` candidate filter, a hard `bot.dig` hook installed on spawn (`src/bot/BotInstance.ts:297-310`), and `intersectsProtectedZone` on the build engine's destructive `/fill` paths. This protects the hall from being mined out.
- `shelter: true` (or omitted) makes the zone's **centre** a valid `getNearestProtectedCenter` result (returned at `y = minY + 24`), which `GoalGenerator` receives as `shelterTarget`. Bots inside it report `hasShelter: true` and stop generating the nightly hut goal.
- Set `shelter: false` on any zone you want protected but *not* used as a destination.

Size the box generously around the hall footprint plus its plaza — the centre of the box is where bots head, so keep it centred on where you actually want them to gather, and note the `minY + 24` offset when choosing `minY`.

**Remember the urgency gate (§2.1):** this fixes in-town bots and rainy nights. To get reliable dusk homing from the field, also change the clear-night urgency from 6 to 7 at `src/voyager/GoalGenerator.ts:362`. That is a one-line code change, deliberately listed separately from the config work.

Caching caveat: `geofence.ts:58-78` memoises the whole `mining` section on **first read per worker thread**, cleared only by a test-only hook. A restart is required either way.

### Step 6 — `rescueHome`

Currently commented out at `config.yml:263-266`. `tryRescueIfStranded` (`src/voyager/VoyagerLoop.ts:~878-931`) fires when a bot's feet are in water/lava and it can't finish tasks. With no destination it logs `STRANDED bot has no rescue home ... manual /tp needed` and gives up.

```yaml
rescueHome:
  x: 100
  y: 68
  z: -150
```

Two caveats:
- Rescue is executed as `bot.chat("/tp <name> x y z")` — **the bot must be OP** or the teleport is silently rejected (the code detects this and escalates to a `MANUAL /tp REQUIRED` warning).
- For a **leashed** bot the destination is its leash anchor using `rescueHome.y`. So `rescueHome.y` matters even for leashed bots.

Also note what `tryRescueIfStranded` will and won't do (`src/voyager/VoyagerLoop.ts:875-932`): it fires only when the chosen task is autonomous *and* already on the `BlockerMemory` stuck-cooldown, at most once per 10 minutes, and **only when the bot's feet are in water or lava**. A bot buried in stone or stuck on a ledge is never rescued by this path. It verifies the teleport landed within 12 blocks and clears the task's blockers on success.

`rescueHome` is **not** hot-patchable (step 9) — `config.yml` edit plus restart. It is also absent from `SECTION_SPECS`, so it is completely unvalidated: a typo silently yields `undefined` and you get the "no rescue home" warning with no other signal.

### Step 7 — `leash`: **do not set it for the builders**

`leash` is patchable and tempting, and it is the wrong tool here. `src/voyager/VoyagerLoop.ts:256-263`:

```ts
if (leashEntry) {
  ...
  this.isCaretakerBuilder = personality.toLowerCase() === 'builder';
```

`isCaretakerBuilder` is set **only** inside the leash branch. And at `VoyagerLoop.ts:1192`:

```ts
const blackboardTask = (!goalTask && !this.isCaretakerBuilder) ? ... claimBestTask(...) : null;
```

**A leashed `builder` stops claiming blackboard tasks entirely.** Architect, Mason, Surveyor and Steward are all `personality: "builder"` (`data/bots.json`). Leashing them would make every `TownBrain` demand task, every `ScheduleManager` phase task, and every trade/Phoenix task **invisible to 4 of the 5 bots** — activating the town and simultaneously disconnecting it from its workforce.

Today `leash: []`, so no bot is a caretaker. **Keep it that way.** Use `protectedZones` (step 5) for gravity instead — it shapes destinations without cutting the blackboard. If you ever must leash, leash only `Scout` (personality `explorer`), and note that a leash also disables `exploreUntil` entirely for that bot.

Two further notes if you ever do use it: the leash is an **X/Z cylinder with no Y** (`leash?: Array<{ botName; x; z; radius }>`, `src/config.ts:264`), and enforcement is **soft** — it only rejects the sandbox `moveTo` primitive (with a recall exemption so an out-of-bounds bot can walk back). Generated code calling `bot.pathfinder.setGoal` directly, `followPlayer`, and `wander` all bypass it. Like `rescueHome`, `leash` is unvalidated and not hot-patchable.

### Step 8 — `spawnLocation` (per bot, `data/bots.json`)

`spawnLocation` is a **one-time `/tp` on first spawn per process** (`src/bot/BotInstance.ts:450-462`), not a return-home anchor. It refuses to teleport below `mining.minDigY` (50) to avoid burying a bot. It requires OP.

Useful for starting the fleet at the hall plaza rather than world spawn; useless as a gathering mechanism. Nothing ever sends a bot back here later, and `BotManager` persists only the *configured* spawn, never the live position (that was the historical self-burying bug).

**Watch the field name — it differs between the two surfaces.** In `data/bots.json` it is `spawnLocation`; in the `POST /api/bots` body it is **`location`** (`src/server/routes/botsRoutes.ts:48-63`).

```json
{ "name": "Architect", "personality": "builder", "mode": "codegen",
  "spawnLocation": { "x": 100, "y": 68, "z": -147 } }
```

```bash
curl -s -X POST http://127.0.0.1:3001/api/bots -H 'Content-Type: application/json' \
  -d '{"name":"Architect","personality":"builder","mode":"codegen",
       "location":{"x":100,"y":68,"z":-147}}'
```

Because of the `hasTeleportedToSpawn` one-shot guard, an already-running bot will **not** teleport again — you must `DELETE /api/bots/:name` and re-`POST`, or edit `data/bots.json` and restart. Scout and Steward already carry stale coordinates `(78,62,-158)` and `(122,71,-156)`; re-point or drop them.

### Step 9 — apply config and restart

**None of the three config changes above can be hot-patched.** `PATCHABLE_SECTIONS` is `['behavior', 'affinity', 'instincts', 'voyager', 'minecraft', 'mining']` (`src/util/configPersist.ts:36`) — note this is **not** the longer `KNOWN_TOP_LEVEL_KEYS` list in `src/config.ts:296-310`, which is only the validator's list of recognised sections and is easy to mistake for the patch allowlist.

| Config | Hot-patchable? | How to change |
|---|---|---|
| `mining.protectedZones` | ❌ section is patchable, **field is not** — arrays are unsupported by `validatePatch`, silently dropped | edit `config.yml`, restart |
| `mining.minDigY` | ✅ the one patchable mining field | `PATCH /api/config/mining` |
| `rescueHome` | ❌ not a patchable section → HTTP 400 | edit `config.yml`, restart |
| `leash` | ❌ not a patchable section → HTTP 400 | edit `config.yml`, restart |
| per-bot `spawnLocation` | ❌ not a config section | `data/bots.json` + restart, or DELETE+POST the bot |

> **⚠ Back up `config.yml` before any PATCH.** `persistConfig` round-trips the file through `yaml.dump` (`src/util/configPersist.ts:12-25`), which **destroys every comment**. The current `config.yml` carries the entire repoint rationale for `protectedZones`, `mineSite`, `leash` and `rescueHome` in comments; the first successful PATCH to any section wipes all of it.

Also note `GET /api/config` returns only the patchable sections, so `mining.protectedZones`, `leash` and `rescueHome` are **not visible through the API at all** — verify them by reading the file.

```bash
cp config.yml config.yml.bak-$(date +%F)
# edit config.yml
sudo systemctl restart mc-fleet-bot
```

(`Restart=on-failure` means `POST /api/admin/restart` and `kill <pid>` both leave the fleet **down** — use `systemctl restart`.)

### Step 10 — become the mayor (session cookie)

Every mayor-gated route needs the signed `pid` cookie. `auth.devSecret` is `null`, so any player name logs in:

```bash
curl -s -c /tmp/mayor.jar -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"packetloss404"}'
```

Reuse `-b /tmp/mayor.jar` on mayor-gated calls. The name must match `mayorPlayerName` from step 2, case-insensitively.

### Step 11 — turn on resident voting

Approvals default to `'mayor'` mode, in which bots never vote and un-decided rows simply **expire**. For any collective decision (including elections) to work:

```bash
curl -s -b /tmp/mayor.jar -X POST http://127.0.0.1:3001/api/towns/$TOWN/approval-mode \
  -H 'Content-Type: application/json' -d '{"mode":"vote"}'
```

### Step 12 — resume and verify

```bash
curl -s -X POST http://127.0.0.1:3001/api/towns/$TOWN/resume     # if paused in step 3

curl -s http://127.0.0.1:3001/api/towns/$TOWN/brain      # ticks advancing, paused:false
curl -s http://127.0.0.1:3001/api/towns/$TOWN/roles      # 5 residents, expected roles
curl -s http://127.0.0.1:3001/api/towns/$TOWN/demand     # have/threshold/need per resource
curl -s http://127.0.0.1:3001/api/towns/$TOWN/schedules  # current phase + task table
curl -s http://127.0.0.1:3001/api/towns/$TOWN/events     # town_founded, resident_joined, supply:request
curl -s http://127.0.0.1:3001/api/blackboard | head -c 600
```

Log watch:

```bash
grep -E "TownBrain (demand|build|role|approval)|resident_joined|supply:request" /var/log/mc-fleet-bot.log | tail -40
```

**Smoke-test governance** (this exercises the exact machinery elections will use):

```bash
curl -s -X POST http://127.0.0.1:3001/api/towns/$TOWN/propose-rule \
  -H 'Content-Type: application/json' \
  -d '{"text":"Residents keep the town hall stocked with oak planks","proposedBy":"Steward"}'
```

Then within ~5 minutes: `GET /api/towns/$TOWN/approvals` should show the row filling with heuristic votes after 3 minutes (60% of the window), then resolving. On approval, `data/town_rules.json` appears and the rule starts biasing blackboard scores for residents. If that round-trip works, elections are a small addition rather than a new subsystem.

### Step 13 — what activation does *not* fix

- Bots will still not walk to the hall **during the day** (§2.1) — night only.
- Bots still cannot ask each other for help (§2.2) — the sender is missing.
- Culture will remain empty (§2.3) — no seed path, unreachable trust gate.
- Nothing is elected (§2.5).

---

## 4. Part C — election design

**Principle: extend `approvals`, add no subsystem.** The approvals engine already gives us persistence, a vote window, per-bot vote records, restart-durable resolution handlers, event/highlight emission, and a dashboard surface. An election is a *new approval kind* plus a small scheduler, not a new machine.

### 4.1 The constraint that shapes everything

A bot **cannot** be the mayor. `requireMayor` authenticates only via the signed `pid` cookie (§2.5), so writing a bot into `config.mayor.playerName` would lock every human out of `mayor/decree`, `approvals/:id/decide`, `approval-mode`, and the diplomacy setter, with no recovery path short of editing the DB.

Therefore:

- **The mayor stays human and appointed.** They are the constitutional monarch / server admin — the break-glass veto.
- **The election elects a bot COUNCIL**, stored in a *new* field, with powers that route through internal code paths rather than mayor-gated HTTP.
- **"Council" vs "mayor"** is then a clean split: the mayor is the human with veto and mode control; the council is the elected bot body whose votes are *weighted* and who may propose without ceremony.

### 4.2 Data model — three fields, one new approval kind, zero migrations

`TownConfig` is `[key: string]: unknown` (`src/town/Town.ts:28-32`) and the whole blob round-trips through `updateTown`. So all election state fits in `town.config` with **no schema migration**:

```jsonc
"council": {
  "seats": 2,
  "members": ["Steward", "Mason"],
  "termStartedAt": 1753389000000,
  "termMs": 21600000,                 // 6h wall-clock; see 4.6
  "electionInFlight": ["apr_x1", "apr_x2", "apr_x3"]
}
```

And one new `ApprovalKind` string: **`"election"`**. `ApprovalKind` is already `| string` (`src/town/Approval.ts:10-15`), and `ApprovalRepository` stores `kind` as text — so no migration, no type surgery.

Payload shape (serialisable, so it rehydrates for free):

```jsonc
{ "townId": "town_x", "candidate": "Steward", "term": 3, "seats": 2 }
```

### 4.3 Eligibility and candidacy

- **Eligible to stand:** any resident with `status === 'alive'` and a non-`idle` role, who has been a resident for at least one full brain tick. Cheap, already queryable via `listResidents`.
- **Candidacy is automatic, not opt-in.** Adding a "declare candidacy" behaviour means new bot-side code and new LLM calls for no gain at 5 residents. The `ElectionManager` nominates **every eligible resident** and opens one approval per candidate.
- **Field cap:** if the town ever exceeds ~8 residents, cap the field at the top N by an existing observable — `ObservedRoleModel` and `getRoleBreakdown` already exist, or simply seniority (`joinedAt`). Not needed for a 5-bot fleet.

### 4.4 The ballot: N concurrent approvals, one per candidate

The approvals engine is **binary yes/no per row** — it cannot express "pick one of three". Do not fight that. Instead:

> An election with **C** candidates opens **C** `election` approvals in the same window, each asking *"should <candidate> hold a council seat?"*. All share `createdAt` and `expiresAt`.

At window close, `ElectionManager` reads all C rows and seats the top `seats` candidates by **margin (`yes − no`)**, breaking ties by (1) more `yes`, then (2) earlier `joinedAt`. This reuses `castVote`, `listOpen`, the vote window, the heuristic delay, the rehydration, and the events — verbatim.

**Do not rely on `ApprovalManager.tally()` to decide an election.** `tally()` resolves each row independently (`yes > no`, ties → denied), which would happily seat three candidates for two seats, or nobody. Let `tally()` do its per-row bookkeeping for the audit trail, and have `ElectionManager` do the seating from the tallied rows. This is additive; `tally()` is untouched.

### 4.5 How a bot decides its vote — and which model

This is where the operator's cheap/expensive split lands.

**Today's routing** (live, `GET /api/llm/routes`): `codegen → claude-opus-4-8`; `curriculum`, `critic`, `chat → claude-haiku-4-5`; `embed → gemini`. Town LLM calls today: the chronicle and CultureManager use `taskType: 'chat'` (cheap); only `LlmDesigner` uses `codegen` (expensive). **Voting uses no LLM at all** — `VoteHeuristic` is a static table.

**The split to implement:**

| Call | Frequency | `taskType` | Model | Rationale |
|---|---|---|---|---|
| Ambient chat, greetings, campaign chatter | Constant | `chat` | haiku-4-5 (unchanged) | Routine social noise; already cheap |
| Chronicle entries, culture flavour | ~1/game-day | `chat` (unchanged) | haiku-4-5 | Narrative, not consequential |
| **Election vote reasoning** | C votes × R residents, once per term | **`governance`** (new) | **sonnet-class** | Consequential, rare, and the whole point of the feature |
| **Decree vote reasoning** | Per decree | **`governance`** | sonnet-class | Same |
| Building/schematic design | Per building | `codegen` (unchanged) | opus-4-8 | Unchanged |

**Adding a `governance` route is nearly free.** `LLMSettings.routes` is typed `Record<string, RouteConfig>` and `PUT /api/llm/routes` accepts arbitrary keys with no validation; `ModelRouter` does `this.routes.set(key as TaskType, route)` and looks routes up by string. So the *route* can be added at runtime with no code change:

```bash
curl -s -X PUT http://127.0.0.1:3001/api/llm/routes \
  -H 'Content-Type: application/json' \
  -d '{"routes":{ ...existing..., "governance":{"provider":"anthropic","model":"claude-sonnet-4-5","fallback":["gemini"]}}}'
curl -s -X POST http://127.0.0.1:3001/api/llm/reload
```

The only code change is widening `type TaskType` (`src/ai/TaskType.ts:5`) by one union member so the call site type-checks, plus adding `'governance'` to the `taskTypes` array the dashboard reads (`src/server/llmRoutes.ts:59`). Two lines.

**Cost containment — keep the heuristic as the floor.** Do not replace `VoteHeuristic`; layer on top:

1. `VoteHeuristic.voteFor` returns `'yes'` for any unknown kind — so an unmodified `election` kind would produce **unanimous approval of every candidate**, which is a non-election. Add an `election` entry to `KIND_DEFAULTS` that abstains/defaults sensibly, or (better) have `ElectionManager` skip the heuristic for `election` rows entirely.
2. Add **one** LLM call **per voter per election** — not per candidate. Prompt: the town's standing rules, the resident's own role and personality, each candidate's role and a one-line record (tasks completed / buildings contributed, both already in `stats.json` and the buildings table). Ask for a ranked list. Fan that single response out into C `castVote` calls.
   With 5 residents and 5 candidates that is **5 governance calls per term**, not 25. At a 6-hour term that is 20 calls/day — negligible.
3. **Hard fallback:** if the governance call fails, is budget-blocked, or returns unparseable output, fall back to `voteFor` and log it. The `TokenLedger` budget cap already gates paid providers per task type, so a runaway is bounded by existing machinery.
4. Bots vote **only in `approvalMode: 'vote'`**, and only within the last 40% of the window (the existing `HEURISTIC_DELAY_FRACTION` gate), preserving the human's early window.

### 4.6 Term length and the election scheduler

There is no scheduler for terms, and there does not need to be a new one. `TownBrain.tick()` runs every 60s and already hosts `approvalLoop`. Add a **15th loop, `electionLoop`**, immediately before `approvalLoop`:

```
demand → build → role → schedule → threat → phoenix → district → expansion
  → election → approval → diplomacy → trade → rival → greeting
```

Placing it *before* `approvalLoop` mirrors the existing comment about `expansionLoop`: rows opened this tick get their votes cast and tallied in the same tick.

`electionLoop` logic (all inside `runLoopSafe`, so it can never crash a tick):

1. If `config.council.electionInFlight` is non-empty → check whether all rows are terminal; if so, seat winners, write `council.members` + `termStartedAt`, clear `electionInFlight`, record a `council:elected` event with a high `highlightScore`, and return.
2. Else if `now - (council.termStartedAt ?? 0) >= council.termMs` → open a new election.
3. Else return.

**Term length: 6 hours wall-clock (`termMs: 21600000`) as the default.** Reasoning: a Minecraft day is ~20 real minutes, so 6h ≈ 18 in-game days — long enough that a term means something and the chronicle has material, short enough that an operator watching for an afternoon sees a full cycle. Store it in `town.config` so it is tunable per town via `PATCH /api/towns/:id` without a deploy. The **vote window** stays the existing 5-minute `DEFAULT_VOTE_WINDOW_MS` (overridable per-approval via `openFor`) — consider 10 minutes for elections so a human can watch it happen.

Bootstrap: if `council` is absent, treat `termStartedAt` as 0 so the first tick after activation opens the inaugural election.

### 4.7 What the winner actually gets

Honest assessment: **under `approvalMode: 'vote'`, the existing system grants a council almost nothing** — every resident already votes equally and anyone can already propose. So the powers must be deliberately designed, and each should be small and mechanical.

Three powers, in ascending build cost. All are additive and flag-gated.

1. **Weighted vote (cheapest, and the field is already there).** `config.mayor.voteWeight` exists and is read nowhere. Generalise it: a council member's vote counts 2, everyone else 1. This requires changing `tally()`'s count from `votes.yes.length` to a weighted sum — roughly 5 lines, in one place, with the weights read from `town.config`. This alone makes a seat worth winning and makes elections consequential.

2. **Propose without ceremony / agenda control.** `POST /api/towns/:id/propose-rule` is currently ungated — *anyone* may propose, with a free-text `proposedBy` that is never validated. Tighten it: when `council.seats > 0`, require `proposedBy` to be a council member (or the mayor). That converts an existing hole into a real power and is a validation change, not a feature.

3. **A standing rule the council mints on seating (the visible payoff).** On `council:elected`, have the new council propose one decree — chosen by the same governance-model call, or seeded from the town's largest current shortage via `computeDemand()`. Because approved decrees become `TownRule`s that boost matching blackboard tasks *and* get injected into resident prompts, **the election visibly changes what the town does within one tick.** That closes the loop the operator actually wants: bots vote → the town's behaviour changes.

**Mayor vs council, cleanly separated:**

| | Mayor (human, appointed) | Council (bots, elected) |
|---|---|---|
| Identity | `config.mayor.playerName`, `pid` cookie | `config.council.members[]`, bot names |
| Decree | Direct, no vote (`mayor/decree`) | Proposes; must pass a vote |
| Approvals | `decide` — instant approve/deny, overrides votes | Weighted vote only |
| Approval mode | Sole controller of `mayor` ⇄ `vote` | — |
| Diplomacy | Sole setter of inter-town relations | — |
| Term | Indefinite | `termMs`, re-elected |
| Greeting | Residents greet them by honorific | — |

The mayor is the veto and the constitution; the council is the legislature. They do not overlap, and — critically — the council never needs an HTTP session.

### 4.8 Build inventory

| Item | Where | Size |
|---|---|---|
| `ElectionManager` (open ballot, seat winners, events) | new `src/town/ElectionManager.ts` | ~200 lines, modelled on `DecreeManager` |
| `electionLoop` + construction | `src/town/TownBrain.ts` | ~40 lines |
| `election` rehydrator registration | `ElectionManager` ctor, mirrors `DECREE_HANDLER_KIND` | ~15 lines |
| `election` entry in `KIND_DEFAULTS` (or heuristic skip) | `src/town/VoteHeuristic.ts` | 1–3 lines |
| Weighted tally | `src/town/ApprovalManager.ts:310-312` | ~5 lines |
| `governance` task type | `src/ai/TaskType.ts:5`, `src/server/llmRoutes.ts:59` | 2 lines + a route PUT |
| LLM vote (1 call/voter/election, heuristic fallback) | `ElectionManager` | ~80 lines |
| `proposedBy` validation | `src/server/routes/townRoutes.ts` propose-rule | ~10 lines |
| Read routes (`GET .../council`, `GET .../elections`) | `townRoutes.ts` | ~30 lines |

Everything else — persistence, windows, votes, durability, events, highlights, the dashboard feed — is inherited.

### 4.9 Sequencing

1. Activate the town (§3) and confirm the `propose-rule` round-trip resolves. **Do not build elections until that works** — it exercises every component an election needs.
2. Add the `governance` LLM route (runtime PUT + 2-line type widening).
3. Ship `ElectionManager` with the **heuristic** vote only. Verify a full cycle end-to-end: ballot opens, votes land, winners seated, `council:elected` in the events feed.
4. Swap in the LLM vote, with the heuristic as fallback.
5. Add weighted tally, then `proposedBy` validation, then the seating decree.

---

## 5. Honest summary: wiring vs. new code

**Pure wiring (config + HTTP, no code):**
- Founding the town, enrolling residents, roles
- Stopping the wandering — the resident idle gate is already written and free
- Stopping redundant in-town huts, and rainy-night homing — `mining.protectedZones` with `shelter: true`
- Stranded-bot rescue *from liquid* — uncomment `rescueHome` (bot must be OP)
- Making `governance.enabled: true` mean something — it needs residents, nothing more
- Decrees → standing rules → biased task selection: fully built, just unused
- Voting on expansion and decrees: fully built, needs `approvalMode: 'vote'`
- Routing governance LLM calls to a better model: runtime `PUT /api/llm/routes`

All config work above is `config.yml` + restart, **not** `PATCH /api/config` (§3.9).

**One-line builds:**
- Reliable dusk homing — raise the clear-night goal urgency from 6 to 7 (`GoalGenerator.ts:362`), otherwise the goal is generated and discarded

**Small builds (tens of lines each):**
- Fix the dead worker commands — add `walkTo` / `follow` / `returnToBase` cases to `botWorker.ts`'s switch, which un-breaks `/walkto`, `/follow`, `/return-to-base`, `regroup`, `guard_zone` and `patrol_route` fleet-wide. Probably the best value-per-line in this document.
- Daytime muster at the hall — emit a blackboard task *with* a `location`
- "Come help me" — emit a `help_request` on block; the receiver already works
- Weighted votes; `proposedBy` validation; `governance` task type

**Real builds:**
- Elections — ~350 lines, but entirely on top of existing machinery (§4.8)
- A working "priest" — seed path, evangelism emitter, adoption model, per-adopter conviction, and at least one mechanical consequence. The largest of the three and the least load-bearing; defer it.

**Traps to avoid:**
- **Do not leash the builder bots.** It silently disconnects 4 of 5 bots from the blackboard (§3.7).
- **Do not plan on `POST /api/bots/:name/walkto` or `return-to-base` to gather bots** — they return 200 and do nothing (§2.1).
- **Back up `config.yml` before any `PATCH /api/config`** — it strips all comments (§3.9).
- **`mining` is a patchable section but `protectedZones` is not a patchable field** — a PATCH silently drops it (§3.9).
- **Do not put a bot name in `config.mayor.playerName`.** It permanently locks out every mayor-gated route (§4.1).
- **Do not let a new approval kind inherit the heuristic default** — unknown kinds vote unanimous `yes` (§4.5).
- **Coordinate the hall.** A freshly founded town queues its own `town_hall` within 60 seconds (§2.6, §3.3).
- **Diagnose on port 3001.** A 500 from 3000 is a proxy artefact (§1).
