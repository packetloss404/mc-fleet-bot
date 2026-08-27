import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-water-plug-'));
const BASENAME = 'mp05-b07-flowing-water-intrusion-plug-01';
const NODE = 'CZ-MP05-B07-FLOWING-WATER-INTRUSION-PLUG';
const AUTH = 'docs/masterplans/05-combined-zones/mp05-b07-flowing-water-intrusion-plug-governor-standing-execution-authorization.json';
let manifest: any;
let forward: string[];
let rollback: string[];

describe('MP05 B07 flowing-water intrusion plug', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/compile_mp05_b07_flowing_water_intrusion_plug_01.mjs','--out-dir',OUT,'--generated-at','2026-08-26T20:00:00.000Z'], {cwd:ROOT,stdio:'pipe',timeout:180_000});
    manifest = JSON.parse(fs.readFileSync(path.join(OUT,`${BASENAME}.release-manifest.json`),'utf8'));
    forward = fs.readFileSync(path.join(OUT,`${BASENAME}.liner.forward.txt`),'utf8').split(/\r?\n/).filter((line)=>line.startsWith('REPL '));
    rollback = fs.readFileSync(path.join(OUT,`${BASENAME}.liner.rollback.txt`),'utf8').split(/\r?\n/).filter((line)=>line.startsWith('REPL '));
  });
  afterAll(() => fs.rmSync(OUT,{recursive:true,force:true}));
  it('binds all five canonical flowing water states and changes nothing outside the finite plug', () => {
    expect(manifest.releaseNodeId).toBe(NODE);
    expect(manifest.scope.releaseId).toBe('MP05-B07-FLOWING-WATER-INTRUSION-PLUG-01');
    expect(manifest.scope.linerCells).toMatchObject({cellCount:5,bounds:{minX:2110,maxX:2111,minY:5,maxY:6,minZ:-396,maxZ:-395}});
    expect(manifest.target.sourceStateCensus).toEqual({'minecraft:water[level=1]':3,'minecraft:water[level=2]':1,'minecraft:water[level=8]':1});
    expect(manifest.target.desiredStateCensus).toEqual({'minecraft:deepslate_tiles':5});
    expect(manifest.scope.retainedExteriorFluid.cellCount).toBeGreaterThan(0);
    expect(manifest.isolation).toMatchObject({retainedUnboundedExteriorFluidUntouched:true,sourceBlockEntityCount:0,sourceSavedEntityCount:0});
  });
  it('has exact inverse operations and does not claim route or egress commissioning', () => {
    expect(forward).toHaveLength(5); expect(rollback).toHaveLength(5);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      expect(forward.some((candidate) => { const c=candidate.split(/\s+/); return c.slice(1,7).join(',')===f.slice(1,7).join(',') && c[7]===f[8] && c[8]===f[7]; })).toBe(true);
    }
    expect(manifest.operations['flowing-water-intrusion-liner']).toMatchObject({forwardCommandCount:5,rollbackCommandCount:5,exactInverse:true});
    expect(manifest.scope).toMatchObject({containedRouteCommissioned:false,exteriorOpeningCommissioned:false,publicOrStaffAccessCommissioned:false});
    expect(manifest.safetyBoundary).toMatchObject({liveCallsPerformed:false,worldEditsPerformed:false,executionAuthorizedByThisManifest:false});
  });
  it('has a valid Governor scoped authorization and separate post-release QA', () => {
    const authorization = JSON.parse(fs.readFileSync(path.join(ROOT,AUTH),'utf8'));
    expect(authorization.authorizedReleaseNodes).toEqual([NODE]);
    expect(authorization.hardSafetyKernel).toHaveLength(6);
    expect(authorization.authorizationPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(path.join(ROOT,'scripts/qa_mp05_b07_flowing_water_intrusion_plug_01_post_release.mjs'))).toBe(true);
  });
});
