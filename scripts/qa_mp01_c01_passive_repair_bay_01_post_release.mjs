#!/usr/bin/env node
/** Independent immutable-post QA for C01's manual repair/crafting bay. */

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
const reader = new AnvilReader(path.join(ROOT, value('--post-root'), 'region'));
const expected = [
  [2012, 168, -887, 'minecraft:grindstone[face=floor,facing=north]'],
  [2013, 168, -887, 'minecraft:crafting_table'],
  [2012, 169, -887, 'minecraft:air'], [2013, 169, -887, 'minecraft:air'],
  [2012, 167, -887, 'minecraft:light_gray_concrete'], [2013, 167, -887, 'minecraft:light_gray_concrete'],
  [2015, 168, -887, 'minecraft:air'], [2016, 168, -887, 'minecraft:air'], [2017, 168, -887, 'minecraft:air'],
];
const checks = [];
for (const [x, y, z, state] of expected) {
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  if (actual !== state) throw new Error(`C01 post-state drift at ${x},${y},${z}: ${actual}, expected ${state}`);
  checks.push({ x, y, z, state });
}
const report = {
  status: 'PASS_C01_PASSIVE_REPAIR_BAY_AND_CLEARANCE_VERIFIED',
  targetState: { declared: 2, matched: 2, mismatches: [] },
  preservedBayClearance: checks.filter((check) => check.y === 169 || check.x >= 2015),
  retainedFloorSupport: checks.filter((check) => check.y === 167),
  nonClaims: ['container storage', 'automation', 'active controls', 'utility commissioning', 'public access', 'MP01 completion'],
};
report.payloadSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
const output = path.join(ROOT, value('--out'));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
