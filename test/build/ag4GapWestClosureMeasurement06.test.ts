import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..'); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-west-closure-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
describe('AG-4 west-frontier closure measurement 06',()=>{
  it('expands only the trace-05 west frontier and default-denies a compiler until actual closure',()=>{
    const out=path.join(temp,'plan');
    execFileSync(process.execPath,['scripts/plan_ag4_gap_west_closure_measurement_06.mjs','--out',out,'--generated-at','2026-08-27T08:00:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-west-closure-measurement-06.json'),'utf8'));
    expect(report).toMatchObject({id:'AG4-GAP-WEST-CLOSURE-MEASUREMENT-06',status:'SOURCE_BOUND_READ_ONLY_WEST_FRONTIER_CLOSURE_MEASUREMENT_REQUIRED',mutationAuthority:false,measurement:{seed:{x:344,y:62,z:-795},observedFrontier:['-X'],expandedOnlyThrough:['-X'],perFaceBlocks:16,traceBounds:{minX:250,maxX:397,minY:13,maxY:80,minZ:-858,maxZ:-716},componentCap:250000,savedItemExclusion:{entity:{id:'minecraft:item',cell:{x:348,y:62,z:-789}}}},compilerGraduation:{notGranted:expect.arrayContaining(['no current operation','no rail/promenade continuation'])},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.measurement.chunkCount).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(out,'ag4-gap-west-closure-measurement-06.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });
});
