#!/usr/bin/env node
/** Seal the accepted civil-only High-14 exterior-band release evidence. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(), tag='20260826T120000Z';
const evidence=`data/world-review/rail-r10-high16-high14-band-live-${tag}`;
const source=`data/worldsnap-rail-r10-high16-high14-band-source-${tag}`;
const post=`data/worldsnap-rail-r10-high16-high14-band-post-${tag}`;
const manifest=`data/buildops/rail-r10-high16-high14-band-live-${tag}.manifest.json`;
const abs=(f)=>path.resolve(ROOT,f), sha=(v)=>crypto.createHash('sha256').update(v).digest('hex');
const read=(f)=>JSON.parse(fs.readFileSync(abs(f),'utf8'));
const bind=(f)=>({path:f,sha256:sha(fs.readFileSync(abs(f))),bytes:fs.statSync(abs(f)).size});
const expect=(f,status)=>{const x=read(f);if(x.status!==status)throw new Error(`${f}: ${x.status} != ${status}`);return x;};
const sourceIntake=expect(`${evidence}/source-complete-save-intake.json`,'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake=expect(`${evidence}/post-complete-save-intake.json`,'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for(const f of ['independent-static-qa.json','shell-forward-source-preflight.json','core-forward-source-preflight.json','shell-projected-rollback-preflight.json','core-projected-rollback-preflight.json','block-entity-clearance.json','pre-execution-live-entity-clearance.json','shell-same-moment-live-entity-clearance.json','core-same-moment-live-entity-clearance.json','core-rollback-poststate-preflight.json','shell-rollback-poststate-preflight.json','independent-post-qa.json']) expect(`${evidence}/${f}`,'PASS');
for(const f of ['shell-forward-strict-dry-run.json','shell-rollback-strict-dry-run.json','core-forward-strict-dry-run.json','core-rollback-strict-dry-run.json']) expect(`${evidence}/${f}`,'dry_run');
for(const f of ['shell-forward-execution.json','core-forward-execution.json']){const x=expect(`${evidence}/${f}`,'complete');if(x.strictNoop!==true)throw new Error(`${f} was not strict`);}
const m=read(manifest), sourceIdentity=read(`${evidence}/source-snapshot-identity.json`), postIdentity=read(`${evidence}/post-snapshot-identity.json`);
const files=[manifest,...fs.readdirSync(abs(evidence)).filter((n)=>n!=='evidence-ledger.json').sort().map((n)=>`${evidence}/${n}`)];
const ledger={schemaVersion:1,id:'rail-s3-r10-high16-high14-exterior-band-guarded-release',status:'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',transactionId:'rail-r10-high16-high14-exterior-band',civilOnly:true,passengerServiceCommissioned:false,sourceSnapshot:{root:source,completeSaveSha256:sourceIntake.packageIdentity.completeSaveSha256,regionSha256:sourceIdentity.sha256},postSnapshot:{root:post,completeSaveSha256:postIntake.packageIdentity.completeSaveSha256,regionSha256:postIdentity.sha256},manifest:bind(manifest),geometry:{core:720,shell:552,halo:680,routeCore:720,continuousIngressAndCore:756},migration:{high14:30,high13:6,total:36},execution:{shell:bind(`${evidence}/shell-forward-execution.json`),core:bind(`${evidence}/core-forward-execution.json`),strictChanged:1212},acceptance:{inheritedRouteAirPreserved:84,routeCommissioned:false,passengerServiceCommissioned:false,nonClaims:['rail installation','station','public route','passenger service','High-15 connection']},evidenceBindings:files.map(bind)};
ledger.completedReleaseIdentitySha256=sha(JSON.stringify({source:ledger.sourceSnapshot,post:ledger.postSnapshot,manifest:ledger.manifest.sha256,evidence:ledger.evidenceBindings.map(({path,sha256})=>({path,sha256}))}));
fs.writeFileSync(abs(`${evidence}/evidence-ledger.json`),`${JSON.stringify(ledger,null,2)}\n`);
console.log(JSON.stringify({status:ledger.status,ledger:`${evidence}/evidence-ledger.json`,completedReleaseIdentitySha256:ledger.completedReleaseIdentitySha256},null,2));
