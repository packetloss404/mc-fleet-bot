# codex context — mc-fleet-bot

read this before any work. mirrors the operator's read of `HANDOFF.md` and
`AGENTS.md`, in a form an agent can ingest cheaply. verify everything against
the world — see the callout at the end.

## 1. project shape

`mc-fleet-bot` is an AI bot fleet (mineflayer + LLM) running on a single bot
host (`10.80.13.18`, systemd unit `mc-fleet-bot.service`, API on :3001) that
plays Minecraft on a separate MC server (`10.80.13.14`, Paper 1.21.11). the
repo has two TypeScript apps: a backend at the repo root (`src/`, compiled to
`dist/`) and a Next.js dashboard in `web/`. persistent state lives in `data/`,
learned skills in `skills/`, runtime config in `config.yml`, secrets in
`.env`. clients connect to `10.80.13.14:25565`, *not* `.18` — the bot host
serves only :3000 and :3001; there is no Minecraft server on it.

## 2. the 20 traps from `HANDOFF.md` §4

each item is one bullet: trap → reference → lesson. numbering is preserved
verbatim from the handoff (note: the source has a duplicate "12."; both are
kept, the second tagged `(second)`, so any cross-reference in older notes
still resolves). traps 0 and 0b are listed as separate items per the spec.

- **trap 0.** the api takes ~3 minutes to bind after a restart; nothing is wrong.
  - `src/index.ts:121` awaits `botManager.loadSavedBots()` (sequential, `joinStaggerMs: 45000`).
  - `httpServer.listen()` is at `src/index.ts:371`, *after* the load.
  - effect: 5 bots × 45s ≈ 3 min of `curl: connection refused` on port 3001 while the process is healthy and the log shows bots connecting. measured: bound at 150s.
  - **lesson:** do not debug a healthy process as a startup crash; do not restart into it repeatedly. moving `listen()` above the bot load would fix it.

- **trap 0b.** `getTopKSkillCode`'s `score >= 6` is a prompt-decoration floor, not a safety gate.
  - `src/voyager/SkillLibrary.ts:431-445`. its docstring says "for prompt context".
  - no `matchedWords` and no `isHighQuality` requirement, unlike `getBestMatch` (`>= 16` **and** `matchedWords > 0`) and `getComposableMatches` (`>= 8`, `matchedWords > 0`, `isHighQuality`).
  - score has a large query-*independent* floor — `getQuality(entry) * 10` plus saturating popularity — so **123 of 518 indexed skills clear 6 with zero lexical and zero semantic match** (measured against the live index; top scorer `swim_to_shore_drowning_and` at 15.1).
  - a 2026-08-07 change used it as an execution gate and had to be reverted.
  - **lesson:** if you are selecting code to *run*, use `getBestMatch`.

- **trap 1.** two spend figures disagree.
  - `/api/llm/usage` (`src/server/llmRoutes.ts:95`) is a **capped ring buffer** — pins at 10,000 calls and carries stale history.
  - `/api/llm/budget` (`src/server/llmRoutes.ts:137`) is authoritative and is what gates paid codegen.
  - **lesson:** if spend looks surprising, check the budget endpoint, not usage.

- **trap 2.** `npm test` used to write into production `data/`.
  - two test files built `new TokenLedger()` (class at `src/ai/TokenLedger.ts:84`) with no `dataDir`, adding ~$11.75 per run to the real spend file.
  - fixed with a constructor guard that throws under `VITEST`; the doc comment on the class explicitly calls out "a test run writes into the REAL spend file and inflates the budget cap".
  - **lesson:** if spend ever looks impossible again, check this first.

- **trap 3.** `/fill` silently no-ops above ~32,768 blocks.
  - a 50,580-block fill did nothing and reported nothing.
  - **lesson:** always chunk, and always verify after. vanilla `/fill` needs no selection and is ~750× faster than driving a bot's WorldEdit selection (see trap 16).

- **trap 4.** `replace`-scoping does not protect what you have not inventoried.
  - the MSA grading pass deleted the southern road because its surface material was not in the protected set — a scoping rule applied to the wrong inventory list.
  - for *cutting*, scoping alone is not a safety mechanism.
  - **lesson:** for cutting ops, use an explicit exclusion list of building footprints.

- **trap 5.** verification geometry produced false failures repeatedly.
  - probes landed inside roof voids, on window openings, on pedestal columns, and outside wall boxes.
  - a clean split (all-west-pass / all-east-fail) is a tell that the *probe* is wrong, not the build.
  - **lesson:** before believing a `FAIL`, confirm the probe point is somewhere the geometry actually occupies. re-derive the probe box from the same source the build came from.

- **trap 6.** `gamerule` is broken over RCON on this box.
  - returns "Incorrect argument".
  - workaround: `POST /api/bots/<name>/say {"message":"/gamerule ..."}`.
  - same class as several other RCON-doesn't-surface-errors traps.
  - **lesson:** route op-bypassing commands through an opped bot's chat; verify the change actually persisted.

- **trap 7.** `forceload` per-command chunk cap — **CORRECTED 2026-07-25**, this was misdiagnosed, and it was our bug.
  - the server *does* distinguish "That position is not loaded" from "Test failed"; `scripts/mc_admin.py` was collapsing both into `no`, so an **unverifiable** point read as a **negative** one.
  - it now reports three states (`MATCH` / `no` / `NOT-LOADED`, plus `ERROR`).
  - **lesson:** any survey taken before this fix, over an area that was not force-loaded, may contain false "missing" findings. absence of a block and inability to look are not the same result.

- **trap 8.** the api binds ~200 s after `systemctl restart`.
  - `src/index.ts` awaits `loadSavedBots()` before `listen()`. a dead port right after a restart is expected.
  - **lesson:** do not re-restart into it; same root cause as trap 0, restated in the handoff as its own item.

- **trap 9.** a structure the TownBrain cannot see is one it will build itself.
  - every hand-built structure must get a `complete` row in `town.db` `buildings`, or the brain plans a duplicate.
  - this already happened once with the Town Hall, and the well's "phantom row" almost produced a duplicate.
  - **lesson:** write the town row at the same time you build the structure.

- **trap 10.** `scripts/find_floating.mjs` deleted a real furnished building.
  - 460 built blocks — 36 chests, an anvil, a loom, a brewing stand, beds, signs — removed from a tower east of the Ravensreach plaza as "floating debris".
  - the `--max-cluster` guard protects against deleting one big thing; it does nothing about deleting a big thing **in pieces**, which is what happened.
  - restored in full 2026-07-25, but only because an unrelated session had left a 17:41 world snapshot in `/tmp` — that is luck, not process.
  - full write-up: `docs/INCIDENT-2026-07-25-ravensreach-structure-loss.md`.
  - **lesson:** do not run that sweep without the review step, a durable pre-snapshot, and a furniture veto.

- **trap 11.** a material filter must match whole block names, never substrings.
  - the restore above initially left the tower body out because `grep -vE "deepslate|stone"`, meant to skip *natural* deepslate and stone, also swallowed `deepslate_brick_stairs`, `stone_bricks` and `cobblestone`.
  - Minecraft names make **every natural block a prefix of a built one**, so substring filters silently eat structure.
  - **lesson:** exact match; same class as trap 4.

- **trap 12.** `scripts/mc_admin.py` cannot write files on the MC server, and does not say so.
  - the SSH user is **`ianwalmsley` (uid 1000), not root** — in the `sudo` group but the tool never escalates.
  - everything under `/opt/packetcraft/paper-server` is root-owned, so every file write fails with `Permission denied`. RCON is unaffected (it authenticates separately), which is why this went unnoticed: the *runtime* half of each command works and only the *persistence* half silently dies.
  - concretely, `set-difficulty` runs `cp -n … 2>/dev/null; sed -i …` and then reads only **stdout**, so the permission error on stderr is discarded and it prints `server.properties persisted:` with an empty value — indistinguishable from success.
  - proof it has never worked: no `server.properties.bak.mcadmin` exists on the server despite the command having been run. **consequence:** any difficulty set through this tool reverts on the next server restart. `server.properties` still reads `difficulty=peaceful`.
  - **lesson:** treat every file-writing action in that tool as a no-op; verify by reading the file back.

- **trap 12 (second).** never drive a player-relative WorldEdit command from a bot.
  - `//cyl`, `//sphere`, `//pyramid` and `//forest` are all centred on the *player*, and the bot **falls** between the `/tp` and the command reaching the server.
  - measured on 2026-07-26: a cylinder aimed at y=100 landed at y=98; one aimed at y=104 landed at y=101. the drift is non-deterministic, so a fill and a carve issued at the "same" level miss each other and you get a solid lump instead of a bowl. spectator mode does **not** fix it.
  - **lesson:** rasterise the shape in Python and emit `//pos1`/`//pos2`/`//set` boxes — absolute coordinates depend on nothing. it costs ~13× the ops and is still right.

- **trap 13.** a road that clears headroom will eat a building.
  - `road()` in `scripts/gen_civic.py` sets y68-71 to air along its route. three legs ran through cottage footprints and destroyed walls, two fittings and half a bed — chest *contents* are unrecoverable.
  - the generator is now re-routed and carries the footprints it must avoid in a comment.
  - **lesson:** before running any path/road generator, intersect its route boxes against known building footprints. same class as trap 4 — scope on its own does not protect a footprint you forgot to add.

- **trap 14.** `REPL <mask> air → X` does not fill cells that were never air-masked.
  - laying farmland with `REPL dirt,grass_block,… → farmland` leaves pre-existing **air** gaps as air, so a water channel run through it spreads out through those gaps.
  - two separate floods came from this.
  - **lesson:** when a fill must be watertight, fill the air too, and wall the ends of any channel.

- **trap 15.** dig no canal without capping both ends.
  - both Ravensreach canals were cut with open ends and drained themselves across the town — 130 blocks of stray water, 23 of them inside a resident's cottage.
  - **lesson:** same class as the N1/N6 floods and trap 14; cap every channel, both ends.

- **trap 16.** build ops belong on RCON `/fill`, not on a bot's WorldEdit selection.
  - WorldEdit needs a *player* selection, so `scripts/build_runner.py` drives an opped mineflayer bot and spends three chat round-trips per op (`//pos1`, `//pos2`, `//set`) plus a reply poll — measured **~1.5 s per op**, which is four hours for a 9,500-op build.
  - vanilla `/fill` needs no selection: one command per box, measured **0.002 s** over an already-open RCON channel. the same 9,500 ops took **19 seconds**. use `scripts/rcon_runner.py`.
  - three caveats it handles, all of which bite silently: (a) `/fill` refuses unloaded chunks with `That position is not loaded` — the bots never move (we place by coordinate), so nothing at a remote site is loaded; it force-loads the ops' bounding box and restores any of the operator's ~281 pinned chunks that its own `forceload remove` takes with it. (b) `/fill` caps at **32768 blocks**; bigger boxes are split. (c) `/fill` has **no random patterns** — lay geometry down in flat single materials and scatter accents afterwards in a handful of big WorldEdit `//replace` passes — 1,540 per-row mix ops cost ~38 min through a bot; four `//replace` cost seconds.

- **trap 17.** this server's command parser rejects `chain`.
  - `setblock <x> <y> <z> chain` and `fill … chain` both answer `Unknown block type 'minecraft:chain'`, with or without an explicit axis state, while WorldEdit places the same block happily.
  - also **`smooth_basalt_slab` does not exist** in vanilla — smooth_basalt has no slab variant, and an LLM design suggested it.
  - the valid 1.21.11 registry name is **`minecraft:iron_chain`**, which works directly through `/fill`; the 59 theatre rigging placements were rebuilt that way and sampled 8/8.
  - **lesson:** `rcon_runner.py` still blocks the legacy id so old ops cannot lose blocks silently.

- **trap 18.** carve vertical shafts LAST.
  - three separate corridor ceilings each re-sealed the Moot Hall shaft during a single repair. any op laying a floor or ceiling across a shaft's footprint will close it.
  - **lesson:** put the shaft carve at the end of the file and it cannot be undone by its own build.

- **trap 19.** doors need two ops.
  - a door is two blocks with *different* block states. setting a 2-tall selection to a door id writes two `half=lower` halves, which is invalid and pops off on load.
  - **every door placed in the 2026-07-26 session vanished this way** — 29 of them, across the library, the canal houses, the Grange Hall, three cottages and the penthouse.
  - all four generators now carry a `door()` helper.
  - **lesson:** use the helper; do not raw-set a door id.

- **trap 20.** never wait on a `pgrep` that matches your own command line.
  - a sequencer waited on `pgrep -f "buildops/ch2_bowl"` — which matched *itself*. it waited forever and **seven ops files were never run**: the whole concert-hall fit-out and the entire members' club.
  - the runner logs looked healthy throughout; nobody noticed for hours.
  - **lesson:** anchor pgrep on a token that will not appear in your own argv (e.g., a pid file written before the wait).

## 3. build / test / run

all from `AGENTS.md`. these are the only commands you need to verify your work.

- **backend build:** `npm run build` (runs `tsc`, repo root).
- **backend tests:** `npm test` (= `vitest run`); single file: `npx vitest run test/path/to/file.test.ts`. full control-platform suite: `npx vitest run test/control/`. focused citizen-fleet regression suite and civic-shift executor suites are listed in `AGENTS.md` §Testing.
- **frontend lint:** `npm run lint --prefix web` — caveat: it currently reports pre-existing warnings and errors. do not assume the frontend is lint-clean before making changes; check whether failures are pre-existing.
- **do not start a second instance.** the stack runs under systemd as `mc-fleet-bot.service` (port 3001) and `mc-fleet-web.service` (port 3000). starting `node dist/index.js` while the service is up spawns a second fleet using the same bot usernames; the duplicate login kicks the real bot, the impersonation monitor flags it and puts the bot into `QUARANTINED`, and it deliberately does not reconnect. `AGENTS.md` cites `src/bot/BotInstance.ts:527-540` as the rough region; the actual logic is the `quarantined` flag set at `src/bot/BotInstance.ts:800-801` and the reconnect suppression at `src/bot/BotInstance.ts:1078-1079`. do not `kill` the listener without restarting it — `Restart=on-failure` treats SIGTERM and a clean exit as an intentional stop and will leave the fleet down. `POST /api/admin/restart` has the same problem: it exits 0, so it stops the fleet rather than restarting it.
- **restart sequence:** `sudo systemctl restart mc-fleet-bot` (after `npm run build`). expect ~3 minutes of `curl: connection refused` on port 3001 while `loadSavedBots()` runs (trap 0). do not re-restart into it.
- **guarded physical releases** (when applicable): `scripts/rcon_runner.py --strict-noop --report <json>`. in strict mode, a source-state drift that produces "nothing changed" is a failure instead of being folded into the success count.

## 4. pointer map

do not re-derive prior work. these are the docs that already exist for the work you are most likely to be asked to do.

- `HANDOFF.md` — source of truth. read it before any brief. especially §3 (open items, SEC-01/02, OQ-3, the OOM post-mortem), §4 (the traps above), §6/§7 (hardware and sizing, RESIZED 2026-07-26), and §8/§9 (siting and Westlight carry-forwards).
- `AGENTS.md` — agent guide. build/test/lint commands, naming, the "do not start a second instance" rule, and the workflow notes for the read-only report generators.
- `docs/tasks/sec01/README.md` — the SEC-01 (six fixes) + SEC-02 (key rotation) index, with order and dependencies. brief-by-brief. recommended execution order: 1 → 7 → 2 → 3 → 5 → 4 → 6.
- `docs/research/worker-process-isolation.md` — the wider worker isolation design. read §3 first. the polkit-rule decision is the blocker; the six items that ship regardless of it are §6 of that file. the third "regression surface" agent never delivered, so the feature-by-feature breakage inventory is missing.
- `docs/research/` — broader research folder. includes `unreachable-api-and-config`, `town-activation-and-elections`, `stuck-bots-diagnosis`, `skill-reuse-and-techniques`, `routing-policy`, `model-routing-plan`, `memory-architecture-design`, `knowledge-brain-design`, `hive-mind-design`, `dashboard-audit`, `call-volume-audit`, `models-routing-page-design`, `memory-backend-evaluation`, `dormant-data-stores`, `dormant-core-code`, `stuck-bots-diagnosis`.
- `docs/masterplans/` — `05-combined-zones/` (the active phase-1 site), `06-approach-road/`, `12-westlight-district/`, `13-westlight-venue/`, `04-combined-complex/`, plus the top-level `current-masterplan.html`.
- `docs/INCIDENT-2026-07-25-ravensreach-structure-loss.md` — the trap-10 incident write-up. read it before any `find_floating.mjs` work.

## 5. what NOT to do

- do not run the live fleet, RCON, or systemd. the bot host runs under `mc-fleet-bot.service` on port 3001; starting a second `node dist/index.js` will kick the real bot via the duplicate-login path and trip the impersonation monitor into `QUARANTINED`. the MC server is at `10.80.13.14:25565`, not on the bot host — point clients there.
- do not edit `dist/`. source changes go in `src/` and `web/src/`; build with `npm run build`.
- do not invent a remote for the local devtools repo at `/opt/stacks/mc-fleet-devtools`. it has no remote; do not push it into `mc-fleet-bot`.
- do not commit secrets. anything in `.env` is gitignored for a reason. the same goes for `~/.config/ianlan-nextgen/credentials.env` and any other 0600 credential files — values stay out of docs, commands, logs, commits, and uploads.
- do not start world work. the handoff is explicit that the documentation has been "more confident than its evidence" — verify against the world before acting on any claim here, including the traps above.

## 6. style conventions

from `AGENTS.md`. preserve the file's existing style on every change.

- **backend:** single quotes, semicolons, 2-space indent, trailing commas in multiline. strict TypeScript, CommonJS target, compiles to `dist/` with `tsc`.
- **frontend:** also single quotes in current files, but match the file you touch. strict TypeScript, Next.js bundler resolution, `@/*` → `web/src/*`. ESLint currently enforces `@typescript-eslint/no-explicit-any` — no new `any` there.
- **filenames:** `PascalCase.ts` for backend classes (`BotManager.ts`, `VoyagerLoop.ts`); `camelCase.ts` for action helpers (`mineBlock.ts`, `walkTo.ts`); `page.tsx` / `layout.tsx` for Next.js routes.
- **constants / types / functions / methods:** `UPPER_SNAKE_CASE` for true constants; `PascalCase` for classes / interfaces / type aliases / enums; `camelCase` for everything else.
- **tests:** `vitest`. no `supertest` — the existing auth tests roll their own http client (see `test/server/auth.dashboardSecret.test.ts`).
- **errors:** in Express handlers, validate first and `return` immediately after the guard's `4xx` response. log via `src/util/logger.ts`, not `console.log`. action helpers return `{ success, message, data? }`.
- **commit messages:** lowercase first word, descriptive, no tag prefix. match the recent log style (`git log --oneline -20`).

## 7. epistemic warning

> this project's documentation has repeatedly been more confident than its
> evidence. verify against the world before acting on any claim here, including
> these.

world build state lives in `python3 scripts/build_status.py` — that is the
authoritative source for what is actually in the world right now. if any claim
above (or in `HANDOFF.md`, or in a brief) disagrees with `build_status.py`,
trust the world.
