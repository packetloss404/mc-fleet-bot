#!/usr/bin/env node
/**
 * Execute AG-4's read-only combined three-face measurement 07.
 *
 * This traverses only copied immutable Anvil data. It cannot emit operations,
 * choose containment geometry, contact RCON, or mutate the world.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const option=(flag,fallback)=>{const index=process.argv.indexOf(flag);return index<0?fallback:process.argv[index+1]??fallback;};
const SNAPSHOT=option('--snapshot','data/worldsnap-masterplan-frontier-refresh-20260827T053500Z');
const PLAN=option('--plan','data/world-review/ag4-gap-three-face-closure-measurement-07-masterplan-frontier-refresh-20260827T053500Z/ag4-gap-three-face-closure-measurement-07.json');
const OUT=option('--out','data/world-review/ag4-gap-three-face-closure-trace-07-masterplan-frontier-refresh-20260827T053500Z');
const GENERATED=option('--generated-at','2026-08-27T08:30:00.000Z');
const abs=value=>path.resolve(ROOT,value); const rel=value=>path.relative(ROOT,abs(value)).split(path.sep).join('/');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex'); const fileSha=value=>sha(fs.readFileSync(abs(value)));
const fail=(condition,message)=>{if(!condition)throw new Error(`AG-4 three-face closure trace rejected: ${message}`);};
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
const {identitySha256:planIdentity,...planCore}=plan;
fail(planIdentity===sha(`${JSON.stringify(planCore,null,2)}\n`),'measurement-07 plan identity drift');
fail(plan.id==='AG4-GAP-THREE-FACE-CLOSURE-MEASUREMENT-07'&&plan.status==='SOURCE_BOUND_READ_ONLY_THREE_FACE_CLOSURE_MEASUREMENT_REQUIRED'&&plan.mutationAuthority===false,'accepted source-bound three-face plan required');
fail(plan.source?.snapshot===rel(SNAPSHOT)&&plan.source?.captureId===capture.captureId&&plan.source?.completeSaveCaptureSha256===sha(captureBytes),'plan must bind this exact immutable source');
const measure=plan.measurement; const bounds=measure?.traceBounds; const cap=measure?.componentCap; const seed=measure?.seed;
fail(JSON.stringify(bounds)===JSON.stringify({minX:234,maxX:397,minY:13,maxY:80,minZ:-874,maxZ:-700}),'trace-07 bounds drift');
fail(cap===250000&&seed?.x===344&&seed.y===62&&seed.z===-795,'trace cap/seed drift');
fail(JSON.stringify(measure.expandedOnlyThrough)===JSON.stringify(['-X','-Z','+Z']),'plan must expand all and only the evidenced trace-06 faces');
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
if(component.length===cap)capReached=true;
const observedBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
for(const cell of component){observedBounds.minX=Math.min(observedBounds.minX,cell.x);observedBounds.maxX=Math.max(observedBounds.maxX,cell.x);observedBounds.minY=Math.min(observedBounds.minY,cell.y);observedBounds.maxY=Math.max(observedBounds.maxY,cell.y);observedBounds.minZ=Math.min(observedBounds.minZ,cell.z);observedBounds.maxZ=Math.max(observedBounds.maxZ,cell.z);}
const boundaryContacts=faceOrder.filter(face=>contacts.has(face));
const boundaryContactsComplete=!capReached;
const finiteComponentProven=boundaryContactsComplete&&boundaryContacts.length===0;
const termination=finiteComponentProven?'QUEUE_DRAINED_ALL_TRACE_FACES_DRY':capReached?'COMPONENT_CAP_REACHED_BEFORE_CLOSURE':'COMPONENT_REACHES_TRACE_BOUNDARY';
const core={schemaVersion:1,id:'AG4-GAP-THREE-FACE-CLOSURE-TRACE-07',generatedAtUtc:GENERATED,status:finiteComponentProven?'AG4_GAP_FINITE_COMPONENT_MEASURED_SEPARATE_DESIGN_REVIEW_REQUIRED':'AG4_GAP_COMPONENT_NOT_FINITE_HELD_NO_OPERATIONS',mutationAuthority:false,source:{snapshot:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:sha(captureBytes),plan:{path:rel(PLAN),sha256:fileSha(PLAN),identitySha256:plan.identitySha256}},measurement:{seed,bounds,expandedOnlyThrough:measure.expandedOnlyThrough,componentCap:cap,componentCellCount:component.length,coordinateSetSha256:hashCells(component),stateCensus:Object.fromEntries([...census.entries()].sort(([left],[right])=>left.localeCompare(right))),observedBounds,boundaryContacts,boundaryContactsComplete,capReached,finiteComponentProven,termination},preservedExclusions:measure.savedItemExclusion,designDisposition:finiteComponentProven?{containmentDesignReviewEligible:true,constructionAuthority:false,meaning:'The copied-source survey proves a finite connected wet component inside this volume. A separate owner-bound receiver/containment/gravity design and complete guarded kernel are still mandatory.'}:{containmentDesignReviewEligible:false,constructionAuthority:false,meaning:capReached?'The traversal hit its cap. Its partial boundary contacts are diagnostic only and cannot select successor faces or construction geometry.':'The component still reaches an exact measured boundary. Only another source-bound read-only survey may follow the complete observed face set.',nextReadOnlyStep:capReached?'Select a separately reviewed higher-cap or partitioned complete measurement without inferring unvisited faces.':`Expand only the complete observed faces (${boundaryContacts.join(', ')}) in a new source-bound survey.`},notAuthorized:['liner','plug','drain','receiver','support','deck','rail','promenade','route','opening','public access','passenger service','world mutation'],safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const contactText=boundaryContacts.length?boundaryContacts.join(', '):'none';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="600" viewBox="0 0 1180 600"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:24px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.water{fill:#38bdf8}.hold{fill:#fb923c}.ok{fill:#22c55e}</style><rect width="100%" height="100%" fill="#071521"/><text x="40" y="42" class="h">AG-4 combined three-face trace 07</text><text x="40" y="68" class="n">immutable copied-source traversal · no operations</text><rect x="70" y="120" width="540" height="330" class="water" opacity=".35"/><rect x="235" y="225" width="190" height="110" class="water"/><text x="262" y="284" class="n">connected wet component</text><rect x="690" y="120" width="430" height="330" class="${finiteComponentProven?'ok':'hold'}" opacity=".28"/><text x="725" y="160" class="n">measurement result</text><text x="725" y="202" class="s">${component.length.toLocaleString()} wet cells visited</text><text x="725" y="232" class="s">cap ${cap.toLocaleString()} / reached: ${capReached}</text><text x="725" y="262" class="s">contacts complete: ${boundaryContactsComplete}</text><text x="725" y="292" class="s">boundary contacts: ${contactText}</text><text x="725" y="322" class="s">finite closure: ${finiteComponentProven}</text><text x="725" y="352" class="s">termination: ${termination}</text><text x="725" y="382" class="s">0 forward / 0 rollback ops</text><text x="40" y="510" class="s">A closed trace permits separate design review only; every construction and commissioning gate remains default-deny.</text><text x="40" y="544" class="hold s">No water, liner, receiver, support, deck, rail, route, public, passenger, or service state is changed or claimed.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-three-face-closure-trace-07.json'),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-three-face-closure-trace-07.svg'),svg);
fs.writeFileSync(path.join(abs(OUT),'AG4-GAP-THREE-FACE-CLOSURE-TRACE-07.md'),`# AG-4 combined three-face closure trace 07\n\n![Trace result](ag4-gap-three-face-closure-trace-07.svg)\n\n**Status:** ${result.status}. This immutable-source traversal emitted zero operations. ${finiteComponentProven?'Finite closure permits a separate owner-bound containment design review only.':'AG-4 remains research-only and held against every construction or route claim.'}\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),componentCellCount:component.length,boundaryContacts,boundaryContactsComplete,capReached,finiteComponentProven,forwardOperations:0,rollbackOperations:0},null,2));
