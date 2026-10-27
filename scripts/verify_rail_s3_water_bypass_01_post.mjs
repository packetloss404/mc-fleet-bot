#!/usr/bin/env node
/** Verify final retained-water bypass and cleared original tube column. */
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const [postRoot] = process.argv.slice(2);
if (!postRoot) throw new Error('usage: verify_rail_s3_water_bypass_01_post.mjs <post-snapshot-root>');
const reader = new AnvilReader(path.resolve(process.cwd(), postRoot, 'region'));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const fail = (condition, message) => { if (!condition) throw new Error(`RAIL-S3-WATER-BYPASS-01 post QA failed: ${message}`); };
const waters = []; for (let y = 13; y <= 16; y += 1) waters.push({ y, source: await stateAt(-180, y, -454), bypass: await stateAt(-180, y, -457) });
for (const row of waters) { fail(row.source === 'minecraft:air', `original water column not clear at y=${row.y}: ${row.source}`); fail(row.bypass.startsWith('minecraft:water'), `bypass water missing at y=${row.y}: ${row.bypass}`); }
const shell = [
  ...[13, 14, 15, 16].flatMap((y) => [{ x: -180, y, z: -453 }, { x: -180, y, z: -456 }, { x: -180, y, z: -458 }]),
  ...[-181, -179].flatMap((x) => [13, 14, 15, 16].map((y) => ({ x, y, z: -457 }))),
  { x: -180, y: 12, z: -457 }, { x: -180, y: 17, z: -457 },
];
for (const cell of shell) fail(await stateAt(cell.x, cell.y, cell.z) === 'minecraft:polished_deepslate', `bypass shell drift at (${cell.x},${cell.y},${cell.z})`);
let galleryFloor = 0; for (let x = -195; x <= -176; x += 1) for (let z = -462; z <= -457; z += 1) if (await stateAt(x, 17, z) === 'minecraft:polished_deepslate') galleryFloor += 1;
fail(galleryFloor === 120, `service gallery floor ${galleryFloor}/120`);
console.log(JSON.stringify({ schemaVersion: 1, id: 'rail-s3-water-bypass-poststate', status: 'PASS', originalTubeColumn: { airCells: 4, total: 4 }, retainedWaterBypass: { waterCells: 4, total: 4 }, permanentContainmentShell: { polishedDeepslateCells: shell.length, total: shell.length }, serviceGalleryFloor: { sealedCells: galleryFloor, total: 120 }, routeCommissioned: false, passengerServiceCommissioned: false }, null, 2));
