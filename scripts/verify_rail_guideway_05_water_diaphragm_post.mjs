#!/usr/bin/env node
/** Verify the guideway water diaphragm and the full Cobalt bed completion. */
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const postRoot = process.argv[2];
if (!postRoot) throw new Error('usage: verify_rail_guideway_05_water_diaphragm_post.mjs <post-snapshot-root>');
const reader = new AnvilReader(path.resolve(ROOT, postRoot, 'region'));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const isWater = (state) => state.startsWith('minecraft:water');
const fail = (condition, message) => { if (!condition) throw new Error(`RAIL-S3-GUIDEWAY-05 post-state rejected: ${message}`); };

fail((await stateAt(-180, 12, -454)) === 'minecraft:polished_deepslate', 'diaphragm target is not polished_deepslate');
for (const [label, [x, y, z]] of Object.entries({ west: [-181, 12, -454], east: [-179, 12, -454], north: [-180, 12, -455], south: [-180, 12, -453] })) {
  fail((await stateAt(x, y, z)) === 'minecraft:polished_deepslate', `lateral containment drift at ${label}`);
}
fail(isWater(await stateAt(-180, 11, -454)), 'lower retained water column was not preserved');
fail(isWater(await stateAt(-180, 13, -454)), 'upper retained water column was not preserved');
let completedBeds = 0;
let other = 0;
for (let x = -254; x <= -136; x += 1) for (const z of [-461, -454]) {
  if ((await stateAt(x, 12, z)) === 'minecraft:polished_deepslate') completedBeds += 1;
  else other += 1;
}
fail(completedBeds === 238 && other === 0, `bed completion pds=${completedBeds}, other=${other}`);
let galleryFluid = 0;
for (let x = -254; x <= -136; x += 1) for (let z = -462; z <= -457; z += 1) {
  for (let y = 19; y <= 23; y += 1) if (isWater(await stateAt(x, y, z))) galleryFluid += 1;
}
fail(galleryFluid === 0, `service gallery fluid=${galleryFluid}`);
console.log(JSON.stringify({ schemaVersion: 1, id: 'rail-guideway-05-water-diaphragm-poststate', status: 'PASS', postSnapshotRoot: postRoot, guidewayBed: { polishedDeepslate: completedBeds, unexpectedCells: other }, retainedWaterColumns: { upper: true, lower: true }, serviceGallery: { interiorWaterCells: galleryFluid }, routeCommissioned: false, passengerServiceCommissioned: false }, null, 2));
