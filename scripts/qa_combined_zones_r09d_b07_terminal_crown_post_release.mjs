#!/usr/bin/env node
/** Independent read-only R09B+C+D post QA and scoped pedestrian seal. */

import fs from 'node:fs';
import path from 'node:path';
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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:16:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09d-live-20260821T181124Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r09d-source-20260821T181124Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r09d-post-20260821T181124Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r09d-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r09d-post-release-qa.md'));
const SEAL_PATH = value(
  '--seal-out',
  path.join(EVIDENCE_DIR, 'r09b-r09c-r09d-pedestrian-circulation-commissioning-seal.json'),
);
const SEAL_MARKDOWN_PATH = value(
  '--seal-markdown',
  path.join(EVIDENCE_DIR, 'r09b-r09c-r09d-pedestrian-circulation-commissioning-seal.md'),
);
const R09C_MANIFEST_PATH =
  'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json';
const R09B_MANIFEST_PATH =
  'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json';
const R09A_MANIFEST_PATH =
  'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json';
const R06_MANIFEST_PATH =
  'data/buildops/combined-zones-r06-support-liner.release-manifest.json';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:polished_andesite',
  'minecraft:polished_diorite',
  'minecraft:deepslate',
  'minecraft:stone',
  'minecraft:gravel',
]);

const EXPECTED = Object.freeze({
  ledgerSha256: 'b6e796571a257bc5d8904e6ae31d1ed58d020ab0af806831feca425a1d285d2e',
  manifestSha256: '0bf16197b564d0b4a54b2513b72487246399175f739510cffc7e06c9a2277e54',
  manifestIdentity: 'eba26411e7076fd30899c891b57677a48e8daba8772897bb998e42f8bf1d58a0',
  sourceBoundReleaseIdentitySha256:
    'e25c7b13d89bc4d8844ab7af9ab82051e9938ef874660ef821d1ea2a0bd32eda',
  completedReleaseIdentitySha256:
    '39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0',
  sourceCompleteSaveSha256:
    'e1cb5bedd1e3418369f180dcaf33f5255e2ba0c1475e98f183a8d1d4ea6703e5',
  sourceRegionSha256:
    '0f9ed0124674574786428a5d1b83350142f4f4b576bfa64a6dbb84a1a8674bdc',
  postCompleteSaveSha256:
    '899e8ce2b42bfa77ec01cbaba9088880a6760d30ff328722ec40958be34582ac',
  postRegionSha256:
    '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
  r09dCount: 16,
  r09dSha256: '656002eadbb3714eab9d99016a59f63ffaf7d1fdce899242219746c7fb32ef01',
  r09cCount: 127,
  r09cSha256: '75520eff49415e09a07fdca1069ad2cdbb6a28168f136861a56e964d75412d3b',
  r09bCount: 1705,
  r09bSha256: '7397619da80fe765bffa55e4698f327597d9f6c2adf8e65ac20b171cd352799c',
  r09aFloorCount: 63,
  r06Count: 1530,
  stairCount: 128,
  clearanceCount: 256,
  containmentCandidateCount: 257,
  containmentCandidateSha256:
    '43798a385667ed963fc7b11cce806589839527e6f0dadc3271c3881140468450',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09D post-release QA rejected: ${message}`);
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
const surfaceKey = ({ x, z }) => `${x},${z}`;

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
    const output = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          output.push({ x: x + dx, y: y + dy, z: z + dz });
        }
      }
    }
    return output;
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
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}

function stateChanges(source, post) {
  const postByKey = new Map(post.map(({ cell, state }) => [cellKey(cell), state]));
  return source.filter(({ cell, state }) => state !== postByKey.get(cellKey(cell))).map((record) => ({
    cell: record.cell,
    sourceState: record.state,
    postState: postByKey.get(cellKey(record.cell)),
  }));
}

function desiredFailures(observed, records) {
  const desired = new Map(records.map(({ cell, targetState }) => [cellKey(cell), targetState]));
  return observed.filter(({ cell, state }) => state !== desired.get(cellKey(cell)));
}

function reachableSurfaceGraph(nodes, starts) {
  const byPoint = new Map(nodes.map((node) => [surfaceKey(node), node]));
  invariant(byPoint.size === nodes.length, 'movement graph contains duplicate horizontal surfaces');
  const reachable = new Set(starts.map(surfaceKey));
  const queue = [...reachable];
  while (queue.length > 0) {
    const current = byPoint.get(queue.shift());
    invariant(current, 'movement graph start is absent');
    for (const candidate of nodes) {
      const key = surfaceKey(candidate);
      if (reachable.has(key)) continue;
      const dx = Math.abs(candidate.x - current.x);
      const dz = Math.abs(candidate.z - current.z);
      if (Math.max(dx, dz) !== 1) continue;
      // Deliberately admit all diagonal moves. This is more permissive than
      // actual corner collision, so a zero result is conservative.
      if (candidate.surfaceY2 - current.surfaceY2 > 2) continue;
      reachable.add(key);
      queue.push(key);
    }
  }
  return nodes.filter((node) => reachable.has(surfaceKey(node)));
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
'ledger/manifest binding drifted');
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
'ledger complete-save binding drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'complete-save intake drifted');
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

const r09cManifest = readJson(R09C_MANIFEST_PATH);
const r09bManifest = readJson(R09B_MANIFEST_PATH);
const r09aManifest = readJson(R09A_MANIFEST_PATH);
const r06Manifest = readJson(R06_MANIFEST_PATH);
const crownPackage = manifest.packages.find(({ key }) => key === 'b07-terminal-crown');
invariant(crownPackage, 'R09D crown package is missing');
const crownForward = parseOperations(crownPackage.forward);
const crownRollback = parseOperations(crownPackage.rollback);
const crown = crownForward.map(({ cell }) => cell);
const r09cRecords = expandedManifestTargets(r09cManifest);
const r09bRecords = expandedManifestTargets(r09bManifest);
const r06Records = expandedManifestTargets(r06Manifest);
const r09aFloor = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -59, maxY: -59,
  minZ: -431, maxZ: -425,
});
invariant(crownForward.length === EXPECTED.r09dCount
  && crownRollback.length === EXPECTED.r09dCount
  && hashCells(crown) === EXPECTED.r09dSha256
  && crownForward.every(({ sourceState, targetState }) => (
    sourceState === 'minecraft:air' && targetState === 'minecraft:polished_andesite'
  ))
  && crownRollback.every((operation, index) => {
    const inverse = crownForward.at(-(index + 1));
    return cellKey(operation.cell) === cellKey(inverse.cell)
      && operation.sourceState === inverse.targetState
      && operation.targetState === inverse.sourceState;
  }), 'R09D operation set or reverse inverse drifted');
invariant(r09cRecords.length === EXPECTED.r09cCount
  && hashCells(r09cRecords.map(({ cell }) => cell)) === EXPECTED.r09cSha256
  && r09bRecords.length === EXPECTED.r09bCount
  && hashCells(r09bRecords.map(({ cell }) => cell)) === EXPECTED.r09bSha256
  && r09aFloor.length === EXPECTED.r09aFloorCount
  && r06Records.length === EXPECTED.r06Count,
'prior release geometry drifted');

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
const cap = cellsIn({
  minX: 2109, maxX: 2109,
  minY: 3, maxY: 5,
  minZ: -429, maxZ: -429,
});
const candidateContainment = uniqueCells([
  ...requiredBarrier,
  { x: 2109, y: 5, z: -429 },
]);
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const coreTop = cellsIn({
  minX: 2104, maxX: 2108,
  minY: 4, maxY: 4,
  minZ: -430, maxZ: -426,
});
const coreInterior = cellsIn({
  minX: 2105, maxX: 2107,
  minY: 4, maxY: 4,
  minZ: -429, maxZ: -427,
});
invariant(stairs.length === EXPECTED.stairCount
  && clearance.length === EXPECTED.clearanceCount
  && candidateContainment.length === EXPECTED.containmentCandidateCount
  && hashCells(candidateContainment) === EXPECTED.containmentCandidateSha256
  && crown.length === 16
  && coreTop.length === 25
  && coreInterior.length === 9,
'combined B07 safety geometry drifted');

const verificationDomain = cubeHalo(uniqueCells([
  ...r09bRecords.map(({ cell }) => cell),
  ...candidateContainment,
  ...crown,
]));
const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const [sourceCrown, postCrown, sourceR09c, postR09c, sourceR09b, postR09b,
  sourceClearance, postClearance, sourceCandidate, postCandidate,
  sourceR09a, postR09a, sourceR06, postR06, sourceDomain, postDomain,
  postCoreTop, postCap] = await Promise.all([
  states(sourceReader, crown), states(postReader, crown),
  states(sourceReader, r09cRecords.map(({ cell }) => cell)),
  states(postReader, r09cRecords.map(({ cell }) => cell)),
  states(sourceReader, r09bRecords.map(({ cell }) => cell)),
  states(postReader, r09bRecords.map(({ cell }) => cell)),
  states(sourceReader, clearance), states(postReader, clearance),
  states(sourceReader, candidateContainment), states(postReader, candidateContainment),
  states(sourceReader, r09aFloor), states(postReader, r09aFloor),
  states(sourceReader, r06Records.map(({ cell }) => cell)),
  states(postReader, r06Records.map(({ cell }) => cell)),
  states(sourceReader, verificationDomain), states(postReader, verificationDomain),
  states(postReader, coreTop), states(postReader, cap),
]);
const sourceCrownFailures = sourceCrown.filter(({ state }) => state !== 'minecraft:air');
const postCrownFailures = postCrown.filter(({ state }) => state !== 'minecraft:polished_andesite');
const r09cSourceFailures = desiredFailures(sourceR09c, r09cRecords);
const r09cPostFailures = desiredFailures(postR09c, r09cRecords);
const r09cChanges = stateChanges(sourceR09c, postR09c);
const r09bSourceFailures = desiredFailures(sourceR09b, r09bRecords);
const r09bPostFailures = desiredFailures(postR09b, r09bRecords);
const r09bChanges = stateChanges(sourceR09b, postR09b);
const clearanceFailures = postClearance.filter(({ state }) => !AIR_STATES.has(state));
const clearanceChanges = stateChanges(sourceClearance, postClearance);
const r09aChanges = stateChanges(sourceR09a, postR09a);
const r06Changes = stateChanges(sourceR06, postR06);
const domainChanges = stateChanges(sourceDomain, postDomain);
const crownKeys = new Set(crown.map(cellKey));
const undeclaredDomainChanges = domainChanges.filter(({ cell }) => !crownKeys.has(cellKey(cell)));

const postCandidateByKey = new Map(postCandidate.map(({ cell, state }) => [cellKey(cell), state]));
const sourceCandidateByKey = new Map(sourceCandidate.map(({ cell, state }) => [cellKey(cell), state]));
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
  const contained = (lowerSolid && upperSolid)
    || (!lowerSolid && upperSolid && availableHeight < 1.8);
  if (!contained) {
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
const controlledPreserved = controlledOverhangs.length === 1
  && sourceCandidateByKey.get(cellKey(controlled.gap)) === 'minecraft:air'
  && postCandidateByKey.get(cellKey(controlled.gap)) === 'minecraft:air'
  && sourceCandidateByKey.get(cellKey(controlled.overhang)) === 'minecraft:gravel'
  && postCandidateByKey.get(cellKey(controlled.overhang)) === 'minecraft:gravel';
const coreTopFailures = postCoreTop.filter(({ state }) => state !== 'minecraft:polished_andesite');
const capFailures = postCap.filter(({ state }) => state !== 'minecraft:polished_diorite');

const terminalRoute = stairs.filter(({ surfaceY2 }) => surfaceY2 >= 8);
const routeSurfaces = terminalRoute.map(({ cell, surfaceY2, index }) => ({
  ...cell,
  surfaceY2,
  role: 'route',
  index,
}));
const sourceCoreSurfaces = coreTop.map((cell) => ({
  ...cell,
  surfaceY2: 10,
  role: 'core',
}));
const crownSurfaces = crown.map((cell) => ({
  ...cell,
  surfaceY2: 12,
  role: 'crown',
}));
const interiorSurfaces = coreInterior.map((cell) => ({
  ...cell,
  surfaceY2: 10,
  role: 'core-interior',
}));
const capSurfaces = [{ x: 2109, y: 5, z: -429, surfaceY2: 12, role: 'cap' }];
const terminalOuterSurfaces = uniqueCells(terminalRoute.map(({ outer }) => ({
  x: outer.x,
  y: outer.y + 2,
  z: outer.z,
}))).filter((cell) => surfaceKey(cell) !== surfaceKey(capSurfaces[0])).map((cell) => ({
  ...cell,
  surfaceY2: 12,
  role: 'outer-barrier',
}));
const sourceGraph = [...routeSurfaces, ...sourceCoreSurfaces, ...capSurfaces];
const postGraph = [
  ...routeSurfaces,
  ...crownSurfaces,
  ...interiorSurfaces,
  ...capSurfaces,
  ...terminalOuterSurfaces,
];
const reachableBefore = reachableSurfaceGraph(sourceGraph, routeSurfaces);
const reachableAfter = reachableSurfaceGraph(postGraph, routeSurfaces);
const reachableForbiddenBefore = reachableBefore.filter(({ role }) => role !== 'route');
const reachableForbiddenAfter = reachableAfter.filter(({ role }) => role !== 'route');
const directCoreEntryEdgesBefore = routeSurfaces.flatMap((route) => sourceCoreSurfaces.filter((core) => (
  Math.max(Math.abs(route.x - core.x), Math.abs(route.z - core.z)) <= 1
  && core.surfaceY2 - route.surfaceY2 <= 2
)).map((core) => ({ route, core })));
const directForbiddenEntryEdgesAfter = routeSurfaces.flatMap((route) => (
  postGraph.filter(({ role }) => role !== 'route').filter((surface) => (
    Math.max(Math.abs(route.x - surface.x), Math.abs(route.z - surface.z)) <= 1
    && surface.surfaceY2 - route.surfaceY2 <= 2
  )).map((surface) => ({ route, surface }))
));

const executionPath = path.join(EVIDENCE_DIR, 'b07-terminal-crown.forward-execution.json');
const rollbackPath = path.join(
  EVIDENCE_DIR,
  'b07-terminal-crown.rollback-poststate-preflight.json',
);
const blockEntityPath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const liveEntityPath = path.join(EVIDENCE_DIR, 'live-entity-clearance.json');
const sameMomentEntityPath = path.join(
  EVIDENCE_DIR,
  'b07-terminal-crown.same-moment-entity-clearance.json',
);
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPath);
const blockEntity = readJson(blockEntityPath);
const liveEntity = readJson(liveEntityPath);
const sameMomentEntity = readJson(sameMomentEntityPath);
const strictExecutionPassed = execution.status === 'complete'
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.operationSha256 === ledger.packages[0].forward.sha256
  && execution.successfulGroups === EXPECTED.r09dCount
  && execution.successfulCommands === EXPECTED.r09dCount
  && execution.failedGroups === 0
  && execution.failedCommands === 0
  && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allRequiredChunksLoadedBeforeCommands === true
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true
  && sha256(fs.readFileSync(execution.streamJournal)) === execution.streamJournalSha256;
const rollbackPassed = rollbackPreflight.status === 'PASS'
  && rollbackPreflight.passed === EXPECTED.r09dCount
  && rollbackPreflight.failed === 0
  && rollbackPreflight.opsSha256 === ledger.packages[0].rollback.sha256
  && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256;
const entityContainmentPassed = blockEntity.status === 'PASS'
  && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS'
  && liveEntity.totals?.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS'
  && sameMomentEntity.totals?.blockingEntityHits === 0;

const checks = [
  ['R09D-QA-01-TERMINAL-IDENTITY', true],
  ['R09D-QA-02-EXACT-REVERSE-ORDER-INVERSE', true],
  ['R09D-QA-03-EXACT-16-SOURCE-AIR', sourceCrownFailures.length === 0],
  ['R09D-QA-04-EXACT-16-POST-CROWN', postCrownFailures.length === 0],
  ['R09D-QA-05-R09C-127-PRESERVED',
    r09cSourceFailures.length === 0 && r09cPostFailures.length === 0 && r09cChanges.length === 0],
  ['R09D-QA-06-R09B-1705-PRESERVED',
    r09bSourceFailures.length === 0 && r09bPostFailures.length === 0 && r09bChanges.length === 0],
  ['R09D-QA-07-HEADROOM-256-PRESERVED',
    clearanceFailures.length === 0 && clearanceChanges.length === 0],
  ['R09D-QA-08-ALL-128-STAIRS-CONTAINED', containmentFailures.length === 0],
  ['R09D-QA-09-CONTROLLED-GRAVEL-OVERHANG-PRESERVED', controlledPreserved],
  ['R09D-QA-10-COMPLETE-CROWN-CORE-AND-CAP',
    coreTopFailures.length === 0 && capFailures.length === 0],
  ['R09D-QA-11-ALL-DIAGONALS-BEFORE-GRAPH-DETECTS-BYPASS',
    directCoreEntryEdgesBefore.length === 11 && reachableForbiddenBefore.length === 26],
  ['R09D-QA-12-ALL-DIAGONALS-POST-GRAPH-ZERO-FORBIDDEN-REACHABILITY',
    directForbiddenEntryEdgesAfter.length === 0 && reachableForbiddenAfter.length === 0],
  ['R09D-QA-13-ZERO-UNDECLARED-LOCAL-DRIFT',
    domainChanges.length === EXPECTED.r09dCount && undeclaredDomainChanges.length === 0],
  ['R09D-QA-14-R09A-FLOOR-PRESERVED', r09aChanges.length === 0],
  ['R09D-QA-15-R06-TREATMENT-PRESERVED', r06Changes.length === 0],
  ['R09D-QA-16-STRICT-JOURNALED-EXECUTION', strictExecutionPassed],
  ['R09D-QA-17-ROLLBACK-POSTSTATE', rollbackPassed],
  ['R09D-QA-18-ENTITY-AND-BLOCK-ENTITY-CONTAINMENT', entityContainmentPassed],
  ['R09D-QA-19-COMMISSIONING-SCOPE-REMAINS-CAPPED',
    manifest.scope.operationalBoundary.wetZoneLiftSmokePowerDrainageTouched === false],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `post-release checks failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09BCD_B07_PEDESTRIAN_ROUTE_COMMISSIONABLE_TO_RETAINED_UPPER_HOLD',
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
    r09cContainmentCandidate: classManifest(candidateContainment),
    r09dTerminalCrown: classManifest(crown),
    coreTop: classManifest(coreTop),
    coreInterior: classManifest(coreInterior),
    retainedCap: classManifest(cap),
    headClearance: classManifest(clearance),
    verificationDomain: classManifest(verificationDomain),
    r09bOperatedUnion: classManifest(r09bRecords.map(({ cell }) => cell)),
    r09cOperatedUnion: classManifest(r09cRecords.map(({ cell }) => cell)),
    r09aFloor: classManifest(r09aFloor),
    r06OperatedUnion: classManifest(r06Records.map(({ cell }) => cell)),
  },
  exactState: {
    sourceCrownCensus: stateCensus(sourceCrown),
    postCrownCensus: stateCensus(postCrown),
    sourceMatchingCellCount: crown.length - sourceCrownFailures.length,
    sourceMismatchCount: sourceCrownFailures.length,
    postMatchingCellCount: crown.length - postCrownFailures.length,
    postMismatchCount: postCrownFailures.length,
    exactReverseOrderInverse: true,
  },
  preservation: {
    r09c: {
      sourceStateSetSha256: stateSetSha256(sourceR09c),
      postStateSetSha256: stateSetSha256(postR09c),
      unchangedCellCount: r09cRecords.length - r09cChanges.length,
      changedCellCount: r09cChanges.length,
      desiredStateMismatchCount: r09cPostFailures.length,
    },
    r09b: {
      sourceStateSetSha256: stateSetSha256(sourceR09b),
      postStateSetSha256: stateSetSha256(postR09b),
      unchangedCellCount: r09bRecords.length - r09bChanges.length,
      changedCellCount: r09bChanges.length,
      desiredStateMismatchCount: r09bPostFailures.length,
    },
    r09aFloor: {
      unchangedCellCount: r09aFloor.length - r09aChanges.length,
      changedCellCount: r09aChanges.length,
    },
    r06: {
      unchangedCellCount: r06Records.length - r06Changes.length,
      changedCellCount: r06Changes.length,
    },
  },
  containment: {
    candidateStateCensus: stateCensus(postCandidate),
    containedStairPositionCount: stairs.length - containmentFailures.length,
    uncontainedStairPositionCount: containmentFailures.length,
    controlledLowClearanceOverhangCount: controlledOverhangs.length,
    controlledLowClearanceOverhang: controlled,
    headClearanceAirCellCount: clearance.length - clearanceFailures.length,
    headClearanceMismatchCount: clearanceFailures.length,
  },
  reachability: {
    model:
      'CONSERVATIVE_EIGHT_NEIGHBOUR_PLAYER_SURFACE_GRAPH_WITH_ONE_BLOCK_MAX_RISE_AND_ALL_DIAGONALS_ADMITTED',
    diagonalPolicy: 'ADMIT_ALL_DIAGONALS_AS_CONSERVATIVE_OVER_APPROXIMATION',
    sourceGraphNodeCount: sourceGraph.length,
    postGraphNodeCount: postGraph.length,
    terminalRouteSurfaceCount: routeSurfaces.length,
    directCoreEntryEdgeCountBeforeCrown: directCoreEntryEdgesBefore.length,
    reachableForbiddenSurfaceCountBeforeCrown: reachableForbiddenBefore.length,
    directForbiddenEntryEdgeCountAfterCrown: directForbiddenEntryEdgesAfter.length,
    reachableForbiddenSurfaceCountAfterCrown: reachableForbiddenAfter.length,
    reachableForbiddenSurfacesAfterCrown: reachableForbiddenAfter,
    crownMinimumRiseAboveLandingHalfBlocks: 4,
    noCoreCapOrBarrierBypass: reachableForbiddenAfter.length === 0,
  },
  drift: {
    verificationDomainChangedCellCount: domainChanges.length,
    declaredCrownChangedCellCount: domainChanges.length - undeclaredDomainChanges.length,
    undeclaredChangedCellCount: undeclaredDomainChanges.length,
  },
  executionEvidence: {
    strictForwardExecution: {
      ...fileBinding(executionPath),
      operationSha256: execution.operationSha256,
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      unknownReplyCommands: execution.unknownReplyCommands,
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
      sameMomentEntityEvidence: fileBinding(sameMomentEntityPath),
      passed: entityContainmentPassed,
    },
  },
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    exactCrownCellCount: crown.length,
    preservedR09cCellCount: r09cRecords.length - r09cChanges.length,
    preservedR09bCellCount: r09bRecords.length - r09bChanges.length,
    containedStairPositionCount: stairs.length - containmentFailures.length,
    headClearanceAirCellCount: clearance.length - clearanceFailures.length,
    reachableForbiddenSurfaceCount: reachableForbiddenAfter.length,
    undeclaredChangeCount: undeclaredDomainChanges.length,
    rollbackGuardPassCount: rollbackPreflight.passed,
    routeCommissionableToRetainedUpperHold: true,
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
  status: 'COMMISSIONED_R09BCD_B07_PEDESTRIAN_CIRCULATION_TO_RETAINED_UPPER_HOLD',
  releaseNodeId: ledger.releaseNodeId,
  canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  postQaPayloadSha256: report.qaPayloadSha256,
  commissionedRoute: {
    from: 'R09A-B07-LOWER-LOBBY',
    via: 'R09B-128-CELL-HALF-STEP-SPIRAL-WITH-R09C-CONTAINMENT',
    to: 'R09C-RETAINED-UPPER-HOLD-BEHIND-R09D-CROWN',
    containedStairPositionCount: stairs.length,
    headClearanceAirCellCount: clearance.length,
    reachableForbiddenCoreOrCapSurfaceCount: reachableForbiddenAfter.length,
    terminalHoldBypassable: false,
  },
  holdDisposition: {
    liftedHoldId: 'R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER',
    clearedRemediationIds: [
      'R09C-OUTER-FALL-CONTAINMENT',
      'R09D-UPPER-CORE-CROWN',
    ],
    liftedOnlyFor: 'PEDESTRIAN_CIRCULATION_FROM_LOWER_LOBBY_TO_RETAINED_UPPER_HOLD',
    remainsClosedBeyondUpperHold: true,
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
const markdown = `# CZ-R09D B07 terminal crown post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  \n`
  + `**QA payload identity:** \`${report.qaPayloadSha256}\`\n\n`
  + `All ${crown.length} R09D crown cells match polished andesite. All ${r09cRecords.length} R09C containment states, ${r09bRecords.length} R09B stair/core states, and ${clearance.length} headroom cells are preserved. Every ${stairs.length} stair position remains collision-contained.\n\n`
  + `The strengthened movement graph admits every diagonal and still reaches zero forbidden core, crown, cap, or outer-barrier surfaces from the terminal route; it detected ${reachableForbiddenBefore.length} reachable forbidden surfaces in the pre-crown geometry. Local source/post drift is exactly the ${crown.length}-cell crown. Strict execution and all ${rollbackPreflight.passed} rollback guards pass.\n\n`
  + `Pedestrian circulation is commissionable only from the lower lobby to the retained upper hold. Wet-zone, lift, smoke, power, drainage/outfall, and upper-opening scopes remain closed. This QA performed no live mutation.\n`;
const sealMarkdown = `# R09B+C+D B07 pedestrian circulation commissioning seal\n\n`
  + `**Status:** ${seal.status}  \n`
  + `**Seal identity:** \`${seal.commissioningSealSha256}\`  \n`
  + `**Post-QA identity:** \`${report.qaPayloadSha256}\`\n\n`
  + `The R09B fall-protection and terminal-barrier hold is lifted only for pedestrian circulation from the accepted lower lobby, along the 128-cell half-step spiral with R09C containment, to the retained upper hold protected by the R09D crown. All ${stairs.length} positions are contained, all ${clearance.length} clearance cells are air, and the conservative all-diagonals graph finds zero hold bypasses.\n\n`
  + `No passage beyond the upper hold is commissioned. Wet-zone, lift, smoke, power, drainage/outfall, upper shaft, and surface opening remain closed and outside this seal.\n`;
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
  exactCrownCellCount: report.summary.exactCrownCellCount,
  preservedR09cCellCount: report.summary.preservedR09cCellCount,
  preservedR09bCellCount: report.summary.preservedR09bCellCount,
  containedStairPositionCount: report.summary.containedStairPositionCount,
  headClearanceAirCellCount: report.summary.headClearanceAirCellCount,
  reachableForbiddenSurfaceCount: report.summary.reachableForbiddenSurfaceCount,
  undeclaredChangeCount: report.summary.undeclaredChangeCount,
  rollbackGuardPassCount: report.summary.rollbackGuardPassCount,
}, null, 2));
