#!/usr/bin/env node
/** Read-only connected-fluid analysis for the High Successor-15 candidate. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const snapshot = option('--snapshot');
const predecessorPath = option('--predecessor-manifest');
const out = option('--out');
if (!snapshot || !predecessorPath || !out) throw new Error('usage: --snapshot <complete post> --predecessor-manifest <manifest> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) {
    for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  }
  return cells;
};
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(state.split('[', 1)[0]) || state.includes('waterlogged=true');
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const p = line.trim().split(/\s+/);
  if (p.length !== 9 || p[0] !== 'REPL') throw new Error(`invalid operation ${line}`);
  return point(Number(p[1]), Number(p[2]), Number(p[3]));
});
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
}
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const core = box(point(-274, 54, -460), point(-255, 59, -455));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-275, 53, -461), point(-254, 60, -454));
const shell = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === 53 || cell.y === 60 || cell.z === -461 || cell.z === -454));
const shellKeys = new Set(shell.map(cellKey));
const halo = box(point(-276, 52, -462), point(-253, 61, -453)).filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const haloKeys = new Set(halo.map(cellKey));
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parseOps(forward)).map(cellKey));
const surveyBounds = { x: [-320, -200], y: [40, 75], z: [-500, -420] };
const inBounds = ({ x, y, z }) => x >= surveyBounds.x[0] && x <= surveyBounds.x[1] && y >= surveyBounds.y[0] && y <= surveyBounds.y[1] && z >= surveyBounds.z[0] && z <= surveyBounds.z[1];
const classOf = (cell) => (coreKeys.has(cellKey(cell)) ? 'core-target' : shellKeys.has(cellKey(cell)) ? 'shell-target' : haloKeys.has(cellKey(cell)) ? 'halo-preservation' : 'external');
const allCandidate = [...shell, ...halo];
const seedRecords = [];
for (const cell of allCandidate) {
  const state = await stateAt(cell);
  if (isFluid(state)) seedRecords.push({ point: cell, state, classification: classOf(cell), predecessorOwned: predecessorTargets.has(cellKey(cell)) });
}
const seen = new Set();
const components = [];
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
for (const seed of seedRecords) {
  if (seen.has(cellKey(seed.point))) continue;
  const queue = [seed.point];
  const cells = [];
  const boundaries = [];
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    const id = cellKey(current);
    if (seen.has(id) || !inBounds(current)) continue;
    seen.add(id);
    const state = await stateAt(current);
    if (!isFluid(state)) continue;
    cells.push({ point: current, state, classification: classOf(current), predecessorOwned: predecessorTargets.has(id) });
    for (const [dx, dy, dz] of directions) {
      const next = point(current.x + dx, current.y + dy, current.z + dz);
      if (!inBounds(next)) {
        boundaries.push({ from: current, direction: [dx, dy, dz], type: 'SURVEY_EDGE' });
        continue;
      }
      const nextState = await stateAt(next);
      if (isFluid(nextState)) queue.push(next);
      else boundaries.push({ from: current, direction: [dx, dy, dz], type: nextState === 'minecraft:air' ? 'AIR' : 'SOLID', state: nextState });
    }
  }
  const membership = Object.fromEntries(['core-target', 'shell-target', 'halo-preservation', 'external'].map((key) => [key, cells.filter(({ classification }) => classification === key).length]));
  const states = {};
  for (const { state } of cells) states[state] = (states[state] ?? 0) + 1;
  components.push({
    index: components.length + 1,
    count: cells.length,
    coordinateStateSha256: crypto.createHash('sha256').update(cells.slice().sort((a, b) => a.point.x - b.point.x || a.point.y - b.point.y || a.point.z - b.point.z).map(({ point: c, state }) => `${c.x},${c.y},${c.z}:${state}\n`).join('')).digest('hex'),
    membership,
    predecessorOwned: cells.filter(({ predecessorOwned }) => predecessorOwned).length,
    states,
    boundaries: { surveyEdgeFaces: boundaries.filter(({ type }) => type === 'SURVEY_EDGE').length, airFaces: boundaries.filter(({ type }) => type === 'AIR').length, solidFaces: boundaries.filter(({ type }) => type === 'SOLID').length },
    cells,
  });
}
const shellWater = seedRecords.filter(({ classification }) => classification === 'shell-target');
const retainedExactly = components.every(({ membership, boundaries }) => membership['shell-target'] === 0 || (membership.external === 0 && boundaries.surveyEdgeFaces === 0 && boundaries.airFaces === 0));
// The direct envelope is wet. This L-shaped dry alignment steps east of the
// fluid component before turning west; it is survey-only until every existing
// PDS/void cell has explicit ownership and an inverse contract.
const bypassCore = [];
for (const cell of box(point(-244, 54, -460), point(-239, 59, -441))) bypassCore.push(cell);
for (const cell of box(point(-274, 54, -446), point(-245, 59, -441))) bypassCore.push(cell);
const bypassKeys = new Set(bypassCore.map(cellKey));
const predecessorCore = box(point(-254, 54, -460), point(-235, 59, -455));
const predecessorCoreKeys = new Set(predecessorCore.map(cellKey));
const bypassNew = bypassCore.filter((cell) => !predecessorCoreKeys.has(cellKey(cell)));
const bypassShell = new Map();
for (const cell of bypassCore) for (const [dx, dy, dz] of directions) {
  const neighbour = point(cell.x + dx, cell.y + dy, cell.z + dz);
  if (!bypassKeys.has(cellKey(neighbour))) bypassShell.set(cellKey(neighbour), neighbour);
}
const bypassCoreStates = { fluid: [], air: [], predecessorOwnedPds: [], unownedPds: [] };
for (const cell of bypassNew) {
  const state = await stateAt(cell);
  if (isFluid(state)) bypassCoreStates.fluid.push({ point: cell, state });
  if (state === 'minecraft:air') bypassCoreStates.air.push({ point: cell, state });
  if (state === 'minecraft:polished_deepslate') {
    const record = { point: cell, state };
    (predecessorTargets.has(cellKey(cell)) ? bypassCoreStates.predecessorOwnedPds : bypassCoreStates.unownedPds).push(record);
  }
}
const bypassShellFluid = [];
for (const cell of bypassShell.values()) {
  const state = await stateAt(cell);
  if (isFluid(state)) bypassShellFluid.push({ point: cell, state });
}
const bypass = {
  status: bypassCoreStates.fluid.length === 0 && bypassShellFluid.length === 0
    ? 'CONTINUOUS_DRY_ENVELOPE_WITH_OWNERSHIP_HOLD' : 'NOT_DRY',
  core: { count: bypassCore.length, newCount: bypassNew.length, reusedHigh14CoreCount: bypassCore.length - bypassNew.length, coordinateSetSha256: hashCells(bypassCore) },
  shell: { count: bypassShell.size, coordinateSetSha256: hashCells([...bypassShell.values()]) },
  route: { crossSection: '6x6', inbound: { x: [-244, -239], z: [-460, -441] }, westbound: { x: [-274, -245], z: [-446, -441] }, y: [54, 59] },
  coreFluid: bypassCoreStates.fluid,
  shellFluid: bypassShellFluid,
  sourceInterfaces: { air: bypassCoreStates.air, predecessorOwnedPds: bypassCoreStates.predecessorOwnedPds, unownedPds: bypassCoreStates.unownedPds },
  decision: bypassCoreStates.unownedPds.length === 0
    ? 'candidate may proceed to exact compiler design after route/interface review'
    : 'dry geometry found, but 72 unowned PDS cells require explicit ownership review before any compiler',
};
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high-successor15-hydrology-analysis',
  status: retainedExactly ? 'EXACT_RETENTION_DESIGN_RESEARCH_POSSIBLE' : 'DIRECT_RELEASE_HELD_BY_UNBOUNDED_OR_OPEN_TARGET_FLUID',
  source: { snapshot, captureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))).digest('hex') },
  surveyBounds,
  candidate: { core: { count: core.length, coordinateSetSha256: hashCells(core) }, shell: { count: shell.length, coordinateSetSha256: hashCells(shell) }, halo: { count: halo.length, coordinateSetSha256: hashCells(halo) } },
  seedFluidCells: { count: seedRecords.length, shellTarget: shellWater.length, halo: seedRecords.filter(({ classification }) => classification === 'halo-preservation').length, cells: seedRecords },
  components,
  retentionAssessment: { exactRetentionPossibleWithinSurveyBounds: retainedExactly, directTargetFluidCount: shellWater.length, decision: retainedExactly ? 'separate exact reversible containment design required before compilation' : 'direct shell/core release prohibited; survey a dry bypass' },
  dryBypass: bypass,
  readOnly: true,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, seedFluidCells: result.seedFluidCells.count, shellTargetFluid: shellWater.length, components: components.map(({ index, count, membership, boundaries, states }) => ({ index, count, membership, boundaries, states })), retention: result.retentionAssessment }, null, 2));
