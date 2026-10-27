#!/usr/bin/env node
/** Independent read-only post-release QA and bounded commissioning seal for CZ-R11K. */

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
  canonicalSurface,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T04:50:00Z');
const LEDGER_INPUT = value(
  '--ledger',
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/evidence-ledger.json',
);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-post-release-qa.json',
);
const MD_OUT = value(
  '--md-out',
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-post-release-qa.md',
);
const SEAL_OUT = value(
  '--seal-out',
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-bounded-at-grade-commissioning-seal.json',
);
const SEAL_MD_OUT = value(
  '--seal-md-out',
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/r11k-bounded-at-grade-commissioning-seal.md',
);
const CANONICAL_LEDGER =
  'data/world-review/combined-zones-r11k-live-20260822T043931Z/evidence-ledger.json';
const EVIDENCE_DIR = path.dirname(CANONICAL_LEDGER);
const CANONICAL_QA = `${EVIDENCE_DIR}/r11k-post-release-qa.json`;
const MANIFEST =
  'data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.release-manifest.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const R11J_QA =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-post-release-qa.json';
const R11J_SEAL =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/r11j-bridge-commissioning-seal.json';
const SCOPES = [
  { key: 'c1-west-at-grade-1142-1145', start: 1142, end: 1145 },
  { key: 'c1-west-at-grade-1172', start: 1172, end: 1172 },
];
const EXPECTED = Object.freeze({
  manifestSha256:
    '626492caa4467beae7240f6dae106adebe4618c7e0fa74cd03361920ec81295f',
  manifestIdentity:
    '2ca63578e12f18b1f3086403bae522b7fac16fc7da43b92c88309fa97759182d',
  ledgerSha256:
    '4e1fc6b2175338ed5c0e8f132a8891aaa09a578de4b482ba9ddc626613d63521',
  completedIdentity:
    '21b76f66a745138f0d977585675b9d03aa8ed590c2f2f5ff5f7987993fd28508',
  sourceRoot: 'data/worldsnap-r11k-source-20260822T043931Z',
  postRoot: 'data/worldsnap-r11k-post-20260822T043931Z',
  sourceIdentityFileSha256:
    '6f442c93f2d8c9da55b49cb1cf9397e0dc7458c9a700c415fd59ba427b80ffd5',
  postIdentityFileSha256:
    'ab2fd3dd6a611cb640d345957feeeecba71864c442a53b5ecf6384f275cf4549',
  sourceIntakeSha256:
    '3c2e141b784f2a061d575e2e71bf5ad00d08863237b8fb2108492170411f603a',
  postIntakeSha256:
    'bd64a36696c75c77c33968d82c4caf717be825e03fa31ebefb0fb0905eb98d4a',
  sourceCompleteSaveSha256:
    'e0912106f013af2559b47226d027ec836715e67cd48d11e17472cb7909633ad1',
  postCompleteSaveSha256:
    '5bc1c7f2b3b37ae9d817e14f5116adfe67ec869a7385dc012ff9660498b282d2',
  sourceRegionSha256:
    '5123af922cda00604b412a50fccb648244d65e70d59f1e98883d5e576b12f5da',
  postRegionSha256:
    'e2188c99083a85bf61757f0bb40e3bb9b97b44a6784a3e6d2b29134ff08dad87',
  targetCount: 336,
  targetHash: 'fa399c790649c52c8d7b7051be63a72f50bbe662184023a596751e60e3683005',
  surfaceCounts: [84, 27],
  foundationCount: 105,
  headroomCutCount: 71,
  fullHeadroomCount: 222,
  leafTransitionCount: 49,
  ownedLogRemovalCount: 2,
  haloCounts: [1370, 513],
  haloHashes: [
    '8987bba35c74e47ac7edcf1aeb2381f4bfc6651f4581cc93de25a66254f52914',
    '27740cbe7843be773a52a71d605cd82b53918e4bb460ff20e70625d00025375a',
  ],
  haloUnionCount: 1883,
  haloUnionHash: '5b548cad659c5292ff23743a8110f31a9b93d8881624f4937f6fe990e6cf73a8',
  priorTargetCount: 8820,
  priorSurfaceCount: 2737,
  priorSurfaceComponentCount: 8,
  combinedSurfaceCount: 2848,
  combinedSurfaceComponentCount: 10,
  journalLineCount: 684,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11K post QA rejected: ${message}`);
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
const leafState = (state) => /_leaves$/.test(blockName(state));
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
function maximumRawPlanAdjacentStep(cells) {
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
function maximumWalkableStep(cells) {
  let maximum = 0;
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) !== 1) continue;
      const step = Math.abs(left.y - right.y);
      if (step <= 1) maximum = Math.max(maximum, step);
    }
  }
  return maximum;
}
function maximumSequentialStep(cells) {
  let maximum = 0;
  for (let index = 1; index < cells.length; index += 1) {
    const previous = cells[index - 1];
    const current = cells[index];
    invariant(Math.max(Math.abs(previous.x - current.x), Math.abs(previous.z - current.z)) <= 1,
      `centerline plan gap at ${previous.station}->${current.station}`);
    maximum = Math.max(maximum, Math.abs(previous.y - current.y));
  }
  return maximum;
}
function interactionHalo(cells) {
  return uniqueCells(cells.flatMap((cell) => {
    const points = [];
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
    return points;
  }));
}
function stepSafeSeamEdgeCount(leftCells, rightCells) {
  let count = 0;
  for (const left of leftCells) for (const right of rightCells) {
    if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) <= 1
      && Math.abs(left.y - right.y) <= 1) count += 1;
  }
  return count;
}

const ledgerBound = readBoundJson(LEDGER_INPUT, EXPECTED.ledgerSha256);
const manifestBound = readBoundJson(MANIFEST, EXPECTED.manifestSha256);
const ledger = ledgerBound.value;
const manifest = manifestBound.value;
const { manifestIdentity, ...manifestPayload } = manifest;
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
  && manifestIdentity === EXPECTED.manifestIdentity
  && manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'ledger/source/post/manifest identity chain drifted');
for (const binding of ledger.evidenceBindings) invariant(
  sha256(fs.readFileSync(absolute(binding.path))) === binding.sha256,
  `${binding.path} ledger evidence binding drifted`,
);

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
const recordsByPackage = new Map();
const rollbackByPackage = new Map();
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
  recordsByPackage.set(pkg.key, forward);
  rollbackByPackage.set(pkg.key, rollback);
}
invariant(records.length === EXPECTED.targetCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetHash,
'target/source/inverse/post union drifted');

const design = readBoundJson(DESIGN).value;
const canonicalSurfaces = SCOPES.map(({ start, end }) => (
  canonicalSurface(design.horizontalAlignment.stations, start, end)
));
const surfaceByScope = SCOPES.map(({ key }, index) => {
  const cells = recordsByPackage.get(key)
    .filter(({ targetState }) => surfaceState(targetState)).map(({ cell }) => cell);
  invariant(cells.length === EXPECTED.surfaceCounts[index]
    && hashCells(cells) === hashCells(canonicalSurfaces[index]),
  `${key} canonical pavement raster drifted`);
  return canonicalSurfaces[index];
});
const surfaces = surfaceByScope.flat();
const routeSpines = surfaceByScope.map((cells) => cells.filter(({ offset }) => (
  Math.abs(offset) <= 1
)));
const centerlines = SCOPES.map(({ start, end }) => (
  design.horizontalAlignment.stations.slice(start, end + 1).map((station, index) => ({
    x: station.x, y: station.highwayReferenceY, z: station.z, station: start + index,
  }))
));
const rawStepTwoPairs = [];
for (let leftIndex = 0; leftIndex < surfaceByScope[0].length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < surfaceByScope[0].length; rightIndex += 1) {
    const left = surfaceByScope[0][leftIndex];
    const right = surfaceByScope[0][rightIndex];
    if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) === 1
      && Math.abs(left.y - right.y) === 2) rawStepTwoPairs.push({ left, right });
  }
}
const surfaceComponentCounts = surfaceByScope.map((cells) => connectedComponents(cells).length);
const walkableSteps = surfaceByScope.map(maximumWalkableStep);
const rawSteps = surfaceByScope.map(maximumRawPlanAdjacentStep);
const routeSpineComponentCounts = routeSpines.map((cells) => connectedComponents(cells).length);
const centerlineSteps = centerlines.map(maximumSequentialStep);
invariant(surfaceComponentCounts.every((count) => count === 1)
  && walkableSteps.every((step) => step <= 1)
  && routeSpineComponentCounts.every((count) => count === 1)
  && centerlineSteps.every((step) => step <= 1)
  && rawStepTwoPairs.length === 1
  && rawStepTwoPairs[0].left.x === 1475 && rawStepTwoPairs[0].left.y === 67
  && rawStepTwoPairs[0].left.z === -197 && rawStepTwoPairs[0].left.station === 1142
  && rawStepTwoPairs[0].left.offset === -5
  && rawStepTwoPairs[0].right.x === 1476 && rawStepTwoPairs[0].right.y === 65
  && rawStepTwoPairs[0].right.z === -198 && rawStepTwoPairs[0].right.station === 1144
  && rawStepTwoPairs[0].right.offset === -4,
'per-scope max-step-one walkability or classified non-route adjacency drifted');

const foundationRecords = records.filter(({ targetState }) => (
  targetState === 'minecraft:stone_bricks'
));
const headroomCutRecords = records.filter(({ targetState }) => isAir(targetState));
const leafRecords = records.filter(({ targetState }) => (
  leafState(targetState) && targetState.includes('persistent=true')
));
const fullHeadroom = uniqueCells(surfaces.flatMap((cell) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
let stableSurfaceCount = 0;
for (const cell of surfaces) {
  const below = await postAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(below) && !isFluid(below)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(below))) stableSurfaceCount += 1;
}
let fullHeadroomAirCount = 0;
for (const cell of fullHeadroom) if (isAir(await postAt(cell))) {
  fullHeadroomAirCount += 1;
}
const firstForward = recordsByPackage.get(SCOPES[0].key);
const firstRollback = rollbackByPackage.get(SCOPES[0].key);
const ownedLogRemovalIndexes = firstForward.map((record, index) => ({ record, index }))
  .filter(({ record }) => blockName(record.sourceState).endsWith('_log')
    && isAir(record.targetState)).map(({ index }) => index);
invariant(foundationRecords.length === EXPECTED.foundationCount
  && headroomCutRecords.length === EXPECTED.headroomCutCount
  && leafRecords.length === EXPECTED.leafTransitionCount
  && fullHeadroom.length === EXPECTED.fullHeadroomCount
  && stableSurfaceCount === surfaces.length
  && fullHeadroomAirCount === fullHeadroom.length
  && firstForward.slice(0, EXPECTED.leafTransitionCount).every(
    ({ targetState }) => leafState(targetState) && targetState.includes('persistent=true'),
  )
  && firstRollback.slice(-EXPECTED.leafTransitionCount).every(
    ({ targetState }) => leafState(targetState) && targetState.includes('persistent=false'),
  )
  && ownedLogRemovalIndexes.length === EXPECTED.ownedLogRemovalCount
  && Math.min(...ownedLogRemovalIndexes) >= EXPECTED.leafTransitionCount,
'foundation/headroom/leaf stabilization outcome or ordering drifted');

const halos = manifest.packages.map((pkg, index) => {
  const halo = interactionHalo(recordsByPackage.get(pkg.key).map(({ cell }) => cell));
  invariant(halo.length === EXPECTED.haloCounts[index]
    && hashCells(halo) === EXPECTED.haloHashes[index],
  `${pkg.key} interaction halo drifted`);
  return halo;
});
const haloUnion = uniqueCells(halos.flat());
let boundedDiffCount = 0;
let boundedOffTargetDiffCount = 0;
let sourceHaloFluidCount = 0;
let postHaloFluidCount = 0;
for (const cell of haloUnion) {
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (sourceState !== postState) {
    boundedDiffCount += 1;
    if (!targetKeys.has(cellKey(cell))) boundedOffTargetDiffCount += 1;
  }
  if (isFluid(sourceState)) sourceHaloFluidCount += 1;
  if (isFluid(postState)) postHaloFluidCount += 1;
}
invariant(haloUnion.length === EXPECTED.haloUnionCount
  && hashCells(haloUnion) === EXPECTED.haloUnionHash
  && boundedDiffCount === EXPECTED.targetCount && boundedOffTargetDiffCount === 0
  && sourceHaloFluidCount === 0 && postHaloFluidCount === 0,
'bounded target/off-target/fluid diff accounting drifted');

const priorTargetKeys = new Set();
const priorSurfaceByKey = new Map();
const priorBindings = [];
for (const binding of manifest.source.priorManifestBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} prior binding drifted`);
  priorBindings.push(binding);
  const priorManifest = JSON.parse(bytes);
  for (const pkg of priorManifest.packages ?? []) for (const record of parseOperations(pkg.forward)) {
    priorTargetKeys.add(cellKey(record.cell));
    if (surfaceState(record.targetState)) priorSurfaceByKey.set(cellKey(record.cell), record.cell);
  }
}
let priorTargetDriftCount = 0;
for (const key of priorTargetKeys) {
  const [x, y, z] = key.split(',').map(Number);
  if (await sourceAt({ x, y, z }) !== await postAt({ x, y, z })) priorTargetDriftCount += 1;
}
const priorSurfaces = [...priorSurfaceByKey.values()];
let priorSurfaceExactPostCount = 0;
for (const cell of priorSurfaces) if (surfaceState(await postAt(cell))) {
  priorSurfaceExactPostCount += 1;
}
const priorSurfaceComponentCount = connectedComponents(priorSurfaces).length;
const newToPriorStepSafeSeamEdgeCount = stepSafeSeamEdgeCount(surfaces, priorSurfaces);
const combinedSurfaces = uniqueCells([...priorSurfaces, ...surfaces]);
const combinedSurfaceComponentCount = connectedComponents(combinedSurfaces).length;
invariant(priorTargetKeys.size === EXPECTED.priorTargetCount
  && priorTargetDriftCount === 0
  && priorSurfaces.length === EXPECTED.priorSurfaceCount
  && priorSurfaceExactPostCount === priorSurfaces.length
  && priorSurfaceComponentCount === EXPECTED.priorSurfaceComponentCount
  && newToPriorStepSafeSeamEdgeCount === 0
  && combinedSurfaces.length === EXPECTED.combinedSurfaceCount
  && combinedSurfaceComponentCount === EXPECTED.combinedSurfaceComponentCount,
'prior R11 preservation or honest closure-effect accounting drifted');

invariant(ledger.stages.length === 24
  && ledger.stages.every(({ status }) => status === 'PASS'),
'wrapper stage chain drifted');
const executionEvidence = [];
let journalLineCount = 0;
for (const [key, expectedCount] of [[SCOPES[0].key, 269], [SCOPES[1].key, 67]]) {
  const executionPath = `${EVIDENCE_DIR}/${key}.forward-execution.json`;
  const rollbackPath = `${EVIDENCE_DIR}/${key}.rollback-poststate-preflight.json`;
  const journalPath = `${executionPath}.stream-journal.jsonl`;
  const sameMomentPath = `${EVIDENCE_DIR}/${key}.same-moment-entity-clearance.json`;
  const execution = readBoundJson(executionPath);
  const rollback = readBoundJson(rollbackPath);
  const sameMoment = readBoundJson(sameMomentPath);
  const journalBytes = fs.readFileSync(absolute(journalPath));
  const journal = journalBytes.toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
  invariant(execution.value.status === 'complete'
    && execution.value.sourceOperationCount === expectedCount
    && execution.value.successfulGroups === expectedCount
    && execution.value.failedGroups === 0
    && execution.value.unexpectedNoopCommands === 0
    && execution.value.worldEditLeftoverCount === 0
    && rollback.value.status === 'PASS' && rollback.value.passed === expectedCount
    && rollback.value.failed === 0
    && sameMoment.value.status === 'PASS'
    && sameMoment.value.totals.blockingEntityHits === 0
    && journal.at(-1)?.status === 'complete'
    && journal.every((entry, index) => entry.sequence === index + 1),
  `${key} execution/journal/rollback/entity evidence drifted`);
  journalLineCount += journal.length;
  executionEvidence.push({
    key,
    execution: { path: executionPath, sha256: sha256(execution.bytes) },
    rollback: { path: rollbackPath, sha256: sha256(rollback.bytes) },
    sameMomentEntityClearance: { path: sameMomentPath, sha256: sha256(sameMoment.bytes) },
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
const r11jQa = readBoundJson(
  R11J_QA, 'b1b3976e8eae9a0729dbab14d0fbde2c02134b080f229db9671559a2cfe86e7f',
);
const r11jSeal = readBoundJson(
  R11J_SEAL, '50a645ed6fca06da4c82f328a4b176ecc0e6b402697496ee611e008b1c8ed215',
);
invariant(r11jQa.value.status === 'PASS'
  && r11jSeal.value.status === 'R11J_BOUNDED_STATIC_HYDRAULIC_ISOLATION_BRIDGE_POST_QA_PASS',
'immediate accepted R11J chain drifted');

const excludedRawContact = {
  left: { x: 1475, y: 67, z: -197, station: 1142, offset: -5 },
  right: { x: 1476, y: 65, z: -198, station: 1144, offset: -4 },
  stationDelta: 2,
  classification: 'CURVE_GENERATED_NON_ROUTE_LATERAL_CONTACT',
  bothOutsideThreeCellRouteSpine: true,
  successiveStationProgression: false,
};
const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'INDEPENDENT_READ_ONLY_R11K_POST_RELEASE_QA',
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
    pavementSurfaceCellCountPerScope: surfaceByScope.map((cells) => cells.length),
    walkableSurfaceComponentCountPerScope: surfaceComponentCounts,
    maximumWalkableSurfaceStepPerScope: walkableSteps,
    routeSpineCellCountPerScope: routeSpines.map((cells) => cells.length),
    routeSpineComponentCountPerScope: routeSpineComponentCounts,
    stationCenterlineCellCountPerScope: centerlines.map((cells) => cells.length),
    stationCenterlineMaximumStepPerScope: centerlineSteps,
    rawPlanAdjacentElevationDeltaPerScope: rawSteps,
    nonRouteTwoBlockLateralContactCount: rawStepTwoPairs.length,
    stableSurfaceCellCount: stableSurfaceCount,
    exactFoundationFillCount: foundationRecords.length,
    headroomCutCount: headroomCutRecords.length,
    fullHeadroomAirCount: fullHeadroomAirCount,
    leafStabilizationTransitionCount: leafRecords.length,
    ownedLogRemovalCount: ownedLogRemovalIndexes.length,
    interactionHaloCellCount: haloUnion.length,
    boundedDiffCount,
    boundedOffTargetDiffCount,
    sourceHaloFluidCount,
    postHaloFluidCount,
    priorR11TargetCellCount: priorTargetKeys.size,
    priorR11TargetDriftCount: priorTargetDriftCount,
    priorR11SurfaceCellCount: priorSurfaces.length,
    priorR11SurfaceComponentCount: priorSurfaceComponentCount,
    newToPriorStepSafeSeamEdgeCount,
    combinedAcceptedSurfaceCellCount: combinedSurfaces.length,
    combinedAcceptedSurfaceComponentCount: combinedSurfaceComponentCount,
    netAcceptedSurfaceComponentDelta: combinedSurfaceComponentCount - priorSurfaceComponentCount,
    ledgerStageCount: ledger.stages.length,
    ledgerFailedStageCount: 0,
    ledgerEvidenceBindingCount: ledger.evidenceBindings.length,
    executionJournalCount: executionEvidence.length,
    executionJournalLineCount: journalLineCount,
    liveEntityBlockingCount: liveEntity.value.totals.blockingEntityHits,
    blockEntityBlockingCount: blockEntity.value.blockingBlockEntityCount,
    liveCallsPerformedByQa: false,
    worldEditsPerformedByQa: false,
  },
  routeUsability: {
    proof: 'SUCCESSIVE_STATION_CENTERLINE_AND_THREE_CELL_SPINE_MAX_STEP_ONE',
    excludedRawPlanAdjacency: excludedRawContact,
  },
  closureEffect: {
    effect: 'TWO_INDEPENDENT_SOURCE_PROVEN_AT_GRADE_ISLANDS_ADDED',
    priorComponentsJoined: 0,
    newIndependentComponents: 2,
    wholeRouteClosureCreated: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    pavementSurfaceCoordinateSetSha256: hashCells(surfaces),
    fullHeadroomCoordinateSetSha256: hashCells(fullHeadroom),
    interactionHaloCoordinateSetSha256: hashCells(haloUnion),
    priorR11TargetCoordinateSetSha256: hashCells([...priorTargetKeys].map((key) => {
      const [x, y, z] = key.split(',').map(Number);
      return { x, y, z };
    })),
    combinedAcceptedSurfaceCoordinateSetSha256: hashCells(combinedSurfaces),
  },
  acceptedChain: {
    r11jQa: { path: R11J_QA, sha256: sha256(r11jQa.bytes) },
    r11jSeal: { path: R11J_SEAL, sha256: sha256(r11jSeal.bytes) },
  },
  priorR11Bindings: priorBindings,
  executionEvidence,
  acceptance: {
    exactPhysicalStateAccepted: true,
    exactRollbackReady: true,
    perScopeStepSafeWalkabilityAccepted: true,
    foundationHeadroomLeafStabilizationAccepted: true,
    acceptedPriorR11ChainPreserved: true,
    boundedOffTargetDriftAbsent: true,
    wholeRouteCommissioned: false,
    hydraulicDrainageRailUtilityCommissioned: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, qaPayloadSha256 };
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'R11K_BOUNDED_DISJOINT_AT_GRADE_POST_QA_PASS',
  releaseId: manifest.scope.releaseId,
  releaseNodeId: manifest.releaseNodeId,
  qa: { path: CANONICAL_QA, qaPayloadSha256 },
  completedReleaseIdentitySha256: EXPECTED.completedIdentity,
  acceptedGeometry: {
    targetCellCount: records.length,
    surfaceCellCountPerScope: surfaceByScope.map((cells) => cells.length),
    maximumWalkableStepPerScope: walkableSteps,
    stableSurfaceCellCount: stableSurfaceCount,
    foundationCellCount: foundationRecords.length,
    fullHeadroomCellCount: fullHeadroom.length,
    leafStabilizationCellCount: leafRecords.length,
  },
  acceptedClosureEffect: withoutIdentity.closureEffect,
  nonClaims: [
    'whole C1 corridor commissioning', 'public route commissioning',
    'hydraulic or drainage commission', 'rail or utility commission',
    'connection of either bounded island to an accepted neighboring surface',
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
fs.writeFileSync(absolute(MD_OUT), `# R11K post-release QA\n\nStatus: **PASS**\n\nAll ${records.length} targets and inverse guards match the immutable source/post pair. The stations-1142..1145 and station-1172 surfaces contain ${surfaceByScope[0].length} and ${surfaceByScope[1].length} cells; each is one max-step-one walkable component with a connected route spine, ${stableSurfaceCount}/${surfaces.length} stable contacts, and ${fullHeadroomAirCount}/${fullHeadroom.length} clear headroom cells. The exact foundation and persistent-leaf stabilization outcomes are retained.\n\nThe single raw elevation-delta-two contact is the already classified curve-generated lateral contact between station 1142 offset -5 and station 1144 offset -4. It is outside the route spine and not a successive-station progression edge. The exact ${haloUnion.length.toLocaleString('en-US')}-cell sparse halo contains only the ${boundedDiffCount} declared changes, with zero off-target or fluid drift. All ${priorTargetKeys.size.toLocaleString('en-US')} prior R11 target cells remain source/post identical.\n\nClosure effect is deliberately bounded: this release adds two independently usable at-grade pavement islands and joins zero prior components. It does not close or commission the full C1 route.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed by QA.\n`);
fs.writeFileSync(absolute(SEAL_MD_OUT), `# R11K bounded at-grade commissioning seal\n\nStatus: **${seal.status}**\n\nThe two exact disjoint at-grade scopes are physically accepted with max-step-one local walkability and exact rollback readiness. They remain two independent pavement components; no whole-route, hydraulic, drainage, rail, or utility commission is claimed.\n\nSeal payload: \`${sealPayloadSha256}\`.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  seal: SEAL_OUT,
  qaPayloadSha256,
  sealPayloadSha256,
  checks: report.checks,
}, null, 2));
