# Master Plan Build Index — 22 August 2026

Status: **CURRENT-SNAPSHOT MAP — PUBLISHED AS MASTER PLAN EVIDENCE**

The original whole-world town atlas was bounded at `x=-883..1468`; it could not
show the Combined Zones, which begin at `x=1500`. This Build Index corrects that
coverage gap with a current R08AM snapshot render spanning:

```text
x = -883..2550
z = -1387..964
north = image up (-Z)
```

## What the map shows

- The western town, MainStreet, Ravensreach, Ravensgate, Westlight, and the
  Approach Road as surface geography and labelled built areas.
- The east-side Combined Zones mountain/`B09` area in the same frame.
- The accepted Empty Eight underground retail footprint at `x=1632..1872`,
  `z=40..160`.
- The B09 passive-rail / bounded-maintenance-shuttle marker and Cheyenne
  bounded-route marker, both explicitly labelled **below** because a surface
  atlas cannot make underground construction visible on its own.

## Evidence and limits

- Source snapshot: `data/worldsnap-r08am-post-20260822T161818Z/region`;
  region SHA-256 `30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`.
- Generated map:
  `data/exports/master-plan-build-index-20260822T190000Z/00-overall-active-world-surface-atlas.png`.
- The map identifies location and accepted bounded system presence. It does not
  turn underground/restricted systems into public access, nor does a labelled
  envelope imply that every cell inside it was modified.

The website copy is `/atlas/master-plan-build-index.png`; its hash-bound sync
manifest is `/atlas/master-plan-build-index.manifest.json`.
