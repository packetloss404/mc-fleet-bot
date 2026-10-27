#!/usr/bin/env node
/** Read-only provenance map for the R10 roof-pocket post-QA fluid observation. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : '';
};
const sourceRoot = value('--source'); const observedRoot = value('--observed'); const out = value('--out');
if (!sourceRoot || !observedRoot || !out) throw new Error('usage: --source <root> --observed <root> --out <json>');
const root = process.cwd();
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const observed = new AnvilReader(path.resolve(root, observedRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const fluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const cells = [];
for (let x = -69; x <= -62; x += 1) for (let y = 37; y <= 42; y += 1) for (let z = -473; z <= -462; z += 1) cells.push({ x, y, z });
const sourceStates = new Map(); const observedStates = new Map(); const drift = [];
for (const point of cells) {
  const [before, after] = await Promise.all([state(source, point), state(observed, point)]);
  sourceStates.set(cellKey(point), before); observedStates.set(cellKey(point), after);
  if (before !== after) drift.push({ point, before, after });
}
const sourceFluid = cells.filter((point) => fluid(sourceStates.get(cellKey(point))));
const observedFluid = cells.filter((point) => fluid(observedStates.get(cellKey(point))));
const components = [];
const unvisited = new Set(sourceFluid.map(cellKey));
while (unvisited.size) {
  const start = [...unvisited][0].split(',').map(Number); const queue = [{ x: start[0], y: start[1], z: start[2] }]; const component = [];
  unvisited.delete(cellKey(queue[0]));
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index]; component.push(point);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const next = { x: point.x + dx, y: point.y + dy, z: point.z + dz };
      if (unvisited.delete(cellKey(next))) queue.push(next);
    }
  }
  components.push({ cellCount: component.length, coordinateSetSha256: hashCells(component), cells: component });
}
const declaredMoved = new Set(['-65,39,-464', '-64,39,-464', '-64,39,-463', '-63,39,-464', '-63,39,-463']);
const preservedOutsideDeclared = sourceFluid.filter((point) => !declaredMoved.has(cellKey(point)));
const report = {
  schemaVersion: 1, id: 'rail-s3-r10-roof-pocket-recovery-fluid-provenance', generatedAtUtc: new Date().toISOString(), sourceRoot, observedRoot,
  reviewBounds: { x: [-69, -62], y: [37, 42], z: [-473, -462] },
  sourceFluid: { count: sourceFluid.length, coordinateSetSha256: hashCells(sourceFluid), cells: sourceFluid },
  observedFluid: { count: observedFluid.length, coordinateSetSha256: hashCells(observedFluid), cells: observedFluid },
  sourceFluidComponents: components,
  preservedOutsideDeclaredTransfer: { count: preservedOutsideDeclared.length, coordinateSetSha256: hashCells(preservedOutsideDeclared), cells: preservedOutsideDeclared },
  changedCells: { count: drift.length, cells: drift },
  status: drift.length === 0 && hashCells(sourceFluid) === hashCells(observedFluid) ? 'PASS_PREEXISTING_FLUID_PROVENANCE' : 'FAIL_DRIFT_OR_FLUID_TOPOLOGY_CHANGE',
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, sourceFluid: sourceFluid.length, components: components.map(({ cellCount }) => cellCount), drift: drift.length }, null, 2)}\n`);
if (!report.status.startsWith('PASS')) process.exitCode = 1;
