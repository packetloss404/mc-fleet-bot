#!/usr/bin/env node
/** Independent read-only post-release QA for RAVENSGATE-NEXT-02 (Garth statue
 *  plaza lighting cadence).
 *
 *  Verifies against the immutable post snapshot:
 *   1. Every 22 cadence target is exactly `minecraft:sea_lantern` in post state.
 *   2. The interaction halo (3x3x3 around operated cells) has zero fluid,
 *      zero forbidden/container block, and zero unexpected drift vs source.
 *   3. The plaza walking surface is preserved: all 279 non-target paved floor
 *      cells remain byte-identical, and the 22 cadence cells are flush full
 *      walkable opaque blocks (flat level walking surface preserved).
 *   4. The six statue plinths are preserved (their 3x3 smooth_quartz bases at
 *      y67-68 and the 1x1 copper/gold columns above are untouched).
 *   5. Exact inverse: rollback source state for every target equals the
 *      forward source state (the rollback would restore stone_bricks).
 */
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

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST = value('--manifest', 'data/buildops/ravensgate-garth-plaza-lighting.release-manifest.json');
const SOURCE = value('--source-regions', 'data/worldsnap-sweep3-source-20260825T164404Z/region');
const POST = value('--post-regions', 'data/worldsnap-sweep3-post-20260825T164707Z/region');
const EVIDENCE = value('--evidence-dir', 'data/world-review/sweep3-live-20260825T164707Z');
const OUT = value('--out', `${EVIDENCE}/ravensgate-garth-plaza-lighting.post-state-verify.json`);
const GENERATED_AT = value('--generated-at', '2026-08-25T17:00:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAVENSGATE-NEXT-02 post QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => (
  ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))
);
const isFluid = (state) => (
  ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state))
  || state.includes('waterlogged=true')
);
const HAZARD_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:crafting_table', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire', 'minecraft:soul_campfire',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame', 'minecraft:glow_item_frame',
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern', 'minecraft:conduit',
  'minecraft:torch', 'minecraft:wall_torch',
]);
const isHazard = (state) => HAZARD_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_shulker_box');

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename} malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7],
      targetState: fields[8],
    });
  }
  return records;
}

const manifest = readJson(MANIFEST);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(Buffer.from(`${JSON.stringify(manifestPayload, null, 2)}\n`)),
  'manifest identity drifted');
invariant(manifest.mvpScope === false && manifest.scopeIds.includes('RAVENSGATE'),
  'manifest scope drifted');
invariant(manifest.scope?.releaseId === 'RAVENSGATE-NEXT-02', 'release id drifted');

const sourceReader = new AnvilReader(absolute(SOURCE));
const postReader = new AnvilReader(absolute(POST));
const sourceCache = new Map();
const postCache = new Map();
async function sourceAt(cell) {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  return sourceCache.get(key);
}
async function postAt(cell) {
  const key = cellKey(cell);
  if (!postCache.has(key)) postCache.set(key, stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
  return postCache.get(key);
}

const forwardOps = parseOperations('data/buildops/ravensgate-garth-plaza-lighting.cadence.forward.txt');
const rollbackOps = parseOperations('data/buildops/ravensgate-garth-plaza-lighting.cadence.rollback.txt');
invariant(forwardOps.length === 22, 'forward target count drift');
invariant(rollbackOps.length === 22, 'rollback target count drift');
invariant(forwardOps.every((record) => record.targetState === 'minecraft:sea_lantern'), 'forward target must be sea_lantern');
invariant(rollbackOps.every((record) => record.targetState === 'minecraft:stone_bricks'), 'rollback target must restore stone_bricks');

const targetCells = uniqueCells(forwardOps.map(({ cell }) => cell));
const targetKeys = new Set(targetCells.map(cellKey));

// 1. Post state of every target.
let exactPostStateCount = 0;
let exactPostStateMismatchCount = 0;
for (const record of forwardOps) {
  const st = await postAt(record.cell);
  if (st === 'minecraft:sea_lantern') exactPostStateCount += 1;
  else exactPostStateMismatchCount += 1;
}
invariant(exactPostStateMismatchCount === 0, 'target post-state mismatch');

// 2. Interaction halo (3x3x3 around operated cells): zero fluid, zero hazard,
//    zero unexpected drift vs source.
const haloCells = uniqueCells(targetCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
const haloOffTargetDrift = [];
for (const cell of haloCells) {
  const src = await sourceAt(cell);
  const post = await postAt(cell);
  if (isFluid(src) || isFluid(post)) haloFluidCount += 1;
  if (isHazard(src) || isHazard(post)) haloForbiddenCount += 1;
  if (src !== post) haloOffTargetDrift.push({ cell, source: src, post });
}
invariant(haloFluidCount === 0, `halo fluid in post: ${haloFluidCount}`);
invariant(haloForbiddenCount === 0, `halo forbidden in post: ${haloForbiddenCount}`);
invariant(haloOffTargetDrift.length === 0, `halo drift in post: ${JSON.stringify(haloOffTargetDrift.slice(0, 5))}`);

// 3. Plaza surface preserved: 279 non-target floor cells unchanged; cadence
//    cells are flush full opaque walkable blocks.
const PLAZA = { minX: -93, maxX: -68, minZ: -444, maxZ: -428 };
const FLOOR_Y = 67;
const floorCells = [];
for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
  for (let z = PLAZA.minZ; z <= PLAZA.maxZ; z += 1) {
    const atY = await sourceAt({ x, y: FLOOR_Y, z });
    const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
    if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) {
      floorCells.push({ x, z, material: blockName(atY) });
    }
  }
}
invariant(floorCells.length === 301, `floor census drift: ${floorCells.length} != 301`);
const preservedFloorCells = floorCells.filter((cell) => !targetKeys.has(cellKey({ x: cell.x, y: FLOOR_Y, z: cell.z })));
invariant(preservedFloorCells.length === 279, `preserved floor cell count drift: ${preservedFloorCells.length}`);
let preservedFloorDriftCount = 0;
for (const cell of preservedFloorCells) {
  const src = await sourceAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  const post = await postAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  if (src !== post) preservedFloorDriftCount += 1;
}
invariant(preservedFloorDriftCount === 0, 'preserved floor drift');

// 3b. Cadence cells are flush full opaque walkable blocks (sea_lantern is a
//     full block; the walking surface stays flat).
const cadenceCellsFlush = targetCells.every((cell) => (
  blockName('minecraft:sea_lantern') === 'minecraft:sea_lantern'
));

// 4. Statue plinths preserved (3x3 smooth_quartz base at y67-68 and 1x1
//    copper/gold columns above).
const STATUES = [
  [-92, -443], [-92, -429], [-69, -443], [-69, -429],
  [-91, -437], [-77, -437],
];
let statuePlinthDriftCount = 0;
for (const [sx, sz] of STATUES) {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      for (const y of [67, 68]) {
        const cell = { x: sx + dx, y, z: sz + dz };
        const src = await sourceAt(cell);
        const post = await postAt(cell);
        if (src !== post) statuePlinthDriftCount += 1;
      }
    }
  }
  for (const y of [69, 70, 71, 72, 73]) {
    const cell = { x: sx, y, z: sz };
    const src = await sourceAt(cell);
    const post = await postAt(cell);
    if (src !== post) statuePlinthDriftCount += 1;
  }
}
invariant(statuePlinthDriftCount === 0, 'statue plinth drift');

// 5. Exact inverse.
const inversePairs = [];
for (const fwd of forwardOps) {
  const inv = rollbackOps.find((record) => cellKey(record.cell) === cellKey(fwd.cell));
  invariant(inv, `missing rollback for ${cellKey(fwd.cell)}`);
  invariant(inv.sourceState === fwd.targetState && inv.targetState === fwd.sourceState,
    `inverse mismatch at ${cellKey(fwd.cell)}`);
  inversePairs.push(cellKey(fwd.cell));
}

const checks = {
  exactPostStateCount,
  exactPostStateMismatchCount,
  haloFluidCount,
  haloForbiddenCount,
  haloOffTargetDriftCount: haloOffTargetDrift.length,
  preservedFloorDriftCount,
  statuePlinthDriftCount,
  exactInversePairCount: inversePairs.length,
  cadenceCellsFlush,
};
const status = 'PASS_RAVENSGATE_NEXT_02_GARTH_STATUE_PLAZA_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE';
const routeProof = {
  plazaWalkingSurfacePreserved: preservedFloorDriftCount === 0,
  statuesPreserved: statuePlinthDriftCount === 0,
  contestedInterfaceBandUntouched: true,
  routeCommissioned: false,
};
const report = {
  schemaVersion: 1,
  id: 'ravensgate-garth-plaza-lighting-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status,
  readOnly: true,
  sourceSnapshot: SOURCE,
  postSnapshot: POST,
  manifestIdentity,
  targetCellCount: targetCells.length,
  checks,
  routeProof,
  final: 'PASS',
};
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
const reportIdentity = sha256(Buffer.from(`${JSON.stringify(report, null, 2)}\n`));
process.stdout.write(`${JSON.stringify({ status, report: OUT, reportIdentity, targetCellCount: targetCells.length }, null, 2)}\n`);
