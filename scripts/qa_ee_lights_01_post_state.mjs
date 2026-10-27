#!/usr/bin/env node
/** Independent post-state verification for CZ-EE-LIGHTS-01.
 *  Reads the immutable post snapshot read-only and proves all 12 target
 *  sea_lantern states and preserved non-target interfaces. Never mutates the world.
 */
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString, hashCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2] || 'data/worldsnap-ee-lights-post-20260825T154851Z';
const OUT = process.argv[3] || 'data/world-review/ee-lights-live-20260825T154809Z/post-state-verification.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const reader = new AnvilReader(absolute(path.join(POST, 'region')));
const blockName = (state) => state.split('[', 1)[0];

const targets = [];
for (const x of [1727, 1728, 1729, 1751, 1752, 1753]) {
  for (const z of [147, 149]) targets.push([x, 53, z]);
}
const expected = 'minecraft:sea_lantern';

const targetCells = [];
const results = [];
let passed = 0;
let failed = 0;
for (const [x, y, z] of targets) {
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  targetCells.push({ x, y, z });
  const ok = actual === expected;
  if (ok) passed += 1; else failed += 1;
  results.push({ cell: [x, y, z], expected, actual, pass: ok });
}

// Preserved interface spot checks: the corridor cadence neighbors, R08AN
// stair treads/landings, R08AW band/datums, and the N06 bulkhead.
const preserved = [
  // Corridor ceiling cadence lights on either side of each stair mouth
  { x: 1717, y: 53, z: 147, expect: 'minecraft:sea_lantern' },
  { x: 1725, y: 53, z: 147, expect: 'minecraft:sea_lantern' },
  { x: 1757, y: 53, z: 147, expect: 'minecraft:sea_lantern' },
  { x: 1765, y: 53, z: 147, expect: 'minecraft:sea_lantern' },
  // R08AN widened west stair tread (3-wide)
  { x: 1727, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  { x: 1729, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  // R08AN widened east stair tread
  { x: 1751, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  { x: 1753, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  // R08AW orientation band
  { x: 1728, y: 49, z: 145, expect: 'minecraft:red_terracotta' },
  { x: 1752, y: 49, z: 145, expect: 'minecraft:red_terracotta' },
  // R08AW bay-door datum
  { x: 1661, y: 50, z: 144, expect: 'minecraft:blue_glazed_terracotta[facing=south]' },
  // EE-PUB2 stair arrival marker
  { x: 1728, y: 50, z: 143, expect: 'minecraft:blue_glazed_terracotta[facing=south]' },
  { x: 1752, y: 50, z: 143, expect: 'minecraft:blue_glazed_terracotta[facing=south]' },
  // N06 retained gravel bulkhead
  { x: 1738, y: 50, z: 145, expect: 'minecraft:gravel' },
  // West stair-well lintel bay light (existing, preserved)
  { x: 1728, y: 52, z: 153, expect: 'minecraft:sea_lantern' },
];
const preservedResults = [];
let preservedPassed = 0;
let preservedFailed = 0;
for (const item of preserved) {
  const actual = stateToCommandString(await reader.blockState(item.x, item.y, item.z));
  const ok = actual === item.expect;
  if (ok) preservedPassed += 1; else preservedFailed += 1;
  preservedResults.push({ cell: [item.x, item.y, item.z], expected: item.expect, actual, pass: ok });
}

const status = failed === 0 && preservedFailed === 0 ? 'PASS' : 'FAIL';
const report = {
  schemaVersion: 1,
  id: 'combined-zones-ee-lights-01-post-state-verification',
  generatedAtUtc: new Date().toISOString(),
  status,
  transactionId: 'combined-zones-ee-lights-01-stairwell-ceiling-cadence',
  packageKey: 'stairwell-ceiling-cadence',
  postSnapshot: POST,
  targetCoordinateSetSha256: hashCells(targetCells),
  targetCellCount: targetCells.length,
  targets: { passed, failed, results },
  preservedInterfaces: { passed: preservedPassed, failed: preservedFailed, results: preservedResults },
  conclusions: {
    stairwellCeilingCadenceConfirmed: targets.length === 12
      && results.every((r) => r.pass),
    corridorCadencePreserved: preserved
      .filter((p) => p.expect === 'minecraft:sea_lantern')
      .every((p) => preservedResults[preserved.findIndex((q) => q.x === p.x && q.y === p.y && q.z === p.z)].pass),
    r08anWidenedStairsPreserved: preserved.filter((p) => p.expect.includes('polished_andesite_stairs')).every(
      (p) => preservedResults[preserved.findIndex((q) => q.x === p.x && q.y === p.y && q.z === p.z)].pass,
    ),
    r08awBandAndDatumsPreserved: preserved.filter((p) => p.expect === 'minecraft:red_terracotta'
      || p.expect === 'minecraft:blue_glazed_terracotta[facing=south]').every(
      (p) => preservedResults[preserved.findIndex((q) => q.x === p.x && q.y === p.y && q.z === p.z)].pass,
    ),
    n06BulkheadUntouched: preserved
      .filter((p) => p.expect === 'minecraft:gravel')
      .every((p) => preservedResults[preserved.findIndex((q) => q.x === p.x && q.y === p.y && q.z === p.z)].pass),
  },
  worldEditsPerformed: false,
  liveCallsPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status,
  targetCellCount: targetCells.length,
  targetsPassed: passed,
  targetsFailed: failed,
  preservedPassed,
  preservedFailed,
  report: path.relative(ROOT, absolute(OUT)),
}, null, 2));
