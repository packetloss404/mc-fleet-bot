# AGENTS.md

Guidance for coding agents working in `world-showcase/`, the IANLAN
NextGen report library (deployed to Railway). Run every command below
from this directory, never from the repository root — this is a
standalone Next.js 15 app and the root Node build does not cover it.

## Purpose

A private, authenticated report library for master plans, project
records, investigations, and verified delivery evidence. Four reports
ship today: Master Plan, Underground Navigation, Masterplan Program
(Report 03), and POI Coordinate Directory (Report 04). It is the human
surface for the report library; the generators live in `scripts/`
under the repo root and in `scripts/` here.

## Boundary with the rest of the repo

- Reads synced report assets from `public/` (e.g. `public/underground/`,
  `public/coordinates/`, `public/masterplans/`). These are populated
  by the two `npm run sync:*` scripts and are committed.
- Has no dependency on `src/`, `tools/fleet-devtools/`, or
  `world-builder/`. The site is a static-friendly Next.js app that
  renders committed artifacts; nothing reaches the live world or the
  database.

## Commands

```bash
npm install                                 # its own lockfile; the root install does not reach here
npm run build                               # `next build` (7 routes)
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

CI is on Railway (Railpack) and unaffected; the issue is local Windows
developer ergonomics only. `rm -rf node_modules && npm install` fixes
it for some platforms; the `node node_modules/.../next build` form is
the reliable workaround.

## Auth

`lib/siteAuth.ts` and `middleware.ts` together gate every non-public
route. The site uses an application-level ten-digit PIN gate:

- `SITE_PASSCODE` (exactly ten digits) — required, used by
  `POST /api/auth` to mint a session cookie.
- `SITE_SESSION_SECRET` (32+ characters) — required, used to HMAC-sign
  the session cookie in both `lib/siteAuth.ts` (Node `crypto`) and
  `middleware.ts` (Web Crypto). Both produce the same base64url HMAC
  and are kept in sync; do not let them drift.

Both are read from `process.env`; both must be set in Railway's
production runtime variables. They are **never** committed. A copyable
list lives at the bottom of the root `.env.example`.

## Tests

There is no test suite in this directory. The site renders committed
artifacts and has thin code; the meaningful correctness checks live
in the upstream generators (`scripts/generate_*` and the `finalize_*`
finalizers in the repo root). Do not add a test framework as part of
a "while I'm here" pass — discuss with the owner first.

## Boundaries to keep

- Do not import from `src/`, `world-builder/`, or `tools/fleet-devtools/`.
  The site is standalone.
- Do not commit `SITE_PASSCODE` or `SITE_SESSION_SECRET`.
- Do not run `npm run lint` non-interactively until ESLint is configured.
- Do not deploy from a workstation — Railway picks up the GitHub
  push and rebuilds. The deployment is out of scope for routine
  changes.

## File map

- `app/layout.tsx`, `app/page.tsx` — root layout and authenticated
  reports home.
- `app/reports/{master-plan,underground-navigation,masterplan-program,poi-coordinate-directory}/page.tsx` — the four reports.
- `app/api/auth/route.ts`, `app/api/health/route.ts` — auth and health endpoints.
- `components/PasscodeGate.tsx` — the PIN entry gate UI.
- `components/{AtlasExplorer,CoordinateDirectory,MasterplanProgram}.tsx` — the three report-specific components.
- `lib/siteAuth.ts` — Node-crypto session sign/verify.
- `lib/reports.ts` — the report library manifest (one entry per report).
- `lib/masterplans.ts` — transcribed plan figures for Report 03 (regenerate when plans change).
- `middleware.ts` — Web-crypto session verification on every request.
- `scripts/sync_underground_report.mjs`, `scripts/sync_coordinate_directory.mjs` — the two sync scripts.
- `public/{underground,coordinates,masterplans,atlas,catalog,reports,release,data,screenshots,wave2}/` — committed report assets.
- `railway.json` — Railpack build + `npm start`, `/api/health` check, restart on failure (3 retries).
