# Backlog

Prioritized tracker for mc-fleet-bot. One page, scannable. Updated **2026-07-27** with the worldwide interior review; the platform items from the 2026-07-24 fleet audit are carried below unchanged.

> **World-building work is tracked separately and machine-checked.** Run `python3 scripts/build_status.py` — it reads `builds/manifest.yaml` and reports every build unit's placement *and* traversability. It is the source of truth for items W0-W5 below; this page only records why they matter.

Priority tags: **[P0]** time-boxed / do next · **[P1]** should do soon · **[P2]** when convenient · **[P3]** deferred. Effort: S / M / L.

## Items

### W0. [DONE 2026-07-26] Westlight theatre circulation
- **Resolution:** built the grade-to-parterre switchback and entry tunnel, joined the three lobby floors, and continued radial passages through the drum and seating tiers at measured y18 / y29 / y40 floor levels. Six representative destinations pass in both directions; measured venue coverage is **91%** (18,176/20,018 standable cells), enforced at an 85% floor in `builds/manifest.yaml`.

### W1. [DONE 2026-07-26] Members' club circulation
- **Resolution:** continued the west balcony vomitory through the solid raked seating and added a two-wide private stair down to the lounge without disturbing its bar or dance floor. Both lounge levels pass in both directions from the exterior; measured room coverage is **96%** (192/199 standable cells), enforced at a 90% floor in `builds/manifest.yaml`.

### W2. [DONE 2026-07-26] Moot Hall / Sanctum circulation
- **Final resolution 2026-07-27:** the interim ladder route was superseded. A
  finished 9×9 deep↔B2 switchback and stacked two-wide bell-core stairs now
  connect Sanctum, B2, B1, ground, 1F, 2F, 3F, and penthouse. All 58 Moot Hall
  ladders were removed/capped; 20/20 directional routes pass.

### W3. [DONE 2026-07-26] Grange Hall and Market Hall circulation
- **Resolution:** measured the live stair failures rather than replacing the protected storage they crossed. Market now has a complete walk-to-terrace flight, a new clear-bay loft flight and a railed bridge joining both lofts; coverage is **91%** (1,249/1,375 standable cells). Grange now has a reopened hall-to-wall-walk flight and a new two-wide west-bay stair to the craft loft; coverage is **98%** (775/793). Both units pass representative destinations in both directions and enforce minimum coverage in `builds/manifest.yaml`.

### W4. [DONE 2026-07-26] Western expansion and the remaining traversal failures
- **Resolution:** replaced the temporary pavilion with Ravensgate (Garth, stoa, library loggia/portal, Bell-Gate campanile, belvedere and Long Water); built the two-bridge approach with its grey-to-white turnover; and built Westlight District with Gatehead, all seven High Street shops, both public pavilions, Beacon Inn, brew-barn, park, baths, Skiff House and the live-fitted Brimside boardwalk. The boardwalk/waterfall were moved outside the enlarged as-built bowl after traversal exposed the archived coordinate conflict.
- **Also closed:** corrected the library's false atrium target; repaired six Amsterdam canal-house entries and the Ravensgate handoff; built a real stadium grade tunnel and field-to-rim aisle; and repaired Raven Rock N9's one-block ladder/railing egress. Raven Rock's supposedly unbuilt N5 route already existed—the old check clipped its y=-12/x=75 detour.
- **Evidence:** all four former `planned:` units now have canonical ops and bidirectional walks in `builds/manifest.yaml`; the unfiltered status reports no problems.

### W5. [DONE 2026-07-26] One-shot repair-file policy
- **Resolution:** `fix*` and `dm*` batches are treated as one-shot migration history rather than independent standing builds. Their durable final geometry is enforced by canonical unit ops, bidirectional manifest routes, and the structural audit; `build_status.py` no longer reports these historical batches as stray live units.

### W6. [DONE 2026-07-27] Moot Hall south multiplex and final Ravensreach regressions
- **Resolution:** repaired the IMAX aisle, both medium cinemas, and B2
  concessions lounge; retired the orphan flight; closed the irrigation sidewall
  at its actual source; restored the Market stair and Garth paving; and removed
  transient canal dirt. Final snapshot
  `ebf7bfbce2128e2ffcc6b61d6c667c8831c8f4b0b9572fdba1010aafb1b8cfc2`
  passes **112/112**. B1/B2/vertical/combined PNG and PDF maps are complete.

### W7. [DONE 2026-07-27] Worldwide floor plans, furnishings, and stairs
- **Resolution:** audited all 68 mapped structures and 236 named rooms; fitted
  every empty/under-detailed room; replaced remaining cataloged ladders with
  stairs; repaired H09/H11, the six-level Ravensreach Library, Beacon Inn's
  solid tower volume and ascent, and four sealed C01 lower-operations rooms.
  The final snapshot has **0 empty rooms, 0 under-detailed rooms, 0 structures
  using ladders, and 0 multi-floor structures without stairs**. All 32
  saved-world route suites pass, and seven database scans retain 335 feature
  observations. See `docs/WORLDWIDE-INTERIOR-REVIEW-2026-07-27.md`.

### W8. [DONE 2026-07-27] MainStreet secure-complex design and detail wave
- **Resolution:** gave the parking-side C01 bunker a real five-level primary
  stair, rebuilt its theater and three conference rooms, dressed the aviation
  hangar and response arena, designed eight observatory rooms and three
  functional roof-lens assemblies, and separated the hidden luxury penthouse
  from public circulation. The apartment, safe suite, shelter, communications
  room, and three-level grand vault now have complete room programs,
  furnishings, working stairs, rails, and wayfinding.
- **Evidence:** 2,075 guarded build commands plus 11 final wayfinding commands
  completed live; the immutable final snapshot passes 21/21 saved-world checks.
  Forty-one feature observations are stored in database scan
  `wsc_edfbf0742b8587b6`. See
  `docs/MAINSTREET-SECURE-COMPLEX-WAVE5-2026-07-27.md`.


### 0. [DONE 2026-08-08] Finish dashboard hardening for DyoAuth settings — backend risk fixed
- **Fixed 2026-07-26:** `BotInstance` now runs DyoAuth only when `loginFlow === 'dyoauth'`, class selection only when explicitly true, and the source fallback is empty/`MC_BOT_PASSWORD`; `configPersist` validates `loginFlow` against `none|dyoauth`. A missing or misspelled setting now fails safe instead of sending a credential to chat.
- **Fixed 2026-08-08:** the dashboard now renders `loginFlow` as a closed `<select>` (`web/src/app/settings/page.tsx:69-79`) with the same two values the API accepts, so the form can no longer surface values that the API will reject. A new `options` override on `FieldOverride` (`web/src/components/settings/SettingsSection.tsx:42-48`) makes this available to any future closed-enum string field.
- **Residual:** the tracked runtime config still carries a nonempty legacy login password even though this server uses `loginFlow: none`. Decision is a one-line config edit, not a code change; deferred.

### 1. [P1/S] Decide what `POST /api/admin/restart` should do
- **Why:** it flushes stores then `process.exit(0)`, but the unit is `Restart=on-failure`, which ignores a clean exit — so the endpoint is a graceful *stop* that leaves the fleet down until someone runs `systemctl start`. The name and the 202 body (`"Server is restarting"`) both lie. Documented in place (`src/server/admin.ts:232`) but not fixed, because the fix is a judgement call.
- **Next action:** pick one — switch the unit to `Restart=always` (then the endpoint works as named, but a deliberate `systemctl stop` still stops cleanly), or `process.exit(1)` so on-failure respawns it, or rename it to `/api/admin/shutdown` and drop the pretence.

### 2. [DONE 2026-07-26] Versioned town DB migrations
- **Resolution:** `src/town/db.ts` now owns an ordered `MIGRATIONS` list, persists the applied version with SQLite `PRAGMA user_version`, and runs pending migrations before creating indexes. Fresh-table definitions and deployed-data migrations are documented together.

### 3. [P1/M] Finish build-intent wiring (stranded at ~80%)
- **Why:** The chat build-intent parser works and resolves coordinates, but only logs — "build me a house here" goes nowhere (`src/bot/BotInstance.ts:1006-1008`, TODO: dispatch to BuildCoordinator).
- **Next action:** Wire the resolved intent from `BotInstance` chat handling into `BuildCoordinator` (`src/build/`), including schematic selection and a confirmation message back to the player.

### 4. [PARTIAL 2026-08-07] CI pipeline (build + vitest)
- **Why:** No `.github/` directory — nothing runs `npm run build` / `npm test` on push, so regressions land silently. (REPO_REVIEW.md #10.) Evidence: as of 2026-07-24 the web suite has 24 pre-existing failures across 9 untouched test files (component drift vs stale mocks/assertions).
- **Resolution so far:** `fleet-devtools/` has its own gate
  (`.github/workflows/fleet-devtools.yml` at the repo root, scoped to
  `paths: ['fleet-devtools/**']`); runs `npm run check` (lint + build +
  test + format:check) on push and PR to `main`. Promoted out of
  `fleet-devtools/.github/workflows/ci.yml` on 2026-08-07 because GitHub
  only reads workflows from the repo root — see CHANGELOG.md.
- **Remaining:** root `npm test` is deliberately not gated (the
  `test/build/` Combined Zones tests read gitignored `data/` fixtures
  and fail on a fresh clone); a repo-wide workflow would go red and
  stay red. The 2026-08-07 team-c review confirmed the count:
  130 test files pass, 72 fail (mostly the data-fixture ones), with
  one unhandled worker timeout. **Don't widen `paths` until the root
  suite's fixture problem is fixed.**

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

### 9. [DONE 2026-07-26] Per-task LLM fallback chains
- **Resolution:** `data/llm-settings.json` now defines routes for codegen, critic, curriculum, chat, and embeddings; every route has a fallback and the default provider is Anthropic. The prior empty-route single-provider failure mode is closed.

### 10. [DONE 2026-08-08] Config knobs the dashboard lets you edit that nothing reads
- **Resolution:** `BotInstance.scheduleAmbientChat` (`src/bot/BotInstance.ts:1618-1631`) now reads `config.behavior.ambientChatMinSec` / `ambientChatMaxSec` (seconds, clamped ≥ 5 s) instead of the 10–20-minute hardcode; the config keys are no longer cosmetic. `security.quarantineReleaseSec` is now implemented: when positive, a bot that gets quarantined for impersonation schedules its own auto-release via `setTimeout` (`src/bot/BotInstance.ts:810-822`); the 0/omitted default keeps the prior manual-only behavior. Both fields retain their `RESTART_REQUIRED_FIELDS` entries because the timers are constructed from the config at quarantine/chat-schedule time, not propagated over IPC. `wanderRadius` / `wanderIntervalMs` are still gated on `mode !== CODEGEN` (`BotInstance.ts:659-660`); closing that is a behavior change, deferred.

### 11. [DONE 2026-07-27] Reconcile active Ravensreach world documents
- **Resolution:** current interiors, civic-quarter, completion, south-extension,
  audit, manifest, and reconciliation documents now agree with the 112/112
  final snapshot. Historical diagnoses retain supersession banners instead of
  being rewritten.

### 12. [P1/S] Finish Raven Rock WorldGuard ownership — Ravensreach done
- **Resolved:** `ravensreach` now has `packetloss404` as owner and all five
  residents as members; the matching PacketCraft parcel accepts all five.
- **Remaining:** apply and probe the intended membership for `raven_rock` and
  `raven_rock_shaft` without changing their build-flag policy.

### 13. [DONE 2026-07-27] Set a current-world `rescueHome`
- **Resolution:** configured the lit Moot Hall plaza cell `(-85,68,-370)` and
  added targeted config/geofence coverage.

### 14. [DONE 2026-08-07] Absorb the three sub-tools into the repo
- **Resolution:** `world-builder/` (mcwb) and `fleet-devtools/`
  (mc-fleet-devtools) were merged in via `git subtree` on 2026-08-07
  with their histories preserved. `world-showcase/` was already
  tracked. The 2026-08-07 team-c review added a `Sub-tools` section
  to `AGENTS.md` plus per-sub-tool `AGENTS.md` files, fixed the
  stale "22 tests" claim (now 38), fixed the stale
  `world-builder/examples/.mcwb.toml` plan path, and added
  `SITE_PASSCODE` / `SITE_SESSION_SECRET` to the root `.env.example`.
  See `team-c-tools-recommendations.md` for the bigger follow-ups.

### 15. [P2/S] Add a CI workflow for `world-builder/`
- **Why:** pytest is local-only. The 38 tests run from any host with
  Python 3.11+ and `litemapy`, but there is no `pytest` gate on push.
- **Next action:** Add `.github/workflows/world-builder.yml` at the
  repo root, scoped to `paths: ['world-builder/**',
  '.github/workflows/world-builder.yml']`. Use `actions/setup-python@v5`
  with Python 3.12 (avoids the amulet-core 3.13 trap), install with
  `pip install -e ".[dev]"`, and run `pytest`.

### 16. [P2/S] Configure ESLint for `world-showcase/`
- **Why:** `npm run lint` is interactive (asks the user how to
  configure ESLint) and unusable in non-interactive shells. There is
  no `.eslintrc.json` in the project.
- **Next action:** Add a minimal `next/core-web-vitals` ESLint config
  so `next lint` can run non-interactively. Then re-enable any
  pre-existing lint checks before they drift further.

## Optional initiatives (not completion debt)

Canonical scope, gates, dependencies, and acceptance criteria live in
[`docs/OPTIONAL-INITIATIVES-2026-07-26.md`](docs/OPTIONAL-INITIATIVES-2026-07-26.md).
These entries do not reopen the completed MainStreet America audit and never
outrank required items above.

| ID | Priority / effort | State | Short name |
|---|---|---|---|
| OPT-01 | P1 / M | READY | Generic read-only world scanner |
| OPT-02 | P1 / S | DESIGN | Scheduled Box archive activation |
| OPT-03 | P1 / M | READY | Repeatable map and visual-QA bundle |
| OPT-04 | P2 / M | DESIGN | MainStreet presentation polish pack |
| OPT-05 | P2 / M | DESIGN | Raven Rock finish pack |
| OPT-06 | P2 / S–M | DESIGN | Ravensreach east civic-water edge |
| OPT-07 | P2 / M | DESIGN | Curated schematic library packs |
| OPT-08 | P3 / M | DESIGN | Personality-drift experiment |
| OPT-09 | P3 / S–M | DESIGN | Weighted voting / executive override |
| OPT-10 | P3 / M | READY | Continuous action awareness |
| OPT-11 | P3 / L | CONDITIONAL | Dedicated render VM / higher-fidelity render farm |
| OPT-12 | P3 / M | CONDITIONAL | At-rest LLM-key encryption |
| OPT-13 | P3 / L | PARKED | Virtual town currency |
| OPT-14 | — | ARCHIVED | Retired DyoCraft rail/residue work |

## Resolved decisions

- **Fleet back online via server repoint (2026-07-24):** the P0 "DyoCraft upgraded to Paper 26.2, bots speak 1.21.11" blocker is **obsolete, not fixed** — the fleet moved to a fresh stock Paper **1.21.11 (protocol 774)** server at `10.80.13.14`, which matches the pinned version, with `loginFlow: "none"` + `selectClass: false` (no DyoAuth). The upstream gap it was waiting on is unchanged: mineflayer 4.37.1 / minecraft-protocol 1.66.2 / minecraft-data 3.111.0 still top out at 1.21.11 and minecraft-data master has no 26.x protocol data, so **returning to `play.dyoburon.com` remains blocked** on ViaVersion + ViaBackwards being installed there. `minecraft.loginPassword: "dyobot2026"` is now dead config. The `differentVersionError` reconnect backoff (commit `b69902a`) shipped and stands.
- **Old-world coordinates stripped (2026-07-24):** `mining.protectedZones`, `mining.mineSite`, `leash`, and `rescueHome` all described the DyoCraft world, 800–1730 blocks from the new spawn at `(-9,76,-10)`, and were actively misbehaving — 59 "travel to town near (830,64,243)" goals, 401 stuck-pathfinder resets, and 12 `Could not reach the communal mine` failures in the first hour. Emptied with dated comments and repopulation templates. `routeToMineBlocks` was left intact but is inert without a `mineSite`.
- **18 skills quarantined (2026-07-24):** the skill library was the last stale world state. Learned skills execute verbatim with no LLM rewrite (`VoyagerLoop.ts:1599-1612` → `CodeExecutor.ts:536`), and 18 indexed skills opened with a hardcoded `moveTo()` 800–1140 blocks out — including the two highest-value entries, `craft_a_wooden_pickaxe` (q 0.92, 58 successes, `moveTo(952,57,344)`) and `towntownmph4x8tze3237864_needs_16_more_stone` (q 0.79, 336 successes, `moveTo(813,66,215)`). They also reached codegen via `getAllSkillCode()` (`VoyagerLoop.ts:1674`) and `getTopKSkillCode()` (`ActionAgent.ts:300`), teaching the LLM dead coordinates. Marked `deprecated: true` (the library's own rollback mechanism — filtered on load, preserved on disk) and the files moved to `skills/quarantine/` with a restore guide. Index: 500 entries → 482 active + 18 deprecated; all other skills and stats untouched. Quality-stat reset was judged unnecessary once the coordinate carriers were gone.
- **Gemini model retired out from under the fleet (2026-07-24):** `gemini-2.5-flash-preview-05-20` returns 404 from the v1beta API and is absent from ListModels. Every curriculum/codegen/critic call had been failing (684 × 404, 3% success rate — only embeddings worked), so the fleet was running with no brain while looking healthy in `/api/bots`. Moved to `gemini-2.5-flash` (smoke-tested against the live API before switching). Note `POST /api/llm/reload` was **not** sufficient: it only hot-swaps `botManager.llmClient` in the main thread (`src/server/llmRoutes.ts:77-84`) while each bot worker builds its own router (`VoyagerLoop`), so a restart was required. See item 9 for why nothing fell back.

- **Legacy-auth fallback removed early (2026-07-24):** the P0 `?legacyAuth=true` + `mayorPlayerName` sunset item was executed ahead of the 2026-08-15 date after a full week of production logs (Jul 18–24) showed zero legacy callers. `requireMayor` is now cookie-only; stragglers get a 401 pointing at `POST /api/auth/login`.
- **Dashboard branding (2026-07-24):** UI rebranded product-first to **"MC Fleet"** (sidebar, tab title, login + coupled tests). "DyoCraft" remains only where it factually means the target server (e.g. settings-page login hints, `config.yml` host).

## Known limitations (deliberate — not planned)

- REPO_REVIEW.md is dated 2026-06-17; treated as historical context, not re-audited.
