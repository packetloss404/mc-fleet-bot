# Brief 1/6 — `DASHBOARD_AUTH_SECRET` and `PLUGIN_AUTH_TOKEN` deploy runbook

> Source: `HANDOFF.md` §3 SEC-01, item 1.
> Severity: **High**. The fleet's control plane is currently wide-open on any
> non-loopback bind. This is the single highest-leverage fix in the SEC-01 set.
> Effort: **S** (config + a verification script, no code).
> Depends on: none.
> Repo edits: minimal. Most of this work is on the bot host, not in `src/`.

## Goal

When the API is bound to a non-loopback address, every `/api/*` route that can
mutate fleet state must require a valid `DASHBOARD_AUTH_SECRET` credential,
and `/api/events/*` must require a valid `PLUGIN_AUTH_TOKEN`. The
`scripts/verify_admin_auth.sh` script must show "all gated routes reject
unauthenticated" with both env vars set, and "loopback bind is unaffected"
without them.

## Background (read these before touching anything)

- `src/server/auth.ts` — `requireDashboardAuth` (line 163) is a no-op when
  `DASHBOARD_AUTH_SECRET` is unset. Same shape in `requirePluginAuth` (line
  191). When set, both correctly return 401.
- `src/index.ts:77-87` — emits a `SECURITY:` warning at boot when the env vars
  are absent AND the API is bound to a non-loopback address. That warning
  fires today on the bot host (per `HANDOFF.md` §3 item 1).
- `src/config.ts:139-155` — the doc comment confirms the same convention.
- `test/server/auth.dashboardSecret.test.ts` — existing test already pins the
  behaviour for the dashboard-secret login path. Re-use its style.
- `HANDOFF.md` §1 — bot host is `10.80.13.18`; API binds on `config.api.host`
  (default 0.0.0.0). The handoff was explicit that
  `GET /api/bots` and `GET /api/admin/info` return **200 unauthenticated**
  on the running host.

## Files to touch

- `config.yml` (repo) — add commented-out lines documenting the env vars.
  Do not change the runtime config. The user's `config.yml` is the source
  of truth on the host; the repo version is the template.
- `scripts/verify_admin_auth.sh` (new) — a small bash script that:
  1. Reads the env vars from the host's `mc-fleet-bot.service` unit
     (`systemctl show mc-fleet-bot -p Environment` or read the
     `/etc/systemd/system/mc-fleet-bot.service.d/*.conf` drop-ins).
  2. Hits `http://127.0.0.1:3001/api/bots` and `http://127.0.0.1:3001/api/admin/info`
     unauthenticated and asserts 401.
  3. Repeats with the dashboard secret in the `Authorization: Bearer` header
     and asserts 200.
  4. Hits `/api/events/chat` without the plugin token and asserts 401/400.
  5. With the loopback bind path (set `api.host: 127.0.0.1` in a one-off
     override, or just check the production bind), confirms that the absence
     of the env vars keeps loopback open.
- `docs/tasks/sec01/` (this folder) — the brief itself. No code.

## Approach

1. **Pick the secrets.** On the bot host, generate two values:
   ```bash
   openssl rand -hex 32   # DASHBOARD_AUTH_SECRET
   openssl rand -hex 32   # PLUGIN_AUTH_TOKEN
   ```
   Store them in `/etc/systemd/system/mc-fleet-bot.service.d/auth.conf`
   (a systemd drop-in) with `Environment=...` lines. Do not commit them.
2. **Reload + restart.** `sudo systemctl daemon-reload &&
   sudo systemctl restart mc-fleet-bot`. Be aware of the `AGENTS.md` warning:
   a clean exit does not respawn, so confirm the unit has
   `Restart=on-failure` (or the equivalent). The handoff calls this out
   explicitly.
3. **Verify with the script.** Run `scripts/verify_admin_auth.sh`. It must
   report all-gated-routes-reject.
4. **Update the dashboard login.** If the dashboard at port 3000 reads the
   secret from a different place (e.g. `web/.env.local`), update that
   separately. The bot API is the side that gates; the dashboard is a
   client.

## Tests

There is no test for "env vars actually do anything" in the repo beyond
`test/server/auth.dashboardSecret.test.ts`. Add:

- `test/server/auth.envGating.test.ts` — boots an `express()` app, mounts
  `requireDashboardAuth` and `requirePluginAuth` per the production wiring,
  and asserts:
  - With `DASHBOARD_AUTH_SECRET` set, `GET /api/bots` (a representative
    non-exempt route) returns 401 without a token and 200 with a matching
    `Authorization: Bearer <secret>`.
  - With `DASHBOARD_AUTH_SECRET` set, `GET /api/auth/login` (an exempt route)
    returns 200 either way.
  - With `DASHBOARD_AUTH_SECRET` unset, `GET /api/bots` returns 200
    regardless of header.
  - Same matrix for `PLUGIN_AUTH_TOKEN` against `/api/events/chat`.
  - Pattern after `test/server/auth.dashboardSecret.test.ts` (hand-rolled
    `http.request`, no supertest).

## Definition of done

- [ ] `/etc/systemd/system/mc-fleet-bot.service.d/auth.conf` exists on the
      bot host with both env vars set.
- [ ] `sudo systemctl restart mc-fleet-bot` brings the fleet back to
      "5 bots online" within ~3 minutes (HANDOFF §4 trap #0).
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/bots`
      returns `401` (unauthenticated, with secrets set).
- [ ] `curl -s -H "Authorization: Bearer $DASHBOARD_AUTH_SECRET" http://127.0.0.1:3001/api/bots`
      returns `200`.
- [ ] `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3001/api/events/chat`
      returns `401`.
- [ ] `npm test --prefix . -- test/server/auth.envGating.test.ts` passes.
- [ ] `scripts/verify_admin_auth.sh` exists and exits 0 on a healthy host.
- [ ] No `src/` change reintroduces a route past the auth middleware. If
      you add a new route, mount it through `app.use('/api', requireDashboardAuth)`
      (already in place at `src/server/api.ts:179`).

## Traps to avoid

- **The handoff's "looks like 5 bots online" check requires a 3-minute wait.**
  `AGENTS.md` and HANDOFF §4 trap #0: the API binds after `loadSavedBots()`
  completes. Do not assume the fleet is broken; check the log for
  `bot connecting` lines.
- **Do not commit the secrets.** They go on the host only. The drop-in file
  must be in `.gitignore` or kept off-repo.
- **The `index.ts:77-87` warning is a signal, not a fix.** The fix is the
  drop-in; do not silence the warning unless the deployment will never bind
  non-loopback.
- **`POST /api/admin/restart` exits 0** (HANDOFF §3 OPS-01, `AGENTS.md`).
  Use `sudo systemctl restart` instead, or the fleet will go down.

## References

- `HANDOFF.md` §3 SEC-01 item 1
- `src/server/auth.ts:163-185` (`requireDashboardAuth`)
- `src/server/auth.ts:191-208` (`requirePluginAuth`)
- `src/index.ts:67-87` (boot warning)
- `test/server/auth.dashboardSecret.test.ts` (test pattern)
- `docs/research/worker-process-isolation.md` §3 (parent-side check passes
  cleanly; only the child-side check reveals the AmbientCapabilities trap
  that motivated the wider SEC-01 work)
