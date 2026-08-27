#!/usr/bin/env node
/**
 * AG-4 immediate gap hydrology/gravity containment decision.
 *
 * Read-only by design: this looks for a finite water component before any
 * liner/plug can be compiled.  It deliberately produces a precise held
 * micro-scope instead of local operations when the component escapes the
 * measured source boundary.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const opt=(key, fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1]??fallback;};
const SNAPSHOT=opt('--snapshot','data/worldsnap-ag3-exterior-loop-exec-post-20260827T021200Z');
const LEDGER=opt('--ag3-ledger','data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/ag3-guarded-release-ledger.json');
const QA=opt('--ag3-qa','data/world-review/ag3-citywide-exterior-loop-passive-rail-01-live-20260827T021200Z/independent-post-release-qa.json');
const SURVEY=opt('--survey','data/world-review/ag4-adjacent-exterior-continuation-survey-02-post-20260827T021200Z/ag4-adjacent-continuation-survey.json');
const OUT=opt('--out','data/world-review/ag4-gap-hydrology-gravity-containment-01-post-20260827T021200Z');
const GENERATED=opt('--generated-at','2026-08-28T10:40:00.000Z');
const abs=p=>path.resolve(ROOT,p), rel=p=>path.relative(ROOT,abs(p)).split(path.sep).join('/');
const read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const fileSha=p=>sha(fs.readFileSync(abs(p)));
const fail=(ok,message)=>{if(!ok)throw new Error(`AG-4 gap containment rejected: ${message}`);};
const name=state=>state.split('[',1)[0];
const fluids=new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']);
const gravity=new Set(['minecraft:sand','minecraft:red_sand','minecraft:gravel','minecraft:suspicious_sand','minecraft:suspicious_gravel']);
const wet=state=>fluids.has(name(state))||state.includes('waterlogged=true');
const box=b=>{const result=[];for(let x=b.minX;x<=b.maxX;x++)for(let y=b.minY;y<=b.maxY;y++)for(let z=b.minZ;z<=b.maxZ;z++)result.push({x,y,z});return result;};
const neighbors=({x,y,z})=>[{x:x-1,y,z},{x:x+1,y,z},{x,y:y-1,z},{x,y:y+1,z},{x,y,z:z-1},{x,y,z:z+1}];
const inside=(cell,b)=>cell.x>=b.minX&&cell.x<=b.maxX&&cell.y>=b.minY&&cell.y<=b.maxY&&cell.z>=b.minZ&&cell.z<=b.maxZ;
const boundaryFaces=(cell,b)=>[
  ...(cell.x===b.minX?['-X']:[]), ...(cell.x===b.maxX?['+X']:[]),
  ...(cell.y===b.minY?['-Y']:[]), ...(cell.y===b.maxY?['+Y']:[]),
  ...(cell.z===b.minZ?['-Z']:[]), ...(cell.z===b.maxZ?['+Z']:[]),
];

for(const required of [path.join(SNAPSHOT,'region'),path.join(SNAPSHOT,'entities'),path.join(SNAPSHOT,'poi'),path.join(SNAPSHOT,'level.dat'),path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'),LEDGER,QA,SURVEY])fail(fs.existsSync(abs(required)),`missing ${required}`);
fail(!fs.existsSync(abs(OUT)),`output must be fresh: ${OUT}`);
const capture=read(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'));
const ledger=read(LEDGER), qa=read(QA), survey=read(SURVEY);
fail(capture.immutableCopy===true&&capture.requiredMembers?.length>=130,'complete immutable accepted AG-3 post snapshot required');
fail(ledger.status==='EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'&&qa.status==='PASS_AG3_POSTSTATE_PASSIVE_RAIL_QA','accepted AG-3 release ledger and independent QA required');
fail(survey.status==='AG4_ADJACENT_HELD_NEAREST_DISJOINT_SEQUENCE_IDENTIFIED_NO_OPERATIONS','accepted AG-4 immediate-gap survey required');

const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region')));
const entityReader=new AnvilReader(abs(path.join(SNAPSHOT,'entities')));
const cache=new Map();
const at=async cell=>{const key=cellKey(cell);if(!cache.has(key))cache.set(key,stateToCommandString(await reader.blockState(cell.x,cell.y,cell.z)));return cache.get(key);};

const gap={id:'AG4-EE-01-GAP',bounds:{minX:336,maxX:351,minZ:-806,maxZ:-784},deckEnvelope:{minY:84,maxY:91}};
const seed={x:344,y:62,z:-795};
const traceBounds={minX:330,maxX:365,minY:45,maxY:80,minZ:-810,maxZ:-780};
fail(wet(await at(seed)),`water trace seed no longer wet at ${cellKey(seed)}`);
const queue=[seed], visited=new Set([cellKey(seed)]), cells=[], faces=new Set();
for(let index=0;index<queue.length;index++){
  const cell=queue[index]; const state=await at(cell);
  // `queue` is seeded wet and only grows over wet cells; retaining this guard
  // makes a source-state encoding drift fail closed rather than silently trace air.
  fail(wet(state),`wet trace drift at ${cellKey(cell)}`);
  cells.push({cell,state}); for(const face of boundaryFaces(cell,traceBounds))faces.add(face);
  for(const next of neighbors(cell))if(inside(next,traceBounds)&&!visited.has(cellKey(next))&&wet(await at(next))){visited.add(cellKey(next));queue.push(next);}
}
const componentCells=cells.map(({cell})=>cell);
const componentBounds={minX:Math.min(...componentCells.map(c=>c.x)),maxX:Math.max(...componentCells.map(c=>c.x)),minY:Math.min(...componentCells.map(c=>c.y)),maxY:Math.max(...componentCells.map(c=>c.y)),minZ:Math.min(...componentCells.map(c=>c.z)),maxZ:Math.max(...componentCells.map(c=>c.z))};
const expectedBearingFailures=(survey.candidate.bearings.failures??[]).map(({x,y,z,state})=>({cell:{x,y,z},state}));
fail(expectedBearingFailures.length===16,'AG-4 survey unsafe-bearing failure count drift');
for(const sample of expectedBearingFailures)fail(wet(await at(sample.cell))||gravity.has(name(await at(sample.cell))),`unsafe bearing drift at ${cellKey(sample.cell)}`);
const gravityBearingCells=expectedBearingFailures.filter(({cell})=>gravity.has(name(cache.get(cellKey(cell)) ?? 'minecraft:air')));
const padTwo={minX:344,maxX:346,minY:61,maxY:64,minZ:-796,maxZ:-794};
const padThree={minX:349,maxX:351,minY:61,maxY:64,minZ:-796,maxZ:-794};
const padHalo=pad=>uniqueCells(box(pad).flatMap(neighbors).filter(cell=>!inside(cell,pad)));
const summarizePad=async (id,pad)=>{const unsafe=expectedBearingFailures.filter(({cell})=>inside(cell,pad));const sand=gravityBearingCells.filter(({cell})=>inside(cell,pad));const halo=padHalo(pad), wetHalo=[];for(const cell of halo){const state=await at(cell);if(wet(state))wetHalo.push({cell,state});}return {id,bounds:pad,unsafeBearingCells:unsafe,gravityBearingCells:sand,interactionHalo:{cellCount:halo.length,coordinateSetSha256:hashCells(halo),wetCells:wetHalo},compileEligible:false,reason:'water in interaction halo belongs to a component that escapes the exact measurement boundary'};};
const pads=[await summarizePad('AG4-GAP-PIER-2',padTwo),await summarizePad('AG4-GAP-PIER-3',padThree)];
const entityBounds={minX:336,maxX:351,minY:45,maxY:91,minZ:-806,maxZ:-784};
const savedEntities=[];
for(const chunkId of new Set(box({minX:entityBounds.minX,maxX:entityBounds.maxX,minY:0,maxY:0,minZ:entityBounds.minZ,maxZ:entityBounds.maxZ}).map(({x,z})=>`${Math.floor(x/16)},${Math.floor(z/16)}`))){
  const [x,z]=chunkId.split(',').map(Number); const chunk=await entityReader.chunk(x,z);
  for(const entity of chunk?.Entities??chunk?.entities??[]){if(!Array.isArray(entity.Pos))continue;const position=entity.Pos.map(Number),cell={x:Math.floor(position[0]),y:Math.floor(position[1]),z:Math.floor(position[2])};if(inside(cell,entityBounds))savedEntities.push({cell,id:entity.id??entity.Id??null,position});}
}
const protectedItem=savedEntities.find(entity=>entity.id==='minecraft:item'&&entity.cell.x===348&&entity.cell.y===62&&entity.cell.z===-789);
fail(Boolean(protectedItem),'expected saved item at 348,62,-789 absent or drifted');
const componentEscapes=[...faces].sort();
fail(componentEscapes.length>0,'finite trace unexpectedly has no boundary contact');
const finiteComponentProven=componentEscapes.length===0;
const status=finiteComponentProven?'AG4_GAP_FINITE_COMPONENT_AVAILABLE_FOR_SEPARATE_COMPILER_NO_OPERATIONS':'AG4_GAP_WATER_COMPONENT_ESCAPES_MEASUREMENT_BOUNDARY_HELD_NO_OPERATIONS';
const exactMicroScopes=[
  {id:'AG4-GAP-WATER-TRACE-01',kind:'measurement-only',seed,measurementBounds:traceBounds,component:{cellCount:componentCells.length,coordinateSetSha256:hashCells(componentCells),observedBounds:componentBounds,escapeFaces:componentEscapes},requiredNextMeasurement:'Extend only through the observed escape faces, then re-evaluate complete fluid topology before any liner, plug, drain, receiver, or overflow design.'},
  ...pads,
  {id:'AG4-GAP-SAVED-ITEM-EXCLUSION-01',kind:'entity-exclusion',entity:protectedItem,excludedVolume:{minX:347,maxX:349,minY:61,maxY:63,minZ:-790,maxZ:-788},rule:'No generated target, halo, containment, drainage, support, or rollback cell may include this volume until separately cleared against a fresh same-moment source.'},
];
const core={schemaVersion:1,id:'AG4-GAP-HYDROLOGY-GRAVITY-CONTAINMENT-01',generatedAtUtc:GENERATED,status,mutationAuthority:false,source:{root:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:fileSha(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json')),ag3Ledger:{path:rel(LEDGER),sha256:fileSha(LEDGER)},ag3PostQa:{path:rel(QA),sha256:fileSha(QA)},ag4Survey:{path:rel(SURVEY),sha256:fileSha(SURVEY)}},gap,findings:{waterComponent:{seed,measurementBounds:traceBounds,componentCellCount:componentCells.length,coordinateSetSha256:hashCells(componentCells),observedBounds:componentBounds,escapeFaces:componentEscapes,finiteComponentProven},unsafeBearingFailures:{cellCount:expectedBearingFailures.length,cells:expectedBearingFailures,coordinateSetSha256:hashCells(expectedBearingFailures.map(({cell})=>cell))},gravityBearingCells:{cellCount:gravityBearingCells.length,cells:gravityBearingCells,coordinateSetSha256:hashCells(gravityBearingCells.map(({cell})=>cell))},savedEntityExclusion:{entity:protectedItem,rule:'exclude by default'}},exactMicroScopes,compilerDecision:{operationsEmitted:false,reason:finiteComponentProven?'No package is emitted by a design survey.':'The component is not finite in the immutable source measurement. A local plug, liner, drain, or bearing substitution could change an unbounded water path; all affected pier packages remain denied.'},preservedEnvelope:{deck:{bounds:{minX:336,maxX:351,minY:84,maxY:85,minZ:-806,maxZ:-784},status:'unmodified'},railAndRecovery:{bounds:{minX:336,maxX:351,minY:84,maxY:88,minZ:-793,maxZ:-784},status:'unmodified'},explicitNonClaims:['no physical containment','no drainage/receiver/overflow','no support/deck/rail extension','no public circulation, egress, passenger service, or route claim']},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const map=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:25px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.water{fill:#38bdf8}.sand{fill:#fbbf24}.hold{fill:#fb923c}.item{fill:#f472b6}.deck{fill:#64748b}</style><rect width="100%" height="100%" fill="#071521"/><text x="42" y="44" class="h">AG-4 gap: source-bound water / gravity containment decision</text><text x="42" y="70" class="n">X336..351 · accepted AG-3 post source · no mutation authority</text><rect x="90" y="130" width="730" height="220" class="deck"/><text x="105" y="156" class="s">deck / rail reserve envelope remains unmodified (Y84..91)</text><rect x="355" y="230" width="155" height="85" class="water"/><text x="369" y="270" class="n">wet component</text><text x="369" y="292" class="s">seed 344,62,-795</text><rect x="345" y="205" width="170" height="22" class="sand"/><text x="527" y="222" class="s">pier 2 gravity / water conflict</text><rect x="575" y="205" width="175" height="22" class="sand"/><text x="758" y="222" class="s">pier 3 gravity cells</text><rect x="520" y="325" width="18" height="18" class="item"/><text x="546" y="340" class="s">saved item 348,62,-789 — excluded</text><rect x="875" y="130" width="275" height="300" class="hold" opacity="0.28"/><text x="900" y="167" class="n">fail-closed result</text><text x="900" y="203" class="s">${componentCells.length.toLocaleString()} wet cells traced</text><text x="900" y="228" class="s">escape faces: ${componentEscapes.join(', ')}</text><text x="900" y="253" class="s">16 unsafe / ${gravityBearingCells.length} gravity cells</text><text x="900" y="278" class="s">0 forward / 0 rollback ops</text><text x="900" y="303" class="s">no liner, plug, drain, or rail</text><text x="900" y="328" class="s">until finite closure is measured</text><text x="42" y="510" class="n">Next safe input: extend the water measurement only through observed escape faces; preserve the saved-item exclusion and re-check every pier halo.</text><text x="42" y="545" class="hold s">This artifact is a design decision, not a release manifest. It does not alter water, sand, supports, deck, rails, access, or routing.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-hydrology-gravity-containment-01.json'),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-hydrology-gravity-containment-01.svg'),map);
fs.writeFileSync(path.join(abs(OUT),'AG4-GAP-HYDROLOGY-GRAVITY-CONTAINMENT-01.md'),`# AG-4 gap hydrology / gravity containment 01 — held\n\n![AG-4 gap map](ag4-gap-hydrology-gravity-containment-01.svg)\n\nThe immediate AG-4 gap at X336..351 is not a safe local support package on the accepted AG-3 post source. The water component seeded at 344,62,-795 reaches the stated finite measurement boundary, so the water cannot be plugged, lined, drained, or assigned a receiver locally. The 16 sand/gravity bearing cells remain held because the relevant pier interaction halos touch that escaping component.\n\nThe saved item at 348,62,-789 and its stated exclusion volume are explicitly outside every possible future target until separately cleared against a fresh source. This report emits no operations, release manifest, or mutation authority.\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),waterComponentCells:componentCells.length,escapeFaces:componentEscapes,unsafeBearingCells:expectedBearingFailures.length,gravityBearingCells:gravityBearingCells.length,savedItemExcluded:Boolean(protectedItem),forwardOperations:0,rollbackOperations:0},null,2));
