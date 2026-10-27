#!/usr/bin/env node
/** Read-only exact survey for a northern R10 continuation-06 transition candidate. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot');
const out = value('--out');
if (!snapshot || !out) throw new Error('usage: --snapshot <post-root> --out <json>');
const reader = new AnvilReader(path.resolve(process.cwd(), snapshot, 'region'));
const cache = new Map();
const state = async (point) => {
  const key = cellKey(point);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return cache.get(key);
};
const isFluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const box = (id, min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push({ x, y, z });
  return { id, min, max, cells };
};
const scopes = [
  box('north-horizontal-6x6', { x: 26, y: 42, z: -472 }, { x: 45, y: 47, z: -467 }),
  box('north-turn-6x6', { x: 25, y: 42, z: -472 }, { x: 30, y: 47, z: -453 }),
  box('vertical-shaft-6x6', { x: 25, y: 28, z: -458 }, { x: 30, y: 47, z: -453 }),
];
const surveyed = [];
for (const scope of scopes) {
  const records = await Promise.all(scope.cells.map(async (point) => ({ point, state: await state(point) })));
  const fluid = records.filter(({ state: observed }) => isFluid(observed));
  const gravel = records.filter(({ state: observed }) => observed === 'minecraft:gravel');
  const polishedDeepslate = records.filter(({ state: observed }) => observed === 'minecraft:polished_deepslate');
  surveyed.push({ id: scope.id, bounds: { min: scope.min, max: scope.max }, cellCount: records.length, fluid, gravel, polishedDeepslate, dryAndGravitySafe: fluid.length === 0 && gravel.length === 0 });
}
const shaftGravel = surveyed.find(({ id }) => id === 'vertical-shaft-6x6').gravel;
const supportDependencies = await Promise.all(shaftGravel.map(async ({ point }) => {
  const below = { x: point.x, y: point.y - 1, z: point.z };
  return { gravel: point, below, belowState: await state(below) };
}));
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-continuation06-north-transition-survey',
  snapshot,
  status: surveyed[0].dryAndGravitySafe && surveyed[1].dryAndGravitySafe && surveyed[2].fluid.length === 0 ? 'DRY_NORTH_TRANSITION_CANDIDATE_REQUIRES_GRAVITY_STAGED_COMPILER' : 'HOLD_NORTH_TRANSITION_SOURCE_CONFLICT',
  scopes: surveyed.map(({ cells, ...scope }) => scope),
  shaftGravity: { gravelCount: shaftGravel.length, coordinateSetSha256: hashCells(shaftGravel.map(({ point }) => point)), dependencies: supportDependencies, requiredOrder: ['temporary-support below lowest gravel', 'clear top gravel', 'clear lower gravel', 'clear temporary support'] },
  ownership: { retentionChamberBounds: { x: [30, 35], y: [38, 42], z: [-465, -460] }, candidateShaftDisjointFromRetentionChamber: true, transitionRequiresReviewedInterfaceWithContinuation05Terminal: true, predecessorPolishedDeepslate: surveyed.find(({ id }) => id === 'vertical-shaft-6x6').polishedDeepslate },
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(process.cwd(), out)), { recursive: true });
fs.writeFileSync(path.resolve(process.cwd(), out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, scopes: report.scopes.map(({ id, cellCount, fluid, gravel, polishedDeepslate, dryAndGravitySafe }) => ({ id, cellCount, fluid: fluid.length, gravel: gravel.length, polishedDeepslate: polishedDeepslate.length, dryAndGravitySafe })), shaftGravity: report.shaftGravity, predecessorPds: report.ownership.predecessorPolishedDeepslate.length }, null, 2)}\n`);
