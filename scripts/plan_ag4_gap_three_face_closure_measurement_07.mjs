#!/usr/bin/env node
/**
 * AG-4 combined three-face closure measurement 07.
 *
 * Expands the exact open trace-06 faces (-X, -Z, +Z) by one 16-block shell
 * against the same immutable source. This plans read-only measurement only:
 * it emits no operation, containment, support, rail, promenade, or route.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const option=(flag,fallback)=>{const index=process.argv.indexOf(flag);return index<0?fallback:process.argv[index+1]??fallback;};
const SNAPSHOT=option('--snapshot','data/worldsnap-masterplan-frontier-refresh-20260827T053500Z');
const PRIOR=option('--prior','data/world-review/ag4-gap-west-closure-trace-06-masterplan-frontier-refresh-20260827T053500Z/ag4-gap-west-closure-trace-06.json');
const OUT=option('--out','data/world-review/ag4-gap-three-face-closure-measurement-07-masterplan-frontier-refresh-20260827T053500Z');
const GENERATED=option('--generated-at','2026-08-27T08:20:00.000Z');
const CAP=Number(option('--cap','250000'));
const abs=value=>path.resolve(ROOT,value); const rel=value=>path.relative(ROOT,abs(value)).split(path.sep).join('/');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(condition,message)=>{if(!condition)throw new Error(`AG-4 three-face closure measurement rejected: ${message}`);};
const stateName=state=>state.split('[',1)[0]; const FLUIDS=new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']);
const wet=state=>FLUIDS.has(stateName(state))||state.includes('waterlogged=true');

for(const required of [path.join(SNAPSHOT,'region'),path.join(SNAPSHOT,'entities'),path.join(SNAPSHOT,'poi'),path.join(SNAPSHOT,'level.dat'),path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'),PRIOR])fail(fs.existsSync(abs(required)),`missing ${required}`);
fail(!fs.existsSync(abs(OUT)),`output must be fresh: ${OUT}`);
fail(CAP===250000,'measurement 07 retains the documented 250,000-cell cap');
const captureBytes=fs.readFileSync(abs(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'))); const capture=JSON.parse(captureBytes);
fail(capture.immutableCopy===true&&capture.requiredMembers?.length===130,'complete 130-member immutable source required');
for(const member of capture.requiredMembers){const file=path.join(abs(SNAPSHOT),member.path);fail(fs.existsSync(file)&&fs.statSync(file).size===member.bytes&&sha(fs.readFileSync(file))===member.sha256,`capture member drift ${member.path}`);}
const priorBytes=fs.readFileSync(abs(PRIOR)); const prior=JSON.parse(priorBytes);
const {identitySha256:priorIdentity,...priorCore}=prior;
fail(priorIdentity===sha(`${JSON.stringify(priorCore,null,2)}\n`),'trace-06 identity drift');
fail(prior.id==='AG4-GAP-WEST-CLOSURE-TRACE-06'&&prior.status==='AG4_GAP_COMPONENT_NOT_FINITE_HELD_NO_OPERATIONS'&&prior.mutationAuthority===false,'accepted trace-06 held decision required');
fail(prior.source?.snapshot===rel(SNAPSHOT)&&prior.source?.captureId===capture.captureId&&prior.source?.completeSaveCaptureSha256===sha(captureBytes),'trace-06 must bind this exact immutable source');
const priorMeasurement=prior.measurement;
fail(priorMeasurement?.capReached===false&&priorMeasurement.componentCellCount===196072&&priorMeasurement.finiteComponentProven===false&&priorMeasurement.termination==='COMPONENT_REACHES_TRACE_BOUNDARY','trace-06 must be the uncapped 196,072-cell open measurement');
const faces=['-X','-Z','+Z'];
fail(JSON.stringify(priorMeasurement.boundaryContacts)===JSON.stringify(faces),'trace-06 must expose exactly -X, -Z, and +Z');
const priorBounds=priorMeasurement.bounds;
fail(JSON.stringify(priorBounds)===JSON.stringify({minX:250,maxX:397,minY:13,maxY:80,minZ:-858,maxZ:-716}),'trace-06 bounds drift');
const savedItem=prior.preservedExclusions?.entity;
fail(savedItem?.id==='minecraft:item'&&savedItem.cell?.x===348&&savedItem.cell?.y===62&&savedItem.cell?.z===-789,'saved item exclusion drift');
fail(prior.preservedExclusions?.excludedVolume,'saved item exclusion volume missing');
const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region'))); const entityReader=new AnvilReader(abs(path.join(SNAPSHOT,'entities')));
const seed=priorMeasurement.seed; const seedState=stateToCommandString(await reader.blockState(seed.x,seed.y,seed.z));
fail(wet(seedState),`trace seed no longer wet at ${cellKey(seed)}`);
const itemChunk=await entityReader.chunk(Math.floor(savedItem.cell.x/16),Math.floor(savedItem.cell.z/16));
const itemPresent=(itemChunk?.Entities??itemChunk?.entities??[]).some(entity=>Array.isArray(entity.Pos)&&entity.id==='minecraft:item'&&Math.floor(Number(entity.Pos[0]))===348&&Math.floor(Number(entity.Pos[1]))===62&&Math.floor(Number(entity.Pos[2]))===-789);
fail(itemPresent,'saved item no longer present at the excluded cell');

const traceBounds={minX:priorBounds.minX-16,maxX:priorBounds.maxX,minY:priorBounds.minY,maxY:priorBounds.maxY,minZ:priorBounds.minZ-16,maxZ:priorBounds.maxZ+16};
const newShells=[
  {face:'-X',bounds:{minX:traceBounds.minX,maxX:priorBounds.minX-1,minY:traceBounds.minY,maxY:traceBounds.maxY,minZ:traceBounds.minZ,maxZ:traceBounds.maxZ},includesCornerShoulders:['-X/-Z','-X/+Z']},
  {face:'-Z',bounds:{minX:priorBounds.minX,maxX:priorBounds.maxX,minY:traceBounds.minY,maxY:traceBounds.maxY,minZ:traceBounds.minZ,maxZ:priorBounds.minZ-1},includesCornerShoulders:[]},
  {face:'+Z',bounds:{minX:priorBounds.minX,maxX:priorBounds.maxX,minY:traceBounds.minY,maxY:traceBounds.maxY,minZ:priorBounds.maxZ+1,maxZ:traceBounds.maxZ},includesCornerShoulders:[]},
];
const captureChunks={minChunkX:Math.floor(traceBounds.minX/16),maxChunkX:Math.floor(traceBounds.maxX/16),minChunkZ:Math.floor(traceBounds.minZ/16),maxChunkZ:Math.floor(traceBounds.maxZ/16)};
const captureEnvelope={minX:captureChunks.minChunkX*16,maxX:captureChunks.maxChunkX*16+15,minY:traceBounds.minY,maxY:traceBounds.maxY,minZ:captureChunks.minChunkZ*16,maxZ:captureChunks.maxChunkZ*16+15};
const chunkCount=(captureChunks.maxChunkX-captureChunks.minChunkX+1)*(captureChunks.maxChunkZ-captureChunks.minChunkZ+1);
const core={schemaVersion:1,id:'AG4-GAP-THREE-FACE-CLOSURE-MEASUREMENT-07',generatedAtUtc:GENERATED,status:'SOURCE_BOUND_READ_ONLY_THREE_FACE_CLOSURE_MEASUREMENT_REQUIRED',mutationAuthority:false,source:{snapshot:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:sha(captureBytes),verifiedRequiredMemberCount:capture.requiredMembers.length,priorTrace:{path:rel(PRIOR),sha256:sha(priorBytes),identitySha256:prior.identitySha256}},selection:{whyThisMeasurement:'Trace 06 drained below its cap and proved that the connected AG-4 wet component escapes exactly -X, -Z, and +Z. Measurement 07 expands one combined 16-block shell through all and only those evidenced faces.',notAConstructionDecision:true},measurement:{seed,seedState,priorBounds,observedFrontier:faces,expandedOnlyThrough:faces,perFaceBlocks:16,newShells,traceBounds,captureChunks,chunkCount,captureEnvelope,componentCap:CAP,capRule:'Stop and report COMPONENT_CAP_REACHED_BEFORE_CLOSURE at exactly 250,000 visited cells. Do not infer boundary faces from an incomplete traversal.',savedItemExclusion:{entity:savedItem,excludedVolume:prior.preservedExclusions.excludedVolume,rule:'The item and its complete exclusion volume remain outside every present or future target, halo, operation, and rollback unless separately cleared from a fresh same-moment source.'}},traceProtocol:{readOnly:true,algorithm:['seed exactly at 344,62,-795','visit only face-connected wet/waterlogged/bubble cells inside traceBounds','measure the union expansion through exactly -X, -Z, and +Z','record all six trace-boundary contacts only if traversal drains below the cap','never mutate, drain, place, break, open, or use a fluid update','retain all prior AG-3 deck/rail/path and AG-4 item exclusions'],successCondition:'Queue drains below 250,000 cells and no wet cell contacts any of the six trace-boundary faces.',ifBoundaryReached:'Emit only the exact reached faces and a new source-bound read-only survey disposition. Do not select a receiver, containment target, support, rail, promenade, or route.',ifCapReached:'Emit only the cap state and visited-set hash. Boundary contacts are incomplete and must not select successor faces.'},compilerGraduation:{eligibleOnlyWhen:['the combined trace drains below cap with all six boundary faces dry','the saved item is separately cleared or every target and halo remains disjoint from its exclusion volume','all 16 AG-4 unsafe bearing cells are reconciled under a finite hydrology/gravity design','one exact owner and a complete receiver-or-no-overflow behavior are accepted','canonical target/retained/halo/protected/entity sets and exact forward/inverse order exist','fresh source preflight, same-moment live entity clearance, strict journal, immutable post, rollback-post preflight, and independent containment/route QA pass'],notGranted:['no current operation','no liner, plug, drain, receiver, or support','no rail/promenade continuation','no route, opening, public, passenger, or service claim']},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="620" viewBox="0 0 1180 620"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:24px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.old{fill:#64748b}.shell{fill:#38bdf8}.hold{fill:#fb923c}.item{fill:#f472b6}</style><rect width="100%" height="100%" fill="#071521"/><text x="40" y="42" class="h">AG-4 three-face closure measurement 07</text><text x="40" y="68" class="n">read-only combined shell through −X, −Z, +Z · no operations</text><rect x="120" y="150" width="430" height="280" class="old" opacity=".75"/><rect x="70" y="100" width="50" height="380" class="shell" opacity=".85"/><rect x="120" y="100" width="430" height="50" class="shell" opacity=".85"/><rect x="120" y="430" width="430" height="50" class="shell" opacity=".85"/><text x="260" y="290" class="n">trace-06 bounds</text><text x="58" y="510" class="s">−X shell and corner shoulders</text><text x="270" y="92" class="s">−Z shell</text><text x="270" y="505" class="s">+Z shell</text><rect x="338" y="285" width="15" height="15" class="item"/><text x="362" y="299" class="s">saved item exclusion retained</text><rect x="680" y="100" width="440" height="380" class="hold" opacity=".27"/><text x="715" y="142" class="n">bounded trace contract</text><text x="715" y="184" class="s">X ${traceBounds.minX}..${traceBounds.maxX}</text><text x="715" y="214" class="s">Y ${traceBounds.minY}..${traceBounds.maxY}</text><text x="715" y="244" class="s">Z ${traceBounds.minZ}..${traceBounds.maxZ}</text><text x="715" y="284" class="s">${chunkCount} captured chunks</text><text x="715" y="314" class="s">cap: ${CAP.toLocaleString()} visited wet cells</text><text x="715" y="344" class="s">success: queue drains + six dry faces</text><text x="715" y="374" class="s">cap hit: contacts incomplete; stop</text><text x="715" y="404" class="s">0 forward / 0 rollback ops</text><text x="40" y="558" class="s">Finite closure permits only a separate owner-bound containment design; it never creates construction authority.</text><text x="40" y="588" class="hold s">No water, liner, receiver, support, deck, rail, route, external-flow, public, passenger, or service state is changed or claimed.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-three-face-closure-measurement-07.json'),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-three-face-closure-measurement-07.svg'),svg);
fs.writeFileSync(path.join(abs(OUT),'AG4-GAP-THREE-FACE-CLOSURE-MEASUREMENT-07.md'),`# AG-4 three-face closure measurement 07\n\n![Combined three-face measurement map](ag4-gap-three-face-closure-measurement-07.svg)\n\nThis source-bound, read-only plan expands the trace-06 volume by one combined 16-block shell through exactly \`-X\`, \`-Z\`, and \`+Z\`. It retains the 250,000-cell cap and emits no operations or construction decision.\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),expandedOnlyThrough:faces,traceBounds,chunkCount,componentCap:CAP,forwardOperations:0,rollbackOperations:0},null,2));
