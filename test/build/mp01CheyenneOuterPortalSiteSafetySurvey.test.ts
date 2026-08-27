import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..'); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mp01-outer-portal-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
describe('MP01 Cheyenne outer portal site safety survey 01',()=>{
  it('binds the all-air site, evaluates only directional study prisms, and emits no release package',()=>{
    const out=path.join(temp,'survey');
    execFileSync(process.execPath,['scripts/survey_mp01_cheyenne_outer_portal_site_01.mjs','--out',out,'--generated-at','2026-08-27T07:30:00.000Z'],{cwd:ROOT,stdio:'pipe'});
    const report=JSON.parse(fs.readFileSync(path.join(out,'mp01-cheyenne-outer-portal-site-safety-survey-01.json'),'utf8'));
    expect(report).toMatchObject({id:'MP01-CHEYENNE-OUTER-PORTAL-SITE-SAFETY-SURVEY-01',status:'NO_EXECUTION_READY_CHEYENNE_OUTER_PORTAL__UNBOUND_GEOMETRY_AND_DISCONNECTED_ALL_AIR_SITE',mutationAuthority:false,authoredIntent:{anchor:{x:0,y:200,z:-420}},physics:{waterOrWaterloggedCellCount:0,gravityCellCount:0,blockEntityCount:0,savedEntityCount:0,allAir:true},disconnect:{portalStudyVolumeHasExistingWalkSupport:false,sourceBoundApproachStations:0,sourceBoundRecoveryStations:0},decision:{go:false,operationsEmitted:false,forwardInverseAvailable:false},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.study.candidates).toHaveLength(4);
    expect(report.study.candidates.every((candidate:any)=>candidate.targetCellCount===288&&candidate.compileEligible===false)).toBe(true);
    expect(fs.existsSync(path.join(out,'mp01-cheyenne-outer-portal-site-safety-survey-01.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });
});
