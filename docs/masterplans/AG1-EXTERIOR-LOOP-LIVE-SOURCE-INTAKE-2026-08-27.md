# Combined Zones complete saved-world intake audit

Status: **PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE — READ-ONLY — ZERO OPERATIONS**

This audit validates one supplied saved-world root. A PASS requires nonempty `region/`, `entities/`, and `poi/` MCA sets, a nonempty `level.dat`, no symlinks or dependency-sample path, stable reads, and an exact non-self-issued capture manifest binding the frozen-copy protocol and every required member hash.

## Result

| Field | Value |
|---|---|
| Supplied root | `data/worldsnap-ag1-exterior-loop-live-source-20260827T013700Z` |
| Direct world shape | yes |
| Capture manifest | `data/worldsnap-ag1-exterior-loop-live-source-20260827T013700Z/combined-zones-complete-save-capture.json` |
| Required members | 130 |
| Required bytes | 310685801 |
| Complete-save SHA-256 | `f46434c5fa073d037bc747f7b37132d78b76f21054dd72d7b03e8b06756a29d7` |
| World edit authorized | no |

## Capture-manifest contract

The supplied root must contain `combined-zones-complete-save-capture.json` with schema version 1 and id `combined-zones-complete-save-capture`. It must record nonempty `captureId`, `worldIdentity`, `sourceAuthority`, and `captureTool` strings; set `immutableCopy` to true; bind `capturedAtUtc` to the copy-completion time; record ordered save-off, flush, copy-start, copy-complete, and save-on UTC timestamps; and list every required member's relative path, byte count, and SHA-256 exactly once.

## Checks

| Check | Status | Detail |
|---|---|---|
| CS01-SUPPLIED-ROOT | **PASS** | The supplied path is a regular non-symlink directory. |
| CS02-DEPENDENCY-SAMPLE-EXCLUSION | **PASS** | The supplied and resolved paths are outside dependency/sample trees. |
| CS03-UNAMBIGUOUS-WORLD-ROOT | **PASS** | The supplied directory itself has the required world shape and contains no nested competing world root. |
| CS04-REGION-MCA-SET | **PASS** | 52 regular MCA member(s) found. |
| CS04-ENTITIES-MCA-SET | **PASS** | 42 regular MCA member(s) found. |
| CS04-POI-MCA-SET | **PASS** | 35 regular MCA member(s) found. |
| CS05-LEVEL-DAT | **PASS** | level.dat is a 1572-byte regular file. |
| CS06-NO-SYMLINKS | **PASS** | No symlink exists at the root or among required inputs. |
| CS07-CANONICAL-DIRECTORY-MEMBERS | **PASS** | Required directories contain only regular MCA members. |
| CS08-STABLE-READ | **PASS** | Every member retained identical stat identity while hashed. |
| CS09-CAPTURE-MANIFEST | **PASS** | Capture manifest schema is valid; SHA-256 e6324e3cb498e685fe531d51e315e9b018b6463ff99bba80a4ed0e9b5869e04d. |
| CS10-SAME-MOMENT-CAPTURE-PROTOCOL | **PASS** | The frozen-copy protocol is explicit and ordered. |
| CS11-MANIFEST-INVENTORY-EXACT | **PASS** | The declared member inventory equals the observed canonical inventory one-to-one. |
| CS12-COMPLETE-SAVE-IDENTITY | **PASS** | Complete immutable same-moment saved-world identity sealed as f46434c5fa073d037bc747f7b37132d78b76f21054dd72d7b03e8b06756a29d7. |

## Required-member inventory

| Path | Bytes | SHA-256 | Stable read |
|---|---:|---|---|
| `entities/r.-1.-1.mca` | 724992 | `1d072d9caa82d3d9fee52adaaf4465f5fabf7dcdfe59bf0d49faf69abc9a85f4` | PASS |
| `entities/r.-1.-2.mca` | 323584 | `3d28045b046feab32a2d8a0109a17c1e38a228fc4dbc3a3cced6bb1e618027d5` | PASS |
| `entities/r.-1.-3.mca` | 176128 | `a1ef85a330659bf42939673561c180df2131ade8545a4b98314cefb2b26f8128` | PASS |
| `entities/r.-1.0.mca` | 733184 | `618aa6516c12532e6e2726a7159a6d0bdaedb0ca4291e01c4f99d15b35ce4a6b` | PASS |
| `entities/r.-1.1.mca` | 16384 | `1e0bcaab35cee2f282db9ad161d92529fe13bb878111108f40bba94c5a3fa35a` | PASS |
| `entities/r.-2.-1.mca` | 491520 | `40a2b2b6e5b1f0f3ef8b704bea4664b65feb82d1952134baab1fdaf2d04f5d7e` | PASS |
| `entities/r.-2.-2.mca` | 450560 | `e26c8763268a6efc2c7aa3848d1e8c3559a90e05812ee4df44deef5056f21859` | PASS |
| `entities/r.0.-1.mca` | 966656 | `81bf7806ca6bd4cd94fe249342830232a87947f90c2f4d54f5af0b121cff7c98` | PASS |
| `entities/r.0.-2.mca` | 549659 | `3e046d08b2b80d65efade80107660a35a426ae6836b5cdb500dca759aee414a6` | PASS |
| `entities/r.0.-3.mca` | 442368 | `55efd5d89c513568f8dd2d125e0ab438f9dffe30d15322db390f9467846e4321` | PASS |
| `entities/r.0.0.mca` | 651264 | `e59d90a841d891d3674f4fec27569dfef16ad95b01acacdee81b29d346bf917c` | PASS |
| `entities/r.0.1.mca` | 40960 | `56438281ff9041108ad6e1e7d169af7ae6765493e780f1f109e3a3df51bc4a46` | PASS |
| `entities/r.1.-1.mca` | 860160 | `cc130fd63998067a24cab02e1185075b586ae29f2eff1044e61a38e5dc28cad5` | PASS |
| `entities/r.1.-2.mca` | 340735 | `1ccc207933cb8edee89389e9fb00fc84d90836fdc61235a77c5bc7601834d878` | PASS |
| `entities/r.1.0.mca` | 270336 | `bb841b53e7d4afa487c4a5600f4efd204482fd469f48b6805b14f93a21ffbbf4` | PASS |
| `entities/r.1.1.mca` | 40960 | `400c75810b0b34bd7c8f19fe75d9ba096fa431b641da5eb05ac820589935a3f8` | PASS |
| `entities/r.2.-1.mca` | 466944 | `25dc4b9b7a3a5caa3c27c59fff90e1b8730733eda0e76895b82780e64268f8e9` | PASS |
| `entities/r.2.-2.mca` | 335872 | `ff86d383313ae62996e9194f09f65de119ddedc43497d40c3de0cc3b6d14fc73` | PASS |
| `entities/r.2.-3.mca` | 151552 | `9c78b9b982de0c2a26ab63179f71573f5ea1d72dd6365647a5eeb71af4623ee0` | PASS |
| `entities/r.2.0.mca` | 417792 | `f20e8aafa4b4e6bb99cfac2a6228a52b948f7252f3839d3aa83be800359e07a8` | PASS |
| `entities/r.2.1.mca` | 98304 | `ec075ea8e7e3d2b9c69237b8fe3d8eb76bb7ac897b5e712fb5c5d1774dc608fa` | PASS |
| `entities/r.2.2.mca` | 16384 | `b1b04858d62a21f4f531f2c674ac5eab71439b69e0df4b109b27a138d0cb86e7` | PASS |
| `entities/r.3.-1.mca` | 479232 | `238702d78177f99a9993117d6d99e7a9674b95e6e2a4ffc11a8ce95bc80d0a12` | PASS |
| `entities/r.3.-2.mca` | 471040 | `deab8b195bc38b234121161cfc972e2ca3cdf43a342d9cb7b55055f03d72da3e` | PASS |
| `entities/r.3.-3.mca` | 131072 | `a10d418d36e605a09df4fec6adc4a9718396d526e4ab302a48045f6910a17427` | PASS |
| `entities/r.3.0.mca` | 598016 | `f81621a217ba933b268d2ac9b9baf89b4b6b6d8dbb8dfecc1c479d04828b9950` | PASS |
| `entities/r.3.1.mca` | 159744 | `f5c3babd8ee19c8a89056ddc3d26caba6f0728a26b403689b72251523908601b` | PASS |
| `entities/r.4.-1.mca` | 253952 | `789ed6a16339a9178f778df1f973fba1cb62ffa07fab8f60edeeee02b7fa0f6f` | PASS |
| `entities/r.4.-2.mca` | 274432 | `22cfc818fd5f54690ccb25962015e7f5b69ef8a5d8e2e1b84f33e893b06d5ae3` | PASS |
| `entities/r.4.-3.mca` | 118784 | `13c24abd9ed3883721c3f54be64d0741aff354349e5077cf2ce029006fb91ae2` | PASS |
| `entities/r.4.0.mca` | 294912 | `ec5725eb8515395b72d981a980e64ea946d316a06241789579c334fb8e9b0bc5` | PASS |
| `entities/r.4.1.mca` | 94208 | `fcad5ade13cdf3531b9d47bc3d65d70b6f1cd1e84c19a1fb0363835d571f7d6b` | PASS |
| `entities/r.5.-1.mca` | 339968 | `ea781090c5c116e0b0df4def01c9f73e8a93cca38cf2539ff87938718a9cc179` | PASS |
| `entities/r.5.-2.mca` | 327680 | `3f4e87603b08cd8e0ed6f00a92fc5c017db85102c2d2cdcc31b05a65cb0933c4` | PASS |
| `entities/r.5.-3.mca` | 212992 | `eacbfa10827307ed05a77d41c7eea869cfaf23577e238c0e0045a0b6727114cb` | PASS |
| `entities/r.5.0.mca` | 290816 | `7adf722be93705e55ccf25ba99dc7756ada3b3bcd053e9e0bafbac540524e327` | PASS |
| `entities/r.5.1.mca` | 28672 | `bb0d8e95a18665a0b78f9a0cf199d43fb754e68d4f46a934528f6a3e37fd9327` | PASS |
| `entities/r.6.-1.mca` | 98304 | `2efccdaa198164d0285257e2c356d9bee9e64260f05a354d73a4e421f06519b4` | PASS |
| `entities/r.6.-2.mca` | 126976 | `c79c9489d4d8a27f9131f13713a86b74eaff629887fad3344ee629ecbb3bb9d2` | PASS |
| `entities/r.6.-3.mca` | 57344 | `06b64e920698cc6619adeb7217a192787ad385289a28953692cf30ebfe35db05` | PASS |
| `entities/r.6.0.mca` | 90112 | `e7bd74b922ad8e62088675c1898cc442dfa09c22d25db6db93ef3956166409ef` | PASS |
| `entities/r.6.1.mca` | 28672 | `dcb6ff5e4d93ff217f2eff53a1fffe85aa49cf452df7a00010532cfbbb725155` | PASS |
| `level.dat` | 1572 | `61f78397cb476b683328a8a5579ff23065561882eeec2115154c1d09f662c3ac` | PASS |
| `poi/r.-1.-1.mca` | 487424 | `1a709de2c51c26c8fb43f26b195d43145669cdc68ee0b941c0d43d090176cb16` | PASS |
| `poi/r.-1.-2.mca` | 122880 | `0ad09304f2b683907c833c07097f44b57cc0bf1a7cbc46d5e8801a700e8fd437` | PASS |
| `poi/r.-1.-3.mca` | 12288 | `1c44fe1f7fa12b7aecbbb6f73e3926cde24e8433379b5ad9834134ee9bebf70d` | PASS |
| `poi/r.-1.0.mca` | 98304 | `d2651e1b3ac455ba791a3e0196b502f5363dc8700244fc926b60e75946a7a897` | PASS |
| `poi/r.-2.-1.mca` | 90112 | `9591943232e3526278da2e40ac560ad109a289c49387f88a7003b4c2a16eeb69` | PASS |
| `poi/r.-2.-2.mca` | 36864 | `fa844286d505fcf3560840bbebc95a7c71f36e4a32e095ec55bb6fa8e09904fd` | PASS |
| `poi/r.-2.0.mca` | 12288 | `ca0a6eb58b6acdffd417e563715ac46acf92b725de1d4b25d2f6631b22767455` | PASS |
| `poi/r.0.-1.mca` | 151552 | `88149b2fac36a68079879a035abbfde7d5f79ba997a9239b4e31be21501d68dc` | PASS |
| `poi/r.0.-2.mca` | 151552 | `ee36f400c6ba4b86eee6302b8f788f1c6c8a5cc935a5f335a69b439e27a84dc8` | PASS |
| `poi/r.0.-3.mca` | 40960 | `9778c2776abf2f94a765ea4addef9559652621535566e4ba81ca29f7e8127715` | PASS |
| `poi/r.0.0.mca` | 389120 | `a7bc219846912a92d7f58f984749620ac1b1abc0350f08b84164ef2a785d3237` | PASS |
| `poi/r.0.1.mca` | 16384 | `7bde0e8ae87435201235c25027f5851ba3997177861f180f9c033db2122a6fd9` | PASS |
| `poi/r.1.-1.mca` | 335872 | `cf75a9ef07c385fa1c07d983536cccb51d3e6957dedc5b68bbf0bb3308f59e7c` | PASS |
| `poi/r.1.-2.mca` | 90248 | `1bfcbf82632bca838006aeeb8f4325f5857ae8d2647068cdfd37f3e2566e85e3` | PASS |
| `poi/r.1.0.mca` | 73728 | `9a41db6ae696692a55aeb9e8bc4a8a3ce9662b7dd7e716eddae4ba950c8b9dee` | PASS |
| `poi/r.1.1.mca` | 36864 | `8e2ad7498cdbcc7fcfc9edd9a20bea2df0549c2f122a4348ebb3c420edeb84d4` | PASS |
| `poi/r.2.-1.mca` | 77824 | `83dcd13a29414a35c94c1aa06b420a95336717f4e4c938848f0b3f6bba443d6f` | PASS |
| `poi/r.2.-2.mca` | 24576 | `ea50cfc79263c8747c708dbeee97ddf97734ba0f0c0499eb1e773fd1753f7811` | PASS |
| `poi/r.2.-3.mca` | 20480 | `64cafe61f9ddef0efb081c1ac7055dd826e078a0136881077434ba6f5ee15096` | PASS |
| `poi/r.2.0.mca` | 126976 | `310166e467e791f1fda76b6206f7f159c5e185de7ac511cebafc69402dc2fb6c` | PASS |
| `poi/r.2.1.mca` | 77824 | `53c9281bd4dba43212d8486f408e9e26f65b95c1869e80979cc72655aa5aae7b` | PASS |
| `poi/r.2.2.mca` | 16384 | `8d3bef28640b36be1db80f92e61f0af57083169d3a42dfddce4303978d16a0b0` | PASS |
| `poi/r.3.-1.mca` | 69632 | `e592707cf4386f696b4ee1fad901567687c4aab200061f0396816c4fcb798663` | PASS |
| `poi/r.3.-2.mca` | 49323 | `72b97e68d082983707ae1eb6ef1c122f4883fb75e45bb71eb6e24cddb5aaf4a0` | PASS |
| `poi/r.3.-3.mca` | 57344 | `10c0922522546b652d96e6593d94a87732be72625e211e5ede6eb439f05aff67` | PASS |
| `poi/r.3.0.mca` | 90112 | `6f3a881e55bddd75e5b2bae24a343a34821a603321ec02219d7bbaa89b62c517` | PASS |
| `poi/r.3.1.mca` | 106496 | `9f1b483aa133524b2caf86f1fec158114c0966ce85293fb9b6be36e4809fb1c2` | PASS |
| `poi/r.4.-1.mca` | 69632 | `fdd514f6dbf234918af482faee770d0cc5216ad61fc0d5e69c767025e51562e1` | PASS |
| `poi/r.4.-2.mca` | 114688 | `59c79e86724523ec33587faacf75e6fde6f145d613842f81e0f91331f231f4d1` | PASS |
| `poi/r.4.0.mca` | 49152 | `963a43f21720651a42aa2c4298abaaf97cddd5665167ff82d7e50687e014005a` | PASS |
| `poi/r.5.-1.mca` | 28672 | `078bfe0f21f479d4e79058f2e92413b54a977cc3b720f0f3169e740db6b96589` | PASS |
| `poi/r.5.-2.mca` | 73728 | `e16597e2d83aa0ab5e261cb41e685eea763d49c101b90f8e9d6c5f959817a8e1` | PASS |
| `poi/r.5.-3.mca` | 53248 | `86e047180e51aa953575f453fe1e321073862a9fefb12eb3551d12f1e3b1df8c` | PASS |
| `poi/r.5.0.mca` | 65536 | `c1cee57407f1e7ce704919ef549ed1fed1c061333dba65403351a0cc0d215f7d` | PASS |
| `poi/r.5.1.mca` | 12288 | `63ee01c24332fe7d62858621c5096409dff1e6b11214a011c18535a1c3e113db` | PASS |
| `region/r.-1.-1.mca` | 9895936 | `451eb5a24cc0ca4d75600976aefdfd21e2d940660cc22758291eeff68b574fe6` | PASS |
| `region/r.-1.-2.mca` | 7733248 | `34ea80b14a3ae6a822ab43d1f82aaf92e77972eaced2fa40047c442615de2dc9` | PASS |
| `region/r.-1.-3.mca` | 5922816 | `4ea2c6e8331b1598ad0c9a83d3fa12ed94b88823ce25128c2be9dccd24bdb2c5` | PASS |
| `region/r.-1.-4.mca` | 503808 | `0c06b9667d551bd78b5e2494d0c7b5a667c8a9060611982bea9633479d75de4d` | PASS |
| `region/r.-1.0.mca` | 8744960 | `7f0adfd29fc9aa8ac375db944721b657e04c0f059aba87bcf4059b1d9f305f4e` | PASS |
| `region/r.-1.1.mca` | 1654784 | `c4d63e4c42d77783b66919501d3f2a8f2562779796683144744e5941078a87ba` | PASS |
| `region/r.-2.-1.mca` | 7733248 | `9f64a9aedc212172585c1e55910a53d34a82d591c52cd7fb63e06ee24e8ac5ea` | PASS |
| `region/r.-2.-2.mca` | 6922240 | `7af9ed5a7087fa4f41898546da098da5f0679bd003a1435d15e0e95852587d0b` | PASS |
| `region/r.-2.-3.mca` | 376832 | `14bc282bb3160785bed8cb736e1ca858d1d2f3984cf88f956f5fe0c4bd844a5c` | PASS |
| `region/r.-2.0.mca` | 2113536 | `61d1f9ead39a20b65c872dbbabe65fd8ef75774584b9cdfb639d78673c79f416` | PASS |
| `region/r.-2.1.mca` | 163840 | `11e0d6a509a7dee8510bfeec578a31195fb4bd7628b2ec7e949d25edee7e3609` | PASS |
| `region/r.-3.-1.mca` | 430080 | `88bbcf48f6c6e75c17db24e31f1a9481b13dc9ea3231b25b631a1131f4e21096` | PASS |
| `region/r.-3.-2.mca` | 811008 | `281cb3b041c58c044d8df76636e17b8f31e1ece8690fa52c53276f7d807fb047` | PASS |
| `region/r.-3.-3.mca` | 12288 | `747f99cbb49fdb48aec6e22b5babb4c4d06cbb4e0d327655e9b8df416faa9da8` | PASS |
| `region/r.0.-1.mca` | 9097216 | `5058a4c8a2c5a69084f9cc90c4de995a12e7f3e84bd5cf7278be58d8dda7a634` | PASS |
| `region/r.0.-2.mca` | 8679424 | `44572094fce799dab6f223d44ea93108bded57ea216d292dcf03ce7ae85f3952` | PASS |
| `region/r.0.-3.mca` | 7487488 | `d3363b105574d1b498771525562cbbce56e63a70674386a1102ae2e09adb86ea` | PASS |
| `region/r.0.-4.mca` | 835584 | `7db77b2fd522d2e3f4689879ea408e9f59e8cf935d43918d340185458559334c` | PASS |
| `region/r.0.0.mca` | 8663040 | `96557b87975f17c09dc093ff429e7b503ea175cab4ece71b2b44b4de254714e0` | PASS |
| `region/r.0.1.mca` | 3551232 | `32217b3aae161a83d7e9a78587a140d8b4167670c5774fed6b2b1dd18e035bcf` | PASS |
| `region/r.1.-1.mca` | 10555392 | `441019252311f5387a6d587e35eab331e539a6d28e3d228057898c3be2a1b728` | PASS |
| `region/r.1.-2.mca` | 8028508 | `dc3a63ab44d9d1a2f6b5fc26f367e157774d70004a5dc0bbf2e1794c633b0c57` | PASS |
| `region/r.1.-3.mca` | 1237404 | `5cdc9979fa361fd040d87dada06a0a47eb5a5cffac9c11a0ba174c7f760cb217` | PASS |
| `region/r.1.0.mca` | 8949760 | `08dece6b6ebe909ee534841aaef2513d3a7b76e5db22cbb56d9e7039c0af438a` | PASS |
| `region/r.1.1.mca` | 4997120 | `8357bdbe5299c7591c542e904c6137ccaf158ad8febe4650ae4bd4d6dccf5e97` | PASS |
| `region/r.1.2.mca` | 212992 | `9cebe13b5116d52dada07bbe82c772a2a756fa7b46c6f88e93034fd7fec226d6` | PASS |
| `region/r.2.-1.mca` | 11333632 | `f7badf0fdfd264f574fdd1756735f5e350a11844629d155aadd1793820fcbf07` | PASS |
| `region/r.2.-2.mca` | 8904704 | `66b770bac2e390b00ad0cf7a09078202499ce2ca80360e6859b28b4e78cec668` | PASS |
| `region/r.2.-3.mca` | 4587520 | `9e382ab137c0feaa890d491e15055d4c895802011676cf587ec8bf7e18e26b10` | PASS |
| `region/r.2.0.mca` | 8749056 | `f7ef1c4e50b8920380fc16522c1ea0ae370a88010f6609389fe53d3e3f4ce9a5` | PASS |
| `region/r.2.1.mca` | 3956736 | `d31ae952c57f13451d067e9bcf740ca11bc1d61c095cb177d333ea19ab72b2e2` | PASS |
| `region/r.2.2.mca` | 2781184 | `7012277828611862b0587423b352d701138562e1f934e45929378a4808a709f2` | PASS |
| `region/r.3.-1.mca` | 9342976 | `ddcd017ff3bda2b690a85888792c39a80abd96b22cc8690695c6468957821c4c` | PASS |
| `region/r.3.-2.mca` | 9265152 | `b973a995184735933beecc8ce06d1a5d9c2f2fb7ed6f32648a0be15819adcd66` | PASS |
| `region/r.3.-3.mca` | 5013504 | `54dc3196efa9256a5f5d71b1caac587da2f253e0700dbbb930c8cb09b73d866a` | PASS |
| `region/r.3.0.mca` | 9318400 | `8c27f784f29b9b5f9fc40ad412114cc4f587b6792ce5aceaa76a6d322345d3ab` | PASS |
| `region/r.3.1.mca` | 4112384 | `6059c832c4fd54bced80f44f1a1c3b5b27fd9b97c99cf37f963d7b57887bc00f` | PASS |
| `region/r.4.-1.mca` | 9306112 | `2b551407e68476a8f4ebdcf9b206fb6960e449c537192dad0f5b9af096d876bb` | PASS |
| `region/r.4.-2.mca` | 8773632 | `2827ce37081083d8b6f04c2380a63ee756d225a1ad1e0df36a6722fde031336a` | PASS |
| `region/r.4.-3.mca` | 4952064 | `d326c12780197c375583df773912f35a5bd45e9191910a3f062e342105ffb548` | PASS |
| `region/r.4.0.mca` | 9900032 | `6ffb27c84711c117c4dd0cb7520897c2e4790e815bf9eabb3a809a1c9e2e5d32` | PASS |
| `region/r.4.1.mca` | 3915776 | `6e7ddea70c69a9ef8416ef4bf07af1db5a556697d7587075d009fb4cd15ee894` | PASS |
| `region/r.5.-1.mca` | 9441280 | `19709a1ba5173d32339c4c0baec1f4716229bd34ffaf6cab447909b19c73435c` | PASS |
| `region/r.5.-2.mca` | 9330688 | `f582f0d2867af17f70412a91a151364eb3278818dab0155460fdc31597e7d1ef` | PASS |
| `region/r.5.-3.mca` | 4931584 | `a471c28c4bdf5b1bc3db3e264c809aa4bec16474dd71bd0a6d4a62456bd579df` | PASS |
| `region/r.5.0.mca` | 8626176 | `d21d5ec6b08fcafcd2c19a21aad212f455ab4c12756df904f9a9c4cb874a47f4` | PASS |
| `region/r.5.1.mca` | 3555328 | `ca3e28f5e509456c2c3091227589df84ddc2ced6ff84b60d82bf9e60c3423ba0` | PASS |
| `region/r.6.-1.mca` | 4395008 | `4a3421c3a2dbbc5993bbdc8f1de66fcb969391b27785da00f29ed87478baa0b7` | PASS |
| `region/r.6.-2.mca` | 4726784 | `ba03346401609124eff1255164b071771a9caea17dbaa733cea2f7db08511db6` | PASS |
| `region/r.6.-3.mca` | 2859008 | `0e3894f3318ae028ddffd132c51384497ddf23588bc0119ecd14cb32940c92c6` | PASS |
| `region/r.6.0.mca` | 4743168 | `4927e3f6c5ed94a7eb398f7222baf9278f01b8eaeddbb7f2bec1913fe6013695` | PASS |
| `region/r.6.1.mca` | 2174976 | `e66243d2c33aa32e8a765577c55da96283d9b56e2d94c511982f1ddf7ee524f1` | PASS |

## Blocking evidence

- None.

No live system was contacted, no RCON command was issued, no supplied-save file was written, no operation was emitted, and no world edit is authorized.
