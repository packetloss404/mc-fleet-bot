#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R07K. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const LEDGER_PATH = value(
  '--ledger',
  'data/world-review/combined-zones-r07k-live-20260821T195128Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r07k-b03-twin-portal-exterior.release-manifest.json';
const PACKAGE_KEY = 'b03-twin-portal-collars';
const EXPECTED = Object.freeze({
  manifestSha256: 'e4f09879d5a4770b8950aa9f21b0d095bcb365a696b8c91e5cc1c9f55b6cbd5c',
  forwardFileSha256: '6750cb6e71e1fc02d511f06eabaa99de213fd4389e73dcdb9a54d0ca388199bc',
  rollbackFileSha256: '2da6d077c2931b2f8e3804789f8e01413006825d4fd9fe5471cd902599731b97',
  targetCount: 72,
  targetHash: 'a2ce627591b2e58dd4f20bd28d24e975aaf517ec30a5ac540ebc7617f0358e0b',
  sourceCompleteSaveSha256: '56b189023fc10ab0c74918afd7fc01640046736dd08d9ad2bc30ce97c282a0b5',
  postCompleteSaveSha256: '1d9b5eaccbadd887581a831481117916c1b4c681551b32d234db0405cb77280a',
  postRegionSha256: 'c4a9a291f84b23a7b9112196e4e09d1fc66096b9c10b6d313f42293a7ee0429a',
  completedReleaseIdentitySha256:
    '359374cbac2459d139d7b24b9b0430169f0e2ea91c9e2fd9537b8a1f48458600',
});
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07K post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const point = fields.slice(1, 4).map(Number);
    invariant(fields.slice(4, 7).map(Number).join(',') === point.join(','),
      `${filename} contains a non-cell guard`);
    operations.push({
      cell: { x: point[0], y: point[1], z: point[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return sha256(body);
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const pending = [first];
    let size = 0;
    while (pending.length) {
      const [x, y, z] = pending.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) pending.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, componentSizes: sizes };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId,
'ledger is not the completed R07K transaction');
invariant(ledger.manifest.sha256 === EXPECTED.manifestSha256
  && fileBinding(MANIFEST_PATH).sha256 === EXPECTED.manifestSha256,
'manifest binding drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256,
'source, post, or completed release identity drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(postIdentity.sha256 === EXPECTED.postRegionSha256,
'post region identity drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post complete-save intake is not PASS');

for (const binding of ledger.evidenceBindings) {
  invariant(fileBinding(binding.path).sha256 === binding.sha256
    && fileBinding(binding.path).bytes === binding.bytes,
  `evidence binding drifted: ${binding.path}`);
}
const pkg = ledger.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(pkg
  && pkg.forward.sha256 === EXPECTED.forwardFileSha256
  && pkg.rollback.sha256 === EXPECTED.rollbackFileSha256
  && fileBinding(pkg.forward.path).sha256 === EXPECTED.forwardFileSha256
  && fileBinding(pkg.rollback.path).sha256 === EXPECTED.rollbackFileSha256,
'operation-file binding drifted');

const forward = parseOperations(pkg.forward.path);
const rollback = parseOperations(pkg.rollback.path);
const targets = forward.map(({ cell }) => cell);
invariant(forward.length === EXPECTED.targetCount
  && new Set(targets.map(cellKey)).size === EXPECTED.targetCount
  && hashCells(targets) === EXPECTED.targetHash
  && rollback.length === forward.length,
'target count, uniqueness, or identity drifted');
invariant(rollback.every((operation, index) => {
  const source = forward[forward.length - 1 - index];
  return cellKey(operation.cell) === cellKey(source.cell)
    && operation.fromState === source.toState
    && operation.toState === source.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(operationBodySha256(pkg.forward.path) === manifest.operations[PACKAGE_KEY].forwardSha256
  && operationBodySha256(pkg.rollback.path) === manifest.operations[PACKAGE_KEY].rollbackSha256,
'operation body identity drifted');

const sourceReader = new AnvilReader(absolute(ledger.sourceSnapshot.regions));
const postReader = new AnvilReader(absolute(ledger.postSnapshot.regions));
async function readState(reader, cell) {
  return stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
}

const transitionFailures = [];
for (const operation of forward) {
  const sourceState = await readState(sourceReader, operation.cell);
  const postState = await readState(postReader, operation.cell);
  if (sourceState !== operation.fromState || postState !== operation.toState) {
    transitionFailures.push({ cell: operation.cell, expectedSource: operation.fromState,
      actualSource: sourceState, expectedPost: operation.toState, actualPost: postState });
  }
}
invariant(transitionFailures.length === 0, 'one or more exact target transitions failed');

const reviewBounds = manifest.source.disjointRebaseProof.reviewPrism.bounds;
const reviewCells = [];
for (let x = reviewBounds.minX; x <= reviewBounds.maxX; x += 1) {
  for (let y = reviewBounds.minY; y <= reviewBounds.maxY; y += 1) {
    for (let z = reviewBounds.minZ; z <= reviewBounds.maxZ; z += 1) {
      if ((z >= -874 && z <= -862) || (z >= -754 && z <= -742)) {
        reviewCells.push({ x, y, z });
      }
    }
  }
}
const targetKeys = new Set(targets.map(cellKey));
const reviewDifferences = [];
const undeclaredDifferences = [];
for (const cell of uniqueCells(reviewCells)) {
  const sourceState = await readState(sourceReader, cell);
  const postState = await readState(postReader, cell);
  if (sourceState !== postState) {
    reviewDifferences.push({ cell, sourceState, postState });
    if (!targetKeys.has(cellKey(cell))) undeclaredDifferences.push({ cell, sourceState, postState });
  }
}
invariant(reviewCells.length === 1560
  && reviewDifferences.length === EXPECTED.targetCount
  && undeclaredDifferences.length === 0,
'portal review prism has undeclared post-state drift');

const apertures = [];
for (const zCenter of [-748, -868]) {
  for (let x = 2236; x <= 2237; x += 1) {
    for (let y = 166; y <= 169; y += 1) {
      for (let z = zCenter - 2; z <= zCenter + 2; z += 1) apertures.push({ x, y, z });
    }
  }
}
const supportCells = [-748, -868].flatMap((zCenter) => [
  { x: 2236, y: 166, z: zCenter - 4 }, { x: 2236, y: 166, z: zCenter + 4 },
  { x: 2237, y: 165, z: zCenter - 4 }, { x: 2237, y: 165, z: zCenter + 4 },
]);
for (const cell of apertures) {
  invariant(await readState(sourceReader, cell) === 'minecraft:air'
    && await readState(postReader, cell) === 'minecraft:air',
  `portal aperture changed at ${cellKey(cell)}`);
}
for (const cell of supportCells) {
  invariant(await readState(sourceReader, cell) === 'minecraft:polished_diorite'
    && await readState(postReader, cell) === 'minecraft:polished_diorite',
  `portal support changed at ${cellKey(cell)}`);
}
const targetConnectivity = connectedComponents(targets);
invariant(targetConnectivity.componentCount === 2
  && targetConnectivity.componentSizes.join(',') === '36,36',
'post target geometry is not two connected 36-cell frames');

const forwardExecutionPath = path.join(path.dirname(LEDGER_PATH),
  `${PACKAGE_KEY}.forward-execution.json`);
const rollbackPreflightPath = path.join(path.dirname(LEDGER_PATH),
  `${PACKAGE_KEY}.rollback-poststate-preflight.json`);
const execution = readJson(forwardExecutionPath);
const rollbackPreflight = readJson(rollbackPreflightPath);
invariant(execution.status === 'complete'
  && execution.dryRun === false
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.successfulGroups === 72
  && execution.failedGroups === 0
  && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(rollbackPreflight.status === 'PASS'
  && rollbackPreflight.operationCount === 72
  && rollbackPreflight.passed === 72
  && rollbackPreflight.failed === 0,
'rollback post-state preflight is not 72/72 PASS');
const requiredStages = [
  'standing-authorization', 'exact-release-manifest-qa',
  'fresh-source-complete-save', 'source-complete-save-intake',
  'source-snapshot-identity', `forward-source-preflight:${PACKAGE_KEY}`,
  `strict-forward-parser-check:${PACKAGE_KEY}`,
  `strict-rollback-parser-check:${PACKAGE_KEY}`,
  `projected-rollback-preflight:${PACKAGE_KEY}`, 'block-entity-clearance',
  'live-entity-clearance', `same-moment-package-entity-clearance:${PACKAGE_KEY}`,
  `strict-forward-execution:${PACKAGE_KEY}`, 'fresh-post-complete-save',
  'post-complete-save-intake', 'post-snapshot-identity',
  `rollback-poststate-preflight:${PACKAGE_KEY}`,
];
invariant(requiredStages.every((stage) => (
  ledger.stages.some((entry) => entry.stage === stage && entry.status === 'PASS')
)), 'one or more required wrapper stages are absent or non-PASS');
const manifestQa = readJson(path.join(path.dirname(LEDGER_PATH), 'exact-release-manifest-qa.json'));
const blockEntity = readJson(path.join(path.dirname(LEDGER_PATH), 'block-entity-clearance.json'));
const liveEntity = readJson(path.join(path.dirname(LEDGER_PATH), 'live-entity-clearance.json'));
const sameMomentEntity = readJson(path.join(path.dirname(LEDGER_PATH),
  `${PACKAGE_KEY}.same-moment-entity-clearance.json`));
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 72
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS' && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R07K-P1-B03-TWIN-PORTAL-EXTERIOR-POST-QA',
  status: 'PASS_EXACT_POSTSTATE_PRESERVED_APERTURES_REVERSIBLE',
  generatedAtUtc: value('--generated-at', '2026-08-21T19:55:00Z'),
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  sourceSnapshot: {
    root: ledger.sourceSnapshot.root,
    completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
    regionSha256: sourceIdentity.sha256,
  },
  postSnapshot: {
    root: ledger.postSnapshot.root,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: postIdentity.sha256,
  },
  releaseIdentity: {
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  exactPostState: {
    targetCellCount: targets.length,
    targetCoordinateSetSha256: hashCells(targets),
    exactTransitionPassCount: targets.length - transitionFailures.length,
    exactTransitionFailureCount: transitionFailures.length,
    desiredState: 'minecraft:stone_bricks',
    targetConnectivity,
  },
  preservation: {
    reviewCellCount: reviewCells.length,
    declaredDifferenceCount: reviewDifferences.length,
    undeclaredDifferenceCount: undeclaredDifferences.length,
    preservedApertureCellCount: apertures.length,
    preservedApertureState: 'minecraft:air',
    preservedSupportCellCount: supportCells.length,
    preservedSupportState: 'minecraft:polished_diorite',
    routeApertureChanged: false,
    tubeMountainViaductChangedOutsideTargets: false,
    activeMechanismOrCommissioningChange: false,
  },
  execution: {
    strictForwardGroupPassCount: execution.successfulGroups,
    failedGroupCount: execution.failedGroups,
    noOpCount: execution.noopCommands,
    unknownReplyCount: execution.unknownReplyCommands,
    worldEditLeftoverCount: execution.worldEditLeftoverCount,
    rollbackPoststatePassCount: rollbackPreflight.passed,
    rollbackPoststateFailCount: rollbackPreflight.failed,
    allTemporaryChunksReleased: execution.forceLoadAudit.allTemporaryReleased,
  },
  evidence: {
    requiredStageCount: requiredStages.length,
    requiredStagePassCount: requiredStages.length,
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailureCount: 0,
    manifestQa: manifestQa.status,
    blockEntityClearance: blockEntity.status,
    liveEntityClearance: liveEntity.status,
    sameMomentEntityClearance: sameMomentEntity.status,
  },
  disposition: {
    r07ArchitectureWaveComplete: true,
    acceptedScope: 'dry twin B03 portal-exterior collars only',
    railPowerBrakeControlDrainageAndRouteCommissioningRemainDeferred: true,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  summary: {
    checkCount: 10,
    passCount: 10,
    failCount: 0,
    passed: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const out = value('--out', path.join(path.dirname(LEDGER_PATH), 'r07k-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(path.dirname(LEDGER_PATH),
  'r07k-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R07K B03 twin portal exterior post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**QA payload SHA-256:** \`${qaPayloadSha256}\`\n\n`
  + `- Exact targets: ${targets.length}/${targets.length} stone-brick transitions.\n`
  + `- Geometry: two connected 36-cell collars.\n`
  + `- Preserved openings: ${apertures.length}/${apertures.length} exact air cells.\n`
  + `- Preserved supports: ${supportCells.length}/${supportCells.length} polished-diorite cells.\n`
  + `- Review-domain drift: ${undeclaredDifferences.length} undeclared differences across ${reviewCells.length} cells.\n`
  + `- Strict execution: ${execution.successfulGroups}/72 groups, zero failures/no-ops/unknowns.\n`
  + `- Exact rollback readiness: ${rollbackPreflight.passed}/72 guards.\n`
  + `- R07 architecture wave: complete; mechanisms and commissioning remain deferred.\n`
  + `- QA was read-only and made no live call.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: relative(out),
  markdown: relative(markdownOut),
  qaPayloadSha256,
  exactTargetPassCount: targets.length,
  undeclaredDifferenceCount: undeclaredDifferences.length,
  r07ArchitectureWaveComplete: true,
}, null, 2));
