#!/usr/bin/env node
/** Compile the maximal R08AD-post north-smoke segment that retains wet halo topology exactly. */

import fs from 'fs';
import path from 'path';
import { AnvilReader, boundsOf, cellKey, cellsIn, hashCells, replLine, sha256,
  stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd(), argv=process.argv.slice(2);
const value=(flag,fallback)=>{const i=argv.indexOf(flag);return i>=0&&argv[i+1]?argv[i+1]:fallback;};
const GENERATED=value('--generated-at','2026-08-22T01:45:00Z');
const SNAPSHOT=value('--snapshot','data/worldsnap-combined-zones-r08ad-post-20260822T012919Z');
const INTAKE=value('--intake-audit','data/world-review/combined-zones-r08ad-live-20260822T012919Z/post-complete-save-intake.json');
const LEDGER=value('--source-release-ledger','data/world-review/combined-zones-r08ad-live-20260822T012919Z/evidence-ledger.json');
const OUT=value('--out-dir','data/buildops');
const BASENAME=value('--basename','combined-zones-r08ae-empty-eight-north-smoke-retained-wet-east-segment');
const RELEASE='CZ-R08AE-EMPTY-EIGHT-NORTH-SMOKE-RETAINED-WET-EAST-SEGMENT';
const NODE='CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const KEY='ee-smoke-n-retained-wet-east-compartment-wall';
const WALL='minecraft:stone_bricks';
const FACE=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const FLUID=/(?:water|bubble_column|lava)/;
const GRAVITY=/(?:^|:)(?:sand|red_sand|gravel|suspicious_sand|suspicious_gravel|(?:chipped_|damaged_)?anvil|dragon_egg|pointed_dripstone|scaffolding|[a-z_]+_concrete_powder)(?:\[|$)/;
const FORBIDDEN=/(?:chest|barrel|furnace|hopper|dispenser|dropper|spawner|lectern|brewing_stand|beacon|jukebox|beehive|bee_nest|decorated_pot|shulker_box|command_block|structure_block|jigsaw|redstone|repeater|comparator|piston|observer|lever|button|pressure_plate|tripwire|rail)/;
const INPUT={prior:'data/buildops/combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment.release-manifest.json',
  n06:'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json',
  relics:'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  empty:'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  auth:'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json'};
const abs=(f)=>path.resolve(ROOT,f),read=(f)=>JSON.parse(fs.readFileSync(abs(f),'utf8'));
const must=(c,m)=>{if(!c)throw new Error(`R08AE retained-wet compiler rejected: ${m}`);};
const inside=(c,b)=>c.x>=b.minX&&c.x<=b.maxX&&c.y>=b.minY&&c.y<=b.maxY&&c.z>=b.minZ&&c.z<=b.maxZ;
const exact=(cells)=>{const u=uniqueCells(cells);return{cellCount:u.length,bounds:boundsOf(u),coordinateSetSha256:hashCells(u)};};
const halo=(cells)=>{const k=new Set(cells.map(cellKey));return uniqueCells(cells.flatMap((c)=>FACE.map(([dx,dy,dz])=>({x:c.x+dx,y:c.y+dy,z:c.z+dz}))).filter((c)=>!k.has(cellKey(c))));};
const body=(f)=>`${fs.readFileSync(abs(f),'utf8').split(/\r?\n/).filter((l)=>l&&!l.startsWith('#')).join('\n')}\n`;
function parse(f){const out=[];for(const l of fs.readFileSync(abs(f),'utf8').split(/\r?\n/)){if(!l||l.startsWith('#'))continue;const p=l.split(/\s+/);must(p[0]==='REPL'&&p.length===9,`${f} malformed`);const n=p.slice(1,7).map(Number);out.push({bounds:{minX:Math.min(n[0],n[3]),maxX:Math.max(n[0],n[3]),minY:Math.min(n[1],n[4]),maxY:Math.max(n[1],n[4]),minZ:Math.min(n[2],n[5]),maxZ:Math.max(n[2],n[5])},fromState:p[7],toState:p[8]});}return out;}
const intake=read(INTAKE),ledger=read(LEDGER),sourceId=read(ledger.postSnapshot.identity.path),prior=read(INPUT.prior),n06=read(INPUT.n06),relics=read(INPUT.relics),empty=read(INPUT.empty),auth=read(INPUT.auth);
must(intake.status==='PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'&&intake.summary.passed&&abs(intake.input.suppliedWorldRoot)===abs(SNAPSHOT),'accepted intake');
must(ledger.status==='EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'&&ledger.transactionId==='combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment'&&abs(ledger.postSnapshot.root)===abs(SNAPSHOT)&&ledger.postSnapshot.completeSaveSha256===intake.packageIdentity.completeSaveSha256,'R08AD terminal source');
must(auth.status==='AUTHORIZED_STANDING_SCOPED_EXECUTION'&&!auth.revoked&&auth.authorizedReleaseNodes.includes(NODE),'standing authority');
const reader=new AnvilReader(abs(path.join(SNAPSHOT,'region'))),entityReader=new AnvilReader(abs(path.join(SNAPSHOT,'entities'))),cache=new Map();
async function state(c){const k=cellKey(c);if(!cache.has(k))cache.set(k,stateToCommandString(await reader.blockState(c.x,c.y,c.z)));return cache.get(k);}
async function records(cells){const o=[];for(const c of cells)o.push({cell:c,state:await state(c)});return o;}

// The original 77-cell wet band cannot use the proven target-fluid graph: its
// eastmost target level-1 cell has no direct level-0/falling neighbour. The
// 63-cell alternative has eight source-air cells directly below retained water,
// so exact durable inverse is impossible. Recompute and retain both exclusions.
const fullWet=cellsIn({minX:1754,maxX:1764,minY:48,maxY:54,minZ:50,maxZ:50});
const fullWetRecords=await records(fullWet),fullWetFluids=fullWetRecords.filter((r)=>FLUID.test(r.state));
const unresolved=fullWetRecords.find(({cell})=>cellKey(cell)==='1758,50,50');
const unresolvedNeighbours=[];for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){const c={x:unresolved.cell.x+dx,y:unresolved.cell.y,z:unresolved.cell.z+dz};unresolvedNeighbours.push({cell:c,state:await state(c)});}
const directAccepted=unresolvedNeighbours.filter(({state:s})=>s==='minecraft:water[level=0]'||s==='minecraft:water[level=8]');
must(fullWet.length===77&&fullWetFluids.length===6&&unresolved.state==='minecraft:water[level=1]'&&directAccepted.length===0,'77-cell blocker proof');
const alternative=cellsIn({minX:1833,maxX:1841,minY:48,maxY:54,minZ:50,maxZ:50}),alternativeRecords=await records(alternative);
const fallingInverse=alternativeRecords.filter(({cell,state:s})=>s==='minecraft:air').filter(async()=>true);
const waterAboveAir=[];for(const {cell,state:s} of alternativeRecords){if(s==='minecraft:air'&&FLUID.test(await state({x:cell.x,y:cell.y+1,z:cell.z})))waterAboveAir.push(cell);}
must(alternative.length===63&&waterAboveAir.length===8,'63-cell non-durable inverse proof');

// Largest remaining sub-run that changes no fluid-accessible topology.
const target=cellsIn({minX:1759,maxX:1764,minY:48,maxY:54,minZ:50,maxZ:50}),targetRecords=await records(target),targetKeys=new Set(target.map(cellKey));
const interaction=halo(target),interactionRecords=await records(interaction);
const targetFluids=targetRecords.filter((r)=>FLUID.test(r.state)),targetGravity=targetRecords.filter((r)=>GRAVITY.test(r.state)),targetForbidden=targetRecords.filter((r)=>FORBIDDEN.test(r.state));
const haloFluids=interactionRecords.filter((r)=>FLUID.test(r.state)),haloGravity=interactionRecords.filter((r)=>GRAVITY.test(r.state)),haloForbidden=interactionRecords.filter((r)=>FORBIDDEN.test(r.state));
const airRecords=targetRecords.filter((r)=>r.state==='minecraft:air'),solidRecords=targetRecords.filter((r)=>r.state!=='minecraft:air');
const waterContact=[];for(const r of targetRecords){const fluids=[];for(const [dx,dy,dz] of FACE){const c={x:r.cell.x+dx,y:r.cell.y+dy,z:r.cell.z+dz},s=await state(c);if(FLUID.test(s))fluids.push({cell:c,state:s});}if(fluids.length)waterContact.push({...r,fluids});}
const airWaterContact=waterContact.filter((r)=>r.state==='minecraft:air'),solidWaterContact=waterContact.filter((r)=>r.state!=='minecraft:air');
must(target.length===42&&hashCells(target)==='5f76af664d8ba78b6abc676a1c0592a898b17238bb65f2db3aa36b3fad979208'
  &&airRecords.length===21&&solidRecords.length===21&&targetFluids.length===0&&targetGravity.length===0&&targetForbidden.length===0
  &&interaction.length===110&&hashCells(interaction)==='27bdbf3a24a41bdc544e1c1c3c1a2e7694198f70b0bffc80ddaf79af5c70b930'
  &&haloFluids.length===27&&haloGravity.length===0&&haloForbidden.length===0&&airWaterContact.length===0&&solidWaterContact.length===15,'selected topology-preserving wet-halo segment');
must(haloFluids.filter((r)=>r.state==='minecraft:water[level=0]').length===26&&haloFluids.filter((r)=>r.state==='minecraft:water[level=1]').length===1,'retained water roots/flow levels');
const retainedLevelOne=haloFluids.find((r)=>r.state==='minecraft:water[level=1]');
must(cellKey(retainedLevelOne.cell)==='1758,50,50'&&await state({x:1758,y:50,z:51})==='minecraft:water[level=1]'&&await state({x:1759,y:50,z:51})==='minecraft:water[level=0]','retained level-1 to source feed path');

const envelope=[...target,...interaction],envKeys=new Set(envelope.map(cellKey)),envBounds=boundsOf(envelope),blockEntities=[],savedEntities=[];
for(let cx=Math.floor(envBounds.minX/16);cx<=Math.floor(envBounds.maxX/16);cx++)for(let cz=Math.floor(envBounds.minZ/16);cz<=Math.floor(envBounds.maxZ/16);cz++){
  const ch=await reader.chunk(cx,cz);for(const e of ch?.block_entities??ch?.blockEntities??[]){const c={x:+e.x,y:+e.y,z:+e.z};if(envKeys.has(cellKey(c)))blockEntities.push({id:e.id,cell:c});}
  const ec=await entityReader.chunk(cx,cz);for(const e of ec?.Entities??[]){if(!Array.isArray(e.Pos))continue;const [x,y,z]=e.Pos.map(Number);if(x>=envBounds.minX&&x<envBounds.maxX+1&&y>=envBounds.minY&&y<envBounds.maxY+1&&z>=envBounds.minZ&&z<envBounds.maxZ+1)savedEntities.push({id:e.id,position:[x,y,z]});}}
const relicHits=relics.relics.flatMap((r)=>envelope.filter((c)=>inside(c,r.declaredInclusiveBounds)));
const sealKeys=new Set(empty.d06.futureInterfaces.interfaces.flatMap((i)=>cellsIn(i.sealDesign.bounds)).map(cellKey));
const futureHits=envelope.filter((c)=>sealKeys.has(cellKey(c))),n06Keys=new Set(n06.targetGravity.findings.map((f)=>cellKey(f.cell))),n06Hits=envelope.filter((c)=>n06Keys.has(cellKey(c)));
must(blockEntities.length===0&&savedEntities.length===0&&relicHits.length===0&&futureHits.length===0&&n06Hits.length===0,'entity/relic/future/N06 isolation');

const priorPaths=[...new Set([...prior.isolation.acceptedPriorManifestChecks.map((x)=>x.path),INPUT.prior])],priorChecks=[],hits=[];
for(const p of priorPaths){const m=read(p),found=new Map();for(const pkg of m.packages??[]){const d=m.operations[pkg.key]??((m.packages?.length??0)===1&&m.operations.forwardSha256?m.operations:null);must(d&&sha256(body(pkg.forward))===d.forwardSha256,`prior body ${p}`);for(const o of parse(pkg.forward))for(const c of target)if(inside(c,o.bounds))found.set(cellKey(c),{cell:c,transactionId:m.transactionId,desired:o.toState});}priorChecks.push({path:p,transactionId:m.transactionId,manifestIdentity:m.manifestIdentity,targetIntersectionCount:found.size});hits.push(...found.values());}
const r02=hits.filter((h)=>h.transactionId==='combined-zones-r02-d06-shell');
const r06=hits.filter((h)=>h.transactionId==='combined-zones-r06-support-liner');
const undeclared=hits.filter((h)=>!['combined-zones-r02-d06-shell','combined-zones-r06-support-liner'].includes(h.transactionId));
must(priorPaths.length===54&&r02.length===21&&r02.every((h)=>h.desired==='minecraft:air')
  &&r06.length===16&&r06.every((h)=>h.desired==='minecraft:deepslate_tiles')&&undeclared.length===0,
  `prior ownership ${JSON.stringify({paths:priorPaths.length,r02:r02.length,r06:r06.length,undeclared:undeclared.length})}`);

// Air first, then source solids. Reverse rollback restores every original solid
// containment cell before opening any source-air cell.
const ordered=[...airRecords.sort((a,b)=>a.cell.y-b.cell.y||a.cell.x-b.cell.x),...solidRecords.sort((a,b)=>a.cell.y-b.cell.y||a.cell.x-b.cell.x)];
const operations=ordered.map((r)=>({cell:r.cell,fromState:r.state,toState:WALL}));
const canonical=(role)=>`data/buildops/${BASENAME}.${KEY}.${role}.txt`,output=(role)=>path.join(OUT,`${BASENAME}.${KEY}.${role}.txt`);
const lines=operations.map((o)=>replLine(o.cell,o.fromState,o.toState)),reverse=operations.slice().reverse().map((o)=>replLine(o.cell,o.toState,o.fromState));
const header=[`# release: ${RELEASE}`,`# release_node: ${NODE}`,`# package: ${KEY}`,`# source_snapshot: ${SNAPSHOT}`,'# offline_compiler: true'];
fs.mkdirSync(abs(OUT),{recursive:true});fs.writeFileSync(abs(output('forward')),`${header.join('\n')}\n${lines.join('\n')}\n`);fs.writeFileSync(abs(output('rollback')),`${header.join('\n')}\n# operation_role: rollback\n${reverse.join('\n')}\n`);
const fsha=sha256(`${lines.join('\n')}\n`),rsha=sha256(`${reverse.join('\n')}\n`);
const manifest={schemaVersion:1,generatedAtUtc:GENERATED,transactionId:BASENAME,status:'COMPILED_FROM_ACCEPTED_R08AD_POST_AWAITING_FRESH_EXECUTION_KERNEL',releaseNodeId:NODE,mvpScope:true,scopeIds:['OWN-D06-SMOKE','Z02-U1-CONCOURSE-MALL'],
  scope:{releaseId:RELEASE,canonicalOwner:'OWN-D06-SMOKE',masterScopeOwner:'Z02-U1-CONCOURSE-MALL',mvpScope:true,purpose:'Build the largest exact residual north-smoke sub-run that retains every wet halo cell and changes no fluid-accessible topology.',materialDoctrine:{wall:{paletteId:'EE-P01',block:WALL}},geometry:{selectedRetainedWetEastSegment:{...exact(target),widthCells:6,heightCells:7,componentCount:1},interactionHalo:exact(interaction),airTargets:exact(airRecords.map((r)=>r.cell)),sourceSolidTargets:exact(solidRecords.map((r)=>r.cell)),waterContactSolidTargets:exact(solidWaterContact.map((r)=>r.cell))},operationalBoundary:{boundedStaticConstructionAccepted:true,completeNorthSmokeBoundaryBuilt:false,passiveNorthSmokeBoundaryCommissioned:false,poweredSmokeControlAuthorized:false,wetInterfaceOpened:false,n06Touched:false}},
  scopeSelection:{doctrine:'LARGEST_CONTIGUOUS_RESIDUAL_SUBRUN_WITH_ZERO_TARGET_FLUID_AND_ZERO_FLUID_ACCESSIBLE_TOPOLOGY_CHANGE',selectedRun:{minX:1759,maxX:1764,widthCells:6},rejectedFullWetRun:{bounds:{minX:1754,maxX:1764,minY:48,maxY:54,minZ:50,maxZ:50},cellCount:77,targetFluidCount:6,unresolvedTarget:{cell:unresolved.cell,state:unresolved.state,directAcceptedUpstreamCount:directAccepted.length,neighbours:unresolvedNeighbours},disposition:'FAIL_CLOSED_NO_PROVEN_DIRECT_UPSTREAM_FOR_OPERATED_LEVEL_1_CELL'},rejectedAlternativeWetRun:{bounds:{minX:1833,maxX:1841,minY:48,maxY:54,minZ:50,maxZ:50},cellCount:63,nonDurableInverseAirBelowWaterCount:waterAboveAir.length,nonDurableCells:waterAboveAir,disposition:'FAIL_CLOSED_ROLLBACK_AIR_WOULD_IMMEDIATELY_ACCEPT_FALLING_WATER'}},
  source:{snapshotRoot:SNAPSHOT,intakeAudit:INTAKE,terminalReleaseLedger:{path:LEDGER,transactionId:ledger.transactionId,completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},completeSaveSha256:intake.packageIdentity.completeSaveSha256,regionSnapshotSha256:sourceId.sha256,exactTargetStateCensus:{'minecraft:air':21,'minecraft:deepslate_tiles':16,'minecraft:stone':5}},
  isolation:{targetFluidIntersectionCount:0,targetGravityIntersectionCount:0,targetContainerOrControlIntersectionCount:0,interactionHalo:exact(interaction),interactionHaloFluidCount:27,interactionHaloGravityCount:0,interactionHaloContainerOrControlCount:0,retainedFluidTopology:{sourceWaterCount:26,flowingWaterCount:1,airTargetFluidContactCount:0,solidTargetFluidContactCount:15,solidToSolidContactTransitionCount:15,retainedLevelOneFeedPath:[{cell:{x:1758,y:50,z:50},state:'minecraft:water[level=1]'},{cell:{x:1758,y:50,z:51},state:'minecraft:water[level=1]'},{cell:{x:1759,y:50,z:51},state:'minecraft:water[level=0]'}],fluidAccessibleTopologyChanged:false},blockEntityInteractionEnvelopeIntersectionCount:0,savedEntityInteractionEnvelopeIntersectionCount:0,protectedRelicInteractionEnvelopeIntersectionCount:0,deferredFutureLineSealInteractionEnvelopeIntersectionCount:0,isolatedN06Exception:{exactBlockedCellCount:4,interactionEnvelopeIntersectionCount:0,remainsFailClosedAndUnchanged:true},acceptedPriorSupersession:{r02AirReservationCellCount:21,r06SupportLinerCellCount:16,r06DesiredState:'minecraft:deepslate_tiles'},checkedPriorManifestCount:priorChecks.length,acceptedPriorManifestChecks:priorChecks,undeclaredPriorReleaseIntersectionCount:0},
  executionOrder:{forward:[KEY],rollback:[KEY],withinPackage:'source air bottom-up, then source solids bottom-up; exact reverse rollback restores source solids top-down before source air',rationale:'Every water-contact target remains solid throughout both directions. No source-air target has a fluid face neighbour, so the retained 27-cell wet halo keeps identical accessible topology.'},
  operations:{[KEY]:{forwardSha256:fsha,rollbackSha256:rsha,forwardCommandCount:42,rollbackCommandCount:42,targetCoordinateSetSha256:hashCells(target),exactInverse:true}},packages:[{key:KEY,forward:canonical('forward'),rollback:canonical('rollback')}],
  hardStops:{requireFreshImmutableSourceImmediatelyBeforeExecution:true,requireExactSourceGuards:true,requireLiveEntityClearance:true,requireBlockEntityAndProtectedCoreClearance:true,requireStrictNoopForwardAndRollbackParserChecks:true,requireJournaledStrictExecution:true,requireFreshPostSnapshotAndRollbackPoststatePreflight:true,requireRetainedFluidTopologyExact:true,forbidFullNorthBoundaryCommissioningFromThisPartialScope:true},liveCallsPerformed:false,worldEditsPerformed:false};
manifest.manifestIdentity=sha256(JSON.stringify(manifest));fs.writeFileSync(abs(path.join(OUT,`${BASENAME}.release-manifest.json`)),`${JSON.stringify(manifest,null,2)}\n`);
process.stdout.write(`${JSON.stringify({status:manifest.status,manifest:`data/buildops/${BASENAME}.release-manifest.json`,manifestIdentity:manifest.manifestIdentity,targetCellCount:42,haloCellCount:110,retainedFluidCellCount:27,forwardSha256:fsha,rollbackSha256:rsha,liveCallsPerformed:false,worldEditsPerformed:false},null,2)}\n`);
