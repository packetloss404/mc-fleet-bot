# Combined Zones complete saved-world intake audit

Status: **HOLD_INCOMPLETE_OR_UNBOUND_SAVE — READ-ONLY — ZERO OPERATIONS**

This audit validates one supplied saved-world root. A PASS requires nonempty `region/`, `entities/`, and `poi/` MCA sets, a nonempty `level.dat`, no symlinks or dependency-sample path, stable reads, and an exact non-self-issued capture manifest binding the frozen-copy protocol and every required member hash.

## Result

| Field | Value |
|---|---|
| Supplied root | `data/worldsnap` |
| Direct world shape | no |
| Capture manifest | absent |
| Required members | 32 |
| Required bytes | 205145659 |
| Complete-save SHA-256 | not sealed |
| World edit authorized | no |

## Capture-manifest contract

The supplied root must contain `combined-zones-complete-save-capture.json` with schema version 1 and id `combined-zones-complete-save-capture`. It must record nonempty `captureId`, `worldIdentity`, `sourceAuthority`, and `captureTool` strings; set `immutableCopy` to true; bind `capturedAtUtc` to the copy-completion time; record ordered save-off, flush, copy-start, copy-complete, and save-on UTC timestamps; and list every required member's relative path, byte count, and SHA-256 exactly once.

## Checks

| Check | Status | Detail |
|---|---|---|
| CS01-SUPPLIED-ROOT | **PASS** | The supplied path is a regular non-symlink directory. |
| CS02-DEPENDENCY-SAMPLE-EXCLUSION | **PASS** | The supplied and resolved paths are outside dependency/sample trees. |
| CS03-UNAMBIGUOUS-WORLD-ROOT | **HOLD** | The supplied directory is not the direct unambiguous world root; nested candidates: 1. |
| CS04-REGION-MCA-SET | **PASS** | 32 regular MCA member(s) found. |
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
| `region/r.-1.-1.mca` | 9895936 | `b5b48fcf58d24c56f04d10c4f958e556e8a9438df60625206dc07f911ca3c9f8` | PASS |
| `region/r.-1.-2.mca` | 7733248 | `45b68740227f39a4e60c853611502e7d57eac22e1f6d0e4c0ee9d64267bbfb72` | PASS |
| `region/r.-1.-3.mca` | 5906432 | `ccffda4e0dc5298bcb8400104ac30026353e06c8469c1b4805e7810fb1ef738b` | PASS |
| `region/r.-1.-4.mca` | 450560 | `96d6853f65fd3b3bd9ca4eee4ca229ee68ee6662acc0ba38538d78767ed7031f` | PASS |
| `region/r.-1.0.mca` | 8744960 | `48490f5aca6ae74d6321c74be9e6e7d98017833f344c66ea49bf35baf4251d28` | PASS |
| `region/r.-1.1.mca` | 1654784 | `c4d63e4c42d77783b66919501d3f2a8f2562779796683144744e5941078a87ba` | PASS |
| `region/r.-2.-1.mca` | 7733248 | `66cdb995274e86cfab74bc07dba6720be1318598789b4f0bfbc8d11696bfd6c0` | PASS |
| `region/r.-2.-2.mca` | 6918479 | `63ec0bc2b8c2ce643348c62ea1252e790fa18b53502cbd726004f98c79f008a1` | PASS |
| `region/r.-2.0.mca` | 1511424 | `165dce3826262e8f1f47c5ccb9031c7fba4d1fc0e88864904c85b10eb188bfef` | PASS |
| `region/r.-2.1.mca` | 163840 | `11e0d6a509a7dee8510bfeec578a31195fb4bd7628b2ec7e949d25edee7e3609` | PASS |
| `region/r.0.-1.mca` | 9097216 | `b5fc3a88737fc4512485d2bb92a247d08d8bb5869e6126b885e6f409de4e05c3` | PASS |
| `region/r.0.-2.mca` | 8679424 | `e3058f6b28dd14b4dfc17a7f64529324bfa89fcfec474b37b562c2b9452511ac` | PASS |
| `region/r.0.-3.mca` | 6782976 | `a64db45ee72de721ee0b40595d2a19f782cd8bc01025802bf60025a2ee22a875` | PASS |
| `region/r.0.-4.mca` | 503808 | `0d3fbc77c567ef0da94b169b5a8bee262ac2d71d7e1a923e20814fe0c726feaf` | PASS |
| `region/r.0.0.mca` | 8663040 | `bd2bb312987f51b670f30c778ac87beb4fdfd232d651c88a6f046a8db22098a5` | PASS |
| `region/r.0.1.mca` | 3551232 | `4cb0dd02baf8711ce12c9f7c6ca9026667aa03d0da27ec51abd51b25b7e0f457` | PASS |
| `region/r.1.-1.mca` | 10522624 | `afdad354f7ea043fb98f96cd882d0b0dbaa16bca4506eccf26463668173a55c6` | PASS |
| `region/r.1.-2.mca` | 5914624 | `a906b3042bc46e7fc04995f79732ab1344048f34539293ec31fa5efa586d6705` | PASS |
| `region/r.1.0.mca` | 7839744 | `bc229d5792f0548ab0b9249ba2196ff151c016121ddde8d692d958ee12b574ea` | PASS |
| `region/r.1.1.mca` | 4841472 | `ed6b6e54fe24d76a8e273c88e65fa4c6d0b89aa01c90a798a29d7cb60d001cee` | PASS |
| `region/r.1.2.mca` | 212992 | `9cebe13b5116d52dada07bbe82c772a2a756fa7b46c6f88e93034fd7fec226d6` | PASS |
| `region/r.2.-1.mca` | 11330205 | `cdfbae093d94734ae6ba1faa2c0dd02505a16a73bb5e266d10aac0b2fcaef14c` | PASS |
| `region/r.2.-2.mca` | 8900809 | `a65aa7e0d1a99de4c93a6b96f6be4337c2f48330f01f899ddac37b9eb590ebab` | PASS |
| `region/r.2.0.mca` | 8745567 | `0f86269e43eadc4c86c0196ce38189cc2a63bf4d2923d48d93c5a7deaf4c7123` | PASS |
| `region/r.2.1.mca` | 212992 | `2592cd89f49d311df1f67d08665626a651f732709a01e593085dba0bdf5385c6` | PASS |
| `region/r.2.2.mca` | 2781184 | `7012277828611862b0587423b352d701138562e1f934e45929378a4808a709f2` | PASS |
| `region/r.3.-1.mca` | 9330927 | `02264c7fe5fbb8c5f8971cc6765de6db1897ea8c6aec68cd5c85fab6d59ff241` | PASS |
| `region/r.3.-2.mca` | 9261140 | `318d6f2e15f0c1cdefe9dcc769f9b5d5144582789b7221a5f025595e13146b81` | PASS |
| `region/r.3.0.mca` | 9290134 | `f90ee1855508b8563a533dfaa89294ca46c90bd349461ff0071dbb00ef12b023` | PASS |
| `region/r.4.-1.mca` | 9303976 | `4aa3caeb32f003e17ade8d45bc10a09f700d728640d316067dfd77a707d30c6f` | PASS |
| `region/r.4.-2.mca` | 8769989 | `08940211bb493c6751fcdd439f342db72d56c93187f36f30fdbe20ea38c94892` | PASS |
| `region/r.4.0.mca` | 9896673 | `a107a7ddcafe704d111617d96468b436120a709d5d7e254fa6475711f39db756` | PASS |

## Blocking evidence

- **CS03-UNAMBIGUOUS-WORLD-ROOT:** The supplied directory is not the direct unambiguous world root; nested candidates: 1.
- **CS04-ENTITIES-MCA-SET:** entities/ is absent, non-directory, or a symlink.
- **CS04-POI-MCA-SET:** poi/ is absent, non-directory, or a symlink.
- **CS05-LEVEL-DAT:** level.dat is absent, empty, non-regular, or a symlink.
- **CS09-CAPTURE-MANIFEST:** Capture manifest is absent.
- **CS10-SAME-MOMENT-CAPTURE-PROTOCOL:** Capture manifest is absent.
- **CS11-MANIFEST-INVENTORY-EXACT:** 1 inventory difference(s) found.
- **CS12-COMPLETE-SAVE-IDENTITY:** A complete saved-world identity cannot be sealed while any preceding check is HOLD.

No live system was contacted, no RCON command was issued, no supplied-save file was written, no operation was emitted, and no world edit is authorized.
