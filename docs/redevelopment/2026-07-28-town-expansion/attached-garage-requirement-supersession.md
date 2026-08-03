# Attached-Garage Requirement Supersession

Change ID: `REDEV-2026-07-28-CR-ATTACHED-GARAGES-01`  
Effective: 2026-07-28 UTC  
Priority: **controlling owner requirement**

## Controlling requirement

1. Every residential garage must be physically attached to its parent house.
2. Detached residential garages are prohibited.
3. A large house must have either a four-car or six-car attached garage.
4. No one-, two-, or three-car source precedent overrides the owner’s current
   in-world design requirement for a house classified as large.
5. Attachment must be functional and architectural: continuous enclosed
   building fabric plus an interior house-to-garage route. A freestanding
   garage connected only by paving, an open fence, a decorative wall, a
   canopy, or a bridge-like token block does not pass.

This directive supersedes all earlier prospective guidance permitting detached
rear/side garage pavilions. Earlier transaction and QA records remain immutable
historical evidence of what R1 built and accepted at that time. They are not
current design authority and must not be replayed.

## Known affected as-built objects

The accepted R1 database/catalog contains eighteen detached residential garage
objects that require a separately guarded attachment/capacity retrofit:

| Parent houses | Existing garage feature IDs |
|---|---|
| `H01`–`H12` | `R4-GAR-H01` through `R4-GAR-H12` |
| `C02`–`C07` | `R4-GAR-C02` through `R4-GAR-C07` |

The existing garage IDs should remain stable if the database importer supports
an as-built update of the same real-world object. If a retrofit creates a
materially new object identity, the database team must explicitly supersede
the old ID and preserve the historical relation; it must not silently create
two “current” garages for one physical volume.

All H-series houses are initial large-house review candidates. The engineering
package must publish a measured house-size/capacity schedule and assign each
large house either four or six attached bays. C-series residential villas must
also be attached; their four-versus-six classification must follow the same
measured schedule. Any exception requires an explicit owner decision.

The first measured redesign basis now exists at
`mainstreet-attached-garage-coordinate-schedule.json`, SHA-256
`b03a999ff72f8060b6dc373be5b45bd14b970c83b3d92a65b14de28055d71ea1`.
It is explicitly marked `SURVEY_REDESIGN_BASIS_NOT_A_RELEASE` and provides
proposed attached envelopes for all 18 houses. Its current classification is:

- 2 six-car proposals: `H01`, `H07`;
- 4 four-car proposals: `H03`, `H08`, `H09`, `H10`; and
- 12 attached two-car proposals for smaller or unverified cottage-scale
  parents.

The four- and six-car assignments conform to the controlling large-house rule.
The two-car assignments are acceptable only if the fresh survey substantiates
that those parents are not large; the owner’s requirement, not a stale model
record, wins any conflict.

## Affected source and generated artifacts

### Direct design conflicts

| Path | SHA-256 at change review | Disposition |
|---|---|---|
| `mainstreet-america/planning/redevelopment-r4-r5.yaml` | `06154dbc1afcc43607c64a00ee66e07fd35cb9fced5dce76d32c81dc33d69025` | Superseded for garage typology; retain as R1 history |
| `scripts/generate_mainstreet_redevelopment_r4_r5.mjs` | `8c18fd13e4801b01f8af23b185cc60b32584d348321ecf74984a68fe455ae5e4` | Do not reuse for new garages without an attached-garage redesign |
| `docs/redevelopment/2026-07-27/infrastructure-standards.md` | `bd619c9939e1be2399cd4b9d6f4e4a8468bf5d3f3f27a9888a0ea40005c77e8a` | Detached-garage permission is superseded |
| `docs/redevelopment/2026-07-27/research-bibliography.md` | `82c775639c6bc37392d216166aeb5e120abf5beea0daf3797ffd5b3aeb96020b` | Detached precedent remains research history, not design authority |
| `docs/redevelopment/2026-07-27/mainstreet-runtime-safety-follow-up.md` | `04f0e73a7baadd1453b677505a282bef18919497b3bcb181b370c78fbc9dd78c` | Its factual description remains valid; its garage scheme is superseded |

`docs/redevelopment/2026-07-27/mainstreet-surface-release.md` describes an
earlier garage-pavilion draft and its execution history. It is affected as a
historical narrative, not as current authority.

### Generated R1 design/build records

| Path | SHA-256 at change review | Disposition |
|---|---|---|
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.report.json` | `aff9a31233c94c301d54aa3519200860615005aa5dc720f67a57b4d20e25dbb6` | Historical built-design report; do not rewrite |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json` | `136912978b0f2b61554b8da4066e696175cdffe403ec81fffc76f2dcc56a4faa` | Accepted R1 as-built report; use as retrofit source census |
| `data/world-review/mainstreet-redevelopment-r4-r5-design-2026-07-27.json` | `eb5665f0961d7959c16fe769ba7226dda62ff0d74c9b71e56ad309cabc9aac63` | Historical design export |
| `data/world-review/mainstreet-redevelopment-r4-r5-runtime-safe-design-2026-07-27.json` | `ec01e52e08f9e9e0bb45bba6416b503774399c1e4f02fc627baf66cbaff42305` | Historical accepted design export |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.report.json` | `aff9a31233c94c301d54aa3519200860615005aa5dc720f67a57b4d20e25dbb6` | Rejected/earlier attempt; never current authority |

The corresponding forward/rollback operation files, transaction ledger,
camera manifests, route records, and R1 post-QA are also affected as the
physical provenance of the eighteen detached garages. They must remain
immutable because later attachment work needs their exact history.

### Catalog, atlas, and Sites derivatives

The following current exports repeat the detached garage names/relations and
must be regenerated after the attachment retrofit:

| Path | SHA-256 at change review | Required action |
|---|---|---|
| `data/exports/world-catalog-wave2-post-2026-07-28/features.json` | `99e650da6159783487ce3c1e21e02efc1d4baf536d120315e9a1aec5c941ee57` | Refresh from post-retrofit database |
| `data/exports/world-catalog-wave2-post-2026-07-28/object-media-index.json` | `28b27d975c6c8d6f8a066fa9106a114b4efe935bd40f6b8ccc180bb539507ef6` | Refresh exact relations |
| `world-showcase/public/reports/features.json` | `99e650da6159783487ce3c1e21e02efc1d4baf536d120315e9a1aec5c941ee57` | Replace in next Sites version |
| `world-showcase/public/reports/object-media-index.json` | `28b27d975c6c8d6f8a066fa9106a114b4efe935bd40f6b8ccc180bb539507ef6` | Replace in next Sites version |
| `world-showcase/public/data/buildings.json` | `230c82975ee1abbe25cebe44f31e18dfd6309f2ffa4a2c30e42d6ce810b3473d` | Refresh building/garage presentation |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/area-inventory.json` | `29f35f8bf0f2b93bbcdb5ad991f4f4a15198822c53e5e46d6da5cd065949a698` | Retain as baseline; generate a new post atlas |

Earlier world catalogs, the baseline/post Wave 2 area inventories, compiled
R1/Wave 2 PDFs, and Sites versions 1–4 also describe the historical detached
state. They remain valid for their named snapshot boundaries, but a new current
publication must visibly supersede them.

## Required retrofit work package

The town-expansion release must add an `ATTACHED-RESIDENTIAL-GARAGES` package
or an explicitly equivalent package with:

1. a measured register of all residential houses and existing garage objects;
2. parent-house classification, including the large-house decision;
3. assigned four- or six-car capacity for every large house;
4. proposed attached geometry and interior connecting route;
5. driveway/alley/street access retained or intentionally redesigned;
6. no front-garden placement unless the owner explicitly approves it;
7. exact target cells and protected building/room intersections;
8. exact source/desired/rollback operations;
9. cross-package checks against town infill, roads, courtyards, utilities, and
   all accepted R1/Wave 2 targets;
10. same-camera before/after evidence per house/garage relationship;
11. a normal walk from house interior into garage and from garage to the road
    in both directions;
12. post-state attachment proof using connected occupied building fabric, not
    naming alone;
13. capacity proof by clear bay count;
14. database feature/geometry/status updates;
15. refreshed catalog, atlas, dossier, and Sites source; and
16. Box sync/remote hash verification for the final artifacts.

## Acceptance rules

The package fails if any residential garage:

- is freestanding;
- lacks an interior connection to the parent house;
- uses only paving, landscaping, a fence, open canopy, or token bridge as the
  attachment;
- blocks normal house or street circulation;
- has fewer than four bays when the parent is classified as large;
- claims a capacity that is not visible in the clear internal bay geometry;
- leaves both old and new current database features active without a
  supersession relation; or
- appears in the final atlas/catalog/Sites release under the old detached
  description.

Final acceptance must report:

- residential houses checked;
- garages attached;
- large houses;
- four-car attached garages;
- six-car attached garages;
- exceptions (required: zero unless owner-approved);
- bidirectional routes passed;
- exact before/after cameras passed; and
- database/media relations refreshed.

## Change-control decision

State: **APPROVED REQUIREMENT / PHYSICAL REMEDIATION PENDING**

This change does not retroactively falsify the R1 transaction. It replaces its
garage design rule for all future work and makes attachment/capacity remediation
a mandatory gate of the current town-expansion closeout.
