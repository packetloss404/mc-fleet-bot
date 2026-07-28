# Box Handoff Audit — July 28 Session

Audit ID: `REDEV-2026-07-28-SESSION-BOX-01`  
Audit time: 2026-07-28T03:08:35Z  
Mode: **read-only; no Box, Minecraft, database, or Sites mutation**

## Executive decision

**The Box destination is real and reachable, but today’s handoff is not yet
complete.**

The project does not use `data/exports/box` as a pretend cloud share. It has a
production Box API integration in `src/integrations/BoxIntegration.ts`, backed
by configured client credentials, a configured remote folder, API routes, a
dashboard Settings panel, PDF-map generation, SHA-1 equality checks, and a
durable sync report.

A credential-safe read-only connection test passed during this audit. The
configured folder ID and name both matched the Box API response. No account
identity or secret is retained here.

The durable sync ledger, however, ends at
2026-07-27T04:25:16.826Z. Automatic sync is disabled. At this audit boundary,
242 approved artifacts totaling 84,285,976 bytes had been created or modified
after that ledger. A read-only remote directory/SHA-1 check found no remote
directory for either Wave 2 atlas, the new town-expansion baseline atlas, or
the Wave 2 dossier directory. Those artifacts are locally staged, not
cloud-verified.

The machine result is
[`external-publication-audit.json`](external-publication-audit.json).

## Mechanism and safety boundary

| Item | Evidence | Result |
|---|---|---|
| Backend connector | `src/integrations/BoxIntegration.ts` | Present |
| API routes | `src/server/routes/boxIntegrationRoutes.ts` | Present |
| Settings UI | `web/src/app/settings/page.tsx` | Present |
| Configuration | `data/box-integration.json`, mode 0600 | Enabled; secret excluded |
| Authentication | Client credentials | Configured |
| Connection test | `/users/me` plus configured-folder lookup | PASS |
| Automatic sync | Connector setting | Off |
| Last durable ledger | `data/box-sync-state.json` | 2026-07-27 |
| Direct-upload ceiling | 50 MiB per file | No current post-ledger candidate exceeds it |

The approved local roots are deliberately narrow:

- `mainstreet-america/qa`;
- `mainstreet-america/visuals`;
- `mainstreet-america/planning`;
- `mainstreet-america/integration`;
- `docs`;
- `data/buildops`;
- `data/looks`; and
- `data/exports/box`.

Files outside those roots cannot be synchronized through the connector.
Symlinks are rejected. Only the connector’s allowlisted media/document
extensions are eligible.

This has a direct consequence for the current program: screenshots or reports
left only in `data/exports/redevelopment-*`, `data/world-review`, a snapshot
directory, or the Sites repository are **not Box candidates** until an
approved, intentional copy is placed under an approved root. World snapshots
and live SQLite files should not be copied into the handoff merely to make the
count larger.

## Point-in-time local census

The connector discovered 701 approved artifacts totaling 175,826,622 bytes.
Of these, 242 files / 84,285,976 bytes postdate the durable Box ledger.

| Post-ledger category | Files |
|---|---:|
| Documents | 39 |
| Maps | 24 |
| Screenshots | 47 |
| Outputs | 132 |
| **Total** | **242** |

No post-ledger candidate exceeds the integration’s 50 MiB direct-upload
limit.

`data/exports/box` itself contained 317 files / 98,073,089 bytes at the census
boundary:

| Extension | Files | Bytes |
|---|---:|---:|
| PNG | 163 | 33,394,163 |
| PDF | 77 | 51,792,207 |
| JSON | 46 | 12,632,060 |
| Markdown | 24 | 102,220 |
| MJS | 4 | 112,317 |
| GeoJSON | 1 | 36,862 |
| SHA-256 list | 1 | 2,274 |
| Text | 1 | 986 |

These are local filesystem facts. They are not evidence of remote transfer.

## Remote evidence

The following checks used the connector only to obtain a short-lived token and
list remote folders/files. They did not create folders or upload file
versions.

| Intended remote directory | Local files | Remote directory | SHA-1 matches |
|---|---:|---|---:|
| `exports/redevelopment-atlas-wave2-baseline-2026-07-28` | 10 | Absent | 0 |
| `exports/redevelopment-atlas-wave2-post-2026-07-28` | 10 | Absent | 0 |
| `exports/town-expansion-baseline-2026-07-28` | 10 | Absent | 0 |
| `docs/redevelopment/2026-07-28-wave2` | 11 | Absent | 0 |

Decision: **PENDING_SYNC**.

## Required final handoff

After the construction and QA teams finish, the release coordinator should
perform one bounded sync of the final approved roots. Because that is a remote
write, it belongs to the coordinating agent, not this read-only audit.

The handoff is complete only when all of these are true:

1. final screenshots, maps, plans, PDF, machine reports, and the PM dossier
   occupy approved roots;
2. no file exceeds 50 MiB and every expected extension is allowlisted;
3. the connector discovers the expected final file count;
4. the Box sync report has `failed: 0` and `skipped: 0`;
5. the report’s `completedAt` is later than the newest final artifact;
6. every final remote path is listed read-only and its Box SHA-1 equals the
   corresponding local SHA-1;
7. the final sync report is copied to an approved documentation/export root;
8. the PM dossier records uploaded, updated, unchanged, bytes, failures, and
   the exact sync-report SHA-256; and
9. credentials, access tokens, account identities, and Sites bypass tokens are
   excluded from all artifacts.

## Inputs still required from the construction program

The Box closure step cannot be finalized until the program provides:

- accepted immutable post-construction snapshot path and aggregate SHA-256;
- exact forward/rollback operation files and their transaction ledger;
- independent installed-state and rollback QA;
- bidirectional route records for the pavilion/guild hall/library circulation,
  town blocks, stadium boulevard, oasis, and mini-bunker;
- final database import ledger and accepted database hash;
- exact-object before/after screenshot manifests and rendered images;
- final surface atlas and floor-plan package;
- final PM dossier PDF and its SHA-256;
- Russian civic-pavilion research/selection, plans/elevations, and
  library–civic-space–Guild Hall route/sightline evidence;
- Westlight island figure-ground, shoreline, water/grade, protected-object and
  aligned mall/street plans;
- intentional pier-building register, plans, sections and exact captures;
- amusement-pier research plus Ferris-wheel and roller-coaster
  plan/profile/clearance evidence;
- paired outer steak-house and shrimp-house programs/plans/captures;
- crater-lake containment/neighbor-fluid evidence and quay/green-loop QA;
- paired dry-park/water-park research, selected/rejected master plans,
  ride/attraction clearances, route QA, and water-containment proof;
- westward approach-road alignment, crossings, route reports, and
  crater-green-belt integration plan;
- Hampton-style lakeside design code, medium-density block/address plan,
  public-waterfront route, floor plans, and exact captures;
- both southwest-Ravensreach housing-project plans, central-space programs,
  connection/dignity QA, and exact captures;
- Ravensreach-to-rear-MainStreet staff-path survey/transaction/route evidence
  and employee-lounge plans/operations/captures;
- final Sites source commit, saved version, production health check, and access
  confirmation; and
- the post-sync Box report plus remote SHA-1 verification.

Until those exist, the correct statement is: **the Box connector is operational
and the July 28 deliverables are locally staged, but the final cloud handoff is
pending.**

The controlling Westlight/Russian-pavilion addition is
`docs/redevelopment/2026-07-28-town-expansion/westlight-island-and-russian-pavilion-change-control.md`.
None of its future deliverables is remotely verified at this audit boundary.

The controlling westward entertainment/housing/workforce addition is
`docs/redevelopment/2026-07-28-town-expansion/westward-entertainment-housing-workforce-change-control.md`.
None of its future deliverables is remotely verified at this audit boundary.
