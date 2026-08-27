#!/usr/bin/env node
/**
 * Read-only MP01 B03/B04 service-bay fit-out survey.
 *
 * B03 is a dry enclosed alcove with a two-cell manual-workstation pad. B04
 * deliberately remains untouched: the homologous cells are intact white
 * concrete, not an empty interior. This prevents a harmless-looking fit-out
 * from becoming an unreviewed structural carve.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0 || !args[index + 1]) throw new Error(`${flag} is required`);
  return args[index + 1];
};
const snapshot = value('--snapshot');
const output = value('--out');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));

async function state(x, y, z) {
  return stateToCommandString(await reader.blockState(x, y, z));
}

async function capture(cells) {
  return Promise.all(cells.map(async ({ x, y, z }) => ({ x, y, z, state: await state(x, y, z) })));
}

function requireExact(cells, expected, label) {
  const mismatches = cells.filter((cell) => cell.state !== expected);
  if (mismatches.length) {
    throw new Error(`${label} drift: ${JSON.stringify(mismatches)}`);
  }
}

function range(x1, x2, y1, y2, z) {
  const cells = [];
  for (let x = x1; x <= x2; x += 1) {
    for (let y = y1; y <= y2; y += 1) cells.push({ x, y, z });
  }
  return cells;
}

const b03Targets = await capture([
  { x: 2021, y: 168, z: -859 },
  { x: 2022, y: 168, z: -859 },
]);
const b03Heads = await capture([
  { x: 2021, y: 169, z: -859 },
  { x: 2022, y: 169, z: -859 },
]);
const b03Floors = await capture([
  { x: 2021, y: 167, z: -859 },
  { x: 2022, y: 167, z: -859 },
]);
const b03Walls = await capture([
  { x: 2020, y: 168, z: -859 },
  { x: 2023, y: 168, z: -859 },
]);
const b03Approach = await capture(range(2024, 2026, 168, 169, -859));
const b03Envelope = await capture(range(2018, 2027, 167, 171, -859));
const b04Counterpart = await capture([
  { x: 2021, y: 168, z: -845 },
  { x: 2022, y: 168, z: -845 },
  { x: 2021, y: 169, z: -845 },
  { x: 2022, y: 169, z: -845 },
]);

requireExact(b03Targets, 'minecraft:air', 'B03 equipment targets');
requireExact(b03Heads, 'minecraft:air', 'B03 head clearance');
requireExact(b03Floors, 'minecraft:light_gray_concrete', 'B03 floor support');
requireExact(b03Approach, 'minecraft:air', 'B03 approach clearance');
requireExact(b04Counterpart, 'minecraft:white_concrete', 'B04 structural counterpart');

if (b03Walls.some((cell) => cell.state === 'minecraft:air')) {
  throw new Error(`B03 alcove boundary unexpectedly open: ${JSON.stringify(b03Walls)}`);
}
const water = b03Envelope.filter((cell) => cell.state.includes('water'));
if (water.length) throw new Error(`B03 envelope contains water: ${JSON.stringify(water)}`);

const report = {
  status: 'PASS_MP01_B03_MANUAL_SERVICE_BAY_OFFLINE_READY_B04_STRUCTURAL_HOLD',
  scope: {
    b03: 'Two dry, enclosed, non-container manual-workstation targets only.',
    b04: 'Held: homologous target and head cells are intact white-concrete fabric, not an empty service alcove.',
  },
  snapshot,
  b03: {
    targets: b03Targets,
    headClearance: b03Heads,
    floorSupport: b03Floors,
    enclosingBoundary: b03Walls,
    preservedApproach: b03Approach,
    envelopeWaterCells: water,
  },
  b04: {
    inspectedCounterpart: b04Counterpart,
    status: 'HOLD_NO_B04_INTERIOR_TARGET_NO_STRUCTURAL_MUTATION',
  },
  candidate: {
    releaseId: 'MP01-B03-MANUAL-WORKSTATION-01',
    targetStates: [
      { x: 2021, y: 168, z: -859, state: 'minecraft:fletching_table' },
      { x: 2022, y: 168, z: -859, state: 'minecraft:cartography_table' },
    ],
    nonClaims: ['container storage', 'automation', 'active controls', 'public access', 'MP01 completion'],
  },
};
report.payloadSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');

const absolute = path.join(ROOT, output);
fs.mkdirSync(path.dirname(absolute), { recursive: true });
fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
