#!/usr/bin/env node
/**
 * Execute the read-only AG-4 west closure measurement plan.
 *
 * This is an immutable-snapshot graph traversal only. It never creates an
 * operation, chooses a containment target, or treats a traversal cap as a
 * finite fluid boundary.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const option=(flag,fallback)=>{const index=process.argv.indexOf(flag);return index<0?fallback:process.argv[index+1]??fallback;};
const SNAPSHOT=option('--snapshot','data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z');
const PLAN=option('--plan','data/world-review/ag4-gap-west-closure-measurement-06-mp11-c01-support-post-20260827T043000Z/ag4-gap-west-closure-measurement-06.json');
const OUT=option('--out','data/world-review/ag4-gap-west-closure-trace-06-mp11-c01-support-post-20260827T043000Z');
const GENERATED=option('--generated-at','2026-08-27T08:10:00.000Z');
const abs=value=>path.resolve(ROOT,value); const rel=value=>path.relative(ROOT,abs(value)).split(path.sep).join('/');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex'); const fileSha=value=>sha(fs.readFileSync(abs(value)));
const fail=(condition,message)=>{if(!condition)throw new Error(`AG-4 west closure trace rejected: ${message}`);};
const name=state=>state.split('[',1)[0]; const FLUIDS=new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']);
const wet=state=>FLUIDS.has(name(state))||state.includes('waterlogged=true');
const inside=(cell,bounds)=>cell.x>=bounds.minX&&cell.x<=bounds.maxX&&cell.y>=bounds.minY&&cell.y<=bounds.maxY&&cell.z>=bounds.minZ&&cell.z<=bounds.maxZ;
const neighbors=({x,y,z})=>[{x:x-1,y,z},{x:x+1,y,z},{x,y:y-1,z},{x,y:y+1,z},{x,y,z:z-1},{x,y,z:z+1}];
const faces=(cell,bounds)=>[...(cell.x===bounds.minX?['-X']:[]),...(cell.x===bounds.maxX?['+X']:[]),...(cell.y===bounds.minY?['-Y']:[]),...(cell.y===bounds.maxY?['+Y']:[]),...(cell.z===bounds.minZ?['-Z']:[]),...(cell.z===bounds.maxZ?['+Z']:[])];
const faceOrder=['-X','+X','-Y','+Y','-Z','+Z'];

for(const required of [path.join(SNAPSHOT,'region'),path.join(SNAPSHOT,'entities'),path.join(SNAPSHOT,'poi'),path.join(SNAPSHOT,'level.dat'),path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'),PLAN])fail(fs.existsSync(abs(required)),`missing ${required}`);
fail(!fs.existsSync(abs(OUT)),`output must be fresh: ${OUT}`);
const captureBytes=fs.readFileSync(abs(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'))); const capture=JSON.parse(captureBytes);
fail(capture.immutableCopy===true&&capture.requiredMembers?.length===130,'complete immutable source required');
for(const member of capture.requiredMembers){const file=path.join(abs(SNAPSHOT),member.path);fail(fs.existsSync(file)&&fs.statSync(file).size===member.bytes&&sha(fs.readFileSync(file))===member.sha256,`capture member drift ${member.path}`);}
const plan=JSON.parse(fs.readFileSync(abs(PLAN),'utf8'));
fail(plan.id==='AG4-GAP-WEST-CLOSURE-MEASUREMENT-06'&&plan.status==='SOURCE_BOUND_READ_ONLY_WEST_FRONTIER_CLOSURE_MEASUREMENT_REQUIRED'&&plan.mutationAuthority===false,'accepted source-bound west plan required');
fail(plan.source?.snapshot===rel(SNAPSHOT)&&plan.source?.captureId===capture.captureId&&plan.source?.completeSaveCaptureSha256===sha(captureBytes),'plan must bind this exact immutable source');
const measure=plan.measurement; const bounds=measure?.traceBounds; const cap=measure?.componentCap; const seed=measure?.seed;
fail(bounds&&Number.isInteger(cap)&&cap>=125001&&seed?.x===344&&seed.y===62&&seed.z===-795,'trace geometry/cap/seed drift');
fail(JSON.stringify(measure.expandedOnlyThrough)===JSON.stringify(['-X']),'plan must retain only the observed -X expansion');
const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region'))); const cache=new Map();
const at=async cell=>{const key=cellKey(cell);if(!cache.has(key))cache.set(key,stateToCommandString(await reader.blockState(cell.x,cell.y,cell.z)));return cache.get(key);};
fail(wet(await at(seed)),`seed no longer wet at ${cellKey(seed)}`);
const queue=[seed],seen=new Set([cellKey(seed)]),component=[],contacts=new Set(),census=new Map(); let capReached=false;
for(let index=0;index<queue.length;index++){
  if(component.length===cap){capReached=true;break;}
  const cell=queue[index],state=await at(cell); fail(wet(state),`wet component drift at ${cellKey(cell)}`);
  component.push(cell); census.set(state,(census.get(state)??0)+1); for(const face of faces(cell,bounds))contacts.add(face);
  for(const next of neighbors(cell)){const key=cellKey(next);if(inside(next,bounds)&&!seen.has(key)&&wet(await at(next))){seen.add(key);queue.push(next);}}
}
const observedBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
for(const cell of component){observedBounds.minX=Math.min(observedBounds.minX,cell.x);observedBounds.maxX=Math.max(observedBounds.maxX,cell.x);observedBounds.minY=Math.min(observedBounds.minY,cell.y);observedBounds.maxY=Math.max(observedBounds.maxY,cell.y);observedBounds.minZ=Math.min(observedBounds.minZ,cell.z);observedBounds.maxZ=Math.max(observedBounds.maxZ,cell.z);}
const boundaryContacts=faceOrder.filter(face=>contacts.has(face)); const finiteComponentProven=!capReached&&boundaryContacts.length===0;
const termination=finiteComponentProven?'QUEUE_DRAINED_ALL_TRACE_FACES_DRY':capReached?'COMPONENT_CAP_REACHED_BEFORE_CLOSURE':'COMPONENT_REACHES_TRACE_BOUNDARY';
const core={schemaVersion:1,id:'AG4-GAP-WEST-CLOSURE-TRACE-06',generatedAtUtc:GENERATED,status:finiteComponentProven?'AG4_GAP_FINITE_COMPONENT_MEASURED_READY_FOR_SEPARATE_CONTAINMENT_DESIGN':'AG4_GAP_COMPONENT_NOT_FINITE_HELD_NO_OPERATIONS',mutationAuthority:false,source:{snapshot:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:sha(captureBytes),plan:{path:rel(PLAN),sha256:fileSha(PLAN),identitySha256:plan.identitySha256}},measurement:{seed,bounds,componentCap:cap,componentCellCount:component.length,coordinateSetSha256:hashCells(component),stateCensus:Object.fromEntries([...census.entries()].sort(([left],[right])=>left.localeCompare(right))),observedBounds,boundaryContacts,capReached,finiteComponentProven,termination},preservedExclusions:measure.savedItemExclusion,containmentDesignDisposition:finiteComponentProven?{finiteDryContainmentDesignSupportable:true,meaning:'A separate compiler may now design the complete component liner/support/receiver/overflow and inverse. This trace still emits no target or operation.',stillRequired:plan.compilerGraduation.eligibleOnlyWhen.slice(1)}:{finiteDryContainmentDesignSupportable:false,meaning:'No liner, plug, receiver, support, deck, rail, or route package may be inferred from this open/capped component.',nextReadOnlyStep:capReached?'A separate plan must select a safe higher cap or partitioned, source-complete finite measurement; do not infer unobserved boundary faces.':`Expand only the observed faces (${boundaryContacts.join(', ')}) in a separate source-bound measurement plan.`},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const contactText=boundaryContacts.length?boundaryContacts.join(', '):'none (closed)';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="580" viewBox="0 0 1180 580"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:24px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.water{fill:#38bdf8}.hold{fill:#fb923c}.ok{fill:#22c55e}</style><rect width="100%" height="100%" fill="#071521"/><text x="40" y="42" class="h">AG-4 west closure trace 06 — fresh source</text><text x="40" y="68" class="n">read-only wet-component traversal; no containment targets or operations</text><rect x="80" y="120" width="520" height="320" class="water" opacity=".35"/><rect x="250" y="235" width="135" height="85" class="water"/><text x="274" y="280" class="n">wet component</text><rect x="690" y="120" width="430" height="320" class="${finiteComponentProven?'ok':'hold'}" opacity=".28"/><text x="725" y="160" class="n">measurement result</text><text x="725" y="202" class="s">${component.length.toLocaleString()} wet cells read</text><text x="725" y="232" class="s">cap ${cap.toLocaleString()} / reached: ${capReached}</text><text x="725" y="262" class="s">boundary contacts: ${contactText}</text><text x="725" y="292" class="s">finite closure: ${finiteComponentProven}</text><text x="725" y="322" class="s">termination: ${termination}</text><text x="725" y="352" class="s">0 forward / 0 rollback ops</text><text x="40" y="512" class="s">Compiler gate: queue drains below cap and every trace-boundary face is dry; then a separate full containment/support/inverse package is required.</text><text x="40" y="544" class="hold s">No water, liner, receiver, support, deck, rail, route, external-flow, or public-service state is changed or claimed.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-west-closure-trace-06.json'),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-west-closure-trace-06.svg'),svg);
fs.writeFileSync(path.join(abs(OUT),'AG4-GAP-WEST-CLOSURE-TRACE-06.md'),`# AG-4 west closure trace 06\n\n![Fresh trace map](ag4-gap-west-closure-trace-06.svg)\n\n**Status:** ${result.status}. The trace ${finiteComponentProven?'closes within its declared boundary. A separate containment design is still required.':'does not prove finite closure; no containment/support/rail package may be compiled.'}\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),componentCellCount:component.length,boundaryContacts,capReached,finiteComponentProven,forwardOperations:0,rollbackOperations:0},null,2));
