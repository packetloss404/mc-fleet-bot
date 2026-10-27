#!/usr/bin/env node
/** Read-only post-release QA and scoped commissioning seal for CZ-R09C. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:02:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09c-live-20260821T175500Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r09c-source-20260821T175500Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r09c-post-20260821T175500Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r09c-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r09c-post-release-qa.md'));
const SEAL_PATH = value(
  '--seal-out',
  path.join(EVIDENCE_DIR, 'r09c-pedestrian-circulation-commissioning-seal.json'),
);
const SEAL_MARKDOWN_PATH = value(
  '--seal-markdown',
  path.join(EVIDENCE_DIR, 'r09c-pedestrian-circulation-commissioning-seal.md'),
);
const R09B_MANIFEST_PATH =
  'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json';
const R09A_MANIFEST_PATH =
  'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json';
const R06_MANIFEST_PATH =
  'data/buildops/combined-zones-r06-support-liner.release-manifest.json';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:polished_diorite',
  'minecraft:deepslate',
  'minecraft:stone',
  'minecraft:gravel',
]);
const TARGET_STATE = 'minecraft:polished_diorite';

const EXPECTED = Object.freeze({
  ledgerSha256: 'bd3cf6bee86432d4e32aa473d096de1fea8e94c737a16fa429142b09eae0f5f0',
  manifestSha256: '052bbff087f1d12ae1932b339a6a76f50ba8bf7eacecc06e4151e5f7c1585b95',
  manifestIdentity: 'fa1eb2108e30725b173bdf1ee204adcb04a9b73c4412e77317e6b63336937fd7',
  sourceBoundReleaseIdentitySha256:
    'da01ccf563a47180b3ddbc0359ef2c679626437e1474fb107bf251cf99f2f465',
  completedReleaseIdentitySha256:
    'ac9a44c76a5dff561cb7e55c8b53890c729b26b28ab945903cb3db29b102ffaa',
  sourceCompleteSaveSha256:
    '05ba177ebd194d8069e85297745a468d203ec72732f4b58d2a21d7a7980e91df',
  sourceRegionSha256:
    'a4d5006d25e4b5e5c13fa2f08488e2844c7e8e07e07d7a0670235d5266ff2525',
  postCompleteSaveSha256:
    '43324de6f66408ccd54d04fd754b660f56bd93768747db9153dacd7fba4741c5',
  postRegionSha256:
    '422036cbb2e81586cddb1ca5d9b740fe34507d90bb370a2330cba1b8d8d21b71',
  operatedCount: 127,
  operatedSha256: '75520eff49415e09a07fdca1069ad2cdbb6a28168f136861a56e964d75412d3b',
  stairCount: 128,
  candidateCount: 257,
  candidateSha256: '43798a385667ed963fc7b11cce806589839527e6f0dadc3271c3881140468450',
  clearanceCount: 256,
  r09bCount: 1705,
  r09aFloorCount: 63,
  r06Count: 1530,
  haloCount: 2257,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09C post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateName = (state) => state.split('[', 1)[0];

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(JSON.stringify(from) === JSON.stringify(to),
      `${filename} contains a non-point operation`);
    operations.push({
      cell: { x: from[0], y: from[1], z: from[2] },
      from,
      to,
      sourceState: fields[7],
      targetState: fields[8],
    });
  }
  return operations;
}

function expandedManifestTargets(manifest) {
  const records = [];
  for (const { forward } of manifest.packages) {
    for (const raw of fs.readFileSync(absolute(forward), 'utf8').split(/\r?\n/)) {
      if (!raw || raw.startsWith('#')) continue;
      const fields = raw.split(/\s+/);
      const coordinates = fields.slice(1, 7).map(Number);
      for (let x = Math.min(coordinates[0], coordinates[3]);
        x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
        for (let y = Math.min(coordinates[1], coordinates[4]);
          y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
          for (let z = Math.min(coordinates[2], coordinates[5]);
            z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
            records.push({
              cell: { x, y, z },
              sourceState: fields[7],
              targetState: fields[8],
            });
          }
        }
      }
    }
  }
  return records;
}

function cubeHalo(cells) {
  return uniqueCells(cells.flatMap(({ x, y, z }) => {
    const result = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          result.push({ x: x + dx, y: y + dy, z: z + dz });
        }
      }
    }
    return result;
  }));
}

function stateCensus(records) {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  return sha256(`combined-zones-current-block-state-set-v1\n${records.slice()
    .sort((left, right) => (
      left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
    ))
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`)
    .join('\n')}\n`);
}

async function states(reader, cells) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    result.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return result;
}

function changes(source, post) {
  const postByKey = new Map(post.map(({ cell, state }) => [cellKey(cell), state]));
  return source.filter(({ cell, state }) => state !== postByKey.get(cellKey(cell)));
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.stages?.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS'),
'terminal ledger identity or stage state drifted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && manifestBinding.sha256 === EXPECTED.manifestSha256,
'ledger/manifest scope or file binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest payload identity drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(samePath(ledger.sourceSnapshot.root, SOURCE_ROOT)
  && samePath(ledger.postSnapshot.root, POST_ROOT)
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'ledger complete-save identity drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post complete-save intake drifted');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && samePath(sourceIdentity.directory, path.join(SOURCE_ROOT, 'region'))
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'source or post region identity drifted');
const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const current = fileBinding(binding.path);
  if (current.sha256 !== binding.sha256 || current.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed: current });
  }
}
invariant(evidenceBindingFailures.length === 0, 'terminal evidence binding drifted');
const recomputedSourceBoundIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
const recomputedCompletedIdentity = sha256(JSON.stringify({
  sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(
    ({ path: reportPath, sha256: reportSha256 }) => ({ path: reportPath, sha256: reportSha256 }),
  ),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)),
}));
invariant(ledger.sourceBoundReleaseIdentitySha256
    === EXPECTED.sourceBoundReleaseIdentitySha256
  && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundIdentity
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedIdentity,
'source-bound or completed release identity drifted');

const ring = [];
for (let x = 2103; x <= 2109; x += 1) ring.push({ x, z: -431, ox: x, oz: -432 });
for (let z = -430; z <= -425; z += 1) ring.push({ x: 2109, z, ox: 2110, oz: z });
for (let x = 2108; x >= 2103; x -= 1) ring.push({ x, z: -425, ox: x, oz: -424 });
for (let z = -426; z >= -430; z -= 1) ring.push({ x: 2103, z, ox: 2102, oz: z });
const stairs = [];
for (let index = 0; index < 124; index += 1) {
  const point = ring[index % ring.length];
  const y = -58 + Math.floor(index / 2);
  stairs.push({
    index,
    cell: { x: point.x, y, z: point.z },
    outer: { x: point.ox, y, z: point.oz },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 124 + offset;
  const point = ring[index % ring.length];
  stairs.push({
    index,
    cell: { x: point.x, y: 3, z: point.z },
    outer: { x: point.ox, y: 3, z: point.oz },
    surfaceY2: 8,
  });
}
const requiredBarrier = uniqueCells(stairs.flatMap(({ outer }) => [
  { x: outer.x, y: outer.y + 1, z: outer.z },
  { x: outer.x, y: outer.y + 2, z: outer.z },
]));
const capExtension = [{ x: 2109, y: 5, z: -429 }];
const candidate = uniqueCells([...requiredBarrier, ...capExtension]);
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const halo = cubeHalo(candidate);
invariant(stairs.length === EXPECTED.stairCount
  && candidate.length === EXPECTED.candidateCount
  && hashCells(candidate) === EXPECTED.candidateSha256
  && clearance.length === EXPECTED.clearanceCount
  && halo.length === EXPECTED.haloCount,
'canonical R09C geometry drifted');

const pkg = manifest.packages.find(({ key }) => key === 'b07-stair-safety-completion');
invariant(pkg, 'R09C package is missing');
const forward = parseOperations(pkg.forward);
const rollback = parseOperations(pkg.rollback);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === EXPECTED.operatedCount
  && rollback.length === EXPECTED.operatedCount
  && hashCells(targets) === EXPECTED.operatedSha256
  && forward.every(({ sourceState, targetState }) => (
    sourceState === 'minecraft:air' && targetState === TARGET_STATE
  ))
  && rollback.every((operation, index) => {
    const inverse = forward.at(-(index + 1));
    return cellKey(operation.cell) === cellKey(inverse.cell)
      && operation.sourceState === inverse.targetState
      && operation.targetState === inverse.sourceState;
  }), 'R09C operation set or reverse inverse drifted');

const r09bManifest = readJson(R09B_MANIFEST_PATH);
const r09aManifest = readJson(R09A_MANIFEST_PATH);
const r06Manifest = readJson(R06_MANIFEST_PATH);
const r09bRecords = expandedManifestTargets(r09bManifest);
const r06Records = expandedManifestTargets(r06Manifest);
const r09aFloor = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -59, maxY: -59,
  minZ: -431, maxZ: -425,
});
invariant(r09bRecords.length === EXPECTED.r09bCount
  && r09aFloor.length === EXPECTED.r09aFloorCount
  && r06Records.length === EXPECTED.r06Count,
'prior release geometry drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const [sourceTargets, postTargets, sourceCandidate, postCandidate,
  sourceClearance, postClearance, sourceHalo, postHalo,
  sourceR09b, postR09b, sourceR09a, postR09a, sourceR06, postR06] = await Promise.all([
  states(sourceReader, targets), states(postReader, targets),
  states(sourceReader, candidate), states(postReader, candidate),
  states(sourceReader, clearance), states(postReader, clearance),
  states(sourceReader, halo), states(postReader, halo),
  states(sourceReader, r09bRecords.map(({ cell }) => cell)),
  states(postReader, r09bRecords.map(({ cell }) => cell)),
  states(sourceReader, r09aFloor), states(postReader, r09aFloor),
  states(sourceReader, r06Records.map(({ cell }) => cell)),
  states(postReader, r06Records.map(({ cell }) => cell)),
]);
const postTargetFailures = postTargets.filter(({ state }) => state !== TARGET_STATE);
const sourceTargetFailures = sourceTargets.filter(({ state }) => state !== 'minecraft:air');
const postCandidateByKey = new Map(postCandidate.map(({ cell, state }) => [cellKey(cell), state]));
const sourceCandidateByKey = new Map(sourceCandidate.map(({ cell, state }) => [cellKey(cell), state]));
const candidateChanges = changes(sourceCandidate, postCandidate);
const haloChanges = changes(sourceHalo, postHalo);
const undeclaredHaloChanges = haloChanges.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
const clearanceFailures = postClearance.filter(({ state }) => !AIR_STATES.has(state));
const clearanceChanges = changes(sourceClearance, postClearance);
const r09bChanges = changes(sourceR09b, postR09b);
const r09bDesiredFailures = postR09b.filter(({ cell, state }) => (
  state !== r09bRecords.find(({ cell: expected }) => cellKey(expected) === cellKey(cell)).targetState
));
const r09aChanges = changes(sourceR09a, postR09a);
const r06Changes = changes(sourceR06, postR06);

const containmentFailures = [];
const controlledOverhangs = [];
for (const stair of stairs) {
  const lower = { x: stair.outer.x, y: stair.outer.y + 1, z: stair.outer.z };
  const upper = { x: stair.outer.x, y: stair.outer.y + 2, z: stair.outer.z };
  const lowerState = postCandidateByKey.get(cellKey(lower));
  const upperState = postCandidateByKey.get(cellKey(upper));
  const lowerSolid = FULL_SOLID_NAMES.has(stateName(lowerState ?? ''));
  const upperSolid = FULL_SOLID_NAMES.has(stateName(upperState ?? ''));
  const availableHeight = upper.y - (stair.surfaceY2 / 2);
  const collisionContained = (lowerSolid && upperSolid)
    || (!lowerSolid && upperSolid && availableHeight < 1.8);
  if (!collisionContained) {
    containmentFailures.push({
      stairIndex: stair.index,
      lower,
      upper,
      lowerState,
      upperState,
      availableHeight,
    });
  }
  if (!lowerSolid && upperState === 'minecraft:gravel' && availableHeight < 1.8) {
    controlledOverhangs.push({
      stairIndex: stair.index,
      gap: lower,
      overhang: upper,
      availableHeight,
    });
  }
}
const controlled = controlledOverhangs[0];
const controlledSourceGapState = controlled
  ? sourceCandidateByKey.get(cellKey(controlled.gap)) : null;
const controlledPostGapState = controlled
  ? postCandidateByKey.get(cellKey(controlled.gap)) : null;
const controlledSourceOverhangState = controlled
  ? sourceCandidateByKey.get(cellKey(controlled.overhang)) : null;
const controlledPostOverhangState = controlled
  ? postCandidateByKey.get(cellKey(controlled.overhang)) : null;
const cap = cellsIn({
  minX: 2109, maxX: 2109,
  minY: 3, maxY: 5,
  minZ: -429, maxZ: -429,
});
const postCap = await states(postReader, cap);
const capFailures = postCap.filter(({ state }) => state !== TARGET_STATE);
const landingTerminalBoundary = [
  { x: 2109, y: 4, z: -429 },
  { x: 2109, y: 5, z: -429 },
  { x: 2110, y: 4, z: -430 },
  { x: 2110, y: 5, z: -430 },
  { x: 2108, y: 4, z: -430 },
  { x: 2108, y: 5, z: -430 },
];
const postLandingBoundary = await states(postReader, landingTerminalBoundary);
const landingBoundaryFailures = postLandingBoundary.filter(({ state }) => (
  !FULL_SOLID_NAMES.has(stateName(state))
));
const capNonClimbable = capFailures.length === 0
  && landingBoundaryFailures.length === 0
  && (5 - 3) === 2;

const executionPath = path.join(EVIDENCE_DIR, 'b07-stair-safety-completion.forward-execution.json');
const rollbackPath = path.join(
  EVIDENCE_DIR,
  'b07-stair-safety-completion.rollback-poststate-preflight.json',
);
const blockEntityPath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const liveEntityPath = path.join(EVIDENCE_DIR, 'live-entity-clearance.json');
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPath);
const blockEntity = readJson(blockEntityPath);
const liveEntity = readJson(liveEntityPath);
const strictExecutionPassed = execution.status === 'complete'
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.successfulGroups === EXPECTED.operatedCount
  && execution.failedGroups === 0
  && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true;
const rollbackPassed = rollbackPreflight.status === 'PASS'
  && rollbackPreflight.passed === EXPECTED.operatedCount
  && rollbackPreflight.failed === 0
  && rollbackPreflight.opsSha256 === ledger.packages[0].rollback.sha256
  && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256;
const entityContainmentPassed = blockEntity.status === 'PASS'
  && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS'
  && liveEntity.totals?.blockingEntityHits === 0;

const checks = [
  ['R09C-QA-01-TERMINAL-IDENTITY', true],
  ['R09C-QA-02-EXACT-REVERSE-INVERSE', true],
  ['R09C-QA-03-EXACT-SOURCE-STATE', sourceTargetFailures.length === 0],
  ['R09C-QA-04-EXACT-POST-STATE', postTargetFailures.length === 0],
  ['R09C-QA-05-ZERO-UNDECLARED-HALO-DRIFT', undeclaredHaloChanges.length === 0],
  ['R09C-QA-06-R09B-1705-PRESERVED',
    r09bChanges.length === 0 && r09bDesiredFailures.length === 0],
  ['R09C-QA-07-HEADROOM-256-PRESERVED',
    clearanceFailures.length === 0 && clearanceChanges.length === 0],
  ['R09C-QA-08-ALL-128-STAIRS-COLLISION-CONTAINED', containmentFailures.length === 0],
  ['R09C-QA-09-CONTROLLED-GRAVEL-OVERHANG',
    controlledOverhangs.length === 1
      && controlledSourceGapState === 'minecraft:air'
      && controlledPostGapState === 'minecraft:air'
      && controlledSourceOverhangState === 'minecraft:gravel'
      && controlledPostOverhangState === 'minecraft:gravel'],
  ['R09C-QA-10-NON-CLIMBABLE-UPPER-CAP', capNonClimbable],
  ['R09C-QA-11-R09A-FLOOR-PRESERVED', r09aChanges.length === 0],
  ['R09C-QA-12-R06-TREATMENT-PRESERVED', r06Changes.length === 0],
  ['R09C-QA-13-STRICT-EXECUTION', strictExecutionPassed],
  ['R09C-QA-14-ROLLBACK-POSTSTATE', rollbackPassed],
  ['R09C-QA-15-ENTITY-AND-BLOCK-ENTITY-CONTAINMENT', entityContainmentPassed],
  ['R09C-QA-16-COMMISSIONING-SCOPE-REMAINS-CAPPED',
    manifest.scope.operationalBoundary.liftPowerSmokeDrainageCommissioned === false],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `post-release checks failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09C_STAIR_SAFETY_POST_RELEASE_ROUTE_COMMISSIONABLE_TO_UPPER_CAP',
  release: {
    transactionId: ledger.transactionId,
    releaseNodeId: ledger.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailures,
    sourceCompleteSave: {
      completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
    },
    postCompleteSave: {
      completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
  },
  geometry: {
    stairPath: classManifest(stairs.map(({ cell }) => cell)),
    requiredOuterBarrier: classManifest(requiredBarrier),
    candidateContainment: classManifest(candidate),
    operatedAdditions: classManifest(targets),
    headClearance: classManifest(clearance),
    interactionHalo: classManifest(halo),
    completedUpperCap: classManifest(cap),
    landingTerminalBoundary: classManifest(landingTerminalBoundary),
    r09bOperatedUnion: classManifest(r09bRecords.map(({ cell }) => cell)),
    r09aFloor: classManifest(r09aFloor),
    r06OperatedUnion: classManifest(r06Records.map(({ cell }) => cell)),
  },
  exactState: {
    sourceTargetCensus: stateCensus(sourceTargets),
    postTargetCensus: stateCensus(postTargets),
    sourceMatchingCellCount: targets.length - sourceTargetFailures.length,
    sourceMismatchCount: sourceTargetFailures.length,
    postMatchingCellCount: targets.length - postTargetFailures.length,
    postMismatchCount: postTargetFailures.length,
    exactReverseOrderInverse: true,
  },
  containment: {
    sourceCandidateCensus: stateCensus(sourceCandidate),
    postCandidateCensus: stateCensus(postCandidate),
    candidateChangedCellCount: candidateChanges.length,
    fullSolidCellCount: postCandidate.filter(({ state }) => (
      FULL_SOLID_NAMES.has(stateName(state))
    )).length,
    controlledLowClearanceOverhangCount: controlledOverhangs.length,
    controlledLowClearanceOverhang: controlled,
    containedStairPositionCount: stairs.length - containmentFailures.length,
    uncontainedStairPositionCount: containmentFailures.length,
    fallProtectionComplete: containmentFailures.length === 0,
  },
  route: {
    orderedStairCellCount: stairs.length,
    headClearanceAirCellCount: clearance.length - clearanceFailures.length,
    headClearanceMismatchCount: clearanceFailures.length,
    completedCapStateCensus: stateCensus(postCap),
    landingTerminalBoundaryStateCensus: stateCensus(postLandingBoundary),
    capRiseAboveLandingBlocks: 2,
    capPhysicallyClimbable: !capNonClimbable,
    lowerLobbyToUpperCapCommissionable: true,
    beyondUpperCapCommissioned: false,
  },
  preservation: {
    r09b: {
      sourceStateSetSha256: stateSetSha256(sourceR09b),
      postStateSetSha256: stateSetSha256(postR09b),
      unchangedCellCount: r09bRecords.length - r09bChanges.length,
      changedCellCount: r09bChanges.length,
      desiredStateMismatchCount: r09bDesiredFailures.length,
    },
    r09aFloor: {
      sourceStateCensus: stateCensus(sourceR09a),
      postStateCensus: stateCensus(postR09a),
      unchangedCellCount: r09aFloor.length - r09aChanges.length,
      changedCellCount: r09aChanges.length,
    },
    r06: {
      sourceStateSetSha256: stateSetSha256(sourceR06),
      postStateSetSha256: stateSetSha256(postR06),
      unchangedCellCount: r06Records.length - r06Changes.length,
      changedCellCount: r06Changes.length,
    },
  },
  drift: {
    haloChangedCellCount: haloChanges.length,
    haloUndeclaredChangedCellCount: undeclaredHaloChanges.length,
  },
  executionEvidence: {
    strictForwardExecution: {
      ...fileBinding(executionPath),
      operationSha256: execution.operationSha256,
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      unknownReplyCommands: execution.unknownReplyCommands,
      worldEditLeftoverCount: execution.worldEditLeftoverCount,
      allTemporaryChunksReleased: execution.forceLoadAudit.allTemporaryReleased,
      forceLoadSetRestored: execution.forceLoadAudit.finalSetMatchesPreExistingSet,
      streamJournalSha256: execution.streamJournalSha256,
      passed: strictExecutionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      opsSha256: rollbackPreflight.opsSha256,
      passedGuards: rollbackPreflight.passed,
      failedGuards: rollbackPreflight.failed,
      regionSnapshotSha256: rollbackPreflight.regionsSnapshot.sha256,
      passed: rollbackPassed,
    },
    containmentGates: {
      blockEntityEvidence: fileBinding(blockEntityPath),
      liveEntityEvidence: fileBinding(liveEntityPath),
      blockingBlockEntityCount: blockEntity.blockingBlockEntityCount,
      blockingEntityHitCount: liveEntity.totals.blockingEntityHits,
      passed: entityContainmentPassed,
    },
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    exactAdditionCount: targets.length - postTargetFailures.length,
    preservedR09bCellCount: r09bRecords.length - r09bChanges.length,
    containedStairPositionCount: stairs.length - containmentFailures.length,
    headClearanceAirCellCount: clearance.length - clearanceFailures.length,
    capCellCount: cap.length - capFailures.length,
    r09aFloorUnchangedCellCount: r09aFloor.length - r09aChanges.length,
    r06UnchangedCellCount: r06Records.length - r06Changes.length,
    undeclaredHaloChangeCount: undeclaredHaloChanges.length,
    rollbackGuardPassCount: rollbackPreflight.passed,
    routeCommissionableToUpperCap: true,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const report = {
  ...reportWithoutIdentity,
  qaPayloadSha256: sha256(JSON.stringify(reportWithoutIdentity)),
};
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'COMMISSIONED_R09C_PEDESTRIAN_CIRCULATION_TO_RETAINED_UPPER_CAP',
  releaseNodeId: ledger.releaseNodeId,
  canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  postQaPayloadSha256: report.qaPayloadSha256,
  commissionedRoute: {
    from: 'R09A-B07-LOWER-LOBBY',
    via: 'R09B-128-CELL-HALF-STEP-SPIRAL',
    to: 'R09C-RETAINED-UPPER-CAP-Y3-TO-Y5',
    containedStairPositionCount: stairs.length,
    headClearanceAirCellCount: clearance.length,
    capPhysicallyClimbable: false,
  },
  holdDisposition: {
    liftedHoldId: 'R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER',
    liftedOnlyFor: 'PEDESTRIAN_CIRCULATION_FROM_LOWER_LOBBY_TO_RETAINED_UPPER_CAP',
    remainsClosedBeyondCap: true,
  },
  excludedCommissioning: {
    wetZone: true,
    lift: true,
    smokeSystem: true,
    powerSystem: true,
    drainageOrOutfall: true,
    upperShaftOrSurfaceOpening: true,
  },
  acceptanceChecks: checks.map(({ id, status }) => ({ id, status })),
  safetyBoundary: {
    issuedFromReadOnlyPostQa: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
};
const seal = {
  ...sealWithoutIdentity,
  commissioningSealSha256: sha256(JSON.stringify(sealWithoutIdentity)),
};
const markdown = `# CZ-R09C B07 stair safety completion post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  \n`
  + `**QA payload identity:** \`${report.qaPayloadSha256}\`\n\n`
  + `All ${targets.length} additions match polished diorite; all ${r09bRecords.length} R09B states, ${clearance.length} clearance cells, ${r09aFloor.length} R09A floor cells, and ${r06Records.length} R06 targets are preserved. Every one of ${stairs.length} stair positions is collision-contained, including the unchanged 1.5-block gravel-overhang control. The Y=3..5 cap is non-climbable and cannot be bypassed from the terminal landing.\n\n`
  + `The route is commissionable only from the lower lobby to the retained upper cap. Wet-zone, lift, smoke, power, drainage/outfall, and upper opening scopes remain closed. This QA performed no live mutation.\n`;
const sealMarkdown = `# CZ-R09C pedestrian circulation commissioning seal\n\n`
  + `**Status:** ${seal.status}  \n`
  + `**Seal identity:** \`${seal.commissioningSealSha256}\`  \n`
  + `**Post-QA identity:** \`${report.qaPayloadSha256}\`\n\n`
  + `The R09B fall-protection and terminal-barrier hold is lifted only for pedestrian circulation from the accepted lower lobby, along the 128-cell half-step spiral, to the retained non-climbable upper cap. All ${stairs.length} stair positions are contained and all ${clearance.length} clearance cells are air.\n\n`
  + `No passage beyond the cap is commissioned. The wet zone, lift, smoke, power, drainage/outfall, upper shaft, and surface opening remain closed and outside this seal.\n`;
for (const filename of [OUT_PATH, MARKDOWN_PATH, SEAL_PATH, SEAL_MARKDOWN_PATH]) {
  fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
}
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), sealMarkdown);
console.log(JSON.stringify({
  status: report.status,
  report: relative(OUT_PATH),
  qaPayloadSha256: report.qaPayloadSha256,
  commissioningStatus: seal.status,
  commissioningSeal: relative(SEAL_PATH),
  commissioningSealSha256: seal.commissioningSealSha256,
  exactAdditionCount: report.summary.exactAdditionCount,
  preservedR09bCellCount: report.summary.preservedR09bCellCount,
  containedStairPositionCount: report.summary.containedStairPositionCount,
  headClearanceAirCellCount: report.summary.headClearanceAirCellCount,
  rollbackGuardPassCount: report.summary.rollbackGuardPassCount,
}, null, 2));
