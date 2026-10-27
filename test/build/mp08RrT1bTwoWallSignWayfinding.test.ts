import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'mp08-rr-t1b-two-wall-sign-wayfinding';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp08-rr-t1b-signs-'));
type Manifest = {
  status: string;
  liveCallsPerformed: boolean;
  worldEditsPerformed: boolean;
  hardStops: { requireNewCompleteImmutableSourceImmediatelyBeforeExecution: boolean };
  scope: { signCount: number; signs: Array<{ desiredState: string }>; normalWalkRoute: { stationCount: number; unchangedByTargets: boolean } };
  geometry: { targets: { cellCount: number } };
  projectedStateOverlay: { path: string; sha256: string; replOnly: boolean; replLineCount: number; targetCoordinateSetSha256: string };
  nbtContract: { sourceTargetNbt: string; exactInverse: string };
  isolation: { targetAndHaloBlockEntityCount: number; targetFluidGravityContainerControlCount: number };
};
let manifest: Manifest;
beforeAll(() => {
  execFileSync(process.execPath, ['scripts/compile_mp08_rr_t1b_two_wall_sign_wayfinding.mjs', '--out-dir', temp, '--generated-at', '2026-08-26T10:45:00Z'], { cwd: ROOT, stdio: 'pipe' });
  manifest = JSON.parse(fs.readFileSync(path.join(temp, `${BASENAME}.release-manifest.json`), 'utf8'));
  execFileSync(process.execPath, ['scripts/qa_guarded_release_manifest.mjs', '--manifest', path.join(temp, `${BASENAME}.release-manifest.json`), '--out', path.join(temp, 'manifest-qa.json')], { cwd: ROOT, stdio: 'pipe' });
});
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));
describe('MP08 RR-T1b two-wall-sign wayfinding static package', () => {
  it('is static, source-bound, and awaits a fresh execution kernel', () => {
    expect(manifest.status).toBe('STATIC_SOURCE_BOUND_DESIGN_AWAITING_FRESH_EXECUTION_KERNEL');
    expect(manifest.liveCallsPerformed).toBe(false);
    expect(manifest.worldEditsPerformed).toBe(false);
    expect(manifest.hardStops.requireNewCompleteImmutableSourceImmediatelyBeforeExecution).toBe(true);
  });
  it('covers exactly two fully stated signs with complete NBT and an absence inverse', () => {
    expect(manifest.scope.signCount).toBe(2);
    expect(manifest.geometry.targets.cellCount).toBe(2);
    expect(manifest.scope.signs.map((s) => s.desiredState)).toEqual([
      'minecraft:spruce_wall_sign[facing=east,waterlogged=false]',
      'minecraft:spruce_wall_sign[facing=west,waterlogged=false]',
    ]);
    expect(manifest.nbtContract.sourceTargetNbt).toContain('ABSENT');
    expect(manifest.nbtContract.exactInverse).toContain('air + no NBT');
  });
  it('has exact guarded data merges, exact state inverse, and static parser coverage', () => {
    const f = fs.readFileSync(path.join(temp, `${BASENAME}.two-wall-signs.forward.txt`), 'utf8');
    const r = fs.readFileSync(path.join(temp, `${BASENAME}.two-wall-signs.rollback.txt`), 'utf8');
    expect((f.match(/^CMD execute if block/gm) ?? [])).toHaveLength(2);
    expect((r.match(/^CMD execute if block/gm) ?? [])).toHaveLength(2);
    expect(f).toContain('data merge block -7 -4 -117');
    expect(r).toContain('minecraft:air');
    expect(JSON.parse(fs.readFileSync(path.join(temp, 'manifest-qa.json'), 'utf8')).status).toBe('PASS');
  });
  it('emits a hash-bound exact-REPL-only projected-state overlay for rollback preflight', () => {
    const overlay = path.join(temp, path.basename(manifest.projectedStateOverlay.path));
    const lines = fs.readFileSync(overlay, 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    expect(manifest.projectedStateOverlay.replOnly).toBe(true);
    expect(manifest.projectedStateOverlay.replLineCount).toBe(2);
    expect(manifest.projectedStateOverlay.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => !line.includes('CMD '))).toBe(true);
  });
  it('keeps the measured 76-station normal-walk core untouched', () => {
    expect(manifest.scope.normalWalkRoute.stationCount).toBe(76);
    expect(manifest.scope.normalWalkRoute.unchangedByTargets).toBe(true);
    expect(manifest.isolation.targetAndHaloBlockEntityCount).toBe(0);
    expect(manifest.isolation.targetFluidGravityContainerControlCount).toBe(0);
  });
});
