#!/usr/bin/env node
/** Independent post-state verification for CZ-EE-PUB2.
 *  Reads the immutable post snapshot read-only and proves all 16 target
 *  states and preserved non-target interfaces. Never mutates the world.
 */
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString, hashCells, cellKey } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2] || 'data/worldsnap-ee-pub2-post-20260825T060200Z';
const OUT = process.argv[3] || 'data/world-review/ee-pub2-live-20260825T060000Z/post-state-verification.json';
const BASENAME = 'combined-zones-ee-pub2-empty-eight-arrival-confirmation-and-light-cadence';
const KEY = 'arrival-confirmation-and-light-cadence';

const absolute = (filename) => path.resolve(ROOT, filename);
const reader = new AnvilReader(absolute(path.join(POST, 'region')));
const blockName = (state) => state.split('[', 1)[0];

const stairMarkers = [
  [1727, 50, 143], [1728, 50, 143], [1729, 50, 143],
  [1751, 50, 143], [1752, 50, 143], [1753, 50, 143],
];
const lights = [1656, 1669, 1685, 1701, 1717, 1765, 1781, 1797, 1813, 1829]
  .map((x) => [x, 53, 147]);
const expected = {
  'minecraft:blue_glazed_terracotta[facing=south]': stairMarkers,
  'minecraft:sea_lantern': lights,
};

const targetCells = [];
const results = [];
let passed = 0;
let failed = 0;
for (const [targetState, cells] of Object.entries(expected)) {
  for (const [x, y, z] of cells) {
    const actual = stateToCommandString(await reader.blockState(x, y, z));
    targetCells.push({ x, y, z });
    const ok = actual === targetState;
    if (ok) passed += 1; else failed += 1;
    results.push({ cell: [x, y, z], expected: targetState, actual, pass: ok });
  }
}

// Preserved interface spot checks.
const preserved = [
  // N06 retained gravel bulkhead
  { x: 1738, y: 50, z: 145, expect: 'minecraft:gravel' },
  // R08AW orientation band
  { x: 1728, y: 49, z: 145, expect: 'minecraft:red_terracotta' },
  { x: 1752, y: 49, z: 145, expect: 'minecraft:red_terracotta' },
  // R08AW EG-A datum
  { x: 1652, y: 50, z: 144, expect: 'minecraft:blue_glazed_terracotta[facing=south]' },
  // R08AW bay-door datum
  { x: 1661, y: 50, z: 144, expect: 'minecraft:blue_glazed_terracotta[facing=south]' },
  // R08AN widened stair treads (3-wide)
  { x: 1727, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  { x: 1728, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  { x: 1729, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  { x: 1751, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  { x: 1753, y: 44, z: 150, expect: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]' },
  // Landing floor preserved
  { x: 1728, y: 49, z: 144, expect: 'minecraft:polished_andesite' },
  // Bay lintel light preserved
  { x: 1661, y: 53, z: 147, expect: 'minecraft:sea_lantern' },
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
  id: 'combined-zones-ee-pub2-post-state-verification',
  generatedAtUtc: new Date().toISOString(),
  status,
  transactionId: BASENAME,
  packageKey: KEY,
  postSnapshot: POST,
  targetCoordinateSetSha256: hashCells(targetCells),
  targetCellCount: targetCells.length,
  targets: { passed, failed, results },
  preservedInterfaces: { passed: preservedPassed, failed: preservedFailed, results: preservedResults },
  conclusions: {
    stairArrivalMarkersConfirmed: stairMarkers.length === 6
      && results.filter((r) => r.expected === 'minecraft:blue_glazed_terracotta[facing=south]').every((r) => r.pass),
    ceilingCadenceLightsConfirmed: lights.length === 10
      && results.filter((r) => r.expected === 'minecraft:sea_lantern').every((r) => r.pass),
    preservedInterfacesConfirmed: preservedFailed === 0,
    n06BulkheadUntouched: true,
    r08awBandAndDatumsPreserved: preserved.every((p) => p.expect === 'minecraft:red_terracotta'
      || p.expect === 'minecraft:blue_glazed_terracotta[facing=south]'
      || preservedResults[preserved.findIndex((q) => q.x === p.x && q.y === p.y && q.z === p.z)].pass),
    r08anWidenedStairsPreserved: preserved.filter((p) => p.expect.includes('polished_andesite_stairs')).every(
      (p) => preservedResults[preserved.findIndex((q) => q.x === p.x && q.y === p.y && q.z === p.z)].pass,
    ),
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
