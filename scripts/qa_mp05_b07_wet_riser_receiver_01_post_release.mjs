#!/usr/bin/env node
/** Independent immutable-post QA for the B07 wet riser / R09E receiver. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';
const ROOT = process.cwd(), a = process.argv.slice(2);
const opt = (n, d = null) => { const i = a.indexOf(n); return i < 0 ? d : (a[i + 1] ?? d); };
const LEDGER = opt('--ledger'), OUT = opt('--out'), MANIFEST = opt('--manifest', 'data/buildops/mp05-b07-wet-riser-receiver-01.release-manifest.json');
const RID = 'MP05-B07-WET-RISER-RECEIVER-01', NODE = 'CZ-MP05-B07-WET-RISER-RECEIVER', PD = 'minecraft:polished_deepslate', HATCH = 'minecraft:oak_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]', LADDER = 'minecraft:ladder[facing=south,waterlogged=false]';
const abs = (f) => path.resolve(ROOT, f), rel = (f) => path.relative(ROOT, abs(f)).split(path.sep).join('/'), sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (ok, m) => { if (!ok) throw new Error(`${RID} post-QA rejected: ${m}`); };
const range = (x, y) => Array.from({ length: y - x + 1 }, (_, i) => x + i), box = (x1, x2, y1, y2, z1, z2) => { const o=[]; for(const x of range(x1,x2)) for(const y of range(y1,y2)) for(const z of range(z1,z2)) o.push({x,y,z}); return o; };
const name = (s) => s.split('[',1)[0], air = (s) => ['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(name(s)), fluid = (s) => ['minecraft:water','minecraft:lava','minecraft:bubble_column'].includes(name(s)) || s.includes('waterlogged=true');
const stateSet = (records) => sha(JSON.stringify(records.map(({cell,state})=>({...cell,state})).sort((p,q)=>p.x-q.x||p.y-q.y||p.z-q.z||p.state.localeCompare(q.state))));
const turnOuter=box(2107,2111,7,10,-402,-398), turnCore=box(2108,2110,8,9,-401,-398), riserOuter=box(2107,2111,8,18,-403,-399), riserCore=box(2108,2110,9,17,-401,-401), receiver=box(2108,2110,18,18,-401,-401), ladders=range(10,17).map(y=>({x:2109,y,z:-401}));
const core=uniqueCells([...turnCore,...riserCore]), coreKeys=new Set(core.map(cellKey)), receiverKeys=new Set(receiver.map(cellKey)), special=new Set([...receiver,...ladders].map(cellKey));
const shell=uniqueCells([...turnOuter,...riserOuter]).filter(c=>!coreKeys.has(cellKey(c))&&!receiverKeys.has(cellKey(c)));
for(const [n,v] of [['--ledger',LEDGER],['--out',OUT]]) fail(v, `${n} is required`);
const ledgerBytes=fs.readFileSync(abs(LEDGER)), manifestBytes=fs.readFileSync(abs(MANIFEST)), ledger=JSON.parse(ledgerBytes), manifest=JSON.parse(manifestBytes);
fail(ledger.status==='EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE','guarded kernel is not complete'); fail(ledger.releaseNodeId===NODE&&ledger.transactionId===manifest.transactionId,'ledger identity drifted'); fail(manifest.scope?.releaseId===RID,'manifest release identity drifted');
const currentManifestSha256 = sha(manifestBytes);
const executionManifestSha256 = ledger.manifest?.sha256;
const postExecutionManifestDrift = executionManifestSha256 !== currentManifestSha256;
for (const packageRecord of ledger.packages ?? []) {
  fail(packageRecord.forward && packageRecord.rollback, `ledger package paths missing: ${packageRecord.key}`);
  fail(sha(fs.readFileSync(abs(packageRecord.forward.path))) === packageRecord.forward.sha256
    && sha(fs.readFileSync(abs(packageRecord.rollback.path))) === packageRecord.rollback.sha256,
  `executed operation artifact drifted: ${packageRecord.key}`);
}
for(const stage of ['block-entity-clearance','live-entity-clearance','rollback-poststate-preflight:sealed-outer-liner-and-dual-bulkheads','rollback-poststate-preflight:dry-core-turn-and-riser-excavation','rollback-poststate-preflight:upper-receiver-hatches-and-ladder']) fail(ledger.stages?.some(e=>e.stage===stage&&e.status==='PASS'),`missing passed stage ${stage}`);
const post=ledger.postSnapshot?.worldRoot ?? (ledger.postSnapshot?.regions ? path.dirname(abs(ledger.postSnapshot.regions)) : null); fail(post&&fs.existsSync(abs(post)),'fresh immutable post snapshot missing'); const r=new AnvilReader(path.join(abs(post),'region')); const records=async(cells)=>{const o=[];for(const cell of cells)o.push({cell,state:stateToCommandString(await r.blockState(cell.x,cell.y,cell.z))});return o;};
const [shellPost,corePost,receiverPost,ladderPost,wetPost]=await Promise.all([records(shell),records(core),records(receiver),records(ladders),records(box(2094,2114,5,17,-438,-388))]);
const route=[]; for(const c of [{x:2109,y:8,z:-399},{x:2109,y:9,z:-401},...range(10,17).map(y=>({x:2109,y,z:-401}))]) { const s=stateToCommandString(await r.blockState(c.x,c.y,c.z)); if(!air(s)&&s!==LADDER) route.push({cell:c,state:s}); }
const retained=wetPost.filter(v=>fluid(v.state)); const checks={linerExact:shellPost.every(v=>v.state===PD),coreDryExceptLadder:corePost.filter(v=>!special.has(cellKey(v.cell))).every(v=>air(v.state)),receiverClosedAndDry:receiverPost.every(v=>v.state===HATCH),eightExactLadderRungs:ladderPost.every(v=>v.state===LADDER),maintenanceRiserPassable:route.length===0,retainedFluidBoundaryExact:retained.length===manifest.scope.retainedFluidBoundary.cellCount&&stateSet(retained)===manifest.scope.retainedFluidBoundary.stateSetSha256,r09jCapRetained:(await records([{x:2105,y:30,z:-397},{x:2105,y:31,z:-397}])).every(v=>v.state==='minecraft:polished_diorite')};
const failures=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k); const report={schemaVersion:1,id:'mp05-b07-wet-riser-receiver-01-independent-post-qa',status:failures.length?'FAIL':'PASS_EXECUTED_B07_WET_RISER_RECEIVER',readOnly:true,worldMutated:false,release:{releaseId:RID,releaseNodeId:NODE,ledger:{path:rel(LEDGER),sha256:sha(ledgerBytes)},manifest:{path:rel(MANIFEST),executionSha256:executionManifestSha256,currentSha256:currentManifestSha256,postExecutionMetadataDrift:postExecutionManifestDrift}},postSnapshot:ledger.postSnapshot,checks,failures,routeFailures:route,retainedFluidBoundary:{count:retained.length,stateSetSha256:stateSet(retained)},functionalBoundary:{classification:'RESTRICTED_DUAL_BULKHEAD_B07_MAINTENANCE_RISER_ONLY',publicAccessCommissioned:false,emergencyEgressCommissioned:false,surfaceConnectionCommissioned:false}}; report.qaPayloadSha256=sha(JSON.stringify(report)); fs.mkdirSync(path.dirname(abs(OUT)),{recursive:true});fs.writeFileSync(abs(OUT),`${JSON.stringify(report,null,2)}\n`);if(failures.length)throw new Error(`${RID} post-QA failed: ${failures.join(',')}`);console.log(JSON.stringify({status:report.status,out:rel(OUT),qaPayloadSha256:report.qaPayloadSha256},null,2));
