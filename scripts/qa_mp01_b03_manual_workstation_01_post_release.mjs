#!/usr/bin/env node
/** Independent immutable-post QA for the B03 manual workstation. */

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
  [2021, 168, -859, 'minecraft:fletching_table'],
  [2022, 168, -859, 'minecraft:cartography_table'],
  [2021, 169, -859, 'minecraft:air'],
  [2022, 169, -859, 'minecraft:air'],
  [2021, 167, -859, 'minecraft:light_gray_concrete'],
  [2022, 167, -859, 'minecraft:light_gray_concrete'],
  [2024, 168, -859, 'minecraft:air'],
  [2025, 168, -859, 'minecraft:air'],
  [2026, 168, -859, 'minecraft:air'],
];
const checks = [];
for (const [x, y, z, state] of expected) {
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  if (actual !== state) throw new Error(`B03 post-state drift at ${x},${y},${z}: ${actual}, expected ${state}`);
  checks.push({ x, y, z, state });
}
const report = {
  status: 'PASS_B03_MANUAL_WORKSTATION_AND_BAY_CLEARANCE_VERIFIED',
  targetState: { declared: 2, matched: 2, mismatches: [] },
  preservedBayClearance: checks.filter((check) => check.y === 169 || check.x >= 2024),
  retainedFloorSupport: checks.filter((check) => check.y === 167),
  nonClaims: ['container storage', 'automation', 'active controls', 'public access', 'MP01 completion'],
};
report.payloadSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
const output = path.join(ROOT, value('--out'));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
