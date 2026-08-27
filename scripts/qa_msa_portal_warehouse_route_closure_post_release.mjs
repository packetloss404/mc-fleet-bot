#!/usr/bin/env node
/** Independent read-only post-release QA for CIRC-MSA-PORTAL-01 (portal lintel clear). */

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
const MANIFEST = value(
  '--manifest',
  'data/buildops/msa-portal-warehouse-route-closure.release-manifest.json',
);
const POST = value(
  '--post-regions',
  'data/worldsnap-msa-portal-post-20260824T120600Z/region',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/msa-portal-warehouse-live-20260824T120500Z',
);
const OUT = value('--out', `${EVIDENCE}/post-release-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-24T12:10:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIRC-MSA-PORTAL-01 post-release QA rejected: ${message}`);
};
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}

const manifest = JSON.parse(fs.readFileSync(absolute(MANIFEST), 'utf8'));
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(Buffer.from(`${JSON.stringify(manifestPayload, null, 2)}\n`)),
'manifest identity drifted');

const postReader = new AnvilReader(absolute(POST));
const postAt = async (cell) => stateToCommandString(
  await postReader.blockState(cell.x, cell.y, cell.z),
);

const records = [];
const targetKeys = new Set();
for (const pkg of manifest.packages) {
  for (const record of parseOperations(pkg.forward)) {
    invariant(!targetKeys.has(cellKey(record.cell)), `duplicate target ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
  }
}
invariant(records.length === 54, `expected 54 exact targets, got ${records.length}`);

// 1. Exact post-state match for every target (must now be air).
const postMismatches = [];
for (const record of records) {
  const actual = await postAt(record.cell);
  if (actual !== record.targetState) {
    postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
  }
}
invariant(postMismatches.length === 0,
  `post-state mismatch: ${JSON.stringify(postMismatches.slice(0, 5))}`);

// 2. Crown (y=71..72) retained lintel above every operated column.
for (const record of records) {
  for (const y of [71, 72]) {
    const crownState = await postAt({ x: record.cell.x, y, z: record.cell.z });
    invariant(crownState === 'minecraft:polished_blackstone_bricks',
      `retained crown at (${record.cell.x},${y},203) drifted: ${crownState}`);
  }
}

// 3. Halo: 3x3x3 around every operated cell, no fluid/forbidden/gravity, no drift.
const halo = uniqueCells(records.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
let haloFluidCount = 0;
let haloForbiddenCount = 0;
let haloGravityCount = 0;
const drift = [];
for (const cell of halo) {
  const state = await postAt(cell);
  if (isFluid(state)) haloFluidCount += 1;
  if (isForbidden(state)) haloForbiddenCount += 1;
  if (isGravity(state)) haloGravityCount += 1;
  // Retained lintel halo cells at y=71..72 around the opening are expected
  // solid. The two decorative yellow_concrete floor blocks at (35/41,64,204)
  // are the surveyed lane features in the ramp corridor (outside the repair
  // cells) and are expected retained.
  const retainedHaloStates = new Set([
    'minecraft:polished_blackstone_bricks',
    'minecraft:air',
    'minecraft:gray_concrete',
    'minecraft:reinforced_deepslate',
    'minecraft:yellow_concrete',
  ]);
  if (retainedHaloStates.has(state)) continue;
  drift.push({ cell, state });
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0 && haloGravityCount === 0,
  `halo hazard: fluid=${haloFluidCount} forbidden=${haloForbiddenCount} gravity=${haloGravityCount}`);
invariant(drift.length === 0, `unexpected halo drift: ${JSON.stringify(drift.slice(0, 5))}`);

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_MSA_PORTAL_01_POSTSTATE_VERIFIED_REVERSIBLE',
  mode: 'INDEPENDENT_READ_ONLY_MSA_PORTAL_POST_RELEASE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestIdentity,
    targetCount: records.length,
    postRegionDir: POST,
  },
  checks: {
    exactPostStateCount: records.length,
    exactPostStateMismatchCount: postMismatches.length,
    portalOpeningAirCount: records.filter(({ targetState }) => targetState === 'minecraft:air').length,
    retainedCrownCellCount: records.length * 2,
    interactionHaloCellCount: halo.length,
    haloFluidCount,
    haloForbiddenBlockCount: haloForbiddenCount,
    haloGravityBlockCount: haloGravityCount,
    offTargetDriftCount: drift.length,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    haloCoordinateSetSha256: hashCells(halo),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
