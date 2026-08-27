#!/usr/bin/env node
/** Compile R11M — C1 stations 1146..1171 + 1173..1183 residual at-grade island.
 *
 * The R11E island (1142..1183) was held for roaming sheep. R11K already built
 * stations 1142..1145 + 1172. The sheep have since left the interface. This
 * package builds the remaining residual island from the accepted R11K post,
 * treating the R11K ledger as prior. No whole-corridor claim.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import { analyzeIsland } from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-24T02:40:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r11k-post-20260822T043931Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r11m-c1-residual-at-grade-island');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-r11m-c1-residual-at-grade-island';
const RELEASE_ID = 'CZ-R11M-C1-RESIDUAL-AT-GRADE-ISLAND';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const R11K_LEDGER = 'data/world-review/combined-zones-r11k-live-20260822T043931Z/evidence-ledger.json';
const R11E_MANIFEST = 'data/buildops/combined-zones-r11e-c1-disjoint-at-grade-islands-batch.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11M compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector = (record) => record.state) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const authorization = readJson(AUTHORIZATION);
const contract = readJson(CONTRACT);
const design = readJson(DESIGN);
const r11kLedger = readJson(R11K_LEDGER);
const r11eManifest = readJson(R11E_MANIFEST);
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R11');
invariant(r11kLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
'R11K ledger is not the accepted terminal post');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const stations = design.horizontalAlignment.stations;

// Prior targets: every R11K operated cell inside this island.
const priorTargetKeys = new Set();
function operationTargetCells(filename) {
  const cells = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    const fields = raw.trim().split(/\s+/);
    if (fields[0] === 'REPL' && fields.length === 9) {
      cells.push({ x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) });
    }
  }
  return cells;
}
for (const pkg of r11kLedger.packages ?? []) {
  const forwardPath = typeof pkg.forward === 'string' ? pkg.forward : pkg.forward?.path;
  if (!forwardPath) continue;
  for (const cell of operationTargetCells(forwardPath)) priorTargetKeys.add(cellKey(cell));
}

// Residual island: stations 1146..1182 (R11K built 1142..1145 + 1172; the
// station-1183 east shoulder crosses below-grade water at offset +14 and is
// excluded as a wet-boundary holdout).
const analysis = await analyzeIsland({
  key: 'island-1146-1171-1173-1182',
  start: 1146,
  end: 1182,
  stations,
  reader,
  priorTargetKeys,
  savedEntityPositions: [],
});
invariant(analysis.sourceHazards.length === 0,
  `C1 residual island source hazards: ${JSON.stringify(analysis.sourceHazards.slice(0, 20))}`);
invariant(analysis.haloHazards.length === 0,
  `C1 residual island halo hazards: ${JSON.stringify(analysis.haloHazards.slice(0, 20))}`);
invariant(analysis.savedEntityConflicts.length === 0,
  `C1 residual island saved-entity conflicts: ${JSON.stringify(analysis.savedEntityConflicts.slice(0, 20))}`);

const allRecords = [
  ...(analysis.pavementRecords ?? []),
  ...(analysis.foundationRecords ?? analysis.foundation ?? []),
  ...(analysis.headroomRecords ?? analysis.headroom ?? []),
];
const desired = new Map();
const meta = new Map();
for (const record of allRecords) {
  if (!record.cell || !record.targetState || !record.sourceState) continue;
  const key = cellKey(record.cell);
  desired.set(key, { cell: record.cell, toState: record.targetState });
  meta.set(key, { packageKey: record.kind ?? 'c1-island', role: record.role ?? 'c1-residual' });
}

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState));
invariant(hazards.length === 0, `target fluid sources: ${JSON.stringify(hazards.slice(0, 20))}`);

const haloCells = uniqueCells(targetCells.flatMap((cell) => [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
].map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz })))).filter(
  (cell) => !targetKeys.has(cellKey(cell)),
);
const haloForbidden = [];
for (const cell of haloCells) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (isFluid(state)) haloForbidden.push({ cell, state });
}
invariant(haloForbidden.length === 0, `halo fluid hazard: ${JSON.stringify(haloForbidden.slice(0, 10))}`);

const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntityIntersections = [];
const entityIntersections = [];
const envelopeBounds = boundsOf(uniqueCells([...targetCells, ...haloCells]));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
'target/halo intersects a block entity or saved movable entity');

const packageOrder = ['c1-island'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  invariant(group.length > 0, `${key} compiled empty`);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = [
    `# ${TRANSACTION_ID}/${key}`,
    `# source ${SNAPSHOT}`,
    '# guarded per-cell exact-state transitions; generated offline',
  ];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_ACCEPTED_R11K_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Build the residual C1 at-grade island stations 1146..1182 after R11K built 1142..1145 + 1172; the roaming sheep have left the interface and the station-1183 wet shoulder is a documented east-edge holdout.',
    repair: {
      stations: { start: 1146, end: 1182, priorBuilt: [1142, 1143, 1144, 1145, 1172], wetHoldout: 1183 },
      residualTargetCount: operations.length,
      sheepInterface: { status: 'CLEAR', sheepCount: 0, noted: 'three roaming sheep have left the interface; live gate confirms zero entities' },
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTarget.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
      operationRoles,
    },
    retainedBoundaries: {
      r11kBuiltCellsPreserved: true,
      railReservationPreserved: true,
      utilityReservationPreserved: true,
      roadCollectionPreserved: true,
      noWholeCorridorClaimed: true,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    r11kLedger: fileBinding(R11K_LEDGER),
    r11eManifest: fileBinding(R11E_MANIFEST),
  },
  evidenceBindings: {
    contract: fileBinding(CONTRACT),
    authorization: fileBinding(AUTHORIZATION),
    design: fileBinding(DESIGN),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
  },
  operations: operationManifest,
  packages,
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: targetCells.length,
  operationCount: operations.length,
  packageCount: packages.length,
}, null, 2)}\n`);
