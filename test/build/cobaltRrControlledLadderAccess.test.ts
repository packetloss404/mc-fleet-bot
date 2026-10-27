import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-ladder-'));
const BASENAME = 'cobalt-rr-controlled-ladder-access-01';
const RELEASE_NODE = 'CZ-SYS03-COBALT-RR-CONTROLLED-LADDER-ACCESS';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-controlled-ladder-governor-standing-execution-authorization.json';

type Manifest = {
  status: string;
  releaseNodeId: string;
  manifestIdentity: string;
  source: { completeSaveCapture: { immutableCopy: boolean; verifiedRequiredMemberCount: number } };
  scope: {
    ladderCells: { cellCount: number; bounds: Record<string, number> };
    retainedEastSleeveAttachments: { cellCount: number };
    lowerControlledLanding: { cellCount: number };
    upperSurfaceExit: { cellCount: number };
    waterSleeveModified: boolean;
    normalWalkRouteCommissioned: boolean;
    passengerServiceCommissioned: boolean;
  };
  target: { sourceStateCensus: Record<string, number>; desiredStateCensus: Record<string, number> };
  operations: { 'controlled-ladder': { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean } };
  safetyBoundary: { liveCallsPerformed: boolean; worldEditsPerformed: boolean; executionAuthorizedByThisManifest: boolean };
};

let manifest: Manifest;
let forward: string[];
let rollback: string[];

describe('Cobalt Ravensreach controlled ladder access 01', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_controlled_ladder_access_01.mjs', '--out-dir', OUTPUT,
      '--generated-at', '2026-08-26T19:15:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT, `${BASENAME}.release-manifest.json`), 'utf8')) as Manifest;
    forward = fs.readFileSync(path.join(OUTPUT, `${BASENAME}.controlled-ladder.forward.txt`), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    rollback = fs.readFileSync(path.join(OUTPUT, `${BASENAME}.controlled-ladder.rollback.txt`), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
  });

  afterAll(() => fs.rmSync(OUTPUT, { recursive: true, force: true }));

  it('binds the immutable source and its exact scope-local runner authorization', () => {
    expect(manifest.status).toBe('COMPILED_FROM_COMPLETE_HISTORICAL_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL');
    expect(manifest.releaseNodeId).toBe(RELEASE_NODE);
    expect(manifest.source.completeSaveCapture).toMatchObject({ immutableCopy: true });
    expect(manifest.source.completeSaveCapture.verifiedRequiredMemberCount).toBeGreaterThan(100);
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', 'data/buildops/cobalt-rr-controlled-ladder-access-01.release-manifest.json',
      '--release-node', RELEASE_NODE, '--authorization', AUTHORIZATION, '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 })) as { mode: string; packageOrder: string[]; stages: string[] };
    expect(plan).toMatchObject({ mode: 'PREPARE_ONLY', packageOrder: ['controlled-ladder'] });
    expect(plan.stages).toEqual(expect.arrayContaining(['fresh-source-complete-save', 'block-entity-clearance', 'live-entity-clearance']));
  });

  it('uses the dry east sleeve rather than the retained north-wall water pocket', () => {
    expect(manifest.scope.ladderCells).toMatchObject({ cellCount: 44, bounds: { minX: -151, maxX: -151, minY: 19, maxY: 62, minZ: -390, maxZ: -390 } });
    expect(manifest.scope.retainedEastSleeveAttachments.cellCount).toBe(44);
    expect(manifest.scope.lowerControlledLanding.cellCount).toBe(5);
    expect(manifest.scope.upperSurfaceExit.cellCount).toBe(4);
    expect(manifest.target.sourceStateCensus).toEqual({ 'minecraft:air': 43, 'minecraft:polished_andesite': 1 });
    expect(manifest.target.desiredStateCensus).toEqual({ 'minecraft:ladder[facing=west,waterlogged=false]': 44 });
    expect(manifest.scope).toMatchObject({ waterSleeveModified: false, normalWalkRouteCommissioned: false, passengerServiceCommissioned: false });
  });

  it('has an exact 44-cell inverse and no static mutation authority', () => {
    expect(manifest.operations['controlled-ladder']).toMatchObject({ forwardCommandCount: 44, rollbackCommandCount: 44, exactInverse: true });
    expect(forward).toHaveLength(44);
    expect(rollback).toHaveLength(44);
    const forwardSet = new Set(forward);
    for (const reverse of rollback) {
      const fields = reverse.split(/\s+/);
      expect([...forwardSet].some((line) => {
        const candidate = line.split(/\s+/);
        return candidate.slice(1, 7).join(',') === fields.slice(1, 7).join(',') && candidate[7] === fields[8] && candidate[8] === fields[7];
      })).toBe(true);
    }
    expect(manifest.safetyBoundary).toMatchObject({ liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false });
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_controlled_ladder_access_01_post_release.mjs'))).toBe(true);
  });
});
