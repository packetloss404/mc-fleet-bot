# Brief 7/6 — Rotate `GOOGLE_API_KEY` and `ANTHROPIC_API_KEY` (SEC-02)

> Source: `HANDOFF.md` §3 SEC-02.
> Severity: **High**. Both keys were readable by any escaped skill on an
> unhardened box for the life of the deployment. The handoff notes Gemini
> is at its monthly spend cap anyway, which makes rotation cheap to
> justify.
> Effort: **S** (operator-driven; no code change).
> Depends on: **SEC-01 #1 (DASHBOARD_AUTH_SECRET deploy runbook)** for the
> same `mc-fleet-bot.service.d/` drop-in pattern, and **SEC-01 #3 (remove
> `dotenv/config` from the worker)** for the assumption that workers read
> keys only via `workerData` once #3 lands.
> Repo edits: none. This is a runbook.

## Goal

Both `GOOGLE_API_KEY` and `ANTHROPIC_API_KEY` are issued fresh from their
respective vendor consoles, the bot host is updated to use the new values,
the old values are revoked at the vendor, and a verification step proves
the new values are in use and the old values are not. The handoff's
SEC-01 #3 work is the *next* layer of defence; SEC-02 is the urgent one
because the keys are already exposed.

## Background

- `src/ai/LLMSettings.ts:439` — `GOOGLE_API_KEY` is read from
  `process.env` and seeded into the providers list at startup.
- `src/ai/LLMSettings.ts:450` — same for `ANTHROPIC_API_KEY`.
- `src/ai/ProviderRegistry.ts:17, 31` — same two reads, in a second
  pass that constructs the actual `GeminiClient` / `AnthropicClient`.
  Both reads are at module load time, not on each call. **There is no
  hot-reload of these env vars.** A rotation requires a fleet restart.
- `src/worker/botWorker.ts:1` — `import 'dotenv/config'`. Per
  brief #3, this re-injects the keys into the worker's env at
  every spawn. SEC-02 rotation works *despite* this bug; the keys
  are rotated values, not stale ones, so the worker reads the
  fresh value. SEC-01 #3 removes the re-injection as a separate
  hardening layer.
- `HANDOFF.md` §3 SEC-02 is the source of the threat model.

## Files to touch

This brief is **host-side**. No source-tree changes.

- `/etc/systemd/system/mc-fleet-bot.service.d/20-llm-keys.conf` (new) —
  the drop-in that overrides the two env vars. If
  `10-ip-allowlist.conf` (brief #6) already exists, this lives
  alongside it. If the existing `auth.conf` (brief #1) sets these
  env vars too, prefer to consolidate: one drop-in per env-var
  *concern*, not one per file. Recommended layout:
  ```ini
  # /etc/systemd/system/mc-fleet-bot.service.d/20-llm-keys.conf
  [Service]
  Environment=GOOGLE_API_KEY=__new_google_key__
  Environment=ANTHROPIC_API_KEY=__new_anthropic_key__
  ```
- `.env` on the bot host — the file the main process loads via
  `dotenv`. After the drop-in is in place, `.env` is no longer the
  source of truth for these two vars; remove the lines from `.env`
  to avoid a "which one wins" situation (the systemd unit wins
  because it sets the env *after* the process reads `.env`, so
  removing the `.env` lines is a belt-and-braces cleanup, not a
  correctness fix).
- `scripts/rotate_llm_keys.sh` (new, in the repo) — a runbook script
  that:
  1. Reads the current values from the live process
     (`cat /proc/$(systemctl show -p MainPID mc-fleet-bot | cut -d= -f2)/environ | tr '\0' '\n' | grep -E 'GOOGLE_API_KEY|ANTHROPIC_API_KEY'`)
     and prints them masked (last 4 chars only).
  2. Confirms the operator wants to rotate.
  3. Writes the drop-in (with the new values, supplied via
     `--google-key` / `--anthropic-key` CLI flags so the secrets
     don't end up in shell history).
  4. `sudo systemctl daemon-reload && sudo systemctl restart
     mc-fleet-bot`.
  5. After the restart, reads the values back from the live
     process and confirms they changed.
- `docs/ops/key-rotation.md` (new, in the repo) — a short reference
  for the operator: which keys, where they live, how to verify
  rotation, and what to do if a key is compromised but the host
  is not yet hardened.

## Approach

1. **Issue the new keys.** Do this *first*, before touching the host,
   so the new values are ready to paste into the drop-in.
   - **Google AI Studio** (`https://aistudio.google.com/apikey`) —
     create a new API key, optionally restrict it to the
     Generative Language API. Note: this is *not* the same as a
     Google Cloud project key.
   - **Anthropic Console** (`https://console.anthropic.com/settings/keys`) —
     create a new key. Anthropic keys cannot be restricted by IP
     at issuance time; rely on the vendor's session-isolation
     features instead.
2. **Update the drop-in.** Edit
   `/etc/systemd/system/mc-fleet-bot.service.d/20-llm-keys.conf`
   with the new values. Do not commit this file. Do not echo
   the values to a terminal. The recommended way to write it is:
   ```bash
   sudo tee /etc/systemd/system/mc-fleet-bot.service.d/20-llm-keys.conf > /dev/null <<'EOF'
   [Service]
   Environment=GOOGLE_API_KEY=__paste_here__
   Environment=ANTHROPIC_API_KEY=__paste_here__
   EOF
   sudo chmod 0600 /etc/systemd/system/mc-fleet-bot.service.d/20-llm-keys.conf
   ```
3. **Restart the fleet.** `sudo systemctl daemon-reload &&
   sudo systemctl restart mc-fleet-bot`. Be aware of the
   `AGENTS.md` warning: a clean exit does not respawn, so confirm
   `Restart=on-failure` (or equivalent) before restarting. The
   handoff calls this out explicitly. Allow ~3 minutes for the
   API to bind (HANDOFF §4 trap #0).
4. **Verify the new keys are in use.** From the bot host:
   ```bash
   PID=$(systemctl show -p MainPID mc-fleet-bot | cut -d= -f2)
   sudo cat /proc/$PID/environ | tr '\0' '\n' | grep -E 'GOOGLE_API_KEY|ANTHROPIC_API_KEY' | sed -E 's/=(.{4})$/=…\1/'
   ```
   The last 4 characters of each value must match the new keys.
5. **Revoke the old keys.** Only after step 4 succeeds. Doing
   this in the wrong order leaves the fleet calling a revoked
   key for ~3 minutes.
6. **Verify the old keys are no longer in use.** Hit each
   vendor's "test key" endpoint with the old key (or
   `curl https://generativelanguage.googleapis.com/v1/models?key=$OLD_GOOGLE_KEY`).
   A 400/403 means the key is dead or restricted; a 200 means
   the key is still alive and you forgot to revoke it.
7. **Update `.env` on the host.** Remove the two lines, so the
   `dotenv` read on next process boot cannot resurrect the old
   values. This is a belt-and-braces step; the systemd unit
   wins regardless. But it prevents a future bug where someone
   removes the drop-in and re-enables the leak.

## Tests

- `test/scripts/rotate_llm_keys.test.ts` (or a shell exit-code
  contract)
  - The script must refuse to run if the operator's UID is not
    `0` (or `sudo`-able without password prompt).
  - The script must accept the new keys via CLI flags, not
    positional args or stdin, so the values never land in
    `~/.bash_history`.
  - The script must print a masked confirmation after writing
    the drop-in, so the operator can verify the right value
    landed.
  - The script must exit non-zero on `systemctl restart`
    failure, with a clear message about reverting the
    drop-in.
- Static check: a vitest test that grep's the repo for
  hardcoded `AIza` (Google key prefix) or `sk-ant-` (Anthropic
  prefix) literals and fails the build if any are found. This
  catches the "I committed the key by accident" failure mode.
  ```ts
  it('does not commit any LLM API key literals', () => {
    const out = execSync('git grep -nE "AIza[0-9A-Za-z_-]{35}|sk-ant-[0-9A-Za-z_-]{20,}"', { encoding: 'utf8' });
    expect(out.trim()).toBe('');
  });
  ```
- Live verification (operator runs, not CI): after rotation,
  `GET /api/llm/usage` on the bot host must show non-zero
  request counts under the new key's account on the vendor
  console. If the vendor console shows the old key still being
  hit, something is wrong (likely the `.env` file, or a stale
  process holding the old env).

## Definition of done

- [ ] New `GOOGLE_API_KEY` issued from Google AI Studio.
- [ ] New `ANTHROPIC_API_KEY` issued from Anthropic Console.
- [ ] `20-llm-keys.conf` drop-in on the bot host contains the
      new values. `chmod 0600`.
- [ ] `sudo systemctl restart mc-fleet-bot` brings the fleet
      back to "5 bots online" within ~3 minutes.
- [ ] `/proc/$MAINPID/environ` shows the new values (masked).
- [ ] Old keys revoked at the vendor.
- [ ] Vendor "test key" endpoints return 400/403 for the old
      keys.
- [ ] `.env` on the host no longer contains the two vars.
- [ ] `scripts/rotate_llm_keys.sh` exists in the repo.
- [ ] `docs/ops/key-rotation.md` exists in the repo.
- [ ] `npm test --prefix . -- test/scripts/rotate_llm_keys.test.ts`
      passes.
- [ ] No new LLM API key literals in the repo (`git grep` is
      empty for the prefixes above).

## Traps to avoid

- **Revoke the old keys *after* verifying the new ones are in
  use, never before.** A 3-minute restart window is fine; a
  fleet that cannot call any LLM is not.
- **There is no hot-reload.** A rotation requires a fleet
  restart. If the operator is mid-session and the fleet is
  doing real work, the restart will pause the bots. The handoff
  notes the auto-disable ladder (HANDOFF §3, watch list) will
  trip after 3 failed calls. A clean rotation should be 0
  failed calls, but a 3-minute outage on a live system is
  real. Schedule rotations when the fleet is idle.
- **`ANTHROPIC_API_KEY` cannot be restricted by IP at the
  vendor.** Do not pretend otherwise. The defence-in-depth is
  brief #6 (IPAddressDeny) on the host, not vendor-side
  restrictions.
- **The worker reads `.env` on every spawn (brief #3).** The
  rotation still works — `.env` on the host is updated as part
  of step 7, and the systemd unit overrides `.env` regardless.
  But until brief #3 lands, the worker is reading both `.env`
  and the systemd env; the *first* one wins, and the systemd
  unit is set *before* the worker spawns, so the systemd
  values win. Confirm this with `cat
  /proc/$WORKER_PID/environ` if unsure.
- **`scripts/rotate_llm_keys.sh` must not echo the keys to
  stdout.** The masked confirmation is fine; the full values
  must never appear in the script's output, logs, or
  `~/.bash_history`.
- **Do not commit the drop-in file.** It is host-side, in
  `/etc/systemd/system/...`, which is outside the repo. The
  repo gets the *script* and the *runbook*, not the *values*.
- **Gemini is at its monthly spend cap.** A successful
  rotation does not change this — the new key shares the
  vendor account, and the cap is account-level. If the
  operator's plan is to *reduce* spend, rotation alone is not
  enough; the handoff's OPS-01 notes the auto-disable ladder
  will trip immediately under those conditions. That is
  correct behaviour, not a bug.
- **`HANDOFF.md` §4 trap #0b warns about thresholds-as-gates.**
  A "rotation interval" is not a security gate. Do not
  auto-revoke-and-reissue on a schedule. Rotate on
  *compromise* or *scheduled cadence agreed with the vendor*,
  not on a timer driven by a build flag.

## References

- `HANDOFF.md` §3 SEC-02
- `src/ai/LLMSettings.ts:439, 450` (env reads at module load)
- `src/ai/ProviderRegistry.ts:17, 31` (client construction)
- `HANDOFF.md` §3 watch list (auto-disable ladder; relevant
  for the "rotation during a live session" timing)
- `HANDOFF.md` §4 trap #0b (threshold-as-gate anti-pattern)
- `HANDOFF.md` §3 SEC-01 #3 (the `dotenv` re-injection that
  this brief works around)
- `AGENTS.md` (restart semantics; `Restart=on-failure`)
