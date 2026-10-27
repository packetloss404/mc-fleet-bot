import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-adaptive-water-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));

describe('AG-4 adaptive water component trace 03',()=>{
  it('expands only the observed faces, retains the item exclusion, and defaults to no operations',()=>{
    const out=path.join(temp,'trace');
    execFileSync(process.execPath,['scripts/survey_ag4_gap_adaptive_water_component_trace_03.mjs','--out',out,'--generated-at','2026-08-28T11:10:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-adaptive-water-component-trace-03.json'),'utf8'));
    expect(report).toMatchObject({id:'AG4-GAP-ADAPTIVE-WATER-COMPONENT-TRACE-03',mutationAuthority:false,measurement:{seed:{x:344,y:62,z:-795},expandedOnlyThrough:['+X','+Z','-X','-Y','-Z'],perFaceBlocks:16,bounds:{minX:298,maxX:397,minY:13,maxY:80,minZ:-842,maxZ:-748},cap:125000},preservedExclusions:{savedItem:{id:'minecraft:item',cell:{x:348,y:62,z:-789}}},ag4Continuation:{railWalkContinuation:'held',externalFlowClaim:false},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.measurement.finiteComponentProven).toBe(false);
    expect(report.measurement.componentCellCount).toBe(65157);
    expect(report.measurement.nextEscapeFaces).toEqual(['+Z','-X']);
    expect(report.finiteContainmentDecision.eligibleForSeparateDesign).toBe(false);
    expect(fs.existsSync(path.join(out,'ag4-gap-adaptive-water-component-trace-03.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });

  it('fails closed at the configured component cap without emitting invalid map coordinates',()=>{
    const out=path.join(temp,'capped');
    execFileSync(process.execPath,['scripts/survey_ag4_gap_adaptive_water_component_trace_03.mjs','--out',out,'--cap','1','--generated-at','2026-08-28T11:11:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-adaptive-water-component-trace-03.json'),'utf8'));
    const svg=fs.readFileSync(path.join(out,'ag4-gap-adaptive-water-component-trace-03.svg'),'utf8');
    expect(report.measurement).toMatchObject({componentCellCount:1,cap:1,capReached:true,finiteComponentProven:false,termination:'COMPONENT_CAP_REACHED_BEFORE_CLOSURE'});
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});
