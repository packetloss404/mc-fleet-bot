#!/usr/bin/env node
/** Immutable post-state QA for the R10 High-14 exterior-band civil release. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : ''; };
const post = arg('--post'); const manifestPath = arg('--manifest'); const out = arg('--out');
if (!post || !manifestPath || !out) throw new Error('usage: --post <complete-save> --manifest <manifest> --out <report>');
const ROOT = process.cwd(); const absolute = (f) => path.resolve(ROOT, f);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => { const r=[]; for(let x=min.x;x<=max.x;x+=1)for(let y=min.y;y<=max.y;y+=1)for(let z=min.z;z<=max.z;z+=1)r.push(point(x,y,z)); return r; };
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(absolute(post), member))) throw new Error(`post lacks ${member}`);
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const operations = manifest.stages.flatMap((stage) => fs.readFileSync(absolute(stage.forward), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => { const p=line.split(/\s+/); return { point: point(Number(p[1]),Number(p[2]),Number(p[3])), desired:p[8] }; }));
const reader = new AnvilReader(path.join(absolute(post), 'region'));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const targetFailures=[]; for (const op of operations) { const actual=await stateAt(op.point); if(actual!==op.desired) targetFailures.push({point:op.point,expected:op.desired,actual}); }
const haloFailures=[]; for (const entry of manifest.geometry.halo.exactStates) { const actual=await stateAt(entry.point); if(actual!==entry.state) haloFailures.push({point:entry.point,expected:entry.state,actual}); }
const core=box(point(-240,54,-480),point(-235,59,-461)); const routeFailures=[]; for(const cell of core){const actual=await stateAt(cell);if(actual!=='minecraft:air')routeFailures.push({point:cell,actual});}
const airFailures=[]; for(const entry of manifest.ownership.preservedRouteAir.cells){const actual=await stateAt(entry.point);if(actual!==entry.state)airFailures.push({point:entry.point,expected:entry.state,actual});}
const migration=manifest.ownership.migration.cells; const migrationFailures=[]; for(const entry of migration){const actual=await stateAt(entry.point);if(actual!=='minecraft:air')migrationFailures.push({point:entry.point,actual});}
const checks={targets:targetFailures.length===0&&operations.length===1212,halo:haloFailures.length===0&&manifest.geometry.halo.exactStates.length===680,route:routeFailures.length===0&&core.length===720,preservedRouteAir:airFailures.length===0&&manifest.ownership.preservedRouteAir.count===84,migration:migrationFailures.length===0&&migration.length===36};
const failures=Object.entries(checks).filter(([,pass])=>!pass).map(([key])=>key);
const report={schemaVersion:1,id:'rail-r10-high16-high14-exterior-band-independent-post-qa',status:failures.length?'FAIL':'PASS',post,postCaptureManifestSha256:sha(fs.readFileSync(path.join(absolute(post),'combined-zones-complete-save-capture.json'))),manifestPath,targets:{count:operations.length,failures:targetFailures},halo:{count:manifest.geometry.halo.exactStates.length,failures:haloFailures},route:{coreCount:core.length,coordinateSetSha256:hashCells(core),failures:routeFailures},preservedRouteAir:{count:manifest.ownership.preservedRouteAir.count,failures:airFailures},migration:{count:migration.length,failures:migrationFailures},checks,failures,civilOnly:true,passengerServiceCommissioned:false,readOnly:true};
fs.mkdirSync(path.dirname(absolute(out)),{recursive:true}); fs.writeFileSync(absolute(out),`${JSON.stringify(report,null,2)}\n`); console.log(JSON.stringify({status:report.status,checks,failures},null,2)); process.exitCode=failures.length?1:0;
