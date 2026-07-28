# Final Entity Clearance Red-Team Audit

**Decision:** `PASS_FINAL_ENTITY_CLEARANCE_RED_TEAM`

Entity clearance only; this does not replace operation, transaction, route, rollback, post-state, or media acceptance.

## Checks

- **ENT-RT-001 — PASS:** clearance5d binds its manifest and records a clean failed rollback
- **ENT-RT-002 — PASS:** the sole moved clearance5d row was restored exactly; the failed prequery row was never teleported
- **ENT-RT-003 — PASS:** clearance5d preflight was complete before its fail-closed execution
- **ENT-RT-004 — PASS:** clearance6a completed all 11 manifest-bound rows
- **ENT-RT-005 — PASS:** clearance6a preserves exact UUID order and immutable state
- **ENT-RT-006 — PASS:** clearance6a all-destination preflight passed 1.0s before execution
- **ENT-RT-007 — PASS:** clearance6a exclusion report reserves every completed destination exactly once
- **ENT-RT-008 — PASS:** clearance7a completed all 5 manifest-bound rows
- **ENT-RT-009 — PASS:** clearance7a preserves exact UUID order and immutable state
- **ENT-RT-010 — PASS:** clearance7a all-destination preflight passed 0.0s before execution
- **ENT-RT-011 — PASS:** clearance7a exclusion report reserves every completed destination exactly once
- **ENT-RT-012 — PASS:** clearance8a completed all 3 manifest-bound rows
- **ENT-RT-013 — PASS:** clearance8a preserves exact UUID order and immutable state
- **ENT-RT-014 — PASS:** clearance8a all-destination preflight passed 1.0s before execution
- **ENT-RT-015 — PASS:** clearance8a exclusion report reserves every completed destination exactly once
- **ENT-RT-016 — PASS:** clearance9e completed all 1 manifest-bound rows
- **ENT-RT-017 — PASS:** clearance9e preserves exact UUID order and immutable state
- **ENT-RT-018 — PASS:** clearance9e all-destination preflight passed 0.0s before execution
- **ENT-RT-019 — PASS:** clearance9e exclusion report reserves every completed destination exactly once
- **ENT-RT-020 — PASS:** clearance10a completed all 1 manifest-bound rows
- **ENT-RT-021 — PASS:** clearance10a preserves exact UUID order and immutable state
- **ENT-RT-022 — PASS:** clearance10a all-destination preflight passed 1.0s before execution
- **ENT-RT-023 — PASS:** clearance10a exclusion report reserves every completed destination exactly once
- **ENT-RT-024 — PASS:** clearance11a completed all 2 manifest-bound rows
- **ENT-RT-025 — PASS:** clearance11a preserves exact UUID order and immutable state
- **ENT-RT-026 — PASS:** clearance11a all-destination preflight passed 0.0s before execution
- **ENT-RT-027 — PASS:** clearance11a exclusion report reserves every completed destination exactly once
- **ENT-RT-028 — PASS:** clearance12c completed all 3 manifest-bound rows
- **ENT-RT-029 — PASS:** clearance12c preserves exact UUID order and immutable state
- **ENT-RT-030 — PASS:** clearance12c all-destination preflight passed 0.0s before execution
- **ENT-RT-031 — PASS:** clearance12c exclusion report reserves every completed destination exactly once
- **ENT-RT-032 — PASS:** clearance13d completed all 2 manifest-bound rows
- **ENT-RT-033 — PASS:** clearance13d preserves exact UUID order and immutable state
- **ENT-RT-034 — PASS:** clearance13d all-destination preflight passed 0.0s before execution
- **ENT-RT-035 — PASS:** clearance13d exclusion report reserves every completed destination exactly once
- **ENT-RT-036 — PASS:** clearance14a completed all 1 manifest-bound rows
- **ENT-RT-037 — PASS:** clearance14a preserves exact UUID order and immutable state
- **ENT-RT-038 — PASS:** clearance14a all-destination preflight passed 0.0s before execution
- **ENT-RT-039 — PASS:** clearance14a exclusion report reserves every completed destination exactly once
- **ENT-RT-100 — PASS:** final gate is one-package schema-2 PASS
- **ENT-RT-101 — PASS:** final gate binds the exact canonical operation package
- **ENT-RT-102 — PASS:** final gate has zero blockers, query errors, limits, or capture errors
- **ENT-RT-103 — PASS:** atomic release accepts the complete sparse spatial-query contract
- **ENT-RT-104 — PASS:** all 5 protected nonblocking observations recompute exactly under the narrow policy
- **ENT-RT-105 — PASS:** all relocation and final-gate force-load evidence converges on the same exact 104-chunk set
- **ENT-RT-106 — PASS:** final gate was generated after the last successful relocation

## Hash-bound evidence

- `clearance5d.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5d.manifest.json` — `902e97d71d4b5d5d770e9f843cecd6ddbade3875ae04f8b2fb80873e354aad56`
- `clearance5d.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance5d.journal.json` — `3fcffb8a17f73bab77a2ec1a608f9adfcd9ed20cb7ac753193bf31bcaee508f4`
- `clearance5d.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance5d.json` — `693eb5345d5a3b960bc0c1567108a2dd885893222bbebecf5991930e5bbfaae2`
- `clearance6a.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance6a.manifest.json` — `ca5aed564e07967c87e87647f00f5f75b8af40d1c98b6547279fbbb592db2118`
- `clearance6a.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance6a.journal.json` — `a1a28ffcf5414bb439bdb2ebfbfcb9e9f7b86c0ae4e60b7f6b281eaaf778a42a`
- `clearance6a.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance6a.json` — `91d7c1d069bb325cb7021a9923f172c440cd85dc4a24931d5d730310c15e6b85`
- `clearance6a.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance6a.json` — `9e68c9acf1d9c648e564375bce1857bff99ab3b74be6939cbf84f29c3a3e084d`
- `clearance7a.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance7a.manifest.json` — `ded8f07fe9a1c4ee43aee5fc58861c9a65c36f659157024c5f4d01e37b9ad6fc`
- `clearance7a.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance7a.journal.json` — `0b5bc8297d5a8118ccc7aefc97b1c710e01d53c87f60c284e13224f59dfa0628`
- `clearance7a.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance7a.json` — `b1f5f9f84fe590bba795fc9407c97a0e0cab8119ba38d038b85b8e206da7aa3a`
- `clearance7a.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance7a.json` — `f1aebfd168231e5c990b04381176c2376682733a7e049b5300a438c1ea95e731`
- `clearance8a.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance8a.manifest.json` — `b1a93bf1bdbed2634bb43d8effc7ebe0e33cbd9bdec95e8da015b32360f93010`
- `clearance8a.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance8a.journal.json` — `e7a55eee7436edced79eab0425a333f2aadcc7d45da9cc4fda1bcc8db033c30b`
- `clearance8a.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance8a.json` — `ea4db298361f30238ef920e8c4ce814a45537c465870cc97ab057ebdea2fe530`
- `clearance8a.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance8a.json` — `de92ca27d0838ffdc61aa00bc95db0e1e03d337eb6f670053695e91f3a3bf621`
- `clearance9e.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9e.manifest.json` — `a9ba49cf62fd6dd1eadec0b1f7f0f21d23f16b03a8b945e5d9c20aca20eebfc2`
- `clearance9e.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance9e.journal.json` — `42c01b9f331a1e83d2765c081fbef44847151665fa003c24650e97a35122476d`
- `clearance9e.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance9e.json` — `c42dc216b699606a6c5a62c27be2b4ad184eddf8600d72fee82252fef6174146`
- `clearance9e.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance9e.json` — `dc7672b22ad33c865535de87f6225041516d31134d7cd3a87e368d8be7abbaba`
- `clearance10a.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance10a.manifest.json` — `83503ffe4ac9d994019ebffda61f82f0d27ef96ef37d3972c448e62d976a3ae6`
- `clearance10a.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance10a.journal.json` — `799313c412031ea60fbd0ee3fd587dbbe0644cfa0c848a9761ebf16d72976baa`
- `clearance10a.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance10a.json` — `fc6372590b2da9928da56bc8f870e2f9bf6c4911ffaa172a5ee76fa11014bc47`
- `clearance10a.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance10a.json` — `aa0858ccff0572fbaef4414352e6cb966cefa6adb2122179499a437d3f9aae12`
- `clearance11a.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance11a.manifest.json` — `c08c0a116dcd68d0cc86cbb49d9f0f1c7961808b627541c3bd37f60fe073a8b8`
- `clearance11a.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance11a.journal.json` — `2910e15cfb46263f995097535cd63eba7ac5be104a22098914b69f5e1e670b1b`
- `clearance11a.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance11a.json` — `0c89824fa7bd4b0334c6528fe71ed1fd823e0884d06d227a6ca8e69d8ca7d494`
- `clearance11a.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance11a.json` — `91f98abcf2baeca80ae4b3fac2fc6d8727d77a0fe3e102ad96c6ce1bb94fad3d`
- `clearance12c.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance12c.manifest.json` — `95d917d0eecd88070631012513b5f3907a68635e8f7d375465d00415e7b1f383`
- `clearance12c.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance12c.journal.json` — `1f40ad933f5416c8055fa540164f485f72b8e9500bf2617236fc3630fc463844`
- `clearance12c.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance12c.json` — `8cbb0133c83f18bd5f163fbb1f9266f1b636a3acdb66fca667b54007ada80fe5`
- `clearance12c.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance12c.json` — `00075fa9e77155919fb2c3874feea77a2bba9689e92b973addcebb61b22740c8`
- `clearance13d.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13d.manifest.json` — `8c25458be10d96f6bd00f2b064417e76682ed3da1699d9101ce2f464819f309c`
- `clearance13d.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance13d.journal.json` — `059b5c8071344129eb9d973eb4b44b664f0174c8bc6cd07ec198ee1f5f316aaf`
- `clearance13d.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance13d.json` — `cae34e6c71ea1001940d6182363f8a115b2a063a9973a71a96029d131c12342d`
- `clearance13d.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance13d.json` — `46996843f75afa6c4ec8123734ecd2beadc282ddaa7bf9d027435641f5a453ab`
- `clearance14a.manifest` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance14a.manifest.json` — `bd66e53be6d632b4a88048007bc973d2442cbe17d59d377c0bbdf14f98b2419a`
- `clearance14a.journal` — `data/buildops/town-expansion-r1-2026-07-28.entity-evacuation.clearance14a.journal.json` — `9c399ac19b1d2d7708cf0102afebe7a1a2feee58e1bdf2584350ade67dd968e8`
- `clearance14a.preflight` — `data/world-review/town-entity-evacuation-destination-preflight.clearance14a.json` — `4e1b2c8dde4f9c5bb335602b44e4cffd49935bc6ade99e42c8916a860ca31f13`
- `clearance14a.exclusions` — `data/world-review/town-entity-destination-exclusions-completed-clearance14a.json` — `7733a3977833b46a35c4c5c68f520df6bc72ffdb66213f2c13b3a387e08ef2d1`
- `finalGate.artifact` — `data/world-review/town-expansion-r1-live-entity-gate-final-canonical-pass6-20260728.json` — `c98028cc027765193189afa30bf9aaceedebce8ea99516f7141217a6a9c5b6df`
- `gateImplementation.script` — `scripts/redevelopment_live_entity_gate.py` — `8c3557ba8e84789cad47d198d4ed0ec21139c17eb03bfed6d2f3570189f25e8c`
