# Town Expansion media camera remediation and release

## Purpose and truth boundary

This record explains the terminal-snapshot camera corrections made before the
Town Expansion atlas, exact-object gallery, database media relations, Box
handoff, and Sites publication were frozen. It is a media-only correction
record. It does not claim a new world mutation.

The canonical set remains 589 paired shots and 1,178 captures: thirteen maps
(one whole-world overview plus twelve district maps), 340 exact database
objects, authored room and venue views, and two evidence passes for every shot.
Both passes use identical camera geometry and are bound to terminal snapshot
SHA-256
`c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`.

## Why the rerender was required

The complete diagnostic sweep preserved every rejected raw frame and found
three distinct defect classes:

1. the eye occupied an opaque block, including glass or structural material;
2. the central ray hit a foreground wall, tree, or unrelated surface before
   reaching the exact database owner; or
3. the frame passed basic byte-size checks but did not visually substantiate
   its named room, route, building, portal, or infrastructure role.

Candidate searches were bounded to the affected owners. Acceptance required an
air eye, an in-owner look point, the first opaque surface inside the exact
owner, a nonblank 1280×720 render, and a semantic review of the full-size image.
Unchanged capture contracts were adopted only when their complete camera
contract and terminal-snapshot binding were byte-identical.

## Reviewed terminal camera contracts

| Exact object or schedule ID | Eye | Look point | FOV |
|---|---:|---:|---:|
| TE-OBS-PORTAL-MAINSTREET | `[269.5,83.5,156.5]` | `[251.96,86.44,151.8]` | 72 |
| TE-OBS-PORTAL-RAVENROCK | `[269.5,79.5,173.5]` | `[251.98,82.78,163.38]` | 72 |
| TE-OBS-PORTAL-RAVENSREACH | `[235.5,79.5,169.5]` | `[245,79.5,185.95]` | 72 |
| TE-OBS-PORTAL-SECRET-PASSAGE | `[220.5,96.5,152.5]` | `[231.78,94.39,145.99]` | 72 |
| TE-OBS-PORTAL-WESTLIGHT | `[213,83,169]` | `[219.5,83,176.5]` | 72 |
| TE-OWNER-CORRIDOR-REST-C | `[159.5,-36.5,-143.5]` | `[186,-34.04,-158.8]` | 72 |
| TE-OWNER-CORRIDOR-REST-D | `[159.5,-36.5,-93.5]` | `[186,-34.04,-108.8]` | 72 |
| TE-IA-DISTRICT-META-SUBSTATION | `[1160.5,105.5,-520.5]` | `[1131,75.5,-490]` | 72 |
| TE-IA-CONCORD | `[570.5,105.9,-536.5]` | `[602.27,73.27,-417.95]` | 68 |
| TE-RR-MODERN-CORRIDOR-PILOT-01 | `[-144.5,4.5,187]` | `[-136.5,3.5,181]` | 72 |
| CBE-CAM-001 | `[662.5,70.5,-394.5]` | `[680.04,66.49,-389.8]` | 70 |
| CBE-CAM-003 | `[697.5,69.5,-407.5]` | `[694.31,69.5,-423.08]` | 70 |
| CBE-CAM-004 | `[712.5,69.5,-399.5]` | `[680.9,66.96,-399.5]` | 70 |
| CBE-CAM-005 | `[692.5,78.5,-396.5]` | `[692.5,75.4,-357.92]` | 70 |
| CBE-CAM-006 | `[692.5,78.5,-398.5]` | `[685.56,78.5,-408.05]` | 70 |
| CBE-CAM-011 | `[700.5,54.5,-408.5]` | `[681.93,58.76,-389.93]` | 70 |
| CBE-CAM-013 | `[694.5,87.5,-410.5]` | `[719.82,103,-419.44]` | 70 |
| CBE-CAM-014 | `[730.5,76.5,-409.5]` | `[763.08,70.86,-410.98]` | 70 |
| CBE-CAM-015 | `[735.5,73.5,-398.5]` | `[720.92,72.53,-403.36]` | 70 |
| CBE-CAM-017 | `[697.5,55.5,-373.5]` | `[706.07,54.84,-373.5]` | 70 |
| CBE-CAM-018 | `[658.5,80.5,-423.5]` | `[722.18,103,-420.62]` | 70 |
| CBE-ANNEX-CAM-002 | `[840.5,110.5,-390.5]` | `[730,76,-458]` | 70 |
| CBE-ANNEX-CAM-003 | `[704.5,74.5,-427.5]` | `[704.5,75.04,-435.08]` | 70 |
| CBE-ANNEX-CAM-009 | `[708,86,-469]` | `[704,83,-457]` | 70 |
| CBE-ANNEX-CAM-010 | `[770.5,88.5,-470.5]` | `[785.22,71.5,-445]` | 70 |
| CBE-ANNEX-CAM-015 | `[821.5,71.5,-494.5]` | `[786.99,69.86,-489.57]` | 70 |
| CBE-ANNEX-CAM-017 | `[817.5,71.5,-494.5]` | `[797.94,70.33,-479.14]` | 70 |
| CBE-ANNEX-CAM-018 | `[730.5,105.5,-380.5]` | `[730,78,-455]` | 70 |

## Release artifacts

- Canonical manifest:
  `data/exports/town-expansion-media-2026-07-28/capture-manifest.json`
- Exact object/media/database crosswalk:
  `data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json`
- Final render directory:
  `data/exports/town-expansion-media-2026-07-28/terminal-c39d-render-v6`
- Static preflight:
  `data/world-review/town-expansion-media-static-preflight-final-expanded-20260728.json`
- Cache-adoption audit:
  `data/world-review/town-expansion-media-camera-cache-adoption-final-expanded-20260728.json`
- Final media acceptance:
  `data/world-review/town-expansion-r1-post-release-media-2026-07-28.json`

The diagnostic report may be retained for defect archaeology, but publication
is allowed only from the complete canonical `capture-report.json` and the final
media acceptance report.

## Terminal acceptance

The v6 canonical resume completed all 1,178 captures with zero rejects against
the terminal snapshot. All 26 map captures carry map-mode geometry with no
perspective FOV. Independent media QA passed all 589 paired shots, all 1,178
files, all 13 map pairs, and all 340 crosswalk objects with finality
`ACCEPTED_POST_RELEASE_MEDIA`.

Two earlier complete verification attempts were OOM-killed at approximately
14.3 and 14.9 GB anonymous RSS. The cause was native canvas-backed image
surfaces retained across the complete PNG set, outside the JavaScript heap.
The verifier now serializes measurements through one reusable Image, canvas,
and context, and the resume path no longer measures accepted files twice.
Quality metrics matched 205 prior batch records with zero drift. The accepted
bounded rerun completed under a 2 GB systemd memory scope at 182,480 KB peak
RSS. The structured remediation record is:

`data/world-review/town-expansion-media-render-memory-remediation-20260728.json`

Fail-closed map-FOV and report-relative path attempts are preserved at:

- `data/world-review/town-expansion-capture-report-map-fov-contract-fail-20260728T2103Z.json`
- `data/world-review/town-expansion-r1-post-release-media-contract-fail-20260728T2104Z.json`
- `data/world-review/town-expansion-r1-post-release-qa-media-path-contract-fail-20260728T2107Z.json`

The corrected consolidated post-release report is
`data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json`; it
reports `PASS` and `ACCEPTED` with the media gate included.
