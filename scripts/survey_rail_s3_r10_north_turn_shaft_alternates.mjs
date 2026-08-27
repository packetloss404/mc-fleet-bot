#!/usr/bin/env node
/** Read-only, hard-bounded fixed 6x6 alternate search for the R10 north shaft. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
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
const fluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const box = (min, max) => { const cells = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push({ x, y, z }); return cells; };
const inspect = async (cells) => {
  const records = await Promise.all(cells.map(async (point) => ({ point, state: await state(point) })));
  return { cells: records.length, fluid: records.filter(({ state: observed }) => fluid(observed)), gravel: records.filter(({ state: observed }) => observed === 'minecraft:gravel'), pds: records.filter(({ state: observed }) => observed === 'minecraft:polished_deepslate') };
};

// This is deliberately a finite direct-state survey: 16 x-placement candidates
// and 15 north-facing shaft positions inside one exact box. It does not infer
// a connected-fluid boundary beyond that box.
const bounds = { x: [16, 37], y: [28, 48], z: [-472, -438] };
const candidates = [];
for (let minX = 20; minX <= 30; minX += 1) {
  for (let minZ = -462; minZ <= -448; minZ += 1) {
    const shaft = box({ x: minX, y: 28, z: minZ }, { x: minX + 5, y: 41, z: minZ + 5 });
    const turn = box({ x: minX, y: 42, z: -472 }, { x: minX + 5, y: 47, z: minZ + 5 });
    const shaftResult = await inspect(shaft);
    const turnResult = await inspect(turn);
    const dry = shaftResult.fluid.length === 0 && shaftResult.gravel.length === 0 && turnResult.fluid.length === 0 && turnResult.gravel.length === 0;
    const directNorthHighJunction = minX >= 26 && minX + 5 <= 45;
    candidates.push({ minX, minZ, directNorthHighJunction, shaft: { cells: shaftResult.cells, fluid: shaftResult.fluid.length, gravel: shaftResult.gravel.length, pds: shaftResult.pds.length }, turn: { cells: turnResult.cells, fluid: turnResult.fluid.length, gravel: turnResult.gravel.length, pds: turnResult.pds.length }, dry });
  }
}
const dry = candidates.filter(({ dry }) => dry);
const directDry = dry.filter(({ directNorthHighJunction }) => directNorthHighJunction);
const blockingFluid = new Map();
for (const candidate of candidates.filter(({ dry }) => !dry)) {
  const shaft = box({ x: candidate.minX, y: 28, z: candidate.minZ }, { x: candidate.minX + 5, y: 41, z: candidate.minZ + 5 });
  const turn = box({ x: candidate.minX, y: 42, z: -472 }, { x: candidate.minX + 5, y: 47, z: candidate.minZ + 5 });
  for (const record of (await inspect([...shaft, ...turn])).fluid) blockingFluid.set(cellKey(record.point), record);
}
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-north-turn-shaft-alternate-alignment-survey',
  snapshot,
  bounds,
  method: 'finite direct-state fixed-6x6 survey; no component BFS and no inferred source outside bounds',
  candidateCount: candidates.length,
  dryCandidateCount: dry.length,
  directNorthHighJunctionDryCandidateCount: directDry.length,
  directNorthHighJunctionRequirement: 'six-cell x-overlap with North High x=26..45 at y=42..47',
  dryCandidates: dry.slice(0, 25),
  candidateSummary: candidates,
  blockingFluid: { count: blockingFluid.size, coordinateSetSha256: hashCells([...blockingFluid.values()].map(({ point }) => point)), cells: [...blockingFluid.values()] },
  status: directDry.length ? 'DRY_DIRECT_NORTH_HIGH_ALTERNATE_REQUIRES_OWNERSHIP_REVIEW' : dry.length ? 'ONLY_DISCONNECTED_DRY_ALTERNATES_FOUND_NO_SIX_CELL_NORTH_HIGH_JUNCTION' : 'NO_DRY_FIXED_6X6_SHAFT_TURN_IN_HARD_BOUNDED_SEARCH_BOX',
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(process.cwd(), out)), { recursive: true });
fs.writeFileSync(path.resolve(process.cwd(), out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, candidateCount: report.candidateCount, dryCandidateCount: report.dryCandidateCount, directNorthHighJunctionDryCandidateCount: report.directNorthHighJunctionDryCandidateCount, dryCandidates: report.dryCandidates.map(({ minX, minZ, directNorthHighJunction, shaft, turn }) => ({ minX, minZ, directNorthHighJunction, shaft, turn })), blockingFluid: report.blockingFluid.count }, null, 2)}\n`);
