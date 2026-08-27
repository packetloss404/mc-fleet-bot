#!/usr/bin/env node
/** Final-coordinate QA for a staged 6×6 civil service-gallery package. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : ''; };
const postRoot = value('--post'); const minX = Number(value('--min-x')); const maxX = Number(value('--max-x')); const seamX = Number(value('--predecessor-floor-x'));
const opPaths = args.flatMap((entry, index) => entry === '--ops' && args[index + 1] ? [args[index + 1]] : []);
if (!postRoot || !Number.isInteger(minX) || !Number.isInteger(maxX) || seamX !== minX - 1 || opPaths.length === 0) throw new Error('usage: --post <snapshot> --min-x <x> --max-x <x> --predecessor-floor-x <x> --ops <forward> [--ops ...]');
const root = process.cwd(); const reader = new AnvilReader(path.resolve(root, postRoot, 'region'));
const finalTargets = new Map();
for (const opPath of opPaths) for (const [index, raw] of fs.readFileSync(path.resolve(root, opPath), 'utf8').split(/\r?\n/).entries()) {
  const fields = raw.trim().split(/\s+/); if (!fields[0] || fields[0].startsWith('#')) continue;
  if (fields[0] !== 'REPL' || fields.length !== 9) throw new Error(`${opPath}:${index + 1}: malformed REPL`);
  const [x1,y1,z1,x2,y2,z2] = fields.slice(1, 7).map(Number);
  for (let x=Math.min(x1,x2);x<=Math.max(x1,x2);x+=1) for (let y=Math.min(y1,y2);y<=Math.max(y1,y2);y+=1) for (let z=Math.min(z1,z2);z<=Math.max(z1,z2);z+=1) finalTargets.set(cellKey({x,y,z}), {x,y,z,target:fields[8]});
}
const stateAt = async (x,y,z) => stateToCommandString(await reader.blockState(x,y,z));
let exact = 0; for (const target of finalTargets.values()) if (await stateAt(target.x,target.y,target.z) === target.target) exact += 1;
let air = 0; for (let x=minX;x<=maxX;x+=1) for (let y=18;y<=23;y+=1) for (let z=-462;z<=-457;z+=1) if (await stateAt(x,y,z) === 'minecraft:air') air += 1;
let seam = 0; for (let z=-462;z<=-457;z+=1) if (await stateAt(seamX,17,z) === 'minecraft:polished_deepslate') seam += 1;
const output = {schemaVersion:1,id:'rail-s3-staged-service-gallery-poststate',status:'FAIL',postSnapshotRoot:postRoot,segment:{minX,maxX,predecessorFloorX:seamX},targetFinalStates:{desiredState:exact,total:finalTargets.size},serviceGallery:{airCells:air,total:(maxX-minX+1)*36},predecessorFloorSeam:{sealedCells:seam,total:6},routeCommissioned:false,passengerServiceCommissioned:false};
output.status=exact===finalTargets.size&&air===output.serviceGallery.total&&seam===6?'PASS':'FAIL'; console.log(JSON.stringify(output,null,2)); if(output.status!=='PASS')process.exitCode=1;
