# Redevelopment Artifact Register

Release: `REDEV-2026-07-27-R1`  
Mode: **FINAL**  
Status: **FINAL_REGISTER**  
Generated: 2026-07-28T21:14:41.145Z  
Machine register: `data/world-review/redevelopment-artifact-manifest-2026-07-27.json`

## Purpose and reading rule

This is the human review index for the release evidence set. The adjacent
JSON is authoritative for file-level SHA-256 values, byte sizes, image
dimensions, JSON status fields, package IDs, operation hashes, and snapshot
bindings. Generated dossier outputs are intentionally excluded to avoid a
self-referential hash cycle.

## Inventory summary

| Evidence class | Files | Bytes | Images | JSON |
|---|---:|---:|---:|---:|
| authored-master-plans | 2 | 24,260 | 0 | 0 |
| guarded-build-packages | 83 | 41,533,260 | 0 | 71 |
| machine-release-evidence | 80 | 15,560,126 | 4 | 71 |
| matched-release-media | 145 | 22,132,126 | 130 | 15 |
| planning-and-reports | 22 | 357,583 | 0 | 1 |
| release-automation | 45 | 1,237,919 | 0 | 0 |
| release-tests | 10 | 80,935 | 0 | 0 |
| showcase-source | 414 | 75,184,380 | 356 | 19 |
| world-atlas | 10 | 3,841,716 | 7 | 2 |
| world-catalog-and-post-media | 95 | 17,934,714 | 85 | 6 |
| **Total** | **906** | **177,887,019** | **582** | **185** |

## File-type census

| Extension | Files |
|---|---:|
| `.png` | 582 |
| `.json` | 185 |
| `.md` | 40 |
| `.mjs` | 31 |
| `.ts` | 16 |
| `.txt` | 14 |
| `.py` | 8 |
| `.pyc` | 7 |
| `.tsx` | 4 |
| `.html` | 3 |
| `.pdf` | 3 |
| `.yaml` | 2 |
| `[no extension]` | 2 |
| `.css` | 1 |
| `.js` | 1 |
| `.jsonc` | 1 |
| `.map` | 1 |
| `.sqlite` | 1 |
| `.sqlite-shm` | 1 |
| `.sqlite-wal` | 1 |
| `.svg` | 1 |
| `.tsbuildinfo` | 1 |

## Category-level artifact ledger

### authored-master-plans

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `mainstreet-america/planning/picket-fence.yaml` | 10,716 | `38432a4f018cbb65f3a0703cea80a3228db5be8723abdc918d7daabeee37c04f` | — |
| `mainstreet-america/planning/redevelopment-r4-r5.yaml` | 13,544 | `06154dbc1afcc43607c64a00ee66e07fd35cb9fced5dce76d32c81dc33d69025` | — |

### guarded-build-packages

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.before-cameras.json` | 2,361 | `8924fd241439759c443160ec78ac04b0dd1a0d1c45c1312daeaeebfaf5f779d7` | status=before-camera-contract; package=mainstreet-bunker-recessed-portal-phase2-before-cameras |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.dry-run.json` | 61,304 | `278ead09272b441f12dfb2c539f1c562f24b44e6d290737a65591f1586aeca43` | status=dry_run; ops=f50ce795daee… |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.execution.json` | 61,308 | `f9b1563f6ed5488ed108a319e19534d3263403b229722efabad496079524c3c9` | status=complete; ops=f50ce795daee… |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.post-preflight.json` | 405 | `90a1f43cd38bb31a74a691be0fae094f6e4597c6daa10206af056caa57c6ed2b` | — |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.pre-execution-entity-gate.json` | 7,102 | `13ae081c6334e4f9114c433b0cf336a5d3a8fe99b4c46c9748d6d43443903ebb` | status=PASS; passed=true |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.preflight.json` | 390 | `f9bc3fa8c8a4e33042022acd4f4064b7431d0ed6ae55b522e90a126bccb0e9dd` | — |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.prerelease-preflight.json` | 396 | `3c000fe310af33ade31398e6bd1f644ea195fa587a552f1eae9f388999be037c` | — |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.report.json` | 16,581 | `58761d712fe08b302868ae547373a9247bffc71e30e5abde91e39fdf0fd98734` | status=implementation-ready-live-safety-gates-pending; package=mainstreet-bunker-recessed-portal-phase2-2026-07-27 |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.rollback-baseline-preflight.json` | 105,322 | `f46b9656eba3380788e031d00026790c03fcd3c9923cd833a1756a8554d163f9` | — |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.rollback.post-preflight.json` | 405 | `a9d0545e4623b1e79fccb82c8f94472c6cdabedb4bd62c378cff8956f23e9c54` | — |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.rollback.txt` | 6,195 | `7de8c45fdb418f1d6c7f1ca772dc5b7e616359c616ab2cacff3cd6cc1d5ca640` | — |
| `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt` | 6,475 | `f50ce795daee455c81acb8f1456265f954e24661d99853de50a80d82b9f67e4f` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.before-cameras.json` | 3,166 | `6cbcde9e854f268b71020a770a1c6830f6c0f3db768b26e7d48ead14b5a31f55` | status=before-camera-contract; package=mainstreet-bunker-surface-phase1-before-cameras |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.dry-run.fixed.json` | 538 | `a9bc89a166027a2d4c174a3a0cda982e94b38284abb82470e5fd686d7fbd12e4` | status=dry_run; ops=22b7fffddca9… |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.dry-run.root.json` | 555,138 | `6a3877d46031f03a6eb4ff3213c529780d48d78f113729f89e91c21ec45d6dbb` | status=dry_run; ops=fa108cc0a18d… |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.execution.json` | 555,144 | `dacb16dfdb5b5df208b69360d1ff9988c59aefbf870427bef13043ef7eb73a9e` | status=complete; ops=fa108cc0a18d… |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.independent-qa.json` | 1,430,089 | `86675a20f3f06463a036e992a70ad949e2fb7906a475d2b9284012680bd4426f` | status=PASS_OFFLINE_LIVE_GATES_PENDING; package=mainstreet-bunker-surface-phase1-independent-qa |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.post-preflight.json` | 401 | `f231d78d3cf01ed387d15ba5b86cba0894d66af5d0425278de303f0aa88fe7bc` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.pre-execution-entity-gate.json` | 71,053 | `18286ead55173788716de9efeb74e2347af5d113bb7a5a14921fe73caa986ea4` | status=PASS; passed=true |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.preflight.fixed.json` | 386 | `7719d4411fabeb849ad6e38fb91fbaede1621ff38b5b6778ab0e40a410ca47cf` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.preflight.root.json` | 386 | `b2ef13130aa2bde90108de5db22f2ebd0134926a28eb3389f332d6468aa3e966` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.prerelease-preflight.json` | 392 | `6eb4bc6b9f76b6c5311c44b69637d427c35d40d29660f6a12bc064f059d3a28d` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.report.json` | 18,678 | `02e50b796f9fe6b6e42e68ca8f1e56f6cd3392fa6fa1e969c9cd771ef182fad8` | status=implementation-ready-live-safety-gates-pending; package=mainstreet-bunker-surface-phase1-2026-07-27 |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.dry-run.root.json` | 559,161 | `aa90e24dad7c81bc40e40c51ce8eb2ec96758fb4c47e50254a6476a5a3b042a9` | status=dry_run; ops=698cb58c226a… |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.post-preflight.json` | 401 | `f95628d9833a707ac3ab38c78eabeb47e2dee7f8bed9cbb34b8c8b8a908c7f0f` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.txt` | 47,782 | `698cb58c226a90dfa946d8dbbec587fae39b3d48bebe0b334ecb37bbbf94bc3d` | — |
| `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt` | 48,510 | `fa108cc0a18d9cad0980abd8fca0f483a45406688fd9e32e0bf6b2dcf0350233` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.dry-run.independent.json` | 540 | `b211b89a21a1c517101fa6a21eec618cda3070ae9045ed08757ebb13e954de44` | status=dry_run; ops=c61649579cec… |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.emergency-rollback.execution.json` | 557 | `6138e998ef7bc3922cddb0b7dffea86f33c677f465591638cf5600fd6e545f6b` | status=complete; ops=98427f36c43e… |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.execution.json` | 1,491 | `d2f90aece46fcf1fbabca6666dbd755125704c46ade3522fc364aedb9cbbf410` | status=failed; ops=c61649579cec… |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.forward-dry-run.json` | 540 | `18fb7e442522fa703ed4c8068c5ad98de35606919df6af8451d23a592c33c665` | status=dry_run; ops=c61649579cec… |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.independent-qa.json` | 54,571 | `6540664cb697c27fdee9389a56f3e0f106c3029332cc05c31eb60c276ea37832` | status=PASS_IMPLEMENTATION_READY_LIVE_QA_PENDING; package=mainstreet-america-redevelopment-r4-r5-independent-qa |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.pre-execution-entity-gate.json` | 239,795 | `6128b64ad99903cc57e11679bbd8c11d97a33083a6105ebf2c291559c872c899` | status=PASS; passed=true |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.preflight.independent.json` | 384 | `3a6736a2d5ef09861f3dfc127de8928080aa8210902bdedd9a8bf83a1af32622` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.preflight.json` | 384 | `25c41e5f7cd69a731a7c5f6c505f06bdb0fb6d7fd6b2cb47a03e02906df54d96` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.prerelease-preflight.json` | 389 | `f457c84569c51b6afd560d72a33b38b5996a88559ada9e74aaec3e6d1c35157e` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.release.json` | 5,686 | `debc39e76a84c09d47a485d36eb0cf44745ec046043d91dd5b32232451a60e96` | package=mainstreet-america-redevelopment-r4-r5 |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.report.json` | 257,569 | `aff9a31233c94c301d54aa3519200860615005aa5dc720f67a57b4d20e25dbb6` | package=mainstreet-america-redevelopment-r4-r5 |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.rollback-dry-run.json` | 549 | `80bb879f06dfc14d2982c851e6985c77f54993d740cae30da27113236ea34c60` | status=dry_run; ops=98427f36c43e… |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.rollback.dry-run.independent.json` | 549 | `95a2f56f514d628a22c99fdab52dc364212c9fc3fac037fe6d841d603ea33099` | status=dry_run; ops=98427f36c43e… |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.rollback.txt` | 484,747 | `98427f36c43e2f0a76f394cfafb40669d5e0c4ff105272d1e949c6fe3e264efd` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.txt` | 497,069 | `c61649579ceccc6265305fd191d79d791d1b2859976d9ab8cf858cc0b0eb4514` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.execution.json` | 4,473,587 | `78f49dd84e1d76bb983f90f4ce1e079f8d9ab3cfffc57ba1c339269711d572d5` | status=complete; ops=c96958c9ce7c… |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.forward-dry-run.json` | 4,468,528 | `99af9234979338320a9e4bb4f7dbbb36131d432c323c39ae6cc9e2469cce11be` | status=dry_run; ops=c96958c9ce7c… |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.independent-forward-dry-run.json` | 4,468,527 | `ea60dfa2677e7eb52909e3e4c963d1f2f3745c837893ef7b124f6439141e98e3` | status=dry_run; ops=c96958c9ce7c… |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.independent-preflight.json` | 405 | `46ddc67b801a308ec43a878cc8877828be1a2e0e360912de46a047e1277f6493` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.independent-qa.json` | 11,188,909 | `ecfe2f251007d2cb98f2797ddfc2df970271736e69f6efc215655b34bccd063a` | status=PASS_IMPLEMENTATION_READY_LIVE_QA_PENDING; package=mainstreet-america-redevelopment-r4-r5-independent-qa |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.independent-rollback-dry-run.json` | 4,524,913 | `292a536a49f476f8a488c3f77cc9126c10a8f15bf51b6ddd9d17cb59b0ba1fc2` | status=dry_run; ops=86d9d452dac2… |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.integration.json` | 3,832 | `182bdc8ca58df7d8758ad186ba9600170b938c122449200aa3e86116c08985c6` | package=mainstreet-america-redevelopment-r4-r5 |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.post-preflight.json` | 412 | `ca5ae9cc203f915e7347d1e1478d7938ddafcf3fd026864bca1ff6ea908ad303` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.pre-execution-entity-gate.json` | 208,566 | `a9eb42fd1724634596a51db47c52e6c454cb26bf6d3cacef13396ce3aa00e704` | status=PASS; passed=true |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.preflight.json` | 405 | `5a21a7c93ef21c70080ede0644d95b7ffca615b55f1d7bd8d094e05e3e2dfa40` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.prerelease-preflight.json` | 403 | `03a41e609ff4c94b87467ff3a32bc0a90e4c5e3eb417fdc4de205c24a7fcc405` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.release.json` | 7,160 | `3d9438072829ca9fca41a32af38ea6dd968052bfb8f54f1f4acc4ea4aa1ba8f7` | package=mainstreet-america-redevelopment-r4-r5 |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json` | 272,640 | `136912978b0f2b61554b8da4066e696175cdffe403ec81fffc76f2dcc56a4faa` | package=mainstreet-america-redevelopment-r4-r5 |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback-dry-run.json` | 4,524,913 | `46c670dd08638ba193c134f3b172359900ec95b56d3eeabb1233a7617f3e2535` | status=dry_run; ops=86d9d452dac2… |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback.post-preflight.json` | 412 | `abd58458f1c0f5fb5f061351a68380ebd827bb844c885b2246a39ff8c66a543b` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback.txt` | 449,950 | `86d9d452dac29d40cffb253a5e31e4d36d4eb6087a0dc1c25e10cb95d61dd1f3` | — |
| `data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt` | 463,011 | `c96958c9ce7c3a2e9d481d5063bc0cbd26d0879068967c1d66ca06943b9b2972` | — |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.dry-run.json` | 532 | `aa902a39b0de17da06a827faf8813f990ba96e5fce8ed2c5e23631730310f99c` | status=dry_run; ops=2869cfea1243… |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.emergency-rollback.execution.json` | 547 | `64558dbfc98e8e0ba0a99caae658fec2b79606cbbfc567869ea7da82221a41cb` | status=complete; ops=8dcbc3b11aa4… |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.execution.json` | 263,406 | `65b3a41e7a146db89650dc1e6567063858f577cd173babaa1c043742d7c2ec96` | status=complete; ops=2869cfea1243… |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.post-preflight.json` | 394 | `7c5c38cabc59ef62c48d6469a915651060438a4bf662b6514bcb2eff92843525` | — |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.pre-execution-entity-gate.json` | 5,365 | `b2ca6dabd5042690221360a45bc2e63f0cca01e4180cca1024488a1436ee3ee8` | status=PASS; passed=true |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.preflight.json` | 379 | `119d73f1f7eec283441748e8bcdb9a2b01607125161577087dfd60d90fc3cc84` | — |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.prerelease-preflight.json` | 385 | `f1e90a9c8e28c01dde15ae6e153067773f84365f90c95ef5be8a801a4c40cad9` | — |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.prestate.json` | 192,754 | `e34a4f8284d7fa50cc81c2b71c9ee1fd3f3643278254d835cf2a39734609b631` | package=INF-RR-01 |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.qa.json` | 357,211 | `2b1cc9cfe129bfe667e5b41ae573cc8715db95843bf5b683e90af0f0f816c0cc` | status=PASS_OFFLINE_LIVE_GATE_PENDING; package=INF-RR-01 |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.report.json` | 11,953 | `c6b421d8fa3867ffb83790beb2ca0994222b05262b0dd0a47a9b9cc4b780de08` | status=generated-awaiting-independent-qa-and-live-execution; package=INF-RR-01 |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.post-preflight.json` | 394 | `b1854dbbf00beb24349559fddae025df371d51e92b103eb56ff0250d97ab4338` | — |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.txt` | 25,995 | `8dcbc3b11aa4e2ac4caad4c4f2460b55c53db82e5ec145ec5426cbfa1753e5e7` | — |
| `data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt` | 26,248 | `2869cfea1243b08a81d878a9da9a51c23eda9d3c651fa6ca64ad23577877639e` | — |
| `data/buildops/westlight-infinity-screen-2026-07-27.dry-run.json` | 531 | `175cbcdaaf8a4dc7475dc7a5147038da0d04b5058634a079587409dc909936c1` | status=dry_run; ops=fa0c4a086f7b… |
| `data/buildops/westlight-infinity-screen-2026-07-27.emergency-rollback.execution.json` | 546 | `db405fd21d026c6c5be559940e23b8b6810b0e08b3179aee74dc1b8611ee764e` | status=complete; ops=8feb080b459a… |
| `data/buildops/westlight-infinity-screen-2026-07-27.execution.json` | 395,490 | `abb229c67ab18c62ae4a92e55b6df46d02d30aa584c0244eb32136c99aa85a4d` | status=complete; ops=fa0c4a086f7b… |
| `data/buildops/westlight-infinity-screen-2026-07-27.post-preflight.json` | 396 | `9b8bab86bf40de9f10c711c1c60a4a97d3ac5505a5c119efaa550ccc6229e4fc` | — |
| `data/buildops/westlight-infinity-screen-2026-07-27.pre-execution-entity-gate.json` | 7,161 | `75db31112b154fecbbd636f854099f03e54a01a51bbdb2a9f1c11ebb04d63692` | status=PASS; passed=true |
| `data/buildops/westlight-infinity-screen-2026-07-27.preflight.json` | 381 | `74fe03d06c0cfd1b2eb78ec659274f9c2616c5486fb947b033c04b0e465890f9` | — |
| `data/buildops/westlight-infinity-screen-2026-07-27.prerelease-preflight.json` | 387 | `9b9ec1a0f36aa53965713bf729cdbd9a956cb3f259e7bce6c8f66e9d4c72148d` | — |
| `data/buildops/westlight-infinity-screen-2026-07-27.report.json` | 4,306 | `cb8401573fc748eb46e1820e7d9883f080ae4598a9676e6f38737b229664b91f` | status=generated-awaiting-preflight-and-live-execution; package=westlight-infinity-screen-2026-07-27; ops=fa0c4a086f7b… |
| `data/buildops/westlight-infinity-screen-2026-07-27.rollback.post-preflight.json` | 396 | `0a121b6e215e7e25e8d20745fbafdc0867380ecfd486ba78932495afd610fd4d` | — |
| `data/buildops/westlight-infinity-screen-2026-07-27.rollback.txt` | 38,592 | `8feb080b459a7b16115bfaef5e54f7c2b9c3aeaa9667e538e5df7cbf4bf8a5ba` | — |
| `data/buildops/westlight-infinity-screen-2026-07-27.txt` | 38,649 | `fa0c4a086f7bdcd92640d63bd57086ad5d2ebd2230f937ad0fc72b93095011fa` | — |

### machine-release-evidence

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/world-review/c01-bunker-detail-review-2026-07-27.json` | 45,241 | `0bc47e3a2db458fea29b7f120c70341211c19c0760beee0430a1746ece9fbf27` | package=c01-bunker-detail-review-2026-07-27 |
| `data/world-review/c01-bunker-detail-review-2026-07-27.md` | 13,414 | `0d45e7cde919832d69578f7560c95c3fded275a785eb4152ba8c280d162e2c77` | — |
| `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json` | 54,173 | `27c505aa8d8544102d06caa93ccda85f274aaae8bf3137ea40c92c72f3121151` | status=PROPOSED_NOT_APPLIED |
| `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-final-20260728T1745Z.json` | 54,183 | `377d0141a3a8bef147c104c06491782ff8c12805d1445e0b6402e5dacddcdd80` | status=PROPOSED_NOT_APPLIED |
| `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-livegate-20260728T1649Z.json` | 54,186 | `0eaea9b5e5e8f7e85cd6997d553161194b15d76264343c46f9995704ac1ee6a2` | status=PROPOSED_NOT_APPLIED |
| `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-terminal-20260728T1839Z.json` | 54,186 | `fa1a9a1a26e5a970466db8280667534db4402408a37a419052473ca52dea5a6b` | status=PROPOSED_NOT_APPLIED |
| `data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png` | 108,355 | `ad1c3b8d80996a6c19220e56d3965b92b74b86be1c0bdb38947ad6385d8242e8` | 884×2148 |
| `data/world-review/citizen-ravensreach-mainstreet-route-map-final-20260728T1745Z.png` | 107,863 | `70e8f146ab521e2a598cb9ff35ee568015127228406d04455ed0346c17e1c1ef` | 884×2148 |
| `data/world-review/citizen-ravensreach-mainstreet-route-map-livegate-20260728T1649Z.png` | 108,282 | `49053d5553b8c6966945daa5c97234f335b00101f031fc5b997cb1e8e35e2a82` | 884×2148 |
| `data/world-review/citizen-ravensreach-mainstreet-route-map-terminal-20260728T1839Z.png` | 108,151 | `d142a75f21153df2865f1e900b138be42f306bd3ffdc1cefac2e70954f8f9881` | 884×2148 |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json` | 305,698 | `465060102bf530632101db4a6e5c69c6b9dc8d3a5936db53c9cb6f40db2528e8` | status=PASS |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-final-20260728T1745Z.json` | 305,663 | `ee01e17756566f23b022ddf501ac9ee944196146470c3199e7a78f87256adda9` | status=PASS |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-livegate-20260728T1649Z.json` | 305,676 | `29722d87ff92a58487f00225cc3595827f6fa95cf32e3213e29396c5bade65f4` | status=PASS |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json` | 306,018 | `a405072bff1b245196d9dd42678296cfcecf25924c4d826207db6d8f4392d77d` | status=PASS |
| `data/world-review/mainstreet-interior-wave2-design-2026-07-27.json` | 45,485 | `8c40ad2270d1e63a158ad1c08797b97b0b886cbc81c2bed9a4885b3a45d46576` | snapshot=a86a81b8cb82… |
| `data/world-review/mainstreet-interior-wave2-post-route-qa-2026-07-27.json` | 28,281 | `8724f0ab30e962c9d23472d1c2468f06ada6cf0c8d90ff320fce12ce082bcb02` | — |
| `data/world-review/mainstreet-interior-wave2-preflight-2026-07-27.json` | 379 | `7ce18965a9c45999a7a16d6c206fc69ba0ae60d3fbd3bdb05826f7090c31b536` | — |
| `data/world-review/mainstreet-interior-wave2-route-qa-2026-07-27.json` | 29,878 | `bbe8785aacbe34e2549633c94dbfc8db6cec53ee309db8cb336217dcb7439304` | — |
| `data/world-review/mainstreet-redevelopment-r4-r5-design-2026-07-27.json` | 202,474 | `eb5665f0961d7959c16fe769ba7226dda62ff0d74c9b71e56ad309cabc9aac63` | package=mainstreet-america-redevelopment-r4-r5-design |
| `data/world-review/mainstreet-redevelopment-r4-r5-runtime-safe-design-2026-07-27.json` | 202,081 | `ec01e52e08f9e9e0bb45bba6416b503774399c1e4f02fc627baf66cbaff42305` | package=mainstreet-america-redevelopment-r4-r5-design |
| `data/world-review/mainstreet-secure-complex-detail-wave5-design-2026-07-27.json` | 5,374 | `74d06de6b53d58e7777bf2e9de13b0fc5ae6b57d4f0bdb59c2801cebc28a61dd` | package=mainstreet-secure-complex-detail-wave5; snapshot=4a754a73f5dc… |
| `data/world-review/mainstreet-secure-complex-detail-wave5-preflight-2026-07-27.json` | 391 | `0f8d04f8b65634b9052eb3931b853e0c89b976100c958112cd8c4ffc5efbdde1` | — |
| `data/world-review/mainstreet-secure-complex-detail-wave5-projected-qa-2026-07-27.json` | 16,912 | `34742f1cd5eccc0fe8b165c156106a83304d677989b1c8deda828c1898d1ca9e` | — |
| `data/world-review/mainstreet-secure-complex-detail-wave5-saved-world-qa-2026-07-27.json` | 15,067 | `545aa1b4b2d7c3337487857ab60f2920055a915f13eaee3e8ab4987b0954ef79` | — |
| `data/world-review/mainstreet-secure-complex-wave5-box-sync-2026-07-27.json` | 468 | `e98be49ed23725918495c2a4abd48e75380036c08175e8588d3b5d2aee08f460` | — |
| `data/world-review/mainstreet-secure-complex-wave5-database-import-2026-07-27.json` | 8,902 | `b3e70f36d67f03e138368697f9ba1181189a32914ca12b191d22b12774506322` | ops=886ed25e9b79… |
| `data/world-review/mainstreet-secure-wave5-wayfinding-preflight-2026-07-27.json` | 389 | `2d6fdda553c84453cfc4e017b39e180ab17fb096b10045c91b0cef7ee45101ec` | — |
| `data/world-review/mainstreet-wave2-r08-design-2026-07-28.json` | 79,090 | `a9ede6e98cfcf599a001002f844ed0c870ce26ced6daa5901802dd235a4d1a1b` | package=mainstreet-america-redevelopment-wave2-r08-design |
| `data/world-review/mainstreet-wave2-r08-design-prerelease-2026-07-28.json` | 79,090 | `cd90cd99248276a6aaf14e84c0839de887736a2f61d678883b0b98052fd6738f` | package=mainstreet-america-redevelopment-wave2-r08-design |
| `data/world-review/mainstreet-wave2-r08-focused-tests-2026-07-28.json` | 3,472 | `d5499dabd5c42380504ba8630372326352fada193174f749aa27624f8d89c0d1` | — |
| `data/world-review/mainstreet-wave2-r08-independent-qa-2026-07-28.json` | 97,262 | `16bb93a4936328ac65f5e5929cacc2f07994b6cef33f74e91af945fd8be98ec3` | package=mainstreet-wave2-r08-independent-qa |
| `data/world-review/mainstreet-wave2-r08-independent-qa-2026-07-28.md` | 1,828 | `adffd0cf6d7ec9ddf626c7966fe98a6595fd6265f90ca715ace381d4b1a8a9f2` | — |
| `data/world-review/mainstreet-wave2-r08-release-handoff-2026-07-28.json` | 6,587 | `20f8ef342227d49dc40eeb93f1a1fa6a521a36064d758ab20a4de3d6dc2b1ffc` | status=OFFLINE_ENGINEERING_GO; package=mainstreet-america-redevelopment-wave2-r08 |
| `data/world-review/ravenrock-wave2-tunnel-database-features-2026-07-28.json` | 150,556 | `0e58dd3f3e91ba35a340616a490c2b54b39cf755b956aef5fd84ebc0f39421bf` | status=proposal-not-imported; package=ravenrock-wave2-tunnel-database-features-2026-07-28 |
| `data/world-review/ravenrock-wave2-tunnel-database-features-prerelease-2026-07-28.json` | 151,182 | `24b7280c109c26bafbdaeb9b52074c309aaea1e28b7db71acdcfcc1575ffcbbc` | status=proposal-not-imported; package=ravenrock-wave2-tunnel-database-features-2026-07-28 |
| `data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json` | 110,329 | `67837484d94b5875c8bdbd48126269bffeb406ac9f7be5a7010d7ca733668b64` | status=offline-inventory-complete; package=ravenrock-wave2-tunnel-inventory-2026-07-28 |
| `data/world-review/ravenrock-wave2-tunnel-inventory-prerelease-2026-07-28.json` | 110,339 | `6900a319dd33c7d034948175a89223d342ed1950a61d7cd9c98cebf88a7457aa` | status=offline-inventory-complete; package=ravenrock-wave2-tunnel-inventory-2026-07-28 |
| `data/world-review/redevelopment-artifact-manifest-2026-07-28-wave2.json` | 159,638 | `2b0d026fb1ffab6dc23e606a61bf4613e0314e03614dc8dc43be48784e03d0a3` | — |
| `data/world-review/redevelopment-atomic-transaction-2026-07-27.json` | 7,522,377 | `294cb722be93048fff55f35496da1439a9fc7fd6bc9aa014ddd50842e3659ac5` | status=committed-pending-post-qa |
| `data/world-review/redevelopment-attempt1-2026-07-27/garage-camera-manifest.json` | 6,571 | `71fd298acfdb072280160dd76dbbfd9c04f61bf263282697b7862be6bf958338` | package=mainstreet-r4-garage-exact-object-after-cameras |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-r4-r5-runtime-failure-forensics.json` | 115,189 | `4925817cf977e4ec328903bfd51a84dbfa61d73191828599fae363adccb405c2` | status=CONFIRMED_RUNTIME_ORDER_AND_STATE_NORMALIZATION_FAILURE; package=mainstreet-r4-r5-runtime-failure-forensics |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-r4-r5-runtime-hazard-independent-qa.json` | 354,210 | `62e468c74d2a18b2862f2aaa8db3b9ef2283ae10ef6694f8a43e91af80913fb2` | status=FAIL; package=mainstreet-america-redevelopment-r4-r5-independent-qa |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-r4-r5-runtime-safe-draft-independent-qa.json` | 117,752 | `510639373c634bf6616e37ffd07efd9a6c3ef3ce4956e6e11988da4cf362be88` | status=FAIL; package=mainstreet-america-redevelopment-r4-r5-independent-qa |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.emergency-rollback.execution.json` | 557 | `6138e998ef7bc3922cddb0b7dffea86f33c677f465591638cf5600fd6e545f6b` | status=complete; ops=98427f36c43e… |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.execution.json` | 1,491 | `d2f90aece46fcf1fbabca6666dbd755125704c46ade3522fc364aedb9cbbf410` | status=failed; ops=c61649579cec… |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.independent-qa.json` | 54,571 | `6540664cb697c27fdee9389a56f3e0f106c3029332cc05c31eb60c276ea37832` | status=PASS_IMPLEMENTATION_READY_LIVE_QA_PENDING; package=mainstreet-america-redevelopment-r4-r5-independent-qa |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.pre-execution-entity-gate.json` | 239,795 | `6128b64ad99903cc57e11679bbd8c11d97a33083a6105ebf2c291559c872c899` | status=PASS; passed=true |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.preflight.json` | 384 | `25c41e5f7cd69a731a7c5f6c505f06bdb0fb6d7fd6b2cb47a03e02906df54d96` | — |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.prerelease-preflight.json` | 389 | `f457c84569c51b6afd560d72a33b38b5996a88559ada9e74aaec3e6d1c35157e` | — |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.report.json` | 257,569 | `aff9a31233c94c301d54aa3519200860615005aa5dc720f67a57b4d20e25dbb6` | package=mainstreet-america-redevelopment-r4-r5 |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.rollback.txt` | 484,747 | `98427f36c43e2f0a76f394cfafb40669d5e0c4ff105272d1e949c6fe3e264efd` | — |
| `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-redevelopment-r4-r5-2026-07-27.txt` | 497,069 | `c61649579ceccc6265305fd191d79d791d1b2859976d9ab8cf858cc0b0eb4514` | — |
| `data/world-review/redevelopment-attempt1-2026-07-27/ravenrock-s1-section-pilot-2026-07-27.emergency-rollback.execution.json` | 547 | `64558dbfc98e8e0ba0a99caae658fec2b79606cbbfc567869ea7da82221a41cb` | status=complete; ops=8dcbc3b11aa4… |
| `data/world-review/redevelopment-attempt1-2026-07-27/ravenrock-s1-section-pilot-2026-07-27.execution.json` | 538 | `61db539723522058982461b87baf49ef6f7dff2a78b898cd20ef0c353ae35168` | status=complete; ops=2869cfea1243… |
| `data/world-review/redevelopment-attempt1-2026-07-27/ravenrock-s1-section-pilot-2026-07-27.pre-execution-entity-gate.json` | 5,365 | `1d8f3570c7d90a8f22f6cd35ec8258b57326ed360dd8bd738bcbe96fbe0c49a3` | status=PASS; passed=true |
| `data/world-review/redevelopment-attempt1-2026-07-27/redevelopment-atomic-transaction-2026-07-27.json` | 320,206 | `6daf1098240cc0232d05c2f1acf06efa50233389289213e93f183ca3451fc1d7` | status=rolled-back |
| `data/world-review/redevelopment-attempt1-2026-07-27/SHA256SUMS` | 3,016 | `cc6886cb4bcc28d6b9b783b5396ee1787435060ddaeecebcd928e04f857a02ab` | — |
| `data/world-review/redevelopment-attempt1-2026-07-27/westlight-infinity-screen-2026-07-27.emergency-rollback.execution.json` | 546 | `db405fd21d026c6c5be559940e23b8b6810b0e08b3179aee74dc1b8611ee764e` | status=complete; ops=8feb080b459a… |
| `data/world-review/redevelopment-attempt1-2026-07-27/westlight-infinity-screen-2026-07-27.execution.json` | 537 | `5bd561bb9e8520427af62787497d448419ddfa35b41a46c9d866a1460262daa5` | status=complete; ops=fa0c4a086f7b… |
| `data/world-review/redevelopment-attempt1-2026-07-27/westlight-infinity-screen-2026-07-27.pre-execution-entity-gate.json` | 7,161 | `5de151d17980defdb4867b36dd955f9a3cc9fadd6b89f6e6892006fda4b2288b` | status=PASS; passed=true |
| `data/world-review/redevelopment-live-entity-gate-2026-07-27.json` | 295,194 | `703b097d201ecc25945b30e2f979241fb9c945badac737cf06358916f1a9e0f1` | status=PASS; passed=true |
| `data/world-review/redevelopment-neighbor-physics-audit-2026-07-27.json` | 12,253 | `afbed67b172b6f932afe25e8b0c2fe84dc77d07d0b792f68b4a6419376cdc262` | — |
| `data/world-review/redevelopment-post-deployment-qa-2026-07-27.json` | 184,771 | `0e3140f01614c21e4dfccad6613cbe0ae17bbf3f865cfbd1eaa2570106b4ba91` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/world-review/redevelopment-r1-release-manifest-retrospective-qa.json` | 7,600 | `6233c3f79993764cdca8c08a8eddacb608996e269bb99c5669fe585613304d39` | status=FAIL; passed=false |
| `data/world-review/redevelopment-release-database-import-2026-07-27.json` | 13,218 | `8c766c45edcade184ab8fb4d4004020c5ecd7ec9fbf0b0bbfb92ae4b59f2bd6d` | snapshot=f8edf99494c0… |
| `data/world-review/redevelopment-release-tooling-independent-review-2026-07-27.json` | 14,500 | `1ba656f4d8340c2585057bf27fbb859654164f2b7de25d1e26cce0efdedb02e0` | status=PASS_WITH_OPERATING_CONDITIONS; passed=true |
| `data/world-review/redevelopment-route-qa-2026-07-27.json` | 313,703 | `beb06e6dcc51761ddf0a98e8da69d4ecb5b2a071ef9f9fe5118cd82e70276896` | status=PASS; snapshot=f8edf99494c0… |
| `data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json` | 949,423 | `e9b3752e89771c4ab218e5811bf23700cfd5f08128e9277324ca9df990f43ef2` | status=committed-pending-post-qa |
| `data/world-review/redevelopment-wave2-database-import-2026-07-28.json` | 26,442 | `5321f35ca15c3b3cfa2dd1de48963776234f53d35d7875e291bcc41cfd51b524` | status=PASS; passed=true; package=redevelopment-wave2-database-import |
| `data/world-review/redevelopment-wave2-guarded-manifest-qa-2026-07-28.json` | 2,736 | `6c5b8c49c1969523f68ca2ebf0edfc51b50aa8f16049f33fd65ce8f49b5cb287` | status=PASS; passed=true |
| `data/world-review/redevelopment-wave2-integration-independent-qa-2026-07-28.json` | 49,446 | `57128eea173ee69776ae3a99dab4109e5759db5bb0ccda960588a607a169d003` | status=PASS_OFFLINE_GO_LIVE_GATES_PENDING; passed=true; package=redevelopment-wave2-integration-independent-audit |
| `data/world-review/redevelopment-wave2-live-entity-gate-2026-07-28.json` | 60,658 | `672e6ae5f5a7560695d01a1c90b35a022a454cebc7c8a039717df98ac52bb754` | status=PASS; passed=true |
| `data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json` | 30,546 | `551be053a21e37edc246f95cb2ded30df138f600f66c5574c2cf9b9b7f321d4c` | status=PASS; passed=true; package=redevelopment-wave2-post-release-qa |
| `data/world-review/redevelopment-wave2-pre-database-qa-2026-07-28.json` | 34,346 | `8dc7d2ec53b7c6c9b4feb88fb4088ba72e2c630b880ddc12cf13736b0b613bc2` | status=FAIL; passed=false; package=redevelopment-wave2-post-release-qa |
| `data/world-review/redevelopment-wave2-prerelease-manifest-qa-2026-07-28.json` | 2,780 | `68296698826d8e58b8304cfcae7c708cf47dfb20f6fc10f4d8b9a779d09c3b12` | status=PASS; passed=true |
| `data/world-review/redevelopment-wave2-release-manifest-candidate-qa.json` | 2,736 | `04c290bdd3f71670f96bdbed4373ec5dff6f490333d4b86968a641bff1c96824` | status=PASS; passed=true |
| `data/world-review/redevelopment-wave2-route-manifest-2026-07-28.json` | 1,344 | `ee15826a9cd87d5f2be5618904c13cde37291d5a30272a32d3e8d5176bcfdb0b` | — |
| `data/world-review/redevelopment-wave2-route-qa-2026-07-28.json` | 103,455 | `6f97def62efe5abb6a3ae89c685cccfa39583b609357273df0855c3121e15ccf` | status=PASS; snapshot=d05ac7822795… |
| `data/world-review/worldwide-room-fitout-wave4-mainstreet-route-qa-2026-07-27.json` | 14,274 | `3450271200f605a851110ded4b519e5a210ee5c3079ae1fc449cb057e0a4bfa8` | — |
| `data/world-review/worldwide-room-fitout-wave4-mainstreet-saved-world-qa-2026-07-27.json` | 13,571 | `bef5eb8bc24fe24e05956b4b159c9b5a929042ad4952f689fb81efc81f2457a7` | — |

### matched-release-media

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/02-parking-context.png` | 141,911 | `29f71ec227fdcf9b138b748e6318e5fba220ddec49e89ffec62b3a0bf0b742e1` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/03-dogleg-north.png` | 17,320 | `cf567261dfb89fa92a69c1cf308770bead4749428628c2a052519d0fd11676e4` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/04-lobby-return.png` | 13,967 | `fd31796449b543aeb6effc8b39db69d4db46b633f113cac6c972ada10747b8c0` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/05-old-new-entry-context.png` | 318,346 | `6257357c14b3848d9242d5a5ed511559d332d0a7d19b00e5efc9469b21885945` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/after/capture-report.json` | 3,860 | `ae8aea87d999f4c02ad61861427f836f870305ecc9a3b623c61c718fc28fe5c1` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/before/01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/before/02-parking-context.png` | 146,514 | `0c5c8301d46f1e313dcf2a78596102eee762ac840e14c8fd07f389c619ebd2fb` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/before/03-dogleg-north.png` | 12,859 | `3aff6b58a99e66608eb44ce00a8e6a713948c0848b3e33493817e2b525cc5836` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/before/04-lobby-return.png` | 13,967 | `fd31796449b543aeb6effc8b39db69d4db46b633f113cac6c972ada10747b8c0` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/before/05-old-new-entry-context.png` | 322,758 | `e636dba720bf8e8085fec00f99f9624628741b3e2892583340c54739ad78f73b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker-phase2/before/capture-report.json` | 3,860 | `73592e1e519a0252d137622b21465e8b77d76e241e079feec773f4c7304294df` | status=PASS; passed=true; snapshot=c9e2bf0a2c8d… |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/01-parking-center-east-seam.png` | 290,414 | `15b8ab8ef7c0be1fcd161fa1f627b8a2a3cc355b81055269c33d992e1ab11a67` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/02-southwest-oblique.png` | 254,705 | `30c0e03d2d55549775b4927a9b851e1709e0d23f0eb9e82dd91c9eba23b8e5cd` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/03-east-oblique.png` | 262,363 | `06e520ade02855e59ab6220952616e7ae7ad1891134041065a78abe7fd8bb446` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/04-hangar-door.png` | 119,637 | `6d54591f31aece72ce30ffcf5a6ee0d53a6ff56def37c239faa03605b5125ccf` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/05-north-oblique.png` | 166,549 | `c171f213f0c705fa9dbcd0fa0a9cc25298df7f0d725c266b016261a901750097` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/06-road-northbound.png` | 55,660 | `9f1235f37ab5365743ad8fdd3bc273f110e4058124f2f98b449c1f3dc9ae9e09` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/07-road-southbound.png` | 82,654 | `2acda770a7a0d32b78e27ab44ada36de454650f05214ca0b648b5880f532ce3b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/08-surface-map.png` | 52,803 | `970009c548bc55d27b67233784ec999c87901f6208f210eec5410da2176cb8d2` | 950×950 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/after/capture-report.json` | 5,508 | `ad1f9cf251836ca1efc05e6b63f348d5cb3273942d0d563d0c1de873267aaa89` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/01-parking-center-east-seam.png` | 293,444 | `13dec97c6b40f9365413a2afd5bfccb4634fc9cee17b76409de24b60332e2b9d` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/02-southwest-oblique.png` | 255,463 | `a34e36fe4337d29182fc1e944d5f28a8fb81480ca8f3b5fbbb108b833fcca6c6` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/03-east-oblique.png` | 270,682 | `2f416466c91a1511e7e508b86f1c70ef6893ee9e1dff7f6dc5dc8b3f66a7bc8b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/04-hangar-door.png` | 133,022 | `85b1d14c6ba8ee73ac3f8dd9f24343d4cc34da3de3a47cbf90ff4fc7e8cbcd8c` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/05-north-oblique.png` | 192,488 | `01a82fc66a1583011d2034777459af2a825eb64b2fb7b917cea74728469a85b8` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/06-road-northbound.png` | 53,311 | `d9d84b776dc956233391f77ace518cbf3ef42543396372b98cbcdd465187f060` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/07-road-southbound.png` | 79,704 | `e6e9937966bbc5f056025baed377f0927eed432b503eec9a1d729829e91fab74` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/08-surface-map.png` | 52,576 | `389f18d73278936921d5b202fe2c3a951a5831d6dcda7045622157fdfabd5abc` | 950×950 |
| `data/exports/redevelopment-qa-2026-07-27/bunker/before/capture-report.json` | 5,511 | `5a2c26281a4d0899550f3067cab86a65d948f057ef48088321c447f9ec93d630` | status=PASS; passed=true; snapshot=c9e2bf0a2c8d… |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/garage-capture-report.json` | 12,400 | `b70ef3d5e12baa1e4939faffdbd4e414eaf0e5958841a310f3e472def263207b` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-alley-w-long.after.png` | 269,820 | `bb55191aa0719832d91079d980acf9aeb97ace4cf421d124bf54f33d7ecf6530` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-b02-culinary.after.png` | 172,157 | `e9eeb33ebe6473360f738458fdedb479f2f003d2ac8ae2a53c9a2c6c3000e119` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-b03-service.after.png` | 247,654 | `7ac65297920c1ffc41f3cb8f1ea63d6aa2738b3479cf91c5fabb467c4bf460e6` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-central-connections.after.png` | 263,738 | `788734738bb143ded283dbe323e33c20b7181ea7e326a8d72863041806e08217` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-district-map.after.png` | 178,571 | `fc861d9b566f5be3740bce7d39a98428cc5412038c9230ca54e8b0500cf1af37` | 800×800 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-district-oblique.after.png` | 304,124 | `388ffd816693b317229b68eea52de71affd2ca3a760edeb405c7caddbd048b15` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-h03-rear-relation.after.png` | 204,219 | `ba2e77a5d85de53d94f19d79c13a708af7f60c484ca81b134bb2bba1eb549223` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-h09-rear-relation.after.png` | 256,237 | `d8431f77ce52fe5a37cde7e7d1964bda101cd67e63b89b9dbac7b5e43687ed9d` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/msa-r4r5-r07-connections.after.png` | 311,575 | `86fead59d32852e84dbf09fbc36487816d9eabe15165de400301ea80995afdfe` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-c02.after.png` | 35,429 | `50c7afcf25e5115d867a0df184efed82646e5c294550702fcd450afd4963792b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-c03.after.png` | 68,282 | `910c1cde75dca766a9a5cb8d47ada1b119f6920084084fd43ec50b5ac3a1225a` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-c04.after.png` | 58,148 | `fa7c9990fcc951252adfd17566cddcb625bb74c1605e19e137516c9304aa3149` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-c05.after.png` | 55,114 | `863bb2463979ef79bcb21f4d8815e91605db316a69f0903355df9b1e8f3161b1` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-c06.after.png` | 53,438 | `0ceb8b004ffa78c7dcd7c0799dd3901fa46e02a633db6ad4b2425a29cb81bafa` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-c07.after.png` | 55,179 | `d0fd2fe7cf60d11c8636cb5ea571a5ebbd52626bdfdbe22a60f010674a8433af` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h01.after.png` | 12,671 | `393c5f02da16194534a818e06c00e24447d6f3e736699a4ebc732dd016e244c3` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h02.after.png` | 15,226 | `940c96e2e9574f132958aa13318ae5d976d6e052950e8e67adc61b113792572a` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h03.after.png` | 55,255 | `d05118cc66a4c10930fa5a486f138ae7c4f1131a7bad928e1a033a4e15d7e506` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h04.after.png` | 66,091 | `46110c2292df31350840a3b199792a01e9accac0ae52095e323131b7839b2718` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h05.after.png` | 56,171 | `f07b10269b860c8b675cd8706bf0dbd3e3cd7ba514d21c77e35184892b25d22a` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h06.after.png` | 48,022 | `78c56a7ef50de9cc7a6aa1eb22cf4ec405541498683fd7e2281f9505d4b2b740` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h07.after.png` | 50,750 | `67199bf0306c74541ed02e2e8de74a91ed8fadf75df946f1b69e2453034e0cb5` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h08.after.png` | 52,457 | `f0ae2ff6bfde40ef51e0f501c0f0dee73b4d288dba063c211d9d5dae91175718` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h09.after.png` | 63,230 | `33fa002a027347d0172541764e88747d48903dc429e2156884ca1e2e719b0085` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h10.after.png` | 43,658 | `54c8f1fe6351b42ba42b337253cc7989913b571e3644a768beabec8de7ff0e9d` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h11.after.png` | 57,984 | `a8502360e35a750c6907f3b1c886e825b1ab8906e7b37e1c60c4d2914dd0cf0e` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/objects/gar-h12.after.png` | 62,135 | `b2f21516e853dee8723b8801ed0949fcb07aa52180e5f0de59dff47f017c52a5` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/after/same-camera-capture-report.json` | 7,152 | `7232a2a0bc6043898f07a2cacf42f7d4c3f531126e8ee24b415bc640a03d969d` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-alley-e-long.before.png` | 282,880 | `afd1314609380000bd89326bec8161275d05ccfaae824069f8b048cd6aee7869` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-alley-w-long.before.png` | 268,375 | `e2c29f3c1fcd9a0936fbda8060808d3aa450b8ea5b2dcab5ea91ceecd5704cff` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-b02-culinary.before.png` | 169,051 | `b872589fe4c57800a8a8c6ba6a1430566aadddac70f6f4566d5e813e4485001d` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-b03-service.before.png` | 220,874 | `82d154b92f0fefb415afe998a9cee7d7a84354bf02561bf991b91a01c4b9053c` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-central-connections.before.png` | 272,113 | `fd40cd80faa3b1087598379b83696a604556657d6ecc2f0f0415957b43b8da62` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-district-map.before.png` | 200,255 | `3bd3e6b19355d5ed73b23c86f71fe669b7e90a6d19e990ab568fb5235edbd5f6` | 1200×1200 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-district-oblique.before.png` | 379,783 | `ae8c02731048ed5b827096478afbc99c579f3ced789c9f223f2f2cb1d211f7dc` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-h03-rear-relation.before.png` | 206,326 | `aaf75fc92a1010398f0e882d4e9dc6ec1dc29d8246b5bff0f071e26d8c2413fb` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-h09-rear-relation.before.png` | 251,056 | `960ce5632e3499a5abf49e0423fc8799f43397e63eee0d6de72f53b7239d4c38` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/before/msa-r4r5-r07-connections.before.png` | 291,356 | `8939b79e9ffff3a2b014c2a3db75b7091909513755e832c585257719a1ce04b5` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/garage-camera-manifest.json` | 6,887 | `6e1a07bcbe08dfc68995e7bb744b8deda270c10fe699f6f215b2b2ec9b9377c0` | package=mainstreet-r4-garage-exact-object-after-cameras; snapshot=64829086424c… |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5-runtime-safe/same-camera-manifest.json` | 15,762 | `a68bedb94370137cdef602eebedc2f0c0735216aff794439d826b562e568a607` | package=mainstreet-r4-r5-same-camera-before-after |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-alley-e-long.before.png` | 284,067 | `75260bc10ae7c1b67b791f3ff490cc98609a263ac16be16a2c1ce254d23e5fec` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-alley-w-long.before.png` | 268,733 | `0a068c7b25158c646b2193b7293c32a34f3157f151823062983296802fcf0c7a` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-b02-culinary.before.png` | 169,044 | `6e849f3ffb1890ead342b141b73908f55f9537a00c29f6217a93578662a42393` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-b03-service.before.png` | 220,243 | `7436f1adaeae5eb4e824836b34fc91479a8aedac0e6c2f729b8f980c93127357` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-central-connections.before.png` | 273,376 | `be01c4c8fa0f55f17c97fb5d8d0dcff991807efc9fea904f3a556fd54148aa7d` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-district-map.before.png` | 199,891 | `13e7ac2c4eb143ff81942603a060b2f0186f9347d120738f8a594904d0ba6b9c` | 1200×1200 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-district-oblique.before.png` | 381,148 | `151f2e88798867c7ef5aa57265bfd77045f25dcab9ed16f8d0682c4f2e0e3b54` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-h03-rear-relation.before.png` | 207,621 | `1af8b79f94a51ccd283c522237428f52554759353997b8d1b632bba1e5615a7d` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-h09-rear-relation.before.png` | 254,143 | `8fa3b286b68a45a87418c5f75a891be7374440e128e77592e13b32f4750f5caa` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/msa-r4r5-r07-connections.before.png` | 290,936 | `4c0e457f070c119cc1910abfac11a66434bb4c33eb12905e4abd7aa0bfe8e5b2` | 1024×576 |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/garage-camera-manifest.json` | 6,571 | `71fd298acfdb072280160dd76dbbfd9c04f61bf263282697b7862be6bf958338` | package=mainstreet-r4-garage-exact-object-after-cameras |
| `data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/same-camera-manifest.json` | 15,386 | `f0387ec5b1f983b468633d59672b4ad00de7a500ebcd001e600d5c48e452f5c5` | package=mainstreet-r4-r5-same-camera-before-after |
| `data/exports/redevelopment-qa-2026-07-27/ravenrock/after/capture-report.json` | 1,994 | `5acb4c05cd115bd32be7bad39998a17075b3ce7a9469d1227031b825cfb7cb4d` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/exports/redevelopment-qa-2026-07-27/ravenrock/after/s1-east-to-west.png` | 26,870 | `6cc97b5baefbe441227ff53159f0bf1909a63ad865b642b71a58d9e50a4bfec0` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/ravenrock/after/s1-west-to-east.png` | 26,057 | `d6143cabef0524f6f73b3c0e18a7303ebea6340f67292e10695410934a8279e8` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/ravenrock/before/s1-east-to-west.png` | 82,932 | `2e3985a73c5b50c430beeafdf79b5e95dd69e572423bca6f91c9da9f5fee668d` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/ravenrock/before/s1-west-to-east.png` | 73,389 | `e1e3184e19de2e0a7404f38eadaf3cba313e8a742c9bef6934d4a3ace5d140f1` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/ravenrock/camera-manifest.json` | 2,041 | `e308e01bd820121f1170a56d8826617f8c7d889f9d8480078ed352555f1ade86` | package=INF-RR-01 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/east-lower-concert.png` | 131,276 | `0a7373a6f44dccb8af7a8be87b29ea666351280c7f9df5f0a91a645d1ca53cd1` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/east-lower-sports.png` | 140,412 | `02d9fbfe028f93e9a6096edac6cb883c29863999f017cd2b7d4d2d6facbaae6b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/east-middle-concert.png` | 207,312 | `215081a596b5beec36a748033a849bdf1962a55e6d06f889cb24597a24c08b8f` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/east-middle-sports.png` | 200,735 | `a02672393d4bf5fb490c4085d8a951d74f733d09c0e23fc0cb0c75d378b04f99` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/east-upper-concert.png` | 284,063 | `374324121a6a3f143e6dcc3c06e983283c26e596163ce22fdbd5fd9eb32cf9f9` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/east-upper-sports.png` | 272,640 | `12155565009e35cce742c59534709ad2455c7c68b566a67578e6f24dbb3555be` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/manifest.json` | 46,259 | `2aa2e29e94954ef4276268acdf60c079079ec3459c96667c148a97317874b5f5` | status=rendered-awaiting-visual-acceptance; package=westlight-sightline-matrix-2026-07-27; snapshot=f8edf99494c0… |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/north-lower-concert.png` | 28,951 | `818f4d5e2ed1c6b8d3ee8d8824d1d5372caf36eb7d05099a34d03a80723f0a27` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/north-lower-sports.png` | 133,240 | `3dd568508e341881b6cf302a3f864e27f27ddf6dff007b3cc8fbc44a3e4c9f3d` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/north-middle-concert.png` | 22,887 | `97c1129f13eb8a3a6ae06ca4a526cf81d811e60196e008dbf7deca59dd8b9ad5` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/north-middle-sports.png` | 152,478 | `5690afada5177d2dfb42fa0b49e51f99b1797b050d4d8beb59902673fd09eaec` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/north-upper-concert.png` | 141,319 | `c361c604a8d203a0fb620bbdc8fb78944df416bd46611bf53548b277077c4983` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/north-upper-sports.png` | 243,356 | `d0eeabd2ec199a5093678b04651c5cdd22158536c2670149c4a739c9c6af08ac` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northeast-lower-concert.png` | 121,515 | `d15888b6922501cc6030e4af5bab1297f46a99a9e33f1c7871ab582a8a691bc9` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northeast-lower-sports.png` | 142,515 | `f6329a8a416637f607f47a7d5b2484aa3555db01411fd6a98958326ff7507782` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northeast-middle-concert.png` | 126,643 | `cfc720e64d460c4ec65aa6a8d063172fe5c2d5456fcdc1dea14fbe05399d3ffc` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northeast-middle-sports.png` | 195,800 | `3a71634ba40ceab42e6ae2ddf23f40278504563b5895b5bb289473f5f033b970` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northeast-upper-concert.png` | 234,838 | `0bf716adfce0fa3c3048be94c49759ddfd1ebd9debf0df834bad27184261eb02` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northeast-upper-sports.png` | 282,946 | `2df2c10eadca3ba98438176740713c6b5db38d656c744d427c1e442fbdd54320` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northwest-lower-concert.png` | 123,763 | `47fff5432eff054c9c59928b40af9e17cff1945aec4fca903d0f611582556e83` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northwest-lower-sports.png` | 143,378 | `accab97fecf2b068a8ed2f47e65b302ba26b95be236e7394ec4dac1322ff69da` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northwest-middle-concert.png` | 124,447 | `2a1de621f3adf2d033ee7636faa3392ad1d26e9d41bc93aa97d94ab7dda54a54` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northwest-middle-sports.png` | 186,991 | `dbfb739906fdd1cae8be9296e9b318d4b444596ad0f79c29a6fcff182b38a557` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northwest-upper-concert.png` | 220,203 | `e79c6411f40ba1f8dc17115ba0074fb98a1b5e7fcb295d3087c92eefdce4daa6` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/northwest-upper-sports.png` | 266,346 | `24bac06c11c87756e9359249de952f2672307281a7d398160743d98092bf5355` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/south-lower-concert.png` | 126,909 | `77286d71bd51d7d243c566858ecf324be677a87e6bd2d17377edb6cd52baf06e` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/south-lower-sports.png` | 131,704 | `577498d4a8c06d9e33e5e43ea80ea0cbeca42b6bdf9166974c06106e53b1537e` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/south-middle-concert.png` | 190,616 | `bb74b48324cdf6bff2c1b83f10fdeb54a4b91421de62467c772c31065a292044` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/south-middle-sports.png` | 155,680 | `29a98c42dce8764b38202bbfc2f882ce5fa27717b8b2dc2d2d59b88c956e6881` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/south-upper-concert.png` | 275,245 | `250cff661bb51941bde43f21e0c463c513ff30ec3dc9a5d561c93a7f351f0864` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/south-upper-sports.png` | 254,004 | `4c5cef5544a01ad1e9ac4f493f37c8f3c0cffdf53367206d562ccafe04b927d3` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southeast-lower-concert.png` | 137,134 | `44e725612384fee1e23e46b10a2feecdda65d34e5e791e775553cd47262632ab` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southeast-lower-sports.png` | 140,470 | `6f4e79e9d2476c43e05475d71e511e6d1ab80cbb04b575c7e27a726e7b26576f` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southeast-middle-concert.png` | 226,861 | `e18303c05885bc03f27d9b69bd6561fda1198fda193a1461164a324365e35deb` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southeast-middle-sports.png` | 202,683 | `1b9605c1b01f26d06efebc94650368e140ecec125c5bdb35d03aa3bb45e2442f` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southeast-upper-concert.png` | 307,356 | `0654dae8a822e3e3a78d6584d1431124cf71395b6bac462f3de85647af4a55d3` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southeast-upper-sports.png` | 291,541 | `9e8448d496da67e7357cd97e02470335b07d26abfcfc357b24317c6a989ad64b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southwest-lower-concert.png` | 138,254 | `d186e7b798e7ef917548cf1e7638c25c60e7a1d9fa725415d6376f4f95fc624c` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southwest-lower-sports.png` | 143,196 | `462fa591831010025583c66d8493427248cbf5498751b03c4125e0a8f7fce647` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southwest-middle-concert.png` | 223,478 | `17194d80f4e3923e5dbf57502e6f0b7617d4557d7b1f974874c2c7315e795e03` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southwest-middle-sports.png` | 191,076 | `d20f10b0ca6329b3f061ff6247ec1201792df2e330b68dbe34bbb416ec6ac0a3` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southwest-upper-concert.png` | 294,157 | `54d20caccd22d211c162f4dd582cc46a120b0b320f6c7763a0a2c9375879aad3` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/southwest-upper-sports.png` | 264,974 | `59d0db1e1aaba1ac1a384fa17af3eb86cc7bd043d53d4b9aa6c195a5b988007b` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/west-lower-concert.png` | 133,844 | `50294897a1d4920ffda87825683c93e1290a763e4034f3aa5637610bbedd0ffc` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/west-lower-sports.png` | 139,225 | `02cd8567ea1dc8e79f5039ff9913f51275ae58188c30f95a4096593a46a74bad` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/west-middle-concert.png` | 197,242 | `1f5fe9201f5fda064975bdd06e06ab5a7a9aca3c689014b1109f1e13ad0f1bee` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/west-middle-sports.png` | 185,603 | `2e87a04afd460e5453dc759f92571d5f6806a46ee302aaeba1fc295a6e52078e` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/west-upper-concert.png` | 257,257 | `d784b9294def324f04a0b6822d43d2f576aa36bb8dedc54cc5826105cf7da177` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/after/west-upper-sports.png` | 249,447 | `c8e56c2a72d5922cdb48bd038990aaa31f71448568d23dc9499cfc82a18ca981` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/before/east-lower.png` | 170,566 | `22c26021a5a582133af6d3c0ceb76235c0586b15df3722e51519de7ca4976bae` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/before/north-lower.png` | 124,042 | `498cf69d82ffbfff338df39768c134fe0d23cc3abbd1d4d10ff6a2cd960fb6e0` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/before/south-lower.png` | 159,390 | `bd72661e2fafec15587a8c769528a2f61bf0e15b5d379ee987acbc1d52992cad` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/before/west-lower.png` | 169,524 | `18c4b42448e6fe31abb85b754a51caca79b6dd7e3dd7c1f0e7fc4075b40472fd` | 1280×720 |
| `data/exports/redevelopment-qa-2026-07-27/westlight/sightlines/camera-plan.json` | 36,870 | `a76dc23d24235bb1ea6ae05f148d828187ee68c0d382e688f9dc4c3735196b9f` | status=camera-plan; package=westlight-sightline-matrix-2026-07-27; snapshot=c9e2bf0a2c8d… |
| `data/exports/redevelopment-qa-2026-07-27/westlight/sightlines/manifest.json` | 36,870 | `92f329fe2db4295ac7dcb5fb93a2675d62ef899ad3645689228f7b4e40663a74` | status=camera-plan; package=westlight-sightline-matrix-2026-07-27; snapshot=c9e2bf0a2c8d… |

### planning-and-reports

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `docs/redevelopment/2026-07-27/as-built-release-completion.md` | 23,383 | `66801b4ebc9e5942ccdf7eed536c33a1c1f4b3017adec42f6939b20d23851f23` | — |
| `docs/redevelopment/2026-07-27/atomic-release-report.md` | 8,229 | `1d3cdff994cfd4fb0b6143180b8baf33565899dd97956e1f8759908a090d2736` | — |
| `docs/redevelopment/2026-07-27/bunker-surface-release.md` | 25,871 | `a2c563cc11fce378b1306492013f1bbc4dbc492cc974309a014af9f061515e14` | — |
| `docs/redevelopment/2026-07-27/database-and-media-report.md` | 16,944 | `1972e47236b0b8a95597256385a4937502c9efbfc80a3d8a3b1c3a290a02d054` | — |
| `docs/redevelopment/2026-07-27/execution-register.md` | 3,064 | `5b2dc8b7f68cc929464d79d47a9c9f4de0a639c126a9148e53e3e15d7d1b8e2a` | — |
| `docs/redevelopment/2026-07-27/infrastructure-audit.design.json` | 19,880 | `ba3a8a2efef915edfac62e57941fe5739d8b0c53635036869a8042493fe8ea8b` | status=design-audit-no-live-construction-authority |
| `docs/redevelopment/2026-07-27/infrastructure-audit.md` | 49,323 | `99cdfc1815d6f973d9dd7d1c7aa059a9c753809241b1eeebd4e7544e968ac7bd` | — |
| `docs/redevelopment/2026-07-27/infrastructure-standards.md` | 22,332 | `bd619c9939e1be2399cd4b9d6f4e4a8468bf5d3f3f27a9888a0ea40005c77e8a` | — |
| `docs/redevelopment/2026-07-27/mainstreet-r4-r5-engineering-release.md` | 236 | `2eed384bd26469f74f7bc7e99590c07d204e47911cff7de4236a702bf66c1182` | — |
| `docs/redevelopment/2026-07-27/mainstreet-runtime-safety-follow-up.md` | 12,990 | `04f0e73a7baadd1453b677505a282bef18919497b3bcb181b370c78fbc9dd78c` | — |
| `docs/redevelopment/2026-07-27/mainstreet-surface-release.md` | 24,110 | `d6a8e9944eca4d3e48555d90dac302c002ce4ed59670e5e4d150b1d52b3f1d21` | — |
| `docs/redevelopment/2026-07-27/master-plan.md` | 37,550 | `6be5260ee509efacd5e8130e15a2ecd805bdc19767e48da299e6dda5ca0b14fd` | — |
| `docs/redevelopment/2026-07-27/post-deployment-qa.md` | 3,450 | `bce100f43b2c97a737c644712a6e82ed5bfd0b305a31dd1cf6ab2933702bc278` | — |
| `docs/redevelopment/2026-07-27/README.md` | 5,374 | `a9f59f4fd2778db9e94874c669f9a40bda0be53b1cd47da5536d354c85482e38` | — |
| `docs/redevelopment/2026-07-27/release-attempt-1-incident.md` | 5,185 | `7eb2bf91feba587b081bbdbf72d0b4d8e037e319ab62b78de74001e9edd86b42` | — |
| `docs/redevelopment/2026-07-27/requirements-traceability.md` | 8,254 | `0cfcd173dae4b470d2c3702342e5787600e744fb19d6bbf817eee1aa984dfcc5` | — |
| `docs/redevelopment/2026-07-27/research-bibliography.md` | 23,842 | `82c775639c6bc37392d216166aeb5e120abf5beea0daf3797ffd5b3aeb96020b` | — |
| `docs/redevelopment/2026-07-27/risk-register.md` | 15,526 | `9347a2ab3a71f7ea44ff49fa9b6b63a8b8543cab90a48a6ecadea24619bca9be` | — |
| `docs/redevelopment/2026-07-27/tunnel-repair-release.md` | 17,680 | `7920fa1fd82795d8517701667f3facef1e2ac5656fbb5e634277a4a779743c00` | — |
| `docs/redevelopment/2026-07-27/visual-evidence-plan.md` | 4,748 | `46b8aa33313b12be8ea458bb3b6c46d1d76eacca066bb3be6d5004a81cd5c766` | — |
| `docs/redevelopment/2026-07-27/wave2-media-catalog-release.md` | 19,617 | `3b2b7eec0cc0b6e0f7762db1c6b7cfc8e3b0b5a7a8a872623f6b18664acc05ba` | — |
| `docs/redevelopment/2026-07-27/westlight-screen-release.md` | 9,995 | `7dafc842ca52e4141180570f0ddb8c2ea826d3837aa246c1617a88bbd33f7709` | — |

### release-automation

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `scripts/__pycache__/audit_rcon_runner_chunk_streaming.cpython-312.pyc` | 26,230 | `14dbb218fd50f2233d5d4771c84d9684dd4621cd0dcc3d58784bee86f0acf421` | — |
| `scripts/__pycache__/gen_ravenrock_connectivity.cpython-312.pyc` | 1,508 | `3b70648e76e48b28d1c58b1fb2e2f6ff5a0662a28f2229494bdce30d5aeb0a31` | — |
| `scripts/__pycache__/gen_westlight.cpython-312.pyc` | 38,284 | `0e2b3084040c423037e8c84c2340f8bcb47c812c01a407a0b1d54c05760c8b35` | — |
| `scripts/__pycache__/rcon_runner.cpython-312.pyc` | 70,164 | `2688d144e6ca8131711ea53cbd28c5f4202f332b3d38568a63f02166f83d10bf` | — |
| `scripts/__pycache__/redevelopment_live_entity_gate.cpython-312.pyc` | 51,696 | `783fe5632ced300bdc4e8515e25fd6f3eee9bf6d71207210ff3cde4e03f9fa00` | — |
| `scripts/__pycache__/run_redevelopment_atomic_release.cpython-312.pyc` | 45,698 | `a2ebdae4c32a698defaf14df2424ea743ba37e11990b6b00a18648fd64482287` | — |
| `scripts/__pycache__/run_redevelopment_route_qa.cpython-312.pyc` | 15,807 | `812278a22ea1c9693d9e510e4361f84e119db1cefd5324739655137af75a12d5` | — |
| `scripts/adopt_redevelopment_render_cache.mjs` | 8,339 | `fbdb018b9a83d06053a6cecc99717550a57a3f32c9f9883a876ba0db1abf7769` | — |
| `scripts/analyze_mainstreet_redevelopment_runtime_failure.mjs` | 14,641 | `77d4af82b8cea455fe5fded04dd733dcb50470f5fbdef51e12ae276fabd728b0` | — |
| `scripts/audit_rcon_runner_chunk_streaming.py` | 24,700 | `3949284c88005442c6cb059f7b03d9f4a9dd957d7e9e8a3c3130b3f3fddd5093` | — |
| `scripts/build_redevelopment_kb.mjs` | 25,126 | `92d8d5ca58355dc0f80371687917e71d8936b41e6b244a10504d939e4a2994cb` | — |
| `scripts/finalize_ravenrock_t2b_wave2.mjs` | 9,478 | `ddb9c284fba6ff4028786dc0f8b516e2540c9b697132c363454c97e9eec54d39` | — |
| `scripts/gen_ravenrock_connectivity.py` | 951 | `38e51e0d3917d24f3e230281304e8c41c13f536659fdb5868c8f797813e59bc0` | — |
| `scripts/gen_westlight.py` | 26,519 | `b72fd53407bf4b7360a3a52248c698bfb9aefd25d08d7c9524e19d927d97233a` | — |
| `scripts/generate_bunker_recessed_portal_phase2.mjs` | 34,808 | `aeeda1c1dfab2b8d0abd87e0678e988f2299b4873ce2c8f00d815666e6968c16` | — |
| `scripts/generate_bunker_surface_phase1.mjs` | 45,680 | `c54c517c8acbb04cd75b67e6f769e78b2f12ed47a746081507380cd8e4b1e6b0` | — |
| `scripts/generate_c01_bunker_classification_manifest.mjs` | 42,758 | `e04e5c51c1bc145fec0d8f51ea1c67879c7b56a2b17da90768d25593cee7149e` | — |
| `scripts/generate_mainstreet_garage_camera_manifest.mjs` | 2,390 | `c6bbaa94a09b93b6d39be71229e11b0a3894f20ee62e9ed824abe5a02356c61b` | — |
| `scripts/generate_mainstreet_redevelopment_r4_r5.mjs` | 97,997 | `8c18fd13e4801b01f8af23b185cc60b32584d348321ecf74984a68fe455ae5e4` | — |
| `scripts/generate_ravenrock_s1_camera_manifest.mjs` | 3,212 | `210182d9a64b8134b6e038167c4c507cb6e56c6a932df07ccdab622af8023e24` | — |
| `scripts/generate_ravenrock_s1_pilot.mjs` | 21,543 | `95e1a8a12d2cab19d677e3c55ea65d5eac0a3f8d122fa2e7ece9a741c3516b73` | — |
| `scripts/generate_ravenrock_t2b_wave2.mjs` | 40,698 | `e3aa809ff504b54cc4d90f75d7594252a3796b890065bc82d8fed50c11333487` | — |
| `scripts/generate_redevelopment_artifact_register.mjs` | 17,464 | `65c12ec3dd029dcc2d2607f9b744681ec8a5749a6f2a04f9cc033573a0bdb693` | — |
| `scripts/generate_redevelopment_dossier.mjs` | 30,153 | `5ef04be93248d7422ad8453a819dc5ebb22ed724b3ad9f26b24d47705e7625ab` | — |
| `scripts/generate_westlight_infinity_screen.mjs` | 9,278 | `1404d2154c98edf97e6df1d93784b352cf1c5a3826d64e1099d25eb17ee90a6b` | — |
| `scripts/generate_westlight_sightline_matrix.mjs` | 6,254 | `2be31af175fe697f143278ca9868e17a703be6d9c7a09f1b0c9df52c0a01326d` | — |
| `scripts/generate_world_catalog.mjs` | 45,632 | `844b5e544a6133f96fa4b14b9e3cc2a54536d3136bb40a8e804d7dde231bafc8` | — |
| `scripts/hash_world_snapshot.mjs` | 914 | `b3335e78c1c38de9e079566d79440a9df5a98758db2b59fee20bdfc2f56cdfd2` | — |
| `scripts/import_redevelopment_release.mjs` | 14,986 | `c43755249c9fa1d5ec155a92faa22c4875922a4111596f399e49307420569c85` | — |
| `scripts/prepare_town_expansion_world_showcase.mjs` | 17,097 | `934a465121d3781b70e2c9e8e38fefd2399f8c4a7c701be1595c55de07e4f8c6` | — |
| `scripts/prepare_world_showcase.mjs` | 15,108 | `1b8fcdad03f552d76cae887192ddc149eeed015c959e1c30fc29011c570a9829` | — |
| `scripts/qa_bunker_surface_phase1_independent.mjs` | 32,525 | `51ea42859f0113f2bdd21df7b34cc0f5a4c22d3e982e7340336c3a9078dc022b` | — |
| `scripts/qa_c01_bunker_square.mjs` | 38,006 | `d94941102d87cf0b5c4e53e105d13c76cd20c58e15228a3d919c43929f1cf3fc` | — |
| `scripts/qa_mainstreet_redevelopment_r4_r5_independent.mjs` | 64,203 | `6799ae2717002fff02e10b952dbf218a797b1cf70e8c0e460ff0a949694f06c4` | — |
| `scripts/qa_ravenrock_s1_pilot.mjs` | 17,876 | `8b9d96d02ec8e560c6d068825ed1e46fdf469f8416a6190ef03275cbbbce9f0e` | — |
| `scripts/qa_ravenrock_t2b_wave2.mjs` | 21,388 | `de664724a82a9a000618a497b6c263914e52ddfbf89c39fbbf1a280b2a50501e` | — |
| `scripts/qa_redevelopment_atomic_release.mjs` | 54,509 | `e8c6d63171313f360a3868a8e255400f61659bf264ddad4cf939217d8132bfa9` | — |
| `scripts/rcon_runner.py` | 66,045 | `f3c29f052cfe9f9a59e41a86c5ae6f7655c33e09962d5a47d6d5b62c1735a0da` | — |
| `scripts/redevelopment_live_entity_gate.py` | 49,621 | `8c3557ba8e84789cad47d198d4ed0ec21139c17eb03bfed6d2f3570189f25e8c` | — |
| `scripts/render_redevelopment_camera_manifest_batched.mjs` | 4,444 | `2627a8c9d709a233a5cd2b8fcb0cc5c69adc2332bcee82f50ee3f1c95c9cea1e` | — |
| `scripts/render_redevelopment_camera_manifest.mjs` | 17,679 | `b80e30b16cf43441fcd8470e93ae9e3772232bb5598642cc287869b1ffb5b8cb` | — |
| `scripts/run_redevelopment_atomic_release.py` | 39,522 | `5c4c296e210b7482412ef77d756bc21767041006c9fb2f49eaf834a2e161320a` | — |
| `scripts/run_redevelopment_route_qa_standalone.mjs` | 14,418 | `27805781e370257e6214fdab6f7bada9532979ef19721331488d10bc7e9b2cb1` | — |
| `scripts/run_redevelopment_route_qa.py` | 9,918 | `d55c0872ee2ec2b654d8ae18c7af82f4da942f10aab78023641d7214f3602297` | — |
| `scripts/world_snapshot.py` | 2,652 | `9b347f37dc1f708229e86b42383d673f4266dc2cf52080c2992db36e6f793d0a` | — |

### release-tests

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `test/build/adoptRedevelopmentRenderCache.test.ts` | 8,575 | `2a207c7593232d0718abae92b6087d590ee758183c322131f6d4dfcdb3eef7db` | — |
| `test/build/generateBunkerRecessedPortalPhase2.test.ts` | 7,151 | `319b950c0c3f523f47c67a36f00450d2f752308b6167c28948e65cb395bcb73f` | — |
| `test/build/generateBunkerSurfacePhase1.test.ts` | 8,816 | `67ffb8fe1173f08dd6d676ff6b3415e284ce69786df1697395daba4d8b5d2325` | — |
| `test/build/generateMainstreetRedevelopmentR4R5.test.ts` | 15,322 | `0da32532dddcd68d7b03692cde3bc82bcee070cc8c1b9c4c2cba72351e429c4f` | — |
| `test/build/generatePicketFence.test.ts` | 9,959 | `b3607c06851aff13b2b99bf80cc3ef91eabe3468fe32ec86ef9978b5752e3967` | — |
| `test/build/generateRavenRockS1Pilot.test.ts` | 4,812 | `d4382ddb98e6b701813ec056ee4200e428c6b98ce0e71b19359ec37e462e14e8` | — |
| `test/build/generateRavenRockT2bWave2.test.ts` | 5,917 | `c025eefa50bb6e7bc0992ad0ed30dbf48bedcabb8005e5f01d1fac641bdfe15f` | — |
| `test/build/generateWestlightInfinityScreen.test.ts` | 2,766 | `12039e8a9f136bbd4159d349f980e0a0dc131d81e1cd5fcc092c6cce0f89bcc6` | — |
| `test/build/qaC01BunkerSquare.test.ts` | 13,816 | `b759ecb4411250bcb9a76a5c4dc8cfec65126a5de79018261b7659ea8aea4c41` | — |
| `test/build/renderRedevelopmentCameraManifestResume.test.ts` | 3,801 | `35617389d75dcded2e03d7ee61aebeef2c0782166fc85b28aa467f0132a57c24` | — |

### showcase-source

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `world-showcase/.openai/hosting.json` | 63 | `f08b9505068c5dd23dea5edbcd40dc469d630eca04f0007aede2509b3d1c01b1` | — |
| `world-showcase/.sites-worker-bundle/README.md` | 121 | `57eb15e3b08d113b6a947e9d30422636f3bc53dfbe4ceb3f34c61a22583ce203` | — |
| `world-showcase/.sites-worker-bundle/worker.js` | 3,868,141 | `52fcd10d5081d8d215c28efa1f424f0fac72590b78a25d7ee5c5dc2114d65b50` | — |
| `world-showcase/.sites-worker-bundle/worker.js.map` | 4,971,661 | `8811ed41361c8ebb1f785b3c8bd8a1ccca7193a40471ccfb235cd435fab9bc64` | — |
| `world-showcase/.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite` | 4,096 | `4c34b48e33536be849e9810707c97ff2b5625bb5cbf1637dbe384cfffdda3b9d` | — |
| `world-showcase/.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite-shm` | 32,768 | `b19f28e1dcd1a956900e494146df0ee782e08f6111a2b17933efa14f52d205f2` | — |
| `world-showcase/.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite-wal` | 8,272 | `68a163795b1f31f159c8b379c774d4636cd1b31a4a4ea8a2a8f5ec5570969f24` | — |
| `world-showcase/app/api/auth/route.ts` | 951 | `8702da998dcc48db137d194af96df124ab26f4ddc7c129ab5ffe7086735a5a7a` | — |
| `world-showcase/app/icon.svg` | 403 | `3bc73607538133d6dc7d363df9a17fd1c05b2306a6274ad89e42c97c924ccd3b` | — |
| `world-showcase/app/layout.tsx` | 483 | `1d0455efe73136779daccb61034536ed8106a7cc76da607d4687e9f544c473ae` | — |
| `world-showcase/app/page.tsx` | 14,037 | `4389cb6ad0251190905c8e0781a95244e5f10706dac70b7e62e2d91f15c49743` | — |
| `world-showcase/app/styles.css` | 18,153 | `c441d378181f66d8fc25d216cf1f3a9e76cf94d1df9401ea48cd8e55a6158b53` | — |
| `world-showcase/components/AtlasExplorer.tsx` | 3,291 | `ddbe9fa0341344081d41b2a9d13660fe120cb31807867f6e531cf0412748c42e` | — |
| `world-showcase/components/PasscodeGate.tsx` | 5,026 | `d73ec21599a40eff5cc2d4e2fdcb92989804f454e317611831d50afab95f6034` | — |
| `world-showcase/lib/siteAuth.ts` | 1,874 | `99be14b512c1cba499172a87ccd92128b9efc68c78372f5675c652d9bafd593b` | — |
| `world-showcase/middleware.ts` | 1,839 | `bc844273b4dcbef769e2bb90a21f91678f853c0269c2aece30b6dd995436b280` | — |
| `world-showcase/next-env.d.ts` | 262 | `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6` | — |
| `world-showcase/next.config.ts` | 185 | `ce1d9fbc19a4e45b29ba9b91f2d9aedc68bfedcb0f512324ae140dfcbe29a649` | — |
| `world-showcase/open-next.config.ts` | 109 | `48a47e57593373c29b88d2d1bd46d29e602fd051c19afc28f3b0be17f94ae1d4` | — |
| `world-showcase/package-lock.json` | 229,826 | `27721a8bcdd9840db2649d0f0749584159137e64692ae3c63359c531a43de316` | — |
| `world-showcase/package.json` | 786 | `a142187d66c3c15f2b77849f6645b166c6a2a44bc80ab6860d7eb85501abc5e2` | — |
| `world-showcase/public/_headers` | 169 | `ef6c06564dbab78e8364762bc14b738bed0dd47cd371df78d17b6e79e3ef21f6` | — |
| `world-showcase/public/atlas/mainstreet.png` | 121,884 | `21ad78a19ae0771b3530c50339aa636e5e860876304632d5b3d927a9d27c5c29` | 1600×1100 |
| `world-showcase/public/atlas/raven-rock.png` | 544,752 | `b1499849a0eff00179b0c20de150cd583277a4faa1a99dc3d57d25c0de3de13b` | 1282×1282 |
| `world-showcase/public/atlas/ravensgate.png` | 73,340 | `bf70ec0b2a61a432c825874a8f1a34458b697514a17580b62fca8a22123d6b52` | 725×965 |
| `world-showcase/public/atlas/ravensreach.png` | 108,897 | `87da0e7059507a5a29b5ea692133beb4cb2eeef259048d9ac437a5c2484a9780` | 805×885 |
| `world-showcase/public/atlas/underground.png` | 92,658 | `3fde1c06f175bd2d915f84443612ba0ddccd636f0e754b4542770dc285ce25d6` | 1600×1100 |
| `world-showcase/public/atlas/western-corridor.png` | 196,877 | `d896cc811b678ec6fb3a5a6d3f1fe55d18d9da98bdf9308fb172d6d80aa75346` | 1395×1107 |
| `world-showcase/public/atlas/westlight.png` | 128,682 | `1909c753f8d0ce288c321b5a532574b25b38b7275bb392fed5d17b523f2a653a` | 900×1028 |
| `world-showcase/public/atlas/whole-world.png` | 1,213,312 | `b95bcbb9c10dcf599f7688654510782ff9350c7432189f414eeee04e39410c2c` | 1792×2176 |
| `world-showcase/public/catalog/mainstreet-america-apt-s01-03-observatory-penthouse-plans.png` | 261,845 | `f0ba5819f3d2e8a5288cbad8e9e4b9c7faf8d404f27d8dbfba4ec111f1d5eff1` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-b01-mainstreet-america-b01.png` | 41,552 | `a7ceeefdbf41535b8d7471844fb50011ee2632f253fcc166da05d9a2c47ccbab` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-b01.png` | 41,552 | `a7ceeefdbf41535b8d7471844fb50011ee2632f253fcc166da05d9a2c47ccbab` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-b02-mainstreet-america-b02.png` | 42,560 | `eae289d5d1dcbed49a83f3dd1359ce12868ce19b46cad9f23734a3eeddaf67a1` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-b02.png` | 42,560 | `eae289d5d1dcbed49a83f3dd1359ce12868ce19b46cad9f23734a3eeddaf67a1` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-b03-mainstreet-america-b03.png` | 41,718 | `23035fd85045ecbec168d53ac410203e141d46d36771e42ae9a828d89f701c96` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-b03.png` | 41,718 | `23035fd85045ecbec168d53ac410203e141d46d36771e42ae9a828d89f701c96` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c01-mainstreet-america-c01.png` | 99,213 | `d9e6df901c83ce9967b1b14734d2156d03c0bfe454b2b8af2161479c71c50a6d` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c01-public-entry-mainstreet-america-c01-public-entry.png` | 52,264 | `4d8b9ab1c053c4b4acf7924591d348925e8867179bc7d32e634f6cddb2d15cb8` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c01-public-entry.png` | 52,264 | `4d8b9ab1c053c4b4acf7924591d348925e8867179bc7d32e634f6cddb2d15cb8` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c01-public-portal-recessed-phase2-mainstreet-america-c01-public-portal-recessed-phase2.png` | 226,044 | `8023bb700bf60b10f2a1747b4e28a42ee65614f10a10ec025feb3cd3195e0e45` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c01.png` | 99,213 | `d9e6df901c83ce9967b1b14734d2156d03c0bfe454b2b8af2161479c71c50a6d` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c02-mainstreet-america-c02.png` | 39,968 | `e0383d5017c892adc772b8a0e2cbf173223b8ca855b51e3b531f5d145fbbaee1` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c02.png` | 39,968 | `e0383d5017c892adc772b8a0e2cbf173223b8ca855b51e3b531f5d145fbbaee1` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c03-mainstreet-america-c03.png` | 39,022 | `e42b5b18d6951df1a7ee36d2a4e42c4f1ddbac54d071b706f950f736db85f9cb` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c03.png` | 39,022 | `e42b5b18d6951df1a7ee36d2a4e42c4f1ddbac54d071b706f950f736db85f9cb` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c04-mainstreet-america-c04.png` | 42,745 | `0e6e2438002f91028803efe21388a9b48b5c1d52bfa19674b384ecdc71b20ada` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c04.png` | 42,745 | `0e6e2438002f91028803efe21388a9b48b5c1d52bfa19674b384ecdc71b20ada` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c05-mainstreet-america-c05.png` | 41,897 | `6e0f70a59d6486647244a2c226e996e2fbef9c6a6f420d5a4f3bbd1be4ebc1b0` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c05.png` | 41,897 | `6e0f70a59d6486647244a2c226e996e2fbef9c6a6f420d5a4f3bbd1be4ebc1b0` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c06-mainstreet-america-c06.png` | 40,198 | `8d46e23748d10a71e1cad6478fae5af089c5064741c6545452ee2f00d395846f` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c06.png` | 40,198 | `8d46e23748d10a71e1cad6478fae5af089c5064741c6545452ee2f00d395846f` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c07-mainstreet-america-c07.png` | 39,195 | `110e97d01c42ca534d89fbcfa24409e40bd3c3497838a36cbcb4067be1b6dbf7` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-c07.png` | 39,195 | `110e97d01c42ca534d89fbcfa24409e40bd3c3497838a36cbcb4067be1b6dbf7` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-grid-e2-building-mainstreet-america-grid-e2-building.png` | 60,161 | `7fd45ae547208a00a09e6fd54168de19dcdf16f2b8ca7d6a3141f290f13b8598` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-grid-e2-building.png` | 60,161 | `7fd45ae547208a00a09e6fd54168de19dcdf16f2b8ca7d6a3141f290f13b8598` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-grid-w2-building-mainstreet-america-grid-w2-building.png` | 69,460 | `e205b0ea84a9959016c8a193ad4fb97db845e9f0d014f20a1be35ad58f961adf` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-grid-w2-building.png` | 69,460 | `e205b0ea84a9959016c8a193ad4fb97db845e9f0d014f20a1be35ad58f961adf` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h01-mainstreet-america-h01.png` | 69,143 | `7b4bdb3a197b0505e94597e6508a5cdbbd92a73e6c30d648372a1b9c8b8d30b9` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h01.png` | 69,143 | `7b4bdb3a197b0505e94597e6508a5cdbbd92a73e6c30d648372a1b9c8b8d30b9` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h02-mainstreet-america-h02.png` | 54,948 | `c46d55a882098ea2bb4c3007014463866e06ea0f17db510d5932745c809ed25c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h02.png` | 54,948 | `c46d55a882098ea2bb4c3007014463866e06ea0f17db510d5932745c809ed25c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h03-mainstreet-america-h03.png` | 55,489 | `3e7ef85e3e7df8abd0f3f1b8a8c2def4025e96f80c4f684fd7872368dc04dd5c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h03.png` | 55,489 | `3e7ef85e3e7df8abd0f3f1b8a8c2def4025e96f80c4f684fd7872368dc04dd5c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h04-mainstreet-america-h04.png` | 56,829 | `72db4aa39d4af779457172891a37b6c02b3fddae716aa2eb0106a2cf23a63665` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h04.png` | 56,829 | `72db4aa39d4af779457172891a37b6c02b3fddae716aa2eb0106a2cf23a63665` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h05-mainstreet-america-h05.png` | 53,159 | `8b10266cad25b4c43aa524a815f2b0efaa7e25d7fb217f81641360993296833a` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h05.png` | 53,159 | `8b10266cad25b4c43aa524a815f2b0efaa7e25d7fb217f81641360993296833a` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h06-mainstreet-america-h06.png` | 52,860 | `1e18058af15554c65a6bde310d45722fea2d226f7bad3b162ab180dba5f7de9d` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h06.png` | 52,860 | `1e18058af15554c65a6bde310d45722fea2d226f7bad3b162ab180dba5f7de9d` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h07-mainstreet-america-h07.png` | 55,614 | `e6d6ff0201c51006c4fa2a52ac85c2dfc4be54862ab3d01c242b3f49c09d4075` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h07.png` | 55,614 | `e6d6ff0201c51006c4fa2a52ac85c2dfc4be54862ab3d01c242b3f49c09d4075` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h08-mainstreet-america-h08.png` | 51,085 | `096e7ff74d31da62f94adf3b062653a21aa010894f11a30d683b1bf985ad8fce` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h08.png` | 51,085 | `096e7ff74d31da62f94adf3b062653a21aa010894f11a30d683b1bf985ad8fce` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h09-mainstreet-america-h09.png` | 53,410 | `7d6141632c8408b28ac02142927ddbdb2402342259c16935934a2a22fce27d14` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h09.png` | 53,410 | `7d6141632c8408b28ac02142927ddbdb2402342259c16935934a2a22fce27d14` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h10-mainstreet-america-h10.png` | 53,922 | `69353cbcebe6369cb689518193e7ba62223551a083b90d2f163fa1a769a90e2c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h10.png` | 53,922 | `69353cbcebe6369cb689518193e7ba62223551a083b90d2f163fa1a769a90e2c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h11-mainstreet-america-h11.png` | 68,663 | `9802674922ab974179069bc33f008bf1f1fab4a9fc3d0a8a84cbdffcf96cf938` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h11.png` | 68,663 | `9802674922ab974179069bc33f008bf1f1fab4a9fc3d0a8a84cbdffcf96cf938` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h12-mainstreet-america-h12.png` | 51,753 | `6047d5067b6cb1c7d0f6375084b55f7ba6e516729b6d7adb64a94e4bc36a113c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-h12.png` | 51,753 | `6047d5067b6cb1c7d0f6375084b55f7ba6e516729b6d7adb64a94e4bc36a113c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-hgr-s01-mainstreet-america-hgr-s01.png` | 69,286 | `52ad8ee14e33861f8a05245f9d578a854785502c1f0ec8fdbc6ef93006917a8f` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-hgr-s01.png` | 69,286 | `52ad8ee14e33861f8a05245f9d578a854785502c1f0ec8fdbc6ef93006917a8f` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-obs-s01-mainstreet-america-obs-s01.png` | 61,243 | `028697fb9f66c551d444471cdbf631978321ecec0df8fd0539f429e6aa04d89a` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-obs-s01.png` | 61,243 | `028697fb9f66c551d444471cdbf631978321ecec0df8fd0539f429e6aa04d89a` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-p01-canopy-east-mainstreet-america-p01-canopy-east.png` | 47,111 | `b8081475e354d2426cd1c19556609f4a94d128e735ba3a7cd780c86f907c4595` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-p01-canopy-east.png` | 47,111 | `b8081475e354d2426cd1c19556609f4a94d128e735ba3a7cd780c86f907c4595` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-p01-canopy-west-mainstreet-america-p01-canopy-west.png` | 47,660 | `1e70d8d34b92f1de79267c53065eec885f3f9509d22ac4a0de1aa11f661bcd8f` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-p01-canopy-west.png` | 47,660 | `1e70d8d34b92f1de79267c53065eec885f3f9509d22ac4a0de1aa11f661bcd8f` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-shl-s01-mainstreet-america-shl-s01.png` | 60,828 | `36173c6c02cc8561f27ac1f65d686f035bf34a70e2999327d2b87a10be3fef71` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-shl-s01.png` | 60,828 | `36173c6c02cc8561f27ac1f65d686f035bf34a70e2999327d2b87a10be3fef71` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-vlt-g01-mainstreet-america-vlt-g01.png` | 73,709 | `e60e757bf0454c35be3f43d6073ddcdcb456a2f85cbe788d93d065026034065c` | 1600×1100 |
| `world-showcase/public/catalog/mainstreet-america-vlt-g01.png` | 73,709 | `e60e757bf0454c35be3f43d6073ddcdcb456a2f85cbe788d93d065026034065c` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b1-raven-rock-rr-b1.png` | 80,226 | `93dfa0487db524c15c50826013566648d1817e212d66f055ce672033a59b1e93` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b1.png` | 80,226 | `93dfa0487db524c15c50826013566648d1817e212d66f055ce672033a59b1e93` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b2-raven-rock-rr-b2.png` | 81,993 | `e1a7689bfa88dc178315ab4a0926dad916d084e6ed0298d7a50de2d04ee0ba57` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b2.png` | 81,993 | `e1a7689bfa88dc178315ab4a0926dad916d084e6ed0298d7a50de2d04ee0ba57` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b3-raven-rock-rr-b3.png` | 70,722 | `df6cc290a39c7fea9a8781bd1b2572b8a46b954e4a2321387e13907be6fae2a8` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b3.png` | 70,722 | `df6cc290a39c7fea9a8781bd1b2572b8a46b954e4a2321387e13907be6fae2a8` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b4-raven-rock-rr-b4.png` | 58,717 | `e36013583dbcd12fdad1cbb0b2af110798ed4f8c60a03f1d32e112202a2f84e3` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-b4.png` | 58,717 | `e36013583dbcd12fdad1cbb0b2af110798ed4f8c60a03f1d32e112202a2f84e3` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-z5-raven-rock-rr-z5.png` | 89,276 | `8c1dacdfa502c7d1a9f5f646b75f693970b4b3bfe2ca592a0a4b52e16d47a30f` | 1600×1100 |
| `world-showcase/public/catalog/raven-rock-rr-z5.png` | 89,276 | `8c1dacdfa502c7d1a9f5f646b75f693970b4b3bfe2ca592a0a4b52e16d47a30f` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-bell-ravensgate-rg-bell.png` | 75,243 | `f46228322c35d0cd04504b5a93d9dd39d464dbc4d8fa09101dd1aa844616485f` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-bell.png` | 75,243 | `f46228322c35d0cd04504b5a93d9dd39d464dbc4d8fa09101dd1aa844616485f` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-loggia-ravensgate-rg-loggia.png` | 49,862 | `938021d9548022371b9fea020bb454704cee6060725fed3b850f3d6d30799d02` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-loggia.png` | 49,862 | `938021d9548022371b9fea020bb454704cee6060725fed3b850f3d6d30799d02` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-stoa-ravensgate-rg-stoa.png` | 49,236 | `907c9896a5fd6a472ca815d032ce4ac7208b11cf3b5911ef3a7f3cce6eb86140` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-stoa.png` | 49,236 | `907c9896a5fd6a472ca815d032ce4ac7208b11cf3b5911ef3a7f3cce6eb86140` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-tempietto-ravensgate-rg-tempietto.png` | 53,201 | `8e07b82e67f0b1bebe1459bf54b4d71d4ae687fee600e1ce4e56fc0429d750a7` | 1600×1100 |
| `world-showcase/public/catalog/ravensgate-rg-tempietto.png` | 53,201 | `8e07b82e67f0b1bebe1459bf54b4d71d4ae687fee600e1ce4e56fc0429d750a7` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-architect-ravensreach-rrch-architect.png` | 54,592 | `db892a7c02069c8b4de6ca3a1697d6ba22e4164bf87a0b51150a4636376c2b24` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-architect.png` | 54,592 | `db892a7c02069c8b4de6ca3a1697d6ba22e4164bf87a0b51150a4636376c2b24` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-grange-ravensreach-rrch-grange.png` | 69,498 | `0f0d50fec3c0a0014a5bf7d59bc5ba834a8fe76b0c3f69e60231492a655b9049` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-grange.png` | 69,498 | `0f0d50fec3c0a0014a5bf7d59bc5ba834a8fe76b0c3f69e60231492a655b9049` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-library-ravensreach-rrch-library.png` | 97,696 | `c5724d91240b8405870e8f8f17f1592add47d1e42086a69844e093f74e221026` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-library.png` | 97,696 | `c5724d91240b8405870e8f8f17f1592add47d1e42086a69844e093f74e221026` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-market-ravensreach-rrch-market.png` | 66,840 | `8ccb52f596967f7013b11b941f21a57541f2c0712e6f70506aaeacb49987b466` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-market.png` | 66,840 | `8ccb52f596967f7013b11b941f21a57541f2c0712e6f70506aaeacb49987b466` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-mason-ravensreach-rrch-mason.png` | 54,250 | `fa3824383d3838931fa71282e43b925219346324ca143a7b0d582af64f4ec2d7` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-mason.png` | 54,250 | `fa3824383d3838931fa71282e43b925219346324ca143a7b0d582af64f4ec2d7` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-moot-ravensreach-rrch-moot.png` | 132,911 | `ebe33d95a01fab5d0b428e6d9f5dc1b6de4b5d4c8fd99fcc5df47b7a37d8dff1` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-moot.png` | 132,911 | `ebe33d95a01fab5d0b428e6d9f5dc1b6de4b5d4c8fd99fcc5df47b7a37d8dff1` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-scout-ravensreach-rrch-scout.png` | 52,628 | `f2295a2ea5a74572d7fd22719bfdae884bcd31af09ddfd40557568adc8039f9d` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-scout.png` | 52,628 | `f2295a2ea5a74572d7fd22719bfdae884bcd31af09ddfd40557568adc8039f9d` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-steward-ravensreach-rrch-steward.png` | 56,364 | `72bf03a41ddac680f6891886bd64d66fb541af7705f36e79f2acc69dbde2ff03` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-steward.png` | 56,364 | `72bf03a41ddac680f6891886bd64d66fb541af7705f36e79f2acc69dbde2ff03` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-storehouse-ravensreach-rrch-storehouse.png` | 56,878 | `23caa9ebfa54e531479b9b919a854fcf8db563cb9d6decbfa200529db41cd516` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-storehouse.png` | 56,878 | `23caa9ebfa54e531479b9b919a854fcf8db563cb9d6decbfa200529db41cd516` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-surveyor-ravensreach-rrch-surveyor.png` | 57,138 | `0cd166a2092fe51ff96ccf55ee29fc6c2db826ebc63d8c244572ac4addf5fdfc` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-surveyor.png` | 57,138 | `0cd166a2092fe51ff96ccf55ee29fc6c2db826ebc63d8c244572ac4addf5fdfc` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-town-hall-ravensreach-rrch-town-hall.png` | 88,336 | `b21a5a5536f5a0f39b4ca3b1102a44634d2615b5fe0a287bf46ba4658f6cb194` | 1600×1100 |
| `world-showcase/public/catalog/ravensreach-rrch-town-hall.png` | 88,336 | `b21a5a5536f5a0f39b4ca3b1102a44634d2615b5fe0a287bf46ba4658f6cb194` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-brew-westlight-district-wd-brew.png` | 61,052 | `6f0154c68cd731f31b5db471077cd3f00c591a2d84feb98961596b1c77c65f72` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-brew.png` | 61,052 | `6f0154c68cd731f31b5db471077cd3f00c591a2d84feb98961596b1c77c65f72` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-ferry-westlight-district-wd-ferry.png` | 50,032 | `259b927a2472dadc946f1b13327f4c938a5649f954990ef6a03699a541fa08e9` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-ferry.png` | 50,032 | `259b927a2472dadc946f1b13327f4c938a5649f954990ef6a03699a541fa08e9` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-field-westlight-district-wd-field.png` | 50,156 | `46c02c6c389d9071a27d9127323dc3f182c5a257c5503e0d48b7fec504e17455` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-field.png` | 50,156 | `46c02c6c389d9071a27d9127323dc3f182c5a257c5503e0d48b7fec504e17455` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-gatehead-westlight-district-wd-gatehead.png` | 59,989 | `786c2aac91051bb528e2c21d1eda1c9a93bc104d9cc6e5a7ce8d3d3f874df95b` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-gatehead.png` | 59,989 | `786c2aac91051bb528e2c21d1eda1c9a93bc104d9cc6e5a7ce8d3d3f874df95b` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-inn-westlight-district-wd-inn.png` | 92,864 | `e54eee9f99e41c0bf65c09380f294742cd95f6ebe1604993567c18ecdbab5adf` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-inn.png` | 92,864 | `e54eee9f99e41c0bf65c09380f294742cd95f6ebe1604993567c18ecdbab5adf` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-lantern-westlight-district-wd-lantern.png` | 47,024 | `d23305e0f39cb8b5b0a0e77a13dee0ab7c5529d220beb622471e2d1a4d706e46` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-lantern.png` | 47,024 | `d23305e0f39cb8b5b0a0e77a13dee0ab7c5529d220beb622471e2d1a4d706e46` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-a-westlight-district-wd-shop-a.png` | 57,358 | `7d5465ba25e170cac1d881b13e232a27d0e5cc6fd951e7ba0a0316514b7b796f` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-a.png` | 57,358 | `7d5465ba25e170cac1d881b13e232a27d0e5cc6fd951e7ba0a0316514b7b796f` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-b-westlight-district-wd-shop-b.png` | 57,351 | `f12bb82c2496eeb265a6a9b9ff9abfd97d5023e3bf5b45982631477ec6da8a78` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-b.png` | 57,351 | `f12bb82c2496eeb265a6a9b9ff9abfd97d5023e3bf5b45982631477ec6da8a78` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-c-westlight-district-wd-shop-c.png` | 56,741 | `71e6b5d3b435f0b295835daeb659965ec98860a8f61586adf42a3bdab14f4137` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-c.png` | 56,741 | `71e6b5d3b435f0b295835daeb659965ec98860a8f61586adf42a3bdab14f4137` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-d-westlight-district-wd-shop-d.png` | 56,385 | `fae747855748db03d816b34469d8d6c5f21d516b4d8930b31b870b3fbf192fcd` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-d.png` | 56,385 | `fae747855748db03d816b34469d8d6c5f21d516b4d8930b31b870b3fbf192fcd` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-e-westlight-district-wd-shop-e.png` | 55,976 | `c5abcae1550f1f265d491933b05dda37bd25a815db9803d270314730c7f68d65` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-e.png` | 55,976 | `c5abcae1550f1f265d491933b05dda37bd25a815db9803d270314730c7f68d65` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-f-westlight-district-wd-shop-f.png` | 55,582 | `04c33730c6303c15f85d3655df85e3e40e44a52f1fe89aaec6011d58c6a86bef` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-f.png` | 55,582 | `04c33730c6303c15f85d3655df85e3e40e44a52f1fe89aaec6011d58c6a86bef` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-g-westlight-district-wd-shop-g.png` | 57,480 | `e3b8a061cb802dc2ec611c9d78a149ad69b1b0c862612ab2d0d1b15409f84bb8` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-shop-g.png` | 57,480 | `e3b8a061cb802dc2ec611c9d78a149ad69b1b0c862612ab2d0d1b15409f84bb8` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-skiff-westlight-district-wd-skiff.png` | 48,098 | `026d32b198e5bc22e5e055bcc486ae99dbbe9c7622bbd32daf30c1e0f79fe88a` | 1600×1100 |
| `world-showcase/public/catalog/westlight-district-wd-skiff.png` | 48,098 | `026d32b198e5bc22e5e055bcc486ae99dbbe9c7622bbd32daf30c1e0f79fe88a` | 1600×1100 |
| `world-showcase/public/catalog/westlight-venue-wl-bowl-westlight-venue-wl-bowl.png` | 89,150 | `9c21e63006f199046c02879b0455dc328f92c8a49340923202cbe57cd318f932` | 1600×1100 |
| `world-showcase/public/catalog/westlight-venue-wl-bowl.png` | 89,150 | `9c21e63006f199046c02879b0455dc328f92c8a49340923202cbe57cd318f932` | 1600×1100 |
| `world-showcase/public/catalog/westlight-venue-wl-club-westlight-venue-wl-club.png` | 58,903 | `b2e886ad67fb29d958b170794ba5cd681e4680568c78f6fd8a31a664a5aa8b16` | 1600×1100 |
| `world-showcase/public/catalog/westlight-venue-wl-club.png` | 58,903 | `b2e886ad67fb29d958b170794ba5cd681e4680568c78f6fd8a31a664a5aa8b16` | 1600×1100 |
| `world-showcase/public/catalog/westlight-venue-wl-theatre-westlight-venue-wl-theatre.png` | 81,194 | `e55f97ea72d002c1834cd2a21d9b943817b568692d625dcd60fe2e16dc7d191a` | 1600×1100 |
| `world-showcase/public/catalog/westlight-venue-wl-theatre.png` | 81,194 | `e55f97ea72d002c1834cd2a21d9b943817b568692d625dcd60fe2e16dc7d191a` | 1600×1100 |
| `world-showcase/public/data/buildings.json` | 101,405 | `230c82975ee1abbe25cebe44f31e18dfd6309f2ffa4a2c30e42d6ce810b3473d` | snapshot=d05ac7822795… |
| `world-showcase/public/release/01-01-r08-overall-map.before.png` | 24,069 | `2eb312080cce29183570b0eea858f4edc3589259e4d512d94d22884ac64c8721` | 900×900 |
| `world-showcase/public/release/01-msa-r4r5-district-oblique.after.png` | 304,124 | `388ffd816693b317229b68eea52de71affd2ca3a760edeb405c7caddbd048b15` | 1024×576 |
| `world-showcase/public/release/02-04-r01-junction.before.png` | 105,637 | `86185a5ef5d3071777824cb806e7ed998fd05f62ff517d0482ae8a6e1323b9c5` | 1280×720 |
| `world-showcase/public/release/02-msa-r4r5-alley-w-long.after.png` | 269,820 | `bb55191aa0719832d91079d980acf9aeb97ace4cf421d124bf54f33d7ecf6530` | 1024×576 |
| `world-showcase/public/release/03-03-west-gate.before.png` | 158,287 | `ec2d8f154b47e08513a6293b2fdf038909d0f26b659af4300fa722452d5d2097` | 1280×720 |
| `world-showcase/public/release/03-msa-r4r5-b02-culinary.after.png` | 172,157 | `e9eeb33ebe6473360f738458fdedb479f2f003d2ac8ae2a53c9a2c6c3000e119` | 1024×576 |
| `world-showcase/public/release/04-07-r08-directory.before.png` | 85,581 | `27066291d1da2f3baf36c0d48e0461c2778e46ba79f1e5c06706425b11eb33c3` | 1280×720 |
| `world-showcase/public/release/04-gar-h01.after.png` | 12,671 | `393c5f02da16194534a818e06c00e24447d6f3e736699a4ebc732dd016e244c3` | 1280×720 |
| `world-showcase/public/release/05-03-east-oblique.png` | 262,363 | `06e520ade02855e59ab6220952616e7ae7ad1891134041065a78abe7fd8bb446` | 1280×720 |
| `world-showcase/public/release/05-t2b-west-to-east.png` | 27,863 | `f25757518f7a4448a8e2ecfb2d95ecbcb236c39727eaf865276f379e02058a83` | 1280×720 |
| `world-showcase/public/release/06-06-road-northbound.png` | 55,660 | `9f1235f37ab5365743ad8fdd3bc273f110e4058124f2f98b449c1f3dc9ae9e09` | 1280×720 |
| `world-showcase/public/release/06-t2b-section.png` | 24,231 | `cd0564d763e09d58a64c22ad25177a17c9337bff8db21b7fa47a592acf994235` | 1280×720 |
| `world-showcase/public/release/07-01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `world-showcase/public/release/07-msa-r4r5-district-oblique.after.png` | 304,124 | `388ffd816693b317229b68eea52de71affd2ca3a760edeb405c7caddbd048b15` | 1024×576 |
| `world-showcase/public/release/08-msa-r4r5-alley-w-long.after.png` | 269,820 | `bb55191aa0719832d91079d980acf9aeb97ace4cf421d124bf54f33d7ecf6530` | 1024×576 |
| `world-showcase/public/release/08-s1-west-to-east.png` | 26,057 | `d6143cabef0524f6f73b3c0e18a7303ebea6340f67292e10695410934a8279e8` | 1280×720 |
| `world-showcase/public/release/09-msa-r4r5-b02-culinary.after.png` | 172,157 | `e9eeb33ebe6473360f738458fdedb479f2f003d2ac8ae2a53c9a2c6c3000e119` | 1024×576 |
| `world-showcase/public/release/09-south-middle-sports.png` | 155,680 | `29a98c42dce8764b38202bbfc2f882ce5fa27717b8b2dc2d2d59b88c956e6881` | 1280×720 |
| `world-showcase/public/release/10-gar-h01.after.png` | 12,671 | `393c5f02da16194534a818e06c00e24447d6f3e736699a4ebc732dd016e244c3` | 1280×720 |
| `world-showcase/public/release/11-03-east-oblique.png` | 262,363 | `06e520ade02855e59ab6220952616e7ae7ad1891134041065a78abe7fd8bb446` | 1280×720 |
| `world-showcase/public/release/12-06-road-northbound.png` | 55,660 | `9f1235f37ab5365743ad8fdd3bc273f110e4058124f2f98b449c1f3dc9ae9e09` | 1280×720 |
| `world-showcase/public/release/13-01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `world-showcase/public/release/14-s1-west-to-east.png` | 26,057 | `d6143cabef0524f6f73b3c0e18a7303ebea6340f67292e10695410934a8279e8` | 1280×720 |
| `world-showcase/public/release/15-south-middle-sports.png` | 155,680 | `29a98c42dce8764b38202bbfc2f882ce5fa27717b8b2dc2d2d59b88c956e6881` | 1280×720 |
| `world-showcase/public/reports/as-built-release-completion.md` | 23,383 | `66801b4ebc9e5942ccdf7eed536c33a1c1f4b3017adec42f6939b20d23851f23` | — |
| `world-showcase/public/reports/atomic-transaction.json` | 7,522,377 | `294cb722be93048fff55f35496da1439a9fc7fd6bc9aa014ddd50842e3659ac5` | status=committed-pending-post-qa |
| `world-showcase/public/reports/c01-recessed-public-portal-floorplan.pdf` | 246,724 | `87dc7d8e0335ca0256c06ad3384db5f411cf0dfe9278477a7d352af10f88f94f` | — |
| `world-showcase/public/reports/capture-manifest.json` | 15,626 | `8ef799163d751deb729247d4e25bdfbe8f07c0c05eeab800db79f64e00c582bf` | snapshot=d05ac7822795… |
| `world-showcase/public/reports/database-import.json` | 13,218 | `8c766c45edcade184ab8fb4d4004020c5ecd7ec9fbf0b0bbfb92ae4b59f2bd6d` | snapshot=f8edf99494c0… |
| `world-showcase/public/reports/database-report.html` | 59,131 | `4c9db47900149c90083ed21147581c036b59ca125b9080ac4a9c2563fa495f13` | — |
| `world-showcase/public/reports/database-report.json` | 141,483 | `be08a7880ffee8c5452bdbf887e261c8c70fa18e0915438963cce81b474fc6af` | snapshot=d05ac7822795… |
| `world-showcase/public/reports/features.json` | 2,098,528 | `99e650da6159783487ce3c1e21e02efc1d4baf536d120315e9a1aec5c941ee57` | snapshot=d05ac7822795… |
| `world-showcase/public/reports/object-media-index.json` | 2,978,078 | `28b27d975c6c8d6f8a066fa9106a114b4efe935bd40f6b8ccc180bb539507ef6` | snapshot=d05ac7822795… |
| `world-showcase/public/reports/post-deployment-qa.json` | 184,771 | `0e3140f01614c21e4dfccad6613cbe0ae17bbf3f865cfbd1eaa2570106b4ba91` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `world-showcase/public/reports/post-deployment-qa.md` | 3,450 | `bce100f43b2c97a737c644712a6e82ed5bfd0b305a31dd1cf6ab2933702bc278` | — |
| `world-showcase/public/reports/README.md` | 4,127 | `070ff834478461721ff183c1499001b61de60abc951ba1a6fe3325a4387ae69e` | — |
| `world-showcase/public/reports/requirements-traceability.md` | 8,254 | `0cfcd173dae4b470d2c3702342e5787600e744fb19d6bbf817eee1aa984dfcc5` | — |
| `world-showcase/public/reports/research-bibliography.md` | 23,842 | `82c775639c6bc37392d216166aeb5e120abf5beea0daf3797ffd5b3aeb96020b` | — |
| `world-showcase/public/reports/route-qa.json` | 313,703 | `beb06e6dcc51761ddf0a98e8da69d4ecb5b2a071ef9f9fe5118cd82e70276896` | status=PASS; snapshot=f8edf99494c0… |
| `world-showcase/public/reports/wave2-artifact-register.json` | 159,638 | `2b0d026fb1ffab6dc23e606a61bf4613e0314e03614dc8dc43be48784e03d0a3` | — |
| `world-showcase/public/reports/wave2-artifact-register.md` | 70,365 | `2092b8359cf9e5877d28d5e4602252b79160921c02e3c7af4a3dca173ff509de` | — |
| `world-showcase/public/reports/wave2-as-built-release.md` | 17,755 | `662898a80543f5094211f35016691c94c1739e4d9f55b506d23d7d17292e1286` | — |
| `world-showcase/public/reports/wave2-atomic-transaction.json` | 949,423 | `e9b3752e89771c4ab218e5811bf23700cfd5f08128e9277324ca9df990f43ef2` | status=committed-pending-post-qa |
| `world-showcase/public/reports/wave2-database-import.json` | 26,442 | `5321f35ca15c3b3cfa2dd1de48963776234f53d35d7875e291bcc41cfd51b524` | status=PASS; passed=true; package=redevelopment-wave2-database-import |
| `world-showcase/public/reports/wave2-independent-acceptance.md` | 7,785 | `0d721ed22ecfe5de4e89f3791fb1483a52603f8f9db4ef1afa06d363d383ecfb` | — |
| `world-showcase/public/reports/wave2-integration-audit.md` | 11,819 | `a057d39696b8ed432e74e36450e37ed1772cce64274ed665a3a2e89095627d55` | — |
| `world-showcase/public/reports/wave2-mainstreet-engineering.md` | 28,905 | `43487c8eb33db60d605d86326c9cbc64b324a9019222746010b9d44f9cbe4ce9` | — |
| `world-showcase/public/reports/wave2-master-plan.html` | 250,925 | `f9d34ec76220b6046f067736bda3848308b8d45d6cadd6088c1e543ed79452ee` | — |
| `world-showcase/public/reports/wave2-media-qa.json` | 205,017 | `5825b4d8f231e78780f6d7b105ef65762e0bc1bbc1b481e3bed7c93bb04621c5` | status=PASS; passed=true; snapshot=4fca1ff3c40a… |
| `world-showcase/public/reports/wave2-media-release.md` | 19,617 | `3b2b7eec0cc0b6e0f7762db1c6b7cfc8e3b0b5a7a8a872623f6b18664acc05ba` | — |
| `world-showcase/public/reports/wave2-post-release-qa.json` | 30,546 | `551be053a21e37edc246f95cb2ded30df138f600f66c5574c2cf9b9b7f321d4c` | status=PASS; passed=true; package=redevelopment-wave2-post-release-qa |
| `world-showcase/public/reports/wave2-readme.md` | 8,397 | `3a4f9ef9556f2b52e88a3e212c7682b1957a9e00ef574ec4929ce37fe153723f` | — |
| `world-showcase/public/reports/wave2-route-qa.json` | 103,455 | `6f97def62efe5abb6a3ae89c685cccfa39583b609357273df0855c3121e15ccf` | status=PASS; snapshot=d05ac7822795… |
| `world-showcase/public/reports/wave2-tunnel-engineering.md` | 20,906 | `0fe500ef7b35d401af026a97dbe88bf4995d59ecbd080965c692960392ce3784` | — |
| `world-showcase/public/reports/worldwide-interior-floorplan-atlas.pdf` | 5,179,255 | `ee8c7d2be68e85d262fcfba1299e53f8e95c92f76216a49774f91f5cdfac4c2b` | — |
| `world-showcase/public/screenshots/approach-road-approach-road-primary-approach-road-primary--ravensgate-to-westlight-approach-road.png` | 319,956 | `459e288abc985535ab8d8c10134ef0457c0486cb2394ff4668e7669f6ee6f06d` | 1024×576 |
| `world-showcase/public/screenshots/B01-guest-design-center.png` | 235,957 | `7f29190ba4b3d3947db2b73a77912bc88c6b7f7756e20722a12a42e5a03d15fe` | 1280×720 |
| `world-showcase/public/screenshots/B02-retail-cooking-school.png` | 280,942 | `fde0cc5e3cef565cce299c98ecbf827256824a8bd97a90f801e45f68db4cea9d` | 1280×720 |
| `world-showcase/public/screenshots/B03-service-warehouse.png` | 290,497 | `4bb82b0358fb308a12a433c6e585008ead86093552e96f551843fe90bc2b2602` | 1280×720 |
| `world-showcase/public/screenshots/C01-mountain-operations-complex.png` | 367,261 | `516be0890a58bc73547d767a1f81c3752e2ee58bcbc6a4cd80fa21e987568502` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-apt-s01-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-apt-s01-msa-secure-wave5-penthouse.png` | 95,788 | `95d01c59e64f13f3e120090139ede081fd26e5221747bfbef0c976bf93311d7d` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-b01-B01-guest-design-center.png` | 266,282 | `9948d983cbf62732bd90e506bbe4441e4a3c0133e9ecf3d4f8f9f7bc0659f390` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-b02-B02-retail-cooking-school.png` | 327,535 | `d0f2e1d16c24b6df019b3cdec9ef783cd97b53f6abcfcb7088ee4a8b82038261` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-b03-B03-service-warehouse.png` | 365,805 | `7e77310f88c6a705cc0f20ce0a5be4d77a48644bcbbb18a8e0b4cf0cd0ba4756` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-08-surface-map.png` | 52,803 | `970009c548bc55d27b67233784ec999c87901f6208f210eec5410da2176cb8d2` | 950×950 |
| `world-showcase/public/screenshots/mainstreet-america-c01-arena-hangar-wayfinding-c01-arena-hangar-wayfinding--arena-to-hangar-illuminated-route.png` | 77,921 | `d4c633f214eaed27b9a940347bfcf9ba910a1446fa406f397b2ca1201deaa66e` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-c01-C01-mountain-operations-complex.png` | 381,293 | `cbb018e48eb48550f53851b9558ca78020fba8b98ae4d7732e8dcaf693fa27ad` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-lobby-04-lobby-return.png` | 13,967 | `fd31796449b543aeb6effc8b39db69d4db46b633f113cac6c972ada10747b8c0` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-connector-dogleg-phase2-03-dogleg-north.png` | 17,320 | `cf567261dfb89fa92a69c1cf308770bead4749428628c2a052519d0fd11676e4` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-connector-dogleg-phase2-context-01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-entry-01-parking-center-east-seam.png` | 290,414 | `15b8ab8ef7c0be1fcd161fa1f627b8a2a3cc355b81055269c33d992e1ab11a67` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-portal-approach-phase1-c01-public-portal-approach-phase1--c01-public-portal-east-approach-relation.png` | 94,016 | `5e4c631bc941f3ce58eaf285550b1c889da908066a9216ecbe4b26bc147eb107` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-portal-approach-phase1-context-01-parking-center-east-seam.png` | 290,414 | `15b8ab8ef7c0be1fcd161fa1f627b8a2a3cc355b81055269c33d992e1ab11a67` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-portal-recessed-phase2-01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c01-public-portal-recessed-phase2-context-01-new-mouth-south.png` | 12,661 | `7a1b109fb0ce19e4727e37cdff81bb6929dde2772969273b857840a020095ad1` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c02-c02--west-garden-villa.png` | 270,488 | `dc4401d9b90c59820f91ef787683260e2bf63b1b5c164233a9252eaebda04ea6` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c03-c03--east-garden-villa.png` | 170,100 | `e7f86f1e857fd59bbe2efb95c71bc52a64643e43c730ab9e34773f127cffd288` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c04-c04--west-brick-courtyard-home.png` | 275,086 | `50dd9ae2abdced0f14364670836eb56e47c3a932f48fa9cc70e865ac344b825c` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c05-c05--east-brick-courtyard-home.png` | 120,799 | `d9d6e84f2f5b000ed23bfd67a63092d1bb4ceab0696133d7adb94a628580afd7` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c06-c06--west-timber-lodge.png` | 220,670 | `3d67676efb3294a6c99ca34edfa1ac96e332905058c349bdb51e9b47bc9142d7` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-c07-c07--east-timber-lodge.png` | 276,540 | `bc99ae9d769c832a6f40088ecf8cd8865b7e011f62615b20dea8bf49ccf9d4cc` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-grid-e2-building-grid-e2-building--neighborhood-clubhouse.png` | 290,846 | `391c0a4aeb7d025a0e58d5912c831e1adb0d4166cd5b195b8ffb6971b5b7084c` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-grid-w2-building-grid-w2-building--design-lab-and-maker-commons-building.png` | 357,372 | `88e5d1419767d0df546d304eb74a499f18a5c15cfb5600619a5dba7e1c94c7d2` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h01-h01--the-alexandria.png` | 221,967 | `f2ed984670cf6bdd0fd727613c7d09d81646d7cc03dd75b3066dd63e798392cc` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h02-h02--the-cape-pointe.png` | 276,608 | `0f2f1ab6521df15e6a9f042f1fe1091188e864cc3dc0cc543101361573ea0c59` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h03-msa-h03-after.png` | 89,601 | `0720ac92ccd25ab36a07a3dcef800019c4e1d3024dc7fe4193d841e0e4d2d926` | 900×600 |
| `world-showcase/public/screenshots/mainstreet-america-h04-msa-h04-after.png` | 91,453 | `fa6f2ce80fc64b31e2ce7290adce4e1ec050fb79a52e5798a3dcbb58c96e77a3` | 900×600 |
| `world-showcase/public/screenshots/mainstreet-america-h05-h05--the-timbergrove.png` | 170,536 | `7a9563e4a5a060df861da5116dea7e5d4de7d5b03a055dde75072233a2e24fb6` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h06-h06--the-wakefield.png` | 208,129 | `4f8183f5f03a25ea405712fe9c8d386c251e4d8fea0caf68c60d3381561057d5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h07-h07--the-villa-lago.png` | 214,703 | `299b01c414b002669a2034bfad8759e3cc111b42c3373e069af6190fa7d9b5be` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h08-msa-h08-after.png` | 146,006 | `0335538db33ad9df20871dab9fdceb3ed2429aa4aac7bbfac5f8ba378f0d2b78` | 900×600 |
| `world-showcase/public/screenshots/mainstreet-america-h09-h09--the-casa-lana.png` | 160,366 | `2dde2dd2472d4cbd1c822d7d04c7254c81a0b7d322567d799cd72905ff61ba5e` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h10-h10--the-cross-creek.png` | 176,072 | `7a026831be32cdf8e3e0a523657bcaf27fc0989a8c3a69d7dca0aae63dc7c2a4` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h11-h11--the-midtown.png` | 300,197 | `7c232055da975cf26e40d0ca3a33580b8cedb1d98bdec22d1adb85f1d1b53fbc` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-h12-h12--the-valencia.png` | 225,170 | `1acf7a55aca55e8e70074152bffbdf44748575f0767c7f9012bbbb7aad7843d2` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-hgr-s01-02-southwest-oblique.png` | 254,705 | `30c0e03d2d55549775b4927a9b851e1709e0d23f0eb9e82dd91c9eba23b8e5cd` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-obs-s01-05-north-oblique.png` | 166,549 | `c171f213f0c705fa9dbcd0fa0a9cc25298df7f0d725c266b016261a901750097` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-obs-s01-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-p01-07-road-southbound.png` | 82,654 | `2acda770a7a0d32b78e27ab44ada36de454650f05214ca0b648b5880f532ce3b` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-p01-canopy-east-p01-canopy-east--east-solar-ev-canopy.png` | 119,760 | `5ea641915dd5a40089fb9f6eb48def9c0e2d6df4aa3a5f367d517c19602c3748` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-p01-canopy-west-p01-canopy-west--west-solar-ev-canopy.png` | 150,025 | `783cd602febe1e3627c3bf3a79a6337a1a31f1e822135948abce859535409f32` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-p01-south-arrival-carriage-p01-south-arrival-carriage--south-gate-terraced-carriage-approach.png` | 35,224 | `625f6241767e0ab8f8371f3f0a1873649c1d66adb8b4f359af8f91fe6c5f139d` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-p01-south-arrival-walk-east-p01-south-arrival-walk-east--east-south-arrival-walk.png` | 33,166 | `5896e481eb0a219986b69cac31a8af9f5a354202b80f6e9066fefda17aca2e82` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-p01-south-arrival-walk-west-p01-south-arrival-walk-west--west-south-arrival-walk.png` | 30,531 | `11dfc5d43a9eaab665da73f6d8a77f1c3ccbcf9ec9772022c2fda479aad9cec2` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r01-r01--main-street.png` | 270,684 | `b0160cb3e34f86fd34b476c5a0420550008dbbce6389e0c35234bb13b3aae508` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r02-r02--west-lane.png` | 231,360 | `5639071446a3663abcf05f248e4d15296b8c2f6e0b17dfb6e5b6b7f3591aa722` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r03-r03--east-avenue.png` | 281,152 | `5bf7fc4cea036b95c3c444f7e0b890cd100980feb8b4a03b9fb2b87a52810082` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r04-r04--south-cross.png` | 135,548 | `14aa4e6b435072f45a616aa605097b11fa81c96a07fd3846246c8d0502bbf6b1` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r05-r05--garden-cross.png` | 189,207 | `a5efba866862d5c7145d2291ac42220ca58518285d9e5777a093bf7a170bf8b0` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r06-r06--brick-cross.png` | 98,538 | `dbecf7e7e2331e536b74601698f1e07159346927a8565e03da1958981d336f55` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r07-r07--service-cross.png` | 335,189 | `7f31c898f67b2390628b10151b5a902094d60029c26bb0c2ce2b9fc1dff847d9` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-alley-e-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-alley-e-r4-alley-e--east-rear-alley.png` | 30,941 | `1b5e7a2d9f2e50ebe3a21a4b1e13d214418897fe7e8f571b4c1db65710236853` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-alley-w-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-alley-w-r4-alley-w--west-rear-alley.png` | 223,615 | `d96ff8cf66cb047a95caaa85169f0e972cde628aae9d02248101b2cf661873a3` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c02-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c02-gar-c02.after.png` | 35,429 | `50c7afcf25e5115d867a0df184efed82646e5c294550702fcd450afd4963792b` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c03-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c03-gar-c03.after.png` | 68,282 | `910c1cde75dca766a9a5cb8d47ada1b119f6920084084fd43ec50b5ac3a1225a` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c04-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c04-gar-c04.after.png` | 58,148 | `fa7c9990fcc951252adfd17566cddcb625bb74c1605e19e137516c9304aa3149` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c05-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c05-gar-c05.after.png` | 55,114 | `863bb2463979ef79bcb21f4d8815e91605db316a69f0903355df9b1e8f3161b1` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c06-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c06-gar-c06.after.png` | 53,438 | `0ceb8b004ffa78c7dcd7c0799dd3901fa46e02a633db6ad4b2425a29cb81bafa` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c07-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-c07-gar-c07.after.png` | 55,179 | `d0fd2fe7cf60d11c8636cb5ea571a5ebbd52626bdfdbe22a60f010674a8433af` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h01-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h01-gar-h01.after.png` | 12,671 | `393c5f02da16194534a818e06c00e24447d6f3e736699a4ebc732dd016e244c3` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h02-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h02-gar-h02.after.png` | 15,226 | `940c96e2e9574f132958aa13318ae5d976d6e052950e8e67adc61b113792572a` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h03-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h03-gar-h03.after.png` | 55,255 | `d05118cc66a4c10930fa5a486f138ae7c4f1131a7bad928e1a033a4e15d7e506` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h04-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h04-gar-h04.after.png` | 66,091 | `46110c2292df31350840a3b199792a01e9accac0ae52095e323131b7839b2718` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h05-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h05-gar-h05.after.png` | 56,171 | `f07b10269b860c8b675cd8706bf0dbd3e3cd7ba514d21c77e35184892b25d22a` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h06-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h06-gar-h06.after.png` | 48,022 | `78c56a7ef50de9cc7a6aa1eb22cf4ec405541498683fd7e2281f9505d4b2b740` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h07-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h07-gar-h07.after.png` | 50,750 | `67199bf0306c74541ed02e2e8de74a91ed8fadf75df946f1b69e2453034e0cb5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h08-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h08-gar-h08.after.png` | 52,457 | `f0ae2ff6bfde40ef51e0f501c0f0dee73b4d288dba063c211d9d5dae91175718` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h09-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h09-gar-h09.after.png` | 63,230 | `33fa002a027347d0172541764e88747d48903dc429e2156884ca1e2e719b0085` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h10-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h10-gar-h10.after.png` | 43,658 | `54c8f1fe6351b42ba42b337253cc7989913b571e3644a768beabec8de7ff0e9d` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h11-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h11-gar-h11.after.png` | 57,984 | `a8502360e35a750c6907f3b1c886e825b1ab8906e7b37e1c60c4d2914dd0cf0e` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h12-context-msa-r4r5-alley-e-long.after.png` | 269,370 | `10ae1c3ee39fab31dbf47e164847887becee24e081f5f984bde72f2c175466e6` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-r4-gar-h12-gar-h12.after.png` | 62,135 | `b2f21516e853dee8723b8801ed0949fcb07aa52180e5f0de59dff47f017c52a5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-gate-r08-east-main-05-east-gate.before.png` | 118,014 | `ef1c01c935f47026b0c361323143647e070dba9b3229d5aa40d877939177c2ff` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-gate-r08-west-main-03-west-gate.before.png` | 158,287 | `ec2d8f154b47e08513a6293b2fdf038909d0f26b659af4300fa722452d5d2097` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-jct-alley-w-r08-02-west-endpoint.before.png` | 79,636 | `45bcd4070a688f007a1d3e591cacdf9a442966291166904c030237bedc304232` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-jct-r01-r08-04-r01-junction.before.png` | 105,637 | `86185a5ef5d3071777824cb806e7ed998fd05f62ff517d0482ae8a6e1323b9c5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-jct-r08-alley-e-06-east-endpoint.before.png` | 91,732 | `da9429774404f8f1023558713ca93a038ac2f9f11c083cd9d6209dba12f5b14c` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-r08-cross-link-01-r08-overall-map.before.png` | 24,069 | `2eb312080cce29183570b0eea858f4edc3589259e4d512d94d22884ac64c8721` | 900×900 |
| `world-showcase/public/screenshots/mainstreet-america-r8-wf-r08-central-07-r08-directory.before.png` | 85,581 | `27066291d1da2f3baf36c0d48e0461c2778e46ba79f1e5c06706425b11eb33c3` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-r8-wf-westlight-08-westlight-directory.before.png` | 97,412 | `b72f11f21b707e0fd395764562c5cada0b7c4b17dd8ba20fd50d0478c84bbc3c` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-route-apt-shelter-route-apt-shelter--penthouse-safe-room-to-private-shelter.png` | 78,246 | `b681f0f1be43621c85713497b2abb78b462ec075387271163419125c82249493` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-c01-lower-operations-route-c01-lower-operations--lower-operations-circulation-loop.png` | 71,600 | `f6c449ba7d9ee2aaa24670067767fde304ee231c2ca944c8573c85b322657328` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-c01-primary-stair-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-route-c01-primary-stair-route-c01-primary-stair--c01-lower-operations-to-office-primary-stair-route.png` | 93,347 | `b147c7fcc6de5cdbbbd791d47c25280e3055d161a245e390fc0265baa18a9fcc` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-grand-vault-stairs-route-grand-vault-stairs--grand-vault-three-level-ceremonial-stair.png` | 76,535 | `6f9cd9cb9f85125f4e30743338371e595740bf2fa9475ec83789300357d830fe` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-obs-penthouse-private-stair-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-route-obs-penthouse-private-stair-route-obs-penthouse-private-stair--concealed-observatory-to-penthouse-stair.png` | 71,730 | `00f9cc96aeb45c3eddc539dc0ad946d833b97a1b98db4c52a5395ffe160c55a1` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-obs-public-stair-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-route-obs-public-stair-route-obs-public-stair--hangar-to-observatory-public-switchback-stair.png` | 160,033 | `98de605643c1e51841c7e93ca0d3835f86904cc6bd6570aec1ee95b48205a686` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-office-heliport-route-office-heliport--msa-office-shaft-to-heliport.png` | 76,338 | `db6a3514aa36f34c7a0533a2bc1a331d8941a3c79b3c3d09b8c5ae6eaf37ddce` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-route-shelter-grand-vault-route-shelter-grand-vault--private-shelter-to-grand-vault.png` | 63,436 | `b3910e2266bfb5f0c12653dfe009168643109046ff7dbba4b62b1299fd417864` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-shl-s01-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-shl-s01-shl-s01--private-mountain-shelter.png` | 77,436 | `65b7e44e297dd358aeab3dfe2b18048b82df2a9d9a0bbd934cd9c6b8bf3f7c63` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-trl-s01-trl-s01--hangar-to-heliport-illuminated-trail.png` | 27,456 | `d8144261d44a1e9d015bf1a2d71c72751b5456489d772cc8ea87726d3a058628` | 1024×576 |
| `world-showcase/public/screenshots/mainstreet-america-vlt-g01-context-msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/mainstreet-america-vlt-g01-msa-secure-wave5-grand-vault.png` | 114,049 | `e5b52dbfc05b0f370a528fedf71136e0038a4670d9721ede9430660e5e8d8f5e` | 1280×720 |
| `world-showcase/public/screenshots/moot-hall.png` | 37,220 | `914e883dbfa86b280f78d6a89f69d2672cf289f9e57bfda01cbe2b1633e89f47` | 1280×720 |
| `world-showcase/public/screenshots/msa-arrival.png` | 101,638 | `618c028cb425fa8d9c338eb7fd29f3b2ea96fdf696bb366df50cf25ab17eb932` | 1000×620 |
| `world-showcase/public/screenshots/msa-east-hangar-final.png` | 40,861 | `e018eb77174d4d585eedba20f6067027d30ea53a3f60f681ca76507415e0e3c1` | 800×500 |
| `world-showcase/public/screenshots/msa-h01.png` | 89,601 | `0720ac92ccd25ab36a07a3dcef800019c4e1d3024dc7fe4193d841e0e4d2d926` | 900×600 |
| `world-showcase/public/screenshots/msa-h03-after.png` | 89,601 | `0720ac92ccd25ab36a07a3dcef800019c4e1d3024dc7fe4193d841e0e4d2d926` | 900×600 |
| `world-showcase/public/screenshots/msa-h04-after.png` | 91,453 | `fa6f2ce80fc64b31e2ce7290adce4e1ec050fb79a52e5798a3dcbb58c96e77a3` | 900×600 |
| `world-showcase/public/screenshots/msa-h08-after.png` | 146,006 | `0335538db33ad9df20871dab9fdceb3ed2429aa4aac7bbfac5f8ba378f0d2b78` | 900×600 |
| `world-showcase/public/screenshots/msa-h08.png` | 146,006 | `0335538db33ad9df20871dab9fdceb3ed2429aa4aac7bbfac5f8ba378f0d2b78` | 900×600 |
| `world-showcase/public/screenshots/msa-mountain.png` | 743,536 | `566fb321cbed0bb4055e1555cd3739c1eb6c5e92cb9745aa89f4167464e3b3f4` | 1280×720 |
| `world-showcase/public/screenshots/msa-secure-wave5-grand-vault.png` | 114,049 | `e5b52dbfc05b0f370a528fedf71136e0038a4670d9721ede9430660e5e8d8f5e` | 1280×720 |
| `world-showcase/public/screenshots/msa-secure-wave5-observatory-exterior.png` | 85,174 | `9bba8cf574b6c5a07fb5584bbde5a72fa173ce06fda2d663d6ac55031569fbd5` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-b1-rr-b1--command-operations-center.png` | 75,516 | `c6897a33231187942b9b2115a99be68937ac6745550790e75cb3429e017f6a48` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-b2-rr-b2--signal-communications-center.png` | 73,249 | `ec298018c3e5f8a4ba2d9990610545ec5f0a7866a185d0673caa2f032eac49a8` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-b3-rr-b3--quarters-dining-medical.png` | 68,268 | `036c1440c2b635050b5dc6f4e3684ec6950fbf82c2226326f20e8c6084ace077` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-b4-rr-b4--power-ventilation-plant.png` | 66,913 | `44ba73eed6a1cbd8874b967db2f411cc99385cba4b3689f421cb6c5c42c2b073` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-s1-standard-pilot-context-s1-east-to-west.png` | 26,870 | `6cc97b5baefbe441227ff53159f0bf1909a63ad865b642b71a58d9e50a4bfec0` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-s1-standard-pilot-s1-west-to-east.png` | 26,057 | `d6143cabef0524f6f73b3c0e18a7303ebea6340f67292e10695410934a8279e8` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-t2b-liner-pilot-w2-t2b-west-to-east.png` | 27,863 | `f25757518f7a4448a8e2ecfb2d95ecbcb236c39727eaf865276f379e02058a83` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock-rr-z5-RR-Z5-surface-access-shaft.png` | 595,470 | `639310a41155b0c92b5f49894299c6f50acc7a8e2806ece2bc040be5e6e39774` | 1280×720 |
| `world-showcase/public/screenshots/raven-rock.png` | 871,116 | `133d3596e1a1b24127923c2506c969bf09b23a7173583a30f376a6e7cc4dbc54` | 1600×1000 |
| `world-showcase/public/screenshots/ravensgate-rg-bell-rg-bell--bell-gate-campanile.png` | 196,626 | `14f4904fd292a43e7787cba2e0b36443ee179fc30cd5eb61968bbc778be1f3ab` | 1280×720 |
| `world-showcase/public/screenshots/ravensgate-rg-loggia-rg-loggia--library-loggia.png` | 138,292 | `2464e6a54181b35ba0cd64423da00d91804a8ce14c4f53cc57607039b07d01d5` | 1280×720 |
| `world-showcase/public/screenshots/ravensgate-rg-stoa-rg-stoa--south-stoa.png` | 165,603 | `a1249fe9d0712cb57d0de6191d06e5e58fcbdf49b2fb613bf4eb8cbef317d539` | 1280×720 |
| `world-showcase/public/screenshots/ravensgate-rg-tempietto-rg-tempietto--long-water-tempietto.png` | 256,503 | `dc94eb434ce27c3a35ea79f6766926bf8fefcd54935168b8293e531fac608a61` | 1280×720 |
| `world-showcase/public/screenshots/ravensgate.png` | 73,305 | `6f4c9a8807a5e191759e7147b12309e21f333b6cacaa0715c1fa665df72af96f` | 725×965 |
| `world-showcase/public/screenshots/ravensreach-rrch-architect-rrch-architect--architect-cottage.png` | 113,041 | `38b5551b5e83e2019d32b2d35fd133932b4f253978ed909ea850c768a21cebf9` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-grange-rrch-grange--grange-hall.png` | 195,363 | `8a4498dc39a9f52d357a4ad76eb87effdbdd71f77b94b9b6271954371ad276c6` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-library-rrch-library--six-level-civic-library.png` | 474,681 | `06051ede242b6cecbf9d8c3231a547cbf2843515177bb3176bacd1d5612d4d05` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-market-rrch-market--market-hall.png` | 294,732 | `82bbba19b11bf1361f29bb48d5054e01be2f3558eb5359914d501938c2637768` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-mason-rrch-mason--mason-cottage.png` | 146,895 | `f0a55b043b75bff1f5813b12b892d22d0b5731876f600309ef08a77232d6a284` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-moot-rrch-moot--moot-hall-and-sanctum-stack.png` | 388,700 | `e4f414b1e38a3683f94571f6069118b4794f4273bc2d2f8f4a4965e2a36a7979` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-scout-rrch-scout--scout-cottage.png` | 355,242 | `bbd170b709a8fdfb5fcea51a6f2564f5112f06e51ce403f57f470372a3f994fc` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-steward-rrch-steward--steward-cottage.png` | 169,096 | `94cfd146b334be27767914f80a08ac76ee565306ad0eccba8efe24d8a904252a` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-storehouse-rrch-storehouse--town-storehouse.png` | 102,238 | `768f7cfae755783abbce5f60810c3f0dbbf694bc271479b59dd72764b3e836fe` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-surveyor-rrch-surveyor--surveyor-cottage.png` | 133,478 | `e585a7bf830f1319110e334c656f17291c1db0c2af0d6ae2a659150fa91525be` | 1280×720 |
| `world-showcase/public/screenshots/ravensreach-rrch-town-hall-rrch-town-hall--original-town-hall-shell-within-moot-hall.png` | 409,632 | `59ba932e0b6a510dac2a2076a80cbfc7883eefb196c7a98bd8a9d32adbf224e3` | 1280×720 |
| `world-showcase/public/screenshots/RR-Z5-surface-access-shaft.png` | 449,492 | `66ff43e57326f1e55724288cdf8d1cfa629d64d05e1a55e6ce386fea8e45c020` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-brew-wd-brew--malt-lantern-brew-barn.png` | 214,607 | `b53c2b655e995e9d0b15450fecd1ebf3d6d8ac0801a9157d897c25c0a1b0622e` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-ferry-wd-ferry--ferry-bell-house.png` | 194,955 | `d0181f4da8f1932ab7e5eaf907d201eac353ada35efea0429990ae16bd584f83` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-field-wd-field--field-house-pavilion.png` | 65,479 | `ae6bfa6f07acbc7f9935eee1491c1687429329f64bbd9f121714f6b89d7dd30f` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-gatehead-wd-gatehead--gatehead-house.png` | 121,686 | `7867b60698ea830789a1c317d8efc7652c33b61dabe7522a412bdcb2e3451668` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-inn-wd-inn--beacon-inn.png` | 439,427 | `f7088c337b3e9392d57bd824c28eac4177bbf11eff792d21e903ed6fd3542033` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-lantern-wd-lantern--lantern-hall.png` | 265,061 | `38931aa59f6a7b3e7a78133200b897bc8ba9b78487c32ed509744c91ecd0eb2d` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-a-wd-shop-a--high-street-shop-a.png` | 294,598 | `e2c39caf710f6dd6c736c0a0c53aac44a878349afd18f6488518cb3df211b50f` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-b-wd-shop-b--high-street-shop-b.png` | 207,868 | `40d456eed6ab215e27026314ec21012bcff7968fac43e62d2c1c3291a68fbef4` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-c-wd-shop-c--high-street-shop-c.png` | 195,176 | `4b91133e2b85c34b5f213331757c07467eb9b87ff7f99b031b5ec6cae1f915eb` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-d-wd-shop-d--high-street-shop-d.png` | 165,090 | `77ecd51a0e543b2c963a06e2447099ef5381a633edd48d5c4cdff1111cb145e0` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-e-wd-shop-e--high-street-shop-e.png` | 143,271 | `5c34b3a9327da8ccc92e21b3d80097a3a38916f24fa529afb5a7fb29ca2041d9` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-f-wd-shop-f--high-street-shop-f.png` | 139,748 | `8fad7d6ae35ea147b2bb08f87a8d3455331e0cd8bf700ffdd89cbcd0a6a3f43b` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-shop-g-wd-shop-g--high-street-shop-g.png` | 136,826 | `9b0ca074bbaf76e30914f0c0324d9b1eea1b57ed1dc37a853c15a3cf77cabc10` | 1280×720 |
| `world-showcase/public/screenshots/westlight-district-wd-skiff-wd-skiff--skiff-house.png` | 158,675 | `3c08242cecd91896123e59f4278c65680c3ffcabff8b2d471fb68b6023cf4a84` | 1280×720 |
| `world-showcase/public/screenshots/westlight-venue-wl-bowl-WL-stadium-and-district.png` | 180,641 | `85fb7ec6480314715d4c2c4a3d01f54f581240ba249e5594f9021c0ee803b020` | 1280×720 |
| `world-showcase/public/screenshots/westlight-venue-wl-club-wl-club--members-club.png` | 96,643 | `0da0f5ddd8be62116d8bd7699ac392376793ac6edd44e21ccc4b936a37d06fd9` | 1280×720 |
| `world-showcase/public/screenshots/westlight-venue-wl-theatre-wl-theatre--below-grade-theatre-and-lobbies.png` | 88,302 | `bce66f88d17ec54be2a63601ae9ee17582803f7bc9070e8824beb3e76b85ba0a` | 1280×720 |
| `world-showcase/public/screenshots/westlight.png` | 128,353 | `07682e8d9861d1ef9714d69c5e11df163b794f021f3d5593bf1b2a548c7ce031` | 900×1028 |
| `world-showcase/public/screenshots/WL-stadium-and-district.png` | 180,135 | `9f01ab60520b37f53ecbd81aff12372b3f8cde048134a715bbe341ac92c48f2e` | 1280×720 |
| `world-showcase/public/wave2/01-after-t2b-west-to-east.png` | 27,863 | `f25757518f7a4448a8e2ecfb2d95ecbcb236c39727eaf865276f379e02058a83` | 1280×720 |
| `world-showcase/public/wave2/01-before-t2b-west-to-east.png` | 38,830 | `ff9155bb9bdc1e18717a1c6f379599717324d13a9c2ac3d9fff5e06cd3fe0c4c` | 1280×720 |
| `world-showcase/public/wave2/02-after-t2b-section.png` | 24,231 | `cd0564d763e09d58a64c22ad25177a17c9337bff8db21b7fa47a592acf994235` | 1280×720 |
| `world-showcase/public/wave2/02-before-t2b-section.png` | 29,671 | `7a766cfba811979cd2a5a53ba7aaf8779e0c34e496f6af90df557281e01b2eb2` | 1280×720 |
| `world-showcase/public/wave2/03-after-01-r08-overall-map.before.png` | 24,069 | `2eb312080cce29183570b0eea858f4edc3589259e4d512d94d22884ac64c8721` | 900×900 |
| `world-showcase/public/wave2/03-before-01-r08-overall-map.before.png` | 23,763 | `27683aaaed6bb17bd0d27c3b5f966756cb1cb60846be7922b9a67b5e4293fb73` | 900×900 |
| `world-showcase/public/wave2/04-after-04-r01-junction.before.png` | 105,637 | `86185a5ef5d3071777824cb806e7ed998fd05f62ff517d0482ae8a6e1323b9c5` | 1280×720 |
| `world-showcase/public/wave2/04-before-04-r01-junction.before.png` | 104,039 | `d3316dbae85b5233fcc94ab107486a5df70b17a01cfedea2953e1d78999cc488` | 1280×720 |
| `world-showcase/scripts/prepare_sites_worker.mjs` | 658 | `ac5b8ceb639e6fdda3ec847784159613623575c8137fd26818cd8ba0a5e671e7` | — |
| `world-showcase/tsconfig.json` | 530 | `743a7276e46684c178c11cabddab5d96443cdbe2ae7457ef91896814ea96000e` | — |
| `world-showcase/tsconfig.tsbuildinfo` | 260,097 | `7fd28b6d2a70adcff91dfcc007f325c706f7ab248d3cbde985282ee10cd90b01` | — |
| `world-showcase/wrangler.jsonc` | 323 | `bd6a6c5922c1fd38e2124c3ae2e5f4655d1a469ef6efb1e38d9dcf84eee1f641` | — |

### world-atlas

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/00-overall-active-world-surface-atlas.png` | 1,213,026 | `6b0c24d01cfa86908eafa7c6dfd906f17f9226ddc52749723798bd1961dd4a4f` | 1792×2176 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/01-ravensreach-core-and-old-town.png` | 108,917 | `c971bb1db57748110af0651e0af11b100c01fb4f47153487f3b4e95a3d80bf74` | 805×885 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/02-ravensgate.png` | 73,351 | `d9a68dfbe565927a57a64c5cad63df789d028f1e2e70533f2ef0df7cf65d250b` | 725×965 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/03-western-approach-road.png` | 62,799 | `f98d5389402c9b187438cc5418472f1b0bc831c9395469fc9f343c826f6afb5c` | 964×324 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/04-westlight-venue-and-district.png` | 128,627 | `dadaeced925e386f969cb76592e3d64bc14787386171dd3cec0a1740c1531e2a` | 900×1028 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/05-western-project-corridor.png` | 196,815 | `b9df35b1ed8aafd5ece24c7225595f98134f3598ba397f5e2c8b50eef9859b41` | 1395×1107 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/06-raven-rock-surface-access.png` | 544,452 | `d900dfd4598acee051e3a380c11a3e4879b003b7e5fa19d3c5dfb61161c06fa0` | 1282×1282 |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/area-inventory.json` | 1,491,135 | `8a7813a722fe1806f66f477bbd203e5ffb6b98da4278a37295faf77ef5b2c068` | snapshot=f8edf99494c0… |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/atlas-manifest.json` | 21,472 | `383dd6bb1211fdbeeb4de0d066063c4bb470dd1b083134c3d418097967cd1602` | snapshot=f8edf99494c0… |
| `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/README.md` | 1,122 | `b5bb7ab779b9c8bb5086b503a2de7ed1eb9714276fd117cd78482661e033e94a` | — |

### world-catalog-and-post-media

| Path | Bytes | SHA-256 | Evidence binding |
|---|---:|---|---|
| `data/exports/world-catalog-post-2026-07-27/capture-manifest.json` | 18,458 | `1c37d8fb31218ac80a02ce20c2abbeaed1a7af59e95e86bd70599a73b4d2165e` | snapshot=f8edf99494c0… |
| `data/exports/world-catalog-post-2026-07-27/database-report.html` | 48,906 | `594fe55dc97e4b9b11ddd6baa8b626cf3e276c878c363d5f31325f739537ad37` | — |
| `data/exports/world-catalog-post-2026-07-27/database-report.json` | 126,206 | `eb69b7248676aa9ff80bb60c09c11c397195a1d97b08308ed4f5f400fb71c120` | snapshot=f8edf99494c0… |
| `data/exports/world-catalog-post-2026-07-27/features.json` | 1,817,198 | `eae56b3ba39d11cd051f74f5d672fe83478fe392c0bb82ab11948f6f3c308b7e` | snapshot=f8edf99494c0… |
| `data/exports/world-catalog-post-2026-07-27/floorplans/00-worldwide-interior-summary.png` | 136,148 | `e53322e015771529f5eb6754dfa9e950bb5e674e5c871770c8897c4734153b06` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/01-mainstreet-america-overview.png` | 121,884 | `21ad78a19ae0771b3530c50339aa636e5e860876304632d5b3d927a9d27c5c29` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/02-raven-rock-overview.png` | 92,658 | `3fde1c06f175bd2d915f84443612ba0ddccd636f0e754b4542770dc285ce25d6` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/03-ravensreach-overview.png` | 117,238 | `4b64653f2b171f7ff891397e595c69acc042a33d235dd3e87a55679fc060cef0` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/04-ravensgate-overview.png` | 66,700 | `fac0a4cfe2b197f30e3914cee6e60648ae06fb1bebe30a8d9fe08947903672be` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/05-approach-road-overview.png` | 79,367 | `f3f5a2ff50891373cf2ab7d63e073884a7936caa59b5863fc4f645479597ea3d` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/06-westlight-venue-overview.png` | 80,476 | `a6380d1001872304f9a897927300fe62058c5808d5b41d1e8000bd57b307c683` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/07-westlight-district-overview.png` | 113,955 | `38e5ef7f01e5117722e203971aae5d3a9f99648d41944829c6d00a9e5bad2444` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/atlas-manifest.json` | 21,441 | `2ee202c47487bbd06107c417c94dd731f69e6d66e58b2af0493405ada33ff9e9` | snapshot=4a754a73f5dc… |
| `data/exports/world-catalog-post-2026-07-27/floorplans/README.md` | 781 | `6ecaaca5320f422cb045029a7439ca95e7573158d9f97119f14fd03e0a188747` | — |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-b01.png` | 41,552 | `a7ceeefdbf41535b8d7471844fb50011ee2632f253fcc166da05d9a2c47ccbab` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-b02.png` | 42,560 | `eae289d5d1dcbed49a83f3dd1359ce12868ce19b46cad9f23734a3eeddaf67a1` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-b03.png` | 41,718 | `23035fd85045ecbec168d53ac410203e141d46d36771e42ae9a828d89f701c96` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c01-public-entry.png` | 52,264 | `4d8b9ab1c053c4b4acf7924591d348925e8867179bc7d32e634f6cddb2d15cb8` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c01.png` | 99,213 | `d9e6df901c83ce9967b1b14734d2156d03c0bfe454b2b8af2161479c71c50a6d` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c02.png` | 39,968 | `e0383d5017c892adc772b8a0e2cbf173223b8ca855b51e3b531f5d145fbbaee1` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c03.png` | 39,022 | `e42b5b18d6951df1a7ee36d2a4e42c4f1ddbac54d071b706f950f736db85f9cb` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c04.png` | 42,745 | `0e6e2438002f91028803efe21388a9b48b5c1d52bfa19674b384ecdc71b20ada` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c05.png` | 41,897 | `6e0f70a59d6486647244a2c226e996e2fbef9c6a6f420d5a4f3bbd1be4ebc1b0` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c06.png` | 40,198 | `8d46e23748d10a71e1cad6478fae5af089c5064741c6545452ee2f00d395846f` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-c07.png` | 39,195 | `110e97d01c42ca534d89fbcfa24409e40bd3c3497838a36cbcb4067be1b6dbf7` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-grid-e2-building.png` | 60,161 | `7fd45ae547208a00a09e6fd54168de19dcdf16f2b8ca7d6a3141f290f13b8598` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-grid-w2-building.png` | 69,460 | `e205b0ea84a9959016c8a193ad4fb97db845e9f0d014f20a1be35ad58f961adf` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h01.png` | 69,143 | `7b4bdb3a197b0505e94597e6508a5cdbbd92a73e6c30d648372a1b9c8b8d30b9` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h02.png` | 54,948 | `c46d55a882098ea2bb4c3007014463866e06ea0f17db510d5932745c809ed25c` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h03.png` | 55,489 | `3e7ef85e3e7df8abd0f3f1b8a8c2def4025e96f80c4f684fd7872368dc04dd5c` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h04.png` | 56,829 | `72db4aa39d4af779457172891a37b6c02b3fddae716aa2eb0106a2cf23a63665` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h05.png` | 53,159 | `8b10266cad25b4c43aa524a815f2b0efaa7e25d7fb217f81641360993296833a` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h06.png` | 52,860 | `1e18058af15554c65a6bde310d45722fea2d226f7bad3b162ab180dba5f7de9d` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h07.png` | 55,614 | `e6d6ff0201c51006c4fa2a52ac85c2dfc4be54862ab3d01c242b3f49c09d4075` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h08.png` | 51,085 | `096e7ff74d31da62f94adf3b062653a21aa010894f11a30d683b1bf985ad8fce` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h09.png` | 53,410 | `7d6141632c8408b28ac02142927ddbdb2402342259c16935934a2a22fce27d14` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h10.png` | 53,922 | `69353cbcebe6369cb689518193e7ba62223551a083b90d2f163fa1a769a90e2c` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h11.png` | 68,663 | `9802674922ab974179069bc33f008bf1f1fab4a9fc3d0a8a84cbdffcf96cf938` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-h12.png` | 51,753 | `6047d5067b6cb1c7d0f6375084b55f7ba6e516729b6d7adb64a94e4bc36a113c` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-hgr-s01.png` | 69,286 | `52ad8ee14e33861f8a05245f9d578a854785502c1f0ec8fdbc6ef93006917a8f` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-obs-s01.png` | 61,243 | `028697fb9f66c551d444471cdbf631978321ecec0df8fd0539f429e6aa04d89a` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-p01-canopy-east.png` | 47,111 | `b8081475e354d2426cd1c19556609f4a94d128e735ba3a7cd780c86f907c4595` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-p01-canopy-west.png` | 47,660 | `1e70d8d34b92f1de79267c53065eec885f3f9509d22ac4a0de1aa11f661bcd8f` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-shl-s01.png` | 60,828 | `36173c6c02cc8561f27ac1f65d686f035bf34a70e2999327d2b87a10be3fef71` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/mainstreet-america-vlt-g01.png` | 73,709 | `e60e757bf0454c35be3f43d6073ddcdcb456a2f85cbe788d93d065026034065c` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/raven-rock-rr-b1.png` | 80,226 | `93dfa0487db524c15c50826013566648d1817e212d66f055ce672033a59b1e93` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/raven-rock-rr-b2.png` | 81,993 | `e1a7689bfa88dc178315ab4a0926dad916d084e6ed0298d7a50de2d04ee0ba57` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/raven-rock-rr-b3.png` | 70,722 | `df6cc290a39c7fea9a8781bd1b2572b8a46b954e4a2321387e13907be6fae2a8` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/raven-rock-rr-b4.png` | 58,717 | `e36013583dbcd12fdad1cbb0b2af110798ed4f8c60a03f1d32e112202a2f84e3` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/raven-rock-rr-z5.png` | 89,276 | `8c1dacdfa502c7d1a9f5f646b75f693970b4b3bfe2ca592a0a4b52e16d47a30f` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensgate-rg-bell.png` | 75,243 | `f46228322c35d0cd04504b5a93d9dd39d464dbc4d8fa09101dd1aa844616485f` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensgate-rg-loggia.png` | 49,862 | `938021d9548022371b9fea020bb454704cee6060725fed3b850f3d6d30799d02` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensgate-rg-stoa.png` | 49,236 | `907c9896a5fd6a472ca815d032ce4ac7208b11cf3b5911ef3a7f3cce6eb86140` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensgate-rg-tempietto.png` | 53,201 | `8e07b82e67f0b1bebe1459bf54b4d71d4ae687fee600e1ce4e56fc0429d750a7` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-architect.png` | 54,592 | `db892a7c02069c8b4de6ca3a1697d6ba22e4164bf87a0b51150a4636376c2b24` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-grange.png` | 69,498 | `0f0d50fec3c0a0014a5bf7d59bc5ba834a8fe76b0c3f69e60231492a655b9049` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-library.png` | 97,696 | `c5724d91240b8405870e8f8f17f1592add47d1e42086a69844e093f74e221026` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-market.png` | 66,840 | `8ccb52f596967f7013b11b941f21a57541f2c0712e6f70506aaeacb49987b466` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-mason.png` | 54,250 | `fa3824383d3838931fa71282e43b925219346324ca143a7b0d582af64f4ec2d7` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-moot.png` | 132,911 | `ebe33d95a01fab5d0b428e6d9f5dc1b6de4b5d4c8fd99fcc5df47b7a37d8dff1` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-scout.png` | 52,628 | `f2295a2ea5a74572d7fd22719bfdae884bcd31af09ddfd40557568adc8039f9d` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-steward.png` | 56,364 | `72bf03a41ddac680f6891886bd64d66fb541af7705f36e79f2acc69dbde2ff03` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-storehouse.png` | 56,878 | `23caa9ebfa54e531479b9b919a854fcf8db563cb9d6decbfa200529db41cd516` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-surveyor.png` | 57,138 | `0cd166a2092fe51ff96ccf55ee29fc6c2db826ebc63d8c244572ac4addf5fdfc` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/ravensreach-rrch-town-hall.png` | 88,336 | `b21a5a5536f5a0f39b4ca3b1102a44634d2615b5fe0a287bf46ba4658f6cb194` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-brew.png` | 61,052 | `6f0154c68cd731f31b5db471077cd3f00c591a2d84feb98961596b1c77c65f72` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-ferry.png` | 50,032 | `259b927a2472dadc946f1b13327f4c938a5649f954990ef6a03699a541fa08e9` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-field.png` | 50,156 | `46c02c6c389d9071a27d9127323dc3f182c5a257c5503e0d48b7fec504e17455` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-gatehead.png` | 59,989 | `786c2aac91051bb528e2c21d1eda1c9a93bc104d9cc6e5a7ce8d3d3f874df95b` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-inn.png` | 92,864 | `e54eee9f99e41c0bf65c09380f294742cd95f6ebe1604993567c18ecdbab5adf` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-lantern.png` | 47,024 | `d23305e0f39cb8b5b0a0e77a13dee0ab7c5529d220beb622471e2d1a4d706e46` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-a.png` | 57,358 | `7d5465ba25e170cac1d881b13e232a27d0e5cc6fd951e7ba0a0316514b7b796f` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-b.png` | 57,351 | `f12bb82c2496eeb265a6a9b9ff9abfd97d5023e3bf5b45982631477ec6da8a78` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-c.png` | 56,741 | `71e6b5d3b435f0b295835daeb659965ec98860a8f61586adf42a3bdab14f4137` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-d.png` | 56,385 | `fae747855748db03d816b34469d8d6c5f21d516b4d8930b31b870b3fbf192fcd` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-e.png` | 55,976 | `c5abcae1550f1f265d491933b05dda37bd25a815db9803d270314730c7f68d65` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-f.png` | 55,582 | `04c33730c6303c15f85d3655df85e3e40e44a52f1fe89aaec6011d58c6a86bef` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-shop-g.png` | 57,480 | `e3b8a061cb802dc2ec611c9d78a149ad69b1b0c862612ab2d0d1b15409f84bb8` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-district-wd-skiff.png` | 48,098 | `026d32b198e5bc22e5e055bcc486ae99dbbe9c7622bbd32daf30c1e0f79fe88a` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-venue-wl-bowl.png` | 89,150 | `9c21e63006f199046c02879b0455dc328f92c8a49340923202cbe57cd318f932` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-venue-wl-club.png` | 58,903 | `b2e886ad67fb29d958b170794ba5cd681e4680568c78f6fd8a31a664a5aa8b16` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/structures/westlight-venue-wl-theatre.png` | 81,194 | `e55f97ea72d002c1834cd2a21d9b943817b568692d625dcd60fe2e16dc7d191a` | 1600×1100 |
| `data/exports/world-catalog-post-2026-07-27/floorplans/worldwide-interior-floorplan-atlas.pdf` | 5,179,255 | `ee8c7d2be68e85d262fcfba1299e53f8e95c92f76216a49774f91f5cdfac4c2b` | — |
| `data/exports/world-catalog-post-2026-07-27/object-media-index.json` | 2,646,968 | `04e62cee71b064679a908c07e6170022323905028f76b553d89a10530dea6b6b` | snapshot=f8edf99494c0… |
| `data/exports/world-catalog-post-2026-07-27/README.md` | 4,191 | `a7c71a91dfc4ccdf2d5bff15e55b592f0781a64af6386064757fd22a4c255be6` | — |
| `data/exports/world-catalog-post-2026-07-27/screenshots/B01-guest-design-center.png` | 266,282 | `9948d983cbf62732bd90e506bbe4441e4a3c0133e9ecf3d4f8f9f7bc0659f390` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/B02-retail-cooking-school.png` | 327,535 | `d0f2e1d16c24b6df019b3cdec9ef783cd97b53f6abcfcb7088ee4a8b82038261` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/B03-service-warehouse.png` | 365,805 | `7e77310f88c6a705cc0f20ce0a5be4d77a48644bcbbb18a8e0b4cf0cd0ba4756` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/C01-mountain-operations-complex.png` | 381,293 | `cbb018e48eb48550f53851b9558ca78020fba8b98ae4d7732e8dcaf693fa27ad` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/capture-report.json` | 5,797 | `f3a0167459ad10b1119b9cc5b6881d4b8f661182b238640f8e186ab51edff54c` | status=PASS; passed=true; snapshot=f8edf99494c0… |
| `data/exports/world-catalog-post-2026-07-27/screenshots/MSA-homes-streetscape.png` | 303,446 | `f1f4ba18b1e05aaf87f06e15267d88fbd362545a54ca08456973ca6494a3c48c` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/RG-ravensgate.png` | 262,353 | `dbffb987ae60bab78b97699663716cfe35aff16a6ce51bebe0499b264da7ebcb` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/RR-Z5-surface-access-shaft.png` | 595,470 | `639310a41155b0c92b5f49894299c6f50acc7a8e2806ece2bc040be5e6e39774` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/RRCH-ravensreach-core.png` | 456,655 | `adeb1562f7862618c22192196ffe4a0abef0dbb93cdfa5de9ad010592a0fd5f8` | 1280×720 |
| `data/exports/world-catalog-post-2026-07-27/screenshots/WL-stadium-and-district.png` | 180,641 | `85fb7ec6480314715d4c2c4a3d01f54f581240ba249e5594f9021c0ee803b020` | 1280×720 |

## Integrity procedure

1. Regenerate this register only after all release evidence is final.
2. Compare the JSON artifact path set to the distributed handoff.
3. Recompute SHA-256 over exact bytes and compare every record.
4. Verify every post-release JSON snapshot binding resolves to the accepted
   immutable post-release region directory.
5. Treat an absent file, hash mismatch, parse error, stale snapshot binding,
   or non-passing acceptance status as a documentation defect.

