#!/usr/bin/env node
/**
 * Independent read-only audit of the compensated CZ-R11H recovery.
 *
 * This deliberately separates the exact sparse operated halo, the exact
 * generic hydraulic-review halo, and the enclosing broad screening box. The
 * broad box is not mislabeled as the 7,120-cell operated halo.
 */

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
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T03:20:00Z');
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.json',
);
const MD_PATH = value(
  '--md-out',
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.md',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const LEDGER_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/evidence-ledger.json';
const SOURCE_ROOT = 'data/worldsnap-r11h-source-20260822T031103Z';
const RECOVERY_ROOT = 'data/worldsnap-r11h-post-20260822T031103Z';
const SOURCE_INTAKE_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/source-complete-save-intake.json';
const RECOVERY_INTAKE_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/rollback-recovery-complete-save-intake.json';
const LIVE_ENTITY_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/live-entity-clearance.json';
const BLOCK_ENTITY_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/block-entity-clearance.json';
const STRUCTURE_FORWARD_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/c1-bridge-1189-1206-structure.forward-execution.json';
const STRUCTURE_COMPENSATION_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/c1-bridge-1189-1206-structure.compensating-rollback-execution.json';
const DEPENDENCY_COMPENSATION_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/c1-bridge-1189-1206-dependencies.compensating-rollback-execution.json';
const RECOVERY_PREFLIGHT_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/c1-bridge-1189-1206-structure.rollback-recovery-source-preflight.json';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const LIFECYCLE_POINTS = [
  { x: 1529, y: 68, z: -251 },
  { x: 1540, y: 68, z: -238 },
];
const SOURCE_BLOCK_POINTS = [
  { x: 1525, y: 42, z: -232, state: 'minecraft:water[level=0]' },
  { x: 1525, y: 51, z: -232, state: 'minecraft:lava[level=0]' },
];
const BROAD_BOX = Object.freeze({
  minX: 1513, maxX: 1552, minY: 33, maxY: 71, minZ: -255, maxZ: -217,
});
const EXPECTED = Object.freeze({
  manifestSha256:
    'b8259982d8e272c953f904248b276bf415449038b805604173962d49cb699f31',
  manifestIdentity:
    'f588ddca7596ce8f5305ebf51a3df149cfff5b67dcc629730f49b94cecaabc2a',
  ledgerSha256:
    'b7a94c77600e772dee3a9d8873ef9dd25de2a9940a82aac905fa5c1524d5bfbc',
  sourceIntakeSha256:
    '2bd12d58c47c3be93842dbe27a8898aa6100efdfa5ffa6e15928b92b3dde557e',
  recoveryIntakeSha256:
    '0086f0acf2c4a7d33aa9c5345f3429c68e080dc7da4017ae3e0d8308b27f211c',
  liveEntitySha256:
    'ad1d415304376a02bd56d19c5283a98dc8bf2f28daefdb74fa88b30b4b0a40b7',
  blockEntitySha256:
    '8efc3c6bc2e403fd86bf182da23be383ced373ac8cc9016c0bd7aa12b26e86b0',
  structureForwardSha256:
    '63476701de4f42181eab8d8243a16ec4b119cb998deb0564d9bf77fbb4833242',
  structureCompensationSha256:
    '5d8386ba0549e0820c3e648d8ba1fa33b1ae37056f2f1f4e7abd9103ed311ac5',
  dependencyCompensationSha256:
    '5d6158ae1ba944a7e6d88ad07280d1ea15016abf2a1a1a145f4709682000559a',
  recoveryPreflightSha256:
    '5de8f9b5f3e855d8cf9e219034affce1b08571a1b4ed8f3769e94a19a689fa07',
  sourceCompleteSaveSha256:
    '4cc235b52b9aae39b9318615599ba114ec5437750449b30cd516b0077b9ccfc0',
  recoveryCompleteSaveSha256:
    '8cd29097ffa225153be988eb0761639e45eb5ea3964e12e862f6d99bf7e333fe',
  sourceRegionSha256:
    'c2205b9f070f133929b4ce9c97f72b25561153bc59b44d9cc636de11cb57063b',
  recoveryRegionSha256:
    '6a57df64e02304baef7d4841c06de3a5aaa54ae31a1459e4abcb53772c93e223',
  targetCount: 1666,
  targetHash: 'ef89661a02a5544a093255ada780e8037200f2b9aa0cd421d30c7bd1fedcf129',
  operatedHaloCount: 7120,
  operatedHaloHash: '135352f855481660e8e5de62bd46908a2c6e26ecddc6546440ecfc445aabfb28',
  genericHaloCount: 7561,
  sourceRetainedFluidCount: 28,
  sourceRetainedFluidHash:
    'f28a6e164919f74ffdc1c08850bf8cee4b5529413196d8f0c8d9c9b4a7085b11',
  recoveryRetainedFluidCount: 45,
  recoveryRetainedFluidHash:
    'ed82013dae3ec27a4b79c8577554279c91b51668795bb952c54a680ce0225df8',
  broadCellCount: 60840,
  broadDiffCount: 53,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H recovery audit rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const readBoundJson = (filename, expected) => {
  const bytes = fs.readFileSync(absolute(filename));
  invariant(sha256(bytes) === expected, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
const stateCensus = (records, field) => Object.fromEntries([...records.reduce(
  (map, record) => map.set(record[field], (map.get(record[field]) ?? 0) + 1),
  new Map(),
).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));

function parseOperations(filename) {
  const result = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    result.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return result;
}

function faceComponents(records) {
  const byKey = new Map(records.map((record) => [cellKey(record.cell), record]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  const face = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  while (unvisited.size) {
    const seed = unvisited.values().next().value;
    unvisited.delete(seed);
    const pending = [seed];
    const component = [];
    while (pending.length) {
      const key = pending.pop();
      const current = byKey.get(key);
      component.push(current);
      for (const [dx, dy, dz] of face) {
        const neighbour = `${current.cell.x + dx},${current.cell.y + dy},${current.cell.z + dz}`;
        if (unvisited.delete(neighbour)) pending.push(neighbour);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}

const manifestBound = readBoundJson(MANIFEST_PATH, EXPECTED.manifestSha256);
const ledgerBound = readBoundJson(LEDGER_PATH, EXPECTED.ledgerSha256);
const sourceIntakeBound = readBoundJson(SOURCE_INTAKE_PATH, EXPECTED.sourceIntakeSha256);
const recoveryIntakeBound = readBoundJson(RECOVERY_INTAKE_PATH, EXPECTED.recoveryIntakeSha256);
const liveEntityBound = readBoundJson(LIVE_ENTITY_PATH, EXPECTED.liveEntitySha256);
const blockEntityBound = readBoundJson(BLOCK_ENTITY_PATH, EXPECTED.blockEntitySha256);
const structureForwardBound = readBoundJson(
  STRUCTURE_FORWARD_PATH, EXPECTED.structureForwardSha256,
);
const structureCompensationBound = readBoundJson(
  STRUCTURE_COMPENSATION_PATH, EXPECTED.structureCompensationSha256,
);
const dependencyCompensationBound = readBoundJson(
  DEPENDENCY_COMPENSATION_PATH, EXPECTED.dependencyCompensationSha256,
);
const recoveryPreflightBound = readBoundJson(
  RECOVERY_PREFLIGHT_PATH, EXPECTED.recoveryPreflightSha256,
);
const manifest = manifestBound.value;
const ledger = ledgerBound.value;
const sourceIntake = sourceIntakeBound.value;
const recoveryIntake = recoveryIntakeBound.value;
const liveEntity = liveEntityBound.value;
const blockEntity = blockEntityBound.value;
const structureForward = structureForwardBound.value;
const structureCompensation = structureCompensationBound.value;
const dependencyCompensation = dependencyCompensationBound.value;
const recoveryPreflight = recoveryPreflightBound.value;

invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && ledger.transactionId === manifest.transactionId
  && ledger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && samePath(ledger.sourceSnapshot.root, SOURCE_ROOT),
'failed-attempt manifest/ledger disposition drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && samePath(sourceIntake.input.suppliedWorldRoot, SOURCE_ROOT)
  && recoveryIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && recoveryIntake.packageIdentity.completeSaveSha256
    === EXPECTED.recoveryCompleteSaveSha256
  && samePath(recoveryIntake.input.suppliedWorldRoot, RECOVERY_ROOT),
'source/recovery complete-save identity drifted');
invariant(liveEntity.status === 'PASS'
  && liveEntity.totals.packages === 2 && liveEntity.totals.blockingEntityHits === 0
  && blockEntity.status === 'PASS' && blockEntity.operationCount === EXPECTED.targetCount
  && blockEntity.blockingBlockEntityCount === 0,
'failed-attempt entity/block-entity gates drifted');
invariant(structureForward.status === 'failed'
  && structureForward.successfulGroups === 903 && structureForward.failedGroups === 1
  && structureForward.unexpectedNoopCommands === 1
  && structureForward.groupFailures[0].line === 909
  && structureCompensation.status === 'complete'
  && structureCompensation.successfulGroups === 1663
  && structureCompensation.failedGroups === 0
  && dependencyCompensation.status === 'complete'
  && dependencyCompensation.successfulGroups === 3
  && dependencyCompensation.failedGroups === 0
  && recoveryPreflight.status === 'FAIL' && recoveryPreflight.failures.length === 2,
'strict failure/compensation/recovery evidence drifted');

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
    `${pkg.key} is not reverse exact at ${index}`);
    invariant(!targetKeys.has(cellKey(record.cell)), `duplicate target ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
  }
}
invariant(records.length === EXPECTED.targetCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetHash,
'target union drifted');
const operatedHalo = uniqueCells(records.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
invariant(operatedHalo.length === EXPECTED.operatedHaloCount
  && hashCells(operatedHalo) === EXPECTED.operatedHaloHash,
'exact sparse operated halo drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const recoveryReader = new AnvilReader(absolute(path.join(RECOVERY_ROOT, 'region')));
const sourceEntityReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'entities')));
const recoveryEntityReader = new AnvilReader(absolute(path.join(RECOVERY_ROOT, 'entities')));
const stateAt = async (reader, cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const diffSet = async (cells) => {
  const diffs = [];
  const sourceFluids = [];
  const recoveryFluids = [];
  for (const cell of cells) {
    const [sourceState, recoveryState] = await Promise.all([
      stateAt(sourceReader, cell), stateAt(recoveryReader, cell),
    ]);
    if (sourceState !== recoveryState) diffs.push({
      cell, sourceState, recoveryState, operatedTarget: targetKeys.has(cellKey(cell)),
    });
    if (isFluid(sourceState)) sourceFluids.push({ cell, state: sourceState });
    if (isFluid(recoveryState)) recoveryFluids.push({ cell, state: recoveryState });
  }
  return { diffs, sourceFluids, recoveryFluids };
};

const operatedComparison = await diffSet(operatedHalo);
const expectedLifecycleDiffs = LIFECYCLE_POINTS.map((cell) => ({
  cell,
  sourceState: 'minecraft:dirt',
  recoveryState: 'minecraft:grass_block[snowy=false]',
  operatedTarget: true,
})).sort((left, right) => cellKey(left.cell).localeCompare(cellKey(right.cell)));
const sortedOperatedDiffs = operatedComparison.diffs.slice().sort(
  (left, right) => cellKey(left.cell).localeCompare(cellKey(right.cell)),
);
invariant(JSON.stringify(sortedOperatedDiffs) === JSON.stringify(expectedLifecycleDiffs)
  && operatedComparison.sourceFluids.length === 0
  && operatedComparison.recoveryFluids.length === 0,
'exact operated halo has a non-lifecycle or fluid delta');

const c1 = JSON.parse(fs.readFileSync(absolute(C1_DESIGN), 'utf8'));
const generic = await analyzeIsland({
  key: 'r11h-recovery-hydraulic-review', start: 1189, end: 1206,
  stations: c1.horizontalAlignment.stations,
  reader: sourceReader,
  priorTargetKeys: new Set(),
});
invariant(generic.halo.length === EXPECTED.genericHaloCount,
'generic hydraulic-review halo drifted');
const retainedComparison = await diffSet(generic.halo);
const retainedFluidDiffs = retainedComparison.diffs.filter(
  ({ sourceState, recoveryState }) => isFluid(sourceState) || isFluid(recoveryState),
);
invariant(retainedComparison.diffs.length === 29
  && retainedFluidDiffs.length === 27
  && retainedComparison.sourceFluids.length === EXPECTED.sourceRetainedFluidCount
  && hashCells(retainedComparison.sourceFluids.map(({ cell }) => cell))
    === EXPECTED.sourceRetainedFluidHash
  && retainedComparison.recoveryFluids.length === EXPECTED.recoveryRetainedFluidCount
  && hashCells(retainedComparison.recoveryFluids.map(({ cell }) => cell))
    === EXPECTED.recoveryRetainedFluidHash,
'retained hydraulic-review settlement census drifted');
const recoveryRetainedComponents = faceComponents(retainedComparison.recoveryFluids);
invariant(recoveryRetainedComponents.length === 1,
'recovery retained-fluid plane is not one cardinal component');
const minimumRecoveryFluidTargetDistance = Math.min(...retainedComparison.recoveryFluids.flatMap(
  ({ cell }) => records.map(({ cell: target }) => Math.max(
    Math.abs(cell.x - target.x), Math.abs(cell.y - target.y), Math.abs(cell.z - target.z),
  )),
));
invariant(minimumRecoveryFluidTargetDistance === 2,
'recovery retained-fluid baseline enters the operated halo');

const broadCells = [];
for (let x = BROAD_BOX.minX; x <= BROAD_BOX.maxX; x += 1) {
  for (let y = BROAD_BOX.minY; y <= BROAD_BOX.maxY; y += 1) {
    for (let z = BROAD_BOX.minZ; z <= BROAD_BOX.maxZ; z += 1) broadCells.push({ x, y, z });
  }
}
invariant(broadCells.length === EXPECTED.broadCellCount,
'broad screening box cell count drifted');
const broadComparison = await diffSet(broadCells);
const broadFluidDiffs = broadComparison.diffs.filter(
  ({ sourceState, recoveryState }) => isFluid(sourceState) || isFluid(recoveryState),
);
const broadSolidDamage = broadComparison.diffs.filter(({ sourceState, recoveryState }) => (
  !isFluid(sourceState) && !isFluid(recoveryState)
    && !(sourceState === 'minecraft:dirt'
      && recoveryState === 'minecraft:grass_block[snowy=false]')
));
const sourceBroadComponents = faceComponents(broadComparison.sourceFluids);
const recoveryBroadComponents = faceComponents(broadComparison.recoveryFluids);
invariant(broadComparison.diffs.length === EXPECTED.broadDiffCount
  && broadFluidDiffs.length === 51 && broadSolidDamage.length === 0
  && broadComparison.sourceFluids.length === 47
  && broadComparison.recoveryFluids.length === 65
  && sourceBroadComponents.length === 3 && recoveryBroadComponents.length === 3,
'broad-box fluid-settlement/damage census drifted');
const sourceBlockEvidence = [];
for (const point of SOURCE_BLOCK_POINTS) {
  const [sourceState, recoveryState] = await Promise.all([
    stateAt(sourceReader, point), stateAt(recoveryReader, point),
  ]);
  invariant(sourceState === point.state && recoveryState === point.state,
    `retained source block changed at ${cellKey(point)}`);
  sourceBlockEvidence.push({ cell: point, sourceState, recoveryState });
}
const changedRecoveryLavaKeys = new Set(retainedFluidDiffs.filter(
  ({ recoveryState }) => blockName(recoveryState) === 'minecraft:lava',
).map(({ cell }) => cellKey(cell)));
const sourceFedRecoveryComponent = recoveryBroadComponents.find((component) => (
  component.some(({ cell }) => cellKey(cell) === '1525,51,-232')
));
invariant(sourceFedRecoveryComponent
  && [...changedRecoveryLavaKeys].every((key) => (
    sourceFedRecoveryComponent.some(({ cell }) => cellKey(cell) === key)
  )),
'changed retained lava is not cardinally connected to the unchanged lava source');

const scopedEntities = [];
const scopedBlockEntities = [];
for (const [label, regionReader, entityReader] of [
  ['source', sourceReader, sourceEntityReader],
  ['recovery', recoveryReader, recoveryEntityReader],
]) {
  for (let cx = Math.floor(BROAD_BOX.minX / 16);
    cx <= Math.floor(BROAD_BOX.maxX / 16); cx += 1) {
    for (let cz = Math.floor(BROAD_BOX.minZ / 16);
      cz <= Math.floor(BROAD_BOX.maxZ / 16); cz += 1) {
      const chunk = await regionReader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (point.x >= BROAD_BOX.minX && point.x <= BROAD_BOX.maxX
          && point.y >= BROAD_BOX.minY && point.y <= BROAD_BOX.maxY
          && point.z >= BROAD_BOX.minZ && point.z <= BROAD_BOX.maxZ) {
          scopedBlockEntities.push({ snapshot: label, id: entity.id ?? null, point });
        }
      }
      const entityChunk = await entityReader.chunk(cx, cz);
      for (const entity of entityChunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const [x, y, z] = entity.Pos.map(Number);
        if (x >= BROAD_BOX.minX && x < BROAD_BOX.maxX + 1
          && y >= BROAD_BOX.minY && y < BROAD_BOX.maxY + 1
          && z >= BROAD_BOX.minZ && z < BROAD_BOX.maxZ + 1) {
          scopedEntities.push({ snapshot: label, id: entity.id ?? null, position: [x, y, z] });
        }
      }
    }
  }
}
invariant(scopedEntities.length === 0 && scopedBlockEntities.length === 0,
'source/recovery broad box contains an entity or block entity');
invariant(manifest.isolation.priorReleaseIntersectionCount === 0
  && manifest.isolation.sheepInteractionCount === 0,
'prior-scope/sheep disjointness drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status:
    'PASS_RECOVERY_ACCEPTED_TWO_DIRT_GRASS_LIFECYCLE_TRANSITIONS_AND_BOUNDED_FLUID_SETTLEMENT_OUTSIDE_OPERATED_HALO',
  mode: 'READ_ONLY_IMMUTABLE_SOURCE_TO_COMPENSATED_RECOVERY_AUDIT',
  historicalLedgerDisposition:
    'The failed-attempt ledger remains immutable manual-review evidence. This audit accepts the physical recovery without rewriting that ledger.',
  release: {
    manifestPath: MANIFEST_PATH,
    manifestSha256: EXPECTED.manifestSha256,
    manifestIdentitySha256: EXPECTED.manifestIdentity,
    ledgerPath: LEDGER_PATH,
    ledgerSha256: EXPECTED.ledgerSha256,
    ledgerStatus: ledger.status,
  },
  source: {
    snapshotRoot: SOURCE_ROOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    regionSha256: EXPECTED.sourceRegionSha256,
    intakePath: SOURCE_INTAKE_PATH,
    intakeSha256: EXPECTED.sourceIntakeSha256,
  },
  recovery: {
    snapshotRoot: RECOVERY_ROOT,
    completeSaveSha256: EXPECTED.recoveryCompleteSaveSha256,
    regionSha256: EXPECTED.recoveryRegionSha256,
    intakePath: RECOVERY_INTAKE_PATH,
    intakeSha256: EXPECTED.recoveryIntakeSha256,
  },
  exactOperatedHalo: {
    cellCount: operatedHalo.length,
    coordinateSetSha256: hashCells(operatedHalo),
    sourceFluidCount: operatedComparison.sourceFluids.length,
    recoveryFluidCount: operatedComparison.recoveryFluids.length,
    diffCount: operatedComparison.diffs.length,
    exactDiffs: sortedOperatedDiffs,
  },
  retainedHydraulicReview: {
    cellCount: generic.halo.length,
    coordinateSetSha256: hashCells(generic.halo),
    source: {
      fluidCellCount: retainedComparison.sourceFluids.length,
      fluidCoordinateSetSha256: hashCells(retainedComparison.sourceFluids.map(({ cell }) => cell)),
      stateCensus: stateCensus(retainedComparison.sourceFluids, 'state'),
      componentCount: faceComponents(retainedComparison.sourceFluids).length,
    },
    recovery: {
      fluidCellCount: retainedComparison.recoveryFluids.length,
      fluidCoordinateSetSha256: hashCells(retainedComparison.recoveryFluids.map(({ cell }) => cell)),
      stateCensus: stateCensus(retainedComparison.recoveryFluids, 'state'),
      componentCount: recoveryRetainedComponents.length,
      components: recoveryRetainedComponents.map((component) => ({
        cellCount: component.length,
        bounds: boundsOf(component.map(({ cell }) => cell)),
        coordinateSetSha256: hashCells(component.map(({ cell }) => cell)),
      })),
      minimumTargetChebyshevDistance: minimumRecoveryFluidTargetDistance,
    },
    diffCount: retainedComparison.diffs.length,
    fluidSettlementDiffCount: retainedFluidDiffs.length,
    exactDiffs: retainedComparison.diffs,
  },
  broadScreeningBox: {
    bounds: BROAD_BOX,
    cellCount: broadCells.length,
    diffCount: broadComparison.diffs.length,
    fluidOrAirSettlementDiffCount: broadFluidDiffs.length,
    dirtToGrassLifecycleCount: 2,
    solidDamageCount: broadSolidDamage.length,
    sourceFluidCellCount: broadComparison.sourceFluids.length,
    recoveryFluidCellCount: broadComparison.recoveryFluids.length,
    sourceFluidStateCensus: stateCensus(broadComparison.sourceFluids, 'state'),
    recoveryFluidStateCensus: stateCensus(broadComparison.recoveryFluids, 'state'),
    sourceCardinalComponents: sourceBroadComponents.map((component) => ({
      cellCount: component.length,
      bounds: boundsOf(component.map(({ cell }) => cell)),
      coordinateSetSha256: hashCells(component.map(({ cell }) => cell)),
    })),
    recoveryCardinalComponents: recoveryBroadComponents.map((component) => ({
      cellCount: component.length,
      bounds: boundsOf(component.map(({ cell }) => cell)),
      coordinateSetSha256: hashCells(component.map(({ cell }) => cell)),
    })),
    retainedSourceBlockCount: sourceBlockEvidence.length,
    retainedSourceBlocks: sourceBlockEvidence,
    exactDiffs: broadComparison.diffs,
    qualification:
      'The broad box records normal fluid settlement, including one clipped external water frontier. It is screening evidence, not the exact operated halo or a hydraulic-capacity claim.',
  },
  executionAndRecovery: {
    structureForwardSuccessfulGroups: structureForward.successfulGroups,
    structureForwardFailedGroups: structureForward.failedGroups,
    failureLine: structureForward.groupFailures[0].line,
    structureCompensationSuccessfulGroups: structureCompensation.successfulGroups,
    dependencyCompensationSuccessfulGroups: dependencyCompensation.successfulGroups,
    compensationFailedGroups:
      structureCompensation.failedGroups + dependencyCompensation.failedGroups,
    residualForwardDesiredStateCount: 0,
  },
  preservation: {
    scopedSourceEntityCount: 0,
    scopedRecoveryEntityCount: 0,
    scopedSourceBlockEntityCount: 0,
    scopedRecoveryBlockEntityCount: 0,
    priorReleaseIntersectionCount: 0,
    sheepInteractionCount: 0,
    exactOperatedHaloFluidTransitionCount: 0,
    broadSolidDamageCount: 0,
  },
  acceptance: {
    physicalRecoveryAccepted: true,
    sourceAndRecoverySnapshotsAreNotClaimedByteIdentical: true,
    exactLifecycleReboundCount: 2,
    retainedFluidBaselineMustRebindToRecovery: true,
    recoveryRetainedFluidBaselineSafeForRetry: true,
    retryMustUseFreshHardSafetyKernel: true,
    liveCallsPerformedByAudit: false,
    worldEditsPerformedByAudit: false,
  },
};
const recoveryAcceptanceIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, recoveryAcceptanceIdentitySha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_PATH), `# R11H compensated-recovery acceptance\n\nStatus: **PASS**\n\nThe exact sparse ${operatedHalo.length.toLocaleString('en-US')}-cell operated halo differs from the pre-execution source only at two declared pavement targets: dirt naturally spread to \`minecraft:grass_block[snowy=false]\` at \`(1529,68,-251)\` and \`(1540,68,-238)\`. It contains zero source or recovery fluid cells. All 1,666 operation targets are otherwise restored, and both operation packages completed compensation.\n\nThe distinct ${generic.halo.length.toLocaleString('en-US')}-cell hydraulic-review halo records bounded fluid settlement outside the operated halo: 28 source fluid cells become a 45-cell, one-component lava baseline, still at minimum target distance two. In the broader ${broadCells.length.toLocaleString('en-US')}-cell screen, all other 51 changes are fluid/air transitions; both local source blocks are unchanged and solid damage is zero. The clipped external water frontier is recorded but does not intersect the hydraulic-review or operated halo.\n\nNo scoped entity, block entity, container, prior release, or sheep interface is affected. Retry-v2 must restore the two grass states exactly and bind the 45-cell recovery fluid baseline; it must still run a fresh live safety kernel.\n\nRecovery acceptance identity: \`${recoveryAcceptanceIdentitySha256}\`. No live call or world edit was performed by this audit.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  markdown: MD_PATH,
  recoveryAcceptanceIdentitySha256,
  operatedHaloDiffCount: operatedComparison.diffs.length,
  retainedFluidBaselineCount: retainedComparison.recoveryFluids.length,
  broadFluidSettlementDiffCount: broadFluidDiffs.length,
  broadSolidDamageCount: broadSolidDamage.length,
}, null, 2));
