#!/usr/bin/env node
/** Exact post-state QA for one Cobalt 6×6 civil service-gallery release. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const [postRoot, forward, minArg, maxArg, seamArg] = process.argv.slice(2);
if (!postRoot || !forward || minArg === undefined || maxArg === undefined || seamArg === undefined) {
  throw new Error('usage: <post-root> <forward-ops> <min-x> <max-x> <predecessor-floor-x>');
}
const minX = Number(minArg); const maxX = Number(maxArg); const seamX = Number(seamArg);
if (![minX, maxX, seamX].every(Number.isInteger) || minX > maxX || seamX !== minX - 1) throw new Error('invalid gallery segment or seam');
const root = process.cwd();
const reader = new AnvilReader(path.resolve(root, postRoot, 'region'));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const operations = fs.readFileSync(path.resolve(root, forward), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]), target: fields[8] };
  });
let exactTargets = 0;
for (const op of operations) if (await stateAt(op.x, op.y, op.z) === op.target) exactTargets += 1;
let interiorAir = 0;
for (let x = minX; x <= maxX; x += 1) for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) if (await stateAt(x, y, z) === 'minecraft:air') interiorAir += 1;
let seamFloor = 0;
for (let z = -462; z <= -457; z += 1) if (await stateAt(seamX, 17, z) === 'minecraft:polished_deepslate') seamFloor += 1;
const expectedInterior = (maxX - minX + 1) * 36;
const result = { schemaVersion: 1, id: 'rail-s3-service-gallery-poststate', postSnapshotRoot: postRoot, segment: { minX, maxX, predecessorFloorX: seamX }, targets: { desiredState: exactTargets, total: operations.length }, serviceGallery: { airCells: interiorAir, total: expectedInterior }, predecessorFloorSeam: { sealedCells: seamFloor, total: 6 }, routeCommissioned: false, passengerServiceCommissioned: false };
result.status = exactTargets === operations.length && interiorAir === expectedInterior && seamFloor === 6 ? 'PASS' : 'FAIL';
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;
