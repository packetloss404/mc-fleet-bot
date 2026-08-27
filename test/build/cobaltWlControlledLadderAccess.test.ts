import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-wl-ladder-'));
const BASENAME = 'cobalt-wl-controlled-ladder-access-01';
const RELEASE_NODE = 'CZ-SYS03-COBALT-WL-CONTROLLED-LADDER-ACCESS';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/sys03-cobalt-wl-controlled-ladder-governor-standing-execution-authorization.json';

type Manifest = {
  status: string;
  manifestIdentity: string;
  releaseNodeId: string;
  source: { completeSaveCapture: { immutableCopy: boolean; verifiedRequiredMemberCount: number } };
  scope: {
    ladderCells: { cellCount: number; bounds: Record<string, number> };
    retainedNorthSleeveAttachments: { cellCount: number };
    lowerControlledLanding: { cellCount: number };
    upperSurfaceExit: { cellCount: number };
    waterSleeveModified: boolean;
    platformLightingModified: boolean;
    normalWalkRouteCommissioned: boolean;
    passengerServiceCommissioned: boolean;
  };
  target: { sourceStateCensus: Record<string, number>; desiredStateCensus: Record<string, number> };
  operations: { 'controlled-ladder': { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean } };
  safetyBoundary: { liveCallsPerformed: boolean; worldEditsPerformed: boolean; executionAuthorizedByThisManifest: boolean };
  scopedRunner: { wrapper: string; authorization: string; releaseNodeId: string; defaultMode: string; liveExecutionOptIn: string };
};

let manifest: Manifest;
let forward: string[];
let rollback: string[];

describe('Cobalt Westlight controlled ladder access 01', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_wl_controlled_ladder_access_01.mjs',
      '--out-dir', OUTPUT,
      '--generated-at', '2026-08-26T19:00:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT, `${BASENAME}.release-manifest.json`), 'utf8')) as Manifest;
    forward = fs.readFileSync(path.join(OUTPUT, `${BASENAME}.controlled-ladder.forward.txt`), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    rollback = fs.readFileSync(path.join(OUTPUT, `${BASENAME}.controlled-ladder.rollback.txt`), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
  });

  afterAll(() => fs.rmSync(OUTPUT, { recursive: true, force: true }));

  it('binds a complete immutable source and the scope-local guarded runner', () => {
    expect(manifest.status).toBe('COMPILED_FROM_COMPLETE_HISTORICAL_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL');
    expect(manifest.source.completeSaveCapture).toMatchObject({ immutableCopy: true });
    expect(manifest.source.completeSaveCapture.verifiedRequiredMemberCount).toBeGreaterThan(100);
    expect(manifest.releaseNodeId).toBe(RELEASE_NODE);
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.scopedRunner).toEqual({
      wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION,
      releaseNodeId: RELEASE_NODE, packagePathsMustRemainUnder: 'data/buildops',
      defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute',
    });
  });

  it('adds a 48-cell attached ladder while retaining the water sleeve, lighting, and public-route boundary', () => {
    expect(manifest.scope.ladderCells).toMatchObject({ cellCount: 48, bounds: {
      minX: -250, maxX: -250, minY: 19, maxY: 66, minZ: -444, maxZ: -444,
    } });
    expect(manifest.scope.retainedNorthSleeveAttachments.cellCount).toBe(48);
    expect(manifest.scope.lowerControlledLanding.cellCount).toBe(5);
    expect(manifest.scope.upperSurfaceExit.cellCount).toBe(4);
    expect(manifest.target.sourceStateCensus).toEqual({ 'minecraft:air': 47, 'minecraft:polished_andesite': 1 });
    expect(manifest.target.desiredStateCensus).toEqual({ 'minecraft:ladder[facing=south,waterlogged=false]': 48 });
    expect(manifest.scope).toMatchObject({ waterSleeveModified: false, platformLightingModified: false, normalWalkRouteCommissioned: false, passengerServiceCommissioned: false });
  });

  it('has exact reversible operations and no mutation authority in its static packet', () => {
    expect(manifest.operations['controlled-ladder']).toMatchObject({ forwardCommandCount: 48, rollbackCommandCount: 48, exactInverse: true });
    expect(forward).toHaveLength(48);
    expect(rollback).toHaveLength(48);
    const forwardSet = new Set(forward);
    for (const reverse of rollback) {
      const fields = reverse.split(/\s+/);
      expect([...forwardSet].some((line) => {
        const candidate = line.split(/\s+/);
        return candidate.slice(1, 7).join(',') === fields.slice(1, 7).join(',')
          && candidate[7] === fields[8] && candidate[8] === fields[7];
      })).toBe(true);
    }
    expect(manifest.safetyBoundary).toMatchObject({ liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false });
  });

  it('is accepted by the guarded runner only as a prepared release', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', 'data/buildops/cobalt-wl-controlled-ladder-access-01.release-manifest.json',
      '--release-node', RELEASE_NODE, '--authorization', AUTHORIZATION, '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 })) as { mode: string; packageOrder: string[]; stages: string[] };
    expect(plan).toMatchObject({ mode: 'PREPARE_ONLY', packageOrder: ['controlled-ladder'] });
    expect(plan.stages).toEqual(expect.arrayContaining(['fresh-source-complete-save', 'block-entity-clearance', 'live-entity-clearance']));
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_wl_controlled_ladder_access_01_post_release.mjs'))).toBe(true);
  });
});
