#!/usr/bin/env node
/**
 * Compile a finite second controlled Westlight discharge.  The new 3x3 shaft
 * is sealed before its finite water cells are displaced, then joins the
 * existing controlled headhouse through a dry three-wide lower transfer.
 * It is expressly staff-only: no rail, passenger platform, power, gate, or
 * public-route claim is emitted.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };
const SNAPSHOT = arg('--snapshot', 'data/worldsnap-cobalt-rr-controlled-ladder-post-20260826T185100Z');
const OUT = arg('--out-dir', 'data/buildops');
const BASENAME = arg('--basename', 'cobalt-wl-second-controlled-egress-01');
const GENERATED_AT = arg('--generated-at', '2026-08-26T00:00:00.000Z');
const RELEASE_ID = 'COBALT-WL-SECOND-CONTROLLED-EGRESS-01';
const NODE = 'CZ-SYS03-COBALT-WL-SECOND-CONTROLLED-EGRESS';
const AUTH = 'docs/masterplans/05-combined-zones/sys03-cobalt-wl-second-controlled-egress-governor-standing-execution-authorization.json';
const AIR = 'minecraft:air';
const PD = 'minecraft:polished_deepslate';
const PA = 'minecraft:polished_andesite';
const LADDER = 'minecraft:ladder[facing=south,waterlogged=false]';
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (ok, text) => { if (!ok) throw new Error(`${RELEASE_ID} compiler rejected: ${text}`); };
const key = (c) => cellKey(c);
const box = (b) => { const a=[]; for(let x=b.minX;x<=b.maxX;x++)for(let y=b.minY;y<=b.maxY;y++)for(let z=b.minZ;z<=b.maxZ;z++)a.push({x,y,z}); return a; };
const exact = (a) => { const s=uniqueCells(a); return {cellCount:s.length,bounds:s.length?boundsOf(s):null,coordinateSetSha256:hashCells(s)}; };
const base = (s) => s.split('[',1)[0];
const fluid = (s) => ['minecraft:water','minecraft:lava','minecraft:bubble_column'].includes(base(s)) || s.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand','minecraft:red_sand','minecraft:gravel','minecraft:suspicious_sand','minecraft:suspicious_gravel','minecraft:dragon_egg']);
const protectedBlocks = new Set(['minecraft:chest','minecraft:trapped_chest','minecraft:barrel','minecraft:hopper','minecraft:dispenser','minecraft:dropper','minecraft:spawner','minecraft:lectern','minecraft:beacon','minecraft:command_block','minecraft:chain_command_block','minecraft:repeating_command_block','minecraft:structure_block']);
const census = (rs, f) => Object.fromEntries([...rs.reduce((m,r)=>m.set(f(r),(m.get(f(r))??0)+1),new Map()).entries()].sort(([a],[b])=>a.localeCompare(b)));

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
fail(fs.existsSync(capturePath), 'complete immutable source capture is missing');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'source is not declared complete and immutable');
for (const member of capture.requiredMembers) { const p=abs(path.join(SNAPSHOT,member.path)); fail(fs.existsSync(p) && fs.statSync(p).size===member.bytes && sha(fs.readFileSync(p))===member.sha256, `source member drifted: ${member.path}`); }
const reader = new AnvilReader(abs(path.join(SNAPSHOT,'region')));
const cache = new Map();
const at = async (c) => { const k=key(c); if(!cache.has(k))cache.set(k,stateToCommandString(await reader.blockState(c.x,c.y,c.z))); return cache.get(k); };

// New independent surface discharge: x=-250..-248, z=-462..-460, y18..65.
// Its dry lower transfer runs south to the existing x=-250..-248 headhouse.
const shaft = box({minX:-250,maxX:-248,minY:18,maxY:65,minZ:-462,maxZ:-460});
const transfer = box({minX:-250,maxX:-248,minY:18,maxY:20,minZ:-459,maxZ:-445});
const aperture = box({minX:-250,maxX:-248,minY:18,maxY:20,minZ:-445,maxZ:-445});
const ladder = []; for(let y=19;y<=66;y++)ladder.push({x:-250,y,z:-462});
const pad = box({minX:-252,maxX:-246,minY:66,maxY:66,minZ:-464,maxZ:-458}).filter((c) => !ladder.some((l) => key(l) === key(c)));
const floor = uniqueCells([...box({minX:-250,maxX:-248,minY:17,maxY:17,minZ:-462,maxZ:-445})]);
const shaftWalls=[];
for(let y=18;y<=65;y++) for(let z=-462;z<=-460;z++) { shaftWalls.push({x:-251,y,z}); shaftWalls.push({x:-247,y,z}); }
for(let y=18;y<=65;y++) for(let x=-250;x<=-248;x++) { shaftWalls.push({x,y,z:-463}); if(!(y>=18&&y<=20))shaftWalls.push({x,y,z:-459}); }
const transferWalls=[];
for(let y=18;y<=20;y++)for(let z=-459;z<=-445;z++){transferWalls.push({x:-251,y,z});transferWalls.push({x:-247,y,z});}
const ceiling = box({minX:-250,maxX:-248,minY:21,maxY:21,minZ:-459,maxZ:-445});
const shell = uniqueCells([...pad,...floor,...shaftWalls,...transferWalls,...ceiling]);
const interior = uniqueCells([...shaft,...transfer,...aperture]);
const ladderKeys = new Set(ladder.map(key));
const interiorClear = interior.filter((c)=>!ladderKeys.has(key(c)) && !(c.y===66));
const shellKeys=new Set(shell.map(key));
for(const c of interior) fail(!shellKeys.has(key(c)),`shell/interior overlap ${key(c)}`);
const records=[]; const seen=new Set();
const add=async(c,target,role,group)=>{const k=key(c);fail(!seen.has(k),`duplicate target ${k}`);seen.add(k);const source=await at(c);fail(!protectedBlocks.has(base(source)),`protected block at ${k} (${source})`);if(source!==target)records.push({cell:c,sourceState:source,targetState:target,role,group});};
for(const c of shell) await add(c, c.y===66 ? PA : PD, c.y===66?'surface-pad':'sealed-liner','seal');
for(const c of interiorClear) await add(c,AIR,'controlled-interior','access');
for(const c of ladder) await add(c,LADDER,'controlled-ladder','access');
const operated=uniqueCells(records.map(r=>r.cell));
const waterDisplaced=records.filter(r=>fluid(r.sourceState));
const gravityTouched=records.filter(r=>gravity.has(base(r.sourceState)));
fail(gravityTouched.length===0, `gravity source entered operation set (${gravityTouched.length})`);
fail(waterDisplaced.length>0 && waterDisplaced.every(r=>base(r.sourceState)==='minecraft:water'), 'finite water band is not exclusively water');
const halo=uniqueCells(operated.flatMap(c=>{const a=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)a.push({x:c.x+dx,y:c.y+dy,z:c.z+dz});return a;})).filter(c=>!seen.has(key(c)));
const haloRecords=[]; for(const c of halo){const state=await at(c);fail(!protectedBlocks.has(base(state)),`protected block in interaction halo ${key(c)} (${state})`);haloRecords.push({cell:c,state});}
const sourceWaterHalo=haloRecords.filter(r=>fluid(r.state));
fail(waterDisplaced.every((r) => base(r.sourceState) === 'minecraft:water'), 'non-water fluid entered the finite sealed containment package');

const groups=['seal','access']; const forwardPaths={}; const rollbackPaths={}; const operations={};
fs.mkdirSync(abs(OUT),{recursive:true});
for(const group of groups){const items=records.filter(r=>r.group===group).sort((a,b)=>a.cell.y-b.cell.y||a.cell.x-b.cell.x||a.cell.z-b.cell.z);const body=`${items.map(r=>replLine(r.cell,r.sourceState,r.targetState)).join('\n')}\n`;const rev=`${items.slice().reverse().map(r=>replLine(r.cell,r.targetState,r.sourceState)).join('\n')}\n`;const fsha=sha(body),rsha=sha(rev);const f=path.join(OUT,`${BASENAME}.${group}.forward.txt`),rb=path.join(OUT,`${BASENAME}.${group}.rollback.txt`);const hdr=(direction,h)=>`# GENERATED FILE - ${RELEASE_ID} (${group} ${direction})\n# source root: ${SNAPSHOT}\n# target coordinate-set SHA-256: ${hashCells(items.map(r=>r.cell))}\n# operation SHA-256: ${h}`;fs.writeFileSync(abs(f),`${hdr('forward',fsha)}\n${body}`);fs.writeFileSync(abs(rb),`${hdr('rollback',rsha)}\n${rev}`);forwardPaths[group]=rel(f);rollbackPaths[group]=rel(rb);operations[group]={forwardSha256:fsha,rollbackSha256:rsha,forwardCommandCount:items.length,rollbackCommandCount:items.length,targetCellCount:items.length,targetCoordinateSetSha256:hashCells(items.map(r=>r.cell)),exactInverse:true};}
const core={schemaVersion:1,transactionId:BASENAME,generatedAtUtc:GENERATED_AT,status:'COMPILED_FROM_COMPLETE_POSTSOURCE_AWAITING_FRESH_EXECUTION_KERNEL',releaseNodeId:NODE,mvpScope:false,scopeIds:['SYS-03','PASSENGER-RAILWAY'],packages:groups.map(key=>({key,forward:forwardPaths[key],rollback:rollbackPaths[key]})),executionOrder:{forward:groups,rollback:[...groups].reverse()},scopedRunner:{wrapper:'scripts/run_combined_zones_scoped_release.mjs',authorization:AUTH,releaseNodeId:NODE,packagePathsMustRemainUnder:'data/buildops',defaultMode:'PREPARE_ONLY',liveExecutionOptIn:'--execute'},source:{snapshotRoot:SNAPSHOT,completeSaveCapture:{path:rel(capturePath),sha256:sha(captureBytes),captureId:capture.captureId,capturedAtUtc:capture.capturedAtUtc,immutableCopy:true,verifiedRequiredMemberCount:capture.requiredMembers.length}},scope:{releaseId:RELEASE_ID,canonicalOwner:'PASSENGER-RAILWAY',governorDelegatedRoles:{scopeOwner:'Passenger Railway implementation lead',counterpartOwner:'Westlight district interface lead',safetyAndRecoveryOwner:'Passenger Railway safety/recovery lead',releaseOperator:'Guarded-release implementation operator'},purpose:'Create a second finite sealed Westlight controlled staff discharge and three-wide lower transfer to the existing controlled headhouse. It advances redundant protected station access only.',selectedStationPair:'Westlight (PR-W02) ↔ Ravensreach (PR-W04)',newShaftClear:exact(shaft),lowerTransferClear:exact(transfer),existingShaftAperture:exact(aperture),ladderCells:exact(ladder),sealedLiner:exact(shell),waterDisplacedWithinSealedShaft:exact(waterDisplaced.map(r=>r.cell)),retainedHaloWater:exact(sourceWaterHalo.map(r=>r.cell)),twoIndependentControlledSurfaceDischarges:true,routeCommissioned:false,passengerServiceCommissioned:false},target:{operatedUnion:exact(operated),sourceStateCensus:census(records,r=>r.sourceState),desiredStateCensus:census(records,r=>r.targetState),packageTargetsDisjoint:true},operations,hardStops:{requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution:true,requiresSourceToReproveFiniteWaterContainmentAndDryTransfer:true,requiresBlockEntityAndLiveEntityClearance:true,requiresStrictNoopForwardAndRollbackChecks:true,requiresExactSourcePreflight:true,requiresJournaledStrictExecution:true,requiresFreshPostSnapshotAndRollbackPoststatePreflight:true,requiresFunctionalControlledAccessQa:true},safetyBoundary:{liveCallsPerformed:false,worldEditsPerformed:false,executionAuthorizedByThisManifest:false,noExternalSignaturesRequired:true,forbiddenClaims:['public route','passenger rail operation','vehicle trial','power or signal operation']}};
const manifest={...core,manifestIdentity:sha(JSON.stringify(core))};const manifestPath=path.join(OUT,`${BASENAME}.release-manifest.json`);fs.writeFileSync(abs(manifestPath),`${JSON.stringify(manifest,null,2)}\n`);console.log(JSON.stringify({status:manifest.status,manifest:rel(manifestPath),operations:Object.fromEntries(groups.map(g=>[g,operations[g].targetCellCount])),waterDisplaced:waterDisplaced.length,liveCallsPerformed:false,worldEditsPerformed:false},null,2));
