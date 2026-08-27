# TE-NEXT-01 · Town Expansion R1 owner rest-suite ceiling lighting

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-TOWN-EXPANSION-R1`
**Source:** accepted R08AM post `data/worldsnap-r08am-post-20260822T161818Z`;
fresh live source `data/worldsnap-te-next-source-20260825T073348Z`
(region SHA-256 `22bd027b167a49f4740cc2200c35cdb8c091bb6180e3f7677c1b967a6c2102ae`)
**Post snapshot:** `data/worldsnap-te-next-post-20260825T073442Z`
(region SHA-256 `6b1d63e7e7c4c514c5f9fa22282bdbeb70dc999dfdd308149bf8e04a8bb40ea9`)
**Manifest identity:** `93d9107c618c7d30b369143c2ea8dd6ce5df869b18c45acac0207bc96a3107e7`

The seven Town Expansion owner corridor rest suites
(`OWNER-REST-A..G`) are fully furnished underground hospitality rooms — each
with 30 chiseled-bookshelf/bed/cauldron/door fixtures — but contained **zero
light sources**. The owner corridor source-of-truth
(`worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md`) requires
"warm ceiling lights at eight-block centers"; the adjacent owner corridor is
lit with `minecraft:ochre_froglight[axis=y]` on 8-block centers. This package
installs that same warm ceiling light into each suite's roof slab at the
8-block grid centers that sit above fully clear walkable lounge space.

## Scope

- **21 exact targets** — `minecraft:deepslate_bricks` → `minecraft:ochre_froglight[axis=y]`
  at `y=-34` (the suite ceiling layer), 3 per suite at the 8-block grid centers:
  - OWNER-REST-A: `24,-339` `32,-347` `32,-339`
  - OWNER-REST-B: `24,-257` `32,-265` `32,-257`
  - OWNER-REST-C: `161,-149` `169,-157` `169,-149`
  - OWNER-REST-D: `161,-99` `169,-107` `169,-99`
  - OWNER-REST-E: `176,42` `184,34` `184,42`
  - OWNER-REST-F: `239,74` `247,66` `247,74`
  - OWNER-REST-G: `330,102` `338,94` `338,102`
- Every target is a full roof-slab block replaced 1:1 by a full non-gravity
  block — no floating, gravity, or support concern. Every target has a fully
  clear air column (y=-43..-35) below it.
- Disjoint from the natural copper oxidation rollback-only policy (0 overlap),
  from the red-carpet drift repair, and from every protected feature.

## Hard-safety kernel evidence

- Forward source preflight: 21/21 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 21/21 ops → 21/21 commands,
  0 left for WorldEdit, 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers (no target or halo touches a bookshelf,
  chest, or other block entity).
- Live-entity gate: 0 blockers, 0 entities in envelopes.
- Strict-noop live execution: 21/21 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-te-next-post-20260825T073442Z`.
- Rollback post-state preflight: 21/21 PASS.
- Post-state verification: 21/21 ochre_froglight, 3 per suite.

## Artifacts

- Compiler: `scripts/compile_town_expansion_rest_suite_lighting.mjs`
- Ops: `data/buildops/town-expansion-r1-rest-suite-lighting.rest-suite-ceiling-lighting.{forward,rollback}.txt`
- Manifest: `data/buildops/town-expansion-r1-rest-suite-lighting.release-manifest.json`
- Evidence: `data/world-review/te-next-live-20260825T073500Z/`
- Regression: `test/build/teNext01.test.ts`

## Boundary

Passive warm ceiling illumination only. This package does not commission the
owner corridor route, any emergency lighting system, low-level egress
lighting, wayfinding signs, the red-room annexes, or the sales office. It does
not touch the copper oxidation cells (rollback-only), any container, block
entity, or protected feature.
