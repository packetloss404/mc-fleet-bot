# Town Expansion PM Evidence Gate Matrix

Point-in-time audit: `2026-07-28T18:31:02Z`  
Overall release state: **BLOCKED — NOT ACCEPTED, NOT PUBLISHED, NOT HANDED OFF**

This matrix is fail-closed. A component-level or offline `PASS` does not imply
terminal acceptance. Current terminal artifacts take precedence over
`SESSION_MEMORY.md` and generated knowledge-base outputs when those sources are
older. The terminal snapshot currently under review is
`71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d`;
the citizen route path is
`9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701`.

## Rollback and recovery control total

The exact historical recap is **6 incidents, 11 rollback/recovery invocations,
8 completed, and 3 failed**. An incident is an atomic transaction requiring
compensation; an invocation is one rollback or bounded-recovery execution, so
the counts are intentionally not one-to-one.

| Invocation | Outcome | Exact recap |
|---|---|---|
| `RED-20260727-01-R1` | Complete | MainStreet component rollback |
| `RED-20260727-01-R2` | Complete | Raven Rock component rollback |
| `RED-20260727-01-R3` | Complete | Westlight component rollback |
| `TOWN-20260728-01-R1` | **Failed** | Obsolete-hash generic rollback |
| `TOWN-20260728-01-R2` | Complete | Exact prefix-10 recovery |
| `TOWN-20260728-02-R1` | **Failed** | Frozen-rebase generic rollback |
| `TOWN-20260728-02-R2` | Complete | Exact prefix-13 recovery |
| `TOWN-20260728-03-R1` | **Failed** | Complete-state generic rollback |
| `TOWN-20260728-03-R2` | Complete | Exact prefix-123 recovery; later review found reactive short-grass drift outside the prefix proof |
| `TOWN-20260728-04-R1` | Complete | Full Paper-strict rollback, 484,635 groups and zero failures; followed by a fresh 483,016/483,016 source preflight |
| `TOWN-20260728-05-R1` | Complete | Accessibility-repair exact prefix-566 recovery, 566/566; followed by a fresh 1,530/1,530 source preflight |

The detailed generated
[incident ledger](knowledge-base/incident-ledger.md) correctly retains those
rollback totals, but it is not current for later QA counts. The canonical
source
[`data/knowledge-base/redevelopment-release-incidents.json`](../../../data/knowledge-base/redevelopment-release-incidents.json)
was updated at `2026-07-28T18:11:00Z` and currently hashes to
`38ef2faba51e16cebbadba74de09d8ff39a43891a7e7ce42760c7624175ba77d`;
it has 6 incidents, 12 post-QA defects, 29 error occurrences, and 24 prevention
rules.

## Current fail-closed gate matrix

| Gate | Current state | Evidence and decision | Required terminal condition |
|---|---|---|---|
| Base-to-supplement provenance | **BLOCKED** | Canonical `QA-20260728-12` is `OPEN_REMEDIATION_IN_PROGRESS`. Supplemental-aware QA/import logic correctly rejects treating the base transaction as the whole release. The ordered base → accessibility (`0a74e06a…` → `16bd79f5…`) → citizen (`16bd79f5…` → `71f52acf…`) chain must be bound without omission or reordering. | Independently hash and validate the base transaction and every supplement, prove byte-identical post-to-next-source continuity, and bind the final terminal snapshot. |
| Base rollback proof at the accessibility source | **FAIL** | The complete 483,016-group preflight against preserved accessibility source `0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218` failed 65 groups. The policy audit accounts for 4,529 admissible copper-transition points and **49 unsupported red-carpet provenance points**. Carpet disappearance is physical drift, not a copper lifecycle transition. Evidence: `town-expansion-r1-base-rollback-preflight-accessibility-source-20260728.json` SHA-256 `806544a2e2af87e35180ef10d9cb35cce093e118f80b935ae5bc67df232efcf3`; policy audit SHA-256 `2accb75be1de5bf593dc052f0c916387b3d318c9f148544cec56750ee686f123`. | Recover the 49 cells physically under the approved live contract, take a new immutable snapshot, then pass the complete policy-aware base rollback preflight. The copper-only exception must remain fail-closed. |
| 49-cell red-carpet recovery | **OFFLINE READY; NOT EXECUTED** | The recovery manifest is `OFFLINE_VALIDATED_NOT_EXECUTED`, with no live-world, service, or database mutation. It contains 49 one-cell `air → red_carpet` guards, forward SHA-256 `bbbc0e74ebaa857d5a235535d68d069df73bd1b81516aef4495352fa54be4b16`, and an exact inverse SHA-256 `e2f49273472cd0a16c34aba4407bde6ed0b2494eec38cd1c3b569cc260192a64`. Terminal-source preflight passed 49/49. | First pass the citizen bidirectional walk; then stop the service, freeze the world, obtain a fresh entity gate, execute with Paper-strict `--strict-noop`, capture an immutable post snapshot, prove exact rollback readiness, and rerun the complete base rollback preflight. |
| Representative offline accessibility routes | **PASS, LIMITED** | Accepted immutable-post geometry covers 22/22 routes, 44/44 directions, and four isolation contracts. This is offline geometry evidence only and does not satisfy the citizen activation walk. | Preserve the same-snapshot route identity and complete all distinct live-only powered-door, dynamic-clearance, and no-dig/no-tower checks required by the route contract. |
| Citizen live commute | **FAIL — REPEATED REVERSE CHECKPOINT 13** | Audits `20260728T165823Z`, `T180433Z`, and latest `T181928Z` each completed staging and 49/49 forward checkpoints, then failed reverse checkpoint index 13 at target `[-83,72,1]` after a retry. Latest status is `FAIL`; only 13 reverse checkpoints completed. It recorded zero digs and zero security incidents, but those clean observations do not override the route failure. The later two audits bind snapshot `71f52acf…` and exact path `9fe7e7ba…`. | One terminal `PASS_BIDIRECTIONAL` audit on the bound snapshot/path: 49/49 forward and 49/49 reverse, production movement policy matching the certified no-parkour/no-dig model, zero digs, and zero security incidents. Do not activate citizen schedules before this passes. |
| Gilded Raven camera family | **PASS, RESOLVED** | Root cause was the second-pass eye `[-8,78,-368]` occupying the solid L2 floor. Reviewed exterior, main-bowl, and grand-descent cameras now pass 3/3, bind six paired captures, preserve rejected raw evidence, and write no canonical capture paths. Family report SHA-256: `bff893371f2a4f561f8e6562693c14131295444d5f6be75b62a412bc5a91531d`. | Keep this family report and its snapshot/hash binding unchanged through manifest render and media QA. |
| Complete media static contract | **PASS, NON-RENDERING** | Static preflight SHA-256 `93018d5836a75a5df36901a30e0ef48e3bd31c33cb935511eb4bbd1b98b7b5b5` passes 1,178 cameras, 589 pairs, 340 exact objects, and all three render-backed family gates against snapshot `71f52acf…`. It explicitly invalidates all 1,178 outputs; 91 prior-snapshot files existed at audit time. | Render every declared output from the finally accepted immutable snapshot and preserve all rejects. Static validation cannot substitute for captures. |
| Complete media render and media-release QA | **PENDING** | At audit time neither `capture-report.json` nor `town-expansion-r1-post-release-media-2026-07-28.json` exists, and no renderer or media-QA process is running. | Capture report must cover all 1,178 expected outputs with exact package/image hashes and no missing or failed pair; media QA must `PASS` against the final accepted post snapshot. Any new world snapshot invalidates the existing static/media snapshot binding and requires regeneration or revalidation. |
| Final post-release acceptance | **BLOCKED** | No current supplemental-aware final report proves all world, rollback, route, media, and identity gates together. Older component passes cannot be composed by assertion. | Run the read-only final verifier with the complete ordered transaction chain, new immutable terminal snapshot, accepted representative-route artifact, successful rollback proof, and media report; require `PASS`, `ACCEPTED`, and zero failed gates. |
| Release database import | **BLOCKED; NOT EXECUTED** | [Database closeout](town-expansion-database-closeout.md) remains `OFFLINE_IMPORTER_PREPARED_NOT_EXECUTED`. No database mutation is authorized while final QA, supplement continuity, media identity, or complete capture pairs are missing. | First run a fail-closed dry run against the accepted chain and expected database SHA. Then use backup plus immediate transaction for the commit, followed by a post-import census and exact object/media crosswalk verification. |
| Knowledge-base database/report/ledger | **STALE; REBUILD REQUIRED** | The generated KB report was created at `17:38:04Z` from source SHA-256 `38a568f7…`; the canonical source is now SHA-256 `38ef2fab…`. Therefore its SQLite SHA-256 `9571245d…`, report, and Markdown ledger do not describe the latest 12-defect/29-occurrence/24-rule state, even though their 6/11 rollback totals remain correct. | Finalize canonical incident evidence, rerun the guarded KB builder, and require source/database/report/Markdown identities, semantic validation, zero missing artifacts, and stable-input checks to pass. |
| PM dossier and final PDF | **PENDING** | The dossier source is intentionally open. Point-in-time validation of older PDFs does not prove a final Town Expansion dossier; the final Town Expansion HTML/PDF and synchronized artifact-register hashes do not yet exist. | Freeze final evidence, compile HTML/PDF, verify the PDF opens, has nonzero pages, renders successfully, and matches the artifact register; record final SHA-256 identities. |
| Sites publication | **PENDING TOWN-EXPANSION UPDATE** | Owner-only Sites v4 is a healthy predecessor with root HTTP 200 after the v3 Worker 1101 repair. It is not the Town Expansion closeout. `/favicon.ico` remains a nonfatal HTTP 404. | After acceptance, DB/media/PDF closeout, push the exact source state, save and deploy that version, preserve owner-only access, verify root and key routes return 200 with no Worker errors, and fix or explicitly close the favicon defect. |
| Box handoff | **PENDING SYNC** | The Box connector is real and reachable, but automatic sync is off and the July 28 remote handoff has not been verified. Existing local/remote audit evidence is point-in-time only. | Sync only approved final roots after all accepted snapshot, transaction, QA, DB, media, PDF, and Sites identities are frozen. Require `failed: 0`, `skipped: 0`, complete remote paths, Box SHA-1 equality for every handoff file, and a hashed final sync report. |

## Required closure order

1. Obtain the terminal 49+49 citizen route pass with zero dig/security events.
2. Execute the guarded 49-carpet physical recovery under its frozen-world
   contract; capture a new immutable snapshot and prove its exact inverse.
3. Reprove the complete base rollback and the ordered
   base → accessibility → citizen → carpet continuity chain.
4. Rerun representative-route and final post-release QA against the new
   terminal identity.
5. Rebind, render, and pass complete media QA against that same accepted
   identity.
6. Dry-run and commit the release database; run the post-import census.
7. Rebuild the KB database/report/ledger from the finalized canonical source.
8. Freeze the artifact register; compile and validate the final PM PDF.
9. Publish and health-check the owner-only Sites version.
10. Sync Box and prove remote path/hash equality.

## Mandatory terminal follow-up

When the release reaches a genuinely terminal `ACCEPTED` or `BLOCKED` state,
run the full fan-out postmortem across PM/release engineering, world/build,
QA/routes, media, database/KB, citizen operations, Box, and Sites. Account for
every rollback, bounded recovery, QA/rerender, route, database, publication,
and handoff delay. Explicitly assess whether custom tooling should be retained
or built for canonical block-state comparison, journal-prefix atomic recovery,
resumable rendering, and a terminal release orchestrator that binds world,
rollback, route, media, DB/KB, PDF, Sites, and Box identities.
