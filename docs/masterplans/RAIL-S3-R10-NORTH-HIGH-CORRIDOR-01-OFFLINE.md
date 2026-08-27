# RAIL-S3-R10 · north high corridor-01

**Status:** OFFLINE STATIC GATES PASS — SEALED CIVIL CORRIDOR ONLY

This is the first safe subpackage of the north transition. It creates a sealed,
disjoint high 6×6 civil corridor, not a connection to continuation-05 and not a
rail or passenger facility.

- Core to clear: 720 cells, `x=26..45`, `y=42..47`, `z=-472..-467`.
- Shell / sealed terminal caps: 688 cells in the one-cell outer envelope.
- Retention exclusion: zero target overlap with the accepted 26-cell retained
  water, 132-cell shell, or 26-cell original liner; the nearest shell face is
  one block north at `z=-466`.
- Predecessor contract: zero target overlap with continuation-05's 2,039-cell
  release. This is an explicit non-connection, not a claimed migration.
- Gravity: two lower gravel cells at `(39,45,-473)` and `(40,45,-473)` become
  polished deepslate before their two upper gravel cells are replaced by the
  bottom-up shell stage; the core is cleared only after the closed shell.

The emitted exact inverse stages are support 2/2, shell 686/686, and core
720/720. Source/projected forward preflights pass 2/2, 686/686, and 720/720;
sequential projected rollback checks pass 720/720, 686/686, and 2/2. All six
strict parser checks and the combined block-entity audit pass.

Manifest: `data/buildops/rail-s3-r10-north-high-corridor-01.manifest.json`.
Static evidence: `data/world-review/rail-r10-continuation06-offline-20260826T060600Z/`.
The independent post-QA script preserves the full accepted continuation-05
retention package and all 2,039 predecessor targets.

No capture, execution, route connection, rail, power, signalling, or passenger
claim has occurred. A later, separately reviewed turn/shaft compiler must
resolve the 32 predecessor polished-deepslate interface cells and its own
gravity/retention controls before it can join this sealed segment.
