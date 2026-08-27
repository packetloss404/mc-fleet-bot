#!/usr/bin/env node
/** Independent read-only post-release QA and seal for CZ-R11I. */

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
  analyzeIsland,
  census,
  connectedComponents,
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T04:15:00Z');
const LEDGER_INPUT = value(
  '--ledger',
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/evidence-ledger.json',
);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-post-release-qa.json',
);
const MD_OUT = value(
  '--md-out',
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-post-release-qa.md',
);
const SEAL_OUT = value(
  '--seal-out',
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-connectivity-commissioning-seal.json',
);
const SEAL_MD_OUT = value(
  '--seal-md-out',
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/r11i-connectivity-commissioning-seal.md',
);
const CANONICAL_LEDGER =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/evidence-ledger.json';
const EVIDENCE_DIR = path.dirname(CANONICAL_LEDGER);
const CANONICAL_QA = `${EVIDENCE_DIR}/r11i-post-release-qa.json`;
const MANIFEST =
  'data/buildops/combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212.release-manifest.json';
const R11H_MANIFEST =
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const R11E_MANIFEST =
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json';
const R11H_QA =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json';
const R11H_SEAL =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-bridge-commissioning-seal.json';
const R11H_FAILED_LEDGER =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/evidence-ledger.json';
const R11H_RECOVERY =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.json';
const R11H_FAILED_SOURCE = 'data/worldsnap-r11h-source-20260822T031103Z';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const PRIOR_R11_MANIFESTS = [
  'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
  'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json',
  'data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json',
  R11H_MANIFEST,
];
const EXPECTED = Object.freeze({
  manifestSha256:
    'ff8502ee21dc50e5fc1aedd997ae5b978e562a9e86115c874323dfa41981d22f',
  manifestIdentity:
    '1af8f2ccc561aecb66f6ed1a2f79118b937ffea8f3d796cc13c960b059ba01f1',
  ledgerSha256:
    'f05a55ea98ae032c26b9f42277d43c0884c61d8cdb0d53ee768025c27fa4d909',
  completedIdentity:
    '2f9cebbd4bed2103d36381bce65a301023960a823ef402010e63b9cd06bb0e11',
  sourceRoot: 'data/worldsnap-r11i-source-20260822T034802Z',
  postRoot: 'data/worldsnap-r11i-post-20260822T034802Z',
  sourceIdentityFileSha256:
    '5ad9b44df53674004bca58b332063951843f4525624ceb4629086fefa5c54956',
  postIdentityFileSha256:
    '56ab6659b1aa0b961f61a74a8344e5d992b9b0206872f38b37d1c4998ee71cb5',
  sourceIntakeSha256:
    'e256e6339d1fa4ac25ffc1e59362e734edacc796f28df33f728d15b7736451ec',
  postIntakeSha256:
    '54b26b636ee615db2bd48f7c897a73179201cfe098f096f570ce783f8b986159',
  sourceCompleteSaveSha256:
    '2e8a1b9b2aec8b769af187a4a728fe23e327a42494e27374517c81efaaf34dab',
  postCompleteSaveSha256:
    'c1fbb77ec91fae38e8698c8d7c6502f025890ee452b038a406755f321ab7c752',
  sourceRegionSha256:
    '2ea3a99859d0244604cfc0fe7bcd13a5d34840e90c75306c14e223002446fc07',
  postRegionSha256:
    'c64dd202b19d1ebbcf3f93642d339673d2051293a969f1209719d71e4375f1d2',
  targetCount: 317,
  targetHash: 'd04010044b24b7de1b7fbf7541a9e399052ba14fa83f34ae4424ba7ed093dab0',
  haloCount: 1531,
  haloHash: 'c5a6f88fae844734b84317d9a4e0f0309d66734c1fcb07743f5cc029b6948121',
  surfaceCount: 106,
  headroomCount: 212,
  combinedSurfaceCount: 526,
  r11hTargetCount: 1666,
  priorTargetCount: 8092,
  r11hHydraulicReviewCount: 7561,
  r11hFluidCount: 45,
  r11hFluidHash:
    'ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11I post QA rejected: ${message}`);
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
const ledger = ledgerBound.value;
const manifest = manifestBound.value;
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
const failedSourceReader = new AnvilReader(absolute(path.join(R11H_FAILED_SOURCE, 'region')));
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
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
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
'target/inverse union drifted');
const surface = records.filter(({ targetState }) => surfaceState(targetState));
const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
let stableSurfaceCount = 0;
for (const { cell } of surface) {
  const below = await postAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(below) && !isFluid(below)) stableSurfaceCount += 1;
}
let headroomAirCount = 0;
for (const cell of fullHeadroom) if (isAir(await postAt(cell))) headroomAirCount += 1;
invariant(surface.length === EXPECTED.surfaceCount
  && connectedComponents(surface.map(({ cell }) => cell)).length === 1
  && stableSurfaceCount === surface.length
  && fullHeadroom.length === EXPECTED.headroomCount
  && headroomAirCount === fullHeadroom.length
  && records.filter(({ sourceState }) => sourceState === 'minecraft:gravel').length === 15,
'surface/support/headroom/gravity outcome drifted');
for (const proof of manifest.scope.gravityRollbackSupportProof) {
  // The proof is for the terminal state after the complete exact rollback;
  // a terminal cell may itself be an R11I target in the accepted post.
  invariant(await sourceAt(proof.terminalSupportCell) === proof.terminalSupportState,
    `rollback gravity terminal changed at ${cellKey(proof.terminalSupportCell)}`);
}

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

const r11h = readBoundJson(R11H_MANIFEST).value;
const r11hRecords = r11h.packages.flatMap((pkg) => parseOperations(pkg.forward));
let r11hTargetDriftCount = 0;
for (const { cell, targetState } of r11hRecords) {
  if (await sourceAt(cell) !== targetState || await postAt(cell) !== targetState) {
    r11hTargetDriftCount += 1;
  }
}
const r11hHalo = uniqueCells(r11hRecords.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
let r11hHaloDriftCount = 0;
let r11hHaloOffTargetDriftCount = 0;
for (const cell of r11hHalo) if (await sourceAt(cell) !== await postAt(cell)) {
  r11hHaloDriftCount += 1;
  if (!targetKeys.has(cellKey(cell))) r11hHaloOffTargetDriftCount += 1;
}
invariant(r11hRecords.length === EXPECTED.r11hTargetCount
  && r11hTargetDriftCount === 0 && r11hHaloDriftCount === 80
  && r11hHaloOffTargetDriftCount === 0,
`accepted R11H target/halo accounting changed (${r11hTargetDriftCount}/${r11hHaloDriftCount}/${r11hHaloOffTargetDriftCount})`);

const design = readBoundJson(DESIGN).value;
const r11hReview = await analyzeIsland({
  key: 'r11h-retained-hydraulic-review', start: 1189, end: 1206,
  stations: design.horizontalAlignment.stations, reader: failedSourceReader,
  priorTargetKeys: new Set(),
});
const sourceFluids = [];
const postFluids = [];
let hydraulicDiffCount = 0;
let hydraulicOffTargetDiffCount = 0;
for (const cell of r11hReview.halo) {
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (isFluid(sourceState)) sourceFluids.push({ cell, state: sourceState });
  if (isFluid(postState)) postFluids.push({ cell, state: postState });
  if (sourceState !== postState) {
    hydraulicDiffCount += 1;
    if (!targetKeys.has(cellKey(cell))) hydraulicOffTargetDiffCount += 1;
  }
}
invariant(r11hReview.halo.length === EXPECTED.r11hHydraulicReviewCount
  && sourceFluids.length === EXPECTED.r11hFluidCount
  && postFluids.length === EXPECTED.r11hFluidCount
  && hashCells(sourceFluids.map(({ cell }) => cell)) === EXPECTED.r11hFluidHash
  && hashCells(postFluids.map(({ cell }) => cell)) === EXPECTED.r11hFluidHash
  && JSON.stringify(census(sourceFluids, 'state')) === JSON.stringify(census(postFluids, 'state'))
  && hydraulicOffTargetDiffCount === 0,
`snapshot-bound R11H hydraulic baseline changed (${sourceFluids.length}/${postFluids.length}/${hashCells(sourceFluids.map(({ cell }) => cell))}/${hashCells(postFluids.map(({ cell }) => cell))}/${hydraulicDiffCount}/${hydraulicOffTargetDiffCount})`);

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
const r11e = readBoundJson(R11E_MANIFEST).value;
const r11hSurface = surfaceFrom(r11h);
const r11eEastSurface = surfaceFrom(
  r11e, ({ key }) => key === 'c1-island-1213-1215-pavement',
);
const combinedSurface = uniqueCells([
  ...r11hSurface, ...surface.map(({ cell }) => cell), ...r11eEastSurface,
]);
let combinedExactCount = 0;
for (const cell of combinedSurface) if (surfaceState(await postAt(cell))) {
  combinedExactCount += 1;
}
invariant(combinedSurface.length === EXPECTED.combinedSurfaceCount
  && combinedExactCount === combinedSurface.length
  && connectedComponents(combinedSurface).length === 1,
'combined R11H/R11I/R11E surface drifted');

invariant(ledger.stages.length === 24
  && ledger.stages.every(({ status }) => status === 'PASS'),
'wrapper stage chain drifted');
const executionEvidence = [];
let journalLineCount = 0;
for (const [key, expectedCount] of [
  ['c1-retained-cut-1207-1212-dependencies', 2],
  ['c1-retained-cut-1207-1212-structure', 315],
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
const liveEntity = readBoundJson(`${EVIDENCE_DIR}/live-entity-clearance.json`);
const blockEntity = readBoundJson(`${EVIDENCE_DIR}/block-entity-clearance.json`);
invariant(liveEntity.value.status === 'PASS'
  && liveEntity.value.totals.blockingEntityHits === 0
  && blockEntity.value.status === 'PASS'
  && blockEntity.value.blockingBlockEntityCount === 0,
'entity/block-entity gate drifted');

const r11hQa = readBoundJson(R11H_QA);
const r11hSeal = readBoundJson(R11H_SEAL);
const failedLedger = readBoundJson(R11H_FAILED_LEDGER);
const recovery = readBoundJson(R11H_RECOVERY);
invariant(r11hQa.value.status === 'PASS'
  && r11hQa.value.qaPayloadSha256
    === '5ccd20fbb3ec4c89465e09f17f09cccc1922340d234f3ea59bef16dd34e433c5'
  && r11hSeal.value.status === 'COMMISSIONED_STATIC_BRIDGE_SEGMENT_POST_QA_PASS'
  && failedLedger.value.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && recovery.value.acceptance.physicalRecoveryAccepted === true,
'R11H failed-safe/recovery/retry seal chain drifted');

const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'INDEPENDENT_READ_ONLY_R11I_POST_RELEASE_QA',
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
    surfaceCellCount: surface.length,
    surfaceComponentCount: 1,
    maximumSurfaceStep: 1,
    stableSurfaceCellCount: stableSurfaceCount,
    fullHeadroomAirCount: headroomAirCount,
    sourceGravityCellCount: records.filter(({ sourceState }) => (
      sourceState === 'minecraft:gravel'
    )).length,
    interactionHaloCellCount: halo.length,
    boundedDiffCount,
    boundedOffTargetDiffCount,
    sourceHaloFluidCount,
    postHaloFluidCount,
    combinedAcceptedSurfaceCellCount: combinedSurface.length,
    combinedAcceptedSurfaceComponentCount: 1,
    r11hTargetCellCount: r11hRecords.length,
    r11hTargetDriftCount,
    r11hOperatedHaloCellCount: r11hHalo.length,
    r11hOperatedHaloDriftCount: r11hHaloDriftCount,
    r11hOperatedHaloOffR11ITargetDriftCount: r11hHaloOffTargetDriftCount,
    r11hHydraulicReviewCellCount: r11hReview.halo.length,
    r11hHydraulicSourceFluidCount: sourceFluids.length,
    r11hHydraulicPostFluidCount: postFluids.length,
    r11hHydraulicDiffCount: hydraulicDiffCount,
    r11hHydraulicOffR11ITargetDiffCount: hydraulicOffTargetDiffCount,
    priorR11TargetCellCount: priorTargetKeys.size,
    priorR11DriftCount: priorDriftCount,
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
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    interactionHaloCoordinateSetSha256: hashCells(halo),
    combinedAcceptedSurfaceCoordinateSetSha256: hashCells(combinedSurface),
    r11hHydraulicFluidCoordinateSetSha256: hashCells(postFluids.map(({ cell }) => cell)),
  },
  r11hFailedSafeChain: {
    failedLedger: { path: R11H_FAILED_LEDGER, sha256: sha256(failedLedger.bytes) },
    recovery: { path: R11H_RECOVERY, sha256: sha256(recovery.bytes) },
    retryQa: { path: R11H_QA, sha256: sha256(r11hQa.bytes) },
    retrySeal: { path: R11H_SEAL, sha256: sha256(r11hSeal.bytes) },
  },
  priorR11Bindings: priorBindings,
  executionEvidence,
  acceptance: {
    exactPhysicalStateAccepted: true,
    exactRollbackReady: true,
    r11hFailedSafeChainPreserved: true,
    r11hSnapshotBoundHydraulicBaselinePreserved: true,
    boundedAcceptedIslandConnectivityPresent: true,
    wholeRouteCommissioned: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, qaPayloadSha256 };
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'R11I_BOUNDED_STATIC_CONNECTIVITY_POST_QA_PASS',
  releaseId: manifest.scope.releaseId,
  releaseNodeId: manifest.releaseNodeId,
  qa: { path: CANONICAL_QA, qaPayloadSha256 },
  completedReleaseIdentitySha256: EXPECTED.completedIdentity,
  acceptedGeometry: {
    targetCellCount: records.length,
    surfaceCellCount: surface.length,
    fullHeadroomCellCount: fullHeadroom.length,
    combinedSurfaceCellCount: combinedSurface.length,
    combinedSurfaceComponentCount: 1,
  },
  acceptedR11HHydraulicBaseline: {
    reviewCellCount: r11hReview.halo.length,
    fluidCellCount: postFluids.length,
    fluidCoordinateSetSha256: hashCells(postFluids.map(({ cell }) => cell)),
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
fs.writeFileSync(absolute(MD_OUT), `# R11I post-release QA\n\nStatus: **PASS**\n\nAll ${records.length} targets and inverse guards pass. The ${surface.length}-cell surface has ${stableSurfaceCount} stable contacts and ${headroomAirCount} air headroom cells. It joins accepted R11H and the R11E station-1213..1215 island as one ${combinedSurface.length}-cell component.\n\nThe exact ${halo.length.toLocaleString('en-US')}-cell halo contains only the ${boundedDiffCount} declared target changes, zero off-target drift, and zero fluid. All ${priorTargetKeys.size.toLocaleString('en-US')} prior R11 targets remain unchanged. The R11H failed-attempt/compensation/recovery/retry chain remains intact, and its snapshot-bound 45-cell hydraulic baseline is identical between fresh R11I source and post.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed by QA.\n`);
fs.writeFileSync(absolute(SEAL_MD_OUT), `# R11I bounded connectivity commissioning seal\n\nStatus: **${seal.status}**\n\nThe bounded static R11H–R11I–R11E surface connection is physically accepted with exact rollback readiness. Whole-corridor route and hydraulic/drainage systems remain uncommissioned.\n\nSeal payload: \`${sealPayloadSha256}\`.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  seal: SEAL_OUT,
  qaPayloadSha256,
  sealPayloadSha256,
  checks: report.checks,
}, null, 2));
