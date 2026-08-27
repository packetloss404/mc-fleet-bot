#!/usr/bin/env node
/** Read-only layout and route QA for MP01-CHEYENNE-CHAMBER-ARRAY-ROW-A-01. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : null; };
const required = (flag) => { const result = value(flag); if (!result) throw new Error(`Missing required ${flag}`); return result; };
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP01 chamber-array Row A post-QA rejected: ${message}`); };
const POST_ROOT = required('--post-root');
const MANIFEST = required('--manifest');
const OUT = required('--out');
const rowTag = (value('--row') ?? 'A').toUpperCase();
const x1 = Number(value('--min-x') ?? '2027');
fail(/^[A-Z]$/.test(rowTag) && Number.isInteger(x1), 'row/min-x arguments are invalid');
const x2 = x1 + 5;
const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, MANIFEST), 'utf8'));
const packageKey = `array-row-${rowTag.toLowerCase()}`;
const packageEntry = manifest.packages?.find(({ key }) => key === packageKey);
fail(packageEntry, `${packageKey} package is absent`);
fail(manifest.operations?.[packageKey]?.targetCellCount === 726, 'unexpected target count');
const reader = new AnvilReader(path.join(path.resolve(ROOT, POST_ROOT), 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const inspect = async (id, expected, cells) => {
  const mismatches = [];
  for (const { x, y, z } of cells) {
    const actual = await state(x, y, z);
    if (actual !== expected) mismatches.push({ x, y, z, expected, actual });
  }
  return { id, expected, cells: cells.length, mismatches };
};
const cuboid = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const buildingRows = [
  { id: `${rowTag}01`, minZ: -888, maxZ: -881, doorZ: -885 },
  { id: `${rowTag}02`, minZ: -874, maxZ: -867, doorZ: -871 },
  { id: `${rowTag}03`, minZ: -860, maxZ: -853, doorZ: -857 },
];
const bays = [];
for (const row of buildingRows) {
  const floor = await inspect(`${row.id}-floor`, 'minecraft:light_gray_concrete', cuboid(x1, x2, 167, 167, row.minZ, row.maxZ));
  const roof = await inspect(`${row.id}-roof`, 'minecraft:white_concrete', cuboid(x1, x2, 173, 173, row.minZ, row.maxZ));
  const door = [
    { x: x2, y: 168, z: row.doorZ, expected: 'minecraft:iron_door[facing=east,half=lower,hinge=left,open=false,powered=false]' },
    { x: x2, y: 169, z: row.doorZ, expected: 'minecraft:iron_door[facing=east,half=upper,hinge=left,open=false,powered=false]' },
  ];
  for (const check of door) check.actual = await state(check.x, check.y, check.z);
  const lights = [];
  for (const x of [x1 + 2, x1 + 3]) lights.push({ x, y: 172, z: row.doorZ, expected: 'minecraft:sea_lantern', actual: await state(x, 172, row.doorZ) });
  const supports = [];
  for (const z of [row.minZ + 2, row.maxZ - 2]) {
    for (let x = x1; x <= x2; x += 1) {
      supports.push({ x, y: 165, z, expected: 'minecraft:iron_block', actual: await state(x, 165, z) });
      supports.push({ x, y: 166, z, expected: 'minecraft:polished_blackstone_bricks', actual: await state(x, 166, z) });
    }
  }
  bays.push({ id: row.id, floor, roof, manualDoor: door, fixedLights: lights, isolatorAnalogue: supports });
}
const serviceSpineMaxX = x1 === 2027 ? 2037 : x1 + 8;
const serviceSpine = await inspect('east-service-spine-clear', 'minecraft:air', cuboid(x2 + 1, serviceSpineMaxX, 165, 169, -888, -853));
const pass = serviceSpine.mismatches.length === 0 && bays.every((bay) => bay.floor.mismatches.length === 0
  && bay.roof.mismatches.length === 0 && bay.manualDoor.every(({ expected, actual }) => expected === actual)
  && bay.fixedLights.every(({ expected, actual }) => expected === actual)
  && bay.isolatorAnalogue.every(({ expected, actual }) => expected === actual));
fail(pass, 'array-bay structure, controlled doors, isolators, lights, or east service spine mismatch');
const report = {
  schemaVersion: 1,
  id: `mp01-cheyenne-chamber-array-row-${rowTag.toLowerCase()}-post-release-qa`,
  status: `PASS_RESTRICTED_CHAMBER_ARRAY_ROW_${rowTag}_VERIFIED`,
  postRoot: relative(POST_ROOT),
  manifest: { path: relative(MANIFEST), sha256: sha256(fs.readFileSync(path.resolve(ROOT, MANIFEST))) },
  restrictedRouteLayout: { eastServiceSpine: serviceSpine },
  controlledBuildingArray: { bays },
  accessClass: 'RESTRICTED_STAFF_INSPECTION_ONLY',
  nonClaims: ['public route', 'public egress', '15-building array completion', 'Battle Cab', 'reservoir', 'full chamber completion'],
};
report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(OUT), bays: bays.length }, null, 2)}\n`);
