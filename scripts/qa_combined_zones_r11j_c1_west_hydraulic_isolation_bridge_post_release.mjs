#!/usr/bin/env node
/** Independent read-only post-release QA and seal for CZ-R11J. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  blockName,
  connectedComponents,
  FORBIDDEN_SOURCE_BLOCKS,
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T04:25:00Z');
const LEDGER_INPUT = value(
  '--ledger',
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/evidence-ledger.json',
);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-post-release-qa.json',
);
const MD_OUT = value(
  '--md-out',
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-post-release-qa.md',
);
const SEAL_OUT = value(
  '--seal-out',
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-bridge-commissioning-seal.json',
);
const SEAL_MD_OUT = value(
  '--seal-md-out',
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-bridge-commissioning-seal.md',
);
const CANONICAL_LEDGER =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/evidence-ledger.json';
const EVIDENCE_DIR = path.dirname(CANONICAL_LEDGER);
const CANONICAL_QA = `${EVIDENCE_DIR}/r11j-post-release-qa.json`;
const MANIFEST =
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';
const INVENTORY =
  'data/world-review/combined-zones-r11j-west-hydraulic-bridge-inventory-20260822T042000Z.json';
const R11H_MANIFEST =
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const R11I_MANIFEST =
  'data/buildops/combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212.release-manifest.json';
const R11E_MANIFEST =
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json';
const R11H_QA =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json';
const R11H_SEAL =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-bridge-commissioning-seal.json';
const R11I_QA =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-post-release-qa.json';
const R11I_SEAL =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-connectivity-commissioning-seal.json';
const PRIOR_R11_MANIFESTS = [
  'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
  'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json',
  'data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json',
  R11H_MANIFEST,
  R11I_MANIFEST,
];
const EXPECTED = Object.freeze({
  manifestSha256:
    '176b16fa7c20d28aa79353dac70d436237032311b7dc0917968519a89b80ccbb',
  manifestIdentity:
    'a7b6a01b0bc080d9ddc77e10c92c878cd68799188788e372df6b575e0fce6cd0',
  ledgerSha256:
    '59128e0d2473bc1dc4a50014072fb6411c4eef4801bb0ca6617ea2fe122b91b0',
  completedIdentity:
    '55a1d48d0573daeee857ba163a97ae24b6e9d772cd4876686ec844c25bb8e5ac',
  sourceRoot: 'data/worldsnap-r11j-source-20260822T041217Z',
  postRoot: 'data/worldsnap-r11j-post-20260822T041217Z',
  sourceIdentityFileSha256:
    'ac5ce47e76d2a4ffb352350b2bbb55572f90d1ee90bf2a7eea480a2efbdf3f03',
  postIdentityFileSha256:
    '6995019dde6ce451afafeb5e41a772f07c20b68b470e6da576375f07b9878c98',
  sourceIntakeSha256:
    '1762193f739b8519eb535c4101e4d3d955676b27b3b9bc7a6cf25549bd2e6158',
  postIntakeSha256:
    'b0cc3343fc9febfc353428314c994588eedc1338fafdf5601cd8b16cbcf1b5df',
  sourceCompleteSaveSha256:
    'f8ba6c94ac21c61cf02f49178e1d6cb9ea7b3432f7303cfed3681f9f5551a553',
  postCompleteSaveSha256:
    'f9e383308efde36f7eac1900942edeb0349fc5c98436f50b0427464e961cd4d6',
  sourceRegionSha256:
    '765e53854ca470eaffb117ac05a19db7f40fee90ea73d772d7c07ffedadba802',
  postRegionSha256:
    'dc16ef0c53b2b0b9d5a46e0cc68a40fb53dc32a23ef16f170a01fbdff5bcd6ef',
  targetCount: 411,
  targetHash: '3db1666a75e5d10577ff203a98d54d78bb27b86ae3ffe6332b687118f2ebb103',
  supportOperationCount: 273,
  supportFrameworkCount: 344,
  supportFrameworkHash:
    'dbd8264db71d7dee7c94647a5a2eb659275d981aa1a042dbe7e17ab1ccbeb8f5',
  retainedSupportCount: 71,
  durableAnchorCount: 102,
  gravityCount: 4,
  surfaceCount: 94,
  headroomCount: 188,
  haloCount: 1792,
  haloHash: 'f21e73b5228a92fc79752580d49edbfa0e3f6026bb77eac8df76d42c4831346d',
  retainedFluidCount: 38,
  retainedFluidHash:
    '9420c2416b642efada997f299f1e0127636c6dbd8bed750bb10de78984c09ce8',
  priorTargetCount: 8409,
  combinedSurfaceCount: 620,
  journalLineCount: 834,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11J post QA rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const readBoundJson = (filename, expected = null) => {
  const bytes = fs.readFileSync(absolute(filename));
  if (expected) invariant(sha256(bytes) === expected, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function faceComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const key = queue.pop();
      const cell = byKey.get(key);
      component.push(cell);
      for (const [dx, dy, dz] of FACE) {
        const next = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
        if (unvisited.delete(next)) queue.push(next);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}
function maximumSurfaceStep(cells) {
  let maximum = 0;
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) !== 1) continue;
      maximum = Math.max(maximum, Math.abs(left.y - right.y));
    }
  }
  return maximum;
}
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}

const ledgerBound = readBoundJson(LEDGER_INPUT, EXPECTED.ledgerSha256);
const manifestBound = readBoundJson(MANIFEST, EXPECTED.manifestSha256);
const inventoryBound = readBoundJson(INVENTORY);
const ledger = ledgerBound.value;
const manifest = manifestBound.value;
const inventory = inventoryBound.value;
const sourceIdentity = readBoundJson(
  ledger.sourceSnapshot.identity.path, EXPECTED.sourceIdentityFileSha256,
);
const postIdentity = readBoundJson(
  ledger.postSnapshot.identity.path, EXPECTED.postIdentityFileSha256,
);
const sourceIntake = readBoundJson(
  ledger.sourceSnapshot.completeSaveIntake.path, EXPECTED.sourceIntakeSha256,
);
const postIntake = readBoundJson(
  ledger.postSnapshot.completeSaveIntake.path, EXPECTED.postIntakeSha256,
);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.manifest.sha256 === EXPECTED.manifestSha256
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedIdentity
  && samePath(ledger.sourceSnapshot.root, EXPECTED.sourceRoot)
  && samePath(ledger.postSnapshot.root, EXPECTED.postRoot)
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && sourceIdentity.value.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.value.sha256 === EXPECTED.postRegionSha256
  && sourceIntake.value.packageIdentity.completeSaveSha256
    === EXPECTED.sourceCompleteSaveSha256
  && postIntake.value.packageIdentity.completeSaveSha256
    === EXPECTED.postCompleteSaveSha256
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'ledger/source/post/manifest identity chain drifted');

const sourceReader = new AnvilReader(absolute(path.join(EXPECTED.sourceRoot, 'region')));
const postReader = new AnvilReader(absolute(path.join(EXPECTED.postRoot, 'region')));
const sourceCache = new Map();
const postCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await sourceReader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const postAt = async (cell) => {
  const key = cellKey(cell);
  if (!postCache.has(key)) postCache.set(key, stateToCommandString(
    await postReader.blockState(cell.x, cell.y, cell.z),
  ));
  return postCache.get(key);
};

const records = [];
const targetKeys = new Set();
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  invariant(forward.length === rollback.length, `${pkg.key} inverse length drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} inverse drifted at ${index}`);
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} fresh source guard drifted at ${cellKey(record.cell)}`);
    invariant(await postAt(record.cell) === record.targetState,
      `${pkg.key} post target drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package target overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
  }
}
invariant(records.length === EXPECTED.targetCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetHash,
'target/source/inverse/post union drifted');

const supportRecords = records.filter(({ packageKey }) => (
  packageKey === 'c1-west-bridge-support-framework'
));
const structureRecords = records.filter(({ packageKey }) => (
  packageKey === 'c1-west-bridge-deck-structure'
));
const retainedFramework = inventory.selectedStaticBridgeDesign.supportAnchors
  .filter(({ kind }) => kind === 'retained-framework-cell');
const supportFramework = uniqueCells([
  ...supportRecords.map(({ cell }) => cell),
  ...retainedFramework.map(({ cell }) => cell),
]);
invariant(supportRecords.length === EXPECTED.supportOperationCount
  && retainedFramework.length === EXPECTED.retainedSupportCount
  && supportFramework.length === EXPECTED.supportFrameworkCount
  && hashCells(supportFramework) === EXPECTED.supportFrameworkHash
  && faceComponents(supportFramework).length === 1
  && inventory.selectedStaticBridgeDesign.supportAnchors.length === EXPECTED.durableAnchorCount,
'support framework identity/topology drifted');
for (const anchor of inventory.selectedStaticBridgeDesign.supportAnchors) {
  const expectedPost = targetKeys.has(cellKey(anchor.cell))
    ? records.find(({ cell }) => cellKey(cell) === cellKey(anchor.cell)).targetState
    : anchor.sourceState;
  invariant(await sourceAt(anchor.cell) === anchor.sourceState
    && await postAt(anchor.cell) === expectedPost
    && !isAir(expectedPost) && !isFluid(expectedPost)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(expectedPost)),
  `durable anchor/contact drifted at ${cellKey(anchor.cell)}`);
}

const surface = structureRecords.filter(({ targetState }) => surfaceState(targetState));
const fullHeadroom = surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]);
let stableSurfaceCount = 0;
for (const { cell } of surface) {
  const below = await postAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(below) && !isFluid(below)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(below))) stableSurfaceCount += 1;
}
let headroomAirCount = 0;
for (const cell of fullHeadroom) if (isAir(await postAt(cell))) headroomAirCount += 1;
const surfaceCells = surface.map(({ cell }) => cell);
invariant(surface.length === EXPECTED.surfaceCount
  && connectedComponents(surfaceCells).length === 1
  && maximumSurfaceStep(surfaceCells) === 1
  && stableSurfaceCount === surface.length
  && fullHeadroom.length === EXPECTED.headroomCount
  && headroomAirCount === fullHeadroom.length,
'surface/support/headroom outcome drifted');

const gravityRecords = supportRecords.filter(({ sourceState }) => (
  blockName(sourceState) === 'minecraft:gravel'
));
invariant(gravityRecords.length === EXPECTED.gravityCount
  && manifest.scope.gravityRollbackSupportProof.length === EXPECTED.gravityCount,
'gravity closure count drifted');
for (const proof of manifest.scope.gravityRollbackSupportProof) invariant(
  await sourceAt(proof.terminalSupportCell) === proof.terminalSupportState,
  `rollback gravity terminal changed at ${cellKey(proof.terminalSupportCell)}`,
);

const halo = uniqueCells(records.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
let boundedDiffCount = 0;
let boundedOffTargetDiffCount = 0;
let sourceHaloFluidCount = 0;
let postHaloFluidCount = 0;
for (const cell of halo) {
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (sourceState !== postState) {
    boundedDiffCount += 1;
    if (!targetKeys.has(cellKey(cell))) boundedOffTargetDiffCount += 1;
  }
  if (isFluid(sourceState)) sourceHaloFluidCount += 1;
  if (isFluid(postState)) postHaloFluidCount += 1;
}
invariant(halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash
  && boundedDiffCount === EXPECTED.targetCount && boundedOffTargetDiffCount === 0
  && sourceHaloFluidCount === 0 && postHaloFluidCount === 0,
'bounded diff/fluid accounting drifted');

const retainedFluids = inventory.hazards.haloFluids;
let retainedFluidDriftCount = 0;
for (const record of retainedFluids) {
  const [sourceState, postState] = await Promise.all([
    sourceAt(record.cell), postAt(record.cell),
  ]);
  if (sourceState !== record.sourceState || postState !== record.sourceState) {
    retainedFluidDriftCount += 1;
  }
  invariant(!targetKeys.has(cellKey(record.cell)),
    `retained fluid became a target at ${cellKey(record.cell)}`);
}
const minimumVerticalIsolation = Math.min(...records.map(({ cell }) => cell.y))
  - Math.max(...retainedFluids.map(({ cell }) => cell.y)) - 1;
invariant(retainedFluids.length === EXPECTED.retainedFluidCount
  && hashCells(retainedFluids.map(({ cell }) => cell)) === EXPECTED.retainedFluidHash
  && retainedFluidDriftCount === 0 && minimumVerticalIsolation === 23,
'retained hydraulic baseline drifted');

const priorTargetKeys = new Set();
const priorBindings = [];
for (const filename of PRIOR_R11_MANIFESTS) {
  const bytes = fs.readFileSync(absolute(filename));
  priorBindings.push({ path: filename, sha256: sha256(bytes) });
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
let priorDriftCount = 0;
for (const key of priorTargetKeys) {
  const [x, y, z] = key.split(',').map(Number);
  if (await sourceAt({ x, y, z }) !== await postAt({ x, y, z })) priorDriftCount += 1;
}
invariant(priorTargetKeys.size === EXPECTED.priorTargetCount && priorDriftCount === 0,
'prior R11 preservation drifted');

const surfaceFrom = (manifestValue, filter = () => true) => manifestValue.packages
  .filter(filter).flatMap((pkg) => parseOperations(pkg.forward))
  .filter(({ targetState }) => surfaceState(targetState)).map(({ cell }) => cell);
const r11h = readBoundJson(R11H_MANIFEST).value;
const r11i = readBoundJson(R11I_MANIFEST).value;
const r11e = readBoundJson(R11E_MANIFEST).value;
const boundedBridgeSurface = uniqueCells([
  ...surfaceCells,
  ...surfaceFrom(r11h),
]);
const combinedSurface = uniqueCells([
  ...boundedBridgeSurface,
  ...surfaceFrom(r11i),
  ...surfaceFrom(r11e, ({ key }) => key === 'c1-island-1213-1215-pavement'),
]);
let combinedExactCount = 0;
for (const cell of combinedSurface) if (surfaceState(await postAt(cell))) {
  combinedExactCount += 1;
}
invariant(boundedBridgeSurface.length === 449
  && connectedComponents(boundedBridgeSurface).length === 1
  && maximumSurfaceStep(boundedBridgeSurface) === 1
  && combinedSurface.length === EXPECTED.combinedSurfaceCount
  && combinedExactCount === combinedSurface.length
  && connectedComponents(combinedSurface).length === 1,
`combined R11J/R11H/R11I/R11E surface drifted (${boundedBridgeSurface.length}/${connectedComponents(boundedBridgeSurface).length}/${maximumSurfaceStep(boundedBridgeSurface)}/${combinedSurface.length}/${combinedExactCount}/${connectedComponents(combinedSurface).length})`);

invariant(ledger.stages.length === 24
  && ledger.stages.every(({ status }) => status === 'PASS'),
'wrapper stage chain drifted');
const executionEvidence = [];
let journalLineCount = 0;
for (const [key, expectedCount] of [
  ['c1-west-bridge-support-framework', 273],
  ['c1-west-bridge-deck-structure', 138],
]) {
  const executionPath = `${EVIDENCE_DIR}/${key}.forward-execution.json`;
  const rollbackPath = `${EVIDENCE_DIR}/${key}.rollback-poststate-preflight.json`;
  const journalPath = `${executionPath}.stream-journal.jsonl`;
  const execution = readBoundJson(executionPath);
  const rollback = readBoundJson(rollbackPath);
  const journalBytes = fs.readFileSync(absolute(journalPath));
  const journal = journalBytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  invariant(execution.value.status === 'complete'
    && execution.value.sourceOperationCount === expectedCount
    && execution.value.successfulGroups === expectedCount
    && execution.value.failedGroups === 0
    && execution.value.unexpectedNoopCommands === 0
    && execution.value.worldEditLeftoverCount === 0
    && rollback.value.status === 'PASS' && rollback.value.passed === expectedCount
    && rollback.value.failed === 0 && journal.at(-1)?.status === 'complete',
  `${key} execution/journal/rollback drifted`);
  journalLineCount += journal.length;
  executionEvidence.push({
    key,
    execution: { path: executionPath, sha256: sha256(execution.bytes) },
    rollback: { path: rollbackPath, sha256: sha256(rollback.bytes) },
    journal: { path: journalPath, sha256: sha256(journalBytes), lineCount: journal.length },
  });
}
invariant(journalLineCount === EXPECTED.journalLineCount,
'execution journal line count drifted');
const liveEntity = readBoundJson(`${EVIDENCE_DIR}/live-entity-clearance.json`);
const blockEntity = readBoundJson(`${EVIDENCE_DIR}/block-entity-clearance.json`);
invariant(liveEntity.value.status === 'PASS'
  && liveEntity.value.totals.blockingEntityHits === 0
  && blockEntity.value.status === 'PASS'
  && blockEntity.value.blockingBlockEntityCount === 0,
'entity/block-entity gate drifted');

const r11hQa = readBoundJson(R11H_QA,
  '5fb930e29dd02b2039677993edcc5df2567127b7f9605a3cb37032800aa83d70');
const r11hSeal = readBoundJson(R11H_SEAL,
  '68c4df1b5732fb717e7eab3a902c4194fbf41c06d9f0e5800a114084de17448b');
const r11iQa = readBoundJson(R11I_QA,
  '5a7c9ae6ba0381976c37a9b1a635475d1a451268ccc0365cdd5b5e65c1c7755f');
const r11iSeal = readBoundJson(R11I_SEAL,
  '75a8001f2e105e547b8f35e6391984c31fa2523dbeef67c30e597b92ade36aca');
invariant(r11hQa.value.status === 'PASS'
  && r11hSeal.value.status === 'COMMISSIONED_STATIC_BRIDGE_SEGMENT_POST_QA_PASS'
  && r11iQa.value.status === 'PASS'
  && r11iSeal.value.status === 'R11I_BOUNDED_STATIC_CONNECTIVITY_POST_QA_PASS',
'R11H failed-safe/R11I accepted seal chain drifted');

const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'INDEPENDENT_READ_ONLY_R11J_POST_RELEASE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestSha256: EXPECTED.manifestSha256,
    manifestIdentitySha256: EXPECTED.manifestIdentity,
    ledgerPath: CANONICAL_LEDGER,
    ledgerSha256: EXPECTED.ledgerSha256,
    completedReleaseIdentitySha256: EXPECTED.completedIdentity,
  },
  source: {
    root: EXPECTED.sourceRoot,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    regionSha256: EXPECTED.sourceRegionSha256,
  },
  post: {
    root: EXPECTED.postRoot,
    completeSaveSha256: EXPECTED.postCompleteSaveSha256,
    regionSha256: EXPECTED.postRegionSha256,
  },
  checks: {
    packageCount: manifest.packages.length,
    exactTargetCount: records.length,
    exactInverseReadyCount: records.length,
    supportOperationCellCount: supportRecords.length,
    supportFrameworkCellCount: supportFramework.length,
    retainedSupportCellCount: retainedFramework.length,
    supportFrameworkFaceComponentCount: faceComponents(supportFramework).length,
    durableAnchorCount: inventory.selectedStaticBridgeDesign.supportAnchors.length,
    sourceGravityCellCount: gravityRecords.length,
    durableGravityTerminalCount: manifest.scope.gravityRollbackSupportProof.length,
    surfaceCellCount: surface.length,
    surfaceComponentCount: 1,
    maximumSurfaceStep: 1,
    stableSurfaceCellCount: stableSurfaceCount,
    fullHeadroomAirCount: headroomAirCount,
    interactionHaloCellCount: halo.length,
    boundedDiffCount,
    boundedOffTargetDiffCount,
    sourceHaloFluidCount,
    postHaloFluidCount,
    retainedGenericFluidCount: retainedFluids.length,
    retainedGenericFluidDriftCount: retainedFluidDriftCount,
    minimumFluidVerticalIsolationBlocks: minimumVerticalIsolation,
    priorR11TargetCellCount: priorTargetKeys.size,
    priorR11DriftCount: priorDriftCount,
    boundedR11JR11HSurfaceCellCount: boundedBridgeSurface.length,
    boundedR11JR11HSurfaceComponentCount: 1,
    boundedR11JR11HMaximumStep: 1,
    combinedAcceptedSurfaceCellCount: combinedSurface.length,
    combinedAcceptedSurfaceComponentCount: 1,
    ledgerStageCount: ledger.stages.length,
    ledgerFailedStageCount: 0,
    executionJournalCount: executionEvidence.length,
    executionJournalLineCount: journalLineCount,
    liveEntityBlockingCount: liveEntity.value.totals.blockingEntityHits,
    blockEntityBlockingCount: blockEntity.value.blockingBlockEntityCount,
    liveCallsPerformedByQa: false,
    worldEditsPerformedByQa: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell), true),
    supportFrameworkCoordinateSetSha256: hashCells(supportFramework),
    interactionHaloCoordinateSetSha256: hashCells(halo),
    retainedGenericFluidCoordinateSetSha256: hashCells(retainedFluids.map(({ cell }) => cell)),
    combinedAcceptedSurfaceCoordinateSetSha256: hashCells(combinedSurface),
  },
  acceptedChain: {
    r11hQa: { path: R11H_QA, sha256: sha256(r11hQa.bytes) },
    r11hSeal: { path: R11H_SEAL, sha256: sha256(r11hSeal.bytes) },
    r11iQa: { path: R11I_QA, sha256: sha256(r11iQa.bytes) },
    r11iSeal: { path: R11I_SEAL, sha256: sha256(r11iSeal.bytes) },
  },
  priorR11Bindings: priorBindings,
  executionEvidence,
  acceptance: {
    exactPhysicalStateAccepted: true,
    exactRollbackReady: true,
    r11hFailedSafeChainPreserved: true,
    snapshotBoundRetainedHydraulicBaselinePreserved: true,
    boundedAcceptedIslandConnectivityPresent: true,
    wholeRouteCommissioned: false,
    hydraulicCapacityCommissioned: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, qaPayloadSha256 };
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'R11J_BOUNDED_STATIC_HYDRAULIC_ISOLATION_BRIDGE_POST_QA_PASS',
  releaseId: manifest.scope.releaseId,
  releaseNodeId: manifest.releaseNodeId,
  qa: { path: CANONICAL_QA, qaPayloadSha256 },
  completedReleaseIdentitySha256: EXPECTED.completedIdentity,
  acceptedGeometry: {
    targetCellCount: records.length,
    supportFrameworkCellCount: supportFramework.length,
    surfaceCellCount: surface.length,
    fullHeadroomCellCount: fullHeadroom.length,
    boundedR11JR11HSurfaceCellCount: boundedBridgeSurface.length,
    boundedR11JR11HSurfaceMaximumStep: 1,
    combinedSurfaceCellCount: combinedSurface.length,
    combinedSurfaceComponentCount: 1,
  },
  acceptedRetainedHydraulicBaseline: {
    fluidCellCount: retainedFluids.length,
    fluidCoordinateSetSha256: hashCells(retainedFluids.map(({ cell }) => cell)),
    minimumVerticalIsolationBlocks: minimumVerticalIsolation,
  },
  nonClaims: [
    'whole C1 corridor commissioning', 'public route commissioning',
    'hydraulic capacity', 'drainage commission', 'utility or rail commission',
    'external discharge', 'static future fluid behavior',
  ],
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const sealPayloadSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, sealPayloadSha256 };
for (const filename of [OUT, MD_OUT, SEAL_OUT, SEAL_MD_OUT]) {
  fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
}
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(SEAL_OUT), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), `# R11J post-release QA\n\nStatus: **PASS**\n\nAll ${records.length} targets and inverse guards pass. The ${supportFramework.length}-cell support framework remains one face-connected component with ${inventory.selectedStaticBridgeDesign.supportAnchors.length} durable anchors. The ${surface.length}-cell deck has ${stableSurfaceCount} stable contacts and ${headroomAirCount} air headroom cells. It joins R11H as one ${boundedBridgeSurface.length}-cell max-step-one surface; that surface joins R11I and the R11E station-1213..1215 island as one ${combinedSurface.length}-cell accepted component.\n\nThe exact ${halo.length.toLocaleString('en-US')}-cell sparse halo contains only the ${boundedDiffCount} declared target changes, zero off-target drift, and zero fluid. The separate ${retainedFluids.length}-cell generic-review water/lava baseline is source/post identical and remains at least ${minimumVerticalIsolation} blocks below operations. All ${priorTargetKeys.size.toLocaleString('en-US')} prior R11 targets remain unchanged.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed by QA.\n`);
fs.writeFileSync(absolute(SEAL_MD_OUT), `# R11J bounded bridge commissioning seal\n\nStatus: **${seal.status}**\n\nThe bounded static stations-1184..1188 bridge is physically accepted with exact rollback readiness and retained hydraulic isolation. Whole-corridor route and hydraulic/drainage systems remain uncommissioned.\n\nSeal payload: \`${sealPayloadSha256}\`.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  seal: SEAL_OUT,
  qaPayloadSha256,
  sealPayloadSha256,
  checks: report.checks,
}, null, 2));
