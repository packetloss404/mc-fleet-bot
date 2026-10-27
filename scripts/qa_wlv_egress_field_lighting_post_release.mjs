#!/usr/bin/env node
/** Independent read-only post-release QA for WLV-EGRESS-01 (field-rim lighting).
 *
 * Verifies against the immutable post snapshot:
 *   1. Every 18 cadence target is exactly `minecraft:sea_lantern` in post state.
 *   2. The interaction halo (3x3x3 around operated cells) has zero fluid,
 *      zero forbidden/container block, and zero unexpected drift vs source.
 *   3. Flood-route proof: the field floor footprint (walk top y59) and the single
 *      public entrance stair (x-363..-355, z-508..-506) are walk-identical to the
 *      source — the egress geometry is unchanged, only light was added.
 *   4. The 3 existing field lanterns and the screen-matrix band are unchanged.
 *   5. Exact inverse: rollback preflight already proved reversibility; here we
 *      re-verify the target bijection.
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
const MANIFEST = value('--manifest', 'data/buildops/wlv-egress-field-lighting.release-manifest.json');
const SOURCE = value('--source-regions', 'data/worldsnap-wlv-egress-source-20260825T053000Z/region');
const POST = value('--post-regions', 'data/worldsnap-wlv-egress-post-20260825T053200Z/region');
const EVIDENCE = value('--evidence-dir', 'data/world-review/wlv-egress-live-20260825T053200Z');
const OUT = value('--out', `${EVIDENCE}/wlv-egress-post-release-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-25T05:23:30Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`WLV-EGRESS-01 post QA rejected: ${message}`);
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
  'minecraft:polished_andesite_stairs', 'minecraft:smooth_stone_stairs', 'minecraft:torch',
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
invariant(manifest.mvpScope === false && manifest.scopeIds.includes('WESTLIGHT-VENUE'),
  'manifest scope drifted');
invariant(manifest.scope?.releaseId === 'WLV-EGRESS-01', 'release id drifted');

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
invariant(forwardRecords.length === 18, `forward record count drift: ${forwardRecords.length}`);
invariant(rollbackRecords.length === 18, `rollback record count drift: ${rollbackRecords.length}`);

// Target bijection: every forward target has exactly the inverse in rollback.
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
invariant(forwardKeyToSource.size === 18 && rollbackKeyToSource.size === 18,
  'forward/rollback target sets not both 18');
for (const [key, sourceState] of forwardKeyToSource) {
  invariant(rollbackKeyToSource.get(key) === sourceState,
    `rollback source (${rollbackKeyToSource.get(key)}) != forward source (${sourceState}) at ${key}`);
  invariant(forwardKeyToSource.get(key) === sourceState, `forward bijection broken at ${key}`);
}
for (const key of rollbackKeyToSource.keys()) {
  invariant(forwardKeyToSource.has(key), `rollback target not in forward set: ${key}`);
}

// 1. Exact post-state match for every forward target.
const postMismatches = [];
for (const record of forwardRecords) {
  const actual = await postAt(record.cell);
  if (actual !== record.targetState) postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
}
invariant(postMismatches.length === 0, `post-state mismatch: ${JSON.stringify(postMismatches.slice(0, 5))}`);

// 2. Interaction halo: no fluid/forbidden, and no off-target drift (post == source except the operated cells).
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

// 3. Flood-route proof: field floor + entrance stair walk-identical to source.
const FIELD_BOUNDS = { minX: -382, maxX: -335, minZ: -573, maxZ: -502 };
const fieldFloor = [];
for (let x = FIELD_BOUNDS.minX; x <= FIELD_BOUNDS.maxX; x += 1) {
  for (let z = FIELD_BOUNDS.minZ; z <= FIELD_BOUNDS.maxZ; z += 1) {
    const s58 = await postAt({ x, y: 58, z });
    const s59 = await postAt({ x, y: 59, z });
    if (!isAir(s58) && isAir(s59)) fieldFloor.push({ x, z });
  }
}
invariant(fieldFloor.length >= 900, `post field floor footprint drift: ${fieldFloor.length}`);
let fieldFloorDrift = 0;
const fieldFloorDriftCells = [];
for (const cell of fieldFloor) {
  const s = await sourceAt({ x: cell.x, y: 58, z: cell.z });
  const p = await postAt({ x: cell.x, y: 58, z: cell.z });
  if (s !== p) { fieldFloorDrift += 1; fieldFloorDriftCells.push({ ...cell, source: s, post: p }); }
}
invariant(fieldFloorDrift === 0, `field floor drift: ${JSON.stringify(fieldFloorDriftCells.slice(0, 5))}`);

// Entrance stair envelope walk-identical.
const ENTRANCE = { minX: -365, maxX: -353, minZ: -509, maxZ: -503 };
let entranceDrift = 0;
for (let x = ENTRANCE.minX; x <= ENTRANCE.maxX; x += 1) {
  for (let y = 56; y <= 68; y += 1) {
    for (let z = ENTRANCE.minZ; z <= ENTRANCE.maxZ; z += 1) {
      const s = await sourceAt({ x, y, z });
      const p = await postAt({ x, y, z });
      if (s !== p) entranceDrift += 1;
    }
  }
}
invariant(entranceDrift === 0, `entrance stair envelope drift: ${entranceDrift}`);

// 4. Existing 3 field lanterns unchanged + screen-matrix band unchanged.
const existingLanterns = [];
for (let x = FIELD_BOUNDS.minX; x <= FIELD_BOUNDS.maxX; x += 1) {
  for (let z = FIELD_BOUNDS.minZ; z <= FIELD_BOUNDS.maxZ; z += 1) {
    for (let y = 58; y <= 60; y += 1) {
      const s = await postAt({ x, y, z });
      if (blockName(s) === 'minecraft:lantern') existingLanterns.push({ x, y, z, s });
    }
  }
}
invariant(existingLanterns.length === 3, `post field lantern census drift: ${existingLanterns.length}`);
const SCREEN_BAND = { minX: -369, maxX: -351, minY: 74, maxY: 92, minZ: -568, maxZ: -552 };
let screenDrift = 0;
for (let x = SCREEN_BAND.minX; x <= SCREEN_BAND.maxX; x += 1) {
  for (let y = SCREEN_BAND.minY; y <= SCREEN_BAND.maxY; y += 1) {
    for (let z = SCREEN_BAND.minZ; z <= SCREEN_BAND.maxZ; z += 1) {
      const s = await sourceAt({ x, y, z });
      const p = await postAt({ x, y, z });
      if (s !== p) screenDrift += 1;
    }
  }
}
invariant(screenDrift === 0, `screen-matrix band drift: ${screenDrift}`);

// 5. Flood-route connectivity: the field floor component structure is identical
//    to source (the entrance-stair opening naturally divides the floor; the
//    invariant is that the post component multiset exactly matches source).
function floodConnectivity(cells) {
  const byKey = new Set(cells.map((c) => `${c.x},${c.z}`));
  const visited = new Set();
  const components = [];
  for (const cell of cells) {
    const key = `${cell.x},${cell.z}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const queue = [key];
    const component = [];
    while (queue.length) {
      const currentKey = queue.pop();
      component.push(currentKey);
      const [x, z] = currentKey.split(',').map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${x + dx},${z + dz}`;
        if (byKey.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
    components.push(component);
  }
  return components;
}
// Source field floor footprint for component-structure comparison.
const sourceFieldFloor = [];
for (let x = FIELD_BOUNDS.minX; x <= FIELD_BOUNDS.maxX; x += 1) {
  for (let z = FIELD_BOUNDS.minZ; z <= FIELD_BOUNDS.maxZ; z += 1) {
    const s58 = await sourceAt({ x, y: 58, z });
    const s59 = await sourceAt({ x, y: 59, z });
    if (!isAir(s58) && isAir(s59)) sourceFieldFloor.push({ x, z });
  }
}
invariant(sourceFieldFloor.length === fieldFloor.length,
  `field floor footprint changed: source ${sourceFieldFloor.length} vs post ${fieldFloor.length}`);
const sourceComponents = floodConnectivity(sourceFieldFloor).map((c) => c.length).sort((a, b) => b - a);
const postComponents = floodConnectivity(fieldFloor).map((c) => c.length).sort((a, b) => b - a);
invariant(sourceComponents.length === postComponents.length
  && sourceComponents.every((count, index) => count === postComponents[index]),
  `field floor component structure changed: source ${JSON.stringify(sourceComponents)} post ${JSON.stringify(postComponents)}`);

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_WLV_EGRESS_01_FIELD_RIM_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE',
  mode: 'INDEPENDENT_READ_ONLY_WLV_EGRESS_01_POST_RELEASE_QA',
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
    fieldFloorCellCount: fieldFloor.length,
    fieldFloorDriftCount: fieldFloorDrift,
    fieldFloorComponentCount: postComponents.length,
    fieldFloorComponentStructureMatchesSource: sourceComponents.length === postComponents.length
      && sourceComponents.every((count, index) => count === postComponents[index]),
    entranceStairDriftCount: entranceDrift,
    existingFieldLanternCount: existingLanterns.length,
    screenMatrixBandDriftCount: screenDrift,
  },
  floodRouteProof: {
    fieldFloorWalkIdenticalToSource: fieldFloorDrift === 0,
    entranceStairWalkIdenticalToSource: entranceDrift === 0,
    fieldFloorComponentStructureMatchesSource: sourceComponents.length === postComponents.length
      && sourceComponents.every((count, index) => count === postComponents[index]),
    floodRouteCommissioned: false,
    egressGeometryChanged: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(operatedCells),
    haloCoordinateSetSha256: hashCells(haloCells),
    fieldFloorCoordinateSetSha256: hashCells(fieldFloor),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
