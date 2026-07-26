# Vendored containment work from minebotai

**Status:** vendored verbatim, **NOT WIRED**
**Vendored:** 2026-07-25
**Source:** `minebotai@ceb0d069`, `apps/body/src/**` — a sibling fork of this
repository, now being retired.

## Why this is here

minebotai's `apps/body` and this repository are **sibling forks of the same
ancestor** (`mc-server-bot`, ~2026-05-24). They diverged in opposite directions:
this repo went toward features and accumulated ~102 further commits; minebotai went
toward containment.

The result is uncomfortable and is the reason for this directory: **the safer body is
the one being retired.** mc-fleet-bot still executes LLM-generated JavaScript in a
Node `vm`, and this repository's own `REPO_REVIEW.md` says plainly:

> "`vm` is not a sandbox."

minebotai replaced that path. Deleting minebotai without preserving the replacement
would destroy the only implementation of it that exists.

## What was copied

Seven files, 1,559 lines, byte-identical to source (verified by `cmp` at vendor
time).

| Path | Lines | What it does |
|---|---|---|
| `security/runtimeCode.ts` | 10 | Default-deny gate for runtime code execution |
| `actuation/catalog.ts` | 198 | Bounded primitive catalog with an unabortable-primitive filter |
| `actuation/executor.ts` | 265 | Fail-closed executor; JS skill execution disabled by return code, not by comment |
| `actuation/index.ts` | 2 | Barrel |
| `voyager/StaticAnalyzer.ts` | 505 | Babel-AST static analysis of generated code, 13 rules |
| `voyager/StaticAnalyzer.test.ts` | 249 | Its test suite |
| `voyager/IsolatedExecutor.ts` | 330 | V8-isolate executor (`isolated-vm`) running in a worker thread |

## What this is and is not

**It is** a preservation copy so the work survives minebotai's retirement. It closes
the loss risk, which was the reason it gated that retirement at all.

**It is not** integrated, imported, or executed. Nothing in `src/` references it.
Copying it changes no behaviour in this repository.

Integration is deliberately a separate, unfunded piece of work. A branch merge is not
viable — the shared files have diverged by 1,282, 1,918, and 5,529 diff lines — so it
would be file-by-file with fresh tests, and the sensible first slice is
`security/runtimeCode.ts` (10 lines, zero dependencies).

## Dependency warning before anyone wires this up

`IsolatedExecutor.ts` requires **`isolated-vm`**, which is a node-gyp C++ addon. Two
consequences:

- It needs a build toolchain (`python3`, `make`, `g++`) wherever `npm ci` runs, and it
  is ABI-locked to the Node major version.
- The host process **must** be launched with `--no-node-snapshot`. minebotai's body
  scripts carry that flag explicitly for this reason.

In the minebotai checkout it was present but **not compiled** — `binding.gyp` and a
tarball, no `out/` directory. Treat "it worked there" as unverified.

## Provenance

Full archive of the source repository, including the commits these files came from:

- Bundle: `/mnt/d/projects/_archive/minebotai-2026-07-25.bundle`
  (SHA-256 `36869d349981002ef80e9514326f5316b79decf72317ef3f204c3281ba76f2bb`)
- Runtime data: `/mnt/d/projects/_archive/minebotai-data-2026-07-25/`
- Ledger and rationale: `blackboxai/docs/review-2026/MINEBOTAI-HARVEST.md` (rows B1–B6)
- Security review of the original `vm` escape: minebotai
  `docs/review-2026/06-SECURITY-REVIEW.md` and `07-SECURITY-RETEST.md` (finding
  S6-CRIT-2), preserved in the bundle.

---

## BLOCKED EXTERNAL ACTION — unresolved credential obligation

Transplanted here because minebotai's `.env.example:12` was the **only written record
of it**, and retiring that repository would have erased the note while leaving the
exposure live. Verbatim:

> **BLOCKED EXTERNAL ACTION:** an operator must revoke the historical shared
> credential on the authentication service, provision unique per-bot deployment
> secrets, and record a secret-free attestation. Repo changes cannot rotate it.

This is load-bearing **in this repository**, not merely inherited. `config.yml` is
git-tracked here and contains:

- a real server host,
- a plaintext `loginPassword`,
- a `devSecret` whose own comment states the endpoint accepts it for any player name.

No change in this directory addresses any of that. It is recorded so the obligation
outlives the repository that documented it.
