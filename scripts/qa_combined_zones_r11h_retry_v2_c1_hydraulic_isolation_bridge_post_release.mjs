#!/usr/bin/env node
/** Independent read-only post-release QA and seal for CZ-R11H retry-v2. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  blockName,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T03:40:00Z');
const LEDGER_PATH = value(
  '--ledger',
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/evidence-ledger.json',
);
const CANONICAL_LEDGER_PATH =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/evidence-ledger.json';
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json',
);
const MD_PATH = value(
  '--md-out',
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.md',
);
const SEAL_PATH = value(
  '--seal-out',
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-bridge-commissioning-seal.json',
);
const SEAL_MD_PATH = value(
  '--seal-md-out',
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-bridge-commissioning-seal.md',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const RECOVERY_ACCEPTANCE =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.json';
const FAILED_LEDGER =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/evidence-ledger.json';
const FAILED_SOURCE = 'data/worldsnap-r11h-source-20260822T031103Z';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const PRIOR_R11_MANIFESTS = [
  'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
  'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json',
  'data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json',
];
const EXPECTED = Object.freeze({
  manifestSha256:
    '6a4dd03ff84d1e0af05e0c3f5f81aa5b2347abc05f363dd4657959a3c9d48d79',
  manifestIdentity:
    'bfc9064f966a8032c38f70eb13e52eec6995470cde7cd97b37f42ccf90253d67',
  ledgerSha256:
    'f5c1e52b479bba19329e5b39d253d4c43f5fbff6344effefc92a43cfb89b9e85',
  completedIdentity:
    '04f9c6e7ae2b7734da2cfbf85d5f37cd3ba15fea257ace636f601c5acdbe815e',
  sourceRoot: 'data/worldsnap-r11h-retry-v2-source-20260822T032627Z',
  postRoot: 'data/worldsnap-r11h-retry-v2-post-20260822T032627Z',
  sourceIntakeSha256:
    'bc9a82c6b708de3fca015c0b4484f325e195bc62653dfa1f821f75576b533a67',
  postIntakeSha256:
    '03644b8f94fbafe87fefca18cd3ecf1ffb24461f562c0679bfeb63cda72d6852',
  sourceIdentityFileSha256:
    '044143d2223069c727d45284625c9aedd2e950d5ee8a2751460790937e8eac5d',
  postIdentityFileSha256:
    'ea15082a09e59d9dfe5665287521578487672e8c6ffd476361e10b19d2e9ba1c',
  sourceCompleteSaveSha256:
    'c65787ea43ed7d15dd467d3fef974c8c222b3a4d4003b6ecb5acf1c3434849b9',
  postCompleteSaveSha256:
    'a28e318f5df40928eac351a16d7776c2ece824c33722dbf259bc0d15a6f4e185',
  sourceRegionSha256:
    'c509d35c8291d65653955a3a950c02effa6f928fb083e563364313e599bc16e5',
  postRegionSha256:
    'e55a9497b238c52ee5d4d6e86e844e5be0288640c468a94d8af52ea7380f9cae',
  recoveryAcceptanceSha256:
    'ccc012f2cf5c8d54d3c4fc5aba8b9e5ac58b75f56911f0744f9911902c545e58',
  recoveryAcceptanceIdentity:
    '9941594dc2f744af576efbddfc6eac3bf9fe954517347bbd52f49c4ba0f24adb',
  failedLedgerSha256:
    'b7a94c77600e772dee3a9d8873ef9dd25de2a9940a82aac905fa5c1524d5bfbc',
  targetCount: 1666,
  targetHash: 'ef89661a02a5544a093255ada780e8037200f2b9aa0cd421d30c7bd1fedcf129',
  haloCount: 7120,
  haloHash: '135352f855481660e8e5de62bd46908a2c6e26ecddc6546440ecfc445aabfb28',
  fluidCount: 45,
  fluidHash: 'ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H retry-v2 post QA rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const readBoundJson = (filename, expected = null) => {
  const bytes = fs.readFileSync(absolute(filename));
  if (expected) invariant(sha256(bytes) === expected, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
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
const isDurableAnchor = (state) => {
  const name = blockName(state);
  return !isAir(state) && !isFluid(state)
    && !name.includes('lichen') && !name.includes('grass')
    && !name.includes('leaf_litter') && !name.endsWith('_leaves')
    && !name.endsWith('_vine') && name !== 'minecraft:snow';
};

const manifestBound = readBoundJson(MANIFEST_PATH, EXPECTED.manifestSha256);
const ledgerBound = readBoundJson(LEDGER_PATH, EXPECTED.ledgerSha256);
const recoveryBound = readBoundJson(RECOVERY_ACCEPTANCE, EXPECTED.recoveryAcceptanceSha256);
const failedLedgerBound = readBoundJson(FAILED_LEDGER, EXPECTED.failedLedgerSha256);
const manifest = manifestBound.value;
const ledger = ledgerBound.value;
const recovery = recoveryBound.value;
const failedLedger = failedLedgerBound.value;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && ledger.transactionId === manifest.transactionId
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedIdentity
  && ledger.stages.length === 24 && ledger.stages.every(({ status }) => status === 'PASS'),
'manifest/ledger/completed stage identity drifted');
invariant(recovery.recoveryAcceptanceIdentitySha256
    === EXPECTED.recoveryAcceptanceIdentity
  && recovery.acceptance.physicalRecoveryAccepted === true
  && failedLedger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW',
'failed-attempt compensation/recovery chain drifted');

const sourceIntakeBound = readBoundJson(
  ledger.sourceSnapshot.completeSaveIntake.path, EXPECTED.sourceIntakeSha256,
);
const postIntakeBound = readBoundJson(
  ledger.postSnapshot.completeSaveIntake.path, EXPECTED.postIntakeSha256,
);
const sourceIdentityBound = readBoundJson(
  ledger.sourceSnapshot.identity.path, EXPECTED.sourceIdentityFileSha256,
);
const postIdentityBound = readBoundJson(
  ledger.postSnapshot.identity.path, EXPECTED.postIdentityFileSha256,
);
invariant(samePath(ledger.sourceSnapshot.root, EXPECTED.sourceRoot)
  && samePath(ledger.postSnapshot.root, EXPECTED.postRoot)
  && sourceIntakeBound.value.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntakeBound.value.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntakeBound.value.packageIdentity.completeSaveSha256
    === EXPECTED.sourceCompleteSaveSha256
  && postIntakeBound.value.packageIdentity.completeSaveSha256
    === EXPECTED.postCompleteSaveSha256
  && sourceIdentityBound.value.sha256 === EXPECTED.sourceRegionSha256
  && postIdentityBound.value.sha256 === EXPECTED.postRegionSha256,
'fresh source/post immutable snapshot binding drifted');

const sourceReader = new AnvilReader(absolute(path.join(EXPECTED.sourceRoot, 'region')));
const postReader = new AnvilReader(absolute(path.join(EXPECTED.postRoot, 'region')));
const failedSourceReader = new AnvilReader(absolute(path.join(FAILED_SOURCE, 'region')));
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
let exactTargetCount = 0;
let exactInverseCount = 0;
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
      `${pkg.key} final target drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
    exactTargetCount += 1;
    exactInverseCount += 1;
  }
}
invariant(records.length === EXPECTED.targetCount
  && exactTargetCount === EXPECTED.targetCount && exactInverseCount === EXPECTED.targetCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetHash,
'target/inverse union drifted');

const dependencyRecords = records.filter(({ packageKey }) => packageKey.endsWith('dependencies'));
const structureRecords = records.filter(({ packageKey }) => packageKey.endsWith('structure'));
const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const surface = structureRecords.filter(({ targetState }) => surfaceNames.has(targetState));
const headroomCuts = structureRecords.filter(({ targetState, sourceState }) => (
  targetState === 'minecraft:air' && !isAir(sourceState)
));
const beamKeys = new Set([
  '1519,66,-234', '1520,65,-233', '1522,65,-233',
  '1523,65,-233', '1523,65,-232',
]);
const beam = structureRecords.filter(({ cell }) => beamKeys.has(cellKey(cell)));
const foundation = structureRecords.filter(({ targetState, cell }) => (
  targetState === 'minecraft:stone_bricks' && !beamKeys.has(cellKey(cell))
));
const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
for (const cell of fullHeadroom) invariant(await postAt(cell) === 'minecraft:air',
  `headroom is not air at ${cellKey(cell)}`);
for (const { cell } of surface) {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  const state = await postAt(below);
  invariant(!isAir(state) && !isFluid(state),
    `surface lacks stable support at ${cellKey(cell)}`);
}
invariant(dependencyRecords.length === 3 && dependencyRecords.every(
  ({ targetState }) => targetState === 'minecraft:stone_bricks')
  && surface.length === 355 && connectedComponents(surface.map(({ cell }) => cell)).length === 1
  && headroomCuts.length === 667 && fullHeadroom.length === 710
  && foundation.length === 636 && beam.length === 5
  && beam.every(({ targetState }) => targetState === 'minecraft:stone_bricks')
  && manifest.scope.supportGraph.componentCount === 11
  && manifest.scope.supportGraph.components.every(({ anchors }) => (
    anchors.some(({ sourceState }) => isDurableAnchor(sourceState))
  )),
'surface/support/headroom/foundation/beam proof drifted');
for (const proof of manifest.scope.gravityRollbackSupportProof) {
  invariant(await postAt(proof.terminalSupportCell) === proof.terminalSupportState,
    `gravity terminal changed at ${cellKey(proof.terminalSupportCell)}`);
}

const halo = uniqueCells(records.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
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
'bounded lifecycle/off-target/fluid diff proof failed');

const c1 = JSON.parse(fs.readFileSync(absolute(C1_DESIGN), 'utf8'));
const generic = await analyzeIsland({
  key: 'r11h-post-hydraulic-review', start: 1189, end: 1206,
  stations: c1.horizontalAlignment.stations,
  reader: failedSourceReader,
  priorTargetKeys: new Set(),
});
const sourceFluids = [];
const postFluids = [];
let hydraulicOffTargetDiffCount = 0;
for (const cell of generic.halo) {
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (isFluid(sourceState)) sourceFluids.push({ cell, state: sourceState });
  if (isFluid(postState)) postFluids.push({ cell, state: postState });
  if (sourceState !== postState && !targetKeys.has(cellKey(cell))) {
    hydraulicOffTargetDiffCount += 1;
  }
}
invariant(generic.halo.length === manifest.scope.retainedHydraulicGraph.reviewCellCount
  && hashCells(generic.halo) === manifest.scope.retainedHydraulicGraph.reviewCoordinateSetSha256
  && sourceFluids.length === EXPECTED.fluidCount && postFluids.length === EXPECTED.fluidCount
  && hashCells(sourceFluids.map(({ cell }) => cell)) === EXPECTED.fluidHash
  && hashCells(postFluids.map(({ cell }) => cell)) === EXPECTED.fluidHash
  && JSON.stringify(census(sourceFluids, 'state')) === JSON.stringify(census(postFluids, 'state'))
  && hydraulicOffTargetDiffCount === 0,
'snapshot-bound hydraulic baseline changed between fresh source and post');

const priorTargetKeys = new Set();
const priorBindings = [];
for (const manifestPath of PRIOR_R11_MANIFESTS) {
  const bytes = fs.readFileSync(absolute(manifestPath));
  const prior = JSON.parse(bytes);
  priorBindings.push({ path: manifestPath, sha256: sha256(bytes), transactionId: prior.transactionId });
  for (const pkg of prior.packages ?? []) {
    for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
let priorR11DriftCount = 0;
for (const key of priorTargetKeys) {
  const [x, y, z] = key.split(',').map(Number);
  if (await sourceAt({ x, y, z }) !== await postAt({ x, y, z })) priorR11DriftCount += 1;
}
invariant(priorR11DriftCount === 0
  && !records.some(({ cell }) => priorTargetKeys.has(cellKey(cell))),
'prior accepted R11 state changed');

// Evidence identities are location-independent: an absolute --ledger used by a
// test or caller must not leak its checkout path into the canonical payload.
const evidenceDir = path.dirname(CANONICAL_LEDGER_PATH);
const executionChecks = [];
let journalLineCount = 0;
for (const [key, expectedCount] of [
  ['c1-bridge-1189-1206-dependencies', 3],
  ['c1-bridge-1189-1206-structure', 1663],
]) {
  const executionPath = path.join(evidenceDir, `${key}.forward-execution.json`);
  const rollbackPath = path.join(evidenceDir, `${key}.rollback-poststate-preflight.json`);
  const journalPath = `${executionPath}.stream-journal.jsonl`;
  const executionBound = readBoundJson(executionPath);
  const rollbackBound = readBoundJson(rollbackPath);
  const journalBytes = fs.readFileSync(absolute(journalPath));
  const journal = journalBytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  invariant(executionBound.value.status === 'complete'
    && executionBound.value.sourceOperationCount === expectedCount
    && executionBound.value.successfulGroups === expectedCount
    && executionBound.value.failedGroups === 0
    && executionBound.value.unexpectedNoopCommands === 0
    && executionBound.value.worldEditLeftoverCount === 0
    && rollbackBound.value.status === 'PASS'
    && rollbackBound.value.passed === expectedCount
    && rollbackBound.value.failed === 0
    && journal.at(-1)?.status === 'complete',
  `${key} execution/journal/rollback evidence drifted`);
  journalLineCount += journal.length;
  executionChecks.push({
    key,
    operationCount: expectedCount,
    execution: { path: executionPath, sha256: sha256(executionBound.bytes) },
    rollbackPreflight: { path: rollbackPath, sha256: sha256(rollbackBound.bytes) },
    journal: { path: journalPath, sha256: sha256(journalBytes), lineCount: journal.length },
  });
}
const liveEntityBound = readBoundJson(path.join(evidenceDir, 'live-entity-clearance.json'));
const blockEntityBound = readBoundJson(path.join(evidenceDir, 'block-entity-clearance.json'));
invariant(liveEntityBound.value.status === 'PASS'
  && liveEntityBound.value.totals.blockingEntityHits === 0
  && blockEntityBound.value.status === 'PASS'
  && blockEntityBound.value.blockingBlockEntityCount === 0,
'entity/block-entity execution gates drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'INDEPENDENT_READ_ONLY_R11H_RETRY_V2_POST_RELEASE_QA',
  release: {
    manifestPath: MANIFEST_PATH,
    manifestSha256: EXPECTED.manifestSha256,
    manifestIdentitySha256: EXPECTED.manifestIdentity,
    ledgerPath: CANONICAL_LEDGER_PATH,
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
  compensationAndRetryChain: {
    failedLedgerPath: FAILED_LEDGER,
    failedLedgerSha256: EXPECTED.failedLedgerSha256,
    failedLedgerStatus: failedLedger.status,
    recoveryAcceptancePath: RECOVERY_ACCEPTANCE,
    recoveryAcceptanceSha256: EXPECTED.recoveryAcceptanceSha256,
    recoveryAcceptanceIdentitySha256: EXPECTED.recoveryAcceptanceIdentity,
    retryLifecycleReboundCount: manifest.scope.lifecycleRebound.changedForwardRecordCount,
  },
  checks: {
    packageCount: manifest.packages.length,
    exactFinalTargetCount: exactTargetCount,
    exactInverseReadyCount: exactInverseCount,
    targetStateCensus: census(records, 'targetState'),
    surfaceCellCount: surface.length,
    surfaceComponentCount: 1,
    maxSurfaceStep: 1,
    stableSupportedSurfaceCellCount: surface.length,
    fullHeadroomCellCount: fullHeadroom.length,
    headroomCutCount: headroomCuts.length,
    foundationCellCount: foundation.length,
    beamCellCount: beam.length,
    dependencyCellCount: dependencyRecords.length,
    supportComponentCount: manifest.scope.supportGraph.componentCount,
    durableAnchoredSupportComponentCount: manifest.scope.supportGraph.componentCount,
    interactionHaloCellCount: halo.length,
    boundedDiffCount,
    boundedOffTargetDiffCount,
    sourceHaloFluidCount,
    postHaloFluidCount,
    hydraulicReviewCellCount: generic.halo.length,
    retainedSourceFluidCount: sourceFluids.length,
    retainedPostFluidCount: postFluids.length,
    retainedFluidComponentCount: manifest.scope.retainedHydraulicGraph.componentCount,
    retainedFluidMinimumTargetDistance:
      manifest.scope.retainedHydraulicGraph.minimumTargetChebyshevDistance,
    hydraulicOffTargetDiffCount,
    priorR11ManifestCount: priorBindings.length,
    priorR11TargetCellCount: priorTargetKeys.size,
    priorR11DriftCount,
    ledgerStageCount: ledger.stages.length,
    ledgerFailedStageCount: ledger.stages.filter(({ status }) => status !== 'PASS').length,
    executionJournalCount: executionChecks.length,
    executionJournalLineCount: journalLineCount,
    liveEntityBlockingCount: liveEntityBound.value.totals.blockingEntityHits,
    blockEntityBlockingCount: blockEntityBound.value.blockingBlockEntityCount,
    liveCallsPerformedByQa: false,
    worldEditsPerformedByQa: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    surfaceCoordinateSetSha256: hashCells(surface.map(({ cell }) => cell)),
    fullHeadroomCoordinateSetSha256: hashCells(fullHeadroom),
    interactionHaloCoordinateSetSha256: hashCells(halo),
    retainedFluidCoordinateSetSha256: hashCells(postFluids.map(({ cell }) => cell)),
  },
  priorR11Bindings: priorBindings,
  executionEvidence: executionChecks,
  fluidPreservationClaim:
    'The exact 7,120-cell operated halo is fluid-free in fresh source and post. The distinct snapshot-bound 45-cell one-component lava baseline is source/post identical, outside the operated halo at minimum Chebyshev distance two. No fluid operation, static future-flow, hydraulic-capacity, drainage-commission, or external-discharge claim is made.',
  acceptance: {
    bridgePhysicalStateAccepted: true,
    routeSegmentCommissioned: false,
    hydraulicBaselinePreserved: true,
    exactRollbackReady: true,
    safeSourceForNextDisjointR11Engineering: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const canonicalQaPath =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/r11h-retry-v2-post-release-qa.json';
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'COMMISSIONED_STATIC_BRIDGE_SEGMENT_POST_QA_PASS',
  releaseId: manifest.scope.releaseId,
  releaseNodeId: manifest.releaseNodeId,
  qa: {
    path: canonicalQaPath,
    qaPayloadSha256,
  },
  completedReleaseIdentitySha256: EXPECTED.completedIdentity,
  acceptedGeometry: {
    targetCellCount: records.length,
    surfaceCellCount: surface.length,
    headroomCellCount: fullHeadroom.length,
    foundationCellCount: foundation.length,
    beamCellCount: beam.length,
  },
  acceptedHydraulicBaseline: {
    fluidCellCount: postFluids.length,
    componentCount: manifest.scope.retainedHydraulicGraph.componentCount,
    coordinateSetSha256: EXPECTED.fluidHash,
    minimumTargetChebyshevDistance:
      manifest.scope.retainedHydraulicGraph.minimumTargetChebyshevDistance,
  },
  nonClaims: [
    'whole-corridor connectivity', 'route commissioning', 'hydraulic capacity',
    'drainage commissioning', 'external discharge', 'static future fluid behavior',
  ],
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const sealPayloadSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, sealPayloadSha256 };
for (const filename of [OUT_PATH, MD_PATH, SEAL_PATH, SEAL_MD_PATH]) {
  fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
}
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(MD_PATH), `# R11H retry-v2 post-release QA\n\nStatus: **PASS**\n\nAll ${records.length.toLocaleString('en-US')} targets match, including ${surface.length} connected pavement cells, ${foundation.length} foundation cells, ${beam.length} transverse beam cells, ${fullHeadroom.length} air headroom cells, and ${dependencyRecords.length} stabilized gravel dependencies. All ${records.length.toLocaleString('en-US')} inverse guards pass on the immutable post.\n\nThe exact ${halo.length.toLocaleString('en-US')}-cell operated halo has exactly ${boundedDiffCount.toLocaleString('en-US')} declared target diffs, zero off-target drift, and zero source/post fluids. The distinct ${postFluids.length}-cell lava baseline is source/post identical in one component at minimum target distance two. Six earlier R11 releases and ${priorTargetKeys.size.toLocaleString('en-US')} prior R11 target cells are unchanged.\n\nThe original strict-noop stop, full compensation, accepted recovery, and two-cell retry rebound chain is intact. QA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed by QA.\n`);
fs.writeFileSync(absolute(SEAL_MD_PATH), `# R11H retry-v2 commissioning seal\n\nStatus: **${seal.status}**\n\nThe bounded static bridge segment is physically accepted with exact rollback readiness. Route connectivity beyond the segment and hydraulic/drainage performance remain uncommissioned.\n\nSeal payload: \`${sealPayloadSha256}\`.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  markdown: MD_PATH,
  seal: SEAL_PATH,
  qaPayloadSha256,
  sealPayloadSha256,
  checks: report.checks,
}, null, 2));
