# Stuck-bots diagnosis — Architect / Mason / Surveyor

**Date:** 2026-07-24 ~20:10–20:25 UTC
**Investigator:** diagnostic pass, read-only w.r.t. code and services (no rebuild, no `systemctl restart`)
**Verdict: the underground position is REAL, not a stale-reporting artifact.**
**Root cause: the bots teleport *themselves* back underground on every login and every respawn**, because `spawnLocation` in `data/bots.json` was overwritten with their own buried coordinates.

---

## 1. Authoritative server position vs API-reported position

`GET /api/bots` compared against RCON `data get entity <name> Pos` (the server's own entity data),
sampled at 2026-07-24 20:10:29 / 20:10:42 UTC.

| Bot | API `/api/bots` | Server (authoritative) | Match? | `data/bots.json` `spawnLocation` |
|---|---|---|---|---|
| Scout | 78, **62**, -158 | 77.5, **62.0**, -158.5 | exact | 65, **63**, -172 (surface) |
| Architect | 25, **13**, -71 | 24.5, **13.0**, -71.5 | exact | 25, **13**, -71 (**in rock**) |
| Mason | 11, **35**, 7 | 10.5, **35.0**, 6.5 | exact | 11, **35**, 7 (**in rock**) |
| Surveyor | 4, **40**, -8 | 3.50015, **40.0**, -8.31497 | exact | 4, **40**, -8 (**in rock**) |
| Steward | 122, **71**, -156 | 124.31497, **71.0**, -158.50015 | exact | 121, **71**, -157 (surface) |

The API values are `Math.round()` of the server values. **Hypothesis (a) — stale caching — is dead.**
Corroborating: `inboundAgeMs` in `/api/bots` was 0–940 ms for all five, i.e. packets were flowing
for the three "stuck" bots the whole time.

**The 3-vs-2 split is entirely explained by the last column:** the three stuck bots have a
`spawnLocation` buried in solid stone; the two free-roaming bots have one at surface level
(y=63 / y=71), so their self-teleport is harmless.

---

## 2. The smoking gun — Paper server log

From `/opt/packetcraft/paper-server/logs/latest.log` (log covers 17:48 → 20:21):

```
[20:18:26] Mason joined the game
[20:18:26] Mason[/10.80.13.18:36868] logged in with entity id 10667 at ([world]10.5, 35.0, 6.5)
[20:18:27] Mason issued server command: /tp Mason 10 35 6          <-- the bot teleports ITSELF
[20:18:27] [Mason: Teleported Mason to 10.500000, 35.000000, 6.500000]
...
[20:19:51] Mason suffocated in a wall
[20:19:52] Architect suffocated in a wall
[20:19:52] Architect issued server command: /tp Architect 24 13 -72 <-- straight back into the rock
```

Aggregate counts over that single log:

| Server-side event | Count |
|---|---|
| `suffocated in a wall` | **108** |
| `issued server command: /tp Mason` | 90 |
| `issued server command: /tp Scout` | 66 |
| `issued server command: /tp Steward` | 64 |
| `issued server command: /tp Surveyor` | 62 |
| `issued server command: /tp Architect` | 62 |
| `kicked due to keepalive timeout` | 38 |
| `logged in from another location` (duplicate login) | 2 |
| `joined the game` | 222 |

The bots are opped, so `/tp` succeeds every time.

---

## 3. The feedback loop (why the admin teleports never persisted)

1. A bot ends up underground (originally by pathfinder tunnelling — since mitigated by
   `mining.minDigY: 50` and `movements.digCost = 12`).
2. `BotManager.saveBotsImmediate()` persists **the bot's current live position** as its
   `spawnLocation` — `src/bot/BotManager.ts:701`:
   ```ts
   spawnLocation: w.getCachedStatus()?.position || w.spawnLocation || undefined,
   ```
   The buried coordinate is now written into `data/bots.json` as a permanent "home".
3. On **every** spawn/login, the bot teleports itself there — `src/bot/BotInstance.ts:439-441`:
   ```ts
   if (this.spawnLocation && this.bot) {
     this.bot.chat(`/tp ${this.name} ${this.spawnLocation.x} ${this.spawnLocation.y} ${this.spawnLocation.z}`);
   }
   ```
4. It is now inside solid stone → **suffocates** (~1 HP per 0.5 s, observed draining 20→0 in ~45 s).
5. It dies, and the server respawns it correctly at the surface. Confirmed in the exec trace:
   `[trace:exploreUntil] death while primitive running` → `[trace:exploreUntil] spawn at (6.5, 69.0, -6.5)`
   and in another cycle `spawn at (-9.5, 64.0, -5.5)`.
6. mineflayer's `spawn` handler fires again → **step 3 repeats** → back into the rock. Infinite loop.

An operator RCON `/tp` is undone the same way: it survives only until the next login or
respawn, i.e. seconds to a couple of minutes. That is exactly the reported symptom
("minutes later the API reports them back at the SAME underground coordinates").

### Live proof
Teleporting **Surveyor** out at 20:11:26 freed it — it walked away normally
(20:12:17 at `4.5006, 64.0, -123.38`, HP 20, messy walking decimals). Teleporting
**Architect** out at ~20:14 also freed it (20:14:51 at `19.5004, 64.0, -157.5`).
Both were dragged back by their own `/tp` after the next reconnect: by 20:25 Surveyor
was again at `3.50015, 40.0, -8.31497` — its `bots.json` `spawnLocation` — and
Architect at `24.5, 13.0, -71.5`.

Block-centre coordinates (`x.5`, `z.5`) with zero drift are the signature of a teleport,
not walking. Position was rock-steady at 0.25 s polling resolution for 110 s.

---

## 4. Reconnect timeline

The self-teleport only needs a login to fire, and logins are constant.

- 222 `joined the game` events in ~2.5 h of server log.
- Bot-side: 1420 `Connecting to Minecraft server...`, **587** `Watchdog: forcing reconnect`.
- Server-side cause: **38 `kicked due to keepalive timeout`** — the worker event loop stalls
  long enough (>30 s, consistent with synchronous LLM/codegen work) to miss keepalives.

The watchdog itself is an amplifier, not the origin:

| Watchdog branch | Log message | Hits |
|---|---|---|
| (1) state == DISCONNECTED | `Watchdog: reconnecting disconnected worker` | **605** |
| (2) zombie socket | `Watchdog: stale inbound socket (zombie)` | **1** |
| (3) wedged worker | `heartbeat stale` | 3 |

Branch (1) at `src/bot/BotManager.ts:646-650` fires on a cached `DISCONNECTED` state with
**no grace period and no check for an in-flight connect**. `forceReconnect()` itself sets
`this.state = DISCONNECTED` (`src/bot/BotInstance.ts:2117`) before calling `connect()`, so
every 30 s tick re-stomps a reconnect that is already in progress — which is why
`forceReconnect` logged `inboundAgeMs` values of 1669 / 1937 / 3020 ms, i.e. perfectly
healthy sockets. This is what produced the 2 `logged in from another location` duplicate
logins and the `Impersonation detected` alerts (the impersonation monitor sees the roster
name online while our BotInstance is mid-reconnect — `src/bot/BotManager.ts:342`).

---

## 5. Hypothesis ranking

| # | Hypothesis | Verdict |
|---|---|---|
| **(c)** | **Genuinely entombed and stuck** | **CONFIRMED — primary.** Server confirms position; 108 `suffocated in a wall`. Extended: they do *not* stay entombed passively, they re-teleport into the rock after each death. |
| (b) | Disconnect/reconnect restores a saved position | **Partly right, wrong mechanism.** Reconnects are the trigger (222 joins), but the server logs the player in at the *correct* last position; it is the bot's own `/tp` one second later that re-buries it. |
| (d) | Worker crash-loop / keepalive stalls | **Contributing.** 38 keepalive kicks + 605 watchdog reconnects supply the constant logins that re-fire the self-teleport. Not the root cause. |
| (a) | Stale position reporting | **REFUTED.** API matches server exactly on all five bots; `inboundAgeMs` 0–940 ms. |

Also note `tryRescueIfStranded` (`src/voyager/VoyagerLoop.ts:891, 900-906`) could not help:
it early-returns unless the bot is **in liquid** (`if (!inLiquid) return;`), and `rescueHome`
is commented out in `config.yml:263-266`, so it logs
`STRANDED bot has no rescue home ... manual /tp needed` and gives up.

---

## 6. Recommended fix

**Immediate unblock (no code change, no restart):**

1. Stop the fleet from re-poisoning the file, then fix the three entries in
   `/opt/stacks/mc-fleet-bot/data/bots.json` to surface coordinates
   (Architect `25,13,-71` → e.g. `25,70,-71`; Mason `11,35,7` → `11,70,7`;
   Surveyor `4,40,-8` → `4,70,-8`). Because `saveBotsImmediate()` rewrites this file from
   live positions on a debounce, editing it alone will be overwritten — pair the edit with
   an RCON `/tp` of each bot to the surface so the next save records a good position.

**Code fixes, in priority order:**

1. **`src/bot/BotManager.ts:701`** — stop persisting the live position as `spawnLocation`.
   This is what converts a transient "the bot is underground right now" into a permanent
   trap. Either keep the originally-configured `spawnLocation` verbatim
   (`spawnLocation: w.spawnLocation`), or refuse to persist a position that fails a
   sanity check (y below `mining.minDigY`, or not air at head height).

2. **`src/bot/BotInstance.ts:439-441`** — make the self-teleport safe and one-shot:
   - only teleport on the **first** spawn of an instance, not on every respawn/reconnect
     (this handler re-runs on each login, which is what makes the loop infinite);
   - validate the destination first — skip the `/tp` if the target block and the block
     above it are not air, and log a WARN instead;
   - prefer a safe surface Y (`GET /api/terrain/height`-style column probe) over a stored
     raw Y.

3. **`src/bot/BotManager.ts:646-650`** — add a grace period to watchdog branch (1): only
   send `reconnect` if the worker has been `DISCONNECTED` for more than one tick
   (e.g. ≥60 s), and suppress while a connect attempt is in flight. Currently it fights the
   in-worker `scheduleReconnect` every 30 s, producing 605 forced reconnects and the
   duplicate-login/impersonation noise.

4. **Suffocation guard (new)** — in the survival loop, if the bot's head block is solid and
   health is dropping, dig up / teleport to the surface. 108 suffocation deaths went
   completely unhandled. `tryRescueIfStranded` should cover "buried", not just "in liquid"
   (`src/voyager/VoyagerLoop.ts:891`), and `config.yml:263-266` `rescueHome` should be set
   for this world so the escape hatch actually has a destination.

5. **Keepalive stalls** — 38 `kicked due to keepalive timeout` means a worker event loop
   blocks >30 s. Worth a separate look at synchronous work in the codegen path; it is the
   engine supplying the reconnects that make bug #2 fire so often.

---

## Appendix — notes on method

- All positions were read with `python3 scripts/mc_admin.py rcon "data get entity <bot> Pos"`,
  which reaches the server over SSH + a direct-tcpip channel to localhost RCON.
- No code was modified and neither systemd unit was restarted during this investigation.
- Two diagnostic RCON teleports were issued (Surveyor → `4 70 -8` at 20:11:26,
  Architect → `25 70 -71` at ~20:14) to test whether a teleport persists. Both bots
  re-buried themselves, which is itself part of the evidence above.
- **Unintended side effect to be aware of:** a `setworldspawn ~ ~ ~` probe was run to read
  the world spawn. Because the RCON console's command source is anchored at the existing
  world spawn, this resolved to `0, 39, 0` — the value it already held — so it was
  effectively a no-op, but the world spawn was formally re-set at 20:14:5x. Worth a glance
  if the world spawn matters later.
