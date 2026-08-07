# Combined Zones complete saved-world intake audit

Status: **PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE — READ-ONLY — ZERO OPERATIONS**

This audit validates one supplied saved-world root. A PASS requires nonempty `region/`, `entities/`, and `poi/` MCA sets, a nonempty `level.dat`, no symlinks or dependency-sample path, stable reads, and an exact non-self-issued capture manifest binding the frozen-copy protocol and every required member hash.

## Result

| Field | Value |
|---|---|
| Supplied root | `data/worldsnap-combined-zones-complete-save-20260807T013748Z` |
| Direct world shape | yes |
| Capture manifest | `data/worldsnap-combined-zones-complete-save-20260807T013748Z/combined-zones-complete-save-capture.json` |
| Required members | 129 |
| Required bytes | 306579302 |
| Complete-save SHA-256 | `a981a305397769dea8dfa41bc8eb39941dbf2dbcbb2f09519f4f020d87d413df` |
| World edit authorized | no |

## Capture-manifest contract

The supplied root must contain `combined-zones-complete-save-capture.json` with schema version 1 and id `combined-zones-complete-save-capture`. It must record nonempty `captureId`, `worldIdentity`, `sourceAuthority`, and `captureTool` strings; set `immutableCopy` to true; bind `capturedAtUtc` to the copy-completion time; record ordered save-off, flush, copy-start, copy-complete, and save-on UTC timestamps; and list every required member's relative path, byte count, and SHA-256 exactly once.

## Checks

| Check | Status | Detail |
|---|---|---|
| CS01-SUPPLIED-ROOT | **PASS** | The supplied path is a regular non-symlink directory. |
| CS02-DEPENDENCY-SAMPLE-EXCLUSION | **PASS** | The supplied and resolved paths are outside dependency/sample trees. |
| CS03-UNAMBIGUOUS-WORLD-ROOT | **PASS** | The supplied directory itself has the required world shape and contains no nested competing world root. |
| CS04-REGION-MCA-SET | **PASS** | 51 regular MCA member(s) found. |
| CS04-ENTITIES-MCA-SET | **PASS** | 42 regular MCA member(s) found. |
| CS04-POI-MCA-SET | **PASS** | 35 regular MCA member(s) found. |
| CS05-LEVEL-DAT | **PASS** | level.dat is a 1574-byte regular file. |
| CS06-NO-SYMLINKS | **PASS** | No symlink exists at the root or among required inputs. |
| CS07-CANONICAL-DIRECTORY-MEMBERS | **PASS** | Required directories contain only regular MCA members. |
| CS08-STABLE-READ | **PASS** | Every member retained identical stat identity while hashed. |
| CS09-CAPTURE-MANIFEST | **PASS** | Capture manifest schema is valid; SHA-256 6a04d4a1acea21205a4e741f67569414adf56f94a140a57585d72888a3411175. |
| CS10-SAME-MOMENT-CAPTURE-PROTOCOL | **PASS** | The frozen-copy protocol is explicit and ordered. |
| CS11-MANIFEST-INVENTORY-EXACT | **PASS** | The declared member inventory equals the observed canonical inventory one-to-one. |
| CS12-COMPLETE-SAVE-IDENTITY | **PASS** | Complete immutable same-moment saved-world identity sealed as a981a305397769dea8dfa41bc8eb39941dbf2dbcbb2f09519f4f020d87d413df. |

## Required-member inventory

| Path | Bytes | SHA-256 | Stable read |
|---|---:|---|---|
| `entities/r.-1.-1.mca` | 724992 | `2c515b6564146c4e23dc48660ff26b3e3708a360fdf22d89d34fe0ac4fe60ebb` | PASS |
| `entities/r.-1.-2.mca` | 323584 | `2e841b73b2b655351dda73990319415d477014cd10c0deca05884368ef81bc65` | PASS |
| `entities/r.-1.-3.mca` | 176128 | `a1ef85a330659bf42939673561c180df2131ade8545a4b98314cefb2b26f8128` | PASS |
| `entities/r.-1.0.mca` | 733184 | `fe168f12f1d2f01e5a5d984afe8addc49fe33535f96deaef6a78da095e21c16d` | PASS |
| `entities/r.-1.1.mca` | 16384 | `1e0bcaab35cee2f282db9ad161d92529fe13bb878111108f40bba94c5a3fa35a` | PASS |
| `entities/r.-2.-1.mca` | 454656 | `ee6d82da8e606ac191a0ce6df92a0ed33a7942bad9babbb75410fd6362c30849` | PASS |
| `entities/r.-2.-2.mca` | 335872 | `1a5562e4150af088ae5b42b3afc68ce0b6e8a396e0c4a5cd395cf551f178c6a8` | PASS |
| `entities/r.0.-1.mca` | 966656 | `29a42eaa85080a67364f1d0d776a2a8da61d293d5ded2601686b5c095601b025` | PASS |
| `entities/r.0.-2.mca` | 458752 | `8242c834489a725a78433d5263fe207175b737b88074055d8ed4023bc4325f12` | PASS |
| `entities/r.0.-3.mca` | 442368 | `55efd5d89c513568f8dd2d125e0ab438f9dffe30d15322db390f9467846e4321` | PASS |
| `entities/r.0.0.mca` | 651264 | `5b7dad5febeba4fe979373a0dd9db6c3641a25e94c41d2f18b22c112025b5b38` | PASS |
| `entities/r.0.1.mca` | 40960 | `56438281ff9041108ad6e1e7d169af7ae6765493e780f1f109e3a3df51bc4a46` | PASS |
| `entities/r.1.-1.mca` | 860160 | `b014ff60ee52509ae197b615bce30213a29538c5607715e2aee0cdac4f4a04ac` | PASS |
| `entities/r.1.-2.mca` | 225280 | `1e248c43432c139456fa9ce7a322cb07999d4a8c10067d359d5c5b8f8362b436` | PASS |
| `entities/r.1.0.mca` | 262848 | `2358c3bb680c96c81107a1d7e8bb244cb064447a9d39a40cc5439498bb526aa6` | PASS |
| `entities/r.1.1.mca` | 40960 | `400c75810b0b34bd7c8f19fe75d9ba096fa431b641da5eb05ac820589935a3f8` | PASS |
| `entities/r.2.-1.mca` | 389986 | `52a44869c1283cdb080fcb961c2d05e347853ae5c9de3af786506f37115e22d1` | PASS |
| `entities/r.2.-2.mca` | 332777 | `bfb106f88317ce81a3ac730a181c2cca93bd3f70db66d32ddf100f2af2088bbb` | PASS |
| `entities/r.2.-3.mca` | 148509 | `2810a136828c817aec1d31e0567fb745e8a2976f96473ac9fa2a289b63768fea` | PASS |
| `entities/r.2.0.mca` | 377587 | `af7960e99a302e8d326aaa6d4e8ce99492338dbb8a13dd55002c460064064c7e` | PASS |
| `entities/r.2.1.mca` | 95019 | `bee2243ebb4f6baa4d7ae5c06fa4ac5bd33a390ef1ce5ec6b41def9dbe0d0593` | PASS |
| `entities/r.2.2.mca` | 16384 | `b1b04858d62a21f4f531f2c674ac5eab71439b69e0df4b109b27a138d0cb86e7` | PASS |
| `entities/r.3.-1.mca` | 397828 | `4d20aabcaf9f5b9dd45e5bebc45cf4ceadc89dfcfd5f1c86b4fc519430e1a829` | PASS |
| `entities/r.3.-2.mca` | 459703 | `88e8358f72ef4722e4ff35ff9e5bf8e5951c6903c0b6774ade8af49da04c7c34` | PASS |
| `entities/r.3.-3.mca` | 127906 | `94d40c6346c98c8ebd5f96a32b7f70e92cd28eedeeb1cc45b9d95579b2821c12` | PASS |
| `entities/r.3.0.mca` | 349021 | `cc0d47b19571b6e8008aa22dfa4a2a78faf62ea8e20ddd9e902a5395a0ac8691` | PASS |
| `entities/r.3.1.mca` | 156458 | `1e6e3572d18183ef92447bbe50d1ff2a8aad2d075b5f0959ca09316fe7cfa13a` | PASS |
| `entities/r.4.-1.mca` | 250561 | `5cae1fdca623839584d4e629b89210162b59517ffdaa97701407458d45ecc443` | PASS |
| `entities/r.4.-2.mca` | 270794 | `8b80e8ec1a76e0cbb8fe098f1c06720fc961dc560b0bf63ef85bafe0383913f7` | PASS |
| `entities/r.4.-3.mca` | 115448 | `90627ff1aa7631f2de4e8c466aac8d4e7a8797f3ff737f9095411ad0c639cc85` | PASS |
| `entities/r.4.0.mca` | 292023 | `0985ee2d6284bb8541e2e4143096df3dc619458ef5c9aac9448a748ddfa9317a` | PASS |
| `entities/r.4.1.mca` | 90594 | `5b80beeed9e1f716c27f575e7dba0a3eb10e76801855fcee871acd70d6e7013b` | PASS |
| `entities/r.5.-1.mca` | 338738 | `e8caed97bd2bd9b47265b224ba7af7997748ec09ecf1df82101a5e7490f800e5` | PASS |
| `entities/r.5.-2.mca` | 315879 | `8d615f9e0b91719552eab2344828fb3606ee112c104cf304be565ad5f206be20` | PASS |
| `entities/r.5.-3.mca` | 209702 | `a28d3efd8f72b71fbf9754125a38d2a253434ce0d6e868cd4674033d0685df72` | PASS |
| `entities/r.5.0.mca` | 287567 | `6de630367a663ed9801f7a5e837b801487907bf0ee9fafbb7479c70c46a7da31` | PASS |
| `entities/r.5.1.mca` | 25262 | `f95e80848c65f3e4f76a4cf8952af19c289fc2ca664ad70ce358ab121a29278d` | PASS |
| `entities/r.6.-1.mca` | 94664 | `9c163c0c5934dc1fa3b2a9c42e170778c9ee82ae5313c7958d5afc29e2685499` | PASS |
| `entities/r.6.-2.mca` | 123563 | `919472002d44c9f878257fa1059302dc9ba2fa1ff91c178ebf0106e01fb45ba2` | PASS |
| `entities/r.6.-3.mca` | 53705 | `bebd4c481fa2b323e30d5e9cd94b2de6b1897247f50e71c4a8d210011463f3ad` | PASS |
| `entities/r.6.0.mca` | 86725 | `4f220403d98559a27adde7f81a4a1be9a8f21537921d3ee5f01dcd744a0cea92` | PASS |
| `entities/r.6.1.mca` | 26266 | `bfd0ed573e117cf6322fe033c3c80ca537cb6fecbce07641e9055b65f274316f` | PASS |
| `level.dat` | 1574 | `3dfdc42c95b010766570061dffb5f949301e6fde2e5bb1704d738bc962eb0fdd` | PASS |
| `poi/r.-1.-1.mca` | 483328 | `cf0cfef1072239e344edab69699864c4cba8a6340f4ac521943d0b456b0ad503` | PASS |
| `poi/r.-1.-2.mca` | 122880 | `0ad09304f2b683907c833c07097f44b57cc0bf1a7cbc46d5e8801a700e8fd437` | PASS |
| `poi/r.-1.-3.mca` | 12288 | `1c44fe1f7fa12b7aecbbb6f73e3926cde24e8433379b5ad9834134ee9bebf70d` | PASS |
| `poi/r.-1.0.mca` | 98304 | `d2651e1b3ac455ba791a3e0196b502f5363dc8700244fc926b60e75946a7a897` | PASS |
| `poi/r.-2.-1.mca` | 90112 | `9591943232e3526278da2e40ac560ad109a289c49387f88a7003b4c2a16eeb69` | PASS |
| `poi/r.-2.-2.mca` | 20480 | `9560a7133982ab781ee46dddb5ca5924c49d604dd6957a424235531c30bd787f` | PASS |
| `poi/r.-2.0.mca` | 12288 | `ca0a6eb58b6acdffd417e563715ac46acf92b725de1d4b25d2f6631b22767455` | PASS |
| `poi/r.0.-1.mca` | 151552 | `88149b2fac36a68079879a035abbfde7d5f79ba997a9239b4e31be21501d68dc` | PASS |
| `poi/r.0.-2.mca` | 151552 | `ee36f400c6ba4b86eee6302b8f788f1c6c8a5cc935a5f335a69b439e27a84dc8` | PASS |
| `poi/r.0.-3.mca` | 40960 | `9778c2776abf2f94a765ea4addef9559652621535566e4ba81ca29f7e8127715` | PASS |
| `poi/r.0.0.mca` | 389120 | `0a6fb11782fc372fc037a927d604778a8b354a4a3f8cade3eac366f4dae32b92` | PASS |
| `poi/r.0.1.mca` | 16384 | `7bde0e8ae87435201235c25027f5851ba3997177861f180f9c033db2122a6fd9` | PASS |
| `poi/r.1.-1.mca` | 335872 | `cf75a9ef07c385fa1c07d983536cccb51d3e6957dedc5b68bbf0bb3308f59e7c` | PASS |
| `poi/r.1.-2.mca` | 57344 | `159bd56e785635440d4f64f40b2cf2ac623a17606fc8c4dcf053756bb8e5ac69` | PASS |
| `poi/r.1.0.mca` | 69764 | `7caab86633675cdfcbaab1da1f2e376d11005f6554f7476675b45f1369f0a0e6` | PASS |
| `poi/r.1.1.mca` | 36864 | `8e2ad7498cdbcc7fcfc9edd9a20bea2df0549c2f122a4348ebb3c420edeb84d4` | PASS |
| `poi/r.2.-1.mca` | 73862 | `cfa416caea25df5ecd5669dcfac03ad70d753bfda10266eb6728a235fb68a69f` | PASS |
| `poi/r.2.-2.mca` | 20608 | `7d3a3c6ea6937f191711f4154f232cce8eb4b92e925a433dd29e12a416a264e3` | PASS |
| `poi/r.2.-3.mca` | 16521 | `e295dcd9eb7cfec24312db21b0fa83aeb908ddf138b2ae17bbc84fa785b1de93` | PASS |
| `poi/r.2.0.mca` | 123007 | `312d8a41ddddd1146eebbcb215b6170981ba7b040f93b9f9feb7305534b9e515` | PASS |
| `poi/r.2.1.mca` | 73853 | `8117bbc4cfeb8e6e1fa992fd5b5fbba1ccb0501fef4469b09d57e199386a8fef` | PASS |
| `poi/r.2.2.mca` | 16384 | `8d3bef28640b36be1db80f92e61f0af57083169d3a42dfddce4303978d16a0b0` | PASS |
| `poi/r.3.-1.mca` | 65691 | `8a8f84bfd4b00339c0b83574e885d505aac3079d23049b6a8872236b68d504ff` | PASS |
| `poi/r.3.-2.mca` | 8318 | `c5b64c1b94e1ceaa8ca557e792215cf7fdf85ebe6c4b3c5c7f01eaca6e30692c` | PASS |
| `poi/r.3.-3.mca` | 53385 | `923a8ee3a95b4602fbf3e333ddbac39f019be222168865c522cb5208395340df` | PASS |
| `poi/r.3.0.mca` | 86087 | `4a66a8b7b46d6b7e0417fa3e0706de3ea5d2528892a849e11c8847f1202c7551` | PASS |
| `poi/r.3.1.mca` | 102526 | `95c83ab0a501984af9b389bfe2384327e8da17514b5334fd181036adf0ff305e` | PASS |
| `poi/r.4.-1.mca` | 65670 | `3b8edd01f9c4e3a12ba951f7db5a2c43f3d8a479854bbef5233425c709c38a6d` | PASS |
| `poi/r.4.-2.mca` | 106627 | `7739adb24c99d0510126998a0607e9e8f7ac14391c4d74e6ed8ca671d5ff0f35` | PASS |
| `poi/r.4.0.mca` | 45190 | `c3265c8e13775aa5acdb0b5eba12e94e5f17de404beebd3cdb7ca3ed70c1d85d` | PASS |
| `poi/r.5.-1.mca` | 24722 | `7b8a9dd295782f3a3450f87023a9df1c687bf81594cf2f655c00c1aef1da71c0` | PASS |
| `poi/r.5.-2.mca` | 69767 | `04af4f7e427dffb717abcfbcbecd8a063e2ac25cb0162436e59eb45b4447f432` | PASS |
| `poi/r.5.-3.mca` | 49286 | `bb2423fe4ee44de15345b46e7ebd202b1a6c8bfcbafd431179ad760717b53d2e` | PASS |
| `poi/r.5.0.mca` | 61574 | `fdfd1439f57f644a3a4ed741ad2941c6fc2f88a22fbb6dbb60e7c185b251e394` | PASS |
| `poi/r.5.1.mca` | 8347 | `57c6d6aee01641ad47cc575c944d3f8c250cbcc588279d6a5c47450bd69a4872` | PASS |
| `region/r.-1.-1.mca` | 9895936 | `f5078d302c2e63a502c182dbd931c027027f43ffd9c90e324f5eceefcf99d23c` | PASS |
| `region/r.-1.-2.mca` | 7733248 | `e53582a7ee96e7670d74d4d563b8686c9d3ce04e625c7aa3a8fe4a30b3a7f9d2` | PASS |
| `region/r.-1.-3.mca` | 5922816 | `4ea2c6e8331b1598ad0c9a83d3fa12ed94b88823ce25128c2be9dccd24bdb2c5` | PASS |
| `region/r.-1.-4.mca` | 503808 | `0c06b9667d551bd78b5e2494d0c7b5a667c8a9060611982bea9633479d75de4d` | PASS |
| `region/r.-1.0.mca` | 8744960 | `e1d00a03f774c7c957871eabf0f1797c733b653d819098a7232ec5f36a34d1e9` | PASS |
| `region/r.-1.1.mca` | 1654784 | `c4d63e4c42d77783b66919501d3f2a8f2562779796683144744e5941078a87ba` | PASS |
| `region/r.-2.-1.mca` | 7696384 | `f6c13e964499fa65c562df61ea3db86ac382845dfdf26dec252f74a63a9d4d74` | PASS |
| `region/r.-2.-2.mca` | 6758400 | `0e310d422c650effe6b0216a58d46bf15063126debf99d3dd1aa3e9dcff5ebbc` | PASS |
| `region/r.-2.-3.mca` | 364544 | `47db1ede216debf2bb3a5a9c7ffe95f1f7ba31b8d3f128eef36718f4b304464c` | PASS |
| `region/r.-2.0.mca` | 2113536 | `61d1f9ead39a20b65c872dbbabe65fd8ef75774584b9cdfb639d78673c79f416` | PASS |
| `region/r.-2.1.mca` | 163840 | `11e0d6a509a7dee8510bfeec578a31195fb4bd7628b2ec7e949d25edee7e3609` | PASS |
| `region/r.-3.-1.mca` | 385024 | `e84527ee82551ae1a193c5d3d392023795961873a99f6c0a954e2777e1f88a9b` | PASS |
| `region/r.-3.-2.mca` | 733184 | `18fc3e8a72d61d7073b59d67526f89f11b91a7e4547dc72364f7f4195e0c5044` | PASS |
| `region/r.0.-1.mca` | 9097216 | `6cb18fd4b6cc91fd16bc39a4b74097d57fd707aa8576eee560bd1447bf59d3e3` | PASS |
| `region/r.0.-2.mca` | 8122368 | `1cfb48828995d9192164661501085fc133d76958031a2a7a50dda4124e3c95bb` | PASS |
| `region/r.0.-3.mca` | 7487488 | `2ca3e8de5f846f77d5fbf64f76bf92079f7c825d5db928f85775ac42dd60f40a` | PASS |
| `region/r.0.-4.mca` | 835584 | `7db77b2fd522d2e3f4689879ea408e9f59e8cf935d43918d340185458559334c` | PASS |
| `region/r.0.0.mca` | 8663040 | `eff8575dc1cbc16b9835bd896353212ebe2f40bc1d8ee9f235d810522dca340c` | PASS |
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
| `region/r.3.-1.mca` | 9330927 | `02264c7fe5fbb8c5f8971cc6765de6db1897ea8c6aec68cd5c85fab6d59ff241` | PASS |
| `region/r.3.-2.mca` | 9261140 | `318d6f2e15f0c1cdefe9dcc769f9b5d5144582789b7221a5f025595e13146b81` | PASS |
| `region/r.3.-3.mca` | 5010621 | `7f55c02f68afc4fd7838654929fdcf7f8dd19c6ae850ef8cc936ff7cb4e14237` | PASS |
| `region/r.3.0.mca` | 9290134 | `f90ee1855508b8563a533dfaa89294ca46c90bd349461ff0071dbb00ef12b023` | PASS |
| `region/r.3.1.mca` | 4108647 | `7e25d3c0a2fd62408b68ced382a836b2fb979878e4dd755177b687e718c962c0` | PASS |
| `region/r.4.-1.mca` | 9303976 | `4aa3caeb32f003e17ade8d45bc10a09f700d728640d316067dfd77a707d30c6f` | PASS |
| `region/r.4.-2.mca` | 8769989 | `08940211bb493c6751fcdd439f342db72d56c93187f36f30fdbe20ea38c94892` | PASS |
| `region/r.4.-3.mca` | 4949303 | `40ee823385aad337dcf666a35d09fb3d1352b1ddff6448fd59b7577616cf1dae` | PASS |
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

- None.

No live system was contacted, no RCON command was issued, no supplied-save file was written, no operation was emitted, and no world edit is authorized.
