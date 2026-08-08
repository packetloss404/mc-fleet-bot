# `start.sh` heap footgun fix

> Source: `HANDOFF.md` §7 (sizing recommendation, end of section) and §4
> trap #12 (the related `mc_admin.py` permission-denied footgun).
> Severity: **Medium**. Dormant today — systemd runs the MC server via
> `/etc/systemd/system/packetcraft-paper.service`, which already has the
> correct `-Xms4G -Xmx6G`. The `start.sh` file is a misleading source of
> truth: it still claims the heap is `-Xms1G -Xmx2G`, which is exactly how
> the handoff came to claim the resize was outstanding when it had
> already shipped.
> Effort: **S** (one file edit, one verification snippet, both need
> root on the MC server).
> Repo edits: none in `src/`. The file is on the MC server at
> `/opt/packetcraft/paper-server/start.sh`.

## Goal

`start.sh` on the MC server reads `-Xms4G -Xmx6G`, matching the live
`packetcraft-paper.service`. Anyone who runs `start.sh` by hand during
debugging gets a 6 GB server, not a 2 GB one. Anyone who reads the
file to answer "what heap are we running?" gets the right answer.

## Background

- The MC server runs as `paper-server` under
  `/etc/systemd/system/packetcraft-paper.service` with
  `ExecStart=/usr/bin/java -Xms4G -Xmx6G -jar paper.jar --nogui`
  (HANDOFF §7). The service has `Restart=always` and a
  `TimeoutStopSec=180`, so a clean exit *does* respawn here (unlike
  the bot host's services).
- `start.sh` is dormant — systemd does not use it. But it lives next
  to the world files, and it is what an operator reads when they
  want to know the heap. A wrong value here is a documentation bug
  that becomes a runtime bug the moment someone runs the file by
  hand.
- HANDOFF §4 trap #12 documents a related footgun in `mc_admin.py`
  (the SSH user is `ianwalmsley`, not root, so file writes fail
  silently). The fix for *this* footgun needs root because the file
  is root-owned.

## Files to touch

- `/opt/packetcraft/paper-server/start.sh` (host-side, on the MC
  server) — change `-Xms1G -Xmx2G` to `-Xms4G -Xmx6G`. Preserve
  every other flag.
- `scripts/verify_startsh_heap.sh` (new, in the repo) — a verification
  script the operator runs after the edit. It reads the file via SSH
  and asserts the heap values match the systemd unit's.
- `docs/ops/host-heap-sources.md` (new, in the repo) — a one-page
  reference: the heap lives in the systemd unit, `start.sh` is
  dormant, both should agree, and the canonical answer to "what
  heap is the MC server running?" is `systemctl show
  packetcraft-paper -p ExecStart`.

## Approach

1. **Verify the systemd unit first.** From any host with SSH access
   to the MC server:
   ```bash
   ssh 10.80.13.14 'sudo systemctl show packetcraft-paper -p ExecStart'
   ```
   Confirm it reads `-Xms4G -Xmx6G`. If it does not, fix the systemd
   unit, not `start.sh`. `start.sh` should always match the unit, not
   the other way round.
2. **Edit `start.sh`.** On the MC server, with `sudo`:
   ```bash
   sudo sed -i 's/-Xms1G -Xmx2G/-Xms4G -Xmx6G/' /opt/packetcraft/paper-server/start.sh
   ```
   Or, more conservatively, read the file first and confirm the
   line to change is exactly the heap line and not a comment or an
   unrelated flag. The handoff warns that substring filters
   silently eat structure (HANDOFF §4 trap #11). Here the change is
   a single sed, but the principle applies: read before sed.
3. **Verify.** Run `scripts/verify_startsh_heap.sh`. It must:
   - `cat` the file via SSH and grep for `-Xms4G -Xmx6G`.
   - `systemctl show packetcraft-paper -p ExecStart` and assert the
     same values.
   - Both match → exit 0. Otherwise exit non-zero with a clear
     message about which source is out of sync.
4. **Document.** `docs/ops/host-heap-sources.md` lists the three
   places heap values appear and which is canonical:
   - **Canonical:** `systemctl show packetcraft-paper -p ExecStart`
   - **Must match canonical:** `start.sh` (dormant, but read by humans)
   - **Historical, may be stale:** any docs that pre-date the
     resize. Update them when found.

## Tests

- `test/scripts/verify_startsh_heap.test.ts` (or a shell exit-code
  contract)
  - The script must refuse to run if it cannot SSH to the MC server
    (it should fail fast with a clear message, not hang on a password
    prompt).
  - The script must exit 0 when the systemd unit and `start.sh`
    both contain `-Xms4G -Xmx6G`.
  - The script must exit non-zero with a clear diff when the two
    sources disagree.
- Static check: a vitest test that grep's the repo for stale
  `-Xmx2G` references in markdown and exits non-zero if any are
  found in non-historical docs. This catches the "I documented the
  fix but forgot to update the older reference" failure mode.
  ```ts
  it('does not reference the old -Xmx2G heap in non-historical docs', () => {
    const out = execSync(
      'git grep -nE "Xmx2G|Xms1G" -- "docs/" ":!docs/audits/*" ":!docs/research/*"',
      { encoding: 'utf8' },
    );
    expect(out.trim()).toBe('');
  });
  ```

## Definition of done

- [ ] `start.sh` on the MC server reads `-Xms4G -Xmx6G`.
- [ ] `systemctl show packetcraft-paper -p ExecStart` reads
      `-Xms4G -Xmx6G`.
- [ ] `scripts/verify_startsh_heap.sh` exists in the repo and exits
      0 on a healthy host.
- [ ] `docs/ops/host-heap-sources.md` exists in the repo.
- [ ] `npm test --prefix . -- test/scripts/verify_startsh_heap.test.ts`
      passes.
- [ ] No new `-Xmx2G` references in non-historical docs.

## Traps to avoid

- **The handoff warns that `mc_admin.py` cannot write files on the
  MC server** (HANDOFF §4 trap #12) — the SSH user is `ianwalmsley`
  (uid 1000), not root, and the tool never escalates. **Do not try
  to drive this fix through `mc_admin.py`.** Use a direct `ssh` +
  `sudo`, or run the sed on the MC server's console.
- **Substring filters silently eat structure** (HANDOFF §4 trap
  #11). The sed above is targeted, but if you extend this fix to
  other flags, read the file first.
- **HANDOFF §4 trap #0 says the bot API takes ~3 minutes to bind
  after a restart.** The MC server has its own restart semantics:
  `packetcraft-paper.service` has `Restart=always` and
  `TimeoutStopSec=180`, so a clean exit *does* respawn. But this
  brief does not require restarting the MC server. The fix is to
  `start.sh`, which is dormant. No restart needed.
- **`start.sh` may not exist.** If the file is missing, the right
  action is to *create* it from a known-good template (copy from
  the systemd unit's `ExecStart` line and add a `cd` to the server
  directory) — not to skip the fix. The handoff's claim that the
  file is dormant presupposes it exists.
- **Do not "fix" the systemd unit if it disagrees with `start.sh`.**
  The systemd unit is canonical. `start.sh` matches the unit, not
  the other way round.
- **The handoff warns that `gamerule` is broken over RCON on this
  box** (HANDOFF §4 trap #6). This fix is a `start.sh` edit, not an
  RCON command. Do not try to drive it through RCON.

## References

- `HANDOFF.md` §7 (the sizing section; the heap values come from
  the systemd unit, not the start script)
- `HANDOFF.md` §4 trap #12 (the `mc_admin.py` permission-denied
  footgun — adjacent, do not bundle)
- `HANDOFF.md` §4 trap #11 (substring filters silently eat
  structure)
- `HANDOFF.md` §4 trap #0 (the ~3 minute API bind delay — not
  relevant here, but worth knowing)
- `/etc/systemd/system/packetcraft-paper.service` on the MC server
  (the canonical source of the heap values)
- `HANDOFF.md` §4 trap #6 (RCON `gamerule` workaround — adjacent
  anti-pattern to avoid)
