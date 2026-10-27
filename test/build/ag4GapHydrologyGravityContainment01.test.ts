import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-gap-containment-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));

describe('AG-4 gap hydrology / gravity containment 01',()=>{
  it('fails closed on the escaping water component, preserves the saved item, and emits no operations',()=>{
    const out=path.join(temp,'prepared');
    execFileSync(process.execPath,['scripts/design_ag4_gap_hydrology_gravity_containment_01.mjs','--out',out,'--generated-at','2026-08-28T10:40:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:16*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-hydrology-gravity-containment-01.json'),'utf8'));
    expect(report).toMatchObject({
      id:'AG4-GAP-HYDROLOGY-GRAVITY-CONTAINMENT-01',
      status:'AG4_GAP_WATER_COMPONENT_ESCAPES_MEASUREMENT_BOUNDARY_HELD_NO_OPERATIONS',
      mutationAuthority:false,
      findings:{waterComponent:{seed:{x:344,y:62,z:-795},measurementBounds:{minX:330,maxX:365,minY:45,maxY:80,minZ:-810,maxZ:-780},finiteComponentProven:false},unsafeBearingFailures:{cellCount:16},savedEntityExclusion:{entity:{id:'minecraft:item',cell:{x:348,y:62,z:-789}}}},
      compilerDecision:{operationsEmitted:false},
      safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false},
    });
    expect(report.findings.waterComponent.componentCellCount).toBe(7656);
    expect(report.findings.gravityBearingCells.cellCount).toBe(10);
    expect(report.findings.waterComponent.escapeFaces).toEqual(['+X','+Z','-X','-Y','-Z']);
    expect(report.exactMicroScopes).toHaveLength(4);
    expect(fs.existsSync(path.join(out,'ag4-gap-hydrology-gravity-containment-01.svg'))).toBe(true);
    expect(fs.readdirSync(out).some(name=>name==='buildops')).toBe(false);
  });
});
