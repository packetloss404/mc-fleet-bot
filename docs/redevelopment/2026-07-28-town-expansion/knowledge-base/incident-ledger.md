# Redevelopment rollback and recovery incident ledger

Source updated: 2026-07-28T22:00:00Z

- Atomic rollback incidents: 6
- Rollback/recovery executions: 11
- Completed executions: 8
- Failed executions: 3
- Executions in progress: 0
- Post-QA defects: 17

An incident is one atomic release transaction that required compensation. An
execution is one rollback or bounded-recovery invocation. Both measures are
retained because one incident may reverse several packages or require a failed
generic rollback followed by a successful bounded recovery.

## RED-20260727-01 — redevelopment attempt 1: Westlight, Raven Rock, MainStreet

Status: **rolled-back**  
Window: 2026-07-27T23:05:57Z to 2026-07-27T23:06:31Z

MainStreet stopped on strict guarded no-ops after Westlight and Raven Rock had committed; the atomic wrapper compensated all three executed packages.

**Root cause:** The live source no longer matched several exact MainStreet guards. The older runner accumulated multiple no-op failures before terminating instead of stopping at the first failed source group.

**Resolution:** MainStreet, Raven Rock, and Westlight rollback packages all completed. Later runner work changed execution to stop at the first failed group and validate journals.

Prevention controls: RCS-001, RCS-002, RCS-006

| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |
|---|---|---|---:|---:|---:|
| RED-20260727-01-R1 | component-rollback | MainStreet | complete | not reported | 0 |
| RED-20260727-01-R2 | component-rollback | Raven Rock | complete | not reported | 0 |
| RED-20260727-01-R3 | component-rollback | Westlight | complete | not reported | 0 |

Transaction evidence: `data/world-review/redevelopment-attempt1-2026-07-27/redevelopment-atomic-transaction-2026-07-27.json`  
Transaction SHA-256: `6daf1098240cc0232d05c2f1acf06efa50233389289213e93f183ca3451fc1d7`

- RED-20260727-01-R1: `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.emergency-rollback.execution.json` — SHA-256 `6138e998ef7bc3922cddb0b7dffea86f33c677f465591638cf5600fd6e545f6b`
- RED-20260727-01-R2: `data/world-review/redevelopment-attempt1-2026-07-27/ravenrock-s1-section-pilot-2026-07-27.emergency-rollback.execution.json` — SHA-256 `64558dbfc98e8e0ba0a99caae658fec2b79606cbbfc567869ea7da82221a41cb`
- RED-20260727-01-R3: `data/world-review/redevelopment-attempt1-2026-07-27/westlight-infinity-screen-2026-07-27.emergency-rollback.execution.json` — SHA-256 `db405fd21d026c6c5be559940e23b8b6810b0e08b3179aee74dc1b8611ee764e`

## TOWN-20260728-01 — Town Expansion obsolete-hash attempt 1

Status: **recovered-bounded**  
Window: 2026-07-28T13:25:27Z to 2026-07-28T13:32:15Z

Forward execution stopped at line 19 after 10 successful groups. The generic rollback failed on its first group; a bounded prefix-10 recovery completed.

**Root cause:** A strict source guard returned no-op under an obsolete generated package. The generic rollback encountered a source-state/reply mismatch and could not compensate the prefix automatically.

**Resolution:** Generated and executed an exact recovery for the 10 accepted forward groups, then regenerated and rebased the package.

Prevention controls: RCS-001, RCS-003, RCS-006

| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |
|---|---|---|---:|---:|---:|
| TOWN-20260728-01-R1 | generic-full-rollback | Town Expansion | failed | 0 | 1 |
| TOWN-20260728-01-R2 | bounded-prefix-recovery | first 10 accepted groups | complete | 10 | 0 |

Transaction evidence: `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/atomic-transaction-attempt-132527.json`  
Transaction SHA-256: `301af4f272b942c3e058709ee9e5aa6f0892cdab37dae31d8e4c3c43ffedc707`

- TOWN-20260728-01-R1: `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/emergency-rollback-attempt-132828.json` — SHA-256 `d3912abe126bc13de68e5c7b471c23f35dbf2d1a8fac66c87ee90687a30685cd`
- TOWN-20260728-01-R2: `data/world-review/town-expansion-r1-prefix10-recovery-execution-20260728.json` — SHA-256 `d926fec0994372f846667ea5642d9b8db0d7136501c4fad7605f115f83759e12`

## TOWN-20260728-02 — Town Expansion frozen-rebase attempt

Status: **recovered-bounded**  
Window: 2026-07-28T13:59:40Z to 2026-07-28T14:08:45Z

Forward execution stopped at line 22 after 13 successful groups. The generic rollback failed on its first group; a bounded prefix-13 recovery completed.

**Root cause:** The regenerated frozen-source package still had an early strict no-op. Review found incomplete block-state normalization and unsafe ordering around dependent terrain and plant operations.

**Resolution:** Recovered the 13 accepted groups, completed block states compiler-wide, corrected invalid cauldron state emission, and added deterministic top-down clearance ordering.

Prevention controls: RCS-003, RCS-004, RCS-005, RCS-006

| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |
|---|---|---|---:|---:|---:|
| TOWN-20260728-02-R1 | generic-full-rollback | Town Expansion | failed | 0 | 1 |
| TOWN-20260728-02-R2 | bounded-prefix-recovery | first 13 accepted groups | complete | 13 | 0 |

Transaction evidence: `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-atomic-transaction-20260728.json`  
Transaction SHA-256: `7265cdcd426b4bdd434620100a2dfc325dc4af4e19c43f5f0174f93402c12c57`

- TOWN-20260728-02-R1: `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.emergency-rollback.execution.json` — SHA-256 `3853c098e2e3c7ff3c420e18dbc16e203b80d4327f7e3202de6b287e348d1d0d`
- TOWN-20260728-02-R2: `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-prefix13-recovery-execution-20260728.json` — SHA-256 `5a66193b1925c7dba3179a234989dee9f56d1e64889455de3dba601a5943f1cc`

## TOWN-20260728-03 — Town Expansion complete-state attempt

Status: **recovered-bounded-with-latent-drift**  
Window: 2026-07-28T14:48:55Z to 2026-07-28T14:54:01Z

Forward execution stopped at line 144 after 123 successful groups. The generic rollback stopped immediately on an unclassified empty conditional command reply. Prefix-123 recovery completed, but its verification did not include a reactive side effect caused by the failed group.

**Root cause:** Removing a support block caused short grass in the failed group to pop reactively. The recovery algorithm reversed only groups reported successful. The failed group was a command no-op but still inherited a neighbor-update side effect. Empty conditional command replies were also not classified by the rollback runner.

**Resolution:** Recovered 123 accepted groups; patched empty conditional command reply handling; appended Paper strict mode to every SET/REPL fill; added runner tests. The latent short-grass drift was discovered by the next attempt.

Prevention controls: RCS-004, RCS-005, RCS-007, RCS-008, RCS-009

| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |
|---|---|---|---:|---:|---:|
| TOWN-20260728-03-R1 | generic-full-rollback | Town Expansion | failed | 0 | 1 |
| TOWN-20260728-03-R2 | bounded-prefix-recovery | first 123 accepted groups | complete | 123 | 0 |

Transaction evidence: `data/world-review/archive/town-expansion-r1-paper-strict-predecessor-failed-attempt-20260728T1451Z/town-expansion-r1-atomic-transaction-final-20260728.json`  
Transaction SHA-256: `78f9e4793c2992a82fb36e4f6e9bda50d49b372856d8c67e0ce59176fd21bf1c`

- TOWN-20260728-03-R1: `data/world-review/archive/town-expansion-r1-paper-strict-predecessor-failed-attempt-20260728T1451Z/town-expansion-r1-2026-07-28.emergency-rollback.execution.json` — SHA-256 `2632a397fe3da2583d987fd98a89b2af92862e1fd80793fb3cfd00680ab89a69`
- TOWN-20260728-03-R2: `data/world-review/archive/town-expansion-r1-paper-strict-predecessor-failed-attempt-20260728T1451Z/town-expansion-r1-prefix123-recovery-execution-20260728.json` — SHA-256 `729bb0722802302ead844be1e435c1d1c46889cb3596bbf26a1f59b72f919b9e`

## TOWN-20260728-04 — Town Expansion Paper-strict top-down attempt

Status: **rolled-back**  
Window: 2026-07-28T15:13:59Z to 2026-07-28T15:31:56Z

Forward execution stopped at line 140 after 119 successful groups because two short-grass source cells were already missing. The fixed generic full rollback completed all 484,635 groups with zero failures.

**Root cause:** The previous prefix-only source verification proved only successfully reversed groups and missed the reactive side effect at (43,74,38..39). The live world was therefore not identical to the canonical source even though the bounded prefix check passed.

**Resolution:** Completed a full non-strict, Paper-strict rollback: 484,635 successful groups, 484,649 expanded commands, 120 changed, 484,529 accepted no-ops, zero failed groups, and exact force-load cleanup. Captured a fresh 30-region snapshot and required a complete 483,016-group live-source preflight before any retry.

Prevention controls: RCS-007, RCS-008, RCS-009, RCS-010, RCS-011

| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |
|---|---|---|---:|---:|---:|
| TOWN-20260728-04-R1 | generic-full-rollback | Town Expansion | complete | 484635 | 0 |

Transaction evidence: `data/world-review/town-expansion-r1-atomic-transaction-topdown-strict-final-20260728.json`  
Transaction SHA-256: `9af2f3fec0cfd0fba1dd326c12a93aaf91c2fdda4015d5e26a1a0b2e2f9d9550`

- TOWN-20260728-04-R1: `data/buildops/town-expansion-r1-2026-07-28.emergency-rollback.execution.json` — SHA-256 `80b27f408dcce746ac4c5b920fdad9005b039b792495d275b774f09637cf0f9b`

## TOWN-20260728-05 — Town Expansion R1 accessibility repair attempt 1

Status: **rolled-back**  
Window: 2026-07-28T17:32:15Z to 2026-07-28T17:34:25Z

Strict forward execution stopped at source group 567 after 566 successful one-cell changes because the next stair replacement was a semantic no-op. A journal-proven exact prefix recovery restored all 566 changed cells.

**Root cause:** The accessibility generator compared serialized block-state strings without canonicalizing property order. It emitted a replacement whose source and target described the same smooth-quartz stair state, so Paper correctly returned a strict no-op.

**Resolution:** Generated the exact inverse of only the 566 journal-proven successful groups, preflighted all 566 against a fresh partial-state snapshot, passed a fresh zero-entity gate, executed the recovery 566/566, and then proved all 1,530 original source guards against a new source-restored snapshot.

Prevention controls: RCS-001, RCS-004, RCS-006, RCS-008, RCS-011, RCS-022

| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |
|---|---|---|---:|---:|---:|
| TOWN-20260728-05-R1 | journal-proven-successful-prefix-recovery | first 566 accepted accessibility-repair groups | complete | 566 | 0 |

Transaction evidence: `data/world-review/town-expansion-r1-accessibility-repair-atomic-transaction-attempt1-20260728.json`  
Transaction SHA-256: `2965ff5f2545891c4b4bd98bd1944beeebcff05efe6aa09bbc068574b8fc320f`

- TOWN-20260728-05-R1: `data/world-review/town-expansion-r1-accessibility-repair-prefix566-recovery-execution-20260728.json` — SHA-256 `b80b258d8871b2d88e48e10072f62ce851aebb1de11d6819d3b5275a8b8883ad`

## Post-QA defects

### QA-20260728-01 — Town Expansion committed post-state rollback readiness

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T16:05:00Z

The committed build passed 484,676/484,676 forward groups, but the first post-settlement rollback preflight passed only 483,014/483,016 groups.

**Root cause:** Fourteen unwaxed cut-copper cells naturally advanced to exposed_cut_copper after the world was unfrozen. Exact rollback groups at lines 99992 and 99994 accepted only cut_copper.

**Impact:** The installed build remains committed, but final acceptance, database import, Box publication, and Sites publication are blocked until the rollback path explicitly and durably handles declared copper lifecycle transitions.

**Resolution:** Added an opt-in, rollback-only natural-state-transition policy bound to the unchanged canonical rollback SHA, failed preflight SHA, and immutable post snapshot. The plan audit proves 4,796 one-cell canonical guards plus 28 one-cell alternatives for exactly 14 declared points; undeclared oxidation fails closed. The policy-aware preflight passed 483,016/483,016 groups, the executable dry run completed 484,635/484,635 groups, and focused forward, rejection, property, hash, importer, and wrapper-propagation tests passed.

Prevention controls: RCS-003, RCS-004, RCS-011, RCS-016

- `data/world-review/town-expansion-r1-rollback-poststate-preflight-fullsource-20260728.json` — SHA-256 `76324ddfc56732ceb275f8e808a8170f2be38df5c3268f00ad310262eb02582a`
- `data/world-review/town-expansion-r1-atomic-transaction-full-source-restored-retry-20260728.json` — SHA-256 `042f445b097f52fbba795e59072084df8cbe60527e85330b3b6e7cb3902d3ec3`
- `data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy.json` — SHA-256 `c7ca7dd7dc510c788cc9e746f47189e6a6d72a2f5a3d27937a56775f52825634`
- `data/world-review/town-expansion-r1-rollback-poststate-policy-preflight-20260728.json` — SHA-256 `c8f0c80ce08a4445800ea2c5733d1422d8a80cf3c10cb42992f787c0f993b851`
- `data/world-review/town-expansion-r1-rollback-natural-transition-plan-audit-20260728.json` — SHA-256 `622460f97006c56f4811e387f6c8a21a32b58fb4e457032f4f8007ea82e2e4c3`
- `data/buildops/town-expansion-r1-2026-07-28.rollback-policy-dry-run.json` — SHA-256 `44c1ac67bf03a6176c4ad161fe8e0fea1ea9cf2390bbc0142868db5ea550accd`

### QA-20260728-02 — Town Expansion immutable-snapshot district map rendering

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T16:09:00Z

The first 1,178-camera render stopped on MAP-DISTRICT-DATA-DISTRICT-CONCORD-PASS-1 because the generated map was a uniform background image.

**Root cause:** A computed object-union center of 933.5,-442.5 was carried into Anvil cell lookups. Fractional block coordinates cannot resolve integer-addressed snapshot cells, so every lookup returned background.

**Impact:** The first media render was incomplete and produced no capture report; no media QA or publication could proceed.

**Resolution:** world_render.mjs now rounds map centers to integer Anvil cells before volume loading and labels the effective center. The formerly blank 864-block map rendered 955,082 bytes and was visually inspected before the complete media run restarted.

Prevention controls: RCS-003, RCS-011, RCS-012

- `scripts/world_render.mjs` — SHA-256 `f32f9ee57e451fe32052615305f0f24bdefe4d467edc983bdb831a44aa30e544`
- `data/exports/town-expansion-media-2026-07-28/capture-manifest.json` — SHA-256 `006d10c081dfb961ee0b2e1f234d960a7ee260de4918d4c5efb440b52398912c`
- `data/exports/town-expansion-media-2026-07-28/pass-1/maps/map-district-data-district-concord.png` — SHA-256 `21e1657be228e3d26392a63b3c08bb8f5341dd8b44ce1abc477087a09e691761`

### QA-20260728-03 — Ravensreach to MainStreet citizen commute after Town Expansion

Status: **OFFLINE_REPAIR_VERIFIED_LIVE_GATE_PENDING**  
Detected: 2026-07-28T16:13:00Z

The immutable post-release route survey found no complete normal-walk path on the authored Ravensreach-to-MainStreet commute, while the same route passed against the recovered pre-release snapshot.

**Root cause:** Town Expansion changed the route corridor. Six forward and six reverse route legs now have endpoints that are not standable, including the first break at the intended goal (-94,69,-305).

**Impact:** The five citizen bots remain offline and cross-city civic shifts remain held. No live route test, service start, or citizen acceptance is permitted until an exact post-state route passes bidirectionally without digging, parkour, or teleport shortcuts.

**Resolution:** Derived a new post-state perimeter/service-road alignment and bound it to immutable snapshot 1f036e48a82ccd5061e34686b049700e861b7a3bc99f69bd03ee3b1c1b2e463a. All 48 bounded legs pass offline in both directions over a 540-cell exact path with maximum one-block steps, minimum four-block headroom, no hazards, no block entities, no completed-building intersections, and no mining-zone intersections. Four narrow cells remain (widths 2,2,2,1), so the repair remains offline-only until a fresh same-moment survey and isolated bidirectional live walker pass before the five resident schedules are rebound.

Prevention controls: RCS-003, RCS-011, RCS-014, RCS-024

- `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json` — SHA-256 `465060102bf530632101db4a6e5c69c6b9dc8d3a5936db53c9cb6f40db2528e8`
- `data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png` — SHA-256 `ad1c3b8d80996a6c19220e56d3965b92b74b86be1c0bdb38947ad6385d8242e8`
- `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json` — SHA-256 `27c505aa8d8544102d06caa93ccda85f274aaae8bf3137ea40c92c72f3121151`
- `data/world-review/town-expansion-r1-citizen-route-qa-manifest-proposal-20260728.json` — SHA-256 `b0cbe4e2ef79e5fc54e23545cd642c56f634a981043233422aafa4a953c3ef15`
- `data/world-review/citizen-ravensreach-mainstreet-route-survey-livegate-20260728T1649Z.json` — SHA-256 `29722d87ff92a58487f00225cc3595827f6fa95cf32e3213e29396c5bade65f4`
- `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-livegate-20260728T1649Z.json` — SHA-256 `0eaea9b5e5e8f7e85cd6997d553161194b15d76264343c46f9995704ac1ee6a2`
- `data/world-review/citizen-ravensreach-mainstreet-route-map-livegate-20260728T1649Z.png` — SHA-256 `49053d5553b8c6966945daa5c97234f335b00101f031fc5b997cb1e8e35e2a82`
- `data/runtime-audits/citizen-route-live-walk-20260728T165823Z.json` — SHA-256 `8f808df6a3d577b1c636687686c76c0e080c4fc6fabfb0afd17b0f9e2c00aa5e`
- `data/runtime-audits/citizen-route-live-walk-20260728T171521Z.json` — SHA-256 `f32d9588c1010c02660d8339a4d75fffe039ec94c94aadf10827da63e215f18f`
- `docs/citizen-fleet/2026-07-28-postrelease-commute-repair.md` — SHA-256 `309679affedc112ccd25f1b1c6e42e8e77fad36dd2f8969ca3e3bc239f5ab8f9`

### QA-20260728-04 — Citizen route survey failure-report rendering

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T16:12:00Z

The first post-release citizen route survey crashed while attempting to render its failure map instead of emitting the expected blocked-route evidence.

**Root cause:** The failure-map renderer unconditionally dereferenced accepted.physicalWidth.belowThreeWide even though physicalWidth is null when no complete route exists.

**Impact:** The first survey invocation produced no terminal report, temporarily hiding the actual route obstruction.

**Resolution:** The survey renderer now treats physical-width evidence as optional and labels a failed survey as having no complete route. A rerun terminated normally and emitted the JSON report, patch proposal, and route map.

Prevention controls: RCS-011, RCS-013

- `scripts/survey_citizen_cross_city_route.mjs` — SHA-256 `7462ccea9155cce702d5088bf79739fd15232ac9b805d491ae61ecb9cd707c86`
- `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json` — SHA-256 `465060102bf530632101db4a6e5c69c6b9dc8d3a5936db53c9cb6f40db2528e8`
- `data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png` — SHA-256 `ad1c3b8d80996a6c19220e56d3965b92b74b86be1c0bdb38947ad6385d8242e8`

### QA-20260728-05 — Town Expansion C01 bunker high-level evidence-camera bindings

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T16:18:00Z

The media run first stopped on OBJECT-c01_east_l1_security_garage-PASS-1 and, after that shot was corrected, stopped again on OBJECT-c01_east_l2_living_adult-PASS-1. Both high-level scope cameras produced low-information wall/floor frames instead of the authored furnished spaces.

**Root cause:** The five deterministic C01 scope cameras were derived from broad outer bounds rather than bound to verified interior rooms. A blanket eye-height adjustment fixed coordinate convention but not post-fit-out occupancy or line of sight, so this is a class-wide high-level C01 camera-binding defect rather than a single garage frame.

**Impact:** Final post-state media acceptance, the database import, final dossier, Box publication, and Sites update were blocked until the full canonical 1,178-camera set passed quality and paired-evidence QA.

**Resolution:** All affected cameras were rebound to exact authored views and the rejected frames were preserved. The terminal v6 canonical renderer then passed all 1,178 captures with zero rejects. Independent paired-media QA passed all 589 shot pairs, all 1,178 files, all 13 map pairs, and all 340 exact database objects with finality ACCEPTED_POST_RELEASE_MEDIA.

Prevention controls: RCS-003, RCS-011, RCS-012

- `data/exports/town-expansion-media-2026-07-28/capture-manifest.json` — SHA-256 `006d10c081dfb961ee0b2e1f234d960a7ee260de4918d4c5efb440b52398912c`
- `data/exports/town-expansion-media-2026-07-28/pass-1/c01/object-c01-east-l1-security-garage.png` — SHA-256 `3ddc206c9bed64d5624c589b02a9d190183996a2a70fcc945b8f041ed1fcf030`
- `data/world-review/archive/town-expansion-media-rejected-captures-20260728/object-c01-east-l2-living-adult-pass-1-rejected-f72a7553.png` — SHA-256 `f72a755375c942147fc4c922a2c3aeb86c0aeae60a8d907643f57607d28ccf5d`
- `data/world-review/archive/town-expansion-media-rejected-captures-20260728/object-c01-east-l2-living-adult-pass-1-rejected-f72a7553.json` — SHA-256 `81701e7bf084795275f672ed1bec7a9652f6c58e0e8b9e922526ccad5cfa8a93`
- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-c01_owner_tunnel_detour-PASS-1-raw-75e51427f2c4.png` — SHA-256 `75e51427f2c40af54d541bb2c2496710090f918b95550a6485cecd7f4c574d93`
- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-c01_owner_tunnel_detour-PASS-1-raw-75e51427f2c4.json` — SHA-256 `17daf18f31c13045c618d3656eba1d2fae4bceedd896d61b1dc29cbf26122af7`
- `data/world-review/town-expansion-c01-camera-preflight-20260728.json` — SHA-256 `403ae0f3c4d27c0312ca5854327a00c75707c8d4d8cbdc388b4c6344236e3bf4`
- `data/buildops/town-expansion-r1-2026-07-28.report.json` — SHA-256 `d855d0072a213c27ebedc2b36ec53761363568e9de963650a8563a9179d81930`
- `data/exports/town-expansion-media-2026-07-28/terminal-c39d-render-v6/capture-report.json` — SHA-256 `0616b33895d7452713bff02b3045bafc8f85a2602b1dae9708c25b5574b7c86b`
- `data/world-review/town-expansion-r1-post-release-media-2026-07-28.json` — SHA-256 `e9a287f9c2536ae81701604bd2232262ecb04a4567606da030baf833bfa01226`

### QA-20260728-06 — Redevelopment incident knowledge-base source classification

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T16:19:00Z

The new fractional-center media defect was initially appended to the incidents array instead of postQaDefects, causing the declared five-incident count to disagree with the six rows parsed by the KB builder.

**Root cause:** The manual JSON edit used the wrong sibling collection. The source-level count assertion correctly rejected the malformed classification before the SQLite database was replaced.

**Impact:** The canonical SQLite and Markdown ledger remained at the earlier valid revision until the source classification was corrected; no invalid database was published.

**Resolution:** Moved QA-20260728-02 into postQaDefects, retained the exact rollback incident count of five, and rebuilt the database only after count, foreign-key, artifact, and integrity checks passed.

Prevention controls: RCS-003, RCS-013, RCS-015

- `data/knowledge-base/redevelopment-release-incidents.json` — SHA-256 `7eae9d7b39c607f7a686554725ab37ea3021642eb85ba14db79076bdf5c97b41`
- `scripts/build_redevelopment_kb.mjs` — SHA-256 `92d8d5ca58355dc0f80371687917e71d8936b41e6b244a10504d939e4a2994cb`

### QA-20260728-07 — MC Fleet World Atlas Sites production runtime

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T02:54:31Z

Sites version 3 returned Cloudflare Worker Error 1101 with Ray ID a2209982e8a31497 at the production URL.

**Root cause:** The deployed OpenNext worker retained an unsupported runtime require() dependency instead of bundling the worker dependency into the deployment artifact.

**Impact:** The production atlas root route was unavailable until a corrected version was deployed.

**Resolution:** Sites version 4 bundled the OpenNext worker, retained owner-only access, and returned HTTP 200 on the production root route at 03:03:26Z with Ray ID a220a6915909f4e6.

Prevention controls: RCS-003, RCS-011, RCS-018

- `docs/redevelopment/2026-07-28-town-expansion/external-publication-audit.json` — SHA-256 `939f3af849ede6f8c99ac1f9987d7df00776de42ff64ff641180465e33d57388`

### QA-20260728-08 — MC Fleet World Atlas favicon asset

Status: **IMPLEMENTED_PRODUCTION_VERIFICATION_BLOCKED**  
Detected: 2026-07-28T03:03:26Z

The healthy Sites version 4 production worker returns HTTP 404 for /favicon.ico.

**Root cause:** The deployed site bundle does not currently include a favicon at the conventional root asset path.

**Impact:** The atlas root route is healthy and usable, but browsers and crawlers generate a nonfatal missing-asset request and the publication is not asset-complete.

**Resolution:** Sites version 6 includes an explicit /favicon.ico route, metadata binding, and SVG brand asset. The local production build returns HTTP 200 with image/svg+xml. Anonymous production verification is blocked because workspace policy forces the ChatGPT Sites access layer to return HTTP 401 before the application route.

Prevention controls: RCS-011, RCS-018

- `docs/redevelopment/2026-07-28-town-expansion/external-publication-audit.json` — SHA-256 `939f3af849ede6f8c99ac1f9987d7df00776de42ff64ff641180465e33d57388`
- `docs/redevelopment/2026-07-28-town-expansion/external-publication-closeout.json` — SHA-256 `296723abac11b35fcbdc04c146488c1633022d08c0e42a3a6ae5ad601ea5078f`

### QA-20260728-09 — Predecessor R1 release-manifest correctness

Status: **HISTORICAL_NOT_REEXECUTED**  
Detected: 2026-07-28T01:52:00.985Z

A retrospective review passed four of five predecessor R1 packages but rejected bunker Phase 1.

**Root cause:** Two guarded birch-fence operations omitted complete block properties and five forward/rollback pairs were not exact inverses.

**Impact:** This did not create a new rollback and is not the current Town Expansion package, but it is retained as historical evidence that predecessor bytes were not fully release-grade.

**Resolution:** The Town Expansion compiler uses complete canonical states and exact inverse checks. The predecessor package remains historical and must not be reused without regeneration.

Prevention controls: RCS-003, RCS-004, RCS-015

- `data/world-review/redevelopment-r1-release-manifest-retrospective-qa.json` — SHA-256 `6233c3f79993764cdca8c08a8eddacb608996e269bb99c5669fe585613304d39`

### QA-20260728-10 — Town Expansion representative route network

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T17:06:40.560Z

Whole-program offline route QA passes 14 of 22 representative routes and 28 of 44 directions; eight routes fail in both directions.

**Root cause:** One C01 mountain route used a retired portal contract. Seven physical builds have real disconnected stairs, ramps, thresholds, bulkheads, or vertical components across C01, Westlight, the MainStreet warehouse, and the observatory estate/portal hub.

**Impact:** Final Town Expansion acceptance, final dossier, Box publication, and Sites update are blocked even though all four isolation assertions and every Data District/Concord route pass.

**Resolution:** Committed the corrected 1,526-cell exact-guarded accessibility package on attempt 2 after recovering attempt 1. The terminal as-built report is bound to the final 30-region snapshot, contains no projection or overlay, passes 22 of 22 routes and 44 of 44 directions, preserves all four isolation assertions, and satisfies the hardened final-verifier identity contract.

Prevention controls: RCS-011, RCS-021

- `data/world-review/town-expansion-r1-post-release-route-qa-2026-07-28.json` — SHA-256 `9317268186520ccffe0492db3441a96a3a514c2cf4e325ca2bfa84dcc9cb63e1`
- `docs/redevelopment/2026-07-28-town-expansion/town-expansion-post-release-route-qa.md` — SHA-256 `c01c94593edf7c4702c19c5acbd5b708717143487769b6941e90c8f5eab61551`
- `docs/redevelopment/2026-07-28-town-expansion/town-expansion-representative-route-manifest.json` — SHA-256 `a63914ef2e8321db17e18552f3962394fda8387ddde3f279d535b2b22ceb42bf`
- `data/world-review/town-expansion-r1-accessibility-repair-atomic-transaction-attempt2-20260728.json` — SHA-256 `06a4a66570d19f8a231a6adcb281b43ac957320cca1ccdcabc983bc989492cca`
- `docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-as-built-route-manifest.json` — SHA-256 `111deb36876c28056d4c0dc034ad660390b73594e6553a4f09fa54021bf83977`
- `data/world-review/town-expansion-r1-accessibility-repair-as-built-route-qa-20260728.json` — SHA-256 `1bb95c5542376c1a3c9828181520f93cf32b0d910a8873c1a03d1dcb70d75914`
- `docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-as-built-route-qa.md` — SHA-256 `37cbc9a15e8aec6367e0865e32cae0b72811690415985abf6dbf7e3783a70d7f`

### QA-20260728-11 — Redevelopment KB fail-closed evidence validation

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T16:35:00Z

Independent review found that the first KB builder treated missing artifacts as informational, did not semantically validate transaction/recovery JSON, permitted generated-output self-reference, and did not detect inputs changing during construction.

**Root cause:** The first builder validated SQLite structure and counts but not the full evidence contract.

**Impact:** An incomplete or semantically inconsistent evidence bundle could have been labeled PASS even though the current published revision happened to have no missing files.

**Resolution:** The builder now rejects missing evidence before database construction, validates transaction status/start/package linkage and recovery status/group counts, forbids generated KB outputs as input evidence, rehashes source and evidence before atomic replacement, and maintains a separate occurrence ledger.

Prevention controls: RCS-015, RCS-019, RCS-020

- `data/knowledge-base/redevelopment-release-incidents.json` — SHA-256 `7eae9d7b39c607f7a686554725ab37ea3021642eb85ba14db79076bdf5c97b41`
- `scripts/build_redevelopment_kb.mjs` — SHA-256 `92d8d5ca58355dc0f80371687917e71d8936b41e6b244a10504d939e4a2994cb`

### QA-20260728-12 — Town Expansion base-to-supplement release provenance chain

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T18:04:40Z

The earlier final verifier and database importer bound only the base transaction and could ignore the committed accessibility and citizen-clearance supplements. After supplemental support was added, fail-closed continuity correctly rejected the byte-different base post and accessibility source snapshots.

**Root cause:** The release model assumed one immutable post snapshot and one transaction. It did not model ordered, independently reversible supplements or require base-post to supplement-source continuity.

**Impact:** Final acceptance and database import were blocked until a policy-aware base rollback proof was bound to the preserved logical source and the complete base-to-supplement chain was continuous.

**Resolution:** The terminal-recovery supplement now preserves distinct logical and physical source identities. A carpet-recovered logical source overlay plus a copper-only transition policy passed the complete 483,016-group base rollback preflight. Final post-release QA accepted the ordered base plus three supplemental transactions, five packages, terminal snapshot, route evidence, and all 1,178 media captures; the guarded database importer accepted the same chain.

Prevention controls: RCS-003, RCS-011, RCS-019, RCS-023

- `scripts/qa_town_expansion_post_release.mjs` — SHA-256 `7e37c8b53582163de643e186d0f4064a29008fabe75d87f72e1987fcf84f83d6`
- `scripts/import_town_expansion_release.mjs` — SHA-256 `1bccaf9638af8eb841a3587b28b6d6784aba36dc55846fd19561342f1d3a0e20`
- `data/world-review/town-expansion-r1-accessibility-repair-atomic-transaction-attempt2-20260728.json` — SHA-256 `06a4a66570d19f8a231a6adcb281b43ac957320cca1ccdcabc983bc989492cca`
- `data/world-review/citizen-route-live-walk-leaf-clearance-atomic-transaction-20260728.json` — SHA-256 `9a91d74795a940d47b5bbbd73efb9b3d8967ffbc6804e3523b8500cf8294599a`
- `data/world-review/town-expansion-r1-base-rollback-preflight-accessibility-source-20260728.json` — SHA-256 `806544a2e2af87e35180ef10d9cb35cce093e118f80b935ae5bc67df232efcf3`
- `data/world-review/town-expansion-terminal-provenance-and-ridge-recovery-committed-supplement-20260728T1839Z.json` — SHA-256 `b04ad4165449659d4233aa5e67c1490daf9a17ff6b65cbf41161b97532b584dc`
- `data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy-carpet-recovered-logical-source.json` — SHA-256 `d2d3529f9f7a932a843a8583136df83b5cd2ca33ab08830334e554ec807e858a`
- `data/world-review/town-expansion-r1-base-rollback-policy-preflight-carpet-recovered-logical-source-20260728.json` — SHA-256 `dbae24353312cc4dd24a34618975706c0cc002e239ae0f5f32d480c909c8d730`
- `data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json` — SHA-256 `7200a6d23e838d80f1c21fb5585a72434103056c71793073d68918885f083672`
- `data/world-review/town-expansion-r1-database-closeout-2026-07-28.json` — SHA-256 `b6e61582e8806d965e2e2c5a521b4b11c68136aee5f96f24ff7689ab695ec646`

### QA-20260728-13 — Five-citizen post-restart lifecycle acceptance

Status: **OPEN_RUNTIME_REMEDIATION_REQUIRED**  
Detected: 2026-07-28T19:04:38.121Z

The first read-only observer failed closed before sampling on a stale route/snapshot default. After that contract was rebound, the complete twenty-minute observation still failed structured work/life, reviewed-corridor, and no-stuck-loop gates.

**Root cause:** All five residents begin in embedded or isolated cottage positions that are not connected to the 49-point route origin by the certified no-dig movement model. Direct moves to the origin time out, so exact outbound/return and local-life completions never materialize while generic work retries recur.

**Impact:** Citizen lifecycle acceptance remains open. The healthy single systemd process, exact identities and roles, packet health, advancing town brain, day/night coverage, and absence of security or worker replacement events do not substitute for successful local work/life outcomes and five exact round trips.

**Resolution:** Unresolved: no runtime lifecycle remediation is accepted. A proposed version-3 producer paired with the deployed version-2 consumer, without an executor for local routine contracts, was identified as an unsafe source design, removed before build or restart, and never deployed. Before another restart, each cottage must have a proved no-dig connection or an independently authorized safe staging plan; producer, blackboard, worker, executor, observer, build, systemd, snapshot, route, path, and config identities must pass one fail-closed pre-restart envelope. A fresh complete observation must then pass before this defect can be closed.

Prevention controls: RCS-014, RCS-020, RCS-024, RCS-025, RCS-026

- `data/runtime-audits/citizen-post-restart-observation-20260728T190438Z.json` — SHA-256 `3ede7acfdf0041faf9107cd822fdec6b0a318231066ea48bc0175df46d5a9efe`
- `data/runtime-audits/citizen-post-restart-observation-20260728T190438Z.md` — SHA-256 `06f74ad304dc4da8d8093dcebc7fb3d385a96f2ad3db9ded2e4be6af1fd6e4ce`
- `data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.json` — SHA-256 `14dfb14b9dd01928c2a4a446b5318264fcc1def54dcff60355a0d37d77619182`
- `data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.md` — SHA-256 `9f8f71dac5581cdf085fdf770468abfb562568cd9a70dadccf5df713eb3897d8`

### QA-20260728-14 — Town Expansion complete media quality verification memory use

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T20:49:42Z

Two complete resume-verification attempts were OOM-killed after native image surfaces grew to approximately 14.3 and 14.9 GB resident memory.

**Root cause:** The quality verifier allocated a new canvas-backed Image and canvas for every PNG. Native surfaces accumulated outside the JavaScript heap and a second measurement pass doubled work for reused captures.

**Impact:** The media render could not reach a durable complete report and twice exhausted host memory; the live world and database were not mutated.

**Resolution:** The verifier now serializes all measurements through one reusable Image, canvas, and context, and the renderer reuses cached nonblank quality. Exact quality metrics matched 205 prior batch records with zero drift. The canonical resume completed under a 2 GB systemd scope at 182,480 KB peak RSS, passed 1,178 captures, and independent media QA accepted every file.

Prevention controls: RCS-003, RCS-011, RCS-013, RCS-027

- `data/world-review/town-expansion-media-render-memory-remediation-20260728.json` — SHA-256 `89b51b89853aca90625e56f5ccd0c33e97816c8b2420171e80713deee589373e`
- `scripts/lib/media_image_quality.mjs` — SHA-256 `bb2d6a96a38476fd36456e02cb195f55497cd26a8826cdac343835b2bb2594e8`
- `scripts/render_redevelopment_camera_manifest.mjs` — SHA-256 `b80e30b16cf43441fcd8470e93ae9e3772232bb5598642cc287869b1ffb5b8cb`
- `test/build/mediaImageQuality.test.ts` — SHA-256 `6da99b7aeeb5c1cf4f97744c91a313ce10c91f6608998150fdde73f8535f8b8b`
- `test/build/renderRedevelopmentCameraManifestResume.test.ts` — SHA-256 `35617389d75dcded2e03d7ee61aebeef2c0782166fc85b28aa467f0132a57c24`
- `data/exports/town-expansion-media-2026-07-28/terminal-c39d-render-v6/capture-report.json` — SHA-256 `0616b33895d7452713bff02b3045bafc8f85a2602b1dae9708c25b5574b7c86b`
- `data/world-review/town-expansion-r1-post-release-media-2026-07-28.json` — SHA-256 `e9a287f9c2536ae81701604bd2232262ecb04a4567606da030baf833bfa01226`

### QA-20260728-15 — Town Expansion media and consolidated-QA evidence contracts

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T21:03:28Z

The first otherwise complete v6 report encoded perspective FOV on map captures, and the first consolidated QA rerun could not resolve relative capture outputs beside the bound renderer report.

**Root cause:** The renderer applied its perspective-camera FOV default to map records, while the consolidated verifier resolved relative capture paths from the repository root instead of the renderer report directory.

**Impact:** Media QA and then consolidated release QA failed closed despite complete, valid PNG bytes.

**Resolution:** Map records now carry null FOV and the consolidated verifier resolves relative capture outputs beside the bound renderer report. Regression tests cover both contracts. Media QA passed 1,178 of 1,178 files and final post-release QA passed all twelve release gates.

Prevention controls: RCS-003, RCS-011, RCS-013, RCS-028

- `data/world-review/town-expansion-capture-report-map-fov-contract-fail-20260728T2103Z.json` — SHA-256 `40473dd56670ccabd36b2a7c2e86b25f9d0a1d9f4a131a0352416a69c2e4f692`
- `data/world-review/town-expansion-r1-post-release-media-contract-fail-20260728T2104Z.json` — SHA-256 `aacb1d8fa39ecc134593e0dbcba90e3c2697f1e920eda1ef240b54774d15685e`
- `data/world-review/town-expansion-r1-post-release-qa-media-path-contract-fail-20260728T2107Z.json` — SHA-256 `313490d99ac113e0161a6685ba4180272d8ceac34a59e199af2bbe38a19fd794`
- `scripts/render_redevelopment_camera_manifest.mjs` — SHA-256 `b80e30b16cf43441fcd8470e93ae9e3772232bb5598642cc287869b1ffb5b8cb`
- `scripts/qa_town_expansion_post_release.mjs` — SHA-256 `7e37c8b53582163de643e186d0f4064a29008fabe75d87f72e1987fcf84f83d6`
- `test/build/renderRedevelopmentCameraManifestResume.test.ts` — SHA-256 `35617389d75dcded2e03d7ee61aebeef2c0782166fc85b28aa467f0132a57c24`
- `test/build/qaTownExpansionPostRelease.test.ts` — SHA-256 `522a03289ca77806180bd5b2f25932b0cb9e7ecec9aeba9d852aba40490ebbe1`
- `data/world-review/town-expansion-r1-post-release-media-2026-07-28.json` — SHA-256 `e9a287f9c2536ae81701604bd2232262ecb04a4567606da030baf833bfa01226`
- `data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json` — SHA-256 `7200a6d23e838d80f1c21fb5585a72434103056c71793073d68918885f083672`

### QA-20260728-16 — Town Expansion independent database publication census

Status: **RESOLVED_VERIFIED**  
Detected: 2026-07-28T21:10:57Z

The first post-import census rejected valid explicit parent links because it required parent external IDs to be globally unique across historical projects.

**Root cause:** The census treated external IDs as globally unique even though the imported relationship contract is scoped to the Town Expansion registry and project.

**Impact:** The atomic database import remained valid and integrity-clean, but publication was blocked by a false parent-scope failure.

**Resolution:** In-registry parent IDs now resolve within the Town Expansion project; only external parents require global uniqueness. A legacy duplicate-ID regression was added. The independent census passes exactly 340 features, one accepted scan, 340 observations, and 1,152 media relations with zero failures.

Prevention controls: RCS-003, RCS-019, RCS-029

- `data/world-review/town-expansion-r1-database-publication-report-parent-scope-contract-fail-20260728T2110Z.json` — SHA-256 `f5df03f25c9e75f6af99e0edbb47665f3921348bc240a97983bf63ac8ea3d0aa`
- `scripts/report_town_expansion_database.mjs` — SHA-256 `9e49362b24cc90beb967dcbabeee0b44fd20e69704cd5b2b28119dbf85a9a49b`
- `test/build/importTownExpansionRelease.test.ts` — SHA-256 `c0330a507fe64f6cbb69192fc38c9c23d3335332c07e4ab81a385deb637ce0d5`
- `data/world-review/town-expansion-r1-database-closeout-2026-07-28.json` — SHA-256 `b6e61582e8806d965e2e2c5a521b4b11c68136aee5f96f24ff7689ab695ec646`
- `data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json` — SHA-256 `131cee67ad5bc4177f980ca8e7d79ccfa25dde952250faf27b7447e3a034031c`

### QA-20260728-17 — MC Fleet World Atlas internet-public access

Status: **EXTERNAL_ADMIN_BLOCKED**  
Detected: 2026-07-28T21:49:00Z

The source-pinned Sites version 6 deployment succeeded, but the requested internet-public access mode was rejected by workspace policy.

**Root cause:** Publishing Sites to the internet is disabled for this workspace. The project remains owner-only at the platform layer even though the application has its own ten-digit PIN gate.

**Impact:** Anonymous visitors receive the ChatGPT Sites HTTP 401 access layer before the application PIN. The deployed atlas is healthy for the allowed owner, and the separate Box handoff is remotely verified.

**Resolution:** A workspace administrator must enable internet-public Sites. After that external policy change, set the existing project to public and verify anonymous root, favicon, icon, incorrect-PIN, correct-PIN, and authenticated-atlas responses without changing the accepted content package.

Prevention controls: RCS-003, RCS-018, RCS-030

- `docs/redevelopment/2026-07-28-town-expansion/external-publication-closeout.json` — SHA-256 `296723abac11b35fcbdc04c146488c1633022d08c0e42a3a6ae5ad601ea5078f`

## Error and failure occurrence ledger

Occurrence rows retain repeated attempts and child failures without inflating
the unique rollback-incident or QA-defect counts.

| Occurrence | Time | Parent | Category | Status |
|---|---|---|---|---|
| OCC-20260727-001 | 2026-07-27T23:06:19Z | incident:RED-20260727-01 | forward-release-failure | FAILED_COMPENSATED |
| OCC-20260728-002 | 2026-07-28T13:28:28Z | incident:TOWN-20260728-01 | forward-release-failure | FAILED_RECOVERED_PREFIX |
| OCC-20260728-003 | 2026-07-28T14:02:41Z | incident:TOWN-20260728-02 | forward-release-failure | FAILED_RECOVERED_PREFIX |
| OCC-20260728-004 | 2026-07-28T14:51:56Z | incident:TOWN-20260728-03 | forward-release-failure | FAILED_RECOVERED_PREFIX_WITH_LATENT_DRIFT |
| OCC-20260728-005 | 2026-07-28T15:17:00Z | incident:TOWN-20260728-04 | forward-release-failure | FAILED_FULLY_ROLLED_BACK |
| OCC-20260728-006 | 2026-07-28T16:05:00Z | qa-defect:QA-20260728-01 | rollback-readiness | FAILED_THEN_RESOLVED |
| OCC-20260728-007 | 2026-07-28T16:09:00Z | qa-defect:QA-20260728-02 | media-map-render | FAILED_THEN_RESOLVED_WITH_EVIDENCE_GAP |
| OCC-20260728-008 | 2026-07-28T09:28:15.503Z | wip-family:WIP-CITIZEN-LIVE-ROUTE | iterative-citizen-live-route | 13_FAIL_1_PASS_PRE_TOWN_EXPANSION |
| OCC-20260728-009 | 2026-07-28T16:58:23.844Z | qa-defect:QA-20260728-03 | citizen-live-route | FAILED_REVERSE_CROWN |
| OCC-20260728-010 | 2026-07-28T17:15:21.120Z | qa-defect:QA-20260728-03 | citizen-live-route | FAILED_NO_PROGRESS_FALLBACK_SCOPE |
| OCC-20260728-025 | 2026-07-28T17:26:25.138Z | qa-defect:QA-20260728-03 | citizen-live-route | FAILED_STAGING_FROM_PRIOR_SHOULDER |
| OCC-20260728-026 | 2026-07-28T17:32:16Z | incident:TOWN-20260728-05 | accessibility-repair-semantic-noop | FAILED_THEN_PREFIX_RECOVERED |
| OCC-20260728-027 | 2026-07-28T17:23:00Z | qa-defect:QA-20260728-05 | media-camera-quality | FAILED_THEN_RESOLVED |
| OCC-20260728-028 | 2026-07-28T18:04:33.321Z | qa-defect:QA-20260728-03 | citizen-live-route | FORWARD_PASS_REVERSE_CROWN_FAIL |
| OCC-20260728-029 | 2026-07-28T18:09:00Z | qa-defect:QA-20260728-05 | media-camera-quality | FAILED_REMEDIATION_IN_PROGRESS |
| OCC-20260728-030 | 2026-07-28T19:04:38.121Z | qa-defect:QA-20260728-13 | citizen-observer-contract-identity | FAILED_CLOSED_ZERO_SAMPLES |
| OCC-20260728-031 | 2026-07-28T19:25:09.741Z | qa-defect:QA-20260728-13 | citizen-lifecycle-observation | FAIL_RUNTIME_LIFECYCLE_UNRESOLVED |
| OCC-20260728-011 | 2026-07-28T16:12:00Z | qa-defect:QA-20260728-04 | qa-failure-renderer | CRASHED_THEN_RESOLVED_WITH_EVIDENCE_GAP |
| OCC-20260728-012 | 2026-07-28T16:18:00Z | qa-defect:QA-20260728-05 | media-camera-quality | FAILED_THEN_RESOLVED_WITH_EVIDENCE_GAP |
| OCC-20260728-013 | 2026-07-28T16:30:00Z | qa-defect:QA-20260728-05 | media-camera-quality | FAILED_THEN_RESOLVED |
| OCC-20260728-014 | 2026-07-28T17:02:18Z | qa-defect:QA-20260728-05 | media-camera-quality | FAILED_THEN_RESOLVED |
| OCC-20260728-015 | 2026-07-28T16:19:00Z | qa-defect:QA-20260728-06 | kb-classification | REJECTED_BEFORE_REPLACEMENT |
| OCC-20260728-016 | 2026-07-28T02:54:31Z | qa-defect:QA-20260728-07 | sites-runtime | ERROR_1101_RESOLVED |
| OCC-20260728-017 | 2026-07-28T03:03:26Z | qa-defect:QA-20260728-08 | sites-static-asset | IMPLEMENTED_PRODUCTION_VERIFICATION_BLOCKED |
| OCC-20260728-018 | 2026-07-28T01:52:00.985Z | qa-defect:QA-20260728-09 | historical-manifest-correctness | HISTORICAL_FAILURE |
| OCC-20260728-019 | 2026-07-28T17:06:40.560Z | qa-defect:QA-20260728-10 | representative-route-disconnects | 8_OF_22_FAILED |
| OCC-20260728-020 | 2026-07-28T16:35:00Z | qa-defect:QA-20260728-11 | kb-evidence-contract | RESOLVED_VERIFIED |
| OCC-20260728-021 | 2026-07-28T15:43:00Z | wip-family:WIP-ENTITY-CLEARANCE | entity-clearance-and-relocation-gates | RESOLVED_FOR_FINAL_COMMIT |
| OCC-20260728-022 | 2026-07-28T12:00:00Z | wip-family:WIP-PROGRAM-INTEGRATION | pre-release-program-integration | SUPERSEDED_BY_FINAL_COMPILER |
| OCC-20260728-023 | 2026-07-28T08:25:00Z | wip-family:CITIZEN-SAFETY-HOLD | citizen-activation-hold | SAFETY_HOLD_NOT_ROLLBACK |
| OCC-20260728-024 | 2026-07-28T08:00:00Z | wip-family:DATABASE-EXPECTED-HOLD | pre-database-expected-hold | RESOLVED_BY_IMPORT_NOT_DEFECT |
| OCC-20260728-032 | 2026-07-28T20:49:42Z | qa-defect:QA-20260728-14 | media-verifier-native-memory | OOM_KILLED |
| OCC-20260728-033 | 2026-07-28T20:53:01Z | qa-defect:QA-20260728-14 | media-verifier-native-memory | OOM_KILLED |
| OCC-20260728-034 | 2026-07-28T21:03:28Z | qa-defect:QA-20260728-15 | media-map-camera-contract | FAILED_CLOSED_THEN_RESOLVED |
| OCC-20260728-035 | 2026-07-28T21:07:39Z | qa-defect:QA-20260728-15 | media-relative-path-contract | FAILED_CLOSED_THEN_RESOLVED |
| OCC-20260728-036 | 2026-07-28T21:10:57Z | qa-defect:QA-20260728-16 | database-parent-scope-contract | FAILED_CLOSED_THEN_RESOLVED |
| OCC-20260728-037 | 2026-07-28T21:49:00Z | qa-defect:QA-20260728-17 | sites-workspace-access-policy | EXTERNAL_ADMIN_BLOCKED |

### OCC-20260727-001

MainStreet guarded execution failed after Westlight and Raven Rock committed, initiating three reverse-order component rollbacks.

Evidence disposition: Immutable failed execution report retained.

- `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.execution.json` — SHA-256 `d2f90aece46fcf1fbabca6666dbd755125704c46ade3522fc364aedb9cbbf410`

### OCC-20260728-002

Obsolete-hash Town Expansion stopped at line 19 after ten accepted groups.

Evidence disposition: Immutable archived failed execution retained.

- `data/world-review/archive/town-expansion-r1-failed-attempts-20260728/forward-execution-attempt-132734.json` — SHA-256 `00c3b25be157509fc65860b9acea370fc800ed205d7cc10c337f772e1666be96`

### OCC-20260728-003

Frozen-rebase Town Expansion stopped at line 22 after thirteen accepted groups.

Evidence disposition: Immutable archived failed execution retained.

- `data/world-review/archive/town-expansion-r1-rebase-failed-attempt-20260728T1401Z/town-expansion-r1-2026-07-28.execution.json` — SHA-256 `535f10e931848f9b708c76ab5cd977d3573f75bae4765b7ce2df740e61aa90d0`

### OCC-20260728-004

Complete-state Town Expansion stopped at line 144 after 123 groups; the failed group still caused reactive short-grass drift.

Evidence disposition: Immutable archived failed execution retained.

- `data/world-review/archive/town-expansion-r1-paper-strict-predecessor-failed-attempt-20260728T1451Z/town-expansion-r1-2026-07-28.execution.json` — SHA-256 `14e3cf5896f528dd330e66a682e0bdcb0c232e07447c18a9e62ae5c0de0dac46`

### OCC-20260728-005

Paper-strict top-down Town Expansion stopped at line 140 after 119 groups because two short-grass source cells were absent.

Evidence disposition: Standalone failed report was overwritten; immutable transaction ledger embeds the original report and hash.

- `data/world-review/town-expansion-r1-atomic-transaction-topdown-strict-final-20260728.json` — SHA-256 `9af2f3fec0cfd0fba1dd326c12a93aaf91c2fdda4015d5e26a1a0b2e2f9d9550`

### OCC-20260728-006

First committed-post rollback preflight failed two groups after fourteen copper cells oxidized.

Evidence disposition: Failed preflight and corrected policy-aware preflight are both retained.

- `data/world-review/town-expansion-r1-rollback-poststate-preflight-fullsource-20260728.json` — SHA-256 `76324ddfc56732ceb275f8e808a8170f2be38df5c3268f00ad310262eb02582a`
- `data/world-review/town-expansion-r1-rollback-poststate-policy-preflight-20260728.json` — SHA-256 `c8f0c80ce08a4445800ea2c5733d1422d8a80cf3c10cb42992f787c0f993b851`

### OCC-20260728-007

Fractional map center produced a blank Data District map before integer-center rendering was implemented.

Evidence disposition: Original blank PNG was overwritten before immutable archiving; corrected PNG is retained and the gap is explicit.

- `data/exports/town-expansion-media-2026-07-28/pass-1/maps/map-district-data-district-concord.png` — SHA-256 `21e1657be228e3d26392a63b3c08bb8f5341dd8b44ce1abc477087a09e691761`
- `scripts/world_render.mjs` — SHA-256 `f32f9ee57e451fe32052615305f0f24bdefe4d467edc983bdb831a44aa30e544`

### OCC-20260728-008

Fourteen pre-Town-Expansion citizen live-walk attempts were retained: thirteen iterative failures followed by one bidirectional pass.

Evidence disposition: All fourteen terminal audit JSON files are retained; they are repeated occurrences, not fourteen unique defects.

- `data/runtime-audits/citizen-route-live-walk-20260728T075821Z.json` — SHA-256 `fb5091b2321479512ff015b82023b43682a9c75cc0fa61cceef047039ff6cab9`
- `data/runtime-audits/citizen-route-live-walk-20260728T081120Z.json` — SHA-256 `888442e3da721e821274509320e6d17c91a6ffe050f45c8c7b99c4e02dc77a7a`
- `data/runtime-audits/citizen-route-live-walk-20260728T081409Z.json` — SHA-256 `ae8034d8d2af1f59d3593dc6c550fb67c38bb77cf90b17d72235e27ba6af5bff`
- `data/runtime-audits/citizen-route-live-walk-20260728T081735Z.json` — SHA-256 `ae3489d03783a7d2667d8f7e1ea360ab0442eefbcba993a49cad17a2f498946d`
- `data/runtime-audits/citizen-route-live-walk-20260728T083423Z.json` — SHA-256 `09aaf9d3e05e062c55dabf97a71c3af5d73546ba798f94619e62f467b0899ebf`
- `data/runtime-audits/citizen-route-live-walk-20260728T083939Z.json` — SHA-256 `e9d264944686662d4a25a44a81e0553e3fc7373e6afc8d8cb60a0cfc5b0fce50`
- `data/runtime-audits/citizen-route-live-walk-20260728T085234Z.json` — SHA-256 `6f367d6548c3a7f974bbace3d8bed98c878239b5516fb1641685fe7c998dc5a1`
- `data/runtime-audits/citizen-route-live-walk-20260728T090015Z.json` — SHA-256 `404a1c7cde1ac3463a2593ead5f1a42c133f5e39f983c502c849e634f64978ce`
- `data/runtime-audits/citizen-route-live-walk-20260728T090523Z.json` — SHA-256 `6b4ad865ade04b4a827783527ce0693c858aaa525dec7f44c4901c156bbace92`
- `data/runtime-audits/citizen-route-live-walk-20260728T090823Z.json` — SHA-256 `36af29ed14456a74969c4e8fc1d46837d7db573c8decbad207a1bbf66d79e15c`
- `data/runtime-audits/citizen-route-live-walk-20260728T091235Z.json` — SHA-256 `404c34b139b1e675c1b014034935978c43d7b492a749fccf52f4b0814fa106c1`
- `data/runtime-audits/citizen-route-live-walk-20260728T091945Z.json` — SHA-256 `9651bcc4e80f20b011d1e63dd961997b207d29f58424ae2e2518c8c9db7f9695`
- `data/runtime-audits/citizen-route-live-walk-20260728T092815Z.json` — SHA-256 `68f701830b37253877df19fea70d0ee2e03e63249bb93ef5262afd662afadb47`

### OCC-20260728-009

Fresh-post route passed all 49 forward checkpoints but reverse checkpoint 13 failed twice at the road crown; no dig or security incident occurred.

Evidence disposition: Immutable terminal live audit retained.

- `data/runtime-audits/citizen-route-live-walk-20260728T165823Z.json` — SHA-256 `8f808df6a3d577b1c636687686c76c0e080c4fc6fabfb0afd17b0f9e2c00aa5e`

### OCC-20260728-010

The first no-progress fallback fixed the short crown lip but fired while a 100-block path was still planning, leaving the route shoulder and failing forward checkpoint 25.

Evidence disposition: Immutable terminal live audit retained; fallback was subsequently restricted to nearby final lips.

- `data/runtime-audits/citizen-route-live-walk-20260728T171521Z.json` — SHA-256 `f32d9588c1010c02660d8339a4d75fffe039ec94c94aadf10827da63e215f18f`

### OCC-20260728-025

After the preceding long-route fallback left Surveyor on a route shoulder, both bounded staging attempts from [-79,68,-32] to [-82,65,-19] timed out without moving.

Evidence disposition: Immutable terminal live audit retained; shifts remain paused while the physical/pathfinder cause is diagnosed.

- `data/runtime-audits/citizen-route-live-walk-20260728T172625Z.json` — SHA-256 `312230535af3d571d76ac4738ea5a46d26782c93c2ba3c8e467f62f1bfa9eb60`

### OCC-20260728-026

Accessibility repair attempt 1 stopped at source group 567 after 566 writes because source and replacement were the same stair state with different property ordering.

Evidence disposition: Failed execution, journal-proven prefix recovery, fresh recovery preflight, and source-restored full-package preflight are retained.

- `data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.execution.json` — SHA-256 `f8066bda40c094a54e9ac8dba44a9ff0fde1d3ce9a21b35a18752894949961e4`
- `data/world-review/town-expansion-r1-accessibility-repair-prefix566-recovery-plan-20260728.json` — SHA-256 `79990e958ec092ca4f6856de2bd510331223e2dd9a536b8870d09e1034cef642`
- `data/world-review/town-expansion-r1-accessibility-repair-prefix566-recovery-preflight-20260728.json` — SHA-256 `a9df5516ee2a52ba0e8ab2a36d53505be89269fb4dd822fe93b6d5c15907ba60`
- `data/world-review/town-expansion-r1-accessibility-repair-prefix566-recovery-execution-20260728.json` — SHA-256 `b80b258d8871b2d88e48e10072f62ce851aebb1de11d6819d3b5275a8b8883ad`
- `data/world-review/town-expansion-r1-accessibility-repair-source-restored-preflight-20260728.json` — SHA-256 `91a54d690db262f386fd9e9df98aa3140f7756eef5412b2e28b0c76e0cac1f2d`

### OCC-20260728-027

The owner-city sales-office first-pass camera rendered from inside the concierge desk and failed the low-information gate with three colors.

Evidence disposition: Rejected PNG and metadata are immutable; the corrected three-shot family preflight passes all six paired captures.

- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS-PASS-1-raw-020deab122aa.png` — SHA-256 `020deab122aad6b70909b256986bd856e939108aa6649683ae867ab88ada93db`
- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS-PASS-1-raw-020deab122aa.json` — SHA-256 `db7a57ce231243a3c60e92a3c1856b7747799112e40c034a4664577833ceed0d`
- `data/world-review/town-expansion-sales-office-camera-preflight-20260728.json` — SHA-256 `6182b8f8a5d299429b9d14977f7ee93b93536bd2030ff63924c301e57d552876`

### OCC-20260728-028

After the exact leaf repair, Surveyor staged successfully from the previously stranded shoulder and passed all forty-nine forward checkpoints, but reverse checkpoint 13 still failed because production parkour policy differed from the certified no-parkour route model.

Evidence disposition: Immutable terminal live audit retained; production movement policy was aligned to no-parkour and requires a fresh complete rerun.

- `data/runtime-audits/citizen-route-live-walk-20260728T180433Z.json` — SHA-256 `2b2af66e6b2de6969227fa7f966f93e6c12e64edda0acac7f45c3d8a2c598db5`
- `src/bot/PathfinderMovementPolicy.ts` — SHA-256 `b7e2cba43b569ae7d51a34338531c0f36c0f9a5bf4815e1c8467eefa0e4ade98`
- `test/bot/PathfinderMovementPolicy.test.ts` — SHA-256 `da8ce36104d481d1437e008f45f7e40ebe668387e2a7eef4a7168af41c400d8d`

### OCC-20260728-029

The final-snapshot bulk render rejected the Gilded Raven second-pass camera as a uniform one-color frame.

Evidence disposition: Renderer-preserved rejected PNG and metadata are immutable; the paired camera family is being rebound before resumable rendering.

- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS-PASS-1-raw-46bcd65c043d.png` — SHA-256 `46bcd65c043d0de65e6658570615b44c947cb96ae48bc451840aaea5d848aa61`
- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS-PASS-1-raw-46bcd65c043d.json` — SHA-256 `c59f31c65a04cbf8e2337a878e23c29578b12d3980f88fc8de4918e1fc69e2b3`

### OCC-20260728-030

The first post-restart observer invocation rejected a stale default because the route report's root post-snapshot hash no longer matched the observer contract; it took zero samples and made no lifecycle claim.

Evidence disposition: The read-only zero-sample JSON and Markdown reports are retained. Rebinding the observer allowed a later observation to run but did not resolve citizen lifecycle acceptance.

- `data/runtime-audits/citizen-post-restart-observation-20260728T190438Z.json` — SHA-256 `3ede7acfdf0041faf9107cd822fdec6b0a318231066ea48bc0175df46d5a9efe`
- `data/runtime-audits/citizen-post-restart-observation-20260728T190438Z.md` — SHA-256 `06f74ad304dc4da8d8093dcebc7fb3d385a96f2ad3db9ded2e4be6af1fd6e4ce`

### OCC-20260728-031

The complete 1,200-second, 121-sample observation kept one systemd PID and five healthy exact-role residents across day and night, but four citizens completed no structured task, no citizen completed an exact civic shift or destination/return trace, three shift tasks remained stationary, and generic local failures repeated.

Evidence disposition: The immutable read-only observation and Markdown report are retained as failed acceptance evidence. This occurrence is not a rollback incident or recovery execution and must not be treated as a resolved lifecycle gate.

- `data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.json` — SHA-256 `14dfb14b9dd01928c2a4a446b5318264fcc1def54dcff60355a0d37d77619182`
- `data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.md` — SHA-256 `9f8f71dac5581cdf085fdf770468abfb562568cd9a70dadccf5df713eb3897d8`

### OCC-20260728-011

The first failed-route map renderer dereferenced null physical-width evidence and crashed.

Evidence disposition: No terminal failed report existed by definition; corrected tool and later report retain the diagnosis.

- `scripts/survey_citizen_cross_city_route.mjs` — SHA-256 `7462ccea9155cce702d5088bf79739fd15232ac9b805d491ae61ecb9cd707c86`
- `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json` — SHA-256 `465060102bf530632101db4a6e5c69c6b9dc8d3a5936db53c9cb6f40db2528e8`

### OCC-20260728-012

The C01 garage overview failed the low-information gate with three colors.

Evidence disposition: Rejected 15,193-byte PNG was overwritten before archiving; corrected garage output and exact old hash narrative remain.

- `data/exports/town-expansion-media-2026-07-28/pass-1/c01/object-c01-east-l1-security-garage.png` — SHA-256 `3ddc206c9bed64d5624c589b02a9d190183996a2a70fcc945b8f041ed1fcf030`

### OCC-20260728-013

The C01 Level 2 living/adult overview failed the low-information gate with three colors.

Evidence disposition: Rejected PNG and exact failure metadata were archived before correction.

- `data/world-review/archive/town-expansion-media-rejected-captures-20260728/object-c01-east-l2-living-adult-pass-1-rejected-f72a7553.png` — SHA-256 `f72a755375c942147fc4c922a2c3aeb86c0aeae60a8d907643f57607d28ccf5d`
- `data/world-review/archive/town-expansion-media-rejected-captures-20260728/object-c01-east-l2-living-adult-pass-1-rejected-f72a7553.json` — SHA-256 `81701e7bf084795275f672ed1bec7a9652f6c58e0e8b9e922526ccad5cfa8a93`

### OCC-20260728-014

The generic C01 owner-tunnel bounding-box camera failed with three colors, exposing the remaining object-camera coverage gap.

Evidence disposition: Rejected PNG and renderer-generated metadata are immutable; corrected all-C01 preflight passes 165 schedule and eight object cameras.

- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-c01_owner_tunnel_detour-PASS-1-raw-75e51427f2c4.png` — SHA-256 `75e51427f2c40af54d541bb2c2496710090f918b95550a6485cecd7f4c574d93`
- `data/exports/town-expansion-media-2026-07-28/rejected-captures/OBJECT-c01_owner_tunnel_detour-PASS-1-raw-75e51427f2c4.json` — SHA-256 `17daf18f31c13045c618d3656eba1d2fae4bceedd896d61b1dc29cbf26122af7`
- `data/world-review/town-expansion-c01-camera-preflight-20260728.json` — SHA-256 `403ae0f3c4d27c0312ca5854327a00c75707c8d4d8cbdc388b4c6344236e3bf4`

### OCC-20260728-015

A media QA defect was briefly placed in the incident array; source count validation rejected it.

Evidence disposition: Corrected source and fail-closed builder retained; invalid intermediate bytes were not published.

- `data/knowledge-base/redevelopment-release-incidents.json` — SHA-256 `7eae9d7b39c607f7a686554725ab37ea3021642eb85ba14db79076bdf5c97b41`
- `scripts/build_redevelopment_kb.mjs` — SHA-256 `92d8d5ca58355dc0f80371687917e71d8936b41e6b244a10504d939e4a2994cb`

### OCC-20260728-016

Sites version 3 returned Worker Error 1101, Ray a2209982e8a31497; version 4 root returned HTTP 200.

Evidence disposition: Version history, commits, Ray IDs, and post-fix request are retained in one immutable audit.

- `docs/redevelopment/2026-07-28-town-expansion/external-publication-audit.json` — SHA-256 `939f3af849ede6f8c99ac1f9987d7df00776de42ff64ff641180465e33d57388`

### OCC-20260728-017

Sites version 4 returned 404 for /favicon.ico; version 6 implements and locally verifies the route, while anonymous production verification is blocked by the workspace access layer.

Evidence disposition: The original HTTP outcome, corrected local production route, exact deployment identity, and platform blocker are retained.

- `docs/redevelopment/2026-07-28-town-expansion/external-publication-audit.json` — SHA-256 `939f3af849ede6f8c99ac1f9987d7df00776de42ff64ff641180465e33d57388`
- `docs/redevelopment/2026-07-28-town-expansion/external-publication-closeout.json` — SHA-256 `296723abac11b35fcbdc04c146488c1633022d08c0e42a3a6ae5ad601ea5078f`

### OCC-20260728-018

Retrospective predecessor manifest QA rejected bunker Phase 1 while four packages passed.

Evidence disposition: Immutable retrospective QA retained.

- `data/world-review/redevelopment-r1-release-manifest-retrospective-qa.json` — SHA-256 `6233c3f79993764cdca8c08a8eddacb608996e269bb99c5669fe585613304d39`

### OCC-20260728-019

Eight child routes fail both directions: three C01, Blue Drum, two warehouse, and two observatory connections; one is a stale route contract and seven are physical disconnects.

Evidence disposition: One structured immutable report retains all eight child findings and closest reachable cells.

- `data/world-review/town-expansion-r1-post-release-route-qa-2026-07-28.json` — SHA-256 `9317268186520ccffe0492db3441a96a3a514c2cf4e325ca2bfa84dcc9cb63e1`

### OCC-20260728-020

Independent review identified missing fail-closed evidence checks; the builder now enforces them before atomic replacement.

Evidence disposition: Current source and builder are retained; generated outputs are deliberately not accepted as circular input evidence.

- `data/knowledge-base/redevelopment-release-incidents.json` — SHA-256 `7eae9d7b39c607f7a686554725ab37ea3021642eb85ba14db79076bdf5c97b41`
- `scripts/build_redevelopment_kb.mjs` — SHA-256 `92d8d5ca58355dc0f80371687917e71d8936b41e6b244a10504d939e4a2994cb`

### OCC-20260728-021

Core artifacts contain 31 live entity gates (23 FAIL/8 PASS), 48 destination preflights (29 FAIL/19 PASS), and six prefix-recovery entity gates (3 FAIL/3 PASS).

Evidence disposition: Representative first-fail, bee-reconciliation, final gate, and final red-team artifacts are retained; retries are one WIP family, not separate rollback incidents.

- `data/world-review/town-expansion-r1-live-entity-gate-20260728.json` — SHA-256 `f460187eaff39e0283be8f54d8a3690af26e958b01401b9576e29902131f28ca`
- `data/world-review/clearance2b-bee-reconciliation.json` — SHA-256 `3a804bed7204ca78b157c0cf82b71708656edb8831f6a07e9c6cd20746118a17`
- `data/world-review/town-expansion-r1-live-entity-gate-full-source-restored-retry-frozen-20260728.json` — SHA-256 `a3c6ecad77892968ef8f7b5c6c7e42575e12df1fa165d4853c199d283a4327d5`
- `data/world-review/town-expansion-r1-final-entity-clearance-red-team-audit-20260728.json` — SHA-256 `05c231e9511c31b30c30c26dea1d53900609d54b22351eee6789bea088296e19`

### OCC-20260728-022

Design-stage geometry, cross-scope, Concord, Iowa, C01 classification, and program-envelope gates exposed integration findings before the final compiler.

Evidence disposition: All six point-in-time audit JSON files are retained as WIP gate evidence.

- `docs/redevelopment/2026-07-28-town-expansion/independent-release-geometry-safety-audit.json` — SHA-256 `df394e349431a7c8f37aa499dd9f6e6c494fe5168a27aa009ae8ed190524fe0e`
- `docs/redevelopment/2026-07-28-town-expansion/evidence/redevelopment-cross-scope-point-in-time-audit.json` — SHA-256 `bc84c7434c5494e6e1983cbb5c7cc6e8825532378815a6004067ee464630b82c`
- `docs/redevelopment/2026-07-28-town-expansion/evidence/concord-broadcast-exchange-integration-audit.json` — SHA-256 `9463793f1ad362fb8121cda0c34cef4c6ab31b43358b9907e7731fd5ed1d44ba`
- `docs/redevelopment/2026-07-28-town-expansion/evidence/iowa-data-campus-full-build-increment-audit.json` — SHA-256 `e776c806b52e125c77c7491343f035b77b32f7d32dc1c113b070cfd889393809`
- `docs/redevelopment/2026-07-28-town-expansion/evidence/c01-bunker-classification-qa.json` — SHA-256 `33f5e03f48a3e96276228293265568e490c7fff982edde7ec0b5508a5e61ec90`
- `docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-program-envelope-audit.json` — SHA-256 `1581bd548c40e91da42bc176d0bfa02be8853a6ca810c4a8301e028db05cc04a`

### OCC-20260728-023

Fleet runtime QA deliberately held autonomous shift activation; this was a safety decision, not a crash or rollback.

Evidence disposition: Immutable runtime QA retained.

- `data/runtime-audits/citizen-fleet-runtime-qa-20260728T082321Z.json` — SHA-256 `9599d6baeeb2724de580e49408184871a11ca64b4e6bccdc0a23de2e2a7991ac`

### OCC-20260728-024

Wave 2 pre-database QA failed only because 51 expected external IDs had not yet been imported.

Evidence disposition: Immutable pre-database report retained and classified separately from defects.

- `data/world-review/redevelopment-wave2-pre-database-qa-2026-07-28.json` — SHA-256 `8dc7d2ec53b7c6c9b4feb88fb4088ba72e2c630b880ddc12cf13736b0b613bc2`

### OCC-20260728-032

The first complete image-quality resume attempt was OOM-killed at 14,296,752 KB anonymous RSS.

Evidence disposition: Kernel facts and the accepted bounded rerun are retained in one remediation report.

- `data/world-review/town-expansion-media-render-memory-remediation-20260728.json` — SHA-256 `89b51b89853aca90625e56f5ccd0c33e97816c8b2420171e80713deee589373e`

### OCC-20260728-033

The second complete image-quality resume attempt was OOM-killed at 14,929,096 KB anonymous RSS.

Evidence disposition: Kernel facts and the accepted bounded rerun are retained in one remediation report.

- `data/world-review/town-expansion-media-render-memory-remediation-20260728.json` — SHA-256 `89b51b89853aca90625e56f5ccd0c33e97816c8b2420171e80713deee589373e`

### OCC-20260728-034

The complete report failed media contract validation because all map captures inherited a perspective FOV.

Evidence disposition: The rejected report and later accepted media report are retained.

- `data/world-review/town-expansion-capture-report-map-fov-contract-fail-20260728T2103Z.json` — SHA-256 `40473dd56670ccabd36b2a7c2e86b25f9d0a1d9f4a131a0352416a69c2e4f692`
- `data/world-review/town-expansion-r1-post-release-media-contract-fail-20260728T2104Z.json` — SHA-256 `aacb1d8fa39ecc134593e0dbcba90e3c2697f1e920eda1ef240b54774d15685e`
- `data/world-review/town-expansion-r1-post-release-media-2026-07-28.json` — SHA-256 `e9a287f9c2536ae81701604bd2232262ecb04a4567606da030baf833bfa01226`

### OCC-20260728-035

The consolidated verifier looked for relative capture outputs at repository root instead of beside the bound renderer report.

Evidence disposition: The failed and accepted consolidated reports are retained.

- `data/world-review/town-expansion-r1-post-release-qa-media-path-contract-fail-20260728T2107Z.json` — SHA-256 `313490d99ac113e0161a6685ba4180272d8ceac34a59e199af2bbe38a19fd794`
- `data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json` — SHA-256 `7200a6d23e838d80f1c21fb5585a72434103056c71793073d68918885f083672`

### OCC-20260728-036

The first independent database census rejected project-local parent IDs duplicated by a historical external project.

Evidence disposition: Both the rejected census and final clean publication census are retained.

- `data/world-review/town-expansion-r1-database-publication-report-parent-scope-contract-fail-20260728T2110Z.json` — SHA-256 `f5df03f25c9e75f6af99e0edbb47665f3921348bc240a97983bf63ac8ea3d0aa`
- `data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json` — SHA-256 `131cee67ad5bc4177f980ca8e7d79ccfa25dde952250faf27b7447e3a034031c`

### OCC-20260728-037

The platform rejected internet-public access for the successfully deployed Sites version 6 because public Sites are disabled for the workspace.

Evidence disposition: The exact deployment, current owner-only access, rejected public update, anonymous HTTP 401, and required admin action are retained in the closeout ledger.

- `docs/redevelopment/2026-07-28-town-expansion/external-publication-closeout.json` — SHA-256 `296723abac11b35fcbdc04c146488c1633022d08c0e42a3a6ae5ad601ea5078f`

## Prevention control catalog

### RCS-001 — Stop at the first failed source group

A guarded release must stop at the first failed source group and validate the streaming journal before any commit claim.

### RCS-002 — Compensate every committed package in reverse order

An atomic multi-package failure must reverse the failing package and every earlier committed package in exact reverse package order.

### RCS-003 — Bind artifacts to exact hashes

Forward, rollback, manifest, snapshot, execution plan, and report bytes must be SHA-256-bound. Evidence from obsolete hashes is historical only.

### RCS-004 — Use complete canonical block states

Every exact guard and replacement must use a valid complete canonical block state. Incomplete or invalid states fail generation.

### RCS-005 — Order dependent world operations safely

Clearance runs top-down, construction bottom-up, and support-sensitive operations must not allow neighbor updates to invalidate later guards.

### RCS-006 — Classify replies fail-closed

Conditional command empty replies are recognized no-ops; strict forward execution rejects them, non-strict rollback tolerates them, and unclassified replies fail closed.

### RCS-007 — Suppress block neighbor updates during atomic mutation

Every SET and REPL fill uses Paper strict fill mode so dependent cells are installed before normal update settlement.

### RCS-008 — Verify the complete live source after recovery

After any failed forward execution and recovery, capture a fresh immutable snapshot and preflight all 483,016 canonical REPL groups, not only the accepted prefix.

### RCS-009 — Repair only proven first-touch drift

Generate one-cell exact guarded repairs only for complete first-touch failure evidence. Treat later multi-stage failures as projection cascades and reject ambiguity or block-entity NBT.

### RCS-010 — Freeze through recovery and commit

Keep the world frozen and citizen services inactive through rollback, source snapshot, source repair, full preflight, entity gate, and the entire next atomic execution.

### RCS-011 — Require post-recovery and post-install proof

A repair requires a new snapshot plus a complete clean canonical preflight. A release requires a distinct post snapshot, rollback preflight, entity/fluid/route QA, and installed-state verification before publication.

### RCS-012 — Prove camera visibility before bulk media rendering

Every generated evidence camera must use integer-addressed snapshot geometry, a standable or intentionally aerial eye point, a visible target surface, and a pre-rendered line-of-sight/quality probe before a long capture run.

### RCS-013 — Make QA failure paths first-class outputs

A QA tool must emit a durable terminal report for both pass and fail states. Optional measurements unavailable on failure must never crash the evidence writer.

### RCS-014 — Gate citizen activation on immutable and live route proof

A world-changing release invalidates older commute evidence. Keep citizen services inactive until the exact post snapshot passes bidirectional no-dig route analysis and an isolated live QA walker confirms the same route.

### RCS-015 — Validate knowledge-base classification and counts before replacement

Incident and QA-defect rows must use their declared collections, stable ID prefixes, and independent count assertions. Build the SQLite database to a temporary file and replace the prior revision only after schema, foreign-key, artifact, and integrity checks pass.

### RCS-016 — Model natural rollback source evolution as exact executable policy

Never weaken canonical forward guards or rewrite committed operation bytes for natural block evolution. A rollback-only exception must bind the operation, failed evidence, and immutable snapshot hashes; declare exact cells; preserve family and properties; compile into executable exact guards; propagate through the atomic wrapper and journal; and fail closed on every undeclared state or point.

### RCS-017 — Preserve rejected evidence before remediation

Before regenerating or overwriting a failed report, image, map, manifest, or other QA output, copy the rejected bytes and an exact failure record into a timestamped immutable rejected-attempts path, hash both, and reference the rejected and corrected evidence from the defect ledger.

### RCS-018 — Health-check every exact Sites deployment

Save and deploy only an exact pushed Sites source version, then record production root and required-asset HTTP outcomes, worker/runtime errors, version identity, and access controls before declaring the publication healthy.

### RCS-019 — Fail the KB build on incomplete or drifting evidence

Every transaction, recovery, and QA evidence file must exist before database construction. Transaction and recovery JSON must match declared statuses and group counts; generated KB outputs cannot self-reference; all input hashes must remain unchanged through atomic database replacement.

### RCS-020 — Separate unique defects from repeated occurrences

Keep rollback incidents, recovery invocations, unique QA defects, repeated error occurrences, expected safety holds, and WIP gate failures as separate measures with stable parent links and immutable evidence.

### RCS-021 — Require representative route coverage before acceptance

A large world release must pass exact-snapshot bidirectional normal-walk QA across every major domain, vertical connector, controlled threshold, service spine, and isolated route contract before final acceptance or publication.

### RCS-022 — Canonicalize block states and reject semantic no-ops before release

Generators and preflights must parse and canonicalize block names and property maps, reject a replacement semantically identical to its guarded source regardless of property order, and regression-test this before creating any strict forward operation file.

### RCS-023 — Bind every supplemental release into one continuous provenance chain

Final QA and database import must validate every ordered supplemental transaction, independently rehash all nested execution, preflight, entity-gate, rollback, and snapshot evidence, prove each prior post snapshot equals the next source snapshot, and reject omitted, extra, reordered, or drifted supplements.

### RCS-024 — Match production movement policy to offline route proof

The exact Mineflayer movement policy used for live acceptance and resident operation must match the offline route model for digging, towering, parkour, sprinting, headroom, rise, and drop. Any policy drift invalidates the route proof and requires a full bidirectional live rerun.

### RCS-025 — Bind citizen restart to one runtime identity envelope

Before a citizen restart, fail closed unless one recorded envelope binds the accepted snapshot hash, route-report path, exact path hash and cell count, config hash, source and compiled-build hashes, observer defaults and caches, and the systemd unit path, WorkingDirectory, ExecStart, and PID transition. Build before restart, restart only through systemd, and verify the new PID loaded that exact build before beginning observation; any stale or mixed snapshot, path, build, cache, or service identity blocks activation.

### RCS-026 — Require structured-task producer and consumer schema parity

Before restart, exercise every trusted structured-task kind end to end through its producer, blackboard persistence, worker IPC, executor, completion/outcome records, API, and observer. Producer and all deployed consumers must agree on the exact schema version, required fields, status transitions, and success semantics. Reject an unknown or newer producer contract, a missing local-routine executor, or any compatibility inference; an unsafe mixed-version proposal must be removed before build and never deployed.

### RCS-027 — Bound native media verification memory

Reuse serialized image and canvas surfaces for large capture sets, avoid duplicate resume measurements, regression-check metric compatibility, and run complete media verification inside an explicit memory-capped scope.

### RCS-028 — Normalize mode-specific camera and report-relative path contracts

Map captures must not inherit perspective-only fields. Every consumer of a renderer report must resolve relative outputs from the bound report location and test both relocated reports and mode-specific camera records.

### RCS-029 — Scope database relationships to the accepted registry

Resolve explicit in-registry parents within the accepted project and registry. Require global uniqueness only for declared external parents, and regression-test historical duplicate external IDs before publication.

### RCS-030 — Preflight external publication policy separately from application access

Before promising anonymous publication, verify that the workspace permits internet-public Sites. Record platform access and application authentication as independent gates, and never treat a working PIN page behind an owner-only platform layer as anonymous access.

