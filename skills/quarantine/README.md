# Quarantined skills — 2026-07-24

18 learned skills quarantined during the repoint from the DyoCraft world
(`play.dyoburon.com`) to the fresh Paper 1.21.11 server at `10.80.13.14`.

## Why

Each of these skills opens with an executable `moveTo()` to a hardcoded
DyoCraft coordinate 800–1140 blocks from this world's spawn at `(-9, 76, -10)`.
Learned skills are **executed verbatim** — `VoyagerLoop.getBestMatch` →
`useDirectSkill` → `skillToGeneratedCode` runs them in the VM with no LLM
rewrite and no coordinate sanity check (`src/voyager/VoyagerLoop.ts:1599-1612`,
`src/voyager/CodeExecutor.ts:536`). Two of them were high-quality enough to win
retrieval constantly:

| skill | quality | successes | hardcoded target |
|---|---|---|---|
| `craft_a_wooden_pickaxe` | 0.92 | 58 | `moveTo(952, 57, 344)` |
| `towntownmph4x8tze3237864_needs_16_more_stone` | 0.79 | 336 | `moveTo(813, 66, 215)` |

They also leaked into codegen two other ways: `getAllSkillCode()` injects every
indexed skill into the VM sandbox (`VoyagerLoop.ts:1674`), and
`getTopKSkillCode()` pastes the top match into the codegen prompt
(`ActionAgent.ts:300`) — so the LLM was being taught these coordinates as good
practice.

Note the leash guard that would previously have rejected these targets
(`CodeExecutor.ts:326-341`) is skipped entirely when the leash is null, and
`config.yml` `leash:` is now empty. There is no other distance or plausibility
check on `moveTo`.

## What was done

- The 18 `index.json` entries were marked `"deprecated": true` (plus a
  `deprecatedReason`). `SkillLibrary.loadIndex` filters deprecated entries out
  of the active index, so they are invisible to search, `getCode`,
  `getAllSkillCode`, and the codegen prompt — while `saveIndex` preserves the
  rows on disk. Success/failure stats are intact.
- The `.js` files were copied here and removed from `skills/`.
- Index went 500 entries → 482 active + 18 deprecated. The other skills and
  their stats were not touched.

The library is index-driven and never scans the directory, so files sitting in
this folder are inert regardless.

## To restore one

1. Copy the `.js` file back to `skills/`.
2. Remove `"deprecated": true` and `"deprecatedReason"` from its `index.json` entry.
3. **Fix the hardcoded coordinate first** — otherwise it will march the bot off
   the map again.
4. Restart `mc-fleet-bot` so the workers reload. Editing `index.json` while the
   service is running does not work: each bot worker holds its own
   `SkillLibrary` and `saveIndex` rewrites the file from memory
   (`SkillLibrary.ts:430-447`), overwriting external edits.

A full pre-quarantine copy of the index is kept here as
`index.json.pre-quarantine.bak`.
