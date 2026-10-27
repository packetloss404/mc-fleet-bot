import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..'); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-three-face-plan-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
describe('AG-4 combined three-face closure measurement 07',()=>{
  it('expands one 16-block union shell through exactly -X, -Z, and +Z without construction authority',()=>{
    const out=path.join(temp,'plan');
    execFileSync(process.execPath,['scripts/plan_ag4_gap_three_face_closure_measurement_07.mjs','--out',out,'--generated-at','2026-08-27T08:20:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-three-face-closure-measurement-07.json'),'utf8'));
    expect(report).toMatchObject({id:'AG4-GAP-THREE-FACE-CLOSURE-MEASUREMENT-07',status:'SOURCE_BOUND_READ_ONLY_THREE_FACE_CLOSURE_MEASUREMENT_REQUIRED',mutationAuthority:false,measurement:{seed:{x:344,y:62,z:-795},priorBounds:{minX:250,maxX:397,minY:13,maxY:80,minZ:-858,maxZ:-716},observedFrontier:['-X','-Z','+Z'],expandedOnlyThrough:['-X','-Z','+Z'],perFaceBlocks:16,traceBounds:{minX:234,maxX:397,minY:13,maxY:80,minZ:-874,maxZ:-700},componentCap:250000,newShells:[{face:'-X'},{face:'-Z'},{face:'+Z'}]},compilerGraduation:{notGranted:expect.arrayContaining(['no current operation','no rail/promenade continuation'])},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.measurement.chunkCount).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(out,'ag4-gap-three-face-closure-measurement-07.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });
});
