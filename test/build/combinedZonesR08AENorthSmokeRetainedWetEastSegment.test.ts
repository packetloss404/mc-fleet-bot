import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..');
const SCRIPT=path.join(ROOT,'scripts/compile_combined_zones_r08ae_north_smoke_retained_wet_east_segment.mjs');
const WRAPPER=path.join(ROOT,'scripts/run_combined_zones_scoped_release.mjs');
const BASE='combined-zones-r08ae-empty-eight-north-smoke-retained-wet-east-segment';
const KEY='ee-smoke-n-retained-wet-east-compartment-wall';
const MANIFEST=path.join(ROOT,`data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE=path.join(ROOT,'data/world-review/combined-zones-r08ae-north-smoke-retained-wet-east-segment-offline');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r08ae-retained-wet-'));
const read=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8'));
const artifacts=(d:string)=>[`${BASE}.${KEY}.forward.txt`,`${BASE}.${KEY}.rollback.txt`,`${BASE}.release-manifest.json`].map((f)=>path.join(d,f));
let first:Buffer[]=[];
beforeAll(()=>{execFileSync(process.execPath,[SCRIPT,'--out-dir',temp,'--basename',BASE],{cwd:ROOT,stdio:'pipe'});first=artifacts(temp).map((f)=>fs.readFileSync(f));execFileSync(process.execPath,[SCRIPT,'--out-dir',temp,'--basename',BASE],{cwd:ROOT,stdio:'pipe'});},30_000);
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));

describe('R08AE retained-wet east segment',()=>{
  it('regenerates all three canonical artifacts byte-for-byte',()=>{
    expect(artifacts(temp).map((f)=>fs.readFileSync(f))).toEqual(first);
    expect(first).toEqual(artifacts(path.join(ROOT,'data/buildops')).map((f)=>fs.readFileSync(f)));
  });
  it('selects the largest topology-preserving 6x7 sub-run',()=>expect(read(MANIFEST)).toMatchObject({
    status:'COMPILED_FROM_ACCEPTED_R08AD_POST_AWAITING_FRESH_EXECUTION_KERNEL',releaseNodeId:'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',mvpScope:true,
    scope:{geometry:{selectedRetainedWetEastSegment:{cellCount:42,widthCells:6,heightCells:7,componentCount:1},interactionHalo:{cellCount:110},airTargets:{cellCount:21},sourceSolidTargets:{cellCount:21},waterContactSolidTargets:{cellCount:15}}},
    scopeSelection:{selectedRun:{minX:1759,maxX:1764,widthCells:6},rejectedFullWetRun:{cellCount:77,targetFluidCount:6,unresolvedTarget:{directAcceptedUpstreamCount:0}},rejectedAlternativeWetRun:{cellCount:63,nonDurableInverseAirBelowWaterCount:8}},
  }));
  it('proves retained wet topology and isolation',()=>expect(read(MANIFEST)).toMatchObject({isolation:{
    targetFluidIntersectionCount:0,targetGravityIntersectionCount:0,interactionHaloFluidCount:27,
    retainedFluidTopology:{sourceWaterCount:26,flowingWaterCount:1,airTargetFluidContactCount:0,solidTargetFluidContactCount:15,solidToSolidContactTransitionCount:15,fluidAccessibleTopologyChanged:false},
    blockEntityInteractionEnvelopeIntersectionCount:0,savedEntityInteractionEnvelopeIntersectionCount:0,protectedRelicInteractionEnvelopeIntersectionCount:0,deferredFutureLineSealInteractionEnvelopeIntersectionCount:0,
    isolatedN06Exception:{interactionEnvelopeIntersectionCount:0},checkedPriorManifestCount:54,undeclaredPriorReleaseIntersectionCount:0,
  }}));
  it('emits 42 exact guards and their exact reverse inverse',()=>{const m=read(MANIFEST),f=fs.readFileSync(path.join(ROOT,m.packages[0].forward),'utf8').split(/\r?\n/).filter((l:string)=>l.startsWith('REPL ')),r=fs.readFileSync(path.join(ROOT,m.packages[0].rollback),'utf8').split(/\r?\n/).filter((l:string)=>l.startsWith('REPL '));expect(f).toHaveLength(42);expect(r).toEqual(f.slice().reverse().map((l:string)=>{const p=l.split(/\s+/);return [...p.slice(0,7),p[8],p[7]].join(' ');}));});
  it('passes manifest/preflight/parser/entity and real wrapper gates',()=>{expect(read(path.join(EVIDENCE,'manifest-qa.json'))).toMatchObject({status:'PASS',totals:{packages:1,uniqueTargetCells:42}});for(const f of ['forward-source-preflight.json','projected-rollback-preflight.json'])expect(read(path.join(EVIDENCE,f))).toMatchObject({status:'PASS',operationCount:42,passed:42,failed:0});for(const f of ['forward-strict-dry-run.json','rollback-strict-dry-run.json'])expect(read(path.join(EVIDENCE,f))).toMatchObject({status:'dry_run',strictNoop:true,worldEditLeftoverCount:0});expect(read(path.join(EVIDENCE,'block-entity-clearance.json'))).toMatchObject({status:'PASS',operationCount:42,blockingBlockEntityCount:0});expect(read(path.join(EVIDENCE,'r08ae-offline-readiness.json'))).toMatchObject({status:'PASS_R08AE_NORTH_SMOKE_RETAINED_WET_EAST_SEGMENT_OFFLINE_READY',scope:{targetCells:42,haloCells:110},retainedFluidTopology:{haloWaterCells:27,airTargetFluidContacts:0,fluidAccessibleTopologyChanged:false},projectedResidual:{cellCount:176}});const p=JSON.parse(execFileSync(process.execPath,[WRAPPER,'--manifest',path.relative(ROOT,MANIFEST),'--release-node','CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT','--print-plan'],{cwd:ROOT,encoding:'utf8'}));expect(p).toMatchObject({mode:'PREPARE_ONLY',globalGateDependency:'NONE',packageOrder:[KEY]});});
  it('binds the deterministic manifest payload',()=>{const m=read(MANIFEST),{manifestIdentity,...p}=m;expect(crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex')).toBe(manifestIdentity);expect(manifestIdentity).toBe('bfce293fb704aec80669e81e70d673751452dec6b3622281c60351383abec05c');});
});
