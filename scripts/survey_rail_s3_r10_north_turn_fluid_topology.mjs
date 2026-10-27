#!/usr/bin/env node
/**
 * Finite read-only topology census for the fluid blocking R10's north turn.
 * Components are intentionally classified only within the stated envelope;
 * a component touching an envelope face is an unresolved escape, never a
 * containment candidate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const snapshot = value('--snapshot');
const out = value('--out');
if (!snapshot || !out) throw new Error('usage: --snapshot <post-root> --out <json>');
const bounds = { min: { x: 20, y: 42, z: -465 }, max: { x: 45, y: 55, z: -438 } };
const reader = new AnvilReader(path.resolve(process.cwd(), snapshot, 'region'));
const fluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const cells = new Map();
const gravityHalo = [];
for (let x = bounds.min.x; x <= bounds.max.x; x += 1) for (let y = bounds.min.y; y <= bounds.max.y; y += 1) for (let z = bounds.min.z; z <= bounds.max.z; z += 1) {
  const point = { x, y, z };
  const state = stateToCommandString(await reader.blockState(x, y, z));
  if (fluid(state)) cells.set(cellKey(point), { point, state });
  if (state === 'minecraft:gravel') gravityHalo.push({ point, state });
}
const directions = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const remaining = new Set(cells.keys());
const components = [];
while (remaining.size) {
  const first = remaining.values().next().value;
  const queue = [first];
  remaining.delete(first);
  const component = [];
  while (queue.length) {
    const key = queue.pop();
    const entry = cells.get(key);
    component.push(entry);
    for (const [dx, dy, dz] of directions) {
      const neighbor = cellKey({ x: entry.point.x + dx, y: entry.point.y + dy, z: entry.point.z + dz });
      if (remaining.delete(neighbor)) queue.push(neighbor);
    }
  }
  const boundaryFaces = new Set();
  for (const { point } of component) {
    if (point.x === bounds.min.x) boundaryFaces.add('x-min');
    if (point.x === bounds.max.x) boundaryFaces.add('x-max');
    if (point.y === bounds.min.y) boundaryFaces.add('y-min');
    if (point.y === bounds.max.y) boundaryFaces.add('y-max');
    if (point.z === bounds.min.z) boundaryFaces.add('z-min');
    if (point.z === bounds.max.z) boundaryFaces.add('z-max');
  }
  const min = { x: Math.min(...component.map(({ point }) => point.x)), y: Math.min(...component.map(({ point }) => point.y)), z: Math.min(...component.map(({ point }) => point.z)) };
  const max = { x: Math.max(...component.map(({ point }) => point.x)), y: Math.max(...component.map(({ point }) => point.y)), z: Math.max(...component.map(({ point }) => point.z)) };
  const water = component.filter(({ state }) => state.startsWith('minecraft:water')).length;
  const bubble = component.filter(({ state }) => state.startsWith('minecraft:bubble_column')).length;
  components.push({ count: component.length, coordinateSetSha256: hashCells(component.map(({ point }) => point)), bounds: { min, max }, water, bubble, envelopeBoundaryFaces: [...boundaryFaces].sort(), boundedWithinEnvelope: boundaryFaces.size === 0, cells: component });
}
components.sort((left, right) => right.count - left.count);
const unresolved = components.filter(({ boundedWithinEnvelope }) => !boundedWithinEnvelope);
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-north-turn-fluid-topology',
  snapshot,
  bounds,
  method: 'complete direct-state census and six-neighbor component labelling strictly inside this finite envelope; boundary contact is an unresolved escape',
  fluidCellCount: cells.size,
  components,
  unresolvedComponents: unresolved.length,
  gravityHalo: { count: gravityHalo.length, coordinateSetSha256: hashCells(gravityHalo.map(({ point }) => point)), cells: gravityHalo },
  containmentPrerequisites: {
    componentMustNotTouchSurveyBoundary: true,
    retentionCapacityAndExactTransferRequired: true,
    shellMustBeOutsideTurnCoreAndPriorRetentionTargets: true,
    sourceAndInverseGuardsMustBindAllTransferAndShellCells: true,
    status: unresolved.length ? 'FAIL_UNRESOLVED_COMPONENT_ESCAPE' : 'POTENTIALLY_BOUNDED_COMPONENTS_REQUIRE_SEPARATE_RETENTION_DESIGN',
  },
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(process.cwd(), out)), { recursive: true });
fs.writeFileSync(path.resolve(process.cwd(), out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ fluidCellCount: report.fluidCellCount, componentCount: components.length, components: components.map(({ count, bounds, water, bubble, envelopeBoundaryFaces, boundedWithinEnvelope }) => ({ count, bounds, water, bubble, envelopeBoundaryFaces, boundedWithinEnvelope })), gravityHalo: gravityHalo.length, containmentStatus: report.containmentPrerequisites.status }, null, 2)}\n`);
