#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd(), a=process.argv.slice(2);
const val=(f,d=null)=>{const i=a.indexOf(f);return i>=0&&a[i+1]?a[i+1]:d};
const req=f=>{const x=val(f);if(!x)throw new Error(`Missing ${f}`);return x};
const abs=f=>path.resolve(ROOT,f), rel=f=>path.relative(ROOT,abs(f)).split(path.sep).join('/');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=(x,m)=>{if(!x)throw new Error(`MP01 chamber-shell compiler rejected: ${m}`)};
const snapshot=req('--snapshot'), outDir=val('--out-dir','data/buildops'), base=val('--basename','mp01-cheyenne-chamber-shell-01');
const zMin=Number(val('--z-min','-891')), zMax=Number(val('--z-max','-846'));
const xMin=Number(val('--x-min','2008')), xMax=Number(val('--x-max','2037'));
const releaseSuffix=val('--release-suffix','01');
fail(Number.isInteger(zMin)&&Number.isInteger(zMax)&&zMin<=zMax&&Number.isInteger(xMin)&&Number.isInteger(xMax)&&xMin<=xMax,`invalid bounds`);
const reader=new AnvilReader(path.join(abs(snapshot),'region'));
const source=async(x,y,z)=>stateToCommandString(await reader.blockState(x,y,z));
for(let x=xMin;x<=xMax;x++)for(let y=164;y<=183;y++)for(let z=zMin;z<=zMax;z++) fail(await source(x,y,z)==='minecraft:stone',`non-stone source ${x},${y},${z}`);
const lightXs=[xMin+2,xMax-2]; const lights=[]; for(const x of lightXs) for(const z of [zMin+3,zMax-3]) lights.push([x,183,z]);
const lines=[
  `REPL ${xMin} 165 ${zMin} ${xMax} 182 ${zMax} minecraft:stone minecraft:air`,
  `REPL ${xMin} 164 ${zMin} ${xMax} 164 ${zMax} minecraft:stone minecraft:polished_granite`,
  ...lights.map(([x,y,z])=>`REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:stone minecraft:sea_lantern`),
];
const rollback=[...lines].reverse().map(line=>{const p=line.split(' ');return `REPL ${p.slice(1,7).join(' ')} ${p[8]} ${p[7]}`});
const forwardBody=`${lines.join('\n')}\n`, rollbackBody=`${rollback.join('\n')}\n`;
const fhash=hash(forwardBody), rhash=hash(rollbackBody), width=(zMax-zMin+1), depth=(xMax-xMin+1), targetCount=depth*18*width+depth*width+lights.length;
const forward=path.join(outDir,`${base}.chamber-shell.forward.txt`), reverse=path.join(outDir,`${base}.chamber-shell.rollback.txt`);
fs.mkdirSync(abs(outDir),{recursive:true});
fs.writeFileSync(abs(forward),`# MP01 chamber shell forward\n${forwardBody}`); fs.writeFileSync(abs(reverse),`# MP01 chamber shell rollback\n${rollbackBody}`);
const manifest={schemaVersion:1,transactionId:`mp01-cheyenne-chamber-shell-${releaseSuffix}`,generatedAtUtc:new Date().toISOString(),status:'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',releaseNodeId:'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',mvpScope:false,scopeIds:['MP01-A','P1-B03','Z10'],packages:[{key:'chamber-shell',forward:rel(forward),rollback:rel(reverse)}],executionOrder:{forward:['chamber-shell'],rollback:['chamber-shell']},scope:{releaseId:`MP01-CHEYENNE-CHAMBER-SHELL-${releaseSuffix.toUpperCase()}`,purpose:'Dry restricted chamber-shell geometry expansion with finished floor and fixed lighting.',accessClassAfterRelease:'RESTRICTED_STAFF_INSPECTION_ONLY',nonClaims:['public opening','egress','15-building array','Battle Cab completion','full chamber completion']},source:{snapshotRoot:snapshot},target:{operatedUnion:{cellCount:targetCount,bounds:{minX:xMin,maxX:xMax,minY:164,maxY:183,minZ:zMin,maxZ:zMax}},packageTargetsDisjoint:true},operations:{'chamber-shell':{forwardSha256:fhash,rollbackSha256:rhash,forwardCommandCount:lines.length,rollbackCommandCount:rollback.length,targetCellCount:targetCount,exactInverse:true}},safetyBoundary:{liveCallsPerformed:false,worldEditsPerformed:false}};
manifest.manifestIdentity=hash(JSON.stringify(manifest)); const mf=path.join(outDir,`${base}.release-manifest.json`);fs.writeFileSync(abs(mf),`${JSON.stringify(manifest,null,2)}\n`);console.log(JSON.stringify({manifest:rel(mf),targetCount,forwardSha256:fhash,rollbackSha256:rhash},null,2));
