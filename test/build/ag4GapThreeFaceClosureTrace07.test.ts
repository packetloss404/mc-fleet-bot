import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..'); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-three-face-trace-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
describe('AG-4 combined three-face closure trace 07',()=>{
  it('binds the exact plan/source, reports cap completeness explicitly, and emits no operations',()=>{
    const plan=path.join(temp,'plan'),out=path.join(temp,'trace');
    execFileSync(process.execPath,['scripts/plan_ag4_gap_three_face_closure_measurement_07.mjs','--out',plan,'--generated-at','2026-08-27T08:20:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    execFileSync(process.execPath,['scripts/trace_ag4_gap_three_face_closure_measurement_07.mjs','--plan',path.join(plan,'ag4-gap-three-face-closure-measurement-07.json'),'--out',out,'--generated-at','2026-08-27T08:30:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:64*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-three-face-closure-trace-07.json'),'utf8'));
    expect(report).toMatchObject({id:'AG4-GAP-THREE-FACE-CLOSURE-TRACE-07',mutationAuthority:false,measurement:{seed:{x:344,y:62,z:-795},bounds:{minX:234,maxX:397,minY:13,maxY:80,minZ:-874,maxZ:-700},expandedOnlyThrough:['-X','-Z','+Z'],componentCap:250000,componentCellCount:expect.any(Number),boundaryContacts:expect.any(Array),boundaryContactsComplete:expect.any(Boolean),capReached:expect.any(Boolean),finiteComponentProven:expect.any(Boolean)},designDisposition:{constructionAuthority:false},notAuthorized:expect.arrayContaining(['liner','rail','promenade','route','world mutation']),safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.measurement.componentCellCount).toBeGreaterThan(0);
    expect(report.measurement.boundaryContactsComplete).toBe(!report.measurement.capReached);
    expect(fs.readFileSync(path.join(out,'ag4-gap-three-face-closure-trace-07.svg'),'utf8')).not.toMatch(/NaN|Infinity/);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });
});
