#!/usr/bin/env node
/** Independent post-state verification for RAIL-S3-GUIDEWAY-04. */

import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const [postRoot, forwardPath] = process.argv.slice(2);
if (!postRoot || !forwardPath) {
  throw new Error('usage: verify_rail_guideway_04_dry_pocket_post.mjs <post-snapshot-root> <forward-ops>');
}
const reader = new AnvilReader(path.resolve(ROOT, postRoot, 'region'));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state))
  || state.includes('waterlogged=true');
const fail = (message) => { throw new Error(`RAIL-S3-GUIDEWAY-04 post-state rejected: ${message}`); };

const operations = fs.readFileSync(path.resolve(ROOT, forwardPath), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL '))
  .map((line) => {
    const fields = line.split(/\s+/);
    return { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]), target: fields[8] };
  });
if (operations.length !== 8) fail(`operation count ${operations.length} != 8`);

let exactTargets = 0;
for (const operation of operations) {
  if ((await stateAt(operation.x, operation.y, operation.z)) === operation.target) exactTargets += 1;
}
if (exactTargets !== operations.length) fail(`exact target state ${exactTargets}/${operations.length}`);

const water = await stateAt(-180, 12, -454);
if (!isFluid(water)) fail(`retained water-held cell drifted: ${water}`);
for (const y of [11, 12, 13]) {
  const state = await stateAt(-179, y, -454);
  if (isFluid(state) || ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))) {
    fail(`water barrier not solid at (-179,${y},-454): ${state}`);
  }
}

let finishedBeds = 0;
let retainedWaterCells = 0;
let unexpectedBedStates = 0;
for (let x = -254; x <= -136; x += 1) {
  for (const z of [-461, -454]) {
    const state = await stateAt(x, 12, z);
    if (state === 'minecraft:polished_deepslate') finishedBeds += 1;
    else if (x === -180 && z === -454 && isFluid(state)) retainedWaterCells += 1;
    else unexpectedBedStates += 1;
  }
}
if (finishedBeds !== 237 || retainedWaterCells !== 1 || unexpectedBedStates !== 0) {
  fail(`guideway bed census pds=${finishedBeds}, retainedWater=${retainedWaterCells}, unexpected=${unexpectedBedStates}`);
}

let gallerySeams = 0;
let galleryDrift = 0;
let galleryFluid = 0;
for (let x = -254; x <= -136; x += 1) {
  for (const z of [-463, -456]) {
    for (let y = 18; y <= 23; y += 1) {
      gallerySeams += 1;
      if (blockName(await stateAt(x, y, z)) !== 'minecraft:polished_deepslate') galleryDrift += 1;
    }
  }
  for (let z = -462; z <= -457; z += 1) {
    for (let y = 19; y <= 23; y += 1) if (isFluid(await stateAt(x, y, z))) galleryFluid += 1;
  }
}
if (galleryDrift !== 0 || galleryFluid !== 0) fail(`service gallery drift=${galleryDrift}, fluid=${galleryFluid}`);

const report = {
  schemaVersion: 1,
  id: 'rail-guideway-04-dry-pocket-poststate',
  status: 'PASS',
  postSnapshotRoot: postRoot,
  forwardOperations: forwardPath,
  targets: { desiredState: exactTargets, total: operations.length },
  guidewayBed: { polishedDeepslate: finishedBeds, retainedWaterHeldCells: retainedWaterCells, unexpectedCells: unexpectedBedStates },
  retainedWaterBarrier: { solidCells: 3, retainedWaterState: water },
  serviceGallery: { seamCells: gallerySeams, seamDrift: galleryDrift, interiorFluidCells: galleryFluid },
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
