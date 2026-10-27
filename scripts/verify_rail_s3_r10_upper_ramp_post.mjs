#!/usr/bin/env node
/** Independent civil-only post QA for the R10 dry upper ramp and retained roof pocket. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : ''; };
const sourceRoot = value('--source'); const postRoot = value('--post'); const ops = value('--ops'); const out = value('--out');
if (!sourceRoot || !postRoot || !ops || !out) throw new Error('usage: --source <root> --post <root> --ops <forward.txt> --out <json>');
const root = process.cwd(); const source = new AnvilReader(path.resolve(root, sourceRoot, 'region')); const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const key = (point) => cellKey(point);
const points = (min, max) => { const result=[]; for(let x=min.x;x<=max.x;x+=1)for(let y=min.y;y<=max.y;y+=1)for(let z=min.z;z<=max.z;z+=1)result.push({x,y,z}); return result; };
const actualTargets = new Set();
for (const raw of fs.readFileSync(path.resolve(root, ops), 'utf8').split(/\r?\n/)) {
  const fields = raw.trim().split(/\s+/); if (fields[0] !== 'REPL' || fields.length !== 9) continue;
  const [x1,y1,z1,x2,y2,z2] = fields.slice(1,7).map(Number);
  for (const point of points({x:Math.min(x1,x2),y:Math.min(y1,y2),z:Math.min(z1,z2)},{x:Math.max(x1,x2),y:Math.max(y1,y2),z:Math.max(z1,z2)}))actualTargets.add(key(point));
}
const tubeInterior=[],tubeLiner=[],galleryInterior=[],galleryShell=[],migration=[];
for(let x=-75;x<=-60;x+=1){const b=13+x+75,f=b+4;for(const z of[-461,-460,-455,-454])for(let y=b;y<=b+3;y+=1){const p={x,y,z};tubeInterior.push(p);if(x===-75)migration.push(p);}for(const z of[-462,-459,-456,-453])for(let y=b;y<=b+3;y+=1)tubeLiner.push({x,y,z});for(let y=f+1;y<=f+6;y+=1)for(let z=-462;z<=-457;z+=1){const p={x,y,z};galleryInterior.push(p);if(x===-75)migration.push(p);}for(let y=f;y<=f+7;y+=1)for(const z of[-463,-456])galleryShell.push({x,y,z});for(const y of[f,f+7])for(let z=-463;z<=-456;z+=1)galleryShell.push({x,y,z});}
const unique = (cells) => [...new Map(cells.map((point)=>[key(point),point])).values()];
const upperEnd=[...[-461,-460,-455,-454].flatMap((z)=>points({x:-59,y:28,z},{x:-59,y:31,z})),...points({x:-59,y:32,z:-463},{x:-59,y:39,z:-456})];
const roofOriginal=[{x:-65,y:39,z:-464},{x:-64,y:39,z:-464},{x:-64,y:39,z:-463},{x:-63,y:39,z:-464},{x:-63,y:39,z:-463}];
const roofRetained=[{x:-67,y:39,z:-471},{x:-67,y:39,z:-470},{x:-67,y:39,z:-469},{x:-67,y:40,z:-471},{x:-67,y:40,z:-470}];
const roofExternal=[{x:-66,y:39,z:-466}];
const roofShell=points({x:-68,y:38,z:-472},{x:-64,y:41,z:-468}).filter(({x,y,z})=>x===-68||x===-64||y===38||y===41||z===-472||z===-468);
const count = async (cells, expected) => (await Promise.all(cells.map(async(point)=>(await state(post,point))===expected))).filter(Boolean).length;
const [tubeAir,tubePds,galleryAir,galleryPds,migrationAir,endPds,roofPds,retainedWater,externalWater] = await Promise.all([
  count(tubeInterior,'minecraft:air'),count(tubeLiner,'minecraft:polished_deepslate'),count(galleryInterior,'minecraft:air'),count(unique(galleryShell),'minecraft:polished_deepslate'),count(migration,'minecraft:air'),count(upperEnd,'minecraft:polished_deepslate'),count([...roofOriginal,...roofShell],'minecraft:polished_deepslate'),count(roofRetained,'minecraft:water[level=0]'),count(roofExternal,'minecraft:water[level=0]'),
]);
const drift=[];
for(const point of points({x:-76,y:12,z:-464},{x:-58,y:40,z:-453})){const [before,after]=await Promise.all([state(source,point),state(post,point)]);if(!actualTargets.has(key(point))&&before!==after)drift.push({point,before,after});}
const checks={tubeInterior:{expected:tubeInterior.length,actual:tubeAir},tubeLiner:{expected:tubeLiner.length,actual:tubePds},galleryInterior:{expected:galleryInterior.length,actual:galleryAir},galleryShell:{expected:unique(galleryShell).length,actual:galleryPds},r09CapMigration:{expected:52,actual:migrationAir},upperEndCaps:{expected:upperEnd.length,actual:endPds},retentionLinerAndShell:{expected:roofOriginal.length+roofShell.length,actual:roofPds},retainedWater:{expected:roofRetained.length,actual:retainedWater},preservedExternalWater:{expected:1,actual:externalWater},nonTargetRampHaloDrift:{expected:0,actual:drift.length,samples:drift.slice(0,20)}};
const report={schemaVersion:1,id:'rail-s3-r10-upper-ramp-post-qa',generatedAtUtc:new Date().toISOString(),sourceRoot,postRoot,ops,checks,civilOnly:true,routeCommissioned:false,passengerServiceCommissioned:false};report.status=Object.values(checks).every(({expected,actual})=>expected===actual)?'PASS':'FAIL';fs.mkdirSync(path.dirname(path.resolve(root,out)),{recursive:true});fs.writeFileSync(path.resolve(root,out),`${JSON.stringify(report,null,2)}\n`);process.stdout.write(`${JSON.stringify({status:report.status,checks},null,2)}\n`);if(report.status!=='PASS')process.exitCode=1;
