import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..'); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-west-trace-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
describe('AG-4 west closure trace 06',()=>{
  it('requires a plan bound to the same source, records closure facts, and emits no operations',()=>{
    const plan=path.join(temp,'plan'),out=path.join(temp,'trace');
    execFileSync(process.execPath,['scripts/plan_ag4_gap_west_closure_measurement_06.mjs','--out',plan,'--generated-at','2026-08-27T08:00:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    execFileSync(process.execPath,['scripts/trace_ag4_gap_west_closure_measurement_06.mjs','--plan',path.join(plan,'ag4-gap-west-closure-measurement-06.json'),'--out',out,'--generated-at','2026-08-27T08:10:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:64*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-west-closure-trace-06.json'),'utf8'));
    expect(report).toMatchObject({id:'AG4-GAP-WEST-CLOSURE-TRACE-06',mutationAuthority:false,measurement:{seed:{x:344,y:62,z:-795},bounds:{minX:250,maxX:397,minY:13,maxY:80,minZ:-858,maxZ:-716},componentCap:250000,componentCellCount:expect.any(Number),finiteComponentProven:expect.any(Boolean)},preservedExclusions:{entity:{id:'minecraft:item',cell:{x:348,y:62,z:-789}}},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.measurement.componentCellCount).toBeGreaterThan(0);
    expect(report.containmentDesignDisposition.finiteDryContainmentDesignSupportable).toBe(false);
    expect(fs.readFileSync(path.join(out,'ag4-gap-west-closure-trace-06.svg'),'utf8')).not.toMatch(/NaN|Infinity/);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });
});
