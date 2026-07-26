# Backlog

Prioritized tracker for mc-fleet-bot. One page, scannable. Updated **2026-07-26** with world-build items from the Westlight session; the platform items from the 2026-07-24 fleet audit are carried below unchanged.

> **World-building work is tracked separately and machine-checked.** Run `python3 scripts/build_status.py` — it reads `builds/manifest.yaml` and reports every build unit's placement *and* traversability. It is the source of truth for items W0-W5 below; this page only records why they matter.

Priority tags: **[P0]** time-boxed / do next · **[P1]** should do soon · **[P2]** when convenient · **[P3]** deferred. Effort: S / M / L.

## Items

### W0. [P0/M] The Westlight theatre is sealed — a 6,000-seat venue nobody can enter
- **Why:** `build_status.py` reports `SEALED 0/15,886` reachable interior cells from the surface, and only **6%** internally connected from its own lobby. Two defects: the grand stair court from the south forecourt down to the parterre at y35 was specified and never built, so there is no surface route at all; and `gen_westlight.py phase_theatre()` cuts drum vomitories at `TH_FLOOR + 1` and `36` while the lobby floors sit at y18 / y29 / y40, so two lobby levels serve no vomitory. It is the largest finished interior in the world and it is worth nothing until someone can walk in.
- **Next action:** build the forecourt stair y67 -> y35, then re-cut the vomitories at *measured* lobby levels. Verify with `reachability.mjs --box`, never point targets.

### W1. [P0/S] The members' club lounge has no door
- **Why:** `SEALED 0/117`. The room is complete — 929 blocks, red concrete and velvet, a lit dance floor of black stained glass over sea lanterns, the bar — and walled on four sides at `x[-417,-400] y35-43 z[-566,-550]`. It has now been lost twice: once when `cl1/cl2/cl3` never ran behind a deadlocked sequencer, and again when the rebuild shipped sealed.
- **Next action:** cut a door from the theatre balcony's west side. Tracked as `members-club-lounge` so it cannot go missing a third time.

### W2. [P1/S] The Moot Hall has one external door
- **Why:** 12 doors, 10 of them internal partitions; the only way in is a single double-door at `x[-86,-85] z=-376`. This is why the hall's upper storeys report **15%** reachable and why the Sanctum reports **sealed from the plaza** despite being reachable from the penthouse — you cannot get to the vertical core.
- **Next action:** add entrances on the north and west elevations. One change should move three manifest units at once.

### W3. [P1/M] Grange Hall 38% and Market Hall 64% reachable
- **Why:** both interiors were executed from the Fable 5 plans and both have floor plates that exist without reliable stairs between them (Grange y68/y73/y82; Market walk/terrace/loft).
- **Next action:** connect the levels, then re-run `build_status.py --only grange-hall-interior` / `--only market-hall-interior`.

### W4. [P1/L] Four designed builds with complete specs and zero blocks
- **Why:** `westlight-district` (Gatehead Square, a 54-block arcaded High Street with seven shophouses, the Beacon Inn and its 42-block tower, food hall, brew-barn, park, baths, boathouse, boardwalk, waterfall), `approach-road` (town -> Westlight, ~275 blocks, two bridges, a grey-to-white paving turnover at mid-span), `ravensgate` (the pavilion replacement — stoa, loggia, library portal, campanile, sunken court with a water chain), and `ravenrock-connectivity`. All four carry `planned:` in the manifest and count as failures until built.
- **Next action:** `ravensgate` requires demolishing `pav1` first — it is retired but still standing.

### W5. [P2/S] Nine repair ops files are outside the manifest
- **Why:** `dm1_oldstadium`, `fix1`-`fix8` all ran and all reported clean, but "reported clean" is exactly the claim this session learned to distrust. `build_status.py` flags them as unchecked.
- **Next action:** add standing assertions, or consciously record them as one-shot repairs. `fix7_doors.txt` matters most — it re-placed 29 doors that had silently vanished.


### 0. [P0/S] `loginFlow` is an opt-out sentinel — a typo broadcasts the bot password in public chat
- **Why:** the DyoAuth guards are exact-match skips, not opt-ins: `src/bot/BotInstance.ts:567` (`if (loginFlow === 'none')`) and `:649` (`if (selectClass === false)`). Both keys are `optional: true` (`src/config.ts:33-35`), so if either is deleted, misspelled, or set to anything else, the full DyoAuth dance runs — `bot.chat('/login dyobot2026')` and `bot.chat('/register dyobot2026 dyobot2026')` (`BotInstance.ts:597,600,613,620`). On the current stock Paper server there is no auth plugin, so `/login` is an unknown command and **the password is echoed into public chat by every bot on every join**, followed by a 15s auth-timeout stall before the Voyager loop and chat listener are wired up (`:389-397,625-630`). The dashboard makes this a one-typo mistake: `web/src/app/settings/page.tsx:69` renders `loginFlow` as a free-text input and `src/util/configPersist.ts:128` only validates `typeof === 'string'` — no enum check. The credential is also hardcoded as a fallback at `BotInstance.ts:558`, so deleting the config key does not remove it.
- **Next action:** invert the guards to opt-in (`if (loginFlow === 'dyoauth')`), add enum validation in `configPersist` + a select input in the settings page, and move the password out of source into env.

### 1. [P1/S] Decide what `POST /api/admin/restart` should do
- **Why:** it flushes stores then `process.exit(0)`, but the unit is `Restart=on-failure`, which ignores a clean exit — so the endpoint is a graceful *stop* that leaves the fleet down until someone runs `systemctl start`. The name and the 202 body (`"Server is restarting"`) both lie. Documented in place (`src/server/admin.ts:232`) but not fixed, because the fix is a judgement call.
- **Next action:** pick one — switch the unit to `Restart=always` (then the endpoint works as named, but a deliberate `systemctl stop` still stops cleanly), or `process.exit(1)` so on-failure respawns it, or rename it to `/api/admin/shutdown` and drop the pretence.

### 2. [P1/M] Schema migration story before the next town DB change
- **Why:** Town DB uses ad-hoc `CREATE TABLE IF NOT EXISTS`; drizzle-kit was deliberately dropped (commit `6ab4c8b`), so there is currently no way to alter existing columns/tables safely on deployed data.
- **Next action:** Decide: reinstate drizzle-kit, or add a minimal versioned-migration runner (user_version pragma + numbered SQL files). Must land before the next schema change, not after.

### 3. [P1/M] Finish build-intent wiring (stranded at ~80%)
- **Why:** The chat build-intent parser works and resolves coordinates, but only logs — "build me a house here" goes nowhere (`src/bot/BotInstance.ts:1006-1008`, TODO: dispatch to BuildCoordinator).
- **Next action:** Wire the resolved intent from `BotInstance` chat handling into `BuildCoordinator` (`src/build/`), including schematic selection and a confirmation message back to the player.

### 4. [P1/M] CI pipeline (build + vitest)
- **Why:** No `.github/` directory — nothing runs `npm run build` / `npm test` on push, so regressions land silently. (REPO_REVIEW.md #10.) Evidence: as of 2026-07-24 the web suite has 24 pre-existing failures across 9 untouched test files (component drift vs stale mocks/assertions).
- **Next action:** Add `.github/workflows/ci.yml` running install, build (root + `web/`), and `npm test` on push/PR.

### 5. [P2/L] Burn down web strict-type debt, drop `ignoreBuildErrors`
- **Why:** `web/next.config.ts:4-6` — `typescript: { ignoreBuildErrors: true }` masks ~58 `any` casts under strict TypeScript; type errors in the dashboard ship unnoticed.
- **Next action:** Fix casts incrementally (per-directory passes), then remove the flag so `next build` enforces types again.

### 6. [P2/M] Async-ify SQLite access off the event loop
- **Why:** `better-sqlite3` is fully synchronous and shares the event loop with Express + Socket.IO + brain ticks; per-minute town ticks stack blocking reads/writes. (REPO_REVIEW.md #7, still open.)
- **Next action:** Move town-tick DB work to a worker thread (infra exists in `src/worker/`) or batch/debounce the per-tick queries; bound the `listTowns()` distance scan.

### 7. [P2/S] Dockerfile / compose for reproducible deploys
- **Why:** No `Dockerfile` or `docker-compose.yml`; onboarding and host rebuilds are manual (systemd units + hand-run builds). (REPO_REVIEW.md #10.)
- **Next action:** Add a multi-stage Dockerfile (bot API + web) and a compose file mirroring the two systemd units; keep systemd as the prod path for now.

### 8. [P3/M] At-rest encryption for BYO LLM API keys — carried over, deferred
- **Why:** `data/llm-settings.json` stores provider apiKeys in plaintext (`src/ai/LLMSettings.ts:384`), but already mitigated: written mode `0o600` and masked in all API responses (`src/ai/LLMSettings.ts:100`). Single-user self-hosted box, so any encryption key would live alongside the data — marginal benefit.
- **Next action:** None unless the deployment goes multi-tenant; then add passphrase/OS-keychain wrapping of the apiKey fields.

### 9. [P1/S] No LLM fallback chain — one provider outage takes the whole fleet down
- **Why:** demonstrated in production on 2026-07-24. `ModelRouter.dispatch` builds its chain from `route.provider` + `route.fallback` + `defaultProvider` (`src/ai/ModelRouter.ts:346-354`), but `data/llm-settings.json` has `routes: {}` — so the chain is literally `["gemini"]`. When the pinned Gemini model was retired the fleet 404'd 684 times with a 3% success rate for hours, while a configured, enabled, keyed Anthropic provider sat unused. The log line "LLM generate failed, trying fallback" (`ModelRouter.ts:454`) is a misnomer for "chain exhausted".
- **Next action:** populate `routes` so each task type has anthropic as a fallback (budget gating at `:359` already protects spend), or make `dispatch` append all other enabled providers to the chain by default.

### 10. [P2/S] Config knobs the dashboard lets you edit that nothing reads
- **Why:** `behavior.ambientChatMinSec`/`ambientChatMaxSec` (`config.yml:39-40`) are read by no behavior code — `BotInstance.ts:1292-1294` hardcodes 10–20 min. Worse, `src/util/configPersist.ts:65-69` lists them under `RESTART_REQUIRED_FIELDS` claiming they "drive setInterval schedules at bot worker boot", and the settings page renders them as editable numbers. An operator turns the dial and nothing happens. `security.quarantineReleaseSec` has zero readers (honestly labelled "reserved"). `behavior.wanderRadius`/`wanderIntervalMs` are live but unreachable for a codegen-mode fleet (`BotInstance.ts:391-393`).
- **Next action:** wire ambientChat timings to the hardcoded schedule or delete the keys and their persistence entries; leave the reserved ones documented.

### 11. [P2/S] Stale world docs written in the present tense
- **Why:** `docs/BUNKER-MAP.md` carries a standing instruction to "update it every time we build out a room" for a bunker at x1669–1700 that exists only in the abandoned DyoCraft world; `docs/RAILWAY.md`, `docs/BUNKER.md`, and `docs/STEALTH-SURFACE.md` likewise state old-world coordinates as verified ground truth. `web/README.md` is still titled "DyoCraft Dashboard" and half-rebranded. `REPO_REVIEW.md:9` and `REPO_REVIEW_NOTES.md:4` open by naming `play.dyoburon.com` as the target server.
- **Next action:** add a dated "describes the retired DyoCraft world" banner to the four `docs/*.md` files, finish the `web/README.md` rebrand, and one-line-banner the two review docs.

## Resolved decisions

- **Fleet back online via server repoint (2026-07-24):** the P0 "DyoCraft upgraded to Paper 26.2, bots speak 1.21.11" blocker is **obsolete, not fixed** — the fleet moved to a fresh stock Paper **1.21.11 (protocol 774)** server at `10.80.13.14`, which matches the pinned version, with `loginFlow: "none"` + `selectClass: false` (no DyoAuth). The upstream gap it was waiting on is unchanged: mineflayer 4.37.1 / minecraft-protocol 1.66.2 / minecraft-data 3.111.0 still top out at 1.21.11 and minecraft-data master has no 26.x protocol data, so **returning to `play.dyoburon.com` remains blocked** on ViaVersion + ViaBackwards being installed there. `minecraft.loginPassword: "dyobot2026"` is now dead config. The `differentVersionError` reconnect backoff (commit `b69902a`) shipped and stands.
- **Old-world coordinates stripped (2026-07-24):** `mining.protectedZones`, `mining.mineSite`, `leash`, and `rescueHome` all described the DyoCraft world, 800–1730 blocks from the new spawn at `(-9,76,-10)`, and were actively misbehaving — 59 "travel to town near (830,64,243)" goals, 401 stuck-pathfinder resets, and 12 `Could not reach the communal mine` failures in the first hour. Emptied with dated comments and repopulation templates. `routeToMineBlocks` was left intact but is inert without a `mineSite`.
- **18 skills quarantined (2026-07-24):** the skill library was the last stale world state. Learned skills execute verbatim with no LLM rewrite (`VoyagerLoop.ts:1599-1612` → `CodeExecutor.ts:536`), and 18 indexed skills opened with a hardcoded `moveTo()` 800–1140 blocks out — including the two highest-value entries, `craft_a_wooden_pickaxe` (q 0.92, 58 successes, `moveTo(952,57,344)`) and `towntownmph4x8tze3237864_needs_16_more_stone` (q 0.79, 336 successes, `moveTo(813,66,215)`). They also reached codegen via `getAllSkillCode()` (`VoyagerLoop.ts:1674`) and `getTopKSkillCode()` (`ActionAgent.ts:300`), teaching the LLM dead coordinates. Marked `deprecated: true` (the library's own rollback mechanism — filtered on load, preserved on disk) and the files moved to `skills/quarantine/` with a restore guide. Index: 500 entries → 482 active + 18 deprecated; all other skills and stats untouched. Quality-stat reset was judged unnecessary once the coordinate carriers were gone.
- **Gemini model retired out from under the fleet (2026-07-24):** `gemini-2.5-flash-preview-05-20` returns 404 from the v1beta API and is absent from ListModels. Every curriculum/codegen/critic call had been failing (684 × 404, 3% success rate — only embeddings worked), so the fleet was running with no brain while looking healthy in `/api/bots`. Moved to `gemini-2.5-flash` (smoke-tested against the live API before switching). Note `POST /api/llm/reload` was **not** sufficient: it only hot-swaps `botManager.llmClient` in the main thread (`src/server/llmRoutes.ts:77-84`) while each bot worker builds its own router (`VoyagerLoop`), so a restart was required. See item 9 for why nothing fell back.

- **Legacy-auth fallback removed early (2026-07-24):** the P0 `?legacyAuth=true` + `mayorPlayerName` sunset item was executed ahead of the 2026-08-15 date after a full week of production logs (Jul 18–24) showed zero legacy callers. `requireMayor` is now cookie-only; stragglers get a 401 pointing at `POST /api/auth/login`.
- **Dashboard branding (2026-07-24):** UI rebranded product-first to **"MC Fleet"** (sidebar, tab title, login + coupled tests). "DyoCraft" remains only where it factually means the target server (e.g. settings-page login hints, `config.yml` host).

## Known limitations (deliberate — not planned)

- REPO_REVIEW.md is dated 2026-06-17; treated as historical context, not re-audited.
