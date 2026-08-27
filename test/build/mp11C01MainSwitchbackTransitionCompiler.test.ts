import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_mp11_c01_main_switchback_transition_01.mjs');
const DESIGN_SCRIPT = path.join(ROOT, 'scripts/design_mp11_c01_main_switchback_transition_return02_preservation_05.mjs');
const SNAPSHOT = 'data/worldsnap-masterplan-frontier-refresh-20260827T053500Z';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-main-compiler-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('C01 main-switchback transition compiler', () => {
  it('emits source-bound exact inverse operations with collision-free guards while preserving Return-02 and denying execution authority', () => {
    const contractDir = path.join(temp, 'contract');
    const out = path.join(temp, 'compiled');
    execFileSync(process.execPath, [DESIGN_SCRIPT, '--snapshot', SNAPSHOT, '--out', contractDir, '--generated-at', '2026-08-27T05:55:00.000Z'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
    const result = JSON.parse(execFileSync(process.execPath, [SCRIPT, '--snapshot', SNAPSHOT, '--contract', path.join(contractDir, 'mp11-c01-main-switchback-transition-return02-preservation-05.json'), '--out', out, '--generated-at', '2026-08-27T05:56:00.000Z'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-main-switchback-transition-01.manifest.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL', canonicalTargets: 928, retainedReturnIntersectionCount: 0, mutationAuthority: false });
    expect(manifest).toMatchObject({
      mutationAuthority: false,
      scope: { stationCount: 30, mainCanonicalTargets: { cellCount: 828 }, guardHandrailTargets: { cellCount: 100 }, canonicalTargetUnion: { cellCount: 928 }, currentProtectedRouteRetirementTargetCellCount: 0, currentRouteClosureState: 'NONE' },
      retainedReturn02: { freshCanonicalStateMismatchCount: 0, mainAndGuardIntersectionCount: 0, noRetirement: true },
      safety: { fluidGravityContainerProtectedHits: 0, blockEntityCount: 0, savedEntityCount: 0, endpointMismatchCount: 0 },
      projectedFunctionalQa: { status: 'PASS_PROJECTED_MAIN_AND_RETURN02_TWO_WAY_NORMAL_WALK', mainStationCount: 30, retainedReturnStationCount: 28, failureCount: 0, postReleaseEvidence: false },
    });
    expect(manifest.operations.forward.commandCount).toBeGreaterThan(0);
    expect(manifest.operations.forward.commandCount).toBe(manifest.operations.rollback.commandCount);
    expect(manifest.operations.rollback.exactInverseOfForward).toBe(true);
    expect(fs.existsSync(path.join(out, 'mp11-c01-main-switchback-transition-01.forward.txt'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'mp11-c01-main-switchback-transition-01.rollback.txt'))).toBe(true);
  }, 120_000);
});
