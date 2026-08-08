# Whole-build live decision — 2026-08-08

## Decision

The Combined Zones build is materially present in the live Paper world. The
stale historical operation files are not executable release sources: their
source guards describe cells that have already been built. A current-state
safe supplemental package was compiled and executed instead.

The live supplemental release is accepted as executed and verified:

- 7,328 cells changed;
- 7,328/7,328 strict-noop guards passed;
- 0 no-ops and 0 failures;
- rollback post-state preflight: 7,328/7,328 PASS;
- post snapshot SHA-256:
  `6b7cc2a36111757c4b2a5f020a0d22050e06ed2d4659c16e7f25473c274e831f`.

## Live scope census

| Scope | Target cells | Current target state |
| --- | ---: | ---: |
| R01 road/discovery | 2,397 | 2,397/2,397 |
| R02 mechanisms | 8,397 | 8,397/8,397 |
| R02 reservations | 8,983 | 8,981/8,983; 2 reviewed deepslate divergences |
| R03 tunnels | 7,345 | 7,345/7,345 |
| R05 mountain bulk | 14,498,915 | 14,498,899/14,498,915 |
| R05 mountain finish | 185,909 | 185,909/185,909 |
| R06 support/liner | 1,530 | 1,530/1,530 |

The remaining 16 R05 cells are a live lava pocket at the coordinates recorded
in `data/world-review/r05-mountain-bulk-supplement-2026-08-08.json`. They were
left untouched by policy. They are not authorized for blind stone placement.

## Evidence

- Safe supplement: `data/buildops/combined-zones-r05-mountain-bulk-supplement-2026-08-08.forward.txt`
- Exact inverse: `data/buildops/combined-zones-r05-mountain-bulk-supplement-2026-08-08.rollback.txt`
- Execution: `data/world-review/r05-mountain-bulk-supplement-execution-2026-08-08.json`
- Post rollback preflight: `data/world-review/r05-mountain-bulk-supplement-rollback-post-preflight-2026-08-08.json`
- Current-state compiler report: `data/world-review/r05-mountain-bulk-supplement-2026-08-08.json`

The old 483,000-command Town Expansion package remains stale and is not part
of this approval. The live world census above is the source of truth for the
already-built Combined Zones scope.

## Follow-up live wave

After this decision was recorded, the fresh-world audit found and executed
6,234 additional current-state-safe cells:

- Town Expansion remainder: 133/133;
- MainStreet R4/R5 runtime-safe remainder: 2,162/2,162;
- MainStreet bunker surface remainder: 2,922/2,922;
- Secure Complex remainder: 521/521;
- MainStreet R4/R5 original residual: 496/496.

All five forward executions had zero no-ops and zero failures. Town Expansion,
Secure Complex, and both R4/R5 supplements pass rollback post-state preflight.
The bunker supplement has one documented natural grass-to-dirt post-state
transition at `(167,111,143)`; its rollback evidence is retained as a single
natural-state holdout rather than rewritten.

The corresponding fresh post snapshot is
`data/worldsnap/town-expansion-live-post-all-wave-20260808/region`.
