#!/usr/bin/env node
/** Independent read-only post-release QA and seal for R08AD. */

import fs from 'fs';
import path from 'path';
import { AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256,
  stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const DIR = 'data/world-review/combined-zones-r08ad-live-20260822T012919Z';
const LEDGER_PATH = `${DIR}/evidence-ledger.json`;
const MANIFEST_PATH = 'data/buildops/combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment.release-manifest.json';
const POST = 'data/worldsnap-combined-zones-r08ad-post-20260822T012919Z';
const RESIDUAL_PATH = `${DIR}/r08ad-accepted-post-residual-north-smoke-census.json`;
const KEY = 'ee-smoke-n-supported-gravity-east-compartment-wall';
const N06_PATH = 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json';
const PRIOR = [
  ['r08w','combined-zones-r08w-empty-eight-north-smoke-west-segment',350],
  ['r08x','combined-zones-r08x-empty-eight-north-smoke-east-segment',245],
  ['r08y','combined-zones-r08y-empty-eight-north-smoke-central-west-segment',231],
  ['r08z','combined-zones-r08z-empty-eight-north-smoke-central-east-segment',147],
  ['r08aa','combined-zones-r08aa-empty-eight-north-smoke-center-segment',98],
  ['r08ab','combined-zones-r08ab-empty-eight-north-smoke-far-east-segment',14],
  ['r08ac','combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment',35],
];
const FACE = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const abs = (f) => path.resolve(ROOT, f);
const read = (f) => JSON.parse(fs.readFileSync(abs(f), 'utf8'));
const file = (f) => ({ path: f, sha256: sha256(fs.readFileSync(abs(f))), bytes: fs.statSync(abs(f)).size });
const must = (c, m) => { if (!c) throw new Error(`R08AD post-QA rejected: ${m}`); };
const set = (cells) => { const u = uniqueCells(cells); return { cellCount: u.length,
  bounds: boundsOf(u), coordinateSetSha256: hashCells(u) }; };
const halo = (cells) => { const keys = new Set(cells.map(cellKey)); return uniqueCells(cells.flatMap((c) =>
  FACE.map(([dx,dy,dz]) => ({x:c.x+dx,y:c.y+dy,z:c.z+dz}))).filter((c) => !keys.has(cellKey(c)))); };
function ops(f) { return fs.readFileSync(abs(f),'utf8').split(/\r?\n/).filter((l)=>l.startsWith('REPL ')).map((l)=>{
  const p=l.split(/\s+/); return {cell:{x:+p[1],y:+p[2],z:+p[3]},fromState:p[7],toState:p[8]}; }); }

const ledger=read(LEDGER_PATH), manifest=read(MANIFEST_PATH), residual=read(RESIDUAL_PATH), n06=read(N06_PATH);
must(file(LEDGER_PATH).sha256==='a1abbe43c91b176d15b5aed82767ece3c3d9d9e9451703cf68aa945bbcd52994','ledger hash');
must(file(MANIFEST_PATH).sha256==='a7d8accd62a4724c1c5612ee1c4f40426854494bb761825bf426dc682bd249df'
  && manifest.manifestIdentity==='98c5766a634bbf68b6dd005c0ca50299c017276738be839cf91a9ea6505e9c9e','manifest binding');
must(ledger.status==='EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.mode==='EXECUTE'
  && ledger.transactionId===manifest.transactionId && ledger.releaseNodeId===manifest.releaseNodeId
  && ledger.sourceBoundReleaseIdentitySha256==='4344b30fa4f1a751266f58adce0330a20613d3f003214e29f8d8b9c7b9e7a62d'
  && ledger.executionBindingSha256==='f27dafda7d50ca68796a3d2c760c3b112e8c5eebf838f68a43dd1b1fd646e4e6'
  && ledger.completedReleaseIdentitySha256==='8a52c003b3466815fcb1adfbec13082fab8d47b48d5a97fb385654cd1dae18d4','release identity');
const sourceId=read(ledger.sourceSnapshot.identity.path), postId=read(ledger.postSnapshot.identity.path);
must(ledger.sourceSnapshot.completeSaveSha256==='e6ff3203b6c2656026bc47ef8daf455320670b1f5d6a4bc62a00b864f0e59e6e'
  && sourceId.sha256==='d344507c09193770432687455466f79c8ac8460e474a509279fd0952c400a64e'
  && ledger.postSnapshot.completeSaveSha256==='5679af27562cd39e6ed78583b2168d4da5dc05a585074116cebe836cf39a71aa'
  && postId.sha256==='f238f9e2c51c1af27cbf12b018ffd11ad33f8cc75b4128d2ee5fc5be0d41a0f0','snapshot identity');
must(ledger.stages.length===17 && ledger.stages.every((s)=>s.status==='PASS')
  && ledger.evidenceBindings.length===17 && ledger.evidenceBindings.every((b)=>file(b.path).sha256===b.sha256),'stage/evidence bindings');
const forward=ops(manifest.packages[0].forward), rollback=ops(manifest.packages[0].rollback);
must(forward.length===14 && JSON.stringify(rollback)===JSON.stringify(forward.slice().reverse().map((o)=>({cell:o.cell,fromState:o.toState,toState:o.fromState}))),'exact inverse');
const execution=read(`${DIR}/${KEY}.forward-execution.json`), inverse=read(`${DIR}/${KEY}.rollback-poststate-preflight.json`);
const journal=fs.readFileSync(abs(`${DIR}/${KEY}.forward-execution.json.stream-journal.jsonl`),'utf8').trim().split(/\r?\n/).map(JSON.parse);
must(execution.status==='complete' && execution.strictNoop && execution.successfulCommands===14
  && execution.failedCommands===0 && execution.noopCommands===0 && inverse.status==='PASS'
  && inverse.passed===14 && inverse.failed===0 && journal.length===34 && journal.at(-1).status==='complete','execution/journal/inverse');

const targets=forward.map((o)=>o.cell), targetKeys=new Set(targets.map(cellKey)), selectedHalo=halo(targets);
must(targets.length===14 && hashCells(targets)==='9bd965d5c270617996bacf61eaec28794948433e40fc698e0b2b9831814fe7a7'
  && selectedHalo.length===46 && hashCells(selectedHalo)==='63b169122ed70db8e8366f729ccd83e56620d1a89e06aa083b4ffd9e89160af1','geometry');
const full=cellsIn({minX:1652,maxX:1847,minY:48,maxY:54,minZ:50,maxZ:50}), fullHalo=halo(full), bounded=uniqueCells([...full,...fullHalo]);
const sr=new AnvilReader(abs(path.join(ledger.sourceSnapshot.root,'region'))), pr=new AnvilReader(abs(path.join(POST,'region')));
const ss=new Map(), ps=new Map();
for(const c of bounded){const k=cellKey(c);ss.set(k,stateToCommandString(await sr.blockState(c.x,c.y,c.z)));ps.set(k,stateToCommandString(await pr.blockState(c.x,c.y,c.z)));}
const transitionMismatch=forward.filter((o)=>ss.get(cellKey(o.cell))!==o.fromState||ps.get(cellKey(o.cell))!==o.toState);
const changed=bounded.filter((c)=>ss.get(cellKey(c))!==ps.get(cellKey(c))), undeclared=changed.filter((c)=>!targetKeys.has(cellKey(c)));
const haloDrift=selectedHalo.filter((c)=>ss.get(cellKey(c))!==ps.get(cellKey(c)));
const closure=manifest.isolation.retainedGravitySupportClosure;
const closureMismatch=closure.closures.flatMap((x)=>x.dependency.filter((d)=>ss.get(cellKey(d.cell))!==d.state||ps.get(cellKey(d.cell))!==d.state));
const terminalMismatch=closure.closures.filter((x)=>ss.get(cellKey(x.terminalSupport.cell))!==x.terminalSupport.state||ps.get(cellKey(x.terminalSupport.cell))!==x.terminalSupport.state);
const wet=full.filter((c)=>/(?:water|bubble_column|lava)/.test(ss.get(cellKey(c)))), wetDrift=wet.filter((c)=>ss.get(cellKey(c))!==ps.get(cellKey(c)));
const n06Cells=n06.targetGravity.findings.map((x)=>x.cell),n06Drift=n06Cells.filter((c)=>ss.get(cellKey(c))!==ps.get(cellKey(c)));
let priorCount=0; const priorChecks=[];
for(const [id,tx,count] of PRIOR){const p=`data/buildops/${tx}.release-manifest.json`,m=read(p), po=m.packages.flatMap((x)=>ops(x.forward));
  const mismatch=po.filter((o)=>ss.get(cellKey(o.cell))!==o.toState||ps.get(cellKey(o.cell))!==o.toState);
  must(po.length===count&&mismatch.length===0&&po.every((o)=>!targetKeys.has(cellKey(o.cell))),`prior ${id}`);priorCount+=count;priorChecks.push({id,cellCount:count,mismatchCount:0});}
must(transitionMismatch.length===0&&changed.length===14&&undeclared.length===0&&haloDrift.length===0
  && closure.closureCount===8&&closure.durableTerminalSupportCount===8&&closureMismatch.length===0&&terminalMismatch.length===0
  && wet.length===6&&wetDrift.length===0&&n06Cells.length===4&&n06Drift.length===0&&priorCount===1120,
  `post-state preservation ${JSON.stringify({transitionMismatch:transitionMismatch.length,changed:changed.length,
    undeclared:undeclared.length,haloDrift:haloDrift.length,closureMismatch:closureMismatch.length,
    terminalMismatch:terminalMismatch.length,wet:wet.length,wetDrift:wetDrift.length,n06Drift:n06Drift.length,priorCount})}`);
must(residual.status==='PASS_R08AD_ACCEPTED_POST_NORTH_SMOKE_RESIDUAL_BLOCKER_CENSUS'
  && residual.summary.residualCellCount===218&&residual.summary.primaryPartition.wetInteractionCellCount===147
  && residual.summary.primaryPartition.gravityInteractionCellCount===56&&residual.summary.primaryPartition.sourceStateBandCellCount===15
  && residual.residualCells.every((r)=>ps.get(cellKey(r.cell))===r.projectedState),'residual census');

const qa={schemaVersion:1,generatedAtUtc:'2026-08-22T01:33:00Z',status:'PASS_R08AD_NORTH_SMOKE_SUPPORTED_GRAVITY_EAST_SEGMENT_POST_RELEASE_ACCEPTED',
  release:{transactionId:manifest.transactionId,manifestIdentity:manifest.manifestIdentity,completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},
  bindings:{ledger:file(LEDGER_PATH),manifest:file(MANIFEST_PATH),sourceSave:ledger.sourceSnapshot.completeSaveSha256,postSave:ledger.postSnapshot.completeSaveSha256,stages:17,evidenceBindings:17},
  geometry:{targetSet:set(targets),interactionHalo:set(selectedHalo),componentCount:1,widthCells:2,heightCells:7},
  postState:{exactTransitions:{expected:14,matching:14-transitionMismatch.length,mismatches:transitionMismatch.length},boundedDiff:{reviewCells:bounded.length,declaredChanges:14,observedChanges:changed.length,lifecycleChanges:0,undeclaredChanges:undeclared.length},
    preservation:{haloExact:46-haloDrift.length,gravityChainsExact:8-closureMismatch.length,durableTerminalsExact:8-terminalMismatch.length,wetCellsExact:6-wetDrift.length,n06CellsExact:4-n06Drift.length,priorCellsExact:priorCount,priorChecks}},
  residual:{binding:file(RESIDUAL_PATH),identity:residual.censusIdentitySha256,cellCount:218,wet:147,gravity:56,sourceState:15,n06Adjacent:21},
  execution:{stageCount:17,journalEventCount:journal.length,successfulCommands:14,failedCommands:0,noopCommands:0,rollbackGuardsPassed:14},
  commissioning:{boundedStaticSegmentAccepted:true,completeBoundaryCommissioned:false,poweredSmokeControlCommissioned:false,n06Touched:false},
  liveCallsPerformedByQa:false,worldEditsPerformedByQa:false};
qa.qaPayloadSha256=sha256(JSON.stringify(qa));
const seal={schemaVersion:1,generatedAtUtc:qa.generatedAtUtc,status:'PASS_R08AD_BOUNDED_NORTH_SMOKE_SUPPORTED_GRAVITY_EAST_SEGMENT_ACCEPTED',release:qa.release,qa:{canonicalPath:`${DIR}/r08ad-post-release-qa.json`,qaPayloadSha256:qa.qaPayloadSha256},scope:{transitions:14,halo:46,gravityChains:8,priorCells:1120,residualCells:218},rollback:{guards:14,passed:true},noLiveCalls:true,noWorldEdits:true};
seal.commissioningSealSha256=sha256(JSON.stringify(seal));
fs.writeFileSync(abs(`${DIR}/r08ad-post-release-qa.json`),`${JSON.stringify(qa,null,2)}\n`);
fs.writeFileSync(abs(`${DIR}/r08ad-post-release-qa.md`),`# R08AD post-release QA\n\nStatus: **${qa.status}**\n\n14/14 targets, 46/46 halo cells, eight supported gravity chains, 1,120 prior cells, six wet cells, four N06 cells, 17 stages, the 34-event journal, and 14/14 inverse guards pass. The accepted residual is 218 cells.\n\nQA payload: \`${qa.qaPayloadSha256}\`. No live call or world edit was performed.\n`);
fs.writeFileSync(abs(`${DIR}/r08ad-bounded-north-smoke-supported-gravity-east-segment-seal.json`),`${JSON.stringify(seal,null,2)}\n`);
fs.writeFileSync(abs(`${DIR}/r08ad-bounded-north-smoke-supported-gravity-east-segment-seal.md`),`# R08AD bounded construction seal\n\nStatus: **${seal.status}**\n\nSeal: \`${seal.commissioningSealSha256}\`.\n`);
process.stdout.write(`${JSON.stringify({status:qa.status,qaPayloadSha256:qa.qaPayloadSha256,commissioningSealSha256:seal.commissioningSealSha256},null,2)}\n`);
