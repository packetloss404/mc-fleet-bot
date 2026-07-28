# Town Expansion R1 Post-Release QA

- Decision: **ACCEPTED**
- Status: **PASS**
- Read-only verifier: **true**
- Generated: `2026-07-28T21:09:35.084Z`
- Pre snapshot: `d749007d669b1f16a9d1a75dafd55d3bb92cbcc61ca49027f7337198da65865f`
- Post snapshot: `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`
- Consolidated release identity: `a5e61258c0c4348558f2cf46b8d09b380885e019108f2cbbf462300590d1d18a`
- Supplemental packages: **4**
- Unique target cells: **3665580**
- REPL groups: **483016 forward / 483016 rollback**

## Gates

| Gate | Result | Details |
|---|---:|---|
| `design-report-and-manifest-hashes` | PASS | manifestPackageId=town-expansion-r1-2026-07-28; reportPackageId=town-expansion-r1-2026-07-28; forwardSha256=1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896; rollbackSha256=1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de; manifestChecks=6; requiredDesignChecks=8 |
| `exact-forward-rollback-target-bijection` | PASS | uniqueTargetCells=3665580; expectedTargetCells=3665580; forwardReplGroups=483016; rollbackReplGroups=483016; repeatedForwardCellSteps=24762; ownerTargetCells=3665580; mismatchCount=0 |
| `base-source-state-equivalence-bound` | PASS | mode=complete-source-equivalence-preflight; required=true; supplied=true; directSourceSnapshotIdentity=false; proofPassed=true; proofPath=data/buildops/town-expansion-r1-2026-07-28.prerelease-preflight.json; proofSha256=f4b7c90d89445c1a474dfdcec504528794f982267b70d0dec6865ce7036a1b22; transactionPreSha256=d749007d669b1f16a9d1a75dafd55d3bb92cbcc61ca49027f7337198da65865f; transactionDeclaredPreSha256=null; designPreSha256=de807a2d4a1cb597bd259d55d1d7c0cda8b710af5017497e75660c8a976603f5; manifestPreSha256=de807a2d4a1cb597bd259d55d1d7c0cda8b710af5017497e75660c8a976603f5; operationCount=483016; expectedOperationCount=483016; passed=483016; failed=0; failurePointsComplete=true; partialMasks=0; projectionDependencyFailures=0; projectedSourceState=false; orderAwareProjection=true |
| `immutable-snapshot-identities` | PASS | preSha256=d749007d669b1f16a9d1a75dafd55d3bb92cbcc61ca49027f7337198da65865f; basePostSha256=0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218; postSha256=c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751; preRegionFiles=30; basePostRegionFiles=30; postRegionFiles=30; transactionPostIdentityPresent=false; transactionPreIdentityExact=true; supplementalTransactions=3; directSourceSnapshotIdentity=false; sourceEquivalenceRequired=true; sourceEquivalenceProofPassed=true |
| `atomic-transaction-committed` | PASS | transactionId=town-expansion-r1-2026-07-28-fresh-snapshot; status=committed-pending-post-qa; packageCount=1; packageStatus=committed; strictNoop=true; failedGroups=0; failedCommands=0; committedEvent=true |
| `live-entity-gate-pass` | PASS | schemaVersion=2; status=PASS; packageCount=1; blockers=0; queryErrors=0; mutation=false; cleanupChecksPresent=5; schemaTwoForceLoadPassed=true |
| `rollback-natural-transition-policy-bound` | PASS | policySha256=d2d3529f9f7a932a843a8583136df83b5cd2ca33ab08830334e554ec807e858a; rollbackSha256=1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de; snapshotSha256=0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218; expectedBasePostSha256=0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218; ruleCount=61; declaredPointCount=4529; observedTransitionCells=4529; matchMode=exact-declared-points; propertyPolicy=identical |
| `rollback-guards-pass-against-post-snapshot` | PASS | schemaVersion=4; operationCount=483016; passed=483016; failed=0; regions=data/worldsnap-town-accessibility-source-restored-20260728T1735Z/region; snapshotHashPresent=true; schemaTwoRollbackIdentityPassed=true; schemaThreeRollbackPreflight=true; policySha256=d2d3529f9f7a932a843a8583136df83b5cd2ca33ab08830334e554ec807e858a; declaredPointCount=4529; acceptedTransitionCells=4529; unmatchedDeclaredPoints=0 |
| `rollback-logical-source-overlay-bound` | PASS | overlayPresent=true; overlayOperationCount=49; overlayPlanSha256=605b121d9ec6afb52c1d955253a5ceaab2ae3b0d3ff05b56cde3ec053080ad71; materializedSupplementalPackages=4 |
| `supplemental-release-chain-bound` | PASS | supplementalTransactions=3; validatedSupplements=3; releaseIdentitySha256=a5e61258c0c4348558f2cf46b8d09b380885e019108f2cbbf462300590d1d18a; basePostSha256=0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218; terminalPostSha256=c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751; failureCount=0 |
| `post-release-route-qa-pass` | PASS | status=PASS; acceptanceClass=IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING; projectionAbsent=true; explicitlyComplete=true; readOnlyNoMutation=true; postSnapshotDirectory=data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region; postSnapshotSha256=c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751; immutablePostIdentityBound=true; packageHashBound=true; routeCount=22; passedRoutes=22; failedSummary=0 |
| `optional-post-release-media-pass` | PASS | supplied=true; status=PASS; postSnapshotSha256=c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751; packageHashBound=true; captures=1178; passedCaptures=1178 |

## Evidence

| Artifact | SHA-256 | Path |
|---|---|---|
| forward | `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896` | `data/buildops/town-expansion-r1-2026-07-28.txt` |
| rollback | `1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de` | `data/buildops/town-expansion-r1-2026-07-28.rollback.txt` |
| designReport | `d855d0072a213c27ebedc2b36ec53761363568e9de963650a8563a9179d81930` | `data/buildops/town-expansion-r1-2026-07-28.report.json` |
| manifest | `3073ef269d07f720ef62708b1f673d179a5f641fd19856b61f19e2eae4e78510` | `data/buildops/town-expansion-r1-2026-07-28.manifest.json` |
| transaction | `042f445b097f52fbba795e59072084df8cbe60527e85330b3b6e7cb3902d3ec3` | `data/world-review/town-expansion-r1-atomic-transaction-full-source-restored-retry-20260728.json` |
| liveEntityGate | `a3c6ecad77892968ef8f7b5c6c7e42575e12df1fa165d4853c199d283a4327d5` | `data/world-review/town-expansion-r1-live-entity-gate-full-source-restored-retry-frozen-20260728.json` |
| rollbackPoststatePreflight | `dbae24353312cc4dd24a34618975706c0cc002e239ae0f5f32d480c909c8d730` | `data/world-review/town-expansion-r1-base-rollback-policy-preflight-carpet-recovered-logical-source-20260728.json` |
| naturalStateTransitionPolicy | `d2d3529f9f7a932a843a8583136df83b5cd2ca33ab08830334e554ec807e858a` | `data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy-carpet-recovered-logical-source.json` |
| sourceEquivalencePreflight | `f4b7c90d89445c1a474dfdcec504528794f982267b70d0dec6865ce7036a1b22` | `data/buildops/town-expansion-r1-2026-07-28.prerelease-preflight.json` |
| routeQa | `a3c16f23167c668e4c3833cc4662f0829c0c096fccf2f223a42bd9b4d1ac99e7` | `data/world-review/town-expansion-terminal-as-built-route-qa-20260728T1839Z.json` |
| mediaReport | `e9a287f9c2536ae81701604bd2232262ecb04a4567606da030baf833bfa01226` | `data/world-review/town-expansion-r1-post-release-media-2026-07-28.json` |

## Decision

The canonical Town Expansion R1 transaction, ordered supplemental release chain, installed snapshot, rollback guards, entity clearance, route evidence, design hashes, and supplied media evidence all pass.
