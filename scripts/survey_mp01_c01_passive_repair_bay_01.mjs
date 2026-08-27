#!/usr/bin/env node
/** Read-only survey for a C01 manual repair/crafting bay fit-out. */

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
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

async function inspect(cells) {
  return Promise.all(cells.map(async ({ x, y, z }) => ({ x, y, z, state: await state(x, y, z) })));
}
function requireState(cells, expected, label) {
  const drift = cells.filter((cell) => cell.state !== expected);
  if (drift.length) throw new Error(`${label} drift: ${JSON.stringify(drift)}`);
}

const targets = await inspect([{ x: 2012, y: 168, z: -887 }, { x: 2013, y: 168, z: -887 }]);
const heads = await inspect([{ x: 2012, y: 169, z: -887 }, { x: 2013, y: 169, z: -887 }]);
const supports = await inspect([{ x: 2012, y: 167, z: -887 }, { x: 2013, y: 167, z: -887 }]);
const approach = await inspect([
  { x: 2015, y: 168, z: -887 }, { x: 2016, y: 168, z: -887 }, { x: 2017, y: 168, z: -887 },
  { x: 2015, y: 169, z: -887 }, { x: 2016, y: 169, z: -887 }, { x: 2017, y: 169, z: -887 },
]);
const boundaries = await inspect([{ x: 2011, y: 168, z: -887 }, { x: 2014, y: 168, z: -887 }]);
const envelope = [];
for (let x = 2009; x <= 2017; x += 1) {
  for (let y = 167; y <= 171; y += 1) envelope.push({ x, y, z: -887 });
}
const envelopeStates = await inspect(envelope);

requireState(targets, 'minecraft:air', 'C01 targets');
requireState(heads, 'minecraft:air', 'C01 head clearance');
requireState(supports, 'minecraft:light_gray_concrete', 'C01 floor supports');
requireState(approach, 'minecraft:air', 'C01 approach clearance');
if (boundaries.some((cell) => cell.state === 'minecraft:air')) throw new Error('C01 alcove boundary is unexpectedly open');
const water = envelopeStates.filter((cell) => cell.state.includes('water'));
if (water.length) throw new Error(`C01 local envelope contains water: ${JSON.stringify(water)}`);

const report = {
  status: 'PASS_MP01_C01_PASSIVE_REPAIR_BAY_OFFLINE_READY',
  snapshot,
  bay: 'C01',
  targets,
  headClearance: heads,
  floorSupport: supports,
  enclosingBoundary: boundaries,
  preservedApproach: approach,
  envelopeWaterCells: water,
  candidate: {
    releaseId: 'MP01-C01-PASSIVE-REPAIR-BAY-01',
    targetStates: [
      { x: 2012, y: 168, z: -887, state: 'minecraft:grindstone[face=floor,facing=north]' },
      { x: 2013, y: 168, z: -887, state: 'minecraft:crafting_table' },
    ],
    nonClaims: ['container storage', 'automation', 'active controls', 'utility commissioning', 'public access', 'MP01 completion'],
  },
};
report.payloadSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
const absolute = path.join(ROOT, output);
fs.mkdirSync(path.dirname(absolute), { recursive: true });
fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
