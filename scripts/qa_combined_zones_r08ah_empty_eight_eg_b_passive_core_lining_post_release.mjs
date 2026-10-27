#!/usr/bin/env node
/** Independent read-only post-release QA for R08AH. */
import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256,
  stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT=process.cwd();
const DIR='data/world-review/combined-zones-r08ah-live-20260822T022005Z';
const LEDGER_PATH=`${DIR}/evidence-ledger.json`;
const MANIFEST_PATH='data/buildops/combined-zones-r08ah-empty-eight-eg-b-passive-core-lining.release-manifest.json';
const POST='data/worldsnap-r08ah-post-20260822T022005Z';
const KEY='ee-eg-b-passive-core-lining';
const FACE=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const absolute=(filename)=>path.resolve(ROOT,filename);
const readJson=(filename)=>JSON.parse(fs.readFileSync(absolute(filename),'utf8'));
const fileBinding=(filename)=>({path:filename,sha256:sha256(fs.readFileSync(absolute(filename))),
  bytes:fs.statSync(absolute(filename)).size});
const invariant=(condition,message)=>{if(!condition)throw new Error(`R08AH post-release QA rejected: ${message}`);};
const exactSet=(cells)=>{const exact=uniqueCells(cells);return{cellCount:exact.length,bounds:boundsOf(exact),coordinateSetSha256:hashCells(exact)};};
const faceHalo=(cells)=>{const keys=new Set(cells.map(cellKey));return uniqueCells(cells.flatMap((cell)=>FACE.map(([dx,dy,dz])=>({x:cell.x+dx,y:cell.y+dy,z:cell.z+dz}))).filter((cell)=>!keys.has(cellKey(cell))));};
function operations(filename,expand=false){const output=[];for(const line of fs.readFileSync(absolute(filename),'utf8').split(/\r?\n/)){if(!line.startsWith('REPL '))continue;const fields=line.split(/\s+/),n=fields.slice(1,7).map(Number),bounds={minX:Math.min(n[0],n[3]),maxX:Math.max(n[0],n[3]),minY:Math.min(n[1],n[4]),maxY:Math.max(n[1],n[4]),minZ:Math.min(n[2],n[5]),maxZ:Math.max(n[2],n[5])};if(expand){for(const cell of cellsIn(bounds))output.push({cell,fromState:fields[7],toState:fields[8]});}else output.push({cell:{x:n[0],y:n[1],z:n[2]},fromState:fields[7],toState:fields[8]});}return output;}

const ledger=readJson(LEDGER_PATH),manifest=readJson(MANIFEST_PATH);
invariant(fileBinding(LEDGER_PATH).sha256==='5989c219118f06be76582b3f152a0280e278196b9683083aa02578c695682a6e'
  &&fileBinding(MANIFEST_PATH).sha256==='35f54c539a080e00cd4c57ae02a94aa0b336280b11a49fd5c0247d908867662a'
  &&manifest.manifestIdentity==='bc4be457f3dc659b485fd1757280cee6f7ff6add45ee1fc1e27b8d1c14f00d2f','ledger/manifest binding');
invariant(ledger.status==='EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'&&ledger.transactionId===manifest.transactionId
  &&ledger.sourceBoundReleaseIdentitySha256==='191389e56cbd4d6d29ee24bd97c1e4d3503cb336eace2e3a10bf93b697e7af5f'
  &&ledger.executionBindingSha256==='cb4dc41c8cf87c4cd49decc256ff8a1323633173e677189ab5e0031740d4b0c4'
  &&ledger.completedReleaseIdentitySha256==='c562eb63b91bb9aa6169a1aeb721673e3c10fa4ee6cdf3257a3e0c3ca26637a5','release identity');
const sourceIdentity=readJson(ledger.sourceSnapshot.identity.path),postIdentity=readJson(ledger.postSnapshot.identity.path);
invariant(ledger.sourceSnapshot.completeSaveSha256==='df695ac2e6c35a6370b5e993263f4e382cdd20146894356d18bd6f6434c826b2'
  &&sourceIdentity.sha256==='6c8c3491b7c8733e33d71f4864778669940212b678116d0267f3e524ce919767'
  &&ledger.postSnapshot.completeSaveSha256==='0809f6d6719ef5d16e93bc70de5a87c62e7f24b6517db77edefad7c855bd52d0'
  &&postIdentity.sha256==='109466d7931186e84bb7686438156209b1f86b8fb50c1c64dabd62c3c1d2dbc9'
  &&ledger.stages.length===17&&ledger.stages.every(({status})=>status==='PASS')
  &&ledger.evidenceBindings.length===17&&ledger.evidenceBindings.every((entry)=>fileBinding(entry.path).sha256===entry.sha256),'snapshot/stage/evidence binding');

const forward=operations(manifest.packages[0].forward),rollback=operations(manifest.packages[0].rollback),targets=forward.map(({cell})=>cell),targetKeys=new Set(targets.map(cellKey));
const bounds={minX:1849,maxX:1855,minY:42,maxY:54,minZ:145,maxZ:151};
const core=cellsIn(bounds),floor=cellsIn({...bounds,minY:42,maxY:42}),roof=cellsIn({...bounds,minY:54,maxY:54}),interior=cellsIn({minX:1850,maxX:1854,minY:43,maxY:53,minZ:146,maxZ:150}),halo=faceHalo(targets),review=uniqueCells([...core,...halo]);
invariant(forward.length===264&&JSON.stringify(rollback)===JSON.stringify(forward.slice().reverse().map((entry)=>({cell:entry.cell,fromState:entry.toState,toState:entry.fromState})))
  &&hashCells(targets)==='d8fc8240526277f31be6e9c039802db1f4420fb448d4eba308c2cf7aea3fa71b'
  &&floor.length===49&&roof.length===49&&interior.length===275&&halo.length===532&&review.length===945,'geometry/inverse');
const execution=readJson(`${DIR}/${KEY}.forward-execution.json`),inverse=readJson(`${DIR}/${KEY}.rollback-poststate-preflight.json`),journal=fs.readFileSync(absolute(`${DIR}/${KEY}.forward-execution.json.stream-journal.jsonl`),'utf8').trim().split(/\r?\n/).map(JSON.parse);
invariant(execution.status==='complete'&&execution.strictNoop&&execution.successfulCommands===264&&execution.failedCommands===0&&execution.noopCommands===0
  &&inverse.status==='PASS'&&inverse.passed===264&&inverse.failed===0&&journal.length===534&&journal.at(-1).status==='complete','execution/journal/inverse');

const sourceReader=new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root,'region'))),postReader=new AnvilReader(absolute(path.join(POST,'region'))),sourceStates=new Map(),postStates=new Map();
async function statePair(cell){const key=cellKey(cell);if(!sourceStates.has(key)){sourceStates.set(key,stateToCommandString(await sourceReader.blockState(cell.x,cell.y,cell.z)));postStates.set(key,stateToCommandString(await postReader.blockState(cell.x,cell.y,cell.z)));}return[sourceStates.get(key),postStates.get(key)];}
for(const cell of review)await statePair(cell);
const transitionMismatch=forward.filter(({cell,fromState,toState})=>sourceStates.get(cellKey(cell))!==fromState||postStates.get(cellKey(cell))!==toState),changed=review.filter((cell)=>sourceStates.get(cellKey(cell))!==postStates.get(cellKey(cell))),undeclared=changed.filter((cell)=>!targetKeys.has(cellKey(cell)));
invariant(transitionMismatch.length===0&&changed.length===264&&undeclared.length===0
  &&targets.every((cell)=>postStates.get(cellKey(cell))==='minecraft:stone_bricks')
  &&floor.filter((cell)=>postStates.get(cellKey(cell))==='minecraft:polished_deepslate').length===30
  &&floor.filter((cell)=>postStates.get(cellKey(cell))==='minecraft:smooth_stone').length===19
  &&roof.every((cell)=>postStates.get(cellKey(cell))==='minecraft:smooth_stone')
  &&interior.every((cell)=>postStates.get(cellKey(cell))==='minecraft:air')
  &&halo.every((cell)=>sourceStates.get(cellKey(cell))===postStates.get(cellKey(cell))),'target, retained core, halo, or bounded diff');

const r02=readJson('data/buildops/combined-zones-r02-d06-shell.release-manifest.json'),r02Target=[];
for(const pkg of r02.packages)for(const operation of operations(pkg.forward,true))if(targetKeys.has(cellKey(operation.cell)))r02Target.push(operation);
invariant(r02Target.length===264&&r02Target.filter(({toState})=>toState==='minecraft:air').length===229
  &&r02Target.filter(({toState})=>toState==='minecraft:polished_deepslate').length===35
  &&r02Target.every(({cell,toState})=>sourceStates.get(cellKey(cell))===toState),'R02 reservation source binding');

const priorR08Keys=new Set(),priorR08Manifests=[];
for(const check of manifest.isolation.acceptedPriorManifestChecks){const prior=readJson(check.path);if(!prior.transactionId.startsWith('combined-zones-r08'))continue;priorR08Manifests.push(prior.transactionId);for(const pkg of prior.packages??[])for(const operation of operations(pkg.forward,true))priorR08Keys.add(cellKey(operation.cell));}
invariant(priorR08Manifests.length===32&&priorR08Keys.size===44423&&[...priorR08Keys].every((key)=>!targetKeys.has(key)),'prior R08 set identity or target overlap');
let priorR08Drift=0;
for(const key of priorR08Keys){const [x,y,z]=key.split(',').map(Number),cell={x,y,z};const[source,post]=await statePair(cell);if(source!==post)priorR08Drift++;}
invariant(priorR08Drift===0,'previous accepted R08 state drift');

const qa={schemaVersion:1,generatedAtUtc:'2026-08-22T02:25:00Z',status:'PASS_R08AH_EMPTY_EIGHT_EG_B_PASSIVE_CORE_LINING_POST_RELEASE_ACCEPTED',
  release:{transactionId:manifest.transactionId,manifestIdentity:manifest.manifestIdentity,completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},
  bindings:{ledger:fileBinding(LEDGER_PATH),manifest:fileBinding(MANIFEST_PATH),sourceSave:ledger.sourceSnapshot.completeSaveSha256,postSave:ledger.postSnapshot.completeSaveSha256,stages:17,evidence:17},
  geometry:{targetSet:exactSet(targets),internalCore:exactSet(core),retainedFloor:exactSet(floor),retainedRoofCap:exactSet(roof),retainedAirInterior:exactSet(interior),halo:exactSet(halo)},
  postState:{exactTransitions:{expected:264,matching:264,mismatches:0},stoneBrickCount:264,retainedFloorCells:49,retainedRoofCapCells:49,retainedAirInteriorCells:275,retainedHaloCells:532,boundedDiff:{reviewCells:945,declared:264,observed:264,lifecycle:0,undeclared:0}},
  prior:{r02Reservation:{cells:264,air:229,polishedDeepslate:35,sourceMatches:264},previousR08:{manifestCount:32,uniqueCells:44423,drift:0}},
  execution:{stages:17,journalEvents:534,success:264,failed:0,noops:0,inverseGuards:264},
  commissioning:{passiveCoreLiningAccepted:true,egressCommissioned:false,accessibleRouteCommissioned:false,stairsOrLiftAuthorized:false,externalOpeningAuthorized:false},liveCallsPerformedByQa:false,worldEditsPerformedByQa:false};
qa.qaPayloadSha256=sha256(JSON.stringify(qa));
const seal={schemaVersion:1,generatedAtUtc:qa.generatedAtUtc,status:'PASS_R08AH_BOUNDED_EG_B_PASSIVE_CORE_LINING_ACCEPTED',release:qa.release,qa:{path:`${DIR}/r08ah-post-release-qa.json`,payload:qa.qaPayloadSha256},scope:{targets:264,floor:49,roofCap:49,airInterior:275,halo:532,priorR08Cells:44423},rollback:{guards:264,passed:true},noLiveCalls:true,noWorldEdits:true};
seal.commissioningSealSha256=sha256(JSON.stringify(seal));
fs.writeFileSync(absolute(`${DIR}/r08ah-post-release-qa.json`),`${JSON.stringify(qa,null,2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08ah-post-release-qa.md`),`# R08AH post-release QA\n\nStatus: **${qa.status}**\n\n264 targets, 49 floor cells, 49 roof-cap cells, 275 air-interior cells, 532 halo cells, 44,423 prior R08 cells, zero lifecycle/off-target drift, 17 stages, 534 journal events, and 264 inverse guards pass.\n\nPayload: \`${qa.qaPayloadSha256}\`. No live call or world edit was performed.\n`);
fs.writeFileSync(absolute(`${DIR}/r08ah-bounded-eg-b-passive-core-lining-seal.json`),`${JSON.stringify(seal,null,2)}\n`);
fs.writeFileSync(absolute(`${DIR}/r08ah-bounded-eg-b-passive-core-lining-seal.md`),`# R08AH EG-B lining seal\n\nStatus: **${seal.status}**\n\nSeal: \`${seal.commissioningSealSha256}\`.\n`);
process.stdout.write(`${JSON.stringify({status:qa.status,qaPayloadSha256:qa.qaPayloadSha256,commissioningSealSha256:seal.commissioningSealSha256},null,2)}\n`);
