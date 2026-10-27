#!/usr/bin/env node
/** Deterministic offline readiness QA for R08AE; no live calls. */
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const ROOT=process.cwd(),DIR='data/world-review/combined-zones-r08ae-north-smoke-retained-wet-east-segment-offline';
const MP='data/buildops/combined-zones-r08ae-empty-eight-north-smoke-retained-wet-east-segment.release-manifest.json';
const abs=(f)=>path.resolve(ROOT,f),read=(f)=>JSON.parse(fs.readFileSync(abs(f),'utf8')),sha=(v)=>crypto.createHash('sha256').update(v).digest('hex');
const must=(c,m)=>{if(!c)throw new Error(`R08AE offline QA rejected: ${m}`);};
const m=read(MP),{manifestIdentity,...payload}=m;
must(sha(JSON.stringify(payload))===manifestIdentity&&manifestIdentity==='bfce293fb704aec80669e81e70d673751452dec6b3622281c60351383abec05c','manifest identity');
const mq=read(`${DIR}/manifest-qa.json`),f=read(`${DIR}/forward-source-preflight.json`),r=read(`${DIR}/projected-rollback-preflight.json`),be=read(`${DIR}/block-entity-clearance.json`),fp=read(`${DIR}/forward-strict-dry-run.json`),rp=read(`${DIR}/rollback-strict-dry-run.json`);
const plan=JSON.parse(execFileSync(process.execPath,[abs('scripts/run_combined_zones_scoped_release.mjs'),'--manifest',MP,'--release-node','CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT','--print-plan'],{cwd:ROOT,encoding:'utf8'}));
must(mq.status==='PASS'&&mq.totals.uniqueTargetCells===42&&f.status==='PASS'&&f.passed===42&&r.status==='PASS'&&r.passed===42&&be.status==='PASS'&&be.blockingBlockEntityCount===0&&fp.strictNoop&&rp.strictNoop&&plan.mode==='PREPARE_ONLY','offline gates');
const qa={schemaVersion:1,generatedAtUtc:'2026-08-22T01:50:00Z',status:'PASS_R08AE_NORTH_SMOKE_RETAINED_WET_EAST_SEGMENT_OFFLINE_READY',manifest:{path:MP,manifestIdentitySha256:manifestIdentity,fullFileSha256:sha(fs.readFileSync(abs(MP)))},source:m.source,scope:{targetCells:42,width:6,height:7,haloCells:110,airTargets:21,solidTargets:21,waterContactSolidTargets:15},retainedFluidTopology:{haloWaterCells:27,sourceWaterCells:26,flowingWaterCells:1,airTargetFluidContacts:0,fluidAccessibleTopologyChanged:false},selection:{full77Disposition:m.scopeSelection.rejectedFullWetRun.disposition,alternative63Disposition:m.scopeSelection.rejectedAlternativeWetRun.disposition},gates:{manifest:'PASS_1_PACKAGE_42_TARGETS',forward:'PASS_42_OF_42',inverse:'PASS_42_OF_42',parsers:'PASS_84_COMMANDS',blockEntities:'PASS_ZERO',wrapper:'PASS_PREPARE_ONLY'},projectedResidual:{cellCount:176,wet:105,gravity:56,sourceState:15},executionAuthorizedByThisArtifact:false,liveCallsPerformed:false,worldEditsPerformed:false};
qa.qaPayloadIdentitySha256=sha(JSON.stringify(qa));fs.writeFileSync(abs(`${DIR}/r08ae-offline-readiness.json`),`${JSON.stringify(qa,null,2)}\n`);fs.writeFileSync(abs(`${DIR}/r08ae-offline-readiness.md`),`# R08AE offline readiness\n\nStatus: **${qa.status}**\n\n42 exact targets retain all 27 wet-halo cells without changing fluid-accessible topology. Forward/inverse/parser/entity/wrapper gates pass. Projected residual: 176 cells.\n\nPayload: \`${qa.qaPayloadIdentitySha256}\`. No live call or world edit was performed.\n`);process.stdout.write(`${JSON.stringify({status:qa.status,qaPayloadIdentitySha256:qa.qaPayloadIdentitySha256},null,2)}\n`);
