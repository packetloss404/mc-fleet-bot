#!/usr/bin/env node
/** Compile the Town Expansion R1 red-carpet drift repair.
 *
 * The committed 49-cell red-carpet area at y=52, x=-9..-3, z=-400..-392 lost
 * 40 red_carpet cells (now air) since the committed post. 9 cells were already
 * restored by the town-expansion-current-safe-supplement. This package restores
 * the 40 drifted cells to their committed red_carpet state with exact guards.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-24T22:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'town-expansion-r1-red-carpet-drift-repair');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'town-expansion-r1-red-carpet-drift-repair';
const RELEASE_ID = 'TE-R1-RED-CARPET-DRIFT-REPAIR';
const RELEASE_NODE_ID = 'CZ-TOWN-EXPANSION-R1';
const DRIFT_SURVEY = 'data/world-review/town-expansion-drift-survey-20260824/town-expansion-drift-survey.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`TE red-carpet repair compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
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

const survey = readJson(DRIFT_SURVEY);
const driftCells = survey.findings.filter((f) => (
  f.kind === 'unexplained-change'
  && String(f.committedPostState).includes('red_carpet')
  && f.currentState === 'minecraft:air'
  && f.attribution?.kind === 'genuine-drift'
)).map((f) => {
  const [x, y, z] = f.cell.split(',').map(Number);
  return { x, y, z };
});
invariant(driftCells.length === 40, `expected 40 drifted red-carpet cells, got ${driftCells.length}`);

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const records = [];
const targetKeys = new Set();
for (const cell of driftCells) {
  const key = cellKey(cell);
  const sourceState = await reader.blockState(cell.x, cell.y, cell.z);
  const sourceCommand = stateToCommandString(sourceState);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  invariant(!isFluid(sourceCommand), `fluid source at ${key}`);
  invariant(sourceCommand === 'minecraft:air', `source not air at ${key}: ${sourceCommand}`);
  targetKeys.add(key);
  records.push({ cell, sourceState: sourceCommand, targetState: 'minecraft:red_carpet' });
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
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)))) haloFluidCount += 1;
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);

const ordered = records.slice().sort((a, b) => a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const rollback = ordered.slice().reverse().map(
  ({ cell, sourceState, targetState }) => ({ cell, sourceState: targetState, targetState: sourceState }),
);
const forwardBody = `${ordered.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const rollbackBody = `${rollback.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const targetCoordinateSetSha256 = hashCells(records.map(({ cell }) => cell));
const canonicalForward = `data/buildops/${BASENAME}.red-carpet-repair.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.red-carpet-repair.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (red-carpet-repair ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(canonicalForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(canonicalRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['TE-REGIONAL-APPROACH-ROAD', 'TE-CIVIC-RED-CARPET'],
  packages: [{ key: 'red-carpet-repair', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['red-carpet-repair'], rollback: ['red-carpet-repair'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'TOWN-EXPANSION-R1',
    purpose: 'Restore the 40 committed red_carpet cells (y=52, x=-9..-3, z=-400..-392) that drifted to air since the committed Town Expansion R1 post.',
    repairCells: classManifest(records.map(({ cell }) => cell)),
    interactionHalo: classManifest(halo),
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
    driftSurvey: fileBinding(DRIFT_SURVEY),
  },
  target: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    desiredStateCensus: census(records, (r) => r.targetState),
    sourceStateCensus: census(records, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'red-carpet-repair': {
      role: 'red-carpet drift restore',
      forwardSha256, rollbackSha256,
      forwardCommandCount: records.length,
      rollbackCommandCount: rollback.length,
      targetCellCount: records.length,
      targetCoordinateSetSha256,
      exactInverse: true,
    },
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
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
  targetCount: records.length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
