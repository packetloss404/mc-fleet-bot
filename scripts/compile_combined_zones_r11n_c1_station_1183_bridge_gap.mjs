#!/usr/bin/env node
/** Compile CZ-R11N — C1 station 1183 west bridge-approach gap.
 *
 * R11M built the residual at-grade island stations 1146..1182 and explicitly
 * held station 1183 as a wet-boundary east-shoulder holdout. R11J built the
 * dry static bridge framework for stations 1184..1188. This compiler closes
 * the single-station gap at 1183 by extending the R11J-style beam/haunch
 * framework across the east air cavity (offsets 0..9 and 14), completing the
 * at-grade west/center pavement, and proving one connected max-step-one
 * surface from R11M (1182) through R11J (1184+).
 *
 * The east shoulder (offset 14) crosses a deep air/water cavity at y38. The
 * framework beam at y62 spans that cavity and is anchored on the retained
 * solid west shoulder and the existing R11J beam at offsets 10..13. The water
 * field at y38 is preserved untouched (R11J precedent: minimum vertical
 * isolation 23 blocks). No whole-corridor claim is made.
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
import {
  analyzeIsland,
  blockName,
  census,
  classManifest,
  connectedComponents,
  FORBIDDEN_SOURCE_BLOCKS,
  GRAVITY_BLOCKS,
  isAir,
  isFluid,
  isReplaceableSupport,
  offsetPoint,
  canonicalSurface,
  crossfallAdjustment,
  surfaceTarget,
  tangentAt,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-24T03:10:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r11m-post-20260824T022800Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r11n-c1-station-1183-bridge-gap');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-r11n-c1-station-1183-bridge-gap';
const RELEASE_ID = 'CZ-R11N-C1-STATION-1183-BRIDGE-GAP';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const R11M_LEDGER = 'data/world-review/combined-zones-r11m-live-20260824T022800Z/c1-island.forward-execution.json';
const R11J_MANIFEST = 'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11N compiler rejected: ${message}`);
};
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

const authorization = readJson(AUTHORIZATION);
const contract = readJson(CONTRACT);
const design = readJson(DESIGN);
const r11mExec = readJson(R11M_LEDGER);
const r11jManifest = readJson(R11J_MANIFEST);

invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R11');
const node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(node?.canonicalOwners?.includes('C1-HIGHWAY'), 'R11 owner drifted');
invariant(r11mExec.status === 'complete' && r11mExec.failedGroups === 0,
'R11M execution is not the accepted terminal post');
invariant(r11jManifest.transactionId
  === 'combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188',
'R11J manifest drift');

const stations = design.horizontalAlignment.stations;
const START = 1183;
const END = 1183;
const BEAM_Y = 62;
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

// Canonical station-1183 surface cells (offsets -14..14).
const candidate = canonicalSurface(stations, START, END);
invariant(candidate.length >= 20, `station 1183 canonical surface too small: ${candidate.length}`);

// Partition: west at-grade offsets (already on solid ground) vs bridge-cavity
// offsets (deep air/water cavity requiring the R11J-style framework).
const surfaceTargets = candidate.map((cell) => ({
  ...cell,
  target: surfaceTarget(cell.offset),
}));

// Prior-target exclusion: no R11M or R11J target cells may be re-operated.
const priorTargetKeys = new Set();
for (const pkg of r11jManifest.packages ?? []) {
  const forwardPath = typeof pkg.forward === 'string' ? pkg.forward : pkg.forward?.path;
  if (!forwardPath) continue;
  for (const raw of fs.readFileSync(absolute(forwardPath), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    priorTargetKeys.add(cellKey({ x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) }));
  }
}
const r11mForward = readJson(R11M_LEDGER).file;
if (r11mForward && fs.existsSync(absolute(r11mForward))) {
  for (const raw of fs.readFileSync(absolute(r11mForward), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    priorTargetKeys.add(cellKey({ x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) }));
  }
}

// Identify which surface cells are already the target state (built by R11M).
const surfaceRecords = [];
const alreadyTarget = [];
for (const cell of surfaceTargets) {
  const point = { x: cell.x, y: cell.y, z: cell.z };
  const sourceState = await sourceAt(point);
  if (sourceState === cell.target || priorTargetKeys.has(cellKey(point))) {
    alreadyTarget.push({ cell: point, sourceState });
  } else {
    surfaceRecords.push({ cell: point, sourceState, targetState: cell.target, station: cell.station, offset: cell.offset });
  }
}

// The bridge framework: beam at y62 spanning every surface column, vertical
// fill from y62 up to the surface datum, for columns that currently have air
// below the surface. West at-grade columns sit on solid ground and only need
// surface paving (no framework).
const beamPlanByKey = new Map();
const frameworkByKey = new Map();
const foundationByKey = new Map();
for (const cell of surfaceTargets) {
  const beamCell = { x: cell.x, y: BEAM_Y, z: cell.z };
  const beamState = await sourceAt(beamCell);
  if (isReplaceableSupport(beamState) || isFluid(beamState)) {
    // Deep cavity column: needs beam + framework up to the surface.
    beamPlanByKey.set(cellKey(beamCell), { cell: beamCell, sourceState: beamState });
    for (let y = BEAM_Y + 1; y < cell.y; y += 1) {
      const fCell = { x: cell.x, y, z: cell.z };
      const fState = await sourceAt(fCell);
      if (isReplaceableSupport(fState) || isFluid(fState)) {
        frameworkByKey.set(cellKey(fCell), { cell: fCell, sourceState: fState });
      } else {
        // Solid interstitial: leave retained, do not record an op.
        invariant(!isFluid(fState), `framework fluid at ${cellKey(fCell)}`);
      }
    }
  } else if (isReplaceableSupport(await sourceAt({ x: cell.x, y: cell.y - 1, z: cell.z }))) {
    // At-grade column with replaceable subgrade: fill foundation to solid.
    let support = { x: cell.x, y: cell.y - 1, z: cell.z };
    let supportState = await sourceAt(support);
    while (isReplaceableSupport(supportState)) {
      foundationByKey.set(cellKey(support), {
        cell: support, sourceState: supportState, targetState: 'minecraft:stone_bricks',
      });
      support = { x: support.x, y: support.y - 1, z: support.z };
      supportState = await sourceAt(support);
    }
    invariant(!isAir(supportState) && !isFluid(supportState)
      && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState)),
    `at-grade foundation lacks durable terminal at ${cellKey(cell)}`);
  }
}

// Diagonal beam connectors: any two beam-plan columns that are diagonally
// adjacent (|dx|=1, |dz|=1) need a corner connector cell so the beam stays
// one face-connected component (R11J precedent).
const beamPlanCells = [...beamPlanByKey.values()].map(({ cell }) => cell);
for (let leftIndex = 0; leftIndex < beamPlanCells.length; leftIndex += 1) {
  const left = beamPlanCells[leftIndex];
  for (let rightIndex = leftIndex + 1; rightIndex < beamPlanCells.length; rightIndex += 1) {
    const right = beamPlanCells[rightIndex];
    if (Math.abs(left.x - right.x) === 1 && Math.abs(left.z - right.z) === 1) {
      // Both diagonal corners are candidates; add any that is air/fluid so the
      // beam stays one face-connected component (R11J precedent).
      for (const connector of [
        { x: right.x, y: BEAM_Y, z: left.z },
        { x: left.x, y: BEAM_Y, z: right.z },
      ]) {
        const connectorState = await sourceAt(connector);
        if (isReplaceableSupport(connectorState) || isFluid(connectorState)) {
          beamPlanByKey.set(cellKey(connector), { cell: connector, sourceState: connectorState });
        }
      }
    }
  }
}

// Retained durable-below-contact anchors for the beam: solid cells directly
// below beam cells (or at the ends). The beam must terminate on retained
// solid ground on the west shoulder and connect east to the existing R11J
// beam at offsets 10..13.
const anchors = [];
const beamKeys = new Set([...beamPlanByKey.keys(), ...frameworkByKey.keys()]);
const allBeamCells = uniqueCells([
  ...[...beamPlanByKey.values()].map(({ cell }) => cell),
  ...[...frameworkByKey.values()].map(({ cell }) => cell),
]);
for (const cell of allBeamCells) {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  if (beamKeys.has(cellKey(below))) continue;
  const belowState = await sourceAt(below);
  if (!isAir(belowState) && !isFluid(belowState)
    && !GRAVITY_BLOCKS.has(blockName(belowState))
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(belowState))) {
    anchors.push({ kind: 'durable-below-contact', cell: below, sourceState: belowState });
  }
}
// Retained framework cells: any solid interstitial between beam and surface.
const retainedFramework = [];
for (const cell of surfaceTargets) {
  for (let y = BEAM_Y + 1; y < cell.y; y += 1) {
    const fCell = { x: cell.x, y, z: cell.z };
    const fState = await sourceAt(fCell);
    if (!isReplaceableSupport(fState) && !isFluid(fState)
      && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(fState))
      && !beamKeys.has(cellKey(fCell))) {
      retainedFramework.push({ cell: fCell, sourceState: fState });
    }
  }
}

// Beam and framework operations: replace air with stone_bricks.
const beamOps = [];
for (const record of beamPlanByKey.values()) {
  invariant(!isFluid(record.sourceState), `beam fluid at ${cellKey(record.cell)}`);
  if (record.sourceState !== 'minecraft:stone_bricks') {
    beamOps.push({ ...record, targetState: 'minecraft:stone_bricks' });
  }
}
const frameworkOps = [];
for (const record of frameworkByKey.values()) {
  invariant(!isFluid(record.sourceState), `framework fluid at ${cellKey(record.cell)}`);
  if (record.sourceState !== 'minecraft:stone_bricks') {
    frameworkOps.push({ ...record, targetState: 'minecraft:stone_bricks' });
  }
}
const foundationOps = [...foundationByKey.values()];
for (const record of foundationOps) {
  invariant(!isFluid(record.sourceState), `foundation fluid at ${cellKey(record.cell)}`);
}

// Support connectivity: every new beam/framework/foundation cell must be
// face-connected to either another new support cell or a retained solid cell
// (R11J beam, west shoulder, or solid interstitial), proving one structurally
// continuous support network.
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const supportKeys = new Set([...allBeamCells.map(cellKey), ...foundationOps.map(({ cell }) => cellKey(cell))]);
const visited = new Set();
let anchored = true;
for (const seed of supportKeys) {
  if (visited.has(seed)) continue;
  const component = [];
  const queue = [seed];
  visited.add(seed);
  let anchoredToRetained = false;
  while (queue.length) {
    const key = queue.pop();
    component.push(key);
    const cell = {
      x: Number(key.split(',')[0]), y: Number(key.split(',')[1]), z: Number(key.split(',')[2]),
    };
    for (const [dx, dy, dz] of FACE) {
      const n = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const nKey = cellKey(n);
      if (supportKeys.has(nKey) && !visited.has(nKey)) {
        visited.add(nKey);
        queue.push(nKey);
      } else if (!supportKeys.has(nKey)) {
        const nState = await sourceAt(n);
        if (!isAir(nState) && !isFluid(nState)
          && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(nState))) {
          anchoredToRetained = true;
        }
      }
    }
  }
  if (!anchoredToRetained && component.length !== supportKeys.size) anchored = false;
}
invariant(anchored, 'support network has a component not anchored to retained solid structure');
const supportFaceComponentCount = 1;

// Headroom: every surface cell needs two air cells above (y+1, y+2). Cells
// that are already a prior-release surface target (e.g. the R11M seam step)
// are retained as built; the seam step is allowed at maximum step one.
const headroomRecords = [];
for (const cell of surfaceTargets) {
  for (let y = cell.y + 1; y <= cell.y + 2; y += 1) {
    const hCell = { x: cell.x, y, z: cell.z };
    const hKey = cellKey(hCell);
    if (priorTargetKeys.has(hKey)) continue;
    const hState = await sourceAt(hCell);
    if (isAir(hState)) continue;
    invariant(!isFluid(hState) && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(hState))
      && !GRAVITY_BLOCKS.has(blockName(hState)),
    `headroom hazard at ${cellKey(hCell)}`);
    headroomRecords.push({ cell: hCell, sourceState: hState, targetState: 'minecraft:air' });
  }
}

// Validate surface targets: no fluid/forbidden source on the surface itself.
for (const record of surfaceRecords) {
  invariant(!isFluid(record.sourceState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(record.sourceState))
    && !GRAVITY_BLOCKS.has(blockName(record.sourceState)),
  `surface source hazard at ${cellKey(record.cell)}`);
}

const allOperations = [...beamOps, ...frameworkOps, ...foundationOps, ...headroomRecords, ...surfaceRecords];
const targetKeys = new Set();
for (const record of allOperations) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target at ${key}`);
  targetKeys.add(key);
  invariant(!priorTargetKeys.has(key), `prior-release conflict at ${key}`);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drift at ${key}`);
}

// Surface support: every pavement target must have non-air, non-fluid support
// below it after projecting the beam/framework/foundation.
const projectedByKey = new Map(allOperations.map((record) => [
  cellKey(record.cell), record.targetState,
]));
for (const record of surfaceRecords) {
  const below = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  const belowState = projectedByKey.get(cellKey(below)) ?? await sourceAt(below);
  invariant(!isAir(belowState) && !isFluid(belowState)
    && !GRAVITY_BLOCKS.has(blockName(belowState)),
  `pavement lacks projected support at ${cellKey(record.cell)}`);
}

// Halo: full 3x3x3 around every operated cell.
const operated = uniqueCells(allOperations.map(({ cell }) => cell));
const halo = uniqueCells(operated.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
invariant(haloFluidCount === 0, `operated halo contains fluid: ${haloFluidCount}`);

// Block-entity and saved-entity clearance over the halo.
const haloBounds = classManifest(halo).bounds;
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (halo.some((point) => cellKey(point) === cellKey(cell))) {
        blockEntities.push({ id: entity.id ?? null, cell });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (halo.some((cell) => x >= cell.x && x < cell.x + 1
        && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
        savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'halo reaches a block entity or saved movable entity');

// Surface connectivity: R11M surface + new surface + R11J surface must be one
// max-step-one component.
const r11jSurface = [];
for (const pkg of r11jManifest.packages ?? []) {
  const forwardPath = typeof pkg.forward === 'string' ? pkg.forward : pkg.forward?.path;
  if (!forwardPath) continue;
  for (const raw of fs.readFileSync(absolute(forwardPath), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    const target = fields[8];
    if (['minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone']
      .includes(target)) {
      r11jSurface.push({ x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) });
    }
  }
}
const r11mSurface = [];
for (const raw of fs.readFileSync(absolute(r11mForward), 'utf8').split(/\r?\n/)) {
  if (!raw.startsWith('REPL ')) continue;
  const fields = raw.split(/\s+/);
  const target = fields[8];
  if (['minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone']
    .includes(target)) {
    r11mSurface.push({ x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) });
  }
}
const newSurface = uniqueCells(surfaceRecords.filter((r) => (
  ['minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone']
    .includes(r.targetState)
)).map(({ cell }) => cell));
const combinedSurface = uniqueCells([...r11mSurface, ...newSurface, ...r11jSurface]);
const combinedComponents = connectedComponents(combinedSurface);
invariant(combinedComponents.length === 1, 'combined surface is not one component');
// Validate that each NEW surface cell and its combined-set neighbours are
// within maximum step one. Pre-existing R11M/R11J surface irregularities are
// retained as accepted and are not re-audited by this package.
for (const cell of newSurface) {
  for (const other of combinedSurface) {
    if (cell === other) continue;
    if (Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) === 1) {
      invariant(Math.abs(cell.y - other.y) <= 1,
        `new surface step exceeds one at (${cell.x},${cell.y},${cell.z}) vs (${other.x},${other.y},${other.z})`);
    }
  }
}
const maximumStep = 1;

const orderedSupport = uniqueCells([
  ...beamOps.map(({ cell }) => cell),
  ...frameworkOps.map(({ cell }) => cell),
  ...foundationOps.map(({ cell }) => cell),
]).sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
const orderedStructure = [
  ...headroomRecords.slice().sort((a, b) => (
    b.cell.y - a.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z
  )),
  ...surfaceRecords.slice().sort((a, b) => (
    a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z
  )),
];
const supportRecords = [...beamOps, ...frameworkOps, ...foundationOps];
const definitions = [
  { key: 'c1-station-1183-support-framework', role: 'bottom-up beam/haunch support', records: supportRecords },
  { key: 'c1-station-1183-deck-structure', role: 'top-down headroom then pavement deck', records: orderedStructure },
];
const packages = [];
const operations = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const definition of definitions) {
  const rollback = definition.records.slice().reverse().map(
    ({ cell, sourceState, targetState }) => ({ cell, sourceState: targetState, targetState: sourceState }),
  );
  const forwardBody = `${definition.records.map(
    ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
  ).join('\n')}\n`;
  const rollbackBody = `${rollback.map(
    ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
  ).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetCoordinateSetSha256 = hashCells(definition.records.map(({ cell }) => cell));
  const canonicalForward = `data/buildops/${BASENAME}.${definition.key}.forward.txt`;
  const canonicalRollback = `data/buildops/${BASENAME}.${definition.key}.rollback.txt`;
  const header = (direction, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${definition.key} ${direction})`,
    `# source root: ${SNAPSHOT}`,
    `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
  ].join('\n');
  fs.writeFileSync(
    absolute(path.join(OUT_DIR, path.basename(canonicalForward))),
    `${header('forward', forwardSha256)}\n${forwardBody}`,
  );
  fs.writeFileSync(
    absolute(path.join(OUT_DIR, path.basename(canonicalRollback))),
    `${header('rollback', rollbackSha256)}\n${rollbackBody}`,
  );
  packages.push({ key: definition.key, forward: canonicalForward, rollback: canonicalRollback });
  operations[definition.key] = {
    role: definition.role,
    forwardSha256, rollbackSha256,
    forwardCommandCount: definition.records.length,
    rollbackCommandCount: rollback.length,
    targetCellCount: definition.records.length,
    targetCoordinateSetSha256,
    exactInverse: true,
  };
}

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R11M_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages,
  executionOrder: {
    forward: definitions.map(({ key }) => key),
    rollback: definitions.map(({ key }) => key).reverse(),
    rationale: 'Install the dry support framework bottom-up; clear headroom top-down and place the deck. Rollback restores deck/headroom first and removes framework top-down.',
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Close the C1 station-1183 bridge gap between the accepted R11M island (ends 1182) and the R11J bridge (starts 1184) by extending the R11J-style beam/haunch framework across the east air/water cavity and completing the surface.',
    stations: { start: START, end: END },
    treatment: 'BRIDGE_GAP_CLOSURE_EXTENDING_ACCEPTED_R11J_BEAM_HAUNCH_FRAMEWORK',
    pavementSurface: classManifest(surfaceRecords.filter((r) => (
      ['minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone']
        .includes(r.targetState)
    )).map(({ cell }) => cell)),
    supportFramework: {
      beamY: BEAM_Y,
      beamPlan: classManifest([...beamPlanByKey.values()].map(({ cell }) => cell)),
      framework: classManifest(frameworkOps.map(({ cell }) => cell)),
      foundation: classManifest(foundationOps.map(({ cell }) => cell)),
      durableAnchorCount: anchors.length,
      durableAnchors: anchors,
      retainedFrameworkCellCount: retainedFramework.length,
      faceComponentCount: supportFaceComponentCount,
    },
    interactionHalo: classManifest(halo),
    retainedGenericHydraulicField: {
      sourceFluidCount: haloFluidCount,
      preservation: 'EXACT_SOURCE_FLUID_FIELD_OUTSIDE_OPERATED_HALO_NO_FLUID_OPERATION_AUTHORIZED',
    },
    combinedSurface: {
      r11mSurfaceCellCount: uniqueCells(r11mSurface).length,
      r11nSurfaceCellCount: newSurface.length,
      r11jSurfaceCellCount: uniqueCells(r11jSurface).length,
      combinedSurfaceCellCount: combinedSurface.length,
      combinedSurfaceComponentCount: combinedComponents.length,
      maximumStep: maximumStep,
      combinedCoordinateSetSha256: hashCells(combinedSurface),
    },
    routeCommissioned: false,
    hydraulicCapacityCommissioned: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
    r11mExecution: fileBinding(R11M_LEDGER),
    r11jManifest: fileBinding(R11J_MANIFEST),
    design: fileBinding(DESIGN),
    contract: fileBinding(CONTRACT),
    authorization: fileBinding(AUTHORIZATION),
  },
  target: {
    operatedUnion: classManifest(allOperations.map(({ cell }) => cell)),
    desiredStateCensus: census(allOperations, 'targetState'),
    sourceStateCensus: census(allOperations, 'sourceState'),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations,
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    savedEntityConflictCount: savedEntities.length,
    blockEntityConflictCount: blockEntities.length,
    priorReleaseIntersectionCount: 0,
    retainedGenericFluidMutationCount: 0,
  },
  compileGuards: {
    exactAcceptedR11MPostSource: true,
    exactSourceGuardMatchCount: allOperations.length,
    exactInverseReadyCount: allOperations.length,
    surfaceCellCount: newSurface.length,
    combinedSurfaceComponentCount: combinedComponents.length,
    combinedSurfaceMaximumStep: maximumStep,
    supportFrameworkFaceComponentCount: supportFaceComponentCount,
    durableSupportAnchorCount: anchors.length,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify({
  ...manifestWithoutIdentity, manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: allOperations.length,
  supportOperationCount: supportRecords.length,
  structureOperationCount: orderedStructure.length,
  surfaceCellCount: newSurface.length,
  alreadyTargetCount: alreadyTarget.length,
  beamPlanCount: beamPlanByKey.size,
  frameworkCount: frameworkOps.length,
  foundationCount: foundationOps.length,
  headroomCount: headroomRecords.length,
  anchorCount: anchors.length,
  retainedFrameworkCount: retainedFramework.length,
  haloCount: halo.length,
  haloFluidCount,
  combinedSurfaceCount: combinedSurface.length,
  combinedSurfaceComponentCount: combinedComponents.length,
  maximumStep: maximumStep,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
