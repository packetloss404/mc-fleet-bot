#!/usr/bin/env node
/**
 * AG-4 water topology adaptive trace 03.
 *
 * A read-only continuation of the two prior source-bound measurements.  The
 * trace expands only through the five faces actually reached by extension 02
 * and has an explicit component cap.  Reaching a boundary or the cap is a
 * hold, never implicit permission for a local plug, liner, or support change.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const opt=(key,fallback)=>{const index=process.argv.indexOf(key);return index<0?fallback:process.argv[index+1]??fallback;};
const SNAPSHOT=opt('--snapshot','data/worldsnap-ag3-exterior-loop-exec-post-20260827T021200Z');
const PRIOR=opt('--prior','data/world-review/ag4-gap-water-topology-extension-02-post-20260827T021200Z/ag4-gap-water-topology-extension-02.json');
const OUT=opt('--out','data/world-review/ag4-gap-adaptive-water-component-trace-03-post-20260827T021200Z');
const ID=opt('--id','AG4-GAP-ADAPTIVE-WATER-COMPONENT-TRACE-03');
const ARTIFACT=opt('--artifact','ag4-gap-adaptive-water-component-trace-03');
const CAP=Number(opt('--cap','125000'));
const GENERATED=opt('--generated-at','2026-08-28T11:10:00.000Z');
const abs=value=>path.resolve(ROOT,value);
const rel=value=>path.relative(ROOT,abs(value)).split(path.sep).join('/');
const read=value=>JSON.parse(fs.readFileSync(abs(value),'utf8'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const fileSha=value=>sha(fs.readFileSync(abs(value)));
const fail=(condition,message)=>{if(!condition)throw new Error(`AG-4 adaptive water trace rejected: ${message}`);};
const stateName=state=>state.split('[',1)[0];
const fluidNames=new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']);
const wet=state=>fluidNames.has(stateName(state))||state.includes('waterlogged=true');
const inside=(cell,bounds)=>cell.x>=bounds.minX&&cell.x<=bounds.maxX&&cell.y>=bounds.minY&&cell.y<=bounds.maxY&&cell.z>=bounds.minZ&&cell.z<=bounds.maxZ;
const neighbors=({x,y,z})=>[{x:x-1,y,z},{x:x+1,y,z},{x,y:y-1,z},{x,y:y+1,z},{x,y,z:z-1},{x,y,z:z+1}];
const contactFaces=(cell,bounds)=>[
  ...(cell.x===bounds.minX?['-X']:[]), ...(cell.x===bounds.maxX?['+X']:[]),
  ...(cell.y===bounds.minY?['-Y']:[]), ...(cell.y===bounds.maxY?['+Y']:[]),
  ...(cell.z===bounds.minZ?['-Z']:[]), ...(cell.z===bounds.maxZ?['+Z']:[]),
];

for(const required of [path.join(SNAPSHOT,'region'),path.join(SNAPSHOT,'entities'),path.join(SNAPSHOT,'poi'),path.join(SNAPSHOT,'level.dat'),path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'),PRIOR]) fail(fs.existsSync(abs(required)),`missing ${required}`);
fail(!fs.existsSync(abs(OUT)),`output must be fresh: ${OUT}`);
fail(Number.isInteger(CAP)&&CAP>=1&&CAP<=500000,'cap must be an integer from 1 through 500000');
fail(/^AG4-GAP-ADAPTIVE-WATER-COMPONENT-TRACE-[0-9]+$/.test(ID),'id must be an AG4 adaptive trace identity');
fail(/^ag4-gap-adaptive-water-component-trace-[0-9]+$/.test(ARTIFACT),'artifact must match the AG4 adaptive trace identity');
const capture=read(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'));
const prior=read(PRIOR);
fail(capture.immutableCopy===true&&capture.requiredMembers?.length>=130,'complete immutable source required');
fail((prior.status==='AG4_GAP_WATER_COMPONENT_STILL_ESCAPES_NEXT_FRONTIER_HELD_NO_OPERATIONS'||prior.status==='AG4_GAP_WATER_COMPONENT_NOT_FINITE_WITHIN_SAFE_TRACE_HELD_NO_OPERATIONS')&&prior.mutationAuthority===false,'accepted held water-trace result required');
const measurement=prior.measurement;
fail(measurement?.seed?.x===344&&measurement.seed?.y===62&&measurement.seed?.z===-795,'canonical seed drift');
const priorBounds=measurement.nextMeasurementBounds??measurement.bounds;
const priorFaces=measurement.nextEscapeFaces;
fail(priorBounds&&Number.isInteger(priorBounds.minX)&&Number.isInteger(priorBounds.maxX)&&Number.isInteger(priorBounds.minY)&&Number.isInteger(priorBounds.maxY)&&Number.isInteger(priorBounds.minZ)&&Number.isInteger(priorBounds.maxZ),'prior measurement bounds missing');
fail(Array.isArray(priorFaces)&&priorFaces.length>0&&priorFaces.every(face=>['+X','-X','+Y','-Y','+Z','-Z'].includes(face)),'prior trace requires exact non-empty observed faces');
fail(prior.preservedExclusions?.savedItem?.id==='minecraft:item'&&prior.preservedExclusions.savedItem.cell?.x===348&&prior.preservedExclusions.savedItem.cell?.y===62&&prior.preservedExclusions.savedItem.cell?.z===-789,'saved-item exclusion drift');

// Precisely one additional 16-block shell through each prior observed face;
// every untouched face is retained verbatim. This is an adaptive measurement,
// not a guess at fluid extent or a construction boundary.
const STEP=16;
const bounds={...priorBounds};
for(const face of priorFaces){
  if(face==='-X')bounds.minX-=STEP;
  if(face==='+X')bounds.maxX+=STEP;
  if(face==='-Y')bounds.minY-=STEP;
  if(face==='+Y')bounds.maxY+=STEP;
  if(face==='-Z')bounds.minZ-=STEP;
  if(face==='+Z')bounds.maxZ+=STEP;
}
const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region')));
const cache=new Map();
const at=async cell=>{const key=cellKey(cell);if(!cache.has(key))cache.set(key,stateToCommandString(await reader.blockState(cell.x,cell.y,cell.z)));return cache.get(key);};
const seed=measurement.seed;
fail(wet(await at(seed)),`wet seed drift at ${cellKey(seed)}`);
const queue=[seed],seen=new Set([cellKey(seed)]),component=[],escapes=new Set(),stateCensus=new Map();
let capReached=false;
for(let index=0;index<queue.length;index++){
  if(component.length===CAP){capReached=true;break;}
  const cell=queue[index],state=await at(cell);
  fail(wet(state),`wet component encoding drift at ${cellKey(cell)}`);
  component.push(cell);
  stateCensus.set(state,(stateCensus.get(state)??0)+1);
  for(const face of contactFaces(cell,bounds)) escapes.add(face);
  for(const next of neighbors(cell)){
    const key=cellKey(next);
    if(inside(next,bounds)&&!seen.has(key)&&wet(await at(next))){seen.add(key);queue.push(next);}
  }
}
const observedBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
for(const cell of component){
  observedBounds.minX=Math.min(observedBounds.minX,cell.x); observedBounds.maxX=Math.max(observedBounds.maxX,cell.x);
  observedBounds.minY=Math.min(observedBounds.minY,cell.y); observedBounds.maxY=Math.max(observedBounds.maxY,cell.y);
  observedBounds.minZ=Math.min(observedBounds.minZ,cell.z); observedBounds.maxZ=Math.max(observedBounds.maxZ,cell.z);
}
const nextEscapeFaces=[...escapes].sort();
const finiteComponentProven=!capReached&&nextEscapeFaces.length===0;
const holdReason=capReached?'COMPONENT_CAP_REACHED_BEFORE_CLOSURE':nextEscapeFaces.length?'COMPONENT_REACHES_OBSERVED_DIRECTION_SHELL':'FINITE_COMPONENT_CLOSED';
const core={schemaVersion:1,id:ID,generatedAtUtc:GENERATED,status:finiteComponentProven?'AG4_GAP_WATER_COMPONENT_FINITE_CLOSED_NO_OPERATIONS':'AG4_GAP_WATER_COMPONENT_NOT_FINITE_WITHIN_SAFE_TRACE_HELD_NO_OPERATIONS',mutationAuthority:false,source:{root:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:fileSha(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json')),priorExtension:{path:rel(PRIOR),sha256:fileSha(PRIOR),identitySha256:prior.identitySha256}},measurement:{seed,priorBounds,expandedOnlyThrough:priorFaces,perFaceBlocks:STEP,bounds,componentCellCount:component.length,coordinateSetSha256:hashCells(component),stateCensus:Object.fromEntries([...stateCensus.entries()].sort(([left],[right])=>left.localeCompare(right))),observedBounds,nextEscapeFaces,cap:CAP,capReached,finiteComponentProven,termination:holdReason},preservedExclusions:{savedItem:prior.preservedExclusions.savedItem,excludedVolume:prior.preservedExclusions.excludedVolume,rule:'No target, interaction halo, liner, plug, support, receiver, drain, overflow, or rollback coordinate may enter this volume until a separately fresh entity-clearance package accepts it.'},finiteContainmentDecision:finiteComponentProven?{eligibleForSeparateDesign:true,requiredBeforeOperations:['complete component liner / receiver / overflow topology','all target and halo hydrology, gravity, container, protected-core and live-entity checks','directed liner-first forward and safe reverse sequencing']}:{eligibleForSeparateDesign:false,reason:'No finite component boundary is proven. A local liner/support package could redirect or re-create an unobserved water path.',narrowestNextMeasurement:{onlyIfMoreReadOnlyMeasurementIsRequested:true,fromBounds:bounds,onlyThroughObservedFaces:nextEscapeFaces,expandByBlocks:STEP,neverExpandThrough:'+Y unless it becomes an observed contact'},},ag4Continuation:{gapBounds:{minX:336,maxX:351,minZ:-806,maxZ:-784,deckY:[84,91]},railWalkContinuation:'held',savedItemExclusionPreserved:true,externalFlowClaim:false},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const frontier=nextEscapeFaces.length?nextEscapeFaces.join(', '):'closed';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="580" viewBox="0 0 1200 580"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:24px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.shell{fill:#38bdf8}.prior{fill:#64748b}.hold{fill:#fb923c}.item{fill:#f472b6}</style><rect width="100%" height="100%" fill="#071521"/><text x="40" y="42" class="h">${ID.toLowerCase().replaceAll('-',' ')}</text><text x="40" y="68" class="n">latest immutable support source · expanded only ${priorFaces.join(', ')} by ${STEP} blocks</text><rect x="80" y="110" width="540" height="330" class="shell" opacity=".3"/><rect x="165" y="170" width="370" height="210" class="prior" opacity=".8"/><text x="185" y="200" class="s">prior trace boundary</text><rect x="290" y="255" width="125" height="72" class="shell"/><text x="306" y="294" class="n">wet component</text><rect x="420" y="330" width="16" height="16" class="item"/><text x="444" y="344" class="s">saved item excluded</text><rect x="710" y="110" width="430" height="330" class="hold" opacity=".28"/><text x="742" y="154" class="n">topology conclusion</text><text x="742" y="192" class="s">${component.length.toLocaleString()} wet cells read</text><text x="742" y="219" class="s">bounds: X${observedBounds.minX}..${observedBounds.maxX}, Y${observedBounds.minY}..${observedBounds.maxY}</text><text x="742" y="246" class="s">Z${observedBounds.minZ}..${observedBounds.maxZ}</text><text x="742" y="273" class="s">frontier: ${frontier}</text><text x="742" y="300" class="s">cap: ${CAP.toLocaleString()} / reached: ${capReached}</text><text x="742" y="327" class="s">finite closure: ${finiteComponentProven}</text><text x="742" y="354" class="s">0 forward / 0 reverse ops</text><text x="40" y="514" class="s">AG-4 deck/rail continuation remains held. No external flow, receiver, drainage, support, liner, plug, route, or access claim is made.</text><text x="40" y="546" class="hold s">Fail closed: a finite containment package cannot be designed until the measured component closes and every saved-item / physics interface is rechecked.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),`${ARTIFACT}.json`),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),`${ARTIFACT}.svg`),svg);
fs.writeFileSync(path.join(abs(OUT),`${ID}.md`),`# ${ID}\n\n![AG-4 adaptive topology map](${ARTIFACT}.svg)\n\nThis source-bound trace expands only the observed faces from its prior immutable measurement. ${finiteComponentProven?'The component closes, but this read-only artifact still does not create operations.':'The component is not finite within the declared safe trace; AG-4 support, liner, plug, receiver, drainage, and rail/walk continuation remain denied.'} The saved item at 348,62,-789 remains excluded.\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),componentCells:component.length,observedBounds,nextEscapeFaces,cap:CAP,capReached,finiteComponentProven,forwardOperations:0,rollbackOperations:0},null,2));
