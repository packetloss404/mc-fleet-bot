import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag3-rail-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('AG-3 exterior loop passive rail module 01', () => {
  it('compiles two separate passive rails with support, headroom, barrier, and bounded recovery path only', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, ['scripts/compile_ag3_exterior_loop_passive_rail_01.mjs', '--out', out, '--generated-at', '2026-08-28T10:00:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 });
    const m = JSON.parse(fs.readFileSync(path.join(out, 'ag3-citywide-exterior-loop-passive-rail-01.release-manifest.json'), 'utf8'));
    expect(m).toMatchObject({
      id: 'AG3-CITYWIDE-EXTERIOR-LOOP-PASSIVE-RAIL-01', status: 'PREPARED_SOURCE_BOUND_OFFLINE_ONLY_FRESH_EXECUTION_GATE_REQUIRED', mutationAuthority: false,
      scope: { passiveOnly: true, rails: [{ id: 'AG3-RAIL-W', z: -792, shape: 'east_west', cells: 16 }, { id: 'AG3-RAIL-E', z: -786, shape: 'east_west', cells: 16 }], support: { y: 84, checkedCells: 32 }, headroom: { aboveRailY: [86, 87, 88], checkedCells: 96 }, railSideBarrier: { z: -784, cells: 48 }, recoveryPath: { width: 3, clearHeadroomY: [86, 87] } },
      target: { cellCount: 128, targetStateCensus: { 'minecraft:rail[shape=east_west,waterlogged=false]': 32, 'minecraft:smooth_stone': 48, 'minecraft:polished_deepslate': 48 } }, halo: { cellCount: 352 }, safety: { reserveSupportAndHeadroom: { passed: true, checked: 352 }, fluidWaterloggedOrGravityHits: [], protectedInterfaceHits: [], blockEntities: [], savedEntities: [], exactForwardRollbackInverse: true }, executionGate: { executionAuthorizedByThisArtifact: false }, safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false },
    });
    expect(m.scope.explicitNonClaims).toEqual(expect.arrayContaining(['no powered rail', 'no redstone/control', 'no station/platform', 'no public/passenger/recovery service']));
    expect(m.operations.forward.commandCount).toBe(128); expect(m.operations.rollback.commandCount).toBe(128);
  });
});
