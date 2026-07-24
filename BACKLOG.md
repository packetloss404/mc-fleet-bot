# Backlog

Prioritized tracker for mc-fleet-bot. One page, scannable. Updated **2026-07-24** from a fleet-wide audit; supersedes the 2026-07-17 audit remnant (still-valid items carried over below).

Priority tags: **[P0]** time-boxed / do next · **[P1]** should do soon · **[P2]** when convenient · **[P3]** deferred. Effort: S / M / L.

## Items

### 0. [P0/blocked-external] Fleet offline — DyoCraft upgraded to Paper 26.2, bots speak 1.21.11
- **Why:** `play.dyoburon.com` now runs Paper 26.2 (protocol 776, year-based versioning); the fleet pins `1.21.11` (`config.yml:10`) and every bot is kicked with "Outdated client! Please use 26.2" (~2.5k reconnect errors/day since the server upgrade). API/dashboard are healthy; zero bots in-world.
- **Client-side is blocked upstream (verified 2026-07-24):** latest mineflayer 4.37.1 / minecraft-protocol 1.66.2 / minecraft-data 3.111.0 all top out at 1.21.11. node-minecraft-protocol PR #1496 ("26.2") only adds the version constant — minecraft-data master has no 26.x protocol data at all, and even protocol-775 mappings are known-buggy (mineflayer #3888). Tested the PR branch against the live server: `unsupported protocol version: 26.2`.
- **Next action:** server-side fix — get ViaVersion + ViaBackwards installed on the Paper 26.2 server so 1.21.11 clients can join (needs whoever admins play.dyoburon.com). Meanwhile: watch PrismarineJS for 26.2 data landing (mineflayer #3893, node-minecraft-protocol #1496), then bump deps + `config.yml` version. Consider a long reconnect backoff on `differentVersionError` — it is a permanent failure, not transient, and the current loop burns ~2.5k errors/day into the logs.

### 1. [P1/M] Schema migration story before the next town DB change
- **Why:** Town DB uses ad-hoc `CREATE TABLE IF NOT EXISTS`; drizzle-kit was deliberately dropped (commit `6ab4c8b`), so there is currently no way to alter existing columns/tables safely on deployed data.
- **Next action:** Decide: reinstate drizzle-kit, or add a minimal versioned-migration runner (user_version pragma + numbered SQL files). Must land before the next schema change, not after.

### 2. [P1/M] Finish build-intent wiring (stranded at ~80%)
- **Why:** The chat build-intent parser works and resolves coordinates, but only logs — "build me a house here" goes nowhere (`src/bot/BotInstance.ts:1006-1008`, TODO: dispatch to BuildCoordinator).
- **Next action:** Wire the resolved intent from `BotInstance` chat handling into `BuildCoordinator` (`src/build/`), including schematic selection and a confirmation message back to the player.

### 3. [P1/M] CI pipeline (build + vitest)
- **Why:** No `.github/` directory — nothing runs `npm run build` / `npm test` on push, so regressions land silently. (REPO_REVIEW.md #10.) Evidence: as of 2026-07-24 the web suite has 24 pre-existing failures across 9 untouched test files (component drift vs stale mocks/assertions).
- **Next action:** Add `.github/workflows/ci.yml` running install, build (root + `web/`), and `npm test` on push/PR.

### 4. [P2/L] Burn down web strict-type debt, drop `ignoreBuildErrors`
- **Why:** `web/next.config.ts:4-6` — `typescript: { ignoreBuildErrors: true }` masks ~58 `any` casts under strict TypeScript; type errors in the dashboard ship unnoticed.
- **Next action:** Fix casts incrementally (per-directory passes), then remove the flag so `next build` enforces types again.

### 5. [P2/M] Async-ify SQLite access off the event loop
- **Why:** `better-sqlite3` is fully synchronous and shares the event loop with Express + Socket.IO + brain ticks; per-minute town ticks stack blocking reads/writes. (REPO_REVIEW.md #7, still open.)
- **Next action:** Move town-tick DB work to a worker thread (infra exists in `src/worker/`) or batch/debounce the per-tick queries; bound the `listTowns()` distance scan.

### 6. [P2/S] Dockerfile / compose for reproducible deploys
- **Why:** No `Dockerfile` or `docker-compose.yml`; onboarding and host rebuilds are manual (systemd units + hand-run builds). (REPO_REVIEW.md #10.)
- **Next action:** Add a multi-stage Dockerfile (bot API + web) and a compose file mirroring the two systemd units; keep systemd as the prod path for now.

### 7. [P3/M] At-rest encryption for BYO LLM API keys — carried over, deferred
- **Why:** `data/llm-settings.json` stores provider apiKeys in plaintext (`src/ai/LLMSettings.ts:384`), but already mitigated: written mode `0o600` and masked in all API responses (`src/ai/LLMSettings.ts:100`). Single-user self-hosted box, so any encryption key would live alongside the data — marginal benefit.
- **Next action:** None unless the deployment goes multi-tenant; then add passphrase/OS-keychain wrapping of the apiKey fields.

## Resolved decisions

- **Legacy-auth fallback removed early (2026-07-24):** the P0 `?legacyAuth=true` + `mayorPlayerName` sunset item was executed ahead of the 2026-08-15 date after a full week of production logs (Jul 18–24) showed zero legacy callers. `requireMayor` is now cookie-only; stragglers get a 401 pointing at `POST /api/auth/login`.
- **Dashboard branding (2026-07-24):** UI rebranded product-first to **"MC Fleet"** (sidebar, tab title, login + coupled tests). "DyoCraft" remains only where it factually means the target server (e.g. settings-page login hints, `config.yml` host).

## Known limitations (deliberate — not planned)

- REPO_REVIEW.md is dated 2026-06-17; treated as historical context, not re-audited.
