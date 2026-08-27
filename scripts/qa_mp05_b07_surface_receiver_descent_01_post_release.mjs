#!/usr/bin/env node
/** Independent immutable-post state QA for the B07 controlled surface receiver descent. */
import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';import {AnvilReader,stateToCommandString}from './lib/combined_zones_release_lib.mjs';

// The guarded operation syntax is `REPL x y z x y z source target`; parse it
// directly rather than treating it as the older `source => target` notation.
const qaArgs = process.argv.slice(2);
const qaArg = (name, fallback = null) => {
  const index = qaArgs.indexOf(name);
  return index < 0 ? fallback : (qaArgs[index + 1] ?? fallback);
};
const qaLedgerPath = qaArg('--ledger');
const qaOutPath = qaArg('--out');
const qaManifestPath = qaArg('--manifest', 'data/buildops/mp05-b07-surface-receiver-descent-01.release-manifest.json');
if (!qaLedgerPath || !qaOutPath) throw new Error('--ledger and --out are required');
const qaAbs = (value) => path.resolve(process.cwd(), value);
const qaHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const qaLedgerBytes = fs.readFileSync(qaAbs(qaLedgerPath));
const qaManifestBytes = fs.readFileSync(qaAbs(qaManifestPath));
const qaLedger = JSON.parse(qaLedgerBytes);
const qaManifest = JSON.parse(qaManifestBytes);
if (qaLedger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  || qaLedger.releaseNodeId !== 'CZ-MP05-B07-SURFACE-RECEIVER-DESCENT'
  || qaLedger.manifest?.sha256 !== qaHash(qaManifestBytes)) throw new Error('ledger binding');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:south-descent-liner-and-landing', 'rollback-poststate-preflight:south-descent-dry-core', 'rollback-poststate-preflight:controlled-headhouse-and-receiver-doors']) {
  if (!qaLedger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS')) throw new Error(stage);
}
const qaPostRoot = qaLedger.postSnapshot?.worldRoot ?? (qaLedger.postSnapshot?.regions ? path.dirname(qaAbs(qaLedger.postSnapshot.regions)) : null);
if (!qaPostRoot || !fs.existsSync(qaAbs(qaPostRoot))) throw new Error('post snapshot');
const qaExpected = [];
for (const pkg of qaManifest.packages) for (const line of fs.readFileSync(qaAbs(pkg.forward), 'utf8').split(/\r?\n/)) {
  if (!line.startsWith('REPL ')) continue;
  const parts = line.trim().split(/\s+/);
  const [x, y, z] = parts.slice(1, 4).map(Number);
  if (!parts[8]) throw new Error(`malformed operation line: ${line}`);
  qaExpected.push({ x, y, z, target: parts[8] });
}
const qaReader = new AnvilReader(path.join(qaAbs(qaPostRoot), 'region'));
const qaTargetFailures = [];
for (const target of qaExpected) {
  const got = stateToCommandString(await qaReader.blockState(target.x, target.y, target.z));
  if (got !== target.target) qaTargetFailures.push({ ...target, got });
}
const qaCap = await Promise.all([30, 31].map(async (y) => stateToCommandString(await qaReader.blockState(2105, y, -397))));
const qaChecks = {
  allForwardTargetsExact: qaTargetFailures.length === 0,
  r09jCapRetained: qaCap.every((state) => state === 'minecraft:polished_diorite'),
};
const qaFailures = Object.entries(qaChecks).filter(([, pass]) => !pass).map(([name]) => name);
const qaReport = {
  schemaVersion: 1,
  id: 'mp05-b07-surface-receiver-descent-01-independent-post-qa',
  status: qaFailures.length ? 'FAIL' : 'PASS_EXECUTED_B07_SURFACE_RECEIVER_DESCENT',
  readOnly: true,
  worldMutated: false,
  release: { ledger: { path: qaLedgerPath, sha256: qaHash(qaLedgerBytes) }, manifest: { path: qaManifestPath, sha256: qaHash(qaManifestBytes) } },
  checks: qaChecks,
  failures: qaFailures,
  targetFailures: qaTargetFailures.slice(0, 12),
};
qaReport.qaPayloadSha256 = qaHash(JSON.stringify(qaReport));
fs.mkdirSync(path.dirname(qaAbs(qaOutPath)), { recursive: true });
fs.writeFileSync(qaAbs(qaOutPath), `${JSON.stringify(qaReport, null, 2)}\n`);
if (qaFailures.length) throw new Error(qaFailures.join(','));
console.log(JSON.stringify({ status: qaReport.status, out: qaOutPath }, null, 2));
process.exit(0);
const R=process.cwd(),a=process.argv.slice(2),v=(n,d=null)=>{const i=a.indexOf(n);return i<0?d:(a[i+1]??d)},L=v('--ledger'),O=v('--out'),M=v('--manifest','data/buildops/mp05-b07-surface-receiver-descent-01.release-manifest.json'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),abs=x=>path.resolve(R,x),rel=x=>path.relative(R,abs(x)).split(path.sep).join('/'),bad=(x,m)=>{if(!x)throw new Error(`MP05-B07-SURFACE-RECEIVER-DESCENT-01 QA rejected: ${m}`)};bad(L&&O,'--ledger and --out are required');const lb=fs.readFileSync(abs(L)),mb=fs.readFileSync(abs(M)),l=JSON.parse(lb),m=JSON.parse(mb);bad(l.status==='EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'&&l.releaseNodeId==='CZ-MP05-B07-SURFACE-RECEIVER-DESCENT'&&l.manifest?.sha256===sha(mb),'ledger binding');for(const s of ['block-entity-clearance','live-entity-clearance','rollback-poststate-preflight:south-descent-liner-and-landing','rollback-poststate-preflight:south-descent-dry-core','rollback-poststate-preflight:controlled-headhouse-and-receiver-doors'])bad(l.stages?.some(x=>x.stage===s&&x.status==='PASS'),s);const post=l.postSnapshot?.worldRoot??(l.postSnapshot?.regions?path.dirname(abs(l.postSnapshot.regions)):null);bad(post&&fs.existsSync(abs(post)),'post snapshot');const wanted=[];for(const p of m.packages){for(const line of fs.readFileSync(abs(p.forward),'utf8').split(/\r?\n/)){if(!line.startsWith('REPL '))continue;const [left,target]=line.split(' => '),q=left.split(/\s+/).slice(1,7).map(Number);wanted.push({x:q[0],y:q[1],z:q[2],target});}}const r=new AnvilReader(path.join(abs(post),'region')),fail=[];for(const q of wanted){const got=stateToCommandString(await r.blockState(q.x,q.y,q.z));if(got!==q.target)fail.push({...q,got});}const checks={allForwardTargetsExact:fail.length===0,r09jCapRetained:(await Promise.all([30,31].map(async y=>stateToCommandString(await r.blockState(2105,y,-397))))).every(s=>s==='minecraft:polished_diorite')},fails=Object.entries(checks).filter(([,x])=>!x).map(([x])=>x),report={schemaVersion:1,id:'mp05-b07-surface-receiver-descent-01-independent-post-qa',status:fails.length?'FAIL':'PASS_EXECUTED_B07_SURFACE_RECEIVER_DESCENT',readOnly:true,worldMutated:false,release:{ledger:{path:rel(L),sha256:sha(lb)},manifest:{path:rel(M),sha256:sha(mb)}},checks,failures:fails,targetFailures:fail.slice(0,12)};report.qaPayloadSha256=sha(JSON.stringify(report));fs.mkdirSync(path.dirname(abs(O)),{recursive:true});fs.writeFileSync(abs(O),`${JSON.stringify(report,null,2)}\n`);if(fails.length)throw new Error(fails.join(','));console.log(JSON.stringify({status:report.status,out:rel(O)},null,2));
