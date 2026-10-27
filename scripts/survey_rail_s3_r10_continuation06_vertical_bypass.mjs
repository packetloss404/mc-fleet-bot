#!/usr/bin/env node
/** Read-only bounded dry-cross-section search above R10 continuation-05 retention. */
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
const boundsValues = value('--bounds', '26,45,42,52,-464,-453').split(',').map(Number);
if (!snapshot || !out || boundsValues.length !== 6 || boundsValues.some((entry) => !Number.isInteger(entry))) throw new Error('usage: --snapshot <post-root> --out <json> [--bounds minX,maxX,minY,maxY,minZ,maxZ]');
const bounds = { minX: boundsValues[0], maxX: boundsValues[1], minY: boundsValues[2], maxY: boundsValues[3], minZ: boundsValues[4], maxZ: boundsValues[5] };
if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY || bounds.minZ > bounds.maxZ || bounds.maxY - bounds.minY < 5 || bounds.maxZ - bounds.minZ < 5) throw new Error('bounds must be ordered and at least 6 high/wide');
const reader = new AnvilReader(path.resolve(process.cwd(), snapshot, 'region'));
const cache = new Map();
const state = async (point) => {
  const key = cellKey(point);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return cache.get(key);
};
const isFluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const records = [];
for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) records.push({ point: { x, y, z }, state: await state({ x, y, z }) });
const fluids = records.filter(({ state: observed }) => isFluid(observed));
const gravel = records.filter(({ state: observed }) => observed === 'minecraft:gravel');
const byKey = new Map(records.map((record) => [cellKey(record.point), record.state]));
const candidates = [];
for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let baseY = bounds.minY; baseY <= bounds.maxY - 5; baseY += 1) for (let minZ = bounds.minZ; minZ <= bounds.maxZ - 5; minZ += 1) {
  const envelope = [];
  for (let y = baseY; y <= baseY + 5; y += 1) for (let z = minZ; z <= minZ + 5; z += 1) envelope.push({ x, y, z });
  const fluidBlockers = envelope.filter((point) => isFluid(byKey.get(cellKey(point))));
  const gravelBlockers = envelope.filter((point) => byKey.get(cellKey(point)) === 'minecraft:gravel');
  const blocked = [...fluidBlockers, ...gravelBlockers];
  candidates.push({ x, baseY, minZ, fluidBlockerCount: fluidBlockers.length, gravelBlockerCount: gravelBlockers.length, fluidOrGravityBlockerCount: blocked.length, blockers: blocked.slice(0, 12).map((point) => ({ point, state: byKey.get(cellKey(point)) })) });
}
const dryCandidates = candidates.filter(({ fluidOrGravityBlockerCount }) => fluidOrGravityBlockerCount === 0);
const fluidFreeCandidates = candidates.filter(({ fluidBlockerCount }) => fluidBlockerCount === 0);
const dryX = [...new Set(dryCandidates.map(({ x }) => x))].sort((left, right) => left - right);
const dryXRuns = [];
for (const x of dryX) {
  const previous = dryXRuns.at(-1);
  if (!previous || x !== previous.maxX + 1) dryXRuns.push({ minX: x, maxX: x });
  else previous.maxX = x;
}
for (const run of dryXRuns) run.length = run.maxX - run.minX + 1;
const maximumContinuousDryX = Math.max(0, ...dryXRuns.map(({ length }) => length));
const fixedCrossSections = (entries) => {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.baseY},${entry.minZ}`;
    if (!groups.has(key)) groups.set(key, { baseY: entry.baseY, minZ: entry.minZ, x: new Set() });
    groups.get(key).x.add(entry.x);
  }
  return [...groups.values()].filter(({ x }) => x.size === bounds.maxX - bounds.minX + 1).map(({ baseY, minZ, x }) => ({ baseY, minZ, minX: Math.min(...x), maxX: Math.max(...x) }));
};
const fixedFluidFreeCrossSections = fixedCrossSections(fluidFreeCandidates);
const fixedDryCrossSections = fixedCrossSections(dryCandidates);
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-continuation06-vertical-bypass-survey',
  snapshot,
  bounds,
  status: fixedDryCrossSections.length > 0 ? 'DRY_CONTINUOUS_6X6_BYPASS_CANDIDATE_REQUIRES_OWNERSHIP_DESIGN' : fixedFluidFreeCrossSections.length > 0 ? 'DRY_CONTINUOUS_6X6_BYPASS_REQUIRES_GRAVITY_STAGED_DESIGN' : 'HOLD_NO_CONTINUOUS_DRY_6X6_BYPASS_ACROSS_HARD_BOUNDED_ENVELOPE',
  counts: { sampled: records.length, fluid: fluids.length, gravel: gravel.length, candidate6x6: candidates.length, dryCandidate6x6: dryCandidates.length, fluidFreeCandidate6x6: fluidFreeCandidates.length, maximumContinuousDryX, fixedFluidFreeCrossSectionCount: fixedFluidFreeCrossSections.length, fixedDryCrossSectionCount: fixedDryCrossSections.length },
  fluid: { coordinateSetSha256: hashCells(fluids.map(({ point }) => point)), cells: fluids },
  gravel: { coordinateSetSha256: hashCells(gravel.map(({ point }) => point)), cells: gravel },
  candidates,
  dryCandidates,
  dryXRuns,
  fixedFluidFreeCrossSections,
  fixedDryCrossSections,
  readOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
fs.mkdirSync(path.dirname(path.resolve(process.cwd(), out)), { recursive: true });
fs.writeFileSync(path.resolve(process.cwd(), out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, counts: report.counts, dryXRuns, fixedFluidFreeCrossSections, fixedDryCrossSections, bestCandidates: candidates.slice().sort((a, b) => a.fluidOrGravityBlockerCount - b.fluidOrGravityBlockerCount).slice(0, 5) }, null, 2)}\n`);
