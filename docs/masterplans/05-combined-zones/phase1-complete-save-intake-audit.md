# Combined Zones complete saved-world intake audit

Status: **HOLD_INCOMPLETE_OR_UNBOUND_SAVE — READ-ONLY — ZERO OPERATIONS**

This audit validates one supplied saved-world root. A PASS requires nonempty `region/`, `entities/`, and `poi/` MCA sets, a nonempty `level.dat`, no symlinks or dependency-sample path, stable reads, and an exact non-self-issued capture manifest binding the frozen-copy protocol and every required member hash.

## Result

| Field | Value |
|---|---|
| Supplied root | `data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z` |
| Direct world shape | no |
| Capture manifest | absent |
| Required members | 51 |
| Required bytes | 290946492 |
| Complete-save SHA-256 | not sealed |
| World edit authorized | no |

## Capture-manifest contract

The supplied root must contain `combined-zones-complete-save-capture.json` with schema version 1 and id `combined-zones-complete-save-capture`. It must record nonempty `captureId`, `worldIdentity`, `sourceAuthority`, and `captureTool` strings; set `immutableCopy` to true; bind `capturedAtUtc` to the copy-completion time; record ordered save-off, flush, copy-start, copy-complete, and save-on UTC timestamps; and list every required member's relative path, byte count, and SHA-256 exactly once.

## Checks

| Check | Status | Detail |
|---|---|---|
| CS01-SUPPLIED-ROOT | **PASS** | The supplied path is a regular non-symlink directory. |
| CS02-DEPENDENCY-SAMPLE-EXCLUSION | **PASS** | The supplied and resolved paths are outside dependency/sample trees. |
| CS03-UNAMBIGUOUS-WORLD-ROOT | **HOLD** | The supplied directory is not the direct unambiguous world root; nested candidates: 0. |
| CS04-REGION-MCA-SET | **PASS** | 51 regular MCA member(s) found. |
| CS04-ENTITIES-MCA-SET | **HOLD** | entities/ is absent, non-directory, or a symlink. |
| CS04-POI-MCA-SET | **HOLD** | poi/ is absent, non-directory, or a symlink. |
| CS05-LEVEL-DAT | **HOLD** | level.dat is absent, empty, non-regular, or a symlink. |
| CS06-NO-SYMLINKS | **PASS** | No symlink exists at the root or among required inputs. |
| CS07-CANONICAL-DIRECTORY-MEMBERS | **PASS** | Required directories contain only regular MCA members. |
| CS08-STABLE-READ | **PASS** | Every member retained identical stat identity while hashed. |
| CS09-CAPTURE-MANIFEST | **HOLD** | Capture manifest is absent. |
| CS10-SAME-MOMENT-CAPTURE-PROTOCOL | **HOLD** | Capture manifest is absent. |
| CS11-MANIFEST-INVENTORY-EXACT | **HOLD** | 1 inventory difference(s) found. |
| CS12-COMPLETE-SAVE-IDENTITY | **HOLD** | A complete saved-world identity cannot be sealed while any preceding check is HOLD. |

## Required-member inventory

| Path | Bytes | SHA-256 | Stable read |
|---|---:|---|---|
| `region/r.-1.-1.mca` | 9895936 | `eeb67cafc6171bf92dd0a9616db417cf45f860972fb36852cc493d6450719499` | PASS |
| `region/r.-1.-2.mca` | 7733248 | `28f083bdc0afc8a30912fa8a96eaa049a5a632c85b44185c62615e8e72b686e4` | PASS |
| `region/r.-1.-3.mca` | 5922816 | `4ea2c6e8331b1598ad0c9a83d3fa12ed94b88823ce25128c2be9dccd24bdb2c5` | PASS |
| `region/r.-1.-4.mca` | 503808 | `0c06b9667d551bd78b5e2494d0c7b5a667c8a9060611982bea9633479d75de4d` | PASS |
| `region/r.-1.0.mca` | 8744960 | `5c0ab5f5f0518e2257a9f758381ed083000a00e8308096281199c0ec358739da` | PASS |
| `region/r.-1.1.mca` | 1654784 | `c4d63e4c42d77783b66919501d3f2a8f2562779796683144744e5941078a87ba` | PASS |
| `region/r.-2.-1.mca` | 7696384 | `f6c13e964499fa65c562df61ea3db86ac382845dfdf26dec252f74a63a9d4d74` | PASS |
| `region/r.-2.-2.mca` | 6758400 | `0e310d422c650effe6b0216a58d46bf15063126debf99d3dd1aa3e9dcff5ebbc` | PASS |
| `region/r.-2.-3.mca` | 364544 | `47db1ede216debf2bb3a5a9c7ffe95f1f7ba31b8d3f128eef36718f4b304464c` | PASS |
| `region/r.-2.0.mca` | 2113536 | `61d1f9ead39a20b65c872dbbabe65fd8ef75774584b9cdfb639d78673c79f416` | PASS |
| `region/r.-2.1.mca` | 163840 | `11e0d6a509a7dee8510bfeec578a31195fb4bd7628b2ec7e949d25edee7e3609` | PASS |
| `region/r.-3.-1.mca` | 385024 | `e84527ee82551ae1a193c5d3d392023795961873a99f6c0a954e2777e1f88a9b` | PASS |
| `region/r.-3.-2.mca` | 733184 | `18fc3e8a72d61d7073b59d67526f89f11b91a7e4547dc72364f7f4195e0c5044` | PASS |
| `region/r.0.-1.mca` | 9097216 | `9639f0ffe1869c61834573dbc05370dcd4b934d681efd1515f55165047494191` | PASS |
| `region/r.0.-2.mca` | 8122368 | `1cfb48828995d9192164661501085fc133d76958031a2a7a50dda4124e3c95bb` | PASS |
| `region/r.0.-3.mca` | 7487488 | `2ca3e8de5f846f77d5fbf64f76bf92079f7c825d5db928f85775ac42dd60f40a` | PASS |
| `region/r.0.-4.mca` | 835584 | `7db77b2fd522d2e3f4689879ea408e9f59e8cf935d43918d340185458559334c` | PASS |
| `region/r.0.0.mca` | 8663040 | `c42b3c5d23642e83eb88cc21adf880f361b6355efb0503d5697b870c6d1883b6` | PASS |
| `region/r.0.1.mca` | 3551232 | `32217b3aae161a83d7e9a78587a140d8b4167670c5774fed6b2b1dd18e035bcf` | PASS |
| `region/r.1.-1.mca` | 10555392 | `ba115879660574aa09e46f2650ad2b88f53bcccfb768c088dadbcd44122d792b` | PASS |
| `region/r.1.-2.mca` | 6742016 | `fba7382986ccf3bb011f38c1fbebe30e94f47d19520c2302b57291cf70dab230` | PASS |
| `region/r.1.-3.mca` | 576351 | `6cd9087dfb7a28e1e5c371b1937dda08efbe3cd50caebffd0cdcf2cc9f47b924` | PASS |
| `region/r.1.0.mca` | 8881780 | `9b098425537cc5aca9173e4a8bc3cddac971cadc5582df8846904eb034329d51` | PASS |
| `region/r.1.1.mca` | 4993383 | `f73c0b4888b9abf1af56e1e75d75c0f48d4f4f34d9a18ade2b93eb69e9a142f5` | PASS |
| `region/r.1.2.mca` | 212992 | `9cebe13b5116d52dada07bbe82c772a2a756fa7b46c6f88e93034fd7fec226d6` | PASS |
| `region/r.2.-1.mca` | 11330205 | `cdfbae093d94734ae6ba1faa2c0dd02505a16a73bb5e266d10aac0b2fcaef14c` | PASS |
| `region/r.2.-2.mca` | 8900809 | `a65aa7e0d1a99de4c93a6b96f6be4337c2f48330f01f899ddac37b9eb590ebab` | PASS |
| `region/r.2.-3.mca` | 4583756 | `de285a114cd978cf9e12c63a52f46219c7af6fc3d421d8f1da4d6bc074c998c8` | PASS |
| `region/r.2.0.mca` | 8745567 | `0f86269e43eadc4c86c0196ce38189cc2a63bf4d2923d48d93c5a7deaf4c7123` | PASS |
| `region/r.2.1.mca` | 3955452 | `8661464a407d1d061794f6900a9ffcbdd3ffa5771e10f051c02a01e856f8ad32` | PASS |
| `region/r.2.2.mca` | 2781184 | `7012277828611862b0587423b352d701138562e1f934e45929378a4808a709f2` | PASS |
| `region/r.3.-1.mca` | 9289730 | `43dbf5508c698004bf568d6fc4670de596cce69d25c9073675cf093fa5cada29` | PASS |
| `region/r.3.-2.mca` | 9229138 | `c5494fa36082b45726162714aa2b56893430995a90de973c16d7986294f71d02` | PASS |
| `region/r.3.-3.mca` | 4984918 | `8f6f23c9f13bd438b35a0c716529520899ab3818ead030542b7ebc73f87b738b` | PASS |
| `region/r.3.0.mca` | 9182757 | `24979d6361b5c3f8fc812748697786d968bca71e017f37050a6af3131563a0c9` | PASS |
| `region/r.3.1.mca` | 4108647 | `7e25d3c0a2fd62408b68ced382a836b2fb979878e4dd755177b687e718c962c0` | PASS |
| `region/r.4.-1.mca` | 9303976 | `54efc459fdadcc1433880034a3e417af9ef319470afd0fe7fc725ce4eac2853e` | PASS |
| `region/r.4.-2.mca` | 8719004 | `db6326342fb6e95f2c4c80d08bf47969e1370b755b0e771d757971b5d28de98a` | PASS |
| `region/r.4.-3.mca` | 4882565 | `2f05db00baa53e436b2fd52d49e2dbe308a068ed8a16577ad2ba4a0d3d96de5d` | PASS |
| `region/r.4.0.mca` | 9896673 | `a107a7ddcafe704d111617d96468b436120a709d5d7e254fa6475711f39db756` | PASS |
| `region/r.4.1.mca` | 3913273 | `cf3a22b728a27286e70e3e81111d6784c6df39f5d80c99f3119811b94ce8c82a` | PASS |
| `region/r.5.-1.mca` | 9437287 | `53d914a832fc37b14b1bb72db509ecc7fa82f29655ef297b3a31c1fa38828a4d` | PASS |
| `region/r.5.-2.mca` | 9327589 | `a9a7c408f83c928099ab02a1147732a98016e9c1da4af79f5f72f20d013e5596` | PASS |
| `region/r.5.-3.mca` | 4927775 | `c3fb6be0f5f5c4f93e5547fc1e8826e54c50c0ce65d39ff085df1f2baec5f91b` | PASS |
| `region/r.5.0.mca` | 8622652 | `781bf64df53158efcbcd204439cf2cabb66b3995ca38a39a1c69065f78feca96` | PASS |
| `region/r.5.1.mca` | 3551996 | `10ae21361e3093260775992e6cf19e3bc9eb98b8819b51730a119c71b08d88c4` | PASS |
| `region/r.6.-1.mca` | 4391509 | `602336b76ffc9c25f6161ce060687d42472af752f84da07e244de9564717a2c0` | PASS |
| `region/r.6.-2.mca` | 4722915 | `7ce1949dbd5c1969221fbd5c6270bc7cc1a551b719c8c876521a1787895a6254` | PASS |
| `region/r.6.-3.mca` | 2856105 | `02e135cb00c2742bc9d8876a2dd33f0ff13ae04870d74ddc26641627991a2372` | PASS |
| `region/r.6.0.mca` | 4739558 | `19717bdecf862a7d7883af656c2b91d04c40a1b94796ad6d7f5a6e541521445b` | PASS |
| `region/r.6.1.mca` | 2172146 | `5db2dc942a649da0ca13a9c3e693046a05c3e9fcaae2b449e4cab1affeb97860` | PASS |

## Blocking evidence

- **CS03-UNAMBIGUOUS-WORLD-ROOT:** The supplied directory is not the direct unambiguous world root; nested candidates: 0.
- **CS04-ENTITIES-MCA-SET:** entities/ is absent, non-directory, or a symlink.
- **CS04-POI-MCA-SET:** poi/ is absent, non-directory, or a symlink.
- **CS05-LEVEL-DAT:** level.dat is absent, empty, non-regular, or a symlink.
- **CS09-CAPTURE-MANIFEST:** Capture manifest is absent.
- **CS10-SAME-MOMENT-CAPTURE-PROTOCOL:** Capture manifest is absent.
- **CS11-MANIFEST-INVENTORY-EXACT:** 1 inventory difference(s) found.
- **CS12-COMPLETE-SAVE-IDENTITY:** A complete saved-world identity cannot be sealed while any preceding check is HOLD.

No live system was contacted, no RCON command was issued, no supplied-save file was written, no operation was emitted, and no world edit is authorized.
