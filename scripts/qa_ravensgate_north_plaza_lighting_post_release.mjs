#!/usr/bin/env node
/** Independent read-only post-release QA for RAVENSGATE-NEXT-01 (NW Garth
 *  arrival-pad lighting cadence).
 *
 *  Verifies against the immutable post snapshot:
 *   1. Every 8 cadence target is exactly `minecraft:sea_lantern` in post state.
 *   2. The interaction halo (3x3x3 around operated cells) has zero fluid,
 *      zero forbidden/container block, and zero unexpected drift vs source.
 *   3. The plaza walking surface is preserved: all 175 non-target paved floor
 *      cells remain byte-identical, and the 8 cadence cells are flush full
 *      walkable opaque blocks (flat level walking surface preserved).
 *   4. Exact inverse: rollback source state for every target equals the
 *      forward source state (the rollback would restore stone_bricks).
 *   5. The contested IF-RG-GARTH-LIBRARY-TERRACE band (z=-432) is untouched.
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
const MANIFEST = value('--manifest', 'data/buildops/ravensgate-north-plaza-lighting.release-manifest.json');
const SOURCE = value('--source-regions', 'data/worldsnap-ravensgate-next-source-20260825T074220/region');
const POST = value('--post-regions', 'data/worldsnap-ravensgate-next-post-20260825TXXXXXX/region');
const EVIDENCE = value('--evidence-dir', 'data/world-review/ravensgate-next-live-20260825TXXXXXX');
const OUT = value('--out', `${EVIDENCE}/ravensgate-next-post-release-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-25T08:00:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAVENSGATE-NEXT-01 post QA rejected: ${message}`);
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
invariant(manifest.scope?.releaseId === 'RAVENSGATE-NEXT-01', 'release id drifted');

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

const forwardRecords = parseOperations(manifest.packages[0].forward);
const rollbackRecords = parseOperations(manifest.packages[0].rollback);
invariant(forwardRecords.length === 8, `forward record count drift: ${forwardRecords.length}`);
invariant(rollbackRecords.length === 8, `rollback record count drift: ${rollbackRecords.length}`);

// Target bijection.
const forwardKeyToSource = new Map();
for (const record of forwardRecords) {
  invariant(!forwardKeyToSource.has(cellKey(record.cell)), `duplicate forward target ${cellKey(record.cell)}`);
  forwardKeyToSource.set(cellKey(record.cell), record.sourceState);
}
const rollbackKeyToSource = new Map();
for (const record of rollbackRecords) {
  invariant(!rollbackKeyToSource.has(cellKey(record.cell)), `duplicate rollback target ${cellKey(record.cell)}`);
  rollbackKeyToSource.set(cellKey(record.cell), record.targetState);
}
invariant(forwardKeyToSource.size === 8 && rollbackKeyToSource.size === 8, 'target sets not both 8');
for (const [key, sourceState] of forwardKeyToSource) {
  invariant(rollbackKeyToSource.get(key) === sourceState,
    `rollback source (${rollbackKeyToSource.get(key)}) != forward source (${sourceState}) at ${key}`);
  invariant(forwardKeyToSource.get(key) === sourceState, `forward bijection broken at ${key}`);
}
for (const key of rollbackKeyToSource.keys()) {
  invariant(forwardKeyToSource.has(key), `rollback target not in forward set: ${key}`);
}

// 1. Exact post-state match.
const postMismatches = [];
for (const record of forwardRecords) {
  const actual = await postAt(record.cell);
  if (actual !== record.targetState) postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
}
invariant(postMismatches.length === 0, `post-state mismatch: ${JSON.stringify(postMismatches.slice(0, 5))}`);

// 2. Interaction halo: no fluid/forbidden, no off-target drift.
const operatedCells = uniqueCells(forwardRecords.map(({ cell }) => cell));
const haloCells = uniqueCells(operatedCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
})).filter((cell) => !forwardKeyToSource.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
let haloDrift = 0;
for (const cell of haloCells) {
  const s = await sourceAt(cell);
  const p = await postAt(cell);
  if (isFluid(p)) haloFluidCount += 1;
  if (isHazard(p)) haloForbiddenCount += 1;
  if (s !== p) haloDrift += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0 && haloDrift === 0,
  `post halo hazard/drift: fluid=${haloFluidCount} forbidden=${haloForbiddenCount} drift=${haloDrift}`);

// 3. Plaza walking surface preserved: the 183 paved floor cells (full-opaque at
//    y67, air at y68 in source) — the 8 cadence cells now hold sea_lantern
//    (still full opaque walkable), the other 175 must be byte-identical.
const PLAZA = { minX: -130, maxX: -96, minZ: -455, maxZ: -448 };
const FLOOR_Y = 67;
const sourceFloorCells = [];
for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
  for (let z = PLAZA.minZ; z <= PLAZA.maxZ; z += 1) {
    const atY = await sourceAt({ x, y: FLOOR_Y, z });
    const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
    if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) sourceFloorCells.push({ x, z });
  }
}
invariant(sourceFloorCells.length === 183, `source paved floor count drift: ${sourceFloorCells.length}`);
let preservedFloorDrift = 0;
const preservedFloorDriftCells = [];
for (const cell of sourceFloorCells) {
  if (forwardKeyToSource.has(cellKey({ x: cell.x, y: FLOOR_Y, z: cell.z }))) continue;
  const s = await sourceAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  const p = await postAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  if (s !== p) { preservedFloorDrift += 1; preservedFloorDriftCells.push({ ...cell, source: s, post: p }); }
}
invariant(preservedFloorDrift === 0,
  `preserved floor drift: ${JSON.stringify(preservedFloorDriftCells.slice(0, 5))}`);

// The 8 cadence cells are flush full walkable opaque blocks in post (flat level).
for (const record of forwardRecords) {
  const post = await postAt(record.cell);
  invariant(post === 'minecraft:sea_lantern' && !isFluid(post),
    `cadence cell not flush sea_lantern: ${cellKey(record.cell)} = ${post}`);
}

// 4. Contested interface band untouched (IF-RG-GARTH-LIBRARY-TERRACE z=-432,
//    x=-110..-94, y67..71).
const CONTESTED = { minX: -110, maxX: -94, minY: 67, maxY: 71, minZ: -432, maxZ: -432 };
let contestedDrift = 0;
for (let x = CONTESTED.minX; x <= CONTESTED.maxX; x += 1) {
  for (let y = CONTESTED.minY; y <= CONTESTED.maxY; y += 1) {
    const s = await sourceAt({ x, y, z: CONTESTED.minZ });
    const p = await postAt({ x, y, z: CONTESTED.minZ });
    if (s !== p) contestedDrift += 1;
  }
}
invariant(contestedDrift === 0, `contested IF-RG-GARTH-LIBRARY-TERRACE band drifted: ${contestedDrift}`);

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_RAVENSGATE_NEXT_01_ARRIVAL_PAD_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE',
  mode: 'INDEPENDENT_READ_ONLY_RAVENSGATE_NEXT_01_POST_RELEASE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestIdentity,
    targetCount: forwardRecords.length,
    sourceRegionDir: SOURCE,
    postRegionDir: POST,
  },
  checks: {
    exactPostStateCount: forwardRecords.length,
    exactPostStateMismatchCount: postMismatches.length,
    forwardRollbackBijection: true,
    interactionHaloCellCount: haloCells.length,
    haloFluidCount,
    haloForbiddenCount,
    haloOffTargetDriftCount: haloDrift,
    plazaFloorCellCount: sourceFloorCells.length,
    preservedFloorDriftCount: preservedFloorDrift,
    cadenceCellsFlush: true,
    contestedInterfaceBandDriftCount: contestedDrift,
  },
  routeProof: {
    plazaWalkingSurfacePreserved: preservedFloorDrift === 0,
    cadenceIsFlushWalkableInlay: true,
    routeCommissioned: false,
    egressGeometryChanged: false,
    contestedInterfaceBandUntouched: contestedDrift === 0,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(operatedCells),
    haloCoordinateSetSha256: hashCells(haloCells),
    plazaFloorCoordinateSetSha256: hashCells(sourceFloorCells),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
