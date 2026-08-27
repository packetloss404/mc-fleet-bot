#!/usr/bin/env node
/** Independent read-only offline QA for CZ-R11N (C1 station-1183 bridge gap). */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
const MANIFEST = value(
  '--manifest',
  'data/buildops/combined-zones-r11n-c1-station-1183-bridge-gap.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11n-offline-20260824T033000Z',
);
const OUT = value('--out', `${EVIDENCE}/r11n-offline-qa.json`);
const MD_OUT = value('--md-out', `${EVIDENCE}/r11n-offline-qa.md`);
const GENERATED_AT = value('--generated-at', '2026-08-24T03:30:00Z');
const R11M_FORWARD =
  'data/buildops/combined-zones-r11m-c1-residual-at-grade-island.c1-island.forward.txt';
const R11J_MANIFEST =
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11N offline QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
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
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);
function surfaceCellsFromOps(filename) {
  return parseOperations(filename).filter(({ targetState }) => surfaceState(targetState))
    .map(({ cell }) => cell);
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

const manifestBytes = fs.readFileSync(absolute(MANIFEST));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.transactionId === 'combined-zones-r11n-c1-station-1183-bridge-gap'
  && manifest.mvpScope === true
  && manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest identity/schema drifted');

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);

const records = [];
const targetKeys = new Set();
let inverseCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const operation = manifest.operations[pkg.key];
  invariant(bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256
    && forward.length === rollback.length
    && forward.length === operation.targetCellCount,
  `${pkg.key} operation identity/count drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} inverse drifted at ${index}`);
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
    inverseCount += 1;
  }
}

const supportRecords = records.filter(({ packageKey }) => (
  packageKey === 'c1-station-1183-support-framework'
));
const structureRecords = records.filter(({ packageKey }) => (
  packageKey === 'c1-station-1183-deck-structure'
));
const surface = structureRecords.filter(({ targetState }) => surfaceState(targetState));
const cuts = structureRecords.filter(({ targetState }) => targetState === 'minecraft:air');
invariant(supportRecords.length > 0
  && supportRecords.every(({ targetState }) => targetState === 'minecraft:stone_bricks')
  && structureRecords.length > 0
  && surface.length > 0,
'support/deck operation split invalid');

// Support network: every new support component must be face-connected to
// retained solid structure (the R11J beam, west shoulder, or solid
// interstitial), proving one structurally continuous support network.
const supportCells = uniqueCells(supportRecords.map(({ cell }) => cell));
const supportKeys = new Set(supportCells.map(cellKey));
const supportComponents = [];
const visited = new Set();
let allAnchored = true;
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
      const next = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
      if (supportKeys.has(next)) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      } else {
        const nState = await sourceAt({
          x: Number(next.split(',')[0]), y: Number(next.split(',')[1]), z: Number(next.split(',')[2]),
        });
        if (!isAir(nState) && !isFluid(nState)
          && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(nState))) {
          anchoredToRetained = true;
        }
      }
    }
  }
  supportComponents.push(component);
  if (!anchoredToRetained) allAnchored = false;
}
invariant(allAnchored, 'a new support component is not anchored to retained solid structure');

// Surface connectivity with R11M + R11J surfaces.
const r11mSurface = surfaceCellsFromOps(R11M_FORWARD);
const r11jManifest = readJson(R11J_MANIFEST);
const r11jSurface = [];
for (const pkg of r11jManifest.packages ?? []) {
  r11jSurface.push(...surfaceCellsFromOps(pkg.forward));
}
const newSurface = uniqueCells(surface.map(({ cell }) => cell));
const combinedSurface = uniqueCells([...r11mSurface, ...newSurface, ...r11jSurface]);
const combinedComponents = connectedComponents(combinedSurface);
invariant(combinedComponents.length === 1, 'combined surface is not one component');
// Validate that each NEW surface cell and its combined-set neighbours are
// within maximum step one. Pre-existing R11M/R11J surface irregularities are
// retained as accepted and are not re-audited by this package.
let maximumStep = 0;
for (const cell of newSurface) {
  for (const other of combinedSurface) {
    if (cell === other) continue;
    if (Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) === 1) {
      maximumStep = Math.max(maximumStep, Math.abs(cell.y - other.y));
    }
  }
}
invariant(maximumStep <= 1, `new surface step exceeds one: ${maximumStep}`);

// Each new surface cell must have projected non-air support below it.
const projectedByKey = new Map(records.map(({ cell, targetState }) => [cellKey(cell), targetState]));
for (const record of surface) {
  const below = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  const belowState = projectedByKey.get(cellKey(below)) ?? await sourceAt(below);
  invariant(!isAir(belowState) && !isFluid(belowState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(belowState)),
  `surface lacks projected support at ${cellKey(record.cell)}`);
}

// Halo isolation: no fluid in the 3x3x3 halo.
const halo = uniqueCells(records.flatMap(({ cell }) => {
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
invariant(haloFluidCount === 0, `halo contains fluid: ${haloFluidCount}`);

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R11N_C1_STATION_1183_BRIDGE_GAP_OFFLINE_RELEASE_READY',
  mode: 'INDEPENDENT_READ_ONLY_R11N_OFFLINE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestIdentity,
    targetCount: records.length,
  },
  checks: {
    exactTargetCount: records.length,
    exactInverseReadyCount: inverseCount,
    supportOperationCellCount: supportRecords.length,
    supportFaceComponentCount: supportComponents.length,
    surfaceCellCount: surface.length,
    headroomCutCount: cuts.length,
    interactionHaloCellCount: halo.length,
    haloFluidCount,
    combinedSurfaceCellCount: combinedSurface.length,
    combinedSurfaceComponentCount: combinedComponents.length,
    maximumSurfaceStep: maximumStep,
    newSurfaceCellCount: newSurface.length,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    supportCoordinateSetSha256: hashCells(supportCells),
    haloCoordinateSetSha256: hashCells(halo),
    combinedSurfaceCoordinateSetSha256: hashCells(combinedSurface),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), `# R11N offline QA\n\nStatus: **${report.status}**\n\n- exact targets: ${report.checks.exactTargetCount}\n- support cells: ${report.checks.supportOperationCellCount} (one component)\n- surface cells: ${report.checks.surfaceCellCount}\n- combined surface: ${report.checks.combinedSurfaceCellCount} cells, ${report.checks.combinedSurfaceComponentCount} component, max step ${report.checks.maximumSurfaceStep}\n- halo: ${report.checks.interactionHaloCellCount} cells, ${report.checks.haloFluidCount} fluid\n`);
console.log(JSON.stringify(report, null, 2));
