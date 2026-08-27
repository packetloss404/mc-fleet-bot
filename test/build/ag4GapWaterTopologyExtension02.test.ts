import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT=path.resolve(__dirname,'../..'); const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ag4-water-extension-'));
afterAll(()=>fs.rmSync(temp,{recursive:true,force:true}));
describe('AG-4 gap water topology extension 02',()=>{
  it('expands only the five observed faces, retains the saved-item exclusion, and emits no operations',()=>{
    const out=path.join(temp,'survey');
    execFileSync(process.execPath,['scripts/survey_ag4_gap_water_topology_extension_02.mjs','--out',out,'--generated-at','2026-08-28T10:50:00.000Z'],{cwd:ROOT,stdio:'pipe',maxBuffer:32*1024*1024});
    const report=JSON.parse(fs.readFileSync(path.join(out,'ag4-gap-water-topology-extension-02.json'),'utf8'));
    expect(report).toMatchObject({id:'AG4-GAP-WATER-TOPOLOGY-EXTENSION-02',mutationAuthority:false,measurement:{seed:{x:344,y:62,z:-795},priorMeasurement:{throughFaces:['+X','+Z','-X','-Y','-Z'],perFaceBlocks:16},nextMeasurementBounds:{minX:314,maxX:381,minY:29,maxY:80,minZ:-826,maxZ:-764}},preservedExclusions:{savedItem:{id:'minecraft:item',cell:{x:348,y:62,z:-789}}},safetyBoundary:{readOnly:true,liveCallsPerformed:false,rconCallsPerformed:false,worldMutationsPerformed:false,forwardOperationFilesEmitted:0,rollbackOperationFilesEmitted:0,releaseManifestEmitted:false}});
    expect(report.measurement.componentCellCount).toBe(41360);
    expect(report.measurement.finiteComponentProven).toBe(false);
    expect(report.measurement.nextEscapeFaces).toEqual(['+X','+Z','-X','-Y','-Z']);
    expect(fs.existsSync(path.join(out,'ag4-gap-water-topology-extension-02.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out,'buildops'))).toBe(false);
  });
});
