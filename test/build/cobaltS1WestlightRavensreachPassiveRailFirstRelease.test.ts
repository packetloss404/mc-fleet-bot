import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-s1-passive-rail-'));
const BASENAME = 'cobalt-s1-westlight-ravensreach-passive-rail-01';
const RELEASE_NODE = 'CZ-SYS03-COBALT-STATION-PAIR-PASSIVE-RAIL';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/sys03-cobalt-station-pair-governor-standing-execution-authorization.json';

type Manifest = {
  status: string;
  manifestIdentity: string;
  releaseNodeId: string;
  source: { completeSaveCapture: { immutableCopy: boolean; verifiedRequiredMemberCount: number } };
  scope: {
    selectedStationPair: string;
    railCells: { cellCount: number; bounds: Record<string, number> };
    supportCells: { cellCount: number };
    headroomCells: { cellCount: number };
    retainedDiaphragmCells: { cellCount: number };
    holdsExplicitlyExcluded: Array<{ id: string; interactionOverlapCellCount: number; nearestXSeparation: number }>;
    routeCommissioned: boolean;
    passengerServiceCommissioned: boolean;
    governorDelegatedRoles: Record<string, string>;
  };
  target: { sourceStateCensus: Record<string, number>; desiredStateCensus: Record<string, number> };
  operations: { 'passive-rail': { forwardCommandCount: number; rollbackCommandCount: number; exactInverse: boolean } };
  safetyBoundary: { liveCallsPerformed: boolean; worldEditsPerformed: boolean; executionAuthorizedByThisManifest: boolean };
  scopedRunner: { wrapper: string; authorization: string; releaseNodeId: string; defaultMode: string; liveExecutionOptIn: string };
};

let manifest: Manifest;
let forward: string[];
let rollback: string[];

describe('COBALT-S1 Westlight–Ravensreach first passive-rail release', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_s1_westlight_ravensreach_passive_rail_01.mjs',
      '--out-dir', OUTPUT,
      '--generated-at', '2026-08-26T00:00:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUTPUT, `${BASENAME}.release-manifest.json`), 'utf8')) as Manifest;
    forward = fs.readFileSync(path.join(OUTPUT, `${BASENAME}.passive-rail.forward.txt`), 'utf8')
      .split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    rollback = fs.readFileSync(path.join(OUTPUT, `${BASENAME}.passive-rail.rollback.txt`), 'utf8')
      .split(/\r?\n/).filter((line) => line.startsWith('REPL '));
  });

  afterAll(() => fs.rmSync(OUTPUT, { recursive: true, force: true }));

  it('binds the complete immutable source and the selected station pair', () => {
    expect(manifest.status).toBe('COMPILED_FROM_COMPLETE_HISTORICAL_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL');
    expect(manifest.source.completeSaveCapture.immutableCopy).toBe(true);
    expect(manifest.source.completeSaveCapture.verifiedRequiredMemberCount).toBeGreaterThan(100);
    expect(manifest.scope.selectedStationPair).toBe('Westlight (PR-W02) ↔ Ravensreach (PR-W04)');
    expect(manifest.releaseNodeId).toBe(RELEASE_NODE);
    expect(manifest.scopedRunner).toEqual({
      wrapper: 'scripts/run_combined_zones_scoped_release.mjs',
      authorization: AUTHORIZATION,
      releaseNodeId: RELEASE_NODE,
      packagePathsMustRemainUnder: 'data/buildops',
      defaultMode: 'PREPARE_ONLY',
      liveExecutionOptIn: '--execute',
    });
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
  });

  it('creates only two isolated, unpowered approach rails with complete support and headroom', () => {
    expect(manifest.scope.railCells).toMatchObject({ cellCount: 36, bounds: {
      minX: -254, maxX: -237, minY: 13, maxY: 13, minZ: -461, maxZ: -455,
    } });
    expect(manifest.scope.supportCells.cellCount).toBe(36);
    expect(manifest.scope.headroomCells.cellCount).toBe(108);
    expect(manifest.scope.retainedDiaphragmCells.cellCount).toBe(32);
    expect(manifest.target.sourceStateCensus).toEqual({ 'minecraft:air': 36 });
    expect(manifest.target.desiredStateCensus).toEqual({ 'minecraft:rail[shape=east_west,waterlogged=false]': 36 });
  });

  it('excludes the normal-alignment and north-turn holds entirely', () => {
    expect(manifest.scope.holdsExplicitlyExcluded).toEqual([
      expect.objectContaining({ id: 'R10-NORMAL-ALIGNMENT-FLUID-GRAVITY-HOLD', interactionOverlapCellCount: 0, nearestXSeparation: 162 }),
      expect.objectContaining({ id: 'R10-NORTH-TURN-WATER-BUBBLE-HOLD', interactionOverlapCellCount: 0, nearestXSeparation: 262 }),
    ]);
  });

  it('has exact reversible guarded operations and remains non-operational', () => {
    expect(manifest.operations['passive-rail']).toMatchObject({ forwardCommandCount: 36, rollbackCommandCount: 36, exactInverse: true });
    expect(forward).toHaveLength(36);
    expect(rollback).toHaveLength(36);
    const forwardSet = new Set(forward);
    for (const reverse of rollback) {
      const fields = reverse.split(/\s+/);
      const counterpart = [...forwardSet].find((line) => {
        const forwardFields = line.split(/\s+/);
        return forwardFields.slice(1, 7).join(',') === fields.slice(1, 7).join(',')
          && forwardFields[7] === fields[8] && forwardFields[8] === fields[7];
      });
      expect(counterpart).toBeDefined();
    }
    expect(manifest.scope.routeCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
    expect(Object.values(manifest.scope.governorDelegatedRoles)).toHaveLength(4);
    expect(manifest.safetyBoundary).toMatchObject({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('is accepted by the scoped runner with the SYS03 Governor authorization', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', RELEASE_NODE,
      '--authorization', AUTHORIZATION,
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 })) as {
      mode: string; packageOrder: string[]; stages: string[];
    };
    expect(plan).toMatchObject({ mode: 'PREPARE_ONLY', packageOrder: ['passive-rail'] });
    expect(plan.stages).toEqual(expect.arrayContaining([
      'fresh-source-complete-save', 'block-entity-clearance', 'live-entity-clearance',
    ]));
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_s1_westlight_ravensreach_passive_rail_01_post_release.mjs'))).toBe(true);
  });
});
