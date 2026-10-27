# AGENTS.md

Guidance for coding agents working in `world-showcase/`, the IANLAN
NextGen report library (primary deployment: datacenter `10.80.13.16`). Run every command below
from this directory, never from the repository root — this is a
standalone Next.js 15 app and the root Node build does not cover it.

## Purpose

A public report library for master plans, project
records, investigations, and verified delivery evidence. Six reports
ship today: Master Plan, Underground Navigation, historical Masterplan Program,
POI Coordinate Directory, Empty Eight, and Bunker Construction Status. It is the human
surface for the report library; the generators live in `scripts/`
under the repo root and in `scripts/` here.

## Boundary with the rest of the repo

- Reads synced report assets from `public/` (e.g. `public/underground/`,
  `public/coordinates/`, `public/masterplans/`). These are populated
  by publication scripts and are committed. Current documented status is
  generated separately in `public/current-plan-state/` from tracked controlling
  ledgers and accepted release records. This is not a new live-world survey.
- Has no dependency on `src/`, `tools/fleet-devtools/`, or
  `world-builder/`. The site is a static-friendly Next.js app that
  renders committed artifacts; nothing reaches the live world or the
  database.

## Commands

```bash
npm install                                 # its own lockfile; the root install does not reach here
npm run build                               # `next build`
npm test                                    # source freshness + publication/Node checks
npm run test:e2e                            # real Chromium report and asset checks
npm run start                               # `next start` — production server
npm run dev                                 # local dev on http://localhost:3000

# Sync the two accepted report packages from the repo-root generators:
npm run sync:underground
npm run sync:coordinates
```

`next lint` is interactive (asks how to configure ESLint) and cannot
run in a non-interactive shell. There is no ESLint config in this
project — the team-c review found the pre-existing `next lint` script
unusable and left it in place; the script will need an `.eslintrc.json`
before it can be non-interactive (see `team-c-tools-recommendations.md`).
Tracked as OPT-16 in `BACKLOG.md`.

## Windows + npm scripts cross-platform trap

The repo currently exhibits a well-known class of cross-platform npm
issue: `npm run build` and `npm run lint` fail on Windows with
`'next' is not recognized as an internal or external command` because
the `node_modules/.bin/next.cmd` shim is not created (npm optional
dependencies bug, see also `tools/fleet-devtools/AGENTS.md` and HANDOFF §4
trap 7). Direct invocation works:

```powershell
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next lint    # still interactive
```

CI lives in the repo-root `.github/workflows/ci.yml`; the issue is local Windows
developer ergonomics only. `rm -rf node_modules && npm install` fixes
it for some platforms; the `node node_modules/.../next build` form is
the reliable workaround.

## Auth

The current reports are public: `middleware.ts` passes requests through and
`verifySiteSession()` always returns true. Legacy PIN helpers and the auth
endpoint remain, but do not gate report or asset access. Changing access
policy is a separate decision. The retained helpers use:

- `SITE_PASSCODE` (exactly ten digits) — required, used by
  `POST /api/auth` to mint a session cookie.
- `SITE_SESSION_SECRET` (32+ characters) — required, used to HMAC-sign
  the session cookie in both `lib/siteAuth.ts` (Node `crypto`) and
  `middleware.ts` (Web Crypto). Both produce the same base64url HMAC
  and are kept in sync; do not let them drift.

Both are read from `process.env`; any configured values are **never** committed. A copyable
list lives at the bottom of the root `.env.example`.

## Tests

The package verification scripts cover source freshness, publication integrity,
Node regressions, real-browser report journeys, and the production build.
Browser tests use Playwright, matching the dashboard tooling; no backend runtime import is needed.
CI runs the same publication and browser gates. Upstream world-release QA still
controls any physical construction or access acceptance.

Preserve each historical report's source date and snapshot identity. Report 03
and `lib/masterplans.ts` are the 5 August archive: their 2/7 R00 record cannot
override the current MP05 ledger's 7/7 PASS and bounded MVP acceptance. Never
refresh old validation hashes to imply historical claims were revalidated.

Validate schemas, counts, referenced files and hashes before changing a
published package. Stage complete replacements and retain recoverable prior
content; do not empty targets before validation. The August 27 underground
candidate contains a coordinate summary and is invalid for this atlas.
Three older C01 visual bundles contain unresolved templates and are not
geometric maps: keep them out of current galleries and reject them before sync.
Their publication defects do not negate separately accepted construction.
The repaired root publishers emit finite coordinate projections into new
27 October bundles after checking accepted ledger/QA/manifest bindings.
`npm run sync:c01-verified` publishes those validated bundles additively;
the old August attempts remain historical and are not rewritten.

## Boundaries to keep

- Do not import from `src/`, `world-builder/`, or `tools/fleet-devtools/`.
  The site is standalone.
- Do not commit `SITE_PASSCODE` or `SITE_SESSION_SECRET`.
- Do not run `npm run lint` non-interactively until ESLint is configured.
- Deploy within the user's authorized scope after checks and CI pass,
  through repo-root `scripts/deploy_world_showcase_datacenter.sh`. It uses the
  dedicated SSH key and pinned fingerprint in `.deploy-keys/`, builds on the
  datacenter host, restarts `ianlan-nextgen.service`, and checks Nginx health.
  Never copy `.env` or fall back to passwords. Railway remains a rollback.

## File map

- `app/layout.tsx`, `app/page.tsx` — root layout and public
  reports home.
- `app/reports/{master-plan,underground-navigation,masterplan-program,poi-coordinate-directory,empty-eight,bunker-construction-status}/page.tsx` — six reports.
- `app/api/auth/route.ts`, `app/api/health/route.ts` — auth and health endpoints.
- `components/PasscodeGate.tsx` — the PIN entry gate UI.
- `components/{AtlasExplorer,CoordinateDirectory,MasterplanProgram}.tsx` — the three report-specific components.
- `lib/siteAuth.ts` — Node-crypto session sign/verify.
- `lib/reports.ts` — the report library manifest (one entry per report).
- `lib/masterplans.ts` — preserved 5 August planning figures for Report 03.
- `public/current-plan-state/` — current documented status and exact source copies.
- `middleware.ts` — current public pass-through; legacy signing helpers remain.
- `scripts/sync_underground_report.mjs`, `scripts/sync_coordinate_directory.mjs` — the two sync scripts.
- `public/{underground,coordinates,masterplans,atlas,catalog,reports,release,data,screenshots,wave2}/` — committed report assets.
- `railway.json` — Railpack build + `npm start`, `/api/health` check, restart on failure (3 retries).
