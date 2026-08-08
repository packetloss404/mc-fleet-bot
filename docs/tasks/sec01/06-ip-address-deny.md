# Brief 6/6 — `IPAddressDeny=any` + two-entry allowlist on the bot host

> Source: `HANDOFF.md` §3 SEC-01, item 6.
> Severity: **Medium-High**. A unit-file property that works under every
> option including today's threads; closes inbound traffic to the
> bot-host API except for the operator's workstation and the dashboard
> container.
> Effort: **S** (a single drop-in file on the bot host, a verification
> script, and a short README update).
> Depends on: none.
> Repo edits: none in `src/`. The unit file lives on the host.

## Goal

The bot host's API and dashboard ports accept inbound TCP only from
two allowlisted sources: the operator's workstation (e.g. the
`packetloss404` host) and the dashboard container (if it is on a
distinct IP). All other inbound IPv4 and IPv6 traffic is denied at
the systemd level, before the Node process ever sees it. The
verification script proves the deny rule is in effect and the two
allowlisted sources can still connect.

## Background

- The bot host is `10.80.13.18` (`pdian02mc03`) per HANDOFF §1.
- The API binds on `config.api.host` (default `0.0.0.0`); the
  dashboard binds on port 3000. Both are reachable on the LAN today.
- `IPAddressDeny=` and `IPAddressAllow=` are systemd unit properties
  (since systemd 240+). They work on any unit type — including
  services that spawn worker threads, services that will later be
  split into template units, and services running as threads inside
  the main process. They do not depend on user namespacing or
  capability drops.
- HANDOFF §3 SEC-01 item 6 says: "a unit-file property that works
  under every option including today's threads." That is the reason
  this brief ships regardless of the worker-isolation decision.

## Files to touch

This brief is **host-side**. There are no source-tree changes.

- `/etc/systemd/system/mc-fleet-bot.service.d/10-ip-allowlist.conf`
  (new) — the drop-in that adds `IPAddressDeny=any` plus two
  `IPAddressAllow=` entries.
- `/etc/systemd/system/mc-fleet-web.service.d/10-ip-allowlist.conf`
  (new) — same shape for the dashboard unit, if the dashboard is
  also on the bot host (HANDOFF §1 confirms it is).
- `scripts/verify_ip_allowlist.sh` (new, in the repo) — the
  verification script.
- `docs/ops/host-security.md` (new, in the repo) — a short
  reference for the host-side drop-ins and how to update the
  allowlist when the operator moves networks.

## Approach

1. **Pick the allowlist.** Two sources:
   - **Operator workstation.** The operator's current IP. This
     changes when the operator's laptop moves networks; document
     how to update the drop-in without restarting the wrong way.
     The host the operator usually uses can be obtained from
     `last -i` or from the existing `mc_admin.py` SSH source
     history. If the operator's IP is dynamic, use a CIDR
     (`10.0.0.0/8`) and accept the broader blast radius as a
     tradeoff for not having to update on every connection.
   - **Dashboard container or co-resident dashboard.** If the
     dashboard is on the same host and binds to loopback, no
     allowlist entry is needed (loopback is allowed by default
     in systemd's `IPAddressAllow=localhost` semantics — confirm
     this against the local systemd version). If the dashboard is
     on a separate host, add its IP.
2. **Write the drop-in.** On the bot host:
   ```ini
   # /etc/systemd/system/mc-fleet-bot.service.d/10-ip-allowlist.conf
   [Service]
   IPAddressDeny=any
   IPAddressAllow=10.x.y.z/32      # operator workstation
   IPAddressAllow=10.a.b.c/32      # dashboard host (if separate)
   IPAddressAllow=localhost
   ```
   The same shape for the web service. `IPAddressDeny=any` is
   the strongest form: it denies all IPv4 and IPv6 traffic, then
   each `IPAddressAllow=` re-permits a single source.
3. **Reload and verify.** `sudo systemctl daemon-reload &&
   sudo systemctl restart mc-fleet-bot` (note the AGENTS.md
   warning: a clean exit does not respawn, so confirm
   `Restart=on-failure` is set). Then run
   `scripts/verify_ip_allowlist.sh`. The script must show:
   - `IPAddressDeny=any` is present in the unit's effective config.
   - From the operator's IP: `GET /api/health` returns 200.
   - From a non-allowlisted source (use `nmap` or a `curl` from
     a different host on the LAN): the port is closed or the
     connection is refused at the kernel level (i.e. *not* a
     Node-level refusal, which would mean the rule did not fire).
4. **Document the dynamic-IP case.** `docs/ops/host-security.md`
   must say: "if the operator moves networks, edit the drop-in
   and `sudo systemctl daemon-reload && sudo systemctl restart
   mc-fleet-bot`. The restart takes ~3 minutes (HANDOFF §4 trap
   #0)."

## Tests

There is no automated test that runs against the live host. The
verification script is the test.

- `test/scripts/verify_ip_allowlist.test.ts` (or a shell exit-code
  contract)
  - The script must exit 0 when:
    - `IPAddressDeny=any` is in the effective unit config
      (`systemctl show mc-fleet-bot -p IPAddressDeny`).
    - The allowlist contains the operator's current IP.
    - A `curl` from the operator's host returns 200.
  - The script must exit non-zero with a clear message when any
    of the above is missing.
  - The script must NOT require root to run; the
    `systemctl show` call is read-only.

## Definition of done

- [ ] The drop-in file exists on the bot host for both
      `mc-fleet-bot.service` and `mc-fleet-web.service`.
- [ ] `sudo systemctl daemon-reload && sudo systemctl restart
      mc-fleet-bot` brings the fleet back to "5 bots online"
      within ~3 minutes.
- [ ] `systemctl show mc-fleet-bot -p IPAddressDeny` shows
      `IPAddressDeny=any`.
- [ ] `systemctl show mc-fleet-bot -p IPAddressAllow` shows the
      two allowlisted sources.
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://10.80.13.18:3001/api/health`
      from the operator's host returns 200.
- [ ] The same `curl` from a non-allowlisted host returns
      connection refused (kernel-level).
- [ ] `scripts/verify_ip_allowlist.sh` exists in the repo and
      exits 0 on a healthy host.
- [ ] `docs/ops/host-security.md` documents the drop-in, the
      update procedure, and the dynamic-IP caveat.

## Traps to avoid

- **`IPAddressDeny=any` denies *inbound* traffic on the host's
  network interfaces. It does not deny *outbound* traffic and
  does not affect the existing API bindings.** The bot can still
  reach the Minecraft server at `10.80.13.14:25565`; the rule
  only blocks inbound.
- **`IPAddressAllow=` and `IPAddressDeny=` are *evaluated in
  order*, and the last matching rule wins. The pattern
  `IPAddressDeny=any` + `IPAddressAllow=<specific>` is the
  documented idiom.** Do not write them in the opposite order;
  the deny must come first to be the default.
- **systemd version matters.** `IPAddressDeny`/`IPAddressAllow`
  were added in systemd 240. Check the bot host's version
  (`systemctl --version`) before relying on them. If older,
  fall back to `nftables`/`iptables` rules, but that is a
  separate brief and out of scope here.
- **The handoff warns that `POST /api/admin/restart` exits 0**
  (HANDOFF §3 OPS-01, `AGENTS.md`). Restarting the fleet from
  inside the API is exactly the wrong way. Use
  `sudo systemctl restart`.
- **Do not lock yourself out.** Verify the operator's IP
  *before* reloading systemd. If unsure, allow the operator's
  current SSH source as the first allowlist entry, then test
  from a second source, then tighten.
- **Loopback is not implicit.** `IPAddressDeny=any` does not
  exempt `127.0.0.1`. If the dashboard or any other co-resident
  process needs loopback, add `IPAddressAllow=localhost` (or
  the explicit `127.0.0.0/8`) to the drop-in.

## References

- `HANDOFF.md` §3 SEC-01 item 6
- `HANDOFF.md` §1 (host topology)
- `AGENTS.md` (do not start a second instance; restart via
  systemd; Restart=on-failure caveat)
- `systemd.exec(5)` — `IPAddressDeny=`, `IPAddressAllow=`
- `systemd.service(5)` — drop-in directory layout
