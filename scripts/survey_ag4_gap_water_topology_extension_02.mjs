#!/usr/bin/env node
/**
 * AG-4 water topology extension 02.  It expands precisely the five faces
 * reached by the prior source-bound trace and never creates containment ops.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd(), opt=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1]??fallback;};
const SNAPSHOT=opt('--snapshot','data/worldsnap-ag3-exterior-loop-exec-post-20260827T021200Z');
const PRIOR=opt('--prior','data/world-review/ag4-gap-hydrology-gravity-containment-01-post-20260827T021200Z/ag4-gap-hydrology-gravity-containment-01.json');
const OUT=opt('--out','data/world-review/ag4-gap-water-topology-extension-02-post-20260827T021200Z');
const GENERATED=opt('--generated-at','2026-08-28T10:50:00.000Z');
const abs=p=>path.resolve(ROOT,p),rel=p=>path.relative(ROOT,abs(p)).split(path.sep).join('/'),read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),fileSha=p=>sha(fs.readFileSync(abs(p)));
const fail=(ok,msg)=>{if(!ok)throw new Error(`AG-4 water topology extension rejected: ${msg}`);};
const name=state=>state.split('[',1)[0],fluids=new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']),wet=state=>fluids.has(name(state))||state.includes('waterlogged=true');
const inside=(c,b)=>c.x>=b.minX&&c.x<=b.maxX&&c.y>=b.minY&&c.y<=b.maxY&&c.z>=b.minZ&&c.z<=b.maxZ;
const neighbors=({x,y,z})=>[{x:x-1,y,z},{x:x+1,y,z},{x,y:y-1,z},{x,y:y+1,z},{x,y,z:z-1},{x,y,z:z+1}];
const faces=(c,b)=>[...(c.x===b.minX?['-X']:[]),...(c.x===b.maxX?['+X']:[]),...(c.y===b.minY?['-Y']:[]),...(c.y===b.maxY?['+Y']:[]),...(c.z===b.minZ?['-Z']:[]),...(c.z===b.maxZ?['+Z']:[])];
for(const required of [path.join(SNAPSHOT,'region'),path.join(SNAPSHOT,'entities'),path.join(SNAPSHOT,'poi'),path.join(SNAPSHOT,'level.dat'),path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'),PRIOR])fail(fs.existsSync(abs(required)),`missing ${required}`);
fail(!fs.existsSync(abs(OUT)),`output must be fresh: ${OUT}`);
const capture=read(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json')),prior=read(PRIOR);
fail(capture.immutableCopy===true&&capture.requiredMembers?.length>=130,'complete immutable AG-3 post required');
fail(prior.status==='AG4_GAP_WATER_COMPONENT_ESCAPES_MEASUREMENT_BOUNDARY_HELD_NO_OPERATIONS'&&prior.mutationAuthority===false,'accepted AG-4 held source report required');
const priorTrace=prior.findings?.waterComponent;
fail(Array.isArray(priorTrace.escapeFaces)&&priorTrace.escapeFaces.join(',')==='+X,+Z,-X,-Y,-Z','prior trace must identify exactly five directed escapes');
const priorItem=prior.findings?.savedEntityExclusion?.entity;
fail(priorItem?.id==='minecraft:item'&&priorItem.cell?.x===348&&priorItem.cell?.y===62&&priorItem.cell?.z===-789,'saved-item exclusion drift');
// Only the faces actually reached before are expanded. +Y remains at 80.
const bounds={minX:314,maxX:381,minY:29,maxY:80,minZ:-826,maxZ:-764};
const expectedExpansion={from:priorTrace.measurementBounds,throughFaces:priorTrace.escapeFaces,perFaceBlocks:16};
const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region'))),cache=new Map();
const at=async c=>{const k=cellKey(c);if(!cache.has(k))cache.set(k,stateToCommandString(await reader.blockState(c.x,c.y,c.z)));return cache.get(k);};
const seed=priorTrace.seed;fail(wet(await at(seed)),`seed no longer wet at ${cellKey(seed)}`);
const queue=[seed],seen=new Set([cellKey(seed)]),component=[],escapeFaces=new Set(),byState=new Map();
for(let i=0;i<queue.length;i++){
  const cell=queue[i],state=await at(cell);fail(wet(state),`component state drift at ${cellKey(cell)}`);component.push(cell);byState.set(state,(byState.get(state)??0)+1);
  for(const face of faces(cell,bounds))escapeFaces.add(face);
  for(const next of neighbors(cell))if(inside(next,bounds)&&!seen.has(cellKey(next))&&wet(await at(next))){seen.add(cellKey(next));queue.push(next);}
}
const observedBounds={minX:Math.min(...component.map(c=>c.x)),maxX:Math.max(...component.map(c=>c.x)),minY:Math.min(...component.map(c=>c.y)),maxY:Math.max(...component.map(c=>c.y)),minZ:Math.min(...component.map(c=>c.z)),maxZ:Math.max(...component.map(c=>c.z))};
const escapes=[...escapeFaces].sort();
const termination=escapes.length===0?'FINITE_COMPONENT_CLOSED_WITHIN_EXTENSION':'COMPONENT_REACHES_NEXT_MEASUREMENT_FRONTIER';
const core={schemaVersion:1,id:'AG4-GAP-WATER-TOPOLOGY-EXTENSION-02',generatedAtUtc:GENERATED,status:escapes.length===0?'AG4_GAP_WATER_COMPONENT_FINITE_MEASURED_NO_OPERATIONS':'AG4_GAP_WATER_COMPONENT_STILL_ESCAPES_NEXT_FRONTIER_HELD_NO_OPERATIONS',mutationAuthority:false,source:{root:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:fileSha(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json')),priorContainmentDecision:{path:rel(PRIOR),sha256:fileSha(PRIOR),identitySha256:prior.identitySha256}},measurement:{seed,priorMeasurement:expectedExpansion,nextMeasurementBounds:bounds,componentCellCount:component.length,coordinateSetSha256:hashCells(component),stateCensus:Object.fromEntries([...byState.entries()].sort(([a],[b])=>a.localeCompare(b))),observedBounds,termination,nextEscapeFaces:escapes,finiteComponentProven:escapes.length===0},preservedExclusions:{savedItem:priorItem,excludedVolume:prior.exactMicroScopes.find(scope=>scope.id==='AG4-GAP-SAVED-ITEM-EXCLUSION-01')?.excludedVolume??null,rule:'Preserved verbatim; it is not part of this water measurement, target, halo, or operation set.'},nextStep:escapes.length===0?{kind:'separate finite containment design may now be considered',stillRequired:['exact liner/receiver/overflow/rollback topology','fresh target/halo, container, protected-interface, and live entity checks'] }:{kind:'adaptive read-only trace only',throughFaces:escapes,rule:'Expand only these observed faces from this exact immutable source; no local plug, liner, drain, receiver, or support operation is safe yet.'},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const label=escapes.length?escapes.join(', '):'closed';
const map=`<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="520" viewBox="0 0 1160 520"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:24px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.old{fill:#64748b}.new{fill:#38bdf8}.hold{fill:#fb923c}.item{fill:#f472b6}</style><rect width="100%" height="100%" fill="#071521"/><text x="38" y="42" class="h">AG-4 water topology extension 02 — immutable source trace</text><text x="38" y="67" class="n">expanded only +X, +Z, -X, -Y, -Z by 16 blocks; +Y remains unexpanded</text><rect x="110" y="130" width="380" height="235" class="old" opacity=".75"/><text x="140" y="160" class="n">prior trace volume</text><rect x="70" y="95" width="460" height="305" class="new" opacity=".35"/><text x="85" y="425" class="s">next trace X314..381 / Y29..80 / Z-826..-764</text><rect x="245" y="220" width="130" height="72" class="new"/><text x="260" y="259" class="n">wet component</text><rect x="392" y="310" width="16" height="16" class="item"/><text x="417" y="324" class="s">saved item exclusion</text><rect x="670" y="125" width="420" height="260" class="hold" opacity=".27"/><text x="704" y="165" class="n">topology result</text><text x="704" y="205" class="s">${component.length.toLocaleString()} wet cells traced</text><text x="704" y="232" class="s">observed bounds: X${observedBounds.minX}..${observedBounds.maxX}, Y${observedBounds.minY}..${observedBounds.maxY}</text><text x="704" y="259" class="s">Z${observedBounds.minZ}..${observedBounds.maxZ}</text><text x="704" y="286" class="s">next frontier: ${label}</text><text x="704" y="313" class="s">0 forward / 0 rollback ops</text><text x="38" y="480" class="hold s">Measurement only. The saved item remains excluded; no water, sand, deck, rail, support, route, or access state changes.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-water-topology-extension-02.json'),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-water-topology-extension-02.svg'),map);
fs.writeFileSync(path.join(abs(OUT),'AG4-GAP-WATER-TOPOLOGY-EXTENSION-02.md'),`# AG-4 water topology extension 02 — read-only\n\n![Topology map](ag4-gap-water-topology-extension-02.svg)\n\nThis trace expands only the five faces reached by the prior AG-4 water census. The saved item exclusion is retained unchanged. ${escapes.length?`The component still reaches ${escapes.join(', ')}; no local containment or support operation is emitted.`:'The component closes in this measured boundary, but a separate finite containment design remains necessary.'}\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),componentCells:component.length,observedBounds,nextEscapeFaces:escapes,forwardOperations:0,rollbackOperations:0},null,2));
