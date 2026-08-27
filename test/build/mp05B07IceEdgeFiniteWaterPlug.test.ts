import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-ice-edge-water-plug-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 ice-edge finite water plug', () => {
  it('compiles the entire finite exterior pocket as an exact containment-first inverse', () => {
    const out = path.join(temp, 'compile');
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/compile_mp05_b07_ice_edge_finite_water_plug_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-ice-edge-finite-water-plug-01.manifest.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(manifest.status).toBe('OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL');
    expect(manifest.scope.sourceWaterPocket.cellCount).toBe(35);
    expect(manifest.scope.sourceWaterComponents.map((component: { cellCount: number }) => component.cellCount).sort((a: number, b: number) => a - b)).toEqual([10, 25]);
    expect(manifest.target.changedCellCount).toBe(35);
    expect(manifest.interactionSet.fullHalo.cellCount).toBe(249);
    expect(manifest.interactionSet.sourceExternalFluidCount).toBe(0);
    expect(manifest.operations.forward.commandCount).toBe(35);
    expect(manifest.operations.rollback.commandCount).toBe(35);
    expect(manifest.operations.rollback.exactInverseOfForward).toBe(true);
    expect(fs.existsSync(path.join(out, 'ice-edge-finite-water-plug-plan-y62.svg'))).toBe(true);
  }, 120_000);

  it('rebinds and passes every offline guarded-kernel stage without world execution', () => {
    const out = path.join(temp, 'prepare');
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp05_b07_ice_edge_finite_water_plug_release.mjs',
      '--out-dir', out,
      '--source-snapshot-root', 'data/worldsnap-mp11-bkr-c01-finite-gravity-liner-post-20260827T231000Z',
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'fresh-kernel-ledger.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(ledger.status).toBe('PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE');
    expect(ledger.stages).toHaveLength(7);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
    expect(fs.existsSync(path.join(out, 'rebound-buildops', 'ice-edge-finite-water-plug-plan-y62.svg'))).toBe(true);
  }, 120_000);
});
