#!/usr/bin/env node
/**
 * AG-4 west-frontier closure measurement 06.
 *
 * A source-bound, read-only plan for the sole observed frontier left by the
 * capped AG-4 trace. It plans a larger finite measurement; it does not trace,
 * emit operations, select a liner, or imply that a component cap is closure.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const option=(flag,fallback)=>{const index=process.argv.indexOf(flag);return index<0?fallback:process.argv[index+1]??fallback;};
const SNAPSHOT=option('--snapshot','data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z');
const PRIOR=option('--prior','data/world-review/ag4-gap-adaptive-water-component-trace-05-mp11-c01-support-post-20260827T043000Z/ag4-gap-adaptive-water-component-trace-05.json');
const OUT=option('--out','data/world-review/ag4-gap-west-closure-measurement-06-mp11-c01-support-post-20260827T043000Z');
const GENERATED=option('--generated-at','2026-08-27T08:00:00.000Z');
const CAP=Number(option('--cap','250000'));
const abs=value=>path.resolve(ROOT,value); const rel=value=>path.relative(ROOT,abs(value)).split(path.sep).join('/');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex'); const fileSha=value=>sha(fs.readFileSync(abs(value)));
const fail=(condition,message)=>{if(!condition)throw new Error(`AG-4 west closure measurement rejected: ${message}`);};
const stateName=state=>state.split('[',1)[0]; const FLUIDS=new Set(['minecraft:water','minecraft:lava','minecraft:bubble_column']);
const wet=state=>FLUIDS.has(stateName(state))||state.includes('waterlogged=true');

for(const required of [path.join(SNAPSHOT,'region'),path.join(SNAPSHOT,'entities'),path.join(SNAPSHOT,'poi'),path.join(SNAPSHOT,'level.dat'),path.join(SNAPSHOT,'combined-zones-complete-save-capture.json'),PRIOR])fail(fs.existsSync(abs(required)),`missing ${required}`);
fail(!fs.existsSync(abs(OUT)),`output must be fresh: ${OUT}`);
fail(Number.isInteger(CAP)&&CAP>=125001&&CAP<=500000,'cap must be an integer from 125001 through 500000');
const capture=JSON.parse(fs.readFileSync(abs(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json')),'utf8'));
fail(capture.immutableCopy===true&&capture.requiredMembers?.length===130,'complete 130-member immutable source required');
for(const member of capture.requiredMembers){const file=path.join(abs(SNAPSHOT),member.path);fail(fs.existsSync(file)&&fs.statSync(file).size===member.bytes&&sha(fs.readFileSync(file))===member.sha256,`capture member drift ${member.path}`);}
const prior=JSON.parse(fs.readFileSync(abs(PRIOR),'utf8'));
fail(prior.id==='AG4-GAP-ADAPTIVE-WATER-COMPONENT-TRACE-05'&&prior.status==='AG4_GAP_WATER_COMPONENT_NOT_FINITE_WITHIN_SAFE_TRACE_HELD_NO_OPERATIONS'&&prior.mutationAuthority===false,'accepted trace-05 held decision required');
const priorMeasurement=prior.measurement;
fail(priorMeasurement?.capReached===true&&priorMeasurement.componentCellCount===125000,'trace-05 must be the capped 125,000-cell measurement');
fail(JSON.stringify(priorMeasurement.nextEscapeFaces)===JSON.stringify(['-X']),'trace-05 must have only the observed -X boundary contact');
const savedItem=prior.preservedExclusions?.savedItem;
fail(savedItem?.id==='minecraft:item'&&savedItem.cell?.x===348&&savedItem.cell?.y===62&&savedItem.cell?.z===-789,'saved item exclusion drift');
const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region'))); const entityReader=new AnvilReader(abs(path.join(SNAPSHOT,'entities')));
const seed=priorMeasurement.seed; const seedState=stateToCommandString(await reader.blockState(seed.x,seed.y,seed.z));
fail(wet(seedState),`trace seed no longer wet at ${cellKey(seed)}`);
const itemChunk=await entityReader.chunk(Math.floor(savedItem.cell.x/16),Math.floor(savedItem.cell.z/16));
const itemPresent=(itemChunk?.Entities??itemChunk?.entities??[]).some(entity=>Array.isArray(entity.Pos)&&entity.id==='minecraft:item'&&Math.floor(Number(entity.Pos[0]))===348&&Math.floor(Number(entity.Pos[1]))===62&&Math.floor(Number(entity.Pos[2]))===-789);
fail(itemPresent,'saved item no longer present at the excluded cell');

const priorBounds=priorMeasurement.bounds;
const traceBounds={minX:priorBounds.minX-16,maxX:priorBounds.maxX,minY:priorBounds.minY,maxY:priorBounds.maxY,minZ:priorBounds.minZ,maxZ:priorBounds.maxZ};
const captureChunks={minChunkX:Math.floor(traceBounds.minX/16),maxChunkX:Math.floor(traceBounds.maxX/16),minChunkZ:Math.floor(traceBounds.minZ/16),maxChunkZ:Math.floor(traceBounds.maxZ/16)};
const captureEnvelope={minX:captureChunks.minChunkX*16,maxX:captureChunks.maxChunkX*16+15,minY:traceBounds.minY,maxY:traceBounds.maxY,minZ:captureChunks.minChunkZ*16,maxZ:captureChunks.maxChunkZ*16+15};
const chunkCount=(captureChunks.maxChunkX-captureChunks.minChunkX+1)*(captureChunks.maxChunkZ-captureChunks.minChunkZ+1);
const shell={minX:traceBounds.minX,maxX:priorBounds.minX-1,minY:traceBounds.minY,maxY:traceBounds.maxY,minZ:traceBounds.minZ,maxZ:traceBounds.maxZ};
const core={schemaVersion:1,id:'AG4-GAP-WEST-CLOSURE-MEASUREMENT-06',generatedAtUtc:GENERATED,status:'SOURCE_BOUND_READ_ONLY_WEST_FRONTIER_CLOSURE_MEASUREMENT_REQUIRED',mutationAuthority:false,source:{snapshot:rel(SNAPSHOT),captureId:capture.captureId,completeSaveCaptureSha256:fileSha(path.join(SNAPSHOT,'combined-zones-complete-save-capture.json')),verifiedRequiredMemberCount:capture.requiredMembers.length,priorTrace:{path:rel(PRIOR),sha256:fileSha(PRIOR),identitySha256:prior.identitySha256}},selection:{whyThisMeasurement:'The AG-4 bridge x=336..351 is the smallest currently identified functional continuation but its sole last-observed trace frontier is -X. B07 has a materially larger unresolved multi-frontier receiver topology; this plan closes the narrower local bridge prerequisite first.',notAConstructionDecision:true},measurement:{seed,seedState,priorBounds,observedFrontier:['-X'],expandedOnlyThrough:['-X'],perFaceBlocks:16,newShell:shell,traceBounds,captureChunks,chunkCount,captureEnvelope,componentCap:CAP,capRule:'Stop and report COMPONENT_CAP_REACHED_BEFORE_CLOSURE at exactly this count. A cap is not a topology boundary and must not create a containment target.',savedItemExclusion:{entity:savedItem,excludedVolume:prior.preservedExclusions.excludedVolume,rule:'The item and this entire volume remain outside trace targets, all future liner/support/receiver/deck/rail operations, and rollback until separate fresh same-moment clearance.'}},traceProtocol:{readOnly:true,algorithm:['seed exactly at 344,62,-795','visit only face-connected wet/waterlogged/bubble cells inside traceBounds','record all six trace-boundary contacts before selecting any successor shell','never mutate, drain, place, break, open, or use a fluid update','retain all prior AG-3 deck/rail/path and AG-4 item exclusions'],successCondition:'Queue drains below 250,000 cells and every cell on all six trace boundary faces is dry. Only this proves a finite measured component within this scope.',ifBoundaryReached:'Emit only the exact reached faces and a new source-bound read-only plan expanding one 16-block shell through those faces.',ifCapReached:'Emit only the cap state and visited set. Do not infer unobserved faces, a finite boundary, a liner, a plug, a receiver, a drain, or a support target.'},compilerGraduation:{eligibleOnlyWhen:['the west trace meets the stated queue-drained + six-dry-faces success condition','the saved item is separately cleared or every target/halo remains disjoint from its exclusion volume','all 16 AG4 unsafe bearing cells are reconciled under a finite hydrology/gravity component design','a full liner/support/receiver-or-no-overflow topology defines canonical target and exact reverse order','fresh target-plus-halo container/block-entity/protected-core and same-moment live-entity checks pass'],requiredCompilerOutputs:['exact support/liner/deck/rail target states','liner/support-first forward ordering','reverse order that never recreates uncontrolled water or falling sand','strict-noop source and rollback parser/preflight evidence','post-state and independent route/containment QA'],notGranted:['no current operation','no rail/promenade continuation','no receiver/drain/overflow','no external flow claim','no route or public/service claim']},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}};
const result={...core,identitySha256:sha(`${JSON.stringify(core,null,2)}\n`)};
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="600" viewBox="0 0 1180 600"><style>text{font-family:system-ui,sans-serif;fill:#e7f4ff}.h{font-size:24px;font-weight:700}.n{font-size:16px}.s{font-size:13px}.old{fill:#64748b}.shell{fill:#38bdf8}.hold{fill:#fb923c}.item{fill:#f472b6}</style><rect width="100%" height="100%" fill="#071521"/><text x="40" y="42" class="h">AG-4 west-frontier closure measurement 06</text><text x="40" y="68" class="n">latest immutable support source · no operations · only observed −X expands</text><rect x="100" y="120" width="500" height="310" class="old" opacity=".75"/><text x="282" y="155" class="n">trace-05 volume</text><rect x="50" y="120" width="48" height="310" class="shell" opacity=".8"/><text x="48" y="455" class="s">new 16-block −X shell</text><rect x="318" y="285" width="15" height="15" class="item"/><text x="342" y="299" class="s">saved item exclusion retained</text><rect x="700" y="120" width="420" height="310" class="hold" opacity=".27"/><text x="732" y="160" class="n">bounded trace contract</text><text x="732" y="202" class="s">trace: X${traceBounds.minX}..${traceBounds.maxX}, Y${traceBounds.minY}..${traceBounds.maxY}, Z${traceBounds.minZ}..${traceBounds.maxZ}</text><text x="732" y="232" class="s">chunk capture: ${chunkCount} chunks (X ${captureChunks.minChunkX}..${captureChunks.maxChunkX}, Z ${captureChunks.minChunkZ}..${captureChunks.maxChunkZ})</text><text x="732" y="262" class="s">component cap: ${CAP.toLocaleString()}</text><text x="732" y="292" class="s">success: queue drains + all six faces dry</text><text x="732" y="322" class="s">otherwise: record faces/cap only</text><text x="732" y="352" class="s">0 forward / 0 rollback ops</text><text x="40" y="520" class="s">A finite closure permits a separate support/liner/receiver design—not an automatic AG-4 rail or promenade release.</text><text x="40" y="552" class="hold s">No fluid update, target state, containment, deck, rail, route, service, or external-flow claim is emitted by this plan.</text></svg>\n`;
fs.mkdirSync(abs(OUT),{recursive:true});
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-west-closure-measurement-06.json'),`${JSON.stringify(result,null,2)}\n`);
fs.writeFileSync(path.join(abs(OUT),'ag4-gap-west-closure-measurement-06.svg'),svg);
fs.writeFileSync(path.join(abs(OUT),'AG4-GAP-WEST-CLOSURE-MEASUREMENT-06.md'),`# AG-4 west-frontier closure measurement 06\n\n![Measurement map](ag4-gap-west-closure-measurement-06.svg)\n\nThis is a finite, read-only capture and trace plan for the sole observed west frontier from trace 05. It expands only -X by 16 blocks and caps traversal at ${CAP.toLocaleString()} cells. It cannot create operations or a liner/support/rail decision.\n\nA separate compiler may be considered only if the queue drains below the cap with all six boundary faces dry, the saved-item exclusion remains clear, and a complete directed containment/gravity/receiver/reverse-order design passes a fresh safety kernel.\n`);
console.log(JSON.stringify({status:result.status,out:rel(OUT),observedFrontier:result.measurement.observedFrontier,traceBounds,chunkCount,componentCap:CAP,forwardOperations:0,rollbackOperations:0},null,2));
