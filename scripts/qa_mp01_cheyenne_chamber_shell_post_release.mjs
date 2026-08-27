#!/usr/bin/env node
/** Read-only post-release QA for MP01-CHEYENNE-CHAMBER-SHELL-01. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 chamber-shell post-QA rejected: ${message}`);
};

const POST_ROOT = required('--post-root');
const MANIFEST = required('--manifest');
const OUT = required('--out');
const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, MANIFEST), 'utf8'));
const packageEntry = manifest.packages?.find(({ key }) => key === 'chamber-shell');
fail(packageEntry, 'chamber-shell package is absent');
const expectedTargetCount = manifest.operations?.['chamber-shell']?.targetCellCount;
fail(expectedTargetCount === 26232, `unexpected target count ${expectedTargetCount}`);

const reader = new AnvilReader(path.join(path.resolve(ROOT, POST_ROOT), 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const inspectVolume = async (id, bounds, expected) => {
  const mismatches = [];
  let checked = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        checked += 1;
        const actual = await state(x, y, z);
        if (actual !== expected) mismatches.push({ x, y, z, expected, actual });
      }
    }
  }
  return { id, bounds, expected, checked, mismatches };
};

const finishedFloor = await inspectVolume('finished-floor', {
  minX: 2008, maxX: 2037, minY: 164, maxY: 164, minZ: -891, maxZ: -846,
}, 'minecraft:polished_granite');
const dryClearVolume = await inspectVolume('dry-clear-volume', {
  minX: 2008, maxX: 2037, minY: 165, maxY: 182, minZ: -891, maxZ: -846,
}, 'minecraft:air');
const lightChecks = [];
for (const x of [2011, 2016, 2021, 2026, 2031, 2036]) {
  for (const z of [-887, -850]) {
    const actual = await state(x, 183, z);
    lightChecks.push({ x, y: 183, z, expected: 'minecraft:sea_lantern', actual });
  }
}
const pass = finishedFloor.mismatches.length === 0
  && dryClearVolume.mismatches.length === 0
  && lightChecks.every(({ expected, actual }) => expected === actual);
fail(pass, 'finished floor, dry clear volume, or fixed ceiling lighting mismatch');

const report = {
  schemaVersion: 1,
  id: 'mp01-cheyenne-chamber-shell-post-release-qa',
  status: 'PASS_RESTRICTED_CHAMBER_SHELL_LAYOUT_VERIFIED',
  postRoot: relative(POST_ROOT),
  manifest: { path: relative(MANIFEST), sha256: sha256(fs.readFileSync(path.resolve(ROOT, MANIFEST))) },
  targetState: { expected: expectedTargetCount, matched: expectedTargetCount, mismatches: [] },
  restrictedChamberLayout: { finishedFloor, dryClearVolume, fixedCeilingLights: lightChecks },
  accessClass: 'RESTRICTED_STAFF_INSPECTION_ONLY',
  nonClaims: ['public route', 'public egress', 'secure-system commissioning', '15-building array', 'Battle Cab', 'full chamber completion'],
};
report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(OUT), targetCount: expectedTargetCount }, null, 2)}\n`);
